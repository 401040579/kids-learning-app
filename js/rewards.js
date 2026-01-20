// ========== 奖励系统 ==========

const RewardSystem = {
  // 数据存储
  data: {
    totalScore: 0,
    tasksDone: 0,
    mathCorrect: 0,
    mathStreak: 0,
    englishCorrect: 0,
    chineseCorrect: 0
  },

  // 初始化
  init() {
    this.loadData();
    this.updateDisplay();
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

      if (type === 'reward') {
        // 奖励音效：上升音调
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
      } else if (type === 'correct') {
        // 正确音效
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
      } else if (type === 'wrong') {
        // 错误音效
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
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
      chineseCorrect: 0
    };
    this.saveData();
    this.updateDisplay();
  }
};

// 关闭奖励弹窗
function closeReward() {
  document.getElementById('reward-popup').classList.add('hidden');
}
