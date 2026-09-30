"""同机受信适配器：只读家教日志、写私有题单，不调用任何机器人控制接口。"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import sqlite3
import tempfile
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import Request
from backend.learning import check_owner, validate_event

BRIDGE_SCHEMA = """
CREATE TABLE IF NOT EXISTS robot_imports (
 account_id TEXT NOT NULL REFERENCES accounts(id), source TEXT NOT NULL,
 generation TEXT NOT NULL, cursor INTEGER NOT NULL, PRIMARY KEY(account_id,source)
);
"""
SUBJECTS = {'Mathematics':'math', 'Science':'science', 'English':'english', 'History':'history',
            'Computing':'computing', 'Life Skills':'life_skills',
            'Personal & Social Development':'social', 'Learning to Learn':'learning_to_learn'}


def arithmetic(question_id):
    """仅允许 0–30 加减法，独立重算答案，不相信上传的 expected/question。"""
    match = re.fullmatch(r'math_(\d{1,2})_([+-])_(\d{1,2})', question_id or '')
    if not match:
        return None
    left, op, right = int(match[1]), match[2], int(match[3])
    answer = left + right if op == '+' else left - right
    if max(left, right) > 30 or not 0 <= answer <= 30:
        return None
    return {'question_id':question_id, 'question':f'{left} {op} {right} = ?',
            'spoken':f'{left}{"加" if op == "+" else "减"}{right}等于多少？',
            'expected':str(answer), 'left':left, 'operator':op, 'right':right}


def review_plan(db, owner, zone='America/Los_Angeles', now=None):
    now = time.time() if now is None else now
    today = datetime.fromtimestamp(now, ZoneInfo(zone)).date()
    # 看作答时间，不让迟到的离线错题盖过较新的答对记录；同毫秒用 seq 排序。
    rows = db.execute("""SELECT payload FROM (
        SELECT payload, ROW_NUMBER() OVER (
          PARTITION BY json_extract(payload,'$.question_id') ORDER BY occurred_at DESC, seq DESC
        ) AS rank FROM learning_events WHERE account_id=?
          AND json_extract(payload,'$.subject')='math'
          AND json_extract(payload,'$.verdict') IN ('correct','wrong')
        ) WHERE rank=1 ORDER BY json_extract(payload,'$.occurred_at') DESC""", (owner,)).fetchall()
    result = []
    for row in rows:
        event = json.loads(row['payload'])
        question = arithmetic(event['question_id'])
        if not question or event['verdict'] != 'wrong':
            continue
        if event['source'] == 'robot' and datetime.fromisoformat(event['occurred_at'].replace('Z','+00:00')).astimezone(ZoneInfo(zone)).date() == today:
            continue  # 同天不反复追着问已陪练的题。
        result.append(question)
        if len(result) == 2:
            break
    return result


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, temp = tempfile.mkstemp(prefix='.plan-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


class TutorBridge:
    def __init__(self, store, config=None):
        self.store = store
        self.config_path = Path(config or os.environ.get('LEARNING_ROBOT_CONFIG', '~/.local/share/kids-learning/robot-bridge.json')).expanduser()
        self.config = json.loads(self.config_path.read_text()) if self.config_path.exists() else None
        self.status = 'unconfigured'
        self.last_success = None
        self.topics = {}
        self.version = None
        with store.connection() as db:
            db.executescript(BRIDGE_SCHEMA)
        if self.config:
            for key in ('source', 'taxonomy', 'plan_file'):
                self.config[key] = str(Path(self.config[key]).expanduser().resolve())
            raw = json.loads(Path(self.config['taxonomy']).read_text())
            self.version = raw['version']
            self.topics = {t['id']:t for t in raw['topics']}
            ZoneInfo(self.config.get('timezone', 'America/Los_Angeles'))

    def converted(self, row):
        if row['verdict'] not in ('correct', 'wrong', 'unclear'):
            return None
        tid = row['topic_id']
        web = arithmetic(tid.removeprefix('web:')) if tid.startswith('web:') else None
        topic = self.topics.get(tid)
        if not web and not topic:
            return None
        if row['serial'] not in ('0dd1a5e9', '00406f0d'):
            raise ValueError('未知机器人日志，未推进游标')
        stamp = row.get('occurred_at')
        if not stamp:
            stamp = datetime.fromisoformat(row['ts']).replace(tzinfo=ZoneInfo(self.config.get('timezone', 'America/Los_Angeles'))).astimezone(timezone.utc).isoformat()
        original = row.get('event_id')
        if not original:
            original = hashlib.sha256(json.dumps(row, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:32]
        value = {'id':'robot-' + original, 'occurred_at':stamp, 'source':'robot',
                 'subject':'math' if web else SUBJECTS[topic['subject']],
                 'question_id':web['question_id'] if web else 'marble:' + tid,
                 'question':row['question'], 'expected':str(row['expected'] or '—'),
                 'answer':str(row['answer'] or '—'), 'verdict':row['verdict'],
                 'robot':'Jarvis' if row['serial']=='0dd1a5e9' else 'Friday',
                 'topic_id':None if web else tid, 'taxonomy_version':None if web else self.version}
        return value['id'], *validate_event(value, trusted_robot=True)

    def tick(self):
        if not self.config:
            return
        owner = self.config['account_id']
        source = Path(self.config['source'])
        now = int(time.time())
        with self.store.connection() as db:
            active = db.execute('SELECT display_name FROM accounts WHERE id=? AND disabled=0', (owner,)).fetchone()
            if not active:
                atomic_json(self.config['plan_file'], {'schema':1,'account_id':owner,'name':'','generated_at':now,'expires_at':now+120,'questions':[]})
                self.status = 'disabled'
                return
        if not source.exists():
            self.status = 'waiting_for_tutor'
            return
        generation = f'{source.stat().st_dev}:{source.stat().st_ino}'
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True, timeout=2)) as robot:
            robot.row_factory = sqlite3.Row
            max_id = robot.execute('SELECT COALESCE(MAX(id),0) FROM tutor_log').fetchone()[0]
            with self.store.connection() as db:
                cursor_row = db.execute('SELECT * FROM robot_imports WHERE account_id=? AND source=?', (owner,str(source))).fetchone()
            cursor = cursor_row['cursor'] if cursor_row and cursor_row['generation']==generation and cursor_row['cursor']<=max_id else 0
            rows = [dict(row) for row in robot.execute('SELECT * FROM tutor_log WHERE id>? ORDER BY id LIMIT 100', (cursor,))]
        converted = [self.converted(row) for row in rows]
        with self.store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            active = db.execute('SELECT display_name FROM accounts WHERE id=? AND disabled=0', (owner,)).fetchone()
            if not active:
                return
            for event in converted:
                if event is None:
                    continue
                event_id, epoch, payload = event
                old = db.execute('SELECT payload FROM learning_events WHERE account_id=? AND event_id=?', (owner,event_id)).fetchone()
                if old and old['payload'] != payload:
                    raise ValueError('机器人日志 ID 冲突，整批未导入')
                if not old:
                    db.execute('INSERT INTO learning_events(account_id,event_id,occurred_at,payload,recorded_at) VALUES (?,?,?,?,?)', (owner,event_id,epoch,payload,now))
            end = rows[-1]['id'] if rows else cursor
            db.execute('INSERT INTO robot_imports VALUES (?,?,?,?) ON CONFLICT(account_id,source) DO UPDATE SET generation=excluded.generation,cursor=excluded.cursor', (owner,str(source),generation,end))
            questions = review_plan(db, owner, self.config.get('timezone','America/Los_Angeles'), now)
        atomic_json(self.config['plan_file'], {'schema':1,'account_id':owner,'name':active['display_name'],'generated_at':now,'expires_at':now+120,'questions':questions})
        self.status = 'ready'
        self.last_success = now

    async def worker(self):
        while True:
            try:
                await asyncio.to_thread(self.tick)
            except Exception:
                self.status = 'unavailable'  # 不把孩子的回答或数据库路径写进公开错误。
            await asyncio.sleep(10)

    def install(self, app, account):
        @app.get('/api/tutor/plan')
        def get_plan(request: Request, expected_account_id: str):
            identity = account(request)
            check_owner(identity, expected_account_id)
            linked = bool(self.config and self.config['account_id']==identity['id'])
            with self.store.connection() as db:
                questions = review_plan(db, identity['id'])
            return {'account_id':identity['id'], 'questions':questions, 'robot_linked':linked,
                    'robot_status':self.status if linked else 'unlinked', 'last_success':self.last_success if linked else None}


def main():
    from backend.service import Settings, Store
    parser = argparse.ArgumentParser(description='把已有单个孩子账号绑定到本机家教日志，不创建账号')
    parser.add_argument('username')
    parser.add_argument('--source', required=True)
    parser.add_argument('--taxonomy', required=True)
    parser.add_argument('--plan-file', default='~/.local/share/kids-learning/robot-plan.json')
    args = parser.parse_args()
    store = Store(Settings.environment().database)
    with store.connection() as db:
        row = db.execute('SELECT id FROM accounts WHERE username=? AND disabled=0',(args.username,)).fetchone()
    if not row:
        parser.exit(1,'账号不存在或已停用；没有开通账号。\n')
    path = Path(os.environ.get('LEARNING_ROBOT_CONFIG','~/.local/share/kids-learning/robot-bridge.json')).expanduser()
    if path.exists() and json.loads(path.read_text())['account_id'] != row['id']:
        parser.exit(1,'已有其他孩子绑定，不自动改归属。\n')
    atomic_json(path, {'account_id':row['id'], 'source':str(Path(args.source).expanduser().resolve()),
                      'taxonomy':str(Path(args.taxonomy).expanduser().resolve()),
                      'plan_file':str(Path(args.plan_file).expanduser().resolve()), 'timezone':'America/Los_Angeles'})
    print('已绑定已有账号；没有启动机器人会话。')


if __name__=='__main__':
    main()
