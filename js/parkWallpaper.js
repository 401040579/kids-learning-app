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
  timeOfDayTarget: null, // 切换白天/黑夜时的目标值
  sceneWidth: 0,
  sceneHeight: 0,

  // ========== 语音咒语系统 ==========
  voiceRecognition: null,
  voiceActive: false,
  voiceShouldRestart: false,
  recentCommand: null,       // { icon, text, time }
  commandCooldowns: {},      // { cmdKey: lastTriggerTime }

  // ========== 天气/特效元素 ==========
  weatherMode: 'sunny',      // 'sunny' | 'rain' | 'snow'
  snowflakes: [],
  fogOpacity: 0,
  fogTargetOpacity: 0,
  thunderFlash: 0,           // 0~1 雷电屏幕白光
  thunderBolt: null,         // { points: [[x,y],...], life }
  nightStars: [],
  shootingStars: [],
  fireworks: [],
  bubbles: [],
  balloons: [],
  sakuraPetals: [],
  moon: { x: 0, y: 0, radius: 38, opacity: 0, targetOpacity: 0 },
  unicorn: null,             // { x, y, vx, life, manePhase }
  dragon: null,              // { x, y, segments[], wingPhase, life, vx, vy }
  cake: null,                // { x, y, targetY, bounce, life, candles[] }
  tornado: null,             // { x, vx, baseY, height, baseRadius, topRadius, swirlPhase, captured[] }
  tornadoRegenPending: false,
  tornadoRegenTimer: 0,
  tornadoRegenItems: null,
  _regenCooldown: 0,
  kids: [],                  // 一群小孩 NPC
  liveTranscript: '',        // 实时识别到的文字（用于 HUD 显示）
  liveTranscriptTime: 0,     // 最近识别时间
  bloomEffect: 0,            // 0~1 花朵放大特效强度
  danceEffect: 0,            // 0~1 跳舞强度

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

    // 语音咒语识别（异步、可降级）
    this.initVoiceRecognition();

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
    this.stopVoiceRecognition();
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
    this.snowflakes = [];
    this.nightStars = [];
    this.shootingStars = [];
    this.fireworks = [];
    this.bubbles = [];
    this.balloons = [];
    this.sakuraPetals = [];
    this.unicorn = null;
    this.dragon = null;
    this.cake = null;
    this.tornado = null;
    this.tornadoRegenPending = false;
    this.tornadoRegenTimer = 0;
    this.tornadoRegenItems = null;
    this._regenCooldown = 0;
    this.kids = [];
    this.liveTranscript = '';
    this.liveTranscriptTime = 0;
    this.thunderBolt = null;
    this.fogOpacity = 0;
    this.fogTargetOpacity = 0;
    this.thunderFlash = 0;
    this.bloomEffect = 0;
    this.danceEffect = 0;
    this.weatherMode = 'sunny';
    this.timeOfDayTarget = null;
    this.recentCommand = null;
    this.commandCooldowns = {};
    this.moon.opacity = 0;
    this.moon.targetOpacity = 0;
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

    // 月亮（默认隐藏，咒语触发显示）
    this.moon.x = w * 0.18;
    this.moon.y = h * 0.14;
    this.moon.opacity = 0;
    this.moon.targetOpacity = 0;

    // 预生成夜空星星模板（触发"星星/黑夜"咒语时才显示）
    this.nightStars = [];
    for (let i = 0; i < 80; i++) {
      this.nightStars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.55,
        size: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        opacity: 0
      });
    }
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
    this.updateTimeOfDay(dt);
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
    // 咒语触发的特效
    this.updateWeatherSpawners(dt);
    this.updateSnowflakes(dt);
    this.updateNightStars(dt);
    this.updateShootingStars(dt);
    this.updateFireworks(dt);
    this.updateBubbles(dt);
    this.updateBalloons(dt);
    this.updateSakuraPetals(dt);
    this.updateMoon(dt);
    this.updateUnicorn(dt);
    this.updateDragon(dt);
    this.updateCake(dt);
    this.updateKids(dt);
    this.updateTornado(dt);
    this.updateTornadoRegen(dt);
    this.updateFog(dt);
    this.updateThunder(dt);
    this.updateBloomDance(dt);

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
    const danceSway = this.danceEffect > 0.01 ? Math.sin(this.time * 5) * this.danceEffect * 18 : 0;
    this.trees.forEach((tree, idx) => {
      const targetSway = effectiveWind * this.windDirection * 25 + danceSway * (idx % 2 === 0 ? 1 : -1);
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
    const danceFactor = this.danceEffect;
    this.flowers.forEach(flower => {
      flower.swayPhase += dt * (2 + danceFactor * 6);
      const naturalSway = Math.sin(flower.swayPhase) * (3 + danceFactor * 12);
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
    const danceFactor = this.danceEffect;
    this.grassBlades.forEach(blade => {
      blade.phase += dt * (3 + danceFactor * 8);
      const naturalSway = Math.sin(blade.phase) * (2 + danceFactor * 8);
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
    if (!this.bikeGirl.visible) return; // 被龙卷风卷走时跳过
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
    this.drawNightStars(ctx);
    this.drawMoon(ctx);
    this.drawSun(ctx, w, h);
    this.drawRainbow(ctx, w, h);
    this.drawShootingStars(ctx);
    this.drawClouds(ctx);
    this.drawDragon(ctx);
    this.drawBirds(ctx);
    this.drawSakuraPetals(ctx);
    this.drawSnowflakes(ctx);
    this.drawRaindrops(ctx);
    this.drawGround(ctx, w, h);
    this.drawTrees(ctx);
    this.drawFountainBase(ctx);
    this.drawDandelionPlants(ctx);
    this.drawGrass(ctx);
    this.drawFlowers(ctx);
    this.drawFountainDrops(ctx);
    this.drawUnicorn(ctx);
    this.drawButterflies(ctx);
    this.drawBikeGirl(ctx);
    this.drawKids(ctx);
    this.drawDandelionSeeds(ctx);
    this.drawBubbles(ctx);
    this.drawBalloons(ctx);
    this.drawCake(ctx);
    this.drawFireworks(ctx);
    this.drawTornado(ctx);
    this.drawSparkles(ctx);
    this.drawWindLines(ctx, w, h);
    this.drawFog(ctx, w, h);
    this.drawThunder(ctx, w, h);
    this.drawMicIndicator(ctx, w, h);
    this.drawVoiceCommandHUD(ctx, w, h);
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
    const bloomScale = 1 + this.bloomEffect * 0.8;
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
      const size = flower.size * bloomScale;

      // 花瓣
      for (let i = 0; i < flower.petals; i++) {
        const angle = (i / flower.petals) * Math.PI * 2;
        ctx.fillStyle = flower.color;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * size * 0.4,
          Math.sin(angle) * size * 0.4,
          size * 0.4, size * 0.25,
          angle, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // 花心
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
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
    const micStatus = document.getElementById('pw-mic-status');
    if (micStatus) {
      if (this.micActive && this.voiceActive) {
        micStatus.textContent = this.t('park.micVoice', '风+咒语');
      } else if (this.micActive) {
        micStatus.textContent = this.t('park.micOnly', '风');
      } else if (this.voiceActive) {
        micStatus.textContent = this.t('park.voiceOnly', '咒语');
      } else {
        micStatus.textContent = this.t('park.micOff', '触摸');
      }
    }
  },

  // ========== 工具 ==========
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ============================================================
  // ========== 语音咒语系统 ==========
  // ============================================================

  // 各语言关键词映射：command → keyword 数组
  voiceCommandKeywords: {
    zh: {
      // 优先级高的复合词放第一位（最长匹配优先）
      sunny:        ['太阳出来', '雨停了', '雪停了', '雨停', '雪停', '停雨', '停雪', '晴天', '放晴', '天晴', '出太阳'],
      day:          ['天亮了', '太阳升', '日出', '白天', '天亮', '早上', '清晨', '上午'],
      night:        ['黑夜来', '天黑了', '黑夜', '夜晚', '晚上', '天黑', '夜里', '入夜'],
      rain:         ['下大雨', '下小雨', '下雨', '雨水', '小雨', '大雨', '落雨', '雨滴', '雨啊', '雨'],
      snow:         ['下大雪', '下小雪', '下雪', '雪花', '飘雪', '落雪', '雪啊', '雪'],
      thunder:      ['打雷', '雷电', '闪电', '雷声', '轰隆', '雷雨', '雷'],
      fog:          ['起雾', '大雾', '雾气', '有雾', '雾啊', '雾'],
      rainbow:      ['七色彩虹', '彩虹来', '彩虹'],
      stars:        ['满天星', '星空', '星星出来', '群星', '星星', '繁星'],
      fireworks:    ['放烟花', '放烟火', '看烟花', '烟花', '烟火', '礼花', '焰火'],
      shootingStar: ['流星雨', '许愿星', '流星'],
      bubbles:      ['吹泡泡', '肥皂泡', '泡泡飞', '泡泡', '气泡'],
      balloons:     ['放气球', '彩色气球', '气球飞', '气球'],
      sakura:       ['樱花雨', '花瓣雨', '樱花飞', '樱花'],
      butterfly:    ['蝴蝶飞', '小蝴蝶', '蝴蝶来', '蝴蝶', '彩蝶'],
      birds:        ['小鸟来', '小鸟飞', '鸟儿', '小鸟', '飞鸟'],
      unicorn:      ['独角兽', '独角马', '彩虹马', '小马来', '小马'],
      dragon:       ['飞天龙', '中国龙', '神龙', '飞龙', '龙来', '小龙', '大龙', '龙'],
      bloom:        ['花儿开', '花朵开', '花开', '开花', '盛开', '绽放'],
      dance:        ['一起跳', '跳起来', '跳舞', '舞蹈', '一起舞'],
      cake:         ['生日蛋糕', '切蛋糕', '吃蛋糕', '蛋糕来', '大蛋糕', '蛋糕'],
      tornado:      ['龙卷风来', '龙卷风', '大风暴', '旋风', '风暴'],
      kids:         ['小朋友', '小伙伴', '小孩儿', '小孩子', '小孩', '孩子们', '孩子', '小娃娃']
    },
    en: {
      sunny:        ['stop raining', 'stop snowing', 'stop rain', 'stop snow', 'clear sky', 'sunshine', 'sunny', 'the sun'],
      day:          ['day time', 'daytime', 'morning', 'sunrise', 'wake up'],
      night:        ['night time', 'nighttime', 'midnight', 'night'],
      rain:         ['make it rain', 'raining', 'rainy', 'rain'],
      snow:         ['snowing', 'snowy', 'snow'],
      thunder:      ['thunderstorm', 'thunder', 'lightning', 'storm'],
      fog:          ['foggy', 'fog', 'mist', 'misty'],
      rainbow:      ['rainbow'],
      stars:        ['starry', 'stars'],
      fireworks:    ['fireworks', 'firework'],
      shootingStar: ['shooting star', 'falling star', 'meteor'],
      bubbles:      ['bubbles', 'bubble'],
      balloons:     ['balloons', 'balloon'],
      sakura:       ['cherry blossom', 'cherry blossoms', 'sakura', 'petals'],
      butterfly:    ['butterflies', 'butterfly'],
      birds:        ['birdies', 'birds', 'bird'],
      unicorn:      ['unicorn', 'unicorns'],
      dragon:       ['dragon', 'dragons'],
      bloom:        ['flowers bloom', 'blossom', 'bloom'],
      dance:        ['dancing', 'dance'],
      cake:         ['birthday cake', 'cake'],
      tornado:      ['tornado', 'twister', 'whirlwind', 'cyclone'],
      kids:         ['children', 'kids', 'little kids', 'playmates', 'friends']
    },
    ja: {
      sunny:        ['止んで', '晴れ', 'はれ', '太陽'],
      day:          ['朝', '昼', 'ひる', '日の出'],
      night:        ['夜', 'よる', '真夜中'],
      rain:         ['雨', 'あめ'],
      snow:         ['雪', 'ゆき'],
      thunder:      ['雷', 'かみなり', '稲妻'],
      fog:          ['霧', 'きり'],
      rainbow:      ['虹', 'にじ'],
      stars:        ['星空', '星', 'ほし'],
      fireworks:    ['花火', 'はなび'],
      shootingStar: ['流れ星', 'ながれぼし', '流星'],
      bubbles:      ['シャボン玉', 'バブル', '泡'],
      balloons:     ['風船', 'ふうせん'],
      sakura:       ['桜', 'さくら'],
      butterfly:    ['蝶々', '蝶', 'ちょう'],
      birds:        ['小鳥', '鳥', 'とり'],
      unicorn:      ['ユニコーン', '一角獣'],
      dragon:       ['ドラゴン', '龍', '竜'],
      bloom:        ['花咲け', '咲く'],
      dance:        ['踊る', 'ダンス'],
      cake:         ['誕生日ケーキ', 'バースデーケーキ', 'ケーキ'],
      tornado:      ['竜巻', 'たつまき', '台風'],
      kids:         ['子供たち', '子どもたち', '子供', '子ども']
    },
    ko: {
      sunny:        ['맑음', '맑은', '해', '햇빛'],
      day:          ['낮', '아침', '일출'],
      night:        ['밤'],
      rain:         ['비', '빗물'],
      snow:         ['눈', '눈송이'],
      thunder:      ['천둥', '번개'],
      fog:          ['안개'],
      rainbow:      ['무지개'],
      stars:        ['별', '별빛'],
      fireworks:    ['불꽃놀이', '폭죽', '불꽃'],
      shootingStar: ['별똥별', '유성'],
      bubbles:      ['비눗방울', '버블'],
      balloons:     ['풍선'],
      sakura:       ['벚꽃'],
      butterfly:    ['나비'],
      birds:        ['새', '새들'],
      unicorn:      ['유니콘'],
      dragon:       ['용', '드래곤'],
      bloom:        ['꽃 피어', '개화', '꽃이 피'],
      dance:        ['춤'],
      cake:         ['생일 케이크', '케이크'],
      tornado:      ['토네이도', '회오리바람', '회오리'],
      kids:         ['아이들', '친구들', '어린이']
    },
    es: {
      sunny:        ['soleado', 'despejado', 'sol'],
      day:          ['día', 'mañana', 'amanecer'],
      night:        ['noche'],
      rain:         ['lluvia', 'llueve', 'llover'],
      snow:         ['nieve', 'nieva'],
      thunder:      ['trueno', 'rayo', 'tormenta'],
      fog:          ['niebla'],
      rainbow:      ['arcoiris', 'arco iris'],
      stars:        ['estrellas', 'estrella'],
      fireworks:    ['fuegos artificiales', 'fuegos'],
      shootingStar: ['estrella fugaz'],
      bubbles:      ['burbujas'],
      balloons:     ['globos', 'globo'],
      sakura:       ['flor de cerezo', 'sakura'],
      butterfly:    ['mariposa', 'mariposas'],
      birds:        ['pájaros', 'pájaro'],
      unicorn:      ['unicornio'],
      dragon:       ['dragón'],
      bloom:        ['florecer', 'flores'],
      dance:        ['bailar', 'baile'],
      cake:         ['pastel de cumpleaños', 'pastel', 'tarta'],
      tornado:      ['tornado', 'remolino', 'torbellino'],
      kids:         ['niños', 'amigos']
    },
    de: {
      sunny:        ['sonnig', 'sonne'],
      day:          ['tag', 'morgen', 'sonnenaufgang'],
      night:        ['nacht'],
      rain:         ['regen', 'regnet'],
      snow:         ['schnee', 'schneit'],
      thunder:      ['donner', 'blitz', 'gewitter'],
      fog:          ['nebel'],
      rainbow:      ['regenbogen'],
      stars:        ['sterne'],
      fireworks:    ['feuerwerk'],
      shootingStar: ['sternschnuppe'],
      bubbles:      ['seifenblasen', 'blasen'],
      balloons:     ['luftballons', 'ballons'],
      sakura:       ['kirschblüte'],
      butterfly:    ['schmetterling'],
      birds:        ['vögel', 'vogel'],
      unicorn:      ['einhorn'],
      dragon:       ['drache'],
      bloom:        ['blühen'],
      dance:        ['tanzen', 'tanz'],
      cake:         ['geburtstagskuchen', 'kuchen', 'torte'],
      tornado:      ['tornado', 'wirbelsturm', 'wirbelwind'],
      kids:         ['kinder', 'freunde']
    },
    fr: {
      sunny:        ['ensoleillé', 'soleil'],
      day:          ['jour', 'matin', 'lever du soleil'],
      night:        ['nuit'],
      rain:         ['pluie', 'pleut'],
      snow:         ['neige'],
      thunder:      ['tonnerre', 'éclair', 'orage'],
      fog:          ['brouillard'],
      rainbow:      ['arc-en-ciel'],
      stars:        ['étoiles'],
      fireworks:    ["feu d'artifice", 'feux'],
      shootingStar: ['étoile filante'],
      bubbles:      ['bulles'],
      balloons:     ['ballons'],
      sakura:       ['cerisier', 'sakura'],
      butterfly:    ['papillon'],
      birds:        ['oiseaux', 'oiseau'],
      unicorn:      ['licorne'],
      dragon:       ['dragon'],
      bloom:        ['fleurir'],
      dance:        ['danser', 'danse'],
      cake:         ["gâteau d'anniversaire", 'gâteau'],
      tornado:      ['tornade', 'tourbillon'],
      kids:         ['enfants', 'amis']
    }
  },

  commandIcons: {
    rain: '☔', snow: '❄️', thunder: '⚡', fog: '🌫️', rainbow: '🌈',
    sunny: '☀️', day: '🌅', night: '🌙', stars: '✨', fireworks: '🎆',
    shootingStar: '⭐', bubbles: '🫧', balloons: '🎈', sakura: '🌸',
    butterfly: '🦋', birds: '🐦', unicorn: '🦄', dragon: '🐉',
    bloom: '🌺', dance: '💃', cake: '🎂', tornado: '🌪️', kids: '👫'
  },

  getRecognitionLang() {
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    const map = {
      en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
      es: 'es-ES', de: 'de-DE', fr: 'fr-FR'
    };
    return map[lang] || 'en-US';
  },

  initVoiceRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.log('[ParkWallpaper] SpeechRecognition not supported');
      this.voiceActive = false;
      return;
    }
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 4;
      rec.lang = this.getRecognitionLang();

      rec.onresult = (event) => {
        let matched = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          // 最佳备选写入实时字幕
          if (result[0] && result[0].transcript) {
            this.liveTranscript = result[0].transcript.trim();
            this.liveTranscriptTime = this.time;
          }
          if (!matched) {
            for (let j = 0; j < result.length; j++) {
              if (this.handleVoiceCommand(result[j].transcript)) {
                matched = true;
                break;
              }
            }
          }
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.voiceActive = false;
          this.voiceShouldRestart = false;
        }
      };

      rec.onend = () => {
        if (this.voiceShouldRestart) {
          try { rec.start(); } catch (e) { /* 已在运行 */ }
        }
      };

      rec.start();
      this.voiceRecognition = rec;
      this.voiceShouldRestart = true;
      this.voiceActive = true;
    } catch (e) {
      console.log('[ParkWallpaper] SR init failed', e);
      this.voiceActive = false;
    }
  },

  stopVoiceRecognition() {
    this.voiceShouldRestart = false;
    if (this.voiceRecognition) {
      try { this.voiceRecognition.stop(); } catch (e) {}
      try { this.voiceRecognition.abort(); } catch (e) {}
      this.voiceRecognition = null;
    }
    this.voiceActive = false;
  },

  handleVoiceCommand(transcript) {
    if (!transcript) return false;
    const text = this.normalizeTranscript(transcript);
    if (!text) return false;

    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    const keywords = this.voiceCommandKeywords[lang] || this.voiceCommandKeywords.en;

    // 按关键词长度倒排序，"雨停" 优先于 "雨"，"stop rain" 优先于 "rain"
    const pairs = [];
    for (const cmd in keywords) {
      for (const kw of keywords[cmd]) {
        pairs.push({ cmd, kw: this.normalizeTranscript(kw) });
      }
    }
    pairs.sort((a, b) => b.kw.length - a.kw.length);

    // 第一轮：严格 includes
    for (const { cmd, kw } of pairs) {
      if (kw && text.includes(kw)) {
        return this._triggerIfReady(cmd, kw);
      }
    }
    // 第二轮：模糊子序列匹配（关键词长度 ≥ 2）
    for (const { cmd, kw } of pairs) {
      if (kw.length >= 2 && this.fuzzyMatch(text, kw)) {
        return this._triggerIfReady(cmd, kw);
      }
    }
    return false;
  },

  _triggerIfReady(cmd, kw) {
    const now = this.time;
    const last = this.commandCooldowns[cmd] || -10;
    if (now - last < 1.5) return true;
    this.commandCooldowns[cmd] = now;
    this.triggerCommand(cmd, kw);
    return true;
  },

  // 标准化文本：转小写 + 去除中英文标点、空白
  normalizeTranscript(text) {
    if (!text) return '';
    return String(text).toLowerCase()
      .replace(/[\s.,!?;:\-_/\\'"`~@#$%^&*+=<>，。！？、：；""''（）()【】\[\]{}]+/g, '');
  },

  // 子序列模糊匹配：关键词字符按顺序在 text 中出现，相邻字符之间最多隔 2 个无关字符
  fuzzyMatch(text, keyword) {
    if (!text || !keyword) return false;
    if (text.includes(keyword)) return true;
    if (keyword.length < 2) return false;
    const maxGap = 2;
    for (let start = 0; start < text.length; start++) {
      if (text[start] !== keyword[0]) continue;
      let j = 1;
      let prev = start;
      for (let i = start + 1; i < text.length && j < keyword.length; i++) {
        if (text[i] === keyword[j]) {
          if (i - prev - 1 > maxGap) break;
          prev = i;
          j++;
        }
      }
      if (j === keyword.length) return true;
    }
    return false;
  },

  triggerCommand(cmd, keyword) {
    const icon = this.commandIcons[cmd] || '✨';
    this.recentCommand = { icon, text: keyword, time: this.time };

    switch (cmd) {
      case 'rain':         this.triggerRain(); break;
      case 'snow':         this.triggerSnow(); break;
      case 'thunder':      this.triggerThunder(); break;
      case 'fog':          this.triggerFog(); break;
      case 'rainbow':      this.triggerRainbow(); break;
      case 'sunny':        this.triggerSunny(); break;
      case 'day':          this.triggerDay(); break;
      case 'night':        this.triggerNight(); break;
      case 'stars':        this.triggerStars(); break;
      case 'fireworks':    this.triggerFireworks(); break;
      case 'shootingStar': this.triggerShootingStar(); break;
      case 'bubbles':      this.triggerBubbles(); break;
      case 'balloons':     this.triggerBalloons(); break;
      case 'sakura':       this.triggerSakura(); break;
      case 'butterfly':    this.triggerButterflies(); break;
      case 'birds':        this.triggerBirds(); break;
      case 'unicorn':      this.triggerUnicorn(); break;
      case 'dragon':       this.triggerDragon(); break;
      case 'bloom':        this.triggerBloom(); break;
      case 'dance':        this.triggerDance(); break;
      case 'cake':         this.triggerCake(); break;
      case 'tornado':      this.triggerTornado(); break;
      case 'kids':         this.triggerKids(); break;
    }
  },

  // ========== 各咒语效果实现 ==========

  triggerRain() {
    this.weatherMode = 'rain';
    this.clouds.forEach(c => { c.raining = true; c.rainTimer = 15; });
    this.playRainSound();
  },

  triggerSnow() {
    this.weatherMode = 'snow';
    this.playMagicChime();
    // 初始撒一波雪花
    for (let i = 0; i < 60; i++) {
      this.snowflakes.push(this.makeSnowflake(true));
    }
  },

  makeSnowflake(initial = false) {
    return {
      x: Math.random() * this.sceneWidth,
      y: initial ? Math.random() * this.sceneHeight * 0.6 : -10,
      size: 1.5 + Math.random() * 3,
      vy: 0.4 + Math.random() * 1.2,
      vxBase: (Math.random() - 0.5) * 0.6,
      swayPhase: Math.random() * Math.PI * 2,
      opacity: 0.6 + Math.random() * 0.4
    };
  },

  triggerThunder() {
    this.thunderFlash = 1;
    // 生成闪电折线
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const startX = w * (0.2 + Math.random() * 0.6);
    const points = [[startX, 0]];
    let y = 0;
    let x = startX;
    while (y < h * 0.55) {
      y += 15 + Math.random() * 25;
      x += (Math.random() - 0.5) * 60;
      points.push([x, y]);
    }
    this.thunderBolt = { points, life: 0.35 };
    this.playThunderSound();
  },

  playThunderSound() {
    if (!this.soundCtx) return;
    try {
      // 短促"咔"
      this.playTone(120, 0.15, 'square', 0.18);
      // 0.4 秒后低沉雷声噪音
      setTimeout(() => {
        if (!this.soundCtx) return;
        const dur = 1.2;
        const buf = this.soundCtx.createBuffer(1, this.soundCtx.sampleRate * dur, this.soundCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.exp(-i / (data.length * 0.4));
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = this.soundCtx.createBufferSource();
        src.buffer = buf;
        const filter = this.soundCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        const gain = this.soundCtx.createGain();
        gain.gain.value = 0.25;
        src.connect(filter); filter.connect(gain); gain.connect(this.soundCtx.destination);
        src.start();
      }, 400);
    } catch (e) {}
  },

  triggerFog() {
    this.fogTargetOpacity = 0.55;
  },

  triggerRainbow() {
    this.rainbow.targetOpacity = 1;
    this.playMagicChime();
  },

  triggerSunny() {
    this.weatherMode = 'sunny';
    // 让云朵停止下雨
    this.clouds.forEach(c => { c.raining = false; c.rainTimer = 0; });
    // 渐弱雨/雪/雾
    this.fogTargetOpacity = 0;
    // 雪花保留让其落完
    this.timeOfDayTarget = 0.5;
    this.moon.targetOpacity = 0;
    this.playMagicChime();
  },

  triggerDay() {
    this.timeOfDayTarget = 0.5;
    this.moon.targetOpacity = 0;
    // 星星渐弱
    this.nightStars.forEach(s => s.opacity = 0);
  },

  triggerNight() {
    this.timeOfDayTarget = 0.98;
    this.moon.targetOpacity = 1;
    // 星星渐显
    this.nightStars.forEach(s => s.opacity = 0.6 + Math.random() * 0.4);
    this.playMagicChime();
  },

  triggerStars() {
    // 不切夜，但加强星星显示
    this.nightStars.forEach(s => s.opacity = Math.max(s.opacity, 0.8));
    this.playMagicChime();
  },

  triggerFireworks() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.fireworks.push({
          x: w * (0.2 + Math.random() * 0.6),
          y: h,
          vy: -(7 + Math.random() * 3),
          targetY: h * (0.15 + Math.random() * 0.25),
          color: this.randomFireworkColor(),
          exploded: false,
          particles: [],
          life: 1
        });
        this.playTone(800 + Math.random() * 400, 0.3, 'sine', 0.06);
      }, i * 300);
    }
  },

  randomFireworkColor() {
    const colors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B', '#C780FA', '#FFAA5A'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  triggerShootingStar() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    for (let i = 0; i < 3; i++) {
      this.shootingStars.push({
        x: Math.random() * w * 0.5,
        y: Math.random() * h * 0.3,
        vx: 8 + Math.random() * 4,
        vy: 4 + Math.random() * 2,
        life: 1.2,
        maxLife: 1.2
      });
    }
    this.playTone(2000, 0.4, 'sine', 0.08);
  },

  triggerBubbles() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    for (let i = 0; i < 30; i++) {
      this.bubbles.push({
        x: Math.random() * w,
        y: h + Math.random() * 50,
        size: 6 + Math.random() * 18,
        vy: -(0.5 + Math.random() * 1.2),
        swayPhase: Math.random() * Math.PI * 2,
        life: 1
      });
    }
    this.playTone(1500, 0.1, 'sine', 0.06);
  },

  triggerBalloons() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const colors = ['#FF69B4', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B', '#C780FA'];
    for (let i = 0; i < 8; i++) {
      this.balloons.push({
        x: 50 + Math.random() * (w - 100),
        y: h + 40 + i * 20,
        vy: -(0.6 + Math.random() * 0.5),
        swayPhase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 18 + Math.random() * 10,
        stringLen: 30 + Math.random() * 20
      });
    }
  },

  triggerSakura() {
    // 持续产生樱花，由 sakuraSpawnTime 控制
    this._sakuraSpawnUntil = this.time + 12;
    this.playMagicChime();
  },

  triggerButterflies() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const groundY = h * 0.6;
    for (let i = 0; i < 10; i++) {
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
    // 限制总数避免爆炸
    if (this.butterflies.length > 30) {
      this.butterflies.splice(0, this.butterflies.length - 30);
    }
  },

  triggerBirds() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    for (let i = 0; i < 5; i++) {
      this.birds.push({
        x: Math.random() * w,
        y: h * 0.1 + Math.random() * h * 0.2,
        speed: 1 + Math.random() * 2,
        wingPhase: Math.random() * Math.PI * 2,
        size: 4 + Math.random() * 4,
        chirpTimer: Math.random() * 5
      });
    }
    if (this.birds.length > 15) {
      this.birds.splice(0, this.birds.length - 15);
    }
    this.playBirdChirp();
  },

  triggerUnicorn() {
    if (this.unicorn) return; // 已有就不重复
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const fromRight = Math.random() > 0.5;
    this.unicorn = {
      x: fromRight ? w + 80 : -80,
      y: h * 0.6 - 5,
      vx: fromRight ? -2.4 : 2.4,
      bobPhase: 0,
      manePhase: 0,
      life: 1
    };
    this.playMagicChime();
  },

  triggerDragon() {
    if (this.dragon) return;
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const fromRight = Math.random() > 0.5;
    const baseY = h * (0.15 + Math.random() * 0.2);
    const segments = [];
    for (let i = 0; i < 14; i++) {
      segments.push({
        x: fromRight ? w + 60 + i * 22 : -60 - i * 22,
        y: baseY,
        phase: i * 0.5
      });
    }
    this.dragon = {
      vx: fromRight ? -3 : 3,
      baseY: baseY,
      wavePhase: 0,
      segments,
      life: 1,
      fromRight
    };
    this.playTone(220, 0.6, 'sawtooth', 0.12);
    setTimeout(() => this.playTone(180, 0.5, 'sawtooth', 0.1), 200);
  },

  triggerBloom() {
    this.bloomEffect = 1;
    // 花朵周围撒一圈粉色亮片
    this.flowers.forEach(f => {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 15;
        this.sparkles.push({
          x: f.x + Math.cos(a) * r,
          y: f.y - f.stemHeight + Math.sin(a) * r,
          vx: Math.cos(a) * 0.6,
          vy: Math.sin(a) * 0.6 - 0.5,
          life: 1,
          size: 3 + Math.random() * 3,
          color: f.color,
          type: 'star'
        });
      }
    });
    this.playMagicChime();
  },

  triggerDance() {
    this.danceEffect = 1;
    this.playTone(523, 0.2, 'sine', 0.1);
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.1), 200);
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.1), 400);
  },

  triggerCake() {
    if (this.cake) return;
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const candles = [];
    for (let i = 0; i < 7; i++) {
      candles.push({
        relX: -42 + i * 14,
        flamePhase: Math.random() * Math.PI * 2,
        lit: true
      });
    }
    this.cake = {
      x: w / 2,
      y: h + 250,
      targetY: h * 0.5,
      bouncePhase: 0,
      life: 1,
      candles
    };
    // 撒一波彩色纸屑/星星
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.sparkles.push({
        x: w / 2,
        y: h * 0.5,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1,
        life: 1.5,
        size: 4 + Math.random() * 4,
        color: this.randomFireworkColor(),
        type: 'star'
      });
    }
    // 生日歌前奏 "Happy birth-day to you"
    const notes = [262, 262, 294, 262, 349, 330];
    notes.forEach((n, i) => setTimeout(() => this.playTone(n, 0.3, 'sine', 0.1), i * 280));
  },

  triggerTornado() {
    if (this.tornado) return;
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const fromRight = Math.random() > 0.5;
    this.tornado = {
      x: fromRight ? w + 80 : -80,
      vx: fromRight ? -1.9 : 1.9,
      baseY: h * 0.6,
      height: h * 0.55,
      baseRadius: 30,
      topRadius: 95,
      swirlPhase: 0,
      captured: [],
      bikeGirlSnatched: false,
      life: 1
    };
    this.playTornadoSound();
  },

  playTornadoSound() {
    if (!this.soundCtx) return;
    try {
      // 低沉持续轰隆
      const dur = 3;
      const buf = this.soundCtx.createBuffer(1, this.soundCtx.sampleRate * dur, this.soundCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // 颤动包络
        const t = i / this.soundCtx.sampleRate;
        const env = Math.min(1, t * 2) * Math.min(1, (dur - t) * 1.5);
        data[i] = (Math.random() * 2 - 1) * env * 0.6;
      }
      const src = this.soundCtx.createBufferSource();
      src.buffer = buf;
      const filter = this.soundCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      const gain = this.soundCtx.createGain();
      gain.gain.value = 0.18;
      src.connect(filter); filter.connect(gain); gain.connect(this.soundCtx.destination);
      src.start();
    } catch (e) {}
  },

  triggerKids() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const groundY = h * 0.6;
    const palettes = [
      { skin: '#FFD7B3', shirt: '#FF69B4', pant: '#3F51B5', hair: '#3E2723' },
      { skin: '#E8B89A', shirt: '#FFD93D', pant: '#FF6347', hair: '#5D4037' },
      { skin: '#FFE0CC', shirt: '#6BCB77', pant: '#4D96FF', hair: '#212121' },
      { skin: '#D9A877', shirt: '#9370DB', pant: '#FF8C42', hair: '#4E342E' },
      { skin: '#FFCCAA', shirt: '#4ADE80', pant: '#FF6B9D', hair: '#6D4C41' }
    ];
    const count = 5;
    for (let i = 0; i < count; i++) {
      this.kids.push(this._makeKid(palettes[i % palettes.length], w, groundY));
    }
    if (this.kids.length > 10) {
      this.kids.splice(0, this.kids.length - 10);
    }
    // 欢笑声
    [600, 800, 700, 900].forEach((f, i) =>
      setTimeout(() => this.playTone(f, 0.12, 'sine', 0.06), i * 100));
  },

  _makeKid(palette, w, groundY) {
    return {
      x: 60 + Math.random() * Math.max(40, w - 120),
      y: groundY - 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.6),
      animPhase: Math.random() * Math.PI * 2,
      jumpY: 0,
      jumpV: 0,
      jumpTimer: 1 + Math.random() * 3,
      colors: palette,
      hairType: Math.random() > 0.5 ? 'pigtail' : 'short',
      hasBalloon: Math.random() > 0.6,
      balloonColor: ['#FF69B4', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA'][Math.floor(Math.random() * 5)]
    };
  },

  // ========== 各特效 update 方法 ==========

  updateTimeOfDay(dt) {
    if (this.timeOfDayTarget !== null) {
      const diff = this.timeOfDayTarget - this.timeOfDay;
      if (Math.abs(diff) < 0.005) {
        this.timeOfDay = this.timeOfDayTarget;
        this.timeOfDayTarget = null;
      } else {
        this.timeOfDay += diff * 0.04;
      }
    }
  },

  updateWeatherSpawners(dt) {
    // 持续雪
    if (this.weatherMode === 'snow') {
      if (Math.random() < 0.6) {
        this.snowflakes.push(this.makeSnowflake());
      }
    }
    // 持续雨：让云朵保持下雨 + 全屏额外雨滴
    if (this.weatherMode === 'rain') {
      this.clouds.forEach(c => {
        if (c.rainTimer < 3) c.rainTimer = 10;
        c.raining = true;
      });
      // 全屏倾盆大雨：从云层之外也降雨
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.8) {
          this.raindrops.push({
            x: Math.random() * this.sceneWidth,
            y: -10,
            speed: 5 + Math.random() * 5,
            size: 2 + Math.random() * 2,
            sparkle: Math.random() > 0.5,
            life: 1
          });
        }
      }
    }
    // 持续樱花
    if (this._sakuraSpawnUntil && this.time < this._sakuraSpawnUntil) {
      if (Math.random() < 0.4) {
        this.sakuraPetals.push({
          x: Math.random() * this.sceneWidth,
          y: -10,
          vy: 0.6 + Math.random() * 0.8,
          vxBase: (Math.random() - 0.5) * 0.5,
          swayPhase: Math.random() * Math.PI * 2,
          size: 5 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08
        });
      }
    }
  },

  updateSnowflakes(dt) {
    const h = this.sceneHeight;
    const wind = this.windForce * this.windDirection;
    this.snowflakes.forEach(s => {
      s.swayPhase += dt * 1.5;
      const sway = Math.sin(s.swayPhase) * 0.6;
      s.x += sway + s.vxBase + wind * 2;
      s.y += s.vy * (0.6 + s.size * 0.2);
    });
    this.snowflakes = this.snowflakes.filter(s => s.y < h * 0.62);
    // 上限
    if (this.snowflakes.length > 300) this.snowflakes.splice(0, this.snowflakes.length - 300);
  },

  updateNightStars(dt) {
    this.nightStars.forEach(s => {
      s.phase += dt * 2;
    });
  },

  updateShootingStars(dt) {
    this.shootingStars.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= dt * 0.5;
    });
    this.shootingStars = this.shootingStars.filter(s => s.life > 0 && s.x < this.sceneWidth + 100);
  },

  updateFireworks(dt) {
    this.fireworks.forEach(fw => {
      if (!fw.exploded) {
        fw.y += fw.vy;
        fw.vy += 0.12; // 上升减速
        if (fw.y <= fw.targetY || fw.vy >= 0) {
          fw.exploded = true;
          // 爆炸
          const particleCount = 35 + Math.floor(Math.random() * 20);
          for (let i = 0; i < particleCount; i++) {
            const a = (i / particleCount) * Math.PI * 2 + Math.random() * 0.2;
            const speed = 2 + Math.random() * 3;
            fw.particles.push({
              x: fw.x, y: fw.y,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 1
            });
          }
          this.playTone(120, 0.2, 'square', 0.15);
          // 高频爆裂
          setTimeout(() => {
            for (let i = 0; i < 6; i++) {
              setTimeout(() => this.playTone(2000 + Math.random() * 2000, 0.05, 'sine', 0.04), i * 30);
            }
          }, 50);
        }
      } else {
        fw.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.vx *= 0.99;
          p.life -= dt * 0.7;
        });
        fw.particles = fw.particles.filter(p => p.life > 0);
        if (fw.particles.length === 0) fw.life = 0;
      }
    });
    this.fireworks = this.fireworks.filter(fw => fw.life > 0);
  },

  updateBubbles(dt) {
    this.bubbles.forEach(b => {
      b.swayPhase += dt * 1.5;
      b.x += Math.sin(b.swayPhase) * 0.8 + this.windForce * this.windDirection;
      b.y += b.vy;
      b.life -= dt * 0.08;
    });
    this.bubbles = this.bubbles.filter(b => b.life > 0 && b.y > -20);
  },

  updateBalloons(dt) {
    this.balloons.forEach(b => {
      b.swayPhase += dt * 1.2;
      b.x += Math.sin(b.swayPhase) * 0.6 + this.windForce * this.windDirection * 1.5;
      b.y += b.vy;
    });
    this.balloons = this.balloons.filter(b => b.y > -80);
  },

  updateSakuraPetals(dt) {
    const h = this.sceneHeight;
    const wind = this.windForce * this.windDirection;
    this.sakuraPetals.forEach(p => {
      p.swayPhase += dt * 1.8;
      p.x += Math.sin(p.swayPhase) * 1.2 + p.vxBase + wind * 2.5;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
    });
    this.sakuraPetals = this.sakuraPetals.filter(p => p.y < h * 0.62);
    if (this.sakuraPetals.length > 200) this.sakuraPetals.splice(0, this.sakuraPetals.length - 200);
  },

  updateMoon(dt) {
    this.moon.opacity += (this.moon.targetOpacity - this.moon.opacity) * 0.05;
  },

  updateUnicorn(dt) {
    if (!this.unicorn) return;
    const u = this.unicorn;
    u.x += u.vx;
    u.bobPhase += dt * 8;
    u.manePhase += dt * 4;
    if (u.x < -100 || u.x > this.sceneWidth + 100) {
      this.unicorn = null;
    }
  },

  updateDragon(dt) {
    if (!this.dragon) return;
    const d = this.dragon;
    d.wavePhase += dt * 3;
    // 头部移动
    const head = d.segments[0];
    head.x += d.vx;
    head.y = d.baseY + Math.sin(d.wavePhase) * 30;
    // 后续段跟随前一段
    for (let i = 1; i < d.segments.length; i++) {
      const prev = d.segments[i - 1];
      const seg = d.segments[i];
      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const targetDist = 22;
      if (dist > targetDist) {
        seg.x += (dx / dist) * (dist - targetDist);
        seg.y += (dy / dist) * (dist - targetDist);
      }
    }
    // 飞出画面
    const tail = d.segments[d.segments.length - 1];
    if ((d.fromRight && tail.x < -50) || (!d.fromRight && tail.x > this.sceneWidth + 50)) {
      this.dragon = null;
    }
  },

  updateCake(dt) {
    if (!this.cake) return;
    const c = this.cake;
    // 上升到目标位置
    if (c.y > c.targetY) {
      c.y += (c.targetY - c.y) * 0.08;
    }
    c.bouncePhase += dt * 3;
    c.candles.forEach(cd => cd.flamePhase += dt * 8);
    // 8 秒后慢慢消失
    c.life -= dt * 0.12;
    if (c.life <= 0) this.cake = null;
  },

  updateKids(dt) {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const groundY = h * 0.6;
    this.kids.forEach(k => {
      k.animPhase += dt * 6 * Math.sign(k.vx || 1);
      k.x += k.vx;
      // 边界反向
      if (k.x < 30) { k.x = 30; k.vx = Math.abs(k.vx); }
      if (k.x > w - 30) { k.x = w - 30; k.vx = -Math.abs(k.vx); }
      // 风影响：风大时被吹飘
      if (this.windForce > 0.4) {
        k.x += this.windDirection * this.windForce * 1.5;
      }
      // 偶尔随机变向
      if (Math.random() < 0.003) k.vx = -k.vx;
      // 跳跃
      k.jumpTimer -= dt;
      if (k.jumpTimer <= 0 && k.jumpY === 0) {
        k.jumpV = -7;
        k.jumpTimer = 1.5 + Math.random() * 3;
      }
      if (k.jumpV !== 0 || k.jumpY < 0) {
        k.jumpV += 25 * dt;
        k.jumpY += k.jumpV;
        if (k.jumpY >= 0) { k.jumpY = 0; k.jumpV = 0; }
      }
      // 确保贴地
      k.y = groundY - 2;
    });
  },

  updateTornado(dt) {
    if (!this.tornado) return;
    const t = this.tornado;
    const w = this.sceneWidth;
    t.x += t.vx;
    t.swirlPhase += dt * 15;

    // 给定高度下的吸入半径
    const radiusAt = (heightAbove) => {
      const factor = Math.max(0, Math.min(1, heightAbove / t.height));
      return t.baseRadius + (t.topRadius - t.baseRadius) * factor;
    };
    const inRange = (x, heightAbove) => {
      if (heightAbove < -10 || heightAbove > t.height + 20) return false;
      const r = radiusAt(Math.max(0, heightAbove));
      return Math.abs(x - t.x) < r * 1.4;
    };

    // 吸入花朵
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const f = this.flowers[i];
      const h = (t.baseY - f.y) + f.stemHeight;
      if (inRange(f.x, h)) {
        t.captured.push(this._makeCapture('flower', f));
        this.flowers.splice(i, 1);
      }
    }
    // 吸入蝴蝶
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const b = this.butterflies[i];
      const h = t.baseY - b.y;
      if (inRange(b.x, h)) {
        t.captured.push(this._makeCapture('butterfly', b));
        this.butterflies.splice(i, 1);
      }
    }
    // 吸入鸟
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      const h = t.baseY - b.y;
      if (inRange(b.x, h)) {
        t.captured.push(this._makeCapture('bird', b));
        this.birds.splice(i, 1);
      }
    }
    // 吸入气球
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const h = t.baseY - b.y;
      if (inRange(b.x, h)) {
        t.captured.push(this._makeCapture('balloon', b));
        this.balloons.splice(i, 1);
      }
    }
    // 吸入小孩
    for (let i = this.kids.length - 1; i >= 0; i--) {
      const k = this.kids[i];
      if (inRange(k.x, 40)) {
        t.captured.push(this._makeCapture('kid', k));
        this.kids.splice(i, 1);
      }
    }
    // 吸入自行车女孩
    if (!t.bikeGirlSnatched && this.bikeGirl && this.bikeGirl.visible) {
      if (inRange(this.bikeGirl.x, 35)) {
        t.captured.push(this._makeCapture('bikeGirl', this.bikeGirl));
        t.bikeGirlSnatched = true;
        this.bikeGirl.visible = false;
      }
    }
    // 吸入蒲公英植株（让它"释放"）
    this.dandelionPlants.forEach(dp => {
      if (!dp.released && inRange(dp.x, 30)) {
        this.releaseDandelionSeeds(dp);
      }
    });

    // 更新已捕获元素的位置
    t.captured.forEach(c => {
      c.angle += dt * c.spinSpeed;
      c.heightOffset += dt * 35;
      if (c.heightOffset > t.height + 50) c.heightOffset = t.height + 50;
      const r = radiusAt(c.heightOffset);
      c.x = t.x + Math.cos(c.angle) * r * 0.95;
      c.y = t.baseY - c.heightOffset + Math.sin(c.angle) * r * 0.25;
    });

    // 龙卷风出场：清理并启动重生
    if ((t.vx < 0 && t.x < -200) || (t.vx > 0 && t.x > w + 200)) {
      this.tornadoRegenItems = t.captured.map(c => c.kind);
      this.tornadoRegenPending = true;
      this.tornadoRegenTimer = 0;
      this._regenCooldown = 0;
      this.tornado = null;
    }
  },

  _makeCapture(kind, item) {
    return {
      kind, item,
      angle: Math.random() * Math.PI * 2,
      heightOffset: 20 + Math.random() * 80,
      spinSpeed: 7 + Math.random() * 5,
      x: item.x || 0,
      y: item.y || 0
    };
  },

  updateTornadoRegen(dt) {
    if (!this.tornadoRegenPending) return;
    this.tornadoRegenTimer += dt;
    // 等 2 秒再开始重生
    if (this.tornadoRegenTimer < 2) return;
    this._regenCooldown -= dt;
    if (this._regenCooldown > 0) return;
    if (!this.tornadoRegenItems || this.tornadoRegenItems.length === 0) {
      this.tornadoRegenPending = false;
      return;
    }
    const kind = this.tornadoRegenItems.shift();
    this._regenCooldown = 0.25 + Math.random() * 0.15;
    switch (kind) {
      case 'flower':    this._regenFlower(); break;
      case 'butterfly': this._regenButterfly(); break;
      case 'bird':      this._regenBird(); break;
      case 'kid':       this._regenKid(); break;
      case 'bikeGirl':  this._regenBikeGirl(); break;
      // balloon 不复活（短命特效）
    }
  },

  _regenFlower() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    const groundY = h * 0.6;
    const f = {
      x: Math.random() * w,
      y: groundY + 10 + Math.random() * (h - groundY - 40),
      size: 8 + Math.random() * 10,
      color: this.randomFlowerColor(),
      sway: 0,
      swayPhase: Math.random() * Math.PI * 2,
      petals: 5 + Math.floor(Math.random() * 3),
      stemHeight: 15 + Math.random() * 25,
      _grow: 0
    };
    this.flowers.push(f);
    // 小亮片：花朵复活
    for (let i = 0; i < 3; i++) {
      this.sparkles.push({
        x: f.x, y: f.y - f.stemHeight,
        vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(),
        life: 0.6, size: 3, color: f.color, type: 'star'
      });
    }
  },

  _regenButterfly() {
    const w = this.sceneWidth;
    const groundY = this.sceneHeight * 0.6;
    this.butterflies.push({
      x: Math.random() * w,
      y: groundY - 30 - Math.random() * 80,
      targetX: Math.random() * w,
      targetY: groundY - 50 - Math.random() * 80,
      wingPhase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1,
      color1: this.randomButterflyColor(),
      color2: this.randomButterflyColor(),
      size: 8 + Math.random() * 6,
      scattered: false
    });
  },

  _regenBird() {
    const w = this.sceneWidth;
    const h = this.sceneHeight;
    this.birds.push({
      x: Math.random() > 0.5 ? -20 : w + 20,
      y: h * 0.1 + Math.random() * h * 0.2,
      speed: 1 + Math.random() * 2,
      wingPhase: Math.random() * Math.PI * 2,
      size: 4 + Math.random() * 4,
      chirpTimer: Math.random() * 10
    });
  },

  _regenKid() {
    const w = this.sceneWidth;
    const groundY = this.sceneHeight * 0.6;
    const palettes = [
      { skin: '#FFD7B3', shirt: '#FF69B4', pant: '#3F51B5', hair: '#3E2723' },
      { skin: '#E8B89A', shirt: '#FFD93D', pant: '#FF6347', hair: '#5D4037' },
      { skin: '#FFE0CC', shirt: '#6BCB77', pant: '#4D96FF', hair: '#212121' },
      { skin: '#D9A877', shirt: '#9370DB', pant: '#FF8C42', hair: '#4E342E' }
    ];
    this.kids.push(this._makeKid(palettes[Math.floor(Math.random() * palettes.length)], w, groundY));
  },

  _regenBikeGirl() {
    if (!this.bikeGirl) return;
    this.bikeGirl.x = -100;
    this.bikeGirl.visible = true;
    this.bikeGirl.speed = 1.5;
    this.bikeGirl.pauseTimer = 0;
  },

  updateFog(dt) {
    this.fogOpacity += (this.fogTargetOpacity - this.fogOpacity) * 0.04;
    // 雾会慢慢自然消散
    if (this.fogTargetOpacity > 0) {
      this.fogTargetOpacity -= dt * 0.02;
      if (this.fogTargetOpacity < 0) this.fogTargetOpacity = 0;
    }
  },

  updateThunder(dt) {
    this.thunderFlash -= dt * 3;
    if (this.thunderFlash < 0) this.thunderFlash = 0;
    if (this.thunderBolt) {
      this.thunderBolt.life -= dt;
      if (this.thunderBolt.life <= 0) this.thunderBolt = null;
    }
  },

  updateBloomDance(dt) {
    if (this.bloomEffect > 0) {
      this.bloomEffect -= dt * 0.18;
      if (this.bloomEffect < 0) this.bloomEffect = 0;
    }
    if (this.danceEffect > 0) {
      this.danceEffect -= dt * 0.12;
      if (this.danceEffect < 0) this.danceEffect = 0;
    }
  },

  // ========== 各特效 draw 方法 ==========

  drawSnowflakes(ctx) {
    if (this.snowflakes.length === 0) return;
    ctx.save();
    this.snowflakes.forEach(s => {
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      // 小十字
      if (s.size > 2.5) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - s.size * 1.4, s.y);
        ctx.lineTo(s.x + s.size * 1.4, s.y);
        ctx.moveTo(s.x, s.y - s.size * 1.4);
        ctx.lineTo(s.x, s.y + s.size * 1.4);
        ctx.stroke();
      }
    });
    ctx.restore();
  },

  drawNightStars(ctx) {
    let any = false;
    for (const s of this.nightStars) if (s.opacity > 0.01) { any = true; break; }
    if (!any) return;
    ctx.save();
    this.nightStars.forEach(s => {
      if (s.opacity < 0.01) return;
      const twinkle = 0.6 + 0.4 * Math.sin(s.phase);
      ctx.globalAlpha = s.opacity * twinkle;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },

  drawMoon(ctx) {
    if (this.moon.opacity < 0.01) return;
    ctx.save();
    ctx.globalAlpha = this.moon.opacity;
    // 光晕
    const grad = ctx.createRadialGradient(this.moon.x, this.moon.y, 0, this.moon.x, this.moon.y, this.moon.radius * 2.5);
    grad.addColorStop(0, 'rgba(255, 250, 220, 0.5)');
    grad.addColorStop(1, 'rgba(255, 250, 220, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.moon.x, this.moon.y, this.moon.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    // 月亮本体
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(this.moon.x, this.moon.y, this.moon.radius, 0, Math.PI * 2);
    ctx.fill();
    // 月坑
    ctx.fillStyle = 'rgba(200, 190, 160, 0.5)';
    ctx.beginPath();
    ctx.arc(this.moon.x - 10, this.moon.y - 5, 5, 0, Math.PI * 2);
    ctx.arc(this.moon.x + 8, this.moon.y + 7, 4, 0, Math.PI * 2);
    ctx.arc(this.moon.x + 2, this.moon.y - 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawShootingStars(ctx) {
    if (this.shootingStars.length === 0) return;
    ctx.save();
    this.shootingStars.forEach(s => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.globalAlpha = alpha;
      const tailLen = 60;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      // 头部亮点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },

  drawFireworks(ctx) {
    if (this.fireworks.length === 0) return;
    ctx.save();
    this.fireworks.forEach(fw => {
      if (!fw.exploded) {
        // 上升轨迹
        ctx.fillStyle = fw.color;
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = fw.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fw.x, fw.y);
        ctx.lineTo(fw.x, fw.y + 20);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        fw.particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = fw.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
  },

  drawBubbles(ctx) {
    if (this.bubbles.length === 0) return;
    ctx.save();
    this.bubbles.forEach(b => {
      ctx.globalAlpha = Math.min(1, b.life) * 0.7;
      // 外圈
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.stroke();
      // 彩虹反光
      const grad = ctx.createRadialGradient(b.x - b.size * 0.4, b.y - b.size * 0.4, 0, b.x, b.y, b.size);
      grad.addColorStop(0, 'rgba(255,255,255,0.4)');
      grad.addColorStop(0.4, 'rgba(176,224,230,0.15)');
      grad.addColorStop(0.7, 'rgba(255,182,193,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.35, b.y - b.size * 0.35, b.size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },

  drawBalloons(ctx) {
    if (this.balloons.length === 0) return;
    ctx.save();
    this.balloons.forEach(b => {
      // 线
      ctx.strokeStyle = 'rgba(120,120,120,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x + Math.sin(b.swayPhase) * 4, b.y + b.stringLen * 0.5, b.x, b.y + b.stringLen);
      ctx.stroke();
      // 气球本体
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.size * 0.9, b.size, 0, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(b.x - b.size * 0.35, b.y - b.size * 0.4, b.size * 0.2, b.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 底部小三角（气球嘴）
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y + b.size);
      ctx.lineTo(b.x + 3, b.y + b.size);
      ctx.lineTo(b.x, b.y + b.size + 5);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  },

  drawSakuraPetals(ctx) {
    if (this.sakuraPetals.length === 0) return;
    ctx.save();
    this.sakuraPetals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = '#FFB7C5';
      ctx.beginPath();
      // 椭圆花瓣
      ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      // 中间深色
      ctx.fillStyle = '#FF8FA8';
      ctx.beginPath();
      ctx.ellipse(0, p.size * 0.3, p.size * 0.2, p.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  },

  drawUnicorn(ctx) {
    if (!this.unicorn) return;
    const u = this.unicorn;
    const bob = Math.sin(u.bobPhase) * 3;
    const facingLeft = u.vx < 0;
    ctx.save();
    ctx.translate(u.x, u.y + bob);
    if (facingLeft) ctx.scale(-1, 1);

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 35, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体（白色）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, -10, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿（四条简单矩形 + 跑动相位）
    const legPhases = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
    const legXs = [-22, -10, 8, 20];
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E0E0E0';
    legXs.forEach((lx, i) => {
      const ly = Math.sin(u.bobPhase + legPhases[i]) * 4;
      ctx.beginPath();
      ctx.moveTo(lx - 3, 0);
      ctx.lineTo(lx + 3, 0);
      ctx.lineTo(lx + 2, 18 + ly);
      ctx.lineTo(lx - 2, 18 + ly);
      ctx.closePath();
      ctx.fill();
    });

    // 头
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(28, -20, 12, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 角（金色）
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFAA00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, -28);
    ctx.lineTo(36, -42);
    ctx.lineTo(40, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(32, -20, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 彩虹鬃毛
    const maneColors = ['#FF69B4', '#FFD700', '#7FFF00', '#00BFFF', '#9370DB'];
    maneColors.forEach((c, i) => {
      ctx.fillStyle = c;
      const offset = Math.sin(u.manePhase + i * 0.5) * 3;
      ctx.beginPath();
      ctx.ellipse(18 - i * 4, -22 - i * 2 + offset, 6, 12, -0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 彩虹尾巴
    maneColors.forEach((c, i) => {
      ctx.fillStyle = c;
      const offset = Math.sin(u.manePhase + i * 0.3 + 1) * 4;
      ctx.beginPath();
      ctx.ellipse(-30 - i * 2, -10 + i * 3 + offset, 5, 10, 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  },

  drawDragon(ctx) {
    if (!this.dragon) return;
    const d = this.dragon;
    ctx.save();

    // 身体段（从尾到头画，方便覆盖）
    for (let i = d.segments.length - 1; i >= 0; i--) {
      const seg = d.segments[i];
      const radius = 14 - i * 0.6;
      ctx.fillStyle = i % 2 === 0 ? '#D4382A' : '#E85A4F';
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, Math.max(4, radius), 0, Math.PI * 2);
      ctx.fill();
      // 鳞片高光
      ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
      ctx.beginPath();
      ctx.arc(seg.x, seg.y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 头部
    const head = d.segments[0];
    const facingLeft = d.vx < 0;
    ctx.save();
    ctx.translate(head.x, head.y);
    if (facingLeft) ctx.scale(-1, 1);

    // 头
    ctx.fillStyle = '#D4382A';
    ctx.beginPath();
    ctx.ellipse(8, 0, 18, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // 角
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-6, -22);
    ctx.lineTo(4, -14);
    ctx.closePath();
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(14, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(15, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 胡须
    ctx.strokeStyle = '#FFE066';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 4);
    ctx.quadraticCurveTo(35, 8, 40, 0);
    ctx.moveTo(20, 6);
    ctx.quadraticCurveTo(38, 14, 45, 10);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  },

  drawCake(ctx) {
    if (!this.cake) return;
    const c = this.cake;
    const bob = Math.sin(c.bouncePhase) * 4;
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.life);
    ctx.translate(c.x, c.y + bob);

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 70, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 三层蛋糕（从底往上画）
    const layers = [
      { w: 130, h: 36, color: '#F8B7C6' },
      { w: 100, h: 30, color: '#FFE5F0' },
      { w: 70,  h: 24, color: '#FFFFFF' }
    ];
    let yCursor = 0;
    layers.forEach(layer => {
      const top = yCursor - layer.h;
      // 主体
      ctx.fillStyle = layer.color;
      ctx.fillRect(-layer.w / 2, top, layer.w, layer.h);
      // 顶面椭圆（厚度感）
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, top, layer.w / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // 奶油花边
      const dotsCount = Math.floor(layer.w / 14);
      for (let i = 0; i < dotsCount; i++) {
        const cx = -layer.w / 2 + 7 + i * 14;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, top, 5, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      // 装饰彩点
      const dotColors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA'];
      for (let i = 0; i < dotsCount - 1; i++) {
        ctx.fillStyle = dotColors[i % dotColors.length];
        const dx = -layer.w / 2 + 14 + i * 14;
        ctx.beginPath();
        ctx.arc(dx, top + layer.h / 2 + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      yCursor = top;
    });

    // 蜡烛（在顶层上方）
    c.candles.forEach(cd => {
      const cx = cd.relX;
      const cTop = yCursor - 18; // 蜡烛顶
      // 蜡烛本体（彩色条纹）
      const stripeColors = ['#FFAA88', '#88CCFF', '#FFCC44', '#FF88BB', '#AAFF88', '#CC88FF', '#FF8888'];
      ctx.fillStyle = stripeColors[Math.abs(Math.floor(cd.relX)) % stripeColors.length];
      ctx.fillRect(cx - 2.5, cTop, 5, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx - 0.5, cTop, 1, 18);

      // 火焰
      if (cd.lit) {
        const flicker = Math.sin(cd.flamePhase) * 1.5;
        const fx = cx + flicker * 0.5;
        const fy = cTop - 2;
        // 光晕
        const halo = ctx.createRadialGradient(fx, fy - 4, 0, fx, fy - 4, 28);
        halo.addColorStop(0, 'rgba(255, 220, 100, 0.4)');
        halo.addColorStop(1, 'rgba(255, 220, 100, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(fx, fy - 4, 28, 0, Math.PI * 2);
        ctx.fill();
        // 外焰（橙色）
        ctx.fillStyle = '#FF8C1A';
        ctx.beginPath();
        ctx.ellipse(fx, fy - 4, 3.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // 内焰（黄色）
        ctx.fillStyle = '#FFD93D';
        ctx.beginPath();
        ctx.ellipse(fx, fy - 4, 1.8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 焰心（白）
        ctx.fillStyle = '#FFFAE0';
        ctx.beginPath();
        ctx.ellipse(fx, fy - 3, 0.8, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // "Happy Birthday" 小气泡（顶部）
    if (c.life > 0.3) {
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF69B4';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      const text = '🎉 Happy Birthday! 🎉';
      ctx.strokeText(text, 0, yCursor - 45);
      ctx.fillText(text, 0, yCursor - 45);
    }

    ctx.restore();
  },

  drawKids(ctx) {
    if (this.kids.length === 0) return;
    this.kids.forEach(k => {
      this._drawKid(ctx, k.x, k.y + k.jumpY, k);
    });
  },

  _drawKid(ctx, x, y, k) {
    const facing = k.vx < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);

    // 阴影（不随翻转）
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.scale(facing, 1);

    const legSwing = Math.sin(k.animPhase) * 8;
    const armSwing = Math.sin(k.animPhase + Math.PI) * 7;

    // 腿
    ctx.strokeStyle = k.colors.pant;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.5, -14);
    ctx.lineTo(-2.5 + legSwing * 0.2, -5);
    ctx.lineTo(-1 + legSwing, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2.5, -14);
    ctx.lineTo(2.5 - legSwing * 0.2, -5);
    ctx.lineTo(1 - legSwing, 1);
    ctx.stroke();

    // 身体（衬衫）
    ctx.fillStyle = k.colors.shirt;
    ctx.beginPath();
    ctx.ellipse(0, -22, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 手臂
    ctx.strokeStyle = k.colors.shirt;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -25);
    ctx.lineTo(-8 + armSwing, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -25);
    ctx.lineTo(8 - armSwing, -15);
    ctx.stroke();
    // 手
    ctx.fillStyle = k.colors.skin;
    ctx.beginPath();
    ctx.arc(-8 + armSwing, -15, 1.8, 0, Math.PI * 2);
    ctx.arc(8 - armSwing, -15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 头
    ctx.fillStyle = k.colors.skin;
    ctx.beginPath();
    ctx.arc(0, -36, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 头发
    ctx.fillStyle = k.colors.hair;
    if (k.hairType === 'pigtail') {
      ctx.beginPath();
      ctx.arc(-7, -36, 3.5, 0, Math.PI * 2);
      ctx.arc(7, -36, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // 头顶刘海
      ctx.beginPath();
      ctx.arc(0, -39, 7, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, -39, 7.5, Math.PI, Math.PI * 0.1);
      ctx.fill();
    }

    // 眼睛
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-2.5, -36, 0.9, 0, Math.PI * 2);
    ctx.arc(2.5, -36, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // 笑脸
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -33, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // 脸蛋红晕
    ctx.fillStyle = 'rgba(255,160,170,0.5)';
    ctx.beginPath();
    ctx.arc(-4.5, -34, 1.8, 0, Math.PI * 2);
    ctx.arc(4.5, -34, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // 取消翻转

    // 气球（不翻转，跟着头）
    if (k.hasBalloon) {
      ctx.strokeStyle = 'rgba(120,120,120,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(facing * 6, -28);
      ctx.quadraticCurveTo(facing * 8, -45, facing * 6 + 2, -58);
      ctx.stroke();
      ctx.fillStyle = k.balloonColor;
      ctx.beginPath();
      ctx.ellipse(facing * 6 + 2, -66, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(facing * 6, -69, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  drawTornado(ctx) {
    if (!this.tornado) return;
    const t = this.tornado;
    ctx.save();

    // 渲染漏斗：从底部到顶部用渐变填充垂直条带
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const f1 = i / segments;
      const f2 = (i + 1) / segments;
      const h1 = f1 * t.height;
      const h2 = f2 * t.height;
      const r1 = t.baseRadius + (t.topRadius - t.baseRadius) * f1;
      const r2 = t.baseRadius + (t.topRadius - t.baseRadius) * f2;
      // 该层的旋转抖动
      const wobble = Math.sin(t.swirlPhase * 0.4 + i * 0.7) * 6;

      const grad = ctx.createLinearGradient(t.x - r1, 0, t.x + r1, 0);
      grad.addColorStop(0, 'rgba(110, 100, 90, 0)');
      grad.addColorStop(0.25, 'rgba(140, 130, 120, 0.55)');
      grad.addColorStop(0.5, 'rgba(170, 160, 150, 0.78)');
      grad.addColorStop(0.75, 'rgba(140, 130, 120, 0.55)');
      grad.addColorStop(1, 'rgba(110, 100, 90, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(t.x - r1 + wobble, t.baseY - h1);
      ctx.lineTo(t.x + r1 + wobble, t.baseY - h1);
      ctx.lineTo(t.x + r2, t.baseY - h2);
      ctx.lineTo(t.x - r2, t.baseY - h2);
      ctx.closePath();
      ctx.fill();
    }

    // 螺旋线条（提升漩涡感）
    ctx.strokeStyle = 'rgba(60, 50, 40, 0.55)';
    ctx.lineWidth = 2.5;
    const lineCount = 6;
    for (let l = 0; l < lineCount; l++) {
      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const f = s / segments;
        const r = t.baseRadius + (t.topRadius - t.baseRadius) * f;
        const angle = t.swirlPhase + l * (Math.PI * 2 / lineCount) + f * Math.PI * 4;
        const x = t.x + Math.cos(angle) * r;
        const y = t.baseY - f * t.height + Math.sin(angle) * r * 0.18;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 顶部蘑菇云
    ctx.fillStyle = 'rgba(100, 90, 80, 0.7)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.baseY - t.height, t.topRadius * 1.4, t.topRadius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(130, 120, 110, 0.55)';
    ctx.beginPath();
    ctx.ellipse(t.x - t.topRadius * 0.6, t.baseY - t.height - 10, t.topRadius * 0.6, t.topRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.ellipse(t.x + t.topRadius * 0.7, t.baseY - t.height - 5, t.topRadius * 0.55, t.topRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 底部尘土云
    ctx.fillStyle = 'rgba(140, 110, 80, 0.55)';
    for (let i = 0; i < 7; i++) {
      const a = t.swirlPhase * 0.3 + i * (Math.PI * 2 / 7);
      const dx = Math.cos(a) * t.baseRadius * 1.6;
      const dy = Math.sin(a) * 4;
      ctx.beginPath();
      ctx.arc(t.x + dx, t.baseY + 6 + dy, 12 + Math.sin(t.swirlPhase + i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 被卷起的元素（绕龙卷风转）
    t.captured.forEach(c => this._drawCapturedInTornado(ctx, c));

    ctx.restore();
  },

  _drawCapturedInTornado(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle * 0.8);
    const item = c.item;
    switch (c.kind) {
      case 'flower': {
        for (let i = 0; i < (item.petals || 5); i++) {
          const a = (i / (item.petals || 5)) * Math.PI * 2;
          ctx.fillStyle = item.color || '#FF69B4';
          ctx.beginPath();
          const s = (item.size || 10) * 0.4;
          ctx.ellipse(Math.cos(a) * s, Math.sin(a) * s, s, s * 0.6, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, (item.size || 10) * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'butterfly': {
        ctx.fillStyle = item.color1 || '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = item.color2 || '#FFD93D';
        ctx.beginPath();
        ctx.ellipse(5, 0, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(-0.7, -5, 1.4, 10);
        break;
      }
      case 'bird': {
        ctx.fillStyle = '#8B7355';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(6, 0); ctx.lineTo(10, -1); ctx.lineTo(6, 1); ctx.closePath();
        ctx.fill();
        break;
      }
      case 'balloon': {
        ctx.fillStyle = item.color || '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(0, 0, (item.size || 18) * 0.7, (item.size || 18) * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-3, -3, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'kid': {
        // 抱头蹲着的小人
        ctx.fillStyle = item.colors ? item.colors.shirt : '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(0, 4, 7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = item.colors ? item.colors.skin : '#FFD7B3';
        ctx.beginPath();
        ctx.arc(0, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = item.colors ? item.colors.hair : '#5D4037';
        ctx.beginPath();
        ctx.arc(0, -9, 7, Math.PI, 0);
        ctx.fill();
        // 慌张表情
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -6, 1, 0, Math.PI * 2);
        ctx.arc(2, -6, 1, 0, Math.PI * 2);
        ctx.fill();
        // 张嘴
        ctx.fillStyle = '#700';
        ctx.beginPath();
        ctx.ellipse(0, -2, 1.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bikeGirl': {
        // 小女孩 + 自行车团块
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD7B3';
        ctx.beginPath();
        ctx.arc(0, -10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(0, -13, 6, Math.PI, 0);
        ctx.fill();
        // 自行车轮（两个圆）
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-7, 10, 5, 0, Math.PI * 2);
        ctx.arc(7, 10, 5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  },

  drawFog(ctx, w, h) {
    if (this.fogOpacity < 0.01) return;
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(220, 220, 230, ${this.fogOpacity * 0.4})`);
    grad.addColorStop(0.5, `rgba(230, 230, 235, ${this.fogOpacity})`);
    grad.addColorStop(1, `rgba(210, 210, 220, ${this.fogOpacity * 0.6})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // 一些移动的雾团
    const t = this.time * 8;
    for (let i = 0; i < 5; i++) {
      const cx = ((t + i * 200) % (w + 200)) - 100;
      const cy = h * (0.2 + i * 0.12);
      const r = 80 + i * 20;
      const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${this.fogOpacity * 0.35})`);
      cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawThunder(ctx, w, h) {
    if (this.thunderFlash > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 240, ${Math.min(0.7, this.thunderFlash)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    if (this.thunderBolt) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.thunderBolt.life * 3);
      ctx.strokeStyle = '#FFFAA0';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      const pts = this.thunderBolt.points;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
      ctx.restore();
    }
  },

  // ========== 咒语大全弹层 ==========
  toggleSpellbook() {
    const el = document.getElementById('pw-spellbook');
    if (!el) return;
    if (el.classList.contains('hidden')) {
      this.renderSpellbook(el);
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  },

  renderSpellbook(el) {
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    const keywords = this.voiceCommandKeywords[lang] || this.voiceCommandKeywords.en;
    const order = ['rain', 'snow', 'thunder', 'fog', 'tornado', 'rainbow', 'sunny',
                   'day', 'night', 'stars', 'fireworks', 'shootingStar',
                   'bubbles', 'balloons', 'sakura', 'butterfly', 'birds',
                   'kids', 'unicorn', 'dragon', 'cake', 'bloom', 'dance'];
    const title = this.t('park.spellbookTitle', '🪄 咒语大全 — 试着说出来！');
    let html = `<h3>${title}</h3><div class="pw-spellbook-list">`;
    order.forEach(cmd => {
      const kws = keywords[cmd] || [];
      const icon = this.commandIcons[cmd] || '✨';
      html += `<div class="pw-spell-row"><span class="pw-spell-icon">${icon}</span><span class="pw-spell-keywords">${this.escapeHtml(kws.slice(0, 3).join(' / '))}</span></div>`;
    });
    html += '</div>';
    el.innerHTML = html;
  },

  // ========== 语音咒语 HUD ==========
  drawVoiceCommandHUD(ctx, w, h) {
    // 麦克风状态小图标右上角
    const micActive = this.voiceActive;
    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    const text = micActive ? '🗣️ ' + this.t('park.voiceOn', '语音咒语已开启') : '';
    if (micActive) {
      const tw = ctx.measureText(text).width;
      ctx.beginPath();
      ctx.roundRect(w - tw - 30, 25, tw + 20, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, w - 20, 43);
    }

    // 最近识别到的命令大字弹出
    if (this.recentCommand) {
      const dt = this.time - this.recentCommand.time;
      const showDur = 2.0;
      if (dt < showDur) {
        const fadeIn = Math.min(1, dt * 6);
        const fadeOut = dt > showDur - 0.5 ? Math.max(0, (showDur - dt) / 0.5) : 1;
        const alpha = fadeIn * fadeOut;
        const scale = 1 + (1 - fadeIn) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        const cx = w / 2;
        const cy = h * 0.18;
        ctx.font = `${Math.floor(64 * scale)}px serif`;
        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 20;
        ctx.fillText(this.recentCommand.icon, cx, cy);
        ctx.shadowBlur = 0;
        // 关键词
        ctx.font = `bold ${Math.floor(24 * scale)}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.recentCommand.text, cx, cy + 50);
        ctx.fillText(this.recentCommand.text, cx, cy + 50);
      }
    }

    // 实时字幕：底部显示当前识别到的文字
    if (this.liveTranscript) {
      const dt = this.time - this.liveTranscriptTime;
      const showDur = 3.0;
      if (dt < showDur) {
        const fade = dt > showDur - 0.5 ? Math.max(0, (showDur - dt) / 0.5) : 1;
        ctx.globalAlpha = fade;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 22px sans-serif';
        // 截断过长文本
        let displayText = this.liveTranscript;
        if (displayText.length > 40) {
          displayText = '…' + displayText.slice(-40);
        }
        const tw = ctx.measureText(displayText).width;
        const padX = 18;
        const padY = 8;
        const cx = w / 2;
        const cy = h - 110;
        // 背景圆角矩形
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2 - padX, cy - 16 - padY, tw + padX * 2, 32 + padY * 2, 18);
        ctx.fill();
        // 字
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(displayText, cx, cy);
        ctx.fillText(displayText, cx, cy);
        // 麦克风小图标
        ctx.font = '18px serif';
        ctx.fillText('🎤', cx - tw / 2 - padX - 16, cy);
      }
    }

    ctx.restore();
  }
};

// 全局函数
function showParkWallpaper() {
  ParkWallpaper.show();
}

function closeParkWallpaper() {
  ParkWallpaper.close();
}
