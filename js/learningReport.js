// ========== 学习报告生成模块 ==========

const LearningReport = {
  // 生成报告数据
  generateReport(period = 'week') {
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(0); // 全部时间
    }

    // 获取学习数据
    const learningData = RewardSystem.data;
    const checkinData = DailyCheckin.data;
    const achievementData = AchievementSystem.data;
    const wrongQuestionsData = WrongQuestions.data;

    // 计算各科目数据
    const subjects = {
      math: {
        name: '数学',
        icon: '🔢',
        correct: learningData.mathCorrect || 0,
        color: '#FF6B6B'
      },
      english: {
        name: '英语',
        icon: '🔤',
        correct: learningData.englishCorrect || 0,
        color: '#4ECDC4'
      },
      chinese: {
        name: '中文',
        icon: '📝',
        correct: learningData.chineseCorrect || 0,
        color: '#45B7D1'
      },
      science: {
        name: '科学',
        icon: '🔬',
        correct: learningData.scienceCorrect || 0,
        color: '#96CEB4'
      }
    };

    // 计算总答题数
    const totalCorrect = Object.values(subjects).reduce((sum, s) => sum + s.correct, 0);

    // 找出最强和最弱科目
    const subjectArray = Object.entries(subjects).map(([key, data]) => ({ key, ...data }));
    subjectArray.sort((a, b) => b.correct - a.correct);

    const strongest = subjectArray[0];
    const weakest = subjectArray.filter(s => s.correct > 0).pop() || subjectArray[subjectArray.length - 1];

    // 计算学习趋势（基于签到数据）
    const checkinDates = Object.keys(checkinData.checkins || {});
    const recentCheckins = checkinDates.filter(date => new Date(date) >= startDate).length;

    // 错题统计
    const wrongStats = WrongQuestions.getStats();

    // 生成报告
    return {
      period: period,
      periodName: period === 'week' ? '本周' : period === 'month' ? '本月' : '全部',
      generatedAt: now.toISOString(),

      // 总览
      overview: {
        totalScore: learningData.totalScore || 0,
        totalTasks: learningData.tasksDone || 0,
        totalCorrect: totalCorrect,
        currentStreak: checkinData.currentStreak || 0,
        recentCheckins: recentCheckins
      },

      // 各科目数据
      subjects: subjects,
      subjectArray: subjectArray,

      // 强弱分析
      analysis: {
        strongest: strongest,
        weakest: weakest.correct < strongest.correct ? weakest : null
      },

      // 成就
      achievements: {
        unlocked: achievementData.totalUnlocked || 0,
        total: AchievementSystem.achievements.length,
        recent: achievementData.unlocked.slice(-3)
      },

      // 错题
      wrongQuestions: {
        total: wrongStats.total,
        unmastered: wrongStats.unmastered,
        mastered: wrongStats.mastered,
        needReview: wrongStats.needReview
      },

      // 建议
      suggestions: this.generateSuggestions(subjects, wrongStats, checkinData)
    };
  },

  // 生成学习建议
  generateSuggestions(subjects, wrongStats, checkinData) {
    const suggestions = [];

    // 基于错题数量的建议
    if (wrongStats.unmastered > 5) {
      suggestions.push({
        icon: '📕',
        text: `有 ${wrongStats.unmastered} 道题需要复习，记得去错题本看看哦！`
      });
    }

    // 基于科目分布的建议
    const subjectArray = Object.entries(subjects).map(([key, data]) => ({ key, ...data }));
    const minSubject = subjectArray.reduce((min, s) => s.correct < min.correct ? s : min);
    const maxSubject = subjectArray.reduce((max, s) => s.correct > max.correct ? s : max);

    if (maxSubject.correct > 0 && minSubject.correct < maxSubject.correct / 2) {
      suggestions.push({
        icon: minSubject.icon,
        text: `${minSubject.name}可以多练习一下，你一定可以做得更好！`
      });
    }

    // 基于签到的建议
    if (checkinData.currentStreak >= 7) {
      suggestions.push({
        icon: '🌟',
        text: `已经连续签到 ${checkinData.currentStreak} 天了，继续保持！`
      });
    } else if (checkinData.currentStreak === 0) {
      suggestions.push({
        icon: '📅',
        text: '记得每天签到，可以获得额外奖励哦！'
      });
    }

    // 鼓励性建议
    if (suggestions.length === 0) {
      suggestions.push({
        icon: '💪',
        text: '你做得很棒！继续加油学习吧！'
      });
    }

    return suggestions;
  },

  // 生成报告 HTML（用于展示或分享）
  generateReportHTML(report) {
    const subjectBars = report.subjectArray.map(s => {
      const maxCorrect = Math.max(...report.subjectArray.map(x => x.correct), 1);
      const percentage = (s.correct / maxCorrect) * 100;
      return `
        <div class="report-subject-row">
          <span class="report-subject-icon">${s.icon}</span>
          <span class="report-subject-name">${s.name}</span>
          <div class="report-subject-bar">
            <div class="report-subject-fill" style="width: ${percentage}%; background: ${s.color}"></div>
          </div>
          <span class="report-subject-count">${s.correct}</span>
        </div>
      `;
    }).join('');

    const suggestionItems = report.suggestions.map(s => `
      <div class="report-suggestion-item">
        <span class="suggestion-icon">${s.icon}</span>
        <span class="suggestion-text">${s.text}</span>
      </div>
    `).join('');

    return `
      <div class="learning-report">
        <div class="report-header">
          <h2>📊 ${report.periodName}学习报告</h2>
          <p class="report-date">${new Date(report.generatedAt).toLocaleDateString('zh-CN')}</p>
        </div>

        <div class="report-overview">
          <div class="report-stat-card">
            <span class="report-stat-icon">⭐</span>
            <span class="report-stat-value">${report.overview.totalScore}</span>
            <span class="report-stat-label">总积分</span>
          </div>
          <div class="report-stat-card">
            <span class="report-stat-icon">✅</span>
            <span class="report-stat-value">${report.overview.totalCorrect}</span>
            <span class="report-stat-label">答对题数</span>
          </div>
          <div class="report-stat-card">
            <span class="report-stat-icon">🔥</span>
            <span class="report-stat-value">${report.overview.currentStreak}</span>
            <span class="report-stat-label">连续签到</span>
          </div>
          <div class="report-stat-card">
            <span class="report-stat-icon">🏆</span>
            <span class="report-stat-value">${report.achievements.unlocked}</span>
            <span class="report-stat-label">获得成就</span>
          </div>
        </div>

        <div class="report-section">
          <h3>📚 学科表现</h3>
          <div class="report-subjects">
            ${subjectBars}
          </div>
        </div>

        ${report.analysis.strongest ? `
        <div class="report-section">
          <h3>💡 学习分析</h3>
          <div class="report-analysis">
            <div class="analysis-item strongest">
              <span class="analysis-icon">${report.analysis.strongest.icon}</span>
              <span class="analysis-text">${report.analysis.strongest.name}是你的强项！</span>
            </div>
            ${report.analysis.weakest ? `
            <div class="analysis-item improve">
              <span class="analysis-icon">${report.analysis.weakest.icon}</span>
              <span class="analysis-text">${report.analysis.weakest.name}可以多多练习哦</span>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="report-section">
          <h3>📝 错题情况</h3>
          <div class="report-wrong-stats">
            <span>待复习: ${report.wrongQuestions.unmastered}</span>
            <span>已掌握: ${report.wrongQuestions.mastered}</span>
          </div>
        </div>

        <div class="report-section">
          <h3>🎯 学习建议</h3>
          <div class="report-suggestions">
            ${suggestionItems}
          </div>
        </div>

        <div class="report-footer">
          <p>继续加油，你是最棒的！💪</p>
        </div>
      </div>
    `;
  },

  // 生成分享图片数据
  generateShareData(report) {
    return {
      title: `${report.periodName}学习报告`,
      content: `
🌟 积分: ${report.overview.totalScore}
✅ 答对: ${report.overview.totalCorrect} 题
🔥 连续签到: ${report.overview.currentStreak} 天
🏆 获得成就: ${report.achievements.unlocked} 个

最强科目: ${report.analysis.strongest?.name || '继续努力'}

#宝贝学习乐园 #学习报告
      `.trim()
    };
  }
};

// 显示学习报告页面
function showLearningReport(period = 'week') {
  const modal = document.getElementById('learning-report-modal');
  if (!modal) return;

  const report = LearningReport.generateReport(period);
  const reportHTML = LearningReport.generateReportHTML(report);

  document.getElementById('learning-report-content').innerHTML = reportHTML;

  // 更新周期选择按钮
  document.querySelectorAll('.report-period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });

  modal.classList.remove('hidden');
}

// 关闭学习报告
function closeLearningReport() {
  document.getElementById('learning-report-modal').classList.add('hidden');
}

// 切换报告周期
function changeReportPeriod(period) {
  showLearningReport(period);
}

// 分享报告
function shareReport() {
  const report = LearningReport.generateReport('week');
  const shareData = LearningReport.generateShareData(report);

  // 尝试使用 Web Share API
  if (navigator.share) {
    navigator.share({
      title: shareData.title,
      text: shareData.content
    }).catch(() => {
      // 用户取消或不支持
      copyReportToClipboard(shareData.content);
    });
  } else {
    // 不支持 Web Share API，复制到剪贴板
    copyReportToClipboard(shareData.content);
  }
}

// 复制报告到剪贴板
function copyReportToClipboard(content) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(content).then(() => {
      alert('报告已复制到剪贴板！');
    }).catch(() => {
      fallbackCopyToClipboard(content);
    });
  } else {
    fallbackCopyToClipboard(content);
  }
}

// 降级复制方法
function fallbackCopyToClipboard(content) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    alert('报告已复制到剪贴板！');
  } catch (err) {
    alert('复制失败，请手动复制');
  }

  document.body.removeChild(textarea);
}
