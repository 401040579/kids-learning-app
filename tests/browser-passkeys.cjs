// Real browser WebAuthn + local API + disposable account. No user keychain or production data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const http=require('node:http'),net=require('node:net'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'kids-passkey-browser-'));
const password='disposable-browser-fixture-123456',python=path.join(root,'.venv/bin/python');
let api,browser,trackedPage;
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+req.url.split('?')[0]);if(file===root)file=path.join(root,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  });
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  // WebAuthn RP IDs are domains; localhost is supported, a loopback IP is not a browser RP ID.
  const origin=`http://localhost:${server.address().port}`;
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const endpoint=`http://localhost:${port}`;
  const env={...process.env,LEARNING_DB:path.join(scratch,'fixture.sqlite3'),LEARNING_DEVELOPMENT:'1',LEARNING_ORIGINS:origin,LEARNING_ROBOT_CONFIG:path.join(scratch,'no-robot.json')};
  const created=spawnSync(python,['-m','backend.manage','create','iris','--name','Iris','--password-stdin'],{cwd:root,env,input:password+'\n',encoding:'utf8'});
  assert.equal(created.status,0,created.stderr);
  api=spawn(python,['-m','uvicorn','backend.service:create_app','--factory','--host','127.0.0.1','--port',String(port),'--no-access-log'],{cwd:root,env,stdio:['ignore','ignore','pipe']});
  let errors='';api.stderr.on('data',d=>errors+=d);
  for(let i=0;i<70;i++){try{if((await fetch(endpoint+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.equal(api.exitCode,null,errors);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const pageErrors=[];
  async function device(){
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    await context.route('**/*',r=>{
      const url=r.request().url();
      if(url===origin+'/js/accountConfig.js')return r.fulfill({contentType:'application/javascript',body:`window.LEARNING_ACCOUNT_CONFIG={apiBase:${JSON.stringify(endpoint)}};`});
      return url.startsWith(origin+'/')||url.startsWith(endpoint+'/')?r.continue():r.abort();
    });
    await context.addInitScript(()=>{localStorage.setItem('appLanguage','zh');if(!localStorage.getItem('kidsLearningData'))localStorage.setItem('kidsLearningData','{"totalScore":80}');});
    const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));page.on('dialog',d=>d.accept());
    page.on('response',async r=>{if(r.url().includes('/api/passkeys/')&&r.status()>=400)console.error('Passkey API failure',r.status(),await r.text());});
    const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
    const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',ctap2Version:'ctap2_1',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
    await page.goto(origin);await ready(page);
    return {context,page,cdp,authenticatorId};
  }
  async function ready(page){
    await page.waitForFunction(()=>typeof LearningAccount!=='undefined'&&LearningAccount.booted&&!LearningAccount.busy);
    if(!await page.evaluate(()=>window.__passkeyReady)) {
      if(!await page.evaluate(()=>DailyCheckin.isCheckedToday())) {
        await page.locator('#checkin-reminder-modal').waitFor({state:'visible'});
        await page.locator('.btn-checkin-later').click();
      }
      await page.evaluate(()=>window.__passkeyReady=true);
    }
    await page.evaluate(()=>navigateTo('profile'));
  }
  async function passwordLogin(page){
    await page.locator('#account-username').fill('iris');await page.locator('#account-password').fill(password);
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#account-form button[type=submit]').click()]);await ready(page);
    assert.equal(await page.evaluate(()=>LearningAccount.identity.username),'iris');
  }
  const first=await device();trackedPage=first.page;assert.equal(await first.page.locator('#security-login').isEnabled(),true);
  await passwordLogin(first.page);
  await first.page.locator('#security-panel summary').click();
  await first.page.locator('#security-label').fill('Virtual iPad fixture');
  await first.page.locator('#security-password').fill(password);
  await first.page.locator('#security-add').click();
  await first.page.waitForFunction(()=>!LearningAccount.busy&&AccountSecurity.data?.passkeys.length===1);
  assert.equal(await first.page.locator('#security-password').inputValue(),'');
  assert.equal(await first.page.locator('#security-keys strong').innerText(),'Virtual iPad fixture');
  const credentials=(await first.cdp.send('WebAuthn.getCredentials',{authenticatorId:first.authenticatorId})).credentials;
  assert.equal(credentials.length,1);assert.equal(credentials[0].rpId,'localhost');
  await first.page.screenshot({path:path.join(scratch,'registered.png')});
  const second=await device();
  await second.cdp.send('WebAuthn.addCredential',{authenticatorId:second.authenticatorId,credential:credentials[0]});
  await Promise.all([second.page.waitForEvent('domcontentloaded'),second.page.locator('#security-login').click()]);await ready(second.page);
  assert.equal(await second.page.evaluate(()=>LearningAccount.identity.username),'iris');
  assert.equal(await second.page.evaluate(()=>JSON.parse(localStorage.getItem('kidsLearningData')).totalScore),80);
  await second.page.locator('#security-panel summary').click();
  assert.equal(await second.page.locator('#security-sessions strong').count(),2);
  await first.page.locator('#security-refresh').click();await first.page.waitForFunction(()=>!LearningAccount.busy&&AccountSecurity.data?.sessions.length===2);
  await first.page.locator('#security-revoke-others').click();await first.page.waitForFunction(()=>!LearningAccount.busy&&AccountSecurity.data?.sessions.length===1);
  const [status] = await Promise.all([second.page.evaluate(async()=>{try{await LearningAccount.request('/api/account');return 200;}catch(e){return e.status;}}),second.page.waitForEvent('domcontentloaded')]);
  assert.equal(status,401);
  await ready(second.page);
  assert.equal(await second.page.evaluate(()=>LearningAccount.identity),null);
  // Re-login with the registered key, then remove it from the password session.
  await Promise.all([second.page.waitForEvent('domcontentloaded'),second.page.locator('#security-login').click()]);await ready(second.page);
  await first.page.locator('#security-keys button').click();await first.page.waitForFunction(()=>!LearningAccount.busy&&AccountSecurity.data?.passkeys.length===0);
  const [removedStatus] = await Promise.all([second.page.evaluate(async()=>{try{await LearningAccount.request('/api/account');return 200;}catch(e){return e.status;}}),second.page.waitForEvent('domcontentloaded')]);
  assert.equal(removedStatus,401);
  await ready(second.page);
  // Removing server registration leaves the device credential unusable; password remains available.
  await second.page.locator('#security-login').click();await second.page.waitForFunction(()=>!LearningAccount.busy&&document.getElementById('account-message').textContent.includes('不可用'));
  assert.equal(await second.page.evaluate(()=>LearningAccount.identity),null);
  assert.equal(await second.page.locator('#account-form').isVisible(),true);
  assert.equal(await second.page.evaluate(()=>RewardSystem.data.totalScore),80);
  assert.deepEqual(pageErrors,[]);
  fs.writeFileSync(path.join(scratch,'result.json'),JSON.stringify({checks:['password-login','browser-credential-create','second-device-passkey-login','guest-profile-retained','session-list','revoke-other-session','passkey-relogin','remove-key-revokes-session','removed-key-blocked','password-fallback'],pageErrors},null,2));
  console.log('PASS: 10 browser WebAuthn/session scenarios; evidence '+scratch);
})().catch(async e=>{console.error(e);if(trackedPage){console.error(await trackedPage.evaluate(()=>({message:document.getElementById('account-message').textContent,busy:LearningAccount.busy,securityLoaded:!!AccountSecurity.data,ownerMatches:AppStorage.owner===LearningAccount.identity?.id})));await trackedPage.screenshot({path:path.join(scratch,'failure.png')});console.error('Failure evidence:',scratch);}process.exitCode=1;}).finally(async()=>{await browser?.close();api?.kill();await new Promise(r=>server.close(r));});
