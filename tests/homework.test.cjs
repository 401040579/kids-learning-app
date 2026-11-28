const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 作业本的页眉解析、分组、笔迹键和擦除命中；不渲染 DOM、不加载 PDF.js。
const context = vm.createContext({ Math, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/homework.js'), 'utf8') + ';this.HW = Homework;', context);
const HW = context.HW;
const plain = v => JSON.parse(JSON.stringify(v));

test('解析 PDF.js 拼出的页眉', () => {
  assert.deepEqual(plain(HW.parseHeader('2026-09-25 | 虞老师 | 第 4 周作业包 1/12')),
    { date: '2026-09-25', teacher: '虞老师', title: '第 4 周作业包', n: 1, total: 12 });
  assert.deepEqual(plain(HW.parseHeader('2026-09-18 / 11-20 | 虞老师 | 数学 Unit 3 A 答案（两次邮件同一份） 2/2')),
    { date: '2026-09-18 / 11-20', teacher: '虞老师', title: '数学 Unit 3 A 答案（两次邮件同一份）', n: 2, total: 2 });
  assert.equal(HW.parseHeader('Iris 的一年级作业包'), null);
  assert.equal(HW.parseHeader(''), null);
});

test('连续页按页眉分组，答案和阅读参考分开', () => {
  const headers = [
    '', '',
    '2026-09-25 | 虞老师 | 第 4 周作业包 1/2', '2026-09-25 | 虞老师 | 第 4 周作业包 2/2',
    '2026-10-01 | Rowe 老师 | 英文拼读：short a 1/1',
    '2026-10-01 | Rowe 老师 | 阅读参考：一年级 Heart Words 1/1',
    '2026-09-25 | 虞老师 | 数学 Unit 1 B 答案 1/1',
    '2026-10-02 | 虞老师 | 第 5 周作业包 1/1'
  ];
  const groups = HW.groupPages(headers);
  assert.deepEqual(plain(groups.map(g => [g.title, g.kind, g.start, g.end])), [
    ['封面和目录', 'other', 0, 1],
    ['第 4 周作业包', 'homework', 2, 3],
    ['英文拼读：short a', 'homework', 4, 4],
    ['阅读参考：一年级 Heart Words', 'reading', 5, 5],
    ['数学 Unit 1 B 答案', 'answer', 6, 6],
    ['第 5 周作业包', 'homework', 7, 7]
  ]);
  const s = HW.sections(groups);
  assert.deepEqual(plain(s.homework.map(g => g.title)), ['第 5 周作业包', '英文拼读：short a', '第 4 周作业包']);
  assert.deepEqual(plain(s.parent.map(g => g.kind)), ['other', 'answer']);
});

test('同名作业重复出现时笔迹键不冲突', () => {
  const groups = HW.groupPages([
    '2026-09-25 | 虞老师 | 第 4 周作业包 1/1',
    '2026-10-02 | 虞老师 | 第 5 周作业包 1/1',
    '2026-09-25 | 虞老师 | 第 4 周作业包 1/1'
  ]);
  assert.equal(groups.length, 3);
  assert.notEqual(groups[0].key, groups[2].key);
  // 页码不连续（n 重新从 1 开始）也要拆成两份
  const split = HW.groupPages(['2026-09-25 | A | X 1/1', '2026-09-25 | A | X 1/1']);
  assert.equal(split.length, 2);
});

test('笔迹按作业内页码保存，换新版 PDF 后同一页仍然对得上', () => {
  const oldPdf = HW.groupPages(['', '2026-09-25 | 虞老师 | 第 4 周作业包 1/2', '2026-09-25 | 虞老师 | 第 4 周作业包 2/2']);
  const newPdf = HW.groupPages(['', '', '', '2026-09-25 | 虞老师 | 第 4 周作业包 1/2', '2026-09-25 | 虞老师 | 第 4 周作业包 2/2']);
  assert.equal(HW.inkKey('old', oldPdf[1], 2), HW.inkKey('new', newPdf[1], 4));
  assert.equal(HW.inkKey('old', oldPdf[1], 2), '2026-09-25|虞老师|第 4 周作业包#p2');
  // 没有页眉的页按文件区分
  assert.equal(HW.inkKey('abc', oldPdf[0], 0), 'abc#p1');
});

test('Apple Pencil 压力调粗细，手指固定中等粗细', () => {
  const size = 0.005;
  assert.ok(HW.strokeWidth(size, 1, 'pen') > HW.strokeWidth(size, 0.2, 'pen'));
  assert.equal(HW.strokeWidth(size, 0, 'touch'), HW.strokeWidth(size, 0.5, 'pen'));
  assert.equal(HW.strokeWidth(size, 0.9, 'touch'), HW.strokeWidth(size, 0.5, 'mouse'));
  assert.equal(HW.strokeWidth(size, 3, 'pen'), HW.strokeWidth(size, 1, 'pen'));
});

test('橡皮按到线段附近才擦掉整笔', () => {
  const stroke = { w: 0.001, pts: [0.1, 0.1, 0.5, 0.3, 0.1, 0.5] };
  assert.equal(HW.hitStroke(stroke, 0.2, 0.105, 0.01), true);
  assert.equal(HW.hitStroke(stroke, 0.2, 0.2, 0.01), false);
  assert.equal(HW.hitStroke({ w: 0.001, pts: [0.5, 0.5, 0.5] }, 0.505, 0.5, 0.01), true);
});

test('页面已登记离线缓存与首页入口', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const f of ['/js/homework.js', '/css/homework.css', '/js/vendor/pdfjs/pdf.min.mjs', '/js/vendor/pdfjs/pdf.worker.min.mjs']) {
    assert.ok(sw.includes(`'${f}'`), f);
    assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f);
  }
  const home = fs.readFileSync(path.join(__dirname, '../js/homeScreen.js'), 'utf8');
  assert.match(home, /id: 'homework'.*showHomework/);
  // 作业数据只在 IndexedDB，不能直接写 localStorage（否则要登记备份和云同步白名单）
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../js/homework.js'), 'utf8'), /localStorage/);
});
