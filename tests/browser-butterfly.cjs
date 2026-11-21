// 本地运行：node tests/browser-butterfly.cjs。也可传入已部署的站点 URL。
// 使用空白游客浏览器。可通过 BROWSER=webkit 复核触屏交互。
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');

async function serve() {
  const root = path.resolve(__dirname, '..');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
    try {
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function run() {
  const server = process.argv[2] ? null : await serve();
  const site = new URL(process.argv[2] || 'http://127.0.0.1:' + server.address().port + '/');
  const browser = process.env.BROWSER === 'webkit'
    ? await webkit.launch()
    : await chromium.launch({ channel: 'chrome' });
  try {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => {
      // WebKit 把主动断网时的 CORS、manifest 及资源加载失败也当作页面异常。
      const blockedNetwork = /due to access control checks|manifest\.json|^TypeError: Load failed$/.test(error.message);
      if (process.env.BROWSER !== 'webkit' || !blockedNetwork || /butterflyDance\.js/.test(error.stack)) {
        errors.push(error.message);
      }
    });
    // 所有游戏资源都应从同源静态站取用，测试不需要账号或第三方服务。
    context.setDefaultTimeout(15000);
    await context.route(url => url.origin !== site.origin, route => route.abort());
    await page.addInitScript(() => localStorage.setItem('appLanguage', 'zh'));
    await page.goto(site.href);
    await page.locator('button[onclick*=butterflyDance]').waitFor({ state: 'attached' });
    await page.locator('.home-tab').nth(2).tap();
    await page.waitForFunction(() => {
      const pager = document.querySelector('#home-pager');
      return pager.scrollLeft === 2 * pager.clientWidth;
    });
    await page.locator('button[onclick*=butterflyDance]').tap();

    const dialog = page.locator('#butterfly-dance');
    const play = dialog.locator('.bd-play');
    const act = i => dialog.locator('[data-act="' + i + '"]').tap();
    const add = move => dialog.locator('[data-add="' + move + '"]').tap();
    const cue = text => page.waitForFunction(text =>
      document.querySelector('.bd-cue').textContent.includes(text), text, { timeout: 8000 });
    async function perform(moves, expected) {
      for (const move of moves) await add(move);
      await play.tap();
      await cue(expected);
    }

    await cue('从左到右');
    assert(await play.isDisabled());
    await perform(['cha', 'cha'], '第 1 步试试');
    await perform(['jump'], '鼓掌');
    await play.tap();
    await perform(['cha', 'jump', 'cha'], '鼓掌');
    await play.tap();
    await perform(['jump', 'flip', 'cha', 'flip'], '鼓掌');
    await play.tap();
    await perform(['flip', 'cha', 'jump', 'flip'], '你的舞编好');
    await dialog.locator('[data-slot="2"]').tap();
    await perform(['cha'], '第 1 步');
    await play.tap();
    await cue('准备好');
    await play.tap();
    await cue('第 1 步');
    await dialog.locator('[data-bd="close"]').tap();
    await dialog.waitFor({ state: 'hidden' });
    await page.locator('.recent-item[onclick*=butterflyDance]').click();
    await cue('从左到右');

    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [768, 1024]]) {
      await page.setViewportSize({ width, height });
      assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), '横向溢出 ' + width);
      await dialog.locator('[data-bd="sound"]').tap();
      await add('jump');
      await act(0);
    }
    await dialog.locator('[data-bd="close"]').tap();
    await page.goto(new URL('#butterfly-dance', site).href);
    await dialog.waitFor();
    await cue('从左到右');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => !!(await caches.match('/icons/butterfly/lagoon.webp')));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cue('从左到右');
    if (server) {
      // 停掉静态源站，实际断开回源，浏览器只能从已安装的 SW 取回游戏。
      server.close();
      server.closeAllConnections();
    } else {
      await context.setOffline(true);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dialog.waitFor();
    await perform(['jump', 'cha'], '鼓掌');
    assert.deepEqual(errors, []);
    console.log('通过：入口、三幕挑战、自由编舞、改步、停止、最近使用、四种尺寸、直达链接与离线演出。');
  } finally {
    if (server?.listening) server.close();
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
