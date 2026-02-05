// ========== 亲子互动 PK 模式 ==========

const FamilyPK = {
  // 游戏配置
  config: {
    questionType: 'mixed',  // 'math', 'english', 'chinese', 'mixed'
    difficulty: 'easy',     // 'easy', 'medium', 'hard'
    totalRounds: 10,        // 5, 10, 15, 20
    range: 10               // 数学范围: 10, 20, 30
  },

  // 当前游戏状态
  state: {
    isPlaying: false,
    currentRound: 0,
    parentScore: 0,
    childScore: 0,
    currentQuestion: null,
    answered: false,
    startTime: null,
    roundStartTime: null
  },

  // 数据题库（复用现有数据）
  englishWords: [
    { word: 'Apple', image: '🍎', meaning: '苹果' },
    { word: 'Banana', image: '🍌', meaning: '香蕉' },
    { word: 'Cat', image: '🐱', meaning: '猫' },
    { word: 'Dog', image: '🐶', meaning: '狗' },
    { word: 'Elephant', image: '🐘', meaning: '大象' },
    { word: 'Fish', image: '🐟', meaning: '鱼' },
    { word: 'Grapes', image: '🍇', meaning: '葡萄' },
    { word: 'House', image: '🏠', meaning: '房子' },
    { word: 'Ice cream', image: '🍦', meaning: '冰淇淋' },
    { word: 'Juice', image: '🧃', meaning: '果汁' },
    { word: 'Kite', image: '🪁', meaning: '风筝' },
    { word: 'Lion', image: '🦁', meaning: '狮子' },
    { word: 'Moon', image: '🌙', meaning: '月亮' },
    { word: 'Noodles', image: '🍜', meaning: '面条' },
    { word: 'Orange', image: '🍊', meaning: '橙子' },
    { word: 'Panda', image: '🐼', meaning: '熊猫' },
    { word: 'Rabbit', image: '🐰', meaning: '兔子' },
    { word: 'Sun', image: '☀️', meaning: '太阳' },
    { word: 'Tiger', image: '🐯', meaning: '老虎' },
    { word: 'Umbrella', image: '☂️', meaning: '雨伞' },
    { word: 'Watermelon', image: '🍉', meaning: '西瓜' },
    { word: 'Zebra', image: '🦓', meaning: '斑马' }
  ],

  chineseChars: [
    { char: '大', pinyin: 'dà', meanings: ['大', '小', '高', '矮'], correct: '大' },
    { char: '小', pinyin: 'xiǎo', meanings: ['大', '小', '长', '短'], correct: '小' },
    { char: '人', pinyin: 'rén', meanings: ['人', '山', '水', '火'], correct: '人' },
    { char: '山', pinyin: 'shān', meanings: ['山', '水', '石', '土'], correct: '山' },
    { char: '水', pinyin: 'shuǐ', meanings: ['水', '火', '土', '木'], correct: '水' },
    { char: '火', pinyin: 'huǒ', meanings: ['火', '水', '风', '雨'], correct: '火' },
    { char: '日', pinyin: 'rì', meanings: ['太阳', '月亮', '星星', '云'], correct: '太阳' },
    { char: '月', pinyin: 'yuè', meanings: ['月亮', '太阳', '星星', '天'], correct: '月亮' },
    { char: '天', pinyin: 'tiān', meanings: ['天', '地', '人', '云'], correct: '天' },
    { char: '地', pinyin: 'dì', meanings: ['地', '天', '水', '山'], correct: '地' },
    { char: '上', pinyin: 'shàng', meanings: ['上', '下', '左', '右'], correct: '上' },
    { char: '下', pinyin: 'xià', meanings: ['下', '上', '前', '后'], correct: '下' },
    { char: '口', pinyin: 'kǒu', meanings: ['嘴巴', '眼睛', '耳朵', '鼻子'], correct: '嘴巴' },
    { char: '目', pinyin: 'mù', meanings: ['眼睛', '嘴巴', '耳朵', '手'], correct: '眼睛' },
    { char: '手', pinyin: 'shǒu', meanings: ['手', '脚', '头', '肩'], correct: '手' },
    { char: '花', pinyin: 'huā', meanings: ['花', '草', '树', '叶'], correct: '花' },
    { char: '草', pinyin: 'cǎo', meanings: ['草', '花', '木', '石'], correct: '草' },
    { char: '鸟', pinyin: 'niǎo', meanings: ['鸟', '鱼', '虫', '兽'], correct: '鸟' },
    { char: '鱼', pinyin: 'yú', meanings: ['鱼', '鸟', '虾', '蟹'], correct: '鱼' }
  ],

  // 初始化
  init() {
    this.loadHistory();
  },

  // 显示设置界面
  showSetup() {
    const modal = document.getElementById('family-pk-modal');
    if (!modal) return;

    // 重置配置为默认值
    this.config = {
      questionType: 'mixed',
      difficulty: 'easy',
      totalRounds: 10,
      range: 10
    };

    // 显示设置页面，隐藏游戏和结果页面
    document.getElementById('pk-setup').classList.remove('hidden');
    document.getElementById('pk-game').classList.add('hidden');
    document.getElementById('pk-result').classList.add('hidden');

    // 更新设置 UI
    this.updateSetupUI();

    // 显示弹窗
    modal.classList.remove('hidden');

    // 记录最近使用
    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('familyPK');
    }
  },

  // 更新设置界面
  updateSetupUI() {
    // 题型选择
    document.querySelectorAll('.pk-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === this.config.questionType);
    });

    // 难度选择
    document.querySelectorAll('.pk-diff-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === this.config.difficulty);
    });

    // 回合数选择
    document.querySelectorAll('.pk-rounds-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.rounds) === this.config.totalRounds);
    });
  },

  // 选择题型
  setQuestionType(type) {
    this.config.questionType = type;
    this.updateSetupUI();
    RewardSystem.playSound('click');
  },

  // 选择难度
  setDifficulty(diff) {
    this.config.difficulty = diff;
    // 根据难度设置数学范围
    if (diff === 'easy') this.config.range = 10;
    else if (diff === 'medium') this.config.range = 20;
    else this.config.range = 30;
    this.updateSetupUI();
    RewardSystem.playSound('click');
  },

  // 选择回合数
  setRounds(rounds) {
    this.config.totalRounds = rounds;
    this.updateSetupUI();
    RewardSystem.playSound('click');
  },

  // 开始游戏
  startGame() {
    // 初始化游戏状态
    this.state = {
      isPlaying: true,
      currentRound: 0,
      parentScore: 0,
      childScore: 0,
      currentQuestion: null,
      answered: false,
      startTime: Date.now(),
      roundStartTime: null
    };

    // 切换到游戏界面
    document.getElementById('pk-setup').classList.add('hidden');
    document.getElementById('pk-game').classList.remove('hidden');

    // 开始倒计时
    this.showCountdown();
  },

  // 显示倒计时
  showCountdown() {
    const countdownEl = document.getElementById('pk-countdown');
    const questionArea = document.getElementById('pk-question-area');
    const optionsArea = document.querySelectorAll('.pk-options');

    countdownEl.classList.remove('hidden');
    questionArea.classList.add('hidden');
    optionsArea.forEach(el => el.classList.add('hidden'));

    let count = 3;
    countdownEl.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
        RewardSystem.playSound('click');
      } else if (count === 0) {
        countdownEl.textContent = I18n.t('familyPK.go', 'GO!');
        RewardSystem.playSound('correct');
      } else {
        clearInterval(interval);
        countdownEl.classList.add('hidden');
        questionArea.classList.remove('hidden');
        optionsArea.forEach(el => el.classList.remove('hidden'));
        this.nextRound();
      }
    }, 1000);
  },

  // 下一回合
  nextRound() {
    this.state.currentRound++;
    this.state.answered = false;
    this.state.roundStartTime = Date.now();

    // 更新回合显示
    document.getElementById('pk-round-num').textContent = this.state.currentRound;
    document.getElementById('pk-total-rounds').textContent = this.config.totalRounds;

    // 更新分数显示
    document.getElementById('pk-parent-score').textContent = this.state.parentScore;
    document.getElementById('pk-child-score').textContent = this.state.childScore;

    // 生成题目
    this.generateQuestion();
  },

  // 生成题目
  generateQuestion() {
    let type = this.config.questionType;
    if (type === 'mixed') {
      const types = ['math', 'english', 'chinese'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    let question;
    if (type === 'math') {
      question = this.generateMathQuestion();
    } else if (type === 'english') {
      question = this.generateEnglishQuestion();
    } else {
      question = this.generateChineseQuestion();
    }

    this.state.currentQuestion = question;
    this.renderQuestion(question);
  },

  // 生成数学题
  generateMathQuestion() {
    const range = this.config.range;
    const operators = ['+', '-'];
    if (this.config.difficulty !== 'easy') {
      operators.push('×');
    }
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2, answer;

    if (operator === '+') {
      num1 = Math.floor(Math.random() * range) + 1;
      num2 = Math.floor(Math.random() * (range - num1)) + 1;
      answer = num1 + num2;
    } else if (operator === '-') {
      num1 = Math.floor(Math.random() * range) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      if (num2 > num1) [num1, num2] = [num2, num1];
      answer = num1 - num2;
    } else {
      const maxFactor = range <= 10 ? 5 : 9;
      num1 = Math.floor(Math.random() * maxFactor) + 1;
      num2 = Math.floor(Math.random() * maxFactor) + 1;
      answer = num1 * num2;
    }

    // 生成选项
    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 7) - 3);
      if (wrong >= 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }
    this.shuffleArray(options);

    return {
      type: 'math',
      display: `${num1} ${operator} ${num2} = ?`,
      options: options.map(o => o.toString()),
      answer: answer.toString()
    };
  },

  // 生成英语题
  generateEnglishQuestion() {
    const word = this.englishWords[Math.floor(Math.random() * this.englishWords.length)];
    const options = [word.meaning];

    while (options.length < 4) {
      const random = this.englishWords[Math.floor(Math.random() * this.englishWords.length)].meaning;
      if (!options.includes(random)) {
        options.push(random);
      }
    }
    this.shuffleArray(options);

    return {
      type: 'english',
      display: `${word.image} ${word.word}`,
      options: options,
      answer: word.meaning
    };
  },

  // 生成中文题
  generateChineseQuestion() {
    const char = this.chineseChars[Math.floor(Math.random() * this.chineseChars.length)];
    const options = [...char.meanings];
    this.shuffleArray(options);

    return {
      type: 'chinese',
      display: `${char.char} (${char.pinyin})`,
      options: options,
      answer: char.correct
    };
  },

  // 渲染题目
  renderQuestion(question) {
    // 显示题目
    const questionEl = document.getElementById('pk-question-text');
    questionEl.textContent = question.display;

    // 题目类型图标
    const typeIcons = {
      math: '🔢',
      english: '🔤',
      chinese: '📝'
    };
    document.getElementById('pk-question-type').textContent = typeIcons[question.type] || '❓';

    // 渲染双方选项
    this.renderOptions('parent', question.options);
    this.renderOptions('child', question.options);

    // 重置选项状态
    document.querySelectorAll('.pk-option-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong', 'disabled');
      btn.disabled = false;
    });
  },

  // 渲染选项
  renderOptions(player, options) {
    const container = document.getElementById(`pk-${player}-options`);
    if (!container) return;

    container.innerHTML = options.map((opt, index) => `
      <button class="pk-option-btn" data-player="${player}" data-answer="${opt}" onclick="FamilyPK.checkAnswer('${player}', '${opt}', this)">
        ${opt}
      </button>
    `).join('');
  },

  // 检查答案
  checkAnswer(player, answer, btn) {
    if (this.state.answered || !this.state.isPlaying) return;

    this.state.answered = true;
    const question = this.state.currentQuestion;
    const isCorrect = answer === question.answer;

    // 计算响应时间奖励分
    const responseTime = Date.now() - this.state.roundStartTime;
    const baseScore = 10;
    const speedBonus = responseTime < 3000 ? 5 : (responseTime < 5000 ? 3 : 0);

    // 禁用所有选项
    document.querySelectorAll('.pk-option-btn').forEach(b => {
      b.disabled = true;
      b.classList.add('disabled');
      // 高亮正确答案
      if (b.dataset.answer === question.answer) {
        b.classList.add('correct');
      }
    });

    if (isCorrect) {
      btn.classList.add('correct');
      const score = baseScore + speedBonus;

      if (player === 'parent') {
        this.state.parentScore += score;
        this.showPlayerFeedback('parent', true, score);
      } else {
        this.state.childScore += score;
        this.showPlayerFeedback('child', true, score);
      }
      RewardSystem.playSound('correct');
    } else {
      btn.classList.add('wrong');
      this.showPlayerFeedback(player, false, 0);
      RewardSystem.playSound('wrong');
    }

    // 更新分数
    document.getElementById('pk-parent-score').textContent = this.state.parentScore;
    document.getElementById('pk-child-score').textContent = this.state.childScore;

    // 延迟后进入下一回合或结束
    setTimeout(() => {
      if (this.state.currentRound >= this.config.totalRounds) {
        this.endGame();
      } else {
        this.nextRound();
      }
    }, 1500);
  },

  // 显示玩家反馈
  showPlayerFeedback(player, isCorrect, score) {
    const feedbackEl = document.getElementById(`pk-${player}-feedback`);
    if (!feedbackEl) return;

    if (isCorrect) {
      feedbackEl.textContent = `+${score} ⭐`;
      feedbackEl.className = 'pk-feedback correct';
    } else {
      feedbackEl.textContent = '✗';
      feedbackEl.className = 'pk-feedback wrong';
    }

    feedbackEl.classList.remove('hidden');
    setTimeout(() => feedbackEl.classList.add('hidden'), 1200);
  },

  // 结束游戏
  endGame() {
    this.state.isPlaying = false;
    const totalTime = Math.floor((Date.now() - this.state.startTime) / 1000);

    // 判断胜负
    let winner;
    if (this.state.parentScore > this.state.childScore) {
      winner = 'parent';
    } else if (this.state.childScore > this.state.parentScore) {
      winner = 'child';
    } else {
      winner = 'tie';
    }

    // 保存历史记录
    this.saveHistory({
      date: new Date().toISOString(),
      questionType: this.config.questionType,
      difficulty: this.config.difficulty,
      totalRounds: this.config.totalRounds,
      parentScore: this.state.parentScore,
      childScore: this.state.childScore,
      winner: winner,
      duration: totalTime
    });

    // 显示结果界面
    this.showResult(winner, totalTime);

    // 播放庆祝效果
    RewardSystem.playSound('correct');
    RewardSystem.createParticles();

    // 📊 追踪游戏完成
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('family_pk_complete', {
        question_type: this.config.questionType,
        difficulty: this.config.difficulty,
        rounds: this.config.totalRounds,
        parent_score: this.state.parentScore,
        child_score: this.state.childScore,
        winner: winner
      });
    }
  },

  // 显示结果
  showResult(winner, totalTime) {
    document.getElementById('pk-game').classList.add('hidden');
    document.getElementById('pk-result').classList.remove('hidden');

    // 显示胜负
    const resultTitle = document.getElementById('pk-result-title');
    const resultIcon = document.getElementById('pk-result-icon');

    if (winner === 'parent') {
      resultIcon.textContent = '👨';
      resultTitle.textContent = I18n.t('familyPK.parentWins', '家长获胜!');
    } else if (winner === 'child') {
      resultIcon.textContent = '👧';
      resultTitle.textContent = I18n.t('familyPK.childWins', '宝贝获胜!');
    } else {
      resultIcon.textContent = '🤝';
      resultTitle.textContent = I18n.t('familyPK.tie', '平局!');
    }

    // 显示分数
    document.getElementById('pk-result-parent-score').textContent = this.state.parentScore;
    document.getElementById('pk-result-child-score').textContent = this.state.childScore;

    // 显示用时
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    document.getElementById('pk-result-time').textContent =
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // 再玩一次
  playAgain() {
    this.showSetup();
  },

  // 关闭弹窗
  close() {
    const modal = document.getElementById('family-pk-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.state.isPlaying = false;
  },

  // 保存历史记录
  saveHistory(record) {
    let data = this.loadHistoryData();
    data.history.unshift(record);

    // 最多保存50条记录
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50);
    }

    // 更新统计
    data.stats.totalGames++;
    data.stats.totalTime += record.duration;
    if (record.winner === 'parent') data.stats.parentWins++;
    else if (record.winner === 'child') data.stats.childWins++;
    else data.stats.ties++;

    localStorage.setItem('kidsFamilyPK', JSON.stringify(data));
  },

  // 加载历史记录
  loadHistory() {
    this.historyData = this.loadHistoryData();
  },

  // 加载历史数据
  loadHistoryData() {
    try {
      const saved = localStorage.getItem('kidsFamilyPK');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load family PK history:', e);
    }
    return {
      history: [],
      stats: {
        totalGames: 0,
        totalTime: 0,
        parentWins: 0,
        childWins: 0,
        ties: 0
      }
    };
  },

  // 工具函数: 打乱数组
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
};

// 全局函数，用于 HTML onclick
function showFamilyPK() {
  FamilyPK.showSetup();
}

function closeFamilyPK() {
  FamilyPK.close();
}

function startFamilyPK() {
  FamilyPK.startGame();
}

function playFamilyPKAgain() {
  FamilyPK.playAgain();
}
