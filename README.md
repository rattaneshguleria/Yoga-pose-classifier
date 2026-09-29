# YOGAVISION

Computer-vision yoga pose detection and posture analysis. Built for a university
evaluator demo: real MediaPipe pose landmarks, joint-angle rules, a trainable
classifier, session analytics and a technical model-insights page.

## Architecture

```
Camera / image / video
        v
OpenCV preprocessing (server path) / native decode (browser path)
        v
MediaPipe Pose -> 33 landmarks
        v
Feature extraction (joint angles, hip-centred + torso-scaled coordinates)
        v
Pose classification  <- rule-based fit, or the trained MLP once ml/train.py has run
        v
Form / error detection (angle vs. target range per pose)
        v
Feedback generation (correction text per rule)
        v
Analytics (SQLite: sessions, per-joint time-in-range, aggregates)
```

Frontend: React + Vite + Tailwind, MediaPipe Tasks (`@mediapipe/tasks-vision`) running
**in the browser** for Live Coach, Pose Analyzer and Video Analysis — no frames leave
the device on that path. Backend: FastAPI + OpenCV + MediaPipe for the equivalent
server-side endpoints and for training.

The pose rules (angle ranges, corrections, steps, reference skeletons) live in
**one file**, `frontend/src/lib/poses.json`, read by both the JS and the Python engine
(`backend/app/pose_logic.py`), so they cannot drift apart.

## Run it

Backend:
```
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
First image/video request downloads the MediaPipe pose model (~6 MB) into `backend/models/`.

Frontend:
```
cd frontend
npm install
npm run dev
```
Open the printed localhost URL. `/api` and `/ws` are proxied to the backend (see `vite.config.js`).

Tests:
```
cd backend
pip install -r requirements.txt
pytest
```

## Training the pose classifier

See **TRAINING.md** for full instructions. Short version:
```
cd backend && pip install -r requirements.txt
python ../ml/train.py --data /path/to/dataset --dataset-name "Yoga-82 (subset)" --licence "..."
```
This writes `backend/models/model.json` + `metrics.json` and `frontend/public/model.json`.
Once `model.json` exists, Live Coach and Pose Analyzer automatically switch from the
rule-based classifier to the trained model (the UI label changes from "Match" to
"Confidence"), and Model Insights (`/model`) shows the real evaluation metrics instead
of its empty state.

## Known limitations (be upfront about these with the evaluator)

- **Reference skeletons** for Pose Comparison exist only for Warrior II, Tree Pose and
  Mountain Pose; other poses show a "not authored yet" note.
- **Angle thresholds** are reasonable starting values, not derived from measuring real
  practitioners. Tune them in `frontend/src/lib/poses.json` (`rules` field); both
  frontend and backend read that one file.
- **Classifier**: until you run `ml/train.py`, pose "classification" is a rule-based
  best fit against the angle tables, not a learned model. This is clearly labelled in
  the UI ("Match" vs "Confidence") and in Model Insights.
- **Video analysis** samples ~4 frames/second and caps at 120 seconds by default
  (`fps_sample`, `max_seconds` params on `/api/analyze/video`).
- **Left/right mirroring**: the evaluator picks whichever mirrored rule set fits the
  measured angles better, which works for symmetric framing but can misjudge poses
  photographed from unusual angles.
- **Server-side camera streaming** (`/ws/live-analysis` with raw JPEG bytes) is
  implemented but not the default path; the browser-only path is what Live Coach uses.
- Nothing in this codebase was run end-to-end in this environment (no Node/browser
  available); backend Python logic was unit-tested with `pytest`, but you should run
  both `npm run dev` and `uvicorn` yourself before presenting and fix anything that
  surfaces.

## Demo script (suggested)

1. **Landing** (`/welcome`) — pitch, then into the app.
2. **Live Coach** — calibrate, hold Warrior II or Tree Pose, show corrections updating
   live, save a session.
3. **Pose Analyzer** — upload a photo, show joint-by-joint breakdown, error reasoning,
   and Pose Comparison against the reference skeleton.
4. **Video Analysis** — upload a short practice clip, click an issue marker to jump to
   it.
5. **Dashboard / Progress / Sessions** — show the saved session and trend charts.
6. **Model Insights** — walk the pipeline, then the confusion matrix and metrics if
   you've trained a model; otherwise explain the rule-based fallback honestly.
