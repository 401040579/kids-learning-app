// ========== 每日签到系统 ==========

const DailyCheckin = {
  // 数据存储
  data: {
    checkins: {},           // 签到记录 { "YYYY-MM-DD": { checked: true, points: 5 } }
    currentStreak: 0,       // 当前连续签到天数
    longestStreak: 0,       // 最长连续签到
    totalDays: 0,           // 总签到天数
    lastCheckinDate: null,  // 上次签到日期
    checkinStreak: 0        // 用于成就追踪的连续签到数
  },

  // 签到奖励配置
  rewards: [
    { day: 1, points: 5, icon: '🌟' },
    { day: 2, points: 5, icon: '⭐' },
    { day: 3, points: 10, icon: '🌈', badge: '三连签到' },
    { day: 4, points: 5, icon: '💫' },
    { day: 5, points: 10, icon: '✨' },
    { day: 6, points: 10, icon: '🎁' },
    { day: 7, points: 30, icon: '🏆', badge: '周签到达人' }
  ],

  // 初始化
  init() {
    this.loadData();
    this.checkAndAutoCheckin();
  },

  // 从本地存储加载数据
  loadData() {
    const saved = localStorage.getItem('kidsDailyCheckin');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.data = { ...this.data, ...parsed };
    }
  },

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('kidsDailyCheckin', JSON.stringify(this.data));
  },

  // 获取今天的日期字符串
  getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  },

  // 检查今天是否已签到
  isCheckedToday() {
    const todayStr = this.getTodayStr();
    return this.data.checkins[todayStr]?.checked === true;
  },

  // 检查并自动签到（首次打开应用时）
  checkAndAutoCheckin() {
    if (!this.isCheckedToday()) {
      // 显示签到提醒
      this.showCheckinReminder();
    }
  },

  // 显示签到提醒
  showCheckinReminder() {
    // 延迟一秒显示，等页面加载完成
    setTimeout(() => {
      const modal = document.getElementById('checkin-reminder-modal');
      if (modal) {
        this.updateReminderContent();
        modal.classList.remove('hidden');
      }
    }, 1000);
  },

  // 更新签到提醒内容
  updateReminderContent() {
    const streakDay = this.data.currentStreak + 1;
    const rewardIndex = ((streakDay - 1) % 7);
    const reward = this.rewards[rewardIndex];

    const iconEl = document.getElementById('checkin-reward-icon');
    const pointsEl = document.getElementById('checkin-reward-points');
    const streakEl = document.getElementById('checkin-streak-info');

    if (iconEl) iconEl.textContent = reward.icon;
    if (pointsEl) pointsEl.textContent = `+${reward.points}分`;
    if (streakEl) {
      if (this.data.currentStreak > 0) {
        streakEl.textContent = `已连续签到 ${this.data.currentStreak} 天`;
      } else {
        streakEl.textContent = '开始你的签到之旅吧！';
      }
    }
  },

  // 执行签到
  doCheckin() {
    if (this.isCheckedToday()) {
      return { success: false, message: '今天已经签到过了' };
    }

    const todayStr = this.getTodayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // 检查是否连续签到
    const wasCheckedYesterday = this.data.checkins[yesterdayStr]?.checked === true;

    if (wasCheckedYesterday) {
      this.data.currentStreak++;
    } else {
      this.data.currentStreak = 1;
    }

    // 更新最长连续记录
    if (this.data.currentStreak > this.data.longestStreak) {
      this.data.longestStreak = this.data.currentStreak;
    }

    // 计算奖励
    const rewardIndex = ((this.data.currentStreak - 1) % 7);
    const reward = this.rewards[rewardIndex];

    // 记录签到
    this.data.checkins[todayStr] = {
      checked: true,
      points: reward.points,
      streak: this.data.currentStreak,
      time: new Date().toISOString()
    };

    this.data.totalDays++;
    this.data.lastCheckinDate = todayStr;
    this.data.checkinStreak = this.data.currentStreak;

    this.saveData();

    // 📊 追踪签到
    if (typeof Analytics !== 'undefined') {
      Analytics.trackCheckin(this.data.currentStreak);
    }

    // 添加积分到奖励系统
    RewardSystem.data.totalScore += reward.points;
    RewardSystem.saveData();
    RewardSystem.updateDisplay();

    // 检查成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.checkProgress('checkinStreak', this.data.currentStreak);
    }

    return {
      success: true,
      points: reward.points,
      streak: this.data.currentStreak,
      icon: reward.icon,
      badge: reward.badge || null
    };
  },

  // 获取本月签到数据（用于日历显示）
  getMonthCheckins(year, month) {
    const result = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result[dateStr] = this.data.checkins[dateStr] || { checked: false };
    }

    return result;
  },

  // 获取统计数据
  getStats() {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    // 本月签到天数
    let thisMonthDays = 0;
    const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (this.data.checkins[dateStr]?.checked) {
        thisMonthDays++;
      }
    }

    return {
      currentStreak: this.data.currentStreak,
      longestStreak: this.data.longestStreak,
      totalDays: this.data.totalDays,
      thisMonthDays: thisMonthDays,
      isCheckedToday: this.isCheckedToday()
    };
  },

  // 重置数据
  reset() {
    this.data = {
      checkins: {},
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastCheckinDate: null,
      checkinStreak: 0
    };
    this.saveData();
  }
};

// 签到日历当前显示的月份
let checkinCalendarDate = new Date();

// 显示签到页面
function showCheckin() {
  const modal = document.getElementById('checkin-modal');
  if (!modal) return;

  checkinCalendarDate = new Date();
  renderCheckinCalendar();
  updateCheckinStats();
  modal.classList.remove('hidden');
}

// 关闭签到页面
function closeCheckin() {
  document.getElementById('checkin-modal').classList.add('hidden');
}

// 关闭签到提醒
function closeCheckinReminder() {
  document.getElementById('checkin-reminder-modal').classList.add('hidden');
}

// 执行签到（从提醒弹窗）
function doCheckinFromReminder() {
  const result = DailyCheckin.doCheckin();

  if (result.success) {
    // 关闭提醒弹窗
    closeCheckinReminder();

    // 显示签到成功弹窗
    showCheckinSuccess(result);
  }
}

// 执行签到（从签到页面）
function doCheckinFromPage() {
  if (DailyCheckin.isCheckedToday()) {
    return;
  }

  const result = DailyCheckin.doCheckin();

  if (result.success) {
    // 更新页面显示
    renderCheckinCalendar();
    updateCheckinStats();

    // 显示签到成功弹窗
    showCheckinSuccess(result);
  }
}

// 显示签到成功
function showCheckinSuccess(result) {
  const modal = document.getElementById('checkin-success-modal');
  if (!modal) return;

  document.getElementById('checkin-success-icon').textContent = result.icon;
  document.getElementById('checkin-success-points').textContent = `+${result.points}分`;
  document.getElementById('checkin-success-streak').textContent = `连续签到 ${result.streak} 天`;

  // 显示徽章（如果有）
  const badgeEl = document.getElementById('checkin-success-badge');
  if (result.badge) {
    badgeEl.textContent = `🎖️ 获得徽章: ${result.badge}`;
    badgeEl.classList.remove('hidden');
  } else {
    badgeEl.classList.add('hidden');
  }

  modal.classList.remove('hidden');

  // 播放音效和粒子
  RewardSystem.playSound('reward');
  RewardSystem.createParticles();

  // 3秒后自动关闭
  setTimeout(() => {
    closeCheckinSuccess();
  }, 3000);
}

// 关闭签到成功弹窗
function closeCheckinSuccess() {
  document.getElementById('checkin-success-modal').classList.add('hidden');
}

// 渲染签到日历
function renderCheckinCalendar() {
  const container = document.getElementById('checkin-calendar');
  if (!container) return;

  const year = checkinCalendarDate.getFullYear();
  const month = checkinCalendarDate.getMonth();
  const today = new Date();
  const todayStr = DailyCheckin.getTodayStr();

  const monthCheckins = DailyCheckin.getMonthCheckins(year, month);

  // 月份标题
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  let html = `
    <div class="checkin-calendar-header">
      <button class="checkin-nav-btn" onclick="prevCheckinMonth()">‹</button>
      <span class="checkin-month-title">${year}年 ${monthNames[month]}</span>
      <button class="checkin-nav-btn" onclick="nextCheckinMonth()">›</button>
    </div>
  `;

  // 星期标题
  html += `
    <div class="checkin-weekdays">
      <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
    </div>
  `;

  // 日期网格
  html += `<div class="checkin-days">`;

  // 获取该月第一天是星期几
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 填充空白
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="checkin-day empty"></div>`;
  }

  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const checkinData = monthCheckins[dateStr];
    const isToday = dateStr === todayStr;
    const isChecked = checkinData?.checked;
    const isFuture = new Date(dateStr) > today;

    let dayClass = 'checkin-day';
    if (isToday) dayClass += ' today';
    if (isChecked) dayClass += ' checked';
    if (isFuture) dayClass += ' future';

    html += `
      <div class="${dayClass}">
        <span class="checkin-day-num">${day}</span>
        ${isChecked ? '<span class="checkin-mark">✓</span>' : ''}
      </div>
    `;
  }

  html += `</div>`;

  // 签到按钮
  const isCheckedToday = DailyCheckin.isCheckedToday();
  html += `
    <div class="checkin-action">
      <button class="btn-checkin ${isCheckedToday ? 'checked' : ''}" onclick="doCheckinFromPage()" ${isCheckedToday ? 'disabled' : ''}>
        ${isCheckedToday ? '✓ 今日已签到' : '📅 立即签到'}
      </button>
    </div>
  `;

  container.innerHTML = html;
}

// 上一月
function prevCheckinMonth() {
  checkinCalendarDate.setMonth(checkinCalendarDate.getMonth() - 1);
  renderCheckinCalendar();
}

// 下一月
function nextCheckinMonth() {
  checkinCalendarDate.setMonth(checkinCalendarDate.getMonth() + 1);
  renderCheckinCalendar();
}

// 更新签到统计
function updateCheckinStats() {
  const stats = DailyCheckin.getStats();

  const statsEl = document.getElementById('checkin-stats');
  if (!statsEl) return;

  statsEl.innerHTML = `
    <div class="checkin-stat">
      <span class="checkin-stat-number">${stats.currentStreak}</span>
      <span class="checkin-stat-label">连续签到</span>
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-number">${stats.thisMonthDays}</span>
      <span class="checkin-stat-label">本月签到</span>
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-number">${stats.totalDays}</span>
      <span class="checkin-stat-label">累计签到</span>
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-number">${stats.longestStreak}</span>
      <span class="checkin-stat-label">最长连续</span>
    </div>
  `;
}

// 显示7天签到预览（用于首页）
function renderCheckinPreview() {
  const container = document.getElementById('checkin-preview');
  if (!container) return;

  const today = new Date();
  const stats = DailyCheckin.getStats();

  let html = `<div class="checkin-preview-days">`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - 6 + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isChecked = DailyCheckin.data.checkins[dateStr]?.checked;
    const isToday = i === 6;

    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const dayName = dayNames[date.getDay()];

    html += `
      <div class="preview-day ${isChecked ? 'checked' : ''} ${isToday ? 'today' : ''}">
        <span class="preview-day-name">${dayName}</span>
        <span class="preview-day-icon">${isChecked ? '✓' : (isToday ? '?' : '·')}</span>
      </div>
    `;
  }

  html += `</div>`;

  html += `
    <div class="checkin-preview-info">
      <span>连续 ${stats.currentStreak} 天</span>
      ${!stats.isCheckedToday ? '<span class="checkin-reminder-dot">●</span>' : ''}
    </div>
  `;

  container.innerHTML = html;
}
