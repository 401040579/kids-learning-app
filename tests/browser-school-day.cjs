// Chrome 手机尺寸、临时测试账号/SQLite、真实按钮与 PWA 升级。绝不连接生产 API。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),net=require('node:net');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'school-browser-'));
const evidence=process.env.SCHOOL_EVIDENCE_DIR||scratch;
fs.mkdirSync(evidence,{recursive:true});
const password='school-fixture-password-123456',python=process.env.LEARNING_TEST_PYTHON||path.join(root,'.venv/bin/python');
let baseline=false,browser,api,apiError='',passed=[];
const old=new Map();
for(const name of ['index.html','sw.js','js/homeScreen.js','js/analytics.js','js/locales/en.js','js/locales/zh.js']) {
  const r=spawnSync('git',['show','79d7057:'+name],{cwd:root});assert.equal(r.status,0);old.set('/'+name,r.stdout);
}
const server=http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);res.end();return;}
  if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const send=(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);};
  if(name==='/js/accountConfig.js')return send(null,Buffer.from('window.LEARNING_ACCOUNT_CONFIG={apiBase:'+JSON.stringify(endpoint)+'};'));
  if(baseline&&old.has(name))return send(null,old.get(name));fs.readFile(file,send);
});
let endpoint,origin;const errors=[],network=[];
const deadline=setTimeout(()=>{console.error('Browser validation exceeded 180 seconds');process.exitCode=1;browser?.close();api?.kill('SIGTERM');server.close();},180000);
async function ready(page){
  await page.waitForFunction(()=>typeof LearningAccount!=='undefined'&&LearningAccount.booted&&document.getElementById('profile-loading').hidden);
  if(!await page.evaluate(()=>DailyCheckin.isCheckedToday())){await page.locator('#checkin-reminder-modal').waitFor({state:'visible'});await page.locator('.btn-checkin-later').click();}
}
async function home(page){await page.locator('.nav-item').first().click();}
async function open(page){await home(page);await page.locator('[onclick="HomeScreen.launch(\'schoolDay\')"]').click();await page.locator('#school-day').waitFor({state:'visible'});}
async function parent(page){if(await page.locator('#sd-parent').textContent()==='家长管理')await page.locator('#sd-parent').click();}
async function tab(page,name){await page.locator('.sd-tabs [data-action="'+name+'"]').click();}
async function log(page,kind,title,minutes){
  await tab(page,'reading');await page.locator('#sd-kind').selectOption(kind);
  if(kind.startsWith('book-'))await page.locator('#sd-book').fill(title);
  await page.locator('#sd-minutes').fill(String(minutes));await page.locator('#sd-confirm').check();await page.locator('#sd-save-record').click();
  assert.match(await page.locator('#sd-status').textContent(),/已保存/);
}
async function auth(page,name){
  await page.locator('.nav-item').last().click();await page.locator('#account-username').fill(name);await page.locator('#account-password').fill(password);
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#account-form button').click()]);await ready(page);
}
async function logout(page){
  await page.locator('#sd-close').click();await page.locator('.nav-item').last().click();
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#account-logout').click()]);await ready(page);
}
async function caseOf(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));endpoint='http://127.0.0.1:'+port;
  const env={...process.env,LEARNING_DB:path.join(scratch,'test.sqlite3'),LEARNING_DEVELOPMENT:'1',LEARNING_ORIGINS:origin};
  for(const name of ['school-a','school-b']){const r=spawnSync(python,['-m','backend.manage','create',name,'--name',name,'--password-stdin'],{cwd:root,env,input:password+'\n',encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);}
  api=spawn(python,['-m','uvicorn','backend.service:create_app','--factory','--host','127.0.0.1','--port',String(port),'--no-access-log'],{cwd:root,env,stdio:['ignore','ignore','pipe']});api.stderr.on('data',d=>apiError+=d);
  for(let i=0;i<50;i++){try{if((await fetch(endpoint+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(api.exitCode,null,apiError);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  context.setDefaultTimeout(8000);context.setDefaultNavigationTimeout(15000);
  await context.route('**/*',route=>{const request=route.request(),url=request.url();network.push({url,body:request.postData()||''});return url.startsWith(origin+'/')||url.startsWith(endpoint+'/')?route.continue():route.abort();});
  await context.addInitScript(()=>{localStorage.setItem('appLanguage','zh');window.__schoolDoc=crypto.randomUUID();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(origin);await ready(page);await open(page);
  await caseOf('真实首页入口、手机布局与家长操作门槛',async()=>{
    assert.equal(await page.locator('#sd-manage-tab').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.getElementById('school-day').scrollWidth<=390),true);
    assert.equal(await page.evaluate(()=>SchoolDayStore.role),'child');
    await page.screenshot({path:path.join(evidence,'school-today-mobile.png')});
    await page.locator('.sd-goal').nth(1).locator('button').click();assert.equal(await page.locator('#sd-kind').inputValue(),'book-en');await tab(page,'today');
  });
  await caseOf('补记需确认，英文书籍与 iReady 不叠加且书籍列表不虚构',async()=>{
    await tab(page,'reading');await page.locator('#sd-book').fill('PRIVATE-SCHOOL-BOOK-CN');await page.locator('#sd-minutes').fill('10');
    await page.locator('#sd-save-record').click();assert.match(await page.locator('#sd-status').textContent(),/勾选/);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),0);
    await page.locator('#sd-confirm').check();await page.locator('#sd-save-record').click();
    await log(page,'book-en','PRIVATE-SCHOOL-BOOK-EN',4);await log(page,'iready-reading','',6);await log(page,'iready-math','',15);
    await tab(page,'today');assert.match(await page.locator('.sd-reading-goals').textContent(),/已确认 10 分钟/);
    assert.deepEqual(await page.evaluate(()=>SchoolDayStore.daily(SchoolDayStore.today())),{cn:10,en:10});
    await tab(page,'reading');assert.equal(await page.locator('#sd-month-list tbody tr').count(),2);
    assert.equal(await page.locator('#sd-month-list').textContent().then(v=>v.includes('iReady')),false);
  });
  await caseOf('保存配额失败保留输入和旧记录，重试与重复点击不重复入账',async()=>{
    await page.locator('#sd-book').fill('PRIVATE-SCHOOL-RETRY');await page.locator('#sd-minutes').fill('3');await page.locator('#sd-confirm').check();
    await page.evaluate(()=>{window.__originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith('school-day-local-v1'))throw new DOMException('full','QuotaExceededError');return window.__originalStorageSet.call(this,key,value);};});
    await page.locator('#sd-save-record').click();assert.match(await page.locator('#sd-status').textContent(),/没有保存成功/);assert.equal(await page.locator('#sd-book').inputValue(),'PRIVATE-SCHOOL-RETRY');
    assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),4);
    await page.evaluate(()=>{Storage.prototype.setItem=window.__originalStorageSet;});
    await page.locator('#sd-save-record').dblclick();assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),5);
  });
  await caseOf('真实计时、暂停、结束后确认，不自动计入记录',async()=>{
    await page.clock.install();await page.locator('#sd-book').fill('PRIVATE-TIMED-BOOK');await page.locator('#sd-start').click();
    await page.clock.fastForward(61000);await page.locator('#sd-pause').click();assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),5);
    await page.clock.fastForward(60000);assert.match(await page.locator('#sd-clock').textContent(),/01:0/);
    await page.locator('#sd-finish').click();assert.equal(await page.locator('#sd-minutes').inputValue(),'1');
    await page.locator('#sd-confirm').check();await page.locator('#sd-save-record').click();assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),6);
    await page.clock.resume();
  });
  await caseOf('家长修正、撤销与恢复，月度预览和打印',async()=>{
    await parent(page);assert.equal(await page.locator('#sd-manage-tab').isVisible(),true);
    const rows=page.locator('.sd-record-row');await rows.first().locator('[data-action="edit"]').click();await page.locator('#sd-minutes').fill('2');await page.locator('#sd-confirm').check();await page.locator('#sd-save-record').click();
    await rows.first().locator('[data-action="remove"]').click();assert.equal(await page.locator('#sd-month-list tbody tr').count(),3);
    await rows.first().locator('[data-action="undo"]').click();assert.equal(await page.locator('#sd-month-list tbody tr').count(),4);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#sd-print').isVisible(),true);assert.equal(await page.locator('.sd-header').isVisible(),false);
    await page.pdf({path:path.join(evidence,'school-reading-print.pdf'),format:'A4'});await page.emulateMedia({media:'screen'});
    await page.locator('#school-day').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:path.join(evidence,'school-reading-mobile.png')});
  });
  await caseOf('本机假期、星期模板、校内未知、家长提醒和档案切换',async()=>{
    await tab(page,'manage');await page.locator('#sd-food-note').fill('PRIVATE-FOOD-NOTE');await page.locator('[data-action="saveSettings"]').click();
    const dates=await page.evaluate(()=>({today:SchoolDayStore.today(),next:SchoolDayStore.nextSchoolDay(SchoolDayStore.today())}));
    await page.locator('#sd-holiday-from').fill(dates.next);await page.locator('#sd-holiday-to').fill(dates.next);await page.locator('[data-action="addHoliday"]').click();
    await page.locator('#sd-school-reading').fill('');await page.locator('#sd-school-math').fill('35');await page.locator('[data-action="saveSchoolMinutes"]').click();
    await page.locator('#sd-reminder-date').fill(dates.today);await page.locator('#sd-reminder-text').fill('PRIVATE-PICKUP-NOTE');await page.locator('[data-action="addReminder"]').click();
    await tab(page,'today');assert.equal(await page.evaluate(()=>SchoolDayStore.nextSchoolDay(SchoolDayStore.today())===SchoolDayStore.shift(SchoolDayStore.today(),1)),false);
    assert.match(await page.locator('#sd-content').textContent(),/PRIVATE-PICKUP-NOTE/);assert.match(await page.locator('#sd-content').textContent(),/校内 未知/);
    await tab(page,'manage');const original=await page.locator('#sd-profile').inputValue();await page.locator('#sd-new-profile').fill('Local test profile');await page.locator('[data-action="addProfile"]').click();
    assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),0);assert.equal(await page.evaluate(()=>SchoolDayStore.role),'child');
    await page.locator('#sd-profile').selectOption(original);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),6);
  });
  await caseOf('学校数据无网络载荷、无学习云备份及 Analytics 事件',async()=>{
    assert.equal(network.some(r=>(r.url+r.body).includes('PRIVATE-')),false);
    const checks=await page.evaluate(()=>{const before=window.dataLayer?.length||0;Analytics.sendEvent('school_private_test',{title:'PRIVATE-ANALYTICS'});return {before,after:window.dataLayer?.length||0,disabled:window['ga-disable-G-RCEWX2DDQQ'],backup:JSON.stringify(DataBackup.createLearning())};});
    assert.equal(checks.before,checks.after);assert.equal(checks.disabled,true);assert.equal(checks.backup.includes('PRIVATE-'),false);
    assert.equal(checks.backup.includes('school-day-local'),false);
  });
  await caseOf('独立本机备份导出/恢复，不覆盖旧档案，迟到恢复不能跨角色写入',async()=>{
    await parent(page);await tab(page,'manage');
    const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await downloadEvent;
    const file=path.join(scratch,'school-backup.json');await download.saveAs(file);const payload=JSON.parse(fs.readFileSync(file));
    assert.equal(payload.app,'kids-school-local');assert.equal(payload.profile.records.length,6);
    await page.locator('#sd-import').setInputFiles(file);await page.waitForFunction(()=>document.getElementById('sd-status').textContent.includes('已恢复'));
    assert.equal(await page.evaluate(()=>SchoolDayStore.read().profiles.length),3);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),6);
    await page.locator('#sd-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"app":"bad"}')});
    await page.waitForFunction(()=>document.getElementById('sd-status').textContent.includes('无法读取'));assert.equal(await page.evaluate(()=>SchoolDayStore.read().profiles.length),3);
    await page.evaluate(()=>{window.__originalFileText=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>window.__releaseSchoolFile=()=>window.__originalFileText.call(this).then(resolve));};});
    await page.locator('#sd-import').setInputFiles(file);await page.locator('#sd-parent').click();await page.evaluate(()=>window.__releaseSchoolFile());
    await page.waitForFunction(()=>document.getElementById('sd-status').textContent.includes('需要进入家长'));
    assert.equal(await page.evaluate(()=>SchoolDayStore.read().profiles.length),3);await page.evaluate(()=>File.prototype.text=window.__originalFileText);
  });
  await caseOf('真实账号登录/退出隔离学校记录，不将游客档案搬入账号',async()=>{
    await page.locator('#sd-close').click();await auth(page,'school-a');await open(page);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),0);
    await log(page,'book-en','PRIVATE-ACCOUNT-A',7);await logout(page);await open(page);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),6);
    await page.locator('#sd-close').click();await auth(page,'school-b');await open(page);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records.length),0);
    await logout(page);await page.locator('.nav-item').last().click();await auth(page,'school-a');await open(page);assert.equal(await page.evaluate(()=>SchoolDayStore.profile().records[0].title),'PRIVATE-ACCOUNT-A');
    assert.equal(await page.evaluate(()=>SchoolDayStore.role),'child');await logout(page);
  });
  await caseOf('320 手机与 768 平板布局，中英文入口和英语兜底',async()=>{
    await open(page);
    for(const width of [320,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(w=>document.getElementById('school-day').scrollWidth<=w,width),true);}
    await page.setViewportSize({width:390,height:844});await page.locator('#sd-close').click();await home(page);await page.locator('#header-lang-btn').click();await page.locator('#lang-dropdown [data-lang="en"]').click();
    await open(page);assert.equal(await page.locator('#sd-title').textContent(),'School day');await page.locator('#sd-close').click();await page.locator('#header-lang-btn').click();await page.locator('#lang-dropdown [data-lang="zh"]').click();
  });
  await caseOf('旧 v84 缓存实际升级到 v85，新增模块可离线冷启动和去重',async()=>{
    const upgrade=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});upgrade.setDefaultTimeout(10000);
    await upgrade.addInitScript(()=>localStorage.setItem('appLanguage','zh'));
    await upgrade.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith(endpoint+'/')?r.continue():r.abort());
    const p=await upgrade.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());baseline=true;
    await p.goto(origin);await ready(p);await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await ready(p);
    assert.equal(await p.evaluate(()=>caches.has('kids-learning-v84')),true);assert.equal(await p.locator('[onclick="HomeScreen.launch(\'schoolDay\')"]').count(),0);
    baseline=false;await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    await p.locator('#update-notification').waitFor({state:'visible'});await Promise.all([p.waitForEvent('domcontentloaded'),p.locator('.update-btn').click()]);await ready(p);
    assert.equal(await p.evaluate(()=>caches.has('kids-learning-v85')),true);assert.equal(await p.evaluate(()=>caches.has('kids-learning-v84')),false);
    await open(p);await log(p,'book-cn','PRIVATE-OFFLINE-BOOK',10);await p.locator('#sd-close').click();await upgrade.setOffline(true);
    await p.reload();await ready(p);await open(p);assert.equal(await p.evaluate(()=>SchoolDayStore.profile().records.length),1);
    await log(p,'book-en','PRIVATE-OFFLINE-EN',5);await p.reload();await ready(p);await open(p);assert.equal(await p.evaluate(()=>SchoolDayStore.profile().records.length),2);
    await upgrade.setOffline(false);await upgrade.close();
  });
  assert.deepEqual(errors,[]);assert.equal(network.some(r=>(r.url+r.body).includes('PRIVATE-')),false);
  fs.writeFileSync(path.join(evidence,'browser-school-result.json'),JSON.stringify({passed,pageErrors:errors,privatePayloads:0,viewport:'390x844',cacheUpgrade:'v84 -> v85',evidence},null,2));
  console.log(JSON.stringify({passed:passed.length,evidence,pageErrors:errors}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{clearTimeout(deadline);await browser?.close();api?.kill('SIGTERM');server.close();});
