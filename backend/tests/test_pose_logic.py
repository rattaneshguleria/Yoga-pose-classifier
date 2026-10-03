import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import classifier, features
from app.pose_logic import angle, evaluate, classify_rules, joint_angles, pts


def skeleton(over=None):
    L = [{"x": .5, "y": .5, "z": 0, "visibility": 1.0} for _ in range(33)]
    base = {0: (.5, .1), 11: (.56, .24), 12: (.44, .24), 13: (.57, .40), 14: (.43, .40), 15: (.57, .55), 16: (.43, .55),
            23: (.54, .52), 24: (.46, .52), 25: (.54, .72), 26: (.46, .72), 27: (.54, .92), 28: (.46, .92)}
    base.update(over or {})
    for i, (x, y) in base.items(): L[i].update(x=x, y=y)
    return L


def test_angle_straight_and_right():
    assert round(angle(np.array([0, 0]), np.array([1, 0]), np.array([2, 0]))) == 180
    assert round(angle(np.array([1, 0]), np.array([0, 0]), np.array([0, 1]))) == 90


def test_standing_is_straight():
    a = joint_angles(pts(skeleton()))
    assert a["left_knee"] >= 175 and a["right_knee"] >= 175


def test_bent_knee_flagged_with_correction():
    r = evaluate("Mountain Pose", skeleton({25: (.66, .66), 27: (.54, .82)}))
    assert any(e["joint"] == "left_knee" for e in r["errors"]) and r["corrections"]
    assert r["form_score"] < evaluate("Mountain Pose", skeleton())["form_score"]


def test_leaning_torso_flagged():
    r = evaluate("Mountain Pose", skeleton({11: (.70, .24), 12: (.58, .24)}))
    assert any(e["joint"] == "spine" for e in r["errors"])


def test_undefined_pose_is_recognition_only():
    result = evaluate("Akarna_Dhanurasana", skeleton())
    assert result["recognition_only"] is True
    assert result["form_score"] is None
    assert result["errors"] == []
    assert result["corrections"] == []


def test_rule_classifier_returns_known_pose():
    pose, conf = classify_rules(skeleton())
    assert pose == "Mountain Pose" and 0 <= conf <= 1


def test_feature_vector_shape_and_scale_invariance():
    f = features.extract(skeleton()); assert f.shape == (33,)
    s = skeleton(); [p.update(x=p["x"] * .5 + .1, y=p["y"] * .5 + .1) for p in s]
    assert np.allclose(f[:26], features.extract(s)[:26], atol=1e-6)  # position/size do not matter


def test_mlp_forward_is_a_distribution():
    m = {"classes": ["a", "b"], "mean": [0] * 33, "std": [1] * 33,
         "layers": [{"W": np.random.randn(4, 33).tolist(), "b": [0] * 4}, {"W": np.random.randn(2, 4).tolist(), "b": [0, 0]}]}
    p = classifier.forward(m, features.extract(skeleton())); assert abs(p.sum() - 1) < 1e-9


def test_user_session_storage_roundtrip():
    import mongomock
    from app import store

    store.init(mongomock.MongoClient())

    user = store.create_user('demo-user', 'secret123')
    assert user['username'] == 'demo-user'
    token = store.create_token(user['id'])

    session_id = store.add_session({
        'duration': 120,
        'avg_accuracy': 0.91,
        'joints': {'left_knee': 0.92},
        'metrics': {'confidence': 0.93},
        'poses': [{'name': 'Tree Pose', 'seconds': 120, 'accuracy': 0.91, 'confidence': 0.93}],
    }, user_id=user['id'])

    assert session_id is not None
    assert store.list_sessions(user_id=user['id'])
    assert not store.list_sessions(user_id='000000000000000000000000')
    assert store.get_user_by_token(token)['username'] == 'demo-user'
    saved = store.get_session(session_id, user_id=user['id'])
    assert saved['poses'][0]['name'] == 'Tree Pose'
    assert store.get_session(session_id, user_id='000000000000000000000000') is None
    assert store.analytics(30, user_id=user['id'])['series']
