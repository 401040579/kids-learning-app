import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from backend.study import load_catalog, states
from backend.tutor_bridge import curriculum_spoken, robot_review_plan
from backend.tests.test_accounts import app, client, login
from backend.tests.test_learning import post, read
from backend.tests.test_tutor_bridge import setup_bridge


def course_event(question, timestamp='2026-09-01T12:00:00.000Z'):
    catalog = load_catalog()
    return {'id':'course-answer-00000001','occurred_at':timestamp,'source':'web','subject':question['subject'],
            'question_id':question['id'],'question':question['question'],'expected':question['expected'],
            'answer':next(c for c in question['choices'] if c != question['expected']),'verdict':'wrong',
            'schema_version':2,'question_version':question['version'],'topic_id':question['topic_id'],
            'taxonomy_version':catalog['taxonomy_version'],'hint_used':False}


def test_course_wrong_robot_raw_answer_roundtrip_keeps_unknown_hint(app, tmp_path, monkeypatch):
    now = datetime(2026, 9, 2, 20, tzinfo=timezone.utc).timestamp()
    monkeypatch.setattr('backend.tutor_bridge.time.time', lambda: now)
    bridge, owner, source = setup_bridge(app, tmp_path)
    browser = client(app); login(browser)
    question = load_catalog()['questions'][0]
    assert post(browser, owner, [course_event(question)]).status_code == 200
    bridge.tick()
    plan = json.loads(Path(bridge.config['plan_file']).read_text())
    assert plan['questions'][0]['question_id'] == question['id']
    assert plan['catalog_version'] == load_catalog()['version']
    assert plan['questions'][0]['spoken'] == curriculum_spoken(question)
    with sqlite3.connect(source) as db:
        db.execute('INSERT INTO tutor_log(ts,serial,topic_id,question,expected,answer,verdict,event_id,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)',
                   ('2026-09-02 12:00:00','0dd1a5e9','web:'+question['id'],curriculum_spoken(question),question['expected'],
                    '嗯，是五个','correct','a'*32,'2026-09-02T19:00:00.000Z'))
    bridge.tick(); bridge.tick()
    events = read(browser, owner).json()['events']
    assert len(events) == 2
    robot = events[1]
    assert robot['source'] == 'robot' and robot['schema_version'] == 2
    assert robot['answer'] == '嗯，是五个' and robot['hint_used'] is None
    assert robot['topic_id'] == question['topic_id'] and robot['question_version'] == '1'
    evidence = states(load_catalog(), events, now=now)[question['id']]
    assert evidence['stage'] == 0 and evidence['independent_days'] == 0
    assert evidence['unknown_hint'] == 1
    assert json.loads(Path(bridge.config['plan_file']).read_text())['questions'] == []


def test_course_bridge_refuses_changed_question_and_reading_for_oral(app, tmp_path):
    bridge, owner, source = setup_bridge(app, tmp_path)
    question = load_catalog()['questions'][0]
    row = {'verdict':'correct','topic_id':'web:'+question['id'],'question':'旧版本不同题干',
           'expected':question['expected'],'serial':'0dd1a5e9','answer':'5','event_id':'b'*32,
           'occurred_at':'2026-09-01T12:00:00.000Z'}
    assert bridge.converted(row) is None
    reading = next(q for q in load_catalog()['questions'] if q['book_id'])
    assert bridge.converted({**row,'topic_id':'web:'+reading['id'],'question':curriculum_spoken(reading),'expected':reading['expected']}) is None
    # 用旧接口谎报 lesson ID，不形成固定课程证据/口头题。
    browser = client(app); login(browser)
    raw = course_event(question)
    legacy = {key:raw[key] for key in ('id','occurred_at','source','subject','question_id','question','expected','answer','verdict')}
    assert post(browser,owner,[legacy]).status_code == 200
    with app.state.store.connection() as db:
        assert robot_review_plan(db,owner) == []


def test_missing_catalog_does_not_disable_accounts_or_original_arithmetic(app, monkeypatch):
    from backend.tutor_bridge import TutorBridge
    from backend.tests.test_learning import event
    def missing(*args):
        raise FileNotFoundError('curriculum')
    monkeypatch.setattr('backend.tutor_bridge.load_catalog', missing)
    bridge = TutorBridge(app.state.store)
    assert bridge.catalog is None and not bridge.course_questions
    browser=client(app);owner=login(browser).json()['id']
    assert post(browser,owner,[event(verdict='wrong',answer='4')]).status_code==200
    with app.state.store.connection() as db:
        assert robot_review_plan(db,owner)[0]['question_id']=='math_1_+_2'


def test_oral_filter_runs_before_budget_and_honors_saved_daily_count(app, monkeypatch):
    from copy import deepcopy
    from backend.learning import validate_event
    catalog=deepcopy(load_catalog())
    # 未来增加看图课程时也不能挡住后面已到期的口头题。
    for q in catalog['questions'][:6]:q['modality']='screen'
    monkeypatch.setattr('backend.tutor_bridge.load_catalog',lambda:catalog)
    browser=client(app);owner=login(browser).json()['id']
    now=datetime(2026,9,2,20,tzinfo=timezone.utc).timestamp()
    with app.state.store.connection() as db:
        for index,q in enumerate(catalog['questions'][:7]):
            event={**course_event(q),'id':f'oral-filter-{index:08d}'}
            epoch,payload=validate_event(event)
            db.execute('INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)',(owner,event['id'],epoch,payload,epoch))
        assert robot_review_plan(db,owner,now=now)[0]['question_id']==catalog['questions'][6]['id']
        db.execute('INSERT INTO snapshots VALUES (?,?,?,?)',(owner,1,0,json.dumps({'entries':{'kidsProfileData':json.dumps({'learningSettings':{'dailyCount':2}})}})))
        for index,q in enumerate(catalog['questions'][7:9]):
            event={**course_event(q,'2026-09-02T19:00:00.000Z'),'id':f'daily-budget-{index:08d}'}
            epoch,payload=validate_event(event)
            db.execute('INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)',(owner,event['id'],epoch,payload,epoch))
        assert robot_review_plan(db,owner,now=now)==[]
