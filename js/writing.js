// ========== 书写练习模块 ==========

const WritingApp = {
  // 当前模式: 'chinese', 'free'
  currentMode: 'chinese',

  // 汉字练习设置
  chinese: {
    // 一年级常用汉字
    characters: [
      // 数字
      { char: '一', pinyin: 'yī', meaning: '1' },
      { char: '二', pinyin: 'èr', meaning: '2' },
      { char: '三', pinyin: 'sān', meaning: '3' },
      { char: '四', pinyin: 'sì', meaning: '4' },
      { char: '五', pinyin: 'wǔ', meaning: '5' },
      { char: '六', pinyin: 'liù', meaning: '6' },
      { char: '七', pinyin: 'qī', meaning: '7' },
      { char: '八', pinyin: 'bā', meaning: '8' },
      { char: '九', pinyin: 'jiǔ', meaning: '9' },
      { char: '十', pinyin: 'shí', meaning: '10' },
      // 基础字
      { char: '人', pinyin: 'rén', meaning: '人' },
      { char: '大', pinyin: 'dà', meaning: '大' },
      { char: '小', pinyin: 'xiǎo', meaning: '小' },
      { char: '上', pinyin: 'shàng', meaning: '上' },
      { char: '下', pinyin: 'xià', meaning: '下' },
      { char: '山', pinyin: 'shān', meaning: '山' },
      { char: '水', pinyin: 'shuǐ', meaning: '水' },
      { char: '火', pinyin: 'huǒ', meaning: '火' },
      { char: '木', pinyin: 'mù', meaning: '木' },
      { char: '土', pinyin: 'tǔ', meaning: '土' },
      // 自然
      { char: '日', pinyin: 'rì', meaning: '太阳' },
      { char: '月', pinyin: 'yuè', meaning: '月亮' },
      { char: '天', pinyin: 'tiān', meaning: '天空' },
      { char: '云', pinyin: 'yún', meaning: '云' },
      { char: '雨', pinyin: 'yǔ', meaning: '雨' },
      // 人物
      { char: '爸', pinyin: 'bà', meaning: '爸爸' },
      { char: '妈', pinyin: 'mā', meaning: '妈妈' },
      { char: '我', pinyin: 'wǒ', meaning: '我' },
      { char: '你', pinyin: 'nǐ', meaning: '你' },
      { char: '他', pinyin: 'tā', meaning: '他' },
      // 动物
      { char: '马', pinyin: 'mǎ', meaning: '马' },
      { char: '牛', pinyin: 'niú', meaning: '牛' },
      { char: '羊', pinyin: 'yáng', meaning: '羊' },
      { char: '鸟', pinyin: 'niǎo', meaning: '鸟' },
      { char: '鱼', pinyin: 'yú', meaning: '鱼' },
      // 动作
      { char: '走', pinyin: 'zǒu', meaning: '走' },
      { char: '跑', pinyin: 'pǎo', meaning: '跑' },
      { char: '看', pinyin: 'kàn', meaning: '看' },
      { char: '吃', pinyin: 'chī', meaning: '吃' },
      { char: '喝', pinyin: 'hē', meaning: '喝' }
    ],
    currentIndex: 0,
    writer: null,
    isQuizzing: false,
    totalMistakes: 0,
    strokesCompleted: 0,
    totalStrokes: 0
  },

  // 自由练习设置
  free: {
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    color: '#333333',
    lineWidth: 4,
    background: 'blank', // blank, grid, lines
    history: [],
    historyIndex: -1
  },

  // 学习进度
  progress: {},

  // 初始化
  init() {
    this.loadProgress();
    console.log('WritingApp initialized');
  },

  // 加载进度
  loadProgress() {
    const saved = localStorage.getItem('writingProgress');
    if (saved) {
      this.progress = JSON.parse(saved);
    }
  },

  // 保存进度
  saveProgress() {
    localStorage.setItem('writingProgress', JSON.stringify(this.progress));
  },

  // ========== 汉字练习 ==========

  // 初始化汉字练习
  initChinesePractice() {
    this.currentMode = 'chinese';
    this.renderCharacterList();
    this.loadCharacter(this.chinese.currentIndex);
  },

  // 渲染汉字列表
  renderCharacterList() {
    const container = document.getElementById('character-list');
    if (!container) return;

    container.innerHTML = this.chinese.characters.map((item, index) => {
      const stars = this.progress[item.char] || 0;
      const starDisplay = stars > 0 ? '⭐'.repeat(Math.min(stars, 5)) : '';
      return `
        <button class="char-btn ${index === this.chinese.currentIndex ? 'active' : ''}"
                data-index="${index}"
                onclick="selectCharacter(${index})">
          <span class="char-text">${item.char}</span>
          <span class="char-stars">${starDisplay}</span>
        </button>
      `;
    }).join('');
  },

  // 选择汉字
  selectCharacter(index) {
    this.chinese.currentIndex = index;
    this.loadCharacter(index);
    this.renderCharacterList();
  },

  // 加载汉字
  loadCharacter(index) {
    const item = this.chinese.characters[index];
    if (!item) return;

    // 更新信息显示
    document.getElementById('current-char').textContent = item.char;
    document.getElementById('char-pinyin').textContent = item.pinyin;
    document.getElementById('char-meaning').textContent = item.meaning;

    // 清除旧的 writer
    const container = document.getElementById('hanzi-writer-container');
    container.innerHTML = '';

    // 重置状态
    this.chinese.isQuizzing = false;
    this.chinese.totalMistakes = 0;
    this.chinese.strokesCompleted = 0;
    this.updateQuizUI();

    // 创建新的 HanziWriter
    if (typeof HanziWriter !== 'undefined') {
      this.chinese.writer = HanziWriter.create(container, item.char, {
        width: 250,
        height: 250,
        padding: 10,
        showOutline: true,
        showCharacter: false,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        strokeColor: '#333',
        outlineColor: '#DDD',
        drawingColor: '#FF69B4',
        drawingWidth: 6,
        showHintAfterMisses: 3,
        highlightOnComplete: true,
        highlightColor: '#6BCB77',
        charDataLoader: (char, onComplete) => {
          // 使用 CDN 加载汉字数据
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
            .then(res => res.json())
            .then(data => onComplete(data))
            .catch(() => {
              console.error('Failed to load character data for:', char);
              this.showToast('暂不支持此汉字');
            });
        }
      });

      // 获取笔画数
      setTimeout(() => {
        if (this.chinese.writer && this.chinese.writer._character) {
          this.chinese.totalStrokes = this.chinese.writer._character.strokes.length;
          this.updateStrokeInfo();
        }
      }, 500);
    } else {
      container.innerHTML = '<p style="color: red;">Hanzi Writer 加载失败</p>';
    }

    // 更新导航按钮
    document.getElementById('prev-char-btn').disabled = index === 0;
    document.getElementById('next-char-btn').disabled = index === this.chinese.characters.length - 1;
  },

  // 播放笔顺动画
  animateCharacter() {
    if (this.chinese.writer) {
      this.chinese.isQuizzing = false;
      this.updateQuizUI();
      this.chinese.writer.animateCharacter({
        onComplete: () => {
          this.showToast('动画播放完成');
        }
      });
    }
  },

  // 开始 Quiz 模式
  startQuiz() {
    if (!this.chinese.writer) return;

    this.chinese.isQuizzing = true;
    this.chinese.totalMistakes = 0;
    this.chinese.strokesCompleted = 0;
    this.updateQuizUI();

    this.chinese.writer.quiz({
      showHintAfterMisses: 3,
      highlightOnComplete: true,
      onCorrectStroke: (data) => {
        this.chinese.strokesCompleted++;
        this.updateStrokeInfo();
        this.playSound('correct');
      },
      onMistake: (data) => {
        this.chinese.totalMistakes++;
        this.updateStrokeInfo();
        this.playSound('wrong');
        // 轻微震动提示
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      },
      onComplete: (summary) => {
        this.chinese.isQuizzing = false;
        const stars = Math.max(1, 5 - summary.totalMistakes);
        this.showCompletionCelebration(stars);

        // 保存进度
        const char = this.chinese.characters[this.chinese.currentIndex].char;
        const prevStars = this.progress[char] || 0;
        if (stars > prevStars) {
          this.progress[char] = stars;
          this.saveProgress();
        }
        this.renderCharacterList();
        this.updateQuizUI();
      }
    });
  },

  // 重置当前汉字
  resetCharacter() {
    if (this.chinese.writer) {
      this.chinese.writer.cancelQuiz();
      this.chinese.isQuizzing = false;
      this.chinese.totalMistakes = 0;
      this.chinese.strokesCompleted = 0;
      this.loadCharacter(this.chinese.currentIndex);
    }
  },

  // 上一个汉字
  prevCharacter() {
    if (this.chinese.currentIndex > 0) {
      this.selectCharacter(this.chinese.currentIndex - 1);
    }
  },

  // 下一个汉字
  nextCharacter() {
    if (this.chinese.currentIndex < this.chinese.characters.length - 1) {
      this.selectCharacter(this.chinese.currentIndex + 1);
    }
  },

  // 更新笔画信息
  updateStrokeInfo() {
    const strokeInfo = document.getElementById('stroke-info');
    if (strokeInfo) {
      strokeInfo.textContent = `笔画: ${this.chinese.strokesCompleted}/${this.chinese.totalStrokes}  错误: ${this.chinese.totalMistakes}次`;
    }
  },

  // 更新 Quiz UI
  updateQuizUI() {
    const startBtn = document.getElementById('start-quiz-btn');
    const animateBtn = document.getElementById('animate-btn');

    if (startBtn) {
      startBtn.textContent = this.chinese.isQuizzing ? '✏️ 练习中...' : '✏️ 开始练习';
      startBtn.disabled = this.chinese.isQuizzing;
    }
    if (animateBtn) {
      animateBtn.disabled = this.chinese.isQuizzing;
    }
  },

  // 显示完成庆祝
  showCompletionCelebration(stars) {
    const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
    this.showToast(`太棒了！获得 ${starsDisplay}`);

    // 触发粒子效果
    if (typeof createParticles === 'function') {
      createParticles('⭐', 10);
    }

    // 播放成功音效
    this.playSound('success');
  },

  // ========== 自由练习 ==========

  // 初始化自由练习
  initFreePractice() {
    this.currentMode = 'free';
    const canvas = document.getElementById('free-writing-canvas');
    if (!canvas) return;

    this.free.canvas = canvas;
    this.free.ctx = canvas.getContext('2d');

    // 设置画布大小
    this.resizeFreeCanvas();

    // 绑定事件
    this.bindFreeCanvasEvents();

    // 设置初始背景
    this.setFreeBackground(this.free.background);

    // 重置历史
    this.free.history = [];
    this.free.historyIndex = -1;
    this.saveToHistory();
  },

  // 调整画布大小
  resizeFreeCanvas() {
    const canvas = this.free.canvas;
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    this.free.ctx.scale(dpr, dpr);
    this.setFreeBackground(this.free.background);
  },

  // 绑定画布事件
  bindFreeCanvasEvents() {
    const canvas = this.free.canvas;

    // Pointer events for Apple Pencil support
    canvas.addEventListener('pointerdown', (e) => this.handleFreePointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.handleFreePointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.handleFreePointerUp(e));
    canvas.addEventListener('pointerleave', (e) => this.handleFreePointerUp(e));

    // 防止滚动
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  },

  // 指针按下
  handleFreePointerDown(e) {
    this.free.isDrawing = true;
    const pos = this.getFreeCanvasPos(e);
    this.free.lastX = pos.x;
    this.free.lastY = pos.y;

    // 开始新笔画
    this.free.ctx.beginPath();
    this.free.ctx.moveTo(pos.x, pos.y);
  },

  // 指针移动
  handleFreePointerMove(e) {
    if (!this.free.isDrawing) return;

    const pos = this.getFreeCanvasPos(e);
    const ctx = this.free.ctx;

    // 根据压感调整线宽
    let pressure = e.pressure || 0.5;
    let lineWidth = this.free.lineWidth * (0.5 + pressure);

    ctx.strokeStyle = this.free.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    this.free.lastX = pos.x;
    this.free.lastY = pos.y;
  },

  // 指针抬起
  handleFreePointerUp(e) {
    if (this.free.isDrawing) {
      this.free.isDrawing = false;
      this.saveToHistory();
    }
  },

  // 获取画布坐标
  getFreeCanvasPos(e) {
    const rect = this.free.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  // 设置背景
  setFreeBackground(type) {
    this.free.background = type;
    const ctx = this.free.ctx;
    const canvas = this.free.canvas;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // 清除画布
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 绘制背景
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;

    if (type === 'grid') {
      // 田字格
      const cellSize = Math.min(width, height) / 4;
      const startX = (width - cellSize * 3) / 2;
      const startY = (height - cellSize * 3) / 2;

      for (let i = 0; i <= 3; i++) {
        for (let j = 0; j <= 3; j++) {
          const x = startX + i * cellSize;
          const y = startY + j * cellSize;

          // 外框
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellSize, cellSize);

          // 十字虚线
          ctx.strokeStyle = '#CCC';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);

          ctx.beginPath();
          ctx.moveTo(x + cellSize / 2, y);
          ctx.lineTo(x + cellSize / 2, y + cellSize);
          ctx.moveTo(x, y + cellSize / 2);
          ctx.lineTo(x + cellSize, y + cellSize / 2);
          ctx.stroke();

          ctx.setLineDash([]);
        }
      }
    } else if (type === 'lines') {
      // 四线三格（英文练习）
      const lineHeight = 40;
      const startY = 60;
      const groups = 4;

      ctx.strokeStyle = '#4D96FF';
      ctx.lineWidth = 1;

      for (let g = 0; g < groups; g++) {
        const baseY = startY + g * (lineHeight * 3 + 30);

        for (let i = 0; i < 4; i++) {
          const y = baseY + i * lineHeight;
          ctx.beginPath();
          ctx.moveTo(20, y);
          ctx.lineTo(width - 20, y);
          ctx.stroke();
        }

        // 中间虚线
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#CCC';
        const midY = baseY + lineHeight * 1.5;
        ctx.beginPath();
        ctx.moveTo(20, midY);
        ctx.lineTo(width - 20, midY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#4D96FF';
      }
    }

    // 更新背景按钮状态
    document.querySelectorAll('.bg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === type);
    });
  },

  // 设置笔色
  setFreeColor(color) {
    this.free.color = color;
    document.querySelectorAll('.free-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
  },

  // 设置笔宽
  setFreeLineWidth(width) {
    this.free.lineWidth = width;
  },

  // 保存到历史
  saveToHistory() {
    const canvas = this.free.canvas;
    const imageData = canvas.toDataURL();

    // 删除当前位置之后的历史
    this.free.history = this.free.history.slice(0, this.free.historyIndex + 1);
    this.free.history.push(imageData);
    this.free.historyIndex = this.free.history.length - 1;

    // 限制历史记录数量
    if (this.free.history.length > 20) {
      this.free.history.shift();
      this.free.historyIndex--;
    }
  },

  // 撤销
  undoFree() {
    if (this.free.historyIndex > 0) {
      this.free.historyIndex--;
      this.restoreFromHistory();
    }
  },

  // 重做
  redoFree() {
    if (this.free.historyIndex < this.free.history.length - 1) {
      this.free.historyIndex++;
      this.restoreFromHistory();
    }
  },

  // 从历史恢复
  restoreFromHistory() {
    const imageData = this.free.history[this.free.historyIndex];
    const img = new Image();
    img.onload = () => {
      const ctx = this.free.ctx;
      const canvas = this.free.canvas;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    img.src = imageData;
  },

  // 清空画布
  clearFree() {
    this.setFreeBackground(this.free.background);
    this.saveToHistory();
  },

  // 保存作品
  saveFreeWork() {
    const canvas = this.free.canvas;
    const link = document.createElement('a');
    link.download = `书写练习_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    this.showToast('作品已保存！');
  },

  // ========== 模式切换 ==========

  switchMode(mode) {
    this.currentMode = mode;

    // 更新标签
    document.querySelectorAll('.writing-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // 切换面板
    document.querySelectorAll('.writing-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `writing-${mode}`);
    });

    // 初始化对应模式
    if (mode === 'chinese') {
      this.initChinesePractice();
    } else if (mode === 'free') {
      setTimeout(() => this.initFreePractice(), 100);
    }
  },

  // ========== 工具函数 ==========

  // 播放音效
  playSound(type) {
    // 使用 Web Audio API 播放简单音效
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'wrong') {
        osc.frequency.value = 220;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        // 播放成功旋律
        const notes = [523, 659, 784];
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.2);
          o.start(ctx.currentTime + i * 0.15);
          o.stop(ctx.currentTime + i * 0.15 + 0.2);
        });
      }
    } catch (e) {
      console.log('Audio not available');
    }
  },

  // 显示提示
  showToast(message) {
    // 复用或创建 toast
    let toast = document.querySelector('.writing-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'writing-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
};

// ========== 全局函数（供 HTML 调用） ==========

// 打开书写练习
function openWriting() {
  const modal = document.getElementById('writing-modal');
  if (modal) {
    modal.classList.remove('hidden');
    WritingApp.init();
    WritingApp.switchMode('chinese');
  }
}

// 关闭书写练习
function closeWriting() {
  const modal = document.getElementById('writing-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 切换模式
function switchWritingMode(mode) {
  WritingApp.switchMode(mode);
}

// 汉字练习
function selectCharacter(index) {
  WritingApp.selectCharacter(index);
}

function animateCharacter() {
  WritingApp.animateCharacter();
}

function startCharacterQuiz() {
  WritingApp.startQuiz();
}

function resetCharacter() {
  WritingApp.resetCharacter();
}

function prevCharacter() {
  WritingApp.prevCharacter();
}

function nextCharacter() {
  WritingApp.nextCharacter();
}

// 自由练习
function setFreeBackground(type) {
  WritingApp.setFreeBackground(type);
}

function setFreeColor(color) {
  WritingApp.setFreeColor(color);
}

function setFreeLineWidth(width) {
  WritingApp.setFreeLineWidth(parseInt(width));
}

function undoFreeWriting() {
  WritingApp.undoFree();
}

function redoFreeWriting() {
  WritingApp.redoFree();
}

function clearFreeWriting() {
  WritingApp.clearFree();
}

function saveFreeWriting() {
  WritingApp.saveFreeWork();
}
