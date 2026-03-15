// 英语提升乐园 - 主逻辑
// 针对 WIDA 评估：听说、词汇、阅读基础（自然拼读+高频词）、造句写作

const EnglishBoost = {
  // 当前状态
  currentMode: null, // 'ispy', 'sightwords', 'phonics', 'sentences'
  currentRound: 0,
  score: 0,
  totalRounds: 0,

  // I Spy 状态
  ispy: {
    currentRound: null,
    clueIndex: 0,
    rounds: [],
    roundNum: 0,
    totalRounds: 5
  },

  // Sight Words 状态
  sightwords: {
    currentLevel: 'prePrimer',
    currentIndex: 0,
    words: [],
    mode: 'learn', // 'learn', 'quiz', 'spell'
    quizCorrect: 0,
    quizTotal: 0
  },

  // Phonics 状态
  phonics: {
    currentTab: 'letters', // 'letters', 'rhyming'
    currentLetterIndex: 0,
    currentFamilyIndex: 0,
    rhymingQuiz: null
  },

  // Sentence Builder 状态
  sentences: {
    currentTab: 'build', // 'build', 'expand', 'starters'
    currentIndex: 0,
    dragWords: [],
    placedWords: [],
    expandInput: ''
  },

  // 统计数据
  stats: {
    ispyPlayed: 0,
    ispyCorrect: 0,
    sightwordsLearned: [],
    sightwordsQuizCorrect: 0,
    phonicsLettersViewed: [],
    phonicsRhymingCorrect: 0,
    sentencesBuilt: 0,
    sentencesExpanded: 0,
    totalScore: 0
  },

  // ========== 初始化 ==========
  init() {
    this.loadStats();
  },

  loadStats() {
    const saved = localStorage.getItem('kidsEnglishBoost');
    if (saved) {
      try {
        this.stats = { ...this.stats, ...JSON.parse(saved) };
      } catch (e) { /* ignore */ }
    }
  },

  saveStats() {
    localStorage.setItem('kidsEnglishBoost', JSON.stringify(this.stats));
  },

  // ========== 主界面 ==========
  show() {
    const modal = document.getElementById('english-boost-modal');
    if (!modal) return;
    RecentlyUsed.track('englishBoost');
    this.init();
    this.showSelect();
    modal.classList.remove('hidden');
  },

  close() {
    const modal = document.getElementById('english-boost-modal');
    if (modal) modal.classList.add('hidden');
    this.stopSpeaking();
  },

  showSelect() {
    const content = document.getElementById('english-boost-content');
    if (!content) return;

    content.innerHTML = `
      <div class="eb-select">
        <h3 class="eb-select-title">🌟 ${I18n.t('eb.selectTitle', 'English Boost')}</h3>
        <p class="eb-select-subtitle">${I18n.t('eb.selectSubtitle', 'Choose a fun activity!')}</p>

        <div class="eb-mode-grid">
          <div class="eb-mode-card eb-mode-ispy" onclick="EnglishBoost.startISpy()">
            <div class="eb-mode-icon">🔍</div>
            <div class="eb-mode-name">${I18n.t('eb.ispy', 'I Spy')}</div>
            <div class="eb-mode-desc">${I18n.t('eb.ispyDesc', 'Listen to clues, guess the answer!')}</div>
            <div class="eb-mode-badge">${I18n.t('eb.listening', 'Listening')}</div>
          </div>

          <div class="eb-mode-card eb-mode-sight" onclick="EnglishBoost.startSightWords()">
            <div class="eb-mode-icon">📖</div>
            <div class="eb-mode-name">${I18n.t('eb.sightwords', 'Sight Words')}</div>
            <div class="eb-mode-desc">${I18n.t('eb.sightwordsDesc', 'Learn important words by sight!')}</div>
            <div class="eb-mode-badge">${I18n.t('eb.reading', 'Reading')}</div>
          </div>

          <div class="eb-mode-card eb-mode-phonics" onclick="EnglishBoost.startPhonics()">
            <div class="eb-mode-icon">🔤</div>
            <div class="eb-mode-name">${I18n.t('eb.phonics', 'Phonics')}</div>
            <div class="eb-mode-desc">${I18n.t('eb.phonicsDesc', 'Learn letter sounds & rhyming!')}</div>
            <div class="eb-mode-badge">${I18n.t('eb.reading', 'Reading')}</div>
          </div>

          <div class="eb-mode-card eb-mode-sentence" onclick="EnglishBoost.startSentences()">
            <div class="eb-mode-icon">✍️</div>
            <div class="eb-mode-name">${I18n.t('eb.sentences', 'Sentence Builder')}</div>
            <div class="eb-mode-desc">${I18n.t('eb.sentencesDesc', 'Build and expand sentences!')}</div>
            <div class="eb-mode-badge">${I18n.t('eb.writing', 'Writing')}</div>
          </div>
        </div>

        <div class="eb-stats-bar">
          <span>⭐ ${this.stats.totalScore}</span>
          <span>🔍 ${this.stats.ispyCorrect}</span>
          <span>📖 ${this.stats.sightwordsLearned.length}</span>
          <span>✍️ ${this.stats.sentencesBuilt}</span>
        </div>
      </div>
    `;
  },

  // ========== TTS 语音辅助 ==========
  speak(text, lang = 'en-US', rate = 0.8) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      speechSynthesis.speak(utterance);
    }
  },

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  },

  // ========== 1. I Spy 猜猜看 ==========
  startISpy() {
    this.currentMode = 'ispy';
    // 随机选 5 轮
    const all = [...EnglishBoostData.iSpyRounds];
    this.shuffleArray(all);
    this.ispy.rounds = all.slice(0, this.ispy.totalRounds);
    this.ispy.roundNum = 0;
    this.ispy.clueIndex = 0;
    this.score = 0;
    this.showISpyRound();
  },

  showISpyRound() {
    if (this.ispy.roundNum >= this.ispy.rounds.length) {
      this.showISpyComplete();
      return;
    }

    const round = this.ispy.rounds[this.ispy.roundNum];
    this.ispy.currentRound = round;
    this.ispy.clueIndex = 0;

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSelect()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">🔍 I Spy</span>
        <span class="eb-round-info">${this.ispy.roundNum + 1}/${this.ispy.rounds.length}</span>
      </div>

      <div class="eb-ispy-area">
        <div class="eb-ispy-bubble">
          <div class="eb-ispy-detective">🕵️</div>
          <div class="eb-ispy-clue" id="ispy-clue-text">
            ${I18n.t('eb.ispyStart', 'I spy something...')}
          </div>
          <button class="eb-btn-listen" onclick="EnglishBoost.playISpyClue()">
            🔊 ${I18n.t('eb.hearClue', 'Hear Clue')}
          </button>
        </div>

        <div class="eb-ispy-progress">
          ${round.clues.map((_, i) => `<div class="eb-clue-dot" id="clue-dot-${i}"></div>`).join('')}
        </div>

        <div class="eb-ispy-options" id="ispy-options">
          ${round.options.map(opt => `
            <button class="eb-ispy-option" onclick="EnglishBoost.checkISpyAnswer('${opt.word}')">
              <span class="eb-ispy-opt-img">${opt.image}</span>
              <span class="eb-ispy-opt-word">${opt.word}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // 自动播放第一条线索
    setTimeout(() => this.playISpyClue(), 500);
  },

  playISpyClue() {
    const round = this.ispy.currentRound;
    if (!round) return;

    // 显示当前线索
    const clueText = document.getElementById('ispy-clue-text');
    const currentClue = round.clues[this.ispy.clueIndex];
    clueText.textContent = currentClue;

    // 标记进度点
    for (let i = 0; i <= this.ispy.clueIndex; i++) {
      const dot = document.getElementById(`clue-dot-${i}`);
      if (dot) dot.classList.add('active');
    }

    // 朗读线索
    this.speak(currentClue, 'en-US', 0.7);

    // 准备下一条线索
    if (this.ispy.clueIndex < round.clues.length - 1) {
      this.ispy.clueIndex++;
    }
  },

  checkISpyAnswer(word) {
    const round = this.ispy.currentRound;
    const optionsEl = document.getElementById('ispy-options');
    const buttons = optionsEl.querySelectorAll('.eb-ispy-option');

    if (word === round.answer) {
      // 正确
      buttons.forEach(btn => {
        if (btn.textContent.includes(word)) {
          btn.classList.add('correct');
        }
        btn.disabled = true;
      });

      this.score += 10;
      this.stats.ispyCorrect++;
      this.stats.totalScore += 10;
      this.saveStats();

      RewardSystem.addPoints(10, I18n.t('eb.ispyCorrect', 'I Spy correct!'));
      this.speak('Great job! That is right!', 'en-US', 0.9);

      setTimeout(() => {
        this.ispy.roundNum++;
        this.showISpyRound();
      }, 2000);
    } else {
      // 错误 - 给更多线索
      buttons.forEach(btn => {
        if (btn.textContent.includes(word)) {
          btn.classList.add('wrong');
          btn.disabled = true;
          setTimeout(() => btn.classList.remove('wrong'), 600);
        }
      });

      this.speak('Not quite! Listen to another clue.', 'en-US', 0.8);
      // 自动播放下一条线索
      setTimeout(() => this.playISpyClue(), 1500);
    }
  },

  showISpyComplete() {
    this.stats.ispyPlayed++;
    this.saveStats();

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-complete">
        <div class="eb-complete-icon">🎉</div>
        <h3>${I18n.t('eb.ispyComplete', 'I Spy Complete!')}</h3>
        <p>${I18n.t('eb.youGot', 'You got')} ${this.stats.ispyCorrect} ${I18n.t('eb.correct', 'correct')}!</p>
        <div class="eb-complete-stars">
          ${'⭐'.repeat(Math.min(5, Math.ceil(this.score / 10)))}
        </div>
        <div class="eb-complete-btns">
          <button class="eb-btn-primary" onclick="EnglishBoost.startISpy()">
            🔄 ${I18n.t('eb.playAgain', 'Play Again')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.showSelect()">
            ← ${I18n.t('eb.backToMenu', 'Back to Menu')}
          </button>
        </div>
      </div>
    `;

    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('english_boost_ispy_complete', { score: this.score });
    }
  },

  // ========== 2. Sight Words 高频词 ==========
  startSightWords() {
    this.currentMode = 'sightwords';
    this.showSightWordsMenu();
  },

  showSightWordsMenu() {
    const content = document.getElementById('english-boost-content');
    const ppLearned = this.stats.sightwordsLearned.filter(w =>
      EnglishBoostData.sightWords.prePrimer.some(sw => sw.word === w)
    ).length;
    const pLearned = this.stats.sightwordsLearned.filter(w =>
      EnglishBoostData.sightWords.primer.some(sw => sw.word === w)
    ).length;

    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSelect()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">📖 ${I18n.t('eb.sightwords', 'Sight Words')}</span>
        <span></span>
      </div>

      <div class="eb-sw-menu">
        <div class="eb-sw-level-card" onclick="EnglishBoost.startSightWordsLevel('prePrimer')">
          <div class="eb-sw-level-icon">🌱</div>
          <div class="eb-sw-level-name">${I18n.t('eb.prePrimer', 'Pre-Primer')}</div>
          <div class="eb-sw-level-count">${ppLearned}/${EnglishBoostData.sightWords.prePrimer.length} ${I18n.t('eb.learned', 'learned')}</div>
          <div class="eb-sw-level-bar">
            <div class="eb-sw-level-fill" style="width: ${(ppLearned / EnglishBoostData.sightWords.prePrimer.length) * 100}%"></div>
          </div>
        </div>

        <div class="eb-sw-level-card" onclick="EnglishBoost.startSightWordsLevel('primer')">
          <div class="eb-sw-level-icon">🌿</div>
          <div class="eb-sw-level-name">${I18n.t('eb.primer', 'Primer')}</div>
          <div class="eb-sw-level-count">${pLearned}/${EnglishBoostData.sightWords.primer.length} ${I18n.t('eb.learned', 'learned')}</div>
          <div class="eb-sw-level-bar">
            <div class="eb-sw-level-fill" style="width: ${(pLearned / EnglishBoostData.sightWords.primer.length) * 100}%"></div>
          </div>
        </div>

        <div class="eb-sw-mode-btns">
          <button class="eb-btn-secondary" onclick="EnglishBoost.startSightWordsQuiz()">
            📝 ${I18n.t('eb.quiz', 'Quiz Mode')}
          </button>
        </div>
      </div>
    `;
  },

  startSightWordsLevel(level) {
    this.sightwords.currentLevel = level;
    this.sightwords.currentIndex = 0;
    this.sightwords.words = [...EnglishBoostData.sightWords[level]];
    this.sightwords.mode = 'learn';
    this.showSightWordCard();
  },

  showSightWordCard() {
    const sw = this.sightwords;
    if (sw.currentIndex >= sw.words.length) {
      sw.currentIndex = 0;
    }

    const word = sw.words[sw.currentIndex];
    const isLearned = this.stats.sightwordsLearned.includes(word.word);

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSightWordsMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">📖 ${I18n.t('eb.sightwords', 'Sight Words')}</span>
        <span class="eb-round-info">${sw.currentIndex + 1}/${sw.words.length}</span>
      </div>

      <div class="eb-sw-card-area">
        <div class="eb-sw-flashcard ${isLearned ? 'eb-sw-learned' : ''}">
          <div class="eb-sw-big-word" id="sw-word">${word.word}</div>
          <div class="eb-sw-sentence">"${word.sentence}"</div>
          <button class="eb-btn-listen" onclick="EnglishBoost.speakSightWord()">
            🔊 ${I18n.t('eb.listen', 'Listen')}
          </button>
        </div>

        <div class="eb-sw-actions">
          <button class="eb-btn-secondary" onclick="EnglishBoost.prevSightWord()">
            ⬅️ ${I18n.t('eb.prev', 'Previous')}
          </button>
          <button class="eb-btn-primary eb-btn-star ${isLearned ? 'active' : ''}" onclick="EnglishBoost.markSightWordLearned('${word.word}')">
            ${isLearned ? '⭐' : '☆'} ${isLearned ? I18n.t('eb.learned', 'Learned') : I18n.t('eb.markLearned', 'I Know This!')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.nextSightWord()">
            ➡️ ${I18n.t('eb.next', 'Next')}
          </button>
        </div>
      </div>
    `;

    // 自动朗读
    setTimeout(() => this.speakSightWord(), 300);
  },

  speakSightWord() {
    const word = this.sightwords.words[this.sightwords.currentIndex];
    if (word) {
      this.speak(word.word, 'en-US', 0.6);
      // 朗读后读句子
      setTimeout(() => {
        this.speak(word.sentence, 'en-US', 0.7);
      }, 1000);
    }
  },

  prevSightWord() {
    if (this.sightwords.currentIndex > 0) {
      this.sightwords.currentIndex--;
      this.showSightWordCard();
    }
  },

  nextSightWord() {
    if (this.sightwords.currentIndex < this.sightwords.words.length - 1) {
      this.sightwords.currentIndex++;
      this.showSightWordCard();
    }
  },

  markSightWordLearned(word) {
    if (!this.stats.sightwordsLearned.includes(word)) {
      this.stats.sightwordsLearned.push(word);
      this.stats.totalScore += 5;
      this.saveStats();
      RewardSystem.addPoints(5, I18n.t('eb.wordLearned', 'New word learned!'));
    }
    this.showSightWordCard();
  },

  // Sight Words 测验模式
  startSightWordsQuiz() {
    this.sightwords.mode = 'quiz';
    this.sightwords.quizCorrect = 0;
    this.sightwords.quizTotal = 0;

    // 从所有级别混合出题
    const allWords = [
      ...EnglishBoostData.sightWords.prePrimer,
      ...EnglishBoostData.sightWords.primer
    ];
    this.shuffleArray(allWords);
    this.sightwords.words = allWords.slice(0, 10);
    this.sightwords.currentIndex = 0;
    this.showSightWordsQuizQuestion();
  },

  showSightWordsQuizQuestion() {
    const sw = this.sightwords;
    if (sw.currentIndex >= sw.words.length) {
      this.showSightWordsQuizComplete();
      return;
    }

    const word = sw.words[sw.currentIndex];
    // 生成 4 个选项（包含正确答案）
    const allWords = [
      ...EnglishBoostData.sightWords.prePrimer,
      ...EnglishBoostData.sightWords.primer
    ];
    const options = [word.word];
    while (options.length < 4) {
      const r = allWords[Math.floor(Math.random() * allWords.length)].word;
      if (!options.includes(r)) options.push(r);
    }
    this.shuffleArray(options);

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSightWordsMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">📝 ${I18n.t('eb.quiz', 'Quiz')}</span>
        <span class="eb-round-info">${sw.currentIndex + 1}/${sw.words.length}</span>
      </div>

      <div class="eb-sw-quiz">
        <p class="eb-quiz-prompt">🔊 ${I18n.t('eb.listenAndFind', 'Listen and find the word!')}</p>
        <button class="eb-btn-listen eb-btn-big-listen" onclick="EnglishBoost.speak('${word.word}', 'en-US', 0.6)">
          🔊 ${I18n.t('eb.playWord', 'Play Word')}
        </button>
        <div class="eb-quiz-options">
          ${options.map(opt => `
            <button class="eb-quiz-option" onclick="EnglishBoost.checkSightWordQuiz('${opt}', '${word.word}', this)">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // 自动播放
    setTimeout(() => this.speak(word.word, 'en-US', 0.6), 500);
  },

  checkSightWordQuiz(selected, correct, btn) {
    const buttons = document.querySelectorAll('.eb-quiz-option');
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
      btn.classList.add('correct');
      this.sightwords.quizCorrect++;
      this.stats.sightwordsQuizCorrect++;
      this.stats.totalScore += 5;
      this.saveStats();
      RewardSystem.playSound('correct');
    } else {
      btn.classList.add('wrong');
      // 高亮正确答案
      buttons.forEach(b => {
        if (b.textContent.trim() === correct) b.classList.add('correct');
      });
      RewardSystem.playSound('wrong');
    }

    this.sightwords.quizTotal++;
    this.sightwords.currentIndex++;

    setTimeout(() => {
      this.showSightWordsQuizQuestion();
    }, 1500);
  },

  showSightWordsQuizComplete() {
    const correct = this.sightwords.quizCorrect;
    const total = this.sightwords.quizTotal;
    this.saveStats();

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-complete">
        <div class="eb-complete-icon">🎉</div>
        <h3>${I18n.t('eb.quizComplete', 'Quiz Complete!')}</h3>
        <p>${correct}/${total} ${I18n.t('eb.correct', 'correct')}!</p>
        <div class="eb-complete-stars">
          ${'⭐'.repeat(Math.min(5, Math.ceil(correct / 2)))}
        </div>
        <div class="eb-complete-btns">
          <button class="eb-btn-primary" onclick="EnglishBoost.startSightWordsQuiz()">
            🔄 ${I18n.t('eb.tryAgain', 'Try Again')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.showSightWordsMenu()">
            ← ${I18n.t('eb.backToMenu', 'Back to Menu')}
          </button>
        </div>
      </div>
    `;

    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('english_boost_sightwords_quiz', { correct, total });
    }
  },

  // ========== 3. Phonics 自然拼读 ==========
  startPhonics() {
    this.currentMode = 'phonics';
    this.showPhonicsMenu();
  },

  showPhonicsMenu() {
    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSelect()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">🔤 ${I18n.t('eb.phonics', 'Phonics')}</span>
        <span></span>
      </div>

      <div class="eb-phonics-menu">
        <div class="eb-phonics-tab-btns">
          <button class="eb-tab-btn active" onclick="EnglishBoost.showPhonicsLetters()">
            🔡 ${I18n.t('eb.letterSounds', 'Letter Sounds')}
          </button>
          <button class="eb-tab-btn" onclick="EnglishBoost.showPhonicsRhyming()">
            🎵 ${I18n.t('eb.rhyming', 'Rhyming Words')}
          </button>
        </div>
        <div id="phonics-content"></div>
      </div>
    `;

    this.showPhonicsLetters();
  },

  showPhonicsLetters() {
    // 更新标签样式
    const tabs = document.querySelectorAll('.eb-tab-btn');
    tabs.forEach((t, i) => t.classList.toggle('active', i === 0));

    const phonicsContent = document.getElementById('phonics-content');
    const letters = EnglishBoostData.phonics.letterSounds;

    phonicsContent.innerHTML = `
      <div class="eb-letter-grid">
        ${letters.map((l, i) => `
          <button class="eb-letter-btn ${this.stats.phonicsLettersViewed.includes(l.letter) ? 'viewed' : ''}"
                  onclick="EnglishBoost.showLetterDetail(${i})">
            ${l.letter}
          </button>
        `).join('')}
      </div>
    `;
  },

  showLetterDetail(index) {
    const letter = EnglishBoostData.phonics.letterSounds[index];
    this.phonics.currentLetterIndex = index;

    // 标记为已查看
    if (!this.stats.phonicsLettersViewed.includes(letter.letter)) {
      this.stats.phonicsLettersViewed.push(letter.letter);
      this.stats.totalScore += 2;
      this.saveStats();
    }

    const phonicsContent = document.getElementById('phonics-content');
    phonicsContent.innerHTML = `
      <div class="eb-letter-detail">
        <div class="eb-letter-big">${letter.letter}</div>
        <div class="eb-letter-sound">/${letter.sound}/</div>
        <button class="eb-btn-listen" onclick="EnglishBoost.speakLetter(${index})">
          🔊 ${I18n.t('eb.hearSound', 'Hear Sound')}
        </button>

        <div class="eb-letter-words">
          ${letter.words.map((w, i) => `
            <div class="eb-letter-word-item" onclick="EnglishBoost.speak('${w}', 'en-US', 0.7)">
              <span class="eb-letter-word-img">${letter.images[i]}</span>
              <span class="eb-letter-word-text">${w}</span>
              <span class="eb-letter-word-highlight">${w.charAt(0).toUpperCase()}</span>
            </div>
          `).join('')}
        </div>

        <div class="eb-letter-nav">
          ${index > 0 ? `<button class="eb-btn-secondary" onclick="EnglishBoost.showLetterDetail(${index - 1})">⬅️ ${EnglishBoostData.phonics.letterSounds[index - 1].letter}</button>` : '<span></span>'}
          <button class="eb-btn-secondary" onclick="EnglishBoost.showPhonicsLetters()">🔡 ${I18n.t('eb.allLetters', 'All Letters')}</button>
          ${index < 25 ? `<button class="eb-btn-secondary" onclick="EnglishBoost.showLetterDetail(${index + 1})">${EnglishBoostData.phonics.letterSounds[index + 1].letter} ➡️</button>` : '<span></span>'}
        </div>
      </div>
    `;

    // 自动播放
    setTimeout(() => this.speakLetter(index), 300);
  },

  speakLetter(index) {
    const letter = EnglishBoostData.phonics.letterSounds[index];
    // 先读字母名，再读发音，再读示例词
    this.speak(`${letter.letter}. ${letter.letter} says ${letter.words[0].charAt(0)}. ${letter.words[0]}`, 'en-US', 0.6);
  },

  showPhonicsRhyming() {
    // 更新标签样式
    const tabs = document.querySelectorAll('.eb-tab-btn');
    tabs.forEach((t, i) => t.classList.toggle('active', i === 1));

    const families = EnglishBoostData.phonics.wordFamilies;
    const phonicsContent = document.getElementById('phonics-content');

    phonicsContent.innerHTML = `
      <div class="eb-rhyming-area">
        <div class="eb-family-list">
          ${families.map((f, i) => `
            <button class="eb-family-btn" onclick="EnglishBoost.showWordFamily(${i})">
              ${f.family}
            </button>
          `).join('')}
        </div>
        <div id="rhyming-detail">
          <p class="eb-rhyming-hint">${I18n.t('eb.pickFamily', 'Pick a word family to explore!')}</p>
        </div>
        <button class="eb-btn-primary eb-btn-rhyme-quiz" onclick="EnglishBoost.startRhymingQuiz()">
          🎯 ${I18n.t('eb.rhymingQuiz', 'Rhyming Quiz')}
        </button>
      </div>
    `;
  },

  showWordFamily(index) {
    const family = EnglishBoostData.phonics.wordFamilies[index];
    const detail = document.getElementById('rhyming-detail');

    // 高亮当前选中的家族按钮
    document.querySelectorAll('.eb-family-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    detail.innerHTML = `
      <div class="eb-family-detail">
        <h4 class="eb-family-title">${family.family} ${I18n.t('eb.family', 'Family')}</h4>
        <div class="eb-family-words">
          ${family.words.map((w, i) => `
            <div class="eb-family-word" onclick="EnglishBoost.speak('${w}', 'en-US', 0.7)">
              <span>${family.images[i]}</span>
              <span class="eb-family-word-text">
                <span class="eb-family-onset">${w.replace(family.family.substring(1), '')}</span><span class="eb-family-rime">${family.family.substring(1)}</span>
              </span>
            </div>
          `).join('')}
        </div>
        <button class="eb-btn-listen" onclick="EnglishBoost.speakWordFamily(${index})">
          🔊 ${I18n.t('eb.hearAll', 'Hear All')}
        </button>
      </div>
    `;
  },

  speakWordFamily(index) {
    const family = EnglishBoostData.phonics.wordFamilies[index];
    const text = family.words.join('. ') + '. They all rhyme!';
    this.speak(text, 'en-US', 0.7);
  },

  startRhymingQuiz() {
    this.phonics.rhymingQuiz = { correct: 0, total: 0, round: 0, maxRounds: 8 };
    this.showRhymingQuizQuestion();
  },

  showRhymingQuizQuestion() {
    const quiz = this.phonics.rhymingQuiz;
    if (quiz.round >= quiz.maxRounds) {
      this.showRhymingQuizComplete();
      return;
    }

    const families = EnglishBoostData.phonics.wordFamilies;
    // 选一个家族和一个目标词
    const familyIdx = Math.floor(Math.random() * families.length);
    const family = families[familyIdx];
    const targetWord = family.words[Math.floor(Math.random() * family.words.length)];

    // 正确答案（同家族的另一个词）
    const correctOptions = family.words.filter(w => w !== targetWord);
    const correctAnswer = correctOptions[Math.floor(Math.random() * correctOptions.length)];

    // 干扰项（其他家族的词）
    const wrongOptions = [];
    while (wrongOptions.length < 3) {
      const otherFamily = families[Math.floor(Math.random() * families.length)];
      if (otherFamily.family !== family.family) {
        const w = otherFamily.words[Math.floor(Math.random() * otherFamily.words.length)];
        if (!wrongOptions.includes(w)) wrongOptions.push(w);
      }
    }

    const options = [correctAnswer, ...wrongOptions];
    this.shuffleArray(options);

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showPhonicsMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">🎵 ${I18n.t('eb.rhymingQuiz', 'Rhyming Quiz')}</span>
        <span class="eb-round-info">${quiz.round + 1}/${quiz.maxRounds}</span>
      </div>

      <div class="eb-rhyming-quiz">
        <p class="eb-quiz-prompt">${I18n.t('eb.whatRhymes', 'What rhymes with...')}</p>
        <div class="eb-quiz-target" onclick="EnglishBoost.speak('${targetWord}', 'en-US', 0.7)">
          🔊 ${targetWord}
        </div>
        <div class="eb-quiz-options">
          ${options.map(opt => `
            <button class="eb-quiz-option" onclick="EnglishBoost.checkRhymingQuiz('${opt}', '${correctAnswer}', this)">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    setTimeout(() => this.speak(targetWord, 'en-US', 0.7), 500);
  },

  checkRhymingQuiz(selected, correct, btn) {
    const buttons = document.querySelectorAll('.eb-quiz-option');
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
      btn.classList.add('correct');
      this.phonics.rhymingQuiz.correct++;
      this.stats.phonicsRhymingCorrect++;
      this.stats.totalScore += 5;
      this.saveStats();
      RewardSystem.playSound('correct');
      this.speak(`Yes! ${selected} rhymes!`, 'en-US', 0.9);
    } else {
      btn.classList.add('wrong');
      buttons.forEach(b => {
        if (b.textContent.trim() === correct) b.classList.add('correct');
      });
      RewardSystem.playSound('wrong');
      this.speak(`The answer is ${correct}`, 'en-US', 0.8);
    }

    this.phonics.rhymingQuiz.total++;
    this.phonics.rhymingQuiz.round++;

    setTimeout(() => this.showRhymingQuizQuestion(), 1800);
  },

  showRhymingQuizComplete() {
    const quiz = this.phonics.rhymingQuiz;
    this.saveStats();

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-complete">
        <div class="eb-complete-icon">🎵</div>
        <h3>${I18n.t('eb.rhymingComplete', 'Rhyming Quiz Complete!')}</h3>
        <p>${quiz.correct}/${quiz.total} ${I18n.t('eb.correct', 'correct')}!</p>
        <div class="eb-complete-stars">
          ${'⭐'.repeat(Math.min(5, Math.ceil(quiz.correct / 2)))}
        </div>
        <div class="eb-complete-btns">
          <button class="eb-btn-primary" onclick="EnglishBoost.startRhymingQuiz()">
            🔄 ${I18n.t('eb.playAgain', 'Play Again')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.showPhonicsMenu()">
            ← ${I18n.t('eb.backToMenu', 'Back to Menu')}
          </button>
        </div>
      </div>
    `;
  },

  // ========== 4. Sentence Builder 造句小达人 ==========
  startSentences() {
    this.currentMode = 'sentences';
    this.showSentencesMenu();
  },

  showSentencesMenu() {
    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSelect()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">✍️ ${I18n.t('eb.sentences', 'Sentence Builder')}</span>
        <span></span>
      </div>

      <div class="eb-sentence-menu">
        <div class="eb-sentence-mode-card" onclick="EnglishBoost.startSentenceBuild()">
          <div class="eb-sentence-mode-icon">🧩</div>
          <div class="eb-sentence-mode-name">${I18n.t('eb.buildSentence', 'Build a Sentence')}</div>
          <div class="eb-sentence-mode-desc">${I18n.t('eb.buildDesc', 'Put words in the right order!')}</div>
        </div>

        <div class="eb-sentence-mode-card" onclick="EnglishBoost.startSentenceExpand()">
          <div class="eb-sentence-mode-icon">📝</div>
          <div class="eb-sentence-mode-name">${I18n.t('eb.expandSentence', 'Expand a Sentence')}</div>
          <div class="eb-sentence-mode-desc">${I18n.t('eb.expandDesc', 'Make sentences longer and better!')}</div>
        </div>

        <div class="eb-sentence-mode-card" onclick="EnglishBoost.showSentenceStarters()">
          <div class="eb-sentence-mode-icon">💡</div>
          <div class="eb-sentence-mode-name">${I18n.t('eb.starters', 'Sentence Starters')}</div>
          <div class="eb-sentence-mode-desc">${I18n.t('eb.startersDesc', 'Get ideas to start writing!')}</div>
        </div>
      </div>
    `;
  },

  // 造句 - 拼词排列
  startSentenceBuild() {
    const patterns = [...EnglishBoostData.sentenceBuilder.simplePatterns];
    this.shuffleArray(patterns);
    this.sentences.patterns = patterns.slice(0, 6);
    this.sentences.currentIndex = 0;
    this.sentences.buildCorrect = 0;
    this.showSentenceBuildRound();
  },

  showSentenceBuildRound() {
    if (this.sentences.currentIndex >= this.sentences.patterns.length) {
      this.showSentenceBuildComplete();
      return;
    }

    const pattern = this.sentences.patterns[this.sentences.currentIndex];
    const shuffled = [...pattern.words];
    this.shuffleArray(shuffled);

    // 确保打乱后和原始不同
    while (shuffled.join(' ') === pattern.words.join(' ') && pattern.words.length > 2) {
      this.shuffleArray(shuffled);
    }

    this.sentences.placedWords = [];
    this.sentences.dragWords = shuffled;

    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSentencesMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">🧩 ${I18n.t('eb.buildSentence', 'Build a Sentence')}</span>
        <span class="eb-round-info">${this.sentences.currentIndex + 1}/${this.sentences.patterns.length}</span>
      </div>

      <div class="eb-build-area">
        <div class="eb-build-image">${pattern.image}</div>
        <p class="eb-build-hint">💡 ${pattern.hint}</p>

        <div class="eb-build-sentence-box" id="sentence-box">
          <span class="eb-build-placeholder">${I18n.t('eb.tapWords', 'Tap words below to build a sentence')}</span>
        </div>

        <div class="eb-build-word-bank" id="word-bank">
          ${shuffled.map((w, i) => `
            <button class="eb-build-word" id="word-${i}" onclick="EnglishBoost.tapWord(${i}, '${w}')">
              ${w}
            </button>
          `).join('')}
        </div>

        <div class="eb-build-actions">
          <button class="eb-btn-secondary" onclick="EnglishBoost.resetSentence()">
            🔄 ${I18n.t('eb.reset', 'Reset')}
          </button>
          <button class="eb-btn-primary" onclick="EnglishBoost.checkSentence()">
            ✅ ${I18n.t('eb.check', 'Check')}
          </button>
        </div>
      </div>
    `;
  },

  tapWord(index, word) {
    const btn = document.getElementById(`word-${index}`);
    if (!btn || btn.classList.contains('used')) return;

    btn.classList.add('used');
    this.sentences.placedWords.push({ index, word });
    this.updateSentenceBox();
  },

  removeWord(placedIndex) {
    const removed = this.sentences.placedWords[placedIndex];
    if (!removed) return;

    // 恢复词库中的按钮
    const btn = document.getElementById(`word-${removed.index}`);
    if (btn) btn.classList.remove('used');

    this.sentences.placedWords.splice(placedIndex, 1);
    this.updateSentenceBox();
  },

  updateSentenceBox() {
    const box = document.getElementById('sentence-box');
    if (!box) return;

    if (this.sentences.placedWords.length === 0) {
      box.innerHTML = `<span class="eb-build-placeholder">${I18n.t('eb.tapWords', 'Tap words below to build a sentence')}</span>`;
    } else {
      box.innerHTML = this.sentences.placedWords.map((pw, i) => `
        <span class="eb-placed-word" onclick="EnglishBoost.removeWord(${i})">${pw.word}</span>
      `).join('');
    }
  },

  resetSentence() {
    this.sentences.placedWords = [];
    document.querySelectorAll('.eb-build-word').forEach(b => b.classList.remove('used'));
    this.updateSentenceBox();
  },

  checkSentence() {
    const pattern = this.sentences.patterns[this.sentences.currentIndex];
    const placed = this.sentences.placedWords.map(pw => pw.word);
    const correct = pattern.words;

    const box = document.getElementById('sentence-box');

    if (placed.join(' ') === correct.join(' ')) {
      // 正确！
      box.classList.add('eb-correct-sentence');
      this.sentences.buildCorrect++;
      this.stats.sentencesBuilt++;
      this.stats.totalScore += 10;
      this.saveStats();
      RewardSystem.addPoints(10, I18n.t('eb.sentenceCorrect', 'Great sentence!'));
      this.speak(correct.join(' '), 'en-US', 0.7);

      setTimeout(() => {
        this.sentences.currentIndex++;
        this.showSentenceBuildRound();
      }, 2000);
    } else {
      // 错误
      box.classList.add('eb-wrong-sentence');
      RewardSystem.playSound('wrong');
      this.speak('Try again! Listen to the hint.', 'en-US', 0.8);
      setTimeout(() => {
        box.classList.remove('eb-wrong-sentence');
      }, 800);
    }
  },

  showSentenceBuildComplete() {
    this.saveStats();
    const content = document.getElementById('english-boost-content');
    content.innerHTML = `
      <div class="eb-complete">
        <div class="eb-complete-icon">✍️</div>
        <h3>${I18n.t('eb.buildComplete', 'Sentence Building Complete!')}</h3>
        <p>${this.sentences.buildCorrect}/${this.sentences.patterns.length} ${I18n.t('eb.sentencesBuilt', 'sentences built')}!</p>
        <div class="eb-complete-stars">
          ${'⭐'.repeat(Math.min(5, this.sentences.buildCorrect))}
        </div>
        <div class="eb-complete-btns">
          <button class="eb-btn-primary" onclick="EnglishBoost.startSentenceBuild()">
            🔄 ${I18n.t('eb.playAgain', 'Play Again')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.showSentencesMenu()">
            ← ${I18n.t('eb.backToMenu', 'Back to Menu')}
          </button>
        </div>
      </div>
    `;
  },

  // 句子扩展
  startSentenceExpand() {
    const items = [...EnglishBoostData.sentenceBuilder.expandSentences];
    this.shuffleArray(items);
    this.sentences.expandItems = items;
    this.sentences.currentIndex = 0;
    this.showSentenceExpandRound();
  },

  showSentenceExpandRound() {
    if (this.sentences.currentIndex >= this.sentences.expandItems.length) {
      this.sentences.currentIndex = 0;
    }

    const item = this.sentences.expandItems[this.sentences.currentIndex];
    const content = document.getElementById('english-boost-content');

    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSentencesMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">📝 ${I18n.t('eb.expandSentence', 'Expand')}</span>
        <span class="eb-round-info">${this.sentences.currentIndex + 1}/${this.sentences.expandItems.length}</span>
      </div>

      <div class="eb-expand-area">
        <div class="eb-expand-base">
          <span class="eb-expand-label">${I18n.t('eb.baseSentence', 'Base sentence')}:</span>
          <div class="eb-expand-sentence" onclick="EnglishBoost.speak('${item.base}', 'en-US', 0.7)">
            🔊 "${item.base}"
          </div>
        </div>

        <div class="eb-expand-prompt">
          💡 ${item.prompt}
        </div>

        <div class="eb-expand-starters">
          <span class="eb-expand-label">${I18n.t('eb.wordHelpers', 'Word helpers')}:</span>
          <div class="eb-starter-chips">
            ${item.starters.map(s => `
              <button class="eb-starter-chip" onclick="EnglishBoost.addStarterWord('${s}')">${s}</button>
            `).join('')}
          </div>
        </div>

        <div class="eb-expand-input-area">
          <div class="eb-expand-input-row">
            <span class="eb-expand-input-prefix">${item.base} </span>
            <input type="text" class="eb-expand-input" id="expand-input"
                   placeholder="${I18n.t('eb.addMore', 'add more words...')}"
                   onkeydown="if(event.key==='Enter')EnglishBoost.submitExpandedSentence()">
          </div>
        </div>

        <div class="eb-expand-example">
          <span class="eb-expand-label">${I18n.t('eb.example', 'Example')}:</span>
          <div class="eb-expand-example-text" onclick="EnglishBoost.speak('${item.example.replace(/'/g, "\\'")}', 'en-US', 0.7)">
            🔊 "${item.example}"
          </div>
        </div>

        <div class="eb-expand-actions">
          <button class="eb-btn-primary" onclick="EnglishBoost.submitExpandedSentence()">
            ✅ ${I18n.t('eb.done', 'Done!')}
          </button>
          <button class="eb-btn-secondary" onclick="EnglishBoost.nextExpandSentence()">
            ➡️ ${I18n.t('eb.next', 'Next')}
          </button>
        </div>
      </div>
    `;
  },

  addStarterWord(word) {
    const input = document.getElementById('expand-input');
    if (input) {
      input.value = (input.value ? input.value + ' ' : '') + word;
      input.focus();
    }
  },

  submitExpandedSentence() {
    const input = document.getElementById('expand-input');
    if (!input || !input.value.trim()) {
      this.speak('Try adding some words!', 'en-US', 0.8);
      return;
    }

    const item = this.sentences.expandItems[this.sentences.currentIndex];
    const fullSentence = item.base + ' ' + input.value.trim();

    this.stats.sentencesExpanded++;
    this.stats.sentencesBuilt++;
    this.stats.totalScore += 10;
    this.saveStats();

    RewardSystem.addPoints(10, I18n.t('eb.greatSentence', 'Great sentence!'));
    this.speak(fullSentence, 'en-US', 0.7);

    // 显示成功反馈
    const area = document.querySelector('.eb-expand-area');
    if (area) {
      const feedback = document.createElement('div');
      feedback.className = 'eb-expand-feedback';
      feedback.innerHTML = `🎉 "${fullSentence}"`;
      area.appendChild(feedback);
    }

    setTimeout(() => this.nextExpandSentence(), 2500);
  },

  nextExpandSentence() {
    this.sentences.currentIndex++;
    if (this.sentences.currentIndex >= this.sentences.expandItems.length) {
      this.sentences.currentIndex = 0;
    }
    this.showSentenceExpandRound();
  },

  // 句子开头提示
  showSentenceStarters() {
    const starters = EnglishBoostData.sentenceBuilder.sentenceStarters;
    const content = document.getElementById('english-boost-content');

    content.innerHTML = `
      <div class="eb-game-header">
        <button class="eb-back-btn" onclick="EnglishBoost.showSentencesMenu()">← ${I18n.t('btn.back', 'Back')}</button>
        <span class="eb-game-title">💡 ${I18n.t('eb.starters', 'Sentence Starters')}</span>
        <span></span>
      </div>

      <div class="eb-starters-area">
        <p class="eb-starters-intro">${I18n.t('eb.startersIntro', 'Pick a sentence starter and finish the sentence!')}</p>

        <div class="eb-starters-list">
          ${starters.map((s, i) => `
            <div class="eb-starter-card" onclick="EnglishBoost.selectStarter(${i})">
              <span class="eb-starter-img">${s.image}</span>
              <span class="eb-starter-text">${s.starter}</span>
            </div>
          `).join('')}
        </div>

        <div id="starter-input-area" class="eb-starter-input-area hidden">
          <div class="eb-starter-input-row">
            <span class="eb-starter-prefix" id="starter-prefix"></span>
            <input type="text" class="eb-starter-input" id="starter-input"
                   placeholder="${I18n.t('eb.finishSentence', 'finish the sentence...')}"
                   onkeydown="if(event.key==='Enter')EnglishBoost.submitStarter()">
          </div>
          <button class="eb-btn-primary" onclick="EnglishBoost.submitStarter()">
            🔊 ${I18n.t('eb.readItOut', 'Read it out!')}
          </button>
        </div>
      </div>
    `;
  },

  selectStarter(index) {
    const starter = EnglishBoostData.sentenceBuilder.sentenceStarters[index];
    const inputArea = document.getElementById('starter-input-area');
    const prefix = document.getElementById('starter-prefix');
    const input = document.getElementById('starter-input');

    if (inputArea && prefix && input) {
      prefix.textContent = starter.starter;
      inputArea.classList.remove('hidden');
      input.value = '';
      input.focus();

      // 高亮选中卡片
      document.querySelectorAll('.eb-starter-card').forEach((c, i) => {
        c.classList.toggle('active', i === index);
      });

      this.speak(starter.starter, 'en-US', 0.7);
    }
  },

  submitStarter() {
    const prefix = document.getElementById('starter-prefix');
    const input = document.getElementById('starter-input');
    if (!input || !input.value.trim() || !prefix) return;

    const fullSentence = prefix.textContent + ' ' + input.value.trim();
    this.stats.sentencesBuilt++;
    this.stats.totalScore += 5;
    this.saveStats();

    RewardSystem.addPoints(5, I18n.t('eb.niceWriting', 'Nice writing!'));
    this.speak(fullSentence, 'en-US', 0.7);
  },

  // ========== 工具方法 ==========
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

// 全局函数
function showEnglishBoost() {
  EnglishBoost.show();
}

function closeEnglishBoost() {
  EnglishBoost.close();
}
