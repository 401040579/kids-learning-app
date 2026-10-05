"""WebAuthn ceremonies and account-owned session management; no public enrolment."""
import json
import re
import secrets
import sqlite3
import time
from urllib.parse import urlparse

from argon2.exceptions import VerificationError
from fastapi import HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from webauthn import (generate_authentication_options, generate_registration_options,
                      verify_authentication_response, verify_registration_response)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json
from webauthn.helpers.structs import (AuthenticatorSelectionCriteria, PublicKeyCredentialDescriptor,
                                     ResidentKeyRequirement, UserVerificationRequirement)

SCHEMA = """
CREATE TABLE IF NOT EXISTS passkeys (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
 credential_id TEXT NOT NULL UNIQUE, public_key BLOB NOT NULL, sign_count INTEGER NOT NULL,
 label TEXT NOT NULL, created INTEGER NOT NULL, last_used INTEGER,
 device_type TEXT NOT NULL, backed_up INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS passkeys_account ON passkeys(account_id);
CREATE TABLE IF NOT EXISTS session_details (
 token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,
 public_id TEXT NOT NULL UNIQUE, label TEXT NOT NULL, created INTEGER, last_seen INTEGER,
 method TEXT NOT NULL, passkey_id TEXT REFERENCES passkeys(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS passkey_challenges (
 token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL, challenge BLOB NOT NULL,
 origin TEXT NOT NULL, expires INTEGER NOT NULL, account_id TEXT,
 session_hash TEXT, password_hash TEXT, label TEXT
);
"""
LIFETIME = 300
MAX_KEYS = 8


def device_label(agent):
    """A browser hint, not a verified hardware identity or device whitelist."""
    agent = agent[:500]
    device = next((name for marker, name in [('iPad', 'iPad'), ('iPhone', 'iPhone'),
                   ('Android', 'Android'), ('Macintosh', 'Mac'), ('Windows', 'Windows'),
                   ('Linux', 'Linux')] if marker in agent), '浏览器 / 服务客户端')
    browser = next((name for marker, name in [('Edg/', 'Edge'), ('Firefox/', 'Firefox'),
                    ('Chrome/', 'Chrome'), ('Safari/', 'Safari')] if marker in agent), '')
    return f'{device} · {browser}' if browser else device


def record_session(db, token_hash, label, method='password', passkey_id=None):
    now = int(time.time())
    db.execute('INSERT INTO session_details VALUES (?,?,?,?,?,?,?)',
               (token_hash, secrets.token_hex(16), label, now, now, method, passkey_id))


def install(app, store, settings, cookie, account, body, digest, hasher):
    # RP is the page domain, never the API host. A stable domain is part of each key.
    rp_id = urlparse(settings.origins[0]).hostname
    if not rp_id or any(not (urlparse(o).hostname == rp_id or
                            urlparse(o).hostname.endswith('.' + rp_id)) for o in settings.origins):
        raise ValueError('Passkey 来源必须属于同一网页域名')
    challenge_cookie = '__Host-kids_passkey' if settings.secure else 'kids_passkey_dev'

    def set_challenge(response, request, kind, identity=None, password_hash=None, label=None):
        token, challenge = secrets.token_urlsafe(32), secrets.token_bytes(32)
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM passkey_challenges WHERE expires<=? OR token_hash=?',
                       (int(time.time()), digest(request.cookies.get(challenge_cookie))))
            if identity:
                account(request, write=True, connection=db)
                current = db.execute('SELECT * FROM accounts WHERE id=?', (identity['id'],)).fetchone()
                if current['password_hash'] != password_hash:
                    raise HTTPException(401, '账号已变更，请重新登录')
                if db.execute('SELECT count(*) FROM passkeys WHERE account_id=?', (identity['id'],)).fetchone()[0] >= MAX_KEYS:
                    raise HTTPException(409, '最多保存 8 把通行密钥，请先移除不用的密钥')
            db.execute('INSERT INTO passkey_challenges VALUES (?,?,?,?,?,?,?,?,?)',
                       (digest(token), kind, challenge, request.headers['origin'], int(time.time()) + LIFETIME,
                        identity['id'] if identity else None, digest(request.cookies.get(cookie)) if identity else None,
                        password_hash, label))
        response.set_cookie(challenge_cookie, token, max_age=LIFETIME, httponly=True,
                            secure=settings.secure, samesite='strict', path='/')
        return challenge

    def consume(request, kind):
        # Commit consumption even if cryptographic verification fails: one attempt only.
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            token_hash = digest(request.cookies.get(challenge_cookie))
            row = db.execute('SELECT * FROM passkey_challenges WHERE token_hash=?', (token_hash,)).fetchone()
            db.execute('DELETE FROM passkey_challenges WHERE token_hash=?', (token_hash,))
        if not row or row['expires'] <= time.time() or row['kind'] != kind or row['origin'] != request.headers.get('origin'):
            raise HTTPException(400, '通行密钥验证已过期，请重新开始')
        if kind == 'register' and row['session_hash'] != digest(request.cookies.get(cookie)):
            raise HTTPException(403, '登录会话已变化，请重新开始')
        return dict(row)

    def security_view(request):
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            identity = account(request, connection=db)
            # Add display metadata to legacy sessions without rotating their cookies.
            rows = db.execute('SELECT s.token_hash FROM sessions s LEFT JOIN session_details d USING(token_hash) '
                              'WHERE s.account_id=? AND s.expires>? AND d.public_id IS NULL',
                              (identity['id'], int(time.time()))).fetchall()
            for row in rows:
                db.execute('INSERT INTO session_details VALUES (?,?,?,?,?,?,?)',
                           (row['token_hash'], secrets.token_hex(16), '旧登录会话', None, None, 'legacy', None))
            keys = [dict(row) for row in db.execute(
                'SELECT id,label,created,last_used,device_type,backed_up FROM passkeys WHERE account_id=? ORDER BY created,id',
                (identity['id'],))]
            sessions = []
            for row in db.execute('SELECT d.public_id AS id,d.label,d.created,d.last_seen,d.method,s.expires,s.token_hash '
                                  'FROM sessions s JOIN session_details d USING(token_hash) '
                                  'WHERE s.account_id=? AND s.expires>? ORDER BY d.created DESC',
                                  (identity['id'], int(time.time()))):
                value = dict(row)
                value['current'] = value.pop('token_hash') == digest(request.cookies.get(cookie))
                sessions.append(value)
        return {'account_id': identity['id'], 'passkeys': keys, 'sessions': sessions, 'rp_id': rp_id}

    @app.get('/api/security')
    def security(request: Request):
        return security_view(request)

    @app.post('/api/passkeys/register/options')
    async def register_options(request: Request, response: Response):
        identity = account(request, write=True)
        values = await body(request, 4096)
        password, label = values.get('password'), values.get('label')
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise HTTPException(422, '请用现有账号密码确认添加通行密钥')
        if not isinstance(label, str) or not 1 <= len(label.strip()) <= 50:
            raise HTTPException(422, '请输入 1–50 字的通行密钥名称')

        def check_password():
            # Reuse password verification and persistent rate limits, but do not rotate this session.
            store.consume_login_limit(identity['username'])
            from backend.service import LOGIN_SLOTS
            if not LOGIN_SLOTS.acquire(blocking=False):
                raise HTTPException(429, '验证繁忙，请稍后再试')
            try:
                with store.connection() as db:
                    row = db.execute('SELECT * FROM accounts WHERE id=?', (identity['id'],)).fetchone()
                try:
                    valid = row is not None and not row['disabled'] and hasher.verify(row['password_hash'], password)
                except VerificationError:
                    valid = False
                if not valid:
                    raise HTTPException(403, '现有账号密码不正确')
                return row['password_hash']
            finally:
                LOGIN_SLOTS.release()

        hashed = await run_in_threadpool(check_password)
        challenge = set_challenge(response, request, 'register', identity, hashed, label.strip())
        with store.connection() as db:
            existing = [PublicKeyCredentialDescriptor(id=base64url_to_bytes(r[0])) for r in
                        db.execute('SELECT credential_id FROM passkeys WHERE account_id=?', (identity['id'],))]
        options = generate_registration_options(rp_id=rp_id, rp_name='宝贝学习乐园',
            user_id=identity['id'].encode(), user_name=identity['username'], user_display_name=identity['display_name'],
            challenge=challenge, exclude_credentials=existing,
            authenticator_selection=AuthenticatorSelectionCriteria(resident_key=ResidentKeyRequirement.REQUIRED,
                require_resident_key=True, user_verification=UserVerificationRequirement.REQUIRED))
        return json.loads(options_to_json(options))

    @app.post('/api/passkeys/register/verify')
    async def register_verify(request: Request, response: Response):
        identity = account(request, write=True)
        values = await body(request, 32768)
        challenge = consume(request, 'register')
        if challenge['account_id'] != identity['id']:
            raise HTTPException(403, '账号已变化，请重新开始')
        try:
            result = verify_registration_response(credential=values.get('credential'),
                expected_challenge=challenge['challenge'], expected_rp_id=rp_id,
                expected_origin=challenge['origin'], require_user_verification=True)
        except Exception as error:
            # Verification library diagnostics may contain credentials; never return them.
            raise HTTPException(400, '通行密钥验证失败，请重新添加') from error
        key_id = secrets.token_hex(16)
        try:
            with store.connection() as db:
                db.execute('BEGIN IMMEDIATE')
                account(request, write=True, connection=db)
                row = db.execute('SELECT password_hash FROM accounts WHERE id=?', (identity['id'],)).fetchone()
                if row['password_hash'] != challenge['password_hash']:
                    raise HTTPException(401, '账号已变更，请重新登录')
                if db.execute('SELECT count(*) FROM passkeys WHERE account_id=?', (identity['id'],)).fetchone()[0] >= MAX_KEYS:
                    raise HTTPException(409, '通行密钥数量已达上限')
                db.execute('INSERT INTO passkeys VALUES (?,?,?,?,?,?,?,?,?,?)',
                    (key_id, identity['id'], bytes_to_base64url(result.credential_id), result.credential_public_key,
                     result.sign_count, challenge['label'], int(time.time()), None,
                     result.credential_device_type.value, int(result.credential_backed_up)))
        except sqlite3.IntegrityError as error:
            raise HTTPException(409, '这把通行密钥已登记，请使用已有密钥') from error
        response.delete_cookie(challenge_cookie, path='/', secure=settings.secure, httponly=True, samesite='strict')
        return {'ok': True, 'id': key_id, 'account_id': identity['id']}

    @app.post('/api/passkeys/login/options')
    def login_options(request: Request, response: Response):
        # Discoverable credentials: same response for all users, no username enumeration.
        store.consume_login_limit('passkey')
        challenge = set_challenge(response, request, 'login')
        return json.loads(options_to_json(generate_authentication_options(rp_id=rp_id,
            challenge=challenge, user_verification=UserVerificationRequirement.REQUIRED)))

    @app.post('/api/passkeys/login/verify')
    async def login_verify(request: Request, response: Response):
        values = await body(request, 32768)
        challenge = consume(request, 'login')
        credential = values.get('credential')
        credential_id = credential.get('id') if isinstance(credential, dict) else None
        if not isinstance(credential_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,2048}', credential_id):
            raise HTTPException(400, '通行密钥验证失败，请重新登录')
        with store.connection() as db:
            row = db.execute('SELECT p.*,a.username,a.display_name,a.disabled FROM passkeys p '
                             'JOIN accounts a ON a.id=p.account_id WHERE p.credential_id=?', (credential_id,)).fetchone()
        if not row or row['disabled']:
            raise HTTPException(401, '通行密钥不可用，请使用密码登录')
        try:
            result = verify_authentication_response(credential=credential,
                expected_challenge=challenge['challenge'], expected_rp_id=rp_id,
                expected_origin=challenge['origin'], credential_public_key=row['public_key'],
                credential_current_sign_count=row['sign_count'], require_user_verification=True)
            handle = credential['response'].get('userHandle')
            if handle is not None and base64url_to_bytes(handle) != row['account_id'].encode():
                raise ValueError('user handle mismatch')
        except Exception as error:
            raise HTTPException(400, '通行密钥验证失败，请重新登录') from error
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            current = db.execute('SELECT p.*,a.disabled FROM passkeys p JOIN accounts a ON a.id=p.account_id WHERE p.id=?',
                                 (row['id'],)).fetchone()
            # Removal/reset/disable or concurrent counter update during verification invalidates this attempt.
            if not current or current['disabled'] or current['sign_count'] != row['sign_count']:
                raise HTTPException(401, '通行密钥已变化，请重新登录')
            db.execute('UPDATE passkeys SET sign_count=?,last_used=?,device_type=?,backed_up=? WHERE id=?',
                       (result.new_sign_count, int(time.time()), result.credential_device_type.value,
                        int(result.credential_backed_up), row['id']))
            identity_row = db.execute('SELECT * FROM accounts WHERE id=?', (row['account_id'],)).fetchone()
            token, identity = store.issue_session(db, identity_row, request.cookies.get(cookie),
                device_label(request.headers.get('user-agent', '')), 'passkey', row['id'])
        from backend.service import SESSION_SECONDS
        response.set_cookie(cookie, token, max_age=SESSION_SECONDS, httponly=True, secure=settings.secure, samesite='strict', path='/')
        response.delete_cookie(challenge_cookie, path='/', secure=settings.secure, httponly=True, samesite='strict')
        return identity

    async def revoke(request, response, kind):
        values = await body(request, 4096)
        target = values.get('id')
        if kind != 'others' and (not isinstance(target, str) or not re.fullmatch(r'[0-9a-f]{32}', target)):
            raise HTTPException(422, '请选择要移除的密钥或会话')
        current_hash = digest(request.cookies.get(cookie))
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            identity = account(request, write=True, connection=db)
            if kind == 'passkey':
                key = db.execute('SELECT id FROM passkeys WHERE id=? AND account_id=?', (target, identity['id'])).fetchone()
                if not key:
                    raise HTTPException(404, '通行密钥不存在')
                db.execute('DELETE FROM sessions WHERE account_id=? AND token_hash IN '
                           '(SELECT token_hash FROM session_details WHERE passkey_id=?)', (identity['id'], target))
                db.execute('DELETE FROM passkeys WHERE id=? AND account_id=?', (target, identity['id']))
            elif kind == 'session':
                found = db.execute('SELECT s.token_hash FROM sessions s JOIN session_details d USING(token_hash) '
                                   'WHERE d.public_id=? AND s.account_id=?', (target, identity['id'])).fetchone()
                if not found:
                    raise HTTPException(404, '登录会话不存在')
                db.execute('DELETE FROM sessions WHERE token_hash=? AND account_id=?', (found[0], identity['id']))
            else:
                db.execute('DELETE FROM sessions WHERE account_id=? AND token_hash<>?', (identity['id'], current_hash))
            revoked_current = not db.execute('SELECT 1 FROM sessions WHERE token_hash=?', (current_hash,)).fetchone()
        if revoked_current:
            response.delete_cookie(cookie, path='/', secure=settings.secure, httponly=True, samesite='strict')
        return {'ok': True, 'revoked_current': revoked_current}

    @app.post('/api/passkeys/remove')
    async def remove_key(request: Request, response: Response):
        return await revoke(request, response, 'passkey')

    @app.post('/api/sessions/revoke')
    async def remove_session(request: Request, response: Response):
        return await revoke(request, response, 'session')

    @app.post('/api/sessions/revoke-others')
    async def remove_others(request: Request, response: Response):
        return await revoke(request, response, 'others')
