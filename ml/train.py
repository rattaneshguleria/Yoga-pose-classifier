"""Train the yoga pose classifier from an image dataset and export everything the app needs.

Dataset layout (Yoga-82 subset, Kaggle yoga-poses sets, or your own):
    data/<class name>/*.jpg     class folder names should match pose names in poses.json
                                ("Warrior II", "Tree Pose", ...) so form rules apply to them.
Run:
    python ml/train.py --data data --dataset-name "<name>" --licence "<licence>"
Outputs: backend/models/model.json + metrics.json, frontend/public/model.json (same weights).
Nothing is invented: dataset name and licence must be passed in by you.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.features import extract  # noqa: E402  (same features as the browser)

EXT = {".jpg", ".jpeg", ".png"}


def build_features(data_dir: Path):
    import cv2
    from app import pose_backend
    X, y, skipped = [], [], 0
    classes = sorted(d.name for d in data_dir.iterdir() if d.is_dir())
    for ci, c in enumerate(classes):
        files = [f for f in (data_dir / c).rglob("*") if f.suffix.lower() in EXT]
        for f in files:
            img = cv2.imread(str(f))
            lms = pose_backend.detect_image(img) if img is not None else None
            if lms is None: skipped += 1; continue
            h, w = img.shape[:2]; X.append(extract(lms, w / h)); y.append(ci)
        print(f"{c}: {len(files)} images")
    print(f"skipped (no person / unreadable): {skipped}")
    return np.array(X), np.array(y), classes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path); ap.add_argument("--cache", type=Path, default=ROOT / "ml" / "features.npz")
    ap.add_argument("--from-cache", action="store_true", help="skip landmark extraction, reuse --cache")
    ap.add_argument("--dataset-name", required=True); ap.add_argument("--licence", required=True)
    ap.add_argument("--out-dir", type=Path, default=ROOT / "backend" / "models")
    ap.add_argument("--public-dir", type=Path, default=ROOT / "frontend" / "public")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()

    if a.from_cache:
        z = np.load(a.cache, allow_pickle=True); X, y, classes = z["X"], z["y"], list(z["classes"])
    else:
        X, y, classes = build_features(a.data); np.savez(a.cache, X=X, y=y, classes=np.array(classes))

    from sklearn.model_selection import train_test_split
    from sklearn.neural_network import MLPClassifier
    from sklearn.metrics import classification_report, confusion_matrix
    from sklearn.preprocessing import StandardScaler
    Xtr, Xtmp, ytr, ytmp = train_test_split(X, y, test_size=.30, stratify=y, random_state=a.seed)
    Xva, Xte, yva, yte = train_test_split(Xtmp, ytmp, test_size=.50, stratify=ytmp, random_state=a.seed)

    sc = StandardScaler().fit(Xtr); std = np.where(sc.scale_ == 0, 1, sc.scale_)
    net = MLPClassifier(hidden_layer_sizes=(128, 64), alpha=1e-3, early_stopping=True, validation_fraction=.15,
                        max_iter=400, random_state=a.seed).fit(sc.transform(Xtr), ytr)
    proba = net.predict_proba(sc.transform(Xte)); pred = proba.argmax(1)
    rep = classification_report(yte, pred, labels=range(len(classes)), target_names=classes, output_dict=True, zero_division=0)
    counts, bins = np.histogram(proba.max(1), bins=10, range=(0, 1))

    metrics = {
        "dataset": {"name": a.dataset_name, "licence": a.licence, "samples": int(len(X)), "train": len(Xtr), "val": len(Xva), "test": len(Xte)},
        "architecture": [{"layer": "Input", "detail": f"{X.shape[1]} features"}, {"layer": "Standardise", "detail": "train mean/std"},
                         {"layer": "Dense + ReLU", "detail": "128"}, {"layer": "Dense + ReLU", "detail": "64"}, {"layer": "Dense + softmax", "detail": str(len(classes))}],
        "classes": classes,
        "train_accuracy": float(net.score(sc.transform(Xtr), ytr)), "val_accuracy": float(net.score(sc.transform(Xva), yva)),
        "test_accuracy": float((pred == yte).mean()),
        "report": {c: {k: float(rep[c][k]) for k in ("precision", "recall")} | {"f1": float(rep[c]["f1-score"]), "support": int(rep[c]["support"])} for c in classes},
        "macro": {"precision": float(rep["macro avg"]["precision"]), "recall": float(rep["macro avg"]["recall"]), "f1": float(rep["macro avg"]["f1-score"])},
        "confusion": confusion_matrix(yte, pred, labels=range(len(classes))).tolist(),
        "confidence_hist": {"bins": [round(b, 2) for b in bins.tolist()], "counts": counts.tolist()},
    }
    # coefs_ are (in, out); the app stores (out, in)
    model = {"classes": classes, "mean": sc.mean_.tolist(), "std": std.tolist(),
             "layers": [{"W": W.T.tolist(), "b": b.tolist()} for W, b in zip(net.coefs_, net.intercepts_)]}
    a.out_dir.mkdir(parents=True, exist_ok=True); a.public_dir.mkdir(parents=True, exist_ok=True)
    (a.out_dir / "metrics.json").write_text(json.dumps(metrics, indent=1))
    for d in (a.out_dir, a.public_dir): (d / "model.json").write_text(json.dumps(model))
    print(f"test accuracy {metrics['test_accuracy']:.3f}, macro F1 {metrics['macro']['f1']:.3f}. Wrote model + metrics.")


if __name__ == "__main__":
    main()
