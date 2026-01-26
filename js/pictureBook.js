// ========== 绘本阅读模块 ==========

const PictureBook = {
  // 绘本数据
  books: [
    {
      id: 'three-little-pigs',
      title: '三只小猪',
      cover: '🐷',
      category: 'classic',
      ageRange: '3-6岁',
      duration: '5分钟',
      pages: [
        {
          image: '🏠🐷🐷🐷',
          text: '从前，有三只小猪，他们决定离开妈妈，建造自己的房子。',
          audio: null
        },
        {
          image: '🐷🌾',
          text: '大哥很懒，用稻草建了一座房子。"这样就够了！"他说。',
          audio: null
        },
        {
          image: '🐷🪵',
          text: '二哥比较勤快一点，用木头建了一座房子。',
          audio: null
        },
        {
          image: '🐷🧱',
          text: '小弟最勤劳，用砖头建了一座坚固的房子。',
          audio: null
        },
        {
          image: '🐺💨🏚️',
          text: '大灰狼来了！他深吸一口气，"呼——"稻草房子倒了！',
          audio: null
        },
        {
          image: '🐺💨🏠',
          text: '大灰狼又吹倒了木头房子！两只小猪跑到小弟家。',
          audio: null
        },
        {
          image: '🐺😤🧱🏠',
          text: '大灰狼使劲吹，但砖房子纹丝不动！',
          audio: null
        },
        {
          image: '🐺🔥😱',
          text: '大灰狼从烟囱爬进去，结果掉进了火炉里，逃跑了！',
          audio: null
        },
        {
          image: '🐷🐷🐷🎉',
          text: '三只小猪开心地跳起舞来。从此，他们快乐地生活在一起。',
          audio: null
        }
      ]
    },
    {
      id: 'little-red-riding-hood',
      title: '小红帽',
      cover: '👧🔴',
      category: 'classic',
      ageRange: '3-6岁',
      duration: '6分钟',
      pages: [
        {
          image: '👧🔴🧺',
          text: '从前有个可爱的小女孩，大家都叫她小红帽。',
          audio: null
        },
        {
          image: '👩🧺🍰',
          text: '妈妈说："小红帽，把这些点心送给生病的奶奶吧。"',
          audio: null
        },
        {
          image: '👧🌲🌲🌲',
          text: '小红帽走进了大森林，森林里开满了美丽的花。',
          audio: null
        },
        {
          image: '🐺👧',
          text: '一只大灰狼出现了！"你要去哪里呀，小姑娘？"',
          audio: null
        },
        {
          image: '🐺🏃💨',
          text: '狡猾的大灰狼抢先跑到奶奶家，把奶奶藏了起来。',
          audio: null
        },
        {
          image: '🐺🛏️👵',
          text: '大灰狼穿上奶奶的衣服，躺在床上假装奶奶。',
          audio: null
        },
        {
          image: '👧❓',
          text: '"奶奶，你的眼睛怎么这么大？""为了更好地看你呀！"',
          audio: null
        },
        {
          image: '🪓👨🐺',
          text: '猎人及时赶到，救出了小红帽和奶奶！',
          audio: null
        },
        {
          image: '👧👵💕',
          text: '小红帽学到了教训：不能和陌生人说话哦！',
          audio: null
        }
      ]
    },
    {
      id: 'ugly-duckling',
      title: '丑小鸭',
      cover: '🐣',
      category: 'classic',
      ageRange: '4-7岁',
      duration: '5分钟',
      pages: [
        {
          image: '🦆🥚🥚🥚🥚',
          text: '鸭妈妈孵出了一窝小鸭子，但有一只长得很不一样。',
          audio: null
        },
        {
          image: '🐤🐤🐤😢',
          text: '其他小鸭子都嘲笑它："你真丑！"丑小鸭很伤心。',
          audio: null
        },
        {
          image: '🐣🏃💨',
          text: '丑小鸭离开了家，独自在外面流浪。',
          audio: null
        },
        {
          image: '❄️🐣😰',
          text: '冬天来了，丑小鸭又冷又饿，差点被冻死。',
          audio: null
        },
        {
          image: '🌸🐣',
          text: '春天终于来了，丑小鸭来到了一个美丽的湖边。',
          audio: null
        },
        {
          image: '🦢🦢🦢',
          text: '湖上有几只美丽的白天鹅，丑小鸭羡慕地看着它们。',
          audio: null
        },
        {
          image: '🦢✨',
          text: '丑小鸭低头看水中的倒影——它变成了一只美丽的天鹅！',
          audio: null
        },
        {
          image: '🦢🦢🦢💕',
          text: '其他天鹅都欢迎它，丑小鸭终于找到了自己的家。',
          audio: null
        }
      ]
    },
    {
      id: 'tortoise-hare',
      title: '龟兔赛跑',
      cover: '🐢🐰',
      category: 'fable',
      ageRange: '3-6岁',
      duration: '4分钟',
      pages: [
        {
          image: '🐰😎🐢',
          text: '骄傲的兔子总是嘲笑走路慢的乌龟。',
          audio: null
        },
        {
          image: '🐢💪',
          text: '乌龟不服气："我们来比赛跑步吧！"',
          audio: null
        },
        {
          image: '🐰🐢🏁',
          text: '比赛开始了！兔子飞快地冲了出去。',
          audio: null
        },
        {
          image: '🐰😴🌳',
          text: '兔子跑到一半，觉得太轻松了，就在树下睡着了。',
          audio: null
        },
        {
          image: '🐢🚶',
          text: '乌龟一步一步，坚持不懈地向前爬。',
          audio: null
        },
        {
          image: '🐢🏁✨',
          text: '当兔子醒来时，乌龟已经到达终点了！',
          audio: null
        },
        {
          image: '🐢🏆🐰😢',
          text: '乌龟赢了！骄傲使人落后，坚持就是胜利！',
          audio: null
        }
      ]
    },
    {
      id: 'goldilocks',
      title: '金发姑娘和三只熊',
      cover: '👧🐻',
      category: 'classic',
      ageRange: '3-6岁',
      duration: '5分钟',
      pages: [
        {
          image: '🐻🐻🐻🏠',
          text: '森林里住着熊爸爸、熊妈妈和小熊宝宝。',
          audio: null
        },
        {
          image: '👧🌲',
          text: '一个金发小女孩在森林里迷路了，发现了小熊的家。',
          audio: null
        },
        {
          image: '👧🥣🥣🥣',
          text: '她尝了三碗粥。"这碗太烫，这碗太凉，这碗刚刚好！"',
          audio: null
        },
        {
          image: '👧🪑🪑🪑',
          text: '她坐了三把椅子，小熊的椅子最舒服，但被她坐坏了！',
          audio: null
        },
        {
          image: '👧🛏️😴',
          text: '她又试了三张床，在小熊的床上睡着了。',
          audio: null
        },
        {
          image: '🐻🐻🐻😲',
          text: '三只熊回家了！"谁动了我的东西？"',
          audio: null
        },
        {
          image: '👧🏃💨',
          text: '金发姑娘醒来吓了一跳，赶紧跑回家了！',
          audio: null
        },
        {
          image: '👧🙏',
          text: '她学到了教训：不能随便进别人的家哦！',
          audio: null
        }
      ]
    },
    {
      id: 'emperors-clothes',
      title: '皇帝的新衣',
      cover: '👑',
      category: 'classic',
      ageRange: '5-8岁',
      duration: '6分钟',
      pages: [
        {
          image: '👑👔👔👔',
          text: '从前有一个爱穿新衣服的皇帝。',
          audio: null
        },
        {
          image: '🧵🧵👨👨',
          text: '两个骗子来到王宫，说能织出最神奇的布料。',
          audio: null
        },
        {
          image: '👨🧵❓',
          text: '"这种布料，愚蠢的人是看不见的！"骗子说。',
          audio: null
        },
        {
          image: '👀❓',
          text: '大臣们来检查，什么也看不见，但都不敢说。',
          audio: null
        },
        {
          image: '👑😊',
          text: '皇帝也看不见布料，但假装很满意。',
          audio: null
        },
        {
          image: '👑🚶',
          text: '皇帝穿着"新衣"在街上游行，大家都假装称赞。',
          audio: null
        },
        {
          image: '👦📢',
          text: '"他什么都没穿啊！"一个小孩大声说出了真相。',
          audio: null
        },
        {
          image: '👑😳',
          text: '皇帝终于明白自己被骗了。诚实是最重要的品德！',
          audio: null
        }
      ]
    }
  ],

  // 分类
  categories: [
    { id: 'all', name: '全部', icon: '📚' },
    { id: 'classic', name: '经典童话', icon: '👑' },
    { id: 'fable', name: '寓言故事', icon: '🦊' },
    { id: 'science', name: '科普知识', icon: '🔬' },
    { id: 'habit', name: '好习惯', icon: '⭐' }
  ],

  // 当前状态
  currentBook: null,
  currentPage: 0,
  readingHistory: [],
  favorites: [],

  // 初始化
  init() {
    this.loadData();
  },

  // 加载数据
  loadData() {
    const saved = localStorage.getItem('kidsPictureBookData');
    if (saved) {
      const data = JSON.parse(saved);
      this.readingHistory = data.readingHistory || [];
      this.favorites = data.favorites || [];
    }
  },

  // 保存数据
  saveData() {
    localStorage.setItem('kidsPictureBookData', JSON.stringify({
      readingHistory: this.readingHistory,
      favorites: this.favorites
    }));
  },

  // 渲染书架界面
  renderBookshelf() {
    const selectArea = document.getElementById('book-select-area');
    const readArea = document.getElementById('book-read-area');

    if (selectArea) {
      this.renderCategoryTabs();
      this.renderBookGrid('all');
      selectArea.classList.remove('hidden');
    }
    if (readArea) {
      readArea.classList.add('hidden');
    }
  },

  // 渲染分类标签
  renderCategoryTabs() {
    const container = document.getElementById('bookshelf-tabs');
    if (!container) return;

    let html = '';
    this.categories.forEach((cat, index) => {
      html += `
        <button class="book-category-tab ${index === 0 ? 'active' : ''}"
                data-category="${cat.id}"
                onclick="filterBooks('${cat.id}')">
          <span>${cat.icon}</span>
          <span>${cat.name}</span>
        </button>
      `;
    });
    container.innerHTML = html;
  },

  // 渲染书籍网格
  renderBookGrid(category = 'all') {
    const container = document.getElementById('bookshelf-grid');
    if (!container) return;

    const filteredBooks = category === 'all'
      ? this.books
      : this.books.filter(b => b.category === category);

    if (filteredBooks.length === 0) {
      container.innerHTML = '<div class="no-books">暂无此类绘本</div>';
      return;
    }

    let html = '';
    filteredBooks.forEach(book => {
      const isFavorite = this.favorites.includes(book.id);
      const isRead = this.readingHistory.includes(book.id);

      html += `
        <div class="book-card" onclick="openBook('${book.id}')">
          <div class="book-cover">${book.cover}</div>
          <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-meta">
              <span>${book.ageRange}</span>
              <span>·</span>
              <span>${book.duration}</span>
            </div>
          </div>
          ${isRead ? '<div class="book-read-badge">已读</div>' : ''}
          <button class="book-favorite-btn ${isFavorite ? 'active' : ''}"
                  onclick="event.stopPropagation(); toggleFavorite('${book.id}')">
            ${isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 打开绘本
  openBook(bookId) {
    const book = this.books.find(b => b.id === bookId);
    if (!book) return;

    this.currentBook = book;
    this.currentPage = 0;

    // 📊 追踪绘本阅读
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('book_open', {
        book_id: bookId,
        book_title: book.title,
        total_pages: book.pages.length
      });
    }

    // 记录阅读历史
    if (!this.readingHistory.includes(bookId)) {
      this.readingHistory.push(bookId);
      this.saveData();
    }

    this.renderReadingPage();

    document.getElementById('book-select-area').classList.add('hidden');
    document.getElementById('book-read-area').classList.remove('hidden');
  },

  // 渲染阅读页面
  renderReadingPage() {
    if (!this.currentBook) return;

    const page = this.currentBook.pages[this.currentPage];
    const container = document.getElementById('book-read-area');
    if (!container) return;

    const totalPages = this.currentBook.pages.length;
    const progress = ((this.currentPage + 1) / totalPages) * 100;

    container.innerHTML = `
      <div class="reading-header">
        <button class="btn-back-books" onclick="backToBookshelf()">← 返回</button>
        <div class="reading-title">${this.currentBook.title}</div>
        <div class="reading-progress">${this.currentPage + 1}/${totalPages}</div>
      </div>

      <div class="reading-progress-bar">
        <div class="reading-progress-fill" style="width: ${progress}%"></div>
      </div>

      <div class="reading-content" onclick="nextPage()">
        <div class="page-image">${page.image}</div>
        <div class="page-text">${page.text}</div>
      </div>

      <div class="reading-controls">
        <button class="reading-nav-btn" onclick="prevPage()" ${this.currentPage === 0 ? 'disabled' : ''}>
          ◀ 上一页
        </button>
        <button class="reading-speak-btn" onclick="speakPageText()">
          🔊 朗读
        </button>
        <button class="reading-nav-btn" onclick="nextPage()" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
          下一页 ▶
        </button>
      </div>
    `;
  },

  // 上一页
  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.renderReadingPage();
    }
  },

  // 下一页
  nextPage() {
    if (this.currentPage < this.currentBook.pages.length - 1) {
      this.currentPage++;
      this.renderReadingPage();
    } else {
      // 完成阅读
      this.finishReading();
    }
  },

  // 当前音频对象
  currentAudio: null,

  // 朗读当前页面（使用 Puter.js AI 语音）
  async speakPageText() {
    if (!this.currentBook) return;
    const page = this.currentBook.pages[this.currentPage];
    const speakBtn = document.querySelector('.reading-speak-btn');

    // 如果正在播放，停止播放
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      if (speakBtn) {
        speakBtn.innerHTML = '🔊 朗读';
        speakBtn.disabled = false;
      }
      return;
    }

    // 显示加载状态
    if (speakBtn) {
      speakBtn.innerHTML = '⏳ 加载中...';
      speakBtn.disabled = true;
    }

    try {
      // 使用 Puter.js AI TTS（神经网络语音，更自然）
      if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) {
        const audio = await puter.ai.txt2speech(page.text, {
          voice: 'Zhiyu',      // 中文女声
          engine: 'neural',    // 神经网络引擎，声音更自然
          language: 'cmn-CN'   // 普通话
        });

        this.currentAudio = audio;

        // 更新按钮状态
        if (speakBtn) {
          speakBtn.innerHTML = '⏹️ 停止';
          speakBtn.disabled = false;
        }

        // 播放完成后重置
        audio.onended = () => {
          this.currentAudio = null;
          if (speakBtn) {
            speakBtn.innerHTML = '🔊 朗读';
          }
        };

        audio.play();
      } else {
        // 备选方案：使用 Web Speech API
        this.speakWithWebSpeech(page.text, speakBtn);
      }
    } catch (error) {
      console.error('Puter TTS 失败，使用备选方案:', error);
      // 备选方案：使用 Web Speech API
      this.speakWithWebSpeech(page.text, speakBtn);
    }
  },

  // 备选语音方案（Web Speech API）
  speakWithWebSpeech(text, speakBtn) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      utterance.pitch = 1.1;

      if (speakBtn) {
        speakBtn.innerHTML = '🔊 朗读中...';
        speakBtn.disabled = false;
      }

      utterance.onend = () => {
        if (speakBtn) {
          speakBtn.innerHTML = '🔊 朗读';
        }
      };

      speechSynthesis.speak(utterance);
    } else {
      if (speakBtn) {
        speakBtn.innerHTML = '🔊 朗读';
        speakBtn.disabled = false;
      }
      alert('您的浏览器不支持语音功能');
    }
  },

  // 完成阅读
  finishReading() {
    const points = 15;
    RewardSystem.addPoints(points, `读完了《${this.currentBook.title}》`);

    // 检查成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.checkProgress('booksRead', this.readingHistory.length);
    }

    // 显示完成弹窗
    this.showCompleteModal();
  },

  // 显示完成弹窗
  showCompleteModal() {
    const modal = document.getElementById('book-complete-modal');
    if (!modal) return;

    document.getElementById('complete-book-title').textContent = this.currentBook.title;
    document.getElementById('complete-book-cover').textContent = this.currentBook.cover;
    modal.classList.remove('hidden');
  },

  // 切换收藏
  toggleFavorite(bookId) {
    const index = this.favorites.indexOf(bookId);
    if (index === -1) {
      this.favorites.push(bookId);
      RewardSystem.playSound('click');
    } else {
      this.favorites.splice(index, 1);
    }
    this.saveData();
    this.renderBookGrid(document.querySelector('.book-category-tab.active')?.dataset.category || 'all');
  },

  // 返回书架
  backToBookshelf() {
    // 停止所有朗读
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    speechSynthesis.cancel();

    this.currentBook = null;
    this.currentPage = 0;
    this.renderBookshelf();
  }
};

// ========== 全局函数 ==========

function showPictureBook() {
  const modal = document.getElementById('picture-book-modal');
  if (!modal) return;

  PictureBook.renderBookshelf();
  modal.classList.remove('hidden');
}

function closePictureBook() {
  const modal = document.getElementById('picture-book-modal');
  if (modal) {
    // 停止所有朗读
    if (PictureBook.currentAudio) {
      PictureBook.currentAudio.pause();
      PictureBook.currentAudio = null;
    }
    speechSynthesis.cancel();
    modal.classList.add('hidden');
  }
}

function filterBooks(category) {
  // 更新标签状态
  document.querySelectorAll('.book-category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });
  PictureBook.renderBookGrid(category);
}

function openBook(bookId) {
  PictureBook.openBook(bookId);
}

function backToBookshelf() {
  PictureBook.backToBookshelf();
}

function prevPage() {
  PictureBook.prevPage();
}

function nextPage() {
  PictureBook.nextPage();
}

function speakPageText() {
  PictureBook.speakPageText();
}

function toggleFavorite(bookId) {
  PictureBook.toggleFavorite(bookId);
}

function closeBookComplete() {
  document.getElementById('book-complete-modal').classList.add('hidden');
  PictureBook.backToBookshelf();
}

function readAnotherBook() {
  document.getElementById('book-complete-modal').classList.add('hidden');
  PictureBook.backToBookshelf();
}
