// 学校私密记录独立于学习存档：不登记到 DataBackup，不触发 profileChanged / 云同步。
const SchoolDayStore = {
  KEY: 'school-day-local-v1',
  owner: null,
  profileId: null,
  role: 'child',
  id() { return crypto.randomUUID(); },
  key(owner = AppStorage.owner) { return AppStorage.prefix(owner) + this.KEY; },
  today(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = name => parts.find(p => p.type === name).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  },
  validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4)) < 2000 || Number(value.slice(0,4)) > 2100) return false;
    const parsed = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
  },
  shift(date, days) { return new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10); },
  weekday(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); },
  week(date) { return this.shift(date, -((this.weekday(date) + 6) % 7)); },
  defaults(name = '') {
    return { id: this.id(), name, settings: { holidays: [], ipadDays: [1], peDays: [1], libraryDays: [2], shortDay: 3,
      foodNote: '', pickupNote: '', conferenceStart: '', conferenceEnd: '', cleverUrl: 'https://clever.com/login' },
    records: [], checks: {}, schoolWeeks: {}, reminders: [], timer: null };
  },
  empty() { const p = this.defaults(); return { version: 1, revision: 0, active: p.id, profiles: [p] }; },
  validate(data) {
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!object(data) || data.version !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 0 ||
      !Array.isArray(data.profiles) || !data.profiles.length || data.profiles.length > 12 ||
      new Set(data.profiles.map(p => p.id)).size !== data.profiles.length || !data.profiles.some(p => p.id === data.active)) throw Error('school.corrupt');
    for (const p of data.profiles) {
      if (!object(p) || !/^[a-zA-Z0-9_-]{1,64}$/.test(p.id) || typeof p.name !== 'string' || p.name.length > 60 ||
        !object(p.settings) || !Array.isArray(p.records) || p.records.length > 5000 || !object(p.checks) || !object(p.schoolWeeks) || !Array.isArray(p.reminders)) throw Error('school.corrupt');
      this.validateSettings(p.settings);
      if (new Set(p.records.map(r => r.id)).size !== p.records.length) throw Error('school.corrupt');
      p.records.forEach(r => this.validateRecord(r));
      for (const [key, value] of Object.entries(p.checks)) {
        if (!/^\d{4}-\d{2}-\d{2}\|(folder|water|ipad|pe|library|parent-folder|parent-charge|parent-food|newsletter|prepare-log|submit-log)$/.test(key) || !this.validDate(key.slice(0,10)) || typeof value !== 'boolean') throw Error('school.corrupt');
      }
      for (const [date, entry] of Object.entries(p.schoolWeeks)) {
        if (!this.validDate(date) || this.week(date) !== date || !object(entry) || !['reading','math'].every(k => entry[k] === null || Number.isInteger(entry[k]) && entry[k] >= 0 && entry[k] <= 2000)) throw Error('school.corrupt');
      }
      if (p.reminders.length > 100) throw Error('school.corrupt');
      p.reminders.forEach(r => { if (!object(r) || typeof r.id !== 'string' || !this.validDate(r.date) || typeof r.text !== 'string' || !r.text.trim() || r.text.length > 300 || !['pickup','conference','absence','other'].includes(r.kind)) throw Error('school.corrupt'); });
      if (p.timer !== null && (!object(p.timer) || !/^[a-zA-Z0-9_-]{1,64}$/.test(p.timer.id) || typeof p.timer.title !== 'string' || p.timer.title.length > 160 || !this.validDate(p.timer.date) ||
        !['book-cn','book-en','iready-reading','iready-math'].includes(p.timer.kind) || !['running','paused','draft'].includes(p.timer.state) ||
        !Number.isFinite(p.timer.elapsedMs) || p.timer.elapsedMs < 0 || p.timer.elapsedMs > 7200000 ||
        !Number.isFinite(p.timer.startedAt))) throw Error('school.corrupt');
    }
    return data;
  },
  validateSettings(s) {
    if (!Array.isArray(s.holidays) || s.holidays.length > 100 || !s.holidays.every(h => this.validDate(h.from) && this.validDate(h.to) && h.from <= h.to) ||
      !['ipadDays','peDays','libraryDays'].every(k => Array.isArray(s[k]) && s[k].every(d => Number.isInteger(d) && d >= 1 && d <= 5)) ||
      !Number.isInteger(s.shortDay) || s.shortDay < 1 || s.shortDay > 5 ||
      !['foodNote','pickupNote'].every(k => typeof s[k] === 'string' && s[k].length <= 300) ||
      !['conferenceStart','conferenceEnd'].every(k => s[k] === '' || this.validDate(s[k])) ||
      !!s.conferenceStart !== !!s.conferenceEnd || (s.conferenceStart && s.conferenceStart > s.conferenceEnd) || s.cleverUrl !== 'https://clever.com/login') throw Error('school.invalidSettings');
  },
  validateRecord(r) {
    if (!r || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(r.id) || !this.validDate(r.date) ||
      !['book-cn','book-en','iready-reading','iready-math'].includes(r.kind) ||
      !Number.isInteger(r.minutes) || r.minutes < 1 || r.minutes > 120 || typeof r.title !== 'string' || r.title.length > 160 ||
      (r.kind.startsWith('book-') ? !r.title.trim() : r.title !== '') ||
      !['child-confirmed','parent-confirmed'].includes(r.confirmed) || !['manual','timer'].includes(r.source) || typeof r.deleted !== 'boolean') throw Error('school.invalidRecord');
  },
  read(owner = AppStorage.owner) {
    const raw = AppStorage.native.getItem(this.key(owner));
    if (raw === null) return null;
    try { return this.validate(JSON.parse(raw)); } catch { throw Error('school.corrupt'); }
  },
  activate() {
    this.owner = AppStorage.owner;
    this.role = 'child';
    let data = this.read();
    if (!data) {
      if (AppStorage.blocked) throw Error('school.changed');
      data = this.empty();
      AppStorage.native.setItem(this.key(), JSON.stringify(data));
    }
    this.profileId = data.active;
    return data;
  },
  allowed(parent = false) {
    if (this.owner !== AppStorage.owner || AppStorage.blocked) throw Error('school.changed');
    if (parent && this.role !== 'parent') throw Error('school.parentOnly');
  },
  profile(data = this.read()) {
    this.allowed();
    const p = data?.profiles.find(p => p.id === this.profileId);
    if (!p) throw Error('school.changed');
    return p;
  },
  mutate(fn, parent = false) {
    this.allowed(parent);
    // 每次操作重读磁盘；失败不改变 UI 内存，不回写旧快照覆盖其他记录。
    const key = this.key(), raw = AppStorage.native.getItem(key), data = this.read();
    if (!data) throw Error('school.corrupt');
    const result = fn(this.profile(data), data);
    this.allowed(parent);
    data.revision++;
    this.validate(data);
    if (AppStorage.native.getItem(key) !== raw) throw Error('school.changed');
    AppStorage.native.setItem(key, JSON.stringify(data));
    return result;
  },
  addRecord(record) {
    this.validateRecord(record);
    if (record.date > this.today()) throw Error('school.future');
    const timer = this.profile().timer;
    const timerDate = record.source === 'timer' && timer?.state === 'draft' && timer.id === record.id && timer.date === record.date && timer.kind === record.kind;
    if (this.role !== 'parent' && ((record.date !== this.today() && !timerDate) || record.confirmed !== 'child-confirmed')) throw Error('school.parentOnly');
    return this.mutate(p => {
      const existing = p.records.find(r => r.id === record.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(record)) throw Error('school.duplicate');
        return false;
      }
      if (p.records.length >= 5000) throw Error('school.full');
      p.records.push(record);
      if (p.timer?.id === record.id) p.timer = null;
      return true;
    });
  },
  editRecord(id, fields) {
    return this.mutate(p => {
      const r = p.records.find(r => r.id === id && !r.deleted);
      if (!r) throw Error('school.changed');
      const next = { ...r, ...fields, id: r.id, source: r.source, deleted: false, confirmed: 'parent-confirmed' };
      this.validateRecord(next);
      if (next.date > this.today()) throw Error('school.future');
      Object.assign(r, next);
    }, true);
  },
  toggleRecord(id, deleted) {
    this.mutate(p => { const r = p.records.find(r => r.id === id); if (!r) throw Error('school.changed'); r.deleted = deleted; }, true);
  },
  select(id) {
    this.mutate((p, data) => { if (!data.profiles.some(p => p.id === id)) throw Error('school.changed'); data.active = id; });
    this.profileId = id; this.role = 'child';
  },
  addProfile(name) {
    const p = this.defaults(name.trim());
    this.mutate((_, data) => { if (data.profiles.length >= 12) throw Error('school.full'); data.profiles.push(p); data.active = p.id; }, true);
    this.profileId = p.id; this.role = 'child';
  },
  schoolDay(date, p = this.profile()) {
    return this.weekday(date) >= 1 && this.weekday(date) <= 5 && !p.settings.holidays.some(h => date >= h.from && date <= h.to);
  },
  nextSchoolDay(date, p = this.profile()) {
    for (let i = 1; i <= 370; i++) { const next = this.shift(date, i); if (this.schoolDay(next, p)) return next; }
    return null;
  },
  prep(date, p = this.profile()) {
    if (!date || !this.schoolDay(date, p)) return [];
    const day = this.weekday(date), tasks = ['folder','water'];
    for (const [id, key] of [['ipad','ipadDays'],['pe','peDays'],['library','libraryDays']]) if (p.settings[key].includes(day)) tasks.push(id);
    return tasks;
  },
  parentTasks(date, p = this.profile()) {
    if (!this.schoolDay(date, p)) return [];
    const day = this.weekday(date), tasks = ['parent-folder'];
    if (p.settings.ipadDays.includes(day)) tasks.push('parent-charge');
    if (day !== p.settings.shortDay) tasks.push('parent-food');
    if (day === 5) tasks.push('newsletter');
    const next = this.nextSchoolDay(date, p);
    let first = true;
    for (let d = date.slice(0,7) + '-01'; d < date; d = this.shift(d,1)) if (this.schoolDay(d,p)) { first = false; break; }
    if (first) tasks.push('submit-log');
    if (!next || next.slice(0,7) !== date.slice(0,7)) tasks.push('prepare-log');
    return tasks;
  },
  daily(date, p = this.profile()) {
    const rows = p.records.filter(r => !r.deleted && r.date === date);
    return { cn: rows.filter(r => r.kind === 'book-cn').reduce((n,r) => n+r.minutes,0),
      en: rows.filter(r => ['book-en','iready-reading'].includes(r.kind)).reduce((n,r) => n+r.minutes,0) };
  },
  weekly(date, p = this.profile()) {
    const start = this.week(date), end = this.shift(start,6), school = p.schoolWeeks[start] || {reading:null,math:null};
    const sum = kind => p.records.filter(r => !r.deleted && r.kind === kind && r.date >= start && r.date <= end).reduce((n,r) => n+r.minutes,0);
    return { start, end, reading: {home:sum('iready-reading'),school:school.reading}, math: {home:sum('iready-math'),school:school.math} };
  },
  monthly(month, p = this.profile()) { return p.records.filter(r => !r.deleted && r.date.startsWith(month + '-') && r.kind.startsWith('book-')).sort((a,b) => a.date.localeCompare(b.date)); },
  elapsed(timer, now = Date.now()) { return Math.min(7200000, timer.elapsedMs + (timer.state === 'running' ? Math.max(0, now - timer.startedAt) : 0)); },
  pauseTimer(state = 'paused', now = Date.now()) {
    this.mutate(p => { if (p.timer) p.timer = {...p.timer, elapsedMs:this.elapsed(p.timer,now),startedAt:now,state}; });
  },
  recoverTimer(now = Date.now()) {
    // 崩溃/被系统终止后不把离开期间的墙钟差补成阅读时间；由孩子或家长补记。
    this.mutate(p => { if (p.timer?.state === 'running') p.timer = {...p.timer,state:'paused',startedAt:now}; });
  }
};
