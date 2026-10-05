const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness() {
  const elements = new Map();
  const context = vm.createContext({ Uint8Array, Date, Error, atob, btoa, console,
    document: {getElementById(id) {
      if (!elements.has(id)) elements.set(id, {value: '', hidden: false, disabled: false, addEventListener() {}, replaceChildren() {}});
      return elements.get(id);
    }},
    navigator: {credentials: {create: async () => {}, get: async () => {}}},
    window: {isSecureContext: true, PublicKeyCredential: function() {}},
    I18n: {t: key => key, currentLang: 'en'}, AppStorage: {owner:'iris'},
    confirm: () => true,
    LearningAccount: {identity:{id:'iris'},busy:false,base:'https://api.example',t:k=>k,
      messages:[],message(m){this.messages.push(m);},
      async perform(run) { this.busy=true; try {await run();} catch(e){this.message(e.message);} finally{this.busy=false;} },
      async request(){}, async restart(){this.restarted=true;}
    }
  });
  vm.runInContext(fs.readFileSync('js/accountSecurity.js','utf8')+'\nthis.security=AccountSecurity;',context);
  return {context, security:context.security, account:context.LearningAccount, el:id=>context.document.getElementById('security-'+id)};
}

test('WebAuthn binary conversion preserves credential bytes and null userHandle', () => {
  const h = harness();
  const input = Uint8Array.from([0,1,127,128,255]);
  assert.deepEqual(Array.from(h.security.decode(h.security.encode(input))), Array.from(input));
  const options = h.security.options({challenge:h.security.encode(input), user:{id:'aXJpcw'},excludeCredentials:[{id:'AAE'}]},true);
  assert.deepEqual(Array.from(options.user.id), [105,114,105,115]);
  assert.deepEqual(Array.from(options.excludeCredentials[0].id), [0,1]);
  const c=h.security.credential({id:'AAE',rawId:input,type:'public-key',response:{clientDataJSON:input,authenticatorData:input,signature:input,userHandle:null}},false);
  assert.equal(c.response.userHandle,null);
  assert.equal(c.rawId,'AAF_gP8');
});

test('cancelled enrolment clears password and never calls verification or changes records', async () => {
  const h=harness(),calls=[];
  h.el('password').value='not-a-production-secret'; h.el('label').value='iPad';
  h.account.request=async(path)=>{calls.push(path);return {challenge:'AAE',user:{id:'aXJpcw'}};};
  h.context.navigator.credentials.create=async()=>{const e=Error();e.name='NotAllowedError';throw e;};
  await h.security.register();
  assert.equal(h.el('password').value,'');
  assert.deepEqual(calls,['/api/passkeys/register/options']);
  assert.equal(h.account.messages.at(-1),'security.cancelled');
  assert.equal(h.context.AppStorage.owner,'iris');
});

test('account change while device window is open prevents credential upload', async () => {
  const h=harness(),calls=[];
  h.el('password').value='fixture';h.el('label').value='iPad';
  h.account.request=async path=>{calls.push(path);return {challenge:'AAE',user:{id:'aXJpcw'}};};
  h.context.navigator.credentials.create=async()=>{h.account.identity={id:'other'};return {};};
  await h.security.register();
  assert.deepEqual(calls,['/api/passkeys/register/options']);
  assert.equal(h.account.messages.at(-1),'changed');
});

test('late security response cannot display another account’s credentials', async () => {
  const h=harness();
  h.account.request=async()=>{h.account.identity={id:'other'};return {account_id:'iris',passkeys:[],sessions:[]};};
  await assert.rejects(h.security.load('iris'),/changed/);
  assert.equal(h.security.data,null);
});

test('successful enrolment is reported correctly even when list refresh fails', async () => {
  const h=harness();h.el('password').value='fixture';h.el('label').value='iPad';
  const bytes=new Uint8Array([1,2]);
  h.context.navigator.credentials.create=async()=>({id:'AQI',rawId:bytes,type:'public-key',response:{clientDataJSON:bytes,attestationObject:bytes}});
  h.account.request=async path=>{
    if(path.endsWith('/options')) return {challenge:'AAE',user:{id:'aXJpcw'}};
    if(path.endsWith('/verify')) return {account_id:'iris',ok:true};
    throw Error('offline');
  };
  await h.security.register();
  assert.equal(h.account.messages.at(-1),'security.addedRefresh');
  assert.equal(h.el('password').value,'');
});

test('passkey login reuses the normal account reload rather than mixing guest storage', async () => {
  const h=harness();h.account.identity=null;
  const bytes=new Uint8Array([1,2]);
  h.context.navigator.credentials.get=async()=>({id:'AQI',rawId:bytes,type:'public-key',response:{clientDataJSON:bytes,authenticatorData:bytes,signature:bytes}});
  h.account.request=async path=>path.endsWith('/options')?{challenge:'AAE'}:{id:'iris',csrf:'fixture'};
  await h.security.login();
  assert.equal(h.account.identity.id,'iris');
  assert.equal(h.account.restarted,true);
  assert.equal(h.context.AppStorage.owner,'iris');
});

test('late revocation result cannot log out a newly changed account', async () => {
  const h=harness();
  h.account.request=async()=>{h.account.identity={id:'other'};return {revoked_current:true};};
  await h.security.revoke('/api/sessions/revoke','id','fixture');
  assert.equal(h.account.identity.id,'other');
  assert.equal(h.account.restarted,undefined);
});
