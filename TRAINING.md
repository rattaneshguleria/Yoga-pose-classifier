# Training the YOGAVISION classifier

## Recommended dataset (already wired up)

**Yoga Poses Dataset** (Kaggle, niharika41298) — 1,551 images, 5 classes: Down dog,
Goddess, Plank, Tree, Warrior 2. https://www.kaggle.com/datasets/niharika41298/yoga-poses-dataset
Check the dataset page for its exact licence before using it in a public demo.

This maps onto 5 of the poses in `frontend/src/lib/poses.json` (Goddess Pose has
been added with starting angle rules to use all 5 classes):

| Kaggle class | Maps to |
|---|---|
| downdog | Downward Dog |
| goddess | Goddess Pose |
| plank | Plank |
| tree | Tree Pose |
| warrior2 | Warrior II |

### 1. Download and sort it (run locally — this needs internet)

```
pip install kagglehub
cd yogavision
python ml/prepare_dataset.py
```

This downloads the dataset via `kagglehub` (a free Kaggle account is required; the
first run may prompt you to log in or set up an API token at
https://www.kaggle.com/settings under "API"), then copies the images into:

```
data/
  Downward Dog/*.jpg
  Goddess Pose/*.jpg
  Plank/*.jpg
  Tree Pose/*.jpg
  Warrior II/*.jpg
```

### 2. Install training dependencies and train

```
cd backend
pip install -r requirements.txt
cd ..
python ml/train.py --data data --dataset-name "Yoga Poses Dataset (Kaggle, niharika41298)" --licence "<licence from the dataset page>"
```

This trains on only the 5 classes present in `data/` — the other 4 poses
(Mountain, Downward-facing rules aside, Cobra, Chair, Triangle) will simply have no
training images yet, which is fine: the app still uses the rule-based angle checks
for them, and Model Insights will report accuracy on the 5 trained classes only.
Add more images under `data/<Pose Name>/` later (any source) and rerun to expand
coverage — no code changes needed, `ml/train.py` picks up whatever folders exist.

## Other datasets

If you'd rather use a different dataset, get it into the same
`data/<Pose Name>/*.jpg` layout by hand, with folder names matching entries in
`frontend/src/lib/poses.json`, then skip straight to step 2 above.

## Train Yoga-82 plus Kaggle samples (78 classes)

The project's public Drive folder includes `_reports/dataset_index.csv` and
`_reports/label_map.json`. Use the manifest-based trainer to download only indexed
images and retain the official train/validation/test assignments. Unlisted or dropped
JPGs are excluded, and validation/test examples are not used to fit the model.

```powershell
cd backend
python -m pip install -r requirements.txt
cd ..
python ml/train_yoga82.py --archive "$env:USERPROFILE\Downloads\yoga82_data-20261003T174513Z-1-001.zip"
```

The script extracts only manifest-listed Yoga-82 images and caches their MediaPipe
features under `data/yoga82/`. It also appends images from the five prepared Kaggle
folders as **training-only** samples: Downward Dog, Plank, Tree Pose, and Warrior II
augment matching Yoga-82 labels; Goddess Pose is added as class 78. Mountain Pose is
not sourced or overwritten by this step. Official Yoga-82 validation/test assignments
remain unchanged, and Kaggle images are never added to those splits.

All caches are under `data/`, which is git-ignored. The model and metrics are written
to `backend/models/` and `frontend/public/`. Test accuracy is calculated on the
official Yoga-82 test split; Goddess has no official test examples, so its per-class
test accuracy is shown as unavailable. MediaPipe skip counts include both sources.
The complete per-class report is `backend/models/yoga82_per_class_report.csv`.

The existing `data/<pose>/` directories and nine authored pose definitions remain
untouched. Only labels with an exact configured alias to an existing definition get
form coaching; other predictions are recognition-only.

Yoga-82's terms restrict use to non-commercial research and education, and source image
rights vary. Review those rights before public or commercial distribution.

## What training produces

- `backend/models/model.json` — weights the FastAPI backend loads at runtime
- `backend/models/metrics.json` — accuracy, precision/recall/F1, confusion matrix,
  confidence histogram, read verbatim by `/api/model/metrics` and shown on `/model`
- `frontend/public/model.json` — the same weights, loaded by the browser at startup
  so Live Coach and Pose Analyzer use the trained model too

Re-running `ml/train.py` overwrites all three files.

## Verify it took effect

- Restart `uvicorn` and reload the frontend.
- Open `/model` — you should see real numbers instead of "Model not trained yet".
- Open Live Coach or Pose Analyzer — the confidence label should read "Confidence"
  instead of "Match", meaning the trained model is being used.

## Add more poses (optional)

To support a pose beyond the current eight:
1. Add an entry to `frontend/src/lib/poses.json` with `id`, `name`, `category`,
   `difficulty`, `muscles`, `benefits`, `steps`, `mistakes`, and a `rules` object
   (angle ranges per joint — copy an existing pose's shape and estimate ranges, then
   refine them by testing on yourself in Live Coach).
2. Add a folder of images for it under `data/<Pose Name>/`.
3. Re-run `ml/train.py`.

If you want a reference skeleton for Pose Comparison, add a 13-point `ref` array in
the same order used by existing poses (see any `ref` entry in `poses.json`) — hand-
author it by eyeballing a good photo of the pose, normalised to a 0-1 square.
