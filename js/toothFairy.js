// ========== 牙仙子传统 - 星光牙仙梦幻主题 ==========
// 记录乳牙脱落、生成牙仙子的信、牙齿收藏证书、每次掉牙的小惊喜

const ToothFairy = {
  // 数据存储
  data: {
    teeth: {},               // { toothId: { toothId, order, date, amount, giftId, letterSeed, clean } }
    fairyVisits: 0,          // 牙仙子来访次数
    settings: {
      currency: '$',         // 货币符号
      firstAmount: 5,        // 第一颗牙金额
      normalAmount: 2,       // 后续每颗牙金额
      giftMode: 'money'      // money | gift | mix
    }
  },

  currentView: 'main',       // main | chart | log | letter | certificate | settings
  logTargetTooth: null,      // 正在登记的牙齿 id
  logClean: true,            // 本次登记：牙齿是否刷得干净
  totalTeeth: 20,            // 乳牙总数

  // 20 颗乳牙布局（上排10 + 下排10）
  // type: central(门牙) lateral(侧门牙) canine(犬牙) molar(大牙)
  layout: {
    upper: [
      { id: 'UR2', type: 'molar' },  { id: 'UR1', type: 'molar' },
      { id: 'URC', type: 'canine' }, { id: 'URL', type: 'lateral' },
      { id: 'URA', type: 'central' },{ id: 'ULA', type: 'central' },
      { id: 'ULL', type: 'lateral' },{ id: 'ULC', type: 'canine' },
      { id: 'UL1', type: 'molar' },  { id: 'UL2', type: 'molar' }
    ],
    lower: [
      { id: 'LR2', type: 'molar' },  { id: 'LR1', type: 'molar' },
      { id: 'LRC', type: 'canine' }, { id: 'LRL', type: 'lateral' },
      { id: 'LRA', type: 'central' },{ id: 'LLA', type: 'central' },
      { id: 'LLL', type: 'lateral' },{ id: 'LLC', type: 'canine' },
      { id: 'LL1', type: 'molar' },  { id: 'LL2', type: 'molar' }
    ]
  },

  // 礼物建议池（giftMode = gift / mix 时使用）
  giftPool: [
    { id: 'sticker', emoji: '⭐' },
    { id: 'pencil',  emoji: '✏️' },
    { id: 'eraser',  emoji: '🧽' },
    { id: 'book',    emoji: '📖' },
    { id: 'toy',     emoji: '🧸' },
    { id: 'candy',   emoji: '🍬' },
    { id: 'crayon',  emoji: '🖍️' },
    { id: 'badge',   emoji: '🏅' }
  ],

  // ========== 初始化 ==========
  init() {
    this.loadData();
  },

  loadData() {
    const saved = localStorage.getItem('kidsToothFairy');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = {
          ...this.data,
          ...parsed,
          settings: { ...this.data.settings, ...(parsed.settings || {}) },
          teeth: parsed.teeth || {}
        };
      } catch (e) { /* 忽略损坏数据 */ }
    }
  },

  saveData() {
    localStorage.setItem('kidsToothFairy', JSON.stringify(this.data));
  },

  // ========== 显示/关闭 ==========
  show() {
    const modal = document.getElementById('tooth-fairy-modal');
    if (!modal) return;

    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('toothFairy');
    }

    this.currentView = 'main';
    this.render();
    modal.classList.remove('hidden');
    setTimeout(() => this.startFloatingSparkles(), 300);
  },

  close() {
    const modal = document.getElementById('tooth-fairy-modal');
    if (modal) modal.classList.add('hidden');
    this.stopFloatingSparkles();
  },

  switchView(view) {
    this.currentView = view;
    this.render();
  },

  // ========== 工具函数 ==========
  t(key, fallback) {
    return (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
  },

  getProfileName() {
    const saved = localStorage.getItem('kidsProfileData');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        if (profile.name) return profile.name;
      } catch (e) {}
    }
    return this.t('tooth.defaultName', '宝贝');
  },

  playSound(type) {
    if (typeof RewardSystem !== 'undefined') RewardSystem.playSound(type);
  },

  // 已掉的牙齿记录（按脱落顺序排列）
  getFallenList() {
    return Object.values(this.data.teeth).sort((a, b) => a.order - b.order);
  },

  getFallenCount() {
    return Object.keys(this.data.teeth).length;
  },

  isFallen(toothId) {
    return !!this.data.teeth[toothId];
  },

  // ========== 浮动星光粒子 ==========
  startFloatingSparkles() {
    const container = document.querySelector('.tf-floating-particles');
    if (!container) return;
    const emojis = ['✨', '⭐', '🌟', '💫', '🦷', '🪙', '🧚', '🌙', '💎', '🫧'];
    container.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'tf-float-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = (7 + Math.random() * 6) + 's';
      p.style.fontSize = (12 + Math.random() * 16) + 'px';
      p.style.opacity = 0.3 + Math.random() * 0.4;
      container.appendChild(p);
    }
  },

  stopFloatingSparkles() {
    const container = document.querySelector('.tf-floating-particles');
    if (container) container.innerHTML = '';
  },

  // ========== 主渲染 ==========
  render() {
    const content = document.getElementById('tooth-fairy-content');
    if (!content) return;

    switch (this.currentView) {
      case 'main':        this.renderMain(content); break;
      case 'chart':       this.renderChart(content); break;
      case 'log':         this.renderLog(content); break;
      case 'letter':      this.renderLetter(content); break;
      case 'certificate': this.renderCertificate(content); break;
      case 'settings':    this.renderSettings(content); break;
    }

    if (typeof I18n !== 'undefined' && I18n.applyTranslations) I18n.applyTranslations();
  },

  // ========== 主页视图 ==========
  renderMain(content) {
    const t = this.t.bind(this);
    const name = this.getProfileName();
    const count = this.getFallenCount();
    const remaining = this.totalTeeth - count;
    const totalReward = this.getFallenList().reduce((s, x) => s + (x.amount || 0), 0);
    const cur = this.data.settings.currency;
    const progress = Math.round((count / this.totalTeeth) * 100);

    content.innerHTML = `
      <div class="tf-main">
        <!-- 牙仙子横幅 -->
        <div class="tf-hero">
          <div class="tf-hero-sky">
            <div class="tf-moon">🌙</div>
            <div class="tf-hero-star tf-hs-1">⭐</div>
            <div class="tf-hero-star tf-hs-2">✨</div>
            <div class="tf-hero-star tf-hs-3">💫</div>
            <div class="tf-fairy">🧚</div>
            <div class="tf-pillow">
              <div class="tf-pillow-tooth">🦷</div>
            </div>
          </div>
          <h2 class="tf-greeting">${this.escapeHtml(name)}${t('tooth.ofTitle', '的牙仙子')}</h2>
          <div class="tf-hero-sub">${count === 0
            ? t('tooth.heroWelcome', '第一颗牙掉了就来这里记录吧~')
            : `${t('tooth.collected', '已收集')} <strong>${count}</strong> / ${this.totalTeeth} ${t('tooth.teethUnit', '颗牙')}`}</div>

          <!-- 进度条 -->
          <div class="tf-progress-track">
            <div class="tf-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="tf-progress-label">${remaining > 0
            ? `${t('tooth.stillGrowing', '还有')} ${remaining} ${t('tooth.teethToGo', '颗乳牙在慢慢换')}`
            : `🎉 ${t('tooth.allDone', '全部乳牙都换好啦！')}`}</div>
        </div>

        <!-- 主按钮：记录掉牙 -->
        <button class="tf-log-cta" onclick="ToothFairy.switchView('chart')">
          <span class="tf-cta-icon">🦷</span>
          <span class="tf-cta-text">
            <span class="tf-cta-title">${t('tooth.logTooth', '记录一颗掉牙')}</span>
            <span class="tf-cta-hint">${t('tooth.logHint', '点牙齿图，召唤牙仙子')}</span>
          </span>
          <span class="tf-cta-arrow">→</span>
        </button>

        <!-- 功能卡片 -->
        <div class="tf-feature-grid">
          <div class="tf-feature-card tf-card-chart" onclick="ToothFairy.switchView('chart')">
            <div class="tf-card-icon">😁</div>
            <div class="tf-card-label">${t('tooth.toothMap', '牙齿地图')}</div>
            <div class="tf-card-hint">${count}/${this.totalTeeth}</div>
          </div>
          <div class="tf-feature-card tf-card-letters" onclick="ToothFairy.openLatestLetter()">
            <div class="tf-card-icon">💌</div>
            <div class="tf-card-label">${t('tooth.fairyLetters', '牙仙子的信')}</div>
            <div class="tf-card-hint">${count} ${t('tooth.letterUnit', '封')}</div>
          </div>
          <div class="tf-feature-card tf-card-cert" onclick="ToothFairy.switchView('certificate')">
            <div class="tf-card-icon">📜</div>
            <div class="tf-card-label">${t('tooth.certificate', '收藏证书')}</div>
            <div class="tf-card-hint">${this.getCertLevel(count).label}</div>
          </div>
          <div class="tf-feature-card tf-card-settings" onclick="ToothFairy.switchView('settings')">
            <div class="tf-card-icon">⚙️</div>
            <div class="tf-card-label">${t('tooth.parentRules', '家长规则')}</div>
            <div class="tf-card-hint">${cur}${this.data.settings.normalAmount}${t('tooth.perTooth', '/颗')}</div>
          </div>
        </div>

        <!-- 统计 -->
        <div class="tf-stats-row">
          <div class="tf-stat-bubble">
            <span class="tf-stat-icon">🦷</span>
            <span class="tf-stat-num">${count}</span>
            <span class="tf-stat-label">${t('tooth.teethLost', '掉牙')}</span>
          </div>
          <div class="tf-stat-bubble">
            <span class="tf-stat-icon">🧚</span>
            <span class="tf-stat-num">${this.data.fairyVisits}</span>
            <span class="tf-stat-label">${t('tooth.visits', '牙仙来访')}</span>
          </div>
          <div class="tf-stat-bubble">
            <span class="tf-stat-icon">🪙</span>
            <span class="tf-stat-num">${cur}${totalReward}</span>
            <span class="tf-stat-label">${t('tooth.totalGift', '累计礼物')}</span>
          </div>
        </div>

        <!-- 最近掉牙 -->
        ${count > 0 ? `
          <div class="tf-recent">
            <h4 class="tf-recent-title">🌟 ${t('tooth.recentTeeth', '最近掉的牙')}</h4>
            <div class="tf-recent-list">
              ${this.getFallenList().slice(-3).reverse().map(rec => `
                <div class="tf-recent-item" onclick="ToothFairy.openLetter('${rec.toothId}')">
                  <span class="tf-recent-badge">#${rec.order}</span>
                  <span class="tf-recent-name">${this.toothName(rec.toothId)}</span>
                  <span class="tf-recent-date">${rec.date}</span>
                  <span class="tf-recent-reward">${this.rewardText(rec)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // ========== 牙齿地图视图 ==========
  renderChart(content) {
    const t = this.t.bind(this);
    const count = this.getFallenCount();

    const renderTooth = (tooth) => {
      const rec = this.data.teeth[tooth.id];
      const fallen = !!rec;
      return `
        <button class="tf-tooth ${fallen ? 'tf-tooth-fallen' : ''} tf-type-${tooth.type}"
          onclick="ToothFairy.tapTooth('${tooth.id}')"
          title="${this.toothName(tooth.id)}">
          <span class="tf-tooth-face">${fallen ? '✨' : '🦷'}</span>
          ${fallen ? `<span class="tf-tooth-order">${rec.order}</span>` : ''}
        </button>
      `;
    };

    content.innerHTML = `
      <div class="tf-chart-view">
        <button class="tf-back-btn" onclick="ToothFairy.switchView('main')">← ${t('btn.back', '返回')}</button>

        <div class="tf-chart-header">
          <h3>😁 ${t('tooth.toothMap', '牙齿地图')}</h3>
          <p class="tf-chart-sub">${t('tooth.chartHint', '哪颗牙掉了？点一下它~')}</p>
        </div>

        <div class="tf-mouth">
          <div class="tf-arch tf-arch-upper">
            <div class="tf-arch-label">${t('tooth.upper', '上排')}</div>
            <div class="tf-teeth-row">${this.layout.upper.map(renderTooth).join('')}</div>
          </div>
          <div class="tf-tongue"></div>
          <div class="tf-arch tf-arch-lower">
            <div class="tf-teeth-row">${this.layout.lower.map(renderTooth).join('')}</div>
            <div class="tf-arch-label">${t('tooth.lower', '下排')}</div>
          </div>
        </div>

        <div class="tf-chart-legend">
          <span><span class="tf-legend-dot">🦷</span> ${t('tooth.stillHere', '还在')}</span>
          <span><span class="tf-legend-dot">✨</span> ${t('tooth.alreadyFallen', '已掉')} (${count})</span>
        </div>
      </div>
    `;
  },

  // 点击牙齿
  tapTooth(toothId) {
    this.playSound('click');
    if (this.isFallen(toothId)) {
      // 已掉：查看这颗牙的信
      this.openLetter(toothId);
    } else {
      // 未掉：进入登记流程
      this.logTargetTooth = toothId;
      this.logClean = true;
      this.switchView('log');
    }
  },

  // ========== 登记掉牙视图 ==========
  renderLog(content) {
    const t = this.t.bind(this);
    const toothId = this.logTargetTooth;
    const name = this.getProfileName();
    const nextOrder = this.getFallenCount() + 1;

    content.innerHTML = `
      <div class="tf-log-view">
        <button class="tf-back-btn" onclick="ToothFairy.switchView('chart')">← ${t('btn.back', '返回')}</button>

        <div class="tf-log-card">
          <div class="tf-log-tooth-icon">🦷</div>
          <h3 class="tf-log-title">${this.toothName(toothId)} ${t('tooth.fellOut', '掉啦！')}</h3>
          <p class="tf-log-order">${nextOrder === 1
            ? `🌟 ${t('tooth.firstTooth', '这是第一颗掉的牙，超级有纪念意义！')}`
            : `${t('tooth.thisIsNo', '这是第')} ${nextOrder} ${t('tooth.thTooth', '颗掉的牙')}`}</p>

          <!-- 刷牙鼓励问题 -->
          <div class="tf-log-question">
            <p class="tf-log-q-title">🪥 ${t('tooth.cleanQuestion', '这颗牙有好好刷干净吗？')}</p>
            <div class="tf-log-q-options">
              <button class="tf-q-btn tf-q-yes active" id="tf-clean-yes"
                onclick="ToothFairy.setClean(true)">😁 ${t('tooth.cleanYes', '刷得亮晶晶')}</button>
              <button class="tf-q-btn tf-q-no" id="tf-clean-no"
                onclick="ToothFairy.setClean(false)">😅 ${t('tooth.cleanNo', '偶尔忘记')}</button>
            </div>
          </div>

          <button class="tf-summon-btn" onclick="ToothFairy.confirmLog()">
            🧚 ${t('tooth.summonFairy', '召唤牙仙子')}
          </button>
          <p class="tf-log-tip">${t('tooth.summonTip', '晚上把牙放枕头下，牙仙子就会来~')}</p>
        </div>
      </div>
    `;
  },

  setClean(clean) {
    this.logClean = clean;
    const yes = document.getElementById('tf-clean-yes');
    const no = document.getElementById('tf-clean-no');
    if (yes) yes.classList.toggle('active', clean);
    if (no) no.classList.toggle('active', !clean);
    this.playSound('click');
  },

  // 确认登记 → 生成惊喜
  confirmLog() {
    const toothId = this.logTargetTooth;
    if (!toothId || this.isFallen(toothId)) return;

    const order = this.getFallenCount() + 1;
    const amount = this.calcAmount(order);
    const giftId = this.pickGift(order);

    const record = {
      toothId,
      order,
      date: this.todayStr(),
      amount,
      giftId,
      letterSeed: order,          // 用于稳定生成信件内容
      clean: this.logClean
    };

    this.data.teeth[toothId] = record;
    this.data.fairyVisits++;
    this.saveData();

    // 家长通知（如已配置）
    this.notifyParent(record);

    // 播放惊喜揭晓动画
    this.showSurprise(record);
  },

  // 计算金额（含里程碑加成）
  calcAmount(order) {
    const s = this.data.settings;
    if (s.giftMode === 'gift') return 0;
    let amt = order === 1 ? s.firstAmount : s.normalAmount;
    // 里程碑（第5、10、20颗）小加成
    if (order === 5 || order === 10 || order === 20) amt += s.normalAmount;
    return amt;
  },

  // 选择礼物（gift / mix 模式）
  pickGift(order) {
    const mode = this.data.settings.giftMode;
    if (mode === 'money') return null;
    if (mode === 'mix' && order % 2 === 1) return null; // 混合：奇数给钱，偶数给礼物
    return this.giftPool[(order - 1) % this.giftPool.length].id;
  },

  rewardText(rec) {
    const cur = this.data.settings.currency;
    const parts = [];
    if (rec.amount > 0) parts.push(`${cur}${rec.amount}`);
    if (rec.giftId) {
      const g = this.giftPool.find(x => x.id === rec.giftId);
      if (g) parts.push(g.emoji);
    }
    return parts.join(' ') || '🎁';
  },

  // ========== 惊喜揭晓动画 ==========
  showSurprise(rec) {
    const overlay = document.getElementById('tf-surprise-overlay');
    const box = document.getElementById('tf-surprise-box');
    if (!overlay || !box) { this.switchView('main'); return; }

    const t = this.t.bind(this);
    box.innerHTML = `
      <div class="tf-surprise-inner">
        <div class="tf-surprise-fairy">🧚</div>
        <div class="tf-surprise-pillow" id="tf-surprise-pillow" onclick="ToothFairy.revealSurprise('${rec.toothId}')">
          <div class="tf-surprise-hint">${t('tooth.tapPillow', '牙仙子来过了！点枕头看看~')}</div>
          <div class="tf-surprise-emoji">🛏️</div>
        </div>
        <div class="tf-surprise-reveal hidden" id="tf-surprise-reveal"></div>
      </div>
    `;
    overlay.classList.remove('hidden');
    this.playSound('reward');

    // 星光洒落
    this.rainSparkles(overlay);
  },

  revealSurprise(toothId) {
    const rec = this.data.teeth[toothId];
    if (!rec) return;
    const t = this.t.bind(this);
    const pillow = document.getElementById('tf-surprise-pillow');
    const reveal = document.getElementById('tf-surprise-reveal');
    if (!reveal) return;

    if (pillow) pillow.classList.add('tf-pillow-lifted');

    const cur = this.data.settings.currency;
    let rewardHtml = '';
    if (rec.amount > 0) {
      rewardHtml += `<div class="tf-reward-coin">🪙 <span>${cur}${rec.amount}</span></div>`;
    }
    if (rec.giftId) {
      const g = this.giftPool.find(x => x.id === rec.giftId);
      if (g) rewardHtml += `<div class="tf-reward-gift">${g.emoji} <span>${this.giftName(g.id)}</span></div>`;
    }
    if (!rewardHtml) rewardHtml = `<div class="tf-reward-gift">🎁</div>`;

    reveal.innerHTML = `
      <div class="tf-reveal-title">✨ ${t('tooth.fairyLeft', '牙仙子留下了')} ✨</div>
      <div class="tf-reveal-rewards">${rewardHtml}</div>
      <div class="tf-reveal-actions">
        <button class="tf-reveal-letter-btn" onclick="ToothFairy.closeSurprise(); ToothFairy.openLetter('${toothId}')">
          💌 ${t('tooth.readLetter', '读牙仙子的信')}
        </button>
        <button class="tf-reveal-ok-btn" onclick="ToothFairy.closeSurprise(); ToothFairy.switchView('main')">
          ${t('tooth.done', '收好啦')}
        </button>
      </div>
    `;
    reveal.classList.remove('hidden');
    this.playSound('complete');
    if (typeof RewardSystem !== 'undefined' && RewardSystem.createParticles) RewardSystem.createParticles();
    if (navigator.vibrate) navigator.vibrate([80, 40, 120, 40, 200]);
  },

  closeSurprise() {
    const overlay = document.getElementById('tf-surprise-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  rainSparkles(container) {
    const layer = document.createElement('div');
    layer.className = 'tf-sparkle-rain';
    const emojis = ['✨', '⭐', '🌟', '💫', '🪙', '💎'];
    for (let i = 0; i < 24; i++) {
      const s = document.createElement('span');
      s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 0.8) + 's';
      s.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
      s.style.fontSize = (14 + Math.random() * 18) + 'px';
      layer.appendChild(s);
    }
    container.appendChild(layer);
    setTimeout(() => layer.remove(), 3000);
  },

  // ========== 牙仙子的信 ==========
  openLetter(toothId) {
    if (!this.isFallen(toothId)) return;
    this.letterToothId = toothId;
    this.switchView('letter');
  },

  openLatestLetter() {
    const list = this.getFallenList();
    if (list.length === 0) {
      this.switchView('chart');
      return;
    }
    this.openLetter(list[list.length - 1].toothId);
  },

  letterToothId: null,

  renderLetter(content) {
    const t = this.t.bind(this);
    const toothId = this.letterToothId || (this.getFallenList().slice(-1)[0] || {}).toothId;
    const rec = this.data.teeth[toothId];
    if (!rec) { this.switchView('main'); return; }

    const name = this.getProfileName();
    const letter = this.buildLetter(rec, name);
    const list = this.getFallenList();
    const idx = list.findIndex(x => x.toothId === toothId);
    const prev = idx > 0 ? list[idx - 1].toothId : null;
    const next = idx < list.length - 1 ? list[idx + 1].toothId : null;

    content.innerHTML = `
      <div class="tf-letter-view">
        <button class="tf-back-btn" onclick="ToothFairy.switchView('main')">← ${t('btn.back', '返回')}</button>

        <div class="tf-letter-paper" id="tf-letter-paper">
          <div class="tf-letter-corner tf-corner-tl">🌙</div>
          <div class="tf-letter-corner tf-corner-tr">✨</div>
          <div class="tf-letter-corner tf-corner-bl">⭐</div>
          <div class="tf-letter-corner tf-corner-br">🦷</div>

          <div class="tf-letter-head">
            <div class="tf-letter-fairy">🧚‍♀️</div>
            <div class="tf-letter-from">${t('tooth.letterFrom', '来自牙仙子的信')}</div>
          </div>

          <div class="tf-letter-body">
            <p class="tf-letter-greet">${t('tooth.dear', '亲爱的')} ${this.escapeHtml(name)}</p>
            ${letter.paragraphs.map(p => `<p class="tf-letter-p">${p}</p>`).join('')}
            <p class="tf-letter-fact">💡 ${letter.fact}</p>
            <p class="tf-letter-sign">${t('tooth.love', '爱你的')}<br><span class="tf-letter-sign-name">🧚 ${t('tooth.fairyName', '牙仙子')}</span></p>
            <p class="tf-letter-meta">🦷 ${this.toothName(toothId)} · #${rec.order} · ${rec.date}</p>
          </div>
        </div>

        <div class="tf-letter-nav">
          <button class="tf-letter-nav-btn" ${prev ? '' : 'disabled'}
            onclick="${prev ? `ToothFairy.openLetter('${prev}')` : ''}">← ${t('tooth.prevLetter', '上一封')}</button>
          <button class="tf-letter-share-btn" onclick="ToothFairy.shareLetter()">📷 ${t('tooth.saveLetter', '保存图片')}</button>
          <button class="tf-letter-nav-btn" ${next ? '' : 'disabled'}
            onclick="${next ? `ToothFairy.openLetter('${next}')` : ''}">${t('tooth.nextLetter', '下一封')} →</button>
        </div>
      </div>
    `;
  },

  // 稳定生成信件内容（基于 letterSeed）
  buildLetter(rec, name) {
    const t = this.t.bind(this);
    const seed = rec.letterSeed || rec.order || 1;
    const cur = this.data.settings.currency;
    const rewardStr = this.rewardText(rec);

    // 开场白模板（按 seed 轮换，保持每封不同）
    const openings = [
      t('tooth.open1', '昨天晚上，我踮着脚尖飞进你的房间，从枕头下小心地取走了你的小牙齿。它又白又亮，是我今晚收到最漂亮的一颗！'),
      t('tooth.open2', '当月亮爬上天空时，我沿着星星铺成的小路来到你家。你睡得好香呀，我悄悄换走了你的牙齿。'),
      t('tooth.open3', '我带着小小的魔法口袋来找你啦！你的牙齿闪着光，我要把它放进牙仙子城堡的珍藏架上。'),
      t('tooth.open4', '嘘——别告诉别人，我今晚特意为你多撒了一把星光粉。你的牙齿真是又干净又结实！'),
      t('tooth.open5', '我拍拍翅膀，越过云朵来到你的窗前。这颗牙齿我非常喜欢，谢谢你把它留给我！')
    ];

    // 特殊：第一颗牙
    const firstOpening = t('tooth.openFirst', '这是你掉的第一颗牙！这一天太特别了，整个牙仙子王国都为你响起了小铃铛。我会把这颗珍贵的第一颗牙放在最闪亮的地方永远珍藏。');

    // 刷牙表扬
    const cleanPraise = rec.clean
      ? t('tooth.praiseClean', '我看得出来你每天都有认真刷牙——这颗牙干净得会发光呢！继续保持，剩下的牙齿也会又健康又漂亮。')
      : t('tooth.praiseTry', '记得早晚都要刷牙哦，这样每一颗牙都会变得亮晶晶。下次我来的时候，希望看到更闪亮的牙齿！');

    // 礼物说明
    const rewardLine = t('tooth.rewardLine', '作为交换，我在你的枕头下留下了') + ` ${rewardStr} ` + t('tooth.rewardLine2', '希望你会喜欢这份小小的心意。');

    // 冷知识
    const facts = [
      t('tooth.fact1', '你一共有20颗乳牙，它们会慢慢换成恒牙陪你长大。'),
      t('tooth.fact2', '牙齿是人身上最坚硬的部分，比骨头还硬哦！'),
      t('tooth.fact3', '多喝牛奶、多吃蔬菜，牙齿会更强壮。'),
      t('tooth.fact4', '睡前刷牙最重要，能赶走藏在牙缝里的小虫子。'),
      t('tooth.fact5', '每颗牙齿都有自己的名字和工作，门牙负责咬、大牙负责嚼。')
    ];

    const opening = rec.order === 1 ? firstOpening : openings[seed % openings.length];
    const fact = facts[seed % facts.length];

    return {
      paragraphs: [opening, cleanPraise, rewardLine],
      fact
    };
  },

  shareLetter() {
    const t = this.t.bind(this);
    // 使用打印方式让家长保存/打印（无需外部库）
    const paper = document.getElementById('tf-letter-paper');
    if (!paper) return;
    this.playSound('click');
    const win = window.open('', '_blank');
    if (!win) {
      alert(t('tooth.printBlocked', '请允许弹出窗口以保存信件'));
      return;
    }
    win.document.write(`
      <html><head><title>${t('tooth.letterFrom', '来自牙仙子的信')}</title>
      <style>
        body{margin:0;padding:24px;background:#1a1440;display:flex;justify-content:center;font-family:'Comic Sans MS','Microsoft YaHei',sans-serif;}
        .p{max-width:520px;background:linear-gradient(160deg,#fffdf5,#fff5fb);border-radius:18px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.4);color:#5a4a6a;line-height:1.9;}
        h3{text-align:center;color:#b06ab3;}
        p{font-size:16px;}
        .sign{text-align:right;font-weight:bold;color:#b06ab3;}
      </style></head><body>
      <div class="p">${paper.querySelector('.tf-letter-body').innerHTML}</div>
      <scr` + `ipt>setTimeout(function(){window.print();},400);</scr` + `ipt>
      </body></html>
    `);
    win.document.close();
  },

  // ========== 收藏证书 ==========
  getCertLevel(count) {
    const t = this.t.bind(this);
    if (count >= 20) return { level: 4, label: t('tooth.certGold', '金牌'), emoji: '🏆', color: '#FFD93D' };
    if (count >= 10) return { level: 3, label: t('tooth.certSilver', '银牌'), emoji: '🥈', color: '#C9D6E5' };
    if (count >= 5)  return { level: 2, label: t('tooth.certBronze', '铜牌'), emoji: '🥉', color: '#E0A878' };
    if (count >= 1)  return { level: 1, label: t('tooth.certStar', '新星'), emoji: '⭐', color: '#FFB6D9' };
    return { level: 0, label: t('tooth.certNone', '待解锁'), emoji: '🔒', color: '#C0B8D8' };
  },

  renderCertificate(content) {
    const t = this.t.bind(this);
    const name = this.getProfileName();
    const count = this.getFallenCount();
    const cert = this.getCertLevel(count);
    const list = this.getFallenList();
    const firstDate = list.length ? list[0].date : '—';
    const lastDate = list.length ? list[list.length - 1].date : '—';
    const cur = this.data.settings.currency;
    const totalReward = list.reduce((s, x) => s + (x.amount || 0), 0);

    // 下一里程碑
    const milestones = [1, 5, 10, 20];
    const nextMs = milestones.find(m => m > count);

    content.innerHTML = `
      <div class="tf-cert-view">
        <button class="tf-back-btn" onclick="ToothFairy.switchView('main')">← ${t('btn.back', '返回')}</button>

        <div class="tf-certificate ${count === 0 ? 'tf-cert-locked' : ''}" id="tf-certificate">
          <div class="tf-cert-border">
            <div class="tf-cert-seal">${cert.emoji}</div>
            <div class="tf-cert-title">🦷 ${t('tooth.certTitle', '乳牙收藏证书')}</div>
            <div class="tf-cert-ribbon" style="background:${cert.color}">${cert.label} · Lv.${cert.level}</div>

            <div class="tf-cert-name">${this.escapeHtml(name)}</div>
            <p class="tf-cert-body">${count === 0
              ? t('tooth.certEmpty', '还没有掉牙记录，掉了第一颗牙就能获得证书啦！')
              : `${t('tooth.certDesc1', '在牙仙子的见证下，成功收集了')} <strong>${count}</strong> ${t('tooth.certDesc2', '颗乳牙，勇敢又爱护牙齿！')}`}</p>

            <div class="tf-cert-stats">
              <div><span>🦷 ${count}/${this.totalTeeth}</span><small>${t('tooth.teethLost', '掉牙')}</small></div>
              <div><span>🪙 ${cur}${totalReward}</span><small>${t('tooth.totalGift', '累计礼物')}</small></div>
              <div><span>🧚 ${this.data.fairyVisits}</span><small>${t('tooth.visits', '牙仙来访')}</small></div>
            </div>

            ${count > 0 ? `<p class="tf-cert-dates">${t('tooth.certFrom', '第一颗')}: ${firstDate} · ${t('tooth.certLatest', '最近')}: ${lastDate}</p>` : ''}

            <div class="tf-cert-fairy-sign">🧚 ${t('tooth.fairyName', '牙仙子')}</div>
          </div>
        </div>

        ${nextMs ? `
          <div class="tf-cert-next">
            ${t('tooth.nextMilestone', '再掉')} <strong>${nextMs - count}</strong> ${t('tooth.toUnlock', '颗牙，解锁下一枚勋章！')}
          </div>
        ` : `<div class="tf-cert-next">🎉 ${t('tooth.certMax', '已集齐全部乳牙，最高荣誉达成！')}</div>`}

        ${count > 0 ? `
          <button class="tf-cert-share-btn" onclick="ToothFairy.shareCertificate()">📷 ${t('tooth.saveCert', '保存证书')}</button>
        ` : ''}
      </div>
    `;
  },

  shareCertificate() {
    const t = this.t.bind(this);
    const cert = document.getElementById('tf-certificate');
    if (!cert) return;
    this.playSound('click');
    const win = window.open('', '_blank');
    if (!win) { alert(t('tooth.printBlocked', '请允许弹出窗口以保存证书')); return; }
    win.document.write(`
      <html><head><title>${t('tooth.certTitle', '乳牙收藏证书')}</title>
      <style>
        body{margin:0;padding:24px;background:#1a1440;display:flex;justify-content:center;font-family:'Comic Sans MS','Microsoft YaHei',sans-serif;}
        .wrap{max-width:520px;}
      </style></head><body>
      <div class="wrap">${cert.outerHTML}</div>
      <scr` + `ipt>setTimeout(function(){window.print();},400);</scr` + `ipt>
      </body></html>
    `);
    win.document.close();
  },

  // ========== 家长规则设置 ==========
  renderSettings(content) {
    const t = this.t.bind(this);
    const s = this.data.settings;
    const currencies = ['$', '¥', '€', '£', '₩', '元'];
    const amounts = [0, 1, 2, 3, 5, 10];

    content.innerHTML = `
      <div class="tf-settings-view">
        <button class="tf-back-btn" onclick="ToothFairy.switchView('main')">← ${t('btn.back', '返回')}</button>

        <div class="tf-settings-header">
          <h3>⚙️ ${t('tooth.parentRules', '家长规则')}</h3>
          <p class="tf-settings-sub">${t('tooth.settingsHint', '设置牙仙子的奖励规则')}</p>
        </div>

        <!-- 货币 -->
        <div class="tf-setting-group">
          <label class="tf-setting-label">💱 ${t('tooth.currency', '货币符号')}</label>
          <div class="tf-chip-row">
            ${currencies.map(c => `
              <button class="tf-chip ${c === s.currency ? 'active' : ''}"
                onclick="ToothFairy.setSetting('currency','${c}')">${c}</button>
            `).join('')}
          </div>
        </div>

        <!-- 奖励模式 -->
        <div class="tf-setting-group">
          <label class="tf-setting-label">🎁 ${t('tooth.giftMode', '奖励方式')}</label>
          <div class="tf-chip-row">
            <button class="tf-chip ${s.giftMode === 'money' ? 'active' : ''}"
              onclick="ToothFairy.setSetting('giftMode','money')">🪙 ${t('tooth.modeMoney', '零钱')}</button>
            <button class="tf-chip ${s.giftMode === 'gift' ? 'active' : ''}"
              onclick="ToothFairy.setSetting('giftMode','gift')">🧸 ${t('tooth.modeGift', '小礼物')}</button>
            <button class="tf-chip ${s.giftMode === 'mix' ? 'active' : ''}"
              onclick="ToothFairy.setSetting('giftMode','mix')">✨ ${t('tooth.modeMix', '混合')}</button>
          </div>
        </div>

        <!-- 第一颗牙金额 -->
        <div class="tf-setting-group">
          <label class="tf-setting-label">🌟 ${t('tooth.firstAmount', '第一颗牙')} (${s.currency}${s.firstAmount})</label>
          <div class="tf-chip-row">
            ${amounts.map(a => `
              <button class="tf-chip ${a === s.firstAmount ? 'active' : ''}"
                onclick="ToothFairy.setSetting('firstAmount',${a})">${s.currency}${a}</button>
            `).join('')}
          </div>
        </div>

        <!-- 后续每颗金额 -->
        <div class="tf-setting-group">
          <label class="tf-setting-label">🦷 ${t('tooth.normalAmount', '之后每颗')} (${s.currency}${s.normalAmount})</label>
          <div class="tf-chip-row">
            ${amounts.map(a => `
              <button class="tf-chip ${a === s.normalAmount ? 'active' : ''}"
                onclick="ToothFairy.setSetting('normalAmount',${a})">${s.currency}${a}</button>
            `).join('')}
          </div>
        </div>

        <div class="tf-setting-note">
          💡 ${t('tooth.milestoneNote', '小提示：第5、10、20颗牙会自动多给一份作为里程碑奖励，让期待感一直延续到最后一颗乳牙~')}
        </div>

        <!-- 重置 -->
        <button class="tf-reset-btn" onclick="ToothFairy.confirmReset()">🗑️ ${t('tooth.resetData', '清空所有掉牙记录')}</button>
      </div>
    `;
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.saveData();
    this.playSound('click');
    this.renderSettings(document.getElementById('tooth-fairy-content'));
  },

  confirmReset() {
    const t = this.t.bind(this);
    if (confirm(t('tooth.resetConfirm', '确定要清空所有掉牙记录吗？此操作无法撤销。'))) {
      this.data.teeth = {};
      this.data.fairyVisits = 0;
      this.saveData();
      this.switchView('main');
    }
  },

  // ========== 家长通知 ==========
  notifyParent(rec) {
    if (typeof ParentNotify === 'undefined' || !ParentNotify.send) return;
    const name = this.getProfileName();
    const reward = this.rewardText(rec);
    const msg = `${name} ${this.t('tooth.notifyBody', '掉了一颗牙')}（${this.toothName(rec.toothId)} #${rec.order}）🦷 ${this.t('tooth.notifyReward', '牙仙子准备了')} ${reward}`;
    try {
      ParentNotify.send(this.t('tooth.notifyTitle', '🧚 牙仙子提醒'), msg);
    } catch (e) { /* 通知失败静默 */ }
  },

  // ========== 工具 ==========
  todayStr() {
    // 使用本地日期
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  toothName(toothId) {
    const t = this.t.bind(this);
    const all = [...this.layout.upper, ...this.layout.lower];
    const tooth = all.find(x => x.id === toothId);
    if (!tooth) return '🦷';
    const isUpper = toothId[0] === 'U';
    const pos = isUpper ? t('tooth.upper', '上排') : t('tooth.lower', '下排');
    const typeNames = {
      central: t('tooth.typeCentral', '门牙'),
      lateral: t('tooth.typeLateral', '侧门牙'),
      canine:  t('tooth.typeCanine', '尖牙'),
      molar:   t('tooth.typeMolar', '大牙')
    };
    return `${pos}${typeNames[tooth.type] || ''}`;
  },

  giftName(id) {
    const t = this.t.bind(this);
    const names = {
      sticker: t('tooth.giftSticker', '贴纸'),
      pencil:  t('tooth.giftPencil', '铅笔'),
      eraser:  t('tooth.giftEraser', '橡皮'),
      book:    t('tooth.giftBook', '小书'),
      toy:     t('tooth.giftToy', '小玩具'),
      candy:   t('tooth.giftCandy', '糖果'),
      crayon:  t('tooth.giftCrayon', '蜡笔'),
      badge:   t('tooth.giftBadge', '奖章')
    };
    return names[id] || '';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }
};

// 全局函数
function showToothFairy() {
  ToothFairy.show();
}

function closeToothFairy() {
  ToothFairy.close();
}
