const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 睡前小月亮的存档与时间逻辑；不渲染 DOM。
function load(seed = {}) {
  const disk = new Map(Object.entries(seed));
  const context = vm.createContext({ console, Date, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, localStorage: {
    getItem: key => disk.get(key) ?? null, removeItem: key => disk.delete(key), setItem: (key, value) => disk.set(key, String(value))
  } });
  context.window = context;
  context.window.dispatchEvent = () => {};
  context.CustomEvent = class { constructor(type) { this.type = type; } };
  for (const file of ['appStorage.js', 'dataBackup.js', 'safeStorage.js', 'bedtime.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  vm.runInContext('Bedtime.load(); SafeStorage.reportIssue = () => {}; Bedtime.toast = () => {};', context);
  return { disk, run: js => vm.runInContext(js, context) };
}

test('存档键已登记，前后端学习备份都允许', () => {
  const a = load();
  assert.ok(a.run("DataBackup.keys().includes('kidsBedtime')"));
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/backup_keys.json'), 'utf8'));
  assert.equal(registry.kidsBedtime, 'object');
});

test('凌晨 4 点前仍算前一晚，默认 20:00 小灯/20:40 卡片/21:00 关灯', () => {
  const a = load();
  assert.equal(a.run("Bedtime.nightKey(new Date(2026, 10, 18, 1, 30))"), '2026-11-17');
  assert.equal(a.run("Bedtime.nightKey(new Date(2026, 10, 17, 20, 0))"), '2026-11-17');
  assert.deepEqual(JSON.parse(a.run('JSON.stringify(Bedtime.schedule())')), { dim: 1200, cards: 1240, out: 1260 });
  a.run("Bedtime.data.settings.lightsOut = '00:30'");
  assert.equal(a.run('Bedtime.schedule().out'), 1470);
});

test('做完全部卡片发一张月亮票，只能用一次，并写入存档', () => {
  const a = load();
  a.run(`Bedtime.go = () => {}; Bedtime.speak = () => {}; Bedtime.sparkle = () => {};
    globalThis.document = { getElementById: () => null };`);
  const cards = Array.from(a.run('Bedtime.data.cards'));
  for (const id of cards.slice().reverse()) a.run(`Bedtime.finishCard('${id}')`);
  let night = a.run('JSON.stringify(Bedtime.peekTonight())');
  night = JSON.parse(night);
  assert.equal(night.ticket, 'unused');
  assert.ok(night.finishedAt);
  a.run('Bedtime.useTicket(); Bedtime.useTicket();');
  const saved = JSON.parse(a.disk.get('kidsBedtime'));
  assert.equal(Object.values(saved.nights)[0].ticket, 'used');
  assert.deepEqual(saved.cards, cards);
});

test('损坏存档保留原文，不被覆盖', () => {
  const a = load({ kidsBedtime: '{broken' });
  assert.equal(a.run('Bedtime.broken'), true);
  assert.equal(a.run('Bedtime.save()'), false);
  assert.equal(a.disk.get('kidsBedtime'), '{broken');
});

test('连续天数从最近完成的一晚往前数，只保留 60 晚', () => {
  const a = load();
  a.run(`(() => { const d = new Date(); if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    for (let i = 1; i <= 70; i++) { d.setDate(d.getDate() - 1); Bedtime.data.nights[Bedtime.dateKey(d)] = { done: [], finishedAt: 1 }; } })()`);
  assert.equal(a.run('Bedtime.streak()'), 70);
  a.run('Bedtime.save()');
  assert.equal(Object.keys(JSON.parse(a.disk.get('kidsBedtime')).nights).length, 60);
});

test('日历提醒每天重复且带闹铃', () => {
  const a = load();
  const ics = a.run('Bedtime.calendarText(new Date(2026, 10, 17, 12))');
  assert.match(ics, /DTSTART:20261117T200000/);
  assert.match(ics, /DTSTART:20261117T204000/);
  assert.equal((ics.match(/RRULE:FREQ=DAILY/g) || []).length, 2);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 2);
});

test('旧卡组中途升级、乱序勾选与取消、自定义卡刷新后保留', () => {
  const a = load({ kidsBedtime: JSON.stringify({ cards: ['teeth','book','hug'] }) });
  a.run(`Bedtime.go = () => {}; Bedtime.speak = () => {};
    globalThis.document = { getElementById: () => null };
    globalThis.crypto = { randomUUID: () => 'test-id' };
    Bedtime.tonight().done = ['book'];
    Bedtime.addCard('给小熊盖被子');
    Bedtime.finishCard('custom-test-id');
    Bedtime.finishCard('book');
    Bedtime.load();`);
  assert.deepEqual(Array.from(a.run('Bedtime.peekTonight().done')), ['custom-test-id']);
  assert.deepEqual(Array.from(a.run('Bedtime.data.cards')), ['teeth','book','hug','custom-test-id']);
  assert.equal(a.run("Bedtime.card('custom-test-id').name"), '给小熊盖被子');
});
