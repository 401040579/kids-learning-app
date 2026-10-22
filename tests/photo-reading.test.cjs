const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function app(){
  const c=vm.createContext({console,structuredClone,crypto,AbortController,URL,Blob,setTimeout,clearTimeout,
    navigator:{onLine:true},document:{hidden:false,addEventListener(){},activeElement:null},LearningAccount:{identity:{id:'reader',display_name:'Reader'}},I18n:{t:k=>k}});
  vm.runInContext(fs.readFileSync('js/photoLibrary.js','utf8')+'\n'+fs.readFileSync('js/photoReading.js','utf8'),c);
  c.run=src=>vm.runInContext(src,c);
  c.run(`PhotoReading.isOpen=true;PhotoReading.el=()=>({disabled:false,textContent:''});PhotoReading.renderBook=()=>{};
    PhotoReading.bookStatus=(k)=>{PhotoReading.lastStatus=k;};PhotoReading.library=()=>{};PhotoReading.offlineState=()=>{};
    PhotoLibrary.audio=async()=>undefined;PhotoLibrary.saveAudio=async()=>{};PhotoLibrary.save=async()=>{};`);
  return c;
}
const row={text:'First.',language:'en-US'};

test('foreground joins the same in-flight preload; local audio avoids network',async()=>{
  const a=app(),hold=deferred();let calls=0,writes=0;
  a.hold=hold.promise;a.call=()=>calls++;a.save=()=>writes++;
  a.run(`PhotoReading.request=async()=>{call();return hold;};PhotoLibrary.saveAudio=async()=>save();`);
  a.row=row;
  const first=a.run('PhotoReading.ensureAudio(row,0)'),second=a.run('PhotoReading.ensureAudio(row,2)');
  assert.equal(first,second);await new Promise(setImmediate);assert.equal(calls,1);
  hold.resolve(new Blob(['audio']));await first;assert.equal(writes,1);
  a.run(`PhotoLibrary.audio=async()=>new Blob(['cached']);`);
  await a.run('PhotoReading.ensureAudio(row,2)');assert.equal(calls,1);
});

test('new foreground sentence aborts a different slow preload and runs next',async()=>{
  const a=app();let started=deferred(),calls=[];a.started=()=>started.resolve();a.call=text=>calls.push(text);
  a.run(`PhotoReading.request=(path,body,{controller})=>{
    call(body.text);if(body.text==='First.')return new Promise((resolve,reject)=>{started();controller.signal.addEventListener('abort',()=>reject(Error('aborted')));});
    return Promise.resolve(new Blob(['next']));};`);
  a.row=row;
  const old=a.run('PhotoReading.ensureAudio(row,0)').catch(()=>false);await started.promise;
  a.run(`PhotoReading.prioritizeSpeech(PhotoLibrary.key({text:'Next.',language:'en-US'}));`);
  await a.run(`PhotoReading.ensureAudio({text:'Next.',language:'en-US'},2)`);
  assert.equal(await old,false);assert.deepEqual(calls,['First.','Next.']);
});

test('account change during a pending local read cannot start speech or write audio',async()=>{
  const a=app(),hold=deferred();let calls=0,writes=0;
  a.hold=hold.promise;a.call=()=>calls++;a.save=()=>writes++;a.row=row;
  a.run(`PhotoLibrary.audio=()=>hold;PhotoReading.request=async()=>{call();return new Blob(['audio']);};PhotoLibrary.saveAudio=async()=>save();`);
  const work=a.run('PhotoReading.ensureAudio(row,0)').catch(()=>false);
  a.run(`LearningAccount.identity={id:'other'};PhotoReading.cancelSpeech();`);hold.resolve();
  assert.equal(await work,false);await new Promise(setImmediate);assert.equal(calls,0);assert.equal(writes,0);
});

test('preload remains bounded to two sentences and stops offline or hidden',async()=>{
  const a=app(),seen=[];a.see=text=>seen.push(text);
  a.run(`PhotoReading.ensureAudio=async r=>see(r.text);PhotoReading.preload({state:'ready',sentences:[{text:'1'},{text:'2'},{text:'3'},{text:'4'}]},1);`);
  assert.deepEqual(seen,['2','3']);
  a.run(`navigator.onLine=false;PhotoReading.preload({state:'ready',sentences:[{text:'5'}]},0);navigator.onLine=true;document.hidden=true;PhotoReading.preload({state:'ready',sentences:[{text:'6'}]},0);`);
  assert.deepEqual(seen,['2','3']);
});

test('offline readiness is recomputed from actual audio, not a saved flag',async()=>{
  const a=app();a.book={owner:'reader',pages:[{state:'ready',image:'data:photo',sentences:[row]}]};
  a.run(`PhotoLibrary.audioKeys=async()=>new Set();`);assert.equal(await a.run('PhotoLibrary.complete(book)'),false);
  a.run(`PhotoLibrary.audioKeys=async()=>new Set([PhotoLibrary.key(book.pages[0].sentences[0])]);`);assert.equal(await a.run('PhotoLibrary.complete(book)'),true);
  a.book.pages[0].state='pending';assert.equal(await a.run('PhotoLibrary.complete(book)'),false);
});

test('cloud save freezes each attempt and preserves edits made during upload',async()=>{
  const a=app(),first=deferred(),started=deferred(),sent=[];a.started=()=>started.resolve();a.first=first.promise;
  a.send=body=>sent.push(structuredClone(body));
  a.run(`PhotoReading.book={owner:'reader',id:'book-id',title:'Original',pages:[],revision:0,generation:1,dirty:true};
    PhotoReading.request=async(path,body)=>{send(body);if(body.revision===0){started();return first;}return{revision:2};};`);
  const work=a.run('PhotoReading.syncBook()');await started.promise;
  a.run(`PhotoReading.book.title='Edited';PhotoReading.book.generation++;`);
  first.resolve({revision:1});await work;
  assert.equal(sent.length,2);assert.equal(sent[0].title,'Original');assert.equal(sent[1].title,'Edited');assert.equal(sent[1].revision,1);
  assert.equal(a.run('PhotoReading.book.dirty'),false);assert.equal(a.run('PhotoReading.book.revision'),2);
});

test('unknown save response reuses the exact mutation; conflicts keep dirty local content',async()=>{
  const a=app(),sent=[];a.send=body=>sent.push(structuredClone(body));
  a.run(`PhotoReading.book={owner:'reader',id:'book-id',title:'Keep',pages:[],revision:0,generation:1,dirty:true};
    PhotoReading.request=async(path,body)=>{send(body);throw Object.assign(Error(),{code:'offline'});};`);
  await a.run('PhotoReading.syncBook()');assert.equal(a.run('PhotoReading.book.dirty'),true);
  a.run(`PhotoReading.request=async(path,body)=>{send(body);throw Object.assign(Error(),{code:'bookConflict'});};`);
  await a.run('PhotoReading.syncBook()');assert.deepEqual(sent[0],sent[1]);assert.equal(a.run('PhotoReading.book.dirty'),true);
  assert.equal(a.run('PhotoReading.lastStatus'),'bookConflict');
});

test('retry recovers a failed local write before syncing; no cloud success when storage still fails',async()=>{
  const a=app();let calls=0;a.call=()=>calls++;
  a.run(`PhotoReading.book={owner:'reader',id:'book-id',title:'Keep',pages:[],revision:0,generation:1,dirty:true};
    PhotoLibrary.writes=Promise.reject(Error('full'));PhotoLibrary.writes.catch(()=>{});
    PhotoLibrary.save=async()=>{throw Error('full');};PhotoReading.request=async()=>{call();return{revision:1};};`);
  await a.run('PhotoReading.syncBook()');assert.equal(calls,0);assert.equal(a.run('PhotoReading.book.dirty'),true);
  a.run('PhotoLibrary.save=async()=>{};');await a.run('PhotoReading.syncBook()');assert.equal(calls,1);assert.equal(a.run('PhotoReading.book.dirty'),false);
});
