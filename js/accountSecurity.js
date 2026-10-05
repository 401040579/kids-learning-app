// 浏览器保管私钥；这里只传 WebAuthn 公共响应，绝不导出设备秘密。
const AccountSecurity = {
  data: null,
  owner: null,
  t(key) { return I18n.t('security.' + key); },
  el(id) { return document.getElementById('security-' + id); },
  supported() {
    return !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get);
  },
  init() {
    this.el('login').addEventListener('click', () => this.login());
    this.el('form').addEventListener('submit', event => { event.preventDefault(); this.register(); });
    this.el('refresh').addEventListener('click', () => this.refresh());
    this.el('revoke-others').addEventListener('click', () => this.revoke('/api/sessions/revoke-others', null, this.t('confirmOthers')));
  },
  render() {
    const account = LearningAccount;
    const owner = account.identity?.id || null;
    if (owner !== this.owner) {
      this.owner = owner;
      this.data = null;
      this.el('password').value = '';
    }
    this.el('login').hidden = !account.base || !!owner;
    this.el('panel').hidden = !owner;
    this.el('unsupported').hidden = !account.base || this.supported();
    this.el('login').disabled = account.busy || !this.supported();
    this.el('add').disabled = account.busy || !this.supported();
    this.el('refresh').disabled = account.busy;
    this.el('revoke-others').disabled = account.busy || !this.data;
    this.renderLists();
  },
  stamp(value) {
    return value ? new Date(value * 1000).toLocaleString(I18n.currentLang) : this.t('unknownTime');
  },
  renderLists() {
    const keys = this.el('keys'), sessions = this.el('sessions');
    keys.replaceChildren(); sessions.replaceChildren();
    if (!this.data) {
      keys.textContent = this.t('loadNote');
      return;
    }
    const add = (container, title, detail, action, label) => {
      const row = document.createElement('li');
      const text = document.createElement('div');
      const heading = document.createElement('strong'); heading.textContent = title;
      const note = document.createElement('small'); note.textContent = detail;
      text.append(heading, note);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn-refresh'; button.textContent = label;
      button.disabled = LearningAccount.busy;
      button.addEventListener('click', action);
      row.append(text, button); container.append(row);
    };
    if (!this.data.passkeys.length) keys.textContent = this.t('noKeys');
    for (const key of this.data.passkeys) {
      add(keys, key.label, this.t('keyDetail').replace('{created}', this.stamp(key.created)).replace('{used}', this.stamp(key.last_used)),
        () => this.revoke('/api/passkeys/remove', key.id, this.t('confirmKey')), this.t('remove'));
    }
    for (const session of this.data.sessions) {
      const method = this.t(session.method === 'passkey' ? 'methodPasskey' : session.method === 'password' ? 'methodPassword' : 'methodLegacy');
      add(sessions, session.label + (session.current ? ' · ' + this.t('current') : ''),
        method + ' · ' + this.t('sessionDetail').replace('{seen}', this.stamp(session.last_seen)).replace('{expiry}', this.stamp(session.expires)),
        () => this.revoke('/api/sessions/revoke', session.id, this.t('confirmSession')), this.t('revoke'));
    }
  },
  async load(owner = LearningAccount.identity?.id) {
    const data = await LearningAccount.request('/api/security');
    if (!owner || LearningAccount.identity?.id !== owner || data.account_id !== owner) throw Error(LearningAccount.t('changed'));
    this.data = data;
  },
  async refresh() {
    if (!LearningAccount.identity) return;
    await LearningAccount.perform(async () => { await this.load(); });
  },
  decode(value) {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  },
  encode(value) {
    const bytes = new Uint8Array(value);
    let text = '';
    for (const byte of bytes) text += String.fromCharCode(byte);
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  options(json, registration) {
    const options = {...json, challenge: this.decode(json.challenge)};
    if (registration) {
      options.user = {...json.user, id: this.decode(json.user.id)};
      options.excludeCredentials = (json.excludeCredentials || []).map(c => ({...c, id: this.decode(c.id)}));
    } else if (json.allowCredentials) {
      options.allowCredentials = json.allowCredentials.map(c => ({...c, id: this.decode(c.id)}));
    }
    return options;
  },
  credential(value, registration) {
    if (!value || value.type !== 'public-key') throw Error(this.t('cancelled'));
    const response = {clientDataJSON: this.encode(value.response.clientDataJSON)};
    if (registration) {
      response.attestationObject = this.encode(value.response.attestationObject);
      response.transports = value.response.getTransports?.() || [];
    } else {
      response.authenticatorData = this.encode(value.response.authenticatorData);
      response.signature = this.encode(value.response.signature);
      response.userHandle = value.response.userHandle ? this.encode(value.response.userHandle) : null;
    }
    return {id: value.id, rawId: this.encode(value.rawId), type: value.type, response};
  },
  async ceremony(run) {
    try { return await run(); }
    catch (error) {
      if (['NotAllowedError', 'AbortError'].includes(error.name)) throw Error(this.t('cancelled'));
      if (error.name === 'InvalidStateError') throw Error(this.t('alreadyRegistered'));
      if (error.name === 'SecurityError' || error.name === 'NotSupportedError') throw Error(this.t('unsupported'));
      throw error;
    }
  },
  async register() {
    if (!this.supported() || !LearningAccount.identity) return;
    const owner = LearningAccount.identity.id;
    await LearningAccount.perform(async () => {
      let json;
      try {
        json = await LearningAccount.request('/api/passkeys/register/options', {method: 'POST', body: {
          label: this.el('label').value.trim(), password: this.el('password').value
        }});
      } finally { this.el('password').value = ''; }
      const value = await this.ceremony(() => navigator.credentials.create({publicKey: this.options(json, true)}));
      if (LearningAccount.identity?.id !== owner || AppStorage.owner !== owner) throw Error(LearningAccount.t('changed'));
      const saved = await LearningAccount.request('/api/passkeys/register/verify', {method: 'POST', body: {credential: this.credential(value, true)}});
      if (LearningAccount.identity?.id !== owner || saved.account_id !== owner) throw Error(LearningAccount.t('changed'));
      LearningAccount.message(this.t('added'));
      this.el('label').value = '';
      // A failed list refresh must not misreport a successfully enrolled key as a failed enrolment.
      try { await this.load(owner); } catch { this.data = null; LearningAccount.message(this.t('addedRefresh')); }
    });
  },
  async login() {
    if (!this.supported() || LearningAccount.identity) return;
    await LearningAccount.perform(async () => {
      const json = await LearningAccount.request('/api/passkeys/login/options', {method: 'POST'});
      const value = await this.ceremony(() => navigator.credentials.get({publicKey: this.options(json, false)}));
      LearningAccount.identity = await LearningAccount.request('/api/passkeys/login/verify', {
        method: 'POST', body: {credential: this.credential(value, false)}
      });
      await LearningAccount.restart();
    });
  },
  async revoke(path, id, confirmation) {
    if (!LearningAccount.identity || !confirm(confirmation)) return;
    const owner = LearningAccount.identity.id;
    await LearningAccount.perform(async () => {
      const result = await LearningAccount.request(path, {method: 'POST', body: id ? {id} : {}});
      if (LearningAccount.identity?.id !== owner) throw Error(LearningAccount.t('changed'));
      if (result.revoked_current) {
        LearningAccount.identity = null; LearningAccount.snapshot = null;
        await LearningAccount.restart(); return;
      }
      LearningAccount.message(this.t('revoked'));
      try { await this.load(); } catch { this.data = null; LearningAccount.message(this.t('revokedRefresh')); }
    });
  }
};
