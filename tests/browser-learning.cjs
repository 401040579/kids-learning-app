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
  const env = { ...process.env, LEARNING_DB: path.join(scratch, 'test.sqlite3'), LEARNING_DEVELOPMENT: '1', LEARNING_ORIGINS: origin };
  for (const name of ['iris', 'other']) {
    const provision = spawnSync(python, ['-m', 'backend.manage', 'create', name, '--name', name, '--password-stdin'], { cwd: root, env, input: password + '\n', encoding: 'utf8' });
    assert.equal(provision.status, 0, provision.stderr);
  }
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
    await context.addInitScript(() => localStorage.setItem('appLanguage', 'zh'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin);
    await page.waitForFunction(() => typeof LearningHistory !== 'undefined' && typeof RewardSystem !== 'undefined');
    await page.locator('#checkin-reminder-modal').waitFor({ state: 'visible' });
    await page.locator('.btn-checkin-later').click();
    await page.evaluate(() => {
      document.getElementById('checkin-reminder-modal')?.classList.add('hidden');
      navigateTo('profile');
    });
    return { context, page };
  }
  async function signIn(page, name = 'iris') {
    await page.locator('#account-username').fill(name);
    await page.locator('#account-password').fill(password);
    await page.locator('#account-form button').click();
    await page.waitForFunction(name => LearningAccount.identity?.username === name && !!LearningAccount.snapshot && !LearningAccount.busy, name);
    await page.evaluate(() => LearningHistory.sync());
  }
  async function count(page, expected) {
    await page.waitForFunction(async expected => (await LearningHistory.records()).length === expected, expected);
  }
  async function answer(page, label = 'offline') {
    await page.evaluate(label => LearningHistory.record({ subject: 'math', question_id: 'math_1_+_2', question: label, expected: '3', answer: '3', verdict: 'correct' }), label);
  }
  const guest = await device(false);
  await answer(guest.page, 'guest only');
  await count(guest.page, 1);
  assert.equal(await guest.page.locator('#account-form').isVisible(), false);
  const a = await device();
  await answer(a.page, 'before login');
  await signIn(a.page);
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
  await a.page.locator('#account-logout').click();
  await a.page.waitForFunction(() => !LearningAccount.identity && !LearningAccount.busy);
  await count(a.page, 1); // 恢复的是原访客记录。
  await signIn(a.page, 'other');
  await count(a.page, 0); // Iris 未上传队列不能发给 Other。
  await a.page.locator('#account-logout').click();
  await a.page.waitForFunction(() => !LearningAccount.identity && !LearningAccount.busy);
  await a.context.unroute(endpoint + '/api/learning/events');
  await signIn(a.page);
  await count(a.page, 6);
  await b.page.evaluate(() => LearningHistory.sync());
  await count(b.page, 6);
  await b.page.reload();
  await b.page.waitForFunction(() => LearningAccount.identity?.username === 'iris');
  await count(b.page, 6); // IndexedDB 与会话重新加载仍然正常。
  const downloadPromise = b.page.waitForEvent('download');
  await b.page.evaluate(() => { navigateTo('profile'); document.getElementById('science-feedback-modal')?.classList.add('hidden'); });
  await b.page.locator('#history-download').click();
  const download = await downloadPromise;
  await download.saveAs(path.join(scratch, 'history.json'));
  const exported = JSON.parse(fs.readFileSync(path.join(scratch, 'history.json')));
  assert.equal(exported.events.length, 6);
  assert.equal(exported.events.some(event => event.question === 'before login'), false);
  await b.page.screenshot({ path: path.join(scratch, 'history.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: ['guest isolation', 'four quiz hooks and duplicate guards', 'two devices', 'offline queue', 'lost acknowledgement replay', 'account switching', 'reload persistence', 'history export'], pageErrors: errors, screenshot: path.join(scratch, 'history.png') }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (api) api.kill('SIGTERM');
  server.close();
});
