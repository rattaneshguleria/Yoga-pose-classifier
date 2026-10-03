"""YOGAVISION API. Run: uvicorn app.main:app --reload
Real inference: MediaPipe Pose + OpenCV. Classification uses the trained MLP if models/model.json
exists, otherwise the rule-based fit. Install requirements.txt or endpoints return 503."""
import json, os, tempfile
from pathlib import Path
from fastapi import FastAPI, File, Header, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import classifier, store
from .pose_logic import POSES as POSE_DB, classify_rules, evaluate

app = FastAPI(title="YOGAVISION API")
cors_origins = [origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_methods=["*"], allow_headers=["*"])
store.init()


def current_user(authorization: str | None = Header(default=None)):
    token = store.extract_bearer_token(authorization)
    if not token:
        return None
    return store.get_user_by_token(token)


def _cv():
    try:
        import cv2, numpy as np
        from . import pose_backend
        return cv2, np, pose_backend
    except ImportError:
        raise HTTPException(503, "Install opencv-python and mediapipe (see requirements.txt)")


def infer_landmarks(image_bytes: bytes):
    """Decode with OpenCV, detect with MediaPipe. Returns (landmarks | None, aspect)."""
    cv2, np, pb = _cv()
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None: raise HTTPException(400, "Could not decode image")
    h, w = img.shape[:2]
    return pb.detect_image(img), w / h


def classify_pose(lms, aspect=1.0):
    return classifier.predict(lms, aspect) or classify_rules(lms, aspect)


def coaching_pose(pose):
    known = {item["name"] for item in POSE_DB}
    if pose in known:
        return pose
    model = classifier.load() or {}
    mapped = model.get("coaching_labels", {}).get(pose)
    return mapped if mapped in known else None


def analyse(lms, aspect, target=None):
    pose, conf = classify_pose(lms, aspect)
    known = {item["name"] for item in POSE_DB}
    coach_pose = target if target in known else coaching_pose(pose) if target is None else None
    return {"pose": target or pose, "detected_pose": pose, "coach_pose": coach_pose,
            "confidence": conf, "landmarks": lms,
            "classifier": "model" if classifier.load() else "rules",
            **evaluate(coach_pose or pose, lms, aspect)}


@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    lms, aspect = infer_landmarks(await file.read())
    if lms is None: raise HTTPException(422, "No person detected")
    return analyse(lms, aspect)


@app.post("/api/analyze/video")
async def analyze_video(file: UploadFile = File(...), fps_sample: float = 4.0, max_seconds: int = 120):
    cv2, _, pb = _cv()
    with tempfile.NamedTemporaryFile(suffix=Path(file.filename or "v.mp4").suffix) as tmp:
        tmp.write(await file.read()); tmp.flush()
        cap = cv2.VideoCapture(tmp.name); fps = cap.get(cv2.CAP_PROP_FPS) or 25
        step, frames, i = max(1, round(fps / fps_sample)), [], 0
        with pb.VideoDetector() as det:
            while cap.isOpened() and i / fps <= max_seconds:
                ok, img = cap.read()
                if not ok: break
                if i % step == 0:
                    h, w = img.shape[:2]; lms = det.detect(img, int(i / fps * 1000))
                    if lms:
                        r = analyse(lms, w / h); r.pop("landmarks"); r["t"] = round(i / fps, 2); frames.append(r)
                i += 1
        cap.release()
    if not frames: raise HTTPException(422, "No person detected in video")
    segments = []
    for f in frames:
        s = segments[-1] if segments else None
        if s and s["pose"] == f["pose"]: s["end"] = f["t"]
        else: segments.append({"pose": f["pose"], "start": f["t"], "end": f["t"]})
    issues = [{"t": f["t"], "joint": e["joint"], "severity": e["severity"]} for f in frames for e in f["errors"] if e["severity"] == "incorrect"]
    scored = [frame["form_score"] for frame in frames if frame["form_score"] is not None]
    return {"frames": frames, "segments": segments, "issues": issues,
            "overall_score": round(sum(scored) / len(scored), 2) if scored else None,
            "recognition_only": not scored}


@app.post("/api/classify/pose")
async def classify(payload: dict):
    pose, conf = classify_pose(payload["landmarks"], payload.get("aspect", 1.0))
    return {"pose": pose, "coach_pose": coaching_pose(pose), "confidence": conf,
            "source": "model" if classifier.load() else "rules"}


@app.post("/api/analyze/posture")
async def analyze_posture(payload: dict):
    return evaluate(payload["pose"], payload["landmarks"], payload.get("aspect", 1.0))


@app.get("/api/poses")
def poses(): return POSE_DB


@app.get("/api/poses/{pose_id}")
def pose(pose_id: str): return next((p for p in POSE_DB if p["id"] == pose_id), None) or HTTPException(404)


@app.post("/api/auth/register")
def register(payload: dict):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or len(password) < 6:
        raise HTTPException(400, "Username and password are required (password must be at least 6 characters).")
    try:
        user = store.create_user(username, password)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    token = store.create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"]}}


@app.post("/api/auth/login")
def login(payload: dict):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    user = store.authenticate_user(username, password)
    if not user:
        raise HTTPException(401, "Invalid username or password")
    token = store.create_token(user["id"])
    return {"token": token, "user": user}


@app.get("/api/auth/me")
def me(authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {"id": user["id"], "username": user["username"]}


@app.post("/api/auth/logout")
def logout(authorization: str | None = Header(default=None)):
    token = store.extract_bearer_token(authorization)
    if token:
        store.delete_token(token)
    return {"ok": True}


@app.get("/api/sessions")
def sessions(authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    return store.list_sessions(user_id=user["id"] if user else None)


@app.get("/api/sessions/{sid}")
def session(sid: str, authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    s = store.get_session(sid, user_id=user["id"] if user else None)
    if not s: raise HTTPException(404, "Session not found")
    return s


@app.post("/api/sessions")
def save_session(payload: dict, authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    return {"id": store.add_session(payload, user_id=user["id"] if user else None)}


@app.get("/api/analytics")
def analytics(days: int = 30, authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    return store.analytics(days, user_id=user["id"] if user else None)


METRICS_PATH = Path(__file__).resolve().parents[1] / "models" / "metrics.json"


@app.get("/api/model/metrics")
def metrics():
    """Written by ml/train.py. Never fabricated: 404 until a model is trained."""
    if not METRICS_PATH.exists(): raise HTTPException(404, "Model has not been trained yet")
    return json.loads(METRICS_PATH.read_text())


@app.websocket("/ws/live-analysis")
async def live(ws: WebSocket):
    """Client sends JSON {"landmarks": [...], "aspect": 1.33, "target_pose": "Tree Pose"} per frame,
    or raw JPEG bytes for server-side detection. Replies with the same JSON shape as /api/analyze/image."""
    await ws.accept()
    try:
        while True:
            msg = await ws.receive()
            if msg.get("bytes"):
                lms, aspect = infer_landmarks(msg["bytes"]); target = None
            else:
                d = json.loads(msg["text"]); lms, aspect, target = d["landmarks"], d.get("aspect", 1.0), d.get("target_pose")
            await ws.send_json(analyse(lms, aspect, target) if lms else {"error": "No person detected"})
    except WebSocketDisconnect:
        pass
