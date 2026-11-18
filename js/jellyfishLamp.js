// ========== 水母小夜灯（Iris 海胆水母灯的屏幕版） ==========
// 打开后：全屏（支持的设备）+ 屏幕常亮，只留一只会发光的海胆水母。
// 常亮：优先 Screen Wake Lock；iOS 额外播放一段内嵌的静音小视频兜底
// （iOS 主屏 PWA 在部分系统版本上 Wake Lock 不生效）。不写任何存档。

const JellyfishLamp = {
  on: false,
  color: 'warm',
  brightness: 100,      // 10–100，用黑色遮罩调暗，不改系统亮度
  wakeLock: null,
  video: null,
  flickerRaf: 0,
  hideTimer: 0,
  hue: 0,
  _prevTheme: null,

  COLORS: {
    warm:    { core: '#fff6d8', mid: '#ffc56b', edge: '#ff8fb8', key: 'jellyfish.colorWarm', fallback: '暖光', dot: '#ffc56b' },
    pink:    { core: '#fff0f7', mid: '#ff9fd0', edge: '#c77dff', key: 'jellyfish.colorPink', fallback: '粉粉', dot: '#ff9fd0' },
    ocean:   { core: '#effcff', mid: '#7fdcf5', edge: '#7b8cff', key: 'jellyfish.colorOcean', fallback: '海蓝', dot: '#7fdcf5' },
    rainbow: { core: '#ffffff', mid: '#ffc56b', edge: '#ff8fb8', key: 'jellyfish.colorRainbow', fallback: '彩虹', dot: 'conic-gradient(#ff8fb8,#ffc56b,#9be7a0,#7fdcf5,#c77dff,#ff8fb8)' }
  },

  // 内嵌 2 秒 16×16 静音 MP4（ffmpeg 生成），只用于 iOS 防自动锁屏
  NOSLEEP_SRC: 'data:video/mp4;base64,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',

  t(key, fallback) {
    return (typeof I18n !== 'undefined') ? I18n.t(key, fallback) : fallback;
  },

  isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  // options.on：打开即亮灯（须在点击事件里调用，全屏/常亮才被允许）
  // options.onClose：关灯离开后回到来源页面（睡前小月亮）
  open(options = {}) {
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (!modal) return;
    this._onClose = options.onClose || null;
    if (typeof RecentlyUsed !== 'undefined') RecentlyUsed.track('jellyfishLamp');
    if (!modal.dataset.built) this.build(modal);
    modal.classList.remove('hidden');
    document.body.classList.add('jl-open');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { this._prevTheme = meta.content; meta.content = '#0a0d26'; }
    this.setPower(!!options.on);
    if (!options.on) this.showControls(true);
    this._onVisibility = () => { if (document.visibilityState === 'visible' && this.on) this.keepAwake(); };
    document.addEventListener('visibilitychange', this._onVisibility);
  },

  close() {
    this.setPower(false);
    this.exitFullscreen();
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('jl-open');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && this._prevTheme) meta.content = this._prevTheme;
    document.removeEventListener('visibilitychange', this._onVisibility);
    clearTimeout(this.hideTimer);
    const back = this._onClose;
    this._onClose = null;
    if (back) back();
  },

  // ---------- 界面 ----------
  build(modal) {
    modal.dataset.built = '1';
    const swatches = Object.entries(this.COLORS).map(([id, c]) => `
      <button type="button" class="jl-swatch" data-color="${id}" aria-label="${this.t(c.key, c.fallback)}"
        style="--dot:${c.dot}"><span></span><em data-i18n="${c.key}">${this.t(c.key, c.fallback)}</em></button>`).join('');

    modal.innerHTML = `
      <div class="jl-sky" aria-hidden="true">${this.starsHTML()}</div>
      <div class="jl-bubbles" aria-hidden="true">${this.bubblesHTML()}</div>
      <div class="jl-stage">
        <button type="button" class="jl-lamp-btn" aria-label="${this.t('jellyfish.toggle', '开关小夜灯')}">
          ${this.lampSVG()}
        </button>
      </div>
      <div class="jl-dim" aria-hidden="true"></div>
      <div class="jl-ui">
        <div class="jl-top">
          <button type="button" class="jl-close" aria-label="${this.t('btn.close', '关闭')}">✕</button>
          <h2 class="jl-title"><span data-i18n="jellyfish.title">${this.t('jellyfish.title', '水母小夜灯')}</span></h2>
          <span class="jl-top-spacer"></span>
        </div>
        <div class="jl-bottom">
          <p class="jl-hint" aria-live="polite"></p>
          <button type="button" class="jl-power" role="switch" aria-checked="false"
            aria-label="${this.t('jellyfish.toggle', '开关小夜灯')}">
            <span class="jl-power-track"><span class="jl-power-knob">🌙</span></span>
            <span class="jl-power-text"></span>
          </button>
          <div class="jl-options">
            <div class="jl-swatches">${swatches}</div>
            <label class="jl-bright">
              <span aria-hidden="true">🔅</span>
              <input type="range" min="10" max="100" step="5" value="${this.brightness}"
                aria-label="${this.t('jellyfish.brightness', '亮度')}">
              <span aria-hidden="true">🔆</span>
            </label>
          </div>
        </div>
      </div>`;

    modal.querySelector('.jl-close').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    modal.querySelector('.jl-lamp-btn').addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    modal.querySelector('.jl-power').addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    modal.querySelectorAll('.jl-swatch').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setColor(b.dataset.color);
      this.showControls();
    }));
    const range = modal.querySelector('.jl-bright input');
    range.addEventListener('input', () => { this.setBrightness(+range.value); this.showControls(); });
    range.addEventListener('click', (e) => e.stopPropagation());
    // 开灯后点空白处唤出/收起控制条
    modal.addEventListener('click', () => {
      if (!this.on) return;
      if (modal.classList.contains('jl-ui-hidden')) this.showControls();
      else this.hideControls();
    });
    this.setColor(this.color);
    this.setBrightness(this.brightness);
  },

  starsHTML() {
    let html = '';
    for (let i = 0; i < 36; i++) {
      const x = (i * 37.7) % 100, y = (i * 23.3 + (i % 5) * 7) % 62;
      const s = 1 + (i % 3);
      html += `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${(i % 7) * 0.6}s"></i>`;
    }
    return html;
  },

  bubblesHTML() {
    let html = '';
    for (let i = 0; i < 12; i++) {
      const x = 8 + (i * 7.9) % 84, s = 6 + (i % 4) * 4;
      html += `<i style="left:${x}%;width:${s}px;height:${s}px;animation-duration:${9 + (i % 5) * 2}s;animation-delay:${-i * 1.7}s"></i>`;
    }
    return html;
  },

  // 海胆壳表面：5 条步带，每条两行小疣点，越靠近赤道越大
  urchinDots() {
    const cx = 150, cy = 214, rx = 92, ry = 106;
    let out = '';
    [-68, -34, 0, 34, 68].forEach(phi => {
      [-6, 6].forEach(off => {
        const p = (phi + off) * Math.PI / 180;
        for (let th = 14; th <= 92; th += 7) {
          const t = th * Math.PI / 180;
          const x = cx + rx * Math.sin(t) * Math.sin(p);
          const y = cy - ry * Math.cos(t) + 6 * Math.sin(t) * Math.sin(t);
          if (y > 226) continue;
          const r = 1.2 + 2.4 * Math.sin(t) * Math.cos(p);
          out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(0.8, r).toFixed(2)}"/>`;
        }
      });
    });
    return out;
  },

  tentaclesSVG() {
    const cols = ['#b9a8f0', '#f5b3d8', '#9ad7ea', '#ffd59a'];
    let out = '';
    const n = 11;
    for (let i = 0; i < n; i++) {
      const x = 96 + i * (108 / (n - 1));
      const lean = (x - 150) * 0.18;
      const len = 128 + ((i * 37) % 22);
      const w = i % 2 ? 7 : 10;
      const y0 = 230;
      const d = `M ${x} ${y0} C ${x - 14 + lean} ${y0 + len * 0.28}, ${x + 16 + lean} ${y0 + len * 0.52}, ${x + lean * 0.6} ${y0 + len * 0.72}` +
        ` S ${x - 10 + lean * 1.2} ${y0 + len * 0.9}, ${x + 4 + lean * 1.3} ${y0 + len}`;
      out += `<g class="jl-tentacle" style="--i:${i};transform-origin:${x}px ${y0}px">
        <path d="${d}" stroke="${cols[i % 4]}" stroke-width="${w}" />
        <path class="jl-tentacle-glow" d="${d}" stroke-width="${w * 0.35}" /></g>`;
    }
    return out;
  },

  lampSVG() {
    return `
<svg class="jl-svg" viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="jl-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" style="stop-color:var(--jl-mid)" stop-opacity=".55"/>
      <stop offset=".45" style="stop-color:var(--jl-edge)" stop-opacity=".18"/>
      <stop offset="1" style="stop-color:var(--jl-edge)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="jl-shell-off" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a98bb8"/><stop offset="1" stop-color="#5d4a78"/>
    </linearGradient>
    <radialGradient id="jl-shell-on" cx="50%" cy="96%" r="95%" fx="50%" fy="100%">
      <stop offset="0" style="stop-color:var(--jl-core)"/>
      <stop offset=".38" style="stop-color:var(--jl-mid)"/>
      <stop offset=".85" style="stop-color:var(--jl-edge)"/>
      <stop offset="1" stop-color="#7a5aa6"/>
    </radialGradient>
    <linearGradient id="jl-glass" x1="0" x2="1">
      <stop offset="0" stop-color="#8dcbdc" stop-opacity=".35"/>
      <stop offset=".5" stop-color="#d4f8ff" stop-opacity=".75"/>
      <stop offset="1" stop-color="#8dcbdc" stop-opacity=".35"/>
    </linearGradient>
    <clipPath id="jl-shell-clip"><path d="${this.SHELL_PATH}"/></clipPath>
    <filter id="jl-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <ellipse class="jl-halo" cx="150" cy="180" rx="150" ry="150" fill="url(#jl-halo)"/>

  <!-- 透明底座 + 支撑柱 -->
  <g class="jl-base">
    <ellipse class="jl-base-glow" cx="150" cy="396" rx="96" ry="22" style="fill:var(--jl-mid)" filter="url(#jl-soft)"/>
    <path d="M 46 392 V 410 Q 150 444 254 410 V 392" fill="url(#jl-glass)" stroke="#75b9cc" stroke-width="2"/>
    <ellipse cx="150" cy="392" rx="104" ry="24" fill="url(#jl-glass)" stroke="#75b9cc" stroke-width="2"/>
    <rect x="142" y="300" width="16" height="94" rx="5" fill="url(#jl-glass)" stroke="#7db4c8" stroke-width="1.5"/>
    <path d="M 128 304 L 172 304 L 158 292 L 142 292 Z" fill="#e9e4f2" opacity=".9"/>
  </g>

  <!-- 灯座 + 托圈（被触手挡住大半） -->
  <rect x="118" y="228" width="64" height="66" rx="8" fill="#e9e4f2" opacity=".92"/>
  <g class="jl-tentacles" fill="none" stroke-linecap="round">${this.tentaclesSVG()}</g>
  <path d="M 84 226 Q 150 252 216 226 L 210 236 Q 150 260 90 236 Z" fill="#a77fcf" stroke="#8a64b5" stroke-width="2"/>

  <!-- 海胆壳 -->
  <g class="jl-shell">
    <path d="${this.SHELL_PATH}" fill="url(#jl-shell-off)"/>
    <path class="jl-shell-lit" d="${this.SHELL_PATH}" fill="url(#jl-shell-on)"/>
    <g clip-path="url(#jl-shell-clip)">
      <g class="jl-dots">${this.urchinDots()}</g>
      <ellipse class="jl-inner-glow" cx="150" cy="226" rx="70" ry="46" style="fill:var(--jl-core)" filter="url(#jl-soft)"/>
    </g>
    <path d="${this.SHELL_PATH}" fill="none" stroke="#7d5f96" stroke-width="2.5"/>
    <path class="jl-shine" d="M 92 160 Q 104 132 134 120" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
  },

  // 扁球形海胆壳：底部略平（与实物灯 V6 的 70 mm 海胆比例一致）
  SHELL_PATH: 'M 58 214 Q 58 110 150 108 Q 242 110 242 214 Q 240 232 212 236 L 88 236 Q 60 232 58 214 Z',

  // ---------- 状态 ----------
  toggle() { this.setPower(!this.on); },

  setPower(on) {
    this.on = on;
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (!modal) return;
    modal.classList.toggle('jl-on', on);
    const power = modal.querySelector('.jl-power');
    if (power) {
      power.setAttribute('aria-checked', String(on));
      power.querySelector('.jl-power-knob').textContent = on ? '✨' : '🌙';
      power.querySelector('.jl-power-text').textContent = on
        ? this.t('jellyfish.turnOff', '关灯') : this.t('jellyfish.turnOn', '开灯');
    }
    if (on) {
      this.requestFullscreen(modal);
      this.keepAwake();
      this.startFlicker();
      this.showControls();
      if (typeof playSound === 'function') { try { playSound('click'); } catch (e) {} }
    } else {
      this.releaseAwake();
      this.stopFlicker();
      this.showControls(true);
      this.setHint(this.t('jellyfish.hintOff', '点海胆水母或下面的开关，开灯后屏幕会一直亮着'));
    }
  },

  setColor(id) {
    if (!this.COLORS[id]) return;
    this.color = id;
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (!modal) return;
    const c = this.COLORS[id];
    modal.style.setProperty('--jl-core', c.core);
    modal.style.setProperty('--jl-mid', c.mid);
    modal.style.setProperty('--jl-edge', c.edge);
    modal.querySelectorAll('.jl-swatch').forEach(b => b.classList.toggle('active', b.dataset.color === id));
  },

  setBrightness(v) {
    this.brightness = v;
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (modal) modal.style.setProperty('--jl-dim', String((100 - v) / 100 * 0.85));
  },

  // LED 蜡烛式的轻微闪烁；彩虹模式缓慢换色
  startFlicker() {
    cancelAnimationFrame(this.flickerRaf);
    const modal = document.getElementById('jellyfish-lamp-modal');
    let level = 1, target = 1, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (Math.random() < dt * 6) target = 0.82 + Math.random() * 0.18;
      level += (target - level) * Math.min(1, dt * 10);
      modal.style.setProperty('--jl-flicker', level.toFixed(3));
      if (this.color === 'rainbow') {
        this.hue = (this.hue + dt * 18) % 360;
        modal.style.setProperty('--jl-mid', `hsl(${this.hue}, 95%, 72%)`);
        modal.style.setProperty('--jl-edge', `hsl(${(this.hue + 70) % 360}, 85%, 70%)`);
      }
      this.flickerRaf = requestAnimationFrame(step);
    };
    this.flickerRaf = requestAnimationFrame(step);
  },

  stopFlicker() {
    cancelAnimationFrame(this.flickerRaf);
    this.flickerRaf = 0;
    if (this.color === 'rainbow') this.setColor('rainbow');
  },

  showControls(stay) {
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (!modal) return;
    modal.classList.remove('jl-ui-hidden');
    clearTimeout(this.hideTimer);
    if (!stay && this.on) this.hideTimer = setTimeout(() => this.hideControls(), 4000);
  },

  hideControls() {
    const modal = document.getElementById('jellyfish-lamp-modal');
    if (modal && this.on) modal.classList.add('jl-ui-hidden');
  },

  setHint(text) {
    const el = document.querySelector('#jellyfish-lamp-modal .jl-hint');
    if (el) el.textContent = text;
  },

  // ---------- 全屏 ----------
  requestFullscreen(el) {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!rfs) return; // iPhone Safari 不支持元素全屏：本页已铺满屏幕，主屏 App 模式下无地址栏
    try {
      const r = rfs.call(el);
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  },

  exitFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    try {
      const r = exit && exit.call(document);
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  },

  // ---------- 屏幕常亮 ----------
  async keepAwake() {
    let locked = false;
    if ('wakeLock' in navigator) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
        }
        locked = true;
      } catch (e) {}
    }
    let video = false;
    if (this.isIOS() || !locked) video = await this.playNoSleepVideo();
    if (!this.on) { this.releaseAwake(); return; }
    this.setHint(locked || video
      ? this.t('jellyfish.hintAwake', '屏幕会一直亮着。点空白处显示/隐藏按钮')
      : this.t('jellyfish.hintNoAwake', '这台设备不支持自动常亮，请在系统设置里把“自动锁定”改成“永不”'));
  },

  async playNoSleepVideo() {
    if (!this.video) {
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;
      v.loop = true;
      v.src = this.NOSLEEP_SRC;
      v.className = 'jl-nosleep';
      document.getElementById('jellyfish-lamp-modal').appendChild(v);
      this.video = v;
    }
    try { await this.video.play(); return true; } catch (e) { return false; }
  },

  releaseAwake() {
    if (this.wakeLock) {
      const lock = this.wakeLock;
      this.wakeLock = null;
      lock.release().catch(() => {});
    }
    if (this.video) this.video.pause();
  }
};

function showJellyfishLamp() {
  JellyfishLamp.open();
}

function closeJellyfishLamp() {
  JellyfishLamp.close();
}
