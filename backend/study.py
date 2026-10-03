"""版本化课程证据与日历间隔复习；不把旧累计数或机器人 v1 记录当成新课程掌握。"""
import json
import math
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone as utc_timezone
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

INTERVALS = (1, 3, 7, 14, 30)
COURSE_FIELDS = {'id', 'occurred_at', 'source', 'subject', 'question_id', 'question', 'expected', 'answer', 'verdict',
                 'schema_version', 'topic_id', 'taxonomy_version', 'question_version', 'hint_used'}


def _text(value, limit=200):
    return isinstance(value, str) and 1 <= len(value) <= limit


def validate_catalog(catalog):
    if not isinstance(catalog, dict) or not _text(catalog.get('version'), 80) or not _text(catalog.get('taxonomy_version'), 80):
        raise ValueError('课程版本无效')
    topics, questions = catalog.get('topics'), catalog.get('questions')
    if not isinstance(topics, list) or not topics or not isinstance(questions, list) or not questions:
        raise ValueError('课程没有有效知识点或题目')
    topic_map, ids = {}, set()
    for topic in topics:
        if not isinstance(topic, dict) or not {'id', 'subject', 'title', 'marble_id', 'age_min', 'age_max'} <= set(topic) or not _text(topic.get('id'), 80) or topic['id'] in topic_map or topic['id'] in {'__proto__', 'constructor', 'prototype'}:
            raise ValueError('课程知识点 ID 无效或重复')
        if topic.get('subject') not in ('math', 'science', 'reading') or not _text(topic.get('title'), 200):
            raise ValueError('课程知识点学科或标题无效')
        if topic.get('marble_id') is not None and not _text(topic['marble_id'], 80):
            raise ValueError('Marble 知识点无效')
        if any(type(topic.get(key)) is not int for key in ('age_min', 'age_max')) or not 0 <= topic['age_min'] <= topic['age_max'] <= 120:
            raise ValueError('课程年龄范围无效')
        topic_map[topic['id']] = topic
    for question in questions:
        if not isinstance(question, dict) or not {'id', 'version', 'topic_id', 'subject', 'question', 'choices', 'expected', 'hint', 'explanation', 'modality', 'book_id'} <= set(question) or not _text(question.get('id'), 120) or question['id'] in ids or question['id'] in {'__proto__', 'constructor', 'prototype'}:
            raise ValueError('课程题目 ID 无效或重复')
        topic = topic_map.get(question['topic_id']) if _text(question['topic_id'], 80) else None
        if not topic or question.get('subject') != topic['subject'] or not _text(question.get('version'), 32):
            raise ValueError('课程题目归属或版本无效')
        choices = question.get('choices')
        if not isinstance(choices, list) or len(choices) != 3 or any(not _text(choice) for choice in choices) or len(set(choices)) != 3 or question.get('expected') not in choices:
            raise ValueError('课程选项或答案无效')
        if not _text(question.get('question'), 500) or any(not _text(question.get(key), 2000) for key in ('hint', 'explanation')) or question.get('modality') not in ('oral', 'screen'):
            raise ValueError('课程题干、提示或呈现方式无效')
        if question['subject'] == 'reading':
            if not _text(question.get('book_id'), 80) or topic.get('marble_id') is not None:
                raise ValueError('阅读题书籍或来源无效')
        elif question.get('book_id') is not None or not _text(topic.get('marble_id'), 80):
            raise ValueError('数学科学题来源无效')
        ids.add(question['id'])
    return catalog


@lru_cache(maxsize=4)
def _catalog_file(path, modified, size):
    return validate_catalog(json.loads(Path(path).read_text()))


def load_catalog(path=None):
    path = Path(path or Path(__file__).resolve().parent.parent / 'data' / 'curriculum.json')
    info = path.stat()  # 失败直接上抛，不以空课程或空日志冒充成功。
    return _catalog_file(str(path.resolve()), info.st_mtime_ns, info.st_size)


def validate_course_event(catalog, event, *, trusted_robot=False):
    """结构与内容校验；时钟窗口由公共事件入口验证，纯引擎另排除未来记录。"""
    if not isinstance(event, dict) or set(event) != (COURSE_FIELDS | {'robot'} if trusted_robot else COURSE_FIELDS) or type(event.get('schema_version')) is not int or event['schema_version'] != 2:
        raise ValueError('课程作答字段或版本无效')
    if not _text(event.get('id'), 64) or not re.fullmatch(r'[a-zA-Z0-9_-]{16,64}', event['id']) or event.get('source') != ('robot' if trusted_robot else 'web'):
        raise ValueError('课程作答来源或 ID 无效')
    if type(event.get('hint_used')) is not bool and not (trusted_robot and event.get('hint_used') is None):
        raise ValueError('课程提示标记无效')
    if trusted_robot and event.get('robot') not in ('Jarvis', 'Friday'):
        raise ValueError('课程机器人来源无效')
    questions = {question['id']: question for question in catalog['questions']}
    topics = {topic['id']: topic for topic in catalog['topics']}
    question = questions.get(event.get('question_id'))
    if not question:
        raise ValueError('课程题目不存在')
    topic = topics[question['topic_id']]
    expected = {'subject': question['subject'], 'topic_id': question['topic_id'], 'question_version': question['version'],
                'taxonomy_version': catalog['taxonomy_version'] if topic['marble_id'] is not None else None,
                'question': question['question'], 'expected': question['expected']}
    if any(event.get(key) != value for key, value in expected.items()):
        raise ValueError('课程作答内容或知识点版本不一致')
    verdict, answer = event.get('verdict'), event.get('answer')
    if trusted_robot:
        if verdict not in ('correct', 'wrong', 'unclear', 'skipped') or not _text(answer, 2000) or (verdict == 'skipped' and answer != '—'):
            raise ValueError('机器人课程作答结果无效')
    elif verdict in ('correct', 'wrong'):
        if answer not in question['choices'] or verdict != ('correct' if answer == question['expected'] else 'wrong'):
            raise ValueError('课程答案和判定不一致')
    elif verdict == 'skipped':
        if answer != '—':
            raise ValueError('跳过课程题时答案必须为空占位符')
    elif verdict != 'unclear' or not _text(answer):
        raise ValueError('课程作答结果无效')
    return event


def _stamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})', value):
        raise ValueError('作答时间无效')
    stamp = datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(utc_timezone.utc)
    milliseconds = int(stamp.replace(microsecond=0).timestamp()) * 1000 + stamp.microsecond // 1000
    return stamp, milliseconds


def _options(options=None, now=None, timezone=None):
    if options is not None and not isinstance(options, dict):
        raise ValueError('复习参数无效')
    options = options or {}
    now = now if now is not None else options.get('now', datetime.now(utc_timezone.utc))
    if type(now) in (int, float) and math.isfinite(now):
        now = datetime.fromtimestamp(now, utc_timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError('复习时钟必须带时区')
    zone = ZoneInfo(timezone or options.get('timezone', 'America/Los_Angeles'))
    return now, zone


def eligible(catalog, event, options=None):
    validate_catalog(catalog)
    now, _ = _options(options)
    try:
        validate_course_event(catalog, event, trusted_robot=isinstance(event, dict) and event.get('source') == 'robot')
        stamp, _ = _stamp(event['occurred_at'])
        return 946684800000 <= _stamp(event['occurred_at'])[1] <= int(now.replace(microsecond=0).timestamp()) * 1000 + now.microsecond // 1000
    except (ValueError, TypeError, KeyError, OverflowError):
        return False


def _events(catalog, events, now):
    if not isinstance(events, list):
        raise ValueError('课程日志读取失败')
    by_id = {}
    for event in events:
        try:
            validate_course_event(catalog, event, trusted_robot=isinstance(event, dict) and event.get('source') == 'robot')
            stamp, milliseconds = _stamp(event['occurred_at'])
            if not 946684800000 <= milliseconds <= int(now.replace(microsecond=0).timestamp()) * 1000 + now.microsecond // 1000:
                continue
            normalized = {**event, 'occurred_at': stamp.isoformat(timespec='milliseconds').replace('+00:00', 'Z')}
            signature = json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
            item = (milliseconds, event['id'], event, stamp, signature)
            if event['id'] not in by_id:
                by_id[event['id']] = item
            elif by_id[event['id']] is not None and by_id[event['id']][-1] != signature:
                by_id[event['id']] = None  # 相同 ID 不同内容不作为可信掌握证据。
        except (ValueError, TypeError, KeyError, OverflowError):
            continue
    return sorted((item for item in by_id.values() if item is not None), key=lambda item: item[:2])


def states(catalog, events, options=None, *, now=None, timezone=None):
    validate_catalog(catalog)
    now, zone = _options(options, now, timezone)
    today = now.astimezone(zone).date().isoformat()
    result, independent = {}, {}
    for question in catalog['questions']:
        result[question['id']] = {'question_id': question['id'], 'topic_id': question['topic_id'], 'stage': 0, 'due_day': None,
            'last_day': None, 'last_scored_day': None, 'independent_days': 0, 'assisted': 0, 'wrong': 0, 'attempts': 0,
            'correct': 0, 'unclear': 0, 'skipped': 0, 'unknown_hint': 0, 'attempted_today': False, 'seen': False}
        independent[question['id']] = set()
    for _, _, event, stamp, _ in _events(catalog, events, now):
        state = result[event['question_id']]
        day = stamp.astimezone(zone).date().isoformat()
        state['attempts'] += 1
        state['last_day'] = day
        state['attempted_today'] = state['attempted_today'] or day == today
        state['assisted'] += int(event['hint_used'] is True)
        state['unknown_hint'] += int(event['hint_used'] is None)
        state[event['verdict']] += 1
        if event['verdict'] not in ('correct', 'wrong'):
            continue
        state['seen'] = True
        if event['verdict'] == 'wrong' or event['hint_used'] or event['source'] == 'robot':
            state['stage'] = 0
            state['due_day'] = (date.fromisoformat(day) + timedelta(days=1)).isoformat()
        else:
            independent[event['question_id']].add(day)
            if state['last_scored_day'] != day:
                state['stage'] = min(5, state['stage'] + 1)
                state['due_day'] = (date.fromisoformat(day) + timedelta(days=INTERVALS[state['stage'] - 1])).isoformat()
        state['last_scored_day'] = day
        state['independent_days'] = len(independent[event['question_id']])
    return result


def plan(catalog, events, options=None, *, now=None, timezone=None, daily_count=None):
    now, zone = _options(options, now, timezone)
    options = options or {}
    count = daily_count if daily_count is not None else options.get('dailyCount', 4)
    if type(count) is not int or not 2 <= count <= 6:
        raise ValueError('每日短课题数须为 2–6')
    status = states(catalog, events, {'now': now, 'timezone': zone.key})
    today = now.astimezone(zone).date().isoformat()
    questions = [question for question in catalog['questions'] if question['book_id'] is None]
    answered = sum(status[question['id']]['attempted_today'] for question in questions)
    remaining = max(0, count - answered)
    due = [question for question in questions if not status[question['id']]['attempted_today'] and status[question['id']]['seen']
           and status[question['id']]['due_day'] is not None and status[question['id']]['due_day'] <= today]
    order = {question['id']: index for index, question in enumerate(questions)}
    due.sort(key=lambda question: (status[question['id']]['due_day'], order[question['id']]))
    new = [question for question in questions if not status[question['id']]['attempted_today'] and not status[question['id']]['seen']]
    selected = ([{'question_id': question['id'], 'reason': 'review', 'due_day': status[question['id']]['due_day']} for question in due]
                + [{'question_id': question['id'], 'reason': 'new', 'due_day': None} for question in new])[:remaining]
    return {'questions': selected, 'answered_today': answered, 'remaining': remaining, 'due_count': len(due), 'states': status,
            'day': today, 'timezone': zone.key}



def _account_settings(db, owner):
    row = db.execute('SELECT payload FROM snapshots WHERE account_id=?', (owner,)).fetchone()
    if not row:
        return {}
    snapshot = json.loads(row['payload'])
    entries = snapshot.get('entries') if isinstance(snapshot, dict) else None
    raw = entries.get('kidsProfileData') if isinstance(entries, dict) else None
    if not isinstance(raw, str):
        return {}
    profile = json.loads(raw)
    settings = profile.get('learningSettings') if isinstance(profile, dict) else None
    return settings if isinstance(settings, dict) else {}


def account_timezone(db, owner, fallback='America/Los_Angeles'):
    """读取同一账号云资料；非法设置回退，损坏 JSON/数据库上抛以区别读取失败。"""
    zone = _account_settings(db, owner).get('timezone')
    if isinstance(zone, str) and 1 <= len(zone) <= 80:
        try:
            ZoneInfo(zone)
            return zone
        except (ValueError, ZoneInfoNotFoundError):
            pass
    return fallback


def account_daily_count(db, owner, fallback=4):
    count = _account_settings(db, owner).get('dailyCount')
    return count if type(count) is int and 2 <= count <= 6 else fallback


def install_study_routes(app, store, account, bridge):
    from fastapi import HTTPException, Request
    from backend.learning import check_owner

    @app.get('/api/study/plan')
    def get_plan(request: Request, expected_account_id: str, daily_count: int = 4):
        identity = account(request)
        check_owner(identity, expected_account_id)
        if not 2 <= daily_count <= 6:
            raise HTTPException(422, '每日短课题数须为 2–6')
        try:
            catalog = load_catalog()
            linked = bool(bridge.config and bridge.config['account_id'] == identity['id'])
            fallback = bridge.config.get('timezone', 'America/Los_Angeles') if linked else 'America/Los_Angeles'
            with store.connection() as db:
                rows = db.execute('SELECT payload FROM learning_events WHERE account_id=? ORDER BY seq', (identity['id'],)).fetchall()
                zone = account_timezone(db, identity['id'], fallback)
            events = [json.loads(row['payload']) for row in rows]
            if any(not isinstance(event, dict) for event in events):
                raise ValueError('日志损坏')
            result = plan(catalog, events, {'timezone': zone, 'dailyCount': daily_count})
        except (OSError, ValueError, sqlite3.Error) as error:
            raise HTTPException(503, '课程或学习记录暂时无法读取，请稍后再试') from error
        return {'account_id': identity['id'], 'catalog_version': catalog['version'], **result}
