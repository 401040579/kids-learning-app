"""逐题记录只追加、不覆盖；重试幂等，账号归属以服务端会话为准。"""
import json
import re
import time
from datetime import datetime, timezone

from fastapi import HTTPException, Request

EVENT_SCHEMA = """
CREATE TABLE IF NOT EXISTS learning_events (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 account_id TEXT NOT NULL REFERENCES accounts(id), event_id TEXT NOT NULL,
 occurred_at INTEGER NOT NULL, payload TEXT NOT NULL, recorded_at INTEGER NOT NULL,
 UNIQUE(account_id, event_id)
);
CREATE INDEX IF NOT EXISTS events_account_seq ON learning_events(account_id, seq);
"""
FIELDS = {"id", "occurred_at", "source", "subject", "question_id", "question", "expected", "answer", "verdict"}


def validate_event(value, *, trusted_robot=False):
    if not isinstance(value, dict) or set(value) != (FIELDS | {"robot", "topic_id", "taxonomy_version"} if trusted_robot else FIELDS):
        raise ValueError("答题记录字段不完整或包含未知字段")
    for key, limit in [("id", 64), ("question_id", 120), ("question", 500), ("expected", 200), ("answer", 2000 if trusted_robot else 200)]:
        if not isinstance(value[key], str) or not 1 <= len(value[key]) <= limit:
            raise ValueError("答题记录文字为空或过长")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{16,64}", value["id"]):
        raise ValueError("答题记录 ID 无效")
    subjects = {"math", "english", "chinese", "science"} | ({"history", "computing", "life_skills", "social", "learning_to_learn"} if trusted_robot else set())
    if value["source"] != ("robot" if trusted_robot else "web") or value["subject"] not in subjects:
        raise ValueError("不支持的答题来源或学科")
    if trusted_robot and (value["robot"] not in {"Jarvis", "Friday"} or any(value[k] is not None and (not isinstance(value[k], str) or not 1 <= len(value[k]) <= 80) for k in ("topic_id", "taxonomy_version"))):
        raise ValueError("机器人知识点来源无效")
    if value["verdict"] not in {"correct", "wrong", "unclear", "skipped"}:
        raise ValueError("答题结果无效")
    try:
        stamp = datetime.fromisoformat(value["occurred_at"].replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            raise ValueError()
        epoch = stamp.timestamp()
        if not 946684800 <= epoch <= time.time() + 300:
            raise ValueError()
    except (ValueError, TypeError, AttributeError, OverflowError):
        raise ValueError("答题时间无效，请检查设备时钟")
    normalized = {**value, "occurred_at": stamp.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
    return int(epoch), json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def check_owner(identity, expected):
    # 这是防止切换账号时队列错投的断言，不是授权依据。
    if expected != identity["id"]:
        raise HTTPException(409, "账号已变化，请重新登录原账号后同步")


def install_learning_routes(app, store, account, body):
    @app.post("/api/learning/events")
    async def append_events(request: Request):
        identity = account(request, write=True)
        values = await body(request, 128 * 1024)
        check_owner(identity, values.get("expected_account_id"))
        events = values.get("events")
        if not isinstance(events, list) or not 1 <= len(events) <= 100:
            raise HTTPException(422, "每次需上传 1–100 条答题记录")
        try:
            validated = [(event["id"], *validate_event(event)) for event in events]
        except (ValueError, TypeError, KeyError) as error:
            raise HTTPException(422, str(error))
        with store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            identity = account(request, write=True, connection=db)
            check_owner(identity, values.get("expected_account_id"))
            for event_id, epoch, payload in validated:
                existing = db.execute("SELECT payload FROM learning_events WHERE account_id=? AND event_id=?", (identity["id"], event_id)).fetchone()
                if existing:
                    if existing["payload"] != payload:
                        raise HTTPException(409, "答题记录 ID 冲突，未覆盖已有记录")
                else:
                    db.execute("INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)",
                               (identity["id"], event_id, epoch, payload, int(time.time())))
        return {"account_id": identity["id"], "accepted": [event_id for event_id, _, _ in validated]}

    @app.get("/api/learning/events")
    def read_events(request: Request, expected_account_id: str, after: int = 0, limit: int = 100):
        identity = account(request)
        check_owner(identity, expected_account_id)
        if after < 0 or not 1 <= limit <= 100:
            raise HTTPException(422, "分页参数无效")
        with store.connection() as db:
            rows = db.execute("SELECT seq,payload FROM learning_events WHERE account_id=? AND seq>? ORDER BY seq LIMIT ?",
                              (identity["id"], after, limit + 1)).fetchall()
        page = rows[:limit]
        return {"account_id": identity["id"], "events": [json.loads(row["payload"]) for row in page],
                "cursor": page[-1]["seq"] if page else after, "has_more": len(rows) > limit}
