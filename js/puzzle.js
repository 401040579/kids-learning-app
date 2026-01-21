// ========== 拼图游戏模块 ==========

// 游戏状态
let currentPuzzleDifficulty = 'easy';
let currentPuzzleTheme = 'animal';
let currentPuzzleImage = null;
let puzzleGrid = 2;
let puzzlePieces = [];
let puzzleSlots = [];
let puzzleStartTime = null;
let puzzleTimerInterval = null;
let puzzleCompleted = false;

// 触摸拖拽相关
let draggedPiece = null;
let draggedPieceElement = null;
let touchStartX = 0;
let touchStartY = 0;
let originalLeft = 0;
let originalTop = 0;

// 初始化拼图模块
function initPuzzle() {
  renderDifficultySelector();
  renderThemeSelector();
  renderImageSelector();
}

// ========== 选择器渲染 ==========

// 渲染难度选择器
function renderDifficultySelector() {
  const container = document.getElementById('difficulty-selector');
  if (!container) return;

  const difficulties = getPuzzleDifficulties();
  container.innerHTML = difficulties.map(diff => `
    <button class="difficulty-btn ${diff.id === currentPuzzleDifficulty ? 'active' : ''}"
            onclick="selectDifficulty('${diff.id}')">
      <span class="difficulty-icon">${diff.icon}</span>
      <span class="difficulty-name">${diff.name}</span>
      <span class="difficulty-pieces">${diff.pieces}片</span>
    </button>
  `).join('');
}

// 渲染主题选择器
function renderThemeSelector() {
  const container = document.getElementById('puzzle-theme-selector');
  if (!container) return;

  const themes = getPuzzleThemes();
  container.innerHTML = themes.map(theme => `
    <button class="theme-btn ${theme.id === currentPuzzleTheme ? 'active' : ''}"
            onclick="selectPuzzleTheme('${theme.id}')">
      <span class="theme-icon">${theme.icon}</span>
      <span class="theme-name">${theme.name}</span>
    </button>
  `).join('');
}

// 渲染图片选择器
function renderImageSelector() {
  const container = document.getElementById('puzzle-image-selector');
  if (!container) return;

  const theme = getPuzzleTheme(currentPuzzleTheme);
  if (!theme) return;

  // 默认选中第一张图片
  if (!currentPuzzleImage || !theme.images.find(img => img.id === currentPuzzleImage.id)) {
    currentPuzzleImage = theme.images[0];
  }

  container.innerHTML = theme.images.map(image => `
    <button class="image-btn ${image.id === currentPuzzleImage.id ? 'active' : ''}"
            style="background-color: ${image.backgroundColor}"
            onclick="selectPuzzleImage('${image.id}')">
      <span class="image-emoji">${image.emoji}</span>
      <span class="image-name">${image.name}</span>
    </button>
  `).join('');
}

// ========== 选择逻辑 ==========

// 选择难度
function selectDifficulty(difficultyId) {
  currentPuzzleDifficulty = difficultyId;
  const difficulty = getPuzzleDifficulty(difficultyId);
  puzzleGrid = difficulty.grid;

  renderDifficultySelector();
  RewardSystem.playSound('click');
}

// 选择主题
function selectPuzzleTheme(themeId) {
  currentPuzzleTheme = themeId;
  currentPuzzleImage = null; // 重置图片选择

  renderThemeSelector();
  renderImageSelector();
  RewardSystem.playSound('click');
}

// 选择图片并开始游戏
function selectPuzzleImage(imageId) {
  const theme = getPuzzleTheme(currentPuzzleTheme);
  currentPuzzleImage = theme.images.find(img => img.id === imageId);

  renderImageSelector();
  RewardSystem.playSound('click');

  // 短延迟后开始游戏
  setTimeout(() => {
    startPuzzleGame();
  }, 300);
}

// ========== 游戏核心逻辑 ==========

// 开始拼图游戏
function startPuzzleGame() {
  if (!currentPuzzleImage) return;

  // 切换到游戏界面
  document.getElementById('puzzle-select').classList.add('hidden');
  document.getElementById('puzzle-game').classList.remove('hidden');

  // 设置游戏参数
  const difficulty = getPuzzleDifficulty(currentPuzzleDifficulty);
  puzzleGrid = difficulty.grid;
  puzzleCompleted = false;

  // 更新参考图
  document.getElementById('puzzle-reference-image').textContent = currentPuzzleImage.emoji;

  // 生成拼图
  generatePuzzle();

  // 启动计时器
  startPuzzleTimer();
}

// 生成拼图
function generatePuzzle() {
  const totalPieces = puzzleGrid * puzzleGrid;

  // 创建碎片数据
  puzzlePieces = [];
  for (let i = 0; i < totalPieces; i++) {
    puzzlePieces.push({
      id: i,
      correctPosition: i,
      currentPosition: null,
      placed: false
    });
  }

  // Fisher-Yates 洗牌算法打乱碎片
  const shuffledPieces = [...puzzlePieces];
  for (let i = shuffledPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPieces[i], shuffledPieces[j]] = [shuffledPieces[j], shuffledPieces[i]];
  }

  // 创建槽位数据
  puzzleSlots = [];
  for (let i = 0; i < totalPieces; i++) {
    puzzleSlots.push({
      id: i,
      filled: false,
      pieceId: null
    });
  }

  // 渲染拼图板和碎片
  renderPuzzleBoard();
  renderPuzzlePieces(shuffledPieces);
}

// 渲染拼图板
function renderPuzzleBoard() {
  const board = document.getElementById('puzzle-board');
  if (!board) return;

  // 设置grid类
  board.className = `puzzle-board grid-${puzzleGrid}`;

  // 生成槽位
  board.innerHTML = puzzleSlots.map((slot, index) => `
    <div class="puzzle-slot"
         data-slot-id="${index}"
         ondragover="handleDragOver(event)"
         ondrop="handleDrop(event, ${index})"
         ondragleave="handleDragLeave(event)">
    </div>
  `).join('');
}

// 渲染碎片区
function renderPuzzlePieces(pieces) {
  const container = document.getElementById('puzzle-pieces');
  if (!container) return;

  container.innerHTML = pieces.filter(p => !p.placed).map(piece => `
    <div class="puzzle-piece"
         data-piece-id="${piece.id}"
         draggable="true"
         ondragstart="handleDragStart(event, ${piece.id})"
         ondragend="handleDragEnd(event)"
         style="background-color: ${currentPuzzleImage.backgroundColor}">
      ${getPieceContent(piece.id)}
    </div>
  `).join('');

  // 添加触摸事件
  setupTouchEvents();
}

// 获取碎片内容（根据位置显示emoji的一部分视觉效果）
function getPieceContent(pieceId) {
  // 对于简单实现，每个碎片都显示完整emoji
  // 实际可以用CSS clip-path实现真正的分割效果
  return currentPuzzleImage.emoji;
}

// ========== 桌面拖拽（Drag and Drop API）==========

function handleDragStart(event, pieceId) {
  draggedPiece = pieceId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', pieceId);
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedPiece = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.target.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.target.classList.remove('drag-over');
}

function handleDrop(event, slotId) {
  event.preventDefault();
  event.target.classList.remove('drag-over');

  const pieceId = parseInt(event.dataTransfer.getData('text/plain'));
  placePiece(pieceId, slotId);
}

// ========== 触摸拖拽（Touch Events）==========

function setupTouchEvents() {
  const pieces = document.querySelectorAll('.puzzle-piece');

  pieces.forEach(piece => {
    piece.addEventListener('touchstart', handleTouchStart, { passive: false });
    piece.addEventListener('touchmove', handleTouchMove, { passive: false });
    piece.addEventListener('touchend', handleTouchEnd, { passive: false });
  });
}

function handleTouchStart(event) {
  event.preventDefault();

  const touch = event.touches[0];
  const piece = event.target.closest('.puzzle-piece');
  if (!piece) return;

  draggedPieceElement = piece;
  draggedPiece = parseInt(piece.dataset.pieceId);

  const rect = piece.getBoundingClientRect();
  touchStartX = touch.clientX - rect.left;
  touchStartY = touch.clientY - rect.top;

  // 记录原始位置
  originalLeft = rect.left;
  originalTop = rect.top;

  // 设置拖拽样式
  piece.classList.add('dragging');
  piece.style.position = 'fixed';
  piece.style.left = (touch.clientX - touchStartX) + 'px';
  piece.style.top = (touch.clientY - touchStartY) + 'px';
  piece.style.zIndex = '1000';
}

function handleTouchMove(event) {
  event.preventDefault();

  if (!draggedPieceElement) return;

  const touch = event.touches[0];
  draggedPieceElement.style.left = (touch.clientX - touchStartX) + 'px';
  draggedPieceElement.style.top = (touch.clientY - touchStartY) + 'px';

  // 高亮目标槽位
  highlightSlotUnderTouch(touch.clientX, touch.clientY);
}

function handleTouchEnd(event) {
  if (!draggedPieceElement) return;

  const touch = event.changedTouches[0];
  const slotUnderTouch = getSlotUnderTouch(touch.clientX, touch.clientY);

  // 移除高亮
  document.querySelectorAll('.puzzle-slot').forEach(slot => {
    slot.classList.remove('drag-over');
  });

  if (slotUnderTouch !== null) {
    placePiece(draggedPiece, slotUnderTouch);
  } else {
    // 重新渲染碎片区
    const unplacedPieces = puzzlePieces.filter(p => !p.placed);
    renderPuzzlePieces(unplacedPieces);
  }

  // 重置状态
  draggedPieceElement.classList.remove('dragging');
  draggedPieceElement.style.position = '';
  draggedPieceElement.style.left = '';
  draggedPieceElement.style.top = '';
  draggedPieceElement.style.zIndex = '';
  draggedPieceElement = null;
  draggedPiece = null;
}

function highlightSlotUnderTouch(x, y) {
  document.querySelectorAll('.puzzle-slot').forEach(slot => {
    const rect = slot.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      slot.classList.add('drag-over');
    } else {
      slot.classList.remove('drag-over');
    }
  });
}

function getSlotUnderTouch(x, y) {
  const slots = document.querySelectorAll('.puzzle-slot');
  for (let i = 0; i < slots.length; i++) {
    const rect = slots[i].getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return parseInt(slots[i].dataset.slotId);
    }
  }
  return null;
}

// ========== 放置碎片逻辑 ==========

function placePiece(pieceId, slotId) {
  const piece = puzzlePieces.find(p => p.id === pieceId);
  const slot = puzzleSlots[slotId];

  if (!piece || !slot) return;

  // 检查槽位是否已被占用
  if (slot.filled) {
    RewardSystem.playSound('wrong');
    return;
  }

  // 检查是否放对位置
  const isCorrect = piece.correctPosition === slotId;

  if (isCorrect) {
    // 正确放置
    piece.placed = true;
    piece.currentPosition = slotId;
    slot.filled = true;
    slot.pieceId = pieceId;

    // 更新UI
    const slotElement = document.querySelector(`.puzzle-slot[data-slot-id="${slotId}"]`);
    slotElement.classList.add('filled', 'correct');
    slotElement.innerHTML = `
      <div class="placed-piece" style="background-color: ${currentPuzzleImage.backgroundColor}">
        ${currentPuzzleImage.emoji}
      </div>
    `;

    RewardSystem.playSound('correct');

    // 重新渲染碎片区
    const unplacedPieces = puzzlePieces.filter(p => !p.placed);
    renderPuzzlePieces(unplacedPieces);

    // 检查是否完成
    checkPuzzleComplete();
  } else {
    // 错误放置 - 添加抖动动画
    const pieceElement = document.querySelector(`.puzzle-piece[data-piece-id="${pieceId}"]`);
    if (pieceElement) {
      pieceElement.classList.add('wrong');
      setTimeout(() => {
        pieceElement.classList.remove('wrong');
      }, 500);
    }
    RewardSystem.playSound('wrong');

    // 重新渲染碎片区
    const unplacedPieces = puzzlePieces.filter(p => !p.placed);
    renderPuzzlePieces(unplacedPieces);
  }
}

// ========== 完成检测 ==========

function checkPuzzleComplete() {
  const allPlaced = puzzlePieces.every(p => p.placed);

  if (allPlaced && !puzzleCompleted) {
    puzzleCompleted = true;
    stopPuzzleTimer();

    // 延迟显示完成弹窗
    setTimeout(() => {
      showPuzzleComplete();
    }, 500);
  }
}

function showPuzzleComplete() {
  const difficulty = getPuzzleDifficulty(currentPuzzleDifficulty);
  const timeString = document.getElementById('puzzle-time').textContent;
  const points = difficulty.points;

  // 更新完成弹窗内容
  document.getElementById('puzzle-complete-image').textContent = currentPuzzleImage.emoji;
  document.getElementById('puzzle-complete-time').textContent = timeString;
  document.getElementById('puzzle-complete-points').textContent = '+' + points;

  // 显示弹窗
  document.getElementById('puzzle-complete-modal').classList.remove('hidden');

  // 添加奖励
  RewardSystem.puzzleCorrect(currentPuzzleDifficulty);

  // 播放完成音效和粒子效果
  RewardSystem.playSound('complete');
  RewardSystem.createParticles();
}

function closePuzzleComplete() {
  document.getElementById('puzzle-complete-modal').classList.add('hidden');
}

// ========== 计时器 ==========

function startPuzzleTimer() {
  puzzleStartTime = Date.now();
  updatePuzzleTimer();

  puzzleTimerInterval = setInterval(() => {
    updatePuzzleTimer();
  }, 1000);
}

function updatePuzzleTimer() {
  const elapsed = Math.floor((Date.now() - puzzleStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('puzzle-time').textContent = timeString;
}

function stopPuzzleTimer() {
  if (puzzleTimerInterval) {
    clearInterval(puzzleTimerInterval);
    puzzleTimerInterval = null;
  }
}

// ========== 辅助功能 ==========

// 显示提示（原图）
function showPuzzleHint() {
  document.getElementById('puzzle-hint-image').textContent = currentPuzzleImage.emoji;
  document.getElementById('puzzle-hint-name').textContent = currentPuzzleImage.name;
  document.getElementById('puzzle-hint-modal').classList.remove('hidden');
  RewardSystem.playSound('click');
}

// 关闭提示
function closePuzzleHint() {
  document.getElementById('puzzle-hint-modal').classList.add('hidden');
}

// 重新开始当前拼图
function restartPuzzle() {
  closePuzzleComplete();
  stopPuzzleTimer();
  puzzleCompleted = false;

  // 重新生成拼图
  generatePuzzle();
  startPuzzleTimer();

  RewardSystem.playSound('click');
}

// 返回选择界面
function backToPuzzleSelect() {
  closePuzzleComplete();
  stopPuzzleTimer();

  document.getElementById('puzzle-game').classList.add('hidden');
  document.getElementById('puzzle-select').classList.remove('hidden');

  RewardSystem.playSound('click');
}

// 初始化时自动调用（如果页面已经加载）
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他模块先加载
  setTimeout(() => {
    initPuzzle();
  }, 100);
});
