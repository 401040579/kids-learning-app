// 真浏览器 + 临时账号/API；AI 返回测试夹具，绝不调用付费服务或生产数据。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),net=require('node:net');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'photo-reader-'));
const python=process.env.LEARNING_TEST_PYTHON||path.join(root,'.venv/bin/python');
let browser,api,endpoint,origin,apiError='',baseline=false;
const oldFiles=new Map();
for(const file of ['index.html','sw.js','js/homeScreen.js','js/locales/en.js','js/locales/zh.js']) {
 const r=spawnSync('git',['show','86df980:'+file],{cwd:root});assert.equal(r.status,0);oldFiles.set('/'+file,r.stdout);
} const errors=[],requests=[],passed=[];
const password='photo-test-password-123456';
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(req.url.split('?')[0]), file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const send=(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(err?'':data);};
  if(name==='/js/accountConfig.js')return send(null,'window.LEARNING_ACCOUNT_CONFIG={apiBase:'+JSON.stringify(endpoint)+'};');
  if(baseline&&oldFiles.has(name==='/'?'/index.html':name))return send(null,oldFiles.get(name==='/'?'/index.html':name));
  fs.readFile(file,send);
});
const deadline=setTimeout(()=>{console.error('Browser test exceeded 180 seconds');process.exitCode=1;browser?.close();api?.kill();server.close();},180000);
async function ready(page){
  await page.waitForFunction(()=>typeof LearningAccount!=='undefined'&&LearningAccount.booted&&document.getElementById('profile-loading').hidden);
  if(!await page.evaluate(()=>DailyCheckin.isCheckedToday())){await page.locator('#checkin-reminder-modal').waitFor({state:'visible'});await page.locator('.btn-checkin-later').click();}
}
async function open(page){await page.locator('.nav-item').first().click();await page.locator('[onclick="HomeScreen.launch(\'photoReading\')"]').click();}
async function test(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));endpoint='http://127.0.0.1:'+port;
  const env={...process.env,LEARNING_DB:path.join(scratch,'test.sqlite3'),LEARNING_DEVELOPMENT:'1',LEARNING_ORIGINS:origin,PYTHONPATH:root};
  delete env.PHOTO_READING_OPENAI_KEY;
  env.PHOTO_READING_KEY_FILE=path.join(scratch,'missing.key');
  const created=spawnSync(python,['-m','backend.manage','create','photo-reader','--name','Reader','--password-stdin'],{cwd:root,env,input:password+'\n',encoding:'utf8'});assert.equal(created.status,0,created.stderr);
  const fixture=path.join(scratch,'fixture.py');
  fs.writeFileSync(fixture,`import io,wave,uvicorn,asyncio\nfrom backend.service import create_app\napp=create_app()\ns=app.state.photo_reading\ns.provider.key='local-fixture-only'\nasync def recognize(image):\n return {'sentences':[{'text':'The little cat sat on a mat.','language':'en-US','uncertain':False},{'text':'小猫坐在垫子上。','language':'zh-CN','uncertain':True},{'text':'<img src=x onerror=alert(1)>','language':'en-US','uncertain':True}],'needs_review':True}\nasync def speech(text,language):\n if text=='Slow sentence.': await asyncio.sleep(5)\n b=io.BytesIO()\n with wave.open(b,'wb') as w:\n  w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b'\\x01\\x00'*48000)\n return b.getvalue()\ns.provider.recognize=recognize\ns.provider.speech=speech\nuvicorn.run(app,host='127.0.0.1',port=${port},access_log=False)\n`);
  api=spawn(python,[fixture],{cwd:root,env,stdio:['ignore','ignore','pipe']});api.stderr.on('data',d=>apiError+=d);
  for(let i=0;i<60;i++){try{if((await fetch(endpoint+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.equal(api.exitCode,null,apiError);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['camera'],serviceWorkers:'block'});
  context.setDefaultTimeout(10000);
  await context.route('**/*',route=>{const req=route.request(),url=req.url();requests.push({url,body:req.postData()});return url.startsWith(origin+'/')||url.startsWith(endpoint+'/')?route.continue():route.abort();});
  await context.addInitScript(()=>localStorage.setItem('appLanguage','zh'));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(origin);await ready(page);await open(page);
  await test('游客入口清楚提示登录，手机布局不溢出',async()=>{
    await page.waitForFunction(()=>document.getElementById('pr-service').textContent.includes('登录'));
    assert.equal(await page.evaluate(()=>PhotoReading.root.scrollWidth<=390),true);
    await page.locator('#pr-close').click();
    await page.locator('.nav-item').last().click();await page.locator('#account-username').fill('photo-reader');await page.locator('#account-password').fill(password);
    await page.locator('#account-form button[type=submit]').click();await page.waitForFunction(()=>LearningAccount.identity?.username==='photo-reader'&&LearningAccount.booted&&document.getElementById('profile-loading').hidden);await ready(page);await open(page);
  });
  await test('同一相机连续拍两页，结束时释放摄像头',async()=>{
    await page.locator('#pr-camera').click();await page.waitForFunction(()=>document.getElementById('pr-video').videoWidth>0);
    await page.locator('#pr-snap').click();await page.locator('#pr-snap').click();
    assert.equal(await page.locator('.pr-thumb').count(),2);
    await page.evaluate(()=>window.__track=PhotoReading.stream.getVideoTracks()[0]);
    await page.locator('#pr-camera-stop').click();assert.equal(await page.evaluate(()=>window.__track.readyState),'ended');
  });
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=','base64');
  await test('相册一次加入多张，失败文件不丢已添加页',async()=>{
    await page.locator('#pr-files').setInputFiles([{name:'one.png',mimeType:'image/png',buffer:png},{name:'two.png',mimeType:'image/png',buffer:png},{name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('bad')}]);
    await page.waitForFunction(()=>!PhotoReading.importing&&PhotoReading.pages.length===4);
    assert.match(await page.locator('#pr-status').textContent(),/1 张照片无法读取/);
  });
  let ocr=0;
  await page.route('**/api/photo-reading/recognize',async route=>{
    ocr++;if(ocr===2)return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({detail:{code:'recognitionFailed'}})});
    return route.continue();
  });
  await test('批量识别保留成功页，失败页可单独重试',async()=>{
    await page.locator('#pr-recognize').click();await page.waitForFunction(()=>!PhotoReading.recognizing&&PhotoReading.pages.every(p=>p.state==='ready'||p.state==='error'));
    assert.equal(ocr,4);assert.equal(await page.evaluate(()=>PhotoReading.pages.filter(p=>p.state==='error').length),1);
    await page.locator('.pr-thumb > button:first-child').nth(1).click();await page.getByRole('button',{name:'重试这一页',exact:true}).click();
    await page.waitForFunction(()=>!PhotoReading.recognizing&&PhotoReading.pages.every(p=>p.state==='ready'));assert.equal(ocr,5);
  });
  await test('中英文句子、核对标记、原图和文本注入防护',async()=>{
    assert.equal(await page.locator('.pr-sentence-play').count(),3);
    assert.equal(await page.locator('.pr-sentence-play[lang="zh-CN"]').count(),1);
    assert.equal(await page.locator('.pr-sentence-play img').count(),0);
    assert.equal(await page.evaluate(()=>PhotoReading.root.scrollWidth<=PhotoReading.root.clientWidth),true);
    await page.locator('#pr-content summary').click();assert.equal(await page.locator('.pr-original').isVisible(),true);
    await page.locator('#pr-content summary').click();
    await page.locator('.pr-sentence-play').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(scratch,'photo-reader-mobile.png'),fullPage:true});
  });
  await test('真实音频播放、调速不重复请求、重播使用缓存',async()=>{
    await page.locator('.pr-sentence-play').first().click();await page.waitForFunction(()=>!PhotoReading.audio.paused);
    assert.equal(await page.evaluate(()=>PhotoReading.audio.playbackRate),0.8);
    const count=()=>requests.filter(x=>x.url.endsWith('/speech')).length;const before=count();
    await page.locator('#pr-rate').selectOption('0.6');assert.equal(await page.evaluate(()=>PhotoReading.audio.playbackRate),0.6);
    await page.locator('#pr-stop').click();await page.locator('.pr-sentence-play').first().click();await page.waitForFunction(()=>!PhotoReading.audio.paused);
    assert.equal(count(),before);await page.locator('#pr-stop').click();
  });
  await test('修改文字和语言后只朗读修订内容',async()=>{
    await page.locator('.pr-sentence').first().getByRole('button',{name:'修改文字',exact:true}).click();
    await page.locator('.pr-sentence textarea').fill('你好，小猫。');await page.locator('.pr-sentence select').selectOption('zh-CN');
    await page.getByRole('button',{name:'保存',exact:true}).click();await page.locator('.pr-sentence-play').first().click();
    await page.waitForFunction(()=>!PhotoReading.audio.paused);const body=JSON.parse(requests.filter(x=>x.url.endsWith('/speech')).at(-1).body);
    assert.equal(body.text,'你好，小猫。');assert.equal(body.language,'zh-CN');await page.locator('#pr-stop').click();
  });
  await test('异步语音返回前切句，旧结果不会播放',async()=>{
    let delayed=false;
    await page.route('**/api/photo-reading/speech',async route=>{delayed=true;await new Promise(r=>setTimeout(r,400));try{await route.continue();}catch{}});
    await page.locator('.pr-sentence-play').nth(1).click();await page.waitForFunction(()=>PhotoReading.activeSentence?.endsWith(':1'));
    await page.locator('.pr-sentence-play').first().click();await page.waitForFunction(()=>!PhotoReading.audio.paused);
    await page.waitForTimeout(600);assert.equal(delayed,true);assert.match(await page.evaluate(()=>PhotoReading.activeSentence),/:0$/);
    await page.locator('#pr-stop').click();await page.unroute('**/api/photo-reading/speech');
  });
  await test('取消已到达后端的慢语音后，新句能立即开始生成',async()=>{
    for (const [index,text] of [[0,'Slow sentence.'],[1,'Next sentence.']]) {
      const row=page.locator('.pr-sentence').nth(index);await row.getByRole('button',{name:'修改文字',exact:true}).click();
      await row.locator('textarea').fill(text);await row.locator('select').selectOption('en-US');await row.getByRole('button',{name:'保存',exact:true}).click();
    }
    await page.locator('.pr-sentence-play').first().click();await page.waitForTimeout(400);
    await page.locator('.pr-sentence-play').nth(1).click();
    await page.waitForFunction(()=>!PhotoReading.audio.paused,{},{timeout:2500});
    assert.match(await page.evaluate(()=>PhotoReading.activeSentence),/:1$/);await page.locator('#pr-stop').click();
  });
  await test('Safari式自动播放阻止时显示二次点击播放',async()=>{
    await page.evaluate(()=>{window.__play=PhotoReading.audio.play.bind(PhotoReading.audio);PhotoReading.audio.play=()=>Promise.reject(new DOMException('blocked','NotAllowedError'));});
    await page.locator('.pr-sentence-play').nth(1).click();await page.locator('#pr-resume').waitFor({state:'visible'});
    await page.evaluate(()=>{PhotoReading.audio.play=window.__play;});await page.locator('#pr-resume').click();await page.waitForFunction(()=>!PhotoReading.audio.paused);await page.locator('#pr-stop').click();
  });
  await test('关闭中断识别，再打开可重试，账号改变会清空照片和音频',async()=>{
    await page.locator('#pr-files').setInputFiles({name:'new.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!PhotoReading.importing);
    await page.route('**/api/photo-reading/recognize',async route=>{await new Promise(r=>setTimeout(r,600));try{await route.continue();}catch{}});
    await page.locator('#pr-recognize').click();await page.waitForFunction(()=>PhotoReading.recognizing);await page.locator('#pr-close').click();await open(page);
    assert.equal(await page.evaluate(()=>PhotoReading.pages.at(-1).state),'pending');
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('accountChanged')));
    assert.deepEqual(await page.evaluate(()=>[PhotoReading.pages.length,PhotoReading.audioCache.size,PhotoReading.isOpen]),[0,0,false]);
  });
  await test('PWA 从 v85 升级到 v87，点读资源完整缓存并可离线打开',async()=>{
    baseline=true;const upgrade=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await upgrade.route('**/*',route=>route.request().url().startsWith(origin+'/')||route.request().url().startsWith(endpoint+'/')?route.continue():route.abort());
    await upgrade.addInitScript(()=>localStorage.setItem('appLanguage','zh'));
    const p=await upgrade.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);
    await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await p.reload();
    await p.waitForFunction(()=>navigator.serviceWorker.controller&&typeof LearningAccount!=='undefined'&&LearningAccount.booted);
    await ready(p);assert.equal(await p.evaluate(()=>typeof PhotoReading),'undefined');
    baseline=false;await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await p.locator('#update-notification .update-btn').click();
    await p.waitForFunction(()=>typeof PhotoReading!=='undefined'&&PhotoReading.root&&LearningAccount.booted);
    await ready(p);await open(p);
    const cache=await p.evaluate(async()=>{const c=await caches.open('kids-learning-v87');return [!!await c.match('/js/photoReading.js'),!!await c.match('/css/photoReading.css'),(await caches.keys()).includes('kids-learning-v85')];});
    assert.deepEqual(cache,[true,true,false]);await p.locator('#pr-close').click();
    await upgrade.setOffline(true);await p.reload();await ready(p);await open(p);assert.equal(await p.locator('#photo-reading').isVisible(),true);
    await upgrade.close();
  });
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:passed.length,evidence:scratch,errors}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{clearTimeout(deadline);await browser?.close();api?.kill('SIGTERM');server.close();});
