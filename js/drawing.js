// ========== 画画创作模块 ==========
// 支持 Apple Pencil 压感的儿童绘画工具
// P0 扩展：魔法画笔 + 涂色模板
// P1 扩展：贴纸印章 + 对称绘画

const DrawingApp = {
  // 画布相关
  canvas: null,
  ctx: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0,

  // 绘画设置
  settings: {
    tool: 'pencil',      // pencil, marker, crayon, eraser, neon, rainbow, sparkle, sticker
    color: '#FF69B4',    // 当前颜色
    size: 8,             // 画笔大小
    opacity: 1,          // 透明度
    darkMode: false,     // 黑底模式（霓虹效果更好看）
    symmetry: 'off',     // 对称模式: off, horizontal, vertical, quad
    selectedSticker: null // 当前选中的贴纸
  },

  // 彩虹画笔状态
  rainbowHue: 0,

  // 贴纸数据
  stickers: {
    animals: ['🐱', '🐶', '🐰', '🐻', '🦊', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🦋', '🐝', '🐞'],
    nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌈', '⭐', '🌙', '☀️', '⛅', '🌊', '🔥', '❄️', '🍎'],
    faces: ['😊', '😍', '🥰', '😎', '🤩', '😋', '🤗', '😇', '🥳', '😺', '💖', '💕', '💗', '✨', '💫', '🎀'],
    objects: ['🎈', '🎁', '🎂', '🍭', '🍦', '🍩', '🧁', '🎪', '🎠', '🚀', '🌟', '👑', '🎵', '🎨', '📚', '✏️']
  },

  // 当前贴纸大小
  stickerSize: 50,

  // 画笔预设
  brushes: {
    pencil: { sizeMult: 1, opacity: 0.9, pressureSensitive: true, magic: false },
    marker: { sizeMult: 2, opacity: 0.7, pressureSensitive: true, magic: false },
    crayon: { sizeMult: 2.5, opacity: 0.6, pressureSensitive: false, magic: false },
    eraser: { sizeMult: 3, opacity: 1, pressureSensitive: true, magic: false },
    fill: { sizeMult: 1, opacity: 1, pressureSensitive: false, magic: false },
    sticker: { sizeMult: 1, opacity: 1, pressureSensitive: false, magic: false },
    // 魔法画笔
    neon: { sizeMult: 1.5, opacity: 1, pressureSensitive: true, magic: true, glow: true },
    rainbow: { sizeMult: 2, opacity: 0.9, pressureSensitive: true, magic: true, rainbow: true },
    sparkle: { sizeMult: 1, opacity: 1, pressureSensitive: true, magic: true, sparkle: true }
  },

  // 颜色调色板（彩虹色 + 常用色）
  colors: [
    '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
    '#9B59B6', '#FF69B4', '#00D2D3', '#FFFFFF', '#2C3E50'
  ],

  // 涂色模板数据
  templates: [
    {
      id: 'star',
      name: '⭐ 星星',
      paths: [
        { type: 'polygon', points: [[150,20], [180,90], [255,90], [195,140], [215,215], [150,175], [85,215], [105,140], [45,90], [120,90]], stroke: '#333', fill: 'none' }
      ]
    },
    {
      id: 'heart',
      name: '❤️ 爱心',
      paths: [
        { type: 'path', d: 'M150,50 C120,20 60,20 60,80 C60,140 150,200 150,200 C150,200 240,140 240,80 C240,20 180,20 150,50 Z', stroke: '#333', fill: 'none' }
      ]
    },
    {
      id: 'fish',
      name: '🐟 小鱼',
      paths: [
        { type: 'ellipse', cx: 150, cy: 120, rx: 80, ry: 50, stroke: '#333', fill: 'none' },
        { type: 'polygon', points: [[230,120], [280,80], [280,160]], stroke: '#333', fill: 'none' },
        { type: 'circle', cx: 100, cy: 110, r: 10, stroke: '#333', fill: '#333' },
        { type: 'path', d: 'M120,140 Q135,155 150,140', stroke: '#333', fill: 'none' }
      ]
    },
    {
      id: 'flower',
      name: '🌸 花朵',
      paths: [
        { type: 'circle', cx: 150, cy: 120, r: 25, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 150, cy: 70, rx: 20, ry: 30, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 195, cy: 95, rx: 20, ry: 30, stroke: '#333', fill: 'none', rotate: 72 },
        { type: 'ellipse', cx: 180, cy: 150, rx: 20, ry: 30, stroke: '#333', fill: 'none', rotate: 144 },
        { type: 'ellipse', cx: 120, cy: 150, rx: 20, ry: 30, stroke: '#333', fill: 'none', rotate: 216 },
        { type: 'ellipse', cx: 105, cy: 95, rx: 20, ry: 30, stroke: '#333', fill: 'none', rotate: 288 },
        { type: 'line', x1: 150, y1: 145, x2: 150, y2: 220, stroke: '#333' }
      ]
    },
    {
      id: 'house',
      name: '🏠 房子',
      paths: [
        { type: 'rect', x: 80, y: 120, width: 140, height: 100, stroke: '#333', fill: 'none' },
        { type: 'polygon', points: [[60,120], [150,50], [240,120]], stroke: '#333', fill: 'none' },
        { type: 'rect', x: 130, y: 160, width: 40, height: 60, stroke: '#333', fill: 'none' },
        { type: 'rect', x: 95, y: 140, width: 30, height: 30, stroke: '#333', fill: 'none' },
        { type: 'rect', x: 175, y: 140, width: 30, height: 30, stroke: '#333', fill: 'none' }
      ]
    },
    {
      id: 'cat',
      name: '🐱 小猫',
      paths: [
        { type: 'circle', cx: 150, cy: 130, r: 50, stroke: '#333', fill: 'none' },
        { type: 'polygon', points: [[110,90], [100,50], [130,80]], stroke: '#333', fill: 'none' },
        { type: 'polygon', points: [[190,90], [200,50], [170,80]], stroke: '#333', fill: 'none' },
        { type: 'circle', cx: 130, cy: 120, r: 8, stroke: '#333', fill: '#333' },
        { type: 'circle', cx: 170, cy: 120, r: 8, stroke: '#333', fill: '#333' },
        { type: 'ellipse', cx: 150, cy: 145, rx: 8, ry: 5, stroke: '#333', fill: '#FFC0CB' },
        { type: 'path', d: 'M142,155 Q150,165 158,155', stroke: '#333', fill: 'none' },
        { type: 'line', x1: 100, y1: 140, x2: 60, y2: 135, stroke: '#333' },
        { type: 'line', x1: 100, y1: 145, x2: 60, y2: 150, stroke: '#333' },
        { type: 'line', x1: 200, y1: 140, x2: 240, y2: 135, stroke: '#333' },
        { type: 'line', x1: 200, y1: 145, x2: 240, y2: 150, stroke: '#333' }
      ]
    },
    {
      id: 'butterfly',
      name: '🦋 蝴蝶',
      paths: [
        { type: 'ellipse', cx: 100, cy: 100, rx: 45, ry: 35, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 200, cy: 100, rx: 45, ry: 35, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 110, cy: 155, rx: 30, ry: 25, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 190, cy: 155, rx: 30, ry: 25, stroke: '#333', fill: 'none' },
        { type: 'ellipse', cx: 150, cy: 130, rx: 8, ry: 50, stroke: '#333', fill: 'none' },
        { type: 'path', d: 'M145,80 Q130,50 120,40', stroke: '#333', fill: 'none' },
        { type: 'path', d: 'M155,80 Q170,50 180,40', stroke: '#333', fill: 'none' }
      ]
    },
    {
      id: 'rainbow',
      name: '🌈 彩虹',
      paths: [
        { type: 'arc', cx: 150, cy: 180, r: 120, startAngle: Math.PI, endAngle: 0, stroke: '#333', fill: 'none' },
        { type: 'arc', cx: 150, cy: 180, r: 100, startAngle: Math.PI, endAngle: 0, stroke: '#333', fill: 'none' },
        { type: 'arc', cx: 150, cy: 180, r: 80, startAngle: Math.PI, endAngle: 0, stroke: '#333', fill: 'none' },
        { type: 'arc', cx: 150, cy: 180, r: 60, startAngle: Math.PI, endAngle: 0, stroke: '#333', fill: 'none' },
        { type: 'arc', cx: 150, cy: 180, r: 40, startAngle: Math.PI, endAngle: 0, stroke: '#333', fill: 'none' }
      ]
    }
  ],

  // 历史记录（用于撤销）
  history: [],
  historyIndex: -1,
  maxHistory: 20,

  // 初始化
  init() {
    this.canvas = document.getElementById('drawing-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.bindEvents();
    this.renderToolbar();
    this.renderTemplatePanel();
    this.renderStickerPanel();
    this.clear();
    this.saveState();
  },

  // 调整画布大小
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    // 设置画布实际像素大小（高清屏支持）
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // 设置 CSS 显示大小
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // 缩放上下文以匹配 DPR
    this.ctx.scale(dpr, dpr);

    // 设置默认样式
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  },

  // 绑定事件
  bindEvents() {
    // 使用 Pointer Events（支持触摸、鼠标、Apple Pencil）
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.settings.tool === 'fill') {
        this.handleFillClick(e);
      } else if (this.settings.tool === 'sticker') {
        this.placeSticker(e);
      } else {
        this.startDrawing(e);
      }
    });
    this.canvas.addEventListener('pointermove', (e) => this.draw(e));
    this.canvas.addEventListener('pointerup', () => this.stopDrawing());
    this.canvas.addEventListener('pointerleave', () => this.stopDrawing());

    // 阻止默认触摸行为（防止滚动）
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // 窗口大小变化时重新调整
    window.addEventListener('resize', () => {
      // 保存当前画布内容
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.resizeCanvas();
      this.ctx.putImageData(imageData, 0, 0);
    });
  },

  // 获取画布坐标
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  // 开始绘画
  startDrawing(e) {
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e);
    this.lastX = coords.x;
    this.lastY = coords.y;

    // 绘制起点（一个点）
    this.drawPoint(coords.x, coords.y, e.pressure || 0.5);
  },

  // 绘制
  draw(e) {
    if (!this.isDrawing) return;

    const coords = this.getCanvasCoords(e);
    const pressure = e.pressure || 0.5; // Apple Pencil 压感，默认 0.5

    this.drawLine(this.lastX, this.lastY, coords.x, coords.y, pressure);

    this.lastX = coords.x;
    this.lastY = coords.y;
  },

  // 停止绘画
  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.saveState();
    }
  },

  // 绘制一个点
  drawPoint(x, y, pressure) {
    const brush = this.brushes[this.settings.tool];
    const size = this.calculateSize(pressure, brush);

    // 获取对称点
    const points = this.getSymmetryPoints(x, y);

    points.forEach(p => {
      // 魔法画笔特效
      if (brush.magic) {
        this.drawMagicPoint(p.x, p.y, size, brush);
        return;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);

      if (this.settings.tool === 'eraser') {
        this.ctx.fillStyle = this.settings.darkMode ? '#1a1a2e' : '#FFFFFF';
      } else {
        this.ctx.fillStyle = this.settings.color;
        this.ctx.globalAlpha = brush.opacity;
      }

      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  },

  // 获取对称点
  getSymmetryPoints(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const points = [{ x, y }];

    if (this.settings.symmetry === 'horizontal' || this.settings.symmetry === 'quad') {
      // 水平对称（左右镜像）
      points.push({ x: centerX * 2 - x, y });
    }

    if (this.settings.symmetry === 'vertical' || this.settings.symmetry === 'quad') {
      // 垂直对称（上下镜像）
      points.push({ x, y: centerY * 2 - y });
    }

    if (this.settings.symmetry === 'quad') {
      // 四向对称（对角镜像）
      points.push({ x: centerX * 2 - x, y: centerY * 2 - y });
    }

    return points;
  },

  // 绘制魔法点
  drawMagicPoint(x, y, size, brush) {
    this.ctx.save();

    if (brush.glow) {
      // 霓虹发光效果
      this.ctx.shadowColor = this.settings.color;
      this.ctx.shadowBlur = 20;
      this.ctx.fillStyle = this.settings.color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      // 内层更亮
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (brush.rainbow) {
      // 彩虹效果
      const color = `hsl(${this.rainbowHue}, 100%, 50%)`;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.rainbowHue = (this.rainbowHue + 5) % 360;
    } else if (brush.sparkle) {
      // 闪光星星效果
      this.drawSparkle(x, y, size);
    }

    this.ctx.restore();
  },

  // 绘制线条
  drawLine(x1, y1, x2, y2, pressure) {
    const brush = this.brushes[this.settings.tool];
    const size = this.calculateSize(pressure, brush);

    // 获取对称线段
    const lines = this.getSymmetryLines(x1, y1, x2, y2);

    lines.forEach(line => {
      // 魔法画笔特效
      if (brush.magic) {
        this.drawMagicLine(line.x1, line.y1, line.x2, line.y2, size, brush);
        return;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(line.x1, line.y1);
      this.ctx.lineTo(line.x2, line.y2);
      this.ctx.lineWidth = size;

      if (this.settings.tool === 'eraser') {
        this.ctx.strokeStyle = this.settings.darkMode ? '#1a1a2e' : '#FFFFFF';
        this.ctx.globalAlpha = 1;
      } else {
        this.ctx.strokeStyle = this.settings.color;
        this.ctx.globalAlpha = brush.opacity;
      }

      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    });
  },

  // 获取对称线段
  getSymmetryLines(x1, y1, x2, y2) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const lines = [{ x1, y1, x2, y2 }];

    if (this.settings.symmetry === 'horizontal' || this.settings.symmetry === 'quad') {
      lines.push({
        x1: centerX * 2 - x1,
        y1: y1,
        x2: centerX * 2 - x2,
        y2: y2
      });
    }

    if (this.settings.symmetry === 'vertical' || this.settings.symmetry === 'quad') {
      lines.push({
        x1: x1,
        y1: centerY * 2 - y1,
        x2: x2,
        y2: centerY * 2 - y2
      });
    }

    if (this.settings.symmetry === 'quad') {
      lines.push({
        x1: centerX * 2 - x1,
        y1: centerY * 2 - y1,
        x2: centerX * 2 - x2,
        y2: centerY * 2 - y2
      });
    }

    return lines;
  },

  // 绘制魔法线条
  drawMagicLine(x1, y1, x2, y2, size, brush) {
    this.ctx.save();

    if (brush.glow) {
      // 霓虹发光效果
      this.ctx.shadowColor = this.settings.color;
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = this.settings.color;
      this.ctx.lineWidth = size;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      // 内层白色更亮
      this.ctx.shadowBlur = 5;
      this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      this.ctx.lineWidth = size / 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    } else if (brush.rainbow) {
      // 彩虹渐变效果
      const color = `hsl(${this.rainbowHue}, 100%, 50%)`;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = size;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      this.rainbowHue = (this.rainbowHue + 3) % 360;
    } else if (brush.sparkle) {
      // 闪光效果 - 沿线条随机添加星星
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        if (Math.random() > 0.3) {
          this.drawSparkle(x, y, size * (0.5 + Math.random()));
        }
      }
    }

    this.ctx.restore();
  },

  // 绘制闪光星星
  drawSparkle(x, y, size) {
    const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FF6B6B', '#9B59B6', '#FFFFFF'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(Math.random() * Math.PI);

    // 发光效果
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = color;

    // 四角星
    this.ctx.beginPath();
    const spikes = 4;
    const outerRadius = size / 2;
    const innerRadius = size / 5;

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  },

  // 计算画笔大小（考虑压感）
  calculateSize(pressure, brush) {
    let size = this.settings.size * brush.sizeMult;

    if (brush.pressureSensitive) {
      // 压感范围 0.1 - 1，映射到 0.3 - 1.5 倍大小
      size *= 0.3 + pressure * 1.2;
    }

    return Math.max(1, size);
  },

  // 设置工具
  setTool(tool) {
    this.settings.tool = tool;
    this.updateToolbarUI();

    // 播放切换音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  // 设置颜色
  setColor(color) {
    this.settings.color = color;
    this.updateToolbarUI();
  },

  // 设置大小
  setSize(size) {
    this.settings.size = size;
    this.updateToolbarUI();
  },

  // 清空画布
  clear(saveHistory = true) {
    this.ctx.fillStyle = this.settings.darkMode ? '#1a1a2e' : '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (saveHistory) {
      this.saveState();
    }
  },

  // 切换黑底模式
  toggleDarkMode() {
    this.settings.darkMode = !this.settings.darkMode;
    // 保存当前画布内容
    const imageData = this.canvas.toDataURL();
    this.clear(false);
    // 恢复内容
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0);
      this.saveState();
    };
    img.src = imageData;
    this.updateToolbarUI();
  },

  // 保存状态（用于撤销）
  saveState() {
    // 删除当前位置之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1);

    // 保存当前状态
    const imageData = this.canvas.toDataURL();
    this.history.push(imageData);

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  },

  // 撤销
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
    }
  },

  // 重做
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
    }
  },

  // 恢复状态
  restoreState(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  },

  // 保存作品
  saveArtwork() {
    const dataUrl = this.canvas.toDataURL('image/png');

    // 创建下载链接
    const link = document.createElement('a');
    link.download = `我的画作_${new Date().toLocaleDateString()}.png`;
    link.href = dataUrl;
    link.click();

    // 保存到作品集
    this.saveToGallery(dataUrl);

    // 📊 追踪作品保存
    if (typeof Analytics !== 'undefined') {
      Analytics.trackWorkSave('drawing', this.settings.tool);
    }

    // 显示成功提示
    alert('画作已保存！');

    // 奖励积分
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.addPoints(10, '完成一幅画作');
    }

    // 通知家长
    if (typeof ParentNotify !== 'undefined') {
      ParentNotify.send('🎨 新画作完成！', '宝贝刚刚完成了一幅画作~', { sound: 'chord' });
    }
  },

  // 保存到作品集
  saveToGallery(dataUrl) {
    let gallery = JSON.parse(localStorage.getItem('artworkGallery') || '[]');
    gallery.unshift({
      id: Date.now(),
      image: dataUrl,
      date: new Date().toISOString()
    });
    // 最多保存 20 幅作品
    gallery = gallery.slice(0, 20);
    localStorage.setItem('artworkGallery', JSON.stringify(gallery));
  },

  // 渲染工具栏
  renderToolbar() {
    this.updateToolbarUI();
  },

  // 渲染模板选择面板
  renderTemplatePanel() {
    const panel = document.getElementById('template-panel');
    if (!panel) return;

    let html = '<div class="template-grid">';
    this.templates.forEach(t => {
      html += `<button class="template-btn" onclick="loadDrawingTemplate('${t.id}')" title="${t.name}">${t.name}</button>`;
    });
    html += '</div>';
    panel.innerHTML = html;
  },

  // 加载涂色模板
  loadTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    // 清空画布
    this.clear(false);

    // 获取画布中心偏移
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = (rect.width - 300) / 2;
    const offsetY = (rect.height - 250) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // 绘制模板路径
    template.paths.forEach(path => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = path.stroke || '#333';
      this.ctx.fillStyle = path.fill || 'none';

      switch (path.type) {
        case 'circle':
          this.ctx.arc(path.cx, path.cy, path.r, 0, Math.PI * 2);
          break;

        case 'ellipse':
          this.ctx.save();
          if (path.rotate) {
            this.ctx.translate(path.cx, path.cy);
            this.ctx.rotate(path.rotate * Math.PI / 180);
            this.ctx.translate(-path.cx, -path.cy);
          }
          this.ctx.ellipse(path.cx, path.cy, path.rx, path.ry, 0, 0, Math.PI * 2);
          this.ctx.restore();
          break;

        case 'rect':
          this.ctx.rect(path.x, path.y, path.width, path.height);
          break;

        case 'line':
          this.ctx.moveTo(path.x1, path.y1);
          this.ctx.lineTo(path.x2, path.y2);
          break;

        case 'polygon':
          path.points.forEach((p, i) => {
            if (i === 0) this.ctx.moveTo(p[0], p[1]);
            else this.ctx.lineTo(p[0], p[1]);
          });
          this.ctx.closePath();
          break;

        case 'path':
          const path2d = new Path2D(path.d);
          if (path.fill && path.fill !== 'none') {
            this.ctx.fill(path2d);
          }
          this.ctx.stroke(path2d);
          break;

        case 'arc':
          this.ctx.arc(path.cx, path.cy, path.r, path.startAngle, path.endAngle);
          break;
      }

      if (path.fill && path.fill !== 'none' && path.type !== 'path') {
        this.ctx.fill();
      }
      if (path.type !== 'path') {
        this.ctx.stroke();
      }
    });

    this.ctx.restore();
    this.saveState();

    // 播放音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  // 油漆桶填充
  floodFill(startX, startY, fillColor) {
    const dpr = window.devicePixelRatio || 1;
    const x = Math.floor(startX * dpr);
    const y = Math.floor(startY * dpr);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // 获取目标像素颜色
    const targetIndex = (y * width + x) * 4;
    const targetR = data[targetIndex];
    const targetG = data[targetIndex + 1];
    const targetB = data[targetIndex + 2];
    const targetA = data[targetIndex + 3];

    // 解析填充颜色
    const fill = this.hexToRgb(fillColor);
    if (!fill) return;

    // 如果目标颜色和填充颜色相同，不需要填充
    if (targetR === fill.r && targetG === fill.g && targetB === fill.b) {
      return;
    }

    // BFS 填充
    const stack = [[x, y]];
    const visited = new Set();

    const colorMatch = (idx) => {
      const tolerance = 32;
      return Math.abs(data[idx] - targetR) <= tolerance &&
             Math.abs(data[idx + 1] - targetG) <= tolerance &&
             Math.abs(data[idx + 2] - targetB) <= tolerance &&
             Math.abs(data[idx + 3] - targetA) <= tolerance;
    };

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

      const idx = (cy * width + cx) * 4;
      if (!colorMatch(idx)) continue;

      visited.add(key);

      // 填充像素
      data[idx] = fill.r;
      data[idx + 1] = fill.g;
      data[idx + 2] = fill.b;
      data[idx + 3] = 255;

      // 添加相邻像素
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.saveState();
  },

  // 十六进制转 RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // 更新工具栏 UI
  updateToolbarUI() {
    // 更新工具按钮
    document.querySelectorAll('.drawing-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === this.settings.tool);
    });

    // 更新颜色按钮
    document.querySelectorAll('.drawing-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === this.settings.color);
    });

    // 更新大小滑块
    const sizeSlider = document.getElementById('brush-size-slider');
    if (sizeSlider) {
      sizeSlider.value = this.settings.size;
    }

    // 更新大小预览
    const sizePreview = document.getElementById('brush-size-preview');
    if (sizePreview) {
      sizePreview.style.width = this.settings.size + 'px';
      sizePreview.style.height = this.settings.size + 'px';
      sizePreview.style.backgroundColor = this.settings.tool === 'eraser' ? '#ccc' : this.settings.color;
    }

    // 更新黑底模式按钮
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) {
      darkModeBtn.classList.toggle('active', this.settings.darkMode);
      darkModeBtn.textContent = this.settings.darkMode ? '🌙' : '☀️';
    }

    // 更新画布容器背景（视觉提示）
    const container = document.querySelector('.drawing-canvas-container');
    if (container) {
      container.classList.toggle('dark-mode', this.settings.darkMode);
    }

    // 更新对称模式按钮（顶部）
    const symmetryBtn = document.getElementById('symmetry-btn');
    if (symmetryBtn) {
      const icons = { off: '⬜', horizontal: '↔️', vertical: '↕️', quad: '✚' };
      symmetryBtn.textContent = icons[this.settings.symmetry];
      symmetryBtn.classList.toggle('active', this.settings.symmetry !== 'off');
    }

    // 更新对称模式按钮（工具栏）
    document.querySelectorAll('.symmetry-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.settings.symmetry);
    });

    // 更新贴纸按钮状态
    const stickerBtn = document.querySelector('.drawing-tool-btn[data-tool="sticker"]');
    if (stickerBtn && this.settings.selectedSticker) {
      stickerBtn.textContent = this.settings.selectedSticker;
    }
  },

  // 处理填充点击
  handleFillClick(e) {
    if (this.settings.tool !== 'fill') return;

    const coords = this.getCanvasCoords(e);
    this.floodFill(coords.x, coords.y, this.settings.color);
  },

  // ========== P1: 贴纸印章 ==========

  // 放置贴纸
  placeSticker(e) {
    if (!this.settings.selectedSticker) return;

    const coords = this.getCanvasCoords(e);
    const points = this.getSymmetryPoints(coords.x, coords.y);

    points.forEach(p => {
      this.drawSticker(p.x, p.y, this.settings.selectedSticker);
    });

    this.saveState();

    // 播放音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  // 绘制贴纸
  drawSticker(x, y, emoji) {
    this.ctx.save();
    this.ctx.font = `${this.stickerSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, x, y);
    this.ctx.restore();
  },

  // 选择贴纸
  selectSticker(emoji) {
    this.settings.selectedSticker = emoji;
    this.settings.tool = 'sticker';
    this.updateToolbarUI();
    this.hideStickerPanel();

    // 播放音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  // 设置贴纸大小
  setStickerSize(size) {
    this.stickerSize = parseInt(size);
  },

  // 渲染贴纸面板
  renderStickerPanel() {
    const panel = document.getElementById('sticker-panel');
    if (!panel) return;

    let html = '';
    const categories = [
      { key: 'animals', name: '🐾 动物' },
      { key: 'nature', name: '🌸 自然' },
      { key: 'faces', name: '😊 表情' },
      { key: 'objects', name: '🎁 物品' }
    ];

    categories.forEach(cat => {
      html += `<div class="sticker-category">
        <div class="sticker-category-name">${cat.name}</div>
        <div class="sticker-grid">`;
      this.stickers[cat.key].forEach(emoji => {
        html += `<button class="sticker-item" onclick="selectSticker('${emoji}')">${emoji}</button>`;
      });
      html += '</div></div>';
    });

    // 贴纸大小控制
    html += `<div class="sticker-size-control">
      <span>大小：</span>
      <input type="range" min="30" max="100" value="${this.stickerSize}"
             onchange="setStickerSize(this.value)" oninput="setStickerSize(this.value)">
    </div>`;

    panel.querySelector('.sticker-content').innerHTML = html;
  },

  // 显示贴纸面板
  showStickerPanel() {
    const panel = document.getElementById('sticker-panel');
    if (panel) {
      panel.classList.remove('hidden');
      this.renderStickerPanel();
    }
  },

  // 隐藏贴纸面板
  hideStickerPanel() {
    const panel = document.getElementById('sticker-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  },

  // ========== P1: 对称绘画 ==========

  // 切换对称模式
  toggleSymmetry() {
    const modes = ['off', 'horizontal', 'vertical', 'quad'];
    const currentIndex = modes.indexOf(this.settings.symmetry);
    this.settings.symmetry = modes[(currentIndex + 1) % modes.length];
    this.updateToolbarUI();
    this.drawSymmetryGuide();

    // 播放音效
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.playSound('click');
    }
  },

  // 设置对称模式
  setSymmetry(mode) {
    this.settings.symmetry = mode;
    this.updateToolbarUI();
    this.drawSymmetryGuide();
  },

  // 绘制对称参考线（临时显示）
  drawSymmetryGuide() {
    if (this.settings.symmetry === 'off') return;

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 保存当前状态
    const imageData = this.canvas.toDataURL();

    this.ctx.save();
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.5)';
    this.ctx.lineWidth = 2;

    if (this.settings.symmetry === 'horizontal' || this.settings.symmetry === 'quad') {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, 0);
      this.ctx.lineTo(centerX, rect.height);
      this.ctx.stroke();
    }

    if (this.settings.symmetry === 'vertical' || this.settings.symmetry === 'quad') {
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);
      this.ctx.lineTo(rect.width, centerY);
      this.ctx.stroke();
    }

    this.ctx.restore();

    // 1秒后恢复
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = imageData;
    }, 1000);
  }
};

// ========== 全局函数 ==========

function openDrawing() {
  const modal = document.getElementById('drawing-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // 📊 追踪模块点击
    if (typeof Analytics !== 'undefined') {
      Analytics.trackModuleClick('drawing', 'creative');
    }
    // 延迟初始化，确保 DOM 已渲染
    setTimeout(() => {
      DrawingApp.init();
    }, 100);
  }
}

function closeDrawing() {
  const modal = document.getElementById('drawing-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function setDrawingTool(tool) {
  DrawingApp.setTool(tool);
}

function setDrawingColor(color) {
  DrawingApp.setColor(color);
}

function setDrawingSize(size) {
  DrawingApp.setSize(parseInt(size));
}

function clearDrawing() {
  if (confirm('确定要清空画布吗？')) {
    DrawingApp.clear();
  }
}

function undoDrawing() {
  DrawingApp.undo();
}

function redoDrawing() {
  DrawingApp.redo();
}

function saveDrawing() {
  DrawingApp.saveArtwork();
}

function loadDrawingTemplate(templateId) {
  DrawingApp.loadTemplate(templateId);
}

function toggleDrawingDarkMode() {
  DrawingApp.toggleDarkMode();
}

function showTemplatePanel() {
  const panel = document.getElementById('template-panel');
  if (panel) {
    panel.classList.toggle('hidden');
  }
  // 隐藏贴纸面板
  const stickerPanel = document.getElementById('sticker-panel');
  if (stickerPanel) {
    stickerPanel.classList.add('hidden');
  }
}

// P1: 贴纸相关
function showStickerPanel() {
  DrawingApp.showStickerPanel();
  // 隐藏模板面板
  const templatePanel = document.getElementById('template-panel');
  if (templatePanel) {
    templatePanel.classList.add('hidden');
  }
}

function hideStickerPanel() {
  DrawingApp.hideStickerPanel();
}

function selectSticker(emoji) {
  DrawingApp.selectSticker(emoji);
}

function setStickerSize(size) {
  DrawingApp.setStickerSize(size);
}

// P1: 对称绘画相关
function toggleSymmetry() {
  DrawingApp.toggleSymmetry();
}

function setSymmetry(mode) {
  DrawingApp.setSymmetry(mode);
}

// 全局暴露
window.DrawingApp = DrawingApp;
window.openDrawing = openDrawing;
window.closeDrawing = closeDrawing;
window.setDrawingTool = setDrawingTool;
window.setDrawingColor = setDrawingColor;
window.setDrawingSize = setDrawingSize;
window.clearDrawing = clearDrawing;
window.undoDrawing = undoDrawing;
window.redoDrawing = redoDrawing;
window.saveDrawing = saveDrawing;
window.loadDrawingTemplate = loadDrawingTemplate;
window.toggleDrawingDarkMode = toggleDrawingDarkMode;
window.showTemplatePanel = showTemplatePanel;
window.showStickerPanel = showStickerPanel;
window.hideStickerPanel = hideStickerPanel;
window.selectSticker = selectSticker;
window.setStickerSize = setStickerSize;
window.toggleSymmetry = toggleSymmetry;
window.setSymmetry = setSymmetry;
