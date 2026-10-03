const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

function app(seed = {}, options = {}) {
  const disk = new Map(Object.entries(seed)), elements = new Map(), recognitions = [], rewards = [], utterances = [];
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, { textContent: '', innerHTML: '', disabled: false,
        classList: { add: name => classes.add(name), remove: name => classes.delete(name),
          toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
        querySelector: selector => element(id + ':' + selector) });
    }
    return elements.get(id);
  };
  class Recognition {
    constructor() { recognitions.push(this); }
    start() { if (options.startFails) throw Error('microphone unavailable'); }
    stop() {}
    abort() {}
    result(transcript, confidence = 1) { this.onresult({ resultIndex: 0, results: [[{ transcript, confidence }]] }); }
  }
  const storage = {
    getItem: key => disk.get(key) ?? null,
    removeItem: key => disk.delete(key),
    setItem: (key, value) => {
      if (options.failStorage?.(key, value)) throw Error('storage unavailable');
      disk.set(key, String(value));
    }
  };
  const speech = { cancel() {}, speak: utterance => utterances.push(utterance) };
  const context = vm.createContext({
    console: { warn() {}, log() {}, error() {} }, crypto: { randomUUID },
    localStorage: storage,
    window: { localStorage: storage, SpeechRecognition: Recognition, speechSynthesis: speech,
      dispatchEvent() {}, addEventListener() {} },
    speechSynthesis: speech, SpeechSynthesisUtterance: class {}, CustomEvent: class {},
    document: { getElementById: element, querySelector: selector => element(selector), querySelectorAll: () => [] },
    I18n: { t: (key, fallback) => fallback || key },
    RewardSystem: { addPoints: (points, message) => rewards.push({ points, message }), playSound() {} },
    AchievementSystem: { checkProgress() {} },
    PuterTTS: { available: () => false },
    setTimeout, clearTimeout,
  });
  const run = source => vm.runInContext(source, context);
  for (const file of ['appStorage', 'dataBackup', 'safeStorage', 'pictureBook', 'pronunciation']) {
    run(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'));
  }
  run('PictureBook.init(); Pronunciation.init()');
  return { disk, run, recognitions, rewards, utterances, context, element,
    json: expression => JSON.parse(run(`JSON.stringify(${expression})`)) };
}

function finishBook(a) {
  a.run('while (PictureBook.currentPage < PictureBook.currentBook.pages.length - 1) PictureBook.nextPage()');
  return a.run('PictureBook.finishReading()');
}

function match(a, text, confidence = 1) {
  a.run('Pronunciation.startRecording()');
  const recognition = a.recognitions.at(-1);
  recognition.result(text, confidence);
  recognition.onend();
  return recognition;
}

test('旧绘本打开历史保留，但没有推断出可靠完成记录', () => {
  const raw = JSON.stringify({ readingHistory: ['three-little-pigs'], favorites: ['ugly-duckling'] });
  const a = app({ kidsPictureBookData: raw });
  a.run('PictureBook.renderBookGrid()');
  assert.match(a.element('bookshelf-grid').innerHTML, /打开过/);
  assert.doesNotMatch(a.element('bookshelf-grid').innerHTML, /读完过/);
  assert.deepEqual(a.json('PictureBook.readingHistory'), ['three-little-pigs']);
  assert.deepEqual(a.json('PictureBook.completionHistory'), []);
  assert.equal(a.disk.get('kidsPictureBookData'), raw, '读取不重写旧存档');
});

test('打开、开始阅读、读完是不同状态，途中退出能续读但不奖励', () => {
  const a = app();
  a.run("PictureBook.openBook('three-little-pigs'); PictureBook.renderBookGrid()");
  assert.match(a.element('bookshelf-grid').innerHTML, /打开过/);
  assert.equal(a.run('PictureBook.finishReading()'), false);
  a.run('PictureBook.nextPage(); PictureBook.backToBookshelf()');
  assert.match(a.element('bookshelf-grid').innerHTML, /正在阅读/);
  assert.equal(a.rewards.length, 0);
  const b = app(Object.fromEntries(a.disk));
  b.run("PictureBook.openBook('three-little-pigs')");
  assert.equal(b.run('PictureBook.currentPage'), 1);
  assert.equal(finishBook(b), true);
  assert.equal(b.rewards.length, 1);
  const data = JSON.parse(b.disk.get('kidsPictureBookData'));
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.bookProgress['three-little-pigs'].completionCount, 1);
  assert.equal(data.completionHistory[0].confirmation, 'reader_confirmed');
  assert.equal(data.completionHistory[0].viewedPages.length, 9);
  assert.ok(Date.parse(data.completionHistory[0].completedAt));
});

test('末页有明确的完成按钮，同次反复点击只记录一次并显示实际奖励', () => {
  const a = app();
  a.run("PictureBook.openBook('three-little-pigs'); while (PictureBook.currentPage < 8) nextBookPage()");
  const html = a.element('book-read-area').innerHTML;
  assert.match(html, /我读完了/);
  assert.doesNotMatch(html, /onclick="nextPage\(\)" disabled/);
  a.run('nextBookPage(); nextBookPage(); PictureBook.finishReading()');
  assert.equal(a.rewards.length, 1);
  assert.equal(a.rewards[0].points, 15);
  assert.equal(a.run('PictureBook.completionHistory.length'), 1);
  assert.equal(a.element('completed-book-name').textContent, '三只小猪');
  assert.equal(a.element('book-complete-modal:.reward-text').textContent, '+15 积分');
  a.run('readBookAgain()');
  assert.equal(a.run('PictureBook.currentPage'), 0);
  assert.equal(a.run('PictureBook.finishReading()'), false);
  assert.equal(finishBook(a), true);
  assert.equal(a.rewards.length, 2);
  assert.equal(a.run('PictureBook.completionHistory.length'), 2);
});

test('仅跳转到末页不能跳过页访问会话完成，存档失败不发完成奖励', () => {
  let fail = false;
  const a = app({}, { failStorage: key => fail && key === 'kidsPictureBookData' });
  a.run("PictureBook.openBook('three-little-pigs'); PictureBook.currentPage = 8; PictureBook.renderReadingPage()");
  assert.equal(a.run('PictureBook.finishReading()'), false);
  a.run('PictureBook.currentPage = 0; PictureBook.renderReadingPage()');
  a.run('while (PictureBook.currentPage < 8) PictureBook.nextPage()');
  fail = true;
  assert.equal(a.run('PictureBook.finishReading()'), false);
  assert.equal(a.rewards.length, 0);
  assert.equal(a.run('PictureBook.completionHistory.length'), 0);
  fail = false;
  assert.equal(a.run('PictureBook.finishReading()'), true);
  assert.equal(a.rewards.length, 1);
});

test('新绘本和转写统计仍是登记过的 object，可账号隔离并导出恢复', () => {
  const a = app({ kidsPictureBookData: '{"readingHistory":["ugly-duckling"],"favorites":[]}' });
  a.run("AppStorage.activate('iris'); PictureBook.loadData(); Pronunciation.loadStats(); PictureBook.openBook('three-little-pigs')");
  finishBook(a);
  a.run("Pronunciation.startPractice('words')");
  match(a, '妈妈');
  const backup = a.json('DataBackup.createLearning()');
  const b = app();
  b.run(`AppStorage.activate('iris'); DataBackup.restore(${JSON.stringify(backup)}); PictureBook.loadData(); Pronunciation.loadStats()`);
  assert.equal(b.run('PictureBook.completionHistory.length'), 1);
  assert.equal(b.run('Pronunciation.stats.matchedAttempts'), 1);
  assert.equal(JSON.parse(a.disk.get('kidsPictureBookData')).readingHistory[0], 'ugly-duckling');
});

test('自动朗读只能翻页，读到最后仍需显式确认；关闭后的旧语音回调失效', () => {
  const a = app();
  a.run("PictureBook.openBook('three-little-pigs'); toggleAutoRead()");
  for (let page = 0; page < 9; page++) a.utterances.at(-1).onend();
  assert.equal(a.run('PictureBook.currentPage'), 8);
  assert.equal(a.run('PictureBook.completionHistory.length'), 0);
  assert.equal(a.rewards.length, 0);
  a.run('nextBookPage()');
  assert.equal(a.rewards.length, 1);
  a.run('readBookAgain()');
  const late = a.utterances.at(-1);
  a.run('closePictureBook()');
  late.onend();
  assert.equal(a.run('PictureBook.currentBook'), null);
  assert.equal(a.rewards.length, 1);
});

test('Puter 朗读等待期间退出，迟到音频不播放；播放拒绝时回退并清理旧音频', async () => {
  const a = app();
  let resolveAudio;
  const pending = new Promise(resolve => { resolveAudio = resolve; });
  a.context.PuterTTS = { available: () => true, speak: () => pending };
  a.run("PictureBook.openBook('three-little-pigs')");
  const request = a.run('PictureBook.speakPageText()');
  a.run('closePictureBook()');
  let plays = 0, pauses = 0;
  resolveAudio({ pause() { pauses++; }, play() { plays++; } });
  await request;
  assert.equal(plays, 0);
  assert.equal(pauses, 1);
  a.context.PuterTTS = { available: () => true, speak: async () => ({ pause() {}, play: async () => { throw Error('blocked'); } }) };
  a.run("PictureBook.openBook('three-little-pigs')");
  await a.run('PictureBook.speakPageText()');
  assert.equal(a.run('PictureBook.currentAudio'), null);
  assert.equal(a.utterances.length, 1);
  assert.notEqual(a.run('PictureBook.currentUtterance'), null);
});

test('文字匹配使用真实编辑距离，空白、乱序和重复字符没有额外奖励', () => {
  const a = app();
  assert.equal(a.run("Pronunciation.calculateSimilarity('', '')"), 0);
  assert.equal(a.run("Pronunciation.calculateSimilarity('HELLO!', 'hello')"), 100);
  assert.equal(a.run("Pronunciation.calculateSimilarity('Thank you.', 'thankyou')"), 100);
  assert.equal(a.run("Pronunciation.calculateSimilarity('lleho', 'hello')"), 20);
  assert.equal(a.run("Pronunciation.calculateSimilarity('aaaaa', 'apple')"), 20);
  assert.equal(a.run("Pronunciation.calculateSimilarity('hlelo', 'hello')"), 60);
});

test('空转写、环境噪音、低置信、权限和启动失败不会计入分数或扣分', () => {
  const a = app();
  a.run("Pronunciation.startPractice('words')");
  for (const text of ['', '……', '天气预报明天会下雨', '洗衣机已经洗好了']) match(a, text);
  match(a, '妈妈', 0.1);
  a.run('Pronunciation.startRecording()');
  const denied = a.recognitions.at(-1);
  denied.onerror({ error: 'not-allowed' });
  denied.result('妈妈');
  denied.onend();
  assert.match(a.element('practice-result').innerHTML, /麦克风没有获得允许/);
  assert.equal(a.run('Pronunciation.stats.totalPractices'), 0);
  assert.equal(a.run('Pronunciation.stats.averageScore'), null);
  assert.equal(a.rewards.length, 0);
  const b = app({}, { startFails: true });
  b.run("Pronunciation.startPractice('english'); Pronunciation.startRecording()");
  assert.equal(b.run('Pronunciation.isRecording'), false);
  assert.equal(b.run('Pronunciation.stats.totalPractices'), 0);
});

test('跟读迟到或重复识别结果不能计入另一题，正常停止仍可收最终结果', () => {
  const a = app();
  a.run("Pronunciation.startPractice('words'); Pronunciation.startRecording()");
  const old = a.recognitions.at(-1);
  a.run('nextPracticeItem(); Pronunciation.startRecording()');
  const current = a.recognitions.at(-1);
  old.result('爸爸');
  old.onend();
  assert.equal(a.run('Pronunciation.isRecording'), true);
  assert.equal(a.run('Pronunciation.stats.matchedAttempts'), 0);
  a.run('Pronunciation.stopRecording()');
  current.result('爸爸');
  current.result('爸爸');
  current.onend();
  assert.equal(a.run('Pronunciation.stats.matchedAttempts'), 1);
  assert.equal(a.rewards.length, 1);
  a.run('closePronunciation()');
  current.result('爸爸');
  assert.equal(a.run('Pronunciation.stats.matchedAttempts'), 1);
});

test('旧平均分保留但不伪装累计平均，新平均跨轮持久累加', () => {
  const a = app({ kidsPronunciationStats: '{"totalPractices":100,"perfectScores":20,"averageScore":95}' });
  assert.deepEqual(a.json('Pronunciation.stats.legacyStats'), { totalPractices: 100, perfectScores: 20, averageScore: 95 });
  assert.equal(a.run('Pronunciation.stats.averageScore'), null);
  a.run("Pronunciation.startPractice('english')");
  match(a, 'hlelo');
  a.run('backToPronunciationSelect(); startPronunciationPractice("english")');
  match(a, 'hello');
  assert.equal(a.run('Pronunciation.stats.averageScore'), 80);
  assert.equal(a.run('Pronunciation.stats.totalPractices'), 102);
  assert.equal(a.run('Pronunciation.stats.matchedAttempts'), 2);
  assert.equal(a.run('Pronunciation.stats.exactMatches'), 1);
  const b = app(Object.fromEntries(a.disk));
  assert.equal(b.run('Pronunciation.stats.averageScore'), 80);
  assert.equal(b.run('Pronunciation.stats.scoreTotal'), 160);
});

test('跟读反馈诚实称文字匹配并转义转写，不再宣称发音标准', () => {
  const a = app();
  a.run("Pronunciation.startPractice('words'); Pronunciation.showResult('<img src=x onerror=alert(1)>妈妈', 100)");
  const html = a.element('practice-result').innerHTML;
  assert.match(html, /文字匹配度，不是发音分数/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|发音很标准/);
});

test('拼音不自动评分，重试入口与末项完成入口可用，完成弹窗不虚构奖励', () => {
  const a = app();
  a.run("startPronunciationPractice('pinyin'); toggleRecording(); tryAgain(); Pronunciation.currentIndex = 11; Pronunciation.renderPracticePage()");
  assert.match(a.element('pronunciation-practice-area').innerHTML, /完成这一组/);
  assert.equal(a.recognitions.length, 0);
  a.run('nextPracticeItem()');
  assert.equal(a.element('summary-avg-score').textContent, '—');
  assert.equal(a.element('summary-max-score').textContent, '—');
  assert.equal(a.element('pronunciation-reward').textContent, '+0 积分');
  assert.equal(a.run('Pronunciation.stats.matchedAttempts'), 0);
  assert.equal(a.rewards.length, 0);
});
