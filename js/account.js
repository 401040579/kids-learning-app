// 登录仅开启账号备份；不会自动导入、上传或把游客旧记录算到账号名下。
const LearningAccount = {
  identity: null,
  snapshot: null,
  busy: false,
  base: '',

  t(key) { return I18n.t('account.' + key); },
  element(id) { return document.getElementById('account-' + id); },

  async init() {
    window.addEventListener('languageChanged', () => this.render());
    this.element('form').addEventListener('submit', event => { event.preventDefault(); this.login(); });
    this.element('save').addEventListener('click', () => this.save());
    this.element('download').addEventListener('click', () => this.download());
    this.element('refresh').addEventListener('click', () => this.refresh());
    this.element('logout').addEventListener('click', () => this.logout());
    const configured = window.LEARNING_ACCOUNT_CONFIG?.apiBase;
    if (configured) {
      try {
        const url = new URL(configured, location.href);
        const local = ['localhost', '127.0.0.1'].includes(url.hostname);
        if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
          url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error();
        this.base = url.origin;
      } catch { this.message(this.t('unavailable')); }
    }
    this.render();
    if (!this.base) return;
    try {
      this.identity = await this.request('/api/account');
      this.render();
      await this.refresh();
    } catch { this.message(this.t('guest')); }
  },

  render() {
    const signedIn = !!this.identity;
    // 状态由账号决定，通用翻译不能把已登录状态覆盖成“访客”。
    this.element('state').removeAttribute('data-i18n');
    this.element('form').hidden = !this.base || signedIn;
    this.element('tools').hidden = !signedIn;
    this.element('state').textContent = signedIn
      ? this.t('signedIn').replace('{name}', this.identity.display_name)
      : this.t('guest');
    this.element('availability').hidden = !!this.base;
    for (const button of this.element('panel').querySelectorAll('button')) button.disabled = this.busy;
    this.element('save').disabled = this.busy || !this.snapshot;
    this.element('download').disabled = this.busy || !this.snapshot?.backup;
    this.element('backup-status').textContent = this.snapshot
      ? (this.snapshot.backup ? this.t('savedAt').replace('{time}', new Date(this.snapshot.updated_at * 1000).toLocaleString()) : this.t('noBackup'))
      : '';
  },

  message(value) { this.element('message').textContent = value; },

  async request(path, { method = 'GET', body } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(this.base + path, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(this.identity ? { 'X-CSRF-Token': this.identity.csrf } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) { this.identity = null; this.snapshot = null; this.render(); }
        throw Error(typeof result.detail === 'string' ? result.detail : this.t('failed'));
      }
      return result;
    } finally { clearTimeout(timeout); }
  },

  async perform(run) {
    if (this.busy) return;
    this.busy = true;
    this.message('');
    this.render();
    try { await run(); }
    catch (error) { this.message(error.name === 'AbortError' || error instanceof TypeError ? this.t('offline') : error.message); }
    finally { this.busy = false; this.render(); }
  },

  async login() {
    await this.perform(async () => {
      const password = this.element('password');
      try {
        this.identity = await this.request('/api/login', { method: 'POST', body: {
          username: this.element('username').value.trim(), password: password.value
        } });
      } finally { password.value = ''; }
      this.render();
      this.snapshot = await this.request('/api/snapshot');
      this.message(this.t('localUnchanged'));
    });
  },

  async refresh() {
    await this.perform(async () => { this.snapshot = await this.request('/api/snapshot'); });
  },

  async save() {
    if (!this.identity || !this.snapshot || this.busy) return;
    if (!confirm(this.t('confirmSave').replace('{name}', this.identity.display_name))) return;
    await this.perform(async () => {
      const backup = DataBackup.createLearning();
      DataBackup.prepare(backup);
      const result = await this.request('/api/snapshot', { method: 'PUT', body: { revision: this.snapshot.revision, backup } });
      this.snapshot = { ...result, backup };
      this.message(this.t('saved'));
    });
  },

  async download() {
    if (!this.identity || this.busy) return;
    await this.perform(async () => {
      const snapshot = await this.request('/api/snapshot');
      this.snapshot = snapshot;
      if (!snapshot.backup) return;
      DataBackup.prepare(snapshot.backup);
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot.backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `learning-backup-${this.identity.username}-${snapshot.revision}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message(this.t('downloaded'));
    });
  },

  async logout() {
    await this.perform(async () => {
      await this.request('/api/logout', { method: 'POST' });
      this.identity = null;
      this.snapshot = null;
      this.message(this.t('loggedOut'));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  LearningAccount.init().catch(() => LearningAccount.message(LearningAccount.t('unavailable')));
});
