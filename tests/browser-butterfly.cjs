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
    const {solve} = require('./butterfly-solver.cjs');
    const trail = require('../js/butterflyTrail.js');
    const map = dialog.locator('.bt-map');
    const paint = async (tool,key) => {
      await map.locator('[data-tool="'+tool+'"]').click();
      await map.locator('[data-cell="'+key+'"]').click();
    };
    const startTrail = () => map.locator('[data-map="run"]').click();
    await map.waitFor();
    await page.clock.install();
    // 初次尝试停在缺块的位置，然后真正从工具盘拖到起点。
    await startTrail();
    await page.clock.fastForward(200);
    assert.match(await map.locator('.bt-status').textContent(),/缺/);
    const block = await map.locator('[data-tool="forward"]').boundingBox();
    const dest = await map.locator('[data-cell="0,0"]').boundingBox();
    await page.mouse.move(block.x+block.width/2,block.y+block.height/2);
    await page.mouse.down();
    await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:8});
    await page.mouse.up();
    assert.equal(await map.locator('[data-cell="0,0"] .bt-glyphs').textContent(),'↑');
    await map.locator('[data-map="undo"]').click();
    assert.equal(await map.locator('[data-cell="0,0"] .bt-glyphs').textContent(),'');
    for (const [level,rows] of trail.levels.entries()) {
      assert.equal(await map.locator('.bt-picker').inputValue(),String(level));
      const program = new Map(solve(rows));
      for (const [key,tile] of program) {
        if (tile.heading) await paint(tile.heading,key);
        if (tile.flower) await paint('nectar',key);
        await paint(tile.action,key);
      }
      await startTrail();
      for (const [i,frame] of [...trail.run(rows,program)].entries()) {
        await page.clock.fastForward(i===0 ? 155 : 520);
        assert.equal(await map.locator('.bt-actor').getAttribute('data-pose'),
          [frame.pose.x,frame.pose.y,frame.pose.dir].join(','),'level '+(level+1)+' beat '+(i+1));
      }
      assert(await map.evaluate(el=>el.classList.contains('bt-duet')));
      await page.clock.fastForward(1300);
      assert.match(await map.locator('.bt-trail-count').textContent(),new RegExp('已过 '+(level+1)+'/20'));
      if (level < 19) await startTrail();
    }
    assert.match(await map.locator('.bt-status').textContent(),/全部完成/);
    await map.locator('.bt-picker').selectOption('19');
    for (const [width,height] of [[320,568],[390,844],[844,390],[768,1024]]) {
      await page.setViewportSize({width,height});
      assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'map overflow '+width);
    }
    await page.clock.resume();
    const studio = () => dialog.locator('button[data-mode="studio"]').click();
    await studio();
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
    await studio();
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
    await map.waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => !!(await caches.match('/icons/butterfly/lagoon.webp')));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await map.waitFor();
    if (server) {
      // 停掉静态源站，实际断开回源，浏览器只能从已安装的 SW 取回游戏。
      server.close();
      server.closeAllConnections();
    } else {
      await context.setOffline(true);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dialog.waitFor();
    await map.waitFor();
    assert.match(await map.locator('.bt-trail-count').textContent(),/20\/20/);
    await paint('forward','0,0'); await paint('cha','1,0'); await startTrail();
    await page.waitForFunction(()=>document.querySelector('.bt-map').classList.contains('bt-duet'));
    await studio(); await perform(['jump', 'cha'], '鼓掌');
    assert.deepEqual(errors, []);
    console.log('通过：20张地图逐拍走位、拖放与撤销、合舞存档、三幕练习、自由编舞、改步、停止、最近使用、四种尺寸、直达链接与离线演出。');
  } finally {
    if (server?.listening) server.close();
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
