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
  currentView: 'main',       // main | countdown | wishes | cake | cards
  cakeCandles: [],
  candleFlickering: null,
  floatingParticles: null,

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
