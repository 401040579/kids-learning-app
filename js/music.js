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
    currentSound: 'piano', // piano, xylophone, bell, guitar, flute
    activeKeys: new Set(),
    octaveShift: 0 // -1(低音), 0(中音), +1(高音)
  },

  // 录制功能
  recorder: {
    isRecording: false,
    events: [],       // [{type:'piano'|'drum', data, time}]
    startTime: 0,
    playbackTimer: null,
    playbackTimeouts: []
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

    // 应用八度偏移
    const freq = note.freq * Math.pow(2, this.piano.octaveShift);

    // 根据当前音色创建不同的声音
    switch (this.piano.currentSound) {
      case 'piano':
        this.playPianoSound(freq);
        break;
      case 'xylophone':
        this.playXylophoneSound(freq);
        break;
      case 'bell':
        this.playBellSound(freq);
        break;
      case 'guitar':
        this.playGuitarSound(freq);
        break;
      case 'flute':
        this.playFluteSound(freq);
        break;
    }

    // 录制事件
    this.recordEvent('piano', { noteIndex, sound: this.piano.currentSound, octaveShift: this.piano.octaveShift });

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

  // 吉他音色（sawtooth + 低通滤波器，温暖弹拨音色）
  playGuitarSound(freq) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // 低通滤波器让声音温暖
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
    filter.Q.value = 1;

    // 弹拨感的包络
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  },

  // 长笛音色（sine + 颤音 vibrato LFO，柔和吹奏音色）
  playFluteSound(freq) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // 轻微颤音 LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 5; // 5Hz 颤音
    lfoGain.gain.value = 3;  // 3Hz 频率偏移

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.type = 'sine';
    osc.frequency.value = freq;

    // 柔和的吹奏感
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.08); // 慢起音
    gainNode.gain.setValueAtTime(0.35, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 1.2);
    osc.stop(now + 1.2);
  },

  // 八度切换
  shiftOctave(direction) {
    // direction: -1(低音), 0(中音), +1(高音)
    this.piano.octaveShift = Math.max(-1, Math.min(1, direction));

    // 更新UI
    document.querySelectorAll('.octave-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.octave) === this.piano.octaveShift);
    });
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

    // 录制事件
    this.recordEvent('drum', { drumId });

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

    const tempoMap = { lullaby: 600, march: 350, rock: 300, waltz: 450, reggae: 380 };
    const interval = tempoMap[type] || 400;

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
      ],
      // 摇滚节奏（强劲的 kick+snare 交替）
      rock: [
        ['kick', 'hihat'],
        ['hihat'],
        ['snare', 'hihat'],
        ['hihat'],
        ['kick', 'hihat'],
        ['kick', 'hihat'],
        ['snare', 'hihat'],
        ['hihat', 'clap']
      ],
      // 华尔兹节奏（3/4 拍，优雅三拍子）
      waltz: [
        ['kick'],
        ['hihat'],
        ['hihat'],
        ['kick'],
        ['hihat'],
        ['hihat'],
        ['snare'],
        ['hihat'],
        ['hihat']
      ],
      // 雷鬼节奏（重拍在第二、四拍）
      reggae: [
        ['hihat'],
        ['kick', 'snare'],
        ['hihat'],
        ['kick', 'snare'],
        ['hihat', 'shaker'],
        ['kick', 'snare'],
        ['hihat'],
        ['kick', 'snare', 'clap']
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
    this.stopPlayback();

    // 更新UI - 切换标签
    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // 切换面板
    document.querySelectorAll('.music-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `music-${mode}`);
    });
  },

  // ========== 录制与回放 ==========

  // 记录一个事件
  recordEvent(type, data) {
    if (!this.recorder.isRecording) return;
    this.recorder.events.push({
      type,
      data,
      time: Date.now() - this.recorder.startTime
    });
    this.updateRecorderUI();
  },

  // 开始录制
  startRecording() {
    this.recorder.isRecording = true;
    this.recorder.events = [];
    this.recorder.startTime = Date.now();
    this.updateRecorderUI();

    // 更新按钮状态
    const recordBtn = document.getElementById('music-record-btn');
    if (recordBtn) recordBtn.classList.add('recording');
    const timerEl = document.getElementById('music-record-timer');
    if (timerEl) {
      this._recorderTimerInterval = setInterval(() => {
        const elapsed = Date.now() - this.recorder.startTime;
        const secs = Math.floor(elapsed / 1000);
        const mins = Math.floor(secs / 60);
        timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
      }, 500);
    }
  },

  // 停止录制
  stopRecording() {
    this.recorder.isRecording = false;
    if (this._recorderTimerInterval) {
      clearInterval(this._recorderTimerInterval);
      this._recorderTimerInterval = null;
    }
    const recordBtn = document.getElementById('music-record-btn');
    if (recordBtn) recordBtn.classList.remove('recording');
    this.updateRecorderUI();
  },

  // 回放录制内容
  playRecording() {
    if (this.recorder.events.length === 0) {
      this.showToast(typeof I18n !== 'undefined' ? I18n.t('music.noRecording') : '还没有录制内容');
      return;
    }

    this.stopPlayback();
    const playBtn = document.getElementById('music-playback-btn');
    if (playBtn) playBtn.classList.add('playing');

    const totalDuration = this.recorder.events[this.recorder.events.length - 1].time;
    const progressBar = document.getElementById('music-playback-progress');

    // 进度条动画
    const playbackStart = Date.now();
    this._playbackProgressInterval = setInterval(() => {
      const elapsed = Date.now() - playbackStart;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (elapsed >= totalDuration) {
        clearInterval(this._playbackProgressInterval);
        this._playbackProgressInterval = null;
      }
    }, 50);

    // 回放时暂停录制，避免重复记录
    const wasRecording = this.recorder.isRecording;
    this.recorder.isRecording = false;

    // 按时间戳回放事件
    this.recorder.playbackTimeouts = this.recorder.events.map(event => {
      return setTimeout(() => {
        if (event.type === 'piano') {
          const savedSound = this.piano.currentSound;
          const savedOctave = this.piano.octaveShift;
          this.piano.currentSound = event.data.sound;
          this.piano.octaveShift = event.data.octaveShift || 0;
          // 直接调用底层方法以避免重新录制
          const note = this.piano.notes[event.data.noteIndex];
          if (note) {
            const freq = note.freq * Math.pow(2, this.piano.octaveShift);
            switch (this.piano.currentSound) {
              case 'piano': this.playPianoSound(freq); break;
              case 'xylophone': this.playXylophoneSound(freq); break;
              case 'bell': this.playBellSound(freq); break;
              case 'guitar': this.playGuitarSound(freq); break;
              case 'flute': this.playFluteSound(freq); break;
            }
            this.triggerAnimalDance(event.data.noteIndex);
            this.animateKey(event.data.noteIndex);
          }
          this.piano.currentSound = savedSound;
          this.piano.octaveShift = savedOctave;
        } else if (event.type === 'drum') {
          this.playDrum(event.data.drumId);
        }
      }, event.time);
    });

    // 回放完成后清理
    const endTimeout = setTimeout(() => {
      if (playBtn) playBtn.classList.remove('playing');
      if (progressBar) progressBar.style.width = '0%';
    }, totalDuration + 100);
    this.recorder.playbackTimeouts.push(endTimeout);
  },

  // 停止回放
  stopPlayback() {
    if (this.recorder.playbackTimeouts) {
      this.recorder.playbackTimeouts.forEach(t => clearTimeout(t));
      this.recorder.playbackTimeouts = [];
    }
    if (this._playbackProgressInterval) {
      clearInterval(this._playbackProgressInterval);
      this._playbackProgressInterval = null;
    }
    const playBtn = document.getElementById('music-playback-btn');
    if (playBtn) playBtn.classList.remove('playing');
    const progressBar = document.getElementById('music-playback-progress');
    if (progressBar) progressBar.style.width = '0%';
  },

  // 清除录制
  clearRecording() {
    this.stopPlayback();
    this.stopRecording();
    this.recorder.events = [];
    const timerEl = document.getElementById('music-record-timer');
    if (timerEl) timerEl.textContent = '00:00';
    this.updateRecorderUI();
  },

  // 更新录制器 UI（事件指示器）
  updateRecorderUI() {
    const indicator = document.getElementById('music-event-indicator');
    if (!indicator) return;

    const count = this.recorder.events.length;
    const maxDots = 8;
    let dots = '';
    for (let i = 0; i < maxDots; i++) {
      dots += i < count ? '<span class="dot filled"></span>' : '<span class="dot"></span>';
    }
    if (count > maxDots) {
      dots += `<span class="dot-count">+${count - maxDots}</span>`;
    }
    indicator.innerHTML = dots;
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
    MusicApp.stopPlayback();
    MusicApp.stopRecording();
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

// 八度切换
function shiftOctave(direction) {
  MusicApp.shiftOctave(direction);
}

// 录制控制
function startMusicRecording() {
  MusicApp.startRecording();
}

function stopMusicRecording() {
  MusicApp.stopRecording();
}

function playMusicRecording() {
  MusicApp.playRecording();
}

function clearMusicRecording() {
  MusicApp.clearRecording();
}
