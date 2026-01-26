// ========== Google Analytics 自定义追踪 ==========

const Analytics = {
  // 会话开始时间
  sessionStart: Date.now(),

  // 当前模块开始时间
  moduleStartTime: null,
  currentModule: null,

  // 初始化
  init() {
    // 追踪页面访问
    this.trackPageView();

    // 监听页面离开，记录总时长
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackModuleTime();
      }
    });

    console.log('Analytics initialized');
  },

  // ========== 模块追踪 ==========

  // 追踪模块点击
  trackModuleClick(moduleName, moduleCategory = 'learning') {
    // 先记录上一个模块的时长
    this.trackModuleTime();

    // 开始新模块计时
    this.moduleStartTime = Date.now();
    this.currentModule = moduleName;

    this.sendEvent('module_click', {
      module_name: moduleName,
      module_category: moduleCategory
    });
  },

  // 追踪模块使用时长
  trackModuleTime() {
    if (this.currentModule && this.moduleStartTime) {
      const duration = Math.round((Date.now() - this.moduleStartTime) / 1000);

      if (duration > 2) { // 只记录超过2秒的使用
        this.sendEvent('module_duration', {
          module_name: this.currentModule,
          duration_seconds: duration
        });
      }
    }
  },

  // ========== 学习追踪 ==========

  // 追踪答题结果
  trackAnswer(module, isCorrect, questionType = '') {
    this.sendEvent('answer_submit', {
      module_name: module,
      is_correct: isCorrect,
      question_type: questionType
    });
  },

  // 追踪学习完成（一组题目）
  trackLearningComplete(module, correctCount, totalCount, score = 0) {
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    this.sendEvent('learning_complete', {
      module_name: module,
      correct_count: correctCount,
      total_count: totalCount,
      accuracy_percent: accuracy,
      score: score
    });
  },

  // 追踪成就解锁
  trackAchievement(achievementId, achievementName) {
    this.sendEvent('achievement_unlock', {
      achievement_id: achievementId,
      achievement_name: achievementName
    });
  },

  // 追踪签到
  trackCheckin(streakDays) {
    this.sendEvent('daily_checkin', {
      streak_days: streakDays
    });
  },

  // ========== 创作追踪 ==========

  // 追踪作品保存
  trackWorkSave(module, workType = '') {
    this.sendEvent('work_save', {
      module_name: module,
      work_type: workType
    });
  },

  // 追踪汉字练习完成
  trackCharacterComplete(character, stars, mistakes) {
    this.sendEvent('character_complete', {
      character: character,
      stars: stars,
      mistakes: mistakes
    });
  },

  // ========== 会话追踪 ==========

  // 追踪页面访问
  trackPageView() {
    this.sendEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href
    });
  },

  // 追踪会话结束
  trackSessionEnd() {
    const totalDuration = Math.round((Date.now() - this.sessionStart) / 1000);

    // 先记录当前模块时长
    this.trackModuleTime();

    this.sendEvent('session_end', {
      total_duration_seconds: totalDuration,
      total_duration_minutes: Math.round(totalDuration / 60)
    });
  },

  // ========== 工具函数 ==========

  // 发送事件到 GA
  sendEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
      console.log('📊 Analytics:', eventName, params);
    }
  }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  Analytics.init();
});
