"""Feature vector for the pose classifier. MUST match extractFeatures() in frontend/src/lib/analysis.js.
33 values: 13 joints x (x, y) hip-centred and torso-scaled, 6 joint angles / 180, torso lean / 90."""
import numpy as np
from .pose_logic import IDX, JOINTS, angle, pts, torso_lean


def extract(lms, aspect=1.0) -> np.ndarray:
    P = pts(lms, aspect)
    hip, sh = (P[23] + P[24]) / 2, (P[11] + P[12]) / 2
    L = np.linalg.norm(sh - hip) or 1.0
    coords = [((P[i] - hip) / L) for i in IDX]
    angs = [angle(P[a], P[v], P[c]) / 180 for a, v, c in JOINTS.values()]
    return np.concatenate([np.ravel(coords), angs, [torso_lean(P) / 90]])
