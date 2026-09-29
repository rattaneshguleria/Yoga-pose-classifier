"""MediaPipe Pose Landmarker (Tasks API) for the server and for ml/train.py.
Uses the same lite model as the browser. Downloaded once into models/ on first use."""
import threading, urllib.request
from pathlib import Path

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
MODEL_FILE = Path(__file__).resolve().parents[1] / "models" / "pose_landmarker_lite.task"
_lock, _still = threading.Lock(), None


def ensure_model() -> str:
    if not MODEL_FILE.exists():
        MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_FILE)
    return str(MODEL_FILE)


def _create(video: bool):
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision
    mode = vision.RunningMode.VIDEO if video else vision.RunningMode.IMAGE
    return vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=mpt.BaseOptions(model_asset_path=ensure_model()), running_mode=mode, num_poses=1))


def _mp_image(bgr):
    import cv2, mediapipe as mp
    return mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def _to_list(res):
    if not res.pose_landmarks: return None
    return [{"x": l.x, "y": l.y, "z": l.z, "visibility": l.visibility or 0.0} for l in res.pose_landmarks[0]]


def detect_image(bgr):
    """Landmarks for one BGR image (OpenCV array) or None if no person is found."""
    global _still
    with _lock:
        _still = _still or _create(False)
        return _to_list(_still.detect(_mp_image(bgr)))


class VideoDetector:
    """Stateful detector for frames of one video, timestamps in ms must increase."""
    def __enter__(self): self.lm = _create(True); return self
    def __exit__(self, *a): self.lm.close()
    def detect(self, bgr, ts_ms: int): return _to_list(self.lm.detect_for_video(_mp_image(bgr), ts_ms))
