// 学习报告只用当前分区的逐题日志计算周期统计；奖励系统的旧累计计数另列。
const LearningReport = {
  period: 'week',
  activeReport: null,
  renderVersion: 0,
  subjectDefinitions: {
    math: { name: '数学', english: 'Math', icon: '🔢', color: '#FF6B6B' },
    english: { name: '英语', english: 'English', icon: '🔤', color: '#4ECDC4' },
    chinese: { name: '中文', english: 'Chinese', icon: '📝', color: '#45B7D1' },
    science: { name: '科学', english: 'Science', icon: '🔬', color: '#96CEB4' },
    reading: { name: '阅读理解', english: 'Reading comprehension', icon: '📖', color: '#DCA86B' },
    history: { name: '历史', english: 'History', icon: '🏛️', color: '#C49ADB' },
    computing: { name: '计算机', english: 'Computing', icon: '💻', color: '#91AECE' },
    life_skills: { name: '生活技能', english: 'Life skills', icon: '🏡', color: '#E3B96B' },
    social: { name: '个人与社交', english: 'Personal and social', icon: '🤝', color: '#E6A4B4' },
    learning_to_learn: { name: '学习方法', english: 'Learning to learn', icon: '💡', color: '#ADBD84' }
  },
  // 新键未翻译的语言采用英语兜底，与 I18n 的加载规则一致。
  messages: {
    week: ['近 7 天', 'Last 7 days'], month: ['本月', 'This month'], all: ['全部时间', 'All time'],
    heading: ['{period}学习报告', '{period} learning report'], loading: ['正在读取学习记录…', 'Loading learning records…'],
    unavailable: ['学习记录暂时无法读取，请稍后重试。累计积分不能代替本期记录。', 'Learning records could not be read. Please try again. Lifetime points cannot replace period records.'],
    records: ['作答记录', 'Answer records'], correct: ['答对', 'Correct'], wrong: ['答错', 'Incorrect'], accuracy: ['正确率', 'Accuracy'],
    unclear: ['无法判断', 'Unclear'], skipped: ['跳过', 'Skipped'],
    verdictNote: ['无法判断 {unclear} 次，跳过 {skipped} 次；正确率只计算答对与答错。', 'Unclear: {unclear}; skipped: {skipped}. Accuracy includes only correct and incorrect answers.'],
    days: ['有作答的天数：{days}', 'Days with answer records: {days}'],
    scope: ['仅统计本期逐题日志，不用累计奖励推算。重复练习按每次作答记录。', 'Based on individual answer records in this period. Lifetime rewards are not estimates of period activity. Repeated attempts are counted separately.'],
    local: ['游客记录仅在当前设备保存。', 'Guest records are stored on this device only.'],
    source: ['来源：网页 {web} 次 · 机器人 {robot} 次', 'Sources: web {web} · robot {robot}'],
    pending: ['本期待上传网页记录：{count}。其他设备和机器人记录以最近一次同步为准。', 'Pending web uploads in this period: {count}. Other devices and robot records reflect the latest completed sync.'],
    distribution: ['学科练习分布', 'Practice by subject'], subjectDetail: ['{name}：答对 {correct}，答错 {wrong}，无法判断 {unclear}，跳过 {skipped}，正确率 {accuracy}', '{name}: correct {correct}, incorrect {wrong}, unclear {unclear}, skipped {skipped}, accuracy {accuracy}'],
    empty: ['本期还没有逐题作答记录。可以做一道题后再来看。', 'No individual answer records in this period yet. Try a question and return here.'],
    mostPracticed: ['本期练习最多的是{subject}。练习次数不等于掌握程度。', '{subject} has the most practice records in this period. Practice counts do not measure mastery.'],
    review: ['本期有 {count} 次答错，可以挑一两道题再练习。', 'There are {count} incorrect attempts in this period. Try reviewing one or two questions.'],
    unclearSuggestion: ['有 {count} 次回答没有判断清楚，可以放慢节奏或在安静的地方再试。', '{count} answers could not be judged. Try a slower pace or a quieter place.'],
    encouragement: ['保持轻松的节奏，学一点、休息一下。', 'Keep a comfortable pace: learn a little and take a break.'],
    suggestions: ['学习建议', 'Learning suggestions'], cumulative: ['奖励系统累计（不限时间）', 'Lifetime rewards (all time)'],
    cumulativeNote: ['以下是网页奖励与当前存档状态，可能包含没有逐题日志的旧记录；不与本期作答数相加，也不包含机器人奖励。', 'These are web rewards and the current saved state. They may include older activity without answer logs. They are not added to period totals and do not include robot rewards.'],
    points: ['累计积分', 'Lifetime points'], tasks: ['累计任务', 'Lifetime tasks'], legacyCorrect: ['累计答对', 'Lifetime correct'], achievements: ['当前成就', 'Current achievements'],
    streak: ['当前连续签到：{count} 天', 'Current check-in streak: {count} days'],
    wrongBook: ['当前错题本：待复习 {unmastered} 道 · 已掌握 {mastered} 道', 'Current wrong-answer notebook: to review {unmastered} · mastered {mastered}'],
    shareLoading: ['报告还未读完，请稍后再分享。', 'The report is still loading. Please try sharing again shortly.'],
    copied: ['报告已复制到剪贴板！', 'Report copied to clipboard!'], copyFailed: ['复制失败，请手动复制。', 'Copy failed. Please copy manually.'],
    evidence: ['本期练习证据', 'Practice evidence in this period'],
    independentCorrect: ['未用提示答对', 'Correct without a hint'], assistedCorrect: ['提示后答对', 'Correct after a hint'],
    unknownCorrect: ['答对但提示状态未知', 'Correct, hint use unknown'],
    evidenceSample: ['可判断作答样本 {judged} 次；其中 {unknownHintAttempts} 次没有记录是否使用提示（旧网页或机器人等）。', 'There are {judged} judged attempts; hint use was not recorded for {unknownHintAttempts} attempts, including older web or robot records.'],
    evidenceNote: ['这里只说明记录到的练习表现。同题同日重复不会变成多个知识点已掌握，也不依据复习阶段判断能力。', 'These are observations from practice. Repeating a question on one day does not establish mastery of multiple skills, and review stages are not ability scores.'],
    evidenceEmpty: ['本期还没有可判断的作答样本，证据不足，暂不判断学习能力。', 'There are no judged attempts in this period. Evidence is insufficient to assess learning ability.'],
    courseUnavailable: ['课程证据信息暂时无法读取。本期作答统计仍可查看，请稍后重试。', 'Course evidence could not be loaded. Period answer totals remain available; please try again.'],
    topics: ['近期课程知识点练习', 'Recent practice by course topic'],
    courseSample: ['匹配当前课程的记录：{courseAttempts} 次作答、{questionCount} 道不同题、{topicCount} 个练习知识点。', 'Records matching the current course: {courseAttempts} attempts, {questionCount} distinct questions, and {topicCount} practiced topics.'],
    courseEmpty: ['本期没有能匹配当前课程版本的练习证据。旧模块和机器人记录仍计入上方统计，不据此推断课程能力。', 'There is no practice evidence matching the current course version in this period. Older web and robot records remain in the totals above, but cannot establish course ability.'],
    topicSample: ['{attempts} 次作答 · {questionCount} 道题 · 未用提示答对 {independentCorrect} 次 · 提示后答对 {assistedCorrect} 次 · 提示未知答对 {unknownCorrect} 次 · 答错 {wrong} 次', '{attempts} attempts · {questionCount} questions · correct without hints {independentCorrect} · correct after hints {assistedCorrect} · correct with unknown hints {unknownCorrect} · incorrect {wrong}'],
    topicDays: ['在 {independentDays} 个不同日期记录到未用提示答对；这仍是练习证据，不是掌握结论。', 'Correct answers without hints were recorded on {independentDays} different days. This is practice evidence, not a mastery conclusion.'],
    example: ['例题：{question}（最近一次：{result}）', 'Example: {question} (latest attempt: {result})'],
    shortReview: ['短课到期复习（查看全部历史）', 'Short-lesson reviews due (using all history)'],
    reviewDue: ['按 {timezone} 日期安排，今天还有 {count} 道到期短课题未练习。', 'Using {timezone} dates, {count} short-lesson questions are due and have not been practiced today.'],
    reviewNone: ['目前没有今天待做的到期短课题。这不表示所有知识点已经掌握。', 'There are no due short-lesson questions left for today. This does not establish mastery of all topics.'],
    reviewExample: ['{question} · 复习日期 {day}', '{question} · review date {day}'],
    reviewUnavailable: ['复习安排暂时无法读取，不能把读取失败当成没有待复习题。', 'The review schedule could not be read. This must not be interpreted as having no questions to review.'],
    readingReviewNote: ['阅读理解随对应绘本练习，另列练习证据；下面的到期清单只包含短课题。', 'Reading comprehension is practiced with its book and has separate evidence; the due list below contains short-lesson questions only.'],
    losAngelesTimezone: ['洛杉矶', 'Los Angeles'], utcTimezone: ['协调世界时（UTC）', 'UTC']
  },

  t(key, values = {}) {
    const fullKey = 'report.' + key;
    const translated = typeof I18n !== 'undefined' ? I18n.t(fullKey) : fullKey;
    const fallback = this.messages[key] || [key, key];
    let text = translated === fullKey ? fallback[typeof I18n !== 'undefined' && I18n.currentLang === 'zh' ? 0 : 1] : translated;
    for (const [name, value] of Object.entries(values)) text = text.replaceAll('{' + name + '}', String(value));
    return text;
  },
  escape(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); },
  normalizePeriod(period) { return ['week', 'month', 'all'].includes(period) ? period : 'week'; },
  owner() { return typeof LearningHistory !== 'undefined' ? LearningHistory.owner() : typeof AppStorage !== 'undefined' ? AppStorage.owner : 'guest'; },
  count(value) { return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0; },
  courseTimezone: 'America/Los_Angeles',
  captureCourseTimezone(owner = this.owner()) {
    try {
      const timezone = owner === this.owner() && typeof StudySession !== 'undefined' && typeof StudySession.settings === 'function'
        ? StudySession.settings().timezone : null;
      if (typeof timezone === 'string' && timezone) {
        new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
        return timezone;
      }
    } catch { /* 设置缺失或非法时沿用原家庭默认值。 */ }
    return this.courseTimezone;
  },
  timezoneLabel(timezone) {
    return timezone === 'America/Los_Angeles' ? this.t('losAngelesTimezone') : timezone === 'UTC' ? this.t('utcTimezone') : timezone.replaceAll('_', ' ');
  },
  subjectName(key) {
    const definition = this.subjectDefinitions[key];
    const translated = typeof I18n !== 'undefined' ? I18n.t('history.' + key) : 'history.' + key;
    return translated !== 'history.' + key ? translated : definition[typeof I18n !== 'undefined' && I18n.currentLang === 'zh' ? 'name' : 'english'];
  },

  periodRows(rows, period, now, owner, deduplicate = true) {
    if (!Array.isArray(rows)) throw Error('history-invalid');
    period = this.normalizePeriod(period);
    const end = now.getTime();
    const start = period === 'week' ? end - 7 * 86400000
      : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : 0;
    const ids = new Set();
    return rows.filter(row => {
      if (!row || row.owner !== owner || !row.event) return false;
      const event = row.event, stamp = Date.parse(event.occurred_at);
      if (!Number.isFinite(stamp) || stamp < start || stamp > end || !Object.hasOwn(this.subjectDefinitions, event.subject)
        || !['correct', 'wrong', 'unclear', 'skipped'].includes(event.verdict) || !['web', 'robot'].includes(event.source)) return false;
      if (deduplicate && event.id && ids.has(event.id)) return false;
      if (event.id) ids.add(event.id);
      return true;
    });
  },

  evidenceResult(event) {
    if (event.verdict !== 'correct') return this.t(event.verdict === 'wrong' ? 'wrong' : event.verdict === 'skipped' ? 'skipped' : 'unclear');
    if (event.source !== 'web' || event.schema_version !== 2 || typeof event.hint_used !== 'boolean') return this.t('unknownCorrect');
    return this.t(event.hint_used ? 'assistedCorrect' : 'independentCorrect');
  },

  courseDay(stamp, timezone = this.courseTimezone) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(stamp));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  },

  // 提示状态只在 v2 网页记录明确；课程分组复用调度器的严格 canonical 校验。
  summarizeEvidence(rows, catalog, period = 'week', now = new Date(), owner = this.owner(), timezone = this.courseTimezone) {
    const selected = this.periodRows(rows, period, now, owner);
    const result = { total: selected.length, judged: 0, independentCorrect: 0, assistedCorrect: 0, unknownCorrect: 0,
      wrong: 0, unclear: 0, skipped: 0, unknownHintAttempts: 0, courseAttempts: 0, questionCount: 0,
      questionDays: 0, independentQuestionDays: 0, topicCount: 0, topics: [], status: 'unavailable' };
    const available = catalog && Array.isArray(catalog.topics) && Array.isArray(catalog.questions)
      && typeof StudyEngine !== 'undefined' && typeof StudyEngine.events === 'function';
    const questions = new Map(available ? catalog.questions.map(question => [question.id, question]) : []);
    const definitions = new Map(available ? catalog.topics.map(topic => [topic.id, topic]) : []);
    const groups = new Map(), questionIds = new Set(), questionDays = new Set(), independentDays = new Set();
    for (const row of selected) {
      const event = row.event;
      const knownHint = event.source === 'web' && event.schema_version === 2 && typeof event.hint_used === 'boolean';
      if (!knownHint && ['correct', 'wrong'].includes(event.verdict)) result.unknownHintAttempts++;
      if (event.verdict === 'correct') result[knownHint ? event.hint_used ? 'assistedCorrect' : 'independentCorrect' : 'unknownCorrect']++;
      else result[event.verdict]++;
    }
    // 同 ID 内容冲突时，不挑一条作为技能证据；与复习状态共用规范化、排序、去重规则。
    const courseEvents = available ? StudyEngine.events(catalog,
      this.periodRows(rows, period, now, owner, false).map(row => row.event), now) : [];
    for (const { event, stamp } of courseEvents) {
      const knownHint = event.source === 'web' && event.schema_version === 2 && typeof event.hint_used === 'boolean';
      const question = questions.get(event.question_id), definition = question && definitions.get(question.topic_id);
      if (!definition) continue;
      const day = this.courseDay(stamp, timezone);
      result.courseAttempts++;
      questionIds.add(question.id);
      questionDays.add(`${question.id}:${day}`);
      if (event.verdict === 'correct' && knownHint && event.hint_used === false) independentDays.add(`${question.id}:${day}`);
      let group = groups.get(definition.id);
      if (!group) {
        group = { id: definition.id, title: definition.title, subject: definition.subject, attempts: 0,
          independentCorrect: 0, assistedCorrect: 0, unknownCorrect: 0, wrong: 0, unclear: 0, skipped: 0, lastStamp: -1,
          questionIds: new Set(), independentDays: new Set(), questions: new Map() };
        groups.set(definition.id, group);
      }
      group.attempts++;
      group.questionIds.add(question.id);
      if (event.verdict === 'correct') {
        group[knownHint ? event.hint_used ? 'assistedCorrect' : 'independentCorrect' : 'unknownCorrect']++;
        if (knownHint && event.hint_used === false) group.independentDays.add(day);
      } else group[event.verdict]++;
      group.lastStamp = Math.max(group.lastStamp, stamp);
      const previous = group.questions.get(question.id);
      // 时间优先，稳定 ID 只用于完全同时间的确定排序，不依赖到达顺序。
      if (!previous || stamp > previous.stamp || (stamp === previous.stamp && String(event.id) > previous.eventId)) {
        group.questions.set(question.id, { question_id: question.id, question: question.question, stamp,
          eventId: String(event.id), verdict: event.verdict, hint_used: event.hint_used, result: this.evidenceResult(event) });
      }
    }
    result.judged = result.independentCorrect + result.assistedCorrect + result.unknownCorrect + result.wrong;
    result.questionCount = questionIds.size;
    result.questionDays = questionDays.size;
    result.independentQuestionDays = independentDays.size;
    result.topicCount = groups.size;
    result.status = available ? 'ready' : 'unavailable';
    result.topics = [...groups.values()].sort((a, b) => b.lastStamp - a.lastStamp || a.id.localeCompare(b.id)).map(group => ({
      id: group.id, title: group.title, subject: group.subject, attempts: group.attempts,
      independentCorrect: group.independentCorrect, assistedCorrect: group.assistedCorrect, unknownCorrect: group.unknownCorrect, wrong: group.wrong,
      unclear: group.unclear, skipped: group.skipped, questionCount: group.questionIds.size,
      independentDays: group.independentDays.size, lastAt: new Date(group.lastStamp).toISOString(),
      examples: [...group.questions.values()].sort((a, b) => b.stamp - a.stamp || a.question_id.localeCompare(b.question_id)).slice(0, 2)
    }));
    return result;
  },

  reviewEvidence(rows, catalog, now = new Date(), owner = this.owner(), timezone = this.courseTimezone) {
    if (!catalog || typeof StudyEngine === 'undefined' || typeof StudyEngine.plan !== 'function') return { status: 'unavailable' };
    try {
      const events = this.periodRows(rows, 'all', now, owner, false).map(row => row.event);
      const plan = StudyEngine.plan(catalog, events, { now, timezone });
      if (!plan || !plan.states || !Number.isFinite(plan.due_count) || typeof plan.day !== 'string') throw Error('review-invalid');
      const examples = catalog.questions.filter(question => {
        const state = plan.states[question.id];
        return question.book_id === null && state?.seen && !state.attempted_today && typeof state.due_day === 'string' && state.due_day <= plan.day;
      }).map(question => ({ question_id: question.id, question: question.question, day: plan.states[question.id].due_day }))
        .sort((a, b) => a.day.localeCompare(b.day) || catalog.questions.findIndex(q => q.id === a.question_id) - catalog.questions.findIndex(q => q.id === b.question_id)).slice(0, 4);
      return { status: 'ready', dueCount: this.count(plan.due_count), day: plan.day, timezone: plan.timezone || timezone, examples };
    } catch {
      return { status: 'unavailable' };
    }
  },

  // 可测的统计逻辑不读存储、不修改事件；设备本地自然月与历史面板保持一致。
  summarize(rows, period = 'week', now = new Date(), owner = this.owner()) {
    period = this.normalizePeriod(period);
    const end = now.getTime();
    const start = period === 'week' ? end - 7 * 86400000
      : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : 0;
    const subjects = {};
    const makeSubject = key => ({ key, name: this.subjectName(key), icon: this.subjectDefinitions[key].icon,
      color: this.subjectDefinitions[key].color, total: 0, correct: 0, wrong: 0, unclear: 0, skipped: 0, judged: 0, accuracy: null });
    for (const key of ['math', 'english', 'chinese', 'science', 'reading']) subjects[key] = makeSubject(key);
    const overview = { total: 0, totalCorrect: 0, totalWrong: 0, unclear: 0, skipped: 0, judged: 0,
      accuracy: null, activeDays: 0, pending: 0, sources: { web: 0, robot: 0, robots: { Jarvis: 0, Friday: 0 } } };
    const dates = new Set(), ids = new Set();
    for (const row of rows) {
      // 即使异步读取的测试桩/损坏记录返回其他分区，也不能把它算入当前孩子。
      if (!row || row.owner !== owner || !row.event) continue;
      const event = row.event, stamp = Date.parse(event.occurred_at);
      if (!Number.isFinite(stamp) || stamp < start || stamp > end || !Object.hasOwn(this.subjectDefinitions, event.subject)
        || !['correct', 'wrong', 'unclear', 'skipped'].includes(event.verdict) || !['web', 'robot'].includes(event.source)) continue;
      if (event.id && ids.has(event.id)) continue;
      if (event.id) ids.add(event.id);
      const subject = subjects[event.subject] || (subjects[event.subject] = makeSubject(event.subject));
      subject.total++; subject[event.verdict]++; overview.total++;
      if (event.verdict === 'correct') overview.totalCorrect++;
      else if (event.verdict === 'wrong') overview.totalWrong++;
      else overview[event.verdict]++;
      overview.sources[event.source]++;
      if (event.source === 'robot' && Object.hasOwn(overview.sources.robots, event.robot)) overview.sources.robots[event.robot]++;
      if (event.source === 'web' && !row.synced) overview.pending++;
      const date = new Date(stamp);
      dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    }
    overview.activeDays = dates.size;
    overview.judged = overview.totalCorrect + overview.totalWrong;
    overview.accuracy = overview.judged ? Math.round(100 * overview.totalCorrect / overview.judged) : null;
    for (const subject of Object.values(subjects)) {
      subject.judged = subject.correct + subject.wrong;
      subject.accuracy = subject.judged ? Math.round(100 * subject.correct / subject.judged) : null;
    }
    const subjectArray = Object.values(subjects).sort((a, b) => b.total - a.total);
    return { period, periodName: this.t(period), generatedAt: now.toISOString(), owner,
      range: { start: new Date(start).toISOString(), end: now.toISOString() }, overview, subjects, subjectArray,
      // 作答量不足以推断能力，保留旧字段但不再生成“强项/弱项”结论。
      analysis: { strongest: null, weakest: null, mostPracticed: subjectArray.find(subject => subject.total > 0) || null } };
  },

  cumulativeState() {
    const data = typeof RewardSystem !== 'undefined' ? RewardSystem.data || {} : {};
    const checkin = typeof DailyCheckin !== 'undefined' ? DailyCheckin.data || {} : {};
    const achievements = typeof AchievementSystem !== 'undefined' ? AchievementSystem.data || {} : {};
    const subjectCorrect = {};
    for (const key of ['math', 'english', 'chinese', 'science']) subjectCorrect[key] = this.count(data[key + 'Correct']);
    let wrongQuestions = null;
    try {
      if (typeof WrongQuestions !== 'undefined') {
        const stats = WrongQuestions.getStats();
        wrongQuestions = { unmastered: this.count(stats.unmastered), mastered: this.count(stats.mastered) };
      }
    } catch { /* 错题本损坏不能阻止逐题报告；不把读取失败显示成“零错题”。 */ }
    return { totalScore: this.count(data.totalScore), totalTasks: this.count(data.tasksDone),
      totalCorrect: Object.values(subjectCorrect).reduce((sum, value) => sum + value, 0), subjectCorrect,
      currentStreak: this.count(checkin.currentStreak), achievements: this.count(achievements.totalUnlocked), wrongQuestions };
  },

  async generateReport(period = 'week') {
    const owner = this.owner(), version = this.renderVersion;
    if (typeof LearningHistory === 'undefined') throw Error('history-unavailable');
    await LearningHistory.writes;
    if (owner !== this.owner() || version !== this.renderVersion) return null;
    const rows = await LearningHistory.records(owner);
    if (owner !== this.owner() || version !== this.renderVersion) return null;
    // 读取日志后同步固定截止时刻和该账号的家庭时区，目录等待不能混入新设置。
    const now = new Date(), timezone = this.captureCourseTimezone(owner);
    let catalog = null;
    if (typeof StudySession !== 'undefined' && typeof StudySession.loadCatalog === 'function') {
      try { catalog = await StudySession.loadCatalog(); }
      catch { /* 目录失败不能让可靠的旧报告消失，也不能伪装成“无课程证据”。 */ }
    }
    if (owner !== this.owner() || version !== this.renderVersion) return null;
    const report = this.summarize(rows, period, now, owner);
    try { report.evidence = this.summarizeEvidence(rows, catalog, period, now, owner, timezone); }
    catch { report.evidence = this.summarizeEvidence(rows, null, period, now, owner, timezone); }
    report.courseReview = this.reviewEvidence(rows, catalog, now, owner, timezone);
    report.cumulative = this.cumulativeState();
    report.suggestions = this.generateSuggestions(report);
    return report;
  },

  generateSuggestions(report) {
    if (!report.overview.total) return [{ icon: '📚', text: this.t('empty') }];
    const suggestions = [];
    if (report.overview.totalWrong) suggestions.push({ icon: '📕', text: this.t('review', { count: report.overview.totalWrong }) });
    if (report.overview.unclear) suggestions.push({ icon: '🎧', text: this.t('unclearSuggestion', { count: report.overview.unclear }) });
    suggestions.push({ icon: '🌱', text: this.t('encouragement') });
    return suggestions;
  },

  generateEvidenceHTML(report) {
    if (!report.evidence) return '';
    const evidence = report.evidence, review = report.courseReview;
    const e = value => this.escape(value), t = (key, values) => e(this.t(key, values));
    const stat = (value, key) => `<div class="report-stat-card"><span class="report-stat-value">${e(value)}</span><span class="report-stat-label">${t(key)}</span></div>`;
    const topics = evidence.status !== 'ready' ? `<p class="report-date">${t('courseUnavailable')}</p>`
      : `<p class="report-date">${t('courseSample', evidence)}</p>${evidence.topics.length
        ? `<div class="report-suggestions">${evidence.topics.slice(0, 6).map(topic => `<div class="report-suggestion-item"><span class="suggestion-icon">${this.subjectDefinitions[topic.subject]?.icon || '📚'}</span>
          <div class="suggestion-text"><strong>${e(topic.title)}</strong><p>${t('topicSample', topic)}</p><p>${t('topicDays', topic)}</p>
          ${topic.examples.map(example => `<p class="report-date">${t('example', example)}</p>`).join('')}</div></div>`).join('')}</div>`
        : `<p>${t('courseEmpty')}</p>`}`;
    const reviewHTML = !review || review.status !== 'ready' ? `<p class="report-date">${t('reviewUnavailable')}</p>`
      : `<p>${t('reviewDue', { count: review.dueCount, timezone: this.timezoneLabel(review.timezone) })}</p>${review.dueCount
        ? `<div class="report-suggestions">${review.examples.map(example => `<div class="report-suggestion-item"><span class="suggestion-icon">📕</span><span class="suggestion-text">${t('reviewExample', example)}</span></div>`).join('')}</div>`
        : `<p class="report-date">${t('reviewNone')}</p>`}`;
    return `<div class="report-section report-evidence-section"><h3>🔎 ${t('evidence')}</h3>
      <div class="report-overview">${stat(evidence.independentCorrect, 'independentCorrect')}${stat(evidence.assistedCorrect, 'assistedCorrect')}${stat(evidence.unknownCorrect, 'unknownCorrect')}${stat(evidence.wrong, 'wrong')}</div>
      <p class="report-date">${t('evidenceSample', evidence)}</p><p class="report-date">${t('evidenceNote')}</p>
      ${evidence.judged ? '' : `<p>${t('evidenceEmpty')}</p>`}</div>
      <div class="report-section report-course-section"><h3>📚 ${t('topics')}</h3>${topics}</div>
      <div class="report-section report-review-section"><h3>📅 ${t('shortReview')}</h3><p class="report-date">${t('readingReviewNote')}</p>${reviewHTML}</div>`;
  },

  generateReportHTML(report) {
    const e = value => this.escape(value), t = (key, values) => e(this.t(key, values));
    const stat = (icon, value, key) => `<div class="report-stat-card"><span class="report-stat-icon">${icon}</span><span class="report-stat-value">${e(value)}</span><span class="report-stat-label">${t(key)}</span></div>`;
    const max = Math.max(...report.subjectArray.map(subject => subject.total), 1);
    const subjectBars = report.subjectArray.map(subject => `<div class="report-subject-row">
      <span class="report-subject-icon">${subject.icon}</span><span class="report-subject-name">${e(subject.name)}</span>
      <div class="report-subject-bar"><div class="report-subject-fill" style="width: ${subject.total * 100 / max}%; background: ${subject.color}"></div></div>
      <span class="report-subject-count">${subject.total}</span></div>`).join('');
    const details = report.subjectArray.filter(subject => subject.total).map(subject => `<p class="report-date">${t('subjectDetail', {
      ...subject, accuracy: subject.accuracy === null ? '—' : subject.accuracy + '%' })}</p>`).join('');
    const overview = report.overview, cumulative = report.cumulative;
    const robotNames = Object.entries(overview.sources.robots).filter(([, count]) => count).map(([name, count]) => `${name} ${count}`).join(' · ');
    const cumulativeHTML = cumulative ? `<div class="report-section"><h3>⭐ ${t('cumulative')}</h3><p class="report-date">${t('cumulativeNote')}</p>
      <div class="report-overview">${stat('⭐', cumulative.totalScore, 'points')}${stat('📋', cumulative.totalTasks, 'tasks')}${stat('✅', cumulative.totalCorrect, 'legacyCorrect')}${stat('🏆', cumulative.achievements, 'achievements')}</div>
      <p>${t('streak', { count: cumulative.currentStreak })}</p>
      ${cumulative.wrongQuestions ? `<p>${t('wrongBook', cumulative.wrongQuestions)}</p>` : ''}</div>` : '';
    return `<div class="learning-report"><div class="report-header"><h2>📊 ${t('heading', { period: report.periodName })}</h2>
      <p class="report-date">${e(new Date(report.generatedAt).toLocaleDateString())}</p></div>
      <p class="report-date">${t('scope')}</p><p class="report-date">${report.owner === 'guest' ? t('local') : t('pending', { count: overview.pending })}</p>
      <div class="report-overview">${stat('📝', overview.total, 'records')}${stat('✅', overview.totalCorrect, 'correct')}${stat('🌱', overview.totalWrong, 'wrong')}${stat('📊', overview.accuracy === null ? '—' : overview.accuracy + '%', 'accuracy')}</div>
      <p class="report-date">${t('verdictNote', overview)}</p><p class="report-date">${t('days', { days: overview.activeDays })}</p>
      <p class="report-date">${t('source', overview.sources)}${robotNames ? ' · ' + e(robotNames) : ''}</p>
      ${this.generateEvidenceHTML(report)}
      <div class="report-section"><h3>📚 ${t('distribution')}</h3><div class="report-subjects">${subjectBars}</div>${details}
        ${overview.total ? `<p>${t('mostPracticed', { subject: report.analysis.mostPracticed.name })}</p>` : `<p>${t('empty')}</p>`}</div>
      <div class="report-section"><h3>🌱 ${t('suggestions')}</h3><div class="report-suggestions">${report.suggestions.map(suggestion => `<div class="report-suggestion-item"><span class="suggestion-icon">${suggestion.icon}</span><span class="suggestion-text">${e(suggestion.text)}</span></div>`).join('')}</div></div>
      ${cumulativeHTML}</div>`;
  },

  generateShareData(report) {
    const stats = report.overview;
    const content = [this.t('heading', { period: report.periodName }),
      `📝 ${this.t('records')}: ${stats.total}`, `✅ ${this.t('correct')}: ${stats.totalCorrect}`,
      `🌱 ${this.t('wrong')}: ${stats.totalWrong}`, `📊 ${this.t('accuracy')}: ${stats.accuracy === null ? '—' : stats.accuracy + '%'}`,
      this.t('verdictNote', stats), this.t('source', stats.sources), this.t('scope')];
    if (report.evidence) {
      const evidence = report.evidence;
      content.push(`${this.t('independentCorrect')}: ${evidence.independentCorrect}`,
        `${this.t('assistedCorrect')}: ${evidence.assistedCorrect}`, `${this.t('unknownCorrect')}: ${evidence.unknownCorrect}`,
        this.t('evidenceSample', evidence));
      if (!evidence.judged) content.push(this.t('evidenceEmpty'));
      if (evidence.status === 'ready') {
        content.push(this.t('courseSample', evidence));
        for (const topic of evidence.topics.slice(0, 3)) content.push(`${topic.title}: ${this.t('topicSample', topic)}; ${this.t('topicDays', topic)}`);
        if (!evidence.topics.length) content.push(this.t('courseEmpty'));
      } else content.push(this.t('courseUnavailable'));
      content.push(this.t('evidenceNote'));
    }
    if (report.courseReview?.status === 'ready') {
      content.push(this.t('reviewDue', { count: report.courseReview.dueCount, timezone: this.timezoneLabel(report.courseReview.timezone) }));
      for (const example of report.courseReview.examples.slice(0, 2)) content.push(this.t('reviewExample', example));
      if (!report.courseReview.dueCount) content.push(this.t('reviewNone'));
    } else if (report.evidence) content.push(this.t('reviewUnavailable'));
    return { title: content[0], content: content.join('\n') };
  }
};

async function showLearningReport(period = 'week') {
  const modal = document.getElementById('learning-report-modal');
  const content = document.getElementById('learning-report-content');
  if (!modal || !content) return;
  if (typeof RecentlyUsed !== 'undefined') RecentlyUsed.track('report');
  period = LearningReport.normalizePeriod(period);
  const version = ++LearningReport.renderVersion, owner = LearningReport.owner();
  LearningReport.period = period; LearningReport.activeReport = null;
  document.querySelectorAll('.report-period-btn').forEach(button => button.classList.toggle('active', button.dataset.period === period));
  content.textContent = LearningReport.t('loading'); modal.classList.remove('hidden');
  try {
    const report = await LearningReport.generateReport(period);
    if (version !== LearningReport.renderVersion || owner !== LearningReport.owner() || modal.classList.contains('hidden') || !report) return;
    LearningReport.activeReport = report;
    content.innerHTML = LearningReport.generateReportHTML(report);
  } catch {
    if (version === LearningReport.renderVersion && owner === LearningReport.owner() && !modal.classList.contains('hidden')) content.textContent = LearningReport.t('unavailable');
  }
}

function closeLearningReport() {
  LearningReport.renderVersion++; LearningReport.activeReport = null;
  document.getElementById('learning-report-modal')?.classList.add('hidden');
}
function changeReportPeriod(period) { return showLearningReport(period); }

function shareReport() {
  // 分享已展示的周期快照，保持 Web Share 调用处于点击手势中，也不会把本月偷偷改成本周。
  const report = LearningReport.activeReport, owner = LearningReport.owner();
  if (!report || report.owner !== owner) { alert(LearningReport.t('shareLoading')); return; }
  const data = LearningReport.generateShareData(report);
  if (navigator.share) navigator.share({ title: data.title, text: data.content }).catch(error => {
    if (error.name !== 'AbortError' && owner === LearningReport.owner()) copyReportToClipboard(data.content, owner);
  });
  else copyReportToClipboard(data.content, owner);
}

function copyReportToClipboard(content, owner = LearningReport.owner()) {
  if (owner !== LearningReport.owner()) return;
  if (navigator.clipboard) navigator.clipboard.writeText(content).then(() => {
    if (owner === LearningReport.owner()) alert(LearningReport.t('copied'));
  }).catch(() => { if (owner === LearningReport.owner()) fallbackCopyToClipboard(content, owner); });
  else fallbackCopyToClipboard(content, owner);
}
function fallbackCopyToClipboard(content, owner = LearningReport.owner()) {
  if (owner !== LearningReport.owner()) return;
  const textarea = document.createElement('textarea');
  textarea.value = content; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
  document.body.appendChild(textarea); textarea.select();
  try { alert(LearningReport.t(document.execCommand('copy') ? 'copied' : 'copyFailed')); }
  catch { alert(LearningReport.t('copyFailed')); }
  finally { document.body.removeChild(textarea); }
}

// 刷新仅重读当前分区；退出、关闭或切换周期后旧异步结果不能覆盖新界面。
for (const event of ['accountChanged', 'languageChanged', 'learningSynced', 'learningRecorded']) window.addEventListener(event, update => {
  if (event === 'learningRecorded' && update?.detail?.owner !== LearningReport.owner()) return;
  LearningReport.renderVersion++; LearningReport.activeReport = null;
  const modal = document.getElementById('learning-report-modal');
  if (modal && !modal.classList.contains('hidden')) showLearningReport(LearningReport.period);
});
