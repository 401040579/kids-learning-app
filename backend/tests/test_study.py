"""新课程事件兼容、账号归属与复习边界；只有临时 SQLite/测试账号。"""
import json
from datetime import datetime, timezone

import pytest
from backend.learning import validate_event
from backend.study import eligible, load_catalog, plan, states
from backend.tests.test_accounts import app, client, login, PASSWORD
from backend.tests.test_learning import event as legacy_event, post, read


def course_event(index=1, question=None, **changes):
    catalog = load_catalog()
    question = question or catalog['questions'][0]
    topic = next(topic for topic in catalog['topics'] if topic['id'] == question['topic_id'])
    return {'id': f'course-answer-{index:08d}', 'occurred_at': datetime.now(timezone.utc).isoformat(),
            'source': 'web', 'subject': question['subject'], 'question_id': question['id'], 'question': question['question'],
            'expected': question['expected'], 'answer': question['expected'], 'verdict': 'correct', 'schema_version': 2,
            'topic_id': question['topic_id'], 'taxonomy_version': catalog['taxonomy_version'] if topic['marble_id'] else None,
            'question_version': question['version'], 'hint_used': False, **changes}


def test_v2_append_replay_and_v1_compatibility(app):
    browser = client(app); owner = login(browser).json()['id']
    value = course_event()
    assert post(browser, owner, [value, legacy_event()]).status_code == 200
    assert post(browser, owner, [value]).status_code == 200
    events = read(browser, owner).json()['events']
    assert len(events) == 2 and events[0]['schema_version'] == 2
    result = browser.get('/api/study/plan', params={'expected_account_id': owner}).json()
    assert result['account_id'] == owner
    assert result['answered_today'] == 1 and result['remaining'] == 3
    assert result['states'][value['question_id']]['stage'] == 1
    assert len(result['questions']) == 3


@pytest.mark.parametrize('change', [
    {'schema_version': True}, {'schema_version': 1}, {'schema_version': '2'}, {'question_id': 'forged-question'},
    {'topic_id': 'forged-topic'}, {'taxonomy_version': None}, {'question_version': 'old'}, {'question': '替换题干'},
    {'expected': '999'}, {'subject': 'reading'}, {'answer': '未列在选项里'}, {'verdict': 'wrong'},
    {'hint_used': None}, {'hint_used': 0}, {'secret': 'unknown-field'}, {'source': 'robot'},
    {'source': 'robot', 'robot': 'Jarvis'}, {'verdict': 'skipped', 'answer': '答案'},
])
def test_invalid_v2_batch_rejected_before_any_write(app, change):
    browser = client(app); owner = login(browser).json()['id']
    assert post(browser, owner, [course_event(1), {**course_event(2), **change}]).status_code == 422
    assert read(browser, owner).json()['events'] == []


def test_v2_hint_and_reading_metadata_are_valid_without_consuming_short_lesson_budget(app):
    browser = client(app); owner = login(browser).json()['id']
    reading = next(question for question in load_catalog()['questions'] if question['book_id'])
    values = [course_event(1, hint_used=True), course_event(2, reading)]
    assert values[1]['taxonomy_version'] is None
    assert post(browser, owner, values).status_code == 200
    result = browser.get('/api/study/plan', params={'expected_account_id': owner}).json()
    assert result['answered_today'] == 1 and result['remaining'] == 3
    assert result['states'][values[0]['question_id']]['stage'] == 0
    assert result['states'][values[0]['question_id']]['assisted'] == 1
    assert result['states'][reading['id']]['stage'] == 1
    assert all(item['question_id'] != reading['id'] for item in result['questions'])


def test_study_plan_uses_session_owner_timezone_and_rejects_forged_assertion(app):
    first = client(app); owner = login(first).json()['id']
    app.state.store.create_account('other', 'Other', PASSWORD)
    second = client(app); other = login(second, 'other').json()['id']
    guest = client(app)
    assert post(first, owner, [course_event()]).status_code == 200
    assert guest.get('/api/study/plan', params={'expected_account_id': owner}).status_code == 401
    second.headers['X-User-Id'] = owner
    assert second.get('/api/study/plan', params={'expected_account_id': owner}).status_code == 409
    result = second.get('/api/study/plan', params={'expected_account_id': other}).json()
    assert result['answered_today'] == 0
    assert all(value['attempts'] == 0 for value in result['states'].values())
    app.state.bridge.config = {'account_id': owner, 'timezone': 'UTC'}
    assert first.get('/api/study/plan', params={'expected_account_id': owner}).json()['timezone'] == 'UTC'
    assert second.get('/api/study/plan', params={'expected_account_id': other}).json()['timezone'] == 'America/Los_Angeles'
    for count in [1, 7, 2.5, 'invalid']:
        assert first.get('/api/study/plan', params={'expected_account_id': owner, 'daily_count': count}).status_code == 422


def test_catalog_or_log_read_failure_is_unavailable_not_zero_plan(app, monkeypatch):
    browser = client(app); owner = login(browser).json()['id']
    queued = course_event()
    def unavailable():
        raise OSError('private path is intentionally not exposed')
    monkeypatch.setattr('backend.study.load_catalog', unavailable)
    monkeypatch.setattr('backend.learning.load_catalog', unavailable)
    response = browser.get('/api/study/plan', params={'expected_account_id': owner})
    assert response.status_code == 503
    assert 'questions' not in response.json() and 'private path' not in response.text
    assert post(browser, owner, [queued]).status_code == 503


def test_corrupt_payload_is_503_without_exposing_private_database(app):
    browser = client(app); owner = login(browser).json()['id']
    with app.state.store.connection() as db:
        db.execute('INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)',
                   (owner, 'damaged-record-0001', 0, 'not-json', 0))
    assert browser.get('/api/study/plan', params={'expected_account_id': owner}).status_code == 503


def test_trusted_robot_v2_preserves_raw_answer_and_unknown_hint_but_is_never_publicly_uploadable(app):
    value = course_event(source='robot', robot='Jarvis', hint_used=None, answer='五')
    epoch, payload = validate_event(value, trusted_robot=True)
    assert json.loads(payload)['answer'] == '五'
    assert json.loads(payload)['hint_used'] is None
    browser = client(app); owner = login(browser).json()['id']
    assert post(browser, owner, [value]).status_code == 422
    with app.state.store.connection() as db:
        db.execute('INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)', (owner, value['id'], epoch, payload, epoch))
    state = browser.get('/api/study/plan', params={'expected_account_id': owner}).json()['states'][value['question_id']]
    assert state['stage'] == 0 and state['unknown_hint'] == 1 and state['independent_days'] == 0
    assert state['assisted'] == 0
    legacy_robot = legacy_event(source='robot', robot='Friday', topic_id=None, taxonomy_version=None, answer='三')
    assert json.loads(validate_event(legacy_robot, trusted_robot=True)[1])['answer'] == '三'


def test_python_calendar_intervals_epoch_options_and_failed_read_are_explicit():
    catalog = load_catalog(); q = catalog['questions'][0]
    rows = [course_event(1, occurred_at='2026-11-01T08:30:00Z'), course_event(2, occurred_at='2026-11-01T09:30:00Z')]
    now = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)
    value = plan(catalog, rows, now=now.timestamp(), timezone='America/Los_Angeles', daily_count=6)
    assert value['states'][q['id']]['stage'] == 1
    assert value['states'][q['id']]['due_day'] == '2026-11-02'
    assert value['answered_today'] == 1 and value['remaining'] == 5
    assert eligible(catalog, rows[0], {'now': now})
    assert not eligible(catalog, {**rows[0], 'question_version': 'old'}, {'now': now})
    with pytest.raises(ValueError, match='日志读取失败'):
        states(catalog, None, {'now': now})


def test_saved_account_timezone_overrides_bridge_only_for_its_owner(app):
    browser = client(app); owner = login(browser).json()['id']
    app.state.bridge.config = {'account_id': owner, 'timezone': 'America/Los_Angeles'}
    profile = {'name': 'Iris', 'learningSettings': {'timezone': 'Asia/Shanghai'}}
    backup = {'app': 'kids-learning-app', 'version': 2, 'scope': 'learning', 'entries': {'kidsProfileData': json.dumps(profile)}}
    assert browser.put('/api/snapshot', json={'revision': 0, 'expected_account_id': owner, 'backup': backup}).status_code == 200
    response = browser.get('/api/study/plan', params={'expected_account_id': owner})
    assert response.status_code == 200 and response.json()['timezone'] == 'Asia/Shanghai'
    app.state.store.create_account('other', 'Other', PASSWORD)
    other_browser = client(app); other = login(other_browser, 'other').json()['id']
    assert other_browser.get('/api/study/plan', params={'expected_account_id': other}).json()['timezone'] == 'America/Los_Angeles'
    from backend.study import account_timezone
    with app.state.store.connection() as db:
        assert account_timezone(db, owner, 'UTC') == 'Asia/Shanghai'
        assert account_timezone(db, other, 'UTC') == 'UTC'
        broken = json.dumps({'entries': {'kidsProfileData': json.dumps({'learningSettings': {'timezone': '../invalid'}})}})
        db.execute('UPDATE snapshots SET payload=? WHERE account_id=?', (broken, owner))
        assert account_timezone(db, owner, 'UTC') == 'UTC'


def test_saved_profile_json_read_failure_does_not_fake_empty_study_plan(app):
    browser = client(app); owner = login(browser).json()['id']
    with app.state.store.connection() as db:
        db.execute('INSERT INTO snapshots VALUES (?,?,?,?)', (owner, 1, 0, json.dumps({'entries': {'kidsProfileData': '{bad-json'}})))
    assert browser.get('/api/study/plan', params={'expected_account_id': owner}).status_code == 503


def test_saved_daily_count_is_owned_bounded_and_json_failure_is_not_default(app):
    from backend.study import account_daily_count
    with app.state.store.connection() as db:
        owner = db.execute("SELECT id FROM accounts WHERE username='iris'").fetchone()['id']
        assert account_daily_count(db, owner) == 4
        assert account_daily_count(db, 'another-owner', 6) == 6
        for expected, raw in [(2, 2), (6, 6), (4, 1), (4, 7), (4, True), (4, '2'), (4, None)]:
            snapshot = {'entries': {'kidsProfileData': json.dumps({'learningSettings': {'dailyCount': raw}})}}
            db.execute('INSERT INTO snapshots VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET payload=excluded.payload', (owner, 1, 0, json.dumps(snapshot)))
            assert account_daily_count(db, owner) == expected
            assert account_daily_count(db, 'another-owner') == 4
        db.execute('UPDATE snapshots SET payload=? WHERE account_id=?', ('damaged-json', owner))
        with pytest.raises(ValueError):
            account_daily_count(db, owner)
