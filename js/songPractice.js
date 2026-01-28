// ========== 歌曲练习模块 ==========

const SongPractice = {
  // 当前状态
  currentSong: null,
  currentLineIndex: -1,
  isPlaying: false,
  isPaused: false,
  speed: 1, // 0.7 慢速, 1 正常, 1.3 快速
  filterGroup: 'all', // 'all', 'black', 'blue', 'red'
  showPinyin: true,

  // TTS 相关
  ttsQueue: [],
  isSpeaking: false,

  // 初始化
  init() {
    this.currentSong = SongData.songs[0]; // 默认第一首歌
  },

  // 渲染歌曲选择（如果有多首歌）
  renderSongList() {
    const container = document.getElementById('song-list');
    if (!container) return;

    let html = '';
    SongData.songs.forEach(song => {
      html += `
        <div class="song-item ${this.currentSong?.id === song.id ? 'active' : ''}"
             onclick="SongPractice.selectSong('${song.id}')">
          <span class="song-emoji">${song.emoji}</span>
          <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-author">${song.author}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 选择歌曲
  selectSong(songId) {
    this.currentSong = SongData.songs.find(s => s.id === songId);
    this.currentLineIndex = -1;
    this.stop();
    this.renderLyrics();
    this.renderSongList();
  },

  // 渲染歌词
  renderLyrics() {
    const container = document.getElementById('song-lyrics');
    if (!container || !this.currentSong) return;

    let html = '';
    this.currentSong.lyrics.forEach((line, index) => {
      const groupConfig = SongData.groups[line.group] || SongData.groups.black;
      const isActive = index === this.currentLineIndex;
      const isFiltered = this.filterGroup !== 'all' && line.group !== this.filterGroup &&
                         !(line.groups && line.groups.includes(this.filterGroup));

      // 处理多组合唱的情况
      let groupIndicator = '';
      if (line.groups) {
        groupIndicator = line.groups.map(g => SongData.groups[g].emoji).join('');
      } else {
        groupIndicator = groupConfig.emoji;
      }

      html += `
        <div class="lyric-line ${isActive ? 'active' : ''} ${isFiltered ? 'filtered' : ''} group-${line.group}"
             data-index="${index}"
             style="--group-color: ${groupConfig.color}; --group-bg: ${groupConfig.bgColor}"
             onclick="SongPractice.playFromLine(${index})">
          <div class="lyric-group-indicator">${groupIndicator}</div>
          <div class="lyric-content">
            <div class="lyric-chinese">${line.chinese}</div>
            ${this.showPinyin ? `<div class="lyric-pinyin">${line.pinyin}</div>` : ''}
          </div>
          <div class="lyric-play-icon">${isActive && this.isPlaying ? '🔊' : '▶'}</div>
        </div>
      `;
    });
    container.innerHTML = html;

    // 滚动到当前行
    if (this.currentLineIndex >= 0) {
      this.scrollToLine(this.currentLineIndex);
    }
  },

  // 滚动到指定行
  scrollToLine(index) {
    const container = document.getElementById('song-lyrics');
    const line = container?.querySelector(`[data-index="${index}"]`);
    if (line && container) {
      const containerRect = container.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const scrollTop = line.offsetTop - container.offsetTop - containerRect.height / 2 + lineRect.height / 2;
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  },

  // 设置分组筛选
  setFilter(group) {
    this.filterGroup = group;
    this.renderLyrics();
    this.updateFilterButtons();
  },

  // 更新筛选按钮状态
  updateFilterButtons() {
    document.querySelectorAll('.song-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.group === this.filterGroup);
    });
  },

  // 切换拼音显示
  togglePinyin() {
    this.showPinyin = !this.showPinyin;
    this.renderLyrics();
    const btn = document.getElementById('btn-toggle-pinyin');
    if (btn) {
      btn.textContent = this.showPinyin ? '隐藏拼音' : '显示拼音';
    }
  },

  // 设置速度
  setSpeed(speed) {
    this.speed = speed;
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
  },

  // 从指定行开始播放
  playFromLine(index) {
    this.currentLineIndex = index;
    this.isPlaying = true;
    this.isPaused = false;
    this.renderLyrics();
    this.updatePlayButton();
    this.speakCurrentLine();

    // 追踪事件
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('song_play_line', {
        song: this.currentSong.id,
        line: index
      });
    }
  },

  // 从头播放
  play() {
    if (this.isPaused) {
      // 继续播放
      this.isPaused = false;
      this.isPlaying = true;
      this.speakCurrentLine();
    } else {
      // 从头开始
      this.playFromLine(0);
    }
    this.updatePlayButton();
  },

  // 暂停
  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    this.stopSpeaking();
    this.updatePlayButton();
  },

  // 停止
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentLineIndex = -1;
    this.stopSpeaking();
    this.renderLyrics();
    this.updatePlayButton();
  },

  // 更新播放按钮状态
  updatePlayButton() {
    const playBtn = document.getElementById('btn-song-play');
    const pauseBtn = document.getElementById('btn-song-pause');

    if (playBtn && pauseBtn) {
      if (this.isPlaying) {
        playBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
      } else {
        playBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
      }
    }
  },

  // 朗读当前行
  async speakCurrentLine() {
    if (!this.isPlaying || this.currentLineIndex < 0) return;
    if (this.currentLineIndex >= this.currentSong.lyrics.length) {
      this.stop();
      return;
    }

    const line = this.currentSong.lyrics[this.currentLineIndex];
    this.renderLyrics();

    try {
      // 使用 Puter.js TTS
      const text = line.chinese.replace(/\s+/g, '');
      await this.speak(text);

      // 播放完成后，等待一小段时间再播放下一行
      if (this.isPlaying && !this.isPaused) {
        const delay = Math.max(300, 800 / this.speed);
        setTimeout(() => {
          if (this.isPlaying && !this.isPaused) {
            this.currentLineIndex++;
            this.speakCurrentLine();
          }
        }, delay);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      // 如果 TTS 失败，尝试继续下一行
      if (this.isPlaying && !this.isPaused) {
        setTimeout(() => {
          this.currentLineIndex++;
          this.speakCurrentLine();
        }, 1000);
      }
    }
  },

  // 使用 Puter.js 朗读（神经网络语音）
  async speak(text) {
    try {
      if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) {
        // 使用 Puter.js 神经网络 TTS（与 aiChat/pictureBook 一致）
        const audio = await puter.ai.txt2speech(text, {
          voice: 'Zhiyu',      // 中文女声
          engine: 'neural',    // 神经网络引擎，声音更自然
          language: 'cmn-CN'   // 普通话
        });

        // 设置播放速度
        audio.playbackRate = this.speed;
        this.currentAudio = audio;

        // 返回一个 Promise，等待播放完成
        return new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = reject;
          audio.play().catch(reject);
        });
      } else {
        // 使用 Web Speech API 作为后备
        return this.speakWithWebSpeech(text);
      }
    } catch (err) {
      console.error('Puter TTS 失败，使用备选方案:', err);
      // 降级到 Web Speech API
      return this.speakWithWebSpeech(text);
    }
  },

  // Web Speech API 后备方案
  speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = this.speed;
        utterance.pitch = 1.1; // 稍微高一点更适合儿童

        utterance.onend = resolve;
        utterance.onerror = reject;

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        reject(new Error('Speech synthesis not supported'));
      }
    });
  },

  // 停止朗读
  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  // 单独朗读一行（不自动继续）
  async speakSingleLine(index) {
    const line = this.currentSong.lyrics[index];
    if (!line) return;

    this.stopSpeaking();
    this.currentLineIndex = index;
    this.renderLyrics();

    const text = line.chinese.replace(/\s+/g, '');
    try {
      await this.speak(text);
    } catch (error) {
      console.error('TTS Error:', error);
    }

    this.currentLineIndex = -1;
    this.renderLyrics();
  }
};

// ========== 全局函数 ==========

// 打开歌曲练习
function openSongPractice() {
  const modal = document.getElementById('song-practice-modal');
  if (modal) {
    modal.classList.remove('hidden');
    SongPractice.init();
    SongPractice.renderSongList();
    SongPractice.renderLyrics();
    SongPractice.updatePlayButton();
    SongPractice.updateFilterButtons();
  }

  // 追踪事件
  if (typeof Analytics !== 'undefined') {
    Analytics.sendEvent('open_song_practice');
  }

  // 🕐 记录最近使用
  if (typeof RecentlyUsed !== 'undefined') {
    RecentlyUsed.track('songPractice');
  }
}

// 关闭歌曲练习
function closeSongPractice() {
  SongPractice.stop();
  const modal = document.getElementById('song-practice-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 播放歌曲
function playSong() {
  SongPractice.play();
}

// 暂停歌曲
function pauseSong() {
  SongPractice.pause();
}

// 停止歌曲
function stopSong() {
  SongPractice.stop();
}

// 设置筛选
function setSongFilter(group) {
  SongPractice.setFilter(group);
}

// 设置速度
function setSongSpeed(speed) {
  SongPractice.setSpeed(speed);
}

// 切换拼音
function toggleSongPinyin() {
  SongPractice.togglePinyin();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  SongPractice.init();
});
