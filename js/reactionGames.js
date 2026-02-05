/**
 * 反应训练游戏模块 - Reaction Games Module
 * 包含打地鼠、颜色闪电、抓星星、红绿灯四种游戏
 */

const ReactionGames = {
    // 游戏类型定义
    gameTypes: [
        { id: 'whackMole', icon: '🔨', nameKey: 'reaction.whackMole', descKey: 'reaction.whackMoleDesc' },
        { id: 'colorFlash', icon: '🎨', nameKey: 'reaction.colorFlash', descKey: 'reaction.colorFlashDesc' },
        { id: 'catchStars', icon: '⭐', nameKey: 'reaction.catchStars', descKey: 'reaction.catchStarsDesc' },
        { id: 'trafficLight', icon: '🚦', nameKey: 'reaction.trafficLight', descKey: 'reaction.trafficLightDesc' }
    ],

    // 状态变量
    currentGame: null,
    currentDifficulty: 'easy',
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    totalReactionTime: 0,
    reactionCount: 0,
    gameTimer: null,
    spawnTimer: null,
    timeRemaining: 0,
    isPlaying: false,

    // 游戏特定状态
    gameState: {},

    // 统计数据
    stats: {
        totalGames: 0,
        totalScore: 0,
        whackMoleBest: 0,
        colorFlashBest: 0,
        catchStarsBest: 0,
        trafficLightBest: 0,
        bestCombo: 0,
        fastestReaction: 9999
    },

    /**
     * 初始化
     */
    init() {
        this.loadStats();
    },

    /**
     * 加载统计数据
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('kidsReactionGames');
            if (saved) {
                const data = JSON.parse(saved);
                this.stats = { ...this.stats, ...data.stats };
            }
        } catch (e) {
            console.error('加载反应游戏数据失败:', e);
        }
    },

    /**
     * 保存统计数据
     */
    saveStats() {
        try {
            const data = { stats: this.stats };
            localStorage.setItem('kidsReactionGames', JSON.stringify(data));
        } catch (e) {
            console.error('保存反应游戏数据失败:', e);
        }
    },

    /**
     * 显示模态框
     */
    showModal() {
        const modal = document.getElementById('reaction-games-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderGameSelect();
            // 记录最近使用
            if (typeof addToRecentlyUsed === 'function') {
                addToRecentlyUsed('reactionGames');
            }
            // 发送分析事件
            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('reaction_games', 'open');
            }
        }
    },

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('reaction-games-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.stopGame();
        }
    },

    /**
     * 渲染游戏选择界面
     */
    renderGameSelect() {
        const select = document.getElementById('reaction-select');
        const difficulty = document.getElementById('reaction-difficulty');
        const gameArea = document.getElementById('reaction-game-area');
        const result = document.getElementById('reaction-result');

        if (select) select.classList.remove('hidden');
        if (difficulty) difficulty.classList.add('hidden');
        if (gameArea) gameArea.classList.add('hidden');
        if (result) result.classList.add('hidden');

        // 渲染游戏卡片
        const cardsContainer = document.getElementById('reaction-game-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = this.gameTypes.map(game => `
                <div class="reaction-game-card" onclick="ReactionGames.showDifficulty('${game.id}')">
                    <div class="reaction-game-card-icon">${game.icon}</div>
                    <div class="reaction-game-card-title" data-i18n="${game.nameKey}">${I18n.t(game.nameKey)}</div>
                    <div class="reaction-game-card-desc" data-i18n="${game.descKey}">${I18n.t(game.descKey)}</div>
                </div>
            `).join('');
        }

        // 更新统计
        document.getElementById('reaction-total-score').textContent = this.stats.totalScore;
        document.getElementById('reaction-total-games').textContent = this.stats.totalGames;
    },

    /**
     * 显示难度选择
     */
    showDifficulty(gameType) {
        this.currentGame = gameType;

        const select = document.getElementById('reaction-select');
        const difficulty = document.getElementById('reaction-difficulty');

        if (select) select.classList.add('hidden');
        if (difficulty) difficulty.classList.remove('hidden');

        // 获取游戏信息
        const gameInfo = this.gameTypes.find(g => g.id === gameType);

        // 渲染难度选择
        difficulty.innerHTML = `
            <button class="reaction-back-btn" onclick="ReactionGames.renderGameSelect()">←</button>
            <h2>${gameInfo.icon} <span data-i18n="${gameInfo.nameKey}">${I18n.t(gameInfo.nameKey)}</span></h2>
            <div class="reaction-difficulty-buttons">
                <button class="reaction-difficulty-btn" style="border-color: #4CAF50" onclick="ReactionGames.startGame('${gameType}', 'easy')">
                    <span class="difficulty-stars">⭐</span>
                    <span data-i18n="reaction.easy">${I18n.t('reaction.easy')}</span>
                </button>
                <button class="reaction-difficulty-btn" style="border-color: #FF9800" onclick="ReactionGames.startGame('${gameType}', 'medium')">
                    <span class="difficulty-stars">⭐⭐</span>
                    <span data-i18n="reaction.medium">${I18n.t('reaction.medium')}</span>
                </button>
                <button class="reaction-difficulty-btn" style="border-color: #F44336" onclick="ReactionGames.startGame('${gameType}', 'hard')">
                    <span class="difficulty-stars">⭐⭐⭐</span>
                    <span data-i18n="reaction.hard">${I18n.t('reaction.hard')}</span>
                </button>
            </div>
        `;

        // 播放音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('click');
        }
    },

    /**
     * 开始游戏
     */
    startGame(gameType, difficulty) {
        this.currentGame = gameType;
        this.currentDifficulty = difficulty;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hits = 0;
        this.misses = 0;
        this.totalReactionTime = 0;
        this.reactionCount = 0;
        this.isPlaying = true;
        this.gameState = {};

        // 获取游戏配置
        const config = ReactionGamesData[gameType][difficulty];
        this.timeRemaining = config.duration;

        // 隐藏难度选择，显示游戏区域
        const difficultyEl = document.getElementById('reaction-difficulty');
        const gameArea = document.getElementById('reaction-game-area');

        if (difficultyEl) difficultyEl.classList.add('hidden');
        if (gameArea) gameArea.classList.remove('hidden');

        // 设置游戏标题
        const gameInfo = this.gameTypes.find(g => g.id === gameType);
        document.getElementById('reaction-game-title').innerHTML =
            `${gameInfo.icon} <span data-i18n="${gameInfo.nameKey}">${I18n.t(gameInfo.nameKey)}</span>`;

        // 更新显示
        this.updateScoreDisplay();
        this.updateTimerDisplay();

        // 倒计时开始
        this.showCountdown(() => {
            // 开始计时
            this.startTimer();

            // 根据游戏类型启动对应游戏
            switch (gameType) {
                case 'whackMole':
                    this.startWhackMole();
                    break;
                case 'colorFlash':
                    this.startColorFlash();
                    break;
                case 'catchStars':
                    this.startCatchStars();
                    break;
                case 'trafficLight':
                    this.startTrafficLight();
                    break;
            }
        });

        // 发送分析事件
        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('reaction_games', 'start', `${gameType}_${difficulty}`);
        }
    },

    /**
     * 显示倒计时
     */
    showCountdown(callback) {
        const content = document.getElementById('reaction-game-content');
        let count = 3;

        const showCount = () => {
            content.innerHTML = `<div class="reaction-countdown">${count}</div>`;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('click');
            }

            if (count > 0) {
                count--;
                setTimeout(showCount, 800);
            } else {
                content.innerHTML = `<div class="reaction-countdown">GO!</div>`;
                setTimeout(callback, 500);
            }
        };

        showCount();
    },

    /**
     * 开始计时器
     */
    startTimer() {
        this.updateTimerDisplay();
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    },

    /**
     * 更新计时器显示
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('reaction-game-timer');
        if (timerEl) {
            timerEl.textContent = this.timeRemaining + 's';
            // 最后5秒变红
            if (this.timeRemaining <= 5) {
                timerEl.classList.add('warning');
            } else {
                timerEl.classList.remove('warning');
            }
        }
    },

    /**
     * 更新分数显示
     */
    updateScoreDisplay() {
        const scoreEl = document.getElementById('reaction-current-score');
        if (scoreEl) {
            scoreEl.textContent = this.score;
        }
        const comboEl = document.getElementById('reaction-combo');
        if (comboEl) {
            if (this.combo >= 3) {
                comboEl.textContent = `${this.combo}x`;
                comboEl.classList.add('active');
            } else {
                comboEl.textContent = '';
                comboEl.classList.remove('active');
            }
        }
    },

    /**
     * 停止游戏
     */
    stopGame() {
        this.isPlaying = false;
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        // 清除所有游戏相关的定时器
        if (this.gameState.timers) {
            this.gameState.timers.forEach(t => clearTimeout(t));
        }
    },

    /**
     * 增加连击
     */
    addCombo() {
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        // 检查连击奖励
        const bonuses = ReactionGamesData.config.comboBonus;
        if (bonuses[this.combo]) {
            this.score += bonuses[this.combo];
            this.showComboBonus(this.combo, bonuses[this.combo]);
        }
    },

    /**
     * 重置连击
     */
    resetCombo() {
        this.combo = 0;
        this.updateScoreDisplay();
    },

    /**
     * 显示连击奖励
     */
    showComboBonus(combo, bonus) {
        const content = document.getElementById('reaction-game-content');
        const bonusEl = document.createElement('div');
        bonusEl.className = 'reaction-combo-bonus';
        bonusEl.innerHTML = `${combo}x COMBO! +${bonus}`;
        content.appendChild(bonusEl);

        setTimeout(() => bonusEl.remove(), 1000);

        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('win');
        }
    },

    /**
     * 记录反应时间
     */
    recordReactionTime(time) {
        this.totalReactionTime += time;
        this.reactionCount++;

        // 更新最快反应
        if (time < this.stats.fastestReaction) {
            this.stats.fastestReaction = time;
        }
    },

    // ==================== 打地鼠游戏 ====================

    startWhackMole() {
        const content = document.getElementById('reaction-game-content');
        const config = ReactionGamesData.whackMole[this.currentDifficulty];

        // 创建 3x3 网格
        content.innerHTML = `
            <div class="whack-mole-game">
                <div class="mole-grid">
                    ${Array(9).fill(0).map((_, i) => `
                        <div class="mole-hole" data-index="${i}">
                            <div class="mole-dirt"></div>
                            <div class="mole" data-index="${i}"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.gameState = {
            activeMoles: new Set(),
            timers: []
        };

        // 开始生成地鼠
        this.spawnMole();
        this.spawnTimer = setInterval(() => {
            if (this.isPlaying && this.gameState.activeMoles.size < config.maxMoles) {
                this.spawnMole();
            }
        }, config.moleInterval);
    },

    spawnMole() {
        if (!this.isPlaying) return;

        const config = ReactionGamesData.whackMole[this.currentDifficulty];
        const availableHoles = [];

        for (let i = 0; i < 9; i++) {
            if (!this.gameState.activeMoles.has(i)) {
                availableHoles.push(i);
            }
        }

        if (availableHoles.length === 0) return;

        const holeIndex = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        const isGolden = Math.random() < 0.1; // 10% 金色地鼠

        const mole = document.querySelector(`.mole[data-index="${holeIndex}"]`);
        if (!mole) return;

        this.gameState.activeMoles.add(holeIndex);
        mole.textContent = isGolden ? ReactionGamesData.moleEmojis.golden : ReactionGamesData.moleEmojis.normal;
        mole.classList.add('active');
        mole.dataset.golden = isGolden;
        mole.dataset.spawnTime = Date.now();

        // 点击事件
        const clickHandler = (e) => {
            e.stopPropagation();
            if (!mole.classList.contains('active')) return;

            const reactionTime = Date.now() - parseInt(mole.dataset.spawnTime);
            this.recordReactionTime(reactionTime);

            const points = isGolden ? config.scorePerHit * 2 : config.scorePerHit;
            this.score += points;
            this.hits++;
            this.addCombo();
            this.updateScoreDisplay();

            mole.textContent = ReactionGamesData.moleEmojis.hit;
            mole.classList.remove('active');
            mole.classList.add('hit');

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('correct');
                if (isGolden) {
                    RewardSystem.createParticles(e.clientX, e.clientY);
                }
            }

            setTimeout(() => {
                mole.classList.remove('hit');
                mole.textContent = '';
                this.gameState.activeMoles.delete(holeIndex);
            }, 300);

            mole.removeEventListener('click', clickHandler);
        };

        mole.addEventListener('click', clickHandler);

        // 自动隐藏
        const timer = setTimeout(() => {
            if (mole.classList.contains('active')) {
                mole.textContent = ReactionGamesData.moleEmojis.miss;
                mole.classList.remove('active');
                this.misses++;
                this.resetCombo();

                setTimeout(() => {
                    mole.textContent = '';
                    this.gameState.activeMoles.delete(holeIndex);
                }, 300);

                mole.removeEventListener('click', clickHandler);
            }
        }, config.moleShowTime);

        this.gameState.timers.push(timer);
    },

    // ==================== 颜色闪电游戏 ====================

    startColorFlash() {
        const content = document.getElementById('reaction-game-content');
        const config = ReactionGamesData.colorFlash;

        content.innerHTML = `
            <div class="color-flash-game">
                <div class="color-display" id="color-display">
                    <span class="color-emoji">❓</span>
                </div>
                <div class="color-buttons">
                    ${config.colors.map(c => `
                        <button class="color-btn" data-color="${c.name}" style="background: ${c.color}" onclick="ReactionGames.checkColor('${c.name}')">
                            ${c.emoji}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        this.gameState = {
            currentColor: null,
            canClick: false,
            timers: []
        };

        // 开始显示颜色
        this.showNextColor();
    },

    showNextColor() {
        if (!this.isPlaying) return;

        const config = ReactionGamesData.colorFlash;
        const diffConfig = config[this.currentDifficulty];
        const display = document.getElementById('color-display');

        // 随机选择颜色
        const color = config.colors[Math.floor(Math.random() * config.colors.length)];
        this.gameState.currentColor = color.name;
        this.gameState.canClick = true;
        this.gameState.showTime = Date.now();

        display.innerHTML = `<span class="color-emoji">${color.emoji}</span>`;
        display.style.background = color.color + '33';

        // 超时未点击
        const timer = setTimeout(() => {
            if (this.gameState.canClick && this.isPlaying) {
                this.gameState.canClick = false;
                this.misses++;
                this.resetCombo();
                display.innerHTML = `<span class="color-emoji">❌</span>`;
                display.style.background = '';

                setTimeout(() => this.showNextColor(), 500);
            }
        }, diffConfig.showTime);

        this.gameState.timers.push(timer);
    },

    checkColor(colorName) {
        if (!this.isPlaying || !this.gameState.canClick) return;

        const config = ReactionGamesData.colorFlash[this.currentDifficulty];
        const display = document.getElementById('color-display');
        const reactionTime = Date.now() - this.gameState.showTime;

        this.gameState.canClick = false;
        this.recordReactionTime(reactionTime);

        if (colorName === this.gameState.currentColor) {
            // 正确
            this.score += config.scorePerCorrect;
            this.hits++;
            this.addCombo();
            display.innerHTML = `<span class="color-emoji">✅</span>`;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('correct');
            }
        } else {
            // 错误
            this.score = Math.max(0, this.score + config.penaltyPerWrong);
            this.misses++;
            this.resetCombo();
            display.innerHTML = `<span class="color-emoji">❌</span>`;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('wrong');
            }
        }

        this.updateScoreDisplay();
        display.style.background = '';

        setTimeout(() => this.showNextColor(), 500);
    },

    // ==================== 抓星星游戏 ====================

    startCatchStars() {
        const content = document.getElementById('reaction-game-content');

        content.innerHTML = `
            <div class="catch-stars-game">
                <div class="stars-area" id="stars-area"></div>
            </div>
        `;

        this.gameState = {
            activeStars: 0,
            timers: []
        };

        // 开始生成星星
        this.spawnStar();
        const config = ReactionGamesData.catchStars[this.currentDifficulty];
        this.spawnTimer = setInterval(() => {
            if (this.isPlaying && this.gameState.activeStars < config.maxItems) {
                this.spawnStar();
            }
        }, config.spawnInterval);
    },

    spawnStar() {
        if (!this.isPlaying) return;

        const config = ReactionGamesData.catchStars[this.currentDifficulty];
        const area = document.getElementById('stars-area');
        if (!area) return;

        const items = ReactionGamesData.catchStars.items;
        const emoji = items[Math.floor(Math.random() * items.length)];

        const star = document.createElement('div');
        star.className = 'star-item';
        star.textContent = emoji;
        star.style.left = Math.random() * 80 + 10 + '%';
        star.style.top = Math.random() * 70 + 10 + '%';
        star.dataset.spawnTime = Date.now();

        this.gameState.activeStars++;

        star.addEventListener('click', (e) => {
            if (star.classList.contains('caught')) return;

            const reactionTime = Date.now() - parseInt(star.dataset.spawnTime);
            this.recordReactionTime(reactionTime);

            this.score += config.scorePerCatch;
            this.hits++;
            this.addCombo();
            this.updateScoreDisplay();

            star.classList.add('caught');
            star.textContent = '✨';

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('correct');
                RewardSystem.createParticles(e.clientX, e.clientY);
            }

            setTimeout(() => {
                star.remove();
                this.gameState.activeStars--;
            }, 200);
        });

        area.appendChild(star);

        // 自动消失
        const timer = setTimeout(() => {
            if (!star.classList.contains('caught') && star.parentNode) {
                star.classList.add('missed');
                this.misses++;
                this.resetCombo();

                setTimeout(() => {
                    if (star.parentNode) {
                        star.remove();
                        this.gameState.activeStars--;
                    }
                }, 300);
            }
        }, config.itemShowTime);

        this.gameState.timers.push(timer);
    },

    // ==================== 红绿灯游戏 ====================

    startTrafficLight() {
        const content = document.getElementById('reaction-game-content');

        content.innerHTML = `
            <div class="traffic-light-game">
                <div class="traffic-display" id="traffic-display">
                    <div class="traffic-light-box">
                        <div class="light-circle" id="light-circle">⚫</div>
                    </div>
                </div>
                <div class="traffic-instruction" id="traffic-instruction">
                    <span data-i18n="reaction.waitForGreen">${I18n.t('reaction.waitForGreen')}</span>
                </div>
                <button class="traffic-tap-btn" id="traffic-tap-btn" onclick="ReactionGames.tapTrafficLight()">
                    <span data-i18n="reaction.tap">${I18n.t('reaction.tap')}</span>
                </button>
            </div>
        `;

        this.gameState = {
            currentLight: null,
            canTap: false,
            timers: []
        };

        // 开始显示灯
        this.showNextLight();
    },

    showNextLight() {
        if (!this.isPlaying) return;

        const config = ReactionGamesData.trafficLight;
        const diffConfig = config[this.currentDifficulty];
        const circle = document.getElementById('light-circle');
        const instruction = document.getElementById('traffic-instruction');

        // 随机选择灯
        const rand = Math.random();
        let light;
        if (rand < diffConfig.bonusRatio) {
            light = config.lights[2]; // bonus
        } else if (rand < diffConfig.bonusRatio + diffConfig.greenRatio) {
            light = config.lights[0]; // go
        } else {
            light = config.lights[1]; // stop
        }

        this.gameState.currentLight = light;
        this.gameState.canTap = true;
        this.gameState.showTime = Date.now();
        this.gameState.tapped = false;

        circle.textContent = light.emoji;
        circle.className = 'light-circle ' + light.type;

        if (light.type === 'go') {
            instruction.innerHTML = `<span data-i18n="reaction.tapNow">${I18n.t('reaction.tapNow')}</span>`;
        } else if (light.type === 'bonus') {
            instruction.innerHTML = `<span data-i18n="reaction.bonus">${I18n.t('reaction.bonus')}</span>`;
        } else {
            instruction.innerHTML = `<span data-i18n="reaction.dontTap">${I18n.t('reaction.dontTap')}</span>`;
        }

        // 超时
        const timer = setTimeout(() => {
            if (!this.isPlaying) return;

            if (this.gameState.canTap && !this.gameState.tapped) {
                if (light.action === 'tap') {
                    // 应该点但没点
                    this.misses++;
                    this.resetCombo();
                    circle.textContent = '❌';

                    if (typeof RewardSystem !== 'undefined') {
                        RewardSystem.playSound('wrong');
                    }
                } else {
                    // 不应该点且没点 - 正确
                    this.score += diffConfig.scorePerCorrect;
                    this.hits++;
                    this.addCombo();
                    circle.textContent = '✅';

                    if (typeof RewardSystem !== 'undefined') {
                        RewardSystem.playSound('correct');
                    }
                }
                this.updateScoreDisplay();
            }

            this.gameState.canTap = false;
            setTimeout(() => this.showNextLight(), 500);
        }, diffConfig.lightShowTime);

        this.gameState.timers.push(timer);
    },

    tapTrafficLight() {
        if (!this.isPlaying || !this.gameState.canTap || this.gameState.tapped) return;

        const config = ReactionGamesData.trafficLight[this.currentDifficulty];
        const light = this.gameState.currentLight;
        const circle = document.getElementById('light-circle');
        const reactionTime = Date.now() - this.gameState.showTime;

        this.gameState.tapped = true;
        this.gameState.canTap = false;
        this.recordReactionTime(reactionTime);

        if (light.action === 'tap') {
            // 正确点击
            const points = light.type === 'bonus' ? config.scorePerBonus : config.scorePerCorrect;
            this.score += points;
            this.hits++;
            this.addCombo();
            circle.textContent = '✅';

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('correct');
                if (light.type === 'bonus') {
                    RewardSystem.createParticles(window.innerWidth / 2, window.innerHeight / 2);
                }
            }
        } else {
            // 错误点击（红灯时点击）
            this.score = Math.max(0, this.score + config.penaltyPerWrong);
            this.misses++;
            this.resetCombo();
            circle.textContent = '❌';

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('wrong');
            }
        }

        this.updateScoreDisplay();
        setTimeout(() => this.showNextLight(), 500);
    },

    // ==================== 结束游戏 ====================

    endGame() {
        this.stopGame();

        // 更新统计
        this.stats.totalGames++;
        this.stats.totalScore += this.score;

        // 更新最高分
        const bestKey = this.currentGame + 'Best';
        if (this.score > this.stats[bestKey]) {
            this.stats[bestKey] = this.score;
        }

        // 更新最高连击
        if (this.maxCombo > this.stats.bestCombo) {
            this.stats.bestCombo = this.maxCombo;
        }

        // 保存
        this.saveStats();

        // 添加到奖励系统
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.addPoints(this.score);
        }

        // 发送分析事件
        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('reaction_games', 'complete', `${this.currentGame}_${this.currentDifficulty}`, this.score);
        }

        // 显示结果
        this.showResult();
    },

    /**
     * 显示结果
     */
    showResult() {
        const gameArea = document.getElementById('reaction-game-area');
        const result = document.getElementById('reaction-result');

        if (gameArea) gameArea.classList.add('hidden');
        if (result) result.classList.remove('hidden');

        // 计算平均反应时间
        const avgReaction = this.reactionCount > 0
            ? Math.round(this.totalReactionTime / this.reactionCount)
            : 0;

        // 获取反应评级
        const rating = this.getReactionRating(avgReaction);

        // 计算准确率
        const total = this.hits + this.misses;
        const accuracy = total > 0 ? Math.round((this.hits / total) * 100) : 0;

        result.innerHTML = `
            <div class="reaction-result-content">
                <div class="reaction-result-icon">🎮</div>
                <h2 data-i18n="reaction.complete">${I18n.t('reaction.complete')}</h2>
                <div class="reaction-result-stats">
                    <div class="result-stat">
                        <span class="stat-label" data-i18n="reaction.score">${I18n.t('reaction.score')}</span>
                        <span class="stat-value">${this.score}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label" data-i18n="reaction.accuracy">${I18n.t('reaction.accuracy')}</span>
                        <span class="stat-value">${accuracy}%</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label" data-i18n="reaction.avgReaction">${I18n.t('reaction.avgReaction')}</span>
                        <span class="stat-value">${avgReaction}ms</span>
                    </div>
                    <div class="result-stat highlight">
                        <span class="stat-label" data-i18n="reaction.rating">${I18n.t('reaction.rating')}</span>
                        <span class="stat-value">${rating.emoji} ${I18n.t(rating.key)}</span>
                    </div>
                    ${this.maxCombo >= 5 ? `
                        <div class="result-stat combo">
                            <span class="stat-label" data-i18n="reaction.maxCombo">${I18n.t('reaction.maxCombo')}</span>
                            <span class="stat-value">${this.maxCombo}x</span>
                        </div>
                    ` : ''}
                </div>
                <div class="reaction-result-buttons">
                    <button class="reaction-btn primary" onclick="ReactionGames.startGame('${this.currentGame}', '${this.currentDifficulty}')">
                        <span data-i18n="reaction.playAgain">${I18n.t('reaction.playAgain')}</span>
                    </button>
                    <button class="reaction-btn" onclick="ReactionGames.renderGameSelect()">
                        <span data-i18n="reaction.back">${I18n.t('reaction.back')}</span>
                    </button>
                </div>
            </div>
        `;

        // 播放庆祝音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('win');
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    RewardSystem.createParticles(
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight * 0.5
                    );
                }, i * 300);
            }
        }
    },

    /**
     * 获取反应评级
     */
    getReactionRating(avgTime) {
        const ratings = ReactionGamesData.config.reactionRating;
        if (avgTime < ratings.excellent) {
            return { emoji: '⚡', key: 'reaction.ratingExcellent' };
        } else if (avgTime < ratings.good) {
            return { emoji: '🚀', key: 'reaction.ratingGood' };
        } else if (avgTime < ratings.normal) {
            return { emoji: '👍', key: 'reaction.ratingNormal' };
        } else {
            return { emoji: '🐢', key: 'reaction.ratingSlow' };
        }
    },

    /**
     * 返回选择界面
     */
    backToSelect() {
        this.stopGame();
        this.renderGameSelect();
    }
};

// 全局函数
function showReactionGames() {
    ReactionGames.showModal();
}

function closeReactionGames() {
    ReactionGames.closeModal();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    ReactionGames.init();
});

// 确保模块可用
if (typeof window !== 'undefined') {
    window.ReactionGames = ReactionGames;
}
