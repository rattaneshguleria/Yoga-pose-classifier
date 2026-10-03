"""Train the manifest-selected Yoga-82 hybrid dataset from a local ZIP.

Only images listed in _reports/dataset_index.csv are extracted. The manifest's
train/val/test assignments are preserved; validation and test features are never
used to fit the model.
"""
import argparse
import csv
import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.features import extract  # noqa: E402

SPLITS = ("train", "val", "test")
DATA_ROOT = ROOT / "data" / "yoga82"
REPORT_ROOT = DATA_ROOT / "_reports"
IMAGE_ROOT = DATA_ROOT / "images"
FEATURE_CACHE = DATA_ROOT / "features.npz"
KAGGLE_FEATURE_CACHE = DATA_ROOT / "kaggle_features.npz"
KAGGLE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
KAGGLE_POSE_LABELS = {
    "Downward Dog": "Downward-Facing_Dog_pose_or_Adho_Mukha_Svanasana_",
    "Goddess Pose": "Goddess Pose",
    "Plank": "Plank_Pose_or_Kumbhakasana_",
    "Tree Pose": "Tree_Pose_or_Vrksasana_",
    "Warrior II": "Warrior_II_Pose_or_Virabhadrasana_II_",
}

COACHING_ALIASES = {
    "Chair_Pose_or_Utkatasana_": "Chair Pose",
    "Cobra_Pose_or_Bhujangasana_": "Cobra",
    "Downward-Facing_Dog_pose_or_Adho_Mukha_Svanasana_": "Downward Dog",
    "Plank_Pose_or_Kumbhakasana_": "Plank",
    "Tree_Pose_or_Vrksasana_": "Tree Pose",
    "Warrior_II_Pose_or_Virabhadrasana_II_": "Warrior II",
    "Goddess Pose": "Goddess Pose",
}


def load_reports(archive_path):
    archive_path = Path(archive_path)
    if not archive_path.is_file():
        raise FileNotFoundError(f"Yoga-82 ZIP not found: {archive_path}")

    with ZipFile(archive_path) as archive:
        members = {name.replace("\\", "/") for name in archive.namelist()}
        manifest_members = [name for name in members if name.endswith("/_reports/dataset_index.csv")]
        labels_members = [name for name in members if name.endswith("/_reports/label_map.json")]
        if len(manifest_members) != 1 or len(labels_members) != 1:
            raise ValueError("ZIP must contain exactly one _reports/dataset_index.csv and label_map.json")
        manifest_member, labels_member = manifest_members[0], labels_members[0]
        root_prefix = manifest_member.removesuffix("_reports/dataset_index.csv")
        if labels_member != f"{root_prefix}_reports/label_map.json":
            raise ValueError("The manifest and label map must be in the same archive _reports directory")
        manifest_bytes = archive.read(manifest_member)
        labels_bytes = archive.read(labels_member)
        rows = list(csv.DictReader(io.StringIO(manifest_bytes.decode("utf-8-sig"), newline="")))
        label_map = json.loads(labels_bytes)

    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    (REPORT_ROOT / "dataset_index.csv").write_bytes(manifest_bytes)
    (REPORT_ROOT / "label_map.json").write_bytes(labels_bytes)
    required = {"path", "split", "label", "label_id"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Manifest must contain columns: {', '.join(sorted(required))}")

    classes = sorted(label_map, key=lambda label: int(label_map[label]["id"]))
    if [int(label_map[label]["id"]) for label in classes] != list(range(len(classes))):
        raise ValueError("label_map.json IDs must be unique and contiguous from zero")

    seen_paths = set()
    seen_archive_paths = set()
    split_counts = Counter()
    class_split_counts = Counter()
    indexed = []
    for row in rows:
        row = {key: value.strip().strip('"') if value else value for key, value in row.items()}
        path_text = row["path"].replace("\\", "/")
        path = PurePosixPath(path_text)
        label = row["label"]
        split = row["split"]
        if path.is_absolute() or ".." in path.parts:
            raise ValueError(f"Unsafe manifest image path: {path_text}")
        if path_text in seen_paths:
            raise ValueError(f"Duplicate path in manifest: {path_text}")
        if label not in label_map or int(row["label_id"]) != int(label_map[label]["id"]):
            raise ValueError(f"Label/ID mismatch in manifest row: {path_text}")
        if split not in SPLITS:
            raise ValueError(f"Unknown split {split!r} in manifest row: {path_text}")
        archive_path_text = f"{root_prefix}{path.as_posix()}"
        if archive_path_text not in members:
            sanitized_path = path.as_posix().replace("'", "_")
            sanitized_archive_path = f"{root_prefix}{sanitized_path}"
            if sanitized_archive_path not in members:
                raise ValueError(f"Manifest image missing from ZIP: {path_text}")
            archive_path_text = sanitized_archive_path
        if archive_path_text in seen_archive_paths:
            raise ValueError(f"Multiple manifest rows map to one ZIP image: {archive_path_text}")
        seen_paths.add(path_text)
        seen_archive_paths.add(archive_path_text)
        split_counts[split] += 1
        class_split_counts[(label, split)] += 1
        indexed.append({**row, "path": path_text, "archive_path": archive_path_text,
                        "label_id": int(row["label_id"]), "local_path": IMAGE_ROOT.joinpath(*path.parts)})

    for label, metadata in label_map.items():
        for split in SPLITS:
            expected = int(metadata.get(split, 0))
            actual = class_split_counts[(label, split)]
            if expected != actual:
                raise ValueError(f"Manifest/report count mismatch for {label} ({split}): {actual} != {expected}")
    archive_jpgs = sum(name.startswith(root_prefix) and name.lower().endswith(".jpg") for name in members)
    print(f"Manifest: {len(indexed)} indexed images across {len(classes)} labels; split counts {dict(split_counts)}")
    print(f"ZIP JPGs outside the manifest (excluded): {archive_jpgs - len(indexed)}")
    return indexed, classes, label_map, archive_jpgs


def collect_kaggle_training_rows(classes, label_map):
    rows = []
    counts = Counter()
    for source_pose, label in KAGGLE_POSE_LABELS.items():
        folder = ROOT / "data" / source_pose
        images = sorted(path for path in folder.rglob("*")
                        if path.is_file() and path.suffix.lower() in KAGGLE_EXTENSIONS) if folder.is_dir() else []
        if not images:
            print(f"Kaggle supplement {source_pose}: no images found; skipped")
            continue
        if label not in label_map:
            if label != "Goddess Pose":
                raise ValueError(f"No Yoga-82 label mapping for Kaggle pose {source_pose}")
            label_map[label] = {"id": len(classes), "members": [label], "train": 0, "val": 0, "test": 0}
            classes.append(label)
        label_id = int(label_map[label]["id"])
        for path in images:
            rows.append({
                "path": path.relative_to(ROOT / "data").as_posix(),
                "local_path": path,
                "label": label,
                "label_id": label_id,
                "split": "train",
                "source_pose": source_pose,
            })
        counts[source_pose] = len(images)
        print(f"Kaggle supplement {source_pose} -> {label}: {len(images)} train images")
    print(f"Mountain Pose kept separate; Kaggle training additions: {len(rows)} images")
    return rows, counts


def extract_indexed_images(indexed, archive_path):
    pending = [row for row in indexed if not row["local_path"].is_file() or not row["local_path"].stat().st_size]
    print(f"Indexed images already cached: {len(indexed) - len(pending)}; extracting from ZIP: {len(pending)}")
    failures = []
    with ZipFile(archive_path) as archive:
        for done, row in enumerate(pending, 1):
            destination = row["local_path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            partial = destination.with_name(destination.name + ".part")
            try:
                with archive.open(row["archive_path"]) as source, partial.open("wb") as target:
                    shutil.copyfileobj(source, target)
                if not partial.stat().st_size:
                    raise OSError("empty ZIP member")
                os.replace(partial, destination)
            except Exception as exc:
                partial.unlink(missing_ok=True)
                failures.append((row["path"], type(exc).__name__))
            if done % 250 == 0 or done == len(pending):
                print(f"Extraction progress: {done}/{len(pending)}; failures: {len(failures)}", flush=True)
    if failures:
        failure_path = REPORT_ROOT / "extraction_failures.csv"
        with failure_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(("path", "reason"))
            writer.writerows(failures)
        raise RuntimeError(f"{len(failures)} indexed images failed to extract; details: {failure_path}")


def manifest_signature():
    digest = hashlib.sha256()
    for path in (REPORT_ROOT / "dataset_index.csv", REPORT_ROOT / "label_map.json"):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def empty_skip_report(classes):
    return {
        "by_label_and_split": {label: {split: 0 for split in SPLITS} for label in classes},
        "reasons_by_label": {label: {"unreadable": 0, "no_landmarks": 0, "error": 0} for label in classes},
    }


def normalize_skip_report(skipped, classes):
    template = empty_skip_report(classes)
    for section, labels in template.items():
        source = skipped.setdefault(section, {})
        for label, values in labels.items():
            existing = source.setdefault(label, {})
            for name, value in values.items():
                existing.setdefault(name, value)
    return skipped


def extract_features(indexed, classes, force=False):
    import cv2
    from backend.app import pose_backend

    signature = manifest_signature()
    if FEATURE_CACHE.exists() and not force:
        cached = np.load(FEATURE_CACHE, allow_pickle=False)
        if str(cached["manifest_sha256"].item()) == signature:
            print(f"Reusing cached MediaPipe features: {len(cached['X'])}")
            skipped = normalize_skip_report(json.loads(str(cached["skipped_json"].item())), classes)
            return cached["X"], cached["y"], cached["split"], skipped

    features, class_ids, splits = [], [], []
    skipped = empty_skip_report(classes)
    for index, row in enumerate(indexed, 1):
        label, split = row["label"], row["split"]
        image = cv2.imread(str(row["local_path"]))
        reason = None
        if image is None:
            reason = "unreadable"
        else:
            try:
                landmarks = pose_backend.detect_image(image)
                if landmarks is None:
                    reason = "no_landmarks"
            except Exception:
                reason = "error"
        if reason:
            skipped["by_label_and_split"][label][split] += 1
            skipped["reasons_by_label"][label][reason] += 1
        else:
            height, width = image.shape[:2]
            features.append(extract(landmarks, width / height))
            class_ids.append(row["label_id"])
            splits.append(split)
        if index % 250 == 0 or index == len(indexed):
            skipped_total = sum(sum(counts.values()) for counts in skipped["by_label_and_split"].values())
            print(f"MediaPipe progress: {index}/{len(indexed)}; skipped: {skipped_total}", flush=True)

    if not features:
        raise RuntimeError("MediaPipe produced no usable training features")
    x = np.asarray(features, dtype=np.float32)
    y = np.asarray(class_ids, dtype=np.int64)
    split_values = np.asarray(splits, dtype="U5")
    skipped_json = json.dumps(skipped)
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(FEATURE_CACHE, X=x, y=y, split=split_values,
                        manifest_sha256=np.asarray(signature), skipped_json=np.asarray(skipped_json))
    return x, y, split_values, skipped


def kaggle_signature(rows):
    digest = hashlib.sha256()
    for row in sorted(rows, key=lambda item: str(item["local_path"])):
        stat = row["local_path"].stat()
        digest.update(f"{row['local_path']}\0{row['label_id']}\0{stat.st_size}\0{stat.st_mtime_ns}\n".encode())
    return digest.hexdigest()


def extract_kaggle_features(rows, classes, force=False):
    import cv2
    from backend.app import pose_backend

    skipped = empty_skip_report(classes)
    if not rows:
        return np.empty((0, 33), dtype=np.float32), np.empty(0, dtype=np.int64), np.empty(0, dtype="U5"), skipped

    signature = kaggle_signature(rows)
    if KAGGLE_FEATURE_CACHE.exists() and not force:
        cached = np.load(KAGGLE_FEATURE_CACHE, allow_pickle=False)
        if str(cached["supplement_sha256"].item()) == signature:
            print(f"Reusing cached Kaggle MediaPipe features: {len(cached['X'])}")
            skipped = normalize_skip_report(json.loads(str(cached["skipped_json"].item())), classes)
            return cached["X"], cached["y"], cached["split"], skipped

    features, class_ids, splits = [], [], []
    for index, row in enumerate(rows, 1):
        label, split = row["label"], "train"
        image = cv2.imread(str(row["local_path"]))
        reason = None
        if image is None:
            reason = "unreadable"
        else:
            try:
                landmarks = pose_backend.detect_image(image)
                if landmarks is None:
                    reason = "no_landmarks"
            except Exception:
                reason = "error"
        if reason:
            skipped["by_label_and_split"][label][split] += 1
            skipped["reasons_by_label"][label][reason] += 1
        else:
            height, width = image.shape[:2]
            features.append(extract(landmarks, width / height))
            class_ids.append(row["label_id"])
            splits.append(split)
        if index % 100 == 0 or index == len(rows):
            skip_total = sum(sum(counts.values()) for counts in skipped["by_label_and_split"].values())
            print(f"Kaggle MediaPipe progress: {index}/{len(rows)}; skipped: {skip_total}", flush=True)

    x = np.asarray(features, dtype=np.float32).reshape((-1, 33))
    y = np.asarray(class_ids, dtype=np.int64)
    split_values = np.asarray(splits, dtype="U5")
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(KAGGLE_FEATURE_CACHE, X=x, y=y, split=split_values,
                        supplement_sha256=np.asarray(signature), skipped_json=np.asarray(json.dumps(skipped)))
    return x, y, split_values, skipped


def merge_skip_reports(base, additions, classes):
    merged = normalize_skip_report(json.loads(json.dumps(base)), classes)
    additions = normalize_skip_report(additions, classes)
    for label in classes:
        merged["by_label_and_split"][label]["train"] += additions["by_label_and_split"][label]["train"]
        for reason, count in additions["reasons_by_label"][label].items():
            merged["reasons_by_label"][label][reason] += count
    return merged


def coach_pose_for_label(label, metadata):
    members = metadata.get("members", [])
    mapped = {COACHING_ALIASES.get(member) for member in members}
    if members and len(mapped) == 1 and None not in mapped:
        return next(iter(mapped))
    return None


def train_model(x, y, split_values, classes, label_map, skipped, manifest_rows,
                archive_image_count, kaggle_rows, kaggle_counts, kaggle_usable):
    from sklearn.metrics import classification_report, confusion_matrix
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler

    class_ids = np.asarray([int(label_map[label]["id"]) for label in classes])
    train_mask = split_values == "train"
    val_mask = split_values == "val"
    test_mask = split_values == "test"
    x_train, y_train = x[train_mask], y[train_mask]
    x_val, y_val = x[val_mask], y[val_mask]
    x_test, y_test = x[test_mask], y[test_mask]
    present = set(int(value) for value in np.unique(y_train))
    missing_classes = [classes[i] for i in class_ids if int(i) not in present]
    if missing_classes:
        raise RuntimeError(f"No usable training examples for labels: {', '.join(missing_classes)}")

    scaler = StandardScaler().fit(x_train)
    std = np.where(scaler.scale_ == 0, 1, scaler.scale_)
    network = MLPClassifier(hidden_layer_sizes=(128, 64), alpha=1e-3, early_stopping=True,
                            validation_fraction=.15, max_iter=400, random_state=42)
    network.fit((x_train - scaler.mean_) / std, y_train)

    test_probabilities = network.predict_proba((x_test - scaler.mean_) / std)
    test_predictions = network.classes_[test_probabilities.argmax(axis=1)]
    val_predictions = network.predict((x_val - scaler.mean_) / std)
    confidence_counts, confidence_bins = np.histogram(test_probabilities.max(axis=1), bins=10, range=(0, 1))
    report = classification_report(y_test, test_predictions, labels=class_ids,
                                   target_names=classes, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_test, test_predictions, labels=class_ids)
    per_class_accuracy = {}
    for label, class_id in zip(classes, class_ids):
        mask = y_test == class_id
        support = int(mask.sum())
        correct = int((test_predictions[mask] == class_id).sum())
        per_class_accuracy[label] = {
            "accuracy": correct / support if support else None,
            "correct": correct,
            "test_images": support,
        }

    split_totals = {split: int((split_values == split).sum()) for split in SPLITS}
    manifest_split_rows = {split: sum(row["split"] == split for row in manifest_rows) for split in SPLITS}
    split_skipped = {
        split: sum(skipped["by_label_and_split"][label][split] for label in classes)
        for split in SPLITS
    }
    test_labels = [label for label in classes if per_class_accuracy[label]["test_images"]]
    macro = {
        metric: float(np.mean([report[label][metric] for label in test_labels]))
        for metric in ("precision", "recall", "f1-score")
    }
    model = {
        "classes": classes,
        "mean": scaler.mean_.tolist(),
        "std": std.tolist(),
        "layers": [{"W": weights.T.tolist(), "b": bias.tolist()}
                   for weights, bias in zip(network.coefs_, network.intercepts_)],
        "coaching_labels": {label: coach_pose_for_label(label, label_map[label]) for label in classes},
    }
    metrics = {
        "dataset": {
            "name": "Yoga-82 hybrid 77-label manifest plus Kaggle training supplements",
            "license": "Yoga-82 is non-commercial research/education; verify Kaggle dataset and image-level terms",
            "manifest_images": len(manifest_rows),
            "zip_jpgs_excluded_not_in_manifest": archive_image_count - len(manifest_rows),
            "kaggle_training_images": len(kaggle_rows),
            "kaggle_usable_training_samples": kaggle_usable,
            "kaggle_training_by_pose": dict(kaggle_counts),
            "usable_samples": int(len(x)),
            "train": int(len(x_train)),
            "val": int(len(x_val)),
            "test": int(len(x_test)),
            "manifest_split_rows": manifest_split_rows,
            "combined_split_samples": split_totals,
            "mediapipe_skipped": split_skipped,
        },
        "architecture": [
            {"layer": "Input", "detail": f"{x.shape[1]} features"},
            {"layer": "Standardise", "detail": "fit on official train split only"},
            {"layer": "Dense + ReLU", "detail": "128"},
            {"layer": "Dense + ReLU", "detail": "64"},
            {"layer": "Dense + softmax", "detail": str(len(classes))},
        ],
        "classes": classes,
        "coaching_labels": model["coaching_labels"],
        "train_accuracy": float(network.score((x_train - scaler.mean_) / std, y_train)),
        "val_accuracy": float((val_predictions == y_val).mean()),
        "test_accuracy": float((test_predictions == y_test).mean()),
        "report": {label: {
            "precision": float(report[label]["precision"]),
            "recall": float(report[label]["recall"]),
            "f1": float(report[label]["f1-score"]),
            "support": int(report[label]["support"]),
        } for label in classes},
        "per_class_accuracy": per_class_accuracy,
        "macro": {
            "precision": macro["precision"],
            "recall": macro["recall"],
            "f1": macro["f1-score"],
        },
        "confusion": matrix.tolist(),
        "mediapipe_skipped_by_label": skipped["by_label_and_split"],
        "mediapipe_skip_reasons_by_label": skipped["reasons_by_label"],
        "confidence_hist": {"bins": [round(value, 2) for value in confidence_bins.tolist()],
                     "counts": confidence_counts.tolist()},
    }

    model_dir = ROOT / "backend" / "models"
    public_dir = ROOT / "frontend" / "public"
    model_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    for destination, contents in ((model_dir / "model.json", model),
                                  (public_dir / "model.json", model),
                                  (model_dir / "metrics.json", metrics)):
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=destination.parent,
                                         delete=False, suffix=".tmp") as handle:
            json.dump(contents, handle, separators=(",", ":"))
            temp_path = Path(handle.name)
        os.replace(temp_path, destination)

    report_path = model_dir / "yoga82_per_class_report.csv"
    report_fields = ("label", "test_accuracy", "test_correct", "test_images", "skipped_total",
                     "skipped_train", "skipped_val", "skipped_test", "skipped_unreadable",
                     "skipped_no_landmarks", "skipped_error", "coaching_pose")
    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=report_fields)
        writer.writeheader()
        for label in classes:
            accuracy = per_class_accuracy[label]["accuracy"]
            split_skips = skipped["by_label_and_split"][label]
            reasons = skipped["reasons_by_label"][label]
            writer.writerow({
                "label": label,
                "test_accuracy": "" if accuracy is None else f"{accuracy:.6f}",
                "test_correct": per_class_accuracy[label]["correct"],
                "test_images": per_class_accuracy[label]["test_images"],
                "skipped_total": sum(split_skips.values()),
                "skipped_train": split_skips["train"],
                "skipped_val": split_skips["val"],
                "skipped_test": split_skips["test"],
                "skipped_unreadable": reasons["unreadable"],
                "skipped_no_landmarks": reasons["no_landmarks"],
                "skipped_error": reasons["error"],
                "coaching_pose": model["coaching_labels"][label] or "",
            })

    print(f"Official split usable samples: train={len(x_train)}, val={len(x_val)}, test={len(x_test)}")
    plank_label_id = int(label_map["Plank_Pose_or_Kumbhakasana_"]["id"])
    print(f"Final train count for Plank: {int((y_train == plank_label_id).sum())}")
    print(f"Overall test accuracy: {metrics['test_accuracy']:.4f}; macro F1: {metrics['macro']['f1']:.4f}")
    print("Per-label test accuracy and MediaPipe skips (all splits):")
    for label in classes:
        accuracy = per_class_accuracy[label]["accuracy"]
        shown_accuracy = "n/a" if accuracy is None else f"{accuracy:.4f}"
        counts = skipped["by_label_and_split"][label]
        print(f"{label}\ttest_accuracy={shown_accuracy}\ttest_n={per_class_accuracy[label]['test_images']}\tmediapipe_skipped={sum(counts.values())}")
    print("Labels with coaching:")
    for label, coaching_label in model["coaching_labels"].items():
        if coaching_label:
            print(f"{label} -> {coaching_label}")
    print("Wrote backend/models/model.json, backend/models/metrics.json, frontend/public/model.json, and backend/models/yoga82_per_class_report.csv")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True, help="local Yoga-82 ZIP containing the reports and image folders")
    parser.add_argument("--force-features", action="store_true", help="re-run MediaPipe even if the feature cache matches")
    args = parser.parse_args()

    indexed, classes, label_map, archive_image_count = load_reports(args.archive)
    kaggle_rows, kaggle_counts = collect_kaggle_training_rows(classes, label_map)
    extract_indexed_images(indexed, args.archive)
    base_x, base_y, base_splits, base_skipped = extract_features(indexed, classes, force=args.force_features)
    kaggle_x, kaggle_y, kaggle_splits, kaggle_skipped = extract_kaggle_features(kaggle_rows, classes, force=args.force_features)
    x = np.concatenate((base_x, kaggle_x), axis=0)
    y = np.concatenate((base_y, kaggle_y), axis=0)
    splits = np.concatenate((base_splits, kaggle_splits), axis=0)
    skipped = merge_skip_reports(base_skipped, kaggle_skipped, classes)
    train_model(x, y, splits, classes, label_map, skipped, indexed,
                archive_image_count, kaggle_rows, kaggle_counts, len(kaggle_x))


if __name__ == "__main__":
    main()