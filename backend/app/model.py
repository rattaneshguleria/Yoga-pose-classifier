"""Loads the trained pose classifier if ml/train.py has produced one."""
from pathlib import Path
from .features import features

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "pose_mlp.joblib"
_bundle, _tried = None, False


def bundle():
    global _bundle, _tried
    if not _tried:
        _tried = True
        if MODEL_PATH.exists():
            import joblib
            _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict(lms, aspect=1.0):
    """-> (pose_name, softmax_probability) or None when no trained model is installed."""
    b = bundle()
    if b is None:
        return None
    p = b["pipeline"].predict_proba([features(lms, aspect)])[0]
    i = int(p.argmax())
    return b["classes"][i], round(float(p[i]), 3)
