// ========== 成就系统 ==========

const AchievementSystem = {
  // 成就定义
  achievements: [
    // 入门成就
    { id: 'first_step', name: '第一步', description: '完成第一次答题', icon: '🌟', category: 'beginner', target: 1, track: 'tasksDone' },
    { id: 'explorer', name: '小探索家', description: '观看第一个视频', icon: '🎬', category: 'beginner', target: 1, track: 'videosWatched' },

    // 数学成就
    { id: 'math_10', name: '数学新星', description: '数学答对10题', icon: '🔢', category: 'math', target: 10, track: 'mathCorrect' },
    { id: 'math_50', name: '数学小能手', description: '数学答对50题', icon: '🧮', category: 'math', target: 50, track: 'mathCorrect' },
    { id: 'math_100', name: '数学达人', description: '数学答对100题', icon: '🏆', category: 'math', target: 100, track: 'mathCorrect' },
    { id: 'math_streak_5', name: '连胜小将', description: '数学连续答对5题', icon: '🔥', category: 'math', target: 5, track: 'mathStreak' },
    { id: 'math_streak_10', name: '连胜王者', description: '数学连续答对10题', icon: '👑', category: 'math', target: 10, track: 'mathStreak' },
    { id: 'math_streak_20', name: '无敌连胜', description: '数学连续答对20题', icon: '💎', category: 'math', target: 20, track: 'mathStreak' },

    // 英语成就
    { id: 'english_10', name: '英语新星', description: '英语答对10题', icon: '🔤', category: 'english', target: 10, track: 'englishCorrect' },
    { id: 'english_26', name: '字母大师', description: '英语答对26题', icon: '📚', category: 'english', target: 26, track: 'englishCorrect' },
    { id: 'english_50', name: '英语达人', description: '英语答对50题', icon: '🎓', category: 'english', target: 50, track: 'englishCorrect' },

    // 中文成就
    { id: 'chinese_10', name: '识字新星', description: '汉字答对10题', icon: '📝', category: 'chinese', target: 10, track: 'chineseCorrect' },
    { id: 'chinese_20', name: '汉字小能手', description: '汉字答对20题', icon: '🀄', category: 'chinese', target: 20, track: 'chineseCorrect' },
    { id: 'chinese_50', name: '汉字达人', description: '汉字答对50题', icon: '📜', category: 'chinese', target: 50, track: 'chineseCorrect' },

    // 科学成就
    { id: 'science_10', name: '科学新星', description: '科学答对10题', icon: '🔬', category: 'science', target: 10, track: 'scienceCorrect' },
    { id: 'science_30', name: '小小科学家', description: '科学答对30题', icon: '🧪', category: 'science', target: 30, track: 'scienceCorrect' },
    { id: 'science_50', name: '科学达人', description: '科学答对50题', icon: '🚀', category: 'science', target: 50, track: 'scienceCorrect' },

    // 签到成就
    { id: 'checkin_3', name: '初露头角', description: '连续签到3天', icon: '📅', category: 'checkin', target: 3, track: 'checkinStreak' },
    { id: 'checkin_7', name: '坚持不懈', description: '连续签到7天', icon: '🗓️', category: 'checkin', target: 7, track: 'checkinStreak' },
    { id: 'checkin_30', name: '学习达人', description: '连续签到30天', icon: '🏅', category: 'checkin', target: 30, track: 'checkinStreak' },

    // 积分成就
    { id: 'score_100', name: '百分宝贝', description: '累计获得100分', icon: '💯', category: 'score', target: 100, track: 'totalScore' },
    { id: 'score_500', name: '积分小富翁', description: '累计获得500分', icon: '💰', category: 'score', target: 500, track: 'totalScore' },
    { id: 'score_1000', name: '积分大富翁', description: '累计获得1000分', icon: '💎', category: 'score', target: 1000, track: 'totalScore' },
    { id: 'score_5000', name: '超级学霸', description: '累计获得5000分', icon: '👸', category: 'score', target: 5000, track: 'totalScore' },

    // 错题本成就
    { id: 'master_5', name: '知错能改', description: '从错题本掌握5题', icon: '✅', category: 'review', target: 5, track: 'masteredCount' },
    { id: 'master_20', name: '错题克星', description: '从错题本掌握20题', icon: '🎯', category: 'review', target: 20, track: 'masteredCount' },

    // 综合成就
    { id: 'all_rounder', name: '全能小达人', description: '数学英语中文各答对10题', icon: '🌈', category: 'special', target: 1, track: 'allRounder' }
  ],

  // 用户成就数据
  data: {
    unlocked: [],           // 已解锁成就ID列表
    progress: {},           // 各成就进度 { achievementId: currentValue }
    totalUnlocked: 0,       // 已解锁总数
    lastUnlockTime: null,   // 最后解锁时间
    videosWatched: 0,       // 观看视频数
    masteredCount: 0        // 错题掌握数
  },

  // 初始化
  init() {
    this.loadData();
  },

  // 从本地存储加载数据
  loadData() {
    const saved = localStorage.getItem('kidsAchievements');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.data = { ...this.data, ...parsed };
    }
  },

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('kidsAchievements', JSON.stringify(this.data));
  },

  // 检查并更新成就进度
  checkProgress(trackType, value) {
    let newUnlocks = [];

    this.achievements.forEach(achievement => {
      // 跳过已解锁的成就
      if (this.data.unlocked.includes(achievement.id)) return;

      // 检查是否匹配追踪类型
      if (achievement.track !== trackType) return;

      // 特殊处理：全能小达人
      if (achievement.id === 'all_rounder') {
        const learning = RewardSystem.data;
        if (learning.mathCorrect >= 10 && learning.englishCorrect >= 10 && learning.chineseCorrect >= 10) {
          this.unlockAchievement(achievement);
          newUnlocks.push(achievement);
        }
        return;
      }

      // 更新进度
      this.data.progress[achievement.id] = value;

      // 检查是否达成
      if (value >= achievement.target) {
        this.unlockAchievement(achievement);
        newUnlocks.push(achievement);
      }
    });

    this.saveData();
    return newUnlocks;
  },

  // 解锁成就
  unlockAchievement(achievement) {
    if (this.data.unlocked.includes(achievement.id)) return;

    this.data.unlocked.push(achievement.id);
    this.data.totalUnlocked++;
    this.data.lastUnlockTime = new Date().toISOString();
    this.saveData();

    // 📊 追踪成就解锁
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAchievement(achievement.id, achievement.name);
    }

    // 显示解锁弹窗
    this.showUnlockPopup(achievement);

    // 通知家长
    if (typeof ParentNotify !== 'undefined') {
      ParentNotify.notifyAchievement(achievement.name);
    }
  },

  // 显示成就解锁弹窗
  showUnlockPopup(achievement) {
    const popup = document.getElementById('achievement-unlock-modal');
    if (!popup) return;

    document.getElementById('unlock-achievement-icon').textContent = achievement.icon;
    document.getElementById('unlock-achievement-name').textContent = achievement.name;
    document.getElementById('unlock-achievement-desc').textContent = achievement.description;

    popup.classList.remove('hidden');

    // 播放音效和粒子效果
    RewardSystem.playSound('complete');
    RewardSystem.createParticles();

    // 3秒后自动关闭
    setTimeout(() => {
      popup.classList.add('hidden');
    }, 3000);
  },

  // 获取成就进度百分比
  getProgress(achievementId) {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (!achievement) return 0;

    if (this.data.unlocked.includes(achievementId)) return 100;

    const current = this.data.progress[achievementId] || 0;
    return Math.min(Math.round((current / achievement.target) * 100), 99);
  },

  // 获取当前值
  getCurrentValue(achievementId) {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (!achievement) return 0;

    // 从 RewardSystem 获取实时数据
    const trackType = achievement.track;
    if (RewardSystem.data[trackType] !== undefined) {
      return RewardSystem.data[trackType];
    }
    if (DailyCheckin && DailyCheckin.data[trackType] !== undefined) {
      return DailyCheckin.data[trackType];
    }
    return this.data.progress[achievementId] || 0;
  },

  // 按分类获取成就
  getByCategory(category) {
    return this.achievements.filter(a => a.category === category);
  },

  // 获取所有分类
  getCategories() {
    return [
      { id: 'beginner', name: I18n.t('achievements.cat.beginner') || '入门', icon: '🌟' },
      { id: 'math', name: I18n.t('achievements.cat.math') || '数学', icon: '🔢' },
      { id: 'english', name: I18n.t('achievements.cat.english') || '英语', icon: '🔤' },
      { id: 'chinese', name: I18n.t('achievements.cat.chinese') || '中文', icon: '📝' },
      { id: 'science', name: I18n.t('achievements.cat.science') || '科学', icon: '🔬' },
      { id: 'checkin', name: I18n.t('achievements.cat.checkin') || '签到', icon: '📅' },
      { id: 'score', name: I18n.t('achievements.cat.score') || '积分', icon: '💰' },
      { id: 'review', name: I18n.t('achievements.cat.review') || '复习', icon: '📖' },
      { id: 'special', name: I18n.t('achievements.cat.special') || '特殊', icon: '🌈' }
    ];
  },

  // 记录视频观看
  recordVideoWatch() {
    this.data.videosWatched++;
    this.saveData();
    this.checkProgress('videosWatched', this.data.videosWatched);
  },

  // 记录音乐创作
  checkMusicAchievement() {
    this.data.musicCompositions = (this.data.musicCompositions || 0) + 1;
    this.saveData();
    this.checkProgress('musicCompositions', this.data.musicCompositions);
  },

  // 记录错题掌握
  recordMastered() {
    this.data.masteredCount++;
    this.saveData();
    this.checkProgress('masteredCount', this.data.masteredCount);
  },

  // 重置数据
  reset() {
    this.data = {
      unlocked: [],
      progress: {},
      totalUnlocked: 0,
      lastUnlockTime: null,
      videosWatched: 0,
      masteredCount: 0
    };
    this.saveData();
  }
};

// 显示成就列表页面
function showAchievements() {
  const modal = document.getElementById('achievements-modal');
  if (!modal) return;

  // 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('achievements');
  }

  renderAchievementsList();
  modal.classList.remove('hidden');
}

// 关闭成就列表
function closeAchievements() {
  document.getElementById('achievements-modal').classList.add('hidden');
}

// 关闭成就解锁弹窗
function closeAchievementUnlock() {
  document.getElementById('achievement-unlock-modal').classList.add('hidden');
}

// 渲染成就列表
function renderAchievementsList(filterCategory = 'all') {
  const container = document.getElementById('achievements-list');
  if (!container) return;

  const categories = AchievementSystem.getCategories();
  let html = '';

  // 统计信息
  const totalAchievements = AchievementSystem.achievements.length;
  const unlockedCount = AchievementSystem.data.totalUnlocked;

  html += `
    <div class="achievements-stats">
      <div class="achievements-stat">
        <span class="stat-number">${unlockedCount}</span>
        <span class="stat-label">${I18n.t('achievements.stats.unlocked') || '已解锁'}</span>
      </div>
      <div class="achievements-stat">
        <span class="stat-number">${totalAchievements}</span>
        <span class="stat-label">${I18n.t('achievements.stats.total') || '总成就'}</span>
      </div>
      <div class="achievements-stat">
        <span class="stat-number">${Math.round(unlockedCount / totalAchievements * 100)}%</span>
        <span class="stat-label">${I18n.t('achievements.stats.completion') || '完成度'}</span>
      </div>
    </div>
  `;

  // 分类筛选
  html += `<div class="achievement-categories">`;
  html += `<button class="achievement-category-btn ${filterCategory === 'all' ? 'active' : ''}" onclick="renderAchievementsList('all')">${I18n.t('achievements.filter.all') || '全部'}</button>`;
  categories.forEach(cat => {
    html += `<button class="achievement-category-btn ${filterCategory === cat.id ? 'active' : ''}" onclick="renderAchievementsList('${cat.id}')">${cat.icon} ${cat.name}</button>`;
  });
  html += `</div>`;

  // 成就列表
  html += `<div class="achievements-grid">`;

  const achievementsToShow = filterCategory === 'all'
    ? AchievementSystem.achievements
    : AchievementSystem.getByCategory(filterCategory);

  achievementsToShow.forEach(achievement => {
    const isUnlocked = AchievementSystem.data.unlocked.includes(achievement.id);
    const progress = AchievementSystem.getProgress(achievement.id);
    const currentValue = AchievementSystem.getCurrentValue(achievement.id);

    // 获取本地化的成就名称和描述
    const achievementName = I18n.t(`achievements.${achievement.id}`) || achievement.name;
    const achievementDesc = I18n.t(`achievements.${achievement.id}.desc`) || achievement.description;

    html += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon ${isUnlocked ? '' : 'grayscale'}">${achievement.icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${achievementName}</div>
          <div class="achievement-desc">${achievementDesc}</div>
          ${!isUnlocked ? `
            <div class="achievement-progress-bar">
              <div class="achievement-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="achievement-progress-text">${currentValue} / ${achievement.target}</div>
          ` : `
            <div class="achievement-unlocked-badge">${I18n.t('achievements.unlockedBadge') || '已解锁 ✓'}</div>
          `}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}
