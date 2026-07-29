// ========== 生活技能模块 ==========

const LifeSkills = {
  // 当前状态
  currentModule: null, // 'clock' | 'money' | 'calendar'
  currentLevel: null,
  score: 0,
  questionsAnswered: 0,
  correctAnswers: 0,

  // 时钟状态
  clockState: {
    currentTime: null,
    canvas: null,
    ctx: null
  },

  // 钱币状态
  moneyState: {
    currency: 'rmb',
    gameType: 'identify',
    currentQuestion: null,
    items: []
  },

  // 日历状态
  calendarState: {
    questionType: 'date',
    currentQuestion: null
  },

  // 统计数据
  stats: {
    clockPlayed: 0,
    clockCorrect: 0,
    moneyPlayed: 0,
    moneyCorrect: 0,
    calendarPlayed: 0,
    calendarCorrect: 0,
    totalPoints: 0
  },

  // 初始化
  init() {
    this.loadStats();
  },

  // 加载统计数据
  loadStats() {
    const saved = localStorage.getItem('lifeSkillsStats');
    if (saved) {
      this.stats = JSON.parse(saved);
    }
  },

  // 保存统计数据
  saveStats() {
    safeSetItem('lifeSkillsStats', JSON.stringify(this.stats));
  },

  // 显示模块选择界面
  showModuleSelect() {
    const selectArea = document.getElementById('life-skills-select');
    const gameArea = document.getElementById('life-skills-game');

    if (selectArea) selectArea.classList.remove('hidden');
    if (gameArea) {
      gameArea.classList.add('hidden');
      gameArea.innerHTML = '';
    }

    this.renderModuleSelect();
  },

  // 渲染模块选择
  renderModuleSelect() {
    const container = document.getElementById('life-skills-select');
    if (!container) return;

    let html = '';
    LifeSkillsData.modules.forEach(module => {
      html += `
        <div class="life-skill-module-card" onclick="LifeSkills.selectModule('${module.id}')">
          <div class="module-icon">${module.icon}</div>
          <div class="module-info">
            <h3>${module.name}</h3>
            <p>${module.desc}</p>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 选择模块
  selectModule(moduleId) {
    this.currentModule = moduleId;

    const selectArea = document.getElementById('life-skills-select');
    const gameArea = document.getElementById('life-skills-game');

    if (selectArea) selectArea.classList.add('hidden');
    if (gameArea) gameArea.classList.remove('hidden');

    if (moduleId === 'clock') {
      this.showClockLevelSelect();
    } else if (moduleId === 'money') {
      this.showMoneySetup();
    } else if (moduleId === 'calendar') {
      this.showCalendarSetup();
    }

    // 追踪事件
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('life_skill_select', { module: moduleId });
    }
  },

  // ========== 时钟模块 ==========

  // 显示时钟难度选择
  showClockLevelSelect() {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    container.innerHTML = `
      <div class="clock-level-select">
        <h3>选择难度</h3>
        <div class="level-options">
          <button class="level-btn" onclick="LifeSkills.startClock('hour')">
            <span class="level-icon">🕐</span>
            <span class="level-name">整点</span>
            <span class="level-desc">1:00, 2:00...</span>
            <span class="level-points">+10分</span>
          </button>
          <button class="level-btn" onclick="LifeSkills.startClock('halfHour')">
            <span class="level-icon">🕜</span>
            <span class="level-name">半点</span>
            <span class="level-desc">1:30, 2:30...</span>
            <span class="level-points">+15分</span>
          </button>
          <button class="level-btn" onclick="LifeSkills.startClock('quarter')">
            <span class="level-icon">🕒</span>
            <span class="level-name">刻钟</span>
            <span class="level-desc">1:15, 1:45...</span>
            <span class="level-points">+20分</span>
          </button>
        </div>
      </div>
    `;
  },

  // 开始时钟游戏
  startClock(level) {
    this.currentLevel = level;
    this.score = 0;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;

    this.generateClockQuestion();
  },

  // 生成时钟问题
  generateClockQuestion() {
    const levelData = LifeSkillsData.clock[this.currentLevel];
    const times = levelData.times;
    const randomTime = times[Math.floor(Math.random() * times.length)];

    this.clockState.currentTime = randomTime;
    this.renderClockGame(randomTime, levelData.points);
  },

  // 渲染时钟游戏
  renderClockGame(time, points) {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    // 生成选项（正确答案 + 3个干扰项）
    const options = this.generateClockOptions(time);

    container.innerHTML = `
      <div class="clock-game">
        <div class="clock-header">
          <span class="clock-score">得分: ${this.score}</span>
          <span class="clock-progress">${this.questionsAnswered + 1}/10</span>
        </div>
        <div class="clock-display">
          <canvas id="clock-canvas" width="200" height="200"></canvas>
        </div>
        <p class="clock-question">现在是几点?</p>
        <div class="clock-options">
          ${options.map(opt => `
            <button class="clock-option-btn" onclick="LifeSkills.checkClockAnswer('${opt}')">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // 绘制时钟
    setTimeout(() => this.drawClock(time), 50);
  },

  // 生成时钟选项
  generateClockOptions(correctTime) {
    const correctStr = this.formatTime(correctTime);
    const options = [correctStr];

    // 生成干扰项
    while (options.length < 4) {
      let fakeHour = Math.floor(Math.random() * 12) + 1;
      let fakeMinute;

      if (this.currentLevel === 'hour') {
        fakeMinute = 0;
      } else if (this.currentLevel === 'halfHour') {
        fakeMinute = Math.random() < 0.5 ? 0 : 30;
      } else {
        fakeMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      }

      const fakeStr = this.formatTime({ hour: fakeHour, minute: fakeMinute });
      if (!options.includes(fakeStr)) {
        options.push(fakeStr);
      }
    }

    // 打乱顺序
    return options.sort(() => Math.random() - 0.5);
  },

  // 格式化时间
  formatTime(time) {
    const minuteStr = time.minute.toString().padStart(2, '0');
    return `${time.hour}:${minuteStr}`;
  },

  // 绘制时钟
  drawClock(time) {
    const canvas = document.getElementById('clock-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 90;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制表盘背景
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFF5F8';
    ctx.fill();
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 绘制刻度和数字
    for (let i = 1; i <= 12; i++) {
      const angle = (i - 3) * (Math.PI / 6);
      const x = centerX + (radius - 20) * Math.cos(angle);
      const y = centerY + (radius - 20) * Math.sin(angle);

      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#4A4A4A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), x, y);
    }

    // 绘制小刻度
    for (let i = 0; i < 60; i++) {
      const angle = (i - 15) * (Math.PI / 30);
      const innerR = i % 5 === 0 ? radius - 10 : radius - 5;
      const outerR = radius - 2;

      ctx.beginPath();
      ctx.moveTo(
        centerX + innerR * Math.cos(angle),
        centerY + innerR * Math.sin(angle)
      );
      ctx.lineTo(
        centerX + outerR * Math.cos(angle),
        centerY + outerR * Math.sin(angle)
      );
      ctx.strokeStyle = i % 5 === 0 ? '#FF69B4' : '#FFB6C1';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // 绘制时针
    const hourAngle = ((time.hour % 12) + time.minute / 60 - 3) * (Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + 45 * Math.cos(hourAngle),
      centerY + 45 * Math.sin(hourAngle)
    );
    ctx.strokeStyle = '#FF1493';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 绘制分针
    const minuteAngle = (time.minute - 15) * (Math.PI / 30);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + 65 * Math.cos(minuteAngle),
      centerY + 65 * Math.sin(minuteAngle)
    );
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 绘制中心点
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF1493';
    ctx.fill();
  },

  // 检查时钟答案
  checkClockAnswer(answer) {
    const correctAnswer = this.formatTime(this.clockState.currentTime);
    const isCorrect = answer === correctAnswer;
    const levelData = LifeSkillsData.clock[this.currentLevel];

    this.questionsAnswered++;

    if (isCorrect) {
      this.correctAnswers++;
      this.score += levelData.points;
      this.stats.clockCorrect++;
      RewardSystem.playSound('correct');
    } else {
      RewardSystem.playSound('wrong');
    }
    this.stats.clockPlayed++;
    this.saveStats();

    // 显示反馈
    this.showAnswerFeedback(isCorrect, correctAnswer);

    // 继续或结束
    setTimeout(() => {
      if (this.questionsAnswered >= 10) {
        this.endClockGame();
      } else {
        this.generateClockQuestion();
      }
    }, 1500);
  },

  // 显示答案反馈
  showAnswerFeedback(isCorrect, correctAnswer) {
    const buttons = document.querySelectorAll('.clock-option-btn, .money-option-btn, .calendar-option-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.trim() === correctAnswer || btn.dataset.value === correctAnswer) {
        btn.classList.add('correct');
      } else if (!isCorrect && btn.classList.contains('selected')) {
        btn.classList.add('wrong');
      }
    });
  },

  // 结束时钟游戏
  endClockGame() {
    this.stats.totalPoints += this.score;
    this.saveStats();

    if (this.score > 0) {
      RewardSystem.addPoints(this.score, '认识时钟练习');
    }

    this.showGameComplete('clock', {
      correct: this.correctAnswers,
      total: this.questionsAnswered,
      score: this.score
    });
  },

  // ========== 钱币模块 ==========

  // 显示钱币设置
  showMoneySetup() {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    container.innerHTML = `
      <div class="money-setup">
        <h3>选择货币</h3>
        <div class="currency-options">
          <button class="currency-btn ${this.moneyState.currency === 'rmb' ? 'active' : ''}"
                  onclick="LifeSkills.selectCurrency('rmb')">
            <span class="currency-flag">🇨🇳</span>
            <span class="currency-name">人民币</span>
          </button>
          <button class="currency-btn ${this.moneyState.currency === 'usd' ? 'active' : ''}"
                  onclick="LifeSkills.selectCurrency('usd')">
            <span class="currency-flag">🇺🇸</span>
            <span class="currency-name">美元</span>
          </button>
        </div>

        <h3>选择游戏类型</h3>
        <div class="game-type-options">
          <button class="game-type-btn" onclick="LifeSkills.startMoney('identify')">
            <span class="type-icon">👀</span>
            <span class="type-name">认识面值</span>
            <span class="type-points">+10分</span>
          </button>
          <button class="game-type-btn" onclick="LifeSkills.startMoney('count')">
            <span class="type-icon">🧮</span>
            <span class="type-name">数钱</span>
            <span class="type-points">+15分</span>
          </button>
          <button class="game-type-btn" onclick="LifeSkills.startMoney('make')">
            <span class="type-icon">💰</span>
            <span class="type-name">凑钱</span>
            <span class="type-points">+20分</span>
          </button>
        </div>
      </div>
    `;
  },

  // 选择货币
  selectCurrency(currency) {
    this.moneyState.currency = currency;
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.closest('.currency-btn').classList.add('active');
  },

  // 开始钱币游戏
  startMoney(gameType) {
    this.moneyState.gameType = gameType;
    this.score = 0;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;

    this.generateMoneyQuestion();
  },

  // 生成钱币问题
  generateMoneyQuestion() {
    const currencyData = LifeSkillsData.money[this.moneyState.currency];
    const gameType = this.moneyState.gameType;

    if (gameType === 'identify') {
      this.generateIdentifyQuestion(currencyData);
    } else if (gameType === 'count') {
      this.generateCountQuestion(currencyData);
    } else if (gameType === 'make') {
      this.generateMakeQuestion(currencyData);
    }
  },

  // 生成认识面值问题
  generateIdentifyQuestion(currencyData) {
    const allItems = [...currencyData.coins, ...currencyData.bills];
    const item = allItems[Math.floor(Math.random() * allItems.length)];

    this.moneyState.currentQuestion = {
      type: 'identify',
      item: item,
      correctValue: item.value
    };

    this.renderIdentifyGame(item, currencyData);
  },

  // 渲染认识面值游戏
  renderIdentifyGame(item, currencyData) {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    // 生成选项
    const allItems = [...currencyData.coins, ...currencyData.bills];
    const options = [item];
    while (options.length < 4) {
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      if (!options.find(o => o.value === randomItem.value)) {
        options.push(randomItem);
      }
    }
    options.sort(() => Math.random() - 0.5);

    const isCoin = item.emoji !== undefined;
    const displayValue = this.formatMoney(item.value, currencyData.symbol);

    // 使用图片显示货币，如果图片不存在则回退到彩色方块
    const moneyDisplay = item.image
      ? `<img src="${item.image}" alt="${item.name}" class="money-image ${isCoin ? 'coin' : 'bill'}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="money-item ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}; display: none;">
           ${isCoin ? item.emoji : ''}
           <span class="money-value">${item.name}</span>
         </div>`
      : `<div class="money-item ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}">
           ${isCoin ? item.emoji : ''}
           <span class="money-value">${item.name}</span>
         </div>`;

    container.innerHTML = `
      <div class="money-game">
        <div class="money-header">
          <span class="money-score">得分: ${this.score}</span>
          <span class="money-progress">${this.questionsAnswered + 1}/10</span>
        </div>
        <div class="money-display">
          ${moneyDisplay}
        </div>
        <p class="money-question">这是多少钱?</p>
        <div class="money-options">
          ${options.map(opt => `
            <button class="money-option-btn" data-value="${opt.value}"
                    onclick="LifeSkills.checkMoneyAnswer(${opt.value})">
              ${this.formatMoney(opt.value, currencyData.symbol)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 生成数钱问题
  generateCountQuestion(currencyData) {
    const items = [];
    const numItems = Math.floor(Math.random() * 3) + 2; // 2-4个物品

    for (let i = 0; i < numItems; i++) {
      const allItems = [...currencyData.coins, ...currencyData.bills];
      const item = allItems[Math.floor(Math.random() * allItems.length)];
      items.push(item);
    }

    const total = items.reduce((sum, item) => sum + item.value, 0);

    this.moneyState.currentQuestion = {
      type: 'count',
      items: items,
      correctValue: total
    };

    this.renderCountGame(items, total, currencyData);
  },

  // 渲染数钱游戏
  renderCountGame(items, total, currencyData) {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    // 生成选项
    const options = [total];
    while (options.length < 4) {
      const offset = (Math.random() - 0.5) * total;
      const fakeTotal = Math.round((total + offset) * 100) / 100;
      if (fakeTotal > 0 && !options.includes(fakeTotal)) {
        options.push(fakeTotal);
      }
    }
    options.sort(() => Math.random() - 0.5);

    // 渲染小钱币项目（使用图片或回退到彩色方块）
    const renderMoneyItemSmall = (item) => {
      const isCoin = item.emoji !== undefined;
      if (item.image) {
        return `<div class="money-item-wrapper">
          <img src="${item.image}" alt="${item.name}" class="money-image-small ${isCoin ? 'coin' : 'bill'}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="money-item-small ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}; display: none;">
            ${item.emoji || ''}
            <span>${item.name}</span>
          </div>
        </div>`;
      }
      return `<div class="money-item-small ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}">
        ${item.emoji || ''}
        <span>${item.name}</span>
      </div>`;
    };

    container.innerHTML = `
      <div class="money-game">
        <div class="money-header">
          <span class="money-score">得分: ${this.score}</span>
          <span class="money-progress">${this.questionsAnswered + 1}/10</span>
        </div>
        <p class="money-question">这些一共多少钱?</p>
        <div class="money-items-display">
          ${items.map(item => renderMoneyItemSmall(item)).join('')}
        </div>
        <div class="money-options">
          ${options.map(opt => `
            <button class="money-option-btn" data-value="${opt}"
                    onclick="LifeSkills.checkMoneyAnswer(${opt})">
              ${this.formatMoney(opt, currencyData.symbol)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 生成凑钱问题
  generateMakeQuestion(currencyData) {
    // 生成目标金额
    const targets = currencyData.symbol === '¥'
      ? [5, 10, 15, 20, 25, 30, 50]
      : [1, 2, 3, 5, 10, 15, 20];
    const target = targets[Math.floor(Math.random() * targets.length)];

    this.moneyState.currentQuestion = {
      type: 'make',
      target: target,
      selected: []
    };

    this.renderMakeGame(target, currencyData);
  },

  // 渲染凑钱游戏
  renderMakeGame(target, currencyData) {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    const availableItems = [...currencyData.coins, ...currencyData.bills].filter(item => item.value <= target);

    // 渲染可选择的钱币项目
    const renderPickableItem = (item, idx) => {
      const isCoin = item.emoji !== undefined;
      if (item.image) {
        return `<button class="money-pick-btn" data-value="${item.value}" data-idx="${idx}"
                    onclick="LifeSkills.toggleMoneyItem(${item.value}, '${item.name}', '${item.color}', ${idx}, '${item.image}')">
          <img src="${item.image}" alt="${item.name}" class="money-image-small ${isCoin ? 'coin' : 'bill'}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="money-item-small ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}; display: none;">
            ${item.emoji || ''}
            <span>${item.name}</span>
          </div>
        </button>`;
      }
      return `<button class="money-pick-btn" data-value="${item.value}" data-idx="${idx}"
                  onclick="LifeSkills.toggleMoneyItem(${item.value}, '${item.name}', '${item.color}', ${idx}, '')">
        <div class="money-item-small ${isCoin ? 'coin' : 'bill'}" style="background-color: ${item.color}">
          ${item.emoji || ''}
          <span>${item.name}</span>
        </div>
      </button>`;
    };

    container.innerHTML = `
      <div class="money-game">
        <div class="money-header">
          <span class="money-score">得分: ${this.score}</span>
          <span class="money-progress">${this.questionsAnswered + 1}/10</span>
        </div>
        <p class="money-question">凑出 <strong>${this.formatMoney(target, currencyData.symbol)}</strong></p>
        <div class="money-selected-area">
          <div class="selected-items" id="selected-money-items"></div>
          <div class="selected-total">已选: <span id="selected-total">${currencyData.symbol}0</span></div>
        </div>
        <div class="money-available">
          ${availableItems.map((item, idx) => renderPickableItem(item, idx)).join('')}
        </div>
        <button class="btn-check-make" onclick="LifeSkills.checkMakeAnswer()">确认</button>
      </div>
    `;
  },

  // 切换选择钱币
  toggleMoneyItem(value, name, color, idx, image) {
    const question = this.moneyState.currentQuestion;
    const existingIdx = question.selected.findIndex(s => s.idx === idx);

    if (existingIdx >= 0) {
      question.selected.splice(existingIdx, 1);
      document.querySelector(`[data-idx="${idx}"]`).classList.remove('selected');
    } else {
      question.selected.push({ value, name, color, idx, image });
      document.querySelector(`[data-idx="${idx}"]`).classList.add('selected');
    }

    // 更新显示
    const currencyData = LifeSkillsData.money[this.moneyState.currency];
    const total = question.selected.reduce((sum, s) => sum + s.value, 0);
    document.getElementById('selected-total').textContent = this.formatMoney(total, currencyData.symbol);

    const selectedArea = document.getElementById('selected-money-items');
    selectedArea.innerHTML = question.selected.map(s => {
      if (s.image) {
        return `<img src="${s.image}" alt="${s.name}" class="mini-money-image"
                     onerror="this.outerHTML='<div class=\\'mini-money-item\\' style=\\'background-color: ${s.color}\\'>${s.name}</div>'">`;
      }
      return `<div class="mini-money-item" style="background-color: ${s.color}">${s.name}</div>`;
    }).join('');
  },

  // 检查凑钱答案
  checkMakeAnswer() {
    const question = this.moneyState.currentQuestion;
    const total = question.selected.reduce((sum, s) => sum + s.value, 0);
    const isCorrect = Math.abs(total - question.target) < 0.01;

    this.questionsAnswered++;
    const gameTypeData = LifeSkillsData.moneyGameTypes[this.moneyState.gameType];

    if (isCorrect) {
      this.correctAnswers++;
      this.score += gameTypeData.points;
      this.stats.moneyCorrect++;
      RewardSystem.playSound('correct');
    } else {
      RewardSystem.playSound('wrong');
    }
    this.stats.moneyPlayed++;
    this.saveStats();

    // 显示反馈
    const btn = document.querySelector('.btn-check-make');
    btn.disabled = true;
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    btn.textContent = isCorrect ? '正确!' : `错误! 答案是${this.formatMoney(question.target, LifeSkillsData.money[this.moneyState.currency].symbol)}`;

    setTimeout(() => {
      if (this.questionsAnswered >= 10) {
        this.endMoneyGame();
      } else {
        this.generateMoneyQuestion();
      }
    }, 1500);
  },

  // 检查钱币答案（认识/数钱）
  checkMoneyAnswer(value) {
    const question = this.moneyState.currentQuestion;
    const isCorrect = Math.abs(value - question.correctValue) < 0.01;
    const gameTypeData = LifeSkillsData.moneyGameTypes[this.moneyState.gameType];

    this.questionsAnswered++;

    if (isCorrect) {
      this.correctAnswers++;
      this.score += gameTypeData.points;
      this.stats.moneyCorrect++;
      RewardSystem.playSound('correct');
    } else {
      RewardSystem.playSound('wrong');
    }
    this.stats.moneyPlayed++;
    this.saveStats();

    // 显示反馈
    const currencyData = LifeSkillsData.money[this.moneyState.currency];
    this.showMoneyFeedback(isCorrect, question.correctValue, currencyData.symbol);

    setTimeout(() => {
      if (this.questionsAnswered >= 10) {
        this.endMoneyGame();
      } else {
        this.generateMoneyQuestion();
      }
    }, 1500);
  },

  // 显示钱币反馈
  showMoneyFeedback(isCorrect, correctValue, symbol) {
    const buttons = document.querySelectorAll('.money-option-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      const btnValue = parseFloat(btn.dataset.value);
      if (Math.abs(btnValue - correctValue) < 0.01) {
        btn.classList.add('correct');
      } else if (!isCorrect) {
        btn.classList.add('wrong');
      }
    });
  },

  // 格式化金额
  formatMoney(value, symbol) {
    if (symbol === '¥') {
      if (value < 1) {
        return `${value * 10}角`;
      }
      return `${symbol}${value}`;
    } else {
      if (value < 1) {
        return `${Math.round(value * 100)}¢`;
      }
      return `${symbol}${value}`;
    }
  },

  // 结束钱币游戏
  endMoneyGame() {
    this.stats.totalPoints += this.score;
    this.saveStats();

    if (this.score > 0) {
      RewardSystem.addPoints(this.score, '认识钱币练习');
    }

    this.showGameComplete('money', {
      correct: this.correctAnswers,
      total: this.questionsAnswered,
      score: this.score
    });
  },

  // ========== 日历模块 ==========

  // 显示日历设置
  showCalendarSetup() {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    const today = new Date();

    container.innerHTML = `
      <div class="calendar-setup">
        <div class="mini-calendar">
          ${this.renderMiniCalendar(today)}
        </div>
        <h3>选择问题类型</h3>
        <div class="calendar-type-options">
          <button class="calendar-type-btn" onclick="LifeSkills.startCalendar('date')">
            <span class="type-icon">📅</span>
            <span class="type-name">今天几号</span>
            <span class="type-points">+10分</span>
          </button>
          <button class="calendar-type-btn" onclick="LifeSkills.startCalendar('weekday')">
            <span class="type-icon">📆</span>
            <span class="type-name">星期几</span>
            <span class="type-points">+15分</span>
          </button>
          <button class="calendar-type-btn" onclick="LifeSkills.startCalendar('season')">
            <span class="type-icon">🌸</span>
            <span class="type-name">月份季节</span>
            <span class="type-points">+15分</span>
          </button>
          <button class="calendar-type-btn" onclick="LifeSkills.startCalendar('holiday')">
            <span class="type-icon">🎉</span>
            <span class="type-name">节日</span>
            <span class="type-points">+20分</span>
          </button>
        </div>
      </div>
    `;
  },

  // 渲染迷你日历
  renderMiniCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = date.getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
      <div class="calendar-header-mini">
        <span>${year}年 ${month + 1}月</span>
      </div>
      <div class="calendar-weekdays">
        ${LifeSkillsData.calendar.weekdays.map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-days">
    `;

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      html += '<span class="empty"></span>';
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today;
      html += `<span class="${isToday ? 'today' : ''}">${day}</span>`;
    }

    html += '</div>';
    return html;
  },

  // 开始日历游戏
  startCalendar(questionType) {
    this.calendarState.questionType = questionType;
    this.score = 0;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;

    this.generateCalendarQuestion();
  },

  // 生成日历问题
  generateCalendarQuestion() {
    const type = this.calendarState.questionType;

    if (type === 'date') {
      this.generateDateQuestion();
    } else if (type === 'weekday') {
      this.generateWeekdayQuestion();
    } else if (type === 'season') {
      this.generateSeasonQuestion();
    } else if (type === 'holiday') {
      this.generateHolidayQuestion();
    }
  },

  // 生成日期问题
  generateDateQuestion() {
    const today = new Date();
    const offset = Math.floor(Math.random() * 7) - 3; // -3 到 +3 天
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset);

    let questionText;
    if (offset === 0) {
      questionText = '今天是几月几日?';
    } else if (offset === 1) {
      questionText = '明天是几月几日?';
    } else if (offset === -1) {
      questionText = '昨天是几月几日?';
    } else {
      questionText = `${offset > 0 ? offset : Math.abs(offset)}天${offset > 0 ? '后' : '前'}是几月几日?`;
    }

    const correctAnswer = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;

    this.calendarState.currentQuestion = {
      type: 'date',
      question: questionText,
      correctAnswer: correctAnswer,
      targetDate: targetDate
    };

    this.renderCalendarQuestion(questionText, correctAnswer, 'date');
  },

  // 生成星期问题
  generateWeekdayQuestion() {
    const today = new Date();
    const offset = Math.floor(Math.random() * 7) - 3;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset);

    let questionText;
    if (offset === 0) {
      questionText = '今天是星期几?';
    } else if (offset === 1) {
      questionText = '明天是星期几?';
    } else if (offset === -1) {
      questionText = '昨天是星期几?';
    } else {
      questionText = `${Math.abs(offset)}天${offset > 0 ? '后' : '前'}是星期几?`;
    }

    const correctAnswer = LifeSkillsData.calendar.weekdaysFull[targetDate.getDay()];

    this.calendarState.currentQuestion = {
      type: 'weekday',
      question: questionText,
      correctAnswer: correctAnswer
    };

    this.renderCalendarQuestion(questionText, correctAnswer, 'weekday');
  },

  // 生成季节问题
  generateSeasonQuestion() {
    const month = Math.floor(Math.random() * 12) + 1;
    const questionText = `${month}月是什么季节?`;

    let correctSeason = '';
    for (const season of LifeSkillsData.calendar.seasons) {
      if (season.months.includes(month)) {
        correctSeason = season.name;
        break;
      }
    }

    this.calendarState.currentQuestion = {
      type: 'season',
      question: questionText,
      correctAnswer: correctSeason,
      month: month
    };

    this.renderCalendarQuestion(questionText, correctSeason, 'season');
  },

  // 生成节日问题
  generateHolidayQuestion() {
    const holidays = LifeSkillsData.calendar.holidays;
    const holiday = holidays[Math.floor(Math.random() * holidays.length)];

    const questionText = `${holiday.emoji} ${holiday.name}是几月几日?`;
    const correctAnswer = `${holiday.month}月${holiday.day}日`;

    this.calendarState.currentQuestion = {
      type: 'holiday',
      question: questionText,
      correctAnswer: correctAnswer,
      holiday: holiday
    };

    this.renderCalendarQuestion(questionText, correctAnswer, 'holiday');
  },

  // 渲染日历问题
  renderCalendarQuestion(questionText, correctAnswer, type) {
    const container = document.getElementById('life-skills-game');
    if (!container) return;

    const options = this.generateCalendarOptions(correctAnswer, type);
    const today = new Date();

    container.innerHTML = `
      <div class="calendar-game">
        <div class="calendar-header">
          <span class="calendar-score">得分: ${this.score}</span>
          <span class="calendar-progress">${this.questionsAnswered + 1}/10</span>
        </div>
        <div class="mini-calendar">
          ${this.renderMiniCalendar(today)}
        </div>
        <p class="calendar-question">${questionText}</p>
        <div class="calendar-options">
          ${options.map(opt => `
            <button class="calendar-option-btn" data-value="${opt}"
                    onclick="LifeSkills.checkCalendarAnswer('${opt}')">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 生成日历选项
  generateCalendarOptions(correctAnswer, type) {
    const options = [correctAnswer];

    if (type === 'date') {
      const question = this.calendarState.currentQuestion;
      const baseDate = question.targetDate;
      while (options.length < 4) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const fakeDate = new Date(baseDate);
        fakeDate.setDate(baseDate.getDate() + offset);
        const fakeAnswer = `${fakeDate.getMonth() + 1}月${fakeDate.getDate()}日`;
        if (!options.includes(fakeAnswer)) {
          options.push(fakeAnswer);
        }
      }
    } else if (type === 'weekday') {
      const weekdays = LifeSkillsData.calendar.weekdaysFull;
      while (options.length < 4) {
        const fakeWeekday = weekdays[Math.floor(Math.random() * weekdays.length)];
        if (!options.includes(fakeWeekday)) {
          options.push(fakeWeekday);
        }
      }
    } else if (type === 'season') {
      const seasons = LifeSkillsData.calendar.seasons.map(s => s.name);
      return seasons.sort(() => Math.random() - 0.5);
    } else if (type === 'holiday') {
      while (options.length < 4) {
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const fakeAnswer = `${month}月${day}日`;
        if (!options.includes(fakeAnswer)) {
          options.push(fakeAnswer);
        }
      }
    }

    return options.sort(() => Math.random() - 0.5);
  },

  // 检查日历答案
  checkCalendarAnswer(answer) {
    const question = this.calendarState.currentQuestion;
    const isCorrect = answer === question.correctAnswer;
    const typeData = LifeSkillsData.calendarQuestionTypes[question.type];

    this.questionsAnswered++;

    if (isCorrect) {
      this.correctAnswers++;
      this.score += typeData.points;
      this.stats.calendarCorrect++;
      RewardSystem.playSound('correct');
    } else {
      RewardSystem.playSound('wrong');
    }
    this.stats.calendarPlayed++;
    this.saveStats();

    // 显示反馈
    const buttons = document.querySelectorAll('.calendar-option-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.value === question.correctAnswer) {
        btn.classList.add('correct');
      } else if (btn.dataset.value === answer && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    setTimeout(() => {
      if (this.questionsAnswered >= 10) {
        this.endCalendarGame();
      } else {
        this.generateCalendarQuestion();
      }
    }, 1500);
  },

  // 结束日历游戏
  endCalendarGame() {
    this.stats.totalPoints += this.score;
    this.saveStats();

    if (this.score > 0) {
      RewardSystem.addPoints(this.score, '认识日历练习');
    }

    this.showGameComplete('calendar', {
      correct: this.correctAnswers,
      total: this.questionsAnswered,
      score: this.score
    });
  },

  // ========== 通用功能 ==========

  // 显示游戏完成
  showGameComplete(module, stats) {
    const modal = document.getElementById('life-skills-complete-modal');
    if (!modal) return;

    const moduleNames = {
      clock: '认识时钟',
      money: '认识钱币',
      calendar: '认识日历'
    };

    document.getElementById('life-skills-complete-title').textContent = `${moduleNames[module]}完成!`;
    document.getElementById('life-skills-complete-stats').innerHTML = `
      <div class="complete-stat"><span>✅ 正确</span><span>${stats.correct}/${stats.total}</span></div>
      <div class="complete-stat"><span>⭐ 得分</span><span>+${stats.score}</span></div>
    `;

    modal.classList.remove('hidden');
    RewardSystem.createParticles();

    // 追踪事件
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('life_skill_complete', {
        module: module,
        correct: stats.correct,
        total: stats.total,
        score: stats.score
      });
    }
  }
};

// 打开生活技能弹窗
function openLifeSkills() {
  const modal = document.getElementById('life-skills-modal');
  if (modal) {
    modal.classList.remove('hidden');
    LifeSkills.showModuleSelect();
  }

  // 追踪事件
  if (typeof Analytics !== 'undefined') {
    Analytics.sendEvent('open_life_skills');
  }

  // 🕐 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('lifeSkills');
  }
}

// 关闭生活技能弹窗
function closeLifeSkills() {
  const modal = document.getElementById('life-skills-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 返回模块选择
function backToLifeSkillsSelect() {
  LifeSkills.showModuleSelect();
}

// 关闭完成弹窗
function closeLifeSkillsComplete() {
  document.getElementById('life-skills-complete-modal').classList.add('hidden');
  LifeSkills.showModuleSelect();
}

// 再玩一次
function playLifeSkillsAgain() {
  document.getElementById('life-skills-complete-modal').classList.add('hidden');

  if (LifeSkills.currentModule === 'clock') {
    LifeSkills.showClockLevelSelect();
  } else if (LifeSkills.currentModule === 'money') {
    LifeSkills.showMoneySetup();
  } else if (LifeSkills.currentModule === 'calendar') {
    LifeSkills.showCalendarSetup();
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  LifeSkills.init();
});
