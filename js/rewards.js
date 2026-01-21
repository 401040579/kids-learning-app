// ========== 日历数据管理 ==========

const CalendarData = {
  // 数据存储
  events: {},

  // 初始化
  init() {
    this.loadData();
  },

  // 从本地存储加载数据
  loadData() {
    const saved = localStorage.getItem('kidsCalendarData');
    if (saved) {
      this.events = JSON.parse(saved);
    }
  },

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('kidsCalendarData', JSON.stringify(this.events));
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
  loadData() {
    const saved = localStorage.getItem('kidsLearningData');
    if (saved) {
      this.data = JSON.parse(saved);
    }
  },

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('kidsLearningData', JSON.stringify(this.data));
  },

  // 更新页面显示
  updateDisplay() {
    document.getElementById('total-score').textContent = this.data.totalScore;
    document.getElementById('tasks-done').textContent = this.data.tasksDone;
    document.getElementById('math-correct').textContent = this.data.mathCorrect;
    document.getElementById('math-streak').textContent = this.data.mathStreak;

    // 更新进度条
    const progress = Math.min((this.data.tasksDone / 10) * 100, 100);
    document.getElementById('progress-fill').style.width = progress + '%';
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

    this.addPoints(points, '数学题答对了!');
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
    this.addPoints(15, '单词学会了!');
  },

  // 中文答对
  chineseCorrect() {
    this.data.chineseCorrect++;
    this.addPoints(15, '汉字认对了!');
  },

  // 科学答对
  scienceCorrect() {
    this.data.scienceCorrect++;
    this.addPoints(15, '科学题答对了!');
  },

  // 显示奖励弹窗
  showReward(points, message) {
    const popup = document.getElementById('reward-popup');
    const pointsEl = document.getElementById('reward-points');
    const messageEl = document.querySelector('.reward-message');

    pointsEl.textContent = points;
    messageEl.innerHTML = message + ' 你获得了 <span id="reward-points">' + points + '</span> 分!';

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
