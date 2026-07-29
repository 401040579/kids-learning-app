// ========== 跟读评分模块 ==========

const Pronunciation = {
  // 练习内容
  practices: {
    pinyin: [
      { id: 'a', text: 'ā', display: 'a', hint: '嘴巴张大' },
      { id: 'o', text: 'ō', display: 'o', hint: '嘴巴圆圆' },
      { id: 'e', text: 'ē', display: 'e', hint: '嘴角向后' },
      { id: 'i', text: 'ī', display: 'i', hint: '嘴巴扁扁' },
      { id: 'u', text: 'ū', display: 'u', hint: '嘴巴噘起' },
      { id: 'ü', text: 'ǖ', display: 'ü', hint: '嘴巴噘起，舌头前伸' },
      { id: 'b', text: 'bō', display: 'b', hint: '双唇紧闭再张开' },
      { id: 'p', text: 'pō', display: 'p', hint: '用力吹气' },
      { id: 'm', text: 'mō', display: 'm', hint: '双唇紧闭，从鼻子出气' },
      { id: 'f', text: 'fō', display: 'f', hint: '上牙咬下唇' },
      { id: 'd', text: 'dē', display: 'd', hint: '舌尖顶住上齿龈' },
      { id: 't', text: 'tē', display: 't', hint: '舌尖用力弹开' }
    ],
    words: [
      { id: 'mama', text: '妈妈', pinyin: 'māma', hint: '第一声' },
      { id: 'baba', text: '爸爸', pinyin: 'bàba', hint: '第四声' },
      { id: 'nihao', text: '你好', pinyin: 'nǐhǎo', hint: '第三声' },
      { id: 'xiexie', text: '谢谢', pinyin: 'xièxiè', hint: '第四声' },
      { id: 'zaijian', text: '再见', pinyin: 'zàijiàn', hint: '第四声' },
      { id: 'pengyou', text: '朋友', pinyin: 'péngyǒu', hint: '第二声和第三声' },
      { id: 'xuexiao', text: '学校', pinyin: 'xuéxiào', hint: '第二声和第四声' },
      { id: 'laoshi', text: '老师', pinyin: 'lǎoshī', hint: '第三声和第一声' }
    ],
    english: [
      { id: 'hello', text: 'Hello', translation: '你好', hint: '哈楼' },
      { id: 'goodbye', text: 'Goodbye', translation: '再见', hint: '古德拜' },
      { id: 'thankyou', text: 'Thank you', translation: '谢谢', hint: '三克油' },
      { id: 'please', text: 'Please', translation: '请', hint: '普利斯' },
      { id: 'sorry', text: 'Sorry', translation: '对不起', hint: '索瑞' },
      { id: 'yes', text: 'Yes', translation: '是的', hint: '耶斯' },
      { id: 'no', text: 'No', translation: '不是', hint: '诺' },
      { id: 'apple', text: 'Apple', translation: '苹果', hint: '艾破' },
      { id: 'banana', text: 'Banana', translation: '香蕉', hint: '巴娜娜' },
      { id: 'cat', text: 'Cat', translation: '猫', hint: '凯特' },
      { id: 'dog', text: 'Dog', translation: '狗', hint: '道格' },
      { id: 'bird', text: 'Bird', translation: '鸟', hint: '伯德' }
    ]
  },

  // 练习类型
  practiceTypes: [
    { id: 'pinyin', name: '拼音练习', icon: '🔤', desc: '学习发音基础' },
    { id: 'words', name: '词语朗读', icon: '📝', desc: '练习常用词语' },
    { id: 'english', name: '英语单词', icon: '🔠', desc: '练习英语发音' }
  ],

  // 当前状态
  currentType: null,
  currentIndex: 0,
  isRecording: false,
  recognition: null,
  scores: [],

  // 统计数据
  stats: {
    totalPractices: 0,
    perfectScores: 0,
    averageScore: 0
  },

  // 初始化
  init() {
    this.loadStats();
    this.initSpeechRecognition();
  },

  // 加载统计数据
  loadStats() {
    const saved = localStorage.getItem('kidsPronunciationStats');
    if (saved) {
      this.stats = JSON.parse(saved);
    }
  },

  // 保存统计数据
  saveStats() {
    safeSetItem('kidsPronunciationStats', JSON.stringify(this.stats));
  },

  // 初始化语音识别
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        this.handleRecognitionResult(result);
      };

      this.recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        this.stopRecording();
        this.showRecordingError();
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.updateRecordButton();
      };
    }
  },

  // 渲染练习选择界面
  renderPracticeSelect() {
    const selectArea = document.getElementById('pronunciation-select-area');
    const practiceArea = document.getElementById('pronunciation-practice-area');

    if (selectArea) {
      let html = '<div class="pronunciation-types">';
      this.practiceTypes.forEach(type => {
        html += `
          <div class="pronunciation-type-card" onclick="startPronunciationPractice('${type.id}')">
            <div class="type-icon">${type.icon}</div>
            <div class="type-info">
              <h3>${type.name}</h3>
              <p>${type.desc}</p>
            </div>
          </div>
        `;
      });
      html += '</div>';

      // 添加统计信息
      html += `
        <div class="pronunciation-stats">
          <div class="stat-item">
            <span class="stat-value">${this.stats.totalPractices}</span>
            <span class="stat-label">练习次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.stats.perfectScores}</span>
            <span class="stat-label">满分次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.stats.averageScore || 0}</span>
            <span class="stat-label">平均分</span>
          </div>
        </div>
      `;

      selectArea.innerHTML = html;
      selectArea.classList.remove('hidden');
    }

    if (practiceArea) {
      practiceArea.classList.add('hidden');
    }
  },

  // 开始练习
  startPractice(typeId) {
    this.currentType = typeId;
    this.currentIndex = 0;
    this.scores = [];

    // 设置语言
    if (this.recognition) {
      this.recognition.lang = typeId === 'english' ? 'en-US' : 'zh-CN';
    }

    this.renderPracticePage();

    document.getElementById('pronunciation-select-area').classList.add('hidden');
    document.getElementById('pronunciation-practice-area').classList.remove('hidden');
  },

  // 渲染练习页面
  renderPracticePage() {
    const container = document.getElementById('pronunciation-practice-area');
    if (!container) return;

    const items = this.practices[this.currentType];
    const current = items[this.currentIndex];
    const totalItems = items.length;
    const progress = ((this.currentIndex + 1) / totalItems) * 100;

    let displayContent = '';
    let hintContent = '';

    if (this.currentType === 'pinyin') {
      displayContent = `<div class="practice-pinyin">${current.text}</div>`;
      hintContent = current.hint;
    } else if (this.currentType === 'words') {
      displayContent = `
        <div class="practice-word">${current.text}</div>
        <div class="practice-pinyin-small">${current.pinyin}</div>
      `;
      hintContent = current.hint;
    } else if (this.currentType === 'english') {
      displayContent = `
        <div class="practice-english">${current.text}</div>
        <div class="practice-translation">${current.translation}</div>
      `;
      hintContent = `发音提示: ${current.hint}`;
    }

    container.innerHTML = `
      <div class="practice-header">
        <button class="btn-back-practice" onclick="backToPronunciationSelect()">← 返回</button>
        <div class="practice-progress-text">${this.currentIndex + 1}/${totalItems}</div>
      </div>

      <div class="practice-progress-bar">
        <div class="practice-progress-fill" style="width: ${progress}%"></div>
      </div>

      <div class="practice-content">
        ${displayContent}
        <div class="practice-hint">${hintContent}</div>
      </div>

      <div class="practice-controls">
        <button class="btn-listen" onclick="listenPronunciation()">
          🔊 听一听
        </button>
        <button class="btn-record ${this.isRecording ? 'recording' : ''}" id="btn-record"
                onclick="toggleRecording()">
          ${this.isRecording ? '⏹️ 停止' : '🎤 跟读'}
        </button>
      </div>

      <div class="practice-result hidden" id="practice-result">
        <!-- 结果显示 -->
      </div>

      <div class="practice-nav">
        <button class="btn-prev" onclick="prevPracticeItem()" ${this.currentIndex === 0 ? 'disabled' : ''}>
          上一个
        </button>
        <button class="btn-next" onclick="nextPracticeItem()" ${this.currentIndex >= totalItems - 1 ? 'disabled' : ''}>
          下一个
        </button>
      </div>
    `;
  },

  // 播放示范发音
  playDemonstration() {
    const items = this.practices[this.currentType];
    const current = items[this.currentIndex];

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();

      let text = '';
      let lang = 'zh-CN';

      if (this.currentType === 'pinyin') {
        text = current.text;
      } else if (this.currentType === 'words') {
        text = current.text;
      } else if (this.currentType === 'english') {
        text = current.text;
        lang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  },

  // 开始/停止录音
  toggleRecording() {
    if (!this.recognition) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  // 开始录音
  startRecording() {
    if (!this.recognition) return;

    this.isRecording = true;
    this.updateRecordButton();

    try {
      this.recognition.start();
    } catch (e) {
      console.log('Recognition already started');
    }
  },

  // 停止录音
  stopRecording() {
    if (!this.recognition) return;

    this.isRecording = false;
    this.updateRecordButton();

    try {
      this.recognition.stop();
    } catch (e) {
      console.log('Recognition already stopped');
    }
  },

  // 更新录音按钮状态
  updateRecordButton() {
    const btn = document.getElementById('btn-record');
    if (btn) {
      btn.classList.toggle('recording', this.isRecording);
      btn.innerHTML = this.isRecording ? '⏹️ 停止' : '🎤 跟读';
    }
  },

  // 处理识别结果
  handleRecognitionResult(result) {
    const items = this.practices[this.currentType];
    const current = items[this.currentIndex];

    let expected = '';
    if (this.currentType === 'english') {
      expected = current.text.toLowerCase();
    } else {
      expected = current.text;
    }

    // 计算相似度得分
    const score = this.calculateSimilarity(result.toLowerCase(), expected.toLowerCase());
    this.scores.push(score);

    // 显示结果
    this.showResult(result, score);

    // 更新统计
    this.stats.totalPractices++;
    if (score >= 90) {
      this.stats.perfectScores++;
    }
    this.stats.averageScore = Math.round(
      this.scores.reduce((a, b) => a + b, 0) / this.scores.length
    );
    this.saveStats();

    // 奖励积分
    if (score >= 60) {
      const points = Math.floor(score / 10);
      RewardSystem.addPoints(points, '发音练习');
    }
  },

  // 计算相似度
  calculateSimilarity(str1, str2) {
    // 简单的相似度计算
    if (str1 === str2) return 100;

    // 使用编辑距离计算
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 100;

    // 计算包含关系的额外得分
    let bonus = 0;
    if (str1.includes(str2) || str2.includes(str1)) {
      bonus = 30;
    }

    // 简化的相似度：基于字符匹配
    let matches = 0;
    const shorter = str1.length <= str2.length ? str1 : str2;
    const longer = str1.length > str2.length ? str1 : str2;

    for (let char of shorter) {
      if (longer.includes(char)) {
        matches++;
      }
    }

    const baseScore = (matches / maxLen) * 100;
    return Math.min(100, Math.round(baseScore + bonus));
  },

  // 显示结果
  showResult(userSaid, score) {
    const resultDiv = document.getElementById('practice-result');
    if (!resultDiv) return;

    let emoji, message, className;

    if (score >= 90) {
      emoji = '🌟';
      message = '太棒了！发音很标准！';
      className = 'excellent';
      RewardSystem.playSound('correct');
    } else if (score >= 70) {
      emoji = '😊';
      message = '很不错！继续练习！';
      className = 'good';
      RewardSystem.playSound('correct');
    } else if (score >= 50) {
      emoji = '🤔';
      message = '再试一次吧！';
      className = 'fair';
    } else {
      emoji = '💪';
      message = '加油！多听几遍再试！';
      className = 'need-practice';
    }

    resultDiv.innerHTML = `
      <div class="result-content ${className}">
        <div class="result-emoji">${emoji}</div>
        <div class="result-score">${score}分</div>
        <div class="result-message">${message}</div>
        <div class="result-said">你说的: "${userSaid}"</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  },

  // 显示录音错误
  showRecordingError() {
    const resultDiv = document.getElementById('practice-result');
    if (!resultDiv) return;

    resultDiv.innerHTML = `
      <div class="result-content error">
        <div class="result-emoji">😅</div>
        <div class="result-message">没有听清楚，再试一次吧！</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  },

  // 上一题
  prevItem() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderPracticePage();
    }
  },

  // 下一题
  nextItem() {
    const items = this.practices[this.currentType];
    if (this.currentIndex < items.length - 1) {
      this.currentIndex++;
      this.renderPracticePage();
    } else {
      // 完成练习
      this.finishPractice();
    }
  },

  // 完成练习
  finishPractice() {
    const avgScore = this.scores.length > 0
      ? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length)
      : 0;

    // 📊 追踪跟读练习完成
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('pronunciation_complete', {
        practice_type: this.currentType,
        average_score: avgScore,
        total_count: this.scores.length
      });
    }

    // 显示完成弹窗
    const modal = document.getElementById('pronunciation-complete-modal');
    if (modal) {
      document.getElementById('summary-avg-score').textContent = avgScore;
      document.getElementById('summary-count').textContent = this.scores.length;
      modal.classList.remove('hidden');
    }
  },

  // 返回选择
  backToSelect() {
    speechSynthesis.cancel();
    this.currentType = null;
    this.currentIndex = 0;
    this.scores = [];
    this.renderPracticeSelect();
  }
};

// ========== 全局函数 ==========

function showPronunciation() {
  const modal = document.getElementById('pronunciation-modal');
  if (!modal) return;

  // 🕐 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('pronunciation');
  }

  Pronunciation.renderPracticeSelect();
  modal.classList.remove('hidden');
}

function closePronunciation() {
  const modal = document.getElementById('pronunciation-modal');
  if (modal) {
    speechSynthesis.cancel();
    Pronunciation.stopRecording();
    modal.classList.add('hidden');
  }
}

function startPronunciationPractice(typeId) {
  Pronunciation.startPractice(typeId);
}

function backToPronunciationSelect() {
  Pronunciation.backToSelect();
}

function listenPronunciation() {
  Pronunciation.playDemonstration();
}

function toggleRecording() {
  Pronunciation.toggleRecording();
}

function prevPracticeItem() {
  Pronunciation.prevItem();
}

function nextPracticeItem() {
  Pronunciation.nextItem();
}

function closePronunciationComplete() {
  document.getElementById('pronunciation-complete-modal').classList.add('hidden');
  Pronunciation.backToSelect();
}

function practicePronunciationAgain() {
  document.getElementById('pronunciation-complete-modal').classList.add('hidden');
  Pronunciation.startPractice(Pronunciation.currentType);
}
