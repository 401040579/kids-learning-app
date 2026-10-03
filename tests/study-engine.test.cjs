const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/curriculum.json')));
function engine(extra = {}) {
  const context = vm.createContext({ Date, Intl, AbortController, setTimeout, clearTimeout, ...extra });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/studyEngine.js'), 'utf8'), context);
  return vm.runInContext('StudyEngine', context);
}
const E = engine(), q = catalog.questions[0], science = catalog.questions.find(question => question.subject === 'science');
const reading = catalog.questions.find(question => question.subject === 'reading');
const now = new Date('2026-10-02T12:00:00.000Z');
function event(id, stamp = now.toISOString(), verdict = 'correct', hint = false, question = q, extra = {}) {
  const topic = catalog.topics.find(topic => topic.id === question.topic_id);
  return { id: 'study-answer-' + String(id).padStart(8, '0'), occurred_at: stamp, source: 'web', subject: question.subject,
    question_id: question.id, question: question.question, expected: question.expected,
    answer: verdict === 'wrong' ? question.choices.find(choice => choice !== question.expected) : verdict === 'skipped' ? '—' : verdict === 'unclear' ? '房间声音' : question.expected,
    verdict, schema_version: 2, topic_id: question.topic_id, taxonomy_version: topic.marble_id === null ? null : catalog.taxonomy_version,
    question_version: question.version, hint_used: hint, ...extra };
}
function options(stamp = now) { return { now: stamp, timezone: 'America/Los_Angeles' }; }
function json(value) { return JSON.parse(JSON.stringify(value)); }

test('真实课程首课交叉数学科学，阅读状态存在但不消耗每日短课预算', () => {
  const plan = E.plan(catalog, [event(1, now.toISOString(), 'correct', false, reading)], options());
  assert.deepEqual(json(plan.questions.map(item => catalog.questions.find(question => question.id === item.question_id).subject)), ['math', 'science', 'math', 'science']);
  assert.equal(plan.answered_today, 0);
  assert.equal(plan.remaining, 4);
  assert.equal(plan.states[reading.id].attempts, 1);
  assert.equal(plan.states[reading.id].stage, 1);
  assert.equal(plan.questions.some(item => item.question_id === reading.id), false);
});

test('同一天重复独立答对只推进一次，不同日推进至1/3/7/14/30日间隔', () => {
  const rows = [];
  for (let i=1;i<=5;i++) rows.push(event(i, `2026-09-0${i}T12:00:00.000Z`));
  rows.push(event(6, '2026-09-05T14:00:00.000Z'));
  const state = E.states(catalog, rows.reverse(), options())[q.id];
  assert.equal(state.stage, 5);
  assert.equal(state.due_day, '2026-10-05');
  assert.equal(state.independent_days, 5);
  assert.equal(state.attempts, 6);
  const first = E.states(catalog, [event(1), event(2, '2026-10-02T12:00:01.000Z')], options(new Date('2026-10-02T12:01:00Z')))[q.id];
  assert.equal(first.stage, 1);
  assert.equal(first.due_day, '2026-10-03');
});

test('提示答对或答错重置并次日复习，同日重新正确不冒充一次新的独立进阶', () => {
  for (const [verdict, hint] of [['correct', true], ['wrong', false]]) {
    const rows = [event(1, '2026-09-01T12:00:00Z'), event(2, '2026-09-02T12:00:00Z'),
      event(3, '2026-10-01T12:00:00Z', verdict, hint), event(4, '2026-10-01T12:01:00Z')];
    const plan = E.plan(catalog, rows, options());
    assert.equal(plan.states[q.id].stage, 0);
    assert.equal(plan.states[q.id].due_day, '2026-10-02');
    assert.equal(plan.questions[0].question_id, q.id);
    assert.equal(plan.questions[0].reason, 'review');
    assert.equal(plan.due_count, 1);
  }
});

test('unclear/skipped 不改变阶段，但同日尝试消耗distinct题数预算且不再出', () => {
  const rows = [event(1, '2026-10-01T12:00:00Z'), event(2, now.toISOString(), 'unclear'),
    event(3, now.toISOString(), 'skipped', false, science), event(4, now.toISOString(), 'skipped', false, science)];
  const plan = E.plan(catalog, rows, { ...options(), dailyCount: 4 });
  assert.equal(plan.states[q.id].stage, 1);
  assert.equal(plan.states[q.id].due_day, '2026-10-02');
  assert.equal(plan.states[science.id].seen, false);
  assert.equal(plan.answered_today, 2);
  assert.equal(plan.remaining, 2);
  assert.equal(plan.questions.some(item => [q.id, science.id].includes(item.question_id)), false);
  assert.equal(E.plan(catalog, rows, { ...options(), dailyCount: 2 }).questions.length, 0);
});

test('作答按毫秒排序，同毫秒稳定ID排序，乱序输入与重复ID不多记', () => {
  const rows = [event(2, '2026-10-01T12:00:00.900Z', 'wrong'), event(1, '2026-10-01T12:00:00.100Z')];
  assert.equal(E.states(catalog, rows, options())[q.id].stage, 0);
  const first = event(1, '2026-10-01T12:00:00.900Z', 'wrong'), second = event(2, '2026-10-01T12:00:00.900Z');
  const state = E.states(catalog, [second, first, first], options())[q.id];
  assert.equal(state.attempts, 2);
  assert.equal(state.wrong, 1);
  assert.equal(state.stage, 0);
  assert.equal(E.states(catalog, [first, { ...first, verdict: 'correct', answer: q.expected }], options())[q.id].attempts, 0);
});

test('洛杉矶午夜、夏令时前进与回退都按日历日，不按24小时推进', () => {
  const cases = [
    [['2026-10-02T06:59:59.900Z', '2026-10-02T07:00:00.100Z'], '2026-10-02T12:00:00Z', 2, '2026-10-05'],
    [['2026-03-08T09:59:59Z', '2026-03-09T07:00:00Z'], '2026-03-09T12:00:00Z', 2, '2026-03-12'],
    [['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z'], '2026-11-01T12:00:00Z', 1, '2026-11-02']
  ];
  for (const [stamps, clock, stage, due] of cases) {
    const state = E.states(catalog, stamps.map((stamp, i) => event(i + 1, stamp)), options(new Date(clock)))[q.id];
    assert.equal(state.stage, stage);
    assert.equal(state.due_day, due);
  }
});

test('旧事件、旧题版本、虚假知识点/答案/判定/提示类型与未来记录不是课程证据', () => {
  const valid = event(1);
  const legacy = { ...valid }; for (const key of ['schema_version', 'topic_id', 'taxonomy_version', 'question_version', 'hint_used']) delete legacy[key];
  const invalid = [legacy, { ...valid, question_version: '0' }, { ...valid, topic_id: 'fake' },
    { ...valid, taxonomy_version: null }, { ...valid, expected: 'fake' }, { ...valid, verdict: 'wrong' },
    { ...valid, hint_used: null }, { ...valid, hint_used: 'false' }, { ...valid, source: 'robot' },
    { ...valid, occurred_at: '2026-10-02T12:00:00.001Z' }, { ...valid, occurred_at: '2026-02-30T12:00:00Z' },
    { ...valid, secret: 'unknown-field' }];
  for (const value of invalid) assert.equal(E.eligible(catalog, value, options()), false);
  assert.equal(E.states(catalog, invalid, options())[q.id].attempts, 0);
  assert.equal(E.eligible(catalog, valid, options()), true);
});

test('受信机器人保留原转写、提示未知独列，答对仍不推进独立阶段', () => {
  const robot = event(1, '2026-10-01T12:00:00Z', 'correct', null, q, { source: 'robot', robot: 'Jarvis', answer: '五' });
  assert.equal(E.eligible(catalog, robot, options()), true);
  const state = E.states(catalog, [robot], options())[q.id];
  assert.equal(state.stage, 0);
  assert.equal(state.due_day, '2026-10-02');
  assert.equal(state.independent_days, 0);
  assert.equal(state.unknown_hint, 1);
  assert.equal(state.assisted, 0);
  assert.equal(state.correct, 1);
  assert.equal(E.eligible(catalog, { ...robot, robot: 'Imposter' }, options()), false);
});

test('到期优先按due_day+课程顺序，空日志是新课、读取失败和非法budget会报错', () => {
  const rows = [event(1, '2026-09-25T12:00:00Z', 'wrong', false, science), event(2, '2026-09-26T12:00:00Z', 'wrong')];
  const plan = E.plan(catalog, rows, options());
  assert.deepEqual(json(plan.questions.slice(0, 2).map(question => question.question_id)), [science.id, q.id]);
  assert.equal(plan.due_count, 2);
  assert.equal(E.plan(catalog, [], options()).questions.every(question => question.reason === 'new'), true);
  for (const bad of [null, undefined, {}]) assert.throws(() => E.plan(catalog, bad, options()), /日志读取失败/);
  for (const dailyCount of [0, 1, 7, 2.5, '4', true]) assert.throws(() => E.plan(catalog, [], { ...options(), dailyCount }), /2–6/);
  assert.throws(() => E.plan(catalog, [], { now, timezone: 'Invalid/City' }));
});

test('目录加载失败可重试，headers成功但body挂起也会超时并清缓存', async () => {
  let calls = 0;
  const retry = engine({ fetch: async () => { calls++; return calls === 1 ? { ok: false } : { ok: true, json: async () => catalog }; } });
  await assert.rejects(retry.loadCatalog(), /无法读取/);
  assert.equal((await retry.loadCatalog()).version, catalog.version);
  await retry.loadCatalog(); assert.equal(calls, 2);
  for (const phase of ['response', 'body']) {
    let expire, signal, hang = true, retries = 0;
    const hanging = engine({ setTimeout: fn => { expire = fn; return 1; }, clearTimeout() {},
      fetch: async (_, options) => {
        signal = options.signal; retries++;
        if (hang && phase === 'response') return new Promise(() => {});
        return { ok: true, json: () => hang ? new Promise(() => {}) : Promise.resolve(catalog) };
      } });
    const pending = hanging.loadCatalog();
    expire(); await assert.rejects(pending, /超时/);
    assert.equal(signal.aborted, true);
    assert.equal(hanging.catalogPromise, null);
    hang = false;
    assert.equal((await hanging.loadCatalog()).version, catalog.version);
    assert.equal(retries, 2);
  }
});

test('JS/Python 对乱序、同日、午夜DST、hint、skip、旧版本、robot和冲突ID逐字段一致', () => {
  const fixtures = [
    { events: [] },
    { events: [event(1), event(2, now.toISOString(), 'skipped', false, science), event(3, now.toISOString(), 'correct', false, reading)] },
    { events: [event(2, '2026-10-01T12:00:00.900Z', 'wrong'), event(1, '2026-10-01T12:00:00.100Z')] },
    { events: [event(1, '2026-10-01T12:00:00Z', 'correct', true), event(2, '2026-10-01T12:01:00Z')] },
    { events: [event(1, '2026-10-02T06:59:59.900Z'), event(2, '2026-10-02T07:00:00.100Z')] },
    { now: '2026-03-09T12:00:00Z', events: [event(1, '2026-03-08T09:59:59Z'), event(2, '2026-03-09T07:00:00Z')] },
    { now: '2026-11-01T12:00:00Z', events: [event(1, '2026-11-01T08:30:00Z'), event(2, '2026-11-01T09:30:00Z')] },
    { events: [event(1, '2026-10-01T12:00:00Z', 'correct', null, q, { source: 'robot', robot: 'Friday', answer: '五' })] },
    { events: [event(1), event(1), event(2, now.toISOString(), 'unclear', true)] },
    { events: [event(1), event(1, now.toISOString(), 'wrong')] },
    { events: [event(1, now.toISOString(), 'correct', false, q, { question_version: 'old' }), event(2, now.toISOString(), 'skipped', false, science)] }
  ].map(fixture => ({ ...fixture, now: fixture.now || now.toISOString(), timezone: 'America/Los_Angeles', dailyCount: 4 }));
  const script = `import json,sys\nfrom datetime import datetime\nfrom backend.study import plan\nvalue=json.load(sys.stdin)\nresult=[]\nfor fixture in value['fixtures']:\n options={k:fixture[k] for k in ['timezone','dailyCount']}\n options['now']=datetime.fromisoformat(fixture['now'].replace('Z','+00:00'))\n result.append(plan(value['catalog'],fixture['events'],options))\njson.dump(result,sys.stdout,ensure_ascii=False)`;
  const python = fs.existsSync(path.join(__dirname, '../.venv/bin/python')) ? path.join(__dirname, '../.venv/bin/python') : 'python3';
  const run = spawnSync(python, ['-c', script], { cwd: path.join(__dirname, '..'), input: JSON.stringify({ catalog, fixtures }), encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const expected = JSON.parse(run.stdout);
  fixtures.forEach((fixture, index) => assert.deepEqual(json(E.plan(catalog, fixture.events, { ...fixture, now: new Date(fixture.now) })), expected[index], `parity fixture ${index}`));
});
