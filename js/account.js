// 先验证会话、挂载独立存档，再初始化游戏；切换账号重新载入，避免旧内存写入新存档。
const LearningAccount = {
  identity: null,
  snapshot: null,
  busy: false,
  base: '',
  notifiedOwner: null,
  profileSyncing: null,
  profileProblem: '',
  profileTimer: null,
  booted: false,

  t(key) { return I18n.t('account.' + key); },
  element(id) { return document.getElementById('account-' + id); },

  async init() {
    window.addEventListener('languageChanged', () => this.render());
    this.element('form').addEventListener('submit', event => { event.preventDefault(); this.login(); });
    this.element('save').addEventListener('click', () => this.save());
    this.element('download').addEventListener('click', () => this.download());
    this.element('refresh').addEventListener('click', () => this.refresh());
    this.element('logout').addEventListener('click', () => this.logout());
    this.element('use-cloud').addEventListener('click', () => this.useCloud());
    window.addEventListener('profileChanged', () => { clearTimeout(this.profileTimer); this.profileTimer = setTimeout(() => this.syncProfile(), 5000); });
    window.addEventListener('online', () => this.syncProfile());
    setInterval(() => { if (document.visibilityState === 'visible') this.syncProfile(); }, 30000);
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
    if (this.base) {
      try {
        this.identity = await this.request('/api/account', { timeoutMs: 3500 });
        this.snapshot = await this.request('/api/snapshot?expected_account_id=' + this.identity.id, { timeoutMs: 3500 });
      } catch { /* 服务离线时快速打开本机存档；未验证身份则使用游客。 */ }
    }
    AppStorage.activate(this.identity?.id || 'guest');
    await AppStorage.lock();
    if (this.identity && !AppStorage.blocked) {
      try { this.adoptSnapshot(); }
      catch (error) { this.profileProblem = error.message; }
      if (!AppStorage.hasProfile()) AppStorage.setItem('kidsProfileData', JSON.stringify({name:this.identity.display_name,age:6}));
    }
    this.booted = true;
    this.render();
  },

  adoptSnapshot() {
    if (!this.snapshot || !this.identity || AppStorage.owner !== this.identity.id) return;
    if (this.snapshot.account_id !== this.identity.id) throw Error(this.t('changed'));
    const meta = AppStorage.meta();
    if (meta.revision === null && !this.snapshot.backup && this.snapshot.revision === 0) {
      AppStorage.saveMeta({...meta, revision:0}); return;
    }
    if (meta.dirty && meta.revision !== this.snapshot.revision) {
      this.profileProblem = this.t('conflict'); return;
    }
    if (!meta.dirty && this.snapshot.backup && (!AppStorage.hasProfile() || meta.revision !== this.snapshot.revision)) {
      AppStorage.replaceProfile(this.snapshot.backup, this.snapshot.revision);
    } else if (meta.revision === null && !meta.dirty) {
      AppStorage.saveMeta({...meta,revision:this.snapshot.revision});
    }
  },

  async restart() {
    AppStorage.freeze();
    if (typeof LearningHistory !== 'undefined') await LearningHistory.writes;
    location.reload();
  },

  render() {
    const signedIn = !!this.identity;
    const owner = this.identity?.id || 'guest';
    if (owner !== this.notifiedOwner) {
      this.notifiedOwner = owner;
      window.dispatchEvent(new CustomEvent('accountChanged'));
    }
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
    this.element('use-cloud').disabled = this.busy || !this.snapshot?.backup || !!this.profileSyncing;
    const syncStatus = this.element('sync-status');
    if (syncStatus) {
      try { syncStatus.textContent = this.profileProblem || (this.profileSyncing ? this.t('syncing') : signedIn && AppStorage.meta().dirty ? this.t('pending') : signedIn ? this.t('synced') : ''); }
      catch { syncStatus.textContent = this.t('failed'); }
    }
    this.element('backup-status').textContent = this.snapshot
      ? (this.snapshot.backup ? this.t('savedAt').replace('{time}', new Date(this.snapshot.updated_at * 1000).toLocaleString()) : this.t('noBackup'))
      : '';
  },

  message(value) { this.element('message').textContent = value; },

  async request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
    const requestedOwner = this.identity?.id;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.base + path, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(this.identity ? { 'X-CSRF-Token': this.identity.csrf } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 && this.identity?.id === requestedOwner) {
          this.identity = null; this.snapshot = null; this.render();
          if (this.booted && AppStorage.owner !== 'guest') this.restart();
        }
        const error = Error(typeof result.detail === 'string' ? result.detail : this.t('failed'));
        error.status = response.status; throw error;
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
      await this.restart();
    });
  },

  async refresh() {
    await this.perform(async () => {
      this.snapshot = await this.request('/api/snapshot?expected_account_id=' + this.identity.id);
      const meta = AppStorage.meta();
      this.profileProblem = meta.revision !== this.snapshot.revision ? this.t(meta.dirty ? 'conflict' : 'newer') : '';
    });
  },

  cloudBackup() {
    const backup = DataBackup.createLearning();
    AppStorage.DEVICE_KEYS.forEach(key => { delete backup.entries[key]; });
    DataBackup.prepare(backup);
    return backup;
  },

  async syncProfile() {
    const owner = AppStorage.owner;
    if (!this.booted || !this.identity || this.identity.id !== owner || AppStorage.blocked || this.busy || navigator.onLine === false || this.profileProblem) return;
    if (this.profileSyncing) return this.profileSyncing;
    this.profileSyncing = (async () => {
      const current = await this.request('/api/account');
      if (current.id !== owner) { await this.restart(); return; }
      if (!this.snapshot) {
        this.snapshot = await this.request('/api/snapshot?expected_account_id=' + owner);
        const local = AppStorage.meta(owner);
        if (local.revision === null && this.snapshot.revision === 0) AppStorage.saveMeta({...local, revision:0}, owner);
      }
      const meta = AppStorage.meta(owner);
      if (!meta.dirty) {
        this.snapshot = await this.request('/api/snapshot?expected_account_id=' + owner);
        if (meta.revision !== this.snapshot.revision) this.profileProblem = this.t('newer');
        return;
      }
      if (meta.revision === null) { this.profileProblem = this.t('conflict'); return; }
      const backup = this.cloudBackup();
      const result = await this.request('/api/snapshot', { method:'PUT', body:{revision:meta.revision,backup,expected_account_id:owner} });
      if (result.account_id !== owner) throw Error(this.t('changed'));
      AppStorage.confirmSaved(owner, result.revision, meta.change);
      if (this.identity?.id === owner) this.snapshot = {...result,backup};
    })().catch(error => {
      // 网络失败可重试；版本冲突与坏存档需家长处理，不自动覆盖。
      if (error.status === 409) this.profileProblem = this.t('conflict');
      else if (!(error instanceof TypeError) && error.name !== 'AbortError' && error.status !== 401 && error.status !== 429 && !(error.status >= 500)) this.profileProblem = error.message;
    }).finally(() => { this.profileSyncing = null; this.render(); });
    this.render();
    return this.profileSyncing;
  },

  async save() {
    if (!this.identity || this.busy || this.profileSyncing) return;
    await this.perform(async () => {
      const owner = this.identity.id;
      const latest = await this.request('/api/snapshot?expected_account_id=' + owner);
      const meta = AppStorage.meta();
      if (latest.revision !== meta.revision && !confirm(this.t('confirmReplace'))) return;
      const backup = this.cloudBackup();
      const result = await this.request('/api/snapshot', { method:'PUT', body:{revision:latest.revision,backup,expected_account_id:owner} });
      AppStorage.confirmSaved(owner, result.revision, meta.change);
      this.snapshot = {...result,backup};
      this.profileProblem = '';
      this.message(this.t('saved'));
    });
  },

  async useCloud() {
    if (!this.identity || this.busy || this.profileSyncing) return;
    if (!confirm(this.t('confirmCloud'))) return;
    await this.perform(async () => {
      const snapshot = await this.request('/api/snapshot?expected_account_id=' + this.identity.id);
      if (!snapshot.backup) return;
      AppStorage.replaceProfile(snapshot.backup, snapshot.revision);
      await this.restart();
    });
  },

  async download() {
    if (!this.identity || this.busy) return;
    await this.perform(async () => {
      const owner = this.identity.id;
      const snapshot = await this.request('/api/snapshot?expected_account_id=' + owner);
      if (this.identity?.id !== owner) return;
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
      await this.restart();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  LearningAccount.init().catch(() => LearningAccount.message(LearningAccount.t('unavailable'))).finally(() => {
    document.dispatchEvent(new Event('learningReady'));
    const overlay = document.getElementById('profile-loading');
    if (!AppStorage.blocked) overlay.hidden = true;
    else {
      document.getElementById('profile-loading-message').textContent = LearningAccount.t('otherTab');
      const button = document.createElement('button'); button.textContent = LearningAccount.t('reload');
      button.onclick = () => location.reload(); overlay.append(button);
    }
  });
});
