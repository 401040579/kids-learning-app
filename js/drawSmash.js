/**
 * 画线砸怪兽 - Draw to Smash Game Module
 * 物理画线解谜游戏：画出形状，利用重力砸中目标怪物
 */

const DrawSmash = {
    // 状态
    canvas: null,
    ctx: null,
    isDrawing: false,
    isSimulating: false,
    currentLevel: 1,
    maxUnlockedLevel: 1,
    inkUsed: 0,
    drawPoints: [],
    drawnBodies: [],       // 已画好的物理实体
    activeParticles: [],   // 碰撞/消灭粒子效果
    targets: [],
    obstacles: [],
    bouncePads: [],
    destroyedTargets: [],
    animationFrame: null,
    levelComplete: false,
    levelFailed: false,
    canvasScale: 1,
    dpr: 1,
    totalStars: 0,
    levelStars: {},        // { levelId: stars }

    // 物理常量
    GRAVITY: 0.4,
    DAMPING: 0.999,       // 空气阻力（接近1=几乎无阻力）
    BOUNCE: 0.35,         // 弹跳系数
    SURFACE_FRICTION: 0.85, // 表面摩擦
    CONSTRAINT_ITERS: 8,  // 约束迭代次数（越多越刚性）
    COLLISION_ITERS: 3,   // 碰撞迭代次数
    BOUNCE_PAD_MULTIPLIER: 1.8,
    LINE_WIDTH: 6,
    MIN_DRAW_DIST: 4,

    // 逻辑坐标
    LOGICAL_W: 400,
    LOGICAL_H: 600,

    /**
     * 初始化
     */
    init() {
        this.loadProgress();
    },

    /**
     * 加载进度
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('kidsDrawSmash');
            if (saved) {
                const data = JSON.parse(saved);
                this.maxUnlockedLevel = data.maxUnlockedLevel || 1;
                this.levelStars = data.levelStars || {};
                this.totalStars = data.totalStars || 0;
            }
        } catch (e) {
            console.error('加载画线砸怪兽数据失败:', e);
        }
    },

    /**
     * 保存进度
     */
    saveProgress() {
        try {
            const data = {
                maxUnlockedLevel: this.maxUnlockedLevel,
                levelStars: this.levelStars,
                totalStars: this.totalStars
            };
            safeSetItem('kidsDrawSmash', JSON.stringify(data));
        } catch (e) {
            console.error('保存画线砸怪兽数据失败:', e);
        }
    },

    /**
     * 显示模态框
     */
    showModal() {
        const modal = document.getElementById('draw-smash-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.showChapterSelect();
            if (typeof addToRecentlyUsed === 'function') {
                addToRecentlyUsed('drawSmash');
            }
            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('draw_smash', 'open');
            }
        }
    },

    /**
     * 关闭模态框
     */
    closeModal() {
        this.stopSimulation();
        const modal = document.getElementById('draw-smash-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // ==================== UI 界面 ====================

    /**
     * 显示章节选择
     */
    showChapterSelect() {
        this._showScreen('draw-smash-chapters');
        const container = document.getElementById('draw-smash-chapter-cards');
        const totalStarsEl = document.getElementById('draw-smash-total-stars');
        const totalLevelsEl = document.getElementById('draw-smash-total-levels');

        if (totalStarsEl) totalStarsEl.textContent = this.totalStars;
        const completedLevels = Object.keys(this.levelStars).length;
        if (totalLevelsEl) totalLevelsEl.textContent = `${completedLevels}/${DrawSmashData.getTotalLevels()}`;

        if (!container) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;

        container.innerHTML = DrawSmashData.chapters.map((ch, idx) => {
            const levels = ch.levels;
            const completedInChapter = levels.filter(id => this.levelStars[id]).length;
            const starsInChapter = levels.reduce((sum, id) => sum + (this.levelStars[id] || 0), 0);
            const maxStarsInChapter = levels.length * 3;
            const firstLevel = levels[0];
            const isUnlocked = firstLevel <= this.maxUnlockedLevel;

            return `
                <div class="ds-chapter-card ${isUnlocked ? '' : 'ds-locked'}"
                     style="--ch-color: ${ch.color}"
                     onclick="${isUnlocked ? `DrawSmash.showLevelSelect('${ch.id}')` : ''}">
                    <div class="ds-chapter-icon">${ch.icon}</div>
                    <div class="ds-chapter-info">
                        <div class="ds-chapter-name">${t(ch.nameKey, ch.id)}</div>
                        <div class="ds-chapter-progress">
                            ${isUnlocked ? `
                                <span>⭐ ${starsInChapter}/${maxStarsInChapter}</span>
                                <span>${completedInChapter}/${levels.length}</span>
                            ` : `<span>🔒 ${t('drawSmash.locked', '未解锁')}</span>`}
                        </div>
                    </div>
                    ${!isUnlocked ? '<div class="ds-lock-icon">🔒</div>' : ''}
                </div>
            `;
        }).join('');
    },

    /**
     * 显示关卡选择
     */
    showLevelSelect(chapterId) {
        this._showScreen('draw-smash-levels');
        const container = document.getElementById('draw-smash-level-grid');
        const titleEl = document.getElementById('draw-smash-level-title');

        const chapter = DrawSmashData.chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;
        if (titleEl) titleEl.textContent = `${chapter.icon} ${t(chapter.nameKey, chapterId)}`;

        if (!container) return;
        container.innerHTML = chapter.levels.map(id => {
            const isUnlocked = id <= this.maxUnlockedLevel;
            const stars = this.levelStars[id] || 0;

            return `
                <div class="ds-level-btn ${isUnlocked ? '' : 'ds-locked'} ${stars > 0 ? 'ds-completed' : ''}"
                     onclick="${isUnlocked ? `DrawSmash.startLevel(${id})` : ''}">
                    <div class="ds-level-num">${isUnlocked ? id : '🔒'}</div>
                    <div class="ds-level-stars">
                        ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 切换显示屏幕
     */
    _showScreen(screenId) {
        ['draw-smash-chapters', 'draw-smash-levels', 'draw-smash-game', 'draw-smash-result']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', id !== screenId);
            });
    },

    // ==================== 游戏核心 ====================

    /**
     * 开始关卡
     */
    startLevel(levelId) {
        const levelData = DrawSmashData.getLevel(levelId);
        if (!levelData) return;

        this.currentLevel = levelId;
        this.levelComplete = false;
        this.levelFailed = false;
        this.inkUsed = 0;
        this.drawPoints = [];
        this.drawnBodies = [];
        this.activeParticles = [];
        this.destroyedTargets = [];
        this.isDrawing = false;
        this.isSimulating = false;

        // 复制关卡数据
        this.targets = levelData.targets.map(t => ({ ...t, alive: true }));
        this.obstacles = (levelData.obstacles || []).map(o => ({ ...o }));
        this.bouncePads = (levelData.bouncePads || []).map(b => ({ ...b }));
        this.drawArea = { ...levelData.drawArea };
        this.maxInk = levelData.ink;

        this._showScreen('draw-smash-game');
        this._setupCanvas();
        this._showHint(levelData.hintKey);

        // 更新关卡信息
        const levelNumEl = document.getElementById('ds-level-num');
        if (levelNumEl) levelNumEl.textContent = levelId;

        this._updateInkBar();

        if (typeof Analytics !== 'undefined') {
            Analytics.sendEvent('draw_smash', 'start_level', `level_${levelId}`);
        }
    },

    /**
     * 设置画布
     */
    _setupCanvas() {
        this.canvas = document.getElementById('ds-canvas');
        if (!this.canvas) return;

        const container = this.canvas.parentElement;

        // 等待一帧让 flexbox 布局完成后再测量
        requestAnimationFrame(() => {
            this._initCanvasSize();
        });
    },

    _initCanvasSize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // 保持 400x600 的逻辑比例
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

        // 渲染关卡
        this._renderLevel();
    },

    /**
     * 屏幕坐标 -> 逻辑坐标
     */
    _toLogical(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / this.canvasScale,
            y: (e.clientY - rect.top) / this.canvasScale
        };
    },

    /**
     * 判断点是否在绘画区域内
     */
    _inDrawArea(x, y) {
        const a = this.drawArea;
        return x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h;
    },

    // ==================== 绘画输入 ====================

    _onPointerDown(e) {
        if (this.isSimulating || this.levelComplete || this.levelFailed) return;
        const pt = this._toLogical(e);
        if (!this._inDrawArea(pt.x, pt.y)) return;

        this.isDrawing = true;
        this.drawPoints = [pt];
        this._renderLevel();
    },

    _onPointerMove(e) {
        if (!this.isDrawing) return;
        const pt = this._toLogical(e);

        // 限制在绘画区域内（允许小幅超出）
        pt.x = Math.max(this.drawArea.x - 5, Math.min(this.drawArea.x + this.drawArea.w + 5, pt.x));
        pt.y = Math.max(this.drawArea.y - 5, Math.min(this.drawArea.y + this.drawArea.h + 5, pt.y));

        const last = this.drawPoints[this.drawPoints.length - 1];
        const dist = Math.hypot(pt.x - last.x, pt.y - last.y);

        if (dist >= this.MIN_DRAW_DIST) {
            // 检查墨水
            this.inkUsed += dist;
            const inkPercent = (this.inkUsed / (this.maxInk * 3)) * 100;
            if (inkPercent > 100) {
                // 墨水用完，自动释放
                this._onPointerUp(e);
                return;
            }

            this.drawPoints.push(pt);
            this._updateInkBar();
            this._renderLevel();
        }
    },

    _onPointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.drawPoints.length >= 3) {
            // 创建物理实体
            this._createBody(this.drawPoints);
            this.drawPoints = [];
            // 开始物理模拟
            this._startSimulation();
        } else {
            this.drawPoints = [];
            this._renderLevel();
        }
    },

    // ==================== 物理引擎 ====================

    /**
     * 从绘制路径创建物理实体 (Verlet 粒子+距离约束)
     */
    _createBody(points) {
        const r = this.LINE_WIDTH / 2 + 2;

        // 创建 Verlet 粒子（每个点有当前位置和上一帧位置）
        const particles = [];
        for (let i = 0; i < points.length; i++) {
            particles.push({
                x: points[i].x,
                y: points[i].y,
                ox: points[i].x,   // old x (verlet 前一帧)
                oy: points[i].y,   // old y
                r: r
            });
        }

        // 创建距离约束（相邻粒子之间 + 跨粒子增加刚性）
        const constraints = [];
        for (let i = 0; i < particles.length - 1; i++) {
            const dx = particles[i + 1].x - particles[i].x;
            const dy = particles[i + 1].y - particles[i].y;
            constraints.push({
                a: i, b: i + 1,
                dist: Math.hypot(dx, dy)
            });
        }
        // 跨2个粒子的约束，增加刚性（防止过度弯曲）
        for (let i = 0; i < particles.length - 2; i++) {
            const dx = particles[i + 2].x - particles[i].x;
            const dy = particles[i + 2].y - particles[i].y;
            constraints.push({
                a: i, b: i + 2,
                dist: Math.hypot(dx, dy)
            });
        }
        // 跨4个粒子的约束，进一步增加刚性
        for (let i = 0; i < particles.length - 4; i += 2) {
            const dx = particles[i + 4].x - particles[i].x;
            const dy = particles[i + 4].y - particles[i].y;
            constraints.push({
                a: i, b: i + 4,
                dist: Math.hypot(dx, dy)
            });
        }

        const body = {
            particles: particles,
            constraints: constraints,
            settled: false,
            settleCount: 0,
            active: true
        };

        this.drawnBodies.push(body);
    },

    /**
     * 开始物理模拟
     */
    _startSimulation() {
        if (this.isSimulating) return;
        this.isSimulating = true;
        this._simulationLoop();
    },

    /**
     * 停止模拟
     */
    stopSimulation() {
        this.isSimulating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },

    /**
     * 物理模拟循环
     */
    _simulationLoop() {
        if (!this.isSimulating) return;

        this._physicsTick();
        this._renderLevel();
        this._checkWinLose();

        if (this.isSimulating) {
            this.animationFrame = requestAnimationFrame(() => this._simulationLoop());
        }
    },

    /**
     * 物理步进 - Verlet Integration + 距离约束
     */
    _physicsTick() {
        for (const body of this.drawnBodies) {
            if (!body.active || body.settled) continue;

            // 1. Verlet 积分：每个粒子独立运动
            for (const p of body.particles) {
                const vx = (p.x - p.ox) * this.DAMPING;
                const vy = (p.y - p.oy) * this.DAMPING;

                p.ox = p.x;
                p.oy = p.y;

                p.x += vx;
                p.y += vy + this.GRAVITY; // 重力
            }

            // 2. 约束求解 + 碰撞检测（多次迭代使形状刚性）
            for (let iter = 0; iter < this.CONSTRAINT_ITERS; iter++) {
                // 距离约束
                this._solveConstraints(body);

                // 碰撞检测（每次迭代都做，让粒子不穿透）
                if (iter < this.COLLISION_ITERS || iter === this.CONSTRAINT_ITERS - 1) {
                    this._collideParticles(body);
                }
            }

            // 3. 检测目标命中
            this._collideWithTargets(body);

            // 4. 判断是否静止
            let totalMotion = 0;
            for (const p of body.particles) {
                totalMotion += Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy);
            }
            const avgMotion = totalMotion / body.particles.length;

            if (avgMotion < 0.15) {
                body.settleCount++;
                if (body.settleCount > 90) {
                    body.settled = true;
                }
            } else {
                body.settleCount = 0;
            }

            // 超出画布底部
            const avgY = body.particles.reduce((s, p) => s + p.y, 0) / body.particles.length;
            if (avgY > this.LOGICAL_H + 100) {
                body.active = false;
            }
        }

        // 更新粒子效果
        this._updateParticles();
    },

    /**
     * 求解距离约束 - 保持形状刚性
     */
    _solveConstraints(body) {
        for (const c of body.constraints) {
            const pa = body.particles[c.a];
            const pb = body.particles[c.b];

            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const currentDist = Math.hypot(dx, dy);

            if (currentDist < 0.001) continue;

            const diff = (currentDist - c.dist) / currentDist;
            const moveX = dx * diff * 0.5;
            const moveY = dy * diff * 0.5;

            pa.x += moveX;
            pa.y += moveY;
            pb.x -= moveX;
            pb.y -= moveY;
        }
    },

    /**
     * 粒子碰撞检测 - 每个粒子独立碰撞
     */
    _collideParticles(body) {
        const groundY = this.LOGICAL_H - 50;

        for (const p of body.particles) {
            // 地面碰撞
            if (p.y + p.r > groundY) {
                const vy = p.y - p.oy;
                p.y = groundY - p.r;
                // 弹跳：反转 y 速度（通过修改 oy）
                p.oy = p.y + vy * this.BOUNCE;
                // 摩擦
                p.ox = p.x - (p.x - p.ox) * this.SURFACE_FRICTION;
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

            // 障碍物碰撞
            for (const obs of this.obstacles) {
                this._collideParticleWithRect(p, obs);
            }

            // 弹跳垫碰撞
            for (const pad of this.bouncePads) {
                this._collideParticleWithBouncePad(p, pad);
            }
        }
    },

    /**
     * 单个粒子与矩形障碍物碰撞
     */
    _collideParticleWithRect(p, obs) {
        // 处理旋转的矩形：将粒子转换到障碍物本地坐标
        const angle = (obs.angle || 0) * Math.PI / 180;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        // 转换到本地坐标
        const localX = cosA * (p.x - obs.x) - sinA * (p.y - obs.y);
        const localY = sinA * (p.x - obs.x) + cosA * (p.y - obs.y);

        const halfW = obs.w / 2;
        const halfH = obs.h / 2;

        // 找到矩形上最近的点（本地坐标）
        const closestX = Math.max(-halfW, Math.min(localX, halfW));
        const closestY = Math.max(-halfH, Math.min(localY, halfH));

        const dx = localX - closestX;
        const dy = localY - closestY;
        const dist = Math.hypot(dx, dy);

        if (dist < p.r && dist > 0.001) {
            const overlap = p.r - dist;

            // 本地法线
            const lnx = dx / dist;
            const lny = dy / dist;

            // 转换法线回世界坐标
            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);
            const wnx = cosB * lnx - sinB * lny;
            const wny = sinB * lnx + cosB * lny;

            // 推出障碍物
            p.x += wnx * overlap;
            p.y += wny * overlap;

            // 计算速度 (verlet 隐含)
            const vx = p.x - p.ox;
            const vy = p.y - p.oy;

            // 速度在法线方向的分量
            const velNormal = vx * wnx + vy * wny;

            if (velNormal < 0) {
                // 反弹：移除法线方向速度并反转一部分
                p.ox = p.x + (vx - wnx * velNormal * (1 + this.BOUNCE));
                p.oy = p.y + (vy - wny * velNormal * (1 + this.BOUNCE));

                // 切线方向摩擦
                const tx = -wny;
                const ty = wnx;
                const velTangent = vx * tx + vy * ty;
                p.ox += tx * velTangent * (1 - this.SURFACE_FRICTION);
                p.oy += ty * velTangent * (1 - this.SURFACE_FRICTION);
            }
        } else if (dist === 0 && localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
            // 粒子完全在矩形内部 -> 推到最近的边
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

            // 转换回世界坐标
            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);
            p.x = obs.x + cosB * (localX + pushLX) - sinB * (localY + pushLY);
            p.y = obs.y + sinB * (localX + pushLX) + cosB * (localY + pushLY);
            // 停止速度
            p.ox = p.x;
            p.oy = p.y;
        }
    },

    /**
     * 单个粒子与弹跳垫碰撞
     */
    _collideParticleWithBouncePad(p, pad) {
        const px = pad.x - pad.w / 2;
        const py = pad.y - pad.h / 2;

        const closestX = Math.max(px, Math.min(p.x, px + pad.w));
        const closestY = Math.max(py, Math.min(p.y, py + pad.h));
        const dx = p.x - closestX;
        const dy = p.y - closestY;
        const dist = Math.hypot(dx, dy);

        // 只在粒子向下移动时弹跳
        const vy = p.y - p.oy;
        if (dist < p.r && vy > 0.5) {
            const overlap = p.r - dist;

            // 推出
            if (dist > 0) {
                p.x += (dx / dist) * overlap;
                p.y += (dy / dist) * overlap;
            } else {
                p.y -= overlap;
            }

            // 超级弹跳! 通过设置 oy 来给予向上速度
            const bouncePower = (pad.power || this.BOUNCE_PAD_MULTIPLIER);
            const bounceVel = Math.max(vy * bouncePower, 6);
            p.oy = p.y + bounceVel;

            // 只触发一次粒子效果（标记防重复）
            if (!pad._bounced || Date.now() - pad._bounced > 100) {
                pad._bounced = Date.now();
                this._spawnParticles(pad.x, pad.y, '#00FF88', 8);
                if (typeof RewardSystem !== 'undefined') {
                    RewardSystem.playSound('click');
                }
            }
        }
    },

    /**
     * 碰撞检测 - 目标怪物
     */
    _collideWithTargets(body) {
        for (const target of this.targets) {
            if (!target.alive) continue;

            for (const p of body.particles) {
                const dist = Math.hypot(p.x - target.x, p.y - target.y);
                if (dist < p.r + target.size / 2) {
                    // 命中！
                    target.alive = false;
                    this.destroyedTargets.push(target);

                    // 爆炸效果
                    this._spawnParticles(target.x, target.y, '#FFD700', 15);
                    this._spawnEmojiParticles(target.x, target.y, target.emoji);

                    if (typeof RewardSystem !== 'undefined') {
                        RewardSystem.playSound('correct');
                    }
                    break;
                }
            }
        }
    },

    // ==================== 粒子效果 ====================

    _spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            this.activeParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                color: color,
                size: 3 + Math.random() * 4,
                type: 'circle'
            });
        }
    },

    _spawnEmojiParticles(x, y, emoji) {
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i;
            const speed = 2 + Math.random() * 3;
            this.activeParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                life: 1,
                decay: 0.015,
                emoji: emoji,
                size: 20,
                type: 'emoji'
            });
        }
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

    // ==================== 胜负判定 ====================

    _checkWinLose() {
        // 已经判定过结果，跳过
        if (this.levelComplete || this.levelFailed) return;

        const allDead = this.targets.every(t => !t.alive);
        const allSettled = this.drawnBodies.every(b => b.settled || !b.active);

        if (allDead) {
            // 通关！继续模拟动画让玩家看到爆炸效果，2.5秒后显示结果
            this.levelComplete = true;
            setTimeout(() => {
                this.isSimulating = false;
                this._showResult(true);
            }, 2500);
            return;
        }

        if (allSettled && !allDead) {
            // 还有存活目标但所有物体已静止
            this.isSimulating = false;
            // 允许继续画（如果还有墨水）
            const inkPercent = (this.inkUsed / (this.maxInk * 3)) * 100;
            if (inkPercent >= 100) {
                // 墨水用完，失败
                this.levelFailed = true;
                setTimeout(() => this._showResult(false), 500);
            }
            // 否则玩家可以继续画
        }
    },

    /**
     * 显示结果
     */
    _showResult(success) {
        this._showScreen('draw-smash-result');

        const resultEl = document.getElementById('draw-smash-result');
        if (!resultEl) return;

        const t = (key, fallback) => typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;

        if (success) {
            // 计算星星
            const inkPercent = 100 - (this.inkUsed / (this.maxInk * 3)) * 100;
            const levelData = DrawSmashData.getLevel(this.currentLevel);
            let stars = 0;
            if (levelData) {
                if (inkPercent >= levelData.stars[0]) stars = 3;
                else if (inkPercent >= levelData.stars[1]) stars = 2;
                else stars = 1;
            }

            // 更新记录
            const prevStars = this.levelStars[this.currentLevel] || 0;
            if (stars > prevStars) {
                this.totalStars += (stars - prevStars);
                this.levelStars[this.currentLevel] = stars;
            }

            // 解锁下一关
            if (this.currentLevel >= this.maxUnlockedLevel) {
                this.maxUnlockedLevel = Math.min(this.currentLevel + 1, DrawSmashData.getTotalLevels());
            }
            this.saveProgress();

            const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
            const points = stars * 10;

            resultEl.innerHTML = `
                <div class="ds-result-content ds-success">
                    <div class="ds-result-emoji">🎉</div>
                    <h2>${t('drawSmash.levelClear', '关卡通过!')}</h2>
                    <div class="ds-result-stars">${starDisplay}</div>
                    <div class="ds-result-info">
                        <span>${t('drawSmash.level', '关卡')} ${this.currentLevel}</span>
                        <span>+${points} ${t('drawSmash.points', '分')}</span>
                    </div>
                    <div class="ds-result-btns">
                        ${this.currentLevel < DrawSmashData.getTotalLevels() ? `
                            <button class="ds-btn ds-btn-primary" onclick="DrawSmash.startLevel(${this.currentLevel + 1})">
                                ${t('drawSmash.nextLevel', '下一关')} ▶
                            </button>
                        ` : ''}
                        <button class="ds-btn ds-btn-secondary" onclick="DrawSmash.startLevel(${this.currentLevel})">
                            ${t('drawSmash.retry', '重玩')} 🔄
                        </button>
                        <button class="ds-btn ds-btn-outline" onclick="DrawSmash.showChapterSelect()">
                            ${t('drawSmash.backToChapters', '返回章节')}
                        </button>
                    </div>
                </div>
            `;

            // 奖励
            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('win');
                RewardSystem.addPoints(points);
            }

            if (typeof Analytics !== 'undefined') {
                Analytics.sendEvent('draw_smash', 'level_complete', `level_${this.currentLevel}`, stars);
            }

        } else {
            resultEl.innerHTML = `
                <div class="ds-result-content ds-fail">
                    <div class="ds-result-emoji">😅</div>
                    <h2>${t('drawSmash.levelFail', '再试试!')}</h2>
                    <p class="ds-result-tip">${t('drawSmash.failTip', '换个方式画试试看?')}</p>
                    <div class="ds-result-btns">
                        <button class="ds-btn ds-btn-primary" onclick="DrawSmash.startLevel(${this.currentLevel})">
                            ${t('drawSmash.retry', '重玩')} 🔄
                        </button>
                        <button class="ds-btn ds-btn-outline" onclick="DrawSmash.showChapterSelect()">
                            ${t('drawSmash.backToChapters', '返回章节')}
                        </button>
                    </div>
                </div>
            `;

            if (typeof RewardSystem !== 'undefined') {
                RewardSystem.playSound('wrong');
            }
        }
    },

    // ==================== 渲染 ====================

    /**
     * 完整渲染一帧
     */
    _renderLevel() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const s = this.canvasScale;

        // 清空画布
        ctx.clearRect(0, 0, this.LOGICAL_W * s, this.LOGICAL_H * s);
        ctx.save();
        ctx.scale(s, s);

        // 背景
        this._drawBackground(ctx);

        // 绘画区域
        this._drawDrawArea(ctx);

        // 障碍物
        this._drawObstacles(ctx);

        // 弹跳垫
        this._drawBouncePads(ctx);

        // 目标怪物
        this._drawTargets(ctx);

        // 地面
        this._drawGround(ctx);

        // 已画实体
        this._drawBodies(ctx);

        // 当前正在画的线
        if (this.isDrawing && this.drawPoints.length > 1) {
            this._drawCurrentStroke(ctx);
        }

        // 粒子效果
        this._drawParticles(ctx);

        ctx.restore();
    },

    _drawBackground(ctx) {
        // 渐变背景
        const grad = ctx.createLinearGradient(0, 0, 0, this.LOGICAL_H);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(0.5, '#16213e');
        grad.addColorStop(1, '#0f3460');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.LOGICAL_W, this.LOGICAL_H);

        // 星星装饰
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const seed = this.currentLevel * 7;
        for (let i = 0; i < 20; i++) {
            const sx = ((seed + i * 37) % 400);
            const sy = ((seed + i * 53) % 600);
            const size = 1 + (i % 3);
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawDrawArea(ctx) {
        const a = this.drawArea;
        // 虚线边框
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(a.x, a.y, a.w, a.h);
        ctx.setLineDash([]);

        // 半透明填充
        ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
        ctx.fillRect(a.x, a.y, a.w, a.h);

        // 标签
        if (!this.isSimulating && this.drawnBodies.length === 0) {
            ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            const t = typeof I18n !== 'undefined' ? I18n.t('drawSmash.drawHere', '在这里画') : '在这里画';
            ctx.fillText(`✏️ ${t}`, a.x + a.w / 2, a.y + a.h / 2);
        }
    },

    _drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            if (obs.angle) ctx.rotate((obs.angle * Math.PI) / 180);

            // 木板纹理
            const grad = ctx.createLinearGradient(-obs.w / 2, -obs.h / 2, -obs.w / 2, obs.h / 2);
            grad.addColorStop(0, '#A0522D');
            grad.addColorStop(0.5, '#8B4513');
            grad.addColorStop(1, '#654321');
            ctx.fillStyle = grad;

            ctx.beginPath();
            const r = 3;
            const x = -obs.w / 2;
            const y = -obs.h / 2;
            const w = obs.w;
            const h = obs.h;
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

            // 边框
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

            // 弹跳垫主体
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

            // 弹簧线
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

            // 发光效果
            ctx.shadowColor = '#00FF88';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-pad.w / 2, -pad.h / 2, pad.w, pad.h);
            ctx.shadowBlur = 0;

            ctx.restore();
        }
    },

    _drawTargets(ctx) {
        const now = Date.now();
        for (const target of this.targets) {
            if (!target.alive) continue;

            // 轻微浮动动画
            const floatY = Math.sin(now / 500 + target.x) * 3;

            ctx.save();
            ctx.translate(target.x, target.y + floatY);

            // 光晕
            ctx.shadowColor = '#FF4444';
            ctx.shadowBlur = 12;

            // 怪物 emoji
            ctx.font = `${target.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(target.emoji, 0, 0);

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawGround(ctx) {
        const groundY = this.LOGICAL_H - 50;

        // 草地
        const grad = ctx.createLinearGradient(0, groundY, 0, this.LOGICAL_H);
        grad.addColorStop(0, '#2d5016');
        grad.addColorStop(0.3, '#1a3a0a');
        grad.addColorStop(1, '#0f2006');
        ctx.fillStyle = grad;
        ctx.fillRect(0, groundY, this.LOGICAL_W, 50);

        // 草地顶部线条
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= this.LOGICAL_W; x += 10) {
            ctx.lineTo(x, groundY + Math.sin(x * 0.2) * 3);
        }
        ctx.stroke();
    },

    _drawBodies(ctx) {
        for (const body of this.drawnBodies) {
            if (!body.active) continue;

            ctx.save();
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = this.LINE_WIDTH;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#00BFFF';
            ctx.shadowBlur = 6;

            // 画出路径（基于当前粒子位置）
            const pts = body.particles;
            if (pts.length > 1) {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    _drawCurrentStroke(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
        ctx.lineWidth = this.LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([8, 4]);

        ctx.beginPath();
        ctx.moveTo(this.drawPoints[0].x, this.drawPoints[0].y);
        for (let i = 1; i < this.drawPoints.length; i++) {
            ctx.lineTo(this.drawPoints[i].x, this.drawPoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    _drawParticles(ctx) {
        for (const p of this.activeParticles) {
            ctx.save();
            ctx.globalAlpha = p.life;

            if (p.type === 'emoji') {
                ctx.font = `${p.size * p.life}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.emoji, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    // ==================== 工具方法 ====================

    /**
     * 更新墨水条
     */
    _updateInkBar() {
        const bar = document.getElementById('ds-ink-fill');
        const text = document.getElementById('ds-ink-text');
        if (!bar || !text) return;

        const percent = Math.max(0, 100 - (this.inkUsed / (this.maxInk * 3)) * 100);
        bar.style.width = percent + '%';

        if (percent > 50) {
            bar.style.background = '#00FF88';
        } else if (percent > 20) {
            bar.style.background = '#FFD700';
        } else {
            bar.style.background = '#FF4444';
        }

        text.textContent = Math.round(percent) + '%';
    },

    /**
     * 显示关卡提示
     */
    _showHint(hintKey) {
        const hintEl = document.getElementById('ds-hint');
        if (!hintEl) return;

        const t = typeof I18n !== 'undefined' ? I18n.t(hintKey, '') : '';
        if (t) {
            hintEl.textContent = '💡 ' + t;
            hintEl.classList.remove('hidden');
            setTimeout(() => hintEl.classList.add('ds-hint-fade'), 3000);
            setTimeout(() => hintEl.classList.add('hidden'), 4000);
        }
    },

    /**
     * 重置当前关卡
     */
    resetLevel() {
        this.stopSimulation();
        this.startLevel(this.currentLevel);
    },

    /**
     * 返回章节选择
     */
    backToChapters() {
        this.stopSimulation();
        this.showChapterSelect();
    },

    /**
     * 返回关卡选择
     */
    backToLevels() {
        this.stopSimulation();
        const levelData = DrawSmashData.getLevel(this.currentLevel);
        if (levelData) {
            this.showLevelSelect(levelData.chapter);
        } else {
            this.showChapterSelect();
        }
    }
};

// 全局函数
function showDrawSmash() {
    DrawSmash.showModal();
}

function closeDrawSmash() {
    DrawSmash.closeModal();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    DrawSmash.init();
});

// 全局可用
if (typeof window !== 'undefined') {
    window.DrawSmash = DrawSmash;
}
