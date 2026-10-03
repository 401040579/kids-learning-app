const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = JSON.parse(fs.readFileSync(__dirname + '/../data/curriculum.json', 'utf8'));
const now = new Date('2026-10-02T17:00:00.000Z');
const math = catalog.questions.find(question => question.subject === 'math');
const mathAgain = catalog.questions.find(question => question.topic_id === math.topic_id && question.id !== math.id);
const science = catalog.questions.find(question => question.subject === 'science');
const reading = catalog.questions.find(question => question.subject === 'reading');
let nextId = 0;

function row(question = math, options = {}) {
  const { owner = 'iris', verdict = 'correct', hint_used = false, occurred_at = '2026-10-01T17:00:00.000Z', ...extra } = options;
  return { owner, synced: 1, event: {
    id: `report-fixture-${String(++nextId).padStart(12, '0')}`, occurred_at, source: 'web', schema_version: 2,
    subject: question.subject, question_id: question.id, topic_id: question.topic_id,
    taxonomy_version: question.book_id === null ? catalog.taxonomy_version : null,
    question_version: question.version, hint_used, question: question.question, expected: question.expected,
    answer: verdict === 'correct' ? question.expected : question.choices.find(choice => choice !== question.expected), verdict, ...extra
  } };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
function harness(owner = 'iris') {
  const listeners = {}, classes = new Set(['hidden']);
  const modal = { classList: { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key) } };
  const content = { innerHTML: '', textContent: '' };
  const context = vm.createContext({ console, Date, Intl,
    AppStorage: { owner }, I18n: { currentLang: 'zh', t: key => key },
    LearningHistory: { owner: () => context.AppStorage.owner, writes: Promise.resolve(), records: async () => [] },
    document: { getElementById: id => id === 'learning-report-modal' ? modal : id === 'learning-report-content' ? content : null, querySelectorAll: () => [] },
    window: { addEventListener: (name, callback) => { listeners[name] = callback; } }, navigator: {}, alert() {}
  });
  const run = source => vm.runInContext(source, context);
  run(fs.readFileSync(__dirname + '/../js/studyEngine.js', 'utf8'));
  run(fs.readFileSync(__dirname + '/../js/learningReport.js', 'utf8'));
  context.catalogText = JSON.stringify(catalog);
  run('const catalog = JSON.parse(catalogText)');
  context.StudySession = { loadCatalog: async () => run('catalog') };
  const setRows = rows => {
    context.rowsText = JSON.stringify(rows);
    run('LearningHistory.records = async () => JSON.parse(rowsText)');
  };
  const report = (rows, period = 'week', reportOwner = owner) => {
    setRows(rows); context.reportNow = now; context.reportPeriod = period; context.reportOwner = reportOwner;
    return run(`(() => {
      const rows = JSON.parse(rowsText);
      const report = LearningReport.summarize(rows, reportPeriod, reportNow, reportOwner);
      report.evidence = LearningReport.summarizeEvidence(rows, catalog, reportPeriod, reportNow, reportOwner);
      report.courseReview = LearningReport.reviewEvidence(rows, catalog, reportNow, reportOwner);
      report.suggestions = LearningReport.generateSuggestions(report);
      return report;
    })()`);
  };
  return { context, run, setRows, report, listeners, modal, content };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('本期提示证据明确区分独立、提示后、未知提示正确；样本数不包含杂音和跳过', () => {
  const h = harness();
  const independent = row(), assisted = row(math, { hint_used: true });
  const legacy = row(science); delete legacy.event.schema_version; delete legacy.event.hint_used;
  const robot = row(math, { source: 'robot', schema_version: undefined, hint_used: undefined, robot: 'Jarvis' });
  const wrong = row(math, { verdict: 'wrong' });
  const oldWrong = row(science, { verdict: 'wrong' }); delete oldWrong.event.schema_version; delete oldWrong.event.hint_used;
  const unclear = row(math, { source: 'robot', schema_version: undefined, hint_used: undefined, verdict: 'unclear', robot: 'Friday' });
  const skipped = row(reading, { verdict: 'skipped' }); delete skipped.event.schema_version; delete skipped.event.hint_used;
  const report = h.report([independent, assisted, legacy, robot, wrong, oldWrong, unclear, skipped]);
  assert.equal(report.evidence.independentCorrect, 1);
  assert.equal(report.evidence.assistedCorrect, 1);
  assert.equal(report.evidence.unknownCorrect, 2);
  assert.equal(report.evidence.wrong, 2);
  assert.equal(report.evidence.judged, 6);
  assert.equal(report.evidence.unknownHintAttempts, 3);
  assert.equal(report.evidence.unclear, 1);
  assert.equal(report.evidence.skipped, 1);
  assert.equal(report.overview.accuracy, 67);
  assert.equal(report.evidence.courseAttempts, 3);
});

test('同题同日的多次正确只是一道题的一个证据日，不宣称多个知识点掌握', () => {
  const h = harness();
  const report = h.report([row(), row(), row(), row(mathAgain)]);
  assert.equal(report.evidence.independentCorrect, 4);
  assert.equal(report.evidence.courseAttempts, 4);
  assert.equal(report.evidence.questionCount, 2);
  assert.equal(report.evidence.topicCount, 1);
  assert.equal(report.evidence.questionDays, 2);
  assert.equal(report.evidence.independentQuestionDays, 2);
  assert.equal(report.evidence.topics[0].independentDays, 1);
  assert.equal(report.evidence.topics[0].questionCount, 2);
  assert.equal(report.analysis.strongest, null);
  assert.equal(report.analysis.weakest, null);
});

test('乱序到达仍按作答时间显示最后一道题证据，并排除重复 ID', () => {
  const h = harness();
  const older = row(math, { occurred_at: '2026-09-30T17:00:00Z' });
  const newer = row(math, { occurred_at: '2026-10-01T17:00:00Z', verdict: 'wrong', hint_used: true });
  const forward = h.report([older, newer, older]);
  const reverse = h.report([newer, older, newer]);
  assert.deepEqual(plain(forward.evidence), plain(reverse.evidence));
  assert.deepEqual(plain(forward.courseReview), plain(reverse.courseReview));
  assert.equal(forward.evidence.total, 2);
  assert.equal(forward.evidence.topics[0].examples[0].verdict, 'wrong');
  assert.equal(forward.evidence.topics[0].lastAt, '2026-10-01T17:00:00.000Z');
  assert.equal(forward.evidence.topics[0].independentDays, 1);
});

test('同ID的不同合法内容不任取一条作为课程或复习证据，乱序结果相同', () => {
  const h = harness();
  const correct = row(math), wrong = row(math, { id: correct.event.id, verdict: 'wrong' });
  const first = h.report([correct, wrong]), second = h.report([wrong, correct]);
  assert.equal(first.evidence.courseAttempts, 0);
  assert.equal(first.evidence.independentQuestionDays, 0);
  assert.equal(first.evidence.topics.length, 0);
  assert.equal(first.courseReview.dueCount, 0);
  assert.equal(second.evidence.courseAttempts, 0);
  assert.equal(second.courseReview.dueCount, 0);
});

test('新旧版本或不符课程的元数据仍是周期记录，但不能冒充当前课程证据', () => {
  const h = harness();
  const valid = row(), oldVersion = row(math, { question_version: 'unavailable-version' });
  const changedQuestion = row(math, { question: '任意替换后的题干' });
  const changedTopic = row(math, { topic_id: science.topic_id });
  const report = h.report([valid, oldVersion, changedQuestion, changedTopic]);
  assert.equal(report.overview.total, 4);
  assert.equal(report.evidence.courseAttempts, 1);
  assert.equal(report.evidence.questionCount, 1);
  assert.equal(report.evidence.topicCount, 1);
  assert.equal(report.evidence.topics[0].examples[0].question, math.question);
});

test('阅读理解单列学科和topic证据，提示后答对不转成独立学习天数', () => {
  const h = harness();
  const report = h.report([row(reading, { hint_used: true }), row(science)]);
  assert.equal(report.subjects.reading.total, 1);
  assert.equal(report.subjects.reading.correct, 1);
  const topic = report.evidence.topics.find(topic => topic.subject === 'reading');
  assert.equal(topic.assistedCorrect, 1);
  assert.equal(topic.independentCorrect, 0);
  assert.equal(topic.independentDays, 0);
  assert.equal(report.evidence.topicCount, 2);
  assert.equal(report.courseReview.examples.some(example => example.question_id === reading.id), false);
});

test('报告捕获当前课程设置的UTC时区，午夜证据日和到期题与短课调度一致', async () => {
  const h = harness();
  class FixedDate extends Date { constructor(...values) { super(...(values.length ? values : [now.getTime()])); } }
  h.context.Date = FixedDate;
  h.context.StudySession.settings = () => ({ timezone: 'UTC' });
  const rows = [row(math, { occurred_at: '2026-10-01T00:30:00Z' }), row(math, { occurred_at: '2026-10-01T23:30:00Z' })];
  h.setRows(rows);
  const report = await h.run('LearningReport.generateReport("all")');
  assert.equal(report.evidence.topics[0].independentDays, 1);
  assert.equal(report.evidence.independentQuestionDays, 1);
  assert.equal(report.courseReview.timezone, 'UTC');
  assert.equal(report.courseReview.day, '2026-10-02');
  assert.equal(report.courseReview.dueCount, 1);
  h.context.result = report;
  assert.match(h.run('LearningReport.generateShareData(result).content'), /协调世界时（UTC）/);
  h.context.StudySession.settings = () => ({ timezone: 'America/Los_Angeles' });
  const local = await h.run('LearningReport.generateReport("all")');
  assert.equal(local.evidence.topics[0].independentDays, 2);
  assert.equal(local.evidence.independentQuestionDays, 2);
  assert.equal(local.courseReview.dueCount, 0);
});

test('时区设置缺失或非法才使用默认值；目录等待过程中不静默混入新的设置', async () => {
  const h = harness(), loading = deferred();
  h.context.StudySession.settings = () => ({ timezone: 'not/a-real-zone' });
  assert.equal(h.run('LearningReport.captureCourseTimezone()'), 'America/Los_Angeles');
  h.context.StudySession.settings = () => { throw Error('bad profile'); };
  assert.equal(h.run('LearningReport.captureCourseTimezone()'), 'America/Los_Angeles');
  h.context.StudySession.settings = () => ({ timezone: 'UTC' });
  h.context.StudySession.loadCatalog = () => loading.promise;
  h.setRows([]);
  const pending = h.run('LearningReport.generateReport("all")');
  for (let index = 0; index < 4; index++) await Promise.resolve();
  h.context.StudySession.settings = () => ({ timezone: 'Asia/Tokyo' });
  loading.resolve(h.run('catalog'));
  assert.equal((await pending).courseReview.timezone, 'UTC');
});

test('受信机器人v2可列课程证据，但null提示状态不提升独立答对或跨日证据', () => {
  const h = harness();
  const report = h.report([row(math, { source: 'robot', robot: 'Jarvis', hint_used: null })]);
  assert.equal(report.evidence.courseAttempts, 1);
  assert.equal(report.evidence.unknownCorrect, 1);
  assert.equal(report.evidence.independentCorrect, 0);
  assert.equal(report.evidence.assistedCorrect, 0);
  assert.equal(report.evidence.independentQuestionDays, 0);
  assert.equal(report.evidence.topics[0].unknownCorrect, 1);
  assert.equal(report.evidence.topics[0].independentDays, 0);
  assert.equal(report.evidence.topics[0].examples[0].result, '答对但提示状态未知');
});

test('近期课程证据只看本期；到期复习看全部本账号历史，排除其他账号与阅读题', () => {
  const h = harness();
  const overdue = row(math, { occurred_at: '2026-09-01T17:00:00Z', verdict: 'wrong' });
  const otherOwner = row(science, { owner: 'another-child', occurred_at: '2026-09-01T17:00:00Z', verdict: 'wrong' });
  const oldReading = row(reading, { occurred_at: '2026-09-01T17:00:00Z', verdict: 'wrong' });
  const future = row(science, { occurred_at: '2026-10-03T17:00:00Z', verdict: 'wrong' });
  const report = h.report([overdue, otherOwner, oldReading, future]);
  assert.equal(report.overview.total, 0);
  assert.equal(report.evidence.courseAttempts, 0);
  assert.equal(report.evidence.topics.length, 0);
  assert.equal(report.courseReview.status, 'ready');
  assert.equal(report.courseReview.dueCount, 1);
  assert.equal(report.courseReview.examples.length, 1);
  assert.equal(report.courseReview.examples[0].question_id, math.id);
  assert.equal(report.courseReview.examples[0].question, math.question);
});

test('游客与账号证据互相隔离，零样本明确证据不足，不伪造技能结论', () => {
  const h = harness('guest');
  const report = h.report([row(math), row(science, { owner: 'guest', occurred_at: 'not-a-date' })]);
  assert.equal(report.evidence.judged, 0);
  assert.equal(report.evidence.topicCount, 0);
  assert.equal(report.courseReview.dueCount, 0);
  assert.equal(report.overview.accuracy, null);
  h.context.result = report;
  const html = h.run('LearningReport.generateEvidenceHTML(result)');
  assert.match(html, /证据不足/);
  assert.match(html, /这不表示所有知识点已经掌握/);
  assert.equal(report.analysis.strongest, null);
});

test('目录加载失败保留本期统计并明确不可用，稍后可以重试而不是缓存零证据', async () => {
  const h = harness();
  const current = row(math, { occurred_at: new Date().toISOString() });
  h.setRows([current]);
  h.context.StudySession.loadCatalog = async () => { throw Error('offline'); };
  const failed = await h.run('LearningReport.generateReport("all")');
  assert.equal(failed.overview.total, 1);
  assert.equal(failed.evidence.independentCorrect, 1);
  assert.equal(failed.evidence.status, 'unavailable');
  assert.equal(failed.courseReview.status, 'unavailable');
  h.context.result = failed;
  const html = h.run('LearningReport.generateEvidenceHTML(result)');
  assert.match(html, /暂时无法读取/);
  assert.doesNotMatch(html, /本期没有能匹配当前课程版本/);
  h.context.StudySession.loadCatalog = async () => h.run('catalog');
  const recovered = await h.run('LearningReport.generateReport("all")');
  assert.equal(recovered.evidence.status, 'ready');
  assert.equal(recovered.evidence.courseAttempts, 1);
});

test('目录或复习引擎异常不会把读取失败显示成零到期题', () => {
  const h = harness();
  h.run('StudyEngine.plan = () => { throw Error("schedule invalid"); }');
  const report = h.report([row(math)]);
  assert.equal(report.courseReview.status, 'unavailable');
  assert.equal(report.evidence.status, 'ready');
  h.context.result = report;
  const html = h.run('LearningReport.generateEvidenceHTML(result)');
  assert.match(html, /不能把读取失败当成没有待复习题/);
  assert.doesNotMatch(html, /今天还有 0 道/);
});

test('目录迟到时账号切换或关闭报告不展示旧孩子的证据', async () => {
  for (const close of [false, true]) {
    const h = harness(), loading = deferred();
    h.setRows([row(math, { occurred_at: new Date().toISOString() })]);
    h.context.StudySession.loadCatalog = () => loading.promise;
    const pending = h.run('showLearningReport("all")');
    for (let index = 0; index < 4; index++) await Promise.resolve();
    if (close) h.run('closeLearningReport()');
    else h.context.AppStorage.owner = 'another-child';
    loading.resolve(h.run('catalog'));
    await pending;
    assert.equal(h.run('LearningReport.activeReport'), null);
    assert.equal(h.content.innerHTML, '');
    if (close) assert.equal(h.modal.classList.contains('hidden'), true);
  }
});

test('快速切周期时晚到目录不会覆盖新周期；只刷新当前owner的 learningRecorded', async () => {
  const h = harness(), first = deferred(), second = deferred();
  let reads = 0;
  h.setRows([row(math, { occurred_at: new Date().toISOString() })]);
  h.context.StudySession.loadCatalog = () => ++reads === 1 ? first.promise : second.promise;
  const older = h.run('showLearningReport("week")');
  for (let index = 0; index < 4; index++) await Promise.resolve();
  const newer = h.run('changeReportPeriod("month")');
  for (let index = 0; index < 4; index++) await Promise.resolve();
  assert.equal(reads, 2);
  second.resolve(h.run('catalog')); await newer;
  const html = h.content.innerHTML;
  first.resolve(h.run('catalog')); await older;
  assert.equal(h.run('LearningReport.activeReport.period'), 'month');
  assert.equal(h.content.innerHTML, html);
  const version = h.run('LearningReport.renderVersion');
  h.listeners.learningRecorded({ detail: { owner: 'another-child' } });
  assert.equal(h.run('LearningReport.renderVersion'), version);
  h.run('closeLearningReport()');
  const closedVersion = h.run('LearningReport.renderVersion');
  h.listeners.learningRecorded({ detail: { owner: 'iris' } });
  assert.equal(h.run('LearningReport.renderVersion'), closedVersion + 1);
});

test('分享简洁真实证据和复习例题，不包含账号ID；翻译与课程文本都安全转义', () => {
  const owner = 'private-child-identity-0123456789', h = harness(owner);
  const report = h.report([row(math, { owner, verdict: 'wrong' })]);
  h.context.result = report;
  const shared = h.run('LearningReport.generateShareData(result)');
  assert.match(shared.content, /未用提示答对: 0/);
  assert.match(shared.content, /可判断作答样本 1 次/);
  assert.ok(shared.content.includes(math.question));
  assert.equal(shared.content.includes(owner), false);
  assert.equal(shared.content.includes(math.id), false);
  h.context.I18n.currentLang = 'en';
  const english = h.run('LearningReport.generateShareData(result)');
  assert.match(english.content, /Correct without a hint: 0/);
  h.context.I18n.t = key => key === 'report.evidence' ? '<img src=x onerror=alert(1)>' : key;
  h.run('result.evidence.topics[0].title = "<script>bad()</script>"; result.evidence.topics[0].examples[0].question = "<img src=x>"');
  const html = h.run('LearningReport.generateEvidenceHTML(result)');
  assert.match(html, /&lt;script/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<script|<img/);
});
