"""Runs the trained MLP exported by ml/train.py (models/model.json). Pure NumPy, no ML runtime needed."""
import json
from pathlib import Path
import numpy as np
from .features import extract

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "model.json"
_model = None


def load():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = json.loads(MODEL_PATH.read_text())
    return _model


def forward(m, f):
    x = (np.asarray(f) - np.array(m["mean"])) / np.array(m["std"])
    for k, layer in enumerate(m["layers"]):
        x = np.array(layer["W"]) @ x + np.array(layer["b"])
        if k < len(m["layers"]) - 1: x = np.maximum(x, 0)
    e = np.exp(x - x.max()); return e / e.sum()


def predict(lms, aspect=1.0):
    """(pose, confidence) from the trained model, or None if no model has been trained yet."""
    m = load()
    if m is None: return None
    p = forward(m, extract(lms, aspect)); k = int(p.argmax())
    return m["classes"][k], round(float(p[k]), 2)
