const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 所有通知均使用 fetch 桩；计时器手动推进，不调用 Bark 或音频设备。
function app(seed = {}, withMusicUI = false) {
  const disk = new Map(Object.entries(seed));
  const elements = new Map(), timers = new Map(), intervals = new Map();
  const toasts = [], analytics = [], plays = [];
  let timerId = 0, achievements = 0, confirmations = 0;
  const element = tag => {
    const classes = new Set();
    const attrs = new Map();
    const node = {
      tagName: tag, children: [], dataset: {}, style: {}, textContent: '', disabled: false,
      classList: { add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name), toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren() { this.children = []; this._value = ''; },
      setAttribute: (key, value) => attrs.set(key, String(value)),
      getAttribute: key => attrs.get(key) ?? null,
      remove() {},
      get options() { return this.children; },
      get value() { return this._value ?? this.children[0]?.value ?? ''; },
      set value(value) { this._value = String(value); },
      set id(value) { this._id = value; elements.set(value, this); },
      get id() { return this._id; }
    };
    return node;
  };
  const button = element('button');
  button.setAttribute('onclick', "HomeScreen.launch('sos')");
  const container = withMusicUI ? element('div') : null;
  const storage = {
    getItem: key => disk.get(key) ?? null,
    setItem: (key, value) => disk.set(key, String(value)),
    removeItem: key => disk.delete(key)
  };
  const context = vm.createContext({
    console: { log() {}, warn() {} }, URLSearchParams, AbortController,
    window: { localStorage: storage, dispatchEvent() {}, addEventListener() {} },
    CustomEvent: class {}, localStorage: storage,
    document: { addEventListener() {}, body: element('body'), createElement: element,
      getElementById: id => elements.get(id) ?? null,
      querySelector: query => query === '#music-modal .music-container' ? container : null,
      querySelectorAll: query => query === '[onclick]' ? [button] : [] },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval(fn, delay) { const id = ++timerId; intervals.set(id, { fn, delay }); return id; },
    clearInterval: id => intervals.delete(id),
    confirm() { confirmations++; return true; },
    fetch() { throw Error('Tests must provide a fetch stub'); },
    I18n: { t: (key, fallback) => fallback || key },
    Analytics: { sendEvent: (...args) => analytics.push(args), trackWorkSave: (...args) => analytics.push(args) },
    AchievementSystem: { checkMusicAchievement() { achievements++; } }
  });
  const run = source => vm.runInContext(source, context);
  for (const file of ['appStorage', 'dataBackup', 'safeStorage', 'parentNotify', 'music']) {
    run(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'));
  }
  context.captureToast = text => toasts.push(text);
  context.capturePlay = (...args) => plays.push(args);
  run(`ParentNotify.showToast = captureToast; MusicApp.showToast = captureToast;
    MusicApp.initAudioContext = () => {};
    MusicApp.playPianoSound = freq => capturePlay('piano', freq);
    MusicApp.playBellSound = freq => capturePlay('bell', freq);
    MusicApp.playDrum = id => capturePlay('drum', id);
    MusicApp.initSequencerGrid();`);
  return { run, context, disk, timers, intervals, button, elements, toasts, analytics, plays,
    get achievements() { return achievements; }, get confirmations() { return confirmations; } };
}

const recording = [
  { type: 'piano', data: { noteIndex: 0, sound: 'bell', octaveShift: 1 }, time: 0 },
  { type: 'drum', data: { drumId: 'kick' }, time: 550 }
];

test('SOS 未配置或取消确认时不发请求', async () => {
  const a = app();
  assert.equal(await a.run('triggerSOS()'), false);
  assert.equal(a.confirmations, 0);
  assert.match(a.toasts[0], /还没有设置/);
  a.run('ParentNotify.config.enabled = true; confirm = () => false');
  assert.equal(await a.run('triggerSOS()'), false);
  assert.equal(a.run('ParentNotify.sosPending'), false);
});

test('SOS 只在至少一个真实服务接受时显示已发出，不承诺家长会来', async () => {
  const a = app();
  const requests = [];
  a.context.fetch = async url => {
    requests.push(url);
    return { ok: url.includes('/dad/'), json: async () => ({ code: 200 }) };
  };
  a.run(`ParentNotify.config = { enabled: true, dadBarkUrl: 'https://stub.invalid/dad/', momBarkUrl: 'https://stub.invalid/mom/' }`);
  assert.equal(await a.run('triggerSOS()'), true);
  assert.equal(requests.length, 2);
  assert.match(a.toasts.at(-1), /通知已发出/);
  assert.equal(a.toasts.some(text => /会很快来/.test(text)), false);
  assert.equal(a.button.disabled, false);
  assert.equal(a.timers.size, 0);
});

test('Bark 的 HTTP 失败、业务失败、坏 JSON 和网络异常都返回 false', async () => {
  for (const fetch of [
    async () => ({ ok: false, json: async () => ({ code: 200 }) }),
    async () => ({ ok: true, json: async () => ({ code: 400 }) }),
    async () => ({ ok: true, json: async () => { throw Error('invalid JSON'); } }),
    async () => { throw Error('offline'); }
  ]) {
    const a = app();
    a.context.fetch = fetch;
    assert.equal(await a.run(`ParentNotify.sendToOne('https://stub.invalid/key/', 'title', 'message')`), false);
    assert.equal(a.timers.size, 0);
  }
});

test('SOS 超时后显示未确认并解除按钮，等待期间重复点击不重复发送', async () => {
  const a = app();
  let requests = 0, signal;
  a.context.fetch = async (url, options) => {
    requests++; signal = options.signal;
    return new Promise(() => {});
  };
  a.run(`ParentNotify.config = { enabled: true, dadBarkUrl: 'https://stub.invalid/key/' }`);
  const pending = a.run('triggerSOS()');
  assert.equal(a.run('ParentNotify.sosPending'), true);
  assert.equal(a.button.disabled, true);
  assert.equal(await a.run('triggerSOS()'), false);
  assert.equal(requests, 1);
  assert.equal(a.confirmations, 1);
  for (const timer of [...a.timers.values()]) timer.fn();
  assert.equal(await pending, false);
  assert.equal(signal.aborted, true);
  assert.match(a.toasts.at(-1), /无法确认/);
  assert.equal(a.button.disabled, false);
  assert.equal(a.run('ParentNotify.sosPending'), false);
});

test('请求正文挂起也受超时保护，SOS 异常不会留下发送锁', async () => {
  const a = app();
  a.context.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
  const pending = a.run(`ParentNotify.sendToOne('https://stub.invalid/key/', 'title', 'message')`);
  await Promise.resolve();
  for (const timer of [...a.timers.values()]) timer.fn();
  assert.equal(await pending, false);
  a.run(`ParentNotify.config.enabled = true; ParentNotify.notifySOS = async () => { throw Error('unexpected'); }`);
  assert.equal(await a.run('triggerSOS()'), false);
  assert.equal(a.button.disabled, false);
  assert.match(a.toasts.at(-1), /无法确认/);
});

test('分析工具异常不阻止 SOS 发送', async () => {
  const a = app();
  a.run(`ParentNotify.config.enabled = true; ParentNotify.notifySOS = async () => true;
    Analytics.sendEvent = () => { throw Error('analytics failed'); }`);
  assert.equal(await a.run('triggerSOS()'), true);
  assert.equal(a.run('ParentNotify.sosPending'), false);
});

test('钢琴和鼓点实际录音可保存、重新载入并按音色/八度/时间重放', () => {
  const a = app();
  a.run(`MusicApp.recorder.events = ${JSON.stringify(recording)}; MusicApp.recorder.durationMs = 900`);
  assert.equal(a.run('saveMusicComposition()'), true);
  const saved = JSON.parse(a.disk.get('musicCompositions'))[0];
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.events, recording);
  assert.equal(saved.duration_ms, 900);
  assert.equal(a.achievements, 1);
  assert.deepEqual(a.analytics, [['music', 'piano']]);
  a.run(`MusicApp.recorder.events = []; MusicApp.currentMode = 'drums'`);
  assert.equal(a.run('MusicApp.loadComposition(0)'), true);
  assert.deepEqual(JSON.parse(a.run('JSON.stringify(MusicApp.recorder.events)')), recording);
  assert.equal(a.run('MusicApp.currentMode'), 'piano');
  a.run('MusicApp.playRecording()');
  const timers = [...a.timers.values()];
  assert.deepEqual(timers.map(timer => timer.delay), [0, 550, 1000]);
  timers[0].fn(); timers[1].fn();
  assert.deepEqual(a.plays, [['bell', 261.63 * 2], ['drum', 'kick']]);
  assert.equal(a.run('MusicApp.recorder.events.length'), 2);
});

test('旧音序器作品按原 grid/tempo/mode 恢复，保存时复制数据避免后续修改污染', () => {
  const grid = Array.from({ length: 5 }, () => Array(8).fill(false));
  grid[2][3] = true;
  const old = { id: 5, date: '2026-09-01T00:00:00.000Z', mode: 'sequencer', grid, tempo: 80 };
  const a = app({ musicCompositions: JSON.stringify([old]) });
  assert.equal(a.run('MusicApp.loadComposition(0)'), true);
  assert.equal(a.run('MusicApp.sequencer.tempo'), 80);
  assert.deepEqual(JSON.parse(a.run('JSON.stringify(MusicApp.sequencer.grid)')), grid);
  assert.equal(a.run('MusicApp.saveComposition()'), true);
  a.run('MusicApp.sequencer.grid[2][3] = false');
  assert.deepEqual(JSON.parse(a.disk.get('musicCompositions'))[1].grid, grid);
  assert.deepEqual(JSON.parse(a.disk.get('musicCompositions'))[0], old);
});

test('存储 quota 失败保留旧音乐，不显示保存成功、不计成就或成功统计', () => {
  const original = '[{"id":5,"mode":"piano","tempo":120}]';
  const a = app({ musicCompositions: original, videoWhitelistCache: '{}' });
  a.run(`MusicApp.recorder.events = ${JSON.stringify(recording)};
    localStorage.setItem = () => { const error = Error('full'); error.name = 'QuotaExceededError'; throw error; }`);
  assert.equal(a.run('MusicApp.saveComposition()'), false);
  assert.equal(a.disk.get('musicCompositions'), original);
  assert.equal(a.disk.has('videoWhitelistCache'), false);
  assert.equal(a.achievements, 0);
  assert.equal(a.analytics.length, 0);
  assert.match(a.toasts.at(-1), /没有保存成功/);
});

test('损坏或非数组作品存档不被空作品列表覆盖', () => {
  for (const original of ['{broken', '{}', 'null']) {
    const a = app({ musicCompositions: original });
    a.run(`MusicApp.recorder.events = ${JSON.stringify(recording)}`);
    assert.equal(a.run('MusicApp.saveComposition()'), false);
    assert.equal(a.disk.get('musicCompositions'), original);
    assert.equal(a.run("SafeStorage.issues.has('musicCompositions')"), true);
    assert.match(a.toasts.at(-1), /已保留原数据/);
    assert.equal(a.achievements, 0);
  }
});

test('没有录音或音序器没有点亮格子时明确不保存空作品', () => {
  const a = app();
  for (const mode of ['piano', 'drums', 'sequencer']) {
    a.run(`MusicApp.currentMode = '${mode}'`);
    assert.equal(a.run('MusicApp.saveComposition()'), false);
  }
  assert.equal(a.disk.has('musicCompositions'), false);
  assert.match(a.toasts.at(-1), /先录制/);
  assert.equal(a.achievements, 0);
});

test('音乐保存成功不会被统计工具异常变成无反馈或无法打开', () => {
  const a = app();
  a.run(`MusicApp.recorder.events = ${JSON.stringify(recording)};
    Analytics.trackWorkSave = () => { throw Error('analytics failed'); }`);
  assert.equal(a.run('MusicApp.saveComposition()'), true);
  assert.match(a.toasts.at(-1), /作品已保存/);
  assert.equal(a.achievements, 1);
  assert.equal(a.run('MusicApp.loadComposition(0)'), true);
});

test('旧钢琴元数据与非法作品都不能伪装成已恢复，当前创作保留', () => {
  const invalid = [
    { mode: 'piano', tempo: 120, grid: null },
    { version: 3, mode: 'piano', tempo: 120, events: recording },
    { version: 2, mode: 'piano', tempo: 120, events: [{ type: 'piano', time: 0, data: { noteIndex: 100, sound: 'bell' } }] },
    { version: 2, mode: 'drums', tempo: 120, events: [{ type: 'drum', time: -1, data: { drumId: 'kick' } }] },
    { mode: 'sequencer', tempo: 120, grid: [[true]] }
  ];
  const a = app({ musicCompositions: JSON.stringify(invalid) });
  a.run(`MusicApp.recorder.events = ${JSON.stringify(recording)}`);
  for (let index = 0; index < invalid.length; index++) {
    assert.equal(a.run(`MusicApp.loadComposition(${index})`), false);
    assert.deepEqual(JSON.parse(a.run('JSON.stringify(MusicApp.recorder.events)')), recording);
  }
  assert.match(a.toasts[0], /旧作品没有保存演奏内容/);
});

test('重新开始录制会停止旧回放与旧计时器；录制达到限制温和停止且保留演奏', () => {
  const a = app();
  const timer = { textContent: '' };
  a.elements.set('music-record-timer', timer);
  a.run('MusicApp.startRecording(); MusicApp.startRecording()');
  assert.equal(a.intervals.size, 1);
  assert.equal(a.timers.size, 1);
  a.run(`MusicApp.MAX_RECORDING_EVENTS = 1; MusicApp.recordEvent('drum', { drumId: 'kick' });
    MusicApp.recordEvent('drum', { drumId: 'snare' })`);
  assert.equal(a.run('MusicApp.recorder.isRecording'), false);
  assert.equal(a.run('MusicApp.recorder.events.length'), 1);
  assert.equal(a.intervals.size, 0);
  assert.equal(a.timers.size, 0);
  assert.match(a.toasts.at(-1), /录制已暂停/);
});

test('停止弹键后录音仍在十分钟自动截止，无计时器 UI 也保留已有演奏', () => {
  const a = app();
  a.run(`let clockNow = 1000; Date.now = () => clockNow;
    MusicApp.startRecording(); MusicApp.recordEvent('drum', { drumId: 'kick' })`);
  const deadline = [...a.timers.values()].find(timer => timer.delay === 600000);
  assert.ok(deadline);
  a.run('clockNow += 600000');
  deadline.fn();
  assert.equal(a.run('MusicApp.recorder.isRecording'), false);
  assert.equal(a.run('MusicApp.recorder.durationMs'), 600000);
  assert.equal(a.run('MusicApp.recorder.events.length'), 1);
  assert.equal(a.timers.size, 0);
  assert.equal(a.toasts.length, 1);
  assert.match(a.toasts[0], /录制已暂停/);
  // 截止后不收新音符，迟到的重复回调不再提示。
  a.run(`MusicApp.recordEvent('drum', { drumId: 'snare' })`);
  deadline.fn();
  assert.equal(a.run('MusicApp.recorder.events.length'), 1);
  assert.equal(a.toasts.length, 1);
  assert.equal(a.run('MusicApp.saveComposition()'), true);
  assert.equal(JSON.parse(a.disk.get('musicCompositions'))[0].events.length, 1);
});

test('计时器刷新已到截止时也停止录音，显示十分钟且清理所有录音计时器', () => {
  const a = app();
  const timer = { textContent: '' };
  a.elements.set('music-record-timer', timer);
  a.run(`let clockNow = 1000; Date.now = () => clockNow;
    MusicApp.startRecording(); MusicApp.recordEvent('drum', { drumId: 'kick' }); clockNow += 600500`);
  [...a.intervals.values()][0].fn();
  assert.equal(a.run('MusicApp.recorder.isRecording'), false);
  assert.equal(timer.textContent, '10:00');
  assert.equal(a.run('MusicApp.recorder.durationMs'), 600000);
  assert.equal(a.run('MusicApp.recorder.events.length'), 1);
  assert.equal(a.timers.size, 0);
  assert.equal(a.intervals.size, 0);
  assert.equal(a.toasts.length, 1);
});

test('手动停止、重新录制和关闭音乐清理截止计时器，旧回调不能停止新会话', () => {
  const a = app();
  a.elements.set('music-modal', { classList: { add() {} } });
  a.elements.set('music-record-timer', { textContent: '' });
  a.run('MusicApp.startRecording()');
  const oldDeadline = [...a.timers.values()][0];
  a.run(`MusicApp.recordEvent('drum', { drumId: 'kick' }); MusicApp.stopRecording()`);
  assert.equal(a.timers.size, 0);
  assert.equal(a.intervals.size, 0);
  assert.equal(a.run('MusicApp.recorder.events.length'), 1);
  a.run('MusicApp.startRecording()');
  assert.equal(a.timers.size, 1);
  oldDeadline.fn();
  assert.equal(a.run('MusicApp.recorder.isRecording'), true);
  const replacedDeadline = [...a.timers.values()][0];
  a.run('MusicApp.startRecording()');
  assert.equal(a.timers.size, 1);
  assert.equal(a.intervals.size, 1);
  replacedDeadline.fn();
  assert.equal(a.run('MusicApp.recorder.isRecording'), true);
  a.run('closeMusic()');
  assert.equal(a.run('MusicApp.recorder.isRecording'), false);
  assert.equal(a.timers.size, 0);
  assert.equal(a.intervals.size, 0);
  assert.equal(a.toasts.length, 0);
});

test('作品打开入口可列出并载入现有作品，重复打开音乐不重置已恢复的画板', () => {
  const grid = Array.from({ length: 5 }, () => Array(8).fill(false));
  grid[0][0] = true;
  const a = app({ musicCompositions: JSON.stringify([{ mode: 'sequencer', grid, tempo: 80, date: '2026-09-01' }]) }, true);
  a.run('MusicApp.init()');
  const select = a.elements.get('music-saved-select'), open = a.elements.get('music-open-saved');
  assert.equal(select.options.length, 1);
  assert.equal(open.disabled, false);
  select.value = '0';
  assert.equal(open.onclick(), true);
  a.run('MusicApp.init()');
  assert.equal(a.run('MusicApp.sequencer.grid[0][0]'), true);
  assert.equal(a.elements.get('music-saved-select').options.length, 1);
});
