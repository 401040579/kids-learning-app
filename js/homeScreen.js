// ========== 首页分屏（iPhone 风主屏） ==========
// 36 个功能入口按 4 屏组织：⭐常用 / 📚学习 / 🎮游戏 / 🔧工具
// 横向滑动翻屏（CSS scroll-snap），顶部 tab + 底部圆点指示当前屏

const HomeScreen = {
  current: 0,
  _raf: 0,
  _tween: 0,

  // 图标底色（按序循环）
  PALETTE: [
    'linear-gradient(135deg, #FFB6D9, #FF8FAB)',
    'linear-gradient(135deg, #A0E7E5, #6EC6CA)',
    'linear-gradient(135deg, #FFE08A, #FFC55C)',
    'linear-gradient(135deg, #C3B1E1, #A78BFA)',
    'linear-gradient(135deg, #B4F0B4, #7DDB8A)',
    'linear-gradient(135deg, #AEDCFF, #7EB9F2)',
    'linear-gradient(135deg, #FFC8A2, #FFA06B)',
    'linear-gradient(135deg, #F9B4E1, #E68BD2)'
  ],

  // 4 屏配置。id 与 RecentlyUsed.features 的 key 保持一致（注意 'sleep-music' 带连字符）
  PAGES: [
    { apps: [
      { id: 'explore', icon: '🎬', i18nKey: 'menu.explore', fallback: '探索视频', action: () => navigateTo('explore') },
      { id: 'math', icon: '🔢', i18nKey: 'menu.math', fallback: '数学游戏', action: () => navigateTo('math') },
      { id: 'english', icon: '🔤', i18nKey: 'menu.english', fallback: '学英语', action: () => navigateTo('english') },
      { id: 'chinese', icon: '📝', i18nKey: 'menu.chinese', fallback: '学中文', action: () => navigateTo('chinese') },
      { id: 'pictureBook', icon: '📚', i18nKey: 'menu.pictureBook', fallback: '绘本故事', action: () => showPictureBook() },
      { id: 'drawing', icon: '🎨', i18nKey: 'menu.drawing', fallback: '画画创作', action: () => openDrawing() },
      { id: 'puzzle', icon: '🧩', i18nKey: 'menu.puzzle', fallback: '拼图游戏', action: () => navigateTo('puzzle') },
      { id: 'checkin', icon: '📅', i18nKey: 'menu.checkin', fallback: '每日签到', action: () => showCheckin() }
    ] },
    { apps: [
      { id: 'science', icon: '🔬', i18nKey: 'menu.science', fallback: '科学探索', action: () => navigateTo('science') },
      { id: 'pronunciation', icon: '🎤', i18nKey: 'menu.pronunciation', fallback: '跟读练习', action: () => showPronunciation() },
      { id: 'writing', icon: '✍️', i18nKey: 'menu.writing', fallback: '书写练习', action: () => openWriting() },
      { id: 'lifeSkills', icon: '🏠', i18nKey: 'menu.lifeSkills', fallback: '生活技能', action: () => openLifeSkills() },
      { id: 'songPractice', icon: '🎶', i18nKey: 'menu.songPractice', fallback: '歌曲练习', action: () => openSongPractice() },
      { id: 'englishBoost', icon: '🌟', i18nKey: 'menu.englishBoost', fallback: '英语提升', action: () => showEnglishBoost() }
    ] },
    { apps: [
      { id: 'memory', icon: '🧠', i18nKey: 'menu.memory', fallback: '记忆训练', action: () => showMemoryGame() },
      { id: 'pet', icon: '🐱', i18nKey: 'menu.pet', fallback: '学习宠物', action: () => showLearningPet() },
      { id: 'music', icon: '🎵', i18nKey: 'menu.music', fallback: '音乐创作', action: () => openMusic() },
      { id: 'familyPK', icon: '👨‍👩‍👧', i18nKey: 'menu.familyPK', fallback: '亲子PK', action: () => showFamilyPK() },
      { id: 'logicGames', icon: '🧩', i18nKey: 'menu.logicGames', fallback: '逻辑训练', action: () => showLogicGames() },
      { id: 'reactionGames', icon: '⚡', i18nKey: 'menu.reactionGames', fallback: '反应训练', action: () => showReactionGames() },
      { id: 'drawSmash', icon: '✏️', i18nKey: 'menu.drawSmash', fallback: '画线砸怪兽', action: () => showDrawSmash() },
      { id: 'ragdollRobot', icon: '🤖', i18nKey: 'menu.ragdollRobot', fallback: '弹弹机器人', action: () => showRagdollRobot() },
      { id: 'birthdayParty', icon: '🦄', i18nKey: 'menu.birthdayParty', fallback: '生日派对', action: () => showBirthdayParty() },
      { id: 'parkWallpaper', icon: '🏞️', i18nKey: 'menu.parkWallpaper', fallback: '魔法公园', action: () => showParkWallpaper() },
      { id: 'toothFairy', icon: '🧚', i18nKey: 'menu.toothFairy', fallback: '牙仙子', action: () => showToothFairy() }
    ] },
    { apps: [
      { id: 'timer', icon: '⏰', i18nKey: 'menu.timer', fallback: '玩耍计时', action: () => navigateTo('timer') },
      { id: 'calendar', icon: '🗓️', i18nKey: 'menu.calendar', fallback: '我的日历', action: () => navigateTo('calendar') },
      { id: 'sleep-music', icon: '🌙', i18nKey: 'menu.sleepMusic', fallback: '睡眠音乐', action: () => navigateTo('sleep-music') },
      { id: 'profile', icon: '👤', i18nKey: 'menu.profile', fallback: '我的信息', action: () => navigateTo('profile') },
      { id: 'achievements', icon: '🏆', i18nKey: 'menu.achievements', fallback: '我的成就', action: () => showAchievements() },
      { id: 'wrongQuestions', icon: '📕', i18nKey: 'menu.wrongQuestions', fallback: '错题本', action: () => showWrongQuestions() },
      { id: 'report', icon: '📊', i18nKey: 'menu.report', fallback: '学习报告', action: () => showLearningReport() },
      { id: 'parentMessage', icon: '💬', i18nKey: 'menu.parentMessage', fallback: '给爸妈留言', action: () => openMessageToParent() },
      { id: 'sos', icon: '🆘', i18nKey: 'menu.sos', fallback: '紧急求助', action: () => triggerSOS() },
      { id: 'parentSettings', icon: '👨‍👩‍👧', i18nKey: 'menu.parentSettings', fallback: '家长设置', action: () => openParentSettings() },
      { id: 'choreTracker', icon: '📋', i18nKey: 'menu.choreTracker', fallback: '家庭积分榜', action: () => showChoreTracker() }
    ] }
  ],

  // 渲染 4 屏图标 + 圆点，并绑定滑动同步
  init() {
    const pager = document.getElementById('home-pager');
    const dots = document.getElementById('pager-dots');
    if (!pager || !dots) return;

    let tileIndex = 0;
    pager.innerHTML = this.PAGES.map(page => `
      <div class="home-slide">
        <div class="app-grid">
          ${page.apps.map(app => {
            const bg = this.PALETTE[tileIndex++ % this.PALETTE.length];
            return `
              <button class="app-tile" onclick="HomeScreen.launch('${app.id}')">
                <span class="app-tile-icon" style="background: ${bg}">${app.icon}</span>
                <span class="app-tile-name" data-i18n="${app.i18nKey}">${app.fallback}</span>
              </button>`;
          }).join('')}
        </div>
      </div>`).join('');

    dots.innerHTML = this.PAGES.map((_, i) =>
      `<span class="dot${i === 0 ? ' active' : ''}"></span>`
    ).join('');

    // iOS Safari 不支持 scrollend，用 scroll + rAF 节流同步指示器
    pager.addEventListener('scroll', () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        const i = Math.max(0, Math.min(this.PAGES.length - 1,
          Math.round(pager.scrollLeft / pager.clientWidth)));
        if (i !== this.current) {
          this.current = i;
          this.syncIndicators(i);
        }
      });
    }, { passive: true });

    // 旋转屏/窗口变化后 scrollLeft 是旧像素值，按当前屏重新对齐
    window.addEventListener('resize', () => {
      pager.scrollLeft = this.current * pager.clientWidth;
    });

    // 用户上手滑动时取消进行中的翻页动画，避免和手势打架
    pager.addEventListener('touchstart', () => cancelAnimationFrame(this._tween), { passive: true });
    pager.addEventListener('wheel', () => cancelAnimationFrame(this._tween), { passive: true });
  },

  // 自绘平滑滚动：mandatory snap 容器上原生 smooth scrollTo 会被吸附逻辑打断卡死，
  // 每帧直接赋值 scrollLeft 则没有冲突（落点正好是吸附点）
  smoothScrollTo(pager, target) {
    cancelAnimationFrame(this._tween);
    const from = pager.scrollLeft;
    const delta = target - from;
    // 页面不可见时 rAF 被暂停，直接定位
    if (Math.abs(delta) < 1 || document.hidden) {
      pager.scrollLeft = target;
      return;
    }
    const DURATION = 300;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DURATION);
      const ease = 1 - Math.pow(1 - p, 3);
      pager.scrollLeft = from + delta * ease;
      if (p < 1) this._tween = requestAnimationFrame(step);
    };
    this._tween = requestAnimationFrame(step);
  },

  // 打开功能（各功能的最近使用记录由 navigateTo 或各模块自身完成，这里不重复记）
  launch(id) {
    for (const page of this.PAGES) {
      const app = page.apps.find(a => a.id === id);
      if (app) {
        app.action();
        return;
      }
    }
  },

  // 跳到第 i 屏。instant 用于从其他页面跳回（display:none 刚恢复，直接定位）
  goToPage(index, instant) {
    const pager = document.getElementById('home-pager');
    if (!pager) return;
    const i = Math.max(0, Math.min(this.PAGES.length - 1, index));
    this.current = i;
    this.syncIndicators(i);
    const target = i * pager.clientWidth;
    if (instant) {
      cancelAnimationFrame(this._tween);
      pager.scrollLeft = target;
    } else {
      this.smoothScrollTo(pager, target);
    }
  },

  // 回到首页时重置到第 1 屏（.page 切换用 display:none，会丢 scrollLeft）
  onShow() {
    const pager = document.getElementById('home-pager');
    if (!pager) return;
    cancelAnimationFrame(this._tween);
    this.current = 0;
    this.syncIndicators(0);
    pager.scrollLeft = 0;
  },

  // 同步顶部 tab、圆点、底部导航三处高亮
  syncIndicators(i) {
    document.querySelectorAll('.home-tab').forEach((tab, idx) => {
      tab.classList.toggle('active', idx === i);
    });
    document.querySelectorAll('#pager-dots .dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === i);
    });
    // 底部导航前 4 项对应 4 屏（常用→首页/学习/游戏/工具），仅在首页时跟随
    if (typeof currentPage === 'undefined' || currentPage === 'home') {
      const navItems = document.querySelectorAll('.nav-item');
      if (navItems.length > i) {
        navItems.forEach(item => item.classList.remove('active'));
        navItems[i].classList.add('active');
      }
    }
  }
};
