const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
function harness() {
  const listeners = {}, shared = [], copied = [], alerts = [];
  const modalClasses = new Set(['hidden']);
  const modal = { classList: { contains: value => modalClasses.has(value), add: value => modalClasses.add(value), remove: value => modalClasses.delete(value) } };
  const content = { innerHTML: '', textContent: '' };
  const buttons = ['week', 'month', 'all'].map(period => ({ dataset: { period }, classList: { toggle() {} } }));
  const context = vm.createContext({ console, Date, Set, Map,
    AppStorage: { owner: 'iris' },
    I18n: { currentLang: 'zh', t: key => key },
    RewardSystem: { data: { totalScore: 999, tasksDone: 100, mathCorrect: 80, englishCorrect: 10, chineseCorrect: 5, scienceCorrect: 3 } },
    DailyCheckin: { data: { currentStreak: 3 } },
    AchievementSystem: { data: { totalUnlocked: 4 } },
    WrongQuestions: { getStats: () => ({ unmastered: 7, mastered: 2 }) },
    LearningHistory: { owner: () => context.AppStorage.owner, writes: Promise.resolve(), records: async () => [] },
    document: { getElementById: id => id === 'learning-report-modal' ? modal : id === 'learning-report-content' ? content : null,
      querySelectorAll: () => buttons },
    window: { addEventListener: (name, callback) => { listeners[name] = callback; } },
    navigator: { share: async data => { shared.push(data); }, clipboard: { writeText: async text => { copied.push(text); } } },
    alert: message => alerts.push(message)
  });
  vm.runInContext(fs.readFileSync(__dirname + '/../js/learningReport.js', 'utf8'), context);
  return { context, listeners, modal, content, shared, copied, alerts,
    run: source => vm.runInContext(source, context),
    report: (rows, period = 'week', now = new Date('2026-10-02T12:00:00Z'), owner = 'iris') => {
      context.rows = rows; context.period = period; context.now = now; context.reportOwner = owner;
      return vm.runInContext('LearningReport.summarize(rows, period, now, reportOwner)', context);
    } };
}
function row(id, occurred_at, verdict = 'correct', subject = 'math', source = 'web', owner = 'iris', extra = {}) {
  return { owner, synced: 1, event: { id, occurred_at, verdict, subject, source, ...extra } };
}

test('周期按逐题时间与当前分区统计，不用累计积分伪造本期成绩', async () => {
  const h = harness();
  const now = new Date();
  const recent = now.toISOString(), old = new Date(now.getTime() - 8 * 86400000).toISOString();
  h.context.LearningHistory.records = async owner => {
    assert.equal(owner, 'iris');
    return [row('recent', recent), row('old', old), row('other', recent, 'correct', 'math', 'web', 'another-child')];
  };
  const report = await h.run('LearningReport.generateReport("week")');
  assert.equal(report.overview.total, 1);
  assert.equal(report.overview.totalCorrect, 1);
  assert.equal(report.cumulative.totalCorrect, 98);
  assert.equal(report.cumulative.totalScore, 999);
  assert.equal(report.cumulative.currentStreak, 3);
  assert.equal(report.cumulative.wrongQuestions.unmastered, 7);
  assert.equal(report.analysis.strongest, null);
  assert.equal(report.analysis.weakest, null);
  h.context.result = report;
  const html = h.run('LearningReport.generateReportHTML(result)');
  assert.match(html, /奖励系统累计（不限时间）/);
  assert.match(html, /不与本期作答数相加/);
  assert.doesNotMatch(html, /是你的强项|可以多多练习/);
});

test('滚动七天含起止边界，排除旧题、未来题、无效事件和重复 ID', () => {
  const h = harness(), now = new Date('2026-10-02T12:00:00Z');
  const report = h.report([
    row('start', '2026-09-25T12:00:00Z'), row('end', now.toISOString(), 'wrong'),
    row('before', '2026-09-25T11:59:59.999Z'), row('after', '2026-10-02T12:00:00.001Z'),
    row('invalid', 'not-a-date'), row('start', '2026-09-25T12:00:00Z'),
    row('verdict', now.toISOString(), 'unknown'), row('source', now.toISOString(), 'correct', 'math', 'untrusted'),
    row('subject', now.toISOString(), 'correct', '__proto__'), row('owner', now.toISOString(), 'correct', 'math', 'web', 'guest')
  ], 'week', now);
  assert.equal(report.periodName, '近 7 天');
  assert.equal(report.overview.total, 2);
  assert.equal(report.overview.accuracy, 50);
  assert.equal(report.range.start, '2026-09-25T12:00:00.000Z');
  assert.equal(report.overview.activeDays, 2);
});

test('自然月以设备本地月初为边界，全部时间保留月外记录', () => {
  const h = harness(), now = new Date(2026, 9, 2, 12, 0), monthStart = new Date(2026, 9, 1);
  const rows = [row('month-first', monthStart.toISOString()),
    row('previous-month', new Date(monthStart.getTime() - 1).toISOString(), 'wrong'),
    row('current', now.toISOString(), 'correct', 'science')];
  const month = h.report(rows, 'month', now);
  assert.equal(month.overview.total, 2);
  assert.equal(month.range.start, monthStart.toISOString());
  assert.equal(month.subjects.science.correct, 1);
  assert.equal(h.report(rows, 'all', now).overview.total, 3);
});

test('四科和机器人扩展科目真实统计；unclear/skipped 不进入正确率', () => {
  const h = harness(), stamp = '2026-10-01T12:00:00Z';
  const rows = [row('math', stamp), row('english', stamp, 'wrong', 'english'),
    row('chinese', stamp, 'unclear', 'chinese'), row('science', stamp, 'skipped', 'science'),
    row('jarvis', stamp, 'correct', 'math', 'robot', 'iris', { robot: 'Jarvis' }),
    row('friday', stamp, 'wrong', 'history', 'robot', 'iris', { robot: 'Friday' }),
    row('robot-noise', stamp, 'unclear', 'science', 'robot', 'iris', { robot: 'Friday' })];
  rows[0].synced = 0;
  const report = h.report(rows);
  assert.equal(report.overview.total, 7);
  assert.equal(report.overview.judged, 4);
  assert.equal(report.overview.totalCorrect, 2);
  assert.equal(report.overview.totalWrong, 2);
  assert.equal(report.overview.unclear, 2);
  assert.equal(report.overview.skipped, 1);
  assert.equal(report.overview.accuracy, 50);
  assert.equal(report.overview.pending, 1);
  assert.equal(report.overview.sources.web, 4);
  assert.equal(report.overview.sources.robot, 3);
  assert.equal(report.overview.sources.robots.Jarvis, 1);
  assert.equal(report.overview.sources.robots.Friday, 2);
  assert.equal(report.subjects.math.accuracy, 100);
  assert.equal(report.subjects.chinese.accuracy, null);
  assert.equal(report.subjects.history.wrong, 1);
  assert.equal(report.subjects.science.total, 2);
});

test('没有日志或只有无法判断时不制造准确率、强项或弱项', () => {
  const h = harness();
  const empty = h.report([]);
  assert.equal(empty.overview.accuracy, null);
  assert.equal(empty.analysis.mostPracticed, null);
  assert.equal(empty.analysis.strongest, null);
  h.context.empty = empty;
  assert.match(h.run('LearningReport.generateSuggestions(empty)[0].text'), /还没有逐题作答记录/);
  const unclear = h.report([row('noise', '2026-10-01T12:00:00Z', 'unclear', 'math', 'robot', 'iris', { robot: 'Jarvis' })]);
  assert.equal(unclear.overview.accuracy, null);
  assert.equal(unclear.overview.judged, 0);
  assert.equal(unclear.analysis.weakest, null);
});

test('报告先等待已有本机写入提交，随后读取当下固定的账号', async () => {
  const h = harness(), writing = deferred();
  let reads = 0;
  h.context.LearningHistory.writes = writing.promise;
  h.context.LearningHistory.records = async owner => {
    reads++; assert.equal(owner, 'iris');
    return [row('just-written', new Date().toISOString())];
  };
  const pending = h.run('LearningReport.generateReport("all")');
  await Promise.resolve(); assert.equal(reads, 0);
  writing.resolve();
  assert.equal((await pending).overview.total, 1);
  assert.equal(reads, 1);
});

test('等待写入或读取过程中账号切换，不展示旧账号或串用新账号累计数', async () => {
  const h = harness(), read = deferred();
  h.context.LearningHistory.records = () => read.promise;
  const pending = h.run('LearningReport.generateReport("all")');
  await Promise.resolve(); await Promise.resolve();
  h.context.AppStorage.owner = 'another-child';
  h.context.RewardSystem.data = { totalScore: 12345 };
  read.resolve([row('old-child', new Date().toISOString())]);
  assert.equal(await pending, null);

  const waiting = deferred(); let reads = 0;
  h.context.LearningHistory.writes = waiting.promise;
  h.context.LearningHistory.records = () => { reads++; return Promise.resolve([]); };
  const writing = h.run('LearningReport.generateReport("week")');
  h.context.AppStorage.owner = 'guest'; waiting.resolve();
  assert.equal(await writing, null);
  assert.equal(reads, 0);
});

test('快速切换周/月和关闭弹窗，迟到读取不能覆盖最新周期或重新打开页面', async () => {
  const h = harness(), first = deferred(), second = deferred();
  const week = h.report([row('week', '2026-10-01T12:00:00Z')], 'week');
  const month = h.report([row('month', '2026-10-01T12:00:00Z', 'wrong')], 'month');
  week.suggestions = []; month.suggestions = [];
  h.context.LearningReportData = undefined;
  h.context.generate = period => period === 'week' ? first.promise : second.promise;
  h.run('LearningReport.generateReport = generate');
  const loadingWeek = h.run('showLearningReport("week")');
  const loadingMonth = h.run('changeReportPeriod("month")');
  second.resolve(month); await loadingMonth;
  assert.equal(h.run('LearningReport.activeReport.period'), 'month');
  const expectedHTML = h.content.innerHTML;
  first.resolve(week); await loadingWeek;
  assert.equal(h.content.innerHTML, expectedHTML);

  const closing = deferred(); h.context.generate = () => closing.promise;
  const loading = h.run('showLearningReport("all")');
  h.run('closeLearningReport()'); closing.resolve(month); await loading;
  assert.equal(h.modal.classList.contains('hidden'), true);
  assert.equal(h.run('LearningReport.activeReport'), null);
});

test('日志读取失败明确报错，不退回累计奖励冒充本期数据', async () => {
  const h = harness();
  h.context.LearningHistory.records = async () => { throw Error('IndexedDB unavailable'); };
  await h.run('showLearningReport("month")');
  assert.match(h.content.textContent, /学习记录暂时无法读取/);
  assert.match(h.content.textContent, /累计积分不能代替本期记录/);
  assert.equal(h.run('LearningReport.activeReport'), null);
});

test('分享当前显示的月份快照；取消分享不擅自复制，账号改变不可分享旧报告', async () => {
  const h = harness();
  const report = h.report([row('month', '2026-10-01T12:00:00Z')], 'month');
  h.context.displayed = report; h.run('LearningReport.activeReport = displayed; LearningReport.period = "month"; shareReport()');
  assert.equal(h.shared.length, 1);
  assert.match(h.shared[0].title, /本月/);
  assert.match(h.shared[0].text, /答对: 1/);
  assert.doesNotMatch(h.shared[0].text, /999|累计积分/);
  h.context.navigator.share = async () => { const error = Error('cancel'); error.name = 'AbortError'; throw error; };
  h.run('shareReport()'); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.copied.length, 0);
  h.context.AppStorage.owner = 'guest'; h.run('shareReport()');
  assert.equal(h.shared.length, 1);
  assert.match(h.alerts.at(-1), /报告还未读完/);
});

test('异步分享失败后切账号，不将旧报告写入剪贴板；账号事件清除缓存', async () => {
  const h = harness(), sharing = deferred();
  const report = h.report([], 'all');
  h.context.displayed = report; h.context.navigator.share = () => sharing.promise;
  h.run('LearningReport.activeReport = displayed; shareReport()');
  h.context.AppStorage.owner = 'guest'; sharing.reject(Error('unsupported'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.copied.length, 0);
  h.listeners.accountChanged();
  assert.equal(h.run('LearningReport.activeReport'), null);
});

test('游客也只统计自己的日志，旧错题本损坏不阻止真实报告，翻译文本安全转义', async () => {
  const h = harness();
  h.context.AppStorage.owner = 'guest';
  h.context.WrongQuestions.getStats = () => { throw Error('corrupt state'); };
  h.context.I18n.t = key => key === 'history.math' ? '<img src=x onerror=alert(1)>' : key;
  h.context.LearningHistory.records = async () => [row('guest', new Date().toISOString(), 'correct', 'math', 'web', 'guest'), row('iris', new Date().toISOString())];
  const report = await h.run('LearningReport.generateReport("all")');
  assert.equal(report.overview.total, 1);
  assert.equal(report.cumulative.wrongQuestions, null);
  h.context.result = report;
  const html = h.run('LearningReport.generateReportHTML(result)');
  assert.match(html, /游客记录仅在当前设备保存/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img/);
});

test('七天文案采用已加载语言翻译，缺失新键时才采用中英文兜底', () => {
  const h = harness();
  h.context.I18n.currentLang = 'ja';
  h.context.I18n.t = key => key === 'report.week' ? '過去7日間' : key;
  assert.equal(h.report([]).periodName, '過去7日間');
  assert.equal(h.run('LearningReport.t("accuracy")'), 'Accuracy');
  h.context.I18n.currentLang = 'zh';
  assert.equal(h.run('LearningReport.t("accuracy")'), '正确率');
});
