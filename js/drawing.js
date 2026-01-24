// ========== 画画创作模块 ==========
// 支持 Apple Pencil 压感的儿童绘画工具

const DrawingApp = {
  // 画布相关
  canvas: null,
  ctx: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0,

  // 绘画设置
  settings: {
    tool: 'pencil',      // pencil, marker, crayon, eraser
    color: '#FF69B4',    // 当前颜色
    size: 8,             // 画笔大小
    opacity: 1           // 透明度
  },

  // 画笔预设
  brushes: {
    pencil: { sizeMult: 1, opacity: 0.9, pressureSensitive: true },
    marker: { sizeMult: 2, opacity: 0.7, pressureSensitive: true },
    crayon: { sizeMult: 2.5, opacity: 0.6, pressureSensitive: false },
    eraser: { sizeMult: 3, opacity: 1, pressureSensitive: true }
  },

  // 颜色调色板（彩虹色 + 常用色）
  colors: [
    '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
    '#9B59B6', '#FF69B4', '#00D2D3', '#FFFFFF', '#2C3E50'
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
    this.canvas.addEventListener('pointerdown', (e) => this.startDrawing(e));
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

    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);

    if (this.settings.tool === 'eraser') {
      this.ctx.fillStyle = '#FFFFFF';
    } else {
      this.ctx.fillStyle = this.settings.color;
      this.ctx.globalAlpha = brush.opacity;
    }

    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  },

  // 绘制线条
  drawLine(x1, y1, x2, y2, pressure) {
    const brush = this.brushes[this.settings.tool];
    const size = this.calculateSize(pressure, brush);

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineWidth = size;

    if (this.settings.tool === 'eraser') {
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.globalAlpha = 1;
    } else {
      this.ctx.strokeStyle = this.settings.color;
      this.ctx.globalAlpha = brush.opacity;
    }

    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
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
  clear() {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveState();
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
  }
};

// ========== 全局函数 ==========

function openDrawing() {
  const modal = document.getElementById('drawing-modal');
  if (modal) {
    modal.classList.remove('hidden');
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
