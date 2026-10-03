# YogaVision

Yoga pose detection and posture analysis using MediaPipe landmarks, pose rules, optional
ML classification, and session analytics. The app includes a React frontend, a FastAPI
backend, MongoDB persistence, and account-based access to saved analyses.

## Features

- Live Coach, image analysis, video analysis, pose library, progress dashboard, and model
  insights.
- Browser-based pose detection for the main coaching and analysis flows. Camera frames
  stay on the device in those flows; server analysis endpoints are also available.
- Register and log in with a username and password. Saved sessions and analytics are
  associated with the logged-in user.
- MongoDB stores users, bearer tokens, and analysis sessions. Sample sessions are added
  when the database has no sessions; they are marked as samples and are not user data.
- Pose rules are shared from `frontend/src/lib/poses.json` with the Python pose engine.

## Stack

- Frontend: React, Vite, Tailwind CSS, MediaPipe Tasks Vision.
- Backend: FastAPI, OpenCV, MediaPipe, PyMongo.
- Database: MongoDB, configured with `MONGODB_URI` and `MONGODB_DATABASE`.
- ML: rule-based classification by default; an MLP can be trained with `ml/train.py`.

## Requirements

- Python with the packages in `backend/requirements.txt`.
- Node.js and npm.
- A reachable MongoDB server, local or hosted. The default is `mongodb://localhost:27017`.

## Configure MongoDB

Set these environment variables before starting the backend. `MONGODB_DATABASE` is
optional and defaults to `yogavision`.

PowerShell, using a local MongoDB server:

```powershell
$env:MONGODB_URI = "mongodb://localhost:27017"
$env:MONGODB_DATABASE = "yogavision"
$env:CORS_ORIGINS = "http://localhost:5173"
```

For MongoDB Atlas, set `MONGODB_URI` to the connection string from your Atlas deployment.
Do not commit credentials or a populated `.env` file. The backend automatically loads
`backend/.env` when it starts; environment variables already set by the deployment
environment take precedence. `backend/.env.example` is a template and is not loaded
automatically.

For deployment, set `CORS_ORIGINS` on the backend to the exact frontend origin, for
example `https://your-frontend.example.com`. Multiple origins can be comma-separated.
The production frontend uses `VITE_API_BASE_URL` to target the backend; the provided
`frontend/.env.production` points to the current Render API.

## Run Locally

Start the backend in one terminal:

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the localhost URL printed by Vite. The Vite configuration proxies `/api` and `/ws`
to the backend. The first server-side image or video request may download the MediaPipe
pose model into `backend/models/`.

## Authentication and Data

The frontend login page is at `/login`. The backend provides:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and
  `POST /api/auth/logout`.
- `GET /api/sessions`, `GET /api/sessions/{id}`, and `POST /api/sessions`.
- `GET /api/analytics?days=30`.

Authenticated requests use a bearer token. Session IDs are MongoDB ObjectIds represented
as strings. User sessions are only returned to their owner; unauthenticated session
listing is limited to public/sample records. Switching the storage backend does not
automatically copy records from an earlier SQLite database.

## Tests

```powershell
cd backend
pytest
```

The session-storage test uses `mongomock`, so the test suite does not require a running
MongoDB server. The app itself does require a reachable MongoDB server at startup.

## Train the Classifier

See [TRAINING.md](TRAINING.md) for dataset and licensing guidance. Basic command:

```powershell
cd backend
python ../ml/train.py --data /path/to/dataset --dataset-name "Yoga-82 (subset)" --licence "dataset licence"
```

Training writes model and metrics files under `backend/models/` and `frontend/public/`.
When a trained model is present, the supported frontend flows use it instead of the
rule-based classifier, and Model Insights displays its evaluation metrics.

## Current Limitations

- Without a trained model, classification is a best fit against the authored pose rules.
- Pose-comparison reference skeletons are authored for Warrior II, Tree Pose, and
  Mountain Pose.
- Angle thresholds are initial values and may misjudge unusual camera angles or
  left/right mirroring.
- Video analysis samples about four frames per second and defaults to a 120-second cap.
- Authentication is suitable for a demo, not production as currently implemented:
  passwords use unsalted SHA-256 hashes, and bearer tokens do not expire. Use a
  password-hashing algorithm designed for credentials and add token expiration before
  deploying with real users.
