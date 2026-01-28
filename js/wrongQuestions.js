// ========== 错题本系统 ==========

const WrongQuestions = {
  // 数据存储
  data: {
    questions: [],        // 错题列表
    totalWrong: 0,        // 累计错题数
    masteredCount: 0,     // 已掌握数
    reviewCount: 0        // 复习次数
  },

  // 初始化
  init() {
    this.loadData();
  },

  // 从本地存储加载数据
  loadData() {
    const saved = localStorage.getItem('kidsWrongQuestions');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.data = { ...this.data, ...parsed };
    }
  },

  // 保存数据到本地存储
  saveData() {
    localStorage.setItem('kidsWrongQuestions', JSON.stringify(this.data));
  },

  // 添加错题
  addWrongQuestion(type, questionData) {
    // 检查是否已存在
    const existingIndex = this.data.questions.findIndex(
      q => q.type === type && q.questionId === questionData.questionId
    );

    if (existingIndex >= 0) {
      // 已存在，增加错误次数
      this.data.questions[existingIndex].wrongTimes++;
      this.data.questions[existingIndex].lastWrongTime = new Date().toISOString();
      this.data.questions[existingIndex].userAnswers.push(questionData.userAnswer);
    } else {
      // 新错题
      const wrongQuestion = {
        id: Date.now().toString(),
        type: type,                           // math | english | chinese | science
        questionId: questionData.questionId,  // 原始题目ID
        question: questionData.question,      // 题目内容
        options: questionData.options,        // 选项
        correctAnswer: questionData.correctAnswer,  // 正确答案
        userAnswers: [questionData.userAnswer],     // 用户答案记录
        wrongTimes: 1,                        // 错误次数
        reviewTimes: 0,                       // 复习次数
        mastered: false,                      // 是否已掌握
        firstWrongTime: new Date().toISOString(),
        lastWrongTime: new Date().toISOString(),
        lastReviewTime: null,
        // 额外信息（用于展示）
        extra: questionData.extra || {}       // 如：英语单词的emoji、中文的拼音等
      };

      this.data.questions.unshift(wrongQuestion);  // 新题放最前面
      this.data.totalWrong++;
    }

    this.saveData();
  },

  // 从错题本移除（答对后）
  markAsMastered(questionId) {
    const question = this.data.questions.find(q => q.id === questionId);
    if (question && !question.mastered) {
      question.mastered = true;
      question.masteredTime = new Date().toISOString();
      this.data.masteredCount++;
      this.saveData();

      // 通知成就系统
      if (typeof AchievementSystem !== 'undefined') {
        AchievementSystem.recordMastered();
      }

      return true;
    }
    return false;
  },

  // 记录复习
  recordReview(questionId) {
    const question = this.data.questions.find(q => q.id === questionId);
    if (question) {
      question.reviewTimes++;
      question.lastReviewTime = new Date().toISOString();
      this.data.reviewCount++;
      this.saveData();
    }
  },

  // 获取未掌握的错题
  getUnmastered() {
    return this.data.questions.filter(q => !q.mastered);
  },

  // 获取已掌握的错题
  getMastered() {
    return this.data.questions.filter(q => q.mastered);
  },

  // 按类型获取错题
  getByType(type) {
    return this.data.questions.filter(q => q.type === type && !q.mastered);
  },

  // 获取需要复习的题目（基于艾宾浩斯遗忘曲线）
  getNeedReview() {
    const now = new Date();
    const reviewIntervals = [1, 3, 7, 15, 30]; // 复习间隔（天）

    return this.data.questions.filter(q => {
      if (q.mastered) return false;

      const lastTime = q.lastReviewTime || q.lastWrongTime;
      const lastDate = new Date(lastTime);
      const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

      // 根据复习次数确定下次复习间隔
      const intervalIndex = Math.min(q.reviewTimes, reviewIntervals.length - 1);
      const nextInterval = reviewIntervals[intervalIndex];

      return daysPassed >= nextInterval;
    });
  },

  // 获取统计数据
  getStats() {
    const unmastered = this.getUnmastered();
    const needReview = this.getNeedReview();

    const statsByType = {
      math: this.getByType('math').length,
      english: this.getByType('english').length,
      chinese: this.getByType('chinese').length,
      science: this.getByType('science').length
    };

    return {
      total: this.data.questions.length,
      unmastered: unmastered.length,
      mastered: this.data.masteredCount,
      needReview: needReview.length,
      byType: statsByType,
      reviewCount: this.data.reviewCount
    };
  },

  // 删除错题
  deleteQuestion(questionId) {
    const index = this.data.questions.findIndex(q => q.id === questionId);
    if (index >= 0) {
      this.data.questions.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  },

  // 清空已掌握的题目
  clearMastered() {
    this.data.questions = this.data.questions.filter(q => !q.mastered);
    this.saveData();
  },

  // 重置数据
  reset() {
    this.data = {
      questions: [],
      totalWrong: 0,
      masteredCount: 0,
      reviewCount: 0
    };
    this.saveData();
  }
};

// 当前复习状态
let currentReviewQuestion = null;
let currentReviewIndex = 0;
let reviewQuestions = [];

// 显示错题本
function showWrongQuestions() {
  const modal = document.getElementById('wrong-questions-modal');
  if (!modal) return;

  // 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('wrongQuestions');
  }

  renderWrongQuestionsList();
  modal.classList.remove('hidden');
}

// 关闭错题本
function closeWrongQuestions() {
  document.getElementById('wrong-questions-modal').classList.add('hidden');
}

// 渲染错题列表
function renderWrongQuestionsList(filterType = 'all') {
  const container = document.getElementById('wrong-questions-list');
  if (!container) return;

  const stats = WrongQuestions.getStats();
  let html = '';

  // 统计信息
  html += `
    <div class="wrong-questions-stats">
      <div class="wq-stat">
        <span class="wq-stat-number">${stats.unmastered}</span>
        <span class="wq-stat-label">待复习</span>
      </div>
      <div class="wq-stat">
        <span class="wq-stat-number">${stats.mastered}</span>
        <span class="wq-stat-label">已掌握</span>
      </div>
      <div class="wq-stat">
        <span class="wq-stat-number">${stats.needReview}</span>
        <span class="wq-stat-label">今日复习</span>
      </div>
    </div>
  `;

  // 快速复习按钮
  if (stats.unmastered > 0) {
    html += `
      <div class="wq-actions">
        <button class="btn-review-all" onclick="startReviewSession()">
          📖 开始复习 (${stats.unmastered}题)
        </button>
      </div>
    `;
  }

  // 分类筛选
  html += `
    <div class="wq-filter-tabs">
      <button class="wq-filter-btn ${filterType === 'all' ? 'active' : ''}" onclick="renderWrongQuestionsList('all')">
        全部 (${stats.unmastered})
      </button>
      <button class="wq-filter-btn ${filterType === 'math' ? 'active' : ''}" onclick="renderWrongQuestionsList('math')">
        🔢 数学 (${stats.byType.math})
      </button>
      <button class="wq-filter-btn ${filterType === 'english' ? 'active' : ''}" onclick="renderWrongQuestionsList('english')">
        🔤 英语 (${stats.byType.english})
      </button>
      <button class="wq-filter-btn ${filterType === 'chinese' ? 'active' : ''}" onclick="renderWrongQuestionsList('chinese')">
        📝 中文 (${stats.byType.chinese})
      </button>
      <button class="wq-filter-btn ${filterType === 'science' ? 'active' : ''}" onclick="renderWrongQuestionsList('science')">
        🔬 科学 (${stats.byType.science})
      </button>
    </div>
  `;

  // 错题列表
  const questions = filterType === 'all'
    ? WrongQuestions.getUnmastered()
    : WrongQuestions.getByType(filterType);

  if (questions.length === 0) {
    html += `
      <div class="wq-empty">
        <div class="wq-empty-icon">🎉</div>
        <div class="wq-empty-text">太棒了！没有错题</div>
        <div class="wq-empty-subtext">继续加油学习吧！</div>
      </div>
    `;
  } else {
    html += `<div class="wq-list">`;

    questions.forEach(q => {
      const typeIcon = {
        math: '🔢',
        english: '🔤',
        chinese: '📝',
        science: '🔬'
      }[q.type] || '📚';

      const typeName = {
        math: '数学',
        english: '英语',
        chinese: '中文',
        science: '科学'
      }[q.type] || '其他';

      html += `
        <div class="wq-item" onclick="showWrongQuestionDetail('${q.id}')">
          <div class="wq-item-icon">${typeIcon}</div>
          <div class="wq-item-content">
            <div class="wq-item-question">${q.question}</div>
            <div class="wq-item-meta">
              <span class="wq-item-type">${typeName}</span>
              <span class="wq-item-times">错${q.wrongTimes}次</span>
              ${q.reviewTimes > 0 ? `<span class="wq-item-reviewed">复习${q.reviewTimes}次</span>` : ''}
            </div>
          </div>
          <div class="wq-item-arrow">›</div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}

// 显示错题详情
function showWrongQuestionDetail(questionId) {
  const question = WrongQuestions.data.questions.find(q => q.id === questionId);
  if (!question) return;

  const modal = document.getElementById('wrong-question-detail-modal');
  if (!modal) return;

  const typeIcon = {
    math: '🔢',
    english: '🔤',
    chinese: '📝',
    science: '🔬'
  }[question.type] || '📚';

  let html = `
    <div class="wqd-header">
      <span class="wqd-type">${typeIcon}</span>
      <span class="wqd-times">错误 ${question.wrongTimes} 次</span>
    </div>
    <div class="wqd-question">${question.question}</div>
  `;

  // 显示选项
  if (question.options && question.options.length > 0) {
    html += `<div class="wqd-options">`;
    question.options.forEach(opt => {
      const isCorrect = opt === question.correctAnswer;
      const isWrong = question.userAnswers.includes(opt) && !isCorrect;
      let optClass = '';
      if (isCorrect) optClass = 'correct';
      else if (isWrong) optClass = 'wrong';

      html += `
        <div class="wqd-option ${optClass}">
          ${opt}
          ${isCorrect ? ' ✓' : ''}
          ${isWrong ? ' ✗' : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  // 正确答案
  html += `
    <div class="wqd-answer">
      <div class="wqd-answer-label">正确答案</div>
      <div class="wqd-answer-value">${question.correctAnswer}</div>
    </div>
  `;

  // 操作按钮
  html += `
    <div class="wqd-actions">
      <button class="btn-review-single" onclick="reviewSingleQuestion('${question.id}')">
        📝 做一遍
      </button>
      <button class="btn-mark-mastered" onclick="markQuestionMastered('${question.id}')">
        ✅ 我会了
      </button>
    </div>
  `;

  document.getElementById('wrong-question-detail-content').innerHTML = html;
  modal.classList.remove('hidden');

  // 记录复习
  WrongQuestions.recordReview(questionId);
}

// 关闭错题详情
function closeWrongQuestionDetail() {
  document.getElementById('wrong-question-detail-modal').classList.add('hidden');
}

// 标记为已掌握
function markQuestionMastered(questionId) {
  if (WrongQuestions.markAsMastered(questionId)) {
    closeWrongQuestionDetail();
    renderWrongQuestionsList();

    // 显示提示
    RewardSystem.showReward(5, '太棒了！又掌握一道题！');
  }
}

// 开始复习会话
function startReviewSession() {
  reviewQuestions = WrongQuestions.getUnmastered();
  if (reviewQuestions.length === 0) return;

  currentReviewIndex = 0;
  closeWrongQuestions();
  showReviewQuestion();
}

// 显示复习题目
function showReviewQuestion() {
  if (currentReviewIndex >= reviewQuestions.length) {
    // 复习完成
    showReviewComplete();
    return;
  }

  const question = reviewQuestions[currentReviewIndex];
  currentReviewQuestion = question;

  const modal = document.getElementById('review-question-modal');
  if (!modal) return;

  const typeIcon = {
    math: '🔢',
    english: '🔤',
    chinese: '📝',
    science: '🔬'
  }[question.type] || '📚';

  let html = `
    <div class="review-progress">
      <span>第 ${currentReviewIndex + 1} / ${reviewQuestions.length} 题</span>
    </div>
    <div class="review-type">${typeIcon}</div>
    <div class="review-question">${question.question}</div>
    <div class="review-options" id="review-options">
  `;

  // 打乱选项顺序
  const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);

  shuffledOptions.forEach(opt => {
    html += `
      <button class="review-option-btn" onclick="checkReviewAnswer(this, '${opt.replace(/'/g, "\\'")}', '${question.correctAnswer.replace(/'/g, "\\'")}')">
        ${opt}
      </button>
    `;
  });

  html += `</div>`;

  document.getElementById('review-question-content').innerHTML = html;
  modal.classList.remove('hidden');

  // 记录复习
  WrongQuestions.recordReview(question.id);
}

// 检查复习答案
function checkReviewAnswer(btn, answer, correctAnswer) {
  const optionsContainer = document.getElementById('review-options');
  const buttons = optionsContainer.querySelectorAll('.review-option-btn');

  // 禁用所有按钮
  buttons.forEach(b => b.disabled = true);

  if (answer === correctAnswer) {
    // 答对了
    btn.classList.add('correct');
    RewardSystem.playSound('correct');

    // 如果连续答对（复习次数>=2），标记为掌握
    if (currentReviewQuestion.reviewTimes >= 2) {
      WrongQuestions.markAsMastered(currentReviewQuestion.id);
    }

    setTimeout(() => {
      currentReviewIndex++;
      showReviewQuestion();
    }, 1000);
  } else {
    // 答错了
    btn.classList.add('wrong');
    // 显示正确答案
    buttons.forEach(b => {
      if (b.textContent.trim() === correctAnswer) {
        b.classList.add('correct');
      }
    });
    RewardSystem.playSound('wrong');

    setTimeout(() => {
      currentReviewIndex++;
      showReviewQuestion();
    }, 1500);
  }
}

// 显示复习完成
function showReviewComplete() {
  const modal = document.getElementById('review-question-modal');
  if (!modal) return;

  const html = `
    <div class="review-complete">
      <div class="review-complete-icon">🎉</div>
      <div class="review-complete-title">复习完成！</div>
      <div class="review-complete-text">你复习了 ${reviewQuestions.length} 道题</div>
      <button class="btn-review-done" onclick="closeReviewQuestion()">太棒了！</button>
    </div>
  `;

  document.getElementById('review-question-content').innerHTML = html;
  RewardSystem.playSound('complete');
  RewardSystem.createParticles();
}

// 关闭复习弹窗
function closeReviewQuestion() {
  document.getElementById('review-question-modal').classList.add('hidden');
  currentReviewQuestion = null;
  reviewQuestions = [];
  currentReviewIndex = 0;
}

// 复习单个题目
function reviewSingleQuestion(questionId) {
  const question = WrongQuestions.data.questions.find(q => q.id === questionId);
  if (!question) return;

  reviewQuestions = [question];
  currentReviewIndex = 0;
  closeWrongQuestionDetail();
  closeWrongQuestions();
  showReviewQuestion();
}
