const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function app(seed = {}) {
  const disk = new Map(Object.entries(seed));
  const element = () => ({ textContent: '', style: {}, classList: { add() {}, remove() {} } });
  const context = vm.createContext({
    console: { warn() {}, log() {} },
    window: { dispatchEvent() {}, addEventListener() {} },
    CustomEvent: class {},
    localStorage: {
      getItem: key => disk.get(key) ?? null,
      setItem: (key, value) => disk.set(key, String(value)),
      removeItem: key => disk.delete(key)
    },
    document: { addEventListener() {}, getElementById: element, querySelectorAll: () => [] },
    setTimeout() {}, clearTimeout() {},
  });
  const run = source => vm.runInContext(source, context);
  for (const file of ['safeStorage', 'rewards', 'achievements', 'wrongQuestions', 'dailyCheckin', 'pronunciation', 'app']) {
    run(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'));
  }
  return { run, disk };
}

test('重新打开已有存档后，科学进度不会被奖励快照覆盖', () => {
  const a = app({ kidsLearningData: JSON.stringify({ totalScore: 80, scienceCorrect: 5,
    puzzleCorrect: 3, scienceProgress: { animal: { completed: [1], correct: 1, total: 1 } } }) });
  a.run(`RewardSystem.loadData(); saveScienceProgress('animal', 2, true); RewardSystem.saveData()`);
  const data = JSON.parse(a.disk.get('kidsLearningData'));
  assert.deepEqual(data.scienceProgress.animal, { completed: [1, 2], correct: 2, total: 2 });
  assert.equal(data.scienceCorrect, 6);
  assert.equal(data.totalScore, 80);
  assert.equal(data.puzzleCorrect, 3);
  assert.equal(a.run('Object.hasOwn(RewardSystem.data, "scienceProgress")'), false);
});

test('科学初始化不清零已有累计数，不写入空进度覆盖数据', () => {
  const a = app({ kidsLearningData: '{"scienceCorrect":12}' });
  a.run('loadScienceProgress()');
  assert.equal(a.disk.get('kidsLearningData'), '{"scienceCorrect":12}');
});

for (const [key, load] of [
  ['kidsAchievements', 'AchievementSystem.loadData()'],
  ['kidsWrongQuestions', 'WrongQuestions.loadData()'],
  ['kidsDailyCheckin', 'DailyCheckin.loadData()'],
  ['kidsPronunciationStats', 'Pronunciation.loadStats()'],
  ['kidsLearningData', 'RewardSystem.loadData(); loadScienceProgress()']
]) {
  test(`${key} 损坏时回退且保留原文供恢复`, () => {
    const a = app({ [key]: '{broken' });
    assert.doesNotThrow(() => a.run(load));
    assert.equal(a.disk.get(key), '{broken');
    assert.equal(a.run(`SafeStorage.issues.has('${key}')`), true);
  });
}

test('合法 JSON 但字段类型错误时也不破坏启动', () => {
  const a = app({ kidsWrongQuestions: '{"questions":null}', kidsDailyCheckin: '{"checkins":null}' });
  a.run('WrongQuestions.loadData(); DailyCheckin.loadData()');
  assert.equal(a.run('WrongQuestions.getStats().total'), 0);
  assert.equal(a.run('DailyCheckin.isCheckedToday()'), false);
});

test('学会的题再次答错会重新进入短间隔复习', () => {
  const a = app();
  a.run(`WrongQuestions.addWrongQuestion('math', { questionId: 'q', question: '1+1',
    options: ['1','2'], correctAnswer: '2', userAnswer: '1' });
    const id = WrongQuestions.data.questions[0].id;
    WrongQuestions.markAsMastered(id);
    WrongQuestions.recordReview(id);
    WrongQuestions.addWrongQuestion('math', { questionId: 'q', userAnswer: '1' });`);
  assert.equal(a.run('WrongQuestions.getUnmastered().length'), 1);
  assert.equal(a.run('WrongQuestions.getStats().mastered'), 0);
  assert.equal(a.run('WrongQuestions.data.questions[0].reviewTimes'), 0);
  assert.equal(a.run('WrongQuestions.data.questions[0].lastReviewTime'), null);
});

test('最大随机值时仍满足 10 以内加法', () => {
  const a = app();
  a.run(`Math.random = () => 0.99999; generateMathOptions = () => {};
    MathConfig.range = 10; MathConfig.operators = ['+']; generateMathQuestion()`);
  assert.equal(a.run('mathAnswer'), 10);
});

test('切换到下一题之前重复提交只计分一次', () => {
  const a = app();
  a.run(`RewardSystem.showReward = () => {}; RewardSystem.createParticles = () => {};
    generateMathQuestion(); const button = {classList:{add(){}}};
    checkMathAnswer(mathAnswer, button); checkMathAnswer(mathAnswer, button)`);
  assert.equal(a.run('RewardSystem.data.mathCorrect'), 1);
  assert.equal(a.run('RewardSystem.data.totalScore'), 10);
});

test('单个模块初始化失败后可以继续初始化下一个模块', () => {
  const a = app();
  a.run(`let nextRan = false;
    SafeStorage.initialize('broken', () => { throw Error('bad data') });
    SafeStorage.initialize('next', () => { nextRan = true });`);
  assert.equal(a.run('nextRan'), true);
});

test('存储空间不足时保留孩子作品，仅允许清理可下载的缓存', () => {
  const a = app({ artworkGallery: '[{"id":1}]', musicCompositions: '[{"id":2}]', videoWhitelistCache: '{}' });
  const result = a.run(`localStorage.setItem = () => { const e = Error('full'); e.name = 'QuotaExceededError'; throw e; };
    safeSetItem('kidsLearningData', '{"totalScore":5}')`);
  assert.equal(result, false);
  assert.equal(a.disk.get('artworkGallery'), '[{"id":1}]');
  assert.equal(a.disk.get('musicCompositions'), '[{"id":2}]');
  assert.equal(a.disk.has('videoWhitelistCache'), false);
  assert.equal(a.run("SafeStorage.issues.has('kidsLearningData')"), true);
});

test('SW 更新仅删除本应用的旧缓存，保留 WebLLM 模型', async () => {
  const handlers = {}, deleted = [];
  const source = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  const currentCache = source.match(/const CACHE_NAME = '([^']+)'/)[1];
  vm.runInNewContext(source, {
    self: { addEventListener: (name, run) => { handlers[name] = run; }, clients: { matchAll: async () => [] } },
    caches: { keys: async () => ['kids-learning-v1', currentCache, 'webllm/model', 'other-app'],
      delete: async name => { deleted.push(name); } }
  });
  let pending;
  handlers.activate({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(deleted, ['kids-learning-v1']);
});
