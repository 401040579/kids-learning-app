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
}

function getNavIndex(page) {
  const pages = ['home', 'explore', 'math', 'english', 'chinese'];
  return pages.indexOf(page);
}

// ========== 视频播放器 ==========
let videoPlayer = null;

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
