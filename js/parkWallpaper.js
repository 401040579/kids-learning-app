// ========== 魔法公园 - 声音互动壁纸 ==========
// 麦克风驱动的梦幻公园场景，适合6-7岁小女孩

const ParkWallpaper = {
  // Canvas 状态
  canvas: null,
  ctx: null,
  animationId: null,
  wakeLock: null,
  time: 0,
  lastTime: 0,

  // 麦克风
  audioCtx: null,
  analyser: null,
  micStream: null,
  micVolume: 0,        // 0~1 当前音量
  micSmooth: 0,        // 平滑后的音量
  micPeak: 0,          // 峰值（用于检测喊叫）
  micSustain: 0,       // 持续发声时间（秒）
  micActive: false,

  // 风系统
  windForce: 0,        // 0~1 风力
  windTarget: 0,
  windDirection: 1,    // 1=右, -1=左
  windGust: 0,         // 阵风额外力

  // 场景元素
  clouds: [],
  trees: [],
  flowers: [],
  butterflies: [],
  dandelionSeeds: [],
  sparkles: [],
  grassBlades: [],
  birds: [],
  raindrops: [],
  fountainDrops: [],
  bikeGirl: null,
  sun: { x: 0, y: 0, radius: 45, glowPhase: 0, tapped: false, tapTime: 0 },
  rainbow: { opacity: 0, targetOpacity: 0 },
  fountain: { x: 0, y: 0, power: 1, tapTime: 0, megaSplash: false },

  // 触摸交互
  touchX: 0,
  touchY: 0,
  lastTapTime: 0,

  // 音效
  soundCtx: null,
  sounds: {},

  // 场景状态
  timeOfDay: 0.3, // 0=夜 0.3=日出 0.5=正午 0.7=黄昏 1=夜
  sceneWidth: 0,
  sceneHeight: 0,

  // ========== 初始化 ==========
  init() {
    // 预留
  },

  // ========== 显示主界面 ==========
  show() {
    const modal = document.getElementById('park-wallpaper-modal');
    if (!modal) return;

    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('parkWallpaper');
    }

    modal.classList.remove('hidden');
    this.renderMain();
  },

  close() {
    const modal = document.getElementById('park-wallpaper-modal');
    if (modal) modal.classList.add('hidden');
    this.stopScene();
  },

  renderMain() {
    const content = document.getElementById('park-wallpaper-content');
    if (!content) return;

    const t = this.t.bind(this);

    content.innerHTML = `
      <div class="pw-main">
        <div class="pw-hero-scene">
          <div class="pw-hero-sky">
            <div class="pw-hero-sun">☀️</div>
            <div class="pw-hero-cloud pw-hc-1">☁️</div>
            <div class="pw-hero-cloud pw-hc-2">🌤️</div>
            <div class="pw-hero-rainbow">🌈</div>
          </div>
          <div class="pw-hero-ground">
            <div class="pw-hero-tree">🌳</div>
            <div class="pw-hero-fountain">⛲</div>
            <div class="pw-hero-bike">🚲</div>
            <div class="pw-hero-flowers">🌸🌺🌷🌻🌼</div>
          </div>
        </div>

        <h2 class="pw-title">🏞️ ${t('park.title', '魔法公园')}</h2>
        <p class="pw-subtitle">${t('park.subtitle', '用你的声音唤醒魔法世界！')}</p>

        <div class="pw-feature-list">
          <div class="pw-feature-item">
            <span class="pw-feat-icon">🎤</span>
            <span class="pw-feat-text">${t('park.feat1', '对着麦克风吹气，风就会起来！')}</span>
          </div>
          <div class="pw-feature-item">
            <span class="pw-feat-icon">🌬️</span>
            <span class="pw-feat-text">${t('park.feat2', '声音越大风越猛，万物都会被吹跑！')}</span>
          </div>
          <div class="pw-feature-item">
            <span class="pw-feat-icon">👆</span>
            <span class="pw-feat-text">${t('park.feat3', '点击太阳、云朵、喷泉有惊喜！')}</span>
          </div>
          <div class="pw-feature-item">
            <span class="pw-feat-icon">🎵</span>
            <span class="pw-feat-text">${t('park.feat4', '持续哼歌会出现彩虹哦~')}</span>
          </div>
        </div>

        <button class="pw-start-btn" onclick="ParkWallpaper.startScene()">
          <span class="pw-start-icon">✨</span>
          <span>${t('park.startBtn', '进入魔法公园')}</span>
          <span class="pw-start-icon">✨</span>
        </button>

        <p class="pw-mic-note">${t('park.micNote', '需要麦克风权限才能互动哦~')}</p>
      </div>
    `;
  },

  t(key, fallback) {
    return (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
  },

  // ========== 全屏场景 ==========
  async startScene() {
    const modal = document.getElementById('pw-fullscreen-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    this.canvas = document.getElementById('pw-fs-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.initScene();
    this.initSoundEngine();
    this.lastTime = performance.now();
    this.animate();
    this.requestFullscreen(modal);
    this.requestWakeLock();

    // 麦克风异步初始化，不阻塞动画
    this.initMicrophone().catch(() => {});

    // 显示/隐藏 HUD
    this.showHUD();

    this._resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this._resizeHandler);

    // 触摸/点击事件
    this.canvas.addEventListener('pointerdown', (e) => this.onTap(e));
  },

  stopScene() {
    const modal = document.getElementById('pw-fullscreen-modal');
    if (modal) modal.classList.add('hidden');

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.stopMicrophone();
    this.releaseWakeLock();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    // 清理
    this.clouds = [];
    this.trees = [];
    this.flowers = [];
    this.butterflies = [];
    this.dandelionSeeds = [];
    this.sparkles = [];
    this.grassBlades = [];
    this.birds = [];
    this.raindrops = [];
    this.fountainDrops = [];
    this.time = 0;
    this.windForce = 0;
    this.micVolume = 0;
    this.micSmooth = 0;
    this.micSustain = 0;
  },

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.sceneWidth = this.canvas.width;
    this.sceneHeight = this.canvas.height;
  },

  requestFullscreen(el) {
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (rfs) rfs.call(el).catch(() => {});
  },

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  },

  async releaseWakeLock() {
    if (this.wakeLock) {
      try { await this.wakeLock.release(); } catch (e) {}
      this.wakeLock = null;
    }
  },

  // ========== 麦克风系统 ==========
  async initMicrophone() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      this.micActive = true;
    } catch (e) {
      console.log('麦克风权限未获取，使用触摸模式');
      this.micActive = false;
    }
  },

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.micActive = false;
  },

  updateMicrophone(dt) {
    if (!this.micActive || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // 计算RMS音量
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length) / 255;

    this.micVolume = rms;
    // 平滑
    this.micSmooth += (this.micVolume - this.micSmooth) * 0.15;
    // 峰值
    this.micPeak = Math.max(this.micPeak * 0.95, this.micVolume);

    // 持续发声检测
    if (this.micVolume > 0.08) {
      this.micSustain += dt;
    } else {
      this.micSustain = Math.max(0, this.micSustain - dt * 2);
    }

    // 音量 → 风力映射（非线性，让效果更夸张）
    let targetWind = 0;
    if (this.micSmooth < 0.05) {
      targetWind = 0;
    } else if (this.micSmooth < 0.15) {
      targetWind = this.micSmooth * 2; // 微风
    } else if (this.micSmooth < 0.35) {
      targetWind = 0.3 + (this.micSmooth - 0.15) * 2.5; // 中风
    } else {
      targetWind = 0.8 + (this.micSmooth - 0.35) * 0.8; // 狂风！
    }
    this.windTarget = Math.min(1, targetWind);

    // 风力平滑变化
    this.windForce += (this.windTarget - this.windForce) * 0.08;

    // 阵风效果（音量突增时）
    if (this.micVolume > this.micPeak * 0.8 && this.micVolume > 0.3) {
      this.windGust = Math.min(1, this.windGust + 0.3);
    } else {
      this.windGust *= 0.95;
    }

    // 持续哼歌 → 彩虹
    if (this.micSustain > 2 && this.micSmooth > 0.06 && this.micSmooth < 0.25) {
      this.rainbow.targetOpacity = Math.min(1, (this.micSustain - 2) / 3);
    } else if (this.micSmooth > 0.4) {
      // 太大声彩虹会被吹走
      this.rainbow.targetOpacity *= 0.98;
    } else {
      this.rainbow.targetOpacity *= 0.99;
    }
  },

  // ========== 音效引擎 ==========
  initSoundEngine() {
    try {
      this.soundCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  },

  playTone(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.soundCtx) return;
    try {
      const osc = this.soundCtx.createOscillator();
      const gain = this.soundCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.soundCtx.currentTime);
      gain.gain.setValueAtTime(volume, this.soundCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.soundCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.soundCtx.destination);
      osc.start();
      osc.stop(this.soundCtx.currentTime + duration);
    } catch (e) {}
  },

  playWindSound() {
    if (!this.soundCtx || this.windForce < 0.2) return;
    // 用噪音模拟风声
    const bufferSize = this.soundCtx.sampleRate * 0.3;
    const buffer = this.soundCtx.createBuffer(1, bufferSize, this.soundCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const source = this.soundCtx.createBufferSource();
    source.buffer = buffer;
    const filter = this.soundCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300 + this.windForce * 600;
    const gain = this.soundCtx.createGain();
    gain.gain.value = this.windForce * 0.08;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.soundCtx.destination);
    source.start();
  },

  playBirdChirp() {
    if (!this.soundCtx) return;
    const freqs = [1200, 1400, 1600, 1800, 1500];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.08, 'sine', 0.06), i * 60);
    });
  },

  playSplash() {
    if (!this.soundCtx) return;
    // 水花声用噪音+滤波
    const bufferSize = this.soundCtx.sampleRate * 0.4;
    const buffer = this.soundCtx.createBuffer(1, bufferSize, this.soundCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp(-i / (bufferSize * 0.15));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const source = this.soundCtx.createBufferSource();
    source.buffer = buffer;
    const filter = this.soundCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;
    const gain = this.soundCtx.createGain();
    gain.gain.value = 0.15;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.soundCtx.destination);
    source.start();
  },

  playBikeBell() {
    if (!this.soundCtx) return;
    [2200, 2600, 2200].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'sine', 0.12), i * 120);
    });
  },

  playMagicChime() {
    if (!this.soundCtx) return;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.4, 'sine', 0.08), i * 80);
    });
  },

  playRainSound() {
    if (!this.soundCtx) return;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => this.playTone(3000 + Math.random() * 3000, 0.05, 'sine', 0.02), i * 30);
    }
  },

  // ========== 场景初始化 ==========
  initScene() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const groundY = h * 0.6;

    // 云朵 (5~8朵)
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      this.clouds.push({
        x: Math.random() * w * 1.5 - w * 0.25,
        y: h * 0.05 + Math.random() * h * 0.25,
        width: 80 + Math.random() * 120,
        height: 40 + Math.random() * 30,
        speed: 0.2 + Math.random() * 0.3,
        puffs: this.generateCloudPuffs(),
        opacity: 0.7 + Math.random() * 0.3,
        raining: false,
        rainTimer: 0
      });
    }

    // 树木
    this.trees = [];
    const treePositions = [w * 0.08, w * 0.22, w * 0.78, w * 0.92];
    treePositions.forEach(x => {
      this.trees.push({
        x: x,
        y: groundY,
        height: 100 + Math.random() * 60,
        width: 50 + Math.random() * 30,
        sway: 0,
        leaves: this.generateLeaves(8 + Math.floor(Math.random() * 6)),
        type: Math.random() > 0.5 ? 'round' : 'triangle'
      });
    });

    // 花朵
    this.flowers = [];
    for (let i = 0; i < 25; i++) {
      this.flowers.push({
        x: Math.random() * w,
        y: groundY + 10 + Math.random() * (h - groundY - 40),
        size: 8 + Math.random() * 10,
        color: this.randomFlowerColor(),
        sway: 0,
        swayPhase: Math.random() * Math.PI * 2,
        petals: 5 + Math.floor(Math.random() * 3),
        stemHeight: 15 + Math.random() * 25
      });
    }

    // 蝴蝶
    this.butterflies = [];
    for (let i = 0; i < 6; i++) {
      this.butterflies.push({
        x: Math.random() * w,
        y: groundY - 20 - Math.random() * 100,
        targetX: Math.random() * w,
        targetY: groundY - 50 - Math.random() * 80,
        wingPhase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
        color1: this.randomButterflyColor(),
        color2: this.randomButterflyColor(),
        size: 8 + Math.random() * 6,
        scattered: false
      });
    }

    // 草地
    this.grassBlades = [];
    for (let i = 0; i < 150; i++) {
      this.grassBlades.push({
        x: Math.random() * w,
        y: groundY + Math.random() * 5,
        height: 10 + Math.random() * 20,
        sway: 0,
        phase: Math.random() * Math.PI * 2,
        color: `hsl(${110 + Math.random() * 30}, ${50 + Math.random() * 30}%, ${35 + Math.random() * 20}%)`
      });
    }

    // 蒲公英种子（待风吹散）
    this.dandelionSeeds = [];

    // 鸟
    this.birds = [];
    for (let i = 0; i < 4; i++) {
      this.birds.push({
        x: Math.random() * w,
        y: h * 0.1 + Math.random() * h * 0.2,
        speed: 1 + Math.random() * 2,
        wingPhase: Math.random() * Math.PI * 2,
        size: 4 + Math.random() * 4,
        chirpTimer: Math.random() * 10
      });
    }

    // 太阳
    this.sun.x = w * 0.82;
    this.sun.y = h * 0.12;
    this.sun.tapped = false;

    // 喷泉
    this.fountain.x = w * 0.5;
    this.fountain.y = groundY + 15;
    this.fountain.power = 1;
    this.fountain.megaSplash = false;
    this.fountainDrops = [];

    // 骑车小女孩
    this.bikeGirl = {
      x: -100,
      y: groundY - 5,
      speed: 1.5,
      direction: 1,
      pedalPhase: 0,
      hairWave: 0,
      ribbonWave: 0,
      wheelPhase: 0,
      visible: true,
      pauseTimer: 0
    };

    // 彩虹
    this.rainbow.opacity = 0;
    this.rainbow.targetOpacity = 0;

    // 亮片
    this.sparkles = [];
    this.raindrops = [];

    // 蒲公英植株（2~3个在地面上）
    this.dandelionPlants = [];
    for (let i = 0; i < 3; i++) {
      this.dandelionPlants.push({
        x: w * 0.3 + i * w * 0.2,
        y: groundY,
        seedCount: 20,
        released: false,
        releasePhase: 0
      });
    }

    // 风铃计时（每隔一定时间播放风声）
    this._windSoundTimer = 0;
    this._birdTimer = 0;
  },

  generateCloudPuffs() {
    const puffs = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      puffs.push({
        offsetX: (i - count / 2) * 25 + Math.random() * 10,
        offsetY: Math.random() * 10 - 5,
        radius: 18 + Math.random() * 15
      });
    }
    return puffs;
  },

  generateLeaves(count) {
    const leaves = [];
    for (let i = 0; i < count; i++) {
      leaves.push({
        angle: (i / count) * Math.PI * 2,
        dist: 15 + Math.random() * 20,
        size: 5 + Math.random() * 8,
        color: `hsl(${100 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${30 + Math.random() * 25}%)`
      });
    }
    return leaves;
  },

  randomFlowerColor() {
    const colors = ['#FF69B4', '#FF85C2', '#FFB6C1', '#DDA0DD', '#EE82EE',
                    '#FF6B9D', '#FF9ED2', '#FFD700', '#FFA07A', '#FF7F50',
                    '#E8A0BF', '#C8A2C8', '#F0E68C', '#FFB347'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  randomButterflyColor() {
    const colors = ['#FF69B4', '#9370DB', '#87CEEB', '#FFD700', '#FF6347',
                    '#98FB98', '#DDA0DD', '#F0E68C', '#FF85C2', '#7FCDCD'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // ========== HUD ==========
  showHUD() {
    const hud = document.getElementById('pw-hud');
    if (hud) hud.classList.remove('hidden');
  },

  // ========== 触摸交互 ==========
  onTap(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.touchX = x;
    this.touchY = y;

    const now = Date.now();

    // 点击太阳？
    const dx = x - this.sun.x;
    const dy = y - this.sun.y;
    if (dx * dx + dy * dy < (this.sun.radius + 20) * (this.sun.radius + 20)) {
      this.onTapSun();
      return;
    }

    // 点击云朵？
    for (const cloud of this.clouds) {
      if (x > cloud.x - cloud.width / 2 && x < cloud.x + cloud.width / 2 &&
          y > cloud.y - cloud.height && y < cloud.y + cloud.height) {
        this.onTapCloud(cloud);
        return;
      }
    }

    // 点击喷泉区域？
    const fx = this.fountain.x;
    const fy = this.fountain.y;
    if (Math.abs(x - fx) < 60 && Math.abs(y - fy) < 80) {
      this.onTapFountain();
      return;
    }

    // 点击骑车女孩？
    if (this.bikeGirl && Math.abs(x - this.bikeGirl.x) < 40 && Math.abs(y - this.bikeGirl.y) < 40) {
      this.onTapBikeGirl();
      return;
    }

    // 点击蒲公英？
    for (const dp of this.dandelionPlants) {
      if (!dp.released && Math.abs(x - dp.x) < 30 && Math.abs(y - dp.y) < 40) {
        this.releaseDandelionSeeds(dp);
        return;
      }
    }

    // 其他地方点击 → 放出亮片
    this.spawnSparkles(x, y, 8);
    this.playMagicChime();
  },

  onTapSun() {
    this.sun.tapped = true;
    this.sun.tapTime = this.time;
    // 太阳爆发光芒 + 彩虹闪现
    this.rainbow.targetOpacity = 1;
    this.spawnSparkles(this.sun.x, this.sun.y, 20);
    this.playMagicChime();

    // 每次点击太阳变换时段
    this.timeOfDay = (this.timeOfDay + 0.25) % 1;
  },

  onTapCloud(cloud) {
    cloud.raining = true;
    cloud.rainTimer = 3; // 下3秒的闪亮雨
    this.playRainSound();

    // 从云朵位置生成闪亮雨滴
    for (let i = 0; i < 20; i++) {
      this.raindrops.push({
        x: cloud.x + (Math.random() - 0.5) * cloud.width,
        y: cloud.y + cloud.height / 2,
        speed: 3 + Math.random() * 4,
        size: 2 + Math.random() * 3,
        sparkle: Math.random() > 0.5,
        life: 1
      });
    }
  },

  onTapFountain() {
    this.fountain.megaSplash = true;
    this.fountain.tapTime = this.time;
    this.fountain.power = 3;
    this.playSplash();

    // 超级水花 + 跳鱼
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI;
      const speed = 4 + Math.random() * 8;
      this.fountainDrops.push({
        x: this.fountain.x,
        y: this.fountain.y - 20,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -speed - Math.random() * 4,
        size: 2 + Math.random() * 4,
        life: 1,
        isFish: i < 3,
        color: i < 3 ? '#FFD700' : `hsl(${190 + Math.random() * 30}, 80%, ${60 + Math.random() * 20}%)`
      });
    }

    // 彩虹水雾效果
    this.spawnSparkles(this.fountain.x, this.fountain.y - 40, 15);
  },

  onTapBikeGirl() {
    // 小女孩响铃！加速！
    this.playBikeBell();
    if (this.bikeGirl) {
      this.bikeGirl.speed = 5; // 暂时加速
      // 放出爱心
      for (let i = 0; i < 5; i++) {
        this.sparkles.push({
          x: this.bikeGirl.x,
          y: this.bikeGirl.y - 30,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          life: 1,
          size: 10 + Math.random() * 8,
          emoji: '💖',
          type: 'emoji'
        });
      }
    }
  },

  releaseDandelionSeeds(plant) {
    if (plant.released) return;
    plant.released = true;
    plant.releasePhase = 0;

    // 生成蒲公英种子
    for (let i = 0; i < plant.seedCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.dandelionSeeds.push({
        x: plant.x,
        y: plant.y - 25,
        vx: Math.cos(angle) * (0.5 + Math.random()),
        vy: -0.5 - Math.random() * 1.5,
        size: 3 + Math.random() * 3,
        life: 1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      });
    }

    this.playTone(800, 0.3, 'sine', 0.06);
  },

  spawnSparkles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        size: 3 + Math.random() * 5,
        color: `hsl(${Math.random() * 360}, 80%, 70%)`,
        type: 'star'
      });
    }
  },

  // ========== 主动画循环 ==========
  animate() {
    if (!this.ctx || !this.canvas) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    // 更新麦克风
    this.updateMicrophone(dt);

    // 更新所有元素
    this.updateWind(dt);
    this.updateClouds(dt);
    this.updateTrees(dt);
    this.updateFlowers(dt);
    this.updateGrass(dt);
    this.updateButterflies(dt);
    this.updateBirds(dt);
    this.updateBikeGirl(dt);
    this.updateFountain(dt);
    this.updateDandelionSeeds(dt);
    this.updateSparkles(dt);
    this.updateRaindrops(dt);
    this.updateRainbow(dt);
    this.updateSounds(dt);

    // 绘制
    this.drawScene();

    // 更新HUD
    this.updateHUD();

    this.animationId = requestAnimationFrame(() => this.animate());
  },

  // ========== 更新逻辑 ==========
  updateWind(dt) {
    // 风向偶尔变化
    if (Math.random() < 0.001) {
      this.windDirection = -this.windDirection;
    }
  },

  updateClouds(dt) {
    const w = this.sceneWidth;
    const effectiveWind = this.windForce + this.windGust * 0.5;

    this.clouds.forEach(cloud => {
      cloud.x += (cloud.speed + effectiveWind * 4) * this.windDirection;
      // 循环
      if (cloud.x > w + cloud.width) cloud.x = -cloud.width;
      if (cloud.x < -cloud.width) cloud.x = w + cloud.width;

      // 下雨倒计时
      if (cloud.raining) {
        cloud.rainTimer -= dt;
        if (cloud.rainTimer <= 0) cloud.raining = false;

        // 持续生成雨滴
        if (Math.random() < 0.3) {
          this.raindrops.push({
            x: cloud.x + (Math.random() - 0.5) * cloud.width,
            y: cloud.y + cloud.height / 2,
            speed: 3 + Math.random() * 4,
            size: 2 + Math.random() * 2,
            sparkle: Math.random() > 0.3,
            life: 1
          });
        }
      }
    });
  },

  updateTrees(dt) {
    const effectiveWind = this.windForce + this.windGust * 0.5;
    this.trees.forEach(tree => {
      const targetSway = effectiveWind * this.windDirection * 25;
      tree.sway += (targetSway - tree.sway) * 0.05;

      // 强风下掉落叶子
      if (effectiveWind > 0.6 && Math.random() < effectiveWind * 0.05) {
        this.sparkles.push({
          x: tree.x + (Math.random() - 0.5) * tree.width,
          y: tree.y - tree.height * 0.6 + Math.random() * 30,
          vx: this.windDirection * (2 + Math.random() * 3),
          vy: 0.5 + Math.random(),
          life: 1,
          size: 5 + Math.random() * 4,
          emoji: Math.random() > 0.5 ? '🍃' : '🌿',
          type: 'emoji',
          spin: Math.random() * 0.2
        });
      }
    });
  },

  updateFlowers(dt) {
    const effectiveWind = this.windForce + this.windGust * 0.3;
    this.flowers.forEach(flower => {
      flower.swayPhase += dt * 2;
      const naturalSway = Math.sin(flower.swayPhase) * 3;
      const windSway = effectiveWind * this.windDirection * 20;
      flower.sway = naturalSway + windSway;

      // 强风吹散花瓣
      if (effectiveWind > 0.7 && Math.random() < 0.02) {
        this.sparkles.push({
          x: flower.x,
          y: flower.y - flower.stemHeight,
          vx: this.windDirection * (1 + Math.random() * 4),
          vy: -0.5 - Math.random() * 2,
          life: 1,
          size: 6,
          emoji: '🌸',
          type: 'emoji',
          spin: Math.random() * 0.1
        });
      }
    });
  },

  updateGrass(dt) {
    const effectiveWind = this.windForce + this.windGust * 0.3;
    this.grassBlades.forEach(blade => {
      blade.phase += dt * 3;
      const naturalSway = Math.sin(blade.phase) * 2;
      const windSway = effectiveWind * this.windDirection * 15;
      blade.sway = naturalSway + windSway;
    });
  },

  updateButterflies(dt) {
    const effectiveWind = this.windForce + this.windGust;
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const groundY = h * 0.6;

    this.butterflies.forEach(bf => {
      bf.wingPhase += dt * 8;

      // 风大时蝴蝶被吹跑
      if (effectiveWind > 0.5) {
        bf.scattered = true;
        bf.x += this.windDirection * effectiveWind * 5;
        bf.y += (Math.random() - 0.5) * 3;
      } else {
        bf.scattered = false;
        // 向目标缓慢飞行
        const dx = bf.targetX - bf.x;
        const dy = bf.targetY - bf.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          bf.x += (dx / dist) * bf.speed;
          bf.y += (dy / dist) * bf.speed;
        } else {
          // 新目标
          bf.targetX = Math.random() * w;
          bf.targetY = groundY - 30 - Math.random() * 100;
        }

        // 加上风的小影响
        bf.x += this.windDirection * effectiveWind * 1;
      }

      // 环绕
      if (bf.x > w + 20) bf.x = -20;
      if (bf.x < -20) bf.x = w + 20;
      if (bf.y < 10) bf.y = 10;
      if (bf.y > groundY - 10) bf.y = groundY - 40;
    });
  },

  updateBirds(dt) {
    const w = this.sceneWidth;
    const effectiveWind = this.windForce + this.windGust;

    this.birds.forEach(bird => {
      bird.wingPhase += dt * 6;
      bird.x += (bird.speed + effectiveWind * 3 * this.windDirection);
      bird.y += Math.sin(this.time * 2 + bird.wingPhase) * 0.3;

      // 循环
      if (bird.x > w + 30) bird.x = -30;
      if (bird.x < -30) bird.x = w + 30;

      // 鸟叫
      bird.chirpTimer -= dt;
      if (bird.chirpTimer <= 0 && this.windForce < 0.3) {
        bird.chirpTimer = 5 + Math.random() * 10;
        if (Math.random() < 0.3) {
          this.playBirdChirp();
        }
      }
    });
  },

  updateBikeGirl(dt) {
    if (!this.bikeGirl) return;
    const bg = this.bikeGirl;
    const w = this.sceneWidth;
    const effectiveWind = this.windForce + this.windGust;

    // 速度恢复
    bg.speed += (1.5 - bg.speed) * 0.02;

    // 风影响速度
    let windBoost = effectiveWind * this.windDirection * 3;
    bg.x += (bg.speed * bg.direction + windBoost);

    bg.pedalPhase += dt * bg.speed * 3;
    bg.wheelPhase += dt * bg.speed * 5;
    bg.hairWave = Math.sin(this.time * 4) * 5 + effectiveWind * this.windDirection * 15;
    bg.ribbonWave = Math.sin(this.time * 5 + 1) * 8 + effectiveWind * this.windDirection * 20;

    // 到达边界则转向（暂停一下）
    if (bg.x > w + 60) {
      bg.direction = -1;
      bg.x = w + 60;
    } else if (bg.x < -60) {
      bg.direction = 1;
      bg.x = -60;
    }
  },

  updateFountain(dt) {
    const effectiveWind = this.windForce + this.windGust;

    // 喷泉力度恢复
    this.fountain.power += (1 - this.fountain.power) * 0.02;

    // 风影响喷泉方向
    const windDrift = effectiveWind * this.windDirection * 3;

    // 持续生成水滴
    if (Math.random() < 0.4) {
      const spread = this.fountain.power;
      for (let i = 0; i < 2; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const speed = 2 + Math.random() * 3 * spread;
        this.fountainDrops.push({
          x: this.fountain.x + (Math.random() - 0.5) * 10,
          y: this.fountain.y - 20,
          vx: Math.cos(angle) * speed + windDrift,
          vy: Math.sin(angle) * speed * 1.5,
          size: 1.5 + Math.random() * 2.5,
          life: 1,
          isFish: false,
          color: `hsl(${195 + Math.random() * 20}, 75%, ${65 + Math.random() * 20}%)`
        });
      }
    }

    // 更新水滴
    this.fountainDrops.forEach(drop => {
      drop.vy += 9.8 * dt; // 重力
      drop.vx += effectiveWind * this.windDirection * 2 * dt;
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.life -= dt * 0.5;

      // 鱼的特殊处理
      if (drop.isFish && drop.vy > 0 && drop.y > this.fountain.y) {
        drop.life = 0; // 落回水中消失
        this.playSplash();
      }
    });

    this.fountainDrops = this.fountainDrops.filter(d => d.life > 0 && d.y < this.sceneHeight);
  },

  updateDandelionSeeds(dt) {
    const effectiveWind = this.windForce + this.windGust;

    this.dandelionSeeds.forEach(seed => {
      seed.wobble += seed.wobbleSpeed;
      seed.vx += effectiveWind * this.windDirection * 2 * dt;
      seed.vy += -0.1 * dt + Math.sin(seed.wobble) * 0.3 * dt; // 轻微上升+摇曳
      seed.vy += 0.3 * dt; // 轻微重力
      seed.x += seed.vx + Math.sin(seed.wobble) * 0.5;
      seed.y += seed.vy;
      seed.life -= dt * 0.08;
    });

    this.dandelionSeeds = this.dandelionSeeds.filter(s =>
      s.life > 0 && s.x > -50 && s.x < this.sceneWidth + 50 && s.y > -50
    );

    // 风大时自动释放蒲公英
    if (effectiveWind > 0.5) {
      this.dandelionPlants.forEach(dp => {
        if (!dp.released) {
          this.releaseDandelionSeeds(dp);
        }
      });
    }
  },

  updateSparkles(dt) {
    this.sparkles.forEach(s => {
      if (s.type === 'emoji') {
        s.vy += 1.5 * dt; // 轻微重力
        s.x += s.vx + (this.windForce * this.windDirection * 2);
        s.y += s.vy;
        if (s.spin) s.vx += s.spin * this.windDirection;
      } else {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 2 * dt;
      }
      s.life -= dt * 0.8;
    });
    this.sparkles = this.sparkles.filter(s => s.life > 0);
  },

  updateRaindrops(dt) {
    const groundY = this.sceneHeight * 0.6;
    this.raindrops.forEach(drop => {
      drop.y += drop.speed;
      drop.x += this.windForce * this.windDirection * 2;
      drop.life -= dt * 0.3;

      if (drop.y > groundY + 30) {
        drop.life = 0;
        // 落地闪光
        if (drop.sparkle) {
          this.sparkles.push({
            x: drop.x, y: groundY + 30,
            vx: (Math.random() - 0.5) * 2, vy: -1,
            life: 0.5, size: 3,
            color: '#87CEEB', type: 'star'
          });
        }
      }
    });
    this.raindrops = this.raindrops.filter(d => d.life > 0);
  },

  updateRainbow(dt) {
    this.rainbow.opacity += (this.rainbow.targetOpacity - this.rainbow.opacity) * 0.02;
    if (this.rainbow.targetOpacity > 0) {
      this.rainbow.targetOpacity -= dt * 0.05;
    }
    if (this.rainbow.opacity < 0.01) this.rainbow.opacity = 0;
  },

  updateSounds(dt) {
    this._windSoundTimer -= dt;
    if (this._windSoundTimer <= 0 && this.windForce > 0.2) {
      this.playWindSound();
      this._windSoundTimer = 0.5;
    }
  },

  // ========== 绘制 ==========
  drawScene() {
    const ctx = this.ctx;
    const w = this.sceneWidth;
    const h = this.sceneHeight;

    this.drawSky(ctx, w, h);
    this.drawSun(ctx, w, h);
    this.drawRainbow(ctx, w, h);
    this.drawClouds(ctx);
    this.drawBirds(ctx);
    this.drawRaindrops(ctx);
    this.drawGround(ctx, w, h);
    this.drawTrees(ctx);
    this.drawFountainBase(ctx);
    this.drawDandelionPlants(ctx);
    this.drawGrass(ctx);
    this.drawFlowers(ctx);
    this.drawFountainDrops(ctx);
    this.drawButterflies(ctx);
    this.drawBikeGirl(ctx);
    this.drawDandelionSeeds(ctx);
    this.drawSparkles(ctx);
    this.drawWindLines(ctx, w, h);
    this.drawMicIndicator(ctx, w, h);
  },

  // --- 天空 ---
  drawSky(ctx, w, h) {
    const t = this.timeOfDay;
    let topColor, bottomColor;

    if (t < 0.25) {
      // 夜->黎明
      const p = t / 0.25;
      topColor = this.lerpColor('#0B1026', '#4A90D9', p);
      bottomColor = this.lerpColor('#1A1A3E', '#FFB347', p);
    } else if (t < 0.5) {
      // 黎明->正午
      const p = (t - 0.25) / 0.25;
      topColor = this.lerpColor('#4A90D9', '#87CEEB', p);
      bottomColor = this.lerpColor('#FFB347', '#E0F0FF', p);
    } else if (t < 0.75) {
      // 正午->黄昏
      const p = (t - 0.5) / 0.25;
      topColor = this.lerpColor('#87CEEB', '#FF6B6B', p);
      bottomColor = this.lerpColor('#E0F0FF', '#FFD700', p);
    } else {
      // 黄昏->夜
      const p = (t - 0.75) / 0.25;
      topColor = this.lerpColor('#FF6B6B', '#0B1026', p);
      bottomColor = this.lerpColor('#FFD700', '#1A1A3E', p);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  },

  // --- 太阳 ---
  drawSun(ctx, w, h) {
    const s = this.sun;
    s.glowPhase += 0.02;

    // 太阳光芒
    const glowSize = s.radius + 15 + Math.sin(s.glowPhase) * 8;
    const tapped = s.tapped && (this.time - s.tapTime < 1);

    ctx.save();
    ctx.translate(s.x, s.y);

    // 外光晕
    const glow = ctx.createRadialGradient(0, 0, s.radius * 0.5, 0, 0, glowSize * (tapped ? 2.5 : 1.5));
    glow.addColorStop(0, 'rgba(255, 230, 100, 0.8)');
    glow.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
    glow.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize * (tapped ? 2.5 : 1.5), 0, Math.PI * 2);
    ctx.fill();

    // 光线
    const rayCount = tapped ? 16 : 8;
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + this.time * 0.3;
      const innerR = s.radius + 5;
      const outerR = s.radius + 25 + Math.sin(this.time * 3 + i) * 10 + (tapped ? 30 : 0);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // 太阳本体
    const sunGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s.radius);
    sunGrad.addColorStop(0, '#FFF8DC');
    sunGrad.addColorStop(0.7, '#FFD700');
    sunGrad.addColorStop(1, '#FFA500');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();

    // 可爱的脸
    ctx.fillStyle = '#FF8C00';
    // 眼睛
    ctx.beginPath();
    ctx.arc(-12, -5, 4, 0, Math.PI * 2);
    ctx.arc(12, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    // 嘴巴
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0.1, Math.PI - 0.1);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FF8C00';
    ctx.stroke();
    // 腮红
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-20, 5, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, 5, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // --- 彩虹 ---
  drawRainbow(ctx, w, h) {
    if (this.rainbow.opacity < 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.rainbow.opacity * 0.6;

    const cx = w * 0.5;
    const cy = h * 0.55;
    const radius = Math.min(w, h) * 0.4;

    const colors = ['#FF6B6B', '#FFA07A', '#FFD700', '#98FB98', '#87CEEB', '#9370DB', '#DDA0DD'];
    const bandWidth = 8;

    colors.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius - i * bandWidth, Math.PI, 0);
      ctx.lineWidth = bandWidth;
      ctx.strokeStyle = color;
      ctx.stroke();
    });

    ctx.restore();
  },

  // --- 云朵 ---
  drawClouds(ctx) {
    this.clouds.forEach(cloud => {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.globalAlpha = cloud.opacity;

      // 画每个泡泡组成云朵
      cloud.puffs.forEach(puff => {
        const grad = ctx.createRadialGradient(
          puff.offsetX, puff.offsetY, puff.radius * 0.3,
          puff.offsetX, puff.offsetY, puff.radius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(1, 'rgba(240, 248, 255, 0.6)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(puff.offsetX, puff.offsetY, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 下雨的云有深色底部
      if (cloud.raining) {
        ctx.fillStyle = 'rgba(150, 170, 200, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 10, cloud.width * 0.4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  },

  // --- 鸟 ---
  drawBirds(ctx) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    this.birds.forEach(bird => {
      const wing = Math.sin(bird.wingPhase) * bird.size;
      ctx.beginPath();
      ctx.moveTo(bird.x - bird.size, bird.y + wing);
      ctx.quadraticCurveTo(bird.x - bird.size / 2, bird.y - Math.abs(wing), bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + bird.size / 2, bird.y - Math.abs(wing), bird.x + bird.size, bird.y + wing);
      ctx.stroke();
    });
  },

  // --- 雨滴 ---
  drawRaindrops(ctx) {
    this.raindrops.forEach(drop => {
      ctx.save();
      ctx.globalAlpha = drop.life;
      if (drop.sparkle) {
        // 闪亮雨滴
        ctx.fillStyle = `hsl(${200 + Math.random() * 40}, 80%, 75%)`;
        ctx.beginPath();
        this.drawStar(ctx, drop.x, drop.y, drop.size, drop.size * 0.4, 4);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(135, 206, 250, 0.6)';
        ctx.beginPath();
        ctx.ellipse(drop.x, drop.y, drop.size * 0.4, drop.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  },

  // --- 地面 ---
  drawGround(ctx, w, h) {
    const groundY = h * 0.6;

    // 主地面渐变
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#7EC850');
    groundGrad.addColorStop(0.3, '#6BBF3B');
    groundGrad.addColorStop(0.7, '#5CAF2E');
    groundGrad.addColorStop(1, '#4A9924');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // 小路（弯曲的石子路）
    ctx.save();
    ctx.strokeStyle = '#D2B48C';
    ctx.lineWidth = 25;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h);
    ctx.quadraticCurveTo(w * 0.3, h * 0.75, w * 0.5, h * 0.7);
    ctx.quadraticCurveTo(w * 0.7, h * 0.65, w * 0.9, h * 0.72);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 小丘陵
    ctx.fillStyle = '#72C043';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 15);
    ctx.quadraticCurveTo(w * 0.15, groundY - 10, w * 0.3, groundY + 10);
    ctx.quadraticCurveTo(w * 0.5, groundY + 25, w * 0.7, groundY + 5);
    ctx.quadraticCurveTo(w * 0.85, groundY - 5, w, groundY + 15);
    ctx.lineTo(w, groundY + 20);
    ctx.lineTo(0, groundY + 20);
    ctx.fill();
  },

  // --- 树木 ---
  drawTrees(ctx) {
    this.trees.forEach(tree => {
      ctx.save();
      ctx.translate(tree.x, tree.y);

      // 树干
      ctx.fillStyle = '#8B6914';
      const trunkW = tree.width * 0.2;
      ctx.beginPath();
      ctx.moveTo(-trunkW / 2, 0);
      ctx.lineTo(-trunkW / 3, -tree.height * 0.5);
      ctx.lineTo(trunkW / 3, -tree.height * 0.5);
      ctx.lineTo(trunkW / 2, 0);
      ctx.fill();

      // 树冠（带摇摆）
      ctx.save();
      ctx.translate(0, -tree.height * 0.5);
      ctx.rotate(tree.sway * Math.PI / 180);

      if (tree.type === 'round') {
        // 圆形树冠
        const crownR = tree.width * 0.7;
        const grad = ctx.createRadialGradient(0, -crownR * 0.3, crownR * 0.2, 0, -crownR * 0.2, crownR);
        grad.addColorStop(0, '#8ED865');
        grad.addColorStop(0.6, '#6BBF3B');
        grad.addColorStop(1, '#4A9924');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -crownR * 0.3, crownR, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
        ctx.beginPath();
        ctx.arc(-crownR * 0.2, -crownR * 0.6, crownR * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 三角形树冠（松树风格）
        ctx.fillStyle = '#4A9924';
        for (let i = 0; i < 3; i++) {
          const y = -i * tree.height * 0.2;
          const spread = tree.width * (0.8 - i * 0.15);
          ctx.beginPath();
          ctx.moveTo(0, y - tree.height * 0.25);
          ctx.lineTo(-spread / 2, y);
          ctx.lineTo(spread / 2, y);
          ctx.fill();
        }
      }

      ctx.restore(); // 摇摆
      ctx.restore(); // 位置
    });
  },

  // --- 喷泉底座 ---
  drawFountainBase(ctx) {
    const fx = this.fountain.x;
    const fy = this.fountain.y;

    ctx.save();
    ctx.translate(fx, fy);

    // 水池
    ctx.fillStyle = '#6ABFDB';
    ctx.beginPath();
    ctx.ellipse(0, 10, 45, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(-10, 8, 20, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 水池边沿
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 10, 48, 17, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 中心柱
    ctx.fillStyle = '#B0B0B0';
    ctx.fillRect(-5, -20, 10, 30);

    // 顶部碗
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.ellipse(0, -20, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // --- 蒲公英植株 ---
  drawDandelionPlants(ctx) {
    this.dandelionPlants.forEach(dp => {
      if (dp.released) return; // 已释放不再画

      ctx.save();
      ctx.translate(dp.x, dp.y);

      // 茎
      ctx.strokeStyle = '#6B8E23';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -25);
      ctx.stroke();

      // 蒲公英球（白色毛球）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(0, -28, 10, 0, Math.PI * 2);
      ctx.fill();

      // 小绒毛线条
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(Math.cos(angle) * 14, -28 + Math.sin(angle) * 14);
        ctx.stroke();
      }

      ctx.restore();
    });
  },

  // --- 草地 ---
  drawGrass(ctx) {
    this.grassBlades.forEach(blade => {
      ctx.save();
      ctx.translate(blade.x, blade.y);
      ctx.strokeStyle = blade.color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(blade.sway, -blade.height / 2, blade.sway * 1.5, -blade.height);
      ctx.stroke();
      ctx.restore();
    });
  },

  // --- 花朵 ---
  drawFlowers(ctx) {
    this.flowers.forEach(flower => {
      ctx.save();
      ctx.translate(flower.x, flower.y);

      // 茎
      ctx.strokeStyle = '#228B22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(flower.sway * 0.5, -flower.stemHeight / 2, flower.sway, -flower.stemHeight);
      ctx.stroke();

      // 花头
      ctx.save();
      ctx.translate(flower.sway, -flower.stemHeight);

      // 花瓣
      for (let i = 0; i < flower.petals; i++) {
        const angle = (i / flower.petals) * Math.PI * 2;
        ctx.fillStyle = flower.color;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * flower.size * 0.4,
          Math.sin(angle) * flower.size * 0.4,
          flower.size * 0.4, flower.size * 0.25,
          angle, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // 花心
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, flower.size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    });
  },

  // --- 喷泉水滴 ---
  drawFountainDrops(ctx) {
    this.fountainDrops.forEach(drop => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, drop.life);

      if (drop.isFish) {
        // 跳鱼！
        ctx.font = `${12 + drop.size * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🐟', drop.x, drop.y);
      } else {
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(drop.x - drop.size * 0.3, drop.y - drop.size * 0.3, drop.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  },

  // --- 蝴蝶 ---
  drawButterflies(ctx) {
    this.butterflies.forEach(bf => {
      const wingAngle = Math.sin(bf.wingPhase) * 0.6;

      ctx.save();
      ctx.translate(bf.x, bf.y);

      // 左翅
      ctx.fillStyle = bf.color1;
      ctx.save();
      ctx.scale(Math.cos(wingAngle), 1);
      ctx.beginPath();
      ctx.ellipse(-bf.size * 0.4, -bf.size * 0.2, bf.size * 0.5, bf.size * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // 翅膀花纹
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-bf.size * 0.4, -bf.size * 0.2, bf.size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 右翅
      ctx.fillStyle = bf.color2;
      ctx.save();
      ctx.scale(Math.cos(-wingAngle), 1);
      ctx.beginPath();
      ctx.ellipse(bf.size * 0.4, -bf.size * 0.2, bf.size * 0.5, bf.size * 0.35, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(bf.size * 0.4, -bf.size * 0.2, bf.size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 身体
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.5, bf.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 触角
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -bf.size * 0.25);
      ctx.quadraticCurveTo(-3, -bf.size * 0.5, -5, -bf.size * 0.55);
      ctx.moveTo(0, -bf.size * 0.25);
      ctx.quadraticCurveTo(3, -bf.size * 0.5, 5, -bf.size * 0.55);
      ctx.stroke();

      ctx.restore();
    });
  },

  // --- 骑车小女孩 ---
  drawBikeGirl(ctx) {
    if (!this.bikeGirl || !this.bikeGirl.visible) return;
    const bg = this.bikeGirl;

    ctx.save();
    ctx.translate(bg.x, bg.y);
    ctx.scale(bg.direction, 1); // 翻转方向

    const wheelR = 14;
    const bodyX = 0;

    // 后轮
    this.drawWheel(ctx, -18, 0, wheelR, bg.wheelPhase);
    // 前轮
    this.drawWheel(ctx, 18, 0, wheelR, bg.wheelPhase);

    // 车架
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-18, 0); // 后轮中心
    ctx.lineTo(-5, -15); // 座管
    ctx.lineTo(18, 0);   // 前轮中心
    ctx.moveTo(-5, -15);
    ctx.lineTo(12, -18); // 车把
    ctx.stroke();

    // 座位
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(-5, -17, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 车篮（前面）
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(16, -22, 7, 0, Math.PI);
    ctx.stroke();
    // 篮子里的花
    ctx.font = '8px serif';
    ctx.fillText('🌸', 13, -24);

    // 小女孩身体
    ctx.save();
    ctx.translate(-3, -18);

    // 裙子
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, -5);
    ctx.lineTo(7, 3);
    ctx.lineTo(-7, 3);
    ctx.fill();

    // 上身
    ctx.fillStyle = '#FFF0F5';
    ctx.fillRect(-4, -15, 8, 11);

    // 头
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -19, 7, 0, Math.PI * 2);
    ctx.fill();

    // 头发（受风影响）
    ctx.fillStyle = '#4A2C0A';
    ctx.beginPath();
    ctx.arc(0, -21, 7, Math.PI, 0); // 上半头发
    ctx.fill();

    // 飘动的头发丝
    ctx.strokeStyle = '#4A2C0A';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const startY = -22 + i * 1.5;
      ctx.moveTo(-3 + i, startY);
      ctx.quadraticCurveTo(
        -8 - bg.hairWave * 0.5 + i * 0.5,
        startY + 3,
        -12 - bg.hairWave + i,
        startY + 6 + i
      );
      ctx.stroke();
    }

    // 发带/蝴蝶结
    ctx.fillStyle = '#FF1493';
    const ribbonX = -5;
    const ribbonY = -22;
    ctx.beginPath();
    ctx.ellipse(ribbonX - 3, ribbonY, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ribbonX + 3, ribbonY, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 飘带
    ctx.strokeStyle = '#FF1493';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ribbonX, ribbonY);
    ctx.quadraticCurveTo(ribbonX - 6 - bg.ribbonWave * 0.3, ribbonY + 5, ribbonX - 10 - bg.ribbonWave * 0.5, ribbonY + 10);
    ctx.stroke();

    // 可爱的脸
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-2, -19, 1, 0, Math.PI * 2); // 左眼
    ctx.arc(3, -19, 1, 0, Math.PI * 2);  // 右眼
    ctx.fill();
    // 微笑
    ctx.beginPath();
    ctx.arc(0.5, -17, 3, 0.1, Math.PI - 0.1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF6B6B';
    ctx.stroke();
    // 腮红
    ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-5, -17, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -17, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 踏板位置的腿
    const pedalAngle = bg.pedalPhase;
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(Math.cos(pedalAngle) * 8, 5 + Math.sin(pedalAngle) * 5);
    ctx.stroke();

    ctx.restore(); // 女孩身体

    ctx.restore(); // 整体位置
  },

  drawWheel(ctx, x, y, r, phase) {
    // 轮圈
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // 辐条
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#999';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + phase;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      ctx.stroke();
    }

    // 轮胎
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  },

  // --- 蒲公英种子 ---
  drawDandelionSeeds(ctx) {
    this.dandelionSeeds.forEach(seed => {
      ctx.save();
      ctx.globalAlpha = seed.life;
      ctx.translate(seed.x, seed.y);

      // 种子核心
      ctx.fillStyle = '#DDD';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 绒毛
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + seed.wobble;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * seed.size, Math.sin(angle) * seed.size);
        ctx.stroke();
      }

      ctx.restore();
    });
  },

  // --- 亮片/特效 ---
  drawSparkles(ctx) {
    this.sparkles.forEach(s => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);

      if (s.type === 'emoji') {
        ctx.font = `${s.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
      } else {
        ctx.fillStyle = s.color || '#FFD700';
        ctx.beginPath();
        this.drawStar(ctx, s.x, s.y, s.size, s.size * 0.4, 4);
        ctx.fill();
      }

      ctx.restore();
    });
  },

  drawStar(ctx, cx, cy, outerR, innerR, points) {
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
  },

  // --- 风的可视化 ---
  drawWindLines(ctx, w, h) {
    const effectiveWind = this.windForce + this.windGust;
    if (effectiveWind < 0.15) return;

    ctx.save();
    ctx.globalAlpha = effectiveWind * 0.4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;

    const lineCount = Math.floor(effectiveWind * 20);
    for (let i = 0; i < lineCount; i++) {
      const y = Math.random() * h * 0.8;
      const x = Math.random() * w;
      const len = 20 + effectiveWind * 60;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * this.windDirection, y + (Math.random() - 0.5) * 5);
      ctx.stroke();
    }

    ctx.restore();
  },

  // --- 麦克风指示器 ---
  drawMicIndicator(ctx, w, h) {
    const x = 50;
    const y = 40;

    ctx.save();

    // 背景圆
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(x - 30, y - 15, 60, 30, 15);
    ctx.fill();

    // 麦克风图标
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.micActive ? '🎤' : '🔇', x - 12, y);

    // 音量条
    const barWidth = 25;
    const barHeight = 8;
    const bx = x + 5;
    const by = y - barHeight / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(bx, by, barWidth, barHeight);

    // 音量填充
    const fillW = barWidth * this.micSmooth;
    let barColor = '#4ADE80'; // 绿色
    if (this.micSmooth > 0.5) barColor = '#FBBF24'; // 黄色
    if (this.micSmooth > 0.75) barColor = '#F87171'; // 红色

    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, fillW, barHeight);

    // 风力指示
    if (this.windForce > 0.05) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'left';
      let windText = '🍃';
      if (this.windForce > 0.3) windText = '🌬️';
      if (this.windForce > 0.6) windText = '🌪️';
      ctx.fillText(windText, x + 35, y + 1);
    }

    ctx.restore();
  },

  updateHUD() {
    const windBar = document.getElementById('pw-wind-level');
    if (windBar) {
      windBar.style.width = (this.windForce * 100) + '%';
    }
  },

  // ========== 工具 ==========
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 全局函数
function showParkWallpaper() {
  ParkWallpaper.show();
}

function closeParkWallpaper() {
  ParkWallpaper.close();
}
