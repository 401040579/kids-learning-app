// ========== 日历数据管理 ==========

const CalendarData = {
  // 数据存储
  events: {},

  // 初始化
  init() {
    this.loadData();
  },

  // 从本地存储加载数据
  // 同样要 try/catch：本函数经 RewardSystem.init() 调用，抛异常会连累后面
  // 十几个模块的初始化（见 RewardSystem.loadData 的注释）。
  loadData() {
    try {
      const saved = localStorage.getItem('kidsCalendarData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') this.events = parsed;
      }
    } catch (e) {
      console.warn('[CalendarData] 日历数据损坏，已重置：', e);
      this.events = {};
    }
  },

  // 保存数据到本地存储
  saveData() {
    safeSetItem('kidsCalendarData', JSON.stringify(this.events));
  },

  // 获取指定日期的事件
  getEventsByDate(dateStr) {
    return this.events[dateStr] || [];
  },

  // 添加事件
  addEvent(dateStr, event) {
    if (!this.events[dateStr]) {
      this.events[dateStr] = [];
    }
    this.events[dateStr].push(event);
    this.saveData();
  },

  // 更新事件心情
  updateEventMood(dateStr, eventIndex, mood, feeling) {
    if (this.events[dateStr] && this.events[dateStr][eventIndex]) {
      this.events[dateStr][eventIndex].mood = mood;
      this.events[dateStr][eventIndex].feeling = feeling;
      this.saveData();
    }
  },

  // 删除事件
  deleteEvent(dateStr, eventIndex) {
    if (this.events[dateStr]) {
      this.events[dateStr].splice(eventIndex, 1);
      if (this.events[dateStr].length === 0) {
        delete this.events[dateStr];
      }
      this.saveData();
    }
  },

  // 获取月度统计
  getMonthStats(year, month) {
    let classes = 0;
    let outings = 0;
    let holidays = 0;

    // 遍历该月所有日期
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = this.events[dateStr] || [];

      events.forEach(event => {
        if (event.type === 'class') classes++;
        if (event.type === 'outing') outings++;
        if (event.type === 'holiday') holidays++;
      });
    }

    return { classes, outings, holidays };
  },

  // 重置数据
  reset() {
    this.events = {};
    this.saveData();
  }
};

// ========== 奖励系统 ==========

const RewardSystem = {
  // 字段默认值（同时也是「合法字段清单」，loadData 用它校验脏数据）
  DEFAULTS: {
    totalScore: 0,
    tasksDone: 0,
    mathCorrect: 0,
    mathStreak: 0,
    englishCorrect: 0,
    chineseCorrect: 0,
    scienceCorrect: 0
  },

  // 数据存储
  data: {
    totalScore: 0,
    tasksDone: 0,
    mathCorrect: 0,
    mathStreak: 0,
    englishCorrect: 0,
    chineseCorrect: 0,
    scienceCorrect: 0
  },

  // 初始化
  init() {
    this.loadData();
    this.updateDisplay();
    CalendarData.init(); // 初始化日历数据
  },

  // 从本地存储加载数据
  // 这里有两个必须防住的坑（其余模块如 achievements/dailyCheckin 早就是这么写的）：
  //   1. 必须**合并**而不是整体替换：老版本存的数据缺少后来新增的字段
  //      （如 scienceCorrect），整体替换后该字段变 undefined，再 += 1 就成了 NaN，
  //      分数显示成「NaN」且会被存回去，再也回不来。
  //   2. 必须 try/catch：本函数由 RewardSystem.init() 调用，而它排在
  //      app.js 的 DOMContentLoaded 靠前位置。数据一旦损坏就抛异常，
  //      后面十几个模块的 init 全部中断——签到、成就、视频列表、最近使用、
  //      数学/英语/中文页面统统失效，而且没有任何报错提示。
  loadData() {
    try {
      const saved = localStorage.getItem('kidsLearningData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.data = { ...this.data, ...parsed };
        }
      }
    } catch (e) {
      console.warn('[RewardSystem] 学习数据损坏，已重置为默认值：', e);
    }
    // 兜底：所有计数字段必须是有限数字。
    // null / 字符串 / NaN 都要拉回 0，否则 'x' + 1 会变成 'x1' 这种越滚越坏的脏值。
    Object.keys(this.DEFAULTS).forEach(k => {
      const v = this.data[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        this.data[k] = this.DEFAULTS[k];
      }
    });
  },

  // 保存数据到本地存储。
  // 必须「读-改-写」而不是直接把内存对象整个覆盖上去：
  // kidsLearningData 里还存着别的模块写的字段（如科学模块的 scienceProgress），
  // 直接覆盖会把它们抹掉——科学主题的进度条因此长期停在 0/10。
  // 同理，别的地方如果在本对象加载后改过 totalScore，这里也不能盲目覆盖。
  saveData() {
    let merged = {};
    try {
      const raw = localStorage.getItem('kidsLearningData');
      if (raw) {
        const disk = JSON.parse(raw);
        if (disk && typeof disk === 'object') merged = disk;
      }
    } catch (e) { /* 磁盘数据损坏就当空的 */ }
    Object.assign(merged, this.data);   // 只覆盖本模块负责的字段
    safeSetItem('kidsLearningData', JSON.stringify(merged));
  },

  // 更新页面显示
  updateDisplay() {
    const totalScoreEl = document.getElementById('total-score');
    if (totalScoreEl) totalScoreEl.textContent = this.data.totalScore;

    const mathCorrectEl = document.getElementById('math-correct');
    if (mathCorrectEl) mathCorrectEl.textContent = this.data.mathCorrect;

    const mathStreakEl = document.getElementById('math-streak');
    if (mathStreakEl) mathStreakEl.textContent = this.data.mathStreak;

    // 更新进度条
    const progress = Math.min((this.data.tasksDone / 10) * 100, 100);
    const progressFillEl = document.getElementById('progress-fill');
    if (progressFillEl) progressFillEl.style.width = progress + '%';

    // 更新进度文本（i18n）
    const progressTextEl = document.getElementById('progress-text');
    if (progressTextEl) {
      const template = (typeof I18n !== 'undefined' && I18n.t('progress.tasks')) || '完成 {done}/{total} 个任务解锁奖励视频!';
      progressTextEl.textContent = template.replace('{done}', this.data.tasksDone).replace('{total}', 10);
    }
  },

  // 添加积分
  addPoints(points, reason) {
    this.data.totalScore += points;
    this.data.tasksDone++;
    this.saveData();
    this.updateDisplay();

    // 显示奖励弹窗
    this.showReward(points, reason);

    // 触发粒子效果
    this.createParticles();
  },

  // 数学答对
  mathCorrect() {
    this.data.mathCorrect++;
    this.data.mathStreak++;

    // 连续答对奖励更多分数
    let points = 10;
    if (this.data.mathStreak >= 5) points = 20;
    if (this.data.mathStreak >= 10) points = 30;

    const msg = (typeof I18n !== 'undefined' && I18n.t('reward.mathCorrect')) || '数学题答对了!';
    this.addPoints(points, msg);
  },

  // 数学答错
  mathWrong() {
    this.data.mathStreak = 0;
    this.saveData();
    this.updateDisplay();
  },

  // 英语答对
  englishCorrect() {
    this.data.englishCorrect++;
    const msg = (typeof I18n !== 'undefined' && I18n.t('reward.englishCorrect')) || '单词学会了!';
    this.addPoints(15, msg);
  },

  // 中文答对
  chineseCorrect() {
    this.data.chineseCorrect++;
    const msg = (typeof I18n !== 'undefined' && I18n.t('reward.chineseCorrect')) || '汉字认对了!';
    this.addPoints(15, msg);
  },

  // 科学答对
  scienceCorrect() {
    this.data.scienceCorrect++;
    const msg = (typeof I18n !== 'undefined' && I18n.t('reward.scienceCorrect')) || '科学题答对了!';
    this.addPoints(15, msg);
  },

  // 拼图完成
  puzzleCorrect(difficulty) {
    this.data.puzzleCorrect = (this.data.puzzleCorrect || 0) + 1;

    // 根据难度给予不同积分
    let points = 20;
    let message = '拼图完成了!';

    if (difficulty === 'medium') {
      points = 40;
      message = '中等拼图完成!';
    } else if (difficulty === 'hard') {
      points = 60;
      message = '高难度拼图完成!';
    }

    this.data.totalScore += points;
    this.data.tasksDone++;
    this.saveData();
    this.updateDisplay();

    // 拼图完成不显示普通奖励弹窗，由拼图模块自己处理
  },

  // 显示奖励弹窗
  showReward(points, message) {
    const popup = document.getElementById('reward-popup');
    const messageEl = document.getElementById('reward-message') || document.querySelector('.reward-message');
    if (!popup || !messageEl) return;

    // 原来的写法有个致命顺序问题：先给 #reward-points 这个 span 赋值，
    // 紧接着又用 messageEl.innerHTML = ... 把整段重写，**把那个 span 冲掉了**。
    // 于是第一次奖励正常，从第二次起 getElementById('reward-points') 返回 null，
    // 赋值直接抛 TypeError —— addPoints 中断，粒子庆祝不放，
    // 而且异常会传播到调用方，把它后面的成就检查等逻辑一起打断（28 处调用点全中）。
    //
    // 现在改成每次重建节点：既保住 #reward-points 的样式，又不会自毁；
    // 同时用 textContent 而非 innerHTML，题目内容里的特殊字符也不会被当成标签。
    const tpl = (typeof I18n !== 'undefined' && I18n.t('reward.gotPoints')) || '你获得了 {points} 分!';
    const parts = String(tpl).split('{points}');

    messageEl.textContent = '';
    messageEl.appendChild(document.createTextNode((message || '') + ' ' + parts[0]));
    const span = document.createElement('span');
    span.id = 'reward-points';
    span.textContent = points;
    messageEl.appendChild(span);
    if (parts.length > 1) messageEl.appendChild(document.createTextNode(parts[1]));

    popup.classList.remove('hidden');

    // 播放音效（如果支持）
    this.playSound('reward');
  },

  // 创建粒子效果
  createParticles() {
    const container = document.getElementById('particles');
    const emojis = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '💖', '🌈', '🦄', '🎀'];

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(particle);

        // 动画结束后移除
        setTimeout(() => particle.remove(), 4000);
      }, i * 50);
    }
  },

  // 创建庆祝烟花效果
  createFireworks() {
    const colors = ['#FF69B4', '#FFD700', '#00CED1', '#9370DB', '#FF6B6B', '#32CD32'];
    const container = document.getElementById('particles');

    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const firework = document.createElement('div');
        firework.className = 'particle';
        firework.textContent = '✨';
        firework.style.left = (40 + Math.random() * 20) + '%';
        firework.style.color = colors[Math.floor(Math.random() * colors.length)];
        firework.style.fontSize = (20 + Math.random() * 20) + 'px';
        container.appendChild(firework);

        setTimeout(() => firework.remove(), 3000);
      }, i * 30);
    }
  },

  // 播放音效
  playSound(type) {
    // 使用 Web Audio API 生成简单音效
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      let duration = 0.3;

      if (type === 'reward' || type === 'success') {
        // 奖励/成功音效：上升音调
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
      } else if (type === 'correct') {
        // 正确音效
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
      } else if (type === 'wrong') {
        // 错误音效
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      } else if (type === 'click') {
        // 点击音效
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        duration = 0.1;
      } else if (type === 'tick') {
        // 滴答音效（倒计时）
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        duration = 0.05;
      } else if (type === 'complete') {
        // 完成音效：庆祝音调
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
        duration = 0.6;
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // 音频不可用，静默失败
    }
  },

  // 重置数据（可选功能）
  reset() {
    this.data = {
      totalScore: 0,
      tasksDone: 0,
      mathCorrect: 0,
      mathStreak: 0,
      englishCorrect: 0,
      chineseCorrect: 0,
      scienceCorrect: 0
    };
    this.saveData();
    this.updateDisplay();
  }
};

// 关闭奖励弹窗
function closeReward() {
  document.getElementById('reward-popup').classList.add('hidden');
}
