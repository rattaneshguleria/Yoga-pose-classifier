"""Real landmark extraction: OpenCV decode/preprocess + MediaPipe Pose."""
import threading
import cv2
import numpy as np

_lock, _pose = threading.Lock(), None


def _get():
    global _pose
    if _pose is None:
        import mediapipe as mp  # imported lazily so tests/tools that don't need it still run
        _pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1)
    return _pose


def decode(data: bytes, max_side: int = 1280):
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    h, w = img.shape[:2]
    if max(h, w) > max_side:
        k = max_side / max(h, w)
        img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA)
    return img


def landmarks_from_bgr(img):
    """BGR ndarray -> list of 33 {x,y,z,visibility} dicts, or None if no person found."""
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    with _lock:
        res = _get().process(rgb)
    if not res.pose_landmarks:
        return None
    return [{"x": p.x, "y": p.y, "z": p.z, "visibility": p.visibility} for p in res.pose_landmarks.landmark]
