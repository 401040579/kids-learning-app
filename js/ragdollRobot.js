/**
 * 弹弹机器人 - Bouncy Robot Game Module
 * 拖拽物体弹射可爱布娃娃机器人，翻滚弹跳收集星星得分
 */

const RagdollRobot = {
    // 状态
    canvas: null,
    ctx: null,
    currentLevel: 1,
    maxUnlockedLevel: 1,
    totalStars: 0,
    levelStars: {},
    animationFrame: null,
    canvasScale: 1,
    dpr: 1,

    // 游戏状态
    isPlaying: false,
    levelComplete: false,
    levelFailed: false,
    score: 0,
    combo: 0,
    lastBounceTime: 0,
    flipCount: 0,
    prevAngle: 0,
    cumulativeRotation: 0,
    throwsLeft: 0,
    starsCollected: [],
    activeParticles: [],
    floatingTexts: [],

    // FX状态
    impactFlashes: [],
    shockwaves: [],
    _audioCtx: null,
    _shakeEndTime: 0,
    _shakeIntensity: 0,
    _freezeEndTime: 0,
    _slowmoEndTime: 0,
    _slowmoScale: 1,
    _stunStars: null,
    _hurtExpressionEnd: 0,

    // 布娃娃
    ragdoll: null,

    // 可投掷物体
    throwables: [],
    launchedThrowables: [],

    // 关卡元素
    platforms: [],
    bouncePads: [],
    stars: [],
    zones: [],

    // 拖拽状态
    dragTarget: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,

    // 物理常量
    GRAVITY: 0.35,
    DAMPING: 0.998,
    BOUNCE: 0.55,
    SURFACE_FRICTION: 0.88,
    CONSTRAINT_ITERS: 10,
    COLLISION_ITERS: 3,
    BOUNCE_PAD_MULTIPLIER: 1.8,
    COMBO_WINDOW: 800,

    // 逻辑坐标
    LOGICAL_W: 400,
    LOGICAL_H: 600,

    // 章节背景
    chapterBgs: {
        playground: { top: '#FF6B6B', mid: '#EE5A24', bot: '#B33939' },
        candy: { top: '#FF9FF3', mid: '#F368E0', bot: '#BE2EDD' },
        space: { top: '#0C2461', mid: '#1B1464', bot: '#0A3D62' },
        ocean: { top: '#00D2D3', mid: '#0ABDE3', bot: '#01A3A4' },
        rainbow: { top: '#F368E0', mid: '#E056CF', bot: '#9B59B6' }
    },

    // ==================== 初始化 ====================

    init() {
        this.loadProgress();
    },

    loadProgress() {
        try {
            const saved = localStorage.getItem('kidsRagdollRobot');
            if (saved) {
                const data = JSON.parse(saved);
                this.maxUnlockedLevel = data.maxUnlockedLevel || 1;
                this.levelStars = data.levelStars || {};
                this.totalStars = data.totalStars || 0;
            }
        } catch (e) {
            console.error('加载弹弹机器人数据失败:', e);
        }
    },

    saveProgress() {
        try {
            const data = {
                maxUnlockedLevel: this.maxUnlockedLevel,
                levelStars: this.levelStars,
                totalStars: this.totalStars
            };
            localStorage.setItem('kidsRagdollRobot', JSON.stringify(data));
        } catch (e) {
            console.error('保存弹弹机器人数据失败:', e);
        }
    },

    // ==================== 模态框/导航 ====================

    showModal() {
        const modal = document.getElementById('ragdoll-robot-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.showChapterSelect();
            if (typeof addToRecentlyUsed === 'function') {
                addToRecentlyUsed('ragdollRobot');
            }
            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('ragdoll_robot', 'open');
            }
        }
    },

    closeModal() {
        this.stopGame();
        const modal = document.getElementById('ragdoll-robot-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    _showScreen(screenId) {
        ['rr-chapters', 'rr-levels', 'rr-game', 'rr-result']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', id !== screenId);
            });
    },

    // ==================== 章节/关卡选择 ====================

    showChapterSelect() {
        this.stopGame();
        this._showScreen('rr-chapters');
        const container = document.getElementById('rr-chapter-cards');
        const totalStarsEl = document.getElementById('rr-total-stars');
        const totalLevelsEl = document.getElementById('rr-total-levels');

        if (totalStarsEl) totalStarsEl.textContent = this.totalStars;
        const completedLevels = Object.keys(this.levelStars).length;
        if (totalLevelsEl) totalLevelsEl.textContent = `${completedLevels}/${RagdollRobotData.getTotalLevels()}`;

        if (!container) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;

        container.innerHTML = RagdollRobotData.chapters.map(ch => {
            const levels = ch.levels;
            const completedInChapter = levels.filter(id => this.levelStars[id]).length;
            const starsInChapter = levels.reduce((sum, id) => sum + (this.levelStars[id] || 0), 0);
            const maxStarsInChapter = levels.length * 3;
            const firstLevel = levels[0];
            const isUnlocked = firstLevel <= this.maxUnlockedLevel;

            return `
                <div class="rr-chapter-card ${isUnlocked ? '' : 'rr-locked'}"
                     style="--ch-color: ${ch.color}"
                     onclick="${isUnlocked ? `RagdollRobot.showLevelSelect('${ch.id}')` : ''}">
                    <div class="rr-chapter-icon">${ch.icon}</div>
                    <div class="rr-chapter-info">
                        <div class="rr-chapter-name">${t(ch.nameKey, ch.id)}</div>
                        <div class="rr-chapter-progress">
                            ${isUnlocked ? `
                                <span>⭐ ${starsInChapter}/${maxStarsInChapter}</span>
                                <span>${completedInChapter}/${levels.length}</span>
                            ` : `<span>🔒 ${t('ragdollRobot.locked', '未解锁')}</span>`}
                        </div>
                    </div>
                    ${!isUnlocked ? '<div class="rr-lock-icon">🔒</div>' : ''}
                </div>
            `;
        }).join('');
    },

    showLevelSelect(chapterId) {
        this._showScreen('rr-levels');
        const container = document.getElementById('rr-level-grid');
        const titleEl = document.getElementById('rr-level-title');

        const chapter = RagdollRobotData.chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;
        if (titleEl) titleEl.textContent = `${chapter.icon} ${t(chapter.nameKey, chapterId)}`;

        if (!container) return;
        container.innerHTML = chapter.levels.map(id => {
            const isUnlocked = id <= this.maxUnlockedLevel;
            const stars = this.levelStars[id] || 0;

            return `
                <div class="rr-level-btn ${isUnlocked ? '' : 'rr-locked'} ${stars > 0 ? 'rr-completed' : ''}"
                     onclick="${isUnlocked ? `RagdollRobot.startLevel(${id})` : ''}">
                    <div class="rr-level-num">${isUnlocked ? id : '🔒'}</div>
                    <div class="rr-level-stars">
                        ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}
                    </div>
                </div>
            `;
        }).join('');
    },

    // ==================== 游戏核心 ====================

    startLevel(levelId) {
        const levelData = RagdollRobotData.getLevel(levelId);
        if (!levelData) return;

        this.currentLevel = levelId;
        this.levelComplete = false;
        this.levelFailed = false;
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.lastBounceTime = 0;
        this.flipCount = 0;
        this.prevAngle = 0;
        this.cumulativeRotation = 0;
        this.throwsLeft = levelData.throwCount || 3;
        this.starsCollected = [];
        this.activeParticles = [];
        this.floatingTexts = [];
        this.impactFlashes = [];
        this.shockwaves = [];
        this._shakeEndTime = 0;
        this._shakeIntensity = 0;
        this._freezeEndTime = 0;
        this._slowmoEndTime = 0;
        this._slowmoScale = 1;
        this._stunStars = null;
        this._hurtExpressionEnd = 0;
        this.dragTarget = null;
        this.dragRagdollParticle = null;
        this.dragRagdollPt = null;
        this.launchedThrowables = [];

        // 复制关卡数据
        this.platforms = (levelData.platforms || []).map(p => ({ ...p }));
        this.bouncePads = (levelData.bouncePads || []).map(b => ({ ...b }));
        this.stars = (levelData.stars || []).map((s, i) => ({ ...s, id: i, collected: false, rotation: 0 }));
        this.zones = (levelData.zones || []).map(z => ({ ...z }));

        // 创建可投掷物体
        this.throwables = (levelData.throwables || []).map((t, i) => {
            const typeData = RagdollRobotData.throwableTypes[t.type] || RagdollRobotData.throwableTypes.ball;
            return {
                ...t,
                ...typeData,
                id: i,
                launched: false,
                vx: 0, vy: 0,
                ox: t.x, oy: t.y
            };
        });

        // 创建布娃娃机器人
        this._createRagdoll(levelData.robot.x, levelData.robot.y);

        // 获取章节重力修正
        const chapter = RagdollRobotData.chapters.find(c => c.id === levelData.chapter);
        this._gravityMod = chapter ? chapter.gravityModifier : 1.0;

        this._showScreen('rr-game');
        this._setupCanvas();
        this._showHint(levelData.hintKey);
        this._updateUI();

        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('ragdoll_robot', 'start_level', `level_${levelId}`);
        }
    },

    stopGame() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },

    // ==================== 布娃娃创建 ====================

    _createRagdoll(cx, cy) {
        // 13个粒子: 头顶(0), 头心(1), 脖子(2), 左肩(3), 右肩(4),
        // 左肘(5), 右肘(6), 左手(7), 右手(8), 臀部(9),
        // 左膝(10), 右膝(11), 左脚(12), 右脚(13)
        const particles = [
            { x: cx, y: cy - 40, r: 5 },       // 0: 头顶
            { x: cx, y: cy - 30, r: 12 },      // 1: 头心（最大，圆头）
            { x: cx, y: cy - 18, r: 4 },       // 2: 脖子
            { x: cx - 12, y: cy - 12, r: 4 },  // 3: 左肩
            { x: cx + 12, y: cy - 12, r: 4 },  // 4: 右肩
            { x: cx - 20, y: cy - 2, r: 3 },   // 5: 左肘
            { x: cx + 20, y: cy - 2, r: 3 },   // 6: 右肘
            { x: cx - 26, y: cy + 8, r: 4 },   // 7: 左手
            { x: cx + 26, y: cy + 8, r: 4 },   // 8: 右手
            { x: cx, y: cy + 8, r: 6 },        // 9: 臀部
            { x: cx - 8, y: cy + 22, r: 3 },   // 10: 左膝
            { x: cx + 8, y: cy + 22, r: 3 },   // 11: 右膝
            { x: cx - 10, y: cy + 36, r: 4 },  // 12: 左脚
            { x: cx + 10, y: cy + 36, r: 4 }   // 13: 右脚
        ].map(p => ({
            ...p,
            ox: p.x,
            oy: p.y
        }));

        // 骨骼约束（相邻关节）
        const bones = [
            [0, 1], [1, 2], [2, 3], [2, 4],      // 头-脖子-肩
            [3, 5], [5, 7], [4, 6], [6, 8],       // 手臂
            [2, 9],                                  // 脖子-臀
            [9, 10], [10, 12], [9, 11], [11, 13],  // 腿
            [3, 4],                                  // 肩-肩（保持宽度）
        ];

        // 结构约束（防止坍塌）
        const structural = [
            [0, 9],    // 头顶-臀（保持身高）
            [3, 9],    // 左肩-臀
            [4, 9],    // 右肩-臀
            [7, 9],    // 左手-臀
            [8, 9],    // 右手-臀
            [10, 11],  // 膝-膝（保持腿宽度）
            [12, 13],  // 脚-脚
            [0, 3],    // 头顶-左肩
            [0, 4],    // 头顶-右肩
        ];

        const constraints = [];
        const addConstraint = (a, b, stiffness) => {
            const dx = particles[b].x - particles[a].x;
            const dy = particles[b].y - particles[a].y;
            constraints.push({ a, b, dist: Math.hypot(dx, dy), stiffness: stiffness || 1.0 });
        };

        bones.forEach(([a, b]) => addConstraint(a, b, 1.0));
        structural.forEach(([a, b]) => addConstraint(a, b, 0.8));

        this.ragdoll = {
            particles,
            constraints,
            settled: false,
            settleCount: 0,
            glowIntensity: 0,
            expression: 'idle'
        };

        // 初始化翻转检测角度
        const head = particles[1];
        const hip = particles[9];
        this.prevAngle = Math.atan2(head.y - hip.y, head.x - hip.x);
        this.cumulativeRotation = 0;
    },

    // ==================== 画布设置 ====================

    _setupCanvas() {
        this.canvas = document.getElementById('rr-canvas');
        if (!this.canvas) return;

        requestAnimationFrame(() => {
            this._initCanvasSize();
            this._startGameLoop();
        });
    },

    _initCanvasSize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        const containerW = rect.width;
        const containerH = rect.height;
        const scaleX = containerW / this.LOGICAL_W;
        const scaleY = containerH / this.LOGICAL_H;
        this.canvasScale = Math.min(scaleX, scaleY);

        const w = this.LOGICAL_W * this.canvasScale;
        const h = this.LOGICAL_H * this.canvasScale;

        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);

        // 绑定事件
        this.canvas.onpointerdown = (e) => this._onPointerDown(e);
        this.canvas.onpointermove = (e) => this._onPointerMove(e);
        this.canvas.onpointerup = (e) => this._onPointerUp(e);
        this.canvas.onpointerleave = (e) => this._onPointerUp(e);
        this.canvas.style.touchAction = 'none';
    },

    _toLogical(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / this.canvasScale,
            y: (e.clientY - rect.top) / this.canvasScale
        };
    },

    // ==================== 拖拽弹射 ====================

    _onPointerDown(e) {
        if (this.levelComplete || this.levelFailed) return;
        const pt = this._toLogical(e);

        // 检查是否触碰了可拖拽物体
        for (const obj of this.throwables) {
            if (obj.launched) continue;
            const dist = Math.hypot(pt.x - obj.x, pt.y - obj.y);
            if (dist < obj.radius + 15) {
                this.dragTarget = obj;
                this.dragStartX = obj.x;
                this.dragStartY = obj.y;
                this.dragOffsetX = obj.x - pt.x;
                this.dragOffsetY = obj.y - pt.y;
                return;
            }
        }

        // 检查是否触碰了布娃娃机器人的粒子
        if (this.ragdoll) {
            let closest = null;
            let closestDist = 30; // 触碰判定半径
            for (let i = 0; i < this.ragdoll.particles.length; i++) {
                const p = this.ragdoll.particles[i];
                const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
                if (dist < closestDist) {
                    closest = i;
                    closestDist = dist;
                }
            }
            if (closest !== null) {
                this.dragRagdollParticle = closest;
                this.dragRagdollPt = pt;
                return;
            }
        }
    },

    _onPointerMove(e) {
        const pt = this._toLogical(e);

        // 拖拽布娃娃粒子
        if (this.dragRagdollParticle !== null && this.dragRagdollParticle !== undefined) {
            this.dragRagdollPt = pt;
            return;
        }

        if (!this.dragTarget) return;

        // 物体跟随手指
        this.dragTarget.x = pt.x + this.dragOffsetX;
        this.dragTarget.y = pt.y + this.dragOffsetY;

        // 限制在画布内
        this.dragTarget.x = Math.max(this.dragTarget.radius, Math.min(this.LOGICAL_W - this.dragTarget.radius, this.dragTarget.x));
        this.dragTarget.y = Math.max(this.dragTarget.radius, Math.min(this.LOGICAL_H - this.dragTarget.radius, this.dragTarget.y));
    },

    _onPointerUp(e) {
        // 松开布娃娃粒子 — 给一个甩出速度
        if (this.dragRagdollParticle !== null && this.dragRagdollParticle !== undefined) {
            this.dragRagdollParticle = null;
            this.dragRagdollPt = null;
            return;
        }

        if (!this.dragTarget) return;

        const obj = this.dragTarget;
        const dx = obj.x - this.dragStartX;
        const dy = obj.y - this.dragStartY;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
            // 弹射！方向为拖拽方向，速度与距离成正比
            const speed = Math.min(dist * 0.15, 15);
            const angle = Math.atan2(dy, dx);
            obj.vx = Math.cos(angle) * speed;
            obj.vy = Math.sin(angle) * speed;
            obj.ox = obj.x - obj.vx;
            obj.oy = obj.y - obj.vy;
            obj.launched = true;
            this.launchedThrowables.push(obj);
            this.throwsLeft--;
            this._updateUI();

            // 弹射粒子效果
            this._spawnParticles(obj.x, obj.y, '#FFD93D', 8);

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('click');
            }
        } else {
            // 拖回原位
            obj.x = this.dragStartX;
            obj.y = this.dragStartY;
        }

        this.dragTarget = null;
    },

    // ==================== 游戏循环 ====================

    _startGameLoop() {
        if (!this.isPlaying) return;
        this._gameLoop();
    },

    _gameLoop() {
        if (!this.isPlaying) return;

        this._physicsTick();
        this._checkStarCollection();
        this._checkBounceCombo();
        this._checkFlips();
        this._updateImpactFlashes();
        this._updateShockwaves();
        this._renderLevel();
        this._checkWinLose();

        this.animationFrame = requestAnimationFrame(() => this._gameLoop());
    },

    // ==================== 物理引擎 ====================

    _physicsTick() {
        // 冻结帧：跳过物理但继续渲染
        if (Date.now() < this._freezeEndTime) return;

        // 慢动作缩放
        let slowFactor = 1;
        if (Date.now() < this._slowmoEndTime) {
            slowFactor = this._slowmoScale;
        }

        const grav = this.GRAVITY * (this._gravityMod || 1.0) * slowFactor;

        // 更新布娃娃
        if (this.ragdoll) {
            this._updateRagdoll(grav, slowFactor);
        }

        // 更新已发射的投掷物
        for (const obj of this.launchedThrowables) {
            if (!obj.active && obj.active !== undefined) continue;
            obj.active = true;

            const vx = (obj.x - obj.ox) * this.DAMPING * slowFactor;
            const vy = (obj.y - obj.oy) * this.DAMPING * slowFactor;

            obj.ox = obj.x;
            obj.oy = obj.y;

            obj.x += vx;
            obj.y += vy + grav * (obj.mass || 1.0);

            // 碰撞
            this._collideThrowableWithBounds(obj);
            this._collideThrowableWithPlatforms(obj);
            this._collideThrowableWithRagdoll(obj);

            // 超出边界
            if (obj.y > this.LOGICAL_H + 50) {
                obj.active = false;
            }
        }

        // 更新粒子效果
        this._updateParticles();
        this._updateFloatingTexts();
    },

    _updateRagdoll(grav, slowFactor) {
        const rd = this.ragdoll;
        const dragIdx = this.dragRagdollParticle;
        const sf = slowFactor || 1;

        // Verlet积分
        for (let i = 0; i < rd.particles.length; i++) {
            const p = rd.particles[i];

            // 被拖拽的粒子直接跟随手指
            if (dragIdx !== null && dragIdx !== undefined && i === dragIdx && this.dragRagdollPt) {
                p.ox = p.x;
                p.oy = p.y;
                p.x = this.dragRagdollPt.x;
                p.y = this.dragRagdollPt.y;
                continue;
            }

            const vx = (p.x - p.ox) * this.DAMPING * sf;
            const vy = (p.y - p.oy) * this.DAMPING * sf;

            p.ox = p.x;
            p.oy = p.y;

            p.x += vx;
            p.y += vy + grav;
        }

        // 约束求解 + 碰撞
        for (let iter = 0; iter < this.CONSTRAINT_ITERS; iter++) {
            this._solveConstraints(rd);

            if (iter < this.COLLISION_ITERS || iter === this.CONSTRAINT_ITERS - 1) {
                this._collideRagdollWithBounds(rd);
                this._collideRagdollWithPlatforms(rd);
                this._collideRagdollWithBouncePads(rd);
                this._collideRagdollWithZones(rd);
            }
        }

        // 更新发光
        const totalMotion = rd.particles.reduce((sum, p) =>
            sum + Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy), 0);
        const avgMotion = totalMotion / rd.particles.length;
        rd.glowIntensity = Math.min(avgMotion * 3, 1);

        // 更新表情（受击表情保持期间不被覆盖）
        if (Date.now() < this._hurtExpressionEnd) {
            rd.expression = 'hurt';
        } else if (avgMotion > 3) rd.expression = 'spinning';
        else if (avgMotion > 1.5) rd.expression = 'flying';
        else if (avgMotion > 0.5) rd.expression = 'bouncing';
        else rd.expression = 'idle';

        // 静止检测
        if (avgMotion < 0.12) {
            rd.settleCount++;
        } else {
            rd.settleCount = 0;
        }
        rd.settled = rd.settleCount > 120;
    },

    _solveConstraints(rd) {
        for (const c of rd.constraints) {
            const pa = rd.particles[c.a];
            const pb = rd.particles[c.b];

            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const currentDist = Math.hypot(dx, dy);

            if (currentDist < 0.001) continue;

            const diff = (currentDist - c.dist) / currentDist;
            const stiffness = c.stiffness || 1.0;
            const moveX = dx * diff * 0.5 * stiffness;
            const moveY = dy * diff * 0.5 * stiffness;

            pa.x += moveX;
            pa.y += moveY;
            pb.x -= moveX;
            pb.y -= moveY;
        }
    },

    // ==================== 碰撞检测 ====================

    _collideRagdollWithBounds(rd) {
        const groundY = this.LOGICAL_H - 50;

        for (const p of rd.particles) {
            // 地面
            if (p.y + p.r > groundY) {
                const vy = p.y - p.oy;
                p.y = groundY - p.r;
                p.oy = p.y + vy * this.BOUNCE;
                p.ox = p.x - (p.x - p.ox) * this.SURFACE_FRICTION;

                if (Math.abs(vy) > 2) {
                    this._onBounce(p.x, groundY);
                }
            }
            // 左墙
            if (p.x - p.r < 0) {
                const vx = p.x - p.ox;
                p.x = p.r;
                p.ox = p.x + vx * this.BOUNCE;
            }
            // 右墙
            if (p.x + p.r > this.LOGICAL_W) {
                const vx = p.x - p.ox;
                p.x = this.LOGICAL_W - p.r;
                p.ox = p.x + vx * this.BOUNCE;
            }
            // 天花板
            if (p.y - p.r < 0) {
                const vy = p.y - p.oy;
                p.y = p.r;
                p.oy = p.y + vy * this.BOUNCE;
            }
        }
    },

    _collideRagdollWithPlatforms(rd) {
        for (const p of rd.particles) {
            for (const obs of this.platforms) {
                this._collideParticleWithRect(p, obs);
            }
        }
    },

    _collideParticleWithRect(p, obs) {
        const angle = (obs.angle || 0) * Math.PI / 180;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        const localX = cosA * (p.x - obs.x) - sinA * (p.y - obs.y);
        const localY = sinA * (p.x - obs.x) + cosA * (p.y - obs.y);

        const halfW = obs.w / 2;
        const halfH = obs.h / 2;

        const closestX = Math.max(-halfW, Math.min(localX, halfW));
        const closestY = Math.max(-halfH, Math.min(localY, halfH));

        const dx = localX - closestX;
        const dy = localY - closestY;
        const dist = Math.hypot(dx, dy);

        if (dist < p.r && dist > 0.001) {
            const overlap = p.r - dist;
            const lnx = dx / dist;
            const lny = dy / dist;

            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);
            const wnx = cosB * lnx - sinB * lny;
            const wny = sinB * lnx + cosB * lny;

            p.x += wnx * overlap;
            p.y += wny * overlap;

            const vx = p.x - p.ox;
            const vy = p.y - p.oy;
            const velNormal = vx * wnx + vy * wny;

            if (velNormal < 0) {
                p.ox = p.x + (vx - wnx * velNormal * (1 + this.BOUNCE));
                p.oy = p.y + (vy - wny * velNormal * (1 + this.BOUNCE));

                const tx = -wny;
                const ty = wnx;
                const velTangent = vx * tx + vy * ty;
                p.ox += tx * velTangent * (1 - this.SURFACE_FRICTION);
                p.oy += ty * velTangent * (1 - this.SURFACE_FRICTION);

                if (Math.abs(velNormal) > 2) {
                    this._onBounce(p.x, p.y);
                }
            }
        } else if (dist === 0 && localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
            const dLeft = localX + halfW;
            const dRight = halfW - localX;
            const dTop = localY + halfH;
            const dBottom = halfH - localY;
            const minD = Math.min(dLeft, dRight, dTop, dBottom);

            let pushLX = 0, pushLY = 0;
            if (minD === dTop) pushLY = -(dTop + p.r);
            else if (minD === dBottom) pushLY = dBottom + p.r;
            else if (minD === dLeft) pushLX = -(dLeft + p.r);
            else pushLX = dRight + p.r;

            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);
            p.x = obs.x + cosB * (localX + pushLX) - sinB * (localY + pushLY);
            p.y = obs.y + sinB * (localX + pushLX) + cosB * (localY + pushLY);
            p.ox = p.x;
            p.oy = p.y;
        }
    },

    _collideRagdollWithBouncePads(rd) {
        for (const p of rd.particles) {
            for (const pad of this.bouncePads) {
                const px = pad.x - pad.w / 2;
                const py = pad.y - pad.h / 2;

                const closestX = Math.max(px, Math.min(p.x, px + pad.w));
                const closestY = Math.max(py, Math.min(p.y, py + pad.h));
                const dx = p.x - closestX;
                const dy = p.y - closestY;
                const dist = Math.hypot(dx, dy);

                const vy = p.y - p.oy;
                if (dist < p.r && vy > 0.3) {
                    const overlap = p.r - dist;
                    if (dist > 0) {
                        p.x += (dx / dist) * overlap;
                        p.y += (dy / dist) * overlap;
                    } else {
                        p.y -= overlap;
                    }

                    const bouncePower = (pad.power || this.BOUNCE_PAD_MULTIPLIER);
                    const bounceVel = Math.max(vy * bouncePower, 6);
                    p.oy = p.y + bounceVel;

                    if (!pad._bounced || Date.now() - pad._bounced > 100) {
                        pad._bounced = Date.now();
                        this._spawnParticles(pad.x, pad.y, '#00FF88', 8);
                        this._onBounce(pad.x, pad.y);
                        if (typeof RewardSystem !== 'undefined') {
                            RewardSystem.playSound('click');
                        }
                    }
                }
            }
        }
    },

    _collideRagdollWithZones(rd) {
        for (const zone of this.zones) {
            for (const p of rd.particles) {
                if (p.x > zone.x && p.x < zone.x + zone.w &&
                    p.y > zone.y && p.y < zone.y + zone.h) {
                    // 应用区域阻力
                    const drag = zone.drag || 0.9;
                    const vx = p.x - p.ox;
                    const vy = p.y - p.oy;
                    p.ox = p.x - vx * drag;
                    p.oy = p.y - vy * drag;
                }
            }
        }
    },

    _collideThrowableWithBounds(obj) {
        const groundY = this.LOGICAL_H - 50;
        const bounce = obj.bounce || 0.5;

        if (obj.y + obj.radius > groundY) {
            const vy = obj.y - obj.oy;
            obj.y = groundY - obj.radius;
            obj.oy = obj.y + vy * bounce;
            obj.ox = obj.x - (obj.x - obj.ox) * this.SURFACE_FRICTION;
        }
        if (obj.x - obj.radius < 0) {
            const vx = obj.x - obj.ox;
            obj.x = obj.radius;
            obj.ox = obj.x + vx * bounce;
        }
        if (obj.x + obj.radius > this.LOGICAL_W) {
            const vx = obj.x - obj.ox;
            obj.x = this.LOGICAL_W - obj.radius;
            obj.ox = obj.x + vx * bounce;
        }
        if (obj.y - obj.radius < 0) {
            const vy = obj.y - obj.oy;
            obj.y = obj.radius;
            obj.oy = obj.y + vy * bounce;
        }
    },

    _collideThrowableWithPlatforms(obj) {
        for (const plat of this.platforms) {
            this._collideCircleWithRect(obj, plat);
        }
    },

    _collideCircleWithRect(obj, rect) {
        const angle = (rect.angle || 0) * Math.PI / 180;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        const localX = cosA * (obj.x - rect.x) - sinA * (obj.y - rect.y);
        const localY = sinA * (obj.x - rect.x) + cosA * (obj.y - rect.y);

        const halfW = rect.w / 2;
        const halfH = rect.h / 2;
        const closestX = Math.max(-halfW, Math.min(localX, halfW));
        const closestY = Math.max(-halfH, Math.min(localY, halfH));

        const dx = localX - closestX;
        const dy = localY - closestY;
        const dist = Math.hypot(dx, dy);

        if (dist < obj.radius && dist > 0.001) {
            const overlap = obj.radius - dist;
            const lnx = dx / dist;
            const lny = dy / dist;

            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);
            const wnx = cosB * lnx - sinB * lny;
            const wny = sinB * lnx + cosB * lny;

            obj.x += wnx * overlap;
            obj.y += wny * overlap;

            const vx = obj.x - obj.ox;
            const vy = obj.y - obj.oy;
            const velNormal = vx * wnx + vy * wny;
            const bounce = obj.bounce || 0.5;

            if (velNormal < 0) {
                obj.ox = obj.x + (vx - wnx * velNormal * (1 + bounce));
                obj.oy = obj.y + (vy - wny * velNormal * (1 + bounce));
            }
        }
    },

    _collideThrowableWithRagdoll(obj) {
        if (!this.ragdoll || !obj.active) return;

        for (const p of this.ragdoll.particles) {
            const dx = p.x - obj.x;
            const dy = p.y - obj.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p.r + obj.radius;

            if (dist < minDist && dist > 0.001) {
                // 碰撞！将投掷物的动量转移到布娃娃
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                // 推开
                p.x += nx * overlap * 0.7;
                p.y += ny * overlap * 0.7;
                obj.x -= nx * overlap * 0.3;
                obj.y -= ny * overlap * 0.3;

                // 传递速度
                const objVx = obj.x - obj.ox;
                const objVy = obj.y - obj.oy;
                const impactForce = Math.hypot(objVx, objVy) * (obj.mass || 1.0);

                p.ox = p.x - objVx * 0.8;
                p.oy = p.y - objVy * 0.8;

                // 减速投掷物
                obj.ox = obj.x - objVx * 0.3;
                obj.oy = obj.y - objVy * 0.3;

                // 撞击效果
                if (impactForce > 1) {
                    const normalizedForce = Math.min(impactForce / 12, 1.0);
                    const hitX = (p.x + obj.x) / 2;
                    const hitY = (p.y + obj.y) / 2;
                    const particleCount = Math.round(10 + normalizedForce * 15);

                    // 增强粒子 — 混合形状
                    this._spawnParticles(hitX, hitY, '#FF6B6B', particleCount, {
                        shapes: ['circle', 'star', 'spark'],
                        minSpeed: 2 + normalizedForce * 2,
                        maxSpeed: 6 + normalizedForce * 4,
                        minSize: 2,
                        maxSize: 5 + normalizedForce * 4
                    });

                    // 撞击闪光
                    this._addImpactFlash(hitX, hitY, 20 + normalizedForce * 30);

                    // 冲击波（中等以上碰撞）
                    if (normalizedForce > 0.3) {
                        this._addShockwave(hitX, hitY, 40 + normalizedForce * 40);
                    }

                    // 屏幕震动
                    this._startShake(2 + normalizedForce * 5, 150 + normalizedForce * 100);

                    // 冻结帧（重击）
                    if (normalizedForce > 0.5) {
                        this._startFreeze(50 + normalizedForce * 30);
                    }

                    // 慢动作（超重击）
                    if (normalizedForce > 0.7) {
                        this._startSlowmo(0.3, 300);
                    }

                    // 眩晕星星（重击）
                    if (normalizedForce > 0.5) {
                        this._startStunStars(p.x, p.y);
                    }

                    // 受击表情保持
                    this.ragdoll.expression = 'hurt';
                    this._hurtExpressionEnd = Date.now() + 500;

                    // 撞击得分
                    const hitScore = Math.round(impactForce * 5);
                    this.score += hitScore;
                    this._addFloatingText(p.x, p.y - 20, `+${hitScore}`, '#FF6B6B');

                    // 撞击音效
                    this._playImpactSound(normalizedForce);
                }
            }
        }
    },

    // ==================== 计分系统 ====================

    _onBounce(x, y) {
        // 只在有投掷后计算弹跳得分
        if (this.launchedThrowables.length === 0) return;
        const now = Date.now();

        // 弹跳音效
        this._playBounceSound();

        if (now - this.lastBounceTime < this.COMBO_WINDOW) {
            this.combo++;
            const comboScore = 10 * this.combo;
            this.score += comboScore;
            this._addFloatingText(x, y - 30, `${this.combo}x Combo! +${comboScore}`, '#FFD93D');

            // 连击升调音效
            this._playComboSound(this.combo);

            // 连击彩色粒子
            const comboColors = ['#FFD93D', '#FF69B4', '#00D2D3', '#9B59B6', '#FF6B6B'];
            const comboColor = comboColors[Math.min(this.combo - 1, comboColors.length - 1)];
            this._spawnParticles(x, y, comboColor, 6 + this.combo * 2, {
                shapes: ['star', 'spark'],
                minSpeed: 2,
                maxSpeed: 5 + this.combo,
                minSize: 2,
                maxSize: 5
            });

            // 小幅屏幕震动
            this._startShake(1.5, 100);
        } else {
            this.combo = 1;
            this.score += 10;
        }
        this.lastBounceTime = now;
    },

    _checkStarCollection() {
        if (!this.ragdoll) return;

        for (const star of this.stars) {
            if (star.collected) continue;

            for (const p of this.ragdoll.particles) {
                const dist = Math.hypot(p.x - star.x, p.y - star.y);
                if (dist < p.r + 18) {
                    star.collected = true;
                    this.starsCollected.push(star);
                    this.score += 100;
                    this._addFloatingText(star.x, star.y - 20, '+100 ⭐', '#FFD93D');

                    // 增强粒子 — star/spark形状爆发
                    this._spawnParticles(star.x, star.y, '#FFD93D', 16, {
                        shapes: ['star', 'spark'],
                        minSpeed: 3,
                        maxSpeed: 7,
                        minSize: 3,
                        maxSize: 8
                    });

                    // 冲击波环
                    this._addShockwave(star.x, star.y, 50);

                    // 星星叮声
                    this._playStarSound();
                    break;
                }
            }
        }
    },

    _checkBounceCombo() {
        // 连击超时重置
        if (this.combo > 0 && Date.now() - this.lastBounceTime > this.COMBO_WINDOW * 2) {
            this.combo = 0;
        }
    },

    _checkFlips() {
        if (!this.ragdoll) return;

        const head = this.ragdoll.particles[1]; // 头心
        const hip = this.ragdoll.particles[9];   // 臀部

        const currentAngle = Math.atan2(head.y - hip.y, head.x - hip.x);
        let deltaAngle = currentAngle - this.prevAngle;

        // 处理角度跳跃(-PI到PI)
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        this.prevAngle = currentAngle;

        // 只在有投掷后才累计旋转和计分
        if (this.launchedThrowables.length === 0) return;

        this.cumulativeRotation += deltaAngle;

        // 每翻转360度得分
        while (Math.abs(this.cumulativeRotation) >= Math.PI * 2) {
            this.flipCount++;
            this.score += 50;
            const cx = (head.x + hip.x) / 2;
            const cy = (head.y + hip.y) / 2;
            this._addFloatingText(cx, cy - 30, 'Flip! +50', '#FF69B4');
            this._spawnParticles(cx, cy, '#FF69B4', 8);

            if (this.cumulativeRotation > 0) {
                this.cumulativeRotation -= Math.PI * 2;
            } else {
                this.cumulativeRotation += Math.PI * 2;
            }
        }
    },

    // ==================== 胜负判定 ====================

    _checkWinLose() {
        if (this.levelComplete || this.levelFailed) return;

        // 添加移动距离得分（仅在有投掷后计算）
        if (this.ragdoll && this.launchedThrowables.length > 0) {
            const avgMotion = this.ragdoll.particles.reduce((sum, p) =>
                Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy) + sum, 0) / this.ragdoll.particles.length;
            if (avgMotion > 0.5) {
                this.score += Math.round(avgMotion * 0.5);
            }
        }

        // 所有星星收集完毕 → 直接通关（不需要等机器人静止）
        const allStarsCollected = this.stars.length > 0 && this.starsCollected.length >= this.stars.length;
        if (allStarsCollected && this.dragRagdollParticle === null) {
            this.levelComplete = true;
            setTimeout(() => {
                this.isPlaying = false;
                this._showResult(true);
            }, 800);
            return;
        }

        const allThrowsUsed = this.throwsLeft <= 0 || this.throwables.every(t => t.launched);
        const allSettled = this.ragdoll && this.ragdoll.settled;
        const allThrowablesSettled = this.launchedThrowables.every(t =>
            !t.active || Math.hypot(t.x - t.ox, t.y - t.oy) < 0.3
        );

        if (allThrowsUsed && allSettled && allThrowablesSettled) {
            // 游戏结束
            if (this.starsCollected.length > 0 || this.score >= 100) {
                this.levelComplete = true;
                setTimeout(() => {
                    this.isPlaying = false;
                    this._showResult(true);
                }, 1000);
            } else {
                this.levelFailed = true;
                setTimeout(() => {
                    this.isPlaying = false;
                    this._showResult(false);
                }, 1000);
            }
        }
    },

    _showResult(success) {
        this._showScreen('rr-result');
        const resultEl = document.getElementById('rr-result');
        if (!resultEl) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;

        if (success) {
            const levelData = RagdollRobotData.getLevel(this.currentLevel);
            let stars = 0;
            if (levelData) {
                if (this.score >= levelData.starThresholds[0]) stars = 3;
                else if (this.score >= levelData.starThresholds[1]) stars = 2;
                else stars = 1;
            }

            const prevStars = this.levelStars[this.currentLevel] || 0;
            if (stars > prevStars) {
                this.totalStars += (stars - prevStars);
                this.levelStars[this.currentLevel] = stars;
            }

            if (this.currentLevel >= this.maxUnlockedLevel) {
                this.maxUnlockedLevel = Math.min(this.currentLevel + 1, RagdollRobotData.getTotalLevels());
            }
            this.saveProgress();

            const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
            const points = stars * 10;

            resultEl.innerHTML = `
                <div class="rr-result-content rr-success">
                    <div class="rr-result-emoji">🎉</div>
                    <h2>${t('ragdollRobot.levelClear', '关卡通过!')}</h2>
                    <div class="rr-result-stars">${starDisplay}</div>
                    <div class="rr-result-info">
                        <span>${t('ragdollRobot.level', '关卡')} ${this.currentLevel}</span>
                        <span>${t('ragdollRobot.score', '得分')}: ${this.score}</span>
                    </div>
                    <div class="rr-result-details">
                        <span>⭐ ×${this.starsCollected.length}</span>
                        <span>🔄 ×${this.flipCount}</span>
                        <span>🔥 ${t('ragdollRobot.maxCombo', '最高连击')}: ${this.combo}x</span>
                    </div>
                    <div class="rr-result-btns">
                        ${this.currentLevel < RagdollRobotData.getTotalLevels() ? `
                            <button class="rr-btn rr-btn-primary" onclick="RagdollRobot.startLevel(${this.currentLevel + 1})">
                                ${t('ragdollRobot.nextLevel', '下一关')} ▶
                            </button>
                        ` : ''}
                        <button class="rr-btn rr-btn-secondary" onclick="RagdollRobot.startLevel(${this.currentLevel})">
                            ${t('ragdollRobot.retry', '重玩')} 🔄
                        </button>
                        <button class="rr-btn rr-btn-outline" onclick="RagdollRobot.showChapterSelect()">
                            ${t('ragdollRobot.backToChapters', '返回章节')}
                        </button>
                    </div>
                </div>
            `;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('win');
                RewardSystem.addPoints(points);
            }
            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('ragdoll_robot', 'level_complete', `level_${this.currentLevel}`, stars);
            }
        } else {
            resultEl.innerHTML = `
                <div class="rr-result-content rr-fail">
                    <div class="rr-result-emoji">😅</div>
                    <h2>${t('ragdollRobot.levelFail', '再试试!')}</h2>
                    <p class="rr-result-tip">${t('ragdollRobot.failTip', '试试不同的角度和力度!')}</p>
                    <div class="rr-result-btns">
                        <button class="rr-btn rr-btn-primary" onclick="RagdollRobot.startLevel(${this.currentLevel})">
                            ${t('ragdollRobot.retry', '重玩')} 🔄
                        </button>
                        <button class="rr-btn rr-btn-outline" onclick="RagdollRobot.showChapterSelect()">
                            ${t('ragdollRobot.backToChapters', '返回章节')}
                        </button>
                    </div>
                </div>
            `;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('wrong');
            }
        }
    },

    // ==================== 粒子/文字效果 ====================

    _spawnParticles(x, y, color, count, options) {
        const shapes = (options && options.shapes) || ['circle'];
        const minSpeed = (options && options.minSpeed) || 2;
        const maxSpeed = (options && options.maxSpeed) || 6;
        const minSize = (options && options.minSize) || 3;
        const maxSize = (options && options.maxSize) || 7;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            this.activeParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                color: color,
                size: minSize + Math.random() * (maxSize - minSize),
                shape: shapes[Math.floor(Math.random() * shapes.length)]
            });
        }
    },

    _addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y, text, color,
            life: 1,
            decay: 0.015,
            vy: -1.5
        });
    },

    _updateParticles() {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.activeParticles.splice(i, 1);
            }
        }
    },

    _updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= ft.decay;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    },

    // ==================== 音效引擎 (Web Audio API) ====================

    _getAudioCtx() {
        if (!this._audioCtx) {
            try {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                return null;
            }
        }
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
        }
        return this._audioCtx;
    },

    _playImpactSound(force) {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const vol = 0.15 + force * 0.25;
        const dur = 0.08 + force * 0.12;

        // 低频 thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80 + force * 40, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + dur);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur);

        // 噪声 crack
        if (force > 0.3) {
            const bufSize = ctx.sampleRate * 0.04;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buf;
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(vol * 0.5, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(nGain).connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.05);
        }
    },

    _playBounceSound() {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        // 150→600→300Hz 卡通弹跳扫频
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.05);
        osc.frequency.linearRampToValueAtTime(300, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    },

    _playStarSound() {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 双振荡器闪亮叮
        [1200, 2400].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.15);
            gain.gain.setValueAtTime(0.1, now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.03);
            osc.stop(now + 0.25);
        });
    },

    _playComboSound(combo) {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        const baseFreq = 300 + combo * 80;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    },

    // ==================== 视觉特效引擎 ====================

    _startShake(intensity, durationMs) {
        this._shakeIntensity = intensity;
        this._shakeEndTime = Date.now() + durationMs;
    },

    _startFreeze(durationMs) {
        this._freezeEndTime = Date.now() + durationMs;
    },

    _startSlowmo(scale, durationMs) {
        this._slowmoScale = scale;
        this._slowmoEndTime = Date.now() + durationMs;
    },

    _addImpactFlash(x, y, radius) {
        this.impactFlashes.push({
            x, y,
            radius: radius || 30,
            life: 1,
            decay: 0.06
        });
    },

    _addShockwave(x, y, maxRadius) {
        this.shockwaves.push({
            x, y,
            radius: 5,
            maxRadius: maxRadius || 60,
            life: 1,
            decay: 0.04
        });
    },

    _startStunStars(x, y) {
        this._stunStars = {
            x, y,
            startTime: Date.now(),
            duration: 1500
        };
    },

    _updateImpactFlashes() {
        for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
            const f = this.impactFlashes[i];
            f.life -= f.decay;
            f.radius += 2;
            if (f.life <= 0) this.impactFlashes.splice(i, 1);
        }
    },

    _updateShockwaves() {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= sw.decay;
            sw.radius += (sw.maxRadius - sw.radius) * 0.15;
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }
    },

    _drawImpactFlashes(ctx) {
        for (const f of this.impactFlashes) {
            ctx.save();
            ctx.globalAlpha = f.life * 0.7;
            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            grad.addColorStop(0, 'rgba(255,255,255,0.9)');
            grad.addColorStop(0.5, 'rgba(255,255,200,0.4)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    _drawShockwaves(ctx) {
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = sw.life * 0.6;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = Math.max(1, 3 * sw.life);
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    },

    _drawStunStars(ctx) {
        if (!this._stunStars || !this.ragdoll) return;
        const ss = this._stunStars;
        const elapsed = Date.now() - ss.startTime;
        if (elapsed > ss.duration) {
            this._stunStars = null;
            return;
        }

        const head = this.ragdoll.particles[1];
        const alpha = 1 - elapsed / ss.duration;
        const baseAngle = elapsed * 0.008;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 3; i++) {
            const a = baseAngle + (Math.PI * 2 / 3) * i;
            const orbitR = 18;
            const sx = head.x + Math.cos(a) * orbitR;
            const sy = head.y - 15 + Math.sin(a) * orbitR * 0.5;
            ctx.fillText('⭐', sx, sy);
        }
        ctx.restore();
    },

    // ==================== 渲染 ====================

    _renderLevel() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const s = this.canvasScale;

        ctx.clearRect(0, 0, this.LOGICAL_W * s, this.LOGICAL_H * s);
        ctx.save();
        ctx.scale(s, s);

        // 屏幕震动（衰减到0）
        const now = Date.now();
        if (now < this._shakeEndTime) {
            const remaining = (this._shakeEndTime - now) / 250; // 归一化衰减
            const intensity = this._shakeIntensity * Math.min(remaining, 1);
            const sx = (Math.random() - 0.5) * intensity * 2;
            const sy = (Math.random() - 0.5) * intensity * 2;
            ctx.translate(sx, sy);
        }

        this._drawBackground(ctx);
        this._drawZones(ctx);
        this._drawPlatforms(ctx);
        this._drawBouncePads(ctx);
        this._drawStars(ctx);
        this._drawGround(ctx);
        this._drawThrowables(ctx);
        this._drawRagdoll(ctx);
        this._drawDragArrow(ctx);
        this._drawParticles(ctx);
        this._drawShockwaves(ctx);
        this._drawImpactFlashes(ctx);
        this._drawStunStars(ctx);
        this._drawFloatingTexts(ctx);

        // 分数显示
        this._drawScore(ctx);

        ctx.restore();
    },

    _drawBackground(ctx) {
        const levelData = RagdollRobotData.getLevel(this.currentLevel);
        const chapterId = levelData ? levelData.chapter : 'playground';
        const bg = this.chapterBgs[chapterId] || this.chapterBgs.playground;

        const grad = ctx.createLinearGradient(0, 0, 0, this.LOGICAL_H);
        grad.addColorStop(0, bg.top);
        grad.addColorStop(0.5, bg.mid);
        grad.addColorStop(1, bg.bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.LOGICAL_W, this.LOGICAL_H);

        // 装饰星星
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        const seed = this.currentLevel * 7;
        for (let i = 0; i < 15; i++) {
            const sx = ((seed + i * 37) % 400);
            const sy = ((seed + i * 53) % 400);
            const size = 1 + (i % 3);
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawZones(ctx) {
        for (const zone of this.zones) {
            ctx.save();
            if (zone.type === 'water') {
                ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
                ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
                // 波浪线
                ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let x = zone.x; x <= zone.x + zone.w; x += 5) {
                    const wy = zone.y + Math.sin((x + Date.now() * 0.003) * 0.1) * 3;
                    if (x === zone.x) ctx.moveTo(x, wy);
                    else ctx.lineTo(x, wy);
                }
                ctx.stroke();
            } else if (zone.type === 'bubble') {
                ctx.fillStyle = 'rgba(200, 230, 255, 0.15)';
                ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
                // 气泡
                const now = Date.now();
                for (let i = 0; i < 5; i++) {
                    const bx = zone.x + (i * 20 + now * 0.02) % zone.w;
                    const by = zone.y + zone.h - (now * 0.03 + i * 30) % zone.h;
                    ctx.beginPath();
                    ctx.arc(bx, by, 3 + i % 3, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    },

    _drawPlatforms(ctx) {
        for (const obs of this.platforms) {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            if (obs.angle) ctx.rotate((obs.angle * Math.PI) / 180);

            const grad = ctx.createLinearGradient(-obs.w / 2, -obs.h / 2, -obs.w / 2, obs.h / 2);
            grad.addColorStop(0, '#A0522D');
            grad.addColorStop(0.5, '#8B4513');
            grad.addColorStop(1, '#654321');
            ctx.fillStyle = grad;

            const r = 3;
            const x = -obs.w / 2;
            const y = -obs.h / 2;
            const w = obs.w;
            const h = obs.h;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#5C3317';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    },

    _drawBouncePads(ctx) {
        for (const pad of this.bouncePads) {
            ctx.save();
            ctx.translate(pad.x, pad.y);

            const grad = ctx.createLinearGradient(-pad.w / 2, 0, pad.w / 2, 0);
            grad.addColorStop(0, '#00CC66');
            grad.addColorStop(0.5, '#00FF88');
            grad.addColorStop(1, '#00CC66');
            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.moveTo(-pad.w / 2, pad.h / 2);
            ctx.lineTo(-pad.w / 2 - 3, -pad.h / 2);
            ctx.lineTo(pad.w / 2 + 3, -pad.h / 2);
            ctx.lineTo(pad.w / 2, pad.h / 2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#00FF88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const sx = -pad.w / 2 + 8 + i * (pad.w / 4);
                ctx.moveTo(sx, pad.h / 2);
                ctx.lineTo(sx + 3, pad.h / 2 + 6);
                ctx.lineTo(sx + 6, pad.h / 2);
            }
            ctx.stroke();

            ctx.shadowColor = '#00FF88';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-pad.w / 2, -pad.h / 2, pad.w, pad.h);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawStars(ctx) {
        const now = Date.now();
        for (const star of this.stars) {
            if (star.collected) continue;

            ctx.save();
            ctx.translate(star.x, star.y);

            // 旋转动画
            const rotation = (now * 0.002) % (Math.PI * 2);
            ctx.rotate(rotation);

            // 发光
            ctx.shadowColor = '#FFD93D';
            ctx.shadowBlur = 10;

            // 星星形状
            ctx.fillStyle = '#FFD93D';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const innerAngle = angle + Math.PI / 5;
                const outerR = 12;
                const innerR = 5;
                ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
                ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
            }
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawGround(ctx) {
        const groundY = this.LOGICAL_H - 50;
        const levelData = RagdollRobotData.getLevel(this.currentLevel);
        const chapterId = levelData ? levelData.chapter : 'playground';

        let groundColors;
        switch (chapterId) {
            case 'candy': groundColors = ['#FF69B4', '#FF1493', '#C71585']; break;
            case 'space': groundColors = ['#2C3E50', '#1B2631', '#17202A']; break;
            case 'ocean': groundColors = ['#006994', '#004E7C', '#003D5B']; break;
            case 'rainbow': groundColors = ['#9B59B6', '#8E44AD', '#6C3483']; break;
            default: groundColors = ['#2d5016', '#1a3a0a', '#0f2006'];
        }

        const grad = ctx.createLinearGradient(0, groundY, 0, this.LOGICAL_H);
        grad.addColorStop(0, groundColors[0]);
        grad.addColorStop(0.5, groundColors[1]);
        grad.addColorStop(1, groundColors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, groundY, this.LOGICAL_W, 50);

        ctx.strokeStyle = groundColors[0];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= this.LOGICAL_W; x += 10) {
            ctx.lineTo(x, groundY + Math.sin(x * 0.2) * 3);
        }
        ctx.stroke();
    },

    _drawThrowables(ctx) {
        for (const obj of this.throwables) {
            if (obj.launched && !obj.active) continue;

            ctx.save();
            ctx.translate(obj.x, obj.y);

            // 发光效果（未发射的）
            if (!obj.launched) {
                ctx.shadowColor = '#FFD93D';
                ctx.shadowBlur = 12;
            }

            // 绘制emoji
            ctx.font = `${obj.radius * 1.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.emoji, 0, 0);

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawRagdoll(ctx) {
        if (!this.ragdoll) return;
        const rd = this.ragdoll;
        const pts = rd.particles;

        ctx.save();

        // 弹跳发光效果
        if (rd.glowIntensity > 0.1) {
            ctx.shadowColor = '#FF69B4';
            ctx.shadowBlur = rd.glowIntensity * 20;
        }

        // 身体（脖子到臀部）
        ctx.fillStyle = '#4A90D9';
        ctx.beginPath();
        ctx.moveTo(pts[3].x, pts[3].y); // 左肩
        ctx.lineTo(pts[4].x, pts[4].y); // 右肩
        ctx.lineTo(pts[9].x + 6, pts[9].y); // 臀右
        ctx.lineTo(pts[9].x - 6, pts[9].y); // 臀左
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#357ABD';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // 四肢
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // 左臂
        ctx.beginPath();
        ctx.moveTo(pts[3].x, pts[3].y);
        ctx.lineTo(pts[5].x, pts[5].y);
        ctx.lineTo(pts[7].x, pts[7].y);
        ctx.stroke();

        // 右臂
        ctx.beginPath();
        ctx.moveTo(pts[4].x, pts[4].y);
        ctx.lineTo(pts[6].x, pts[6].y);
        ctx.lineTo(pts[8].x, pts[8].y);
        ctx.stroke();

        // 左腿
        ctx.beginPath();
        ctx.moveTo(pts[9].x, pts[9].y);
        ctx.lineTo(pts[10].x, pts[10].y);
        ctx.lineTo(pts[12].x, pts[12].y);
        ctx.stroke();

        // 右腿
        ctx.beginPath();
        ctx.moveTo(pts[9].x, pts[9].y);
        ctx.lineTo(pts[11].x, pts[11].y);
        ctx.lineTo(pts[13].x, pts[13].y);
        ctx.stroke();

        // 手脚圆球
        ctx.fillStyle = '#5DADE2';
        [7, 8, 12, 13].forEach(i => {
            ctx.beginPath();
            ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, Math.PI * 2);
            ctx.fill();
        });

        // 头部（大圆）
        const headX = pts[1].x;
        const headY = pts[1].y;
        const headR = pts[1].r;

        // 头部发光
        if (rd.glowIntensity > 0.1) {
            ctx.shadowColor = '#FF69B4';
            ctx.shadowBlur = rd.glowIntensity * 15;
        }

        ctx.fillStyle = '#5DADE2';
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#357ABD';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // 天线
        ctx.strokeStyle = '#357ABD';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y - headR);
        ctx.stroke();

        // 天线球
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 表情emoji
        const expression = RagdollRobotData.expressions[rd.expression] || '😊';
        ctx.font = `${headR * 1.3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(expression, headX, headY);

        ctx.restore();
    },

    _drawDragArrow(ctx) {
        if (!this.dragTarget) return;

        const obj = this.dragTarget;
        const dx = obj.x - this.dragStartX;
        const dy = obj.y - this.dragStartY;
        const dist = Math.hypot(dx, dy);

        if (dist < 15) return;

        // 虚线从起点到当前位置
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 217, 61, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(this.dragStartX, this.dragStartY);
        ctx.lineTo(obj.x, obj.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // 箭头
        const angle = Math.atan2(dy, dx);
        const arrowLen = 10;
        ctx.fillStyle = 'rgba(255, 217, 61, 0.8)';
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x - arrowLen * Math.cos(angle - 0.3), obj.y - arrowLen * Math.sin(angle - 0.3));
        ctx.lineTo(obj.x - arrowLen * Math.cos(angle + 0.3), obj.y - arrowLen * Math.sin(angle + 0.3));
        ctx.closePath();
        ctx.fill();

        // 力度指示
        const power = Math.min(dist * 0.15, 15);
        const powerPercent = Math.round((power / 15) * 100);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${powerPercent}%`, (this.dragStartX + obj.x) / 2, (this.dragStartY + obj.y) / 2 - 10);

        ctx.restore();
    },

    _drawParticles(ctx) {
        for (const p of this.activeParticles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            const sz = p.size * p.life;

            if (p.shape === 'star') {
                // 五角星
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
                    const ia = a + Math.PI / 5;
                    ctx.lineTo(p.x + Math.cos(a) * sz, p.y + Math.sin(a) * sz);
                    ctx.lineTo(p.x + Math.cos(ia) * sz * 0.4, p.y + Math.sin(ia) * sz * 0.4);
                }
                ctx.closePath();
                ctx.fill();
            } else if (p.shape === 'spark') {
                // 十字闪光
                ctx.lineWidth = Math.max(1, sz * 0.3);
                ctx.strokeStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(p.x - sz, p.y);
                ctx.lineTo(p.x + sz, p.y);
                ctx.moveTo(p.x, p.y - sz);
                ctx.lineTo(p.x, p.y + sz);
                ctx.stroke();
            } else {
                // 默认圆形
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    },

    _drawFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    },

    _drawScore(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(5, 5, 120, 28);

        ctx.fillStyle = '#FFD93D';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⭐ ${this.starsCollected.length}/${this.stars.length}  🏆 ${this.score}`, 12, 19);
        ctx.restore();
    },

    // ==================== UI工具 ====================

    _updateUI() {
        const throwsEl = document.getElementById('rr-throws-left');
        if (throwsEl) throwsEl.textContent = this.throwsLeft;

        const levelNumEl = document.getElementById('rr-level-num');
        if (levelNumEl) levelNumEl.textContent = this.currentLevel;
    },

    _showHint(hintKey) {
        const hintEl = document.getElementById('rr-hint');
        if (!hintEl) return;

        const t = typeof I18n !== 'undefined' ? I18n.t(hintKey, '') : '';
        if (t) {
            hintEl.textContent = '💡 ' + t;
            hintEl.classList.remove('hidden');
            setTimeout(() => hintEl.classList.add('rr-hint-fade'), 3000);
            setTimeout(() => hintEl.classList.add('hidden'), 4000);
        }
    },

    resetLevel() {
        this.stopGame();
        this.startLevel(this.currentLevel);
    },

    backToChapters() {
        this.stopGame();
        this.showChapterSelect();
    },

    backToLevels() {
        this.stopGame();
        const levelData = RagdollRobotData.getLevel(this.currentLevel);
        if (levelData) {
            this.showLevelSelect(levelData.chapter);
        } else {
            this.showChapterSelect();
        }
    }
};

// 全局函数
function showRagdollRobot() {
    RagdollRobot.showModal();
}

function closeRagdollRobot() {
    RagdollRobot.closeModal();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    RagdollRobot.init();
});

// 全局可用
if (typeof window !== 'undefined') {
    window.RagdollRobot = RagdollRobot;
}
