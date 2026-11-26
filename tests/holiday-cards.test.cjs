const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 节日贺卡的日期计算与模板替换；不渲染 DOM。
const context = vm.createContext({ Date, Math, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/holidayCards.js'), 'utf8') + ';this.HC = HolidayCards;', context);
const HC = context.HC;
const card = id => HC.CARDS.find(c => c.id === id);
const ymd = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('感恩节是 11 月第 4 个星期四', () => {
  assert.equal(ymd(HC.dateOf(card('thanksgiving'), 2026)), '2026-11-26');
  assert.equal(ymd(HC.dateOf(card('thanksgiving'), 2027)), '2027-11-25');
  assert.equal(ymd(HC.dateOf(card('thanksgiving'), 2028)), '2028-11-23');
});

test('复活节与查表节日', () => {
  assert.equal(ymd(HC.easter(2026)), '2026-4-5');
  assert.equal(ymd(HC.easter(2027)), '2027-3-28');
  assert.equal(ymd(HC.easter(2028)), '2028-4-16');
  assert.equal(ymd(HC.dateOf(card('lunarNewYear'), 2027)), '2027-2-6');
  assert.equal(ymd(HC.dateOf(card('midAutumn'), 2027)), '2027-9-15');
  assert.equal(ymd(HC.dateOf(card('birthday'), 2027)), '2027-3-28');
});

test('当天的节日排第一，过了的排到明年', () => {
  const list = HC.ordered(new Date(2026, 10, 26, 15, 0));
  assert.equal(list[0].card.id, 'thanksgiving');
  assert.equal(list[0].when.days, 0);
  assert.equal(list[1].card.id, 'christmas');
  const hw = list.find(x => x.card.id === 'halloween');
  assert.equal(ymd(hw.when.date), '2027-10-31');
  assert.ok(list.every(x => x.when), '查表年份要覆盖到明年');
});

test('模板替换生肖、年份和名字', () => {
  const lny = HC.fill(card('lunarNewYear'), new Date(2026, 10, 26));
  assert.match(lny.message.en, /Year of the Goat/);
  assert.match(lny.message.zh, /羊年到啦/);
  assert.equal(lny.props[0], '🐐');
  const ny = HC.fill(card('newYear'), new Date(2026, 11, 31));
  assert.match(ny.message.en, /In 2027/);
  assert.match(HC.fill(card('birthday')).en, /Iris/);
  for (const c of HC.CARDS) {
    const f = HC.fill(c, new Date(2026, 10, 26));
    assert.doesNotMatch(JSON.stringify(f), /\{\w+\}/, c.id + ' 还有未替换的模板');
    assert.ok(f.message.en && f.message.zh && f.talk.en && f.talk.zh, c.id);
    assert.equal(f.props.length, 6, c.id);
  }
});
