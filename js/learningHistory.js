// 本机逐题日志。游客与每个账号分区；只同步登录后属于该账号的事件。
const LearningHistory = {
  database: null,
  writes: Promise.resolve(),
  syncing: null,
  timer: null,
  problem: '',
  renderVersion: 0,
  owner() { return typeof AppStorage !== 'undefined' ? AppStorage.owner : typeof LearningAccount !== 'undefined' && LearningAccount.identity ? LearningAccount.identity.id : 'guest'; },
  t(key) { return I18n.t('history.' + key); },

  open() {
    if (!this.database) {
      this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open('kids-learning-history', 1);
        request.onupgradeneeded = () => {
          const events = request.result.createObjectStore('events', { keyPath: ['owner', 'id'] });
          events.createIndex('owner', 'owner');
          request.result.createObjectStore('cursors', { keyPath: 'owner' });
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(Error('storage'));
        request.onsuccess = () => {
          request.result.onversionchange = () => { request.result.close(); this.database = null; };
          resolve(request.result);
        };
      }).catch(error => { this.database = null; throw error; });
    }
    return this.database;
  },

  async transaction(names, mode, run) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(names, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || Error('storage'));
      tx.onerror = () => {}; // onabort 是事务最终失败的唯一出口。
      try { run(tx, value => { result = value; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  },

  records(owner = this.owner()) {
    return this.transaction(['events'], 'readonly', (tx, set) => {
      const request = tx.objectStore('events').index('owner').getAll(IDBKeyRange.only(owner));
      request.onsuccess = () => set(request.result);
    });
  },

  record(details) {
    if (typeof AppStorage !== 'undefined' && AppStorage.blocked) return Promise.resolve();
    // 在答题当下固定归属，不能在异步写入完成后再读取账号。
    const owner = this.owner();
    const event = { ...details, id: crypto.randomUUID(), occurred_at: new Date().toISOString(), source: 'web' };
    this.writes = this.writes.catch(() => {}).then(() => this.transaction(['events'], 'readwrite', tx => {
      tx.objectStore('events').add({ owner, id: event.id, synced: 0, event });
    })).then(() => { this.problem = ''; this.render(); this.schedule(); })
      .catch(() => { this.problem = 'storage'; this.render(); });
    return this.writes;
  },

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 300);
  },

  async sync() {
    if (this.syncing) return this.syncing;
    const owner = this.owner();
    if (owner === 'guest' || !LearningAccount.base || navigator.onLine === false) { this.render(); return; }
    this.syncing = this.syncOwner(owner).catch(error => {
      if (this.owner() === owner) this.problem = error.name === 'AbortError' || error instanceof TypeError ? 'offline' : error.message;
    }).finally(() => { this.syncing = null; this.render(); if (this.owner() !== owner) this.schedule(); });
    this.render();
    return this.syncing;
  },

  async syncOwner(owner) {
    await this.writes;
    // 分批追加，不用累计分快照覆盖别的设备；应答丢失时安全重传。
    for (let batch = 0; batch < 10 && this.owner() === owner; batch++) {
      const pending = (await this.records(owner)).filter(row => !row.synced).slice(0, 32);
      if (!pending.length) break;
      const result = await LearningAccount.request('/api/learning/events', { method: 'POST', body: {
        expected_account_id: owner, events: pending.map(row => row.event)
      } });
      if (result.account_id !== owner || !Array.isArray(result.accepted)) throw Error(this.t('accountChanged'));
      await this.transaction(['events'], 'readwrite', tx => {
        const store = tx.objectStore('events');
        for (const row of pending) if (result.accepted.includes(row.id)) store.put({ ...row, synced: 1 });
      });
    }
    for (let page = 0; page < 10 && this.owner() === owner; page++) {
      const after = await this.transaction(['cursors'], 'readonly', (tx, set) => {
        const request = tx.objectStore('cursors').get(owner);
        request.onsuccess = () => set(request.result?.cursor || 0);
      });
      const result = await LearningAccount.request(`/api/learning/events?expected_account_id=${encodeURIComponent(owner)}&after=${after}`);
      if (result.account_id !== owner || !Array.isArray(result.events) || !Number.isSafeInteger(result.cursor) || result.cursor < after) {
        throw Error(this.t('accountChanged'));
      }
      // 日志和游标一起提交：中断后重拉当前页，不能先前移游标导致漏记录。
      await this.transaction(['events', 'cursors'], 'readwrite', tx => {
        const store = tx.objectStore('events');
        for (const event of result.events) {
          const request = store.get([owner, event.id]);
          request.onsuccess = () => {
            // 未确认的本机事件保留，服务器同 ID 冲突必须由上传接口明确报告。
            if (!request.result || request.result.synced) store.put({ owner, id: event.id, synced: 1, event });
          };
        }
        tx.objectStore('cursors').put({ owner, cursor: result.cursor });
      });
      if (!result.has_more) break;
    }
    if (this.owner() === owner) this.problem = '';
  },

  summarize(rows, period, now = new Date()) {
    const start = period === 'week' ? now.getTime() - 7 * 86400000
      : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : 0;
    const events = rows.map(row => row.event).filter(event => {
      const stamp = Date.parse(event.occurred_at);
      return stamp >= start && stamp <= now.getTime();
    });
    const correct = events.filter(event => event.verdict === 'correct').length;
    const wrong = events.filter(event => event.verdict === 'wrong').length;
    return { total: events.length, correct, wrong, accuracy: correct + wrong ? Math.round(correct * 100 / (correct + wrong)) : null,
      latest: events.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5) };
  },

  async render() {
    const panel = document.getElementById('history-panel');
    if (!panel) return;
    const owner = this.owner(), version = ++this.renderVersion;
    try {
      const rows = await this.records(owner);
      if (version !== this.renderVersion || owner !== this.owner()) return;
      const stats = this.summarize(rows, document.getElementById('history-period').value);
      document.getElementById('history-summary').textContent = this.t('summary')
        .replace('{total}', stats.total).replace('{correct}', stats.correct).replace('{wrong}', stats.wrong)
        .replace('{accuracy}', stats.accuracy === null ? '—' : stats.accuracy + '%');
      const pending = rows.filter(row => !row.synced).length;
      document.getElementById('history-owner').textContent = owner === 'guest' ? this.t('guest')
        : this.t('owner').replace('{name}', LearningAccount.identity.display_name);
      document.getElementById('history-status').textContent = this.problem
        ? (['storage', 'offline'].includes(this.problem) ? this.t(this.problem) : this.problem)
        : owner === 'guest' ? this.t('local') : this.syncing ? this.t('syncing')
          : pending ? this.t('pending').replace('{count}', pending) : this.t('synced');
      const list = document.getElementById('history-latest');
      list.replaceChildren();
      for (const event of stats.latest) {
        const item = document.createElement('li');
        item.textContent = `${new Date(event.occurred_at).toLocaleString()} · ${this.t(event.subject)} · ${event.question} → ${event.answer} (${this.t(event.verdict)})`;
        list.append(item);
      }
      document.getElementById('history-sync').hidden = owner === 'guest';
      document.getElementById('history-sync').disabled = !!this.syncing;
    } catch {
      if (version === this.renderVersion) document.getElementById('history-status').textContent = this.t('storage');
    }
  },

  async download() {
    const owner = this.owner();
    try {
      await this.writes;
      const rows = await this.records(owner);
      if (owner !== this.owner()) return;
      const data = { app: 'kids-learning-history', version: 1, exported_at: new Date().toISOString(),
        events: rows.map(row => row.event) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `learning-history-${owner === 'guest' ? 'guest' : LearningAccount.identity.username}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { this.problem = 'storage'; this.render(); }
  },

  init() {
    document.getElementById('history-period').addEventListener('change', () => this.render());
    document.getElementById('history-sync').addEventListener('click', () => this.sync());
    document.getElementById('history-download').addEventListener('click', () => this.download());
    window.addEventListener('accountChanged', () => { this.problem = ''; this.render(); this.schedule(); });
    window.addEventListener('languageChanged', () => this.render());
    window.addEventListener('online', () => this.schedule());
    setInterval(() => { if (document.visibilityState === 'visible') this.sync(); }, 30000);
    this.render(); this.schedule();
  }
};

document.addEventListener('learningReady', () => LearningHistory.init());
