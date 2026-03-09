// ========== 家庭积分榜 - 家务/行为记录与积分系统 ==========

const ChoreTracker = {
  // 数据存储
  data: {
    members: [],           // 家庭成员 [{ id, name, avatar, totalPoints }]
    chores: [],            // 预设任务列表 [{ id, name, icon, points, category }]
    customChores: [],      // 自定义任务
    records: [],           // 记录 [{ id, memberId, choreId, choreName, points, date, time, note, type: 'add'|'deduct' }]
    settings: {
      dailyReset: false,   // 每日重置积分
      enableSound: true,   // 启用音效
      enableVoice: false   // 启用语音输入
    }
  },

  // 预设任务模板
  defaultChores: [
    // 日常习惯
    { id: 'brush_teeth', name: '刷牙', nameKey: 'chore.brushTeeth', icon: '🪥', points: 5, category: 'daily' },
    { id: 'wash_hands', name: '洗手', nameKey: 'chore.washHands', icon: '🧼', points: 3, category: 'daily' },
    { id: 'make_bed', name: '整理床铺', nameKey: 'chore.makeBed', icon: '🛏️', points: 5, category: 'daily' },
    { id: 'get_dressed', name: '自己穿衣', nameKey: 'chore.getDressed', icon: '👕', points: 5, category: 'daily' },
    { id: 'eat_veggies', name: '吃蔬菜', nameKey: 'chore.eatVeggies', icon: '🥦', points: 5, category: 'daily' },
    { id: 'drink_water', name: '多喝水', nameKey: 'chore.drinkWater', icon: '💧', points: 3, category: 'daily' },
    { id: 'nap', name: '午睡', nameKey: 'chore.nap', icon: '😴', points: 5, category: 'daily' },
    { id: 'early_bed', name: '早睡觉', nameKey: 'chore.earlyBed', icon: '🌙', points: 5, category: 'daily' },

    // 家务劳动
    { id: 'tidy_toys', name: '收拾玩具', nameKey: 'chore.tidyToys', icon: '🧸', points: 5, category: 'housework' },
    { id: 'set_table', name: '摆餐具', nameKey: 'chore.setTable', icon: '🍽️', points: 5, category: 'housework' },
    { id: 'water_plants', name: '浇花', nameKey: 'chore.waterPlants', icon: '🌱', points: 5, category: 'housework' },
    { id: 'feed_pet', name: '喂宠物', nameKey: 'chore.feedPet', icon: '🐕', points: 5, category: 'housework' },
    { id: 'clean_room', name: '打扫房间', nameKey: 'chore.cleanRoom', icon: '🧹', points: 10, category: 'housework' },
    { id: 'help_cook', name: '帮忙做饭', nameKey: 'chore.helpCook', icon: '👨‍🍳', points: 10, category: 'housework' },
    { id: 'throw_trash', name: '倒垃圾', nameKey: 'chore.throwTrash', icon: '🗑️', points: 5, category: 'housework' },
    { id: 'fold_clothes', name: '叠衣服', nameKey: 'chore.foldClothes', icon: '👔', points: 8, category: 'housework' },

    // 学习相关
    { id: 'do_homework', name: '写作业', nameKey: 'chore.doHomework', icon: '📖', points: 10, category: 'study' },
    { id: 'read_book', name: '读书30分钟', nameKey: 'chore.readBook', icon: '📚', points: 10, category: 'study' },
    { id: 'practice_piano', name: '练琴', nameKey: 'chore.practicePiano', icon: '🎹', points: 10, category: 'study' },
    { id: 'practice_writing', name: '练字', nameKey: 'chore.practiceWriting', icon: '✍️', points: 8, category: 'study' },
    { id: 'learn_app', name: '用学习App', nameKey: 'chore.learnApp', icon: '📱', points: 5, category: 'study' },

    // 好行为
    { id: 'be_polite', name: '说谢谢/请', nameKey: 'chore.bePolite', icon: '🙏', points: 3, category: 'behavior' },
    { id: 'share_toys', name: '分享玩具', nameKey: 'chore.shareToys', icon: '🤝', points: 5, category: 'behavior' },
    { id: 'help_others', name: '帮助他人', nameKey: 'chore.helpOthers', icon: '💕', points: 8, category: 'behavior' },
    { id: 'no_screen', name: '不看电视1小时', nameKey: 'chore.noScreen', icon: '📵', points: 5, category: 'behavior' },
    { id: 'be_patient', name: '有耐心', nameKey: 'chore.bePatient', icon: '🧘', points: 5, category: 'behavior' },

    // 运动/户外
    { id: 'exercise', name: '运动30分钟', nameKey: 'chore.exercise', icon: '🏃', points: 8, category: 'exercise' },
    { id: 'ride_bike', name: '骑自行车', nameKey: 'chore.rideBike', icon: '🚴', points: 8, category: 'exercise' },
    { id: 'outdoor_play', name: '户外玩耍', nameKey: 'chore.outdoorPlay', icon: '🌳', points: 5, category: 'exercise' },
    { id: 'swimming', name: '游泳', nameKey: 'chore.swimming', icon: '🏊', points: 10, category: 'exercise' }
  ],

  // 扣分项模板
  deductionItems: [
    { id: 'bad_temper', name: '发脾气', nameKey: 'chore.badTemper', icon: '😤', points: -5, category: 'deduction' },
    { id: 'not_listen', name: '不听话', nameKey: 'chore.notListen', icon: '🙉', points: -5, category: 'deduction' },
    { id: 'fight', name: '打人/推人', nameKey: 'chore.fight', icon: '👊', points: -10, category: 'deduction' },
    { id: 'messy', name: '弄脏衣服', nameKey: 'chore.messy', icon: '👕', points: -3, category: 'deduction' },
    { id: 'waste_food', name: '浪费食物', nameKey: 'chore.wasteFood', icon: '🍚', points: -5, category: 'deduction' },
    { id: 'too_much_screen', name: '看屏幕太久', nameKey: 'chore.tooMuchScreen', icon: '📺', points: -5, category: 'deduction' },
    { id: 'not_tidy', name: '不收拾', nameKey: 'chore.notTidy', icon: '🧸', points: -3, category: 'deduction' },
    { id: 'lie', name: '说谎', nameKey: 'chore.lie', icon: '🤥', points: -8, category: 'deduction' }
  ],

  // 奖励兑换列表
  rewardShop: [
    { id: 'reward_sticker', name: '贴纸一张', nameKey: 'chore.reward.sticker', icon: '⭐', cost: 20 },
    { id: 'reward_snack', name: '小零食', nameKey: 'chore.reward.snack', icon: '🍭', cost: 30 },
    { id: 'reward_toy_time', name: '玩具时间30分', nameKey: 'chore.reward.toyTime', icon: '🧸', cost: 40 },
    { id: 'reward_screen_time', name: '看动画片15分', nameKey: 'chore.reward.screenTime', icon: '📺', cost: 50 },
    { id: 'reward_outing', name: '出去玩', nameKey: 'chore.reward.outing', icon: '🎡', cost: 100 },
    { id: 'reward_choose_dinner', name: '选择晚餐', nameKey: 'chore.reward.chooseDinner', icon: '🍕', cost: 60 },
    { id: 'reward_new_toy', name: '新玩具', nameKey: 'chore.reward.newToy', icon: '🎁', cost: 200 },
    { id: 'reward_special', name: '特别奖励', nameKey: 'chore.reward.special', icon: '🌟', cost: 300 }
  ],

  // 当前状态
  currentView: 'dashboard',  // dashboard | chores | records | rewards | settings
  currentMemberId: null,
  currentCategory: 'all',

  // ========== 初始化 ==========
  init() {
    this.loadData();
    // 如果没有成员，添加一个默认成员
    if (this.data.members.length === 0) {
      this.data.members.push({
        id: 'child_1',
        name: '宝贝',
        avatar: '👦',
        totalPoints: 0
      });
      this.currentMemberId = 'child_1';
      this.saveData();
    } else {
      this.currentMemberId = this.data.members[0].id;
    }
    // 合并默认任务
    if (this.data.chores.length === 0) {
      this.data.chores = [...this.defaultChores];
      this.saveData();
    }
  },

  loadData() {
    const saved = localStorage.getItem('kidsChoreTracker');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.data = { ...this.data, ...parsed };
    }
  },

  saveData() {
    localStorage.setItem('kidsChoreTracker', JSON.stringify(this.data));
  },

  // ========== 显示/关闭 ==========
  show() {
    const modal = document.getElementById('chore-tracker-modal');
    if (!modal) return;

    if (typeof RecentlyUsed !== 'undefined') {
      RecentlyUsed.track('choreTracker');
    }

    this.currentView = 'dashboard';
    this.render();
    modal.classList.remove('hidden');
  },

  close() {
    const modal = document.getElementById('chore-tracker-modal');
    if (modal) modal.classList.add('hidden');
  },

  // ========== 主渲染 ==========
  render() {
    const content = document.getElementById('chore-tracker-content');
    if (!content) return;

    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);

    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard(content, t);
        break;
      case 'chores':
        this.renderChoreList(content, t);
        break;
      case 'deductions':
        this.renderDeductionList(content, t);
        break;
      case 'records':
        this.renderRecords(content, t);
        break;
      case 'rewards':
        this.renderRewardShop(content, t);
        break;
      case 'settings':
        this.renderSettings(content, t);
        break;
    }
  },

  // ========== 仪表板视图 ==========
  renderDashboard(content, t) {
    const member = this.getCurrentMember();
    if (!member) return;

    const todayStr = this.getTodayStr();
    const todayRecords = this.data.records.filter(r => r.date === todayStr && r.memberId === member.id);
    const todayPoints = todayRecords.reduce((sum, r) => sum + r.points, 0);
    const todayTasks = todayRecords.filter(r => r.points > 0).length;
    const weekPoints = this.getWeekPoints(member.id);
    const streak = this.getStreak(member.id);

    content.innerHTML = `
      <div class="ct-dashboard">
        <!-- 成员头像和积分 -->
        <div class="ct-member-card">
          <div class="ct-avatar" onclick="ChoreTracker.showAvatarPicker()">${member.avatar}</div>
          <div class="ct-member-info">
            <div class="ct-member-name" onclick="ChoreTracker.editMemberName()">${member.name}</div>
            <div class="ct-total-points">
              <span class="ct-points-icon">🏆</span>
              <span class="ct-points-num">${member.totalPoints}</span>
              <span class="ct-points-label">${t('chore.totalPoints', '总积分')}</span>
            </div>
          </div>
        </div>

        <!-- 今日概览 -->
        <div class="ct-today-summary">
          <div class="ct-summary-item">
            <div class="ct-summary-num ${todayPoints >= 0 ? 'positive' : 'negative'}">${todayPoints >= 0 ? '+' : ''}${todayPoints}</div>
            <div class="ct-summary-label">${t('chore.todayPoints', '今日积分')}</div>
          </div>
          <div class="ct-summary-item">
            <div class="ct-summary-num">${todayTasks}</div>
            <div class="ct-summary-label">${t('chore.todayTasks', '完成任务')}</div>
          </div>
          <div class="ct-summary-item">
            <div class="ct-summary-num">${weekPoints}</div>
            <div class="ct-summary-label">${t('chore.weekPoints', '本周积分')}</div>
          </div>
          <div class="ct-summary-item">
            <div class="ct-summary-num">${streak}${t('chore.dayUnit', '天')}</div>
            <div class="ct-summary-label">${t('chore.streak', '连续打卡')}</div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="ct-quick-actions">
          <button class="ct-action-btn ct-add-btn" onclick="ChoreTracker.switchView('chores')">
            <span class="ct-action-icon">✅</span>
            <span>${t('chore.addPoints', '加分')}</span>
          </button>
          <button class="ct-action-btn ct-deduct-btn" onclick="ChoreTracker.switchView('deductions')">
            <span class="ct-action-icon">❌</span>
            <span>${t('chore.deductPoints', '扣分')}</span>
          </button>
          <button class="ct-action-btn ct-custom-btn" onclick="ChoreTracker.showCustomInput()">
            <span class="ct-action-icon">✏️</span>
            <span>${t('chore.custom', '自定义')}</span>
          </button>
          <button class="ct-action-btn ct-reward-btn" onclick="ChoreTracker.switchView('rewards')">
            <span class="ct-action-icon">🎁</span>
            <span>${t('chore.redeemReward', '兑换')}</span>
          </button>
        </div>

        <!-- 今日记录 -->
        <div class="ct-today-records">
          <div class="ct-section-header">
            <h3>${t('chore.todayRecords', '今日记录')}</h3>
            <button class="ct-view-all" onclick="ChoreTracker.switchView('records')">${t('chore.viewAll', '查看全部')} →</button>
          </div>
          ${todayRecords.length === 0 ?
            `<div class="ct-empty">${t('chore.noRecords', '还没有记录哦，快去完成任务吧！')}</div>` :
            `<div class="ct-record-list">
              ${todayRecords.slice().reverse().map(r => `
                <div class="ct-record-item ${r.points > 0 ? 'ct-record-add' : 'ct-record-deduct'}">
                  <span class="ct-record-icon">${r.icon || '📝'}</span>
                  <span class="ct-record-name">${r.choreName}</span>
                  <span class="ct-record-points">${r.points > 0 ? '+' : ''}${r.points}</span>
                  <span class="ct-record-time">${r.time}</span>
                  <button class="ct-record-delete" onclick="ChoreTracker.deleteRecord('${r.id}')" title="${t('btn.delete', '删除')}">✕</button>
                </div>
              `).join('')}
            </div>`
          }
        </div>
      </div>
    `;
  },

  // ========== 任务列表 (加分) ==========
  renderChoreList(content, t) {
    const categories = [
      { id: 'daily', name: t('chore.cat.daily', '日常习惯'), icon: '🌅' },
      { id: 'housework', name: t('chore.cat.housework', '家务劳动'), icon: '🧹' },
      { id: 'study', name: t('chore.cat.study', '学习相关'), icon: '📖' },
      { id: 'behavior', name: t('chore.cat.behavior', '好行为'), icon: '💝' },
      { id: 'exercise', name: t('chore.cat.exercise', '运动/户外'), icon: '🏃' }
    ];

    const allChores = [...this.data.chores, ...this.data.customChores.filter(c => c.points > 0)];
    const todayStr = this.getTodayStr();
    const todayRecords = this.data.records.filter(r => r.date === todayStr && r.memberId === this.currentMemberId);
    const completedChoreIds = todayRecords.map(r => r.choreId);

    content.innerHTML = `
      <div class="ct-chore-list">
        <div class="ct-sub-header">
          <button class="ct-back-btn" onclick="ChoreTracker.switchView('dashboard')">← ${t('btn.back', '返回')}</button>
          <h3>✅ ${t('chore.selectTask', '选择完成的任务')}</h3>
        </div>

        <!-- 分类筛选 -->
        <div class="ct-category-tabs">
          <button class="ct-cat-tab ${this.currentCategory === 'all' ? 'active' : ''}" onclick="ChoreTracker.filterCategory('all')">
            ${t('chore.cat.all', '全部')}
          </button>
          ${categories.map(cat => `
            <button class="ct-cat-tab ${this.currentCategory === cat.id ? 'active' : ''}" onclick="ChoreTracker.filterCategory('${cat.id}')">
              ${cat.icon} ${cat.name}
            </button>
          `).join('')}
        </div>

        <!-- 任务网格 -->
        <div class="ct-chore-grid">
          ${allChores.filter(c => this.currentCategory === 'all' || c.category === this.currentCategory).map(chore => {
            const completed = completedChoreIds.includes(chore.id);
            const choreName = chore.nameKey ? t(chore.nameKey, chore.name) : chore.name;
            return `
              <div class="ct-chore-card ${completed ? 'ct-completed' : ''}" onclick="ChoreTracker.completeChore('${chore.id}')">
                <div class="ct-chore-icon">${chore.icon}</div>
                <div class="ct-chore-name">${choreName}</div>
                <div class="ct-chore-points">+${chore.points}</div>
                ${completed ? '<div class="ct-chore-check">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========== 扣分列表 ==========
  renderDeductionList(content, t) {
    const allDeductions = [...this.deductionItems, ...this.data.customChores.filter(c => c.points < 0)];

    content.innerHTML = `
      <div class="ct-chore-list">
        <div class="ct-sub-header">
          <button class="ct-back-btn" onclick="ChoreTracker.switchView('dashboard')">← ${t('btn.back', '返回')}</button>
          <h3>❌ ${t('chore.selectDeduction', '记录需要改进的行为')}</h3>
        </div>

        <div class="ct-chore-grid">
          ${allDeductions.map(item => {
            const itemName = item.nameKey ? t(item.nameKey, item.name) : item.name;
            return `
              <div class="ct-chore-card ct-deduction-card" onclick="ChoreTracker.applyDeduction('${item.id}')">
                <div class="ct-chore-icon">${item.icon}</div>
                <div class="ct-chore-name">${itemName}</div>
                <div class="ct-chore-points ct-negative">${item.points}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========== 历史记录 ==========
  renderRecords(content, t) {
    const member = this.getCurrentMember();
    if (!member) return;

    // 按日期分组
    const recordsByDate = {};
    this.data.records
      .filter(r => r.memberId === member.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .forEach(r => {
        if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
        recordsByDate[r.date].push(r);
      });

    const dates = Object.keys(recordsByDate).sort().reverse().slice(0, 14); // 最近14天

    content.innerHTML = `
      <div class="ct-records">
        <div class="ct-sub-header">
          <button class="ct-back-btn" onclick="ChoreTracker.switchView('dashboard')">← ${t('btn.back', '返回')}</button>
          <h3>📋 ${t('chore.history', '历史记录')}</h3>
        </div>

        ${dates.length === 0 ?
          `<div class="ct-empty">${t('chore.noHistory', '暂无历史记录')}</div>` :
          dates.map(date => {
            const records = recordsByDate[date];
            const dayTotal = records.reduce((sum, r) => sum + r.points, 0);
            const isToday = date === this.getTodayStr();
            const dateLabel = isToday ? t('chore.today', '今天') : this.formatDate(date);
            return `
              <div class="ct-date-group">
                <div class="ct-date-header">
                  <span class="ct-date-label">${dateLabel}</span>
                  <span class="ct-date-total ${dayTotal >= 0 ? 'positive' : 'negative'}">${dayTotal >= 0 ? '+' : ''}${dayTotal}</span>
                </div>
                <div class="ct-record-list">
                  ${records.map(r => `
                    <div class="ct-record-item ${r.points > 0 ? 'ct-record-add' : 'ct-record-deduct'}">
                      <span class="ct-record-icon">${r.icon || '📝'}</span>
                      <span class="ct-record-name">${r.choreName}</span>
                      <span class="ct-record-points">${r.points > 0 ? '+' : ''}${r.points}</span>
                      <span class="ct-record-time">${r.time}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')
        }
      </div>
    `;
  },

  // ========== 奖励兑换商店 ==========
  renderRewardShop(content, t) {
    const member = this.getCurrentMember();
    if (!member) return;

    content.innerHTML = `
      <div class="ct-reward-shop">
        <div class="ct-sub-header">
          <button class="ct-back-btn" onclick="ChoreTracker.switchView('dashboard')">← ${t('btn.back', '返回')}</button>
          <h3>🎁 ${t('chore.rewardShop', '奖励商店')}</h3>
        </div>

        <div class="ct-current-points">
          <span class="ct-points-icon">🏆</span>
          <span>${t('chore.availablePoints', '可用积分')}：<strong>${member.totalPoints}</strong></span>
        </div>

        <div class="ct-reward-grid">
          ${this.rewardShop.map(reward => {
            const canAfford = member.totalPoints >= reward.cost;
            const rewardName = reward.nameKey ? t(reward.nameKey, reward.name) : reward.name;
            return `
              <div class="ct-reward-card ${canAfford ? '' : 'ct-cant-afford'}" onclick="${canAfford ? `ChoreTracker.redeemReward('${reward.id}')` : ''}">
                <div class="ct-reward-icon">${reward.icon}</div>
                <div class="ct-reward-name">${rewardName}</div>
                <div class="ct-reward-cost">${reward.cost} ${t('chore.pointsUnit', '积分')}</div>
                ${canAfford ?
                  `<button class="ct-redeem-btn">${t('chore.redeem', '兑换')}</button>` :
                  `<div class="ct-need-more">${t('chore.needMore', '还差')} ${reward.cost - member.totalPoints}</div>`
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ========== 设置页 ==========
  renderSettings(content, t) {
    const member = this.getCurrentMember();

    content.innerHTML = `
      <div class="ct-settings">
        <div class="ct-sub-header">
          <button class="ct-back-btn" onclick="ChoreTracker.switchView('dashboard')">← ${t('btn.back', '返回')}</button>
          <h3>⚙️ ${t('chore.settings', '设置')}</h3>
        </div>

        <div class="ct-settings-group">
          <h4>${t('chore.memberInfo', '成员信息')}</h4>
          <div class="ct-setting-item">
            <label>${t('chore.memberName', '名字')}</label>
            <input type="text" class="ct-input" value="${member ? member.name : ''}"
              onchange="ChoreTracker.updateMemberName(this.value)" placeholder="${t('chore.enterName', '输入名字')}">
          </div>
          <div class="ct-setting-item">
            <label>${t('chore.avatar', '头像')}</label>
            <div class="ct-avatar-grid">
              ${['👦', '👧', '🧒', '👶', '🦸‍♂️', '🦸‍♀️', '🧑‍🚀', '🧚', '🐱', '🐶', '🐼', '🦄'].map(emoji => `
                <span class="ct-avatar-option ${member && member.avatar === emoji ? 'active' : ''}"
                  onclick="ChoreTracker.updateAvatar('${emoji}')">${emoji}</span>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="ct-settings-group">
          <h4>${t('chore.dataManagement', '数据管理')}</h4>
          <button class="ct-danger-btn" onclick="ChoreTracker.confirmResetPoints()">
            ${t('chore.resetPoints', '重置积分')}
          </button>
          <button class="ct-danger-btn" onclick="ChoreTracker.confirmClearRecords()">
            ${t('chore.clearRecords', '清空记录')}
          </button>
        </div>
      </div>
    `;
  },

  // ========== 核心操作 ==========

  // 完成任务 (加分)
  completeChore(choreId) {
    const allChores = [...this.data.chores, ...this.data.customChores];
    const chore = allChores.find(c => c.id === choreId);
    if (!chore) return;

    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    const choreName = chore.nameKey ? t(chore.nameKey, chore.name) : chore.name;

    const record = {
      id: this.generateId(),
      memberId: this.currentMemberId,
      choreId: chore.id,
      choreName: choreName,
      icon: chore.icon,
      points: chore.points,
      date: this.getTodayStr(),
      time: this.getTimeStr(),
      type: 'add'
    };

    this.data.records.push(record);
    this.updateMemberPoints(this.currentMemberId, chore.points);
    this.saveData();

    // 显示加分动画
    this.showPointsAnimation(chore.points, chore.icon);

    // 同步到全局奖励系统
    if (typeof RewardSystem !== 'undefined') {
      RewardSystem.addPoints(chore.points, choreName);
    }

    // 追踪成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.checkProgress('tasksDone', this.data.records.filter(r => r.points > 0).length);
    }

    this.render();
  },

  // 扣分
  applyDeduction(itemId) {
    const allItems = [...this.deductionItems, ...this.data.customChores.filter(c => c.points < 0)];
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    const itemName = item.nameKey ? t(item.nameKey, item.name) : item.name;

    // 确认扣分
    const confirmMsg = (t('chore.confirmDeduct', '确定要记录 "{name}" 吗？将扣除 {points} 分')).replace('{name}', itemName).replace('{points}', Math.abs(item.points));
    if (!confirm(confirmMsg)) return;

    const record = {
      id: this.generateId(),
      memberId: this.currentMemberId,
      choreId: item.id,
      choreName: itemName,
      icon: item.icon,
      points: item.points,
      date: this.getTodayStr(),
      time: this.getTimeStr(),
      type: 'deduct'
    };

    this.data.records.push(record);
    this.updateMemberPoints(this.currentMemberId, item.points);
    this.saveData();

    this.showPointsAnimation(item.points, item.icon);
    this.render();
  },

  // 删除记录
  deleteRecord(recordId) {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    if (!confirm(t('chore.confirmDelete', '确定要删除这条记录吗？'))) return;

    const record = this.data.records.find(r => r.id === recordId);
    if (!record) return;

    // 回退积分
    this.updateMemberPoints(record.memberId, -record.points);
    this.data.records = this.data.records.filter(r => r.id !== recordId);
    this.saveData();
    this.render();
  },

  // 兑换奖励
  redeemReward(rewardId) {
    const reward = this.rewardShop.find(r => r.id === rewardId);
    if (!reward) return;

    const member = this.getCurrentMember();
    if (!member || member.totalPoints < reward.cost) return;

    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    const rewardName = reward.nameKey ? t(reward.nameKey, reward.name) : reward.name;

    if (!confirm((t('chore.confirmRedeem', '确定要用 {cost} 积分兑换 "{name}" 吗？')).replace('{cost}', reward.cost).replace('{name}', rewardName))) return;

    // 扣除积分
    this.updateMemberPoints(member.id, -reward.cost);

    // 记录兑换
    const record = {
      id: this.generateId(),
      memberId: member.id,
      choreId: reward.id,
      choreName: '🎁 ' + rewardName,
      icon: reward.icon,
      points: -reward.cost,
      date: this.getTodayStr(),
      time: this.getTimeStr(),
      type: 'redeem'
    };
    this.data.records.push(record);
    this.saveData();

    // 显示兑换成功
    this.showRedeemSuccess(reward);
    this.render();
  },

  // ========== 自定义输入 ==========
  showCustomInput() {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);

    const overlay = document.createElement('div');
    overlay.className = 'ct-overlay';
    overlay.id = 'ct-custom-overlay';
    overlay.innerHTML = `
      <div class="ct-custom-dialog">
        <h3>✏️ ${t('chore.customEntry', '自定义记录')}</h3>

        <div class="ct-custom-form">
          <div class="ct-form-group">
            <label>${t('chore.description', '描述')}</label>
            <div class="ct-input-row">
              <input type="text" id="ct-custom-name" class="ct-input ct-custom-name-input"
                placeholder="${t('chore.enterDescription', '输入任务描述...')}"
                maxlength="20">
              ${this.canUseVoiceInput() ? `
                <button class="ct-voice-btn" id="ct-voice-btn" onclick="ChoreTracker.toggleVoiceInput()">
                  🎤
                </button>
              ` : ''}
            </div>
          </div>

          <div class="ct-form-group">
            <label>${t('chore.pointsAmount', '分值')}</label>
            <div class="ct-points-selector">
              <button class="ct-type-btn active" onclick="ChoreTracker.setCustomType('add', this)">${t('chore.addPoints', '加分')} +</button>
              <button class="ct-type-btn" onclick="ChoreTracker.setCustomType('deduct', this)">${t('chore.deductPoints', '扣分')} -</button>
            </div>
            <div class="ct-points-presets">
              ${[1, 3, 5, 8, 10, 15, 20].map(p => `
                <button class="ct-points-btn ${p === 5 ? 'active' : ''}" onclick="ChoreTracker.selectCustomPoints(${p}, this)">${p}</button>
              `).join('')}
            </div>
          </div>

          <div class="ct-form-group">
            <label>${t('chore.selectIcon', '选择图标')}</label>
            <div class="ct-icon-picker">
              ${['⭐', '🌟', '💪', '🎯', '🏅', '💎', '🔥', '👍', '❤️', '🌈', '🎉', '🍎'].map(icon => `
                <span class="ct-icon-option ${icon === '⭐' ? 'active' : ''}" onclick="ChoreTracker.selectCustomIcon('${icon}', this)">${icon}</span>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="ct-dialog-actions">
          <button class="ct-cancel-btn" onclick="ChoreTracker.closeCustomInput()">${t('btn.cancel', '取消')}</button>
          <button class="ct-confirm-btn" onclick="ChoreTracker.submitCustom()">${t('btn.confirm', '确认')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 存储自定义输入状态
    this._customState = { type: 'add', points: 5, icon: '⭐' };
  },

  setCustomType(type, btn) {
    this._customState.type = type;
    btn.parentElement.querySelectorAll('.ct-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  selectCustomPoints(points, btn) {
    this._customState.points = points;
    btn.parentElement.querySelectorAll('.ct-points-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  selectCustomIcon(icon, el) {
    this._customState.icon = icon;
    el.parentElement.querySelectorAll('.ct-icon-option').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
  },

  closeCustomInput() {
    const overlay = document.getElementById('ct-custom-overlay');
    if (overlay) overlay.remove();
    this._voiceRecognition = null;
  },

  submitCustom() {
    const nameInput = document.getElementById('ct-custom-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      nameInput.classList.add('ct-input-error');
      setTimeout(() => nameInput.classList.remove('ct-input-error'), 1000);
      return;
    }

    const points = this._customState.type === 'add' ? this._customState.points : -this._customState.points;

    const record = {
      id: this.generateId(),
      memberId: this.currentMemberId,
      choreId: 'custom_' + Date.now(),
      choreName: name,
      icon: this._customState.icon,
      points: points,
      date: this.getTodayStr(),
      time: this.getTimeStr(),
      type: this._customState.type === 'add' ? 'add' : 'deduct'
    };

    this.data.records.push(record);
    this.updateMemberPoints(this.currentMemberId, points);
    this.saveData();

    this.closeCustomInput();
    this.showPointsAnimation(points, this._customState.icon);

    if (points > 0 && typeof RewardSystem !== 'undefined') {
      RewardSystem.addPoints(points, name);
    }

    this.render();
  },

  // ========== 语音输入 ==========
  canUseVoiceInput() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  toggleVoiceInput() {
    const btn = document.getElementById('ct-voice-btn');
    if (!btn) return;

    if (this._voiceRecognition) {
      this._voiceRecognition.stop();
      this._voiceRecognition = null;
      btn.classList.remove('ct-voice-active');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = (typeof I18n !== 'undefined' && I18n.currentLang) ?
      (I18n.currentLang === 'zh' ? 'zh-CN' : I18n.currentLang) : 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      btn.classList.add('ct-voice-active');
      btn.textContent = '🔴';
    };

    recognition.onresult = (event) => {
      const input = document.getElementById('ct-custom-name');
      if (input && event.results[0]) {
        input.value = event.results[0][0].transcript;
      }
    };

    recognition.onend = () => {
      btn.classList.remove('ct-voice-active');
      btn.textContent = '🎤';
      this._voiceRecognition = null;
    };

    recognition.onerror = () => {
      btn.classList.remove('ct-voice-active');
      btn.textContent = '🎤';
      this._voiceRecognition = null;
    };

    this._voiceRecognition = recognition;
    recognition.start();
  },

  // ========== 成员管理 ==========
  getCurrentMember() {
    return this.data.members.find(m => m.id === this.currentMemberId);
  },

  updateMemberPoints(memberId, points) {
    const member = this.data.members.find(m => m.id === memberId);
    if (member) {
      member.totalPoints = Math.max(0, member.totalPoints + points);
    }
  },

  editMemberName() {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    const member = this.getCurrentMember();
    if (!member) return;
    const newName = prompt(t('chore.enterName', '输入名字'), member.name);
    if (newName && newName.trim()) {
      member.name = newName.trim();
      this.saveData();
      this.render();
    }
  },

  updateMemberName(name) {
    const member = this.getCurrentMember();
    if (member && name.trim()) {
      member.name = name.trim();
      this.saveData();
    }
  },

  showAvatarPicker() {
    this.switchView('settings');
  },

  updateAvatar(emoji) {
    const member = this.getCurrentMember();
    if (member) {
      member.avatar = emoji;
      this.saveData();
      this.render();
    }
  },

  // ========== 数据管理 ==========
  confirmResetPoints() {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    if (confirm(t('chore.confirmReset', '确定要重置积分为0吗？'))) {
      const member = this.getCurrentMember();
      if (member) {
        member.totalPoints = 0;
        this.saveData();
        this.render();
      }
    }
  },

  confirmClearRecords() {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    if (confirm(t('chore.confirmClear', '确定要清空所有记录吗？此操作不可恢复。'))) {
      this.data.records = [];
      this.data.members.forEach(m => m.totalPoints = 0);
      this.saveData();
      this.render();
    }
  },

  // ========== 动画效果 ==========
  showPointsAnimation(points, icon) {
    const anim = document.createElement('div');
    anim.className = `ct-points-anim ${points > 0 ? 'ct-anim-add' : 'ct-anim-deduct'}`;
    anim.textContent = `${icon} ${points > 0 ? '+' : ''}${points}`;
    document.body.appendChild(anim);

    // 播放音效
    if (this.data.settings.enableSound) {
      this.playSound(points > 0 ? 'success' : 'deduct');
    }

    setTimeout(() => anim.remove(), 1500);
  },

  showRedeemSuccess(reward) {
    const t = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key, fallback) : fallback);
    const rewardName = reward.nameKey ? t(reward.nameKey, reward.name) : reward.name;

    const overlay = document.createElement('div');
    overlay.className = 'ct-overlay ct-success-overlay';
    overlay.innerHTML = `
      <div class="ct-success-dialog">
        <div class="ct-success-icon">${reward.icon}</div>
        <div class="ct-success-title">${t('chore.redeemSuccess', '兑换成功！')}</div>
        <div class="ct-success-name">${rewardName}</div>
        <button class="ct-confirm-btn" onclick="this.parentElement.parentElement.remove()">${t('btn.confirm', '确认')}</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;

      if (type === 'success') {
        osc.frequency.value = 523;
        osc.start();
        setTimeout(() => { osc.frequency.value = 659; }, 100);
        setTimeout(() => { osc.frequency.value = 784; }, 200);
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      } else {
        osc.frequency.value = 300;
        osc.start();
        setTimeout(() => { osc.frequency.value = 200; }, 150);
        setTimeout(() => { osc.stop(); ctx.close(); }, 300);
      }
    } catch (e) {
      // 静默失败
    }
  },

  // ========== 工具函数 ==========
  switchView(view) {
    this.currentView = view;
    if (view === 'chores' || view === 'deductions') {
      this.currentCategory = 'all';
    }
    this.render();
  },

  filterCategory(category) {
    this.currentCategory = category;
    this.render();
  },

  getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  },

  getTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  },

  formatDate(dateStr) {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  },

  getWeekPoints(memberId) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    return this.data.records
      .filter(r => r.memberId === memberId && r.date >= weekStartStr)
      .reduce((sum, r) => sum + r.points, 0);
  },

  getStreak(memberId) {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hasRecord = this.data.records.some(r => r.memberId === memberId && r.date === dateStr && r.points > 0);
      if (hasRecord) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },

  generateId() {
    return 'ct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }
};

// 全局函数
function showChoreTracker() {
  ChoreTracker.show();
}

function closeChoreTracker() {
  ChoreTracker.close();
}
