"""独立账号与云备份服务；不开注册接口，不导入任何机器人控制代码。"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager, nullcontext
from dataclasses import dataclass
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from backend.learning import EVENT_SCHEMA, install_learning_routes

HASHER = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1)
LOGIN_SLOTS = threading.BoundedSemaphore(2)
MAX_BODY = 8 * 1024 * 1024
SESSION_SECONDS = 7 * 24 * 3600
SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 password_hash TEXT NOT NULL, disabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
 csrf TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
CREATE TABLE IF NOT EXISTS snapshots (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id), revision INTEGER NOT NULL,
 updated_at INTEGER NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_limits (
 bucket TEXT PRIMARY KEY, expires INTEGER NOT NULL, attempts INTEGER NOT NULL
);
"""


@dataclass(frozen=True)
class Settings:
    database: Path
    origins: tuple[str, ...]
    secure: bool = True

    @classmethod
    def environment(cls):
        database = Path(os.environ.get("LEARNING_DB", "~/.local/share/kids-learning/learning.sqlite3")).expanduser()
        origins = tuple(x.strip().rstrip("/") for x in os.environ.get("LEARNING_ORIGINS", "https://app.tao.irish").split(",") if x.strip())
        secure = os.environ.get("LEARNING_DEVELOPMENT") != "1"
        if not origins or (secure and any(not re.fullmatch(r"https://[a-zA-Z0-9.-]+(?::[0-9]+)?", origin) for origin in origins)):
            raise ValueError("生产环境必须配置明确的 HTTPS 来源")
        # 数据库禁止放进可能由 GitHub Pages 或静态服务器公开的项目目录。
        if database.resolve().is_relative_to(Path(__file__).resolve().parent.parent):
            raise ValueError("LEARNING_DB 必须位于项目目录之外")
        return cls(database, origins, secure)


def username(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{3,32}", value):
        raise ValueError("用户名需为 3–32 位英文字母、数字、下划线或连字符")
    return value.lower()


def password_hash(password):
    if not isinstance(password, str) or not 16 <= len(password) <= 128:
        raise ValueError("密码需为 16–128 个字符；建议使用管理员生成的随机密码")
    return HASHER.hash(password)


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if not self.path.exists():
            self.path.touch(mode=0o600)
        os.chmod(self.path, 0o600)
        with self.connection() as db:
            db.executescript(SCHEMA + EVENT_SCHEMA)
        self.dummy_hash = HASHER.hash(secrets.token_urlsafe(32))

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_account(self, login, display_name, password):
        login = username(login)
        if not isinstance(display_name, str) or not 1 <= len(display_name.strip()) <= 50:
            raise ValueError("显示名称不能为空或超过 50 字")
        hashed = password_hash(password)
        account_id = secrets.token_hex(16)
        try:
            with self.connection() as db:
                db.execute("INSERT INTO accounts(id,username,display_name,password_hash) VALUES (?,?,?,?)",
                           (account_id, login, display_name.strip(), hashed))
        except sqlite3.IntegrityError as error:
            raise ValueError("账号已存在，未覆盖密码或记录") from error
        return account_id

    def administer(self, login, *, password=None, disable=False):
        login = username(login)
        hashed = password_hash(password) if password is not None else None
        with self.connection() as db:
            row = db.execute("SELECT id FROM accounts WHERE username=?", (login,)).fetchone()
            if not row:
                raise ValueError("账号不存在")
            if hashed:
                db.execute("UPDATE accounts SET password_hash=? WHERE id=?", (hashed, row["id"]))
            if disable:
                db.execute("UPDATE accounts SET disabled=1 WHERE id=?", (row["id"],))
            db.execute("DELETE FROM sessions WHERE account_id=?", (row["id"],))
            db.execute("DELETE FROM login_limits WHERE bucket=?", ("user:" + login,))

    def consume_login_limit(self, login):
        now = int(time.time())
        # 只信任服务端计数，不采信可伪造的 X-Forwarded-For。全局限流保护 Orin。
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM login_limits WHERE expires<=?", (now,))
            limits = (("global", 30, 60), ("user:" + login, 8, 900))
            for bucket, limit, duration in limits:
                row = db.execute("SELECT attempts FROM login_limits WHERE bucket=?", (bucket,)).fetchone()
                if row and row["attempts"] >= limit:
                    raise HTTPException(429, "尝试次数过多，请稍后再试", headers={"Retry-After": str(duration)})
            for bucket, _, duration in limits:
                db.execute("INSERT INTO login_limits VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1", (bucket, now + duration))

    def login(self, login, password, old_token):
        self.consume_login_limit(login)
        if not LOGIN_SLOTS.acquire(blocking=False):
            raise HTTPException(429, "登录繁忙，请稍后再试")
        try:
            with self.connection() as db:
                row = db.execute("SELECT * FROM accounts WHERE username=?", (login,)).fetchone()
            try:
                valid = HASHER.verify(row["password_hash"] if row else self.dummy_hash, password)
            except VerificationError:
                valid = False
            if not valid or not row or row["disabled"]:
                raise HTTPException(401, "账号或密码不正确")
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            now = int(time.time())
            with self.connection() as db:
                db.execute("BEGIN IMMEDIATE")
                # 管理员可能在慢哈希计算期间禁用或重置了账号，必须再检查。
                current = db.execute("SELECT * FROM accounts WHERE id=?", (row["id"],)).fetchone()
                if not current or current["disabled"] or current["password_hash"] != row["password_hash"]:
                    raise HTTPException(401, "账号或密码不正确")
                db.execute("DELETE FROM sessions WHERE expires<=? OR token_hash=?", (now, digest(old_token)))
                db.execute("INSERT INTO sessions VALUES (?,?,?,?)", (digest(token), row["id"], csrf, now + SESSION_SECONDS))
                # 一个家庭账号最多保留 8 个设备会话。
                db.execute("DELETE FROM sessions WHERE account_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE account_id=? ORDER BY expires DESC, rowid DESC LIMIT 8)", (row["id"], row["id"]))
            return token, {"id": row["id"], "username": row["username"], "display_name": row["display_name"], "csrf": csrf}
        finally:
            LOGIN_SLOTS.release()

    def session(self, token, connection=None):
        with (nullcontext(connection) if connection is not None else self.connection()) as db:
            row = db.execute("SELECT a.id,a.username,a.display_name,s.csrf FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>? AND a.disabled=0", (digest(token), int(time.time()))).fetchone()
        if not row:
            raise HTTPException(401, "请先登录")
        return dict(row)


def digest(token):
    return hashlib.sha256((token or "").encode()).hexdigest()


def validate_snapshot(payload):
    registry = json.loads(Path(__file__).with_name("backup_keys.json").read_text())
    if not isinstance(payload, dict) or payload.get("app") != "kids-learning-app" or payload.get("version") != 2:
        raise HTTPException(422, "不支持的备份格式")
    entries = payload.get("entries")
    if not isinstance(entries, dict) or not entries:
        raise HTTPException(422, "备份没有可保存的记录")
    for key, raw in entries.items():
        if key not in registry or not isinstance(raw, str):
            raise HTTPException(422, "备份包含不允许上传的记录")
        if registry[key] == "text":
            if len(raw) > 128:
                raise HTTPException(422, "设置值过长")
            continue
        try:
            def check_keys(obj):
                if any(k in {"__proto__", "constructor", "prototype"} for k in obj):
                    raise ValueError()
                return obj
            value = json.loads(raw, object_hook=check_keys, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        except (ValueError, RecursionError):
            raise HTTPException(422, "备份记录损坏")
        expected = dict if registry[key] == "object" else list
        if not isinstance(value, expected):
            raise HTTPException(422, "备份记录类型不正确")
    return {"app": "kids-learning-app", "version": 2, "scope": "learning", "entries": entries}


def create_app(settings=None):
    settings = settings or Settings.environment()
    store = Store(settings.database)
    cookie = "__Host-kids_session" if settings.secure else "kids_session_dev"
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.state.store = store
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins), allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT"], allow_headers=["Content-Type", "X-CSRF-Token"])

    @app.middleware("http")
    async def security(request, call_next):
        if request.method not in {"GET", "HEAD", "OPTIONS"} and request.headers.get("origin") not in settings.origins:
            return JSONResponse({"detail": "请求来源不允许"}, status_code=403, headers={"Cache-Control": "no-store"})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    async def body(request, limit=MAX_BODY):
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > limit:
                raise HTTPException(413, "请求过大")
        try:
            result = json.loads(data)
            if not isinstance(result, dict):
                raise ValueError()
            return result
        except (ValueError, RecursionError):
            raise HTTPException(422, "请求格式不正确")

    def account(request, write=False, connection=None):
        result = store.session(request.cookies.get(cookie), connection)
        if write and not secrets.compare_digest(request.headers.get("x-csrf-token", "").encode(), result["csrf"].encode()):
            raise HTTPException(403, "会话校验失败，请重新登录")
        return result

    @app.get("/api/health")
    def health():
        return {"status": "ok", "registration": "closed"}

    @app.post("/api/login")
    async def login(request: Request, response: Response):
        values = await body(request, 4096)
        try:
            login_name = username(values.get("username"))
        except ValueError:
            raise HTTPException(401, "账号或密码不正确")
        password = values.get("password")
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise HTTPException(401, "账号或密码不正确")
        token, identity = await run_in_threadpool(store.login, login_name, password, request.cookies.get(cookie))
        response.set_cookie(cookie, token, max_age=SESSION_SECONDS, httponly=True, secure=settings.secure, samesite="strict", path="/")
        return identity

    @app.get("/api/account")
    def me(request: Request):
        return account(request)

    @app.post("/api/logout")
    def logout(request: Request, response: Response):
        account(request, write=True)
        with store.connection() as db:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (digest(request.cookies.get(cookie)),))
        response.delete_cookie(cookie, path="/", secure=settings.secure, httponly=True, samesite="strict")
        return {"ok": True}

    @app.get("/api/snapshot")
    def get_snapshot(request: Request):
        identity = account(request)
        with store.connection() as db:
            row = db.execute("SELECT * FROM snapshots WHERE account_id=?", (identity["id"],)).fetchone()
        return {"revision": row["revision"] if row else 0, "updated_at": row["updated_at"] if row else None,
                "backup": json.loads(row["payload"]) if row else None}

    @app.put("/api/snapshot")
    async def save_snapshot(request: Request):
        identity = account(request, write=True)
        values = await body(request)
        revision = values.get("revision")
        if type(revision) is not int or revision < 0:
            raise HTTPException(422, "备份版本无效")
        payload = validate_snapshot(values.get("backup"))
        with store.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            # 上传过程中管理员也可能撤销会话；写入前在同一事务里复查。
            session = db.execute("SELECT 1 FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>? AND a.disabled=0", (digest(request.cookies.get(cookie)), int(time.time()))).fetchone()
            if not session:
                raise HTTPException(401, "请先登录")
            row = db.execute("SELECT revision FROM snapshots WHERE account_id=?", (identity["id"],)).fetchone()
            if revision != (row["revision"] if row else 0):
                raise HTTPException(409, "其他设备已更新备份，请先查看最新备份")
            now = int(time.time())
            db.execute("INSERT INTO snapshots VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision, updated_at=excluded.updated_at, payload=excluded.payload",
                       (identity["id"], revision + 1, now, json.dumps(payload, ensure_ascii=False)))
        return {"revision": revision + 1, "updated_at": now}

    install_learning_routes(app, store, account, body)
    return app
