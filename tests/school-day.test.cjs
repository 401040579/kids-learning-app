const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
function fixture(seed = {}) {
  const disk = new Map(Object.entries(seed)); let fail = false, events = 0;
  const native = {getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');disk.set(k,String(v));},removeItem:k=>disk.delete(k)};
  const c = vm.createContext({console,crypto,Date,Intl,localStorage:native,window:{localStorage:native,dispatchEvent(){events++;}},CustomEvent:class{}});
  for (const name of ['appStorage','dataBackup','schoolDayStore']) vm.runInContext(fs.readFileSync(__dirname+'/../js/'+name+'.js','utf8'),c);
  const run = text => vm.runInContext(text,c);
  run('SchoolDayStore.activate();SchoolDayStore.today=()=>"2026-10-07"');
  return {disk,run,fail:()=>{fail=true;},events:()=>events,json:source=>JSON.parse(run('JSON.stringify('+source+')'))};
}
const record = (id,kind='book-cn',minutes=10,date='2026-10-07') => ({id,kind,minutes,date,title:kind.startsWith('book-')?'Test book':'',confirmed:'child-confirmed',source:'manual',deleted:false});
test('Pacific 日期跨 UTC 午夜和夏令时切换；严格拒绝无效日期',()=>{
  const c=vm.createContext({Intl,Date,crypto,AppStorage:{}});vm.runInContext(fs.readFileSync(__dirname+'/../js/schoolDayStore.js','utf8'),c);
  const run=s=>vm.runInContext(s,c);
  assert.equal(run('SchoolDayStore.today(new Date("2026-10-07T06:59:59Z"))'),'2026-10-06');
  assert.equal(run('SchoolDayStore.today(new Date("2026-10-07T07:00:00Z"))'),'2026-10-07');
  assert.equal(run('SchoolDayStore.today(new Date("2026-11-01T08:30:00Z"))'),'2026-11-01');
  assert.equal(run('SchoolDayStore.today(new Date("2026-11-01T09:30:00Z"))'),'2026-11-01');
  for(const date of ['2026-02-30','2026-13-01','2026-00-01','not-date','2026-2-1','1999-12-31']) assert.equal(run(`SchoolDayStore.validDate(${JSON.stringify(date)})`),false);
  assert.equal(run('SchoolDayStore.validDate("2028-02-29")'),true);
});
test('中断计时恢复不把离开期间或整晚误计为阅读',()=>{
  const f=fixture();f.run('SchoolDayStore.mutate(p=>{p.timer={id:"interrupted",date:"2026-10-07",kind:"book-cn",title:"Test",elapsedMs:30000,startedAt:1000,state:"running"}});SchoolDayStore.recoverTimer(10000000)');
  assert.equal(f.run('SchoolDayStore.profile().timer.elapsedMs'),30000);
  assert.equal(f.run('SchoolDayStore.profile().timer.state'),'paused');
  assert.equal(f.run('SchoolDayStore.profile().records.length'),0);
});
test('游客、账号、同账号多个本机档案隔离，不触发云 dirty 或学习事件',()=>{
  const f=fixture();f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('guest'))});AppStorage.activate('account-a');SchoolDayStore.activate()`);
  assert.equal(f.run('SchoolDayStore.profile().records.length'),0);
  f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('a'))});SchoolDayStore.role='parent';SchoolDayStore.addProfile('second')`);
  assert.equal(f.run('SchoolDayStore.role'),'child');assert.equal(f.run('SchoolDayStore.profile().records.length'),0);
  assert.equal(f.run('AppStorage.meta().dirty'),false);
  assert.equal(f.run('Object.keys(DataBackup.createLearning().entries).length'),0);
  assert.equal(f.events(),0);
  f.run(`AppStorage.activate('account-b');SchoolDayStore.activate()`);assert.equal(f.run('SchoolDayStore.profile().records.length'),0);
  f.run(`AppStorage.activate('guest');SchoolDayStore.activate()`);assert.equal(f.run('SchoolDayStore.profile().records[0].id'),'guest');
});
test('英文书籍与 iReady Reading 合计，Math 不计英文且不虚构书籍',()=>{
  const f=fixture();for(const r of [record('cn','book-cn'),record('en','book-en',4),record('reading','iready-reading',6),record('math','iready-math',15)]) f.run(`SchoolDayStore.addRecord(${JSON.stringify(r)})`);
  assert.deepEqual(f.json('SchoolDayStore.daily("2026-10-07")'),{cn:10,en:10});
  assert.equal(f.run('SchoolDayStore.monthly("2026-10").length'),2);
  assert.deepEqual(f.json('SchoolDayStore.weekly("2026-10-07").math'),{home:15,school:null});
  assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify({...record('bad','iready-reading'),title:'fake book'})})`),/invalidRecord/);
});
test('校内未知、确认零、已知总量分别显示，不分摊或强制补足',()=>{
  const f=fixture();assert.equal(f.run('SchoolDayStore.weekly("2026-10-07").reading.school'),null);
  assert.throws(()=>f.run('SchoolDayStore.mutate(p=>{p.schoolWeeks["2026-10-05"]={reading:0,math:35}},true)'),/parentOnly/);
  f.run('SchoolDayStore.role="parent";SchoolDayStore.mutate(p=>{p.schoolWeeks["2026-10-05"]={reading:0,math:35}},true)');
  assert.deepEqual(f.json('SchoolDayStore.weekly("2026-10-07").math'),{home:0,school:35});assert.equal(f.run('SchoolDayStore.daily("2026-10-07").en'),0);
});
test('星期安排、下一上学日、周末与假期及短日，无补做累积',()=>{
  const f=fixture();assert.equal(f.run('SchoolDayStore.nextSchoolDay("2026-10-09")'),'2026-10-12');
  f.run('SchoolDayStore.role="parent";SchoolDayStore.mutate(p=>p.settings.holidays.push({from:"2026-10-12",to:"2026-10-13"}),true)');
  assert.equal(f.run('SchoolDayStore.nextSchoolDay("2026-10-09")'),'2026-10-14');
  assert.deepEqual(f.json('SchoolDayStore.prep("2026-10-05")'),['folder','water','ipad','pe']);
  assert.deepEqual(f.json('SchoolDayStore.prep("2026-10-06")'),['folder','water','library']);
  assert.deepEqual(f.json('SchoolDayStore.prep("2026-10-12")'),[]);
  assert.equal(f.run('SchoolDayStore.parentTasks("2026-10-14").includes("parent-food")'),false);
  assert.deepEqual(f.json('SchoolDayStore.parentTasks("2026-10-11")'),[]);
  assert.equal(f.run('SchoolDayStore.parentTasks("2026-10-09").includes("newsletter")'),true);
});
test('月初按首个上学日交上月记录，月末准备本月记录',()=>{
  const f=fixture();assert.equal(f.run('SchoolDayStore.parentTasks("2026-11-02").includes("submit-log")'),true);
  assert.equal(f.run('SchoolDayStore.parentTasks("2026-10-30").includes("prepare-log")'),true);
  f.run('SchoolDayStore.role="parent";SchoolDayStore.mutate(p=>p.settings.holidays.push({from:"2026-11-02",to:"2026-11-03"}),true)');
  assert.equal(f.run('SchoolDayStore.parentTasks("2026-11-04").includes("submit-log")'),true);
  assert.equal(f.run('SchoolDayStore.parentTasks("2026-11-05").includes("submit-log")'),false);
});
test('固定记录 ID 去重、不同内容冲突；保存失败保留全部旧数据后可重试',()=>{
  const f=fixture();const r=record('stable');assert.equal(f.run(`SchoolDayStore.addRecord(${JSON.stringify(r)})`),true);
  assert.equal(f.run(`SchoolDayStore.addRecord(${JSON.stringify(r)})`),false);
  assert.equal(f.run('SchoolDayStore.profile().records.length'),1);
  assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify({...r,minutes:11})})`),/duplicate/);
  const old=Object.fromEntries(f.disk);f.fail();assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('second'))})`),/quota/);
  assert.deepEqual(Object.fromEntries(f.disk),old);
});
test('家长修正、撤销与恢复调整报告；孩子不能改历史、不能伪装家长确认',()=>{
  const f=fixture();f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('r'))})`);
  assert.throws(()=>f.run('SchoolDayStore.toggleRecord("r",true)'),/parentOnly/);
  assert.throws(()=>f.run('SchoolDayStore.editRecord("r",{minutes:5})'),/parentOnly/);
  assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('past','book-cn',10,'2026-10-06'))})`),/parentOnly/);
  f.run('SchoolDayStore.role="parent";SchoolDayStore.editRecord("r",{date:"2026-09-30",minutes:8});SchoolDayStore.toggleRecord("r",true)');
  assert.equal(f.run('SchoolDayStore.monthly("2026-09").length'),0);
  f.run('SchoolDayStore.toggleRecord("r",false)');assert.equal(f.run('SchoolDayStore.monthly("2026-09")[0].minutes'),8);
  assert.equal(f.run('SchoolDayStore.profile().records[0].confirmed'),'parent-confirmed');
});
test('冻结与切号拒绝旧上下文写入；损坏 JSON 保留原文而不默认为空',()=>{
  const f=fixture();const old=Object.fromEntries(f.disk);
  f.run('AppStorage.blocked=true');assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('blocked'))})`),/changed/);
  f.run('AppStorage.blocked=false;AppStorage.activate("new-owner")');assert.throws(()=>f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('wrong'))})`),/changed/);
  assert.deepEqual(Object.fromEntries(f.disk),old);
  f.disk.set('kids-learning-account:new-owner:school-day-local-v1','{broken');
  assert.throws(()=>f.run('SchoolDayStore.activate()'),/corrupt/);
  assert.equal(f.disk.get('kids-learning-account:new-owner:school-day-local-v1'),'{broken');
});
test('计时暂停不自动完成，跨午夜草稿仍保留起始学校日期，需要确认',()=>{
  const f=fixture();f.run('SchoolDayStore.mutate(p=>{p.timer={id:"timer",date:"2026-10-06",kind:"book-cn",title:"Timed book",elapsedMs:1000,startedAt:1000,state:"running"}});SchoolDayStore.pauseTimer("draft",62000)');
  assert.equal(f.run('SchoolDayStore.profile().timer.elapsedMs'),62000);
  assert.equal(f.run('SchoolDayStore.profile().records.length'),0);
  assert.equal(f.run('SchoolDayStore.elapsed({elapsedMs:5000,startedAt:1000,state:"paused"},999999)'),5000);
  assert.equal(f.run('SchoolDayStore.elapsed({elapsedMs:5000,startedAt:1000,state:"running"},0)'),5000);
  f.run(`SchoolDayStore.addRecord(${JSON.stringify({...record('timer','book-cn',1,'2026-10-06'),source:'timer'})})`);
  assert.equal(f.run('SchoolDayStore.profile().timer'),null);assert.equal(f.run('SchoolDayStore.profile().records[0].date'),'2026-10-06');
});
test('学校数据排除普通完整/云备份，普通云恢复不会删除学校记录',()=>{
  const f=fixture();f.run(`SchoolDayStore.addRecord(${JSON.stringify(record('local'))})`);
  const old=f.disk.get(f.run('SchoolDayStore.key()'));
  assert.equal(f.run('JSON.stringify(DataBackup.create()).includes("school-day")'),false);
  f.run('DataBackup.restore({app:"kids-learning-app",version:2,scope:"learning",entries:{kidsLearningData:"{}"}})');
  assert.equal(f.disk.get(f.run('SchoolDayStore.key()')),old);
});
