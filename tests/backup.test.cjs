const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function storage(seed = {}, reject = () => false) {
  const disk = new Map(Object.entries(seed));
  const context = vm.createContext({ localStorage: {
    getItem: key => disk.get(key) ?? null,
    removeItem: key => disk.delete(key),
    setItem: (key, value) => {
      if (reject(key, value)) throw Error('quota');
      disk.set(key, String(value));
    }
  } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/dataBackup.js'), 'utf8'), context);
  return { disk, run: js => vm.runInContext(js, context) };
}

test('完整备份包含错题、英语提升、家庭积分与作品，同时不导出第三方凭据', () => {
  const seed = { kidsWrongQuestions: '{"questions":[]}', kidsEnglishBoost: '{"ispyPlayed":2}',
    kidsChoreTracker: '{"records":[]}', artworkGallery: '[]', kidsFamilyPK: '{"history":[],"stats":{}}',
    appLanguage: 'zh', thirdPartyToken: 'private' };
  const a = storage(seed);
  const backup = JSON.parse(a.run('JSON.stringify(DataBackup.create())'));
  assert.equal(backup.entries.thirdPartyToken, undefined);
  const b = storage({ kidsDailyCheckin: '{}', thirdPartyToken: 'keep' });
  b.run(`DataBackup.restore(${JSON.stringify(backup)})`);
  for (const [key, raw] of Object.entries(backup.entries)) assert.equal(b.disk.get(key), raw);
  assert.equal(b.disk.has('kidsDailyCheckin'), false);
  assert.equal(b.disk.get('thirdPartyToken'), 'keep');
});

test('旧版备份只恢复原有三类数据，保留其他模块记录', () => {
  const a = storage({ kidsWrongQuestions: '{"questions":[]}' });
  a.run(`DataBackup.restore({version:'1.0',data:{learning:{totalScore:12}}})`);
  assert.equal(JSON.parse(a.disk.get('kidsLearningData')).totalScore, 12);
  assert.equal(a.disk.get('kidsWrongQuestions'), '{"questions":[]}');
});

test('导入失败回滚，不触发自动淘汰作品，不显示恢复成功', () => {
  const seed = { kidsLearningData: '{"totalScore":50}', artworkGallery: '[{"id":1}]', other: 'keep' };
  const a = storage(seed, (key, raw) => raw.includes('tooLarge'));
  assert.throws(() => a.run(`DataBackup.restore({app:'kids-learning-app',version:2,entries:{
    kidsLearningData:'{"totalScore":5}', kidsProfileData:'{"name":"tooLarge"}'}})`), /原有记录已还原/);
  assert.deepEqual(Object.fromEntries(a.disk), seed);
});

test('未知版本、未知键、坏 JSON 和错误根类型在写入前被拒绝', () => {
  for (const entries of [{ authToken: 'x' }, { kidsWrongQuestions: '{broken' }, { kidsFamilyPK: '[]' },
    { kidsProfileData: '{"__proto__":{"admin":true}}' }]) {
    const a = storage({ kidsLearningData: '{"totalScore":99}' });
    assert.throws(() => a.run(`DataBackup.restore(${JSON.stringify({ app:'kids-learning-app', version:2, entries })})`));
    assert.equal(a.disk.get('kidsLearningData'), '{"totalScore":99}');
  }
  assert.throws(() => storage().run(`DataBackup.restore({app:'kids-learning-app',version:99,entries:{}})`));
});

test('损坏记录也能按原文导出，便于人工恢复，但不允许直接导入', () => {
  const a = storage({ kidsWrongQuestions: '{broken' });
  assert.equal(a.run('DataBackup.create().entries.kidsWrongQuestions'), '{broken');
  assert.throws(() => a.run('DataBackup.restore(DataBackup.create())'), /记录已损坏/);
});

test('备份登记表覆盖所有当前直接使用的存档键', () => {
  const a = storage();
  const keys = new Set(JSON.parse(a.run('JSON.stringify(DataBackup.keys())')));
  const folder = path.join(__dirname, '../js');
  for (const file of fs.readdirSync(folder).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(folder, file), 'utf8');
    for (const match of code.matchAll(/(?:localStorage\.(?:getItem|setItem)|safeSetItem)\(['"]([^'"]+)/g)) {
      assert.ok(keys.has(match[1]), `请将 ${file} 的 ${match[1]} 加入备份登记表`);
    }
  }
});

test('学习云备份不包含通知凭据，恢复时保留本机通知配置', () => {
  const a = storage({ kidsLearningData: '{"totalScore":5}', parentNotifyConfig: '{"key":"private"}', videoWhitelistCache: '{}' });
  const backup = JSON.parse(a.run('JSON.stringify(DataBackup.createLearning())'));
  assert.equal(backup.scope, 'learning');
  assert.equal(backup.entries.parentNotifyConfig, undefined);
  assert.equal(backup.entries.videoWhitelistCache, undefined);
  const b = storage({ kidsLearningData: '{}', parentNotifyConfig: '{"key":"keep"}' });
  b.run(`DataBackup.restore(${JSON.stringify(backup)})`);
  assert.equal(b.disk.get('parentNotifyConfig'), '{"key":"keep"}');
  assert.equal(JSON.parse(b.disk.get('kidsLearningData')).totalScore, 5);
});

test('前后端允许的学习备份键保持一致', () => {
  const a = storage();
  const keys = JSON.parse(a.run('JSON.stringify(DataBackup.keys().filter(key => !DataBackup.CLOUD_EXCLUDED.includes(key)))'));
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/backup_keys.json'), 'utf8'));
  assert.deepEqual(Object.keys(registry).sort(), keys.sort());
});

test('拒绝伪造范围的备份，避免误清空本机设置', () => {
  const a = storage();
  assert.throws(() => a.run(`DataBackup.prepare({app:'kids-learning-app',version:2,scope:'unknown',entries:{}})`));
  assert.throws(() => a.run(`DataBackup.prepare({app:'kids-learning-app',version:2,scope:'learning',entries:{parentNotifyConfig:'{}'}})`));
});
