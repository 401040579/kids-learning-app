// ========== 睡前小月亮 ==========
// 三步睡前流程：① 小灯时间（关灯前一小时暗下来，玩安静的）② 翻卡片（任选卡片，做完一件勾一张）
// ③ 月亮票（关灯后能用一次）。只存本机/账号存档键 kidsBedtime，不上报、不发通知。
// 「今晚」以凌晨 4 点为界：过了午夜还算前一晚。

const Bedtime = {
  KEY: 'kidsBedtime',
  KEEP_NIGHTS: 60,

  // 卡片池：挑选每晚要做的事
  POOL: {
    teeth:   { emoji: '🪥', name: '刷牙', say: '刷刷小牙齿，上上下下' },
    potty:   { emoji: '🚽', name: '尿尿', say: '去尿尿，再洗洗小手' },
    book:    { emoji: '📖', name: '讲一本', say: '选一本书，听一个故事' },
    hug:     { emoji: '🤗', name: '抱一抱', say: '和爸爸妈妈抱一抱' },
    undress: { emoji: '👚', name: '脱衣服' },
    nose:    { emoji: '👃', name: '洗鼻子' },
    sleep:   { emoji: '🛏️', name: '睡觉' },
    bath:    { emoji: '🛁', name: '洗澡', say: '洗个香香的澡' },
    face:    { emoji: '🧼', name: '洗脸', say: '洗洗小脸和小手' },
    pajamas: { emoji: '👕', name: '换睡衣', say: '换上软软的睡衣' },
    water:   { emoji: '💧', name: '喝口水', say: '喝一小口水' },
    tidy:    { emoji: '🧸', name: '收玩具', say: '玩具们也要回家睡觉啦' }
  },
  DEFAULT_CARDS: ['teeth', 'potty', 'book', 'hug', 'undress', 'nose', 'bath', 'sleep'],
  QUIET_PLAY: [['🧱', '搭积木'], ['🎨', '画画'], ['🧩', '拼图'], ['📚', '看书']],

  data: null,
  broken: false,      // 存档损坏时保留原文，不覆盖
  view: 'home',
  timer: 0,

  defaults() {
    return {
      settings: { lightsOut: '21:00', dimMinutes: 60, routineMinutes: 20 },
      cards: [...this.DEFAULT_CARDS],
      customCards: {},
      nights: {}
    };
  },

  // ========== 存档 ==========
  init() {
    this.load();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 30000);
    setTimeout(() => this.tick(), 3000);
  },

  load() {
    const base = this.defaults();
    this.broken = false;
    const raw = AppStorage.getItem('kidsBedtime');
    if (raw === null) { this.data = base; return; }
    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('type');
      const customCards = Object.fromEntries(Object.entries(saved.customCards || {}).filter(
        ([id, name]) => /^custom-[a-z0-9-]+$/.test(id) && typeof name === 'string' && name.trim()
      ));
      const cards = Array.isArray(saved.cards) ? saved.cards.filter(id =>
        typeof id === 'string' && (Object.hasOwn(this.POOL, id) || Object.hasOwn(customCards, id))
      ) : base.cards;
      this.data = {
        ...saved,
        customCards,
        settings: { ...base.settings, ...(saved.settings || {}) },
        cards: cards.length ? [...new Set(cards)] : base.cards,
        nights: saved.nights && typeof saved.nights === 'object' ? saved.nights : {}
      };
    } catch {
      // 不删除原文，界面提示家长；本次仅在内存里用默认流程
      this.broken = true;
      this.data = base;
    }
  },

  save() {
    if (this.broken) return false;
    const keys = Object.keys(this.data.nights).sort();
    keys.slice(0, Math.max(0, keys.length - this.KEEP_NIGHTS)).forEach(k => delete this.data.nights[k]);
    const ok = SafeStorage.set('kidsBedtime', JSON.stringify(this.data));
    if (!ok) this.toast('没存上，手机空间可能满了');
    return ok;
  },

  // ========== 时间 ==========
  pad(n) { return String(n).padStart(2, '0'); },
  minutesOf(hhmm) { const [h, m] = String(hhmm).split(':').map(Number); return (h || 0) * 60 + (m || 0); },
  fmt(min) { min = ((min % 1440) + 1440) % 1440; return `${this.pad(Math.floor(min / 60))}:${this.pad(min % 60)}`; },
  dateKey(d) { return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`; },
  nightKey(now = new Date()) {
    const d = new Date(now);
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    return this.dateKey(d);
  },
  // 以「晚上分钟数」比较：凌晨 0~4 点算作 24:00 之后
  nowMinutes(now = new Date()) {
    const m = now.getHours() * 60 + now.getMinutes();
    return now.getHours() < 4 ? m + 1440 : m;
  },
  schedule() {
    const s = this.data.settings;
    let out = this.minutesOf(s.lightsOut);
    if (out < 240) out += 1440; // 凌晨关灯也按「当晚」计算
    return { dim: out - Number(s.dimMinutes), cards: out - Number(s.routineMinutes), out };
  },
  tonight() {
    const key = this.nightKey();
    if (!this.data.nights[key]) this.data.nights[key] = { done: [], ticket: 'none' };
    return this.data.nights[key];
  },
  peekTonight() { return this.data.nights[this.nightKey()] || { done: [], ticket: 'none' }; },

  streak() {
    let count = 0;
    const d = new Date();
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    // 今晚还没做完不算断，从昨晚开始数
    if (!this.data.nights[this.dateKey(d)]?.finishedAt) d.setDate(d.getDate() - 1);
    while (this.data.nights[this.dateKey(d)]?.finishedAt) { count++; d.setDate(d.getDate() - 1); }
    return count;
  },
  totalMoons() { return Object.values(this.data.nights).filter(n => n.finishedAt).length; },

  // ========== 到点提醒（网页开着时） ==========
  tick() {
    if (!this.data || document.hidden) return;
    const now = this.nowMinutes(), s = this.schedule(), night = this.peekTonight();
    if (night.finishedAt) return;
    if (now >= s.cards && now < s.out + 60 && !night.cardCall) {
      this.tonight().cardCall = true; this.save();
      this.open('cards');
      this.speak('卡片时间到啦，做完哪件事，就勾哪张卡片吧');
    } else if (now >= s.dim && now < s.cards && !night.dimCall) {
      this.tonight().dimCall = true; this.save();
      this.open('dim');
      this.speak('小灯时间到啦');
    }
  },

  speak(text) {
    try {
      if (typeof PuterTTS !== 'undefined') { PuterTTS.speak(text); return; }
      const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; speechSynthesis.speak(u);
    } catch { /* 无声也能用 */ }
  },

  toast(text) {
    const el = document.getElementById('bt-toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toast);
    this._toast = setTimeout(() => el.classList.remove('show'), 2600);
  },

  // ========== 打开/关闭 ==========
  open(view) {
    const modal = document.getElementById('bedtime-modal');
    if (!modal) return;
    if (!this.data) this.load();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (typeof RecentlyUsed !== 'undefined') RecentlyUsed.track('bedtime');
    this.go(view || this.suggestedView());
  },
  close() {
    document.getElementById('bedtime-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  },
  suggestedView() {
    const n = this.peekTonight();
    if (n.finishedAt) return 'lights';
    if (n.done.length) return 'cards';
    return 'home';
  },
  go(view) {
    this.view = view;
    const modal = document.getElementById('bedtime-modal');
    modal.dataset.view = view;
    const body = document.getElementById('bt-body');
    body.innerHTML = this['render_' + view]();
    body.scrollTop = 0;
    document.getElementById('bt-title').textContent = {
      home: '睡前小月亮', dim: '小灯时间', cards: '翻卡片', ticket: '月亮票',
      lights: '晚安', order: '选一选卡片', settings: '家长设置'
    }[view] || '睡前小月亮';
    document.getElementById('bt-back').hidden = view === 'home';
  },
  back() {
    if (this.view === 'home') this.close();
    else this.go('home');
  },

  // ========== 页面：首页 ==========
  render_home() {
    const s = this.schedule(), n = this.peekTonight(), streak = this.streak();
    const now = this.nowMinutes();
    let main;
    if (n.finishedAt) main = `<button class="bt-big bt-moon-btn" onclick="Bedtime.go('lights')">🌙 晚安，去关灯</button>`;
    else if (n.done.length) main = `<button class="bt-big" onclick="Bedtime.go('cards')">🃏 继续翻卡片（${n.done.length}/${this.data.cards.length}）</button>`;
    else if (now >= s.cards) main = `<button class="bt-big" onclick="Bedtime.go('cards')">🃏 开始翻卡片</button>`;
    else if (now >= s.dim) main = `<button class="bt-big bt-lamp-btn" onclick="Bedtime.go('dim')">🪔 小灯时间到啦</button>
      <button class="bt-soft" onclick="Bedtime.go('cards')">提前开始翻卡片</button>`;
    else main = `<button class="bt-big" onclick="Bedtime.go('order')">🃏 先选一选睡前卡片</button>`;

    const week = this.weekRow();
    const broken = this.broken ? `<p class="bt-warn">睡前存档读不出来，原记录已保留没有删除；今晚的进度暂时不会保存。请家长检查备份。</p>` : '';
    return `
      ${broken}
      <div class="bt-sky-hero">
        <div class="bt-hero-moon">🌛</div>
        <p class="bt-hero-line">睡前不靠催，<b>每晚都一样</b></p>
      </div>
      <div class="bt-timeline">
        ${this.step('🪔', '小灯时间', this.fmt(s.dim), now >= s.dim)}
        ${this.step('🃏', '翻卡片', this.fmt(s.cards), now >= s.cards || n.done.length > 0)}
        ${this.step('🌙', '关灯', this.fmt(s.out), !!n.finishedAt)}
      </div>
      <div class="bt-main-actions">${main}</div>
      <div class="bt-streak">
        <div class="bt-streak-num"><span>${streak}</span>晚</div>
        <div class="bt-streak-text">连续好好睡觉<br><small>一共收集了 ${this.totalMoons()} 个小月亮</small></div>
      </div>
      <div class="bt-week">${week}</div>
      ${streak >= 7 ? `<p class="bt-badge">🌕 满月徽章！连续 ${streak} 晚，太棒啦！</p>` : `<p class="bt-hint">再坚持 ${7 - (streak % 7)} 晚，就能点亮满月 🌕</p>`}
      <div class="bt-grid2">
        <button class="bt-tile" onclick="Bedtime.go('order')">🃏<span>选一选卡片</span></button>
        <button class="bt-tile" onclick="Bedtime.go('settings')">👨‍👩‍👧<span>家长设置</span></button>
      </div>`;
  },
  step(icon, name, time, on) {
    return `<div class="bt-step${on ? ' on' : ''}"><div class="bt-step-icon">${icon}</div><b>${name}</b><span>${time}</span></div>`;
  },
  weekRow() {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    const today = new Date();
    if (today.getHours() < 4) today.setDate(today.getDate() - 1);
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const night = this.data.nights[this.dateKey(d)];
      const icon = night?.finishedAt ? (night.onTime ? '🌕' : '🌗') : (i === 0 ? '✨' : '🌑');
      cells.push(`<div class="bt-day${i === 0 ? ' today' : ''}"><span>${icon}</span><small>${i === 0 ? '今晚' : '周' + names[d.getDay()]}</small></div>`);
    }
    return cells.join('');
  },

  // ========== 页面：小灯时间 ==========
  render_dim() {
    const s = this.schedule(), left = Math.max(0, s.cards - this.nowMinutes());
    return `
      <div class="bt-lamp-scene">
        <div class="bt-lamp"><div class="bt-lamp-glow"></div>🪔</div>
        <h3>小灯时间到啦</h3>
        <p>关掉大灯、电视和平板，<br>只留一盏暖暖的小灯</p>
      </div>
      <p class="bt-sub">这一会儿照样玩，玩安静的：</p>
      <div class="bt-quiet">${this.QUIET_PLAY.map(([e, n]) => `<div class="bt-quiet-item"><span>${e}</span>${n}</div>`).join('')}</div>
      <p class="bt-count">${left > 0 ? `再过 <b>${left}</b> 分钟，开始翻卡片` : '可以开始翻卡片啦'}</p>
      <button class="bt-big" onclick="Bedtime.go('cards')">🃏 ${left > 0 ? '我准备好了，提前翻卡片' : '开始翻卡片'}</button>
      <button class="bt-soft" onclick="Bedtime.close()">👍 好的，先去安静玩</button>`;
  },

  // ========== 页面：翻卡片 ==========
  render_cards() {
    const n = this.peekTonight(), cards = this.data.cards;
    if (n.finishedAt) return this.render_lights();
    const s = this.schedule();
    if (!n.done.length && this.nowMinutes() < s.dim) return this.render_daytime();
    return `
      <p class="bt-sub">做完哪件事，就勾哪张。再点一次可以取消。</p>
      <p class="bt-count" aria-live="polite">已完成 <b>${n.done.length} / ${cards.length}</b></p>
      <div class="bt-checklist">${cards.map(id => {
        const card = this.card(id), done = n.done.includes(id);
        return `<button class="bt-choice" data-card="${id}" aria-pressed="${done}" onclick="Bedtime.finishCard('${id}')">
          <i aria-hidden="true">${done ? '✓' : ''}</i><span aria-hidden="true">${card.emoji}</span>${this.escape(card.name)}
        </button>`;
      }).join('')}</div>
      <p class="bt-count">🌙 ${this.fmt(s.out)} 关灯</p>
      <button class="bt-link" onclick="Bedtime.go('order')">选一选卡片</button>`;
  },
  card(id) {
    return this.POOL[id] || { emoji: '🌟', name: this.data.customCards[id] };
  },
  escape(text) {
    return text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  },
  render_daytime() {
    const s = this.schedule();
    return `
      <div class="bt-sky-hero"><div class="bt-hero-moon">☀️</div></div>
      <h3 class="bt-day-title">现在还不是睡觉时间哦</h3>
      <p class="bt-sub">晚上 <b>${this.fmt(s.dim)}</b> 小灯亮了，<br><b>${this.fmt(s.cards)}</b> 再来翻卡片</p>
      <button class="bt-big" onclick="Bedtime.go('order')">🃏 先选一选卡片</button>
      <button class="bt-soft" onclick="Bedtime.go('home')">好的</button>`;
  },
  finishCard(id) {
    const night = this.tonight();
    if (night.finishedAt || !this.data.cards.includes(id)) return;
    const index = night.done.indexOf(id);
    if (index >= 0) night.done.splice(index, 1);
    else {
      if (!night.startedAt) night.startedAt = Date.now();
      night.done.push(id);
    }
    const allDone = this.completeIfReady(night);
    this.save();
    const body = document.getElementById('bt-body');
    const scroll = body?.scrollTop;
    this.go(allDone ? 'ticket' : 'cards');
    if (allDone) {
      this.sparkle();
      this.speak('全部做完啦！你得到了一张月亮票');
    } else {
      if (body) {
        body.scrollTop = scroll;
        body.querySelector(`[data-card="${id}"]`)?.focus({ preventScroll: true });
      }
      if (index < 0) this.speak(this.POOL[id]?.say || '做完啦');
    }
  },
  completeIfReady(night) {
    if (night.finishedAt || !this.data.cards.every(id => night.done.includes(id))) return false;
    night.finishedAt = Date.now();
    night.onTime = this.nowMinutes() <= this.schedule().out;
    night.ticket = 'unused';
    return true;
  },
  sparkle() {
    const box = document.getElementById('bt-body');
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'bt-spark';
      s.textContent = ['⭐', '✨', '🌟'][i % 3];
      s.style.left = (30 + Math.random() * 40) + '%';
      s.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px');
      s.style.setProperty('--dy', (-120 - Math.random() * 160) + 'px');
      s.style.animationDelay = (Math.random() * 0.2) + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 1500);
    }
  },

  // ========== 页面：月亮票 ==========
  render_ticket() {
    const n = this.peekTonight();
    return `
      <div class="bt-celebrate">🎉 全部做完啦！</div>
      <p class="bt-sub">${n.onTime ? '准时完成，今晚点亮一个满月 🌕' : '做完啦，今晚收集一个小月亮 🌗'}</p>
      ${this.ticketHTML(false)}
      <p class="bt-ticket-rule">这是<b>月亮票</b>，关了灯能用一次。<br>喝口水、抱一下都行，用了就收走。</p>
      <button class="bt-big bt-moon-btn" onclick="Bedtime.go('lights')">🌙 收好月亮票，关灯啦</button>`;
  },
  ticketHTML(used) {
    return `<div class="bt-ticket${used ? ' used' : ''}">
      <div class="bt-ticket-l">🌙</div>
      <div class="bt-ticket-r"><b>月亮票</b><span>MOON TICKET · 1 次</span><small>${this.nightKey().slice(5).replace('-', '月')}日</small></div>
      ${used ? '<div class="bt-ticket-stamp">用过啦</div>' : ''}
    </div>`;
  },

  // ========== 页面：关灯后 ==========
  render_lights() {
    const n = this.peekTonight();
    if (!n.finishedAt) return this.render_cards();
    const used = n.ticket === 'used';
    return `
      <div class="bt-night">
        <div class="bt-night-moon">🌙</div>
        <p class="bt-night-text">晚安，${this.childName()}</p>
        ${this.ticketHTML(used)}
        ${used
          ? `<p class="bt-night-say">月亮票用完啦，明天还有 🌙</p>
             <p class="bt-night-small">（真的不舒服、害怕、要上厕所，爸爸妈妈照常管）</p>`
          : `<button class="bt-big bt-use-ticket" onclick="Bedtime.useTicket()">🎫 用月亮票（喝口水 / 抱一下）</button>`}
        ${typeof JellyfishLamp !== 'undefined' ? `<button class="bt-big bt-lamp-link" onclick="Bedtime.openNightLight()">🪼 打开水母小夜灯</button>` : ''}
        <button class="bt-link bt-night-exit" onclick="Bedtime.close()">关掉屏幕</button>
      </div>`;
  },
  // 关灯后直接亮起水母小夜灯；关掉小夜灯回到这里，月亮票还能用
  openNightLight() {
    this.close();
    JellyfishLamp.open({ on: true, onClose: () => this.open('lights') });
  },
  useTicket() {
    const night = this.tonight();
    if (night.ticket !== 'unused') return;
    night.ticket = 'used';
    night.ticketAt = Date.now();
    this.save();
    this.speak('好的，用一次月亮票');
    this.go('lights');
  },
  childName() {
    try {
      const p = JSON.parse(AppStorage.getItem('kidsProfileData') || '{}');
      const name = String(p.name || '宝贝').slice(0, 20);
      return name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    } catch { return '宝贝'; }
  },

  // ========== 页面：选择卡片 ==========
  render_order() {
    const ids = [...Object.keys(this.POOL), ...Object.keys(this.data.customCards)];
    return `<div class="bt-panel"><h4>每晚用哪些卡片？</h4>
      <p class="bt-note">点亮想用的卡片，至少留两张。</p>
      <div class="bt-pool">${ids.map(id => {
        const c = this.card(id), on = this.data.cards.includes(id);
        return `<button aria-pressed="${on}" class="bt-pool-item${on ? ' on' : ''}" onclick="Bedtime.toggleCard('${id}')">${c.emoji}<span>${this.escape(c.name)}</span></button>`;
      }).join('')}</div>
      <form class="bt-add" onsubmit="Bedtime.addCard(this.elements.cardName.value);return false">
        <label for="bt-custom">自己的卡片</label>
        <input id="bt-custom" name="cardName" maxlength="32" required placeholder="例如：给小熊盖被子">
        <button class="bt-soft">添加卡片</button>
      </form></div>
      <button class="bt-big" onclick="Bedtime.go('cards')">选好了</button>`;
  },
  addCard(value) {
    const name = value.trim();
    if (!name || name.length > 32) return this.toast('请输入 1 到 32 个字');
    const match = [...Object.keys(this.POOL), ...Object.keys(this.data.customCards)]
      .find(id => this.card(id).name === name);
    const id = match || 'custom-' + crypto.randomUUID();
    if (!match) this.data.customCards[id] = name;
    if (!this.data.cards.includes(id)) this.data.cards.push(id);
    this.save();
    this.go('order');
    this.toast('这张卡片已选好');
  },

  // ========== 页面：家长设置 ==========
  render_settings() {
    const s = this.data.settings, sc = this.schedule(), cards = this.data.cards;
    return `
      <div class="bt-panel">
        <h4>⏰ 时间</h4>
        <label>关灯时间<input type="time" value="${s.lightsOut}" onchange="Bedtime.setTime(this.value)"></label>
        <label>小灯时间：关灯前
          <select onchange="Bedtime.setNum('dimMinutes', this.value)">
            ${[45, 60, 75, 90].map(v => `<option value="${v}"${+s.dimMinutes === v ? ' selected' : ''}>${v} 分钟</option>`).join('')}
          </select></label>
        <label>翻卡片：关灯前
          <select onchange="Bedtime.setNum('routineMinutes', this.value)">
            ${[15, 20, 25, 30, 40].map(v => `<option value="${v}"${+s.routineMinutes === v ? ' selected' : ''}>${v} 分钟</option>`).join('')}
          </select></label>
        <p class="bt-note">每晚：${this.fmt(sc.dim)} 小灯 → ${this.fmt(sc.cards)} 翻卡片 → ${this.fmt(sc.out)} 关灯</p>
      </div>
      <div class="bt-panel">
        <h4>🔔 每晚提醒</h4>
        <p class="bt-note">网页开着时，到点会自动弹出并语音提醒。网页关着时网页没法提醒，可以把提醒加进手机日历（每天重复、自带闹铃）。</p>
        <button class="bt-soft" onclick="Bedtime.downloadCalendar()">📅 加到手机日历</button>
      </div>
      <div class="bt-panel">
        <button class="bt-soft" onclick="Bedtime.go('order')">🃏 选一选卡片（已选 ${cards.length} 张）</button>
      </div>
      <div class="bt-panel">
        <h4>💡 几点经验</h4>
        <ul class="bt-tips">
          <li>头几晚孩子还会试探，照样做。</li>
          <li>故事说好讲几本，每晚一样。</li>
          <li>磨蹭时别说「快点」，问一句「你想勾哪一张？」</li>
          <li>月亮票用完再叫，平平地说一句「月亮票用完啦，明天还有」，然后不再回话。真不舒服、害怕、要上厕所，照常管。</li>
        </ul>
      </div>
      ${this.peekTonight().done.length ? `<button class="bt-link" onclick="Bedtime.resetTonight()">重新开始今晚的卡片</button>` : ''}`;
  },
  setTime(v) {
    if (!/^\d{2}:\d{2}$/.test(v)) return;
    this.data.settings.lightsOut = v; this.save(); this.go('settings');
  },
  setNum(field, v) { this.data.settings[field] = Number(v); this.save(); this.go('settings'); },
  toggleCard(id) {
    const cards = this.data.cards, at = cards.indexOf(id);
    if (at >= 0) {
      if (cards.length <= 2) return this.toast('至少留 2 张卡片');
      cards.splice(at, 1);
    } else {
      cards.push(id);
    }
    // 今晚已翻过的卡片如果被移走，进度里也去掉，避免完成判断错乱
    const n = this.data.nights[this.nightKey()];
    if (n && !n.finishedAt) {
      n.done = n.done.filter(c => cards.includes(c));
      this.completeIfReady(n);
    }
    this.save(); this.go('order');
  },
  resetTonight() {
    if (!confirm('重新开始今晚的卡片？今晚的月亮票也会收回。')) return;
    delete this.data.nights[this.nightKey()];
    this.save(); this.go('home');
  },

  // 生成每天重复的日历提醒（.ics）：小灯时间 + 翻卡片
  calendarText(now = new Date()) {
    const sc = this.schedule();
    const day = this.dateKey(now).replace(/-/g, '');
    const t = m => { m = ((m % 1440) + 1440) % 1440; return `${this.pad(Math.floor(m / 60))}${this.pad(m % 60)}00`; };
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ev = (uid, start, mins, title, note) => [
      'BEGIN:VEVENT', `UID:${uid}@kids-learning-bedtime`, `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${t(start)}`, `DURATION:PT${mins}M`, 'RRULE:FREQ=DAILY',
      `SUMMARY:${title}`, `DESCRIPTION:${note}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'
    ];
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kids-learning-app//bedtime//ZH', 'CALSCALE:GREGORIAN',
      ...ev('dim', sc.dim, sc.cards - sc.dim, '🪔 小灯时间到啦', '关大灯、电视和平板，只留小灯，玩安静的'),
      ...ev('cards', sc.cards, sc.out - sc.cards, '🃏 翻卡片时间', '打开宝贝学习乐园·睡前小月亮，做完一件勾一张'),
      'END:VCALENDAR'].join('\r\n');
  },
  downloadCalendar() {
    const blob = new Blob([this.calendarText()], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bedtime-reminder.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    this.toast('打开下载的文件，选「添加到日历」');
  }
};

function showBedtime() { Bedtime.open(); }
