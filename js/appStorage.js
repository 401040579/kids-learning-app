// 应用存档入口；不修改浏览器 Storage 原型，也不接管第三方凭据。
const AppStorage = {
  owner: 'guest',
  blocked: false,
  applying: false,
  DEVICE_KEYS: ['appLanguage', 'parentNotifyConfig', 'videoWhitelistCache'],
  get native() { return typeof window !== 'undefined' && window.localStorage ? window.localStorage : localStorage; },
  scopedKeys() { return DataBackup.keys().filter(key => !this.DEVICE_KEYS.includes(key)); },
  isScoped(key) { return typeof DataBackup !== 'undefined' && this.scopedKeys().includes(key); },
  prefix(owner = this.owner) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(owner)) throw Error('Invalid profile');
    return `kids-learning-account:${owner}:`;
  },
  physical(key, owner = this.owner) { return owner !== 'guest' && this.isScoped(key) ? this.prefix(owner) + key : key; },
  getItem(key) { return this.native.getItem(this.physical(key)); },
  meta(owner = this.owner) {
    const raw = this.native.getItem(this.prefix(owner) + 'sync-meta');
    if (raw === null) return { revision: null, dirty: false, change: '' };
    const value = JSON.parse(raw);
    if (!value || typeof value.dirty !== 'boolean' || (value.revision !== null && (!Number.isSafeInteger(value.revision) || value.revision < 0))) {
      throw Error('Profile metadata damaged');
    }
    return value;
  },
  saveMeta(value, owner = this.owner) { this.native.setItem(this.prefix(owner) + 'sync-meta', JSON.stringify(value)); },
  changed() { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('profileChanged')); },
  markDirty(key) {
    if (this.blocked) throw Error('Profile is changing or open in another tab');
    if (this.owner === 'guest' || this.applying || !this.isScoped(key)) return;
    // 先持久保存 dirty，才能写数据。配额失败时不能留下未标记的新作品。
    this.saveMeta({ ...this.meta(), dirty: true, change: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` });
  },
  setItem(key, value) {
    if (this.getItem(key) === String(value)) return;
    this.markDirty(key);
    this.native.setItem(this.physical(key), String(value));
    if (this.isScoped(key)) this.changed();
  },
  removeItem(key) {
    if (this.getItem(key) === null) return;
    this.markDirty(key);
    this.native.removeItem(this.physical(key));
    if (this.isScoped(key)) this.changed();
  },
  hasProfile() { return this.scopedKeys().some(key => this.getItem(key) !== null); },
  activate(owner) { this.prefix(owner); this.owner = owner; },
  async lock() {
    if (!navigator.locks) return; // 旧浏览器仍有服务端版本冲突保护。
    await new Promise(resolve => {
      navigator.locks.request('kids-learning-profile:' + this.owner, { ifAvailable: true }, lock => {
        this.blocked = !lock;
        resolve();
        if (lock) return new Promise(release => { window.addEventListener('pagehide', release, { once: true }); });
      }).catch(() => { this.blocked = true; resolve(); });
    });
  },
  replaceProfile(backup, revision) {
    const entries = DataBackup.prepare(backup).entries;
    const keys = this.scopedKeys(), previous = new Map(keys.map(key => [key, this.getItem(key)]));
    const oldMeta = this.native.getItem(this.prefix() + 'sync-meta');
    try {
      keys.forEach(key => this.native.removeItem(this.physical(key)));
      for (const key of keys) if (Object.hasOwn(entries, key)) this.native.setItem(this.physical(key), entries[key]);
      this.saveMeta({ revision, dirty: false, change: '' });
    } catch (error) {
      try {
        keys.forEach(key => this.native.removeItem(this.physical(key)));
        previous.forEach((raw, key) => { if (raw !== null) this.native.setItem(this.physical(key), raw); });
        if (oldMeta === null) this.native.removeItem(this.prefix() + 'sync-meta');
        else this.native.setItem(this.prefix() + 'sync-meta', oldMeta);
      } catch { throw Error('恢复失败，旧存档未能完整还原，请保留备份并停止操作。'); }
      throw Error('恢复失败，已还原旧存档，请检查设备存储空间。');
    }
  },
  confirmSaved(owner, revision, change) {
    const meta = this.meta(owner);
    this.saveMeta({ ...meta, revision, dirty: meta.change !== change }, owner);
  },
  freeze() {
    this.blocked = true;
    const overlay = document.getElementById('profile-loading');
    if (overlay) overlay.hidden = false;
  }
};
