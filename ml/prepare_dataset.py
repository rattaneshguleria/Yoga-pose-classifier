"""Download niharika41298/yoga-poses-dataset via kagglehub and sort it into the
data/<Pose Name>/ layout ml/train.py expects. Run this locally where you have
internet access (this sandbox has none) — Kaggle needs a free account and,
usually, an API token (~/.kaggle/kaggle.json) or a browser login the first time
kagglehub asks for one.

    pip install kagglehub
    python ml/prepare_dataset.py

Source dataset classes: downdog, goddess, plank, tree, warrior2
  -> Downward Dog, Goddess Pose, Plank, Tree Pose, Warrior II
"""
import re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data"

# Kaggle folder name (case/underscore-insensitive match) -> pose name in poses.json
MAP = {
    "downdog": "Downward Dog",
    "goddess": "Goddess Pose",
    "plank": "Plank",
    "tree": "Tree Pose",
    "warrior2": "Warrior II",
}


def norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def main():
    import kagglehub
    src = Path(kagglehub.dataset_download("niharika41298/yoga-poses-dataset"))
    print("Downloaded to:", src)

    norm_map = {norm(k): v for k, v in MAP.items()}
    found = {}
    for d in src.rglob("*"):
        if d.is_dir() and norm(d.name) in norm_map:
            found.setdefault(norm(d.name), []).append(d)

    if not found:
        raise SystemExit(f"No matching class folders found under {src}. "
                          f"List its contents and adjust MAP in this script.")

    OUT.mkdir(exist_ok=True)
    total = 0
    for key, dirs in found.items():
        pose = norm_map[key]
        dest = OUT / pose
        dest.mkdir(parents=True, exist_ok=True)
        n = 0
        for d in dirs:  # usually one from TRAIN/, one from TEST/ — merge both, train.py re-splits
            for f in d.iterdir():
                if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    shutil.copy2(f, dest / f"{d.parent.name}_{f.name}")
                    n += 1
        print(f"{pose}: {n} images")
        total += n

    missing = set(MAP.values()) - {norm_map[k] for k in found}
    if missing:
        print("Not found in this dataset (skipped):", ", ".join(missing))
    print(f"\nTotal images copied: {total}")
    print(f"Data ready at: {OUT}")
    print("\nNext:")
    print('  cd backend && pip install -r requirements.txt && cd ..')
    print('  python ml/train.py --data data --dataset-name "Yoga Poses Dataset (Kaggle, niharika41298)" --licence "CC0 / check dataset page"')


if __name__ == "__main__":
    main()
