// ========== 生日派对 - 独角兽彩虹梦幻主题 ==========

const BirthdayParty = {
  // 数据存储
  data: {
    wishes: [],              // 许愿墙 [{ id, text, emoji, date }]
    cards: [],               // 贺卡 [{ id, stickers, bgColor, date }]
    candlesBlown: 0,         // 总共吹灭蜡烛次数
    partiesHeld: 0,          // 举办派对次数
    lastCelebration: null    // 上次庆祝日期
  },

  // 当前状态
  currentView: 'main',       // main | countdown | wishes | cake | cards | fullscreen
  cakeCandles: [],
  candleFlickering: null,
  floatingParticles: null,

  // 全屏庆祝 Canvas 状态
  fsCanvas: null,
  fsCtx: null,
  fsAnimationId: null,
  fsWakeLock: null,
  fsParticles: [],
  fsUnicorns: [],
  fsStars: [],
  fsFloatingEmojis: [],
  fsTextScale: 1,
  fsTextScaleDir: 1,
  fsTime: 0,

  // 堆积+吹风系统
  fsPile: [],              // 堆积在底部的emoji [{emoji, x, y, rot, size}]
  fsPileMaxY: 0,           // 当前堆积最高点（从底部往上）
  fsWindActive: false,     // 风是否在吹
  fsWindTime: 0,           // 风的动画时间
  fsWindForce: 0,          // 风力（0~1）
  fsPileCycleTimer: 0,     // 堆积周期计时（秒）
  fsPileCycleDuration: 600, // 多少秒触发一次风（600=10分钟）
  fsFallingEmojis: [],     // 从天上飘落到底部堆积的emoji

  // ========== 初始化 ==========
  init() {
    this.loadData();
  },

  loadData() {
    const saved = localStorage.getItem('kidsBirthdayParty');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.data = { ...this.data, ...parsed };
    }
  },

  saveData() {
    localStorage.setItem('kidsBirthdayParty', JSON.stringify(this.data));
  },

  // ========== 显示/关闭 ==========
  show() {
    const modal = document.getElementById('birthday-party-modal');
    if (!modal) return;

    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('birthdayParty');
    }

    this.currentView = 'main';
    this.render();
    modal.classList.remove('hidden');
    // 延迟启动浮动粒子动画
    setTimeout(() => this.startFloatingParticles(), 300);
  },

  close() {
    const modal = document.getElementById('birthday-party-modal');
    if (modal) modal.classList.add('hidden');
    this.stopFloatingParticles();
    this.stopCandleAnimation();
  },

  switchView(view) {
    this.currentView = view;
    this.stopCandleAnimation();
    this.render();
    if (view === 'cake') {
      setTimeout(() => this.initCake(), 100);
    }
  },

  // ========== 工具函数 ==========
  t(key, fallback) {
    return (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
  },

  getBirthday() {
    const saved = localStorage.getItem('kidsProfileData');
    if (saved) {
      const profile = JSON.parse(saved);
      return profile.birthday || '';
    }
    return '';
  },

  getProfileName() {
    const saved = localStorage.getItem('kidsProfileData');
    if (saved) {
      const profile = JSON.parse(saved);
      return profile.name || this.t('birthday.defaultName', '宝贝');
    }
    return this.t('birthday.defaultName', '宝贝');
  },

  getDaysUntilBirthday() {
    const birthday = this.getBirthday();
    if (!birthday) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = birthday.split('-').map(Number);

    let nextBirthday = new Date(today.getFullYear(), month - 1, day);
    if (nextBirthday < today) {
      nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diff = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    return diff;
  },

  isBirthdayToday() {
    const days = this.getDaysUntilBirthday();
    return days === 0 || days === 365 || days === 366;
  },

  // ========== 浮动粒子 ==========
  startFloatingParticles() {
    const container = document.querySelector('.bp-floating-particles');
    if (!container) return;

    const emojis = ['✨', '⭐', '🌟', '💫', '🦄', '🌈', '☁️', '💖', '🎀', '🫧'];
    container.innerHTML = '';

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('span');
      particle.className = 'bp-float-particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      particle.style.fontSize = (12 + Math.random() * 16) + 'px';
      particle.style.opacity = 0.3 + Math.random() * 0.4;
      container.appendChild(particle);
    }
  },

  stopFloatingParticles() {
    const container = document.querySelector('.bp-floating-particles');
    if (container) container.innerHTML = '';
  },

  // ========== 主渲染 ==========
  render() {
    const content = document.getElementById('birthday-party-content');
    if (!content) return;

    switch (this.currentView) {
      case 'main':
        this.renderMain(content);
        break;
      case 'countdown':
        this.renderCountdown(content);
        break;
      case 'wishes':
        this.renderWishes(content);
        break;
      case 'cake':
        this.renderCake(content);
        break;
      case 'cards':
        this.renderCards(content);
        break;
    }
  },

  // ========== 主页视图 ==========
  renderMain(content) {
    const t = this.t.bind(this);
    const name = this.getProfileName();
    const days = this.getDaysUntilBirthday();
    const isToday = this.isBirthdayToday();

    let countdownText = '';
    if (days === null) {
      countdownText = t('birthday.setBirthday', '先去设置生日日期吧~');
    } else if (isToday) {
      countdownText = `🎉 ${t('birthday.todayIs', '今天是你的生日！')}`;
    } else {
      countdownText = `${t('birthday.daysLeft', '距离生日还有')} <strong>${days}</strong> ${t('birthday.days', '天')}`;
    }

    content.innerHTML = `
      <div class="bp-main">
        <!-- 独角兽横幅 -->
        <div class="bp-unicorn-banner">
          <div class="bp-unicorn-scene">
            <div class="bp-cloud bp-cloud-1">☁️</div>
            <div class="bp-cloud bp-cloud-2">☁️</div>
            <div class="bp-cloud bp-cloud-3">☁️</div>
            <div class="bp-rainbow-arc"></div>
            <div class="bp-unicorn-char">🦄</div>
          </div>
          <h2 class="bp-greeting">${name}${t('birthday.partyTitle', '的生日派对')}</h2>
          <div class="bp-countdown-mini">${countdownText}</div>
        </div>

        <!-- 功能入口卡片 -->
        <div class="bp-feature-grid">
          <div class="bp-feature-card bp-card-countdown" onclick="BirthdayParty.switchView('countdown')">
            <div class="bp-card-glow"></div>
            <div class="bp-card-icon">🌈</div>
            <div class="bp-card-label">${t('birthday.countdown', '生日倒计时')}</div>
            <div class="bp-card-hint">${days !== null ? (isToday ? '🎂 Today!' : days + ' ' + t('birthday.days', '天')) : '---'}</div>
          </div>

          <div class="bp-feature-card bp-card-wishes" onclick="BirthdayParty.switchView('wishes')">
            <div class="bp-card-glow"></div>
            <div class="bp-card-icon">⭐</div>
            <div class="bp-card-label">${t('birthday.wishWall', '许愿墙')}</div>
            <div class="bp-card-hint">${this.data.wishes.length} ${t('birthday.wishCount', '个愿望')}</div>
          </div>

          <div class="bp-feature-card bp-card-cake" onclick="BirthdayParty.switchView('cake')">
            <div class="bp-card-glow"></div>
            <div class="bp-card-icon">🎂</div>
            <div class="bp-card-label">${t('birthday.blowCandles', '吹蜡烛')}</div>
            <div class="bp-card-hint">${t('birthday.makeWish', '许愿吹蜡烛')}</div>
          </div>

          <div class="bp-feature-card bp-card-cards" onclick="BirthdayParty.switchView('cards')">
            <div class="bp-card-glow"></div>
            <div class="bp-card-icon">💌</div>
            <div class="bp-card-label">${t('birthday.makeCard', '做贺卡')}</div>
            <div class="bp-card-hint">${this.data.cards.length} ${t('birthday.cardCount', '张贺卡')}</div>
          </div>
        </div>

        <!-- 全屏庆祝入口 -->
        <div class="bp-fullscreen-entry" onclick="BirthdayParty.startFullscreen()">
          <div class="bp-fs-icon">📺</div>
          <div class="bp-fs-text">
            <div class="bp-fs-label">${t('birthday.tvMode', '全屏庆祝模式')}</div>
            <div class="bp-fs-hint">${t('birthday.tvHint', '投到电视上循环播放生日祝福')}</div>
          </div>
          <div class="bp-fs-arrow">→</div>
        </div>

        <!-- 统计信息 -->
        <div class="bp-stats-row">
          <div class="bp-stat-bubble">
            <span class="bp-stat-icon">🕯️</span>
            <span class="bp-stat-num">${this.data.candlesBlown}</span>
            <span class="bp-stat-label">${t('birthday.candlesBlown', '蜡烛吹灭')}</span>
          </div>
          <div class="bp-stat-bubble">
            <span class="bp-stat-icon">🎈</span>
            <span class="bp-stat-num">${this.data.partiesHeld}</span>
            <span class="bp-stat-label">${t('birthday.partiesHeld', '派对次数')}</span>
          </div>
          <div class="bp-stat-bubble">
            <span class="bp-stat-icon">💝</span>
            <span class="bp-stat-num">${this.data.wishes.length}</span>
            <span class="bp-stat-label">${t('birthday.totalWishes', '许下愿望')}</span>
          </div>
        </div>
      </div>
    `;
  },

  // ========== 倒计时视图 ==========
  renderCountdown(content) {
    const t = this.t.bind(this);
    const name = this.getProfileName();
    const days = this.getDaysUntilBirthday();
    const birthday = this.getBirthday();
    const isToday = this.isBirthdayToday();

    let birthdayDisplay = '';
    if (birthday) {
      const [y, m, d] = birthday.split('-');
      birthdayDisplay = `${m}${t('birthday.month', '月')}${d}${t('birthday.day', '日')}`;
    }

    // 生成倒计时环的数据
    const totalDays = 365;
    const progress = days !== null ? ((totalDays - days) / totalDays) * 100 : 0;

    content.innerHTML = `
      <div class="bp-countdown-view">
        <button class="bp-back-btn" onclick="BirthdayParty.switchView('main')">
          ← ${t('btn.back', '返回')}
        </button>

        <div class="bp-countdown-ring-wrap">
          <svg class="bp-countdown-ring" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="bp-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#E8B4CB"/>
                <stop offset="25%" style="stop-color:#C4A8D8"/>
                <stop offset="50%" style="stop-color:#A8C4E0"/>
                <stop offset="75%" style="stop-color:#B8D8E8"/>
                <stop offset="100%" style="stop-color:#E8B4CB"/>
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="85" class="bp-ring-bg"/>
            <circle cx="100" cy="100" r="85" class="bp-ring-progress"
              style="stroke-dasharray: ${2 * Math.PI * 85}; stroke-dashoffset: ${2 * Math.PI * 85 * (1 - progress / 100)}"/>
          </svg>
          <div class="bp-countdown-center">
            ${isToday ? `
              <div class="bp-countdown-today">🎉</div>
              <div class="bp-countdown-big">${t('birthday.happyBirthday', '生日快乐!')}</div>
            ` : days !== null ? `
              <div class="bp-countdown-big">${days}</div>
              <div class="bp-countdown-unit">${t('birthday.daysRemaining', '天')}</div>
            ` : `
              <div class="bp-countdown-big">?</div>
              <div class="bp-countdown-unit">${t('birthday.notSet', '未设置')}</div>
            `}
          </div>
        </div>

        <div class="bp-countdown-info">
          <div class="bp-countdown-name">🦄 ${name}</div>
          ${birthdayDisplay ? `<div class="bp-countdown-date">🎂 ${birthdayDisplay}</div>` : ''}
          ${!birthday ? `
            <p class="bp-no-birthday">${t('birthday.goSetBirthday', '去个人信息页设置生日吧~')}</p>
            <button class="bp-set-birthday-btn" onclick="BirthdayParty.close(); navigateTo('profile');">
              🎈 ${t('birthday.goSet', '去设置')}
            </button>
          ` : ''}
        </div>

        ${isToday ? `
          <div class="bp-birthday-celebration">
            <div class="bp-celebration-text">
              🎊 ${name}，${t('birthday.birthdayMsg', '祝你生日快乐，天天开心！')} 🎊
            </div>
            <button class="bp-celebrate-btn" onclick="BirthdayParty.triggerCelebration()">
              🎉 ${t('birthday.celebrate', '开始庆祝!')}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  triggerCelebration() {
    this.data.partiesHeld++;
    this.data.lastCelebration = new Date().toISOString().split('T')[0];
    this.saveData();

    // 触发彩带和粒子
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.createParticles();
    }

    // 震动
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }

    // 播放庆祝音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('success');
    }
  },

  // ========== 许愿墙视图 ==========
  renderWishes(content) {
    const t = this.t.bind(this);
    const wishEmojis = ['⭐', '🌟', '💫', '✨', '🌙', '💖', '🦄', '🌈', '🎀', '🫧', '🦋', '🌸'];

    content.innerHTML = `
      <div class="bp-wishes-view">
        <button class="bp-back-btn" onclick="BirthdayParty.switchView('main')">
          ← ${t('btn.back', '返回')}
        </button>

        <div class="bp-wishes-header">
          <h3>✨ ${t('birthday.wishWall', '许愿墙')}</h3>
          <p class="bp-wishes-subtitle">${t('birthday.wishHint', '写下你的生日愿望吧~')}</p>
        </div>

        <!-- 写愿望 -->
        <div class="bp-wish-input-area">
          <div class="bp-wish-emoji-picker">
            ${wishEmojis.map(e => `
              <button class="bp-emoji-btn ${e === '⭐' ? 'active' : ''}"
                onclick="BirthdayParty.selectWishEmoji(this, '${e}')">${e}</button>
            `).join('')}
          </div>
          <div class="bp-wish-input-row">
            <input type="text" id="bp-wish-input" class="bp-wish-input"
              data-i18n-placeholder="birthday.wishPlaceholder"
              placeholder="${t('birthday.wishPlaceholder', '我希望...')}"
              maxlength="50"
              onkeydown="if(event.key==='Enter')BirthdayParty.addWish()">
            <button class="bp-wish-add-btn" onclick="BirthdayParty.addWish()">
              💫 ${t('birthday.addWish', '许愿')}
            </button>
          </div>
        </div>

        <!-- 愿望列表 -->
        <div class="bp-wishes-wall">
          ${this.data.wishes.length === 0 ? `
            <div class="bp-empty-wishes">
              <div class="bp-empty-icon">🌟</div>
              <p>${t('birthday.noWishes', '还没有许过愿望哦~')}</p>
            </div>
          ` : this.data.wishes.map((wish, idx) => `
            <div class="bp-wish-card" style="animation-delay: ${idx * 0.08}s">
              <div class="bp-wish-emoji">${wish.emoji}</div>
              <div class="bp-wish-text">${this.escapeHtml(wish.text)}</div>
              <button class="bp-wish-delete" onclick="BirthdayParty.deleteWish('${wish.id}')" title="${t('btn.delete', '删除')}">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.selectedWishEmoji = '⭐';
  },

  selectedWishEmoji: '⭐',

  selectWishEmoji(btn, emoji) {
    document.querySelectorAll('.bp-emoji-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.selectedWishEmoji = emoji;
  },

  addWish() {
    const input = document.getElementById('bp-wish-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    this.data.wishes.unshift({
      id: 'wish_' + Date.now(),
      text: text,
      emoji: this.selectedWishEmoji,
      date: new Date().toISOString().split('T')[0]
    });
    this.saveData();

    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }

    this.renderWishes(document.getElementById('birthday-party-content'));
  },

  deleteWish(id) {
    this.data.wishes = this.data.wishes.filter(w => w.id !== id);
    this.saveData();
    this.renderWishes(document.getElementById('birthday-party-content'));
  },

  // ========== 吹蜡烛视图 ==========
  renderCake(content) {
    const t = this.t.bind(this);
    // 根据年龄确定蜡烛数量
    const saved = localStorage.getItem('kidsProfileData');
    let age = 6;
    if (saved) {
      const profile = JSON.parse(saved);
      age = profile.age || 6;
    }

    content.innerHTML = `
      <div class="bp-cake-view">
        <button class="bp-back-btn" onclick="BirthdayParty.switchView('main')">
          ← ${t('btn.back', '返回')}
        </button>

        <div class="bp-cake-title">
          <h3>🎂 ${t('birthday.blowCandles', '吹蜡烛')}</h3>
          <p class="bp-cake-hint">${t('birthday.blowHint', '点击蜡烛或摇晃手机来吹灭它们~')}</p>
        </div>

        <div class="bp-cake-stage">
          <div class="bp-cake-scene" id="bp-cake-scene">
            <!-- 蛋糕主体 -->
            <div class="bp-cake-body">
              <div class="bp-cake-top">
                <div class="bp-cake-frosting"></div>
                <div class="bp-candles-row" id="bp-candles-row">
                  ${this.generateCandles(age)}
                </div>
              </div>
              <div class="bp-cake-layer bp-cake-layer-1"></div>
              <div class="bp-cake-layer bp-cake-layer-2"></div>
              <div class="bp-cake-layer bp-cake-layer-3"></div>
              <div class="bp-cake-plate"></div>
            </div>
          </div>

          <!-- 蛋糕装饰文字 -->
          <div class="bp-cake-message" id="bp-cake-message">
            ${t('birthday.tapCandles', '点击蜡烛吹灭它~')}
          </div>
        </div>

        <div class="bp-cake-actions">
          <button class="bp-blow-all-btn" onclick="BirthdayParty.blowAllCandles()">
            💨 ${t('birthday.blowAll', '全部吹灭')}
          </button>
          <button class="bp-relight-btn" onclick="BirthdayParty.relightCandles()">
            🔥 ${t('birthday.relight', '重新点燃')}
          </button>
        </div>
      </div>
    `;
  },

  generateCandles(count) {
    const colors = ['#E8B4CB', '#C4A8D8', '#A8C4E0', '#B8D8E8', '#D4A8C0', '#A8D8C4', '#D8C4A8'];
    let html = '';
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      html += `
        <div class="bp-candle" data-index="${i}" onclick="BirthdayParty.blowCandle(${i})">
          <div class="bp-flame" id="bp-flame-${i}">
            <div class="bp-flame-inner"></div>
          </div>
          <div class="bp-candle-stick" style="background: ${color}"></div>
        </div>
      `;
    }
    this.cakeCandles = new Array(count).fill(true); // true = lit
    return html;
  },

  initCake() {
    this.startCandleAnimation();
  },

  startCandleAnimation() {
    // 蜡烛火焰摇曳效果通过CSS处理
  },

  stopCandleAnimation() {
    if (this.candleFlickering) {
      clearInterval(this.candleFlickering);
      this.candleFlickering = null;
    }
  },

  blowCandle(index) {
    if (!this.cakeCandles[index]) return;
    this.cakeCandles[index] = false;

    const flame = document.getElementById(`bp-flame-${index}`);
    if (flame) {
      flame.classList.add('bp-flame-out');
      // 吹灭烟雾效果
      const smoke = document.createElement('div');
      smoke.className = 'bp-smoke';
      flame.parentElement.appendChild(smoke);
      setTimeout(() => smoke.remove(), 1000);
    }

    this.data.candlesBlown++;
    this.saveData();

    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }

    // 检查是否全部吹灭
    if (this.cakeCandles.every(c => !c)) {
      this.onAllCandlesBlown();
    }
  },

  blowAllCandles() {
    this.cakeCandles.forEach((lit, i) => {
      if (lit) {
        setTimeout(() => this.blowCandle(i), i * 150);
      }
    });
  },

  relightCandles() {
    const count = this.cakeCandles.length;
    for (let i = 0; i < count; i++) {
      this.cakeCandles[i] = true;
      const flame = document.getElementById(`bp-flame-${i}`);
      if (flame) {
        flame.classList.remove('bp-flame-out');
        flame.classList.add('bp-flame-relight');
        setTimeout(() => flame.classList.remove('bp-flame-relight'), 500);
      }
    }

    const msg = document.getElementById('bp-cake-message');
    if (msg) msg.textContent = this.t('birthday.tapCandles', '点击蜡烛吹灭它~');
  },

  onAllCandlesBlown() {
    this.data.partiesHeld++;
    this.saveData();

    const msg = document.getElementById('bp-cake-message');
    if (msg) {
      msg.innerHTML = `🎉 ${this.t('birthday.allBlown', '太棒了！愿望会实现的！')} 🎉`;
      msg.classList.add('bp-msg-celebrate');
    }

    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.createParticles();
      RewardSystem.playSound('success');
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  },

  // ========== 贺卡制作视图 ==========
  renderCards(content) {
    const t = this.t.bind(this);
    const stickerSets = [
      { category: 'unicorn', items: ['🦄', '🌈', '⭐', '✨', '💫', '🌟'] },
      { category: 'party', items: ['🎈', '🎉', '🎊', '🎁', '🎀', '🎂'] },
      { category: 'nature', items: ['🌸', '🌺', '🌷', '🦋', '🌻', '☁️'] },
      { category: 'love', items: ['💖', '💝', '💕', '💗', '💓', '🫶'] },
      { category: 'food', items: ['🍰', '🧁', '🍭', '🍬', '🍩', '🎂'] }
    ];

    const bgOptions = [
      { id: 'white', color: '#ffffff', label: '白' },
      { id: 'lavender', color: '#F3E8FF', label: '紫' },
      { id: 'rose', color: '#FFF1F2', label: '粉' },
      { id: 'sky', color: '#EFF6FF', label: '蓝' },
      { id: 'mint', color: '#ECFDF5', label: '绿' },
      { id: 'cream', color: '#FFFBEB', label: '黄' }
    ];

    content.innerHTML = `
      <div class="bp-cards-view">
        <button class="bp-back-btn" onclick="BirthdayParty.switchView('main')">
          ← ${t('btn.back', '返回')}
        </button>

        <h3 class="bp-cards-title">💌 ${t('birthday.makeCard', '做贺卡')}</h3>

        <!-- 贺卡画布 -->
        <div class="bp-card-canvas-wrap">
          <div class="bp-card-canvas" id="bp-card-canvas" style="background: #ffffff;">
            <div class="bp-card-text-area" id="bp-card-text">
              ${t('birthday.cardDefaultText', '生日快乐!')}
            </div>
            <div class="bp-card-stickers" id="bp-card-stickers">
              <!-- 拖放的贴纸 -->
            </div>
          </div>
        </div>

        <!-- 编辑文字 -->
        <div class="bp-card-edit-row">
          <input type="text" id="bp-card-text-input" class="bp-card-text-input"
            placeholder="${t('birthday.cardTextPlaceholder', '输入祝福语...')}"
            maxlength="30"
            oninput="BirthdayParty.updateCardText(this.value)">
        </div>

        <!-- 背景色选择 -->
        <div class="bp-card-bg-picker">
          ${bgOptions.map(bg => `
            <button class="bp-bg-option ${bg.id === 'white' ? 'active' : ''}"
              style="background: ${bg.color}"
              onclick="BirthdayParty.setCardBg('${bg.color}', this)"
              title="${bg.label}"></button>
          `).join('')}
        </div>

        <!-- 贴纸选择 -->
        <div class="bp-sticker-panel">
          ${stickerSets.map(set => `
            <div class="bp-sticker-row">
              ${set.items.map(s => `
                <button class="bp-sticker-btn" onclick="BirthdayParty.addSticker('${s}')">
                  ${s}
                </button>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <!-- 操作按钮 -->
        <div class="bp-card-actions">
          <button class="bp-clear-card-btn" onclick="BirthdayParty.clearCard()">
            🗑️ ${t('birthday.clearCard', '清空')}
          </button>
          <button class="bp-save-card-btn" onclick="BirthdayParty.saveCard()">
            💾 ${t('birthday.saveCard', '保存贺卡')}
          </button>
        </div>

        <!-- 已保存贺卡 -->
        ${this.data.cards.length > 0 ? `
          <div class="bp-saved-cards">
            <h4 class="bp-saved-title">📦 ${t('birthday.savedCards', '我的贺卡')}</h4>
            <div class="bp-saved-cards-grid">
              ${this.data.cards.map((card, idx) => `
                <div class="bp-saved-card-thumb" onclick="BirthdayParty.viewCard(${idx})">
                  <div class="bp-thumb-preview" style="background: ${card.bgColor || '#fff'}">
                    <span class="bp-thumb-text">${this.escapeHtml(card.text || '💌')}</span>
                    ${(card.stickers || []).slice(0, 3).map(s => `<span class="bp-thumb-sticker">${s.emoji}</span>`).join('')}
                  </div>
                  <button class="bp-delete-card-btn" onclick="event.stopPropagation(); BirthdayParty.deleteCard(${idx})">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.currentCardStickers = [];
    this.currentCardBg = '#ffffff';
    this.currentCardText = this.t('birthday.cardDefaultText', '生日快乐!');
  },

  currentCardStickers: [],
  currentCardBg: '#ffffff',
  currentCardText: '',

  updateCardText(text) {
    this.currentCardText = text;
    const textEl = document.getElementById('bp-card-text');
    if (textEl) textEl.textContent = text || this.t('birthday.cardDefaultText', '生日快乐!');
  },

  setCardBg(color, btn) {
    this.currentCardBg = color;
    const canvas = document.getElementById('bp-card-canvas');
    if (canvas) canvas.style.background = color;
    document.querySelectorAll('.bp-bg-option').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  },

  addSticker(emoji) {
    const container = document.getElementById('bp-card-stickers');
    if (!container) return;

    const sticker = document.createElement('div');
    sticker.className = 'bp-placed-sticker';
    sticker.textContent = emoji;
    // 随机位置
    sticker.style.left = (15 + Math.random() * 60) + '%';
    sticker.style.top = (15 + Math.random() * 50) + '%';
    sticker.style.transform = `rotate(${-20 + Math.random() * 40}deg) scale(${0.8 + Math.random() * 0.5})`;

    // 可拖拽
    this.makeDraggable(sticker);
    container.appendChild(sticker);

    this.currentCardStickers.push({
      emoji: emoji,
      left: sticker.style.left,
      top: sticker.style.top
    });

    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  makeDraggable(el) {
    let startX, startY, startLeft, startTop;

    const onStart = (e) => {
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      const rect = el.parentElement.getBoundingClientRect();
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = el.offsetLeft;
      startTop = el.offsetTop;
      el.style.zIndex = '10';
      el.style.transition = 'none';

      const onMove = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        el.style.left = (startLeft + dx) + 'px';
        el.style.top = (startTop + dy) + 'px';
      };

      const onEnd = () => {
        el.style.zIndex = '';
        el.style.transition = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    };

    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
  },

  clearCard() {
    const stickers = document.getElementById('bp-card-stickers');
    if (stickers) stickers.innerHTML = '';
    this.currentCardStickers = [];
    this.updateCardText('');
    const input = document.getElementById('bp-card-text-input');
    if (input) input.value = '';
  },

  saveCard() {
    const stickersEl = document.getElementById('bp-card-stickers');
    const stickers = [];
    if (stickersEl) {
      stickersEl.querySelectorAll('.bp-placed-sticker').forEach(s => {
        stickers.push({
          emoji: s.textContent.trim(),
          left: s.style.left,
          top: s.style.top
        });
      });
    }

    this.data.cards.unshift({
      id: 'card_' + Date.now(),
      text: this.currentCardText || this.t('birthday.cardDefaultText', '生日快乐!'),
      bgColor: this.currentCardBg,
      stickers: stickers,
      date: new Date().toISOString().split('T')[0]
    });
    this.saveData();

    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('success');
    }

    this.renderCards(document.getElementById('birthday-party-content'));
  },

  deleteCard(idx) {
    this.data.cards.splice(idx, 1);
    this.saveData();
    this.renderCards(document.getElementById('birthday-party-content'));
  },

  viewCard(idx) {
    const card = this.data.cards[idx];
    if (!card) return;

    // 在画布中显示保存的贺卡
    const canvas = document.getElementById('bp-card-canvas');
    const textEl = document.getElementById('bp-card-text');
    const stickersEl = document.getElementById('bp-card-stickers');

    if (canvas) canvas.style.background = card.bgColor || '#fff';
    if (textEl) textEl.textContent = card.text || '';
    if (stickersEl) {
      stickersEl.innerHTML = '';
      (card.stickers || []).forEach(s => {
        const el = document.createElement('div');
        el.className = 'bp-placed-sticker';
        el.textContent = s.emoji;
        el.style.left = s.left;
        el.style.top = s.top;
        this.makeDraggable(el);
        stickersEl.appendChild(el);
      });
    }
  },

  // ========== 全屏庆祝模式（三星电视投屏） ==========
  startFullscreen() {
    const modal = document.getElementById('bp-fullscreen-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    this.fsCanvas = document.getElementById('bp-fs-canvas');
    this.fsCtx = this.fsCanvas.getContext('2d');
    this.fsResizeCanvas();
    this.fsInitParticles();
    this.fsInitPileSystem();
    this.fsAnimate();
    this.fsRequestFullscreen(modal);
    this.fsRequestWakeLock();
    this.fsStartSilentAudio();

    this._fsResizeHandler = () => this.fsResizeCanvas();
    window.addEventListener('resize', this._fsResizeHandler);
  },

  stopFullscreen() {
    const modal = document.getElementById('bp-fullscreen-modal');
    if (modal) modal.classList.add('hidden');

    if (this.fsAnimationId) {
      cancelAnimationFrame(this.fsAnimationId);
      this.fsAnimationId = null;
    }
    this.fsReleaseWakeLock();
    this.fsStopSilentAudio();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (this._fsResizeHandler) {
      window.removeEventListener('resize', this._fsResizeHandler);
    }
    this.fsParticles = [];
    this.fsUnicorns = [];
    this.fsStars = [];
    this.fsFloatingEmojis = [];
    this.fsPile = [];
    this.fsFallingEmojis = [];
    this.fsWindActive = false;
    this.fsPileCycleTimer = 0;
  },

  fsResizeCanvas() {
    if (!this.fsCanvas) return;
    this.fsCanvas.width = window.innerWidth;
    this.fsCanvas.height = window.innerHeight;
  },

  fsRequestFullscreen(el) {
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) rfs.call(el).catch(() => {});
  },

  async fsRequestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.fsWakeLock = await navigator.wakeLock.request('screen');
        this._fsVisibilityHandler = async () => {
          if (document.visibilityState === 'visible' && this.fsAnimationId) {
            try { this.fsWakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
          }
        };
        document.addEventListener('visibilitychange', this._fsVisibilityHandler);
      }
    } catch (e) {}
  },

  async fsReleaseWakeLock() {
    if (this.fsWakeLock) {
      try { await this.fsWakeLock.release(); } catch (e) {}
      this.fsWakeLock = null;
    }
    if (this._fsVisibilityHandler) {
      document.removeEventListener('visibilitychange', this._fsVisibilityHandler);
      this._fsVisibilityHandler = null;
    }
  },

  fsStartSilentAudio() {
    try {
      this._fsAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this._fsAudioCtx.createOscillator();
      const gain = this._fsAudioCtx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(this._fsAudioCtx.destination);
      osc.start();
      this._fsOsc = osc;
    } catch (e) {}
  },

  fsStopSilentAudio() {
    if (this._fsOsc) { try { this._fsOsc.stop(); } catch (e) {} this._fsOsc = null; }
    if (this._fsAudioCtx) { try { this._fsAudioCtx.close(); } catch (e) {} this._fsAudioCtx = null; }
  },

  // 初始化粒子
  fsInitParticles() {
    const w = this.fsCanvas.width;
    const h = this.fsCanvas.height;

    // 柔和色纸屑
    this.fsParticles = [];
    for (let i = 0; i < 80; i++) {
      this.fsParticles.push({
        x: Math.random() * w,
        y: Math.random() * h - h,
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 2,
        speedY: Math.random() * 2 + 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
        color: this.fsSoftColor(),
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    // 飘浮独角兽
    this.fsUnicorns = [];
    for (let i = 0; i < 5; i++) {
      this.fsUnicorns.push({
        x: Math.random() * w, y: Math.random() * h,
        size: Math.random() * 30 + 40,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01
      });
    }

    // 星星
    this.fsStars = [];
    for (let i = 0; i < 40; i++) {
      this.fsStars.push({
        x: Math.random() * w, y: Math.random() * h,
        size: Math.random() * 3 + 1,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.05 + 0.02
      });
    }

    // 飘浮 emoji
    const emojis = ['🎂', '🎁', '🎈', '🎉', '🎊', '💖', '✨', '🌟', '🦄', '🌈', '🍰', '🧁'];
    this.fsFloatingEmojis = [];
    for (let i = 0; i < 15; i++) {
      this.fsFloatingEmojis.push({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * w, y: Math.random() * h,
        size: Math.random() * 20 + 20,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: -Math.random() * 0.5 - 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
  },

  // 柔和的独角兽色盘（替换旧的艳丽色）
  fsSoftColor() {
    const colors = [
      '#E8B4CB', '#D4A0B9', '#C4A8D8', '#B09AD8',
      '#A8C4E0', '#B8D8E8', '#A8D8C4', '#D8C4A8',
      '#E0C4D8', '#C8B8E0', '#B8C8E0', '#D0B8C8',
      '#E8D0D8', '#D0D8E8', '#C0D0E0', '#D8E0D0'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // 主动画循环
  fsAnimate() {
    if (!this.fsCtx || !this.fsCanvas) return;
    const ctx = this.fsCtx;
    const w = this.fsCanvas.width;
    const h = this.fsCanvas.height;
    this.fsTime += 0.016;

    // 更新堆积系统
    this.fsUpdatePileSystem(0.016);

    this.fsDrawBackground(ctx, w, h);
    this.fsDrawRainbows(ctx, w, h);
    this.fsDrawStars(ctx);
    this.fsDrawConfetti(ctx, w, h);
    this.fsDrawUnicorns(ctx, w, h);
    this.fsDrawFloatingEmojis(ctx, w, h);
    this.fsDrawMainText(ctx, w, h);
    this.fsDrawBottomDecoration(ctx, w, h);

    // 堆积层：先画堆积的，再画下落的，最后画风
    this.fsDrawPile(ctx);
    this.fsDrawFallingEmojis(ctx);
    this.fsDrawWind(ctx, w, h);

    this.fsAnimationId = requestAnimationFrame(() => this.fsAnimate());
  },

  // 柔和渐变背景（浅色梦幻，不再是深紫色）
  fsDrawBackground(ctx, w, h) {
    const t = this.fsTime;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    // 在浅粉、浅紫、浅蓝之间缓慢过渡
    const phase = Math.sin(t * 0.15) * 0.5 + 0.5;
    const r1 = Math.round(250 + phase * 5);
    const g1 = Math.round(240 + Math.sin(t * 0.12) * 8);
    const b1 = Math.round(248 + Math.cos(t * 0.1) * 5);
    const r2 = Math.round(240 + Math.cos(t * 0.13) * 8);
    const g2 = Math.round(244 + phase * 6);
    const b2 = Math.round(255);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(0.5, `rgb(${Math.round((r1+r2)/2)},${Math.round((g1+g2)/2)},${Math.round((b1+b2)/2)})`);
    grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  // 柔和彩虹弧线
  fsDrawRainbows(ctx, w, h) {
    const softRainbow = ['#E8B4CB', '#D4A0B9', '#C4A8D8', '#B09AD8', '#A8C4E0', '#B8D8E8', '#A8D8C4'];
    const cx = w / 2;
    const cy = h * 0.65;
    const baseR = Math.min(w, h) * 0.55;
    const t = this.fsTime;

    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 0.5) * 0.1;
    for (let i = 0; i < softRainbow.length; i++) {
      const r = baseR - i * (Math.min(w, h) * 0.03);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = softRainbow[i];
      ctx.lineWidth = Math.min(w, h) * 0.025;
      ctx.stroke();
    }
    ctx.restore();

    // 右上小彩虹
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(t * 0.7) * 0.05;
    const cx2 = w * 0.8, cy2 = h * 0.3, r2 = Math.min(w, h) * 0.25;
    for (let i = 0; i < softRainbow.length; i++) {
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2 - i * (Math.min(w, h) * 0.015), Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.strokeStyle = softRainbow[i];
      ctx.lineWidth = Math.min(w, h) * 0.012;
      ctx.stroke();
    }
    ctx.restore();
  },

  // 闪烁星星
  fsDrawStars(ctx) {
    for (const star of this.fsStars) {
      star.twinkle += star.twinkleSpeed;
      const alpha = 0.3 + Math.sin(star.twinkle) * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#D4A0B9';
      ctx.shadowColor = '#E8B4CB';
      ctx.shadowBlur = 8;
      this.fsDrawStarShape(ctx, star.x, star.y, 5, star.size * 2, star.size);
      ctx.fill();
      ctx.restore();
    }
  },

  fsDrawStarShape(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  },

  // 纸屑飘落
  fsDrawConfetti(ctx, w, h) {
    for (const p of this.fsParticles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // 独角兽飘浮
  fsDrawUnicorns(ctx, w, h) {
    for (const u of this.fsUnicorns) {
      u.wobble += u.wobbleSpeed;
      u.x += u.speedX + Math.sin(u.wobble) * 0.5;
      u.y += u.speedY + Math.cos(u.wobble) * 0.3;
      if (u.x < -50 || u.x > w + 50) u.speedX *= -1;
      if (u.y < -50 || u.y > h + 50) u.speedY *= -1;

      ctx.save();
      ctx.font = `${u.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(u.x, u.y);
      ctx.rotate(Math.sin(u.wobble) * 0.15);
      ctx.fillText('🦄', 0, 0);
      ctx.restore();

      // 尾迹星星
      ctx.save();
      ctx.font = `${u.size * 0.3}px serif`;
      ctx.textAlign = 'center';
      for (let i = 1; i <= 3; i++) {
        const tx = u.x - u.speedX * i * 8 + Math.sin(u.wobble + i) * 5;
        const ty = u.y - u.speedY * i * 8 + Math.cos(u.wobble + i) * 5;
        ctx.globalAlpha = 0.3 / i;
        ctx.fillText('✨', tx, ty);
      }
      ctx.restore();
    }
  },

  // 飘浮 emoji
  fsDrawFloatingEmojis(ctx, w, h) {
    for (const e of this.fsFloatingEmojis) {
      e.wobble += e.wobbleSpeed;
      e.x += e.speedX + Math.sin(e.wobble) * 0.3;
      e.y += e.speedY;
      if (e.y < -50) { e.y = h + 50; e.x = Math.random() * w; }
      if (e.x < -50) e.x = w + 50;
      if (e.x > w + 50) e.x = -50;

      ctx.save();
      ctx.globalAlpha = e.opacity;
      ctx.font = `${e.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x, e.y);
      ctx.restore();
    }
  },

  // 主文字 - 用柔和渐变色
  fsDrawMainText(ctx, w, h) {
    const name = this.getProfileName();
    const t = this.fsTime;

    this.fsTextScale += this.fsTextScaleDir * 0.003;
    if (this.fsTextScale > 1.08) this.fsTextScaleDir = -1;
    if (this.fsTextScale < 0.92) this.fsTextScaleDir = 1;

    const baseFontSize = Math.min(w * 0.09, h * 0.12, 120);
    const fontSize = baseFontSize * this.fsTextScale;
    const text = `${name} ${this.t('birthday.happyBirthdayShort', '生日快乐')}`;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#C4A8D8';
    ctx.shadowBlur = 25 + Math.sin(t * 2) * 10;

    // 柔和彩虹渐变文字
    const grad = ctx.createLinearGradient(
      w / 2 - fontSize * text.length * 0.3, h * 0.4,
      w / 2 + fontSize * text.length * 0.3, h * 0.4
    );
    const offset = (t * 0.08) % 1;
    grad.addColorStop((0 + offset) % 1, '#D4A0B9');
    grad.addColorStop((0.2 + offset) % 1, '#C4A8D8');
    grad.addColorStop((0.4 + offset) % 1, '#A8C4E0');
    grad.addColorStop((0.6 + offset) % 1, '#B8D8E8');
    grad.addColorStop((0.8 + offset) % 1, '#D4A0B9');

    ctx.font = `bold ${fontSize}px "Quicksand", "Comic Sans MS", "Microsoft YaHei", cursive`;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = fontSize * 0.06;
    ctx.strokeText(text, w / 2, h * 0.4);
    ctx.fillStyle = grad;
    ctx.fillText(text, w / 2, h * 0.4);
    ctx.restore();

    // 副标题
    ctx.save();
    const subSize = baseFontSize * 0.4;
    ctx.font = `${subSize}px "Quicksand", "Comic Sans MS", "Microsoft YaHei", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subAlpha = 0.6 + Math.sin(t * 1.2) * 0.2;
    ctx.fillStyle = `rgba(176, 154, 216, ${subAlpha})`;
    ctx.shadowColor = '#E8B4CB';
    ctx.shadowBlur = 10;
    ctx.fillText('🦄 ✨ 🌈 Happy Birthday 🌈 ✨ 🦄', w / 2, h * 0.52);
    ctx.restore();

    // 祝福语
    ctx.save();
    const wishSize = baseFontSize * 0.28;
    ctx.font = `${wishSize}px "Quicksand", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(155, 139, 168, ${0.5 + Math.sin(t * 1.5) * 0.25})`;
    ctx.fillText('🎂 ' + this.t('birthday.fsWish', '愿你的每一天都充满欢笑和惊喜') + ' 🎂', w / 2, h * 0.62);
    ctx.restore();
  },

  // 底部气球装饰 - 柔和色
  fsDrawBottomDecoration(ctx, w, h) {
    const t = this.fsTime;
    const cakeSize = Math.min(w, h) * 0.06;
    const balloonColors = ['#E8B4CB', '#D4A0B9', '#C4A8D8', '#B09AD8', '#A8C4E0', '#B8D8E8'];
    const numBalloons = 8;

    for (let i = 0; i < numBalloons; i++) {
      const bx = (w / (numBalloons + 1)) * (i + 1);
      const by = h * 0.82 + Math.sin(t * 1.5 + i * 0.8) * 15;
      const color = balloonColors[i % balloonColors.length];

      ctx.save();
      // 线
      ctx.beginPath();
      ctx.moveTo(bx, by + cakeSize * 0.8);
      ctx.lineTo(bx + Math.sin(t + i) * 5, h);
      ctx.strokeStyle = 'rgba(196, 168, 216, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 气球
      ctx.beginPath();
      ctx.ellipse(bx, by, cakeSize * 0.6, cakeSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.fill();

      // 光泽
      ctx.beginPath();
      ctx.ellipse(bx - cakeSize * 0.15, by - cakeSize * 0.2, cakeSize * 0.15, cakeSize * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.restore();
    }

    // 蛋糕
    ctx.save();
    const emojiSize = Math.min(w, h) * 0.1;
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎂', w / 2, h * 0.75 + Math.sin(t * 2) * 5);
    ctx.restore();
  },

  // ========== 堆积+吹风系统 ==========

  fsInitPileSystem() {
    this.fsPile = [];
    this.fsFallingEmojis = [];
    this.fsPileMaxY = 0;
    this.fsWindActive = false;
    this.fsWindTime = 0;
    this.fsWindForce = 0;
    this.fsPileCycleTimer = 0;
    // 初始生成一批下落的emoji
    this.fsSpawnFallingBatch();
  },

  // 生成一批下落的emoji
  fsSpawnFallingBatch() {
    const w = this.fsCanvas.width;
    const pool = ['🎂', '🧁', '🍰', '🎁', '🎈', '🎉', '🎊', '💖', '⭐', '🌟',
                  '🦄', '🌈', '🎀', '🍭', '🍬', '🫧', '🌸', '🦋', '✨', '💫'];
    const count = 3 + Math.floor(Math.random() * 3); // 每批3~5个
    for (let i = 0; i < count; i++) {
      this.fsFallingEmojis.push({
        emoji: pool[Math.floor(Math.random() * pool.length)],
        x: Math.random() * w * 0.8 + w * 0.1,
        y: -30 - Math.random() * 80,
        size: 18 + Math.random() * 16,
        speedY: 0.4 + Math.random() * 0.6,
        speedX: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.02
      });
    }
  },

  // 更新堆积+吹风逻辑（每帧调用）
  fsUpdatePileSystem(dt) {
    const w = this.fsCanvas.width;
    const h = this.fsCanvas.height;
    const maxPileH = h * 0.33; // 堆积最多到屏幕1/3

    // === 风模式 ===
    if (this.fsWindActive) {
      this.fsWindTime += dt;
      // 风持续约6秒：1秒渐强，4秒满力，1秒渐弱
      if (this.fsWindTime < 1) {
        this.fsWindForce = this.fsWindTime; // 0→1
      } else if (this.fsWindTime < 5) {
        this.fsWindForce = 1;
      } else if (this.fsWindTime < 6) {
        this.fsWindForce = 1 - (this.fsWindTime - 5); // 1→0
      } else {
        // 风停了，重置
        this.fsWindActive = false;
        this.fsWindForce = 0;
        this.fsWindTime = 0;
        this.fsPile = [];
        this.fsPileMaxY = 0;
        this.fsPileCycleTimer = 0;
        this.fsSpawnFallingBatch();
        return;
      }

      // 风吹走堆积的emoji
      for (const p of this.fsPile) {
        p.x += (3 + Math.random() * 4) * this.fsWindForce;
        p.y -= (0.5 + Math.random() * 1.5) * this.fsWindForce;
        p.rot += 5 * this.fsWindForce;
        // 轻微上下摇摆
        p.y += Math.sin(this.fsTime * 3 + p.x * 0.01) * 0.5 * this.fsWindForce;
      }
      // 移除飞出屏幕的
      this.fsPile = this.fsPile.filter(p => p.x < w + 100);
      return;
    }

    // === 堆积模式 ===
    this.fsPileCycleTimer += dt;

    // 每隔2~3秒生成新一批下落emoji
    if (this.fsFallingEmojis.length < 3 && this.fsPileMaxY < maxPileH) {
      this.fsSpawnFallingBatch();
    }

    // 更新下落的emoji
    for (let i = this.fsFallingEmojis.length - 1; i >= 0; i--) {
      const f = this.fsFallingEmojis[i];
      f.wobble += f.wobbleSpeed;
      f.y += f.speedY;
      f.x += f.speedX + Math.sin(f.wobble) * 0.3;
      f.rot += f.rotSpeed;

      // 计算落地位置：底部减去当前堆积高度（有微小随机）
      const landY = h - this.fsGetPileHeightAt(f.x, w) - f.size * 0.4;

      if (f.y >= landY) {
        // 落地！加入堆积
        this.fsPile.push({
          emoji: f.emoji,
          x: f.x,
          y: landY,
          rot: f.rot,
          size: f.size
        });
        this.fsFallingEmojis.splice(i, 1);

        // 更新最高点
        const pileH = h - landY;
        if (pileH > this.fsPileMaxY) {
          this.fsPileMaxY = pileH;
        }
      }
    }

    // 到达1/3高度 或 10分钟到了 → 触发风
    if ((this.fsPileMaxY >= maxPileH) ||
        (this.fsPileCycleTimer >= this.fsPileCycleDuration && this.fsPile.length > 0)) {
      this.fsWindActive = true;
      this.fsWindTime = 0;
      this.fsFallingEmojis = []; // 停止新的下落
    }
  },

  // 获取某x位置的堆积高度（简化：按列统计）
  fsGetPileHeightAt(x, w) {
    const colWidth = 40;
    let count = 0;
    for (const p of this.fsPile) {
      if (Math.abs(p.x - x) < colWidth) {
        count++;
      }
    }
    // 每个emoji大约占20px高度，带随机让它不那么整齐
    return count * 14 + Math.random() * 6;
  },

  // 绘制下落中的emoji
  fsDrawFallingEmojis(ctx) {
    for (const f of this.fsFallingEmojis) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate((f.rot * Math.PI) / 180);
      ctx.font = `${f.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85;
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
    }
  },

  // 绘制堆积的emoji
  fsDrawPile(ctx) {
    for (const p of this.fsPile) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.9;
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }
  },

  // 绘制风的视觉效果（几条弧线飘过）
  fsDrawWind(ctx, w, h) {
    if (!this.fsWindActive || this.fsWindForce < 0.1) return;

    ctx.save();
    ctx.globalAlpha = this.fsWindForce * 0.15;
    ctx.strokeStyle = '#C4A8D8';
    ctx.lineWidth = 2;

    const t = this.fsTime;
    for (let i = 0; i < 6; i++) {
      const y = h * 0.4 + i * h * 0.08 + Math.sin(t * 2 + i) * 20;
      const startX = -50 + ((t * 200 + i * 150) % (w + 200));
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.quadraticCurveTo(startX + 60, y - 10 + Math.sin(t * 3 + i) * 8, startX + 120, y);
      ctx.quadraticCurveTo(startX + 180, y + 10 + Math.cos(t * 3 + i) * 8, startX + 240, y);
      ctx.stroke();
    }
    ctx.restore();
  },

  // ========== 工具 ==========
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 全局函数
function showBirthdayParty() {
  BirthdayParty.show();
}

function closeBirthdayParty() {
  BirthdayParty.close();
}
