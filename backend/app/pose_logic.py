"""Joint-angle analysis + rule-based form checking. Mirror of frontend/src/lib/analysis.js
(keep both in sync). Input: 33 MediaPipe landmarks [{"x","y","z","visibility"}] + image aspect (w/h)."""
import json
from pathlib import Path
import numpy as np

# Single source of truth shared with the frontend.
POSES_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "poses.json"
POSES = json.loads(POSES_PATH.read_text())
POSE_RULES = {p["name"]: p["rules"] for p in POSES}

IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
JOINTS = {"left_elbow": (11, 13, 15), "right_elbow": (12, 14, 16), "left_knee": (23, 25, 27),
          "right_knee": (24, 26, 28), "left_hip": (11, 23, 25), "right_hip": (12, 24, 26)}


def pts(lms, aspect=1.0):
    a = np.array([[p["x"], p["y"]] for p in lms], dtype=float)
    a[:, 0] *= aspect  # angles are only correct in an isotropic space
    return a


def angle(a, b, c) -> float:
    ba, bc = a - b, c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


def joint_angles(P):
    return {n: round(angle(P[a], P[v], P[c])) for n, (a, v, c) in JOINTS.items()}


def torso_lean(P) -> float:
    s, h = (P[11] + P[12]) / 2, (P[23] + P[24]) / 2
    return float(abs(np.degrees(np.arctan2(s[0] - h[0], h[1] - s[1]))))


def shoulder_tilt(P) -> float:
    d = P[12] - P[11]
    return float(abs(np.degrees(np.arctan2(d[1], abs(d[0]) + 1e-8))))


def _dev(v, lo, hi):
    return lo - v if v < lo else v - hi if v > hi else 0


def _swap(rules):
    def s(j): return j.replace("left", "right") if j.startswith("left") else j.replace("right", "left")
    return {s(j): v for j, v in rules.items()}


def _fit(rules, ang):
    s = [max(0.0, 1 - _dev(ang[j], lo, hi) / 40) for j, (lo, hi, *_) in rules.items() if j in ang]
    return sum(s) / len(s) if s else 0.0


def _orient(pose, ang):
    r = POSE_RULES[pose]; m = _swap(r)
    return r if _fit(r, ang) >= _fit(m, ang) else m


def classify_rules(lms, aspect=1.0):
    """Rule-based fallback classifier: best fit of measured angles to each pose's ranges."""
    ang = joint_angles(pts(lms, aspect))
    ranked = sorted(((p, _fit(_orient(p, ang), ang)) for p in POSE_RULES), key=lambda x: -x[1])
    return ranked[0][0], round(ranked[0][1], 2)


def evaluate(pose, lms, aspect=1.0):
    P = pts(lms, aspect); ang = joint_angles(P)
    if pose not in POSE_RULES:
        return {"joint_angles": ang, "errors": [], "corrections": [], "form_score": None, "recognition_only": True}
    rules = _orient(pose, ang)
    errors, corrections = [], []
    for j, (lo, hi, low, high) in rules.items():
        d = _dev(ang[j], lo, hi)
        if not d: continue
        errors.append({"joint": j, "detected": ang[j], "expected": [lo, hi],
                       "severity": "incorrect" if d > 20 else "warning", "landmark": JOINTS[j][1]})
        msg = low if ang[j] < lo else (high or low)
        if msg: corrections.append(msg)
    lean, tilt = torso_lean(P), shoulder_tilt(P)
    if lean > 12:
        errors.append({"joint": "spine", "detected": round(lean, 1), "expected": [0, 12], "severity": "warning", "landmark": 11})
        corrections.append("Keep your torso upright.")
    if tilt > 6:
        errors.append({"joint": "shoulders", "detected": round(tilt, 1), "expected": [0, 6], "severity": "warning", "landmark": 12})
        corrections.append("Level your shoulders.")
    penalty = sum(1.0 if e["severity"] == "incorrect" else 0.5 for e in errors)
    return {"joint_angles": ang, "errors": errors, "corrections": corrections,
            "form_score": round(max(0.0, 1 - penalty / (len(rules) + 2)), 2), "recognition_only": False}
