// 真实 Chrome + 临时 FastAPI/SQLite。只使用测试账号，不连接真实服务。
// 需安装 Playwright；运行 node tests/browser-learning.cjs，Python 使用项目 .venv。
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const http = require('node:http'), net = require('node:net'), assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-browser-'));
const password = 'browser-fixture-password-123456';
const python = path.join(root, '.venv/bin/python');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (file === root) file = path.join(root, 'index.html');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
let api, browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const endpoint = `http://127.0.0.1:${port}`;
  const env = { ...process.env, LEARNING_DB: path.join(scratch, 'test.sqlite3'), LEARNING_DEVELOPMENT: '1', LEARNING_ORIGINS: origin, LEARNING_ROBOT_CONFIG:path.join(scratch,'bridge.json') };
  for (const name of ['iris', 'other']) {
    const provision = spawnSync(python, ['-m', 'backend.manage', 'create', name, '--name', name, '--password-stdin'], { cwd: root, env, input: password + '\n', encoding: 'utf8' });
    assert.equal(provision.status, 0, provision.stderr);
  }
  const fixture = spawnSync(python, ['-c', `
import os,json,sqlite3
from pathlib import Path
from backend.service import Store,Settings
root=Path(os.environ['LEARNING_DB']).parent
source=root/'tutor.db'
with sqlite3.connect(source) as db:
 db.execute('CREATE TABLE tutor_log(id INTEGER PRIMARY KEY,ts TEXT,serial TEXT,topic_id TEXT,question TEXT,expected TEXT,answer TEXT,verdict TEXT,event_id TEXT,occurred_at TEXT)')
(root/'topics.json').write_text(json.dumps({'version':'v1','topics':[]}))
with Store(Settings.environment().database).connection() as db:
 owner=db.execute("SELECT id FROM accounts WHERE username='iris'").fetchone()['id']
Path(os.environ['LEARNING_ROBOT_CONFIG']).write_text(json.dumps({'account_id':owner,'source':str(source),'taxonomy':str(root/'topics.json'),'plan_file':str(root/'plan.json')}))
`], {cwd:root,env,encoding:'utf8'});
  assert.equal(fixture.status,0,fixture.stderr);
  api = spawn(python, ['-m', 'uvicorn', 'backend.service:create_app', '--factory', '--host', '127.0.0.1', '--port', String(port), '--no-access-log'], { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let apiErrors = '';
  api.stderr.on('data', data => { apiErrors += data; });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(endpoint + '/api/health')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(api.exitCode, null, apiErrors);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  async function device(enabled = true) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url === origin + '/js/accountConfig.js') return route.fulfill({ contentType: 'application/javascript', body: `window.LEARNING_ACCOUNT_CONFIG=${JSON.stringify({ apiBase: enabled ? endpoint : '' })};` });
      return url.startsWith(origin + '/') || url.startsWith(endpoint + '/') ? route.continue() : route.abort();
    });
    await context.addInitScript(() => {
      window.__learningTestDocument = crypto.randomUUID();
      localStorage.setItem('appLanguage', 'zh');
      if (!localStorage.getItem('kidsLearningData')) localStorage.setItem('kidsLearningData','{"totalScore":80}');
      if (!localStorage.getItem('artworkGallery')) localStorage.setItem('artworkGallery','[{"id":"guest-art"}]');
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin);
    await page.waitForFunction(() => typeof LearningAccount !== 'undefined' && LearningAccount.booted && typeof LearningHistory !== 'undefined' && typeof RewardSystem !== 'undefined');
    await page.locator('#checkin-reminder-modal').waitFor({ state: 'visible' });
    await page.locator('.btn-checkin-later').click();
    await page.evaluate(() => {
      document.getElementById('checkin-reminder-modal')?.classList.add('hidden');
      navigateTo('profile');
    });
    return { context, page };
  }
  async function reloadAction(page, action) {
    const previous = await page.evaluate(() => window.__learningTestDocument);
    // 登录/退出先更新内存身份、随后才 reload；必须等新文档与存档初始化完成。
    try {
      await Promise.all([page.waitForEvent('domcontentloaded'), action()]);
    } catch (error) {
      console.error('Reload failed:', await page.evaluate(() => ({
        documentChanged: !!window.__learningTestDocument,
        busy: LearningAccount.busy, syncing: !!LearningAccount.profileSyncing,
        profileProblem: LearningAccount.profileProblem, frozen: AppStorage.blocked,
        revision: LearningAccount.snapshot?.revision, hasBackup: !!LearningAccount.snapshot?.backup,
        notice: document.getElementById('account-message')?.textContent,
        checkinReminder: !document.getElementById('checkin-reminder-modal').classList.contains('hidden')
      })));
      throw error;
    }
    await page.waitForFunction(previous => window.__learningTestDocument !== previous &&
      typeof LearningAccount !== 'undefined' && LearningAccount.booted && !LearningAccount.busy,
    previous);
  }
  async function signOut(page) {
    await reloadAction(page, () => page.locator('#account-logout').click());
    assert.equal(await page.evaluate(() => AppStorage.owner), 'guest');
    assert.equal(await page.evaluate(() => LearningAccount.identity), null);
  }
  async function signIn(page, name = 'iris') {
    await page.evaluate(() => navigateTo('profile'));
    await page.locator('#account-username').fill(name);
    await page.locator('#account-password').fill(password);
    await reloadAction(page, () => page.locator('#account-form button').click());
    await page.waitForFunction(name => LearningAccount.booted && LearningAccount.identity?.username === name && AppStorage.owner===LearningAccount.identity.id && !!LearningAccount.snapshot && !LearningAccount.busy, name);
    if (!await page.evaluate(() => DailyCheckin.isCheckedToday())) {
      await page.locator('#checkin-reminder-modal').waitFor({state:'visible'});
      await page.locator('.btn-checkin-later').click();
    }
    await page.evaluate(() => navigateTo('profile'));
    await page.evaluate(() => LearningHistory.sync());
  }
  async function count(page, expected) {
    let actual;
    for (let attempt=0; attempt<100; attempt++) {
      actual=await page.evaluate(async()=> (await LearningHistory.records()).length);
      if (actual===expected) return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(actual,expected,'IndexedDB record count');
  }
  async function answer(page, label = 'offline') {
    await page.evaluate(label => LearningHistory.record({ subject: 'math', question_id: 'math_1_+_2', question: label, expected: '3', answer: '3', verdict: 'correct' }), label);
  }
  async function verifyLearningFeatures(page) {
    await page.evaluate(async () => {
      const owner = LearningHistory.owner(), now = new Date();
      const base = { subject:'math',question_id:'math_1_+_2',question:'fixture',expected:'3',answer:'4',source:'web' };
      await LearningHistory.transaction(['events'], 'readwrite', tx => {
        for (const [id, subject, verdict, stamp] of [
          ['browser-old-answer','math','wrong',new Date(now.getTime()-40*86400000)],
          ['browser-noise-answer','science','unclear',now],
          ['browser-skip-answer','chinese','skipped',now]
        ]) tx.objectStore('events').add({owner,id,synced:0,event:{...base,id,subject,verdict,occurred_at:stamp.toISOString()}});
      });
      await showLearningReport('week');
    });
    assert.equal(await page.evaluate(() => LearningReport.activeReport.overview.total), 3);
    assert.equal(await page.evaluate(() => LearningReport.activeReport.overview.accuracy), 100);
    assert.match(await page.locator('#learning-report-content').innerText(), /奖励系统累计/);
    await page.locator('.report-period-btn[data-period="all"]').click();
    await page.waitForFunction(() => LearningReport.activeReport?.period === 'all');
    assert.equal(await page.evaluate(() => LearningReport.activeReport.overview.total), 4);
    assert.equal(await page.evaluate(() => LearningReport.activeReport.overview.accuracy), 50);
    await page.screenshot({path:path.join(scratch,'report.png'),fullPage:true});
    await page.evaluate(() => {closeLearningReport();showPictureBook();});
    await page.locator('.book-card').first().click();
    const book = await page.evaluate(() => PictureBook.currentBook.id);
    const points = await page.evaluate(() => RewardSystem.data.totalScore);
    assert.equal(await page.evaluate(id => PictureBook.bookProgress[id].completionCount,book), 0);
    await page.locator('#book-read-area .reading-nav-btn').last().click();
    await page.evaluate(() => closePictureBook());
    await page.evaluate(id => {showPictureBook();openBook(id);},book);
    assert.equal(await page.evaluate(() => PictureBook.currentPage), 1);
    const pages = await page.evaluate(() => PictureBook.currentBook.pages.length);
    for (let i=1;i<pages;i++) await page.locator('#book-read-area .reading-nav-btn').last().click();
    await page.locator('#book-complete-modal').waitFor({state:'visible'});
    await page.evaluate(() => {PictureBook.finishReading();PictureBook.finishReading();});
    assert.equal(await page.evaluate(() => RewardSystem.data.totalScore), points+15);
    assert.equal(await page.evaluate(() => PictureBook.completionHistory.length), 1);
    await page.locator('#reward-popup .btn-continue').click();
    await page.locator('#book-complete-modal [onclick="readBookAgain()"]').click();
    assert.equal(await page.evaluate(() => PictureBook.currentPage), 0);
    await page.evaluate(() => {closePictureBook();showPronunciation();});
    // 模拟浏览器识别器，覆盖实际录音按钮和事件回流，不请求麦克风或云识别。
    await page.evaluate(() => {
      Pronunciation.SpeechRecognitionClass = class {
        constructor(){window.__recognitionFixture=this;}
        start(){} stop(){} abort(){}
      };
      startPronunciationPractice('words');
    });
    await page.locator('#btn-record').click();
    await page.evaluate(() => window.__recognitionFixture.onresult({resultIndex:0,results:[[{transcript:'电视天气预报',confidence:1}]]}));
    assert.equal(await page.evaluate(() => Pronunciation.stats.matchedAttempts), 0);
    assert.match(await page.locator('#practice-result').innerText(), /这次不计分/);
    await page.evaluate(() => tryAgain());
    await page.locator('#btn-record').click();
    await page.evaluate(() => window.__recognitionFixture.onresult({resultIndex:0,results:[[{transcript:Pronunciation.practices.words[0].text,confidence:1}]]}));
    assert.equal(await page.evaluate(() => Pronunciation.stats.matchedAttempts), 1);
    assert.match(await page.locator('#practice-result').innerText(), /不是发音分数/);
    await page.locator('#reward-popup .btn-continue').click();
    const items=await page.evaluate(() => Pronunciation.practices.words.length);
    for(let i=0;i<items;i++)await page.locator('#pronunciation-practice-area .btn-next').click();
    await page.locator('#pronunciation-complete-modal').waitFor({state:'visible'});
    assert.equal(await page.locator('#pronunciation-reward').innerText(), '+10 积分');
    await page.evaluate(() => {closePronunciationComplete();closePronunciation();showLearningPet();});
    await page.locator('.pet-type-card').first().click();
    await page.locator('#pet-name-input').fill('测试宠物');
    await page.locator('.btn-adopt-pet').click();
    await page.locator('#pet-main-area').waitFor({state:'visible'});
    await page.evaluate(() => {showPetMessage('测试消息');showPetAccessories();});
    assert.equal(await page.locator('#pet-message .message-text').innerText(), '测试消息');
    assert.match(await page.locator('#accessories-list').innerText(), /还没有装饰品/);
    await page.evaluate(() => {closePetAccessories();closeLearningPet();});
    await page.evaluate(() => {openMusic();MusicApp.MAX_RECORDING_MS=3000;MusicApp.startRecording();});
    await page.locator('.piano-key[data-index="0"]').click();
    await page.locator('.piano-key[data-index="2"]').click();
    await page.waitForFunction(() => !MusicApp.recorder.isRecording);
    assert.equal(await page.evaluate(() => MusicApp.recorder.events.length),2);
    await page.locator('#music-modal .btn-save').click();
    assert.equal(await page.evaluate(() => JSON.parse(AppStorage.getItem('musicCompositions'))[0].events.length),2);
    await page.reload();
    await page.waitForFunction(() => LearningAccount.booted);
    await page.locator('#checkin-reminder-modal').waitFor({state:'visible'});
    await page.locator('.btn-checkin-later').click();
    await page.evaluate(() => openMusic());
    await page.locator('#music-open-saved').click();
    assert.equal(await page.evaluate(() => MusicApp.recorder.events.length),2);
    await page.screenshot({path:path.join(scratch,'music.png'),fullPage:true});
    await page.evaluate(() => closeMusic());
    // 假通知服务固定业务失败，不触达任何真实 Bark 设备。
    await page.context().route('https://notification-fixture.invalid/**', route => route.fulfill({status:200,contentType:'application/json',body:'{"code":500}'}));
    await page.evaluate(() => {ParentNotify.config.enabled=true;ParentNotify.config.dadBarkUrl='https://notification-fixture.invalid/test/';ParentNotify.config.momBarkUrl='';});
    assert.equal(await page.evaluate(() => triggerSOS()),false);
    assert.match(await page.locator('.music-toast').last().innerText(),/无法确认求助/);
    assert.equal(await page.evaluate(() => ParentNotify.sosPending),false);
    await page.evaluate(() => {ParentNotify.config.enabled=false;ParentNotify.config.dadBarkUrl='';});
  }
  const guest = await device(false);
  await answer(guest.page, 'guest only');
  await count(guest.page, 1);
  assert.equal(await guest.page.locator('#account-form').isVisible(), false);
  await verifyLearningFeatures(guest.page);
  const a = await device();
  await answer(a.page, 'before login');
  await signIn(a.page);
  assert.equal(await a.page.evaluate(()=>RewardSystem.data.totalScore),0);
  await count(a.page, 0); // 游客历史没有迁移。
  await a.page.evaluate(() => {
    generateMathQuestion();
    const math = [...document.querySelectorAll('#math-options button')].find(button => Number(button.textContent) === mathAnswer);
    math.click(); math.click();
    generateEnglishQuestion();
    const english = [...document.querySelectorAll('#english-options button')].find(button => button.textContent === currentEnglishWord.meaning);
    english.click(); english.click();
    generateChineseQuestion();
    const chinese = [...document.querySelectorAll('#chinese-options button')].find(button => button.textContent === currentChineseChar.correct);
    chinese.click(); chinese.click();
    selectScienceTheme('animal');
    const science = [...document.querySelectorAll('#science-options button')].find(button => button.querySelector('.option-text').textContent === currentScienceQuestion.options.find(option => option.id === currentScienceQuestion.answer).text);
    science.click(); science.click();
  });
  await count(a.page, 4);
  await a.page.evaluate(() => LearningHistory.sync());
  const b = await device();
  await signIn(b.page);
  await count(b.page, 4);
  await a.page.locator('#science-feedback-modal').waitFor({ state: 'visible' });
  await a.page.locator('#btn-continue-science').click();
  await a.page.locator('#reward-popup .btn-continue').click();
  await a.context.setOffline(true);
  await answer(a.page);
  await count(a.page, 5);
  assert.equal(await a.page.evaluate(async () => (await LearningHistory.records()).filter(row => !row.synced).length), 1);
  await a.context.setOffline(false);
  let loseAck = true;
  await a.context.route(endpoint + '/api/learning/events', async route => {
    if (route.request().method() === 'POST' && loseAck) {
      loseAck = false;
      const response = await route.fetch(); // 服务端成功提交，但客户端没收到应答。
      assert.equal(response.status(), 200);
      return route.abort();
    }
    return route.continue();
  });
  await a.page.evaluate(() => LearningHistory.sync());
  await a.page.evaluate(() => LearningHistory.sync());
  await b.page.evaluate(() => LearningHistory.sync());
  await count(b.page, 5); // 重传没有多记一次。
  await a.context.unroute(endpoint + '/api/learning/events');
  await a.context.route(endpoint + '/api/learning/events', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await answer(a.page, 'belongs to iris');
  await signOut(a.page);
  await count(a.page, 1); // 恢复的是原访客记录。
  await signIn(a.page, 'other');
  await count(a.page, 0); // Iris 未上传队列不能发给 Other。
  await signOut(a.page);
  await a.context.unroute(endpoint + '/api/learning/events');
  await signIn(a.page);
  await count(a.page, 6);
  await b.page.evaluate(() => LearningHistory.sync());
  await count(b.page, 6);
  await b.page.reload();
  await b.page.waitForFunction(() => LearningAccount.booted && LearningAccount.identity?.username === 'iris' && AppStorage.owner === LearningAccount.identity.id);
  if (!await b.page.evaluate(() => DailyCheckin.isCheckedToday())) {
    await b.page.locator('#checkin-reminder-modal').waitFor({state:'visible'});
    await b.page.locator('.btn-checkin-later').click();
  }
  await count(b.page, 6); // IndexedDB 与会话重新加载仍然正常。
  // 同一浏览器的第二标签页只能提示重载，不能并发改当前账号存档。
  const duplicate = await a.context.newPage();
  duplicate.on('pageerror', error=>errors.push(error.message));
  await duplicate.goto(origin);
  await duplicate.waitForFunction(()=>LearningAccount.booted && AppStorage.blocked);
  assert.equal(await duplicate.locator('#profile-loading').isVisible(),true);
  assert.equal(await duplicate.evaluate(()=>{try{AppStorage.setItem('kidsProfileData','{"name":"collision"}');return false;}catch{return true;}}),true);
  await duplicate.close();
  // 真实模块计分进入账号分区，旧游客积分与画作保持原样。
  assert.equal(await a.page.evaluate(()=>JSON.parse(localStorage.getItem('kidsLearningData')).totalScore),80);
  await a.page.evaluate(()=>AppStorage.setItem('artworkGallery','[{"id":"iris-art"}]'));
  await a.page.evaluate(()=>LearningAccount.save());
  const expectedScore=await a.page.evaluate(()=>JSON.parse(AppStorage.getItem('kidsLearningData')).totalScore);
  const c=await device();
  await signIn(c.page);
  assert.equal(await c.page.evaluate(()=>RewardSystem.data.totalScore),expectedScore);
  assert.equal(await c.page.evaluate(()=>JSON.parse(AppStorage.getItem('artworkGallery'))[0].id),'iris-art');
  await b.page.evaluate(()=>{
    LearningAccount.profileProblem='';
    AppStorage.setItem('kidsLearningData','{"totalScore":601}');
    return LearningAccount.syncProfile();
  });
  assert.equal(await b.page.evaluate(()=>JSON.parse(AppStorage.getItem('kidsLearningData')).totalScore),601);
  assert.match(await b.page.evaluate(()=>LearningAccount.profileProblem),/不同版本|different version/);
  await b.page.evaluate(()=>navigateTo('profile'));
  await reloadAction(b.page, () => b.page.locator('#account-use-cloud').click());
  await b.page.waitForFunction(score=>LearningAccount.booted&&RewardSystem.data.totalScore===score,expectedScore);
  assert.equal(await b.page.evaluate(()=>JSON.parse(AppStorage.getItem('artworkGallery'))[0].id),'iris-art');
  if (!await b.page.evaluate(()=>DailyCheckin.isCheckedToday())) {
    await b.page.locator('#checkin-reminder-modal').waitFor({state:'visible'});
    await b.page.locator('.btn-checkin-later').click();
  }
  const downloadPromise = b.page.waitForEvent('download');
  await b.page.evaluate(() => { navigateTo('profile'); document.getElementById('science-feedback-modal')?.classList.add('hidden'); });
  await b.page.locator('#history-download').click();
  const download = await downloadPromise;
  await download.saveAs(path.join(scratch, 'history.json'));
  const exported = JSON.parse(fs.readFileSync(path.join(scratch, 'history.json')));
  assert.equal(exported.events.length, 6);
  assert.equal(exported.events.some(event => event.question === 'before login'), false);
  // 网页真错题 → 私有机器人题单 → 受信日志导入 → 另一设备报告与题单更新。
  await b.page.evaluate(()=>LearningHistory.record({subject:'math',question_id:'math_1_+_2',question:'1 + 2 = ?',expected:'3',answer:'4',verdict:'wrong'}));
  await b.page.evaluate(()=>LearningHistory.sync());
  await b.page.evaluate(()=>LearningPlan.refresh());
  await b.page.locator('#plan-list button').waitFor({state:'visible'});
  assert.equal(await b.page.locator('#plan-list li').count(),1);
  await b.page.locator('#plan-list button').click();
  assert.equal(await b.page.evaluate(()=>currentMathQuestion.questionId),'math_1_+_2');
  const imported=spawnSync(python,['-c',`
import os,sqlite3,uuid
from datetime import datetime,timezone
from pathlib import Path
from backend.service import Store,Settings
from backend.tutor_bridge import TutorBridge
with sqlite3.connect(Path(os.environ['LEARNING_DB']).parent/'tutor.db') as db:
 db.execute('INSERT INTO tutor_log(serial,topic_id,question,expected,answer,verdict,event_id,occurred_at) VALUES (?,?,?,?,?,?,?,?)',('0dd1a5e9','web:math_1_+_2','1加2等于多少？','3','三','correct',uuid.uuid4().hex,datetime.now(timezone.utc).isoformat()))
TutorBridge(Store(Settings.environment().database)).tick()
`],{cwd:root,env,encoding:'utf8'});
  assert.equal(imported.status,0,imported.stderr);
  await b.page.evaluate(()=>LearningHistory.sync());
  await count(b.page,8);
  await b.page.evaluate(()=>LearningPlan.refresh());
  assert.equal(await b.page.locator('#plan-list li').count(),0);
  await b.page.evaluate(()=>navigateTo('profile'));
  assert.match(await b.page.locator('#history-latest').innerText(),/Jarvis/);
  await c.page.evaluate(()=>LearningHistory.sync());
  await count(c.page,8);
  await b.page.waitForFunction(()=>getComputedStyle(document.getElementById('page-profile')).opacity==='1');
  await b.page.screenshot({ path: path.join(scratch, 'history.png'), fullPage: true });
  // 短课真实按钮：游客离线、提示、保存失败重试、跳过、每日上限与阅读理解。
  const lesson = await device(false);
  await lesson.page.evaluate(() => navigateTo('home'));
  const startBounds=await lesson.page.locator('#study-start').boundingBox();
  assert.ok(startBounds.width>=100&&startBounds.height<90);
  await lesson.page.locator('#study-start').click();
  await lesson.page.locator('#study-choices button').first().waitFor({state:'visible'});
  await lesson.page.screenshot({path:path.join(scratch,'study.png')});
  await lesson.context.setOffline(true);
  await lesson.page.locator('#study-hint-button').click();
  let lessonAnswer = await lesson.page.evaluate(() => StudySession.current.questions[StudySession.current.index].expected);
  await lesson.page.locator('#study-choices button').filter({hasText:new RegExp('^'+lessonAnswer+'$')}).click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await count(lesson.page,1);
  assert.equal(await lesson.page.evaluate(async()=>(await LearningHistory.records())[0].event.hint_used),true);
  await lesson.page.locator('#study-next').click();
  await lesson.page.evaluate(() => {
    window.__originalHistoryTransaction=LearningHistory.transaction;
    let failed=false;
    LearningHistory.transaction=function(names,mode,run){
      if(mode==='readwrite'&&!failed){failed=true;return Promise.reject(Error('simulated quota'));}
      return window.__originalHistoryTransaction.call(this,names,mode,run);
    };
  });
  lessonAnswer = await lesson.page.evaluate(() => {const q=StudySession.current.questions[StudySession.current.index];return q.choices.find(c=>c!==q.expected);});
  await lesson.page.locator('#study-choices button').filter({hasText:new RegExp('^'+lessonAnswer+'$')}).click();
  await lesson.page.locator('#study-retry').waitFor({state:'visible'});
  const failedId = await lesson.page.evaluate(() => StudySession.current.pending.detail.id);
  await count(lesson.page,1);
  await lesson.page.locator('#study-retry').click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await count(lesson.page,2);
  assert.equal(await lesson.page.evaluate(()=>StudySession.current.pending.detail.id),failedId);
  await lesson.page.locator('#study-next').click();
  await lesson.page.locator('#study-skip').click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await lesson.page.locator('#study-next').click();
  lessonAnswer = await lesson.page.evaluate(() => StudySession.current.questions[StudySession.current.index].expected);
  await lesson.page.locator('#study-choices button').filter({hasText:new RegExp('^'+lessonAnswer+'$')}).click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await lesson.page.locator('#study-next').click();
  await lesson.page.locator('#study-close').waitFor({state:'visible'});
  await count(lesson.page,4);
  assert.match(await lesson.page.locator('#study-summary').innerText(),/保存了 4 条/);
  await lesson.page.locator('#study-close').click();
  await lesson.page.locator('#study-start').click();
  await lesson.page.waitForFunction(()=>StudySession.current?.reason==='empty'&&!StudySession.creating);
  assert.equal(await lesson.page.evaluate(()=>StudySession.current.questions.length),0);
  await lesson.page.locator('#study-close').click();
  await lesson.context.setOffline(false);
  await lesson.page.evaluate(()=>{showPictureBook();});
  await lesson.page.locator('.book-card').first().click();
  const readingBook=await lesson.page.evaluate(()=>PictureBook.currentBook.id);
  const readingPages=await lesson.page.evaluate(()=>PictureBook.currentBook.pages.length);
  for(let i=0;i<readingPages;i++) await lesson.page.locator('#book-read-area .reading-nav-btn').last().click();
  await lesson.page.locator('#book-complete-modal').waitFor({state:'visible'});
  await lesson.page.locator('#reward-popup .btn-continue').click();
  const completionId=await lesson.page.evaluate(()=>PictureBook.bookProgress[PictureBook.currentBook.id].activeSession.id);
  await lesson.page.locator('#book-understanding-start').click();
  await lesson.page.locator('#study-choices button').first().waitFor({state:'visible'});
  await lesson.page.locator('#study-reference-button').click();
  assert.match(await lesson.page.locator('#study-reference').innerText(),/小猪/);
  lessonAnswer=await lesson.page.evaluate(()=>StudySession.current.questions[0].expected);
  await lesson.page.locator('#study-choices button').filter({hasText:new RegExp('^'+lessonAnswer+'$')}).click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await lesson.page.locator('#study-next').click();
  lessonAnswer=await lesson.page.evaluate(()=>StudySession.current.questions[StudySession.current.index].expected);
  await lesson.page.locator('#study-choices button').filter({hasText:new RegExp('^'+lessonAnswer+'$')}).click();
  await lesson.page.locator('#study-next').waitFor({state:'visible'});
  await lesson.page.locator('#study-next').click();
  await count(lesson.page,6);
  await lesson.page.locator('#study-close').click();
  await lesson.page.reload();
  await lesson.page.waitForFunction(()=>LearningAccount.booted&&StudySession.initialized);
  await lesson.page.locator('.btn-checkin-later').click();
  // 已保存完成会话保持不变；重新载入只恢复理解入口，不新开阅读会话。
  const resumed=await lesson.page.evaluate(async({readingBook,completionId})=>{
    PictureBook.currentBook=PictureBook.books.find(book=>book.id===readingBook);
    return StudySession.startReading(readingBook,completionId);
  },{readingBook,completionId});
  assert.equal(resumed,true);
  await lesson.page.locator('#study-close').waitFor({state:'visible'});
  assert.equal(await lesson.page.evaluate(()=>StudySession.current.questions.length),0);
  await count(lesson.page,6);
  await lesson.page.locator('#study-close').click();
  await lesson.page.evaluate(()=>showLearningReport());
  await lesson.page.waitForFunction(()=>LearningReport.activeReport?.overview.total===6);
  await lesson.page.waitForFunction(()=>document.querySelector('.learning-report-modal-content').getBoundingClientRect().width>300 && document.querySelector('.learning-report-modal-content').getAnimations().every(animation=>animation.playState==='finished'));
  assert.match(await lesson.page.locator('#learning-report-content').innerText(),/提示后答对|看过提示/);
  await lesson.page.screenshot({path:path.join(scratch,'study-report.png')});
  await lesson.context.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: ['guest isolation', 'four quiz hooks and duplicate guards', 'two devices', 'offline queue', 'lost acknowledgement replay', 'account switching', 'reload persistence', 'history export', 'full profile cold restore', 'profile conflict preserves local data', 'cloud choice restores score and artwork', 'web wrong to robot review to cross-device report', 'same-account tab write lock', 'period reports use real events', 'book resume and completion rewards', 'honest word matching feedback', 'single module button entrypoints', 'recording deadline and saved performance restore', 'SOS failed service feedback', 'offline daily lesson with hint evidence', 'idempotent answer retry after storage failure', 'daily question budget and skip', 'optional reading comprehension with reference', 'reading completion deduplicates after reload', 'parent course evidence report'], pageErrors: errors, screenshot: path.join(scratch, 'history.png'), reportScreenshot:path.join(scratch,'report.png'),musicScreenshot:path.join(scratch,'music.png'),studyScreenshot:path.join(scratch,'study.png'),studyReportScreenshot:path.join(scratch,'study-report.png') }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (api) api.kill('SIGTERM');
  server.close();
});
