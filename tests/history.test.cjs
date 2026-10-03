const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function history() {
  const context = vm.createContext({ document: { addEventListener() {} }, console,
    crypto: { randomUUID: () => 'test-answer-00000001' }, LearningAccount: { identity: { id: 'iris-id' } } });
  vm.runInContext(fs.readFileSync(__dirname + '/../js/learningHistory.js', 'utf8'), context);
  return source => vm.runInContext(source, context);
}

test('逐题报告按真实作答时间筛选，unclear/skipped 不稀释正确率', () => {
  const run = history();
  const result = run(`LearningHistory.summarize([
    {event:{occurred_at:'2026-09-28T12:00:00Z',verdict:'correct'}},
    {event:{occurred_at:'2026-09-28T11:00:00Z',verdict:'wrong'}},
    {event:{occurred_at:'2026-09-27T11:00:00Z',verdict:'unclear'}},
    {event:{occurred_at:'2026-09-01T11:00:00Z',verdict:'correct'}},
    {event:{occurred_at:'2026-08-01T11:00:00Z',verdict:'correct'}}
  ], 'week', new Date('2026-09-29T12:00:00Z'))`);
  assert.equal(result.total, 3);
  assert.equal(result.accuracy, 50);
  assert.equal(run(`LearningHistory.summarize([], 'all').accuracy`), null);
});

test('异步保存前固定账号归属，切换账号不把旧题算给新账号', async () => {
  const run = history();
  const promise = run(`let saved;
    LearningHistory.transaction = async (names, mode, apply) => {
      const request={result:null};
      apply({objectStore:()=>({get:()=>request,add:row=>{saved=row}})});
      request.onsuccess();
    };
    LearningHistory.render = () => {}; LearningHistory.schedule = () => {};
    const writing = LearningHistory.record({subject:'math',question:'1+2',expected:'3',answer:'3',verdict:'correct'});
    LearningAccount.identity = {id:'other-id'};
    writing;`);
  await promise;
  assert.equal(run('saved.owner'), 'iris-id');
  assert.equal(run('saved.synced'), 0);
});

test('保存只在事务确认后成功；重试保留同一ID，冲突和读写失败不伪造成功', async () => {
  const run=history();
  run(`let savedRows=new Map();
    LearningHistory.transaction=async(names,mode,apply)=>{
      const requests=[]; let aborted=false;
      const store={get:key=>{const request={result:savedRows.get(key.join(':'))};requests.push(request);return request;},
        add:row=>savedRows.set(row.owner+':'+row.id,row)};
      apply({objectStore:()=>store,abort:()=>{aborted=true}});
      requests.forEach(request=>request.onsuccess());
      if(aborted) throw Error('conflict');
    };
    LearningHistory.render=()=>{};LearningHistory.schedule=()=>{};
    const detail={id:'stable-answer-00000001',occurred_at:'2026-10-01T12:00:00.123Z',subject:'math',question_id:'math_1_+_2',question:'1+2',expected:'3',answer:'3',verdict:'correct'};`);
  assert.equal(await run('LearningHistory.record(detail)'),true);
  assert.equal(await run('LearningHistory.record({...detail})'),true);
  assert.equal(run('savedRows.size'),1);
  assert.equal(await run("LearningHistory.record({...detail,answer:'4'})"),false);
  assert.equal(run('savedRows.size'),1);
  run("LearningHistory.transaction=async()=>{throw Error('quota')};");
  assert.equal(await run("LearningHistory.record({...detail,id:'stable-answer-00000002'})"),false);
  assert.equal(run('savedRows.size'),1);
});

test('事务已成功时刷新UI的异常不要求重写记录', async () => {
  const run=history();
  run(`LearningHistory.transaction=async()=>{};
    LearningHistory.render=()=>{throw Error('UI')};LearningHistory.schedule=()=>{};`);
  assert.equal(await run("LearningHistory.record({subject:'math'})"),true);
});

test('同步失败不把离线队列标记为已确认', async () => {
  const run = history();
  await assert.rejects(run(`LearningHistory.records = async () => [{id:'q',synced:0,event:{id:'q'}}];
    LearningAccount.request = async () => {throw Error('lost ACK')};
    LearningHistory.transaction = async () => {throw Error('should not mark saved')};
    LearningHistory.syncOwner('iris-id')`), /lost ACK/);
});
