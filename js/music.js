// ========== 音乐创作模块 ==========

const MusicApp = {
  // Web Audio API 上下文
  audioContext: null,

  // 当前模式: 'piano', 'drums', 'sequencer'
  currentMode: 'piano',

  // 钢琴设置
  piano: {
    // 五声音阶 C-D-E-G-A（五声音阶，怎么弹都好听）
    notes: [
      { note: 'C4', freq: 261.63, label: '1', color: '#FF6B6B' },
      { note: 'D4', freq: 293.66, label: '2', color: '#FF8E53' },
      { note: 'E4', freq: 329.63, label: '3', color: '#FFD93D' },
      { note: 'G4', freq: 392.00, label: '4', color: '#6BCB77' },
      { note: 'A4', freq: 440.00, label: '5', color: '#4D96FF' },
      { note: 'C5', freq: 523.25, label: '6', color: '#9B59B6' },
      { note: 'D5', freq: 587.33, label: '7', color: '#FF69B4' },
      { note: 'E5', freq: 659.25, label: '8', color: '#00D2D3' }
    ],
    currentSound: 'piano', // piano, xylophone, bell
    activeKeys: new Set()
  },

  // 打击乐设置
  drums: {
    instruments: [
      { id: 'kick', emoji: '🥁', name: '大鼓', color: '#FF6B6B' },
      { id: 'snare', emoji: '🪘', name: '小鼓', color: '#FF8E53' },
      { id: 'hihat', emoji: '🔔', name: '铃鼓', color: '#FFD93D' },
      { id: 'shaker', emoji: '🪇', name: '沙锤', color: '#6BCB77' },
      { id: 'clap', emoji: '👏', name: '拍手', color: '#4D96FF' },
      { id: 'triangle', emoji: '🎵', name: '三角铁', color: '#9B59B6' }
    ],
    rhythmPlaying: false,
    rhythmType: null, // 'happy', 'lullaby', 'march'
    rhythmInterval: null
  },

  // 音乐画板设置
  sequencer: {
    grid: [], // 8x5 grid
    cols: 8,
    rows: 5,
    currentCol: 0,
    playing: false,
    tempo: 120, // BPM
    intervalId: null
  },

  // 动物角色（用于跳舞动画）
  animals: ['🐱', '🐶', '🐰', '🐻', '🦊', '🐼', '🐸', '🐵'],
  dancingAnimals: [],

  // 初始化
  init() {
    // 初始化音频上下文（需要用户交互后才能创建）
    this.initAudioContext();

    // 初始化音乐画板网格
    this.initSequencerGrid();

    console.log('MusicApp initialized');
  },

  // 初始化音频上下文
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 恢复音频上下文（如果被暂停）
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  },

  // ========== 钢琴功能 ==========

  // 播放钢琴音符
  playPianoNote(noteIndex) {
    this.initAudioContext();

    const note = this.piano.notes[noteIndex];
    if (!note) return;

    // 根据当前音色创建不同的声音
    switch (this.piano.currentSound) {
      case 'piano':
        this.playPianoSound(note.freq);
        break;
      case 'xylophone':
        this.playXylophoneSound(note.freq);
        break;
      case 'bell':
        this.playBellSound(note.freq);
        break;
    }

    // 触发动物跳舞
    this.triggerAnimalDance(noteIndex);

    // 添加按键动画
    this.animateKey(noteIndex);
  },

  // 钢琴音色
  playPianoSound(freq) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 创建振荡器
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    // ADSR 包络
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.1); // Decay
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1); // Release

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1);
  },

  // 木琴音色
  playXylophoneSound(freq) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // 短促明亮的声音
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  },

  // 铃铛音色
  playBellSound(freq) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 主振荡器
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 2; // 高频泛音

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.3;

    // 长衰减的铃声
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);

    osc1.connect(gainNode);
    osc2.connect(gain2);
    gain2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2);
    osc2.stop(now + 2);
  },

  // 设置钢琴音色
  setPianoSound(sound) {
    this.piano.currentSound = sound;
    // 更新UI
    document.querySelectorAll('.sound-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sound === sound);
    });
  },

  // 按键动画
  animateKey(index) {
    const key = document.querySelector(`.piano-key[data-index="${index}"]`);
    if (key) {
      key.classList.add('pressed');
      setTimeout(() => key.classList.remove('pressed'), 150);
    }
  },

  // 动物跳舞
  triggerAnimalDance(noteIndex) {
    const animalEl = document.querySelector(`.dancing-animal[data-index="${noteIndex}"]`);
    if (animalEl) {
      animalEl.classList.add('dancing');
      setTimeout(() => animalEl.classList.remove('dancing'), 300);
    }
  },

  // ========== 打击乐功能 ==========

  // 播放打击乐
  playDrum(drumId) {
    this.initAudioContext();

    switch (drumId) {
      case 'kick':
        this.playKickSound();
        break;
      case 'snare':
        this.playSnareSound();
        break;
      case 'hihat':
        this.playHihatSound();
        break;
      case 'shaker':
        this.playShakerSound();
        break;
      case 'clap':
        this.playClapSound();
        break;
      case 'triangle':
        this.playTriangleSound();
        break;
    }

    // 打击乐动画
    this.animateDrum(drumId);
  },

  // 大鼓
  playKickSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gainNode.gain.setValueAtTime(1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  },

  // 小鼓
  playSnareSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 噪音
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);

    // 加一点音调
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180;
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  // 铃鼓/钹
  playHihatSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
  },

  // 沙锤
  playShakerSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / bufferSize * Math.PI);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.3;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
  },

  // 拍手
  playClapSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 多层噪音模拟拍手
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.01;
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500;
      filter.Q.value = 3;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.4, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noise.start(now + delay);
    }
  },

  // 三角铁
  playTriangleSound() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1500;

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1);
  },

  // 打击乐动画
  animateDrum(drumId) {
    const drum = document.querySelector(`.drum-pad[data-drum="${drumId}"]`);
    if (drum) {
      drum.classList.add('hit');
      setTimeout(() => drum.classList.remove('hit'), 150);
    }
  },

  // ========== 节奏伴奏 ==========

  // 开始节奏伴奏
  startRhythm(type) {
    this.stopRhythm();

    this.drums.rhythmPlaying = true;
    this.drums.rhythmType = type;

    // 更新UI
    document.querySelectorAll('.rhythm-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.rhythm === type);
    });
    document.getElementById('rhythm-play-btn')?.classList.add('playing');

    let beatIndex = 0;
    const patterns = this.getRhythmPattern(type);

    const interval = type === 'lullaby' ? 600 : (type === 'march' ? 350 : 400);

    this.drums.rhythmInterval = setInterval(() => {
      const beat = patterns[beatIndex % patterns.length];
      beat.forEach(drumId => this.playDrum(drumId));
      beatIndex++;
    }, interval);
  },

  // 停止节奏伴奏
  stopRhythm() {
    if (this.drums.rhythmInterval) {
      clearInterval(this.drums.rhythmInterval);
      this.drums.rhythmInterval = null;
    }
    this.drums.rhythmPlaying = false;
    this.drums.rhythmType = null;

    // 更新UI
    document.querySelectorAll('.rhythm-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('rhythm-play-btn')?.classList.remove('playing');
  },

  // 切换节奏
  toggleRhythm(type) {
    if (this.drums.rhythmPlaying && this.drums.rhythmType === type) {
      this.stopRhythm();
    } else {
      this.startRhythm(type);
    }
  },

  // 获取节奏模式
  getRhythmPattern(type) {
    const patterns = {
      // 欢快节奏
      happy: [
        ['kick', 'hihat'],
        ['hihat'],
        ['snare', 'hihat'],
        ['hihat'],
        ['kick', 'hihat'],
        ['hihat'],
        ['snare', 'hihat'],
        ['hihat', 'shaker']
      ],
      // 摇篮曲节奏
      lullaby: [
        ['kick'],
        ['shaker'],
        ['hihat'],
        ['shaker'],
        ['snare'],
        ['shaker'],
        ['hihat'],
        ['shaker']
      ],
      // 进行曲节奏
      march: [
        ['kick', 'hihat'],
        ['snare'],
        ['kick', 'hihat'],
        ['snare'],
        ['kick', 'kick'],
        ['snare'],
        ['kick', 'hihat'],
        ['snare', 'clap']
      ]
    };
    return patterns[type] || patterns.happy;
  },

  // ========== 音乐画板功能 ==========

  // 初始化音乐画板网格
  initSequencerGrid() {
    this.sequencer.grid = [];
    for (let row = 0; row < this.sequencer.rows; row++) {
      this.sequencer.grid[row] = [];
      for (let col = 0; col < this.sequencer.cols; col++) {
        this.sequencer.grid[row][col] = false;
      }
    }
  },

  // 切换格子状态
  toggleCell(row, col) {
    this.sequencer.grid[row][col] = !this.sequencer.grid[row][col];

    // 如果打开，播放预览音
    if (this.sequencer.grid[row][col]) {
      this.playSequencerNote(row);
    }

    // 更新UI
    const cell = document.querySelector(`.seq-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.toggle('active', this.sequencer.grid[row][col]);
    }
  },

  // 播放音乐画板音符
  playSequencerNote(row) {
    this.initAudioContext();

    // 五声音阶从高到低：E5, D5, C5, A4, G4
    const freqs = [659.25, 587.33, 523.25, 440.00, 392.00];
    const freq = freqs[row];

    this.playXylophoneSound(freq);
  },

  // 播放音乐画板
  playSequencer() {
    if (this.sequencer.playing) {
      this.stopSequencer();
      return;
    }

    this.initAudioContext();
    this.sequencer.playing = true;
    this.sequencer.currentCol = 0;

    // 更新UI
    document.getElementById('seq-play-btn')?.classList.add('playing');

    const beatDuration = 60000 / this.sequencer.tempo / 2; // 八分音符

    this.sequencer.intervalId = setInterval(() => {
      // 清除上一列高亮
      const prevCol = (this.sequencer.currentCol - 1 + this.sequencer.cols) % this.sequencer.cols;
      document.querySelectorAll(`.seq-cell[data-col="${prevCol}"]`).forEach(cell => {
        cell.classList.remove('playing');
      });

      // 高亮当前列
      document.querySelectorAll(`.seq-cell[data-col="${this.sequencer.currentCol}"]`).forEach(cell => {
        cell.classList.add('playing');
      });

      // 播放当前列的音符
      for (let row = 0; row < this.sequencer.rows; row++) {
        if (this.sequencer.grid[row][this.sequencer.currentCol]) {
          this.playSequencerNote(row);
        }
      }

      // 移动到下一列
      this.sequencer.currentCol = (this.sequencer.currentCol + 1) % this.sequencer.cols;
    }, beatDuration);
  },

  // 停止音乐画板
  stopSequencer() {
    if (this.sequencer.intervalId) {
      clearInterval(this.sequencer.intervalId);
      this.sequencer.intervalId = null;
    }
    this.sequencer.playing = false;
    this.sequencer.currentCol = 0;

    // 清除高亮
    document.querySelectorAll('.seq-cell').forEach(cell => {
      cell.classList.remove('playing');
    });

    // 更新UI
    document.getElementById('seq-play-btn')?.classList.remove('playing');
  },

  // 清空音乐画板
  clearSequencer() {
    this.stopSequencer();
    this.initSequencerGrid();

    // 更新UI
    document.querySelectorAll('.seq-cell').forEach(cell => {
      cell.classList.remove('active');
    });
  },

  // 设置速度
  setTempo(tempo) {
    this.sequencer.tempo = tempo;
    // 如果正在播放，重新开始以应用新速度
    if (this.sequencer.playing) {
      this.stopSequencer();
      this.playSequencer();
    }
    // 更新UI
    document.querySelectorAll('.tempo-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.tempo) === tempo);
    });
  },

  // ========== 模式切换 ==========

  switchMode(mode) {
    this.currentMode = mode;

    // 停止所有播放
    this.stopRhythm();
    this.stopSequencer();

    // 更新UI - 切换标签
    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // 切换面板
    document.querySelectorAll('.music-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `music-${mode}`);
    });
  },

  // ========== 保存作品 ==========

  saveComposition() {
    const compositions = JSON.parse(localStorage.getItem('musicCompositions') || '[]');

    const composition = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode: this.currentMode,
      grid: this.currentMode === 'sequencer' ? [...this.sequencer.grid.map(row => [...row])] : null,
      tempo: this.sequencer.tempo
    };

    compositions.push(composition);
    localStorage.setItem('musicCompositions', JSON.stringify(compositions));

    // 📊 追踪作品保存
    if (typeof Analytics !== 'undefined') {
      Analytics.trackWorkSave('music', this.currentMode);
    }

    // 显示保存成功提示
    this.showToast('作品已保存！');

    // 触发成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.checkMusicAchievement();
    }
  },

  // 显示提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'music-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};

// ========== 全局函数（供 HTML 调用） ==========

// 打开音乐创作
function openMusic() {
  const modal = document.getElementById('music-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // 📊 追踪模块点击
    if (typeof Analytics !== 'undefined') {
      Analytics.trackModuleClick('music', 'creative');
    }
    // 🕐 记录最近使用
    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('music');
    }
    MusicApp.init();
    MusicApp.switchMode('piano');
  }
}

// 关闭音乐创作
function closeMusic() {
  const modal = document.getElementById('music-modal');
  if (modal) {
    modal.classList.add('hidden');
    MusicApp.stopRhythm();
    MusicApp.stopSequencer();
  }
}

// 钢琴按键
function playPianoKey(index) {
  MusicApp.playPianoNote(index);
}

// 设置钢琴音色
function setPianoSound(sound) {
  MusicApp.setPianoSound(sound);
}

// 打击乐
function playDrumPad(drumId) {
  MusicApp.playDrum(drumId);
}

// 切换节奏
function toggleRhythm(type) {
  MusicApp.toggleRhythm(type);
}

// 停止节奏
function stopRhythm() {
  MusicApp.stopRhythm();
}

// 音乐画板
function toggleSeqCell(row, col) {
  MusicApp.toggleCell(row, col);
}

function playSequencer() {
  MusicApp.playSequencer();
}

function clearSequencer() {
  MusicApp.clearSequencer();
}

function setTempo(tempo) {
  MusicApp.setTempo(tempo);
}

// 切换模式
function switchMusicMode(mode) {
  MusicApp.switchMode(mode);
}

// 保存作品
function saveMusicComposition() {
  MusicApp.saveComposition();
}
