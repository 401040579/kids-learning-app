// ========== 记忆训练游戏模块 ==========

const MemoryGame = {
  // 游戏类型
  gameTypes: [
    { id: 'flip', name: '翻牌配对', icon: '🃏', desc: '找出相同的图案' },
    { id: 'sequence', name: '顺序记忆', icon: '🔢', desc: '记住亮灯顺序' },
    { id: 'findDiff', name: '找不同', icon: '🔍', desc: '找出两图差异' }
  ],

  // 翻牌配对的图案
  flipCards: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐔'],

  // 顺序记忆的颜色
  sequenceColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],

  // 找不同的图片组
  findDiffSets: [
    {
      id: 1,
      name: '可爱动物',
      left: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼'],
      right: ['🐶', '🐱', '🐰', '🦁', '🐻', '🐼'],
      diffIndex: 3
    },
    {
      id: 2,
      name: '水果乐园',
      left: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑'],
      right: ['🍎', '🍊', '🍋', '🍇', '🍒', '🍑'],
      diffIndex: 4
    },
    {
      id: 3,
      name: '交通工具',
      left: ['🚗', '🚕', '🚌', '🚎', '🚐', '🚑'],
      right: ['🚗', '🚕', '🚌', '🚎', '🚐', '🚒'],
      diffIndex: 5
    }
  ],

  // 当前游戏状态
  currentGame: null,
  score: 0,
  moves: 0,
  timer: null,
  timeElapsed: 0,

  // 翻牌游戏状态
  flipState: {
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    canFlip: true
  },

  // 顺序记忆状态
  sequenceState: {
    sequence: [],
    playerSequence: [],
    level: 1,
    isShowingSequence: false,
    currentShowIndex: 0
  },

  // 找不同状态
  findDiffState: {
    currentSet: null,
    found: false,
    attempts: 0
  },

  // 初始化
  init() {
    this.loadStats();
  },

  // 渲染游戏选择界面
  renderGameSelect() {
    const selectContainer = document.getElementById('memory-game-select');
    const gameArea = document.getElementById('memory-game-area');

    if (selectContainer) {
      let html = '';
      this.gameTypes.forEach(game => {
        html += `
          <div class="memory-type-card" onclick="selectMemoryGame('${game.id}')">
            <div class="memory-type-icon">${game.icon}</div>
            <div class="memory-type-info">
              <h3>${game.name}</h3>
              <p>${game.desc}</p>
            </div>
          </div>
        `;
      });
      selectContainer.innerHTML = html;
      selectContainer.classList.remove('hidden');
    }

    if (gameArea) {
      gameArea.classList.add('hidden');
      gameArea.innerHTML = '';
    }
  },

  // 停止当前游戏
  stopCurrentGame() {
    this.stopTimer();
    this.currentGame = null;
  },

  // 重新开始当前游戏
  restartCurrentGame() {
    if (this.currentGame === 'flip') {
      this.startFlipGame('easy');
    } else if (this.currentGame === 'sequence') {
      this.startSequenceGame();
    } else if (this.currentGame === 'findDiff') {
      this.startFindDiffGame();
    }
  },

  // 加载统计数据
  loadStats() {
    const saved = localStorage.getItem('kidsMemoryGameStats');
    if (saved) {
      this.stats = JSON.parse(saved);
    } else {
      this.stats = {
        flipGamesPlayed: 0,
        flipBestTime: null,
        sequenceHighLevel: 0,
        findDiffCompleted: 0,
        totalScore: 0
      };
    }
  },

  // 保存统计数据
  saveStats() {
    safeSetItem('kidsMemoryGameStats', JSON.stringify(this.stats));
  },

  // 开始翻牌配对游戏
  startFlipGame(difficulty = 'easy') {
    this.currentGame = 'flip';
    this.score = 0;
    this.moves = 0;
    this.timeElapsed = 0;

    // 根据难度设置卡片数量
    let pairCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;

    // 选择图案
    const selectedEmojis = this.flipCards.slice(0, pairCount);
    let cards = [...selectedEmojis, ...selectedEmojis];

    // 打乱顺序
    cards = cards.sort(() => Math.random() - 0.5);

    // 创建卡片对象
    this.flipState.cards = cards.map((emoji, index) => ({
      id: index,
      emoji: emoji,
      isFlipped: false,
      isMatched: false
    }));

    this.flipState.flippedCards = [];
    this.flipState.matchedPairs = 0;
    this.flipState.canFlip = true;

    // 开始计时
    this.startTimer();

    // 渲染游戏
    this.renderFlipGame();
  },

  // 渲染翻牌游戏
  renderFlipGame() {
    const container = document.getElementById('memory-game-area');
    if (!container) return;

    const gridSize = this.flipState.cards.length <= 8 ? 'grid-2x4' :
                     this.flipState.cards.length <= 12 ? 'grid-3x4' : 'grid-4x4';

    let html = `
      <div class="flip-game-header">
        <div class="flip-stat">
          <span class="flip-stat-icon">⏱️</span>
          <span class="flip-stat-value" id="flip-timer">0:00</span>
        </div>
        <div class="flip-stat">
          <span class="flip-stat-icon">👆</span>
          <span class="flip-stat-value" id="flip-moves">${this.moves}</span>
        </div>
        <div class="flip-stat">
          <span class="flip-stat-icon">✅</span>
          <span class="flip-stat-value" id="flip-pairs">${this.flipState.matchedPairs}/${this.flipState.cards.length / 2}</span>
        </div>
      </div>
      <div class="flip-cards-grid ${gridSize}">
    `;

    this.flipState.cards.forEach(card => {
      const flippedClass = card.isFlipped || card.isMatched ? 'flipped' : '';
      const matchedClass = card.isMatched ? 'matched' : '';
      html += `
        <div class="flip-card ${flippedClass} ${matchedClass}" data-id="${card.id}" onclick="MemoryGame.flipCard(${card.id})">
          <div class="flip-card-inner">
            <div class="flip-card-front">❓</div>
            <div class="flip-card-back">${card.emoji}</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  // 翻牌
  flipCard(cardId) {
    if (!this.flipState.canFlip) return;

    const card = this.flipState.cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // 翻开卡片
    card.isFlipped = true;
    this.flipState.flippedCards.push(card);
    this.moves++;

    // 更新显示
    this.renderFlipGame();
    RewardSystem.playSound('click');

    // 检查是否翻开了两张
    if (this.flipState.flippedCards.length === 2) {
      this.flipState.canFlip = false;
      this.checkFlipMatch();
    }
  },

  // 检查配对
  checkFlipMatch() {
    const [card1, card2] = this.flipState.flippedCards;

    setTimeout(() => {
      if (card1.emoji === card2.emoji) {
        // 配对成功
        card1.isMatched = true;
        card2.isMatched = true;
        this.flipState.matchedPairs++;
        this.score += 10;
        RewardSystem.playSound('correct');

        // 检查是否完成
        if (this.flipState.matchedPairs === this.flipState.cards.length / 2) {
          this.endFlipGame(true);
          return;
        }
      } else {
        // 配对失败，翻回去
        card1.isFlipped = false;
        card2.isFlipped = false;
        RewardSystem.playSound('wrong');
      }

      this.flipState.flippedCards = [];
      this.flipState.canFlip = true;
      this.renderFlipGame();
    }, 800);
  },

  // 结束翻牌游戏
  endFlipGame(success) {
    this.stopTimer();
    this.stats.flipGamesPlayed++;

    if (success) {
      // 计算得分
      const timeBonus = Math.max(0, 100 - this.timeElapsed);
      const moveBonus = Math.max(0, 50 - this.moves);
      const totalScore = this.score + timeBonus + moveBonus;

      // 更新最佳时间
      if (!this.stats.flipBestTime || this.timeElapsed < this.stats.flipBestTime) {
        this.stats.flipBestTime = this.timeElapsed;
      }

      this.stats.totalScore += totalScore;
      this.saveStats();

      // 添加积分到奖励系统
      RewardSystem.addPoints(totalScore, '翻牌配对完成！');

      // 显示完成弹窗
      this.showGameComplete('flip', {
        time: this.formatTime(this.timeElapsed),
        moves: this.moves,
        score: totalScore
      });
    }
  },

  // 开始顺序记忆游戏
  startSequenceGame() {
    this.currentGame = 'sequence';
    this.sequenceState.sequence = [];
    this.sequenceState.playerSequence = [];
    this.sequenceState.level = 1;
    this.sequenceState.isShowingSequence = false;

    this.renderSequenceGame();
    setTimeout(() => this.addToSequence(), 1000);
  },

  // 渲染顺序记忆游戏
  renderSequenceGame() {
    const container = document.getElementById('memory-game-area');
    if (!container) return;

    let html = `
      <div class="sequence-game-header">
        <div class="sequence-level">第 ${this.sequenceState.level} 关</div>
        <div class="sequence-hint" id="sequence-hint">看我闪！</div>
      </div>
      <div class="sequence-buttons">
    `;

    this.sequenceColors.forEach((color, index) => {
      html += `
        <button class="sequence-btn" id="seq-btn-${index}"
                style="background-color: ${color}"
                onclick="MemoryGame.playerSelectSequence(${index})"
                ${this.sequenceState.isShowingSequence ? 'disabled' : ''}>
        </button>
      `;
    });

    html += `
      </div>
      <div class="sequence-progress">
        <span>记住了 ${this.sequenceState.playerSequence.length} / ${this.sequenceState.sequence.length}</span>
      </div>
    `;

    container.innerHTML = html;
  },

  // 添加新的顺序
  addToSequence() {
    const newIndex = Math.floor(Math.random() * this.sequenceColors.length);
    this.sequenceState.sequence.push(newIndex);
    this.sequenceState.playerSequence = [];
    this.showSequence();
  },

  // 显示顺序
  showSequence() {
    this.sequenceState.isShowingSequence = true;
    this.sequenceState.currentShowIndex = 0;
    this.renderSequenceGame();

    const showNext = () => {
      if (this.sequenceState.currentShowIndex >= this.sequenceState.sequence.length) {
        this.sequenceState.isShowingSequence = false;
        document.getElementById('sequence-hint').textContent = '轮到你了！';
        this.renderSequenceGame();
        return;
      }

      const btnIndex = this.sequenceState.sequence[this.sequenceState.currentShowIndex];
      const btn = document.getElementById(`seq-btn-${btnIndex}`);

      if (btn) {
        btn.classList.add('active');
        RewardSystem.playSound('click');

        setTimeout(() => {
          btn.classList.remove('active');
          this.sequenceState.currentShowIndex++;
          setTimeout(showNext, 300);
        }, 500);
      }
    };

    setTimeout(showNext, 500);
  },

  // 玩家选择顺序
  playerSelectSequence(index) {
    if (this.sequenceState.isShowingSequence) return;

    const btn = document.getElementById(`seq-btn-${index}`);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 200);
    }

    this.sequenceState.playerSequence.push(index);
    const currentIndex = this.sequenceState.playerSequence.length - 1;

    // 检查是否正确
    if (this.sequenceState.sequence[currentIndex] !== index) {
      // 错误
      RewardSystem.playSound('wrong');
      this.endSequenceGame(false);
      return;
    }

    RewardSystem.playSound('click');

    // 检查是否完成当前关卡
    if (this.sequenceState.playerSequence.length === this.sequenceState.sequence.length) {
      RewardSystem.playSound('correct');
      this.sequenceState.level++;

      // 更新最高关卡
      if (this.sequenceState.level > this.stats.sequenceHighLevel) {
        this.stats.sequenceHighLevel = this.sequenceState.level;
        this.saveStats();
      }

      this.renderSequenceGame();
      document.getElementById('sequence-hint').textContent = '太棒了！下一关！';

      setTimeout(() => this.addToSequence(), 1500);
    } else {
      this.renderSequenceGame();
    }
  },

  // 结束顺序记忆游戏
  endSequenceGame(success) {
    const score = (this.sequenceState.level - 1) * 15;
    this.stats.totalScore += score;
    this.saveStats();

    if (score > 0) {
      RewardSystem.addPoints(score, `顺序记忆达到第${this.sequenceState.level - 1}关！`);
    }

    this.showGameComplete('sequence', {
      level: this.sequenceState.level - 1,
      highLevel: this.stats.sequenceHighLevel,
      score: score
    });
  },

  // 开始找不同游戏
  startFindDiffGame() {
    this.currentGame = 'findDiff';
    this.findDiffState.currentSet = this.findDiffSets[Math.floor(Math.random() * this.findDiffSets.length)];
    this.findDiffState.found = false;
    this.findDiffState.attempts = 0;
    this.timeElapsed = 0;
    this.startTimer();

    this.renderFindDiffGame();
  },

  // 渲染找不同游戏
  renderFindDiffGame() {
    const container = document.getElementById('memory-game-area');
    if (!container) return;

    const set = this.findDiffState.currentSet;

    let html = `
      <div class="find-diff-header">
        <div class="find-diff-title">${set.name}</div>
        <div class="find-diff-timer">⏱️ <span id="find-diff-timer">0:00</span></div>
      </div>
      <div class="find-diff-hint">找出两边不同的图案，点击它！</div>
      <div class="find-diff-container">
        <div class="find-diff-side">
    `;

    set.left.forEach((emoji, index) => {
      const isFound = this.findDiffState.found && index === set.diffIndex;
      html += `
        <div class="find-diff-item ${isFound ? 'found' : ''}" onclick="MemoryGame.checkDiff('left', ${index})">
          ${emoji}
        </div>
      `;
    });

    html += `</div><div class="find-diff-divider">VS</div><div class="find-diff-side">`;

    set.right.forEach((emoji, index) => {
      const isFound = this.findDiffState.found && index === set.diffIndex;
      html += `
        <div class="find-diff-item ${isFound ? 'found' : ''}" onclick="MemoryGame.checkDiff('right', ${index})">
          ${emoji}
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  },

  // 检查找不同
  checkDiff(side, index) {
    if (this.findDiffState.found) return;

    this.findDiffState.attempts++;

    if (index === this.findDiffState.currentSet.diffIndex) {
      // 找到了！
      this.findDiffState.found = true;
      this.stopTimer();
      RewardSystem.playSound('correct');
      this.renderFindDiffGame();

      // 计算得分
      const timeBonus = Math.max(0, 50 - this.timeElapsed);
      const attemptBonus = this.findDiffState.attempts === 1 ? 20 : 0;
      const score = 30 + timeBonus + attemptBonus;

      this.stats.findDiffCompleted++;
      this.stats.totalScore += score;
      this.saveStats();

      setTimeout(() => {
        RewardSystem.addPoints(score, '找到不同了！');
        this.showGameComplete('findDiff', {
          time: this.formatTime(this.timeElapsed),
          attempts: this.findDiffState.attempts,
          score: score
        });
      }, 500);
    } else {
      // 没找到
      RewardSystem.playSound('wrong');
    }
  },

  // 开始计时
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeElapsed++;
      this.updateTimerDisplay();
    }, 1000);
  },

  // 停止计时
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 更新计时器显示
  updateTimerDisplay() {
    const timerEl = document.getElementById('flip-timer') || document.getElementById('find-diff-timer');
    if (timerEl) {
      timerEl.textContent = this.formatTime(this.timeElapsed);
    }
  },

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // 显示游戏完成弹窗
  showGameComplete(gameType, stats) {
    const modal = document.getElementById('memory-complete-modal');
    if (!modal) return;

    let title, content;

    if (gameType === 'flip') {
      title = '翻牌配对完成！';
      content = `
        <div class="complete-stat"><span>⏱️ 用时</span><span>${stats.time}</span></div>
        <div class="complete-stat"><span>👆 步数</span><span>${stats.moves}</span></div>
        <div class="complete-stat"><span>⭐ 得分</span><span>+${stats.score}</span></div>
      `;
    } else if (gameType === 'sequence') {
      title = '顺序记忆结束！';
      content = `
        <div class="complete-stat"><span>🎯 到达</span><span>第${stats.level}关</span></div>
        <div class="complete-stat"><span>🏆 最高</span><span>第${stats.highLevel}关</span></div>
        <div class="complete-stat"><span>⭐ 得分</span><span>+${stats.score}</span></div>
      `;
    } else if (gameType === 'findDiff') {
      title = '找到不同了！';
      content = `
        <div class="complete-stat"><span>⏱️ 用时</span><span>${stats.time}</span></div>
        <div class="complete-stat"><span>👆 尝试</span><span>${stats.attempts}次</span></div>
        <div class="complete-stat"><span>⭐ 得分</span><span>+${stats.score}</span></div>
      `;
    }

    document.getElementById('memory-complete-title').textContent = title;
    document.getElementById('memory-complete-stats').innerHTML = content;
    modal.classList.remove('hidden');

    // 📊 追踪记忆游戏完成
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('memory_game_complete', {
        game_type: gameType,
        score: stats.score,
        level: stats.level || 0,
        moves: stats.moves || 0
      });
    }

    RewardSystem.createParticles();
  }
};

// 显示记忆游戏选择页面
function showMemoryGameSelect() {
  const selectContainer = document.getElementById('memory-game-select');
  const gameArea = document.getElementById('memory-game-area');

  // 显示选择界面，隐藏游戏区域
  if (selectContainer) selectContainer.classList.remove('hidden');
  if (gameArea) {
    gameArea.classList.add('hidden');
    gameArea.innerHTML = '';
  }
}

// 选择记忆游戏
function selectMemoryGame(gameId) {
  // 隐藏选择界面，显示游戏区域
  const selectContainer = document.getElementById('memory-game-select');
  const gameArea = document.getElementById('memory-game-area');

  if (selectContainer) selectContainer.classList.add('hidden');
  if (gameArea) gameArea.classList.remove('hidden');

  if (gameId === 'flip') {
    showFlipDifficultySelect();
  } else if (gameId === 'sequence') {
    MemoryGame.startSequenceGame();
  } else if (gameId === 'findDiff') {
    MemoryGame.startFindDiffGame();
  }
}

// 显示翻牌难度选择
function showFlipDifficultySelect() {
  const container = document.getElementById('memory-game-area');
  if (!container) return;

  container.innerHTML = `
    <div class="difficulty-select">
      <h3>选择难度</h3>
      <div class="difficulty-options">
        <button class="difficulty-btn easy" onclick="MemoryGame.startFlipGame('easy')">
          <span class="diff-icon">😊</span>
          <span class="diff-name">简单</span>
          <span class="diff-desc">4对卡片</span>
        </button>
        <button class="difficulty-btn medium" onclick="MemoryGame.startFlipGame('medium')">
          <span class="diff-icon">🤔</span>
          <span class="diff-name">中等</span>
          <span class="diff-desc">6对卡片</span>
        </button>
        <button class="difficulty-btn hard" onclick="MemoryGame.startFlipGame('hard')">
          <span class="diff-icon">😤</span>
          <span class="diff-name">困难</span>
          <span class="diff-desc">8对卡片</span>
        </button>
      </div>
    </div>
  `;
}

// 关闭记忆游戏完成弹窗
function closeMemoryComplete() {
  document.getElementById('memory-complete-modal').classList.add('hidden');
  showMemoryGameSelect();
}

// 再玩一次
function playMemoryAgain() {
  document.getElementById('memory-complete-modal').classList.add('hidden');

  if (MemoryGame.currentGame === 'flip') {
    showFlipDifficultySelect();
  } else if (MemoryGame.currentGame === 'sequence') {
    MemoryGame.startSequenceGame();
  } else if (MemoryGame.currentGame === 'findDiff') {
    MemoryGame.startFindDiffGame();
  }
}
