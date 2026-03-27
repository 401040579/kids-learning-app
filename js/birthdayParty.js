// ========== 生日派对全屏庆祝 ==========
// 独角兽🦄和彩虹🌈主题的生日快乐循环播放界面
// 支持 Wake Lock API 防止三星电视休眠

const BirthdayParty = {
  canvas: null,
  ctx: null,
  animationId: null,
  wakeLock: null,
  particles: [],
  unicorns: [],
  rainbows: [],
  stars: [],
  floatingEmojis: [],
  textScale: 1,
  textScaleDir: 1,
  hueRotation: 0,
  time: 0,

  // 获取孩子名字
  getChildName() {
    try {
      const data = JSON.parse(localStorage.getItem('kidsProfileData') || '{}');
      return data.name || '宝贝';
    } catch {
      return '宝贝';
    }
  },

  // 打开生日派对
  show() {
    const modal = document.getElementById('birthday-party-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // 设置名字
    const nameEl = document.getElementById('birthday-name');
    if (nameEl) {
      nameEl.textContent = this.getChildName();
    }

    // 初始化 Canvas
    this.canvas = document.getElementById('birthday-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // 初始化粒子
    this.initParticles();

    // 开始动画循环
    this.animate();

    // 请求全屏
    this.requestFullscreen();

    // 请求 Wake Lock 防止休眠
    this.requestWakeLock();

    // 播放无声音频保持活跃（三星电视兜底方案）
    this.startSilentAudio();

    // 监听窗口大小变化
    this._resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this._resizeHandler);

    // 记录最近使用
    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('birthdayParty');
    }
  },

  // 关闭生日派对
  close() {
    const modal = document.getElementById('birthday-party-modal');
    if (modal) modal.classList.add('hidden');

    // 停止动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 释放 Wake Lock
    this.releaseWakeLock();

    // 停止无声音频
    this.stopSilentAudio();

    // 退出全屏
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // 移除监听
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    // 清理粒子
    this.particles = [];
    this.unicorns = [];
    this.rainbows = [];
    this.stars = [];
    this.floatingEmojis = [];
  },

  // Canvas 尺寸自适应
  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  // 请求全屏
  requestFullscreen() {
    const modal = document.getElementById('birthday-party-modal');
    if (!modal) return;
    const el = modal;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) {
      rfs.call(el).catch(() => {});
    }
  },

  // Wake Lock 防止屏幕休眠（三星电视浏览器支持）
  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock 已激活，屏幕不会休眠');
        // 页面重新可见时重新获取
        this._visibilityHandler = async () => {
          if (document.visibilityState === 'visible' && this.animationId) {
            try {
              this.wakeLock = await navigator.wakeLock.request('screen');
            } catch (e) {
              console.log('重新获取 Wake Lock 失败:', e);
            }
          }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
      }
    } catch (e) {
      console.log('Wake Lock 不可用:', e);
    }
  },

  // 释放 Wake Lock
  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  },

  // 无声音频保持活跃（兜底方案，防止部分电视休眠）
  startSilentAudio() {
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      gain.gain.value = 0.001; // 几乎静音
      oscillator.connect(gain);
      gain.connect(this._audioCtx.destination);
      oscillator.start();
      this._silentOsc = oscillator;
      this._silentGain = gain;
    } catch (e) {
      console.log('静音音频不可用:', e);
    }
  },

  stopSilentAudio() {
    if (this._silentOsc) {
      try { this._silentOsc.stop(); } catch (e) {}
      this._silentOsc = null;
    }
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (e) {}
      this._audioCtx = null;
    }
  },

  // 初始化所有粒子效果
  initParticles() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 彩色纸屑
    this.particles = [];
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h - h,
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 2,
        speedY: Math.random() * 2 + 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
        color: this.randomPartyColor(),
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    // 飘浮的独角兽
    this.unicorns = [];
    for (let i = 0; i < 5; i++) {
      this.unicorns.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 30 + 40,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01
      });
    }

    // 星星
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.05 + 0.02
      });
    }

    // 飘浮的 emoji
    const emojis = ['🎂', '🎁', '🎈', '🎉', '🎊', '💖', '✨', '🌟', '🦄', '🌈', '🍰', '🧁'];
    this.floatingEmojis = [];
    for (let i = 0; i < 15; i++) {
      this.floatingEmojis.push({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 20 + 20,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: -Math.random() * 0.5 - 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
  },

  // 随机派对颜色
  randomPartyColor() {
    const colors = [
      '#FF69B4', '#FF1493', '#FFD700', '#FF6347',
      '#00CED1', '#9370DB', '#FF8C00', '#32CD32',
      '#FF00FF', '#00BFFF', '#FFB6C1', '#DDA0DD',
      '#F0E68C', '#87CEEB', '#FFA07A', '#98FB98'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // 主动画循环
  animate() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.time += 0.016;

    // 清除画布 - 渐变背景
    this.drawBackground(ctx, w, h);

    // 绘制彩虹
    this.drawRainbows(ctx, w, h);

    // 绘制星星
    this.drawStars(ctx);

    // 绘制纸屑
    this.drawConfetti(ctx, w, h);

    // 绘制独角兽
    this.drawUnicorns(ctx, w, h);

    // 绘制飘浮 emoji
    this.drawFloatingEmojis(ctx, w, h);

    // 绘制主文字（"xxx 生日快乐"）
    this.drawMainText(ctx, w, h);

    // 绘制底部装饰
    this.drawBottomDecoration(ctx, w, h);

    this.animationId = requestAnimationFrame(() => this.animate());
  },

  // 渐变背景（深紫到粉色，缓慢变化）
  drawBackground(ctx, w, h) {
    this.hueRotation = (this.hueRotation + 0.2) % 360;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    const hue1 = (280 + Math.sin(this.time * 0.3) * 30) % 360;
    const hue2 = (330 + Math.cos(this.time * 0.2) * 30) % 360;
    grad.addColorStop(0, `hsl(${hue1}, 60%, 20%)`);
    grad.addColorStop(0.5, `hsl(${(hue1 + hue2) / 2}, 50%, 25%)`);
    grad.addColorStop(1, `hsl(${hue2}, 60%, 20%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  // 彩虹弧线
  drawRainbows(ctx, w, h) {
    const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
    const cx = w / 2;
    const cy = h * 0.65;
    const baseRadius = Math.min(w, h) * 0.55;
    const time = this.time;

    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(time * 0.5) * 0.1;
    for (let i = 0; i < rainbowColors.length; i++) {
      const r = baseRadius - i * (Math.min(w, h) * 0.03);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = rainbowColors[i];
      ctx.lineWidth = Math.min(w, h) * 0.025;
      ctx.stroke();
    }
    ctx.restore();

    // 第二条小彩虹（右上角）
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(time * 0.7) * 0.05;
    const cx2 = w * 0.8;
    const cy2 = h * 0.3;
    const r2 = Math.min(w, h) * 0.25;
    for (let i = 0; i < rainbowColors.length; i++) {
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2 - i * (Math.min(w, h) * 0.015), Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.strokeStyle = rainbowColors[i];
      ctx.lineWidth = Math.min(w, h) * 0.012;
      ctx.stroke();
    }
    ctx.restore();
  },

  // 闪烁的星星
  drawStars(ctx) {
    for (const star of this.stars) {
      star.twinkle += star.twinkleSpeed;
      const alpha = 0.3 + Math.sin(star.twinkle) * 0.7;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      // 画五角星
      this.drawStar(ctx, star.x, star.y, 5, star.size * 2, star.size);
      ctx.fill();
      ctx.restore();
    }
  },

  // 画五角星辅助
  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
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
  drawConfetti(ctx, w, h) {
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;

      // 循环
      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
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
  drawUnicorns(ctx, w, h) {
    for (const u of this.unicorns) {
      u.wobble += u.wobbleSpeed;
      u.x += u.speedX + Math.sin(u.wobble) * 0.5;
      u.y += u.speedY + Math.cos(u.wobble) * 0.3;

      // 边界反弹
      if (u.x < -50 || u.x > w + 50) u.speedX *= -1;
      if (u.y < -50 || u.y > h + 50) u.speedY *= -1;

      ctx.save();
      ctx.font = `${u.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 轻微旋转
      ctx.translate(u.x, u.y);
      ctx.rotate(Math.sin(u.wobble) * 0.15);
      ctx.fillText('🦄', 0, 0);
      ctx.restore();

      // 独角兽尾迹 - 小星星
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 3) * 0.2;
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

  // 飘浮的 emoji
  drawFloatingEmojis(ctx, w, h) {
    for (const e of this.floatingEmojis) {
      e.wobble += e.wobbleSpeed;
      e.x += e.speedX + Math.sin(e.wobble) * 0.3;
      e.y += e.speedY;

      // 从底部重新出现
      if (e.y < -50) {
        e.y = h + 50;
        e.x = Math.random() * w;
      }
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

  // 主文字动画
  drawMainText(ctx, w, h) {
    const name = this.getChildName();
    const text = `${name} 生日快乐`;
    const time = this.time;

    // 文字缩放动画
    this.textScale += this.textScaleDir * 0.003;
    if (this.textScale > 1.08) this.textScaleDir = -1;
    if (this.textScale < 0.92) this.textScaleDir = 1;

    const baseFontSize = Math.min(w * 0.09, h * 0.12, 120);
    const fontSize = baseFontSize * this.textScale;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文字发光效果
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30 + Math.sin(time * 2) * 15;

    // 彩虹渐变文字
    const grad = ctx.createLinearGradient(
      w / 2 - fontSize * text.length * 0.3, h * 0.4,
      w / 2 + fontSize * text.length * 0.3, h * 0.4
    );
    const offset = (time * 0.1) % 1;
    grad.addColorStop((0 + offset) % 1, '#FF69B4');
    grad.addColorStop((0.17 + offset) % 1, '#FFD700');
    grad.addColorStop((0.33 + offset) % 1, '#FF6347');
    grad.addColorStop((0.5 + offset) % 1, '#00CED1');
    grad.addColorStop((0.67 + offset) % 1, '#9370DB');
    grad.addColorStop((0.83 + offset) % 1, '#FF69B4');

    // 描边
    ctx.font = `bold ${fontSize}px "Comic Sans MS", "Microsoft YaHei", cursive`;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = fontSize * 0.06;
    ctx.strokeText(text, w / 2, h * 0.4);

    // 填充
    ctx.fillStyle = grad;
    ctx.fillText(text, w / 2, h * 0.4);
    ctx.restore();

    // 副标题 - 带独角兽和彩虹 emoji
    ctx.save();
    const subSize = baseFontSize * 0.4;
    ctx.font = `${subSize}px "Comic Sans MS", "Microsoft YaHei", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `hsla(${(time * 50) % 360}, 80%, 80%, 0.9)`;
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 15;
    ctx.fillText('🦄 ✨ 🌈 Happy Birthday 🌈 ✨ 🦄', w / 2, h * 0.52);
    ctx.restore();

    // 年龄/祝福语
    ctx.save();
    const wishSize = baseFontSize * 0.3;
    ctx.font = `${wishSize}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 1.5) * 0.3})`;
    ctx.fillText('🎂 愿你的每一天都充满欢笑和惊喜 🎂', w / 2, h * 0.62);
    ctx.restore();
  },

  // 底部装饰 - 蛋糕和气球
  drawBottomDecoration(ctx, w, h) {
    const time = this.time;
    const cakeSize = Math.min(w, h) * 0.06;

    // 底部一排气球
    const balloonColors = ['#FF69B4', '#FFD700', '#00CED1', '#9370DB', '#FF6347', '#32CD32'];
    const numBalloons = 8;
    for (let i = 0; i < numBalloons; i++) {
      const bx = (w / (numBalloons + 1)) * (i + 1);
      const by = h * 0.82 + Math.sin(time * 1.5 + i * 0.8) * 15;
      const color = balloonColors[i % balloonColors.length];

      // 气球线
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx, by + cakeSize * 0.8);
      ctx.lineTo(bx + Math.sin(time + i) * 5, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 气球
      ctx.beginPath();
      ctx.ellipse(bx, by, cakeSize * 0.6, cakeSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();

      // 光泽
      ctx.beginPath();
      ctx.ellipse(bx - cakeSize * 0.15, by - cakeSize * 0.2, cakeSize * 0.15, cakeSize * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
      ctx.restore();
    }

    // 中间大蛋糕 emoji
    ctx.save();
    const cakeEmojiSize = Math.min(w, h) * 0.1;
    ctx.font = `${cakeEmojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎂', w / 2, h * 0.75 + Math.sin(time * 2) * 5);
    ctx.restore();
  }
};

// 全局函数
function showBirthdayParty() {
  BirthdayParty.show();
}

function closeBirthdayParty() {
  BirthdayParty.close();
}
