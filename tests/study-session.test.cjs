const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID, webcrypto } = require('node:crypto');

const catalog = {
  version: '2026-10-v1', taxonomy_version: 'v1',
  topics: [{ id: 'math-topic', subject: 'math', marble_id: 'math-topic', title: '加法', age_min: 4, age_max: 7 },
    { id: 'science-topic', subject: 'science', marble_id: 'science-topic', title: '融化', age_min: 4, age_max: 7 },
    { id: 'reading-topic', subject: 'reading', marble_id: null, title: '理解故事', age_min: 4, age_max: 7 }],
  questions: [
    { id: 'q-math-1', version: '1', topic_id: 'math-topic', subject: 'math', question: '1 加 1 是多少？', choices: ['1', '2', '3'], expected: '2', hint: '把两个 1 合起来。', explanation: '1 加 1 等于 2。', modality: 'oral', book_id: null },
    { id: 'q-science-1', version: '1', topic_id: 'science-topic', subject: 'science', question: '冰遇到热会怎样？', choices: ['变成水', '变成石头', '变成树'], expected: '变成水', hint: '想想冰块离开冰箱。', explanation: '冰会融化成水。', modality: 'oral', book_id: null },
    { id: 'q-read-1', version: '1', topic_id: 'reading-topic', subject: 'reading', question: '谁用砖头造房子？', choices: ['大哥', '二哥', '小弟'], expected: '小弟', hint: '回想谁的房子没倒。', explanation: '小弟用砖头盖房子。', modality: 'screen', book_id: 'three-little-pigs' },
    { id: 'q-read-2', version: '1', topic_id: 'reading-topic', subject: 'reading', question: '哪种房子最坚固？', choices: ['稻草房', '木头房', '砖头房'], expected: '砖头房', hint: '想想狼没吹倒哪间房。', explanation: '砖头房更坚固。', modality: 'screen', book_id: 'three-little-pigs' }
  ]
};

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function app(options = {}) {
  const elements = new Map(), disk = new Map(Object.entries(options.seed || {}));
  const records = new Map(), submitted = [], plans = [], timers = new Map(), listeners = new Map();
  let clock = Date.parse('2026-10-02T16:00:00Z'), timerId = 0, fetches = 0;
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.textContent = ''; this.value = ''; this.disabled = false;
      this.attributes = {}; this.events = {};
      this.classes = new Set();
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name), contains: name => this.classes.has(name) };
    }
    set id(value) { this._id = value; elements.set(value, this); }
    get id() { return this._id; }
    set className(value) { this.classes = new Set(value.split(/\s+/)); }
    get className() { return [...this.classes].join(' '); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.events[name] = callback; }
    focus() {}
    querySelector(selector) {
      const matches = child => selector.startsWith('.') ? child.classes.has(selector.slice(1)) : child.id === selector.slice(1);
      for (const child of this.children) { if (matches(child)) return child; const found = child.querySelector(selector); if (found) return found; }
      return null;
    }
  }
  const body = new Element('body');
  for (const id of ['study-status', 'study-preview', 'study-start', 'study-start-profile', 'study-daily-count', 'study-minutes',
    'book-select-area', 'book-read-area', 'book-complete-modal', 'completed-book-name', 'bookshelf-grid', 'bookshelf-tabs']) {
    const element = new Element('div'); element.id = id; body.append(element);
  }
  for (const name of ['complete-actions', 'reward-text']) {
    const element = new Element('div'); element.className = name; elements.get('book-complete-modal').append(element);
  }
  const storage = {
    getItem: key => disk.get(key) ?? null,
    setItem: (key, value) => { if (options.failStorage) throw Error('quota'); disk.set(key, String(value)); },
    removeItem: key => disk.delete(key)
  };
  const history = {
    writes: Promise.resolve(),
    records: async owner => options.records ? options.records(owner) : records.get(owner) || [],
    record: async detail => {
      const owner = context.AppStorageOwner || run('AppStorage.owner');
      submitted.push({ owner, detail: JSON.parse(JSON.stringify(detail)) });
      const saved = options.record ? await options.record(detail) : true;
      if (saved === true) {
        const list = records.get(owner) || [];
        if (!list.some(row => row.event.id === detail.id)) list.push({ owner, event: JSON.parse(JSON.stringify(detail)) });
        records.set(owner, list);
      }
      return saved;
    }
  };
  const engine = {
    loadCatalog: async () => { fetches++; return options.loadCatalog ? options.loadCatalog() : structuredClone(catalog); },
    eligible: (data, event) => event.schema_version === 2 && data.questions.some(question => question.id === event.question_id),
    plan: (data, events, setting) => {
      plans.push({ events: JSON.parse(JSON.stringify(events)), settings: setting });
      const answered = new Set(events.filter(event => ['math', 'science'].includes(event.subject)).map(event => event.question_id));
      const remaining = Math.max(0, setting.dailyCount - answered.size);
      return { answered_today: answered.size, remaining, due_count: 0, states: [],
        questions: data.questions.filter(question => question.book_id === null && !answered.has(question.id)).slice(0, remaining)
          .map(question => ({ question_id: question.id, reason: 'new', due_day: null })) };
    }
  };
  const context = vm.createContext({
    console: { warn() {}, error() {}, log() {} }, crypto: { randomUUID, subtle: webcrypto.subtle }, Intl, TextEncoder,
    localStorage: storage, LearningHistory: history, StudyEngine: engine,
    window: { localStorage: storage, speechSynthesis: { cancel() {} }, dispatchEvent() {},
      addEventListener: (name, callback) => listeners.set(name, callback) },
    speechSynthesis: { cancel() {} }, CustomEvent: class {},
    document: { body, createElement: tag => new Element(tag), getElementById: id => elements.get(id) || null,
      querySelector: selector => body.querySelector(selector), querySelectorAll: () => [], addEventListener() {} },
    I18n: { t: (key, fallback) => fallback || key }, RewardSystem: { addPoints() {}, playSound() {} },
    setTimeout: (run, milliseconds) => { const id = ++timerId; timers.set(id, { run, milliseconds }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const run = source => vm.runInContext(source, context);
  for (const file of ['appStorage', 'dataBackup', 'safeStorage', 'studySession', 'pictureBook']) {
    run(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'));
  }
  context.testClock = () => clock;
  run('StudySession.now = testClock; PictureBook.init()');
  return { run, disk, submitted, records, plans, timers, listeners, context,
    element: id => elements.get(id),
    json: expression => JSON.parse(run(`JSON.stringify(${expression})`)),
    advance: milliseconds => { clock += milliseconds; },
    fetches: () => fetches };
}

async function flush() { for (let round = 0; round < 8; round++) await Promise.resolve(); }

test('游客短课程只读取自己的日志，用独立每日设置规划，提示不伪造作答事件', async () => {
  const a = app({ seed: { kidsProfileData: '{"name":"Iris","learningSettings":{"dailyCount":2,"minutes":3,"timezone":"America/Los_Angeles"}}' } });
  assert.equal(await a.run('StudySession.start()'), true);
  assert.equal(a.run('StudySession.current.questions.length'), 2);
  assert.equal(a.plans[0].settings.dailyCount, 2);
  assert.equal(a.plans[0].settings.timezone, 'America/Los_Angeles');
  a.run('StudySession.showHint()');
  assert.equal(a.submitted.length, 0);
  assert.equal(a.run('StudySession.current.hintUsed'), true);
  assert.equal(await a.run("StudySession.answer('2')"), true);
  assert.equal(a.submitted[0].owner, 'guest');
  assert.equal(a.submitted[0].detail.hint_used, true);
  assert.equal(a.submitted[0].detail.schema_version, 2);
  assert.equal(a.submitted[0].detail.topic_id, 'math-topic');
  assert.equal(a.submitted[0].detail.taxonomy_version, 'v1');
  assert.equal(a.submitted[0].detail.question_version, '1');
});

test('一次确认后按钮锁住，重复点击不重复保存；答错能直接继续而非强迫重答', async () => {
  const waiting = deferred();
  const a = app({ record: () => waiting.promise });
  await a.run('StudySession.start()');
  const first = a.run("StudySession.answer('1')");
  assert.equal(await a.run("StudySession.answer('2')"), false);
  assert.equal(a.element('study-choices').children.every(button => button.disabled), true);
  waiting.resolve(true); await first;
  assert.equal(a.submitted.length, 1);
  assert.equal(a.submitted[0].detail.verdict, 'wrong');
  assert.match(a.element('study-feedback').textContent, /一起看看/);
  a.run('StudySession.next()');
  assert.equal(a.run('StudySession.current.index'), 1);
  assert.equal(a.run('StudySession.current.hintUsed'), false);
});

test('保存失败保留相同 UUID/作答时间的 pending，重试成功前不能进入下一题', async () => {
  let attempt = 0;
  const a = app({ record: () => ++attempt > 1 });
  await a.run('StudySession.start()');
  assert.equal(await a.run("StudySession.answer('2')"), false);
  a.run('StudySession.next()');
  assert.equal(a.run('StudySession.current.index'), 0);
  assert.equal(a.run('StudySession.current.savedCount'), 0);
  assert.match(a.element('study-feedback').textContent, /还没有保存/);
  a.advance(60000);
  assert.equal(await a.run('StudySession.retry()'), true);
  assert.deepEqual(a.submitted[0].detail, a.submitted[1].detail);
  assert.equal(a.run('StudySession.current.savedCount'), 1);
  assert.equal(await a.run('StudySession.retry()'), false);
});

test('先休息保留未保存答案，重新打开可重试；未保存和跳过不会伪装答对', async () => {
  let save = false;
  const a = app({ record: () => save });
  await a.run('StudySession.start()');
  await a.run("StudySession.answer('—', true)");
  a.run('StudySession.stop(); StudySession.close()');
  assert.equal(a.run('StudySession.current.ended'), true);
  assert.match(a.element('study-summary').textContent, /保存了 0 条/);
  assert.equal(await a.run('StudySession.start()'), true);
  save = true;
  assert.equal(await a.run('StudySession.retry()'), true);
  assert.equal(a.submitted.at(-1).detail.verdict, 'skipped');
  assert.equal(a.submitted.at(-1).detail.answer, '—');
  assert.equal(a.run('StudySession.current.correctCount'), 0);
  assert.equal(a.run('StudySession.current.skippedCount'), 1);
});

test('时间达到上限不丢当前答案，只在题间结束，未作答题数如实显示', async () => {
  const a = app();
  await a.run('StudySession.start()');
  a.advance(5 * 60000 + 1);
  [...a.timers.values()][0].run();
  assert.equal(a.run('StudySession.current.ended'), false);
  assert.equal(await a.run("StudySession.answer('2')"), true);
  a.run('StudySession.next()');
  assert.equal(a.run('StudySession.current.reason'), 'time');
  assert.match(a.element('study-summary').textContent, /还有 1 题未作答/);
  assert.equal(a.submitted.length, 1);
});

test('读日志或加载题库期间切号，迟到结果不启动旧孩子的课程', async () => {
  const waiting = deferred();
  const a = app({ records: () => waiting.promise });
  a.run("AppStorage.activate('iris')");
  const start = a.run('StudySession.start()');
  await flush();
  a.run("AppStorage.activate('other')");
  waiting.resolve([]);
  assert.equal(await start, false);
  assert.equal(a.run('StudySession.current'), null);
  assert.equal(a.submitted.length, 0);
});

test('保存期间账号切换或冻结，不更新旧 UI 或把旧题算给新账号', async () => {
  const waiting = deferred();
  const a = app({ record: () => waiting.promise });
  a.run("AppStorage.activate('iris')");
  await a.run('StudySession.start()');
  const saving = a.run("StudySession.answer('2')");
  a.run("AppStorage.activate('other'); StudySession.accountChanged()");
  waiting.resolve(true);
  assert.equal(await saving, false);
  assert.equal(a.run('StudySession.current'), null);
  assert.equal(a.submitted[0].owner, 'iris');
  assert.equal(a.records.get('other'), undefined);
  const b = app();
  await b.run('StudySession.start()');
  b.run('AppStorage.blocked = true');
  assert.equal(await b.run("StudySession.answer('2')"), false);
  assert.equal(b.submitted.length, 0);
});

test('家长设置 merge 当前账号资料并同步编辑器内存，保存失败保留原数据', () => {
  const raw = '{"name":"Iris","age":6,"avatar":"keep","hobbies":["画画"],"learningSettings":{"dailyCount":4,"minutes":5,"timezone":"America/Los_Angeles"}}';
  const a = app({ seed: { kidsProfileData: raw } });
  a.run('let profileData = {name:"Iris"}');
  a.element('study-daily-count').value = '6'; a.element('study-minutes').value = '10';
  assert.equal(a.run('StudySession.saveSettings()'), true);
  const saved = JSON.parse(a.disk.get('kidsProfileData'));
  assert.equal(saved.avatar, 'keep');
  assert.deepEqual(saved.hobbies, ['画画']);
  assert.equal(saved.learningSettings.dailyCount, 6);
  assert.equal(a.run('profileData.learningSettings.minutes'), 10);
  const b = app({ seed: { kidsProfileData: raw }, failStorage: true });
  b.element('study-daily-count').value = '2'; b.element('study-minutes').value = '3';
  assert.equal(b.run('StudySession.saveSettings()'), false);
  assert.equal(b.disk.get('kidsProfileData'), raw);
  assert.match(b.element('study-status').textContent, /没有保存/);
});

test('无效设置回退合理值，封锁写入时不更改资料', () => {
  const a = app({ seed: { kidsProfileData: '{"learningSettings":{"dailyCount":99,"minutes":0,"timezone":"bad/timezone"}}' } });
  assert.deepEqual(a.json('StudySession.settings()'), { dailyCount: 4, minutes: 5, timezone: 'America/Los_Angeles' });
  const raw = a.disk.get('kidsProfileData');
  a.element('study-daily-count').value = '2'; a.element('study-minutes').value = '3';
  a.run('AppStorage.blocked = true');
  assert.equal(a.run('StudySession.saveSettings()'), false);
  assert.equal(a.disk.get('kidsProfileData'), raw);
});

test('题库 Promise 失败后允许重试，不永久禁用课程', async () => {
  let fetch = 0;
  const a = app({ loadCatalog: () => { if (++fetch === 1) throw Error('offline'); return structuredClone(catalog); } });
  assert.equal(await a.run('StudySession.start()'), false);
  assert.match(a.element('study-feedback').textContent, /其他小游戏和绘本/);
  assert.equal(await a.run('StudySession.start()'), true);
  assert.equal(a.fetches(), 2);
  assert.equal(await a.run('StudySession.loadCatalog()'), a.run('StudySession.catalog'));
});

test('绘本真正完成后可选两道理解题，参考故事算提示且不影响原完成记录', async () => {
  const a = app();
  a.run("PictureBook.openBook('three-little-pigs'); while (PictureBook.currentPage < 8) PictureBook.nextPage(); PictureBook.finishReading()");
  assert.equal(a.element('book-understanding-start').disabled, false);
  await a.element('book-understanding-start').onclick();
  assert.equal(a.run('StudySession.current.kind'), 'reading');
  assert.equal(a.run('StudySession.current.questions.length'), 2);
  a.run('StudySession.showReference()');
  assert.equal(a.element('study-reference').children.length, 9);
  await a.run("StudySession.answer('小弟')");
  assert.equal(a.submitted[0].detail.subject, 'reading');
  assert.equal(a.submitted[0].detail.taxonomy_version, null);
  assert.equal(a.submitted[0].detail.hint_used, true);
  assert.equal(a.run('PictureBook.completionHistory.length'), 1);
  const token = a.run('StudySession.current.token');
  assert.equal(await a.run('StudySession.startReading(PictureBook.currentBook.id, PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id)'), true);
  assert.equal(a.run('StudySession.current.token'), token);
  assert.equal(a.submitted.length, 1);
});

test('未读完或旧完成入口不可启动理解；题库失败不损害已保存的绘本完成', async () => {
  const a = app({ loadCatalog: () => { throw Error('offline'); } });
  a.run("PictureBook.openBook('three-little-pigs')");
  const completion = a.run('PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id');
  assert.equal(await a.run(`StudySession.startReading('three-little-pigs', '${completion}')`), false);
  a.run('while (PictureBook.currentPage < 8) PictureBook.nextPage(); PictureBook.finishReading()');
  await a.element('book-understanding-start').onclick();
  assert.equal(a.run('PictureBook.completionHistory.length'), 1);
  assert.match(a.element('book-understanding-status').textContent, /继续看书/);
  a.run('PictureBook.readAgain()');
  assert.equal(await a.run(`StudySession.startReading('three-little-pigs', '${completion}')`), false);
});

test('理解题准备中孩子重读，迟到题单不绑定到新的阅读会话', async () => {
  const waiting = deferred();
  const a = app({ loadCatalog: () => waiting.promise });
  a.run("PictureBook.openBook('three-little-pigs'); while (PictureBook.currentPage < 8) PictureBook.nextPage(); PictureBook.finishReading()");
  const completion = a.run('PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id');
  const start = a.run(`StudySession.startReading('three-little-pigs', '${completion}')`);
  a.run('PictureBook.readAgain()');
  waiting.resolve(structuredClone(catalog));
  assert.equal(await start, false);
  assert.equal(a.run('StudySession.current'), null);
});

test('理解会话重新加载后沿用稳定 ID，过滤已保存题；另一次重读使用新 ID', async () => {
  const a = app();
  a.run("PictureBook.openBook('three-little-pigs'); while (PictureBook.currentPage < 8) PictureBook.nextPage(); PictureBook.finishReading()");
  const completion = a.run('PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id');
  await a.run(`StudySession.startReading('three-little-pigs', '${completion}')`);
  await a.run("StudySession.answer('小弟')");
  const firstId = a.submitted[0].detail.id;
  assert.match(firstId, /^reading-[a-f0-9]{48}$/);
  a.run('StudySession.current = null; StudySession.startVersion++; StudySession.readingSessions.clear()');
  await a.run(`StudySession.startReading('three-little-pigs', '${completion}')`);
  assert.equal(a.run('StudySession.current.questions.length'), 1);
  assert.equal(a.run('StudySession.current.previousSaved'), 1);
  assert.equal(a.run('StudySession.current.questions[0].id'), 'q-read-2');
  await a.run("StudySession.answer('砖头房')");
  a.run('StudySession.next(); StudySession.current = null; StudySession.startVersion++');
  await a.run(`StudySession.startReading('three-little-pigs', '${completion}')`);
  assert.equal(a.run('StudySession.current.questions.length'), 0);
  assert.equal(a.run('StudySession.current.reason'), 'readingDone');
  assert.equal(a.run('StudySession.current.previousSaved'), 2);
  assert.equal(a.submitted.length, 2);
  a.run('PictureBook.readAgain(); while (PictureBook.currentPage < 8) PictureBook.nextPage(); PictureBook.finishReading()');
  await a.run('StudySession.startReading(PictureBook.currentBook.id, PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id)');
  assert.equal(a.run('StudySession.current.questions.length'), 2);
  await a.run("StudySession.answer('小弟')");
  assert.notEqual(a.submitted.at(-1).detail.id, firstId);
});

test('实际课程目录和真实 StudyEngine 接线，所有保存事件都能作为有效课程证据', async () => {
  const a = app();
  a.context.AbortController = AbortController;
  a.context.fetch = async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/curriculum.json'), 'utf8')) });
  a.run(fs.readFileSync(path.join(__dirname, '../js/studyEngine.js'), 'utf8'));
  assert.equal(await a.run('StudySession.start()'), true);
  assert.equal(a.run('StudySession.current.questions.length'), 4);
  const expected = a.run('StudySession.current.questions[0].expected');
  assert.equal(await a.run(`StudySession.answer(${JSON.stringify(expected)})`), true);
  assert.equal(a.run('StudyEngine.eligible(StudySession.catalog, StudySession.current.pending.detail, {now: new Date(StudySession.now())})'), true);
  a.run('StudySession.stop(); StudySession.close(); PictureBook.openBook("three-little-pigs"); while(PictureBook.currentPage<8) PictureBook.nextPage(); PictureBook.finishReading()');
  await a.run('StudySession.startReading(PictureBook.currentBook.id, PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id)');
  const readingExpected = a.run('StudySession.current.questions[0].expected');
  await a.run(`StudySession.answer(${JSON.stringify(readingExpected)})`);
  assert.equal(a.run('StudyEngine.eligible(StudySession.catalog, StudySession.current.pending.detail, {now: new Date(StudySession.now())})'), true);
  assert.equal(a.run('StudyEngine.plan(StudySession.catalog, [StudySession.current.pending.detail], {now: new Date(StudySession.now())}).answered_today'), 0);
});

test('初始化保留 HTML 入口，新问题和预览使用 textContent 防止注入 HTML', async () => {
  const changed = structuredClone(catalog);
  changed.questions[0].question = '<img src=x onerror=alert(1)>1 加 1';
  const a = app({ loadCatalog: () => changed });
  a.run('StudySession.init(); StudySession.init()');
  await flush();
  assert.equal(typeof a.element('study-start').onclick, 'function');
  await a.element('study-start').onclick();
  assert.equal(a.element('study-question').textContent, changed.questions[0].question);
  assert.equal(a.element('study-question').children.length, 0);
  assert.match(a.element('study-preview').children[0].textContent, /<img/);
});
