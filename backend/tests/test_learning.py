from datetime import datetime, timezone

import pytest

from backend.tests.test_accounts import app, client, login, PASSWORD


def event(index=1, **changes):
    return {"id": f"test-answer-{index:08d}", "occurred_at": datetime.now(timezone.utc).isoformat(),
            "source": "web", "subject": "math", "question_id": "math_1_+_2",
            "question": "1 + 2 = ?", "expected": "3", "answer": "3", "verdict": "correct", **changes}


def post(browser, owner, events):
    return browser.post("/api/learning/events", json={"expected_account_id": owner, "events": events})


def read(browser, owner, **params):
    return browser.get("/api/learning/events", params={"expected_account_id": owner, **params})


def test_guest_and_forged_account_cannot_access_history(app):
    a, b, guest = client(app), client(app), client(app)
    owner = login(a).json()["id"]
    app.state.store.create_account("other", "Other", PASSWORD)
    other = login(b, "other").json()["id"]
    assert post(a, owner, [event()]).status_code == 200
    assert read(guest, owner).status_code == 401
    assert post(guest, owner, [event()]).status_code == 401
    b.headers["X-User-Id"] = owner
    assert read(b, owner).status_code == 409
    assert post(b, owner, [event()]).status_code == 409
    assert read(b, other).json()["events"] == []
    b.headers.pop("X-CSRF-Token")
    assert post(b, other, [event()]).status_code == 403


def test_lost_acknowledgement_replay_is_idempotent_and_conflict_atomic(app):
    browser = client(app)
    owner = login(browser).json()["id"]
    first = event()
    assert post(browser, owner, [first, first]).status_code == 200
    assert post(browser, owner, [first]).status_code == 200
    assert len(read(browser, owner).json()["events"]) == 1
    assert post(browser, owner, [event(2), {**first, "answer": "9"}]).status_code == 409
    assert len(read(browser, owner).json()["events"]) == 1


def test_cursor_handles_late_offline_events_and_is_account_scoped(app):
    browser = client(app)
    owner = login(browser).json()["id"]
    events = [event(i) for i in range(1, 4)]
    assert post(browser, owner, events).status_code == 200
    page = read(browser, owner, limit=2).json()
    assert len(page["events"]) == 2 and page["has_more"]
    assert post(browser, owner, [event(4, occurred_at="2026-01-01T00:00:00Z")]).status_code == 200
    rest = read(browser, owner, after=page["cursor"]).json()
    assert [e["id"] for e in rest["events"]] == [events[2]["id"], "test-answer-00000004"]
    assert not rest["has_more"]
    empty = read(browser, owner, after=rest["cursor"]).json()
    assert empty["cursor"] == rest["cursor"] and empty["events"] == []


@pytest.mark.parametrize("change", [{"source": "robot"}, {"subject": "unknown"}, {"verdict": "maybe"},
    {"id": "short"}, {"answer": "x" * 201}, {"occurred_at": "2026-01-01"},
    {"occurred_at": "2999-01-01T00:00:00Z"}, {"secret": "not allowed"}])
def test_invalid_batch_never_partially_writes(app, change):
    browser = client(app)
    owner = login(browser).json()["id"]
    assert post(browser, owner, [event(1), event(2, **change)]).status_code == 422
    assert read(browser, owner).json()["events"] == []


def test_revocation_during_upload_is_checked_before_commit(app, monkeypatch):
    browser = client(app)
    owner = login(browser).json()["id"]
    original = app.state.store.session
    def revoke(token, connection=None):
        result = original(token, connection)
        if connection is None:
            app.state.store.administer("iris", disable=True)
        return result
    monkeypatch.setattr(app.state.store, "session", revoke)
    assert post(browser, owner, [event()]).status_code == 401
    with app.state.store.connection() as db:
        assert db.execute("SELECT count(*) FROM learning_events").fetchone()[0] == 0
