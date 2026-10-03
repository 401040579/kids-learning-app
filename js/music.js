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
    playbackTimeouts: [],
    durationMs: 0
  },
  MAX_RECORDING_MS: 10 * 60 * 1000,
  MAX_RECORDING_EVENTS: 5000,

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
    if (!this.sequencer.grid.length) this.initSequencerGrid();
    this.renderSavedWorks();

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

  stopRecordingAtLimit() {
    if (!this.recorder.isRecording) return;
    this.stopRecording();
    this.showToast(this.text('recordingLimit', '录制已暂停，请先保存当前演奏。'));
  },

  // 记录一个事件
  recordEvent(type, data) {
    if (!this.recorder.isRecording) return;
    const elapsed = Math.max(0, Date.now() - this.recorder.startTime);
    if (elapsed >= this.MAX_RECORDING_MS || this.recorder.events.length >= this.MAX_RECORDING_EVENTS) {
      this.stopRecordingAtLimit();
      return;
    }
    this.recorder.events.push({
      type,
      data: { ...data },
      // 系统时钟回拨时也保持录音时间线单调。
      time: Math.max(elapsed, this.recorder.events[this.recorder.events.length - 1]?.time || 0)
    });
    this.updateRecorderUI();
  },

  // 开始录制
  startRecording() {
    this.stopRecording();
    this.stopPlayback();
    this.recorder.isRecording = true;
    this.recorder.events = [];
    this.recorder.durationMs = 0;
    this.recorder.startTime = Date.now();
    this.updateRecorderUI();

    // 无新音符、计时器 UI 不存在时也必须截止。旧会话已入队的回调不能停止新录音。
    const deadline = setTimeout(() => {
      if (this._recorderDeadlineTimeout === deadline) this.stopRecordingAtLimit();
    }, this.MAX_RECORDING_MS);
    this._recorderDeadlineTimeout = deadline;

    // 更新按钮状态
    const recordBtn = document.getElementById('music-record-btn');
    if (recordBtn) recordBtn.classList.add('recording');
    const timerEl = document.getElementById('music-record-timer');
    if (timerEl) {
      timerEl.textContent = '00:00';
      this._recorderTimerInterval = setInterval(() => {
        const elapsed = Math.max(0, Date.now() - this.recorder.startTime);
        if (elapsed >= this.MAX_RECORDING_MS) {
          this.stopRecordingAtLimit();
          return;
        }
        const secs = Math.floor(elapsed / 1000);
        const mins = Math.floor(secs / 60);
        timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
      }, 500);
    }
  },

  // 停止录制
  stopRecording() {
    if (this.recorder.isRecording) {
      this.recorder.durationMs = Math.min(this.MAX_RECORDING_MS, Math.max(
        0, Date.now() - this.recorder.startTime,
        this.recorder.events[this.recorder.events.length - 1]?.time || 0
      ));
    }
    this.recorder.isRecording = false;
    if (this._recorderDeadlineTimeout !== undefined && this._recorderDeadlineTimeout !== null) {
      clearTimeout(this._recorderDeadlineTimeout);
      this._recorderDeadlineTimeout = null;
    }
    if (this._recorderTimerInterval) {
      clearInterval(this._recorderTimerInterval);
      this._recorderTimerInterval = null;
    }
    const recordBtn = document.getElementById('music-record-btn');
    if (recordBtn) recordBtn.classList.remove('recording');
    const timerEl = document.getElementById('music-record-timer');
    if (timerEl) {
      const seconds = Math.floor(this.recorder.durationMs / 1000);
      timerEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    this.updateRecorderUI();
  },

  // 回放录制内容
  playRecording() {
    if (this.recorder.events.length === 0) {
      this.showToast(this.text('noRecording', '还没有录制内容'));
      return;
    }

    const events = this.normalizeRecording(this.recorder.events);
    if (!events) {
      this.showToast(this.text('invalidComposition', '这份作品内容不完整，暂时无法打开。'));
      return;
    }

    this.stopPlayback();
    this.stopRecording();
    this.initAudioContext();
    const playBtn = document.getElementById('music-playback-btn');
    if (playBtn) playBtn.classList.add('playing');

    const totalDuration = Math.max(1, this.recorder.durationMs, events[events.length - 1].time);
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

    // 按时间戳回放事件
    this.recorder.playbackTimeouts = events.map(event => {
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
    this.recorder.durationMs = 0;
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

  text(key, fallback) {
    return typeof I18n !== 'undefined' ? I18n.t('music.' + key, fallback) : fallback;
  },

  // 保留损坏的原文，不能以空数组覆盖已有作品。
  readCompositions() {
    try {
      const raw = AppStorage.getItem('musicCompositions');
      if (raw === null) return [];
      const compositions = JSON.parse(raw);
      if (!Array.isArray(compositions)) throw new Error('invalid compositions');
      return compositions;
    } catch (error) {
      if (typeof SafeStorage !== 'undefined') SafeStorage.reportIssue('musicCompositions');
      return null;
    }
  },

  // 录音是可重放的音符/鼓点事件，不是只保存当前面板名称。
  normalizeRecording(events) {
    if (!Array.isArray(events) || events.length > this.MAX_RECORDING_EVENTS) return null;
    const sounds = ['piano', 'xylophone', 'bell', 'guitar', 'flute'];
    const drumIds = this.drums.instruments.map(drum => drum.id);
    const result = [];
    let previousTime = 0;
    for (const event of events) {
      if (!event || !Number.isFinite(event.time) || event.time < previousTime ||
        event.time > this.MAX_RECORDING_MS || !event.data || typeof event.data !== 'object') return null;
      let data;
      if (event.type === 'piano') {
        const { noteIndex, sound, octaveShift = 0 } = event.data;
        if (!Number.isInteger(noteIndex) || noteIndex < 0 || noteIndex >= this.piano.notes.length ||
          !sounds.includes(sound) || ![-1, 0, 1].includes(octaveShift)) return null;
        data = { noteIndex, sound, octaveShift };
      } else if (event.type === 'drum') {
        if (!drumIds.includes(event.data.drumId)) return null;
        data = { drumId: event.data.drumId };
      } else return null;
      result.push({ type: event.type, data, time: event.time });
      previousTime = event.time;
    }
    return result;
  },

  normalizeComposition(composition) {
    if (!composition || typeof composition !== 'object' ||
      (composition.version !== undefined && composition.version !== 2) ||
      !['piano', 'drums', 'sequencer'].includes(composition.mode) ||
      !Number.isFinite(composition.tempo) || composition.tempo < 40 || composition.tempo > 240) return null;
    let grid = null;
    let events = [];
    let durationMs = 0;
    if (composition.mode === 'sequencer') {
      if (!Array.isArray(composition.grid) || composition.grid.length !== this.sequencer.rows ||
        composition.grid.some(row => !Array.isArray(row) || row.length !== this.sequencer.cols ||
          row.some(cell => typeof cell !== 'boolean'))) return null;
      grid = composition.grid.map(row => row.slice());
    } else {
      events = this.normalizeRecording(composition.events);
      if (!events || !events.length) return null;
      durationMs = composition.duration_ms ?? events[events.length - 1].time;
      if (!Number.isFinite(durationMs) || durationMs < events[events.length - 1].time ||
        durationMs > this.MAX_RECORDING_MS) return null;
    }
    return { ...composition, grid, events, duration_ms: durationMs };
  },

  saveComposition() {
    const compositions = this.readCompositions();
    if (!compositions) {
      this.showToast(this.text('storageInvalid', '作品存档无法读取，已保留原数据，请先导出备份。'));
      return false;
    }

    const sequencer = this.currentMode === 'sequencer';
    const hasContent = sequencer
      ? this.sequencer.grid.some(row => row.some(Boolean))
      : this.recorder.events.length > 0;
    if (!hasContent) {
      this.showToast(this.text('nothingToSave', '先录制一段演奏，或在音乐画板上点亮格子，再保存吧。'));
      return false;
    }

    const composition = this.normalizeComposition({
      version: 2,
      id: Date.now(),
      date: new Date().toISOString(),
      mode: this.currentMode,
      grid: sequencer ? this.sequencer.grid : null,
      tempo: this.sequencer.tempo,
      events: sequencer ? [] : this.recorder.events,
      duration_ms: sequencer ? 0 : Math.min(this.MAX_RECORDING_MS, Math.max(
        this.recorder.durationMs,
        this.recorder.events[this.recorder.events.length - 1]?.time || 0,
        this.recorder.isRecording ? Date.now() - this.recorder.startTime : 0
      ))
    });
    if (!composition) {
      this.showToast(this.text('invalidComposition', '这份作品内容不完整，暂时无法保存或打开。'));
      return false;
    }

    if (!safeSetItem('musicCompositions', JSON.stringify([...compositions, composition]))) {
      this.showToast(this.text('saveFailed', '作品没有保存成功，请先备份或释放空间后再试。'));
      return false;
    }

    // 📊 追踪作品保存
    if (typeof Analytics !== 'undefined') {
      try { Analytics.trackWorkSave('music', this.currentMode); }
      catch (error) { /* 统计失败不改变实际保存结果 */ }
    }

    // 显示保存成功提示
    this.showToast(this.text('saved', '作品已保存！'));
    this.renderSavedWorks();

    // 触发成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.checkMusicAchievement();
    }
    return true;
  },

  // 旧版音序器按 grid/tempo/mode 恢复；旧钢琴/鼓点只有元数据，明确告知无法重放。
  loadComposition(index) {
    const compositions = this.readCompositions();
    if (!compositions) {
      this.showToast(this.text('storageInvalid', '作品存档无法读取，已保留原数据，请先导出备份。'));
      return false;
    }
    const saved = Number.isInteger(index) && index >= 0 ? compositions[index] : null;
    const composition = this.normalizeComposition(saved);
    if (!composition) {
      const legacy = saved && saved.version === undefined && ['piano', 'drums'].includes(saved.mode) && !saved.events;
      this.showToast(legacy
        ? this.text('legacyRecordingMissing', '旧作品没有保存演奏内容，无法恢复。')
        : this.text('invalidComposition', '这份作品内容不完整，暂时无法打开。'));
      return false;
    }
    this.stopRecording();
    this.switchMode(composition.mode);
    this.setTempo(composition.tempo);
    this.recorder.events = composition.events;
    this.recorder.durationMs = composition.duration_ms;
    if (composition.grid) {
      this.sequencer.grid = composition.grid;
      document.querySelectorAll('.seq-cell').forEach(cell => {
        const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
        cell.classList.toggle('active', !!this.sequencer.grid[row]?.[col]);
      });
    }
    const timer = document.getElementById('music-record-timer');
    if (timer) {
      const seconds = Math.floor(composition.duration_ms / 1000);
      timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    this.updateRecorderUI();
    this.showToast(this.text('restored', '作品已打开，可以播放或继续创作。'));
    return true;
  },

  renderSavedWorks() {
    const container = document.querySelector('#music-modal .music-container');
    if (!container) return;
    let savedWorks = document.getElementById('music-saved-works');
    if (!savedWorks) {
      savedWorks = document.createElement('div');
      savedWorks.id = 'music-saved-works';
      savedWorks.className = 'music-recorder';
      const label = document.createElement('label');
      label.htmlFor = 'music-saved-select';
      label.dataset.i18n = 'music.savedWorks';
      label.textContent = this.text('savedWorks', '已保存的作品');
      const controls = document.createElement('div');
      controls.className = 'recorder-buttons';
      const select = document.createElement('select');
      select.id = 'music-saved-select';
      select.className = 'recorder-btn';
      const open = document.createElement('button');
      open.id = 'music-open-saved';
      open.className = 'recorder-btn';
      open.dataset.i18n = 'music.openSaved';
      open.textContent = this.text('openSaved', '打开作品');
      open.onclick = () => this.loadComposition(Number(select.value));
      controls.appendChild(select);
      controls.appendChild(open);
      savedWorks.appendChild(label);
      savedWorks.appendChild(controls);
      container.appendChild(savedWorks);
    }
    const select = document.getElementById('music-saved-select');
    const open = document.getElementById('music-open-saved');
    const selected = select.value;
    select.replaceChildren();
    const compositions = this.readCompositions();
    if (!compositions || !compositions.length) {
      const option = document.createElement('option');
      option.textContent = compositions
        ? this.text('noSavedWorks', '还没有保存作品')
        : this.text('storageInvalid', '作品存档无法读取，已保留原数据，请先导出备份。');
      select.appendChild(option);
      select.disabled = true;
      open.disabled = true;
      return;
    }
    for (let index = compositions.length - 1; index >= 0; index--) {
      const composition = compositions[index];
      const option = document.createElement('option');
      option.value = String(index);
      const mode = ['piano', 'drums', 'sequencer'].includes(composition?.mode) ? composition.mode : 'title';
      const date = new Date(composition?.date);
      const dateLabel = Number.isFinite(date.getTime()) ? date.toLocaleString() : '';
      option.textContent = `${index + 1}. ${this.text(mode, '音乐作品')} ${dateLabel}`;
      select.appendChild(option);
    }
    if (selected && [...select.options].some(option => option.value === selected)) select.value = selected;
    select.disabled = false;
    open.disabled = false;
  },

  // 显示提示
  showToast(message) {
    this._toast?.remove();
    const toast = document.createElement('div');
    this._toast = toast;
    toast.className = 'music-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        if (this._toast === toast) this._toast = null;
      }, 300);
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
  return MusicApp.saveComposition();
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
