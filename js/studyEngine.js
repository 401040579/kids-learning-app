// 与 backend/study.py 共用课程证据规则。纯统计不读账号或存储，调用者须先按 owner 隔离日志。
const StudyEngine = {
  intervals: [1, 3, 7, 14, 30],
  fields: ['id', 'occurred_at', 'source', 'subject', 'question_id', 'question', 'expected', 'answer', 'verdict', 'schema_version', 'topic_id', 'taxonomy_version', 'question_version', 'hint_used'],
  catalogPromise: null,
  text(value, limit = 200) { return typeof value === 'string' && value.length > 0 && [...value].length <= limit; },
  validateCatalog(catalog) {
    if (!catalog || typeof catalog !== 'object' || !this.text(catalog.version, 80) || !this.text(catalog.taxonomy_version, 80)
      || !Array.isArray(catalog.topics) || !catalog.topics.length || !Array.isArray(catalog.questions) || !catalog.questions.length) throw Error('课程版本或内容无效');
    const topics = new Map(), ids = new Set();
    for (const topic of catalog.topics) {
      if (!topic || !this.text(topic.id, 80) || topics.has(topic.id) || ['__proto__', 'constructor', 'prototype'].includes(topic.id)
        || !['math', 'science', 'reading'].includes(topic.subject) || !this.text(topic.title)
        || (topic.marble_id !== null && !this.text(topic.marble_id, 80))
        || !Number.isInteger(topic.age_min) || !Number.isInteger(topic.age_max) || !(0 <= topic.age_min && topic.age_min <= topic.age_max && topic.age_max <= 120)) throw Error('课程知识点无效');
      topics.set(topic.id, topic);
    }
    for (const question of catalog.questions) {
      const topic = question && topics.get(question.topic_id);
      if (!question || !this.text(question.id, 120) || ids.has(question.id) || ['__proto__', 'constructor', 'prototype'].includes(question.id)
        || !topic || question.subject !== topic.subject || !this.text(question.version, 32)
        || !Array.isArray(question.choices) || question.choices.length !== 3 || question.choices.some(choice => !this.text(choice))
        || new Set(question.choices).size !== 3 || !question.choices.includes(question.expected)
        || !this.text(question.question, 500) || !this.text(question.hint, 2000) || !this.text(question.explanation, 2000)
        || !['oral', 'screen'].includes(question.modality)
        || (question.subject === 'reading' ? !this.text(question.book_id, 80) || topic.marble_id !== null : question.book_id !== null || !this.text(topic.marble_id, 80))) throw Error('课程题目无效');
      ids.add(question.id);
    }
    return catalog;
  },
  async loadCatalog() {
    if (!this.catalogPromise) {
      const controller = new AbortController();
      let timer;
      const loading = fetch('data/curriculum.json', { signal: controller.signal }).then(response => {
        if (!response.ok) throw Error('课程暂时无法读取');
        return response.json();
      }).then(catalog => this.validateCatalog(catalog));
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(Error('课程读取超时，请重试')); }, 10000);
      });
      this.catalogPromise = Promise.race([loading, timeout]).catch(error => {
        this.catalogPromise = null;
        throw error;
      }).finally(() => clearTimeout(timer));
    }
    return this.catalogPromise;
  },
  options(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw Error('复习参数无效');
    const now = options.now === undefined ? new Date() : options.now;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw Error('复习时钟无效');
    const timezone = options.timezone || 'America/Los_Angeles';
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    return { now, timezone, formatter };
  },
  day(stamp, formatter) {
    const parts = Object.fromEntries(formatter.formatToParts(stamp).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  },
  addDays(day, days) {
    const date = new Date(day + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  },
  stamp(value) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/);
    if (!match) return NaN;
    // Date.parse 会把 2 月 30 日滚到 3 月，必须先检查原始日历值。
    const [, year, month, day, hour, minute, second, fraction = '', zone] = match;
    const y = Number(year), m = Number(month), d = Number(day);
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()
      || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
      || (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) return NaN;
    return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}.${fraction.padEnd(3, '0').slice(0, 3)}${zone}`);
  },
  validEvent(catalog, event, now) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
    const robot = event.source === 'robot';
    const fields = robot ? [...this.fields, 'robot'] : this.fields;
    const keys = Object.keys(event);
    if (keys.length !== fields.length || keys.some(key => !fields.includes(key)) || event.schema_version !== 2
      || !this.text(event.id, 64) || !/^[a-zA-Z0-9_-]{16,64}$/.test(event.id)
      || !['web', 'robot'].includes(event.source) || (typeof event.hint_used !== 'boolean' && !(robot && event.hint_used === null))
      || (robot && !['Jarvis', 'Friday'].includes(event.robot))) return false;
    const question = catalog.questions.find(question => question.id === event.question_id);
    if (!question) return false;
    const topic = catalog.topics.find(topic => topic.id === question.topic_id);
    if (event.subject !== question.subject || event.topic_id !== question.topic_id || event.question_version !== question.version
      || event.taxonomy_version !== (topic.marble_id === null ? null : catalog.taxonomy_version)
      || event.question !== question.question || event.expected !== question.expected) return false;
    if (robot) {
      // 私有桥保留原始转写，不把它改成正确答案；机器人判断不作为独立掌握证据。
      if (!['correct', 'wrong', 'unclear', 'skipped'].includes(event.verdict) || !this.text(event.answer, 2000)
        || (event.verdict === 'skipped' && event.answer !== '—')) return false;
    } else if (event.verdict === 'correct' || event.verdict === 'wrong') {
      if (!question.choices.includes(event.answer) || event.verdict !== (event.answer === question.expected ? 'correct' : 'wrong')) return false;
    } else if (event.verdict === 'skipped') {
      if (event.answer !== '—') return false;
    } else if (event.verdict !== 'unclear' || !this.text(event.answer)) return false;
    const stamp = this.stamp(event.occurred_at);
    return Number.isFinite(stamp) && stamp >= Date.UTC(2000, 0, 1) && stamp <= now.getTime();
  },
  eligible(catalog, event, options = {}) {
    this.validateCatalog(catalog);
    return this.validEvent(catalog, event, this.options(options).now);
  },
  events(catalog, events, now) {
    this.validateCatalog(catalog);
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw Error('复习时钟无效');
    if (!Array.isArray(events)) throw Error('课程日志读取失败');
    const byId = new Map();
    for (const event of events) {
      if (!this.validEvent(catalog, event, now)) continue;
      const stamp = this.stamp(event.occurred_at);
      const normalized = { ...event, occurred_at: new Date(stamp).toISOString() };
      const signature = JSON.stringify(Object.fromEntries(Object.keys(normalized).sort().map(key => [key, normalized[key]])));
      if (!byId.has(event.id)) byId.set(event.id, { event, stamp, signature });
      else if (byId.get(event.id) && byId.get(event.id).signature !== signature) byId.set(event.id, null);
    }
    return [...byId.values()].filter(Boolean).sort((a, b) => a.stamp - b.stamp || (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0));
  },
  states(catalog, events, options = {}) {
    this.validateCatalog(catalog);
    const { now, formatter } = this.options(options), today = this.day(now, formatter);
    const result = Object.fromEntries(catalog.questions.map(question => [question.id, {
      question_id: question.id, topic_id: question.topic_id, stage: 0, due_day: null, last_day: null, last_scored_day: null,
      independent_days: 0, assisted: 0, unknown_hint: 0, wrong: 0, attempts: 0, correct: 0, unclear: 0, skipped: 0, attempted_today: false, seen: false
    }]));
    const independent = new Map(catalog.questions.map(question => [question.id, new Set()]));
    for (const { event, stamp } of this.events(catalog, events, now)) {
      const state = result[event.question_id], day = this.day(new Date(stamp), formatter);
      state.attempts++; state.last_day = day; state.attempted_today ||= day === today;
      if (event.hint_used === true) state.assisted++;
      if (event.hint_used === null) state.unknown_hint++;
      state[event.verdict]++;
      if (!['correct', 'wrong'].includes(event.verdict)) continue;
      state.seen = true;
      if (event.verdict === 'wrong' || event.hint_used || event.source === 'robot') {
        state.stage = 0; state.due_day = this.addDays(day, 1);
      } else {
        independent.get(event.question_id).add(day);
        if (state.last_scored_day !== day) {
          state.stage = Math.min(5, state.stage + 1);
          state.due_day = this.addDays(day, this.intervals[state.stage - 1]);
        }
      }
      state.last_scored_day = day;
      state.independent_days = independent.get(event.question_id).size;
    }
    return result;
  },
  plan(catalog, events, options = {}) {
    const { now, timezone, formatter } = this.options(options), today = this.day(now, formatter);
    const dailyCount = options.dailyCount === undefined ? 4 : options.dailyCount;
    if (!Number.isInteger(dailyCount) || dailyCount < 2 || dailyCount > 6) throw Error('每日短课题数须为 2–6');
    const states = this.states(catalog, events, { now, timezone });
    const questions = catalog.questions.filter(question => question.book_id === null);
    const answered_today = questions.filter(question => states[question.id].attempted_today).length;
    const remaining = Math.max(0, dailyCount - answered_today);
    const order = new Map(questions.map((question, index) => [question.id, index]));
    const due = questions.filter(question => !states[question.id].attempted_today && states[question.id].seen
      && states[question.id].due_day !== null && states[question.id].due_day <= today)
      .sort((a, b) => states[a.id].due_day < states[b.id].due_day ? -1 : states[a.id].due_day > states[b.id].due_day ? 1 : order.get(a.id) - order.get(b.id));
    const fresh = questions.filter(question => !states[question.id].attempted_today && !states[question.id].seen);
    return { questions: [...due.map(question => ({ question_id: question.id, reason: 'review', due_day: states[question.id].due_day })),
      ...fresh.map(question => ({ question_id: question.id, reason: 'new', due_day: null }))].slice(0, remaining),
      answered_today, remaining, due_count: due.length, states, day: today, timezone };
  }
};
