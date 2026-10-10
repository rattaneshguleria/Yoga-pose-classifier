# YogaVision

YogaVision is a yoga-pose recognition and posture-coaching app. It combines
browser-based pose detection, pose rules, an optional trained classifier, and
account-based session history.

## Features

- **Live Coach** with webcam analysis, camera calibration, and form feedback.
- **Pose Analyzer** for image analysis and **Video Analysis** for sampled video
  frames.
- **Pose Library**, dashboard, progress charts, saved sessions, and model
  evaluation insights.
- **Browser-first analysis:** camera frames and uploaded media are processed in
  the browser for the main coaching flows. The app sends landmark data, not
  camera video, to the backend for optional trained-model classification. Saved
  sessions contain analysis summaries.
- **Accounts and persistence:** MongoDB stores users, login tokens, and saved
  session summaries.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/` | React and Vite web application |
| `backend/` | FastAPI API, pose logic, and MongoDB storage |
| `ml/` | Classifier training and dataset preparation scripts |
| `data/` | Local training datasets and caches; excluded from Git |
| `backend/models/` | Backend model and evaluation metrics |
| `frontend/public/model.json` | Model weights served to the browser |
| `TRAINING.md` | Dataset, licensing, and training instructions |

## Requirements

- Python and the packages listed in `backend/requirements.txt`
- Node.js and npm
- A reachable MongoDB instance (local MongoDB or MongoDB Atlas)

## Run locally

### 1. Configure MongoDB

The backend loads `backend/.env` automatically. Create or update that file with
your own connection settings. Keep it private and do not commit it:

```dotenv
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=yogavision
CORS_ORIGINS=http://localhost:5173
```

For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.
Never put database credentials in source code or share them publicly.

### 2. Start the backend

In PowerShell, from the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. The database must be reachable when
the backend starts.

### 3. Start the frontend

Open a second PowerShell terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. During
development, Vite proxies `/api` and `/ws` requests to the local backend.
Allow camera access in the browser when using Live Coach.

## Classifier and training data

The app can use either:

- **Rule-based classification**, which compares detected landmarks with the
  authored pose rules.
- **The trained MLP classifier**, when model weights are present. The frontend
  reads `frontend/public/model.json`; the backend reads
  `backend/models/model.json`.

The model is used for inference without needing the original training images.
Training data and feature caches are local under `data/` and are ignored by
Git. Retraining generates model weights and evaluation metrics; it does not
happen automatically when frontend code changes.

For dataset preparation, training commands, generated artifacts, and licensing
guidance, see [TRAINING.md](TRAINING.md). Training writes metrics to
`backend/models/metrics.json`; the Model Insights page reads them from
`GET /api/model/metrics`.

## Data and API

The backend provides:

- Authentication: `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me`, and `POST /api/auth/logout`
- Pose data: `GET /api/poses` and `GET /api/poses/{pose_id}`
- Analysis: `POST /api/analyze/image`, `POST /api/analyze/video`,
  `POST /api/analyze/posture`, and `POST /api/classify/pose`
- Sessions: `GET /api/sessions`, `GET /api/sessions/{id}`, and
  `POST /api/sessions`
- Analytics and model metrics: `GET /api/analytics` and
  `GET /api/model/metrics`
- Live analysis WebSocket: `/ws/live-analysis`

Authenticated requests use a bearer token. A user's saved sessions are
associated with their account. When the database has no sessions, the backend
inserts clearly marked sample sessions; these are examples, not the user's
practice data.

## Tests and production build

Run the backend tests:

```powershell
cd backend
pytest
```

Build the frontend for production:

```powershell
cd frontend
npm run build
```

The frontend's production API base URL is configured with
`VITE_API_BASE_URL` (currently set in `frontend/.env.production`). Set the
backend's `CORS_ORIGINS` to the deployed frontend's exact origin. Keep
credentials in deployment environment settings or private local environment
files, never in committed files.

## Troubleshooting

- **Backend exits during startup:** verify that MongoDB is running or that the
  Atlas connection string, network access, and database user are configured
  correctly.
- **Frontend cannot reach the API:** check that the backend is running on port
  `8000` and that local requests are going through Vite's development proxy.
- **Camera does not start:** allow camera access in the browser and ensure no
  other application is using the camera.
- **Model Insights says metrics are unavailable:** check that
  `backend/models/metrics.json` exists and the backend is running.
- **MediaPipe model does not load:** check the network connection; the browser
  may need to download its pose model on first use.

## Limitations and security

- Classification quality depends on the training data, camera angle, and
  landmark visibility. Pose-angle rules are initial values and may not suit
  every person or camera orientation.
- Form coaching is available only for poses with authored rules. Other model
  predictions may be recognition-only.
- Video analysis samples approximately four frames per second and is capped at
  120 seconds by default.
- Authentication is demo-grade: passwords currently use unsalted SHA-256 and
  bearer tokens do not expire. Do not use this authentication setup for
  production accounts or sensitive data without replacing it with
  production-grade password hashing and token expiry.
- Review each dataset's licence and image-level rights before redistribution
  or commercial use. See [TRAINING.md](TRAINING.md) for dataset-specific
  guidance.yo yo yo 

  