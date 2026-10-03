// 短课程只记录实际作答；游客离线可用，账号切换后旧异步任务不能继续写 UI。
const StudySession = {
  initialized: false,
  catalogPromise: null,
  catalog: null,
  refreshVersion: 0,
  startVersion: 0,
  creating: null,
  current: null,
  timer: null,
  readingSessions: new Set(),
  now() { return Date.now(); },
  owner() { return AppStorage.owner; },
  allowed(owner) { return owner === this.owner() && !AppStorage.blocked; },
  text(key, fallback) {
    return typeof I18n !== 'undefined' ? I18n.t('study.' + key, fallback) : fallback;
  },

  loadCatalog() {
    if (!this.catalogPromise) {
      this.catalogPromise = Promise.resolve().then(() => StudyEngine.loadCatalog())
        .then(catalog => { this.catalog = catalog; return catalog; })
        .catch(error => { this.catalogPromise = null; throw error; });
    }
    return this.catalogPromise;
  },

  settings() {
    const profile = SafeStorage.getObject('kidsProfileData', {});
    const saved = profile.learningSettings || {};
    let timezone = typeof saved.timezone === 'string' ? saved.timezone : 'America/Los_Angeles';
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date()); }
    catch { timezone = 'America/Los_Angeles'; }
    return {
      dailyCount: Number.isInteger(saved.dailyCount) && saved.dailyCount >= 2 && saved.dailyCount <= 6 ? saved.dailyCount : 4,
      minutes: [3, 5, 10].includes(saved.minutes) ? saved.minutes : 5,
      timezone
    };
  },

  saveSettings() {
    const owner = this.owner();
    if (!this.allowed(owner)) return false;
    const dailyCount = Number(document.getElementById('study-daily-count')?.value);
    const minutes = Number(document.getElementById('study-minutes')?.value);
    if (!Number.isInteger(dailyCount) || dailyCount < 2 || dailyCount > 6 || ![3, 5, 10].includes(minutes)) return false;
    const profile = SafeStorage.getObject('kidsProfileData', {});
    const settings = { dailyCount, minutes, timezone: this.settings().timezone };
    if (!safeSetItem('kidsProfileData', JSON.stringify({ ...profile, learningSettings: settings }))) {
      this.setStatus(this.text('settingsFailed', '设置没有保存，请检查设备存储后再试。'));
      return false;
    }
    // 兼容主应用个人资料编辑器；保存资料时 root 也会从磁盘合并此字段。
    if (typeof profileData !== 'undefined' && profileData && this.allowed(owner)) profileData.learningSettings = { ...settings };
    this.refresh();
    return true;
  },

  setStatus(text) {
    const status = document.getElementById('study-status');
    if (status) status.textContent = text;
  },

  async refresh() {
    const owner = this.owner(), version = ++this.refreshVersion, settings = this.settings();
    const daily = document.getElementById('study-daily-count'), minutes = document.getElementById('study-minutes');
    if (daily) daily.value = settings.dailyCount;
    if (minutes) minutes.value = settings.minutes;
    this.setStatus(this.text('loading', '正在准备今天的小练习…'));
    try {
      const catalog = await this.loadCatalog();
      if (version !== this.refreshVersion || !this.allowed(owner)) return;
      await LearningHistory.writes;
      if (version !== this.refreshVersion || !this.allowed(owner)) return;
      const rows = await LearningHistory.records(owner);
      if (version !== this.refreshVersion || !this.allowed(owner)) return;
      const plan = StudyEngine.plan(catalog, rows.map(row => row.event), {
        now: new Date(this.now()), timezone: settings.timezone, dailyCount: settings.dailyCount
      });
      this.setStatus(this.text('dailyStatus', '今天已记录 {answered} 题，还可练 {remaining} 题；每次约 {minutes} 分钟。')
        .replace('{answered}', plan.answered_today).replace('{remaining}', plan.remaining).replace('{minutes}', settings.minutes));
      const preview = document.getElementById('study-preview');
      if (preview) {
        preview.replaceChildren();
        for (const item of plan.questions) {
          const question = catalog.questions.find(row => row.id === item.question_id);
          if (!question) continue;
          const row = document.createElement('li');
          row.textContent = `${item.reason === 'review' ? this.text('reviewLabel', '复习') : this.text('newLabel', '新练习')} · ${question.question}`;
          preview.append(row);
        }
      }
    } catch {
      if (version === this.refreshVersion && this.allowed(owner)) {
        this.setStatus(this.text('unavailable', '小课程暂时打不开，其他小游戏和绘本仍可继续使用。可以稍后重试。'));
        document.getElementById('study-preview')?.replaceChildren();
      }
    }
  },

  node(tag, className, text, id) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    if (id) node.id = id;
    return node;
  },

  ensureModal() {
    let modal = document.getElementById('study-modal');
    if (modal) return modal;
    modal = this.node('div', 'study-modal hidden', undefined, 'study-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'study-title');
    const content = this.node('div', 'study-content');
    const header = this.node('div', 'study-header');
    header.append(this.node('h2', '', this.text('title', '今天的小练习'), 'study-title'));
    const stop = this.node('button', 'study-stop', this.text('stop', '先休息'), 'study-stop');
    stop.type = 'button'; stop.onclick = () => this.stop();
    header.append(stop);
    content.append(header, this.node('p', 'study-progress', '', 'study-progress'));
    const question = this.node('section', 'study-question-area', undefined, 'study-question-area');
    question.append(this.node('h3', 'study-question', '', 'study-question'), this.node('div', 'study-choices', undefined, 'study-choices'));
    const tools = this.node('div', 'study-tools');
    const hint = this.node('button', 'study-hint-button', this.text('hint', '给我一点提示'), 'study-hint-button');
    hint.type = 'button'; hint.onclick = () => this.showHint();
    const reference = this.node('button', 'study-reference-button', this.text('reference', '再看看故事'), 'study-reference-button');
    reference.type = 'button'; reference.onclick = () => this.showReference();
    const skip = this.node('button', 'study-skip', this.text('skip', '这题先跳过'), 'study-skip');
    skip.type = 'button'; skip.onclick = () => this.answer('—', true);
    tools.append(hint, reference, skip);
    question.append(tools, this.node('p', 'study-hint hidden', '', 'study-hint'), this.node('div', 'study-reference hidden', undefined, 'study-reference'));
    content.append(question);
    const feedback = this.node('p', 'study-feedback', '', 'study-feedback');
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    content.append(feedback);
    const actions = this.node('div', 'study-actions');
    const retry = this.node('button', 'study-retry hidden', this.text('retrySave', '重试保存这次答案'), 'study-retry');
    retry.type = 'button'; retry.onclick = () => this.retry();
    const next = this.node('button', 'study-next hidden', this.text('next', '下一题'), 'study-next');
    next.type = 'button'; next.onclick = () => this.next();
    const close = this.node('button', 'study-close hidden', this.text('close', '回到乐园'), 'study-close');
    close.type = 'button'; close.onclick = () => this.close();
    actions.append(retry, next, close);
    content.append(this.node('p', 'study-summary hidden', '', 'study-summary'), actions);
    modal.append(content);
    document.body.append(modal);
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') this.stop(); });
    return modal;
  },

  visible(id, show) {
    const node = document.getElementById(id);
    if (node) node.classList.toggle('hidden', !show);
  },

  translateControls() {
    // 窗口复用且可能正在加载/已结束，不能只在创建节点时翻译按钮。
    for (const [id, key, fallback] of [
      ['study-stop', 'stop', '先休息'],
      ['study-hint-button', 'hint', '给我一点提示'],
      ['study-reference-button', 'reference', '再看看故事'],
      ['study-skip', 'skip', '这题先跳过'],
      ['study-retry', 'retrySave', '重试保存这次答案'],
      ['study-close', 'close', '回到乐园']
    ]) {
      const node = document.getElementById(id);
      if (node) node.textContent = this.text(key, fallback);
    }
  },

  present() {
    this.ensureModal().classList.remove('hidden');
    this.translateControls();
    document.getElementById('study-stop')?.focus();
  },

  async start() { return this.begin('daily'); },

  async startReading(bookId, completionId) {
    if (!this.readingCompletionValid(bookId, completionId)) return false;
    return this.begin('reading', { bookId, completionId });
  },

  readingCompletionValid(bookId, completionId) {
    if (typeof PictureBook === 'undefined') return false;
    const progress = PictureBook.bookProgress[bookId];
    return PictureBook.currentBook?.id === bookId && progress?.activeSession?.id === completionId &&
      !!progress.activeSession.completedAt && PictureBook.completionHistory.some(row => row.id === completionId && row.bookId === bookId);
  },

  async readingEventId(completionId, question) {
    // 同一读完会话的理解题即使刷新、断网或重试也只对应一条作答证据。
    const input = new TextEncoder().encode(JSON.stringify([completionId, question.id, question.version]));
    const digest = await crypto.subtle.digest('SHA-256', input);
    return 'reading-' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 48);
  },

  async begin(kind, context = {}) {
    const owner = this.owner();
    if (!this.allowed(owner)) return false;
    if (this.creating) return false;
    if (this.current?.owner === owner && ((this.current.pending && !this.current.pending.saved) ||
      (!this.current.ended && kind === 'daily' && this.current.kind === 'daily') ||
      (kind === 'reading' && this.current.completionId === context.completionId))) {
      this.present(); this.render(); return true;
    }
    const readingKey = `${owner}:${context.completionId}`;
    const version = ++this.startVersion, guard = { owner, version };
    this.creating = guard;
    clearTimeout(this.timer);
    this.present();
    this.visible('study-question-area', false); this.visible('study-summary', false);
    this.visible('study-next', false); this.visible('study-retry', false); this.visible('study-close', true);
    document.getElementById('study-feedback').textContent = this.text('loading', '正在准备今天的小练习…');
    try {
      const catalog = await this.loadCatalog();
      if (!this.startValid(guard)) return false;
      if (kind === 'reading' && !this.readingCompletionValid(context.bookId, context.completionId)) return false;
      const settings = this.settings();
      let questions, readingIds = {}, previousSaved = 0;
      if (kind === 'reading') {
        questions = catalog.questions.filter(row => row.book_id === context.bookId).slice(0, 2);
        if (!questions.length) throw Error('reading questions unavailable');
        await LearningHistory.writes;
        if (!this.startValid(guard) || !this.readingCompletionValid(context.bookId, context.completionId)) return false;
        const rows = await LearningHistory.records(owner);
        if (!this.startValid(guard) || !this.readingCompletionValid(context.bookId, context.completionId)) return false;
        const ids = await Promise.all(questions.map(question => this.readingEventId(context.completionId, question)));
        if (!this.startValid(guard) || !this.readingCompletionValid(context.bookId, context.completionId)) return false;
        questions.forEach((question, index) => { readingIds[question.id] = ids[index]; });
        questions = questions.filter(question => {
          const saved = rows.find(row => row.event.id === readingIds[question.id]);
          if (!saved) return true;
          if (!StudyEngine.eligible(catalog, saved.event, { now: new Date(this.now()) }) || saved.event.question_id !== question.id) throw Error('reading record conflict');
          previousSaved++;
          return false;
        });
      } else {
        await LearningHistory.writes;
        if (!this.startValid(guard)) return false;
        const rows = await LearningHistory.records(owner);
        if (!this.startValid(guard)) return false;
        const plan = StudyEngine.plan(catalog, rows.map(row => row.event), {
          now: new Date(this.now()), timezone: settings.timezone, dailyCount: settings.dailyCount
        });
        questions = plan.questions.map(item => catalog.questions.find(row => row.id === item.question_id))
          .filter(question => question && question.book_id === null && ['math', 'science'].includes(question.subject));
      }
      if (!this.startValid(guard)) return false;
      this.current = { owner, token: version, kind, bookId: context.bookId || null, completionId: context.completionId || null,
        questions, catalog, readingIds, previousSaved, index: 0, hintUsed: false, pending: null, savedCount: 0, correctCount: 0, wrongCount: 0, skippedCount: 0,
        ended: false, stopRequested: false, reason: null, deadline: this.now() + settings.minutes * 60000 };
      if (kind === 'reading') this.readingSessions.add(readingKey);
      this.creating = null;
      if (!questions.length) this.end(kind === 'reading' ? 'readingDone' : 'empty');
      else {
        this.timer = setTimeout(() => {
          if (this.current?.token === version && this.allowed(owner)) {
            this.current.timeLimitReached = true;
            document.getElementById('study-progress').textContent += ' · ' + this.text('finishThisQuestion', '做完这题就可以休息了。');
          }
        }, settings.minutes * 60000);
        this.render();
      }
      return true;
    } catch {
      if (this.startValid(guard)) {
        this.creating = null;
        document.getElementById('study-feedback').textContent = this.text('unavailable', '小课程暂时打不开，其他小游戏和绘本仍可继续使用。可以稍后重试。');
      }
      return false;
    } finally {
      if (this.creating === guard) this.creating = null;
    }
  },

  startValid(guard) { return this.creating === guard && this.startVersion === guard.version && this.allowed(guard.owner); },
  valid(session) { return this.current === session && session.token === this.startVersion && this.allowed(session.owner); },

  render() {
    this.translateControls();
    const session = this.current;
    if (!session || !this.valid(session)) return;
    document.getElementById('study-title').textContent = session.kind === 'reading' ? this.text('readingTitle', '聊聊刚才的故事') : this.text('title', '今天的小练习');
    this.visible('study-summary', session.ended);
    this.visible('study-question-area', !session.ended);
    this.visible('study-close', session.ended);
    this.visible('study-next', !session.ended && !!session.pending?.saved);
    this.visible('study-retry', !!session.pending && !session.pending.saved && !session.pending.busy);
    document.getElementById('study-retry').disabled = !!session.pending?.busy;
    if (session.ended) {
      document.getElementById('study-progress').textContent = this.text('restTitle', '先休息一下吧。');
      const reason = session.reason === 'time' ? this.text('timeEnded', '约定的练习时间到了。') :
        session.reason === 'empty' ? this.text('dailyDone', '今天的小题单已经记录好了。') :
          session.reason === 'readingDone' ? this.text('readingDone', '这一轮故事小题已有记录，不重复作答。') : this.text('sessionEnded', '这次小练习结束了。');
      const counts = this.text('summary', '这次保存了 {saved} 条记录：答对 {correct}，一起看过答案 {wrong}，跳过 {skipped}；本次题单还有 {remaining} 题未作答。')
        .replace('{saved}', session.savedCount).replace('{correct}', session.correctCount).replace('{wrong}', session.wrongCount)
        .replace('{skipped}', session.skippedCount).replace('{remaining}', session.questions.length - session.savedCount);
      const previous = session.previousSaved ? this.text('readingSaved', '这一轮故事之前已保存 {count} 条理解作答。').replace('{count}', session.previousSaved) : '';
      document.getElementById('study-summary').textContent = `${reason} ${previous} ${counts} ${this.text('evidenceNotice', '一次答对只是一次练习记录，以后还可以再看看。')}`;
      document.getElementById('study-feedback').textContent = session.pending && !session.pending.saved
        ? this.text('unsaved', '这次答案还没有保存。可以重试；结束不会把它算成已完成。') : '';
      return;
    }
    const question = session.questions[session.index], locked = !!session.pending;
    document.getElementById('study-progress').textContent = this.text('progress', '第 {index}/{total} 题 · 已保存 {saved} 条')
      .replace('{index}', session.index + 1).replace('{total}', session.questions.length).replace('{saved}', session.savedCount);
    if (session.timeLimitReached || this.now() >= session.deadline) document.getElementById('study-progress').textContent += ' · ' + this.text('finishThisQuestion', '做完这题就可以休息了。');
    document.getElementById('study-question').textContent = question.question;
    const choices = document.getElementById('study-choices'); choices.replaceChildren();
    for (const choice of question.choices) {
      const button = this.node('button', 'study-choice', choice);
      button.type = 'button'; button.disabled = locked;
      button.onclick = () => { if (this.valid(session) && session.questions[session.index] === question) this.answer(choice); };
      choices.append(button);
    }
    document.getElementById('study-hint-button').disabled = locked;
    document.getElementById('study-skip').disabled = locked;
    document.getElementById('study-reference-button').disabled = locked;
    this.visible('study-reference-button', session.kind === 'reading');
    this.visible('study-hint', session.hintUsed && !session.referenceShown);
    document.getElementById('study-hint').textContent = question.hint;
    this.visible('study-reference', !!session.referenceShown);
    document.getElementById('study-next').textContent = session.index === session.questions.length - 1 || session.timeLimitReached || this.now() >= session.deadline
      ? this.text('finish', '这次先到这里') : this.text('next', '下一题');
    const pending = session.pending;
    let feedback = '';
    if (pending?.busy) feedback = this.text('saving', '正在保存这次答案…');
    else if (pending && !pending.saved) feedback = this.text('unsaved', '这次答案还没有保存。可以重试；结束不会把它算成已完成。');
    else if (pending?.saved) feedback = pending.detail.verdict === 'skipped' ? this.text('skippedNotice', '这题先跳过，已记录跳过，之后还可以再看。') :
      `${pending.detail.verdict === 'correct' ? this.text('correct', '这次答对了！') : this.text('wrong', '一起看看这个想法，再慢慢试。')} ${question.explanation}`;
    document.getElementById('study-feedback').textContent = feedback;
  },

  showHint() {
    const session = this.current;
    if (!session || !this.valid(session) || session.ended || session.pending) return;
    session.hintUsed = true;
    session.referenceShown = false;
    this.render();
  },

  showReference() {
    const session = this.current;
    if (!session || !this.valid(session) || session.kind !== 'reading' || session.ended || session.pending || typeof PictureBook === 'undefined') return;
    const book = PictureBook.books.find(row => row.id === session.bookId);
    if (!book) return;
    session.hintUsed = true;
    session.referenceShown = true;
    const reference = document.getElementById('study-reference'); reference.replaceChildren();
    for (const page of book.pages) reference.append(this.node('p', '', page.text));
    this.render();
  },

  async answer(answer, skipped = false) {
    const session = this.current;
    if (!session || !this.valid(session) || session.ended || session.pending) return false;
    const question = session.questions[session.index];
    if (!skipped && !question.choices.includes(answer)) return false;
    session.pending = { busy: false, saved: false, detail: {
      id: session.kind === 'reading' ? session.readingIds[question.id] : crypto.randomUUID(), occurred_at: new Date(this.now()).toISOString(), source: 'web',
      subject: question.subject, question_id: question.id, question: question.question, expected: question.expected,
      answer: skipped ? '—' : answer, verdict: skipped ? 'skipped' : answer === question.expected ? 'correct' : 'wrong',
      schema_version: 2, topic_id: question.topic_id, taxonomy_version: question.book_id ? null : session.catalog.taxonomy_version,
      question_version: question.version, hint_used: session.hintUsed
    } };
    return this.savePending(session);
  },

  async savePending(session) {
    if (!this.valid(session) || !session.pending || session.pending.saved || session.pending.busy) return false;
    const pending = session.pending;
    pending.busy = true; this.render();
    let saved = false;
    try { saved = await LearningHistory.record(pending.detail); }
    catch { saved = false; }
    pending.busy = false;
    if (!this.valid(session) || session.pending !== pending) return false;
    if (saved === true) {
      pending.saved = true;
      session.savedCount++;
      if (pending.detail.verdict === 'correct') session.correctCount++;
      else if (pending.detail.verdict === 'wrong') session.wrongCount++;
      else session.skippedCount++;
      this.refresh();
    }
    if (session.stopRequested) this.end('manual');
    else this.render();
    return saved === true;
  },

  async retry() {
    const session = this.current;
    if (!session || !this.valid(session)) return false;
    return this.savePending(session);
  },

  next() {
    const session = this.current;
    if (!session || !this.valid(session) || session.ended || !session.pending?.saved) return;
    if (this.now() >= session.deadline || session.timeLimitReached) { this.end('time'); return; }
    if (session.index === session.questions.length - 1) { this.end('done'); return; }
    session.index++;
    session.pending = null;
    session.hintUsed = false;
    session.referenceShown = false;
    this.render();
  },

  end(reason) {
    const session = this.current;
    if (!session || !this.valid(session)) return;
    clearTimeout(this.timer);
    session.ended = true;
    session.reason = reason;
    this.render();
  },

  stop() {
    if (this.creating) { this.startVersion++; this.creating = null; this.close(); return; }
    const session = this.current;
    if (!session || !this.valid(session)) { this.close(); return; }
    session.stopRequested = true;
    if (!session.pending?.busy) this.end('manual');
    else document.getElementById('study-feedback').textContent = this.text('stopping', '正在保存这次答案，保存结果出来后就结束。');
  },

  close() {
    if (this.creating) { this.startVersion++; this.creating = null; }
    document.getElementById('study-modal')?.classList.add('hidden');
    // 保存失败的 pending 保留；同账号再次打开时仍可重试，不伪造完成。
  },

  accountChanged() {
    this.startVersion++;
    this.refreshVersion++;
    this.creating = null;
    this.current = null;
    clearTimeout(this.timer);
    this.close();
    this.refresh();
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    for (const id of ['study-start', 'study-start-profile']) {
      const button = document.getElementById(id);
      if (button) button.onclick = () => this.start();
    }
    for (const id of ['study-daily-count', 'study-minutes']) {
      const input = document.getElementById(id);
      if (input) input.addEventListener('change', () => this.saveSettings());
    }
    window.addEventListener('accountChanged', () => this.accountChanged());
    window.addEventListener('learningRecorded', event => { if (event.detail?.owner === this.owner()) this.refresh(); });
    window.addEventListener('learningSynced', () => this.refresh());
    window.addEventListener('languageChanged', () => { this.refresh(); this.render(); });
    window.addEventListener('online', () => this.refresh());
    this.refresh();
  }
};

document.addEventListener('learningReady', () => StudySession.init());
