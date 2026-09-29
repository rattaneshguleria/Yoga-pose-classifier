"""YOGAVISION API. Run: uvicorn app.main:app --reload
Real inference: MediaPipe Pose + OpenCV. Classification uses the trained MLP if models/model.json
exists, otherwise the rule-based fit. Install requirements.txt or endpoints return 503."""
import json, tempfile
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import classifier, store
from .pose_logic import POSES as POSE_DB, classify_rules, evaluate

app = FastAPI(title="YOGAVISION API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
store.init()


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


def analyse(lms, aspect, target=None):
    pose, conf = classify_pose(lms, aspect)
    return {"pose": target or pose, "confidence": conf, "landmarks": lms,
            "classifier": "model" if classifier.load() else "rules", **evaluate(target or pose, lms, aspect)}


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
    return {"frames": frames, "segments": segments, "issues": issues,
            "overall_score": round(sum(f["form_score"] for f in frames) / len(frames), 2)}


@app.post("/api/classify/pose")
async def classify(payload: dict):
    pose, conf = classify_pose(payload["landmarks"], payload.get("aspect", 1.0))
    return {"pose": pose, "confidence": conf}


@app.post("/api/analyze/posture")
async def analyze_posture(payload: dict):
    return evaluate(payload["pose"], payload["landmarks"], payload.get("aspect", 1.0))


@app.get("/api/poses")
def poses(): return POSE_DB


@app.get("/api/poses/{pose_id}")
def pose(pose_id: str): return next((p for p in POSE_DB if p["id"] == pose_id), None) or HTTPException(404)


@app.get("/api/sessions")
def sessions(): return store.list_sessions()


@app.get("/api/sessions/{sid}")
def session(sid: int):
    s = store.get_session(sid)
    if not s: raise HTTPException(404, "Session not found")
    return s


@app.post("/api/sessions")
def save_session(payload: dict): return {"id": store.add_session(payload)}


@app.get("/api/analytics")
def analytics(days: int = 30): return store.analytics(days)


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
