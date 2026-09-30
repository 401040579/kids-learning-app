const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
function profile(seed = {}) {
  const disk = new Map(Object.entries(seed));
  const native = { getItem:key=>disk.get(key)??null, removeItem:key=>disk.delete(key), setItem:(key,value)=>disk.set(key,String(value)) };
  const context = vm.createContext({localStorage:native,window:{localStorage:native,dispatchEvent(){}},CustomEvent:class{},console});
  for (const file of ['appStorage','dataBackup']) vm.runInContext(fs.readFileSync(__dirname+'/../js/'+file+'.js','utf8'),context);
  return {disk,native,run:code=>vm.runInContext(code,context)};
}
test('分数、错题、作品完整分区，游客旧存档不迁移，设备凭据保持共享',()=>{
  const p=profile({kidsLearningData:'{"totalScore":80}',artworkGallery:'[{"id":"guest"}]',parentNotifyConfig:'{"key":"device"}'});
  p.run("AppStorage.activate('iris');AppStorage.setItem('kidsLearningData','{\"totalScore\":10}');AppStorage.setItem('artworkGallery','[{\"id\":\"iris\"}]')");
  assert.equal(p.run('DataBackup.createLearning().entries.parentNotifyConfig'),undefined);
  p.run("AppStorage.activate('other')");
  assert.equal(p.run("AppStorage.getItem('artworkGallery')"),null);
  p.run("AppStorage.activate('guest')");
  assert.equal(p.run("AppStorage.getItem('kidsLearningData')"),'{"totalScore":80}');
  assert.equal(p.run("AppStorage.getItem('parentNotifyConfig')"),'{"key":"device"}');
  assert.equal(p.run('Object.keys(DataBackup.create().entries).some(key=>key.includes("account:"))'),false);
});
test('上传期间的新修改保留 dirty，不被旧应答错误标成已同步',()=>{
  const p=profile();
  p.run("AppStorage.activate('iris');AppStorage.saveMeta({revision:1,dirty:false,change:''});AppStorage.setItem('kidsLearningData','{}');var first=AppStorage.meta().change;AppStorage.setItem('kidsLearningData','{\"totalScore\":20}');AppStorage.confirmSaved('iris',2,first)");
  assert.equal(p.run('AppStorage.meta().dirty'),true);
  assert.equal(p.run('AppStorage.meta().revision'),2);
  assert.equal(p.run("AppStorage.getItem('kidsLearningData')"),'{"totalScore":20}');
});
test('元数据配额失败时不写入未标记的新作品',()=>{
  const p=profile();p.run("AppStorage.activate('iris');AppStorage.saveMeta({revision:1,dirty:false,change:''})");
  p.native.setItem=(key,value)=>{if(key.endsWith('sync-meta'))throw Error('quota');p.disk.set(key,String(value));};
  assert.throws(()=>p.run("AppStorage.setItem('artworkGallery','[{\"id\":1}]')"),/quota/);
  assert.equal(p.run("AppStorage.getItem('artworkGallery')"),null);
});
test('采用云端存档失败完整回滚当前账号，保留游客与设备设置',()=>{
  const p=profile({kidsLearningData:'{"totalScore":80}',appLanguage:'zh'});
  p.run("AppStorage.activate('iris');AppStorage.setItem('kidsLearningData','{\"totalScore\":10}')");
  const original=Object.fromEntries(p.disk);
  p.native.setItem=(key,value)=>{if(value.includes('tooLarge'))throw Error('quota');p.disk.set(key,String(value));};
  assert.throws(()=>p.run("AppStorage.replaceProfile({app:'kids-learning-app',version:2,scope:'learning',entries:{kidsProfileData:'{\"name\":\"tooLarge\"}',appLanguage:'en'}},2)"),/已还原旧存档/);
  assert.deepEqual(Object.fromEntries(p.disk),original);
});
