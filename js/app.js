// ========== 主应用 ==========

// 当前页面
let currentPage = 'home';

// Service Worker 更新相关
let newWorker = null;

// 注册 Service Worker 并监听更新
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered');

      // 检查更新
      registration.addEventListener('updatefound', () => {
        newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          // 新 SW 安装完成，等待激活
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 有新版本可用，显示更新提示
            showUpdateNotification();
          }
        });
      });
    })
    .catch(err => console.log('SW registration failed:', err));

  // 监听 SW 发来的消息
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.log('SW updated to:', event.data.version);
    }
  });

  // 当控制器变化时（新 SW 激活），刷新页面
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// 显示更新提示
function showUpdateNotification() {
  const notification = document.getElementById('update-notification');
  if (notification) {
    notification.classList.remove('hidden');
  }
}

// 隐藏更新提示
function hideUpdateNotification() {
  const notification = document.getElementById('update-notification');
  if (notification) {
    notification.classList.add('hidden');
  }
}

// 应用更新
function applyUpdate() {
  if (newWorker) {
    // 告诉新 SW 立即激活
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  }
  hideUpdateNotification();
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 注册 Service Worker 并监听更新
  registerServiceWorker();

  // 初始化国际化系统
  if (typeof I18n !== 'undefined') {
    I18n.init();
  }

  // 初始化奖励系统
  RewardSystem.init();

  // 初始化 P0 功能模块
  AchievementSystem.init();
  WrongQuestions.init();
  DailyCheckin.init();

  // 初始化 P1 功能模块
  if (typeof MemoryGame !== 'undefined') {
    MemoryGame.init();
  }
  if (typeof LearningPet !== 'undefined') {
    LearningPet.init();
  }

  // 初始化 P2 功能模块
  if (typeof PictureBook !== 'undefined') {
    PictureBook.init();
  }
  if (typeof Pronunciation !== 'undefined') {
    Pronunciation.init();
  }
  if (typeof FamilyPK !== 'undefined') {
    FamilyPK.init();
  }
  if (typeof ChoreTracker !== 'undefined') {
    ChoreTracker.init();
  }
  if (typeof EnglishBoost !== 'undefined') {
    EnglishBoost.init();
  }
  if (typeof BirthdayParty !== 'undefined') {
    BirthdayParty.init();
  }
  // 初始化各模块
  initVideos();
  initMath();
  initEnglish();
  initChinese();
  initScience();

  // 更新首页签到预览
  if (typeof renderCheckinPreview === 'function') {
    renderCheckinPreview();
  }

  // 初始化最近使用
  RecentlyUsed.init();
});

// ========== 最近使用 ==========
const RecentlyUsed = {
  MAX_ITEMS: 6,
  STORAGE_KEY: 'recentlyUsed',

  // 功能映射表
  features: {
    // 页面类
    'math': { icon: '🔢', nameKey: 'menu.math', action: () => navigateTo('math') },
    'english': { icon: '🔤', nameKey: 'menu.english', action: () => navigateTo('english') },
    'chinese': { icon: '📝', nameKey: 'menu.chinese', action: () => navigateTo('chinese') },
    'science': { icon: '🔬', nameKey: 'menu.science', action: () => navigateTo('science') },
    'explore': { icon: '🎬', nameKey: 'menu.explore', action: () => navigateTo('explore') },
    'puzzle': { icon: '🧩', nameKey: 'menu.puzzle', action: () => navigateTo('puzzle') },
    'timer': { icon: '⏰', nameKey: 'menu.timer', action: () => navigateTo('timer') },
    'calendar': { icon: '📅', nameKey: 'menu.calendar', action: () => navigateTo('calendar') },
    'sleep-music': { icon: '🎵', nameKey: 'menu.sleepMusic', action: () => navigateTo('sleep-music') },
    'profile': { icon: '👤', nameKey: 'menu.profile', action: () => navigateTo('profile') },
    // 弹窗类
    'checkin': { icon: '📅', nameKey: 'menu.checkin', action: () => showCheckin() },
    'achievements': { icon: '🏆', nameKey: 'menu.achievements', action: () => showAchievements() },
    'wrongQuestions': { icon: '📕', nameKey: 'menu.wrongQuestions', action: () => showWrongQuestions() },
    'report': { icon: '📊', nameKey: 'menu.report', action: () => showLearningReport() },
    'memory': { icon: '🧠', nameKey: 'menu.memory', action: () => showMemoryGame() },
    'pet': { icon: '🐱', nameKey: 'menu.pet', action: () => showLearningPet() },
    'drawing': { icon: '🎨', nameKey: 'menu.drawing', action: () => openDrawing() },
    'music': { icon: '🎵', nameKey: 'menu.music', action: () => openMusic() },
    'pictureBook': { icon: '📚', nameKey: 'menu.pictureBook', action: () => showPictureBook() },
    'pronunciation': { icon: '🎤', nameKey: 'menu.pronunciation', action: () => showPronunciation() },
    'writing': { icon: '✍️', nameKey: 'menu.writing', action: () => openWriting() },
    'lifeSkills': { icon: '🏠', nameKey: 'menu.lifeSkills', action: () => openLifeSkills() },
    'songPractice': { icon: '🎤', nameKey: 'menu.songPractice', action: () => openSongPractice() },
    'parentMessage': { icon: '💬', nameKey: 'menu.parentMessage', action: () => openMessageToParent() },
    'parentSettings': { icon: '👨‍👩‍👧', nameKey: 'menu.parentSettings', action: () => openParentSettings() },
    'familyPK': { icon: '👨‍👩‍👧', nameKey: 'menu.familyPK', action: () => showFamilyPK() },
    'logicGames': { icon: '🧩', nameKey: 'menu.logicGames', action: () => showLogicGames() },
    'reactionGames': { icon: '⚡', nameKey: 'menu.reactionGames', action: () => showReactionGames() },
    'drawSmash': { icon: '✏️', nameKey: 'menu.drawSmash', action: () => showDrawSmash() },
    'ragdollRobot': { icon: '🤖', nameKey: 'menu.ragdollRobot', action: () => showRagdollRobot() },
    'choreTracker': { icon: '📋', nameKey: 'menu.choreTracker', action: () => showChoreTracker() },
    'englishBoost': { icon: '🌟', nameKey: 'menu.englishBoost', action: () => showEnglishBoost() },
    'birthdayParty': { icon: '🦄', nameKey: 'menu.birthdayParty', action: () => showBirthdayParty() }
  },

  init() {
    this.render();
  },

  // 记录使用
  track(featureId) {
    if (!this.features[featureId]) return;

    let recent = this.getList();

    // 移除已存在的
    recent = recent.filter(id => id !== featureId);

    // 添加到开头
    recent.unshift(featureId);

    // 限制数量
    if (recent.length > this.MAX_ITEMS) {
      recent = recent.slice(0, this.MAX_ITEMS);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));

    // 更新显示
    this.render();
  },

  // 获取列表
  getList() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  },

  // 渲染
  render() {
    const section = document.getElementById('recent-used-section');
    const list = document.getElementById('recent-used-list');
    if (!section || !list) return;

    const recent = this.getList();

    if (recent.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    list.innerHTML = recent.map(id => {
      const feature = this.features[id];
      if (!feature) return '';

      const name = typeof I18n !== 'undefined' ? I18n.t(feature.nameKey, feature.nameKey) : feature.nameKey;

      return `
        <div class="recent-item" onclick="RecentlyUsed.open('${id}')">
          <span class="recent-icon">${feature.icon}</span>
          <span class="recent-name">${name}</span>
        </div>
      `;
    }).join('');
  },

  // 打开功能
  open(featureId) {
    const feature = this.features[featureId];
    if (feature && feature.action) {
      feature.action();
    }
  }
};

// ========== 页面导航 ==========
function navigateTo(page) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 显示目标页面
  document.getElementById('page-' + page).classList.add('active');

  // 更新底部导航
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.nav-item')[getNavIndex(page)].classList.add('active');

  currentPage = page;

  // 📊 追踪模块点击
  if (typeof Analytics !== 'undefined' && page !== 'home') {
    const category = getModuleCategory(page);
    Analytics.trackModuleClick(page, category);
  }

  // 🕐 记录最近使用（排除首页和个人信息页）
  if (page !== 'home' && page !== 'profile' && typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track(page);
  }

  // 进入页面时初始化内容
  if (page === 'math') generateMathQuestion();
  if (page === 'english') generateEnglishQuestion();
  if (page === 'chinese') generateChineseQuestion();
  if (page === 'calendar') initCalendar();
  if (page === 'science') showScienceThemes();
  if (page === 'sleep-music') initSleepMusic();
  if (page === 'puzzle') initPuzzle();
}

// 获取模块分类
function getModuleCategory(page) {
  if (['math', 'english', 'chinese', 'science'].includes(page)) return 'learning';
  if (['explore', 'puzzle'].includes(page)) return 'game';
  if (['timer', 'calendar', 'sleep-music'].includes(page)) return 'tools';
  return 'other';
}

function getNavIndex(page) {
  // 新的底部导航: 首页、学习、游戏、工具、我的
  if (page === 'home') return 0;
  if (['math', 'english', 'chinese', 'science'].includes(page)) return 1; // 学习
  if (['explore', 'puzzle'].includes(page)) return 2; // 游戏
  if (['timer', 'calendar', 'sleep-music'].includes(page)) return 3; // 工具
  if (page === 'profile') return 4; // 我的
  return 0; // 默认首页
}

// ========== 首页分类筛选 ==========
let currentHomeCategory = 'all';

function filterHomeCards(category) {
  currentHomeCategory = category;

  // 更新Tab选中状态
  document.querySelectorAll('.home-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.category === category) {
      tab.classList.add('active');
    }
  });

  // 筛选卡片
  const cards = document.querySelectorAll('#home-menu-grid .menu-card');
  cards.forEach(card => {
    const cardCategory = card.dataset.category;
    if (category === 'all' || cardCategory === category) {
      card.style.display = '';
      card.style.animation = 'fadeInUp 0.3s ease forwards';
    } else {
      card.style.display = 'none';
    }
  });

  // 更新底部导航高亮（如果从底部导航触发）
  updateBottomNavForCategory(category);
}

function updateBottomNavForCategory(category) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item, index) => {
    item.classList.remove('active');
  });

  // 根据分类高亮对应的导航项
  if (category === 'all') {
    navItems[0].classList.add('active'); // 首页
  } else if (category === 'learn') {
    navItems[1].classList.add('active'); // 学习
  } else if (category === 'play') {
    navItems[2].classList.add('active'); // 游戏
  } else if (category === 'tools') {
    navItems[3].classList.add('active'); // 工具
  }
}

// ========== 视频模块 ==========
let videoPlayer = null;
let currentVideoFilter = 'all';
let selectedVideo = null;

// 分类颜色映射
const categoryColors = {
  math: '#FF6B6B',
  english: '#4ECDC4',
  science: '#45B7D1',
  emotion: '#96CEB4',
  brain: '#DDA0DD',
  music: '#FFD93D'
};

// 分类描述映射
const categoryDescriptions = {
  all: '精选30个适合6岁儿童的优质视频',
  math: '数学启蒙：加减法、数感、规律认知',
  english: '英语启蒙：自然拼读、词汇、简单对话',
  science: '科普探索：动物、人体、太空、自然现象',
  emotion: '情绪与品格：情绪管理、礼貌、合作、勇气',
  brain: '专注力与脑力：逻辑、观察、记忆、思维训练',
  music: '音乐与运动：儿歌、律动、亲子运动'
};

// 初始化视频列表
function initVideos() {
  renderVideoGrid('all');
}

// 渲染视频网格
function renderVideoGrid(category) {
  const grid = document.getElementById('video-grid');
  if (!grid) return;

  // 检查视频数据是否加载
  if (typeof videoDatabase === 'undefined' || !videoDatabase.videos) {
    grid.innerHTML = `
      <div class="video-error">
        <span class="error-icon">😢</span>
        <p>视频加载失败</p>
        <button class="btn-retry" onclick="location.reload()">重新加载</button>
      </div>
    `;
    return;
  }

  // 筛选视频
  const videos = category === 'all'
    ? videoDatabase.videos
    : videoDatabase.videos.filter(v => v.category === category);

  // 更新描述
  const descEl = document.querySelector('.category-desc');
  if (descEl) {
    descEl.textContent = categoryDescriptions[category] || categoryDescriptions.all;
  }

  // 渲染视频卡片
  grid.innerHTML = videos.map(video => {
    const color = categoryColors[video.category] || '#FF69B4';
    return `
      <div class="video-card" style="--category-color: ${color}" onclick="showVideoDetail('${video.id}')">
        <div class="video-thumb">${video.thumbnail}</div>
        <div class="video-card-title">${video.titleZh}</div>
        <div class="video-card-meta">
          <span>⏱️ ${video.duration}</span>
          <span>👶 ${video.ageMin}-${video.ageMax}岁</span>
        </div>
      </div>
    `;
  }).join('');
}

// 筛选视频
function filterVideos(category) {
  currentVideoFilter = category;

  // 更新标签状态
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });

  // 重新渲染视频
  renderVideoGrid(category);
}

// 显示视频详情
function showVideoDetail(videoId) {
  const video = videoDatabase.videos.find(v => v.id === videoId);
  if (!video) return;

  selectedVideo = video;

  // 填充详情内容
  document.getElementById('detail-icon').textContent = video.thumbnail;
  document.getElementById('detail-title').textContent = video.title;
  document.getElementById('detail-title-zh').textContent = video.titleZh;
  document.getElementById('detail-duration').textContent = '⏱️ ' + video.duration;
  document.getElementById('detail-channel').textContent = '📺 ' + video.channel;
  document.getElementById('detail-age').textContent = '👶 ' + video.ageMin + '-' + video.ageMax + '岁';
  document.getElementById('detail-desc').textContent = video.description;
  document.getElementById('detail-why').textContent = video.whyRecommend;
  document.getElementById('detail-parent-tip').textContent = video.parentTips;

  // 渲染技能标签
  const skillsEl = document.getElementById('detail-skills');
  skillsEl.innerHTML = video.skills.map(skill =>
    `<span class="skill-tag">${skill}</span>`
  ).join('');

  // 显示弹窗
  document.getElementById('video-detail-modal').classList.remove('hidden');
}

// 关闭视频详情
function closeVideoDetail() {
  document.getElementById('video-detail-modal').classList.add('hidden');
  selectedVideo = null;
}

// 从详情页播放视频
function playVideoFromDetail() {
  if (selectedVideo) {
    const titleZh = selectedVideo.titleZh;
    const youtubeId = selectedVideo.youtubeId;
    closeVideoDetail();
    playVideo(titleZh, youtubeId);
  }
}

// 播放视频
function playVideo(name, videoId) {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('video-player');
  const overlay = document.getElementById('video-overlay');

  // 隐藏遮罩
  overlay.classList.add('hidden');

  // 📊 追踪视频播放
  if (typeof Analytics !== 'undefined') {
    Analytics.sendEvent('video_play', {
      video_name: name,
      video_id: videoId
    });
  }

  // 记录视频观看（用于成就系统）
  if (typeof AchievementSystem !== 'undefined') {
    AchievementSystem.recordVideoWatch();
  }

  // 获取当前页面的 origin（用于本地开发兼容）
  const currentOrigin = window.location.origin || 'https://www.youtube.com';

  // 创建 YouTube iframe (使用标准域名，增加兼容性)
  player.innerHTML = `
    <iframe
      id="yt-player"
      src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1&fs=1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
      frameborder="0">
    </iframe>
  `;

  // 显示播放器
  modal.classList.remove('hidden');

  // 监听视频结束（通过 postMessage API）
  window.addEventListener('message', handleVideoMessage);

  // 备用方案：定时检查（如果 API 不可用）
  setTimeout(() => {
    // 30秒后显示返回提示（大部分儿歌较短）
  }, 30000);
}

function handleVideoMessage(event) {
  // YouTube iframe API 消息
  if (event.origin.includes('youtube')) {
    try {
      const data = JSON.parse(event.data);
      if (data.event === 'onStateChange' && data.info === 0) {
        // 视频结束，显示遮罩
        showVideoOverlay();
      }
    } catch (e) {
      // 非 JSON 消息，忽略
    }
  }
}

function showVideoOverlay() {
  document.getElementById('video-overlay').classList.remove('hidden');
}

function closeVideo() {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('video-player');

  // 清空播放器
  player.innerHTML = '';

  // 隐藏弹窗
  modal.classList.add('hidden');

  // 移除消息监听
  window.removeEventListener('message', handleVideoMessage);
}

// ========== 数学游戏 ==========
let mathAnswer = 0;
let currentMathQuestion = null;  // 存储当前题目数据用于错题本

// 数学游戏配置
const MathConfig = {
  // 默认配置
  range: 10,           // 数字范围: 10, 20, 30
  operators: ['+', '-'], // 运算符: +, -, ×, ÷

  // 加载配置
  load() {
    const saved = localStorage.getItem('mathGameConfig');
    if (saved) {
      const config = JSON.parse(saved);
      this.range = config.range || 10;
      this.operators = config.operators || ['+', '-'];
    }
  },

  // 保存配置
  save() {
    localStorage.setItem('mathGameConfig', JSON.stringify({
      range: this.range,
      operators: this.operators
    }));
  }
};

function initMath() {
  MathConfig.load();
  updateMathSettingsUI();
  generateMathQuestion();
}

// 更新数学设置界面
function updateMathSettingsUI() {
  // 更新范围选择
  document.querySelectorAll('.math-range-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.range) === MathConfig.range);
  });

  // 更新运算符选择
  document.querySelectorAll('.math-op-btn').forEach(btn => {
    btn.classList.toggle('active', MathConfig.operators.includes(btn.dataset.op));
  });
}

// 设置数字范围
function setMathRange(range) {
  MathConfig.range = range;
  MathConfig.save();
  updateMathSettingsUI();
  generateMathQuestion();
}

// 切换运算符
function toggleMathOperator(op) {
  const index = MathConfig.operators.indexOf(op);
  if (index === -1) {
    MathConfig.operators.push(op);
  } else if (MathConfig.operators.length > 1) {
    // 至少保留一个运算符
    MathConfig.operators.splice(index, 1);
  }
  MathConfig.save();
  updateMathSettingsUI();
  generateMathQuestion();
}

function generateMathQuestion() {
  const range = MathConfig.range;
  const operators = MathConfig.operators;
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let num1, num2;

  if (operator === '+') {
    // 加法：两数之和不超过范围
    num1 = Math.floor(Math.random() * range) + 1;
    num2 = Math.floor(Math.random() * (range - num1)) + 1;
    mathAnswer = num1 + num2;
  } else if (operator === '-') {
    // 减法：保证结果为正
    num1 = Math.floor(Math.random() * range) + 1;
    num2 = Math.floor(Math.random() * num1) + 1;
    if (num2 > num1) [num1, num2] = [num2, num1];
    mathAnswer = num1 - num2;
  } else if (operator === '×') {
    // 乘法：根据范围调整
    const maxFactor = range <= 10 ? 5 : (range <= 20 ? 9 : 10);
    num1 = Math.floor(Math.random() * maxFactor) + 1;
    num2 = Math.floor(Math.random() * maxFactor) + 1;
    mathAnswer = num1 * num2;
  } else if (operator === '÷') {
    // 除法：保证整除
    const maxFactor = range <= 10 ? 5 : (range <= 20 ? 9 : 10);
    num2 = Math.floor(Math.random() * maxFactor) + 1; // 除数
    const quotient = Math.floor(Math.random() * maxFactor) + 1; // 商
    num1 = num2 * quotient; // 被除数
    mathAnswer = quotient;
  }

  document.getElementById('num1').textContent = num1;
  document.getElementById('operator').textContent = operator;
  document.getElementById('num2').textContent = num2;

  // 存储当前题目数据
  currentMathQuestion = {
    questionId: `math_${num1}_${operator}_${num2}`,
    question: `${num1} ${operator} ${num2} = ?`,
    num1: num1,
    num2: num2,
    operator: operator,
    correctAnswer: mathAnswer.toString()
  };

  // 生成选项
  generateMathOptions(mathAnswer);
}

function generateMathOptions(correctAnswer) {
  const options = [correctAnswer];

  // 生成3个错误答案
  while (options.length < 4) {
    const wrong = correctAnswer + (Math.floor(Math.random() * 7) - 3); // -3 到 +3
    if (wrong >= 0 && !options.includes(wrong)) {
      options.push(wrong);
    }
  }

  // 打乱顺序
  shuffleArray(options);

  // 存储选项到当前题目
  if (currentMathQuestion) {
    currentMathQuestion.options = options.map(o => o.toString());
  }

  // 渲染选项
  const container = document.getElementById('math-options');
  container.innerHTML = options.map(opt => `
    <button class="option-btn" onclick="checkMathAnswer(${opt}, this)">${opt}</button>
  `).join('');
}

function checkMathAnswer(answer, btn) {
  if (answer === mathAnswer) {
    btn.classList.add('correct');
    RewardSystem.mathCorrect();

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('math', true, currentMathQuestion?.operator || '');
    }

    // 检查成就
    AchievementSystem.checkProgress('mathCorrect', RewardSystem.data.mathCorrect);
    AchievementSystem.checkProgress('mathStreak', RewardSystem.data.mathStreak);
    AchievementSystem.checkProgress('totalScore', RewardSystem.data.totalScore);
    AchievementSystem.checkProgress('tasksDone', RewardSystem.data.tasksDone);

    // 通知家长学习进度
    if (typeof ParentNotify !== 'undefined') {
      ParentNotify.trackQuestion('数学');
    }

    // 延迟后生成新题
    setTimeout(() => {
      generateMathQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.mathWrong();
    RewardSystem.playSound('wrong');

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('math', false, currentMathQuestion?.operator || '');
    }

    // 添加到错题本
    if (currentMathQuestion) {
      WrongQuestions.addWrongQuestion('math', {
        ...currentMathQuestion,
        userAnswer: answer.toString()
      });
    }

    // 移除错误样式并允许再次尝试
    setTimeout(() => {
      btn.classList.remove('wrong');
    }, 500);
  }
}

// ========== 英语学习 ==========
const englishWords = [
  { word: 'Apple', image: '🍎', meaning: '苹果' },
  { word: 'Banana', image: '🍌', meaning: '香蕉' },
  { word: 'Cat', image: '🐱', meaning: '猫' },
  { word: 'Dog', image: '🐶', meaning: '狗' },
  { word: 'Elephant', image: '🐘', meaning: '大象' },
  { word: 'Fish', image: '🐟', meaning: '鱼' },
  { word: 'Grapes', image: '🍇', meaning: '葡萄' },
  { word: 'House', image: '🏠', meaning: '房子' },
  { word: 'Ice cream', image: '🍦', meaning: '冰淇淋' },
  { word: 'Juice', image: '🧃', meaning: '果汁' },
  { word: 'Kite', image: '🪁', meaning: '风筝' },
  { word: 'Lion', image: '🦁', meaning: '狮子' },
  { word: 'Moon', image: '🌙', meaning: '月亮' },
  { word: 'Noodles', image: '🍜', meaning: '面条' },
  { word: 'Orange', image: '🍊', meaning: '橙子' },
  { word: 'Panda', image: '🐼', meaning: '熊猫' },
  { word: 'Queen', image: '👸', meaning: '女王' },
  { word: 'Rabbit', image: '🐰', meaning: '兔子' },
  { word: 'Sun', image: '☀️', meaning: '太阳' },
  { word: 'Tiger', image: '🐯', meaning: '老虎' },
  { word: 'Umbrella', image: '☂️', meaning: '雨伞' },
  { word: 'Violin', image: '🎻', meaning: '小提琴' },
  { word: 'Watermelon', image: '🍉', meaning: '西瓜' },
  { word: 'Xylophone', image: '🎹', meaning: '木琴' },
  { word: 'Yogurt', image: '🥛', meaning: '酸奶' },
  { word: 'Zebra', image: '🦓', meaning: '斑马' }
];

let currentEnglishWord = null;

function initEnglish() {
  generateEnglishQuestion();
}

function generateEnglishQuestion() {
  currentEnglishWord = englishWords[Math.floor(Math.random() * englishWords.length)];

  document.getElementById('english-image').textContent = currentEnglishWord.image;
  document.getElementById('english-word').textContent = currentEnglishWord.word;

  // 生成选项
  const options = [currentEnglishWord.meaning];
  while (options.length < 4) {
    const random = englishWords[Math.floor(Math.random() * englishWords.length)].meaning;
    if (!options.includes(random)) {
      options.push(random);
    }
  }

  shuffleArray(options);

  const container = document.getElementById('english-options');
  container.innerHTML = options.map(opt => `
    <button class="option-btn" onclick="checkEnglishAnswer('${opt}', this)">${opt}</button>
  `).join('');
}

function checkEnglishAnswer(answer, btn) {
  if (answer === currentEnglishWord.meaning) {
    btn.classList.add('correct');
    RewardSystem.englishCorrect();

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('english', true, currentEnglishWord?.word || '');
    }

    // 检查成就
    AchievementSystem.checkProgress('englishCorrect', RewardSystem.data.englishCorrect);
    AchievementSystem.checkProgress('totalScore', RewardSystem.data.totalScore);
    AchievementSystem.checkProgress('tasksDone', RewardSystem.data.tasksDone);
    AchievementSystem.checkProgress('allRounder', 1);

    // 通知家长学习进度
    if (typeof ParentNotify !== 'undefined') {
      ParentNotify.trackQuestion('英语');
    }

    setTimeout(() => {
      generateEnglishQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.playSound('wrong');

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('english', false, currentEnglishWord?.word || '');
    }

    // 添加到错题本
    if (currentEnglishWord) {
      const optionsEl = document.getElementById('english-options');
      const options = Array.from(optionsEl.querySelectorAll('.option-btn')).map(b => b.textContent);
      WrongQuestions.addWrongQuestion('english', {
        questionId: `english_${currentEnglishWord.word}`,
        question: `${currentEnglishWord.word} (${currentEnglishWord.image})`,
        options: options,
        correctAnswer: currentEnglishWord.meaning,
        userAnswer: answer,
        extra: { word: currentEnglishWord.word, image: currentEnglishWord.image }
      });
    }

    setTimeout(() => {
      btn.classList.remove('wrong');
    }, 500);
  }
}

function speakWord() {
  if ('speechSynthesis' in window && currentEnglishWord) {
    const utterance = new SpeechSynthesisUtterance(currentEnglishWord.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8; // 稍慢一点，方便孩子听清
    speechSynthesis.speak(utterance);
  }
}

// ========== 中文学习 ==========
const chineseChars = [
  { char: '大', pinyin: 'dà', meanings: ['大', '小', '高', '矮'], correct: '大' },
  { char: '小', pinyin: 'xiǎo', meanings: ['大', '小', '长', '短'], correct: '小' },
  { char: '人', pinyin: 'rén', meanings: ['人', '山', '水', '火'], correct: '人' },
  { char: '山', pinyin: 'shān', meanings: ['山', '水', '石', '土'], correct: '山' },
  { char: '水', pinyin: 'shuǐ', meanings: ['水', '火', '土', '木'], correct: '水' },
  { char: '火', pinyin: 'huǒ', meanings: ['火', '水', '风', '雨'], correct: '火' },
  { char: '日', pinyin: 'rì', meanings: ['太阳', '月亮', '星星', '云'], correct: '太阳' },
  { char: '月', pinyin: 'yuè', meanings: ['月亮', '太阳', '星星', '天'], correct: '月亮' },
  { char: '天', pinyin: 'tiān', meanings: ['天', '地', '人', '云'], correct: '天' },
  { char: '地', pinyin: 'dì', meanings: ['地', '天', '水', '山'], correct: '地' },
  { char: '上', pinyin: 'shàng', meanings: ['上', '下', '左', '右'], correct: '上' },
  { char: '下', pinyin: 'xià', meanings: ['下', '上', '前', '后'], correct: '下' },
  { char: '口', pinyin: 'kǒu', meanings: ['嘴巴', '眼睛', '耳朵', '鼻子'], correct: '嘴巴' },
  { char: '目', pinyin: 'mù', meanings: ['眼睛', '嘴巴', '耳朵', '手'], correct: '眼睛' },
  { char: '手', pinyin: 'shǒu', meanings: ['手', '脚', '头', '肩'], correct: '手' },
  { char: '足', pinyin: 'zú', meanings: ['脚', '手', '头', '腿'], correct: '脚' },
  { char: '花', pinyin: 'huā', meanings: ['花', '草', '树', '叶'], correct: '花' },
  { char: '草', pinyin: 'cǎo', meanings: ['草', '花', '木', '石'], correct: '草' },
  { char: '鸟', pinyin: 'niǎo', meanings: ['鸟', '鱼', '虫', '兽'], correct: '鸟' },
  { char: '鱼', pinyin: 'yú', meanings: ['鱼', '鸟', '虾', '蟹'], correct: '鱼' }
];

let currentChineseChar = null;

function initChinese() {
  generateChineseQuestion();
}

function generateChineseQuestion() {
  currentChineseChar = chineseChars[Math.floor(Math.random() * chineseChars.length)];

  document.getElementById('chinese-char').textContent = currentChineseChar.char;
  document.getElementById('chinese-pinyin').textContent = currentChineseChar.pinyin;

  // 打乱选项
  const options = [...currentChineseChar.meanings];
  shuffleArray(options);

  const container = document.getElementById('chinese-options');
  container.innerHTML = options.map(opt => `
    <button class="option-btn" onclick="checkChineseAnswer('${opt}', this)">${opt}</button>
  `).join('');
}

function checkChineseAnswer(answer, btn) {
  if (answer === currentChineseChar.correct) {
    btn.classList.add('correct');
    RewardSystem.chineseCorrect();

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('chinese', true, currentChineseChar?.char || '');
    }

    // 检查成就
    AchievementSystem.checkProgress('chineseCorrect', RewardSystem.data.chineseCorrect);
    AchievementSystem.checkProgress('totalScore', RewardSystem.data.totalScore);
    AchievementSystem.checkProgress('tasksDone', RewardSystem.data.tasksDone);
    AchievementSystem.checkProgress('allRounder', 1);

    // 通知家长学习进度
    if (typeof ParentNotify !== 'undefined') {
      ParentNotify.trackQuestion('中文');
    }

    setTimeout(() => {
      generateChineseQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.playSound('wrong');

    // 📊 追踪答题
    if (typeof Analytics !== 'undefined') {
      Analytics.trackAnswer('chinese', false, currentChineseChar?.char || '');
    }

    // 添加到错题本
    if (currentChineseChar) {
      WrongQuestions.addWrongQuestion('chinese', {
        questionId: `chinese_${currentChineseChar.char}`,
        question: `${currentChineseChar.char} (${currentChineseChar.pinyin})`,
        options: currentChineseChar.meanings,
        correctAnswer: currentChineseChar.correct,
        userAnswer: answer,
        extra: { char: currentChineseChar.char, pinyin: currentChineseChar.pinyin }
      });
    }

    setTimeout(() => {
      btn.classList.remove('wrong');
    }, 500);
  }
}

// ========== 科学探索模块 ==========
let currentScienceTheme = null;
let currentScienceQuestions = [];
let currentScienceIndex = 0;
let currentScienceQuestion = null;
let scienceCorrectCount = 0;

// 初始化科学模块
function initScience() {
  // 从 localStorage 加载进度
  loadScienceProgress();
}

// 加载科学进度
function loadScienceProgress() {
  const saved = localStorage.getItem('kidsLearningData');
  if (saved) {
    const data = JSON.parse(saved);
    if (!data.scienceProgress) {
      data.scienceProgress = {
        animal: { completed: [], correct: 0, total: 0 },
        plant: { completed: [], correct: 0, total: 0 },
        nature: { completed: [], correct: 0, total: 0 }
      };
      data.scienceCorrect = 0;
      localStorage.setItem('kidsLearningData', JSON.stringify(data));
    }
  }
}

// 获取科学进度
function getScienceProgress() {
  const saved = localStorage.getItem('kidsLearningData');
  if (saved) {
    const data = JSON.parse(saved);
    return data.scienceProgress || {
      animal: { completed: [], correct: 0, total: 0 },
      plant: { completed: [], correct: 0, total: 0 },
      nature: { completed: [], correct: 0, total: 0 }
    };
  }
  return {
    animal: { completed: [], correct: 0, total: 0 },
    plant: { completed: [], correct: 0, total: 0 },
    nature: { completed: [], correct: 0, total: 0 }
  };
}

// 保存科学进度
function saveScienceProgress(theme, questionId, isCorrect) {
  const saved = localStorage.getItem('kidsLearningData');
  let data = saved ? JSON.parse(saved) : {};

  if (!data.scienceProgress) {
    data.scienceProgress = {
      animal: { completed: [], correct: 0, total: 0 },
      plant: { completed: [], correct: 0, total: 0 },
      nature: { completed: [], correct: 0, total: 0 }
    };
    data.scienceCorrect = 0;
  }

  const themeProgress = data.scienceProgress[theme];
  if (!themeProgress.completed.includes(questionId)) {
    themeProgress.completed.push(questionId);
  }
  themeProgress.total++;
  if (isCorrect) {
    themeProgress.correct++;
    data.scienceCorrect = (data.scienceCorrect || 0) + 1;
  }

  localStorage.setItem('kidsLearningData', JSON.stringify(data));
}

// 显示主题选择界面
function showScienceThemes() {
  const themesEl = document.getElementById('science-themes');
  const quizEl = document.getElementById('science-quiz');
  const themeListEl = document.getElementById('theme-list');

  themesEl.classList.remove('hidden');
  quizEl.classList.add('hidden');

  const progress = getScienceProgress();
  const themes = getScienceThemes();

  themeListEl.innerHTML = themes.map(theme => {
    const themeProgress = progress[theme.id] || { completed: [], correct: 0, total: 0 };
    const completedCount = themeProgress.completed.length;
    const progressPercent = (completedCount / theme.totalQuestions) * 100;

    return `
      <div class="theme-card ${theme.id}" onclick="selectScienceTheme('${theme.id}')">
        <div class="theme-icon">${theme.icon}</div>
        <div class="theme-info">
          <div class="theme-name">${theme.name}</div>
          <div class="theme-desc">${theme.description}</div>
          <div class="theme-progress-bar">
            <div class="theme-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="theme-progress-text">${completedCount}/${theme.totalQuestions}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 选择主题开始答题
function selectScienceTheme(themeId) {
  currentScienceTheme = themeId;
  currentScienceQuestions = getScienceQuestions(themeId);
  currentScienceIndex = 0;
  scienceCorrectCount = 0;

  // 打乱题目顺序
  shuffleArray(currentScienceQuestions);

  // 切换到答题界面
  document.getElementById('science-themes').classList.add('hidden');
  document.getElementById('science-quiz').classList.remove('hidden');

  // 更新总题数
  document.getElementById('science-total').textContent = currentScienceQuestions.length;

  // 显示第一题
  showScienceQuestion();

  RewardSystem.playSound('click');
}

// 显示当前题目
function showScienceQuestion() {
  if (currentScienceIndex >= currentScienceQuestions.length) {
    // 答完所有题目，显示完成弹窗
    showScienceComplete();
    return;
  }

  currentScienceQuestion = currentScienceQuestions[currentScienceIndex];

  // 更新进度
  document.getElementById('science-current').textContent = currentScienceIndex + 1;
  const progressPercent = ((currentScienceIndex) / currentScienceQuestions.length) * 100;
  document.getElementById('science-progress-fill').style.width = progressPercent + '%';

  // 更新题目内容
  document.getElementById('science-image').textContent = currentScienceQuestion.image;
  document.getElementById('science-question').textContent = currentScienceQuestion.question;
  document.getElementById('science-hint').textContent = currentScienceQuestion.hint;

  // 生成选项
  const optionsEl = document.getElementById('science-options');
  const options = [...currentScienceQuestion.options];
  shuffleArray(options);

  optionsEl.innerHTML = options.map(opt => `
    <button class="quiz-option-btn" onclick="checkScienceAnswer('${opt.id}', this)">
      <span class="option-emoji">${opt.emoji}</span>
      <span class="option-text">${opt.text}</span>
    </button>
  `).join('');
}

// 检查答案
function checkScienceAnswer(answerId, btn) {
  const isCorrect = answerId === currentScienceQuestion.answer;
  const correctOption = currentScienceQuestion.options.find(opt => opt.id === currentScienceQuestion.answer);
  const userOption = currentScienceQuestion.options.find(opt => opt.id === answerId);

  // 禁用所有按钮
  document.querySelectorAll('.quiz-option-btn').forEach(b => {
    b.disabled = true;
    b.style.pointerEvents = 'none';
  });

  if (isCorrect) {
    btn.classList.add('correct');
    scienceCorrectCount++;
    RewardSystem.playSound('correct');

    // 检查成就
    AchievementSystem.checkProgress('scienceCorrect', RewardSystem.data.scienceCorrect + 1);
  } else {
    btn.classList.add('wrong');
    // 显示正确答案
    document.querySelectorAll('.quiz-option-btn').forEach(b => {
      if (b.querySelector('.option-text').textContent === correctOption.text) {
        b.classList.add('correct');
      }
    });
    RewardSystem.playSound('wrong');

    // 添加到错题本
    if (currentScienceQuestion) {
      WrongQuestions.addWrongQuestion('science', {
        questionId: `science_${currentScienceQuestion.id}`,
        question: currentScienceQuestion.question,
        options: currentScienceQuestion.options.map(o => `${o.emoji} ${o.text}`),
        correctAnswer: `${correctOption.emoji} ${correctOption.text}`,
        userAnswer: userOption ? `${userOption.emoji} ${userOption.text}` : answerId,
        extra: { theme: currentScienceTheme, explanation: currentScienceQuestion.explanation }
      });
    }
  }

  // 保存进度
  saveScienceProgress(currentScienceTheme, currentScienceQuestion.id, isCorrect);

  // 延迟显示反馈弹窗
  setTimeout(() => {
    showScienceFeedback(isCorrect, correctOption);
  }, 800);
}

// 显示答题反馈
function showScienceFeedback(isCorrect, correctOption) {
  const modal = document.getElementById('science-feedback-modal');
  const iconEl = document.getElementById('science-feedback-icon');
  const titleEl = document.getElementById('science-feedback-title');
  const answerEl = document.getElementById('science-feedback-answer');
  const knowledgeTitleEl = document.getElementById('science-knowledge-title');
  const knowledgeTextEl = document.getElementById('science-knowledge-text');
  const pointsEl = document.getElementById('science-feedback-points');
  const btnEl = document.getElementById('btn-continue-science');

  if (isCorrect) {
    iconEl.textContent = '⭐';
    iconEl.className = 'feedback-icon correct';
    titleEl.textContent = '答对啦！';
    titleEl.className = 'feedback-title correct';
    knowledgeTitleEl.textContent = '💡 你知道吗？';
    pointsEl.textContent = '+15 积分 🎉';
    pointsEl.classList.remove('hidden');

    // 添加积分
    RewardSystem.addPoints(15, '科学题答对了!');

    // 检查成就
    AchievementSystem.checkProgress('totalScore', RewardSystem.data.totalScore);
    AchievementSystem.checkProgress('tasksDone', RewardSystem.data.tasksDone);
  } else {
    iconEl.textContent = '😊';
    iconEl.className = 'feedback-icon wrong';
    titleEl.textContent = '没关系！';
    titleEl.className = 'feedback-title wrong';
    knowledgeTitleEl.textContent = '📖 小知识';
    pointsEl.classList.add('hidden');
  }

  answerEl.textContent = `${correctOption.emoji} ${correctOption.text}`;
  knowledgeTextEl.textContent = currentScienceQuestion.explanation;

  // 更新按钮文字
  const isLastQuestion = currentScienceIndex >= currentScienceQuestions.length - 1;
  btnEl.textContent = isLastQuestion ? '查看结果 →' : '继续探索 →';

  modal.classList.remove('hidden');
}

// 继续下一题
function continueScience() {
  document.getElementById('science-feedback-modal').classList.add('hidden');

  currentScienceIndex++;

  if (currentScienceIndex >= currentScienceQuestions.length) {
    showScienceComplete();
  } else {
    showScienceQuestion();
  }
}

// 显示主题完成弹窗
function showScienceComplete() {
  const modal = document.getElementById('science-complete-modal');
  const correctCountEl = document.getElementById('science-correct-count');
  const totalCountEl = document.getElementById('science-total-count');
  const bonusEl = document.getElementById('science-bonus');

  correctCountEl.textContent = scienceCorrectCount;
  totalCountEl.textContent = currentScienceQuestions.length;

  // 检查是否全部答对
  const allCorrect = scienceCorrectCount === currentScienceQuestions.length;

  // 完成主题奖励
  const bonusPoints = allCorrect ? 100 : 50;
  bonusEl.textContent = allCorrect ? '+100 积分奖励！全对太棒了！🎊' : '+50 积分奖励！🎊';

  // 添加奖励积分
  const saved = localStorage.getItem('kidsLearningData');
  let data = saved ? JSON.parse(saved) : {};
  data.totalScore = (data.totalScore || 0) + bonusPoints;
  data.tasksDone = (data.tasksDone || 0) + 1;
  localStorage.setItem('kidsLearningData', JSON.stringify(data));

  // 更新显示
  document.getElementById('total-score').textContent = data.totalScore;

  // 播放完成音效和粒子效果
  RewardSystem.playSound('complete');
  RewardSystem.createParticles();

  modal.classList.remove('hidden');
}

// 返回主题选择（从答题界面）
function backToThemes() {
  showScienceThemes();
}

// 返回主题选择（从完成弹窗）
function backToThemesFromComplete() {
  document.getElementById('science-complete-modal').classList.add('hidden');
  showScienceThemes();
}

// 从科学主题完成弹窗返回首页
function closeScienceComplete() {
  document.getElementById('science-complete-modal').classList.add('hidden');
  navigateTo('home');
}

// ========== 工具函数 ==========
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ========== 倒计时功能 ==========
let timerInterval = null;
let timerSeconds = 300; // 默认5分钟
let timerTotalSeconds = 300;
let timerRunning = false;
let timerPaused = false;

// 设置倒计时分钟数
function setTimerMinutes(minutes) {
  timerSeconds = minutes * 60;
  timerTotalSeconds = timerSeconds;

  // 更新按钮状态
  document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.time-btn').classList.add('active');

  // 更新显示
  updateTimerDisplay();
}

// 更新倒计时显示
function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;

  document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');

  // 更新进度环
  const progress = document.getElementById('timer-progress');
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (timerSeconds / timerTotalSeconds) * circumference;
  progress.style.strokeDasharray = circumference;
  progress.style.strokeDashoffset = offset;

  // 更新表情（根据剩余时间）
  const emoji = document.getElementById('timer-emoji');
  const percent = timerSeconds / timerTotalSeconds;
  if (percent > 0.5) {
    emoji.textContent = '🎮';
  } else if (percent > 0.25) {
    emoji.textContent = '⏳';
  } else if (percent > 0) {
    emoji.textContent = '⚡';
  } else {
    emoji.textContent = '⏰';
  }

  // 改变颜色
  const circle = document.getElementById('timer-circle');
  if (percent <= 0.25) {
    circle.classList.add('warning');
  } else {
    circle.classList.remove('warning');
  }
}

// 开始倒计时
function startTimer() {
  if (timerRunning) return;

  timerRunning = true;
  timerPaused = false;

  // 切换显示
  document.getElementById('timer-setup').classList.add('hidden');
  document.getElementById('timer-controls').classList.remove('hidden');
  document.getElementById('timer-message').innerHTML = '<p>玩得开心！时间到了要乖乖走哦~ 🌟</p>';

  // 开始倒计时
  timerInterval = setInterval(() => {
    if (!timerPaused) {
      timerSeconds--;
      updateTimerDisplay();

      // 最后10秒播放提示音
      if (timerSeconds <= 10 && timerSeconds > 0) {
        RewardSystem.playSound('tick');
      }

      // 时间到
      if (timerSeconds <= 0) {
        finishTimer();
      }
    }
  }, 1000);
}

// 暂停/继续倒计时
function togglePauseTimer() {
  timerPaused = !timerPaused;

  const btn = document.getElementById('btn-pause');
  if (timerPaused) {
    btn.innerHTML = '▶️ 继续';
    document.getElementById('timer-message').innerHTML = '<p>已暂停 ⏸️</p>';
  } else {
    btn.innerHTML = '⏸️ 暂停';
    document.getElementById('timer-message').innerHTML = '<p>玩得开心！时间到了要乖乖走哦~ 🌟</p>';
  }
}

// 停止倒计时
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerRunning = false;
  timerPaused = false;
  timerSeconds = timerTotalSeconds;

  // 切换显示
  document.getElementById('timer-setup').classList.remove('hidden');
  document.getElementById('timer-controls').classList.add('hidden');
  document.getElementById('btn-pause').innerHTML = '⏸️ 暂停';

  updateTimerDisplay();
}

// 倒计时结束
function finishTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  // 显示结束弹窗
  document.getElementById('timer-finish-modal').classList.remove('hidden');

  // 播放提示音和粒子效果
  RewardSystem.playSound('complete');
  RewardSystem.createParticles();

  // 震动（如果支持）
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

// 关闭倒计时结束弹窗
function closeTimerFinish() {
  document.getElementById('timer-finish-modal').classList.add('hidden');
  stopTimer();
}

// ========== 个人信息功能 ==========
let profileData = {
  name: '',
  age: 6,
  birthday: '',
  hobbies: [],
  avatar: ''
};

// 初始化个人信息
function initProfile() {
  // 从 localStorage 加载数据
  const saved = localStorage.getItem('kidsProfileData');
  if (saved) {
    profileData = JSON.parse(saved);
    loadProfileToForm();
  }
}

// 加载数据到表单
function loadProfileToForm() {
  document.getElementById('profile-name').value = profileData.name || '';
  document.getElementById('profile-age').textContent = profileData.age || 6;
  document.getElementById('profile-birthday').value = profileData.birthday || '';

  // 加载头像
  if (profileData.avatar) {
    document.getElementById('profile-avatar').src = profileData.avatar;
    document.getElementById('profile-avatar').style.display = 'block';
    document.getElementById('avatar-placeholder').style.display = 'none';
  } else {
    document.getElementById('profile-avatar').style.display = 'none';
    document.getElementById('avatar-placeholder').style.display = 'flex';
  }

  // 加载兴趣爱好
  document.querySelectorAll('.hobby-tag').forEach(tag => {
    const hobby = tag.dataset.hobby;
    if (profileData.hobbies && profileData.hobbies.includes(hobby)) {
      tag.classList.add('active');
    } else {
      tag.classList.remove('active');
    }
  });
}

// 改变年龄
function changeAge(delta) {
  let age = parseInt(document.getElementById('profile-age').textContent) || 6;
  age = Math.max(1, Math.min(12, age + delta));
  document.getElementById('profile-age').textContent = age;
  RewardSystem.playSound('click');
}

// 切换兴趣爱好
function toggleHobby(btn) {
  btn.classList.toggle('active');
  RewardSystem.playSound('click');
}

// 显示照片选项
function showPhotoOptions() {
  document.getElementById('photo-options-modal').classList.remove('hidden');
}

// 关闭照片选项
function closePhotoOptions() {
  document.getElementById('photo-options-modal').classList.add('hidden');
}

// 拍照
function takePhoto() {
  closePhotoOptions();
  document.getElementById('photo-input-camera').click();
}

// 选择照片
function choosePhoto() {
  closePhotoOptions();
  document.getElementById('photo-input-gallery').click();
}

// 处理照片选择
function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }

  // 读取并压缩图片
  const reader = new FileReader();
  reader.onload = function(e) {
    // 创建图片对象用于压缩
    const img = new Image();
    img.onload = function() {
      // 创建 canvas 进行压缩
      const canvas = document.createElement('canvas');
      const maxSize = 300;
      let width = img.width;
      let height = img.height;

      // 计算缩放比例
      if (width > height) {
        if (width > maxSize) {
          height = height * maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = width * maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // 显示头像
      document.getElementById('profile-avatar').src = compressedBase64;
      document.getElementById('profile-avatar').style.display = 'block';
      document.getElementById('avatar-placeholder').style.display = 'none';

      // 保存到 profileData
      profileData.avatar = compressedBase64;

      RewardSystem.playSound('success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // 清空 input，允许重复选择同一文件
  event.target.value = '';
}

// 保存个人信息
function saveProfile() {
  // 收集数据
  profileData.name = document.getElementById('profile-name').value.trim();
  profileData.age = parseInt(document.getElementById('profile-age').textContent) || 6;
  profileData.birthday = document.getElementById('profile-birthday').value;

  // 收集兴趣爱好
  profileData.hobbies = [];
  document.querySelectorAll('.hobby-tag.active').forEach(tag => {
    profileData.hobbies.push(tag.dataset.hobby);
  });

  // 保存到 localStorage
  localStorage.setItem('kidsProfileData', JSON.stringify(profileData));

  // 显示成功提示
  RewardSystem.showReward(5, '信息已保存!');
}

// 在 DOMContentLoaded 中初始化个人信息和倒计时
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他模块先加载
  setTimeout(() => {
    initProfile();
    updateTimerDisplay();
  }, 100);
});

// ========== 日历模块 ==========
let currentCalendarDate = new Date();
let selectedDate = null;
let currentEventType = 'class';
let currentClassType = 'piano';
let currentRepeat = 'none';
let selectedMood = null;
let currentEditingEvent = null;

// 事件类型图标映射
const eventTypeIcons = {
  class: '📚',
  outing: '🎡',
  holiday: '🏖️',
  study: '📖'
};

// 课程类型图标映射
const classTypeIcons = {
  piano: '🎹',
  art: '🎨',
  swim: '🏊',
  dance: '💃',
  english: '🔤',
  math: '🔢',
  sports: '⚽',
  other: '📝'
};

// 心情图标映射
const moodIcons = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  tired: '😫',
  excited: '🤩'
};

// 初始化日历
function initCalendar() {
  selectedDate = new Date();
  renderCalendar();
  renderDayEvents();
}

// 渲染日历
function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // 更新月份标题（使用 i18n）
  const monthNames = I18n.t('calendar.months') || ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const yearMonthFormat = I18n.t('calendar.yearMonth') || '{year}年{month}';
  const monthTitle = yearMonthFormat.replace('{year}', year).replace('{month}', monthNames[month]);
  document.getElementById('calendar-month-title').textContent = monthTitle;

  // 获取本月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // 获取上个月最后几天
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // 生成日历网格
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // 上个月的日期
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dayEl = createDayElement(day, year, month - 1, true);
    grid.appendChild(dayEl);
  }

  // 本月的日期
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getFullYear() === year &&
                    today.getMonth() === month &&
                    today.getDate() === day;
    const isSelected = selectedDate &&
                       selectedDate.getFullYear() === year &&
                       selectedDate.getMonth() === month &&
                       selectedDate.getDate() === day;
    const dayEl = createDayElement(day, year, month, false, isToday, isSelected);
    grid.appendChild(dayEl);
  }

  // 下个月的日期（填满6行）
  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const nextMonthDays = totalCells - startDayOfWeek - daysInMonth;
  for (let day = 1; day <= nextMonthDays; day++) {
    const dayEl = createDayElement(day, year, month + 1, true);
    grid.appendChild(dayEl);
  }

  // 更新统计
  updateCalendarStats();
}

// 创建日期元素
function createDayElement(day, year, month, isOtherMonth, isToday = false, isSelected = false) {
  const dayEl = document.createElement('div');
  dayEl.className = 'calendar-day';

  if (isOtherMonth) {
    dayEl.classList.add('other-month');
  }
  if (isToday) {
    dayEl.classList.add('today');
  }
  if (isSelected) {
    dayEl.classList.add('selected');
  }

  // 检查是否是周末
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayEl.classList.add('weekend');
  }

  dayEl.innerHTML = `<span>${day}</span>`;

  // 添加事件标记点
  const dateStr = formatDateStr(year, month, day);
  const events = CalendarData.getEventsByDate(dateStr);
  if (events.length > 0) {
    const dotsEl = document.createElement('div');
    dotsEl.className = 'day-dots';

    // 只显示前3个事件类型的点
    const types = [...new Set(events.map(e => e.type))].slice(0, 3);
    types.forEach(type => {
      const dot = document.createElement('div');
      dot.className = `day-dot ${type}`;
      dotsEl.appendChild(dot);
    });

    dayEl.appendChild(dotsEl);
  }

  // 点击事件
  dayEl.onclick = () => selectDay(year, month, day, isOtherMonth);

  return dayEl;
}

// 格式化日期字符串
function formatDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 选择日期
function selectDay(year, month, day, isOtherMonth) {
  if (isOtherMonth) {
    // 切换到对应月份
    currentCalendarDate = new Date(year, month, 1);
  }
  selectedDate = new Date(year, month, day);
  renderCalendar();
  renderDayEvents();
}

// 切换月份
function changeMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

// 渲染当日事件列表
function renderDayEvents() {
  if (!selectedDate) return;

  const dateStr = formatDateStr(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );

  // 更新标题
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const titleEl = document.getElementById('selected-date-title');

  if (isToday) {
    titleEl.textContent = I18n.t('calendar.today') || '今天';
  } else {
    const monthNames = I18n.t('calendar.months') || ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthDayFormat = I18n.t('calendar.monthDay') || '{month}{day}日';
    titleEl.textContent = monthDayFormat
      .replace('{month}', monthNames[selectedDate.getMonth()])
      .replace('{day}', selectedDate.getDate());
  }

  // 获取事件
  const events = CalendarData.getEventsByDate(dateStr);
  const listEl = document.getElementById('events-list');

  if (events.length === 0) {
    listEl.innerHTML = `<p class="no-events">${I18n.t('calendar.noEvents') || '这一天还没有安排哦~'}</p>`;
    return;
  }

  listEl.innerHTML = events.map((event, index) => {
    const icon = event.type === 'class' ? classTypeIcons[event.classType] || '📚' : eventTypeIcons[event.type];
    const timeStr = event.startTime ? `${event.startTime} - ${event.endTime}` : '';
    const moodEl = event.mood ? `<span class="event-mood">${moodIcons[event.mood]}</span>` : '';

    return `
      <div class="event-item" onclick="showEventDetail('${dateStr}', ${index})">
        <div class="event-icon ${event.type}">${icon}</div>
        <div class="event-info">
          <div class="event-name">${event.name}</div>
          ${timeStr ? `<div class="event-time">${timeStr}</div>` : ''}
        </div>
        ${moodEl}
      </div>
    `;
  }).join('');
}

// 更新统计
function updateCalendarStats() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const stats = CalendarData.getMonthStats(year, month);

  document.getElementById('stat-classes').textContent = stats.classes;
  document.getElementById('stat-outings').textContent = stats.outings;
  document.getElementById('stat-holidays').textContent = stats.holidays;
}

// 显示添加事件弹窗
function showAddEventModal() {
  if (!selectedDate) {
    selectedDate = new Date();
  }

  // 重置表单
  document.getElementById('event-form').reset();
  currentEventType = 'class';
  currentClassType = 'piano';
  currentRepeat = 'none';

  // 更新UI
  updateEventTypeUI();
  updateClassTypeUI();
  updateRepeatUI();
  updateFormFields();

  document.getElementById('add-event-modal').classList.remove('hidden');
}

// 关闭添加事件弹窗
function closeAddEventModal() {
  document.getElementById('add-event-modal').classList.add('hidden');
}

// 选择事件类型
function selectEventType(type) {
  currentEventType = type;
  updateEventTypeUI();
  updateFormFields();
}

// 更新事件类型UI
function updateEventTypeUI() {
  document.querySelectorAll('.event-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentEventType);
  });
}

// 更新表单字段显示
function updateFormFields() {
  const form = document.getElementById('event-form');
  if (currentEventType === 'class' || currentEventType === 'study') {
    form.classList.add('show-class-fields');
  } else {
    form.classList.remove('show-class-fields');
  }
}

// 选择课程类型
function selectClassType(type) {
  currentClassType = type;
  updateClassTypeUI();
}

// 更新课程类型UI
function updateClassTypeUI() {
  document.querySelectorAll('.class-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.class === currentClassType);
  });
}

// 选择重复选项
function selectRepeat(repeat) {
  currentRepeat = repeat;
  updateRepeatUI();
}

// 更新重复UI
function updateRepeatUI() {
  document.querySelectorAll('.repeat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.repeat === currentRepeat);
  });
}

// 处理表单提交
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('event-form');
  if (form) {
    form.addEventListener('submit', handleEventSubmit);
  }
});

function handleEventSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('event-name').value.trim();
  if (!name) return;

  const event = {
    type: currentEventType,
    name: name,
    note: document.getElementById('event-note').value.trim(),
    createdAt: new Date().toISOString()
  };

  // 课外班或学习任务添加时间和课程类型
  if (currentEventType === 'class' || currentEventType === 'study') {
    event.classType = currentClassType;
    event.startTime = document.getElementById('event-start-time').value;
    event.endTime = document.getElementById('event-end-time').value;
    event.repeat = currentRepeat;
  }

  const dateStr = formatDateStr(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );

  // 保存事件
  CalendarData.addEvent(dateStr, event);

  // 如果是每周重复，则添加未来的事件
  if (currentRepeat === 'weekly') {
    const futureDate = new Date(selectedDate);
    for (let i = 1; i <= 12; i++) { // 添加未来12周
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = formatDateStr(
        futureDate.getFullYear(),
        futureDate.getMonth(),
        futureDate.getDate()
      );
      CalendarData.addEvent(futureDateStr, { ...event, isRepeated: true });
    }
  }

  closeAddEventModal();
  renderCalendar();
  renderDayEvents();

  // 显示提示
  RewardSystem.playSound('correct');
}

// 显示事件详情
function showEventDetail(dateStr, eventIndex) {
  const events = CalendarData.getEventsByDate(dateStr);
  const event = events[eventIndex];
  if (!event) return;

  currentEditingEvent = { dateStr, eventIndex, event };

  // 填充详情
  const icon = event.type === 'class' ? classTypeIcons[event.classType] || '📚' : eventTypeIcons[event.type];
  document.getElementById('event-detail-icon').textContent = icon;
  document.getElementById('event-detail-name').textContent = event.name;

  const timeStr = event.startTime ? `${event.startTime} - ${event.endTime}` : (I18n.t('calendar.allDay') || '全天');
  document.getElementById('event-detail-time').textContent = timeStr;

  // 格式化日期（使用 i18n）
  const [year, month, day] = dateStr.split('-');
  const monthNames = I18n.t('calendar.months') || ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const yearMonthFormat = I18n.t('calendar.yearMonth') || '{year}年{month}';
  const monthDayFormat = I18n.t('calendar.monthDay') || '{month}{day}日';
  const dateText = yearMonthFormat
    .replace('{year}', year)
    .replace('{month}', monthNames[parseInt(month) - 1]) + ' ' + parseInt(day);
  document.getElementById('event-detail-date').textContent = dateText;

  // 备注
  const noteSection = document.getElementById('event-detail-note-section');
  if (event.note) {
    noteSection.style.display = 'block';
    document.getElementById('event-detail-note').textContent = event.note;
  } else {
    noteSection.style.display = 'none';
  }

  // 心情部分
  const moodSection = document.getElementById('event-mood-section');
  const savedMoodDisplay = document.getElementById('saved-mood-display');

  if (event.type === 'class' || event.type === 'study') {
    if (event.mood) {
      // 显示已保存的心情
      moodSection.classList.add('hidden');
      savedMoodDisplay.classList.remove('hidden');
      document.getElementById('saved-mood-emoji').textContent = moodIcons[event.mood];
      document.getElementById('saved-mood-feeling').textContent = event.feeling || '没有写感受';
    } else {
      // 显示心情选择器
      moodSection.classList.remove('hidden');
      savedMoodDisplay.classList.add('hidden');
      selectedMood = null;
      document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('event-feeling').value = '';
    }
  } else {
    moodSection.classList.add('hidden');
    savedMoodDisplay.classList.add('hidden');
  }

  document.getElementById('event-detail-modal').classList.remove('hidden');
}

// 关闭事件详情弹窗
function closeEventDetailModal() {
  document.getElementById('event-detail-modal').classList.add('hidden');
  currentEditingEvent = null;
}

// 选择心情
function selectMood(mood) {
  selectedMood = mood;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });
}

// 保存心情和感受
function saveMoodAndFeeling() {
  if (!currentEditingEvent || !selectedMood) return;

  const { dateStr, eventIndex } = currentEditingEvent;
  const feeling = document.getElementById('event-feeling').value.trim();

  CalendarData.updateEventMood(dateStr, eventIndex, selectedMood, feeling);

  closeEventDetailModal();
  renderDayEvents();

  // 给记录心情一点奖励
  RewardSystem.addPoints(5, '记录了今天的心情!');
}

// 删除事件
function deleteEvent() {
  if (!currentEditingEvent) return;

  const { dateStr, eventIndex } = currentEditingEvent;

  if (confirm('确定要删除这个事件吗?')) {
    CalendarData.deleteEvent(dateStr, eventIndex);
    closeEventDetailModal();
    renderCalendar();
    renderDayEvents();
  }
}

// ========== 数据导出/导入功能 ==========
let pendingImportData = null;

// 导出数据
function exportData() {
  const exportData = {
    version: "1.0",
    exportTime: new Date().toISOString(),
    data: {
      profile: JSON.parse(localStorage.getItem('kidsProfileData') || '{}'),
      learning: JSON.parse(localStorage.getItem('kidsLearningData') || '{}'),
      calendar: JSON.parse(localStorage.getItem('kidsCalendarData') || '{}')
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `宝贝学习乐园_备份_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // 播放成功音效
  RewardSystem.playSound('correct');
}

// 触发导入文件选择
function triggerImport() {
  document.getElementById('import-file-input').click();
}

// 处理导入文件
function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      // 验证数据格式
      if (!importedData.data) {
        alert('❌ 文件格式不正确');
        return;
      }
      // 保存待导入数据，显示确认弹窗
      pendingImportData = importedData;
      showImportConfirm();
    } catch (error) {
      alert('❌ 文件解析失败，请检查文件是否正确');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // 重置以支持重复选择
}

// 显示导入确认弹窗
function showImportConfirm() {
  document.getElementById('import-confirm-modal').classList.remove('hidden');
}

// 关闭导入确认弹窗
function closeImportConfirm() {
  document.getElementById('import-confirm-modal').classList.add('hidden');
  pendingImportData = null;
}

// 确认导入
function confirmImport() {
  if (!pendingImportData) return;

  const { data } = pendingImportData;
  if (data.profile) localStorage.setItem('kidsProfileData', JSON.stringify(data.profile));
  if (data.learning) localStorage.setItem('kidsLearningData', JSON.stringify(data.learning));
  if (data.calendar) localStorage.setItem('kidsCalendarData', JSON.stringify(data.calendar));

  closeImportConfirm();
  location.reload();
}

// 强制刷新（清除缓存）
async function forceRefresh() {
  if (!confirm('确定要强制刷新吗？这将清除所有缓存并重新加载页面。')) {
    return;
  }

  try {
    // 注销所有 Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // 清除所有缓存
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }

    // 强制重新加载页面（跳过缓存）
    location.reload(true);
  } catch (error) {
    console.error('强制刷新失败:', error);
    // 即使出错也尝试刷新
    location.reload(true);
  }
}

// ========== 睡眠音乐模块 ==========
let sleepAudio = null;
let sleepMusicPlaying = false;
let sleepTimerInterval = null;
let sleepTimerSeconds = 0;
let sleepTimerMinutes = 15; // 默认15分钟
let sleepTimerEndTime = null; // 定时器结束时间戳（用于后台恢复计算）
let currentSleepMusicIndex = -1;

// 睡眠音乐列表
const sleepMusicList = [
  {
    id: 'christmas',
    name: '圣诞轻音乐',
    icon: '🎄',
    iconClass: 'christmas',
    duration: '2小时',
    size: '55MB',
    file: 'music/christmas-light-music.mp3'
  },
  {
    id: 'relax',
    name: '超级放松音乐',
    icon: '🌿',
    iconClass: 'relax',
    duration: '2小时',
    size: '54MB',
    file: 'music/super-relaxing-music.mp3'
  },
  {
    id: 'whitenoise',
    name: '白噪音助眠',
    icon: '🌊',
    iconClass: 'whitenoise',
    duration: '30分钟',
    size: '18MB',
    file: 'music/white-noise-sleep.mp3'
  },
  {
    id: 'orchestra',
    name: '管弦乐摇篮曲',
    icon: '🎻',
    iconClass: 'orchestra',
    duration: '1小时',
    size: '29MB',
    file: 'music/orchestral-lullabies.mp3'
  }
];

// 初始化睡眠音乐
function initSleepMusic() {
  sleepAudio = document.getElementById('sleep-audio');
  if (!sleepAudio) return;

  // 加载保存的设置
  const savedTimer = localStorage.getItem('sleepMusicTimer');
  if (savedTimer) {
    sleepTimerMinutes = parseInt(savedTimer);
  }

  // 渲染音乐列表
  renderSleepMusicList();

  // 更新定时器按钮状态
  updateSleepTimerUI();

  // 设置音频事件监听
  sleepAudio.addEventListener('ended', () => {
    // loop属性会自动循环，但如果不循环则停止
  });

  sleepAudio.addEventListener('error', (e) => {
    console.error('音频加载失败:', e);
    alert('音乐加载失败，请检查网络连接');
    stopSleepMusic();
  });

  sleepAudio.addEventListener('canplay', () => {
    // 音频准备好可以播放
  });

  // 设置Media Session（锁屏控制）
  setupMediaSession();

  // 监听页面可见性变化（处理后台恢复时同步状态）
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// 渲染音乐列表
function renderSleepMusicList() {
  const container = document.getElementById('music-cards');
  if (!container) return;

  container.innerHTML = sleepMusicList.map((music, index) => `
    <div class="music-card ${currentSleepMusicIndex === index ? 'active' : ''} ${currentSleepMusicIndex === index && sleepMusicPlaying ? 'playing' : ''}"
         onclick="selectSleepMusic(${index})"
         data-index="${index}">
      <div class="music-card-icon ${music.iconClass}">${music.icon}</div>
      <div class="music-card-info">
        <div class="music-card-name">${music.name}</div>
        <div class="music-card-meta">
          <span>⏱ ${music.duration}</span>
          <span>📦 ${music.size}</span>
        </div>
      </div>
      <div class="music-card-status">
        ${currentSleepMusicIndex === index && sleepMusicPlaying ?
          '<div class="equalizer"><span></span><span></span><span></span></div>' :
          ''}
      </div>
    </div>
  `).join('');
}

// 选择音乐
function selectSleepMusic(index) {
  const music = sleepMusicList[index];
  if (!music || !sleepAudio) return;

  // 如果点击的是正在播放的音乐，则暂停/继续
  if (currentSleepMusicIndex === index) {
    toggleSleepMusic();
    return;
  }

  currentSleepMusicIndex = index;

  // 更新播放器信息
  document.getElementById('player-song-name').textContent = music.name;
  document.getElementById('player-song-duration').textContent = music.duration;

  // 设置音频源
  const source = document.getElementById('sleep-audio-source');
  source.src = music.file;
  sleepAudio.load();

  // 启用按钮
  document.getElementById('btn-play-music').disabled = false;
  document.getElementById('btn-stop-music').disabled = false;

  // 自动播放
  playSleepMusic();

  // 更新列表显示
  renderSleepMusicList();
}

// 播放音乐
function playSleepMusic() {
  if (!sleepAudio || currentSleepMusicIndex < 0) return;

  const playPromise = sleepAudio.play();

  if (playPromise !== undefined) {
    playPromise.then(() => {
      sleepMusicPlaying = true;
      updatePlayButtonUI();
      startDiscAnimation();
      renderSleepMusicList();

      // 启动或恢复定时器
      if (sleepTimerMinutes > 0) {
        // 如果有剩余时间，则从剩余时间继续；否则重新开始
        if (sleepTimerSeconds > 0) {
          resumeSleepTimer();
        } else {
          startSleepTimer();
        }
      }

      // 更新Media Session
      updateMediaSessionState();
    }).catch((error) => {
      console.error('播放失败:', error);
      // iOS需要用户交互才能播放
      alert('请点击播放按钮开始播放');
    });
  }
}

// 暂停音乐
function pauseSleepMusic() {
  if (!sleepAudio) return;

  sleepAudio.pause();
  sleepMusicPlaying = false;
  updatePlayButtonUI();
  stopDiscAnimation();
  renderSleepMusicList();

  // 暂停定时器但保存剩余时间（用于恢复播放时继续）
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
    // 更新剩余秒数（基于时间戳）
    if (sleepTimerEndTime) {
      sleepTimerSeconds = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
    }
  }

  updateMediaSessionState();
}

// 切换播放/暂停
function toggleSleepMusic() {
  if (sleepMusicPlaying) {
    pauseSleepMusic();
  } else {
    playSleepMusic();
  }
}

// 停止音乐
function stopSleepMusic() {
  if (!sleepAudio) return;

  sleepAudio.pause();
  sleepAudio.currentTime = 0;
  sleepMusicPlaying = false;
  currentSleepMusicIndex = -1;

  // 重置UI
  document.getElementById('player-song-name').textContent = '选择一首音乐';
  document.getElementById('player-song-duration').textContent = '--:--';
  document.getElementById('btn-play-music').disabled = true;
  document.getElementById('btn-stop-music').disabled = true;

  updatePlayButtonUI();
  stopDiscAnimation();
  renderSleepMusicList();

  // 停止定时器
  stopSleepTimer();

  updateMediaSessionState();
}

// 更新播放按钮UI
function updatePlayButtonUI() {
  const playIcon = document.getElementById('play-icon');
  if (playIcon) {
    playIcon.textContent = sleepMusicPlaying ? '⏸' : '▶';
  }
}

// 启动唱片动画
function startDiscAnimation() {
  const disc = document.getElementById('player-disc');
  if (disc) {
    disc.classList.add('playing');
  }
}

// 停止唱片动画
function stopDiscAnimation() {
  const disc = document.getElementById('player-disc');
  if (disc) {
    disc.classList.remove('playing');
  }
}

// 设置定时器
function setSleepTimer(minutes) {
  sleepTimerMinutes = minutes;

  // 保存设置
  localStorage.setItem('sleepMusicTimer', minutes.toString());

  // 更新UI
  updateSleepTimerUI();

  // 如果正在播放，重新启动定时器
  if (sleepMusicPlaying && minutes > 0) {
    sleepTimerSeconds = minutes * 60;
    startSleepTimer();
  } else if (minutes === 0) {
    // 不限时，停止定时器
    stopSleepTimer();
    updateTimerDisplay();
  }
}

// 更新定时器按钮UI
function updateSleepTimerUI() {
  document.querySelectorAll('.sleep-timer-btn').forEach(btn => {
    const btnMinutes = parseInt(btn.dataset.minutes);
    btn.classList.toggle('active', btnMinutes === sleepTimerMinutes);
  });
}

// 启动睡眠定时器
function startSleepTimer() {
  // 先停止之前的定时器
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
  }

  // 如果是不限时，则不启动
  if (sleepTimerMinutes === 0) {
    sleepTimerEndTime = null;
    updateTimerDisplay();
    return;
  }

  // 使用时间戳计算结束时间（解决后台节流问题）
  sleepTimerEndTime = Date.now() + sleepTimerMinutes * 60 * 1000;
  sleepTimerSeconds = sleepTimerMinutes * 60;
  updateTimerDisplay();

  sleepTimerInterval = setInterval(() => {
    // 基于时间戳计算剩余秒数（后台恢复时也能准确计算）
    const remaining = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
    sleepTimerSeconds = remaining;
    updateTimerDisplay();

    // 时间到
    if (sleepTimerSeconds <= 0) {
      stopSleepMusicWithFadeOut();
    }
  }, 1000);
}

// 停止定时器
function stopSleepTimer() {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
  sleepTimerSeconds = 0;
  sleepTimerEndTime = null;
  updateTimerDisplay();
}

// 恢复定时器（从剩余时间继续）
function resumeSleepTimer() {
  // 先停止之前的定时器
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
  }

  // 如果没有剩余时间，不启动
  if (sleepTimerSeconds <= 0) {
    return;
  }

  // 根据剩余秒数计算新的结束时间
  sleepTimerEndTime = Date.now() + sleepTimerSeconds * 1000;
  updateTimerDisplay();

  sleepTimerInterval = setInterval(() => {
    // 基于时间戳计算剩余秒数
    const remaining = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
    sleepTimerSeconds = remaining;
    updateTimerDisplay();

    // 时间到
    if (sleepTimerSeconds <= 0) {
      stopSleepMusicWithFadeOut();
    }
  }, 1000);
}

// 更新定时器显示
function updateTimerDisplay() {
  const displayEl = document.getElementById('timer-remaining');
  if (!displayEl) return;

  if (sleepTimerMinutes === 0) {
    displayEl.textContent = '不限时';
  } else if (sleepTimerSeconds > 0) {
    const minutes = Math.floor(sleepTimerSeconds / 60);
    const seconds = sleepTimerSeconds % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    displayEl.textContent = '--:--';
  }
}

// 带淡出效果的停止
function stopSleepMusicWithFadeOut() {
  if (!sleepAudio) return;

  // 停止定时器
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }

  // 3秒淡出
  const fadeOutDuration = 3000;
  const fadeOutSteps = 30;
  const fadeOutInterval = fadeOutDuration / fadeOutSteps;
  const volumeStep = sleepAudio.volume / fadeOutSteps;

  let currentStep = 0;
  const fadeInterval = setInterval(() => {
    currentStep++;
    sleepAudio.volume = Math.max(0, sleepAudio.volume - volumeStep);

    if (currentStep >= fadeOutSteps) {
      clearInterval(fadeInterval);
      sleepAudio.pause();
      sleepAudio.currentTime = 0;
      sleepAudio.volume = 1; // 重置音量
      sleepMusicPlaying = false;
      updatePlayButtonUI();
      stopDiscAnimation();
      renderSleepMusicList();
      updateTimerDisplay();
      updateMediaSessionState();
    }
  }, fadeOutInterval);
}

// 处理页面可见性变化（后台恢复时同步状态）
function handleVisibilityChange() {
  if (document.hidden) {
    // 页面进入后台 - 不做特殊处理，让音乐继续播放
    return;
  }

  // 页面恢复可见时，同步定时器状态
  if (sleepMusicPlaying && sleepTimerEndTime) {
    const remaining = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
    sleepTimerSeconds = remaining;

    // 如果定时器已到期，执行停止
    if (remaining <= 0) {
      stopSleepMusicWithFadeOut();
    } else {
      updateTimerDisplay();
    }
  }

  // 同步 UI 状态（确保播放状态与实际音频状态一致）
  if (sleepAudio) {
    const actuallyPlaying = !sleepAudio.paused;
    if (actuallyPlaying !== sleepMusicPlaying) {
      sleepMusicPlaying = actuallyPlaying;
      updatePlayButtonUI();
      if (actuallyPlaying) {
        startDiscAnimation();
      } else {
        stopDiscAnimation();
      }
      renderSleepMusicList();
      updateMediaSessionState();
    }
  }
}

// 设置Media Session（锁屏控制）
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    if (currentSleepMusicIndex >= 0) {
      playSleepMusic();
    }
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    pauseSleepMusic();
  });

  navigator.mediaSession.setActionHandler('stop', () => {
    stopSleepMusic();
  });
}

// 更新Media Session状态
function updateMediaSessionState() {
  if (!('mediaSession' in navigator)) return;

  if (currentSleepMusicIndex >= 0) {
    const music = sleepMusicList[currentSleepMusicIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: music.name,
      artist: '宝贝学习乐园',
      album: '睡眠音乐'
    });
    navigator.mediaSession.playbackState = sleepMusicPlaying ? 'playing' : 'paused';
  } else {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}

// 在DOMContentLoaded中初始化睡眠音乐
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initSleepMusic();
  }, 200);
});

// ========== P1功能 - 记忆游戏控制 ==========

function showMemoryGame() {
  const modal = document.getElementById('memory-game-modal');
  if (!modal) return;

  // 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('memory');
  }

  // 显示游戏选择界面
  MemoryGame.renderGameSelect();
  modal.classList.remove('hidden');
}

function closeMemoryGame() {
  const modal = document.getElementById('memory-game-modal');
  if (modal) {
    modal.classList.add('hidden');
    MemoryGame.stopCurrentGame();
  }
}

function restartMemoryGame() {
  document.getElementById('memory-result-modal').classList.add('hidden');
  MemoryGame.restartCurrentGame();
}

function backToMemorySelect() {
  document.getElementById('memory-result-modal').classList.add('hidden');
  MemoryGame.renderGameSelect();
  document.getElementById('memory-game-select').classList.remove('hidden');
  document.getElementById('memory-game-area').classList.add('hidden');
}

// ========== P1功能 - 学习宠物控制 ==========

function showLearningPet() {
  const modal = document.getElementById('learning-pet-modal');
  if (!modal) return;

  // 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('pet');
  }

  LearningPet.renderPetUI();
  modal.classList.remove('hidden');
}

function closeLearningPet() {
  const modal = document.getElementById('learning-pet-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function adoptPet() {
  const typeList = document.getElementById('pet-type-list');
  const selectedCard = typeList.querySelector('.pet-type-card.selected');
  const nameInput = document.getElementById('pet-name-input');

  if (!selectedCard) {
    alert('请先选择一个宠物类型');
    return;
  }

  const petType = selectedCard.dataset.type;
  const petName = nameInput.value.trim() || '小可爱';

  LearningPet.adoptPet(petType, petName);
  LearningPet.renderPetUI();
}

function showPetFeed() {
  const modal = document.getElementById('pet-feed-modal');
  if (!modal) return;

  LearningPet.renderFoodList();
  modal.classList.remove('hidden');
}

function closePetFeed() {
  const modal = document.getElementById('pet-feed-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function petPet() {
  const result = LearningPet.pet();
  if (result) {
    showPetMessage(result.message);
    updatePetStatusBars();
  }
}

function showPetAccessories() {
  const modal = document.getElementById('pet-accessories-modal');
  if (!modal) return;

  LearningPet.renderAccessoriesList();
  modal.classList.remove('hidden');
}

function closePetAccessories() {
  const modal = document.getElementById('pet-accessories-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function closePetEvolution() {
  const modal = document.getElementById('pet-evolution-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function showPetMessage(message) {
  const messageEl = document.getElementById('pet-message');
  if (messageEl) {
    messageEl.querySelector('.message-text').textContent = message;
  }
}

function updatePetStatusBars() {
  const data = LearningPet.data;
  if (!data) return;

  const happinessFill = document.getElementById('happiness-fill');
  const hungerFill = document.getElementById('hunger-fill');
  const expFill = document.getElementById('exp-fill');
  const happinessValue = document.getElementById('happiness-value');
  const hungerValue = document.getElementById('hunger-value');
  const expValue = document.getElementById('exp-value');

  if (happinessFill) happinessFill.style.width = data.happiness + '%';
  if (hungerFill) hungerFill.style.width = data.hunger + '%';
  if (expFill) {
    const expNeeded = LearningPet.getExpForNextLevel(data.level);
    expFill.style.width = (data.exp / expNeeded * 100) + '%';
    if (expValue) expValue.textContent = data.exp + '/' + expNeeded;
  }
  if (happinessValue) happinessValue.textContent = data.happiness;
  if (hungerValue) hungerValue.textContent = data.hunger;
}

// ========== P1功能 - 学习报告控制 ==========

// showLearningReport, closeLearningReport, changeReportPeriod, shareReport
// 这些函数已在 learningReport.js 中定义

// ========== P2功能 - 绘本阅读控制 ==========

function showPictureBook() {
  const modal = document.getElementById('picture-book-modal');
  if (!modal) return;

  PictureBook.renderBookshelf();
  modal.classList.remove('hidden');
}

// closePictureBook 已在 pictureBook.js 中定义

function backToBookshelf() {
  PictureBook.backToBookshelf();
}

function toggleAutoRead() {
  PictureBook.toggleAutoRead();
}

function prevBookPage() {
  PictureBook.prevPage();
}

function nextBookPage() {
  PictureBook.nextPage();
}

function readBookAgain() {
  document.getElementById('book-complete-modal').classList.add('hidden');
  PictureBook.readAgain();
}

function closeBookComplete() {
  document.getElementById('book-complete-modal').classList.add('hidden');
  PictureBook.backToBookshelf();
}

// ========== P2功能 - 跟读练习控制 ==========

function showPronunciation() {
  const modal = document.getElementById('pronunciation-modal');
  if (!modal) return;

  Pronunciation.renderPracticeSelect();
  modal.classList.remove('hidden');
}

// closePronunciation 已在 pronunciation.js 中定义

function backToPronunciationSelect() {
  Pronunciation.backToSelect();
}

function playDemonstration() {
  Pronunciation.playDemonstration();
}

function toggleRecording() {
  Pronunciation.toggleRecording();
}

function tryAgain() {
  Pronunciation.tryAgain();
}

function nextPracticeItem() {
  Pronunciation.nextItem();
}

function closePronunciationComplete() {
  document.getElementById('pronunciation-complete-modal').classList.add('hidden');
  Pronunciation.backToSelect();
}
