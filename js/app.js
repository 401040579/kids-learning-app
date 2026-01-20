// ========== 主应用 ==========

// 当前页面
let currentPage = 'home';

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.log('SW registration failed:', err));
  }

  // 初始化奖励系统
  RewardSystem.init();

  // 初始化各模块
  initVideos();
  initMath();
  initEnglish();
  initChinese();
});

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

  // 进入页面时初始化内容
  if (page === 'math') generateMathQuestion();
  if (page === 'english') generateEnglishQuestion();
  if (page === 'chinese') generateChineseQuestion();
  if (page === 'calendar') initCalendar();
}

function getNavIndex(page) {
  const pages = ['home', 'explore', 'math', 'english', 'chinese', 'calendar'];
  const index = pages.indexOf(page);
  // 对于不在底部导航的页面（timer, profile），返回首页索引
  return index >= 0 ? index : 0;
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
    closeVideoDetail();
    playVideo(selectedVideo.titleZh, selectedVideo.youtubeId);
  }
}

// 播放视频
function playVideo(name, videoId) {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('video-player');
  const overlay = document.getElementById('video-overlay');

  // 隐藏遮罩
  overlay.classList.add('hidden');

  // 创建 YouTube iframe (使用 nocookie 域名，隐藏相关视频)
  player.innerHTML = `
    <iframe
      id="yt-player"
      src="https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&autoplay=1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
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

function initMath() {
  generateMathQuestion();
}

function generateMathQuestion() {
  // 6岁适合的简单加减法
  const operators = ['+', '-'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let num1, num2;

  if (operator === '+') {
    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    mathAnswer = num1 + num2;
  } else {
    num1 = Math.floor(Math.random() * 10) + 5; // 5-14
    num2 = Math.floor(Math.random() * num1); // 保证结果为正
    mathAnswer = num1 - num2;
  }

  document.getElementById('num1').textContent = num1;
  document.getElementById('operator').textContent = operator;
  document.getElementById('num2').textContent = num2;

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

    // 延迟后生成新题
    setTimeout(() => {
      generateMathQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.mathWrong();
    RewardSystem.playSound('wrong');

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

    setTimeout(() => {
      generateEnglishQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.playSound('wrong');

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

    setTimeout(() => {
      generateChineseQuestion();
    }, 1500);
  } else {
    btn.classList.add('wrong');
    RewardSystem.playSound('wrong');

    setTimeout(() => {
      btn.classList.remove('wrong');
    }, 500);
  }
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

  // 更新月份标题
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  document.getElementById('calendar-month-title').textContent = `${year}年${monthNames[month]}`;

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
    titleEl.textContent = '今天';
  } else {
    titleEl.textContent = `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
  }

  // 获取事件
  const events = CalendarData.getEventsByDate(dateStr);
  const listEl = document.getElementById('events-list');

  if (events.length === 0) {
    listEl.innerHTML = '<p class="no-events">这一天还没有安排哦~</p>';
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

  const timeStr = event.startTime ? `${event.startTime} - ${event.endTime}` : '全天';
  document.getElementById('event-detail-time').textContent = timeStr;

  // 格式化日期
  const [year, month, day] = dateStr.split('-');
  document.getElementById('event-detail-date').textContent = `${year}年${parseInt(month)}月${parseInt(day)}日`;

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
