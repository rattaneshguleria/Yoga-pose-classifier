"""MongoDB persistence for users, auth tokens and saved sessions."""
import hashlib
import os
import random
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

mongo_client = None
database = None


def get_mongodb_uri():
    return os.getenv("MONGODB_URI", "mongodb://localhost:27017")


def get_database_name():
    return os.getenv("MONGODB_DATABASE", "yogavision")


def configure_database(client=None):
    global mongo_client, database
    if mongo_client is not None and mongo_client is not client:
        mongo_client.close()
    mongo_client = client or MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=5000)
    database = mongo_client[get_database_name()]
    return database


def _db():
    if database is None:
        configure_database()
    return database


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.strip().encode("utf-8")).hexdigest()


def _user_record(user):
    if user is None:
        return None
    result = dict(user)
    result["id"] = str(result.pop("_id"))
    return result


def _session_record(session, full=False):
    if session is None:
        return None
    result = {
        "id": str(session["_id"]),
        "date": session["date"].isoformat(),
        "duration": session["duration"],
        "avg_accuracy": session["avg_accuracy"],
        "common_error": session["common_error"],
        "sample": session.get("sample", 0),
        "user_id": session.get("user_id"),
    }
    if full:
        result.update(session.get("data", {}))
    else:
        result["poses"] = [pose["name"] for pose in session.get("data", {}).get("poses", [])]
    return result


def init(client=None):
    db = configure_database(client)
    db.users.create_index([("username", ASCENDING)], unique=True)
    db.auth_tokens.create_index([("token", ASCENDING)], unique=True)
    db.auth_tokens.create_index([("user_id", ASCENDING)])
    db.sessions.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    if db.sessions.count_documents({}) == 0:
        seed(db.sessions)


def seed(sessions):
    """Insert clearly-flagged SAMPLE sessions so screens are not empty on first run."""
    rnd = random.Random(7)
    names = ["Tree Pose", "Warrior II", "Mountain Pose", "Chair Pose", "Downward Dog", "Cobra"]
    now = datetime.now(timezone.utc)
    documents = []
    for i in range(24):
        day = now - timedelta(days=(23 - i) * 1.2, hours=0 if i == 23 else rnd.randint(0, 6))
        base = 0.66 + i * 0.011 + rnd.uniform(-.03, .03)
        poses = [{
            "name": name,
            "seconds": rnd.randint(30, 120),
            "accuracy": round(min(.97, base + rnd.uniform(-.08, .08)), 2),
            "confidence": round(rnd.uniform(.86, .97), 2),
        } for name in rnd.sample(names, rnd.randint(3, 5))]
        joints = {
            "left_knee": min(.98, .6 + i * .014),
            "right_knee": min(.98, .8 + rnd.uniform(-.05, .05)),
            "spine": min(.98, .7 + i * .006),
            "shoulders": .88 + rnd.uniform(-.04, .04),
        }
        data = {
            "poses": poses,
            "joints": {key: round(value, 2) for key, value in joints.items()},
            "metrics": {
                "alignment": round(base + .04, 2),
                "stability": round(base - .02, 2),
                "confidence": round(rnd.uniform(.9, .96), 2),
            },
        }
        documents.append({
            "date": day,
            "duration": sum(pose["seconds"] for pose in poses),
            "avg_accuracy": round(base, 2),
            "common_error": "Left knee" if joints["left_knee"] < joints["spine"] else "Spine",
            "data": data,
            "sample": 1,
            "user_id": None,
        })
    if documents:
        sessions.insert_many(documents)


def create_user(username: str, password: str):
    username = (username or "").strip()
    if not username or len(password or "") < 6:
        raise ValueError("Username and password are required (password must be at least 6 characters).")
    db = _db()
    normalized_username = username.lower()
    if db.users.find_one({"username": normalized_username}):
        raise ValueError("That username is already taken.")
    try:
        result = db.users.insert_one({
            "username": normalized_username,
            "password_hash": _hash_password(password),
            "created_at": datetime.now(timezone.utc),
        })
    except DuplicateKeyError as exc:
        raise ValueError("That username is already taken.") from exc
    return {"id": str(result.inserted_id), "username": username}


def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user or user["password_hash"] != _hash_password(password):
        return None
    return {"id": user["id"], "username": user["username"]}


def get_user(username: str):
    user = _db().users.find_one({"username": (username or "").strip().lower()})
    return _user_record(user)


def get_user_by_id(user_id: str):
    if not ObjectId.is_valid(user_id):
        return None
    return _user_record(_db().users.find_one({"_id": ObjectId(user_id)}))


def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    _db().auth_tokens.insert_one({
        "user_id": str(user_id),
        "token": token,
        "created_at": datetime.now(timezone.utc),
    })
    return token


def delete_token(token: str):
    _db().auth_tokens.delete_one({"token": token})


def get_user_by_token(token: str):
    if not token:
        return None
    auth_token = _db().auth_tokens.find_one({"token": token})
    return get_user_by_id(auth_token["user_id"]) if auth_token else None


def extract_bearer_token(authorization: str | None):
    if not authorization:
        return None
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return authorization.strip()


def list_sessions(user_id=None):
    if user_id is None:
        query = {"$or": [{"user_id": None}, {"sample": 1}]}
    else:
        query = {"user_id": str(user_id)}
    rows = _db().sessions.find(query).sort("date", DESCENDING)
    return [_session_record(row) for row in rows]


def get_session(session_id: str, user_id=None):
    if not ObjectId.is_valid(session_id):
        return None
    row = _db().sessions.find_one({"_id": ObjectId(session_id)})
    if row is None:
        return None
    if user_id is not None and row.get("user_id") != str(user_id):
        return None
    if row.get("user_id") is not None and user_id is None:
        return None
    return _session_record(row, full=True)


def add_session(session, user_id=None):
    joints = session.get("joints", {})
    worst = min(joints.items(), key=lambda item: item[1])[0].replace("_", " ").capitalize() if joints else "None"
    payload = {key: session[key] for key in ("poses", "joints", "metrics") if key in session}
    result = _db().sessions.insert_one({
        "date": datetime.now(timezone.utc),
        "duration": session["duration"],
        "avg_accuracy": session["avg_accuracy"],
        "common_error": worst,
        "data": payload,
        "sample": 0,
        "user_id": str(user_id) if user_id is not None else None,
    })
    return str(result.inserted_id)


def analytics(days, user_id=None):
    cut = datetime.now(timezone.utc) - timedelta(days=days)
    query = {"user_id": str(user_id), "date": {"$gte": cut}} if user_id is not None else {
        "$and": [{"$or": [{"user_id": None}, {"sample": 1}]}, {"date": {"$gte": cut}}]
    }
    rows = _db().sessions.find(query).sort("date", ASCENDING)
    series, poses, bad = [], {}, {}
    for row in rows:
        data = row.get("data", {})
        metrics = data.get("metrics", {})
        joints = data.get("joints", {})
        series.append({
            "date": row["date"].date().isoformat(),
            "accuracy": row["avg_accuracy"],
            "duration": round(row["duration"] / 60, 1),
            "confidence": metrics.get("confidence", 0),
            **joints,
        })
        for pose in data.get("poses", []):
            name = pose.get("name", "Unknown")
            poses[name] = poses.get(name, 0) + 1
        for joint, value in joints.items():
            bad[joint] = bad.get(joint, 0) + (1 - value) * row["duration"]
    return {
        "days": days,
        "series": series,
        "poses": sorted(({"name": key, "count": value} for key, value in poses.items()), key=lambda item: -item["count"]),
        "mistakes": sorted(({"joint": key.replace("_", " ").capitalize(), "score": round(value)} for key, value in bad.items()), key=lambda item: -item["score"]),
    }