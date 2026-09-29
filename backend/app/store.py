"""SQLite persistence for saved sessions + analytics aggregation."""
import json, random, sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "yogavision.db"
def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def init():
    with conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, duration REAL,
            avg_accuracy REAL, common_error TEXT, data TEXT, sample INTEGER DEFAULT 0)""")
        if c.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0: seed(c)

def seed(c):
    """Clearly-flagged SAMPLE sessions (sample=1) so screens are not empty on first run."""
    rnd = random.Random(7); names = ["Tree Pose", "Warrior II", "Mountain Pose", "Chair Pose", "Downward Dog", "Cobra"]
    now = datetime.now(timezone.utc)
    for i in range(24):
        day = now - timedelta(days=(23 - i) * 1.2, hours=0 if i == 23 else rnd.randint(0, 6))
        base = 0.66 + i * 0.011 + rnd.uniform(-.03, .03)
        poses = [{"name": n, "seconds": rnd.randint(30, 120), "accuracy": round(min(.97, base + rnd.uniform(-.08, .08)), 2),
                  "confidence": round(rnd.uniform(.86, .97), 2)} for n in rnd.sample(names, rnd.randint(3, 5))]
        joints = {"left_knee": min(.98, .6 + i * .014), "right_knee": min(.98, .8 + rnd.uniform(-.05, .05)),
                  "spine": min(.98, .7 + i * .006), "shoulders": .88 + rnd.uniform(-.04, .04)}
        data = {"poses": poses, "joints": {k: round(v, 2) for k, v in joints.items()},
                "metrics": {"alignment": round(base + .04, 2), "stability": round(base - .02, 2), "confidence": round(rnd.uniform(.9, .96), 2)}}
        dur = sum(p["seconds"] for p in poses)
        c.execute("INSERT INTO sessions(date,duration,avg_accuracy,common_error,data,sample) VALUES(?,?,?,?,?,1)",
                  (day.isoformat(), dur, round(base, 2), "Left knee" if joints["left_knee"] < joints["spine"] else "Spine", json.dumps(data)))

def _row(r, full=False):
    d = {k: r[k] for k in ("id", "date", "duration", "avg_accuracy", "common_error", "sample")}
    if full: d.update(json.loads(r["data"]))
    else: d["poses"] = [p["name"] for p in json.loads(r["data"])["poses"]]
    return d

def list_sessions():
    with conn() as c: return [_row(r) for r in c.execute("SELECT * FROM sessions ORDER BY date DESC")]
def get_session(i):
    with conn() as c:
        r = c.execute("SELECT * FROM sessions WHERE id=?", (i,)).fetchone(); return _row(r, True) if r else None
def add_session(s):
    worst = min(s.get("joints", {"none": 1}).items(), key=lambda kv: kv[1])[0].replace("_", " ").capitalize() if s.get("joints") else "None"
    with conn() as c:
        cur = c.execute("INSERT INTO sessions(date,duration,avg_accuracy,common_error,data,sample) VALUES(?,?,?,?,?,0)",
            (datetime.now(timezone.utc).isoformat(), s["duration"], s["avg_accuracy"], worst,
             json.dumps({k: s[k] for k in ("poses", "joints", "metrics")})))
        return cur.lastrowid

def analytics(days):
    cut = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    with conn() as c: rows = [r for r in c.execute("SELECT * FROM sessions WHERE date>=? ORDER BY date", (cut,))]
    series, poses, bad = [], {}, {}
    for r in rows:
        d = json.loads(r["data"])
        series.append({"date": r["date"][:10], "accuracy": r["avg_accuracy"], "duration": round(r["duration"] / 60, 1),
                       "confidence": d["metrics"]["confidence"], **{k: v for k, v in d["joints"].items()}})
        for p in d["poses"]: poses[p["name"]] = poses.get(p["name"], 0) + 1
        for j, v in d["joints"].items(): bad[j] = bad.get(j, 0) + (1 - v) * r["duration"]
    return {"days": days, "series": series,
            "poses": sorted(({"name": k, "count": v} for k, v in poses.items()), key=lambda x: -x["count"]),
            "mistakes": sorted(({"joint": k.replace("_", " ").capitalize(), "score": round(v)} for k, v in bad.items()), key=lambda x: -x["score"])}
