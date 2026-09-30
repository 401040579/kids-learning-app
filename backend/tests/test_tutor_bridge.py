import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone
import pytest

from backend.tutor_bridge import TutorBridge, arithmetic, review_plan
from backend.tests.test_accounts import app, client, login, PASSWORD
from backend.tests.test_learning import event, post, read


def setup_bridge(app, tmp_path):
    source = tmp_path/'tutor.db'
    with sqlite3.connect(source) as db:
        db.execute('CREATE TABLE tutor_log(id INTEGER PRIMARY KEY, ts TEXT, serial TEXT, topic_id TEXT, question TEXT, expected TEXT, answer TEXT, verdict TEXT, event_id TEXT, occurred_at TEXT)')
    taxonomy = tmp_path/'topics.json'
    taxonomy.write_text(json.dumps({'version':'v1','topics':[{'id':'mt_test','subject':'Science'}]}))
    with app.state.store.connection() as db:
        owner = db.execute('SELECT id FROM accounts WHERE username="iris"').fetchone()['id']
    config = tmp_path/'bridge.json'
    config.write_text(json.dumps({'account_id':owner,'source':str(source),'taxonomy':str(taxonomy),'plan_file':str(tmp_path/'plan.json')}))
    bridge = TutorBridge(app.state.store, config)
    return bridge, owner, source


def log(source, event_id, topic='web:math_1_+_2', verdict='correct', answer='三', timestamp=None):
    with sqlite3.connect(source) as db:
        db.execute('INSERT INTO tutor_log(ts,serial,topic_id,question,expected,answer,verdict,event_id,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)',
                   ('2026-09-01 12:00:00','0dd1a5e9',topic,'一加二等于多少','3',answer,verdict,event_id,timestamp or datetime.now(timezone.utc).isoformat()))


def test_web_wrong_robot_correct_complete_chain_idempotent(app, tmp_path):
    browser = client(app); identity = login(browser).json()
    bridge, owner, source = setup_bridge(app,tmp_path)
    assert owner == identity['id']
    assert post(browser,owner,[event(verdict='wrong',answer='4',occurred_at='2026-09-01T12:00:00Z')]).status_code == 200
    bridge.tick()
    plan = json.loads(Path(bridge.config['plan_file']).read_text())
    assert plan['questions'][0]['expected'] == '3'
    assert Path(bridge.config['plan_file']).stat().st_mode & 0o077 == 0
    log(source,'a'*32)
    bridge.tick(); bridge.tick()
    rows = read(browser,owner).json()['events']
    assert len(rows) == 2 and rows[1]['source']=='robot' and rows[1]['robot']=='Jarvis'
    assert json.loads(Path(bridge.config['plan_file']).read_text())['questions'] == []
    assert sqlite3.connect(source).execute('SELECT COUNT(*) FROM tutor_log').fetchone()[0] == 1


def test_unclear_preserves_wrong_and_old_offline_wrong_does_not_reopen(app,tmp_path):
    bridge, owner, source = setup_bridge(app,tmp_path)
    browser=client(app);login(browser)
    post(browser,owner,[event(verdict='wrong',answer='4',occurred_at='2026-01-01T00:00:00Z')])
    log(source,'b'*32,verdict='unclear',answer='电视杂音')
    bridge.tick()
    assert len(json.loads(Path(bridge.config['plan_file']).read_text())['questions'])==1
    log(source,'c'*32)
    bridge.tick()
    post(browser,owner,[event(2,verdict='wrong',answer='5',occurred_at='2026-01-02T00:00:00Z')])
    bridge.tick()
    assert json.loads(Path(bridge.config['plan_file']).read_text())['questions']==[]


def test_legacy_and_marble_provenance_restore_and_reset(app,tmp_path):
    bridge, owner, source = setup_bridge(app,tmp_path)
    log(source,None,topic='mt_test')
    with sqlite3.connect(source) as db:
        db.execute('UPDATE tutor_log SET occurred_at=NULL')
    bridge.tick()
    browser=client(app);login(browser)
    value=read(browser,owner).json()['events'][0]
    assert value['topic_id']=='mt_test' and value['taxonomy_version']=='v1'
    assert value['occurred_at']=='2026-09-01T19:00:00.000Z'
    # 删除源表记录导致 cursor 回零，新 UUID 的日志不与旧 rowid 碰撞。
    with sqlite3.connect(source) as db: db.execute('DELETE FROM tutor_log')
    bridge.tick()
    log(source,'d'*32,topic='mt_test')
    bridge.tick()
    assert len(read(browser,owner).json()['events'])==2


def test_conflict_rolls_back_batch_and_cursor_disabled_stops_plan(app,tmp_path):
    bridge,owner,source=setup_bridge(app,tmp_path)
    log(source,'e'*32);bridge.tick()
    log(source,'f'*32,topic='mt_test');log(source,'e'*32,answer='四')
    with pytest.raises(ValueError):bridge.tick()
    with app.state.store.connection() as db:
        assert db.execute('SELECT COUNT(*) FROM learning_events').fetchone()[0]==1
        assert db.execute('SELECT cursor FROM robot_imports').fetchone()[0]==1
        db.execute('UPDATE accounts SET disabled=1 WHERE id=?',(owner,))
    bridge.tick()
    assert bridge.status=='disabled'
    assert json.loads(Path(bridge.config['plan_file']).read_text())['questions']==[]


def test_api_plan_account_isolation_and_canonical_question(app):
    a=client(app);owner=login(a).json()['id']
    assert post(a,owner,[event(verdict='wrong',expected='99',question='恶意题目',answer='4')]).status_code==200
    plan=a.get('/api/tutor/plan',params={'expected_account_id':owner}).json()
    assert not plan['robot_linked'] and plan['questions'][0]['expected']=='3'
    app.state.store.create_account('other','Other',PASSWORD)
    b=client(app);other=login(b,'other').json()['id']
    assert b.get('/api/tutor/plan',params={'expected_account_id':owner}).status_code==409
    assert b.get('/api/tutor/plan',params={'expected_account_id':other}).json()['questions']==[]
    for q in ('math_29_+_9','math_0_-_2','math_1_×_2','math_99_+_0','bad'):
        assert arithmetic(q) is None
