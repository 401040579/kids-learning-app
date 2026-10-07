// 独立学校日常面板：不调用积分、学习事件、通知、AI 或远端接口。
const SchoolDay = {
  isOpen: false,
  view: 'today',
  interval: null,
  draftId: null,
  editId: null,
  returnFocus: null,
  text(key, vars = {}) {
    let value = I18n.t('school.' + key);
    for (const [k,v] of Object.entries(vars)) value = value.replaceAll('{' + k + '}', String(v));
    return value;
  },
  el(id) { return document.getElementById('sd-' + id); },
  make(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  },
  button(label, action, attrs = {}) {
    const b = this.make('button', this.text(label)); b.type = 'button'; b.dataset.action = action;
    for (const [key,value] of Object.entries(attrs)) b.setAttribute(key,value);
    return b;
  },
  field(parent, key, id, type = 'text', value = '') {
    const label = this.make('label', this.text(key), 'sd-field');
    const input = this.make('input'); input.id = 'sd-' + id; input.type = type; input.value = value;
    label.append(input); parent.append(label); return input;
  },
  init() {
    const root = this.make('section', undefined, 'school-day hidden'); root.id = 'school-day';
    root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-labelledby','sd-title');
    root.innerHTML = `<div class="sd-sheet"><header class="sd-header"><h2 id="sd-title" data-i18n="school.title"></h2><button type="button" id="sd-close" data-action="close" data-i18n="school.close"></button></header><p id="sd-privacy" class="sd-note" data-i18n="school.privacy"></p><div class="sd-toolbar"><label class="sd-profile-label"><span data-i18n="school.profile"></span><select id="sd-profile"></select></label><button type="button" id="sd-parent" data-action="parent" data-i18n="school.parent"></button></div><nav class="sd-tabs" aria-label="School day"><button type="button" data-action="today" data-i18n="school.today"></button><button type="button" data-action="reading" data-i18n="school.reading"></button><button type="button" data-action="manage" id="sd-manage-tab" data-i18n="school.manage"></button></nav><p id="sd-status" class="sd-status" role="status" aria-live="polite"></p><main id="sd-content"></main><div id="sd-print" class="sd-print"></div></div>`;
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-action]');
      if (b && root.contains(b)) this.action(b.dataset.action,b);
    });
    root.addEventListener('change', e => {
      if (e.target.id === 'sd-profile') this.attempt(() => {
        this.pause(); SchoolDayStore.select(e.target.value); this.editId = null; this.draftId = null; this.view = 'today'; this.render();
      });
      if (e.target.id === 'sd-kind') this.kindChanged();
      if (e.target.id === 'sd-month') this.renderMonth(e.target.value);
      if (e.target.dataset.check) this.attempt(() => {
        const key = e.target.dataset.check;
        SchoolDayStore.mutate(p => { p.checks[key] = e.target.checked; }, key.includes('|parent-') || /\|(newsletter|prepare-log|submit-log)$/.test(key));
        this.status('saved');
      }, () => { e.target.checked = !e.target.checked; });
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      if (e.key === 'Tab') {
        const all = [...root.querySelectorAll('button,input,select,textarea,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
        const first = all[0], last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    document.body.append(root);
    window.addEventListener('languageChanged', () => { if (this.isOpen) this.render(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.isOpen) this.pause(); });
    window.addEventListener('pagehide', () => { if (this.isOpen) this.pause(); });
    window.addEventListener('accountChanged', () => { if (this.isOpen) this.close(); SchoolDayStore.role = 'child'; });
    window.addEventListener('storage', e => {
      if (this.isOpen && e.key === SchoolDayStore.key()) {
        this.attempt(() => {
          const data = SchoolDayStore.read();
          if (!data.profiles.some(p => p.id === SchoolDayStore.profileId)) SchoolDayStore.profileId = data.active;
          this.editId = null; this.draftId = null; this.render(); this.status('otherTab');
        });
      }
    });
  },
  status(key, vars) { if (this.el('status')) this.el('status').textContent = key ? this.text(key,vars) : ''; },
  attempt(fn, failed) {
    try { return fn(); }
    catch (e) { failed?.(); this.status(e.message?.startsWith('school.') ? e.message.slice(7) : 'saveFailed'); return false; }
  },
  open() {
    if (this.isOpen) return;
    this.returnFocus = document.activeElement;
    this.isOpen = true;
    this.previousAnalyticsDisabled = window['ga-disable-G-RCEWX2DDQQ'];
    window['ga-disable-G-RCEWX2DDQQ'] = true;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.getElementById('school-day').classList.remove('hidden');
    this.view = 'today'; this.draftId = null; this.editId = null;
    this.attempt(() => {
      SchoolDayStore.activate();
      const interrupted = SchoolDayStore.profile().timer?.state === 'running';
      if (interrupted) SchoolDayStore.recoverTimer();
      this.render();
      if (interrupted) this.status('timerRecovered');
    }, () => { this.el('content').replaceChildren(this.make('p',this.text('corrupt'))); this.el('profile').replaceChildren(); });
    this.el('close').focus();
    clearInterval(this.interval); this.interval = setInterval(() => this.tick(),1000);
  },
  close() {
    this.pause(); this.isOpen = false; SchoolDayStore.role = 'child'; this.editId = null; this.draftId = null;
    clearInterval(this.interval); this.interval = null;
    document.getElementById('school-day').classList.add('hidden');
    document.body.style.overflow = this.previousOverflow || '';
    window['ga-disable-G-RCEWX2DDQQ'] = this.previousAnalyticsDisabled;
    this.returnFocus?.focus();
  },
  pause() {
    if (SchoolDayStore.owner !== AppStorage.owner || AppStorage.blocked) return;
    this.attempt(() => { if (SchoolDayStore.profile().timer?.state === 'running') { SchoolDayStore.pauseTimer(); this.tick(); } });
  },
  render() {
    this.renderDay = SchoolDayStore.today();
    const data = SchoolDayStore.read(), p = SchoolDayStore.profile(data);
    this.el('profile').replaceChildren(...data.profiles.map(profile => {
      const option = this.make('option',profile.name || this.text('defaultProfile')); option.value = profile.id; option.selected = profile.id === p.id; return option;
    }));
    this.el('parent').textContent = this.text(SchoolDayStore.role === 'parent' ? 'childMode' : 'parent');
    this.el('manage-tab').hidden = SchoolDayStore.role !== 'parent';
    document.querySelectorAll('#school-day [data-i18n]').forEach(el => { el.textContent = I18n.t(el.dataset.i18n); });
    this.el('parent').textContent = this.text(SchoolDayStore.role === 'parent' ? 'childMode' : 'parent');
    document.querySelectorAll('.sd-tabs button').forEach(b => b.setAttribute('aria-current', String(b.dataset.action === this.view)));
    this.status(''); this.el('content').replaceChildren(); this.el('print').replaceChildren();
    if (this.view === 'today') this.renderToday(p);
    if (this.view === 'reading') this.renderReading(p);
    if (this.view === 'manage' && SchoolDayStore.role === 'parent') this.renderManage(p);
  },
  section(title) { const s = this.make('section',undefined,'sd-section'); s.append(this.make('h3',this.text(title))); this.el('content').append(s); return s; },
  checks(parent, tasks, date, p) {
    const list = this.make('div',undefined,'sd-checks');
    tasks.forEach(task => {
      const label = this.make('label',undefined,'sd-check');
      const input = this.make('input'); input.type = 'checkbox'; input.dataset.check = date + '|' + task; input.checked = !!p.checks[input.dataset.check];
      label.append(input,this.make('span',this.text('task.' + task))); list.append(label);
    }); parent.append(list);
  },
  renderToday(p) {
    const today = SchoolDayStore.today(), day = SchoolDayStore.weekday(today), isSchool = SchoolDayStore.schoolDay(today,p), next = SchoolDayStore.nextSchoolDay(today,p), daily = SchoolDayStore.daily(today,p);
    const heading = this.make('div',undefined,'sd-today-heading'); heading.append(this.make('p',today),this.make('p',this.text('pacific'))); this.el('content').append(heading);
    const reading = this.section('dailyReading');
    reading.append(this.make('p',this.text(isSchool ? 'dailyNote' : 'holidayNote'),'sd-note'));
    const rows = this.make('div',undefined,'sd-reading-goals');
    for (const lang of ['cn','en']) {
      const row = this.make('div',undefined,'sd-goal');
      row.append(this.make('strong',this.text(lang)),this.make('p',this.text('dailyMinutes',{minutes:daily[lang]})));
      const progress = this.make('progress'); progress.max = 10; progress.value = Math.min(10,daily[lang]); progress.setAttribute('aria-label',this.text(lang)); row.append(progress);
      row.append(this.button('recordNow','reading',{'data-kind':lang === 'cn' ? 'book-cn' : 'book-en'})); rows.append(row);
    } reading.append(rows,this.make('p',this.text('noPenalty'),'sd-note'));
    const bag = this.section('prepare'); bag.append(this.make('p',next ? this.text('nextSchool',{date:next}) : this.text('noSchoolDate')));
    this.checks(bag,SchoolDayStore.prep(next,p),next,p);
    if (next && SchoolDayStore.weekday(next) === p.settings.shortDay) bag.append(this.make('p',this.text('shortDay'),'sd-note'));
    const week = SchoolDayStore.weekly(today,p), ir = this.section('iready');
    ir.append(this.make('p',`${week.start} – ${week.end}`));
    for (const key of ['reading','math']) ir.append(this.make('p',this.text('weekMinutes',{subject:this.text('iready.' + key),home:week[key].home,school:week[key].school === null ? this.text('unknown') : week[key].school})));
    ir.append(this.make('p',this.text('ireadyNote'),'sd-note'));
    const link = this.make('a',this.text('clever')); link.href = p.settings.cleverUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; link.className = 'sd-link'; ir.append(link);
    if (SchoolDayStore.role === 'parent') {
      const parent = this.section('parentToday');
      if (!isSchool) parent.append(this.make('p',this.text('schoolPaused')));
      this.checks(parent,SchoolDayStore.parentTasks(today,p),today,p);
      const nextTasks = next ? SchoolDayStore.parentTasks(next,p).filter(t => t.startsWith('parent-')) : [];
      if (nextTasks.length) { parent.append(this.make('h4',this.text('nextSchool',{date:next}))); this.checks(parent,nextTasks,next,p); }
      parent.append(this.make('p',p.settings.foodNote || this.text('foodDefault'),'sd-note'));
      if (p.settings.pickupNote) parent.append(this.make('p',p.settings.pickupNote));
      if (p.settings.conferenceStart && today <= p.settings.conferenceEnd && today >= SchoolDayStore.shift(p.settings.conferenceStart,-7)) parent.append(this.make('p',this.text('conferenceWindow',{from:p.settings.conferenceStart,to:p.settings.conferenceEnd})));
      const reminders = p.reminders.filter(r => today >= SchoolDayStore.shift(r.date,-(r.kind === 'absence' ? 1 : 7)) && today <= r.date);
      reminders.forEach(r => parent.append(this.make('p',`${r.date} · ${this.text('reminder.' + r.kind)}: ${r.text}`)));
      if (reminders.some(r => r.kind === 'absence')) parent.append(this.make('p',this.text('absenceNote'),'sd-note'));
      parent.append(this.make('p',this.text('reminderNote'),'sd-note'));
    }
    if (isSchool && day === p.settings.shortDay) bag.append(this.make('p',this.text('shortToday'),'sd-note'));
  },
  renderReading(p) {
    const timer = p.timer;
    const s = this.section(this.editId ? 'editReading' : 'recordReading');
    s.append(this.make('p',this.text('confirmationNote'),'sd-note'));
    const record = this.editId ? p.records.find(r => r.id === this.editId && !r.deleted) : null;
    const draft = record || (timer?.state === 'draft' ? timer : null);
    this.draftId = draft?.id || this.draftId || SchoolDayStore.id();
    const fields = this.make('div',undefined,'sd-fields');
    const label = this.make('label',this.text('kind'),'sd-field'), select = this.make('select'); select.id = 'sd-kind';
    for (const kind of ['book-cn','book-en','iready-reading','iready-math']) {
      const option = this.make('option',this.text('kind.' + kind)); option.value = kind; option.selected = (draft?.kind || timer?.kind || this.readingKind || 'book-cn') === kind; select.append(option);
    } label.append(select); fields.append(label);
    const title = this.field(fields,'bookTitle','book','text',draft?.title || timer?.title || ''); title.maxLength = 160;
    title.readOnly = !!timer && timer.state !== 'draft';
    const date = this.field(fields,'date','date','date',draft?.date || SchoolDayStore.today()); date.max = SchoolDayStore.today(); date.required = true;
    date.disabled = SchoolDayStore.role !== 'parent' || !!timer;
    const minutes = this.field(fields,'minutes','minutes','number',draft ? draft.minutes || Math.floor(SchoolDayStore.elapsed(draft)/60000) : '');
    minutes.min = 1; minutes.max = 120; minutes.step = 1;
    s.append(fields);
    const timerBox = this.make('div',undefined,'sd-timer'); timerBox.id = 'sd-timer';
    const display = this.make('output','00:00'); display.id = 'sd-clock'; display.setAttribute('aria-label',this.text('timer')); timerBox.append(display);
    const start = this.button(timer?.state === 'paused' ? 'resumeTimer' : 'startTimer','startTimer'); start.id = 'sd-start';
    const pause = this.button('pauseTimer','pauseTimer'); pause.id = 'sd-pause';
    const finish = this.button('finishTimer','finishTimer'); finish.id = 'sd-finish';
    const discard = this.button('discardTimer','discardTimer'); discard.id = 'sd-discard';
    timerBox.append(start,pause,finish,discard); if (!this.editId) s.append(timerBox,this.make('p',this.text('timerNote'),'sd-note'));
    const confirmed = this.make('label',undefined,'sd-check'); const checkbox = this.make('input'); checkbox.type = 'checkbox'; checkbox.id = 'sd-confirm';
    confirmed.append(checkbox,this.make('span',this.text(SchoolDayStore.role === 'parent' ? 'parentConfirm' : 'childConfirm'))); s.append(confirmed);
    const save = this.button(this.editId ? 'saveCorrection' : 'saveRecord','saveRecord'); save.id = 'sd-save-record'; save.className = 'sd-primary'; s.append(save);
    if (this.editId) s.append(this.button('cancelEdit','cancelEdit'));
    this.kindChanged(); this.tick();
    const month = this.section('monthlyList');
    this.field(month,'month','month','month',SchoolDayStore.today().slice(0,7));
    month.append(this.make('p',this.text('listNote'),'sd-note'));
    const target = this.make('div'); target.id = 'sd-month-list'; month.append(target);
    if (SchoolDayStore.role === 'parent') month.append(this.button('print','print'));
    this.renderMonth(SchoolDayStore.today().slice(0,7));
    if (SchoolDayStore.role === 'parent') {
      const rows = this.section('correctRecords');
      for (const r of [...p.records].reverse().slice(0,100)) {
        const row = this.make('div',undefined,'sd-record-row'); row.append(this.make('p',`${r.date} · ${r.title || this.text('kind.' + r.kind)} · ${r.minutes} ${this.text('minuteUnit')} · ${this.text(r.deleted ? 'removed' : r.confirmed)}`));
        if (!r.deleted) row.append(this.button('edit','edit',{'data-id':r.id}));
        row.append(this.button(r.deleted ? 'undo' : 'remove',r.deleted ? 'undo' : 'remove',{'data-id':r.id})); rows.append(row);
      }
      if (!p.records.length) rows.append(this.make('p',this.text('noRecords')));
      if (p.records.length > 100) rows.append(this.make('p',this.text('recent100'),'sd-note'));
    }
  },
  kindChanged() {
    const select = this.el('kind'), title = this.el('book'); if (!select || !title) return;
    title.disabled = !select.value.startsWith('book-'); title.required = !title.disabled;
    title.closest('label').hidden = title.disabled;
  },
  tick() {
    if (!this.isOpen) return;
    if (SchoolDayStore.owner !== AppStorage.owner || AppStorage.blocked) { this.status('changed'); this.el('content').replaceChildren(); return; }
    const today = SchoolDayStore.today();
    if (today !== this.renderDay && this.view === 'today') { this.attempt(() => this.render()); return; }
    if (this.el('date') && !this.editId && SchoolDayStore.role === 'child') this.attempt(() => { if (!SchoolDayStore.profile().timer) this.el('date').value = today; });
    if (!this.el('clock')) return;
    this.attempt(() => {
      const timer = SchoolDayStore.profile().timer;
      const elapsed = timer ? SchoolDayStore.elapsed(timer) : 0, sec = Math.floor(elapsed/1000);
      this.el('clock').textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
      this.el('start').hidden = !!timer && timer.state !== 'paused';
      this.el('pause').hidden = timer?.state !== 'running';
      this.el('finish').hidden = !timer || timer.state === 'draft';
      this.el('discard').hidden = !timer;
      this.el('save-record').disabled = !!timer && timer.state !== 'draft';
      this.el('kind').disabled = !!timer;
      if (elapsed === 7200000 && timer?.state === 'running') { SchoolDayStore.pauseTimer(); this.status('timerLimit'); }
    });
  },
  renderMonth(month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
    const rows = SchoolDayStore.monthly(month), total = rows.reduce((sum,r) => sum+r.minutes,0);
    const table = this.make('table',undefined,'sd-table'), caption = this.make('caption',this.text('monthSummary',{month,count:rows.length,minutes:total})); table.append(caption);
    const head = this.make('thead'), hr = this.make('tr');
    for (const key of ['date','bookTitle','language','minutes','confirmation']) { const th = this.make('th',this.text(key)); th.scope = 'col'; hr.append(th); }
    head.append(hr); table.append(head); const body = this.make('tbody');
    rows.forEach(r => {
      const tr = this.make('tr'); for (const value of [r.date,r.title,this.text(r.kind === 'book-cn' ? 'cn' : 'en'),r.minutes,this.text(r.confirmed)]) tr.append(this.make('td',value)); body.append(tr);
    }); table.append(body);
    const root = this.el('month-list'); root.replaceChildren(table);
    if (!rows.length) root.append(this.make('p',this.text('noBooks')));
    const print = this.el('print'); print.replaceChildren(this.make('h2',this.text('monthlyList')),this.make('p',SchoolDayStore.profile().name || this.text('defaultProfile')),table.cloneNode(true),this.make('p',this.text('listNote')));
  },
  renderManage(p) {
    SchoolDayStore.allowed(true);
    const s = this.section('templateSettings'); s.append(this.make('p',this.text('templateNote'),'sd-note'));
    const name = this.field(s,'profileName','profile-name','text',p.name); name.maxLength = 60;
    const layout = this.make('div',undefined,'sd-fields');
    for (const key of ['ipadDays','peDays','libraryDays']) this.field(layout,key,key,'text',p.settings[key].join(','));
    const short = this.field(layout,'shortDaySetting','short-day','number',p.settings.shortDay); short.min = 1; short.max = 5;
    s.append(layout,this.make('p',this.text('weekdayHelp'),'sd-note'));
    const food = this.field(s,'foodNote','food-note','text',p.settings.foodNote || this.text('foodDefault')); food.maxLength = 300;
    const pickup = this.field(s,'pickupNote','pickup-note','text',p.settings.pickupNote); pickup.maxLength = 300;
    this.field(s,'conferenceStart','conference-start','date',p.settings.conferenceStart); this.field(s,'conferenceEnd','conference-end','date',p.settings.conferenceEnd);
    s.append(this.make('p',this.text('conferenceNote'),'sd-note'),this.button('saveSettings','saveSettings'));
    const holiday = this.section('holidays'); holiday.append(this.make('p',this.text('holidayHelp'),'sd-note'));
    this.field(holiday,'from','holiday-from','date'); this.field(holiday,'to','holiday-to','date'); holiday.append(this.button('addHoliday','addHoliday'));
    p.settings.holidays.forEach((h,index) => { const row = this.make('div',undefined,'sd-record-row'); row.append(this.make('p',`${h.from} – ${h.to}`),this.button('remove','removeHoliday',{'data-index':index})); holiday.append(row); });
    const ir = this.section('schoolIready'); const week = SchoolDayStore.weekly(SchoolDayStore.today(),p);
    this.field(ir,'weekStart','week','date',week.start);
    this.field(ir,'schoolReading','school-reading','number',week.reading.school === null ? '' : week.reading.school);
    this.field(ir,'schoolMath','school-math','number',week.math.school === null ? '' : week.math.school);
    for (const id of ['school-reading','school-math']) { this.el(id).min = 0; this.el(id).max = 2000; this.el(id).step = 1; }
    this.el('week').addEventListener('change', () => this.attempt(() => {
      const date = this.el('week').value; if (!SchoolDayStore.validDate(date)) return;
      const target = SchoolDayStore.weekly(date);
      this.el('week').value = target.start; this.el('school-reading').value = target.reading.school ?? ''; this.el('school-math').value = target.math.school ?? '';
    }));
    ir.append(this.make('p',this.text('schoolIreadyNote'),'sd-note'),this.button('saveSchoolMinutes','saveSchoolMinutes'));
    const reminders = this.section('reminders');
    const label = this.make('label',this.text('reminderType'),'sd-field'), select = this.make('select'); select.id = 'sd-reminder-kind';
    for (const kind of ['pickup','conference','absence','other']) { const option = this.make('option',this.text('reminder.' + kind)); option.value = kind; select.append(option); } label.append(select); reminders.append(label);
    this.field(reminders,'date','reminder-date','date'); const note = this.field(reminders,'reminderText','reminder-text','text'); note.maxLength = 300;
    reminders.append(this.button('addReminder','addReminder'),this.make('p',this.text('absenceNote'),'sd-note'),this.make('p',this.text('reminderNote'),'sd-note'));
    p.reminders.forEach(r => { const row = this.make('div',undefined,'sd-record-row'); row.append(this.make('p',`${r.date} · ${this.text('reminder.' + r.kind)}: ${r.text}`),this.button('remove','removeReminder',{'data-id':r.id})); reminders.append(row); });
    const profiles = this.section('localProfiles'); this.field(profiles,'newProfile','new-profile','text'); this.el('new-profile').maxLength = 60; profiles.append(this.button('addProfile','addProfile'));
    profiles.append(this.make('p',this.text('profileNote'),'sd-note'));
    const backup = this.section('localBackup'); backup.append(this.make('p',this.text('backupNote'),'sd-note'),this.button('export','export'));
    const fileLabel = this.make('label',this.text('restore'),'sd-field'), file = this.make('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.id = 'sd-import';
    file.addEventListener('change', () => this.restore(file)); fileLabel.append(file); backup.append(fileLabel);
    backup.append(this.make('p',this.text('parentGateNote'),'sd-note'));
  },
  action(action, button) {
    this.attempt(() => {
      if (action === 'close') return this.close();
      SchoolDayStore.allowed();
      if (action === 'parent') {
        if (SchoolDayStore.role === 'parent') { SchoolDayStore.role = 'child'; this.view = 'today'; }
        else if (confirm(this.text('parentGate'))) SchoolDayStore.role = 'parent';
        this.editId = null; this.draftId = null; this.render(); return;
      }
      if (['today','reading','manage'].includes(action)) {
        if (action === 'manage') SchoolDayStore.allowed(true);
        if (action === 'reading') this.readingKind = button.dataset.kind || 'book-cn';
        this.pause(); this.editId = null; this.view = action; this.render(); return;
      }
      if (action === 'startTimer') {
        const existing = SchoolDayStore.profile().timer;
        if (existing && existing.state !== 'paused') throw Error('school.changed');
        const kind = this.el('kind').value;
        const timer = existing || {id:this.draftId,kind,date:SchoolDayStore.today(),title:kind.startsWith('book-') ? this.el('book').value.trim() : '',elapsedMs:0,startedAt:Date.now(),state:'running'};
        if (timer.kind.startsWith('book-') && !timer.title) throw Error('school.invalidRecord');
        SchoolDayStore.mutate(p => { p.timer = {...timer,state:'running',startedAt:Date.now()}; }); this.render(); return;
      }
      if (action === 'pauseTimer') { SchoolDayStore.pauseTimer(); this.tick(); return; }
      if (action === 'finishTimer') { SchoolDayStore.pauseTimer('draft'); this.render(); this.status('timerConfirm'); return; }
      if (action === 'discardTimer') {
        if (!confirm(this.text('discardConfirm'))) return;
        SchoolDayStore.mutate(p => { p.timer = null; }); this.draftId = null; this.render(); return;
      }
      if (action === 'saveRecord') {
        if (!this.el('confirm').checked) throw Error('school.mustConfirm');
        const timer = SchoolDayStore.profile().timer;
        if (timer && timer.state !== 'draft') throw Error('school.timerConfirm');
        const kind = this.el('kind').value, record = {id:timer?.id || this.draftId,date:this.el('date').value,kind,minutes:Number(this.el('minutes').value),
          title:kind.startsWith('book-') ? this.el('book').value.trim() : '',confirmed:SchoolDayStore.role === 'parent' ? 'parent-confirmed' : 'child-confirmed',source:timer ? 'timer' : 'manual',deleted:false};
        if (this.editId) SchoolDayStore.editRecord(this.editId,record); else SchoolDayStore.addRecord(record);
        this.editId = null; this.draftId = null; this.render(); this.status('saved'); return;
      }
      if (action === 'cancelEdit') { this.editId = null; this.draftId = null; this.render(); return; }
      if (action === 'edit') { SchoolDayStore.allowed(true); if (SchoolDayStore.profile().timer) throw Error('school.timerConfirm'); this.editId = button.dataset.id; this.render(); this.el('kind').focus(); return; }
      if (action === 'remove' || action === 'undo') { SchoolDayStore.toggleRecord(button.dataset.id,action === 'remove'); this.render(); this.status('saved'); return; }
      if (action === 'print') { SchoolDayStore.allowed(true); window.print(); return; }
      if (action === 'saveSettings') {
        const parseDays = key => this.el(key).value.trim() === '' ? [] : this.el(key).value.split(',').map(v => Number(v.trim()));
        SchoolDayStore.mutate(p => { p.name = this.el('profile-name').value.trim(); p.settings = {...p.settings,ipadDays:parseDays('ipadDays'),peDays:parseDays('peDays'),libraryDays:parseDays('libraryDays'),shortDay:Number(this.el('short-day').value),foodNote:this.el('food-note').value.trim(),pickupNote:this.el('pickup-note').value.trim(),conferenceStart:this.el('conference-start').value,conferenceEnd:this.el('conference-end').value}; },true);
        this.render(); this.status('saved'); return;
      }
      if (action === 'addHoliday') {
        SchoolDayStore.mutate(p => { p.settings.holidays.push({from:this.el('holiday-from').value,to:this.el('holiday-to').value}); },true); this.render(); this.status('saved'); return;
      }
      if (action === 'removeHoliday') { SchoolDayStore.mutate(p => { p.settings.holidays.splice(Number(button.dataset.index),1); },true); this.render(); return; }
      if (action === 'saveSchoolMinutes') {
        const date = this.el('week').value; if (!SchoolDayStore.validDate(date) || date > SchoolDayStore.today()) throw Error('school.invalidRecord');
        const value = id => this.el(id).value === '' ? null : Number(this.el(id).value);
        SchoolDayStore.mutate(p => { p.schoolWeeks[SchoolDayStore.week(date)] = {reading:value('school-reading'),math:value('school-math')}; },true);
        this.render(); this.status('saved'); return;
      }
      if (action === 'addReminder') {
        SchoolDayStore.mutate(p => { p.reminders.push({id:SchoolDayStore.id(),date:this.el('reminder-date').value,kind:this.el('reminder-kind').value,text:this.el('reminder-text').value.trim()}); },true); this.render(); this.status('saved'); return;
      }
      if (action === 'removeReminder') { SchoolDayStore.mutate(p => { p.reminders = p.reminders.filter(r => r.id !== button.dataset.id); },true); this.render(); return; }
      if (action === 'addProfile') {
        const name = this.el('new-profile').value.trim(); if (!name) throw Error('school.invalidRecord');
        this.pause(); SchoolDayStore.addProfile(name); this.view = 'today'; this.draftId = null; this.render(); return;
      }
      if (action === 'export') {
        SchoolDayStore.allowed(true); this.pause();
        const payload = {app:'kids-school-local',version:1,profile:SchoolDayStore.profile()};
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
        const link = this.make('a'); link.href = url; link.download = 'school-local-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return;
      }
    });
  },
  async restore(file) {
    const owner = AppStorage.owner, profileId = SchoolDayStore.profileId;
    this.attempt(() => SchoolDayStore.allowed(true));
    if (SchoolDayStore.role !== 'parent' || !file.files[0]) return;
    try {
      if (file.files[0].size > 5000000) throw Error('school.full');
      const payload = JSON.parse(await file.files[0].text());
      if (owner !== AppStorage.owner || profileId !== SchoolDayStore.profileId || !this.isOpen) throw Error('school.changed');
      SchoolDayStore.allowed(true);
      if (payload.app !== 'kids-school-local' || payload.version !== 1 || !payload.profile) throw Error('school.corrupt');
      const incoming = payload.profile; SchoolDayStore.validate({version:1,revision:0,active:incoming.id,profiles:[incoming]});
      if (!confirm(this.text('restoreConfirm'))) return;
      incoming.timer = null;
      SchoolDayStore.mutate((p,data) => { data.profiles.push({...incoming,id:SchoolDayStore.id()}); },true);
      this.render(); this.status('restored');
    } catch (e) { this.status(e.message?.startsWith('school.') ? e.message.slice(7) : 'saveFailed'); }
  }
};
document.addEventListener('learningReady', () => SchoolDay.init());
