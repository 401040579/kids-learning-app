/**
 * 逻辑训练游戏模块 - Logic Games Module
 * 包含找规律、找不同、图形配对、迷宫闯关四种游戏
 */

const LogicGames = {
    // 游戏类型定义
    gameTypes: [
        { id: 'pattern', icon: '🔮', nameKey: 'logic.pattern', descKey: 'logic.patternDesc' },
        { id: 'spotDiff', icon: '🔍', nameKey: 'logic.spotDiff', descKey: 'logic.spotDiffDesc' },
        { id: 'matching', icon: '🧩', nameKey: 'logic.matching', descKey: 'logic.matchingDesc' },
        { id: 'maze', icon: '🏃', nameKey: 'logic.maze', descKey: 'logic.mazeDesc' }
    ],

    // 状态变量
    currentGame: null,
    currentDifficulty: 'easy',
    currentLevel: 0,
    score: 0,
    timer: null,
    timeElapsed: 0,
    isPlaying: false,

    // 配对游戏状态
    matchingState: {
        cards: [],
        flipped: [],
        matched: [],
        canFlip: true
    },

    // 迷宫游戏状态
    mazeState: {
        playerPos: { x: 0, y: 0 },
        endPos: { x: 0, y: 0 },
        maze: []
    },

    // 统计数据
    stats: {
        totalGames: 0,
        totalScore: 0,
        patternBest: 0,
        spotDiffBest: 0,
        matchingBest: 0,
        mazeBest: 0
    },

    // 解锁状态
    unlocked: {
        pattern: ['easy'],
        spotDiff: ['easy'],
        matching: ['easy'],
        maze: ['easy']
    },

    /**
     * 初始化
     */
    init() {
        this.loadStats();
        this.bindEvents();
    },

    /**
     * 加载统计数据
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('kidsLogicGames');
            if (saved) {
                const data = JSON.parse(saved);
                this.stats = data.stats || this.stats;
                this.unlocked = data.unlocked || this.unlocked;
            }
        } catch (e) {
            console.error('加载逻辑游戏数据失败:', e);
        }
    },

    /**
     * 保存统计数据
     */
    saveStats() {
        try {
            const data = {
                stats: this.stats,
                unlocked: this.unlocked
            };
            localStorage.setItem('kidsLogicGames', JSON.stringify(data));
        } catch (e) {
            console.error('保存逻辑游戏数据失败:', e);
        }
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 键盘事件（用于迷宫）
        document.addEventListener('keydown', (e) => {
            if (this.currentGame === 'maze' && this.isPlaying) {
                this.handleMazeKeydown(e);
            }
        });
    },

    /**
     * 显示模态框
     */
    showModal() {
        const modal = document.getElementById('logic-games-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderGameSelect();
            // 记录最近使用
            if (typeof addToRecentlyUsed === 'function') {
                addToRecentlyUsed('logicGames');
            }
            // 发送分析事件
            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('logic_games', 'open');
            }
        }
    },

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('logic-games-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.stopGame();
        }
    },

    /**
     * 渲染游戏选择界面
     */
    renderGameSelect() {
        const select = document.getElementById('logic-select');
        const difficulty = document.getElementById('logic-difficulty');
        const gameArea = document.getElementById('logic-game-area');
        const result = document.getElementById('logic-result');

        if (select) select.classList.remove('hidden');
        if (difficulty) difficulty.classList.add('hidden');
        if (gameArea) gameArea.classList.add('hidden');
        if (result) result.classList.add('hidden');

        // 渲染游戏卡片
        const cardsContainer = document.getElementById('logic-game-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = this.gameTypes.map(game => `
                <div class="logic-game-card" onclick="LogicGames.showDifficulty('${game.id}')">
                    <div class="logic-game-card-icon">${game.icon}</div>
                    <div class="logic-game-card-title" data-i18n="${game.nameKey}">${I18n.t(game.nameKey)}</div>
                    <div class="logic-game-card-desc" data-i18n="${game.descKey}">${I18n.t(game.descKey)}</div>
                </div>
            `).join('');
        }

        // 更新统计
        document.getElementById('logic-total-score').textContent = this.stats.totalScore;
        document.getElementById('logic-total-games').textContent = this.stats.totalGames;
    },

    /**
     * 显示难度选择
     */
    showDifficulty(gameType) {
        this.currentGame = gameType;

        const select = document.getElementById('logic-select');
        const difficulty = document.getElementById('logic-difficulty');

        if (select) select.classList.add('hidden');
        if (difficulty) difficulty.classList.remove('hidden');

        // 获取游戏信息
        const gameInfo = this.gameTypes.find(g => g.id === gameType);

        // 渲染难度选择
        difficulty.innerHTML = `
            <button class="logic-back-btn" onclick="LogicGames.renderGameSelect()">←</button>
            <h2>${gameInfo.icon} <span data-i18n="${gameInfo.nameKey}">${I18n.t(gameInfo.nameKey)}</span></h2>
            <div class="logic-difficulty-buttons">
                ${this.renderDifficultyButton('easy', gameType)}
                ${this.renderDifficultyButton('medium', gameType)}
                ${this.renderDifficultyButton('hard', gameType)}
            </div>
        `;

        // 播放音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('click');
        }
    },

    /**
     * 渲染难度按钮
     */
    renderDifficultyButton(level, gameType) {
        const isUnlocked = this.unlocked[gameType].includes(level);
        const icons = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' };
        const colors = { easy: '#4CAF50', medium: '#FF9800', hard: '#F44336' };

        if (isUnlocked) {
            return `
                <button class="logic-difficulty-btn"
                        style="border-color: ${colors[level]}"
                        onclick="LogicGames.startGame('${gameType}', '${level}')">
                    <span class="difficulty-stars">${icons[level]}</span>
                    <span data-i18n="logic.${level}">${I18n.t('logic.' + level)}</span>
                </button>
            `;
        } else {
            return `
                <button class="logic-difficulty-btn locked" disabled>
                    <span class="difficulty-lock">🔒</span>
                    <span data-i18n="logic.${level}">${I18n.t('logic.' + level)}</span>
                </button>
            `;
        }
    },

    /**
     * 开始游戏
     */
    startGame(gameType, difficulty) {
        this.currentGame = gameType;
        this.currentDifficulty = difficulty;
        this.currentLevel = 0;
        this.score = 0;
        this.timeElapsed = 0;
        this.isPlaying = true;

        // 隐藏难度选择，显示游戏区域
        const difficulty_el = document.getElementById('logic-difficulty');
        const gameArea = document.getElementById('logic-game-area');

        if (difficulty_el) difficulty_el.classList.add('hidden');
        if (gameArea) gameArea.classList.remove('hidden');

        // 设置游戏标题
        const gameInfo = this.gameTypes.find(g => g.id === gameType);
        document.getElementById('logic-game-title').innerHTML =
            `${gameInfo.icon} <span data-i18n="${gameInfo.nameKey}">${I18n.t(gameInfo.nameKey)}</span>`;

        // 开始计时
        this.startTimer();

        // 根据游戏类型启动对应游戏
        switch (gameType) {
            case 'pattern':
                this.startPatternGame();
                break;
            case 'spotDiff':
                this.startSpotDiffGame();
                break;
            case 'matching':
                this.startMatchingGame();
                break;
            case 'maze':
                this.startMazeGame();
                break;
        }

        // 发送分析事件
        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('logic_games', 'start', `${gameType}_${difficulty}`);
        }

        // 播放音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('click');
        }
    },

    /**
     * 开始计时器
     */
    startTimer() {
        this.timeElapsed = 0;
        this.updateTimerDisplay();
        this.timer = setInterval(() => {
            this.timeElapsed++;
            this.updateTimerDisplay();
        }, 1000);
    },

    /**
     * 更新计时器显示
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('logic-game-timer');
        if (timerEl) {
            const minutes = Math.floor(this.timeElapsed / 60);
            const seconds = this.timeElapsed % 60;
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    /**
     * 停止游戏
     */
    stopGame() {
        this.stopTimer();
        this.isPlaying = false;
    },

    /**
     * 更新分数显示
     */
    updateScoreDisplay() {
        const scoreEl = document.getElementById('logic-current-score');
        if (scoreEl) {
            scoreEl.textContent = this.score;
        }
    },

    /**
     * 更新关卡显示
     */
    updateLevelDisplay() {
        const levelEl = document.getElementById('logic-current-level');
        if (levelEl) {
            levelEl.textContent = this.currentLevel + 1;
        }
    },

    // ==================== 找规律游戏 ====================

    /**
     * 开始找规律游戏
     */
    startPatternGame() {
        const data = LogicGamesData.patterns[this.currentDifficulty];
        this.currentLevel = 0;
        this.updateLevelDisplay();
        this.renderPatternLevel(data[this.currentLevel]);
    },

    /**
     * 渲染找规律关卡
     */
    renderPatternLevel(levelData) {
        const content = document.getElementById('logic-game-content');

        content.innerHTML = `
            <div class="pattern-game">
                <p class="logic-instruction" data-i18n="logic.findNext">${I18n.t('logic.findNext')}</p>
                <div class="pattern-sequence">
                    ${levelData.sequence.map(item => `<span class="pattern-item">${item}</span>`).join('')}
                    <span class="pattern-item pattern-question">❓</span>
                </div>
                <div class="pattern-options">
                    ${this.shuffleArray([...levelData.options]).map(option => `
                        <button class="pattern-option-btn" onclick="LogicGames.checkPatternAnswer('${option}', '${levelData.answer}')">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * 检查找规律答案
     */
    checkPatternAnswer(selected, correct) {
        if (!this.isPlaying) return;

        const data = LogicGamesData.patterns[this.currentDifficulty];

        if (selected === correct) {
            // 正确
            const baseScore = LogicGamesData.config.baseScore.pattern;
            const multiplier = LogicGamesData.config.difficultyMultiplier[this.currentDifficulty];
            this.score += Math.round(baseScore * multiplier);
            this.updateScoreDisplay();

            // 播放正确音效和动画
            this.showCorrectFeedback();

            // 下一关或结束
            this.currentLevel++;
            if (this.currentLevel < data.length) {
                setTimeout(() => {
                    this.updateLevelDisplay();
                    this.renderPatternLevel(data[this.currentLevel]);
                }, 800);
            } else {
                setTimeout(() => this.endGame(true), 800);
            }
        } else {
            // 错误
            this.showWrongFeedback();
        }
    },

    // ==================== 找不同游戏 ====================

    /**
     * 开始找不同游戏
     */
    startSpotDiffGame() {
        const data = LogicGamesData.spotDiff[this.currentDifficulty];
        this.currentLevel = 0;
        this.updateLevelDisplay();
        this.renderSpotDiffLevel(data[this.currentLevel]);
    },

    /**
     * 渲染找不同关卡
     */
    renderSpotDiffLevel(levelData) {
        const content = document.getElementById('logic-game-content');

        content.innerHTML = `
            <div class="spot-diff-game">
                <p class="logic-instruction" data-i18n="logic.findDiff">${I18n.t('logic.findDiff')}</p>
                <div class="spot-diff-container">
                    <div class="spot-diff-row left-row">
                        ${levelData.left.map((item, i) => `
                            <span class="spot-diff-item" data-index="${i}">${item}</span>
                        `).join('')}
                    </div>
                    <div class="spot-diff-divider">VS</div>
                    <div class="spot-diff-row right-row">
                        ${levelData.right.map((item, i) => `
                            <span class="spot-diff-item clickable" data-index="${i}" onclick="LogicGames.checkSpotDiffAnswer(${i}, ${levelData.diffIndex})">
                                ${item}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 检查找不同答案
     */
    checkSpotDiffAnswer(selected, correct) {
        if (!this.isPlaying) return;

        const data = LogicGamesData.spotDiff[this.currentDifficulty];

        if (selected === correct) {
            // 正确
            const baseScore = LogicGamesData.config.baseScore.spotDiff;
            const multiplier = LogicGamesData.config.difficultyMultiplier[this.currentDifficulty];
            this.score += Math.round(baseScore * multiplier);
            this.updateScoreDisplay();

            this.showCorrectFeedback();

            this.currentLevel++;
            if (this.currentLevel < data.length) {
                setTimeout(() => {
                    this.updateLevelDisplay();
                    this.renderSpotDiffLevel(data[this.currentLevel]);
                }, 800);
            } else {
                setTimeout(() => this.endGame(true), 800);
            }
        } else {
            this.showWrongFeedback();
        }
    },

    // ==================== 图形配对游戏 ====================

    /**
     * 开始配对游戏
     */
    startMatchingGame() {
        const symbols = LogicGamesData.matching[this.currentDifficulty];
        // 创建配对卡片
        const cards = [...symbols, ...symbols];
        this.matchingState = {
            cards: this.shuffleArray(cards),
            flipped: [],
            matched: [],
            canFlip: true
        };
        this.updateLevelDisplay();
        this.renderMatchingGame();
    },

    /**
     * 渲染配对游戏
     */
    renderMatchingGame() {
        const content = document.getElementById('logic-game-content');
        const gridCols = this.currentDifficulty === 'easy' ? 4 :
                         this.currentDifficulty === 'medium' ? 4 : 4;

        content.innerHTML = `
            <div class="matching-game">
                <p class="logic-instruction" data-i18n="logic.matchPairs">${I18n.t('logic.matchPairs')}</p>
                <div class="matching-grid" style="grid-template-columns: repeat(${gridCols}, 1fr)">
                    ${this.matchingState.cards.map((card, i) => `
                        <div class="matching-card ${this.matchingState.matched.includes(i) ? 'matched' : ''}"
                             data-index="${i}"
                             onclick="LogicGames.flipCard(${i})">
                            <div class="card-inner">
                                <div class="card-front">❓</div>
                                <div class="card-back">${card}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * 翻转卡片
     */
    flipCard(index) {
        if (!this.isPlaying || !this.matchingState.canFlip) return;
        if (this.matchingState.flipped.includes(index)) return;
        if (this.matchingState.matched.includes(index)) return;

        // 翻转卡片
        const card = document.querySelector(`.matching-card[data-index="${index}"]`);
        if (card) {
            card.classList.add('flipped');
        }

        this.matchingState.flipped.push(index);

        // 检查是否翻了两张
        if (this.matchingState.flipped.length === 2) {
            this.matchingState.canFlip = false;
            const [first, second] = this.matchingState.flipped;

            if (this.matchingState.cards[first] === this.matchingState.cards[second]) {
                // 配对成功
                this.matchingState.matched.push(first, second);
                this.matchingState.flipped = [];
                this.matchingState.canFlip = true;

                // 添加分数
                const baseScore = LogicGamesData.config.baseScore.matching;
                const multiplier = LogicGamesData.config.difficultyMultiplier[this.currentDifficulty];
                this.score += Math.round(baseScore * multiplier);
                this.updateScoreDisplay();

                // 标记为已配对
                document.querySelector(`.matching-card[data-index="${first}"]`).classList.add('matched');
                document.querySelector(`.matching-card[data-index="${second}"]`).classList.add('matched');

                // 播放音效
                if (typeof RewardSystem !== 'undefined') {
                    RewardSystem.playSound('correct');
                }

                // 检查是否全部配对完成
                if (this.matchingState.matched.length === this.matchingState.cards.length) {
                    setTimeout(() => this.endGame(true), 500);
                }
            } else {
                // 配对失败，翻回去
                setTimeout(() => {
                    document.querySelector(`.matching-card[data-index="${first}"]`).classList.remove('flipped');
                    document.querySelector(`.matching-card[data-index="${second}"]`).classList.remove('flipped');
                    this.matchingState.flipped = [];
                    this.matchingState.canFlip = true;
                }, 800);

                // 播放音效
                if (typeof RewardSystem !== 'undefined') {
                    RewardSystem.playSound('wrong');
                }
            }
        }
    },

    // ==================== 迷宫游戏 ====================

    /**
     * 开始迷宫游戏
     */
    startMazeGame() {
        const mazes = LogicGamesData.mazes[this.currentDifficulty];
        const mazeIndex = Math.floor(Math.random() * mazes.length);
        const maze = mazes[mazeIndex].map(row => [...row]); // 深拷贝

        // 找到起点和终点
        let startPos = { x: 0, y: 0 };
        let endPos = { x: 0, y: 0 };

        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 'S') {
                    startPos = { x, y };
                    maze[y][x] = 0; // 清除起点标记，方便移动
                } else if (maze[y][x] === 'E') {
                    endPos = { x, y };
                }
            }
        }

        this.mazeState = {
            maze: maze,
            playerPos: startPos,
            endPos: endPos
        };

        this.updateLevelDisplay();
        this.renderMazeGame();
    },

    /**
     * 渲染迷宫游戏
     */
    renderMazeGame() {
        const content = document.getElementById('logic-game-content');
        const maze = this.mazeState.maze;
        const size = maze.length;

        content.innerHTML = `
            <div class="maze-game">
                <p class="logic-instruction" data-i18n="logic.findExit">${I18n.t('logic.findExit')}</p>
                <div class="maze-grid" style="grid-template-columns: repeat(${size}, 1fr)">
                    ${maze.map((row, y) =>
                        row.map((cell, x) => {
                            let cellClass = 'maze-cell';
                            let cellContent = '';

                            if (this.mazeState.playerPos.x === x && this.mazeState.playerPos.y === y) {
                                cellClass += ' player';
                                cellContent = '🐰';
                            } else if (cell === 'E') {
                                cellClass += ' end';
                                cellContent = '🥕';
                            } else if (cell === 1) {
                                cellClass += ' wall';
                            } else {
                                cellClass += ' path';
                            }

                            return `<div class="${cellClass}" data-x="${x}" data-y="${y}">${cellContent}</div>`;
                        }).join('')
                    ).join('')}
                </div>
                <div class="maze-controls">
                    <button class="maze-control-btn" onclick="LogicGames.moveMaze(0, -1)">⬆️</button>
                    <div class="maze-control-row">
                        <button class="maze-control-btn" onclick="LogicGames.moveMaze(-1, 0)">⬅️</button>
                        <button class="maze-control-btn" onclick="LogicGames.moveMaze(1, 0)">➡️</button>
                    </div>
                    <button class="maze-control-btn" onclick="LogicGames.moveMaze(0, 1)">⬇️</button>
                </div>
            </div>
        `;
    },

    /**
     * 处理迷宫键盘事件
     */
    handleMazeKeydown(e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                this.moveMaze(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                this.moveMaze(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                this.moveMaze(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                this.moveMaze(1, 0);
                break;
        }
    },

    /**
     * 移动迷宫玩家
     */
    moveMaze(dx, dy) {
        if (!this.isPlaying) return;

        const newX = this.mazeState.playerPos.x + dx;
        const newY = this.mazeState.playerPos.y + dy;
        const maze = this.mazeState.maze;

        // 检查边界
        if (newY < 0 || newY >= maze.length || newX < 0 || newX >= maze[0].length) {
            return;
        }

        // 检查是否是墙
        if (maze[newY][newX] === 1) {
            return;
        }

        // 移动
        this.mazeState.playerPos = { x: newX, y: newY };
        this.renderMazeGame();

        // 检查是否到达终点
        if (maze[newY][newX] === 'E') {
            const baseScore = LogicGamesData.config.baseScore.maze;
            const multiplier = LogicGamesData.config.difficultyMultiplier[this.currentDifficulty];
            this.score += Math.round(baseScore * multiplier);
            this.updateScoreDisplay();

            this.showCorrectFeedback();
            setTimeout(() => this.endGame(true), 800);
        }
    },

    // ==================== 通用功能 ====================

    /**
     * 显示正确反馈
     */
    showCorrectFeedback() {
        // 播放音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('correct');
            RewardSystem.createParticles(window.innerWidth / 2, window.innerHeight / 2);
        }

        // 显示动画
        const content = document.getElementById('logic-game-content');
        if (content) {
            const feedback = document.createElement('div');
            feedback.className = 'logic-feedback correct';
            feedback.textContent = '✓';
            content.appendChild(feedback);
            setTimeout(() => feedback.remove(), 600);
        }
    },

    /**
     * 显示错误反馈
     */
    showWrongFeedback() {
        // 播放音效
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('wrong');
        }

        // 显示动画
        const content = document.getElementById('logic-game-content');
        if (content) {
            const feedback = document.createElement('div');
            feedback.className = 'logic-feedback wrong';
            feedback.textContent = '✗';
            content.appendChild(feedback);
            setTimeout(() => feedback.remove(), 600);
        }
    },

    /**
     * 结束游戏
     */
    endGame(success) {
        this.stopTimer();
        this.isPlaying = false;

        // 计算时间奖励
        const timeBonusConfig = LogicGamesData.config.timeBonus[this.currentDifficulty];
        let timeBonus = 0;
        if (this.timeElapsed <= timeBonusConfig.time) {
            timeBonus = timeBonusConfig.bonus;
            this.score += timeBonus;
        }

        // 更新统计
        this.stats.totalGames++;
        this.stats.totalScore += this.score;

        // 更新最高分
        const bestKey = this.currentGame + 'Best';
        if (this.score > this.stats[bestKey]) {
            this.stats[bestKey] = this.score;
        }

        // 解锁下一难度
        if (success) {
            this.unlockNextDifficulty();
        }

        // 保存
        this.saveStats();

        // 添加到奖励系统
        if (typeof RewardSystem !== 'undefined') {
            RewardSystem.addPoints(this.score);
        }

        // 发送分析事件
        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('logic_games', 'complete', `${this.currentGame}_${this.currentDifficulty}`, this.score);
        }

        // 显示结果
        this.showResult(success, timeBonus);
    },

    /**
     * 解锁下一难度
     */
    unlockNextDifficulty() {
        const difficulties = ['easy', 'medium', 'hard'];
        const currentIndex = difficulties.indexOf(this.currentDifficulty);

        if (currentIndex < difficulties.length - 1) {
            const nextDifficulty = difficulties[currentIndex + 1];
            if (!this.unlocked[this.currentGame].includes(nextDifficulty)) {
                this.unlocked[this.currentGame].push(nextDifficulty);
            }
        }
    },

    /**
     * 显示结果
     */
    showResult(success, timeBonus) {
        const gameArea = document.getElementById('logic-game-area');
        const result = document.getElementById('logic-result');

        if (gameArea) gameArea.classList.add('hidden');
        if (result) result.classList.remove('hidden');

        const minutes = Math.floor(this.timeElapsed / 60);
        const seconds = this.timeElapsed % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        result.innerHTML = `
            <div class="logic-result-content">
                <div class="logic-result-icon">${success ? '🎉' : '😢'}</div>
                <h2 data-i18n="logic.complete">${I18n.t('logic.complete')}</h2>
                <div class="logic-result-stats">
                    <div class="result-stat">
                        <span class="stat-label" data-i18n="logic.score">${I18n.t('logic.score')}</span>
                        <span class="stat-value">${this.score}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label" data-i18n="logic.time">${I18n.t('logic.time')}</span>
                        <span class="stat-value">${timeStr}</span>
                    </div>
                    ${timeBonus > 0 ? `
                        <div class="result-stat bonus">
                            <span class="stat-label" data-i18n="logic.timeBonus">${I18n.t('logic.timeBonus')}</span>
                            <span class="stat-value">+${timeBonus}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="logic-result-buttons">
                    <button class="logic-btn primary" onclick="LogicGames.startGame('${this.currentGame}', '${this.currentDifficulty}')">
                        <span data-i18n="logic.playAgain">${I18n.t('logic.playAgain')}</span>
                    </button>
                    <button class="logic-btn" onclick="LogicGames.renderGameSelect()">
                        <span data-i18n="logic.back">${I18n.t('logic.back')}</span>
                    </button>
                </div>
            </div>
        `;

        // 播放庆祝音效
        if (success && typeof RewardSystem !== 'undefined') {
            RewardSystem.playSound('win');
            // 多次粒子效果
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
     * 返回选择界面
     */
    backToSelect() {
        this.stopGame();
        this.renderGameSelect();
    },

    /**
     * 数组随机打乱
     */
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
};

// 全局函数
function showLogicGames() {
    LogicGames.showModal();
}

function closeLogicGames() {
    LogicGames.closeModal();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    LogicGames.init();
});

// 确保模块可用
if (typeof window !== 'undefined') {
    window.LogicGames = LogicGames;
}
