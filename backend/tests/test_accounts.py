import json
import time

import pytest
from fastapi.testclient import TestClient

from backend.service import HASHER, MAX_BODY, Settings, create_app

ORIGIN = "https://app.tao.irish"
PASSWORD = "test-only-password-123456"


@pytest.fixture
def app(tmp_path):
    application = create_app(Settings(tmp_path / "private.sqlite3", (ORIGIN,)))
    application.state.store.create_account("iris", "Iris", PASSWORD)
    return application


def client(app):
    return TestClient(app, base_url="https://accounts.example", headers={"Origin": ORIGIN})


def login(browser, name="iris", password=PASSWORD):
    response = browser.post("/api/login", json={"username": name, "password": password})
    assert response.status_code == 200, response.text
    browser.headers["X-CSRF-Token"] = response.json()["csrf"]
    return response


def backup(score=12):
    return {"app": "kids-learning-app", "version": 2, "entries": {"kidsLearningData": json.dumps({"totalScore": score})}}


def test_no_public_registration_or_administration(app):
    browser = client(app)
    for route in ["/api/register", "/api/signup", "/api/accounts", "/api/admin", "/docs", "/openapi.json", "/tutor/start", "/memory"]:
        assert browser.post(route, json={"username": "new"}).status_code == 404
    with app.state.store.connection() as db:
        assert db.execute("SELECT count(*) FROM accounts").fetchone()[0] == 1


def test_guest_cannot_read_or_write_private_data(app):
    browser = client(app)
    for route in ["/api/account", "/api/snapshot"]:
        result = browser.get(route)
        assert result.status_code == 401
        assert result.headers["cache-control"] == "no-store"
    assert browser.put("/api/snapshot", json={"revision": 0, "backup": backup()}).status_code == 401


def test_password_is_hashed_and_duplicate_creation_preserves_records(app):
    store = app.state.store
    with store.connection() as db:
        hashed = db.execute("SELECT password_hash FROM accounts").fetchone()[0]
    assert hashed != PASSWORD
    assert HASHER.verify(hashed, PASSWORD)
    with pytest.raises(ValueError, match="已存在"):
        store.create_account("IRIS", "Other", "new-test-password-123456")
    login(client(app))


def test_login_cookie_and_logout_revokes_session(app):
    browser = client(app)
    response = login(browser)
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=strict" in cookie
    assert "__Host-kids_session" in cookie and "Path=/" in cookie
    token = browser.cookies.get("__Host-kids_session")
    assert browser.get("/api/account").json()["display_name"] == "Iris"
    assert browser.post("/api/logout").status_code == 200
    browser.cookies.set("__Host-kids_session", token)
    assert browser.get("/api/account").status_code == 401


def test_user_supplied_ids_never_grant_other_accounts_access(app):
    app.state.store.create_account("other", "Other", PASSWORD)
    iris, other = client(app), client(app)
    iris_id = login(iris).json()["id"]
    login(other, "other")
    assert iris.put("/api/snapshot", json={"revision": 0, "backup": backup(25)}).status_code == 200
    other.headers["X-User-Id"] = iris_id
    assert other.get("/api/snapshot?account_id=" + iris_id).json()["backup"] is None
    assert other.put("/api/snapshot", json={"account_id": iris_id, "revision": 0, "backup": backup(90)}).status_code == 200
    assert json.loads(iris.get("/api/snapshot").json()["backup"]["entries"]["kidsLearningData"])["totalScore"] == 25


def test_origin_and_csrf_are_required_even_with_a_valid_cookie(app):
    browser = client(app)
    login(browser)
    browser.headers.pop("X-CSRF-Token")
    assert browser.put("/api/snapshot", json={"revision": 0, "backup": backup()}).status_code == 403
    assert browser.post("/api/logout").status_code == 403
    assert browser.post("/api/login", headers={"Origin": "https://evil.example"}, json={"username": "iris", "password": PASSWORD}).status_code == 403
    browser.headers.pop("Origin")
    assert browser.post("/api/logout").status_code == 403


def test_conflicting_backup_does_not_overwrite_newer_device(app):
    a, b = client(app), client(app)
    login(a)
    login(b)
    assert a.put("/api/snapshot", json={"revision": 0, "backup": backup(10)}).status_code == 200
    assert b.put("/api/snapshot", json={"revision": 0, "backup": backup(20)}).status_code == 409
    actual = b.get("/api/snapshot").json()
    assert actual["revision"] == 1
    assert json.loads(actual["backup"]["entries"]["kidsLearningData"])["totalScore"] == 10
    assert actual["backup"]["scope"] == "learning"


@pytest.mark.parametrize("entries", [
    {"authToken": "private"}, {"parentNotifyConfig": "{}"}, {"kidsLearningData": "[]"},
    {"kidsLearningData": '{"__proto__":{}}'}, {"kidsLearningData": "broken"},
])
def test_invalid_backups_are_rejected_before_writing(app, entries):
    browser = client(app)
    login(browser)
    payload = backup()
    payload["entries"] = entries
    assert browser.put("/api/snapshot", json={"revision": 0, "backup": payload}).status_code == 422
    assert browser.get("/api/snapshot").json()["revision"] == 0


def test_oversized_request_is_rejected(app):
    browser = client(app)
    login(browser)
    assert browser.put("/api/snapshot", content=b"x" * (MAX_BODY + 1)).status_code == 413


def test_rate_limit_survives_service_restart(app):
    browser = client(app)
    for _ in range(8):
        assert browser.post("/api/login", json={"username": "iris", "password": "wrong"}).status_code == 401
    restarted = create_app(Settings(app.state.store.path, (ORIGIN,)))
    assert client(restarted).post("/api/login", json={"username": "iris", "password": PASSWORD}).status_code == 429


def test_reset_and_disable_revoke_existing_sessions(app):
    browser = client(app)
    login(browser)
    app.state.store.administer("iris", password="changed-password-123456")
    assert browser.get("/api/account").status_code == 401
    login(browser, password="changed-password-123456")
    app.state.store.administer("iris", disable=True)
    assert browser.get("/api/account").status_code == 401
    assert browser.post("/api/login", json={"username": "iris", "password": "changed-password-123456"}).status_code == 401


def test_expired_session_and_plaintext_tokens_are_not_trusted(app):
    browser = client(app)
    login(browser)
    with app.state.store.connection() as db:
        stored = db.execute("SELECT token_hash FROM sessions").fetchone()[0]
        assert stored != browser.cookies.get("__Host-kids_session")
        db.execute("UPDATE sessions SET expires=?", (int(time.time()) - 1,))
    assert browser.get("/api/account").status_code == 401


def test_allowed_origin_cors_only(app):
    browser = client(app)
    response = browser.options("/api/login", headers={"Access-Control-Request-Method": "POST"})
    assert response.headers["access-control-allow-origin"] == ORIGIN
    denied = browser.options("/api/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in denied.headers


def test_production_requires_https_and_keeps_database_outside_web_root(monkeypatch, tmp_path):
    monkeypatch.delenv("LEARNING_DEVELOPMENT", raising=False)
    monkeypatch.setenv("LEARNING_DB", str(tmp_path / "account.sqlite3"))
    monkeypatch.setenv("LEARNING_ORIGINS", "http://example.com")
    with pytest.raises(ValueError, match="HTTPS"):
        Settings.environment()
    monkeypatch.setenv("LEARNING_ORIGINS", ORIGIN)
    assert Settings.environment().secure
    monkeypatch.setenv("LEARNING_DB", str(__import__('pathlib').Path(__file__).parent / "unsafe.sqlite3"))
    with pytest.raises(ValueError, match="项目目录之外"):
        Settings.environment()
