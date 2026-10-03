// ========== 跟读与转写词语匹配模块（不是声学发音评分） ==========

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
  sessionPoints: 0,
  practiceFinished: false,
  activeAttempt: null,
  attemptSerial: 0,
  SpeechRecognitionClass: null,

  // 统计数据
  stats: {
    schemaVersion: 2,
    totalPractices: 0,
    perfectScores: 0,
    averageScore: null,
    matchedAttempts: 0,
    exactMatches: 0,
    scoreTotal: 0,
    legacyStats: null
  },

  text(key, fallback) {
    return typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback;
  },

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  },

  // 初始化
  init() {
    this.loadStats();
    this.initSpeechRecognition();
  },

  // 加载统计数据
  loadStats() {
    const saved = SafeStorage.getObject('kidsPronunciationStats', {
      totalPractices: 0, perfectScores: 0, averageScore: null
    });
    const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    const legacy = saved.schemaVersion === 2 ? saved.legacyStats : {
      totalPractices: count(saved.totalPractices), perfectScores: count(saved.perfectScores),
      averageScore: typeof saved.averageScore === 'number' && saved.averageScore >= 0 && saved.averageScore <= 100 ? saved.averageScore : null
    };
    const matchedAttempts = saved.schemaVersion === 2 ? count(saved.matchedAttempts) : 0;
    const scoreTotal = typeof saved.scoreTotal === 'number' && Number.isFinite(saved.scoreTotal) &&
      saved.scoreTotal >= 0 && saved.scoreTotal <= matchedAttempts * 100 ? saved.scoreTotal : 0;
    this.stats = {
      schemaVersion: 2,
      totalPractices: count(saved.totalPractices), perfectScores: count(saved.perfectScores),
      matchedAttempts, exactMatches: Math.min(count(saved.exactMatches), matchedAttempts), scoreTotal,
      averageScore: matchedAttempts > 0 ? Math.round(scoreTotal / matchedAttempts) : null,
      // 旧版 averageScore 实为最后一轮平均值，保留原值，但不能伪造为累计平均。
      legacyStats: legacy && typeof legacy === 'object' && !Array.isArray(legacy) ? {
        totalPractices: count(legacy.totalPractices), perfectScores: count(legacy.perfectScores),
        averageScore: typeof legacy.averageScore === 'number' && legacy.averageScore >= 0 && legacy.averageScore <= 100 ? legacy.averageScore : null
      } : null
    };
  },

  // 保存统计数据
  saveStats() {
    return safeSetItem('kidsPronunciationStats', JSON.stringify(this.stats));
  },

  // 初始化语音识别
  initSpeechRecognition() {
    this.SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;
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
              <h3>${this.escapeHtml(this.text(`pronunciation.type.${type.id}`, type.name))}</h3>
              <p>${this.escapeHtml(this.text(`pronunciation.desc.${type.id}`, type.id === 'pinyin' ? '听示范，再自己跟读；不自动评分' : '识别所说词语，再与目标文字比较'))}</p>
            </div>
          </div>
        `;
      });
      html += '</div>';
      html += `<p class="practice-hint">${this.escapeHtml(this.text('pronunciation.matchingNotice', '这里只比较语音转写的词语，不判断发音是否标准。环境声音和识别失败不会扣分。'))}</p>`;

      // 添加统计信息
      html += `
        <div class="pronunciation-stats">
          <div class="stat-item">
            <span class="stat-value">${this.stats.matchedAttempts}</span>
            <span class="stat-label">${this.escapeHtml(this.text('pronunciation.matchedAttempts', '有效词语匹配次数'))}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.stats.exactMatches}</span>
            <span class="stat-label">${this.escapeHtml(this.text('pronunciation.exactMatches', '文字完全匹配'))}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${this.stats.averageScore === null ? '—' : `${this.stats.averageScore}%`}</span>
            <span class="stat-label">${this.escapeHtml(this.text('pronunciation.averageMatching', '新记录平均匹配度'))}</span>
          </div>
        </div>
      `;
      if (this.stats.legacyStats?.totalPractices) {
        html += `<p class="practice-hint">${this.escapeHtml(this.text('pronunciation.legacyNotice', '保留了 {count} 次旧版记录；旧评分未并入新的平均匹配度。').replace('{count}', this.stats.legacyStats.totalPractices))}</p>`;
      }

      selectArea.innerHTML = html;
      selectArea.classList.remove('hidden');
    }

    if (practiceArea) {
      practiceArea.classList.add('hidden');
    }
  },

  // 开始练习
  startPractice(typeId) {
    if (!Object.hasOwn(this.practices, typeId)) return;
    this.stopRecording(true);
    this.currentType = typeId;
    this.currentIndex = 0;
    this.scores = [];
    this.sessionPoints = 0;
    this.practiceFinished = false;

    // 设置语言
    if (this.recognition) {
      this.recognition.lang = typeId === 'english' ? 'en-US' : 'zh-CN';
    }

    this.renderPracticePage();

    document.getElementById('pronunciation-select-area')?.classList.add('hidden');
    document.getElementById('pronunciation-practice-area')?.classList.remove('hidden');
  },

  // 渲染练习页面
  renderPracticePage() {
    const container = document.getElementById('pronunciation-practice-area');
    if (!container) return;

    const items = this.practices[this.currentType];
    if (!items) return;
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
      hintContent = `${this.text('pronunciation.practiceHint', '跟读提示')}: ${current.hint}`;
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
        <div class="practice-hint">${this.escapeHtml(this.text(this.currentType === 'pinyin' ? 'pronunciation.pinyinNotice' : 'pronunciation.matchingNotice', this.currentType === 'pinyin' ? '浏览器不能可靠识别单个拼音。听示范后自己跟读，这一组不自动评分。' : '这里只比较语音转写的词语，不判断发音是否标准。环境声音和识别失败不会扣分。'))}</div>
      </div>

      <div class="practice-controls">
        <button class="btn-listen" onclick="listenPronunciation()">
          🔊 ${this.escapeHtml(this.text('pronunciation.listen', '听一听'))}
        </button>
        <button class="btn-record ${this.isRecording ? 'recording' : ''}" id="btn-record"
                onclick="toggleRecording()">
          ${this.isRecording ? `⏹️ ${this.text('pronunciation.stopRecording', '停止')}` : this.currentType === 'pinyin' ? `🎧 ${this.text('pronunciation.selfPractice', '自己跟读')}` : `🎤 ${this.text('pronunciation.record', '点击录音')}`}
        </button>
      </div>

      <div class="practice-result hidden" id="practice-result">
        <!-- 结果显示 -->
      </div>

      <div class="practice-nav">
        <button class="btn-prev" onclick="prevPracticeItem()" ${this.currentIndex === 0 ? 'disabled' : ''}>
          上一个
        </button>
        <button class="btn-next" onclick="nextPracticeItem()">
          ${this.escapeHtml(this.text(this.currentIndex === totalItems - 1 ? 'pronunciation.finish' : 'btn.next', this.currentIndex === totalItems - 1 ? '完成这一组' : '下一个'))}
        </button>
      </div>
    `;
  },

  // 播放示范发音
  playDemonstration() {
    const items = this.practices[this.currentType];
    if (!items) return;
    this.stopRecording(true);
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
    if (this.currentType === 'pinyin') {
      this.showRecordingError('pinyin');
      return;
    }
    if (!this.SpeechRecognitionClass) {
      this.showRecordingError('unsupported');
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
    if (!this.currentType || this.practiceFinished || this.currentType === 'pinyin') return;
    if (!this.SpeechRecognitionClass) { this.showRecordingError('unsupported'); return; }
    this.stopRecording(true);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const attempt = { id: ++this.attemptSerial, type: this.currentType, index: this.currentIndex,
      handled: false, error: false };
    this.activeAttempt = attempt;
    try {
      // 每次识别独立实例；旧实例的迟到结果绝不能算到新题或新账号内存中。
      this.recognition = new this.SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.currentType === 'english' ? 'en-US' : 'zh-CN';
      this.recognition.onresult = event => {
        const alternative = event.results?.[event.resultIndex || 0]?.[0];
        this.handleRecognitionResult(alternative?.transcript || '', attempt, alternative?.confidence);
      };
      this.recognition.onerror = event => {
        if (this.activeAttempt !== attempt) return;
        attempt.error = true;
        this.isRecording = false;
        this.updateRecordButton();
        this.showRecordingError(event.error);
      };
      this.recognition.onend = () => {
        if (this.activeAttempt !== attempt) return;
        this.isRecording = false;
        this.updateRecordButton();
        if (!attempt.handled && !attempt.error) {
          attempt.error = true;
          this.showRecordingError('no-speech');
        }
      };
      this.isRecording = true;
      this.updateRecordButton();
      this.recognition.start();
    } catch (e) {
      attempt.error = true;
      this.isRecording = false;
      this.updateRecordButton();
      this.showRecordingError('start-failed');
    }
  },

  // 停止录音
  stopRecording(cancel = false) {
    if (cancel) this.activeAttempt = null;
    this.isRecording = false;
    this.updateRecordButton();
    if (!this.recognition) return;
    try {
      if (cancel && this.recognition.abort) this.recognition.abort();
      else this.recognition.stop();
    } catch (e) {
      console.log('Recognition already stopped');
    }
  },

  // 更新录音按钮状态
  updateRecordButton() {
    const btn = document.getElementById('btn-record');
    if (btn) {
      btn.classList.toggle('recording', this.isRecording);
      btn.textContent = this.isRecording ? `⏹️ ${this.text('pronunciation.stopRecording', '停止')}` :
        this.currentType === 'pinyin' ? `🎧 ${this.text('pronunciation.selfPractice', '自己跟读')}` : `🎤 ${this.text('pronunciation.record', '点击录音')}`;
    }
  },

  // 处理识别结果
  handleRecognitionResult(result, attempt = this.activeAttempt, confidence) {
    if (!attempt || this.activeAttempt !== attempt || attempt.handled || attempt.error ||
      attempt.type !== this.currentType || attempt.index !== this.currentIndex || this.practiceFinished) return false;
    attempt.handled = true;
    const items = this.practices[this.currentType];
    if (!items || this.currentType === 'pinyin') return false;
    const current = items[this.currentIndex];
    const normalized = this.normalizeText(result);
    const expected = this.normalizeText(current.text);
    const score = this.calculateSimilarity(normalized, expected);
    // 无转写、无关长句或低匹配都可能来自环境杂音，不能当成孩子发音差。
    // 某些浏览器不提供 confidence（值为 0），因此只拒绝显式的低置信值。
    if (!normalized || normalized.length > Math.max(expected.length * 3, expected.length + 6) ||
      score < 50 || (typeof confidence === 'number' && confidence > 0 && confidence < 0.45)) {
      this.showRecordingError('unclear');
      return false;
    }
    this.scores.push(score);

    // 显示结果
    this.showResult(result, score);

    // 更新统计
    this.stats.totalPractices++;
    if (score >= 90) {
      this.stats.perfectScores++;
    }
    this.stats.matchedAttempts++;
    if (score === 100) this.stats.exactMatches++;
    this.stats.scoreTotal += score;
    this.stats.averageScore = Math.round(this.stats.scoreTotal / this.stats.matchedAttempts);
    this.saveStats();

    // 奖励积分
    if (score >= 60) {
      const points = Math.floor(score / 10);
      RewardSystem.addPoints(points, this.text('pronunciation.rewardReason', '跟读词语匹配'));
      this.sessionPoints += points;
    }
    return true;
  },

  normalizeText(value) {
    if (typeof value !== 'string' || value.length > 500) return '';
    return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
  },

  // 计算相似度
  calculateSimilarity(str1, str2) {
    const first = [...this.normalizeText(str1)], second = [...this.normalizeText(str2)];
    if (!first.length || !second.length) return 0;
    let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let i = 1; i <= first.length; i++) {
      const row = [i];
      for (let j = 1; j <= second.length; j++) {
        row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1));
      }
      previous = row;
    }
    return Math.round((1 - previous[second.length] / Math.max(first.length, second.length)) * 100);
  },

  // 显示结果
  showResult(userSaid, score) {
    const resultDiv = document.getElementById('practice-result');
    if (!resultDiv) return;

    let emoji, message, className;

    if (score >= 90) {
      emoji = '🌟';
      message = this.text('pronunciation.resultMatched', '识别到了目标词语！');
      className = 'excellent';
      RewardSystem.playSound('correct');
    } else if (score >= 70) {
      emoji = '😊';
      message = this.text('pronunciation.resultClose', '识别文字很接近，再听一遍、试试看！');
      className = 'good';
      RewardSystem.playSound('correct');
    } else if (score >= 50) {
      emoji = '🤔';
      message = this.text('pronunciation.resultPartial', '只识别到部分词语，再试一次吧！');
      className = 'fair';
    } else {
      emoji = '💪';
      message = this.text('pronunciation.resultPartial', '只识别到部分词语，再试一次吧！');
      className = 'need-practice';
    }

    resultDiv.innerHTML = `
      <div class="result-content ${className}">
        <div class="result-emoji">${emoji}</div>
        <div class="result-score">${score}%</div>
        <div class="result-message">${this.escapeHtml(message)}</div>
        <div class="result-said">${this.escapeHtml(this.text('pronunciation.recognizedText', '识别文字'))}: "${this.escapeHtml(userSaid)}"</div>
        <div class="practice-hint">${this.escapeHtml(this.text('pronunciation.scoreNotice', '这是文字匹配度，不是发音分数。'))}</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  },

  // 显示录音错误
  showRecordingError(reason = 'unclear') {
    const resultDiv = document.getElementById('practice-result');
    if (!resultDiv) return;

    const key = ['not-allowed', 'service-not-allowed'].includes(reason) ? 'permissionNotice' :
      reason === 'unsupported' ? 'unsupportedNotice' : reason === 'pinyin' ? 'pinyinNotice' : 'unclearNotice';
    const fallbacks = {
      permissionNotice: '麦克风没有获得允许，可以请家长在浏览器设置中开启。这次不计分。',
      unsupportedNotice: '这个浏览器不支持语音转写。可以听示范并自己跟读，不自动计分。',
      pinyinNotice: '浏览器不能可靠识别单个拼音。听示范后自己跟读，这一组不自动评分。',
      unclearNotice: '没有可靠识别到目标词语，可能是环境声音。靠近一点再试试，这次不计分。'
    };
    resultDiv.innerHTML = `
      <div class="result-content error">
        <div class="result-emoji">😅</div>
        <div class="result-message">${this.escapeHtml(this.text(`pronunciation.${key}`, fallbacks[key]))}</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  },

  // 上一题
  prevItem() {
    if (this.currentIndex > 0) {
      this.stopRecording(true);
      this.currentIndex--;
      this.renderPracticePage();
    }
  },

  // 下一题
  nextItem() {
    const items = this.practices[this.currentType];
    if (!items || this.practiceFinished) return;
    this.stopRecording(true);
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
    if (!this.currentType || this.practiceFinished) return;
    this.stopRecording(true);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.practiceFinished = true;
    const avgScore = this.scores.length > 0
      ? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length)
      : null;

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
      document.getElementById('summary-avg-score').textContent = avgScore === null ? '—' : `${avgScore}%`;
      document.getElementById('summary-count').textContent = this.scores.length;
      document.getElementById('summary-max-score').textContent = this.scores.length ? `${Math.max(...this.scores)}%` : '—';
      document.getElementById('pronunciation-reward').textContent = this.text('pronunciation.completedReward', '+{points} 积分').replace('{points}', this.sessionPoints);
      modal.classList.remove('hidden');
    }
  },

  // 返回选择
  backToSelect() {
    this.stopRecording(true);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.currentType = null;
    this.currentIndex = 0;
    this.scores = [];
    this.renderPracticeSelect();
  },

  tryAgain() {
    this.stopRecording(true);
    document.getElementById('practice-result')?.classList.add('hidden');
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
    Pronunciation.backToSelect();
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

function playDemonstration() {
  Pronunciation.playDemonstration();
}

function tryAgain() {
  Pronunciation.tryAgain();
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
