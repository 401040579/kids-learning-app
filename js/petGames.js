// ========== 宠物迷你游戏系统 ==========

const PetGames = {
  // 游戏列表
  games: [
    {
      id: 'fruit-catch',
      name: '接水果',
      icon: '🍎',
      desc: '接住掉落的水果',
      color: '#FF6B6B'
    },
    {
      id: 'jump',
      name: '跳跳冒险',
      icon: '⭐',
      desc: '跳跃收集星星',
      color: '#FFD93D'
    }
  ],

  // 游戏统计
  stats: {
    'fruit-catch': { highScore: 0, playCount: 0, totalScore: 0 },
    'jump': { highScore: 0, playCount: 0, totalScore: 0 }
  },

  // 当前游戏状态
  currentGame: null,
  gameRunning: false,
  animationId: null,
  canvas: null,
  ctx: null,

  // 接水果游戏状态
  fruitGame: {
    pet: { x: 0, y: 0, width: 60, height: 60 },
    fruits: [],
    score: 0,
    lives: 3,
    timeLeft: 60,
    spawnRate: 1500,
    lastSpawn: 0,
    fruitSpeed: 3,
    fruitTypes: [
      { emoji: '🍎', points: 10 },
      { emoji: '🍊', points: 10 },
      { emoji: '🍇', points: 15 },
      { emoji: '🍓', points: 15 },
      { emoji: '🍌', points: 20 },
      { emoji: '🌟', points: 50 }  // 特殊奖励
    ],
    badItems: [
      { emoji: '💣', points: -30 },
      { emoji: '🌵', points: -20 }
    ]
  },

  // 跳跃游戏状态
  jumpGame: {
    pet: { x: 0, y: 0, vy: 0, width: 50, height: 50, isJumping: false },
    platforms: [],
    stars: [],
    obstacles: [],
    score: 0,
    gameSpeed: 2,
    gravity: 0.5,
    jumpForce: -12,
    groundY: 0,
    cameraY: 0
  },

  // 初始化
  init() {
    this.loadStats();
  },

  // 加载统计数据
  loadStats() {
    const saved = localStorage.getItem('petGamesStats');
    if (saved) {
      this.stats = { ...this.stats, ...JSON.parse(saved) };
    }
  },

  // 保存统计数据
  saveStats() {
    safeSetItem('petGamesStats', JSON.stringify(this.stats));
  },

  // 获取宠物emoji
  getPetEmoji() {
    if (!LearningPet.data.hasPet) return '🐱';
    const petType = LearningPet.petTypes.find(p => p.id === LearningPet.data.petType);
    return petType ? petType.stages[LearningPet.data.stage] : '🐱';
  },

  // ========== 接水果游戏 ==========

  initFruitGame() {
    this.currentGame = 'fruit-catch';
    this.canvas = document.getElementById('pet-game-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // 重置游戏状态
    this.fruitGame.score = 0;
    this.fruitGame.lives = 3;
    this.fruitGame.timeLeft = 60;
    this.fruitGame.fruits = [];
    this.fruitGame.lastSpawn = 0;
    this.fruitGame.fruitSpeed = 3;
    this.fruitGame.spawnRate = 1500;

    // 设置宠物位置
    this.fruitGame.pet.x = this.canvas.width / 2 - 30;
    this.fruitGame.pet.y = this.canvas.height - 80;

    // 绑定触摸/鼠标事件
    this.bindFruitGameEvents();

    // 开始游戏循环
    this.gameRunning = true;
    this.fruitGameLoop();

    // 开始计时
    this.fruitGameTimer = setInterval(() => {
      if (this.fruitGame.timeLeft > 0) {
        this.fruitGame.timeLeft--;
        this.updateFruitGameUI();

        // 随时间增加难度
        if (this.fruitGame.timeLeft % 15 === 0) {
          this.fruitGame.fruitSpeed += 0.5;
          this.fruitGame.spawnRate = Math.max(800, this.fruitGame.spawnRate - 100);
        }
      } else {
        this.endFruitGame();
      }
    }, 1000);

    this.updateFruitGameUI();
  },

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = Math.min(400, window.innerHeight * 0.5);
  },

  bindFruitGameEvents() {
    // 移除旧事件
    this.canvas.ontouchmove = null;
    this.canvas.onmousemove = null;

    // 触摸移动
    this.canvas.ontouchmove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      this.fruitGame.pet.x = Math.max(0, Math.min(this.canvas.width - this.fruitGame.pet.width, x - 30));
    };

    // 鼠标移动
    this.canvas.onmousemove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.fruitGame.pet.x = Math.max(0, Math.min(this.canvas.width - this.fruitGame.pet.width, x - 30));
    };
  },

  fruitGameLoop() {
    if (!this.gameRunning) return;

    const now = Date.now();

    // 生成水果
    if (now - this.fruitGame.lastSpawn > this.fruitGame.spawnRate) {
      this.spawnFruit();
      this.fruitGame.lastSpawn = now;
    }

    // 更新水果位置
    this.updateFruits();

    // 绘制游戏
    this.drawFruitGame();

    this.animationId = requestAnimationFrame(() => this.fruitGameLoop());
  },

  spawnFruit() {
    // 随机决定是好水果还是坏物品
    const isBad = Math.random() < 0.15; // 15%概率是坏物品
    const items = isBad ? this.fruitGame.badItems : this.fruitGame.fruitTypes;
    const item = items[Math.floor(Math.random() * items.length)];

    this.fruitGame.fruits.push({
      x: Math.random() * (this.canvas.width - 40),
      y: -40,
      emoji: item.emoji,
      points: item.points,
      speed: this.fruitGame.fruitSpeed + Math.random() * 2,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    });
  },

  updateFruits() {
    const pet = this.fruitGame.pet;

    for (let i = this.fruitGame.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruitGame.fruits[i];
      fruit.y += fruit.speed;
      fruit.rotation += fruit.rotationSpeed;

      // 碰撞检测
      if (this.checkCollision(fruit, pet)) {
        this.fruitGame.score += fruit.points;

        if (fruit.points > 0) {
          RewardSystem.playSound('correct');
        } else {
          RewardSystem.playSound('wrong');
          this.fruitGame.lives--;
          if (this.fruitGame.lives <= 0) {
            this.endFruitGame();
            return;
          }
        }

        this.fruitGame.fruits.splice(i, 1);
        this.updateFruitGameUI();
        continue;
      }

      // 水果掉出屏幕
      if (fruit.y > this.canvas.height) {
        if (fruit.points > 0) {
          // 漏接好水果不扣命了，只是没得分
        }
        this.fruitGame.fruits.splice(i, 1);
      }
    }
  },

  checkCollision(fruit, pet) {
    return fruit.x < pet.x + pet.width &&
           fruit.x + 40 > pet.x &&
           fruit.y < pet.y + pet.height &&
           fruit.y + 40 > pet.y;
  },

  drawFruitGame() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制水果
    this.fruitGame.fruits.forEach(fruit => {
      ctx.save();
      ctx.translate(fruit.x + 20, fruit.y + 20);
      ctx.rotate(fruit.rotation);
      ctx.font = '36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, 0, 0);
      ctx.restore();
    });

    // 绘制宠物
    const pet = this.fruitGame.pet;
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.getPetEmoji(), pet.x + pet.width / 2, pet.y + pet.height / 2);
  },

  updateFruitGameUI() {
    const scoreEl = document.getElementById('pet-game-score');
    const livesEl = document.getElementById('pet-game-lives');
    const timeEl = document.getElementById('pet-game-time');

    if (scoreEl) scoreEl.textContent = this.fruitGame.score;
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.fruitGame.lives));
    if (timeEl) timeEl.textContent = this.fruitGame.timeLeft + 's';
  },

  endFruitGame() {
    this.gameRunning = false;
    clearInterval(this.fruitGameTimer);
    cancelAnimationFrame(this.animationId);

    const score = Math.max(0, this.fruitGame.score);

    // 更新统计
    this.stats['fruit-catch'].playCount++;
    this.stats['fruit-catch'].totalScore += score;
    if (score > this.stats['fruit-catch'].highScore) {
      this.stats['fruit-catch'].highScore = score;
    }
    this.saveStats();

    // 发放奖励
    const expReward = Math.floor(score / 10);
    const pointsReward = Math.floor(score / 5);

    if (expReward > 0) {
      LearningPet.addExpFromLearning(expReward);
    }
    if (pointsReward > 0) {
      RewardSystem.addPoints(pointsReward);
    }

    // 显示结果
    this.showGameResult(score, expReward, pointsReward);

    // 追踪事件
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('pet_game_complete', {
        game_id: 'fruit-catch',
        score: score,
        high_score: this.stats['fruit-catch'].highScore
      });
    }
  },

  // ========== 跳跃游戏 ==========

  initJumpGame() {
    this.currentGame = 'jump';
    this.canvas = document.getElementById('pet-game-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // 重置游戏状态
    const game = this.jumpGame;
    game.score = 0;
    game.gameSpeed = 2;
    game.platforms = [];
    game.stars = [];
    game.obstacles = [];
    game.groundY = this.canvas.height - 60;
    game.cameraY = 0;

    // 设置宠物初始位置
    game.pet.x = this.canvas.width / 2 - 25;
    game.pet.y = game.groundY - game.pet.height;
    game.pet.vy = 0;
    game.pet.isJumping = false;

    // 生成初始平台
    this.generateInitialPlatforms();

    // 绑定跳跃事件
    this.bindJumpGameEvents();

    // 开始游戏
    this.gameRunning = true;
    this.jumpGameLoop();

    this.updateJumpGameUI();
  },

  generateInitialPlatforms() {
    const game = this.jumpGame;
    game.platforms = [];

    // 地面平台
    game.platforms.push({
      x: 0,
      y: game.groundY,
      width: this.canvas.width,
      height: 60,
      isGround: true
    });

    // 生成上方平台
    let y = game.groundY - 100;
    while (y > -200) {
      this.generatePlatform(y);
      y -= 80 + Math.random() * 40;
    }
  },

  generatePlatform(y) {
    const width = 60 + Math.random() * 40;
    const x = Math.random() * (this.canvas.width - width);

    this.jumpGame.platforms.push({
      x: x,
      y: y,
      width: width,
      height: 15,
      isGround: false
    });

    // 50%概率在平台上放星星
    if (Math.random() < 0.5) {
      this.jumpGame.stars.push({
        x: x + width / 2 - 15,
        y: y - 40,
        collected: false
      });
    }

    // 20%概率放障碍物
    if (Math.random() < 0.2 && y < this.jumpGame.groundY - 200) {
      this.jumpGame.obstacles.push({
        x: x + width / 2 - 15,
        y: y - 35,
        width: 30,
        height: 30
      });
    }
  },

  bindJumpGameEvents() {
    const jump = () => {
      if (!this.gameRunning) return;
      const pet = this.jumpGame.pet;
      if (!pet.isJumping) {
        pet.vy = this.jumpGame.jumpForce;
        pet.isJumping = true;
        RewardSystem.playSound('click');
      }
    };

    this.canvas.ontouchstart = (e) => {
      e.preventDefault();
      jump();
    };

    this.canvas.onclick = jump;
  },

  jumpGameLoop() {
    if (!this.gameRunning) return;

    this.updateJumpGame();
    this.drawJumpGame();

    this.animationId = requestAnimationFrame(() => this.jumpGameLoop());
  },

  updateJumpGame() {
    const game = this.jumpGame;
    const pet = game.pet;

    // 应用重力
    pet.vy += game.gravity;
    pet.y += pet.vy;

    // 平台碰撞检测
    let onPlatform = false;
    for (const platform of game.platforms) {
      if (pet.vy > 0 && // 只有下落时才检测
          pet.x + pet.width > platform.x &&
          pet.x < platform.x + platform.width &&
          pet.y + pet.height >= platform.y &&
          pet.y + pet.height <= platform.y + platform.height + pet.vy) {
        pet.y = platform.y - pet.height;
        pet.vy = 0;
        pet.isJumping = false;
        onPlatform = true;
        break;
      }
    }

    // 左右边界
    if (pet.x < 0) pet.x = 0;
    if (pet.x > this.canvas.width - pet.width) pet.x = this.canvas.width - pet.width;

    // 收集星星
    for (const star of game.stars) {
      if (!star.collected &&
          pet.x < star.x + 30 &&
          pet.x + pet.width > star.x &&
          pet.y < star.y + 30 &&
          pet.y + pet.height > star.y) {
        star.collected = true;
        game.score += 10;
        RewardSystem.playSound('correct');
        this.updateJumpGameUI();
      }
    }

    // 碰到障碍物
    for (const obstacle of game.obstacles) {
      if (pet.x < obstacle.x + obstacle.width &&
          pet.x + pet.width > obstacle.x &&
          pet.y < obstacle.y + obstacle.height &&
          pet.y + pet.height > obstacle.y) {
        this.endJumpGame();
        return;
      }
    }

    // 掉落出屏幕底部
    if (pet.y > this.canvas.height + 100) {
      this.endJumpGame();
      return;
    }

    // 相机跟随（当宠物跳到较高位置时）
    const targetCameraY = Math.min(0, this.canvas.height / 2 - pet.y);
    game.cameraY += (targetCameraY - game.cameraY) * 0.1;

    // 生成新平台
    const highestPlatform = Math.min(...game.platforms.map(p => p.y));
    if (highestPlatform - game.cameraY > -100) {
      this.generatePlatform(highestPlatform - 80 - Math.random() * 40);
    }

    // 移除超出屏幕的元素
    game.platforms = game.platforms.filter(p => p.y + game.cameraY < this.canvas.height + 100);
    game.stars = game.stars.filter(s => s.y + game.cameraY < this.canvas.height + 100);
    game.obstacles = game.obstacles.filter(o => o.y + game.cameraY < this.canvas.height + 100);

    // 分数随高度增加
    const height = Math.floor(-pet.y / 50);
    if (height > game.score / 10) {
      game.score = Math.max(game.score, height);
      this.updateJumpGameUI();
    }
  },

  drawJumpGame() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const game = this.jumpGame;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, game.cameraY);

    // 绘制平台
    game.platforms.forEach(platform => {
      if (platform.isGround) {
        ctx.fillStyle = '#4a5568';
      } else {
        const platformGradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
        platformGradient.addColorStop(0, '#48bb78');
        platformGradient.addColorStop(1, '#38a169');
        ctx.fillStyle = platformGradient;
      }
      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 5);
      ctx.fill();
    });

    // 绘制星星
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    game.stars.forEach(star => {
      if (!star.collected) {
        ctx.fillText('⭐', star.x + 15, star.y + 15);
      }
    });

    // 绘制障碍物
    game.obstacles.forEach(obstacle => {
      ctx.fillText('🌵', obstacle.x + 15, obstacle.y + 15);
    });

    // 绘制宠物
    ctx.font = '40px Arial';
    ctx.fillText(this.getPetEmoji(), game.pet.x + game.pet.width / 2, game.pet.y + game.pet.height / 2);

    ctx.restore();
  },

  updateJumpGameUI() {
    const scoreEl = document.getElementById('pet-game-score');
    if (scoreEl) scoreEl.textContent = this.jumpGame.score;

    // 隐藏不相关的UI
    const livesEl = document.getElementById('pet-game-lives');
    const timeEl = document.getElementById('pet-game-time');
    if (livesEl) livesEl.style.display = 'none';
    if (timeEl) timeEl.style.display = 'none';
  },

  endJumpGame() {
    this.gameRunning = false;
    cancelAnimationFrame(this.animationId);

    const score = this.jumpGame.score;

    // 更新统计
    this.stats['jump'].playCount++;
    this.stats['jump'].totalScore += score;
    if (score > this.stats['jump'].highScore) {
      this.stats['jump'].highScore = score;
    }
    this.saveStats();

    // 发放奖励
    const expReward = Math.floor(score / 5);
    const pointsReward = Math.floor(score / 3);

    if (expReward > 0) {
      LearningPet.addExpFromLearning(expReward);
    }
    if (pointsReward > 0) {
      RewardSystem.addPoints(pointsReward);
    }

    // 显示结果
    this.showGameResult(score, expReward, pointsReward);

    // 追踪事件
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('pet_game_complete', {
        game_id: 'jump',
        score: score,
        high_score: this.stats['jump'].highScore
      });
    }
  },

  // ========== 通用方法 ==========

  showGameResult(score, expReward, pointsReward) {
    const resultModal = document.getElementById('pet-game-result-modal');
    if (!resultModal) return;

    document.getElementById('pet-game-final-score').textContent = score;
    document.getElementById('pet-game-exp-reward').textContent = '+' + expReward + ' EXP';
    document.getElementById('pet-game-points-reward').textContent = '+' + pointsReward;

    const highScore = this.stats[this.currentGame].highScore;
    const isNewRecord = score >= highScore;
    document.getElementById('pet-game-high-score').textContent =
      (isNewRecord ? '🎉 ' : '') + (I18n.t('petGame.highScore') || '最高分') + ': ' + highScore;

    resultModal.classList.remove('hidden');
    RewardSystem.playSound('complete');
    RewardSystem.createParticles();
  },

  stopGame() {
    this.gameRunning = false;
    if (this.fruitGameTimer) {
      clearInterval(this.fruitGameTimer);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // 清除事件监听
    if (this.canvas) {
      this.canvas.ontouchmove = null;
      this.canvas.onmousemove = null;
      this.canvas.ontouchstart = null;
      this.canvas.onclick = null;
    }
  }
};

// ========== 全局函数 ==========

// 显示游戏选择界面
function showPetGames() {
  const modal = document.getElementById('pet-games-modal');
  if (!modal) return;

  let html = '<div class="pet-games-list">';

  PetGames.games.forEach(game => {
    const gameName = I18n.t(`petGame.${game.id}.name`) || game.name;
    const gameDesc = I18n.t(`petGame.${game.id}.desc`) || game.desc;
    const stats = PetGames.stats[game.id];

    html += `
      <div class="pet-game-card" onclick="startPetGame('${game.id}')" style="--game-color: ${game.color}">
        <div class="pet-game-icon">${game.icon}</div>
        <div class="pet-game-info">
          <div class="pet-game-name">${gameName}</div>
          <div class="pet-game-desc">${gameDesc}</div>
          <div class="pet-game-stats">
            ${I18n.t('petGame.highScore') || '最高分'}: ${stats.highScore} ·
            ${I18n.t('petGame.played') || '玩过'}: ${stats.playCount}${I18n.t('petGame.times') || '次'}
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  document.getElementById('pet-games-list').innerHTML = html;
  modal.classList.remove('hidden');
}

// 关闭游戏选择界面
function closePetGames() {
  document.getElementById('pet-games-modal').classList.add('hidden');
}

// 开始游戏
function startPetGame(gameId) {
  closePetGames();

  const playModal = document.getElementById('pet-game-play-modal');
  if (!playModal) return;

  const game = PetGames.games.find(g => g.id === gameId);
  if (!game) return;

  // 设置游戏标题
  const gameName = I18n.t(`petGame.${game.id}.name`) || game.name;
  document.getElementById('pet-game-title').textContent = game.icon + ' ' + gameName;

  // 显示游戏UI
  const livesEl = document.getElementById('pet-game-lives');
  const timeEl = document.getElementById('pet-game-time');
  if (livesEl) livesEl.style.display = gameId === 'fruit-catch' ? 'inline' : 'none';
  if (timeEl) timeEl.style.display = gameId === 'fruit-catch' ? 'inline' : 'none';

  playModal.classList.remove('hidden');

  // 延迟启动游戏（等待DOM渲染）
  setTimeout(() => {
    if (gameId === 'fruit-catch') {
      PetGames.initFruitGame();
    } else if (gameId === 'jump') {
      PetGames.initJumpGame();
    }
  }, 100);
}

// 关闭游戏
function closePetGamePlay() {
  PetGames.stopGame();
  document.getElementById('pet-game-play-modal').classList.add('hidden');
}

// 关闭结果弹窗
function closePetGameResult() {
  document.getElementById('pet-game-result-modal').classList.add('hidden');
}

// 重新开始游戏
function restartPetGame() {
  closePetGameResult();
  const gameId = PetGames.currentGame;

  setTimeout(() => {
    if (gameId === 'fruit-catch') {
      PetGames.initFruitGame();
    } else if (gameId === 'jump') {
      PetGames.initJumpGame();
    }
  }, 100);
}

// 返回游戏选择
function backToPetGameSelect() {
  closePetGameResult();
  closePetGamePlay();
  showPetGames();
}

// 初始化
PetGames.init();
