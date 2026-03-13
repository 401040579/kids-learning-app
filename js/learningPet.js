// ========== 学习宠物系统 ==========

const LearningPet = {
  // 宠物类型
  petTypes: [
    { id: 'cat', name: '小猫咪', stages: ['🥚', '🐱', '😺', '😸'] },
    { id: 'dog', name: '小狗狗', stages: ['🥚', '🐶', '🐕', '🦮'] },
    { id: 'rabbit', name: '小兔子', stages: ['🥚', '🐰', '🐇', '🐰'] },
    { id: 'bear', name: '小熊熊', stages: ['🥚', '🐻', '🧸', '🐻'] },
    { id: 'panda', name: '小熊猫', stages: ['🥚', '🐼', '🐼', '🐼'] },
    { id: 'dragon', name: '小龙龙', stages: ['🥚', '🐲', '🐉', '🐲'] }
  ],

  // 食物类型
  foods: [
    { id: 'apple', emoji: '🍎', name: '苹果', exp: 5, cost: 10 },
    { id: 'cake', emoji: '🍰', name: '蛋糕', exp: 10, cost: 20 },
    { id: 'candy', emoji: '🍬', name: '糖果', exp: 3, cost: 5 },
    { id: 'milk', emoji: '🥛', name: '牛奶', exp: 8, cost: 15 },
    { id: 'cookie', emoji: '🍪', name: '饼干', exp: 6, cost: 12 },
    { id: 'icecream', emoji: '🍦', name: '冰淇淋', exp: 12, cost: 25 }
  ],

  // 旧版装饰品（保留兼容）
  accessories: [
    { id: 'bow', emoji: '🎀', name: '蝴蝶结', cost: 50 },
    { id: 'hat', emoji: '🎩', name: '小帽子', cost: 80 },
    { id: 'glasses', emoji: '👓', name: '眼镜', cost: 60 },
    { id: 'crown', emoji: '👑', name: '皇冠', cost: 200 },
    { id: 'scarf', emoji: '🧣', name: '围巾', cost: 70 },
    { id: 'flower', emoji: '🌸', name: '小花', cost: 40 }
  ],

  // 新版换装系统 - 多槽位衣服
  clothes: {
    hat: [
      { id: 'hat-cap', emoji: '🧢', name: '棒球帽', cost: 60 },
      { id: 'hat-wizard', emoji: '🎩', name: '魔法帽', cost: 120 },
      { id: 'hat-party', emoji: '🥳', name: '派对帽', cost: 80 },
      { id: 'hat-crown', emoji: '👑', name: '皇冠', cost: 200 },
      { id: 'hat-bow', emoji: '🎀', name: '蝴蝶结', cost: 50 }
    ],
    top: [
      { id: 'top-tshirt', emoji: '👕', name: 'T恤', cost: 70 },
      { id: 'top-shirt', emoji: '👔', name: '衬衫', cost: 90 },
      { id: 'top-sweater', emoji: '🧥', name: '毛衣', cost: 100 },
      { id: 'top-hoodie', emoji: '🧥', name: '卫衣', cost: 110 }
    ],
    bottom: [
      { id: 'bottom-jeans', emoji: '👖', name: '牛仔裤', cost: 80 },
      { id: 'bottom-shorts', emoji: '🩳', name: '短裤', cost: 50 },
      { id: 'bottom-skirt', emoji: '👗', name: '短裙', cost: 70 }
    ],
    shoes: [
      { id: 'shoes-sneaker', emoji: '👟', name: '运动鞋', cost: 90 },
      { id: 'shoes-boots', emoji: '👢', name: '靴子', cost: 110 },
      { id: 'shoes-sandals', emoji: '🩴', name: '凉鞋', cost: 60 }
    ],
    accessory: [
      { id: 'acc-glasses', emoji: '👓', name: '眼镜', cost: 60 },
      { id: 'acc-sunglasses', emoji: '🕶️', name: '墨镜', cost: 80 },
      { id: 'acc-scarf', emoji: '🧣', name: '围巾', cost: 70 },
      { id: 'acc-flower', emoji: '🌸', name: '小花', cost: 40 },
      { id: 'acc-necklace', emoji: '📿', name: '项链', cost: 100 }
    ]
  },

  // 房间装饰系统
  roomDecorations: {
    wallpapers: [
      { id: 'wall-default', emoji: '🏠', name: '默认', cost: 0, color: '#FCE4EC' },
      { id: 'wall-pink', emoji: '🎀', name: '粉色壁纸', cost: 80, color: '#FFB6C1' },
      { id: 'wall-blue', emoji: '💙', name: '蓝色壁纸', cost: 80, color: '#87CEEB' },
      { id: 'wall-green', emoji: '🌲', name: '森林壁纸', cost: 120, color: '#90EE90' },
      { id: 'wall-space', emoji: '🌌', name: '星空壁纸', cost: 200, color: '#191970' },
      { id: 'wall-ocean', emoji: '🌊', name: '海洋壁纸', cost: 150, color: '#00CED1' },
      { id: 'wall-sunset', emoji: '🌅', name: '夕阳壁纸', cost: 150, color: '#FF7F50' }
    ],
    furniture: [
      { id: 'furn-bed', emoji: '🛏️', name: '舒适小床', cost: 150, position: 'left' },
      { id: 'furn-lamp', emoji: '💡', name: '台灯', cost: 60, position: 'right-top' },
      { id: 'furn-plant', emoji: '🪴', name: '绿植', cost: 50, position: 'right' },
      { id: 'furn-bookshelf', emoji: '📚', name: '书架', cost: 120, position: 'left-top' },
      { id: 'furn-toy', emoji: '🧸', name: '玩具箱', cost: 100, position: 'center-bottom' },
      { id: 'furn-clock', emoji: '🕰️', name: '挂钟', cost: 80, position: 'top' },
      { id: 'furn-tv', emoji: '📺', name: '电视', cost: 180, position: 'top-center' }
    ],
    carpets: [
      { id: 'carpet-none', emoji: '⬜', name: '无', cost: 0, pattern: 'none' },
      { id: 'carpet-heart', emoji: '❤️', name: '爱心地毯', cost: 70, pattern: 'heart' },
      { id: 'carpet-star', emoji: '⭐', name: '星星地毯', cost: 70, pattern: 'star' },
      { id: 'carpet-rainbow', emoji: '🌈', name: '彩虹地毯', cost: 100, pattern: 'rainbow' },
      { id: 'carpet-flower', emoji: '🌸', name: '花朵地毯', cost: 80, pattern: 'flower' }
    ]
  },

  // 宠物数据
  data: {
    hasPet: false,
    petType: null,
    petName: '',
    exp: 0,
    level: 1,
    stage: 0,           // 0=蛋, 1=幼年, 2=成年, 3=进化
    happiness: 100,
    hunger: 100,
    ownedAccessories: [],
    equippedAccessory: null,
    lastFeedTime: null,
    lastPlayTime: null,
    totalFeeds: 0,
    createdAt: null,
    // 新增：换装系统数据
    ownedClothes: [],
    equippedOutfit: {
      hat: null,
      top: null,
      bottom: null,
      shoes: null,
      accessory: null
    },
    // 新增：房间装饰数据
    room: {
      currentWallpaper: 'wall-default',
      placedFurniture: [],
      currentCarpet: 'carpet-none',
      ownedDecorations: ['wall-default', 'carpet-none']
    }
  },

  // 升级所需经验
  expToLevel: [0, 20, 50, 100, 180, 300, 450, 650, 900, 1200],

  // 进化所需等级
  stageRequirements: [0, 1, 3, 7],

  // 初始化
  init() {
    this.loadData();
    this.startHungerDecay();
  },

  // 渲染宠物界面
  renderPetUI() {
    const selectArea = document.getElementById('pet-select-area');
    const mainArea = document.getElementById('pet-main-area');

    if (!this.data.hasPet) {
      // 显示宠物选择界面
      if (selectArea) {
        this.renderPetTypeSelect();
        selectArea.classList.remove('hidden');
      }
      if (mainArea) mainArea.classList.add('hidden');
    } else {
      // 显示宠物主界面
      if (selectArea) selectArea.classList.add('hidden');
      if (mainArea) {
        this.updatePetDisplay();
        mainArea.classList.remove('hidden');
      }
    }
  },

  // 渲染宠物类型选择
  renderPetTypeSelect() {
    const container = document.getElementById('pet-type-list');
    if (!container) return;

    let html = '';
    this.petTypes.forEach(pet => {
      html += `
        <div class="pet-type-card" data-type="${pet.id}" onclick="selectPetType('${pet.id}')">
          <div class="pet-type-emoji">${pet.stages[1]}</div>
          <div class="pet-type-name">${pet.name}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 领养宠物
  adoptPet(petType, petName) {
    this.createPet(petType, petName);
    RewardSystem.playSound('complete');
  },

  // 更新宠物显示
  updatePetDisplay() {
    const petType = this.petTypes.find(p => p.id === this.data.petType);
    if (!petType) return;

    const avatar = document.getElementById('pet-avatar');
    const name = document.getElementById('pet-display-name');
    const stageBadge = document.getElementById('pet-stage-badge');
    const message = document.getElementById('pet-message');

    if (avatar) avatar.textContent = petType.stages[this.data.stage];
    if (name) name.textContent = this.data.petName;
    if (stageBadge) {
      const stageNames = [
        I18n.t('pet.stage.egg') || '蛋',
        I18n.t('pet.stage.baby') || '幼年',
        I18n.t('pet.stage.adult') || '成年',
        I18n.t('pet.stage.evolved') || '进化'
      ];
      stageBadge.textContent = stageNames[this.data.stage];
    }
    if (message) {
      message.querySelector('.message-text').textContent = this.getPetMessage();
    }

    this.updateStatusBars();
  },

  // 更新状态条
  updateStatusBars() {
    const happinessFill = document.getElementById('happiness-fill');
    const hungerFill = document.getElementById('hunger-fill');
    const expFill = document.getElementById('exp-fill');
    const happinessValue = document.getElementById('happiness-value');
    const hungerValue = document.getElementById('hunger-value');
    const expValue = document.getElementById('exp-value');

    if (happinessFill) happinessFill.style.width = this.data.happiness + '%';
    if (hungerFill) hungerFill.style.width = this.data.hunger + '%';

    const expNeeded = this.getExpForNextLevel(this.data.level);
    if (expFill) expFill.style.width = (this.data.exp / expNeeded * 100) + '%';
    if (happinessValue) happinessValue.textContent = this.data.happiness;
    if (hungerValue) hungerValue.textContent = this.data.hunger;
    if (expValue) expValue.textContent = this.data.exp + '/' + expNeeded;
  },

  // 获取下一级所需经验
  getExpForNextLevel(level) {
    if (level >= this.expToLevel.length) {
      return this.expToLevel[this.expToLevel.length - 1] * 2;
    }
    return this.expToLevel[level] || 100;
  },

  // 获取宠物消息
  getPetMessage() {
    if (this.data.hunger < 30) {
      return I18n.t('pet.msg.hungry') || '我好饿啊...快给我吃点东西吧！';
    } else if (this.data.happiness < 30) {
      return I18n.t('pet.msg.sad') || '我不太开心...来陪我玩吧！';
    } else if (this.data.happiness >= 80 && this.data.hunger >= 80) {
      return I18n.t('pet.msg.happy') || '今天也要好好学习哦！我会一直陪着你！';
    } else {
      return I18n.t('pet.msg.content') || '和你在一起真开心！';
    }
  },

  // 抚摸宠物
  pet() {
    if (!this.data.hasPet) return null;

    this.data.happiness = Math.min(100, this.data.happiness + 5);
    this.saveData();

    return {
      message: '宠物很开心被抚摸！'
    };
  },

  // 渲染食物列表
  renderFoodList() {
    const container = document.getElementById('food-list');
    if (!container) return;

    const totalScore = RewardSystem.data.totalScore || 0;

    let html = '';
    this.foods.forEach(food => {
      const canAfford = totalScore >= food.cost;
      html += `
        <div class="food-item ${canAfford ? '' : 'disabled'}" onclick="${canAfford ? `feedPetFood('${food.id}')` : ''}">
          <div class="food-icon">${food.emoji}</div>
          <div class="food-name">${food.name}</div>
          <div class="food-cost">⭐${food.cost}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 渲染装饰品列表
  renderAccessoriesList() {
    const container = document.getElementById('accessories-list');
    if (!container) return;

    const owned = this.data.ownedAccessories || [];
    const equipped = this.data.equippedAccessory;

    if (owned.length === 0) {
      container.innerHTML = '<div class="no-accessories">还没有装饰品<br>答对题目可以购买哦！</div>';
      return;
    }

    let html = '';
    owned.forEach(accId => {
      const acc = this.accessories.find(a => a.id === accId);
      if (!acc) return;

      const isEquipped = equipped === accId;
      html += `
        <div class="accessory-item ${isEquipped ? 'equipped' : ''}"
             onclick="${isEquipped ? 'unequipAccessory()' : `equipAccessory('${accId}')`}">
          <div class="accessory-icon">${acc.emoji}</div>
          <div class="accessory-name">${acc.name}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  // 加载数据
  loadData() {
    const saved = localStorage.getItem('kidsLearningPet');
    if (saved) {
      this.data = { ...this.data, ...JSON.parse(saved) };
    }
  },

  // 保存数据
  saveData() {
    localStorage.setItem('kidsLearningPet', JSON.stringify(this.data));
  },

  // 开始饥饿衰减
  startHungerDecay() {
    // 每10分钟检查一次
    setInterval(() => {
      if (this.data.hasPet && this.data.hunger > 0) {
        this.data.hunger = Math.max(0, this.data.hunger - 5);
        this.data.happiness = Math.max(0, this.data.happiness - 2);
        this.saveData();
      }
    }, 600000); // 10分钟
  },

  // 创建宠物
  createPet(petTypeId, name) {
    const petType = this.petTypes.find(p => p.id === petTypeId);
    if (!petType) return false;

    this.data = {
      hasPet: true,
      petType: petTypeId,
      petName: name || petType.name,
      exp: 0,
      level: 1,
      stage: 0,
      happiness: 100,
      hunger: 100,
      ownedAccessories: [],
      equippedAccessory: null,
      lastFeedTime: new Date().toISOString(),
      lastPlayTime: new Date().toISOString(),
      totalFeeds: 0,
      createdAt: new Date().toISOString()
    };

    this.saveData();
    return true;
  },

  // 获取当前宠物信息
  getPetInfo() {
    if (!this.data.hasPet) return null;

    const petType = this.petTypes.find(p => p.id === this.data.petType);
    const currentEmoji = petType.stages[this.data.stage];
    const nextLevelExp = this.expToLevel[this.data.level] || 9999;
    const expProgress = (this.data.exp / nextLevelExp) * 100;

    // 计算下次进化所需等级
    let nextStageLevel = null;
    for (let i = this.data.stage + 1; i < this.stageRequirements.length; i++) {
      if (this.data.level < this.stageRequirements[i]) {
        nextStageLevel = this.stageRequirements[i];
        break;
      }
    }

    return {
      type: petType,
      name: this.data.petName,
      emoji: currentEmoji,
      level: this.data.level,
      exp: this.data.exp,
      nextLevelExp: nextLevelExp,
      expProgress: expProgress,
      stage: this.data.stage,
      stageName: ['蛋蛋', '幼年', '成年', '进化'][this.data.stage],
      happiness: this.data.happiness,
      hunger: this.data.hunger,
      equippedAccessory: this.data.equippedAccessory,
      nextStageLevel: nextStageLevel
    };
  },

  // 喂食
  feed(foodId) {
    if (!this.data.hasPet) return { success: false, message: '还没有宠物' };

    const food = this.foods.find(f => f.id === foodId);
    if (!food) return { success: false, message: '食物不存在' };

    // 检查积分是否足够
    if (RewardSystem.data.totalScore < food.cost) {
      return { success: false, message: '积分不够' };
    }

    // 扣除积分
    RewardSystem.data.totalScore -= food.cost;
    RewardSystem.saveData();
    RewardSystem.updateDisplay();

    // 增加经验和饱食度
    this.data.exp += food.exp;
    this.data.hunger = Math.min(100, this.data.hunger + 20);
    this.data.happiness = Math.min(100, this.data.happiness + 10);
    this.data.lastFeedTime = new Date().toISOString();
    this.data.totalFeeds++;

    // 检查升级
    const leveledUp = this.checkLevelUp();

    this.saveData();

    // 📊 追踪宠物喂食
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('pet_feed', {
        food_id: foodId,
        pet_level: this.data.level,
        leveled_up: leveledUp
      });
    }

    return {
      success: true,
      message: `喂了${food.name}！`,
      expGained: food.exp,
      leveledUp: leveledUp
    };
  },

  // 检查升级
  checkLevelUp() {
    let leveledUp = false;
    const maxLevel = this.expToLevel.length;

    while (this.data.level < maxLevel) {
      const needed = this.expToLevel[this.data.level];
      if (this.data.exp >= needed) {
        this.data.exp -= needed;
        this.data.level++;
        leveledUp = true;

        // 检查是否进化
        this.checkEvolution();
      } else {
        break;
      }
    }

    return leveledUp;
  },

  // 检查进化
  checkEvolution() {
    for (let i = this.stageRequirements.length - 1; i > this.data.stage; i--) {
      if (this.data.level >= this.stageRequirements[i]) {
        this.data.stage = i;
        return true;
      }
    }
    return false;
  },

  // 互动（增加快乐值）
  play() {
    if (!this.data.hasPet) return { success: false };

    const now = new Date();
    const lastPlay = this.data.lastPlayTime ? new Date(this.data.lastPlayTime) : null;

    // 检查冷却（1分钟）
    if (lastPlay && (now - lastPlay) < 60000) {
      const remaining = Math.ceil((60000 - (now - lastPlay)) / 1000);
      return { success: false, message: `休息一下，${remaining}秒后再玩` };
    }

    this.data.happiness = Math.min(100, this.data.happiness + 15);
    this.data.exp += 2;
    this.data.lastPlayTime = now.toISOString();

    const leveledUp = this.checkLevelUp();
    this.saveData();

    // 📊 追踪宠物互动
    if (typeof Analytics !== 'undefined') {
      Analytics.sendEvent('pet_play', {
        pet_level: this.data.level,
        happiness: this.data.happiness
      });
    }

    return { success: true, expGained: 2, leveledUp: leveledUp };
  },

  // 购买装饰品
  buyAccessory(accessoryId) {
    const accessory = this.accessories.find(a => a.id === accessoryId);
    if (!accessory) return { success: false, message: '装饰品不存在' };

    if (this.data.ownedAccessories.includes(accessoryId)) {
      return { success: false, message: '已经拥有了' };
    }

    if (RewardSystem.data.totalScore < accessory.cost) {
      return { success: false, message: '积分不够' };
    }

    RewardSystem.data.totalScore -= accessory.cost;
    RewardSystem.saveData();
    RewardSystem.updateDisplay();

    this.data.ownedAccessories.push(accessoryId);
    this.saveData();

    return { success: true, message: `获得了${accessory.name}！` };
  },

  // 装备装饰品
  equipAccessory(accessoryId) {
    if (!this.data.ownedAccessories.includes(accessoryId)) {
      return { success: false, message: '还没有这个装饰品' };
    }

    this.data.equippedAccessory = accessoryId;
    this.saveData();

    return { success: true };
  },

  // 卸下装饰品
  unequipAccessory() {
    this.data.equippedAccessory = null;
    this.saveData();
    return { success: true };
  },

  // 学习奖励（外部调用）
  addExpFromLearning(amount) {
    if (!this.data.hasPet) return;

    this.data.exp += amount;
    this.checkLevelUp();
    this.saveData();
  },

  // 重置宠物
  reset() {
    this.data = {
      hasPet: false,
      petType: null,
      petName: '',
      exp: 0,
      level: 1,
      stage: 0,
      happiness: 100,
      hunger: 100,
      ownedAccessories: [],
      equippedAccessory: null,
      lastFeedTime: null,
      lastPlayTime: null,
      totalFeeds: 0,
      createdAt: null
    };
    this.saveData();
  }
};

// 显示宠物页面
function showPetPage() {
  const container = document.getElementById('pet-page-content');
  if (!container) return;

  if (!LearningPet.data.hasPet) {
    renderPetSelection();
  } else {
    renderPetMain();
  }
}

// 渲染宠物选择
function renderPetSelection() {
  const container = document.getElementById('pet-page-content');
  if (!container) return;

  let html = `
    <div class="pet-selection">
      <h3 class="pet-selection-title">${I18n.t('pet.selectHint') || '选择你的宠物伙伴'}</h3>
      <div class="pet-selection-grid">
  `;

  LearningPet.petTypes.forEach(pet => {
    const petName = I18n.t(`pet.type.${pet.id}`) || pet.name;
    html += `
      <div class="pet-selection-card" onclick="selectPetType('${pet.id}')">
        <div class="pet-selection-emoji">${pet.stages[1]}</div>
        <div class="pet-selection-name">${petName}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// 选择宠物类型
function selectPetType(petTypeId) {
  const petType = LearningPet.petTypes.find(p => p.id === petTypeId);
  if (!petType) return;

  const petName = I18n.t(`pet.type.${petType.id}`) || petType.name;
  const nameYourPetText = (I18n.t('pet.nameYourPet') || '给你的{petType}起个名字吧').replace('{petType}', petName);

  const container = document.getElementById('pet-page-content');
  container.innerHTML = `
    <div class="pet-naming">
      <div class="pet-naming-preview">${petType.stages[0]}</div>
      <h3>${nameYourPetText}</h3>
      <input type="text" id="pet-name-input" class="pet-name-input"
             placeholder="${I18n.t('pet.enterName') || '输入名字'}" maxlength="10" value="${petName}">
      <div class="pet-naming-buttons">
        <button class="btn-pet-back" onclick="renderPetSelection()">${I18n.t('pet.back') || '返回'}</button>
        <button class="btn-pet-confirm" onclick="confirmPetCreation('${petTypeId}')">${I18n.t('pet.confirm') || '确定'}</button>
      </div>
    </div>
  `;
}

// 确认创建宠物
function confirmPetCreation(petTypeId) {
  const nameInput = document.getElementById('pet-name-input');
  const name = nameInput.value.trim() || LearningPet.petTypes.find(p => p.id === petTypeId).name;

  if (LearningPet.createPet(petTypeId, name)) {
    RewardSystem.playSound('complete');
    RewardSystem.createParticles();
    renderPetMain();
  }
}

// 渲染宠物主页
function renderPetMain() {
  const container = document.getElementById('pet-page-content');
  if (!container) return;

  const pet = LearningPet.getPetInfo();
  if (!pet) return;

  const accessoryEmoji = pet.equippedAccessory
    ? LearningPet.accessories.find(a => a.id === pet.equippedAccessory)?.emoji || ''
    : '';

  let html = `
    <div class="pet-main">
      <div class="pet-display">
        <div class="pet-accessory">${accessoryEmoji}</div>
        <div class="pet-emoji" onclick="petInteract()">${pet.emoji}</div>
        <div class="pet-name">${pet.name}</div>
        <div class="pet-stage">${pet.stageName} · Lv.${pet.level}</div>
      </div>

      <div class="pet-stats">
        <div class="pet-stat-bar">
          <span class="pet-stat-label">❤️ ${I18n.t('pet.happiness') || '快乐'}</span>
          <div class="pet-stat-track">
            <div class="pet-stat-fill happiness" style="width: ${pet.happiness}%"></div>
          </div>
          <span class="pet-stat-value">${pet.happiness}%</span>
        </div>
        <div class="pet-stat-bar">
          <span class="pet-stat-label">🍖 ${I18n.t('pet.fullness') || '饱食'}</span>
          <div class="pet-stat-track">
            <div class="pet-stat-fill hunger" style="width: ${pet.hunger}%"></div>
          </div>
          <span class="pet-stat-value">${pet.hunger}%</span>
        </div>
        <div class="pet-stat-bar">
          <span class="pet-stat-label">⭐ ${I18n.t('pet.experience') || '经验'}</span>
          <div class="pet-stat-track">
            <div class="pet-stat-fill exp" style="width: ${pet.expProgress}%"></div>
          </div>
          <span class="pet-stat-value">${pet.exp}/${pet.nextLevelExp}</span>
        </div>
      </div>

      ${pet.nextStageLevel ? `<div class="pet-evolution-hint">${(I18n.t('pet.evolutionHint') || 'Lv.{level} 可以进化哦！').replace('{level}', pet.nextStageLevel)}</div>` : ''}

      <div class="pet-actions">
        <button class="pet-action-btn" onclick="showPetFoodMenu()">
          <span class="action-icon">🍎</span>
          <span class="action-name">${I18n.t('pet.feed') || '喂食'}</span>
        </button>
        <button class="pet-action-btn" onclick="petInteract()">
          <span class="action-icon">🎾</span>
          <span class="action-name">${I18n.t('pet.interact') || '互动'}</span>
        </button>
        <button class="pet-action-btn" onclick="showPetShop()">
          <span class="action-icon">🛍️</span>
          <span class="action-name">${I18n.t('pet.shop') || '商店'}</span>
        </button>
        <button class="pet-action-btn" onclick="showPetAccessories()">
          <span class="action-icon">👔</span>
          <span class="action-name">${I18n.t('pet.dress') || '装扮'}</span>
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// 显示食物菜单
function showPetFoodMenu() {
  const modal = document.getElementById('pet-food-modal');
  if (!modal) return;

  let html = `<div class="pet-food-grid">`;

  LearningPet.foods.forEach(food => {
    const canAfford = RewardSystem.data.totalScore >= food.cost;
    const foodName = I18n.t(`pet.food.${food.id}`) || food.name;
    html += `
      <div class="pet-food-item ${canAfford ? '' : 'disabled'}" onclick="${canAfford ? `feedPet('${food.id}')` : ''}">
        <div class="food-emoji">${food.emoji}</div>
        <div class="food-name">${foodName}</div>
        <div class="food-info">
          <span class="food-exp">+${food.exp} EXP</span>
          <span class="food-cost">💰 ${food.cost}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById('pet-food-list').innerHTML = html;
  modal.classList.remove('hidden');
}

// 关闭食物菜单
function closePetFoodMenu() {
  document.getElementById('pet-food-modal').classList.add('hidden');
}

// 喂食
function feedPet(foodId) {
  const result = LearningPet.feed(foodId);

  if (result.success) {
    closePetFoodMenu();
    RewardSystem.playSound('correct');

    if (result.leveledUp) {
      RewardSystem.playSound('complete');
      RewardSystem.createParticles();
    }

    renderPetMain();
  } else {
    alert(result.message);
  }
}

// 宠物互动
function petInteract() {
  const result = LearningPet.play();

  if (result.success) {
    RewardSystem.playSound('click');

    // 添加动画效果
    const petEmoji = document.querySelector('.pet-emoji');
    if (petEmoji) {
      petEmoji.classList.add('pet-bounce');
      setTimeout(() => petEmoji.classList.remove('pet-bounce'), 500);
    }

    renderPetMain();
  } else if (result.message) {
    alert(result.message);
  }
}

// 显示商店
function showPetShop() {
  const modal = document.getElementById('pet-shop-modal');
  if (!modal) return;

  let html = `<div class="pet-shop-grid">`;

  LearningPet.accessories.forEach(acc => {
    const owned = LearningPet.data.ownedAccessories.includes(acc.id);
    const canAfford = RewardSystem.data.totalScore >= acc.cost;
    const accName = I18n.t(`pet.acc.${acc.id}`) || acc.name;

    html += `
      <div class="pet-shop-item ${owned ? 'owned' : ''} ${!owned && !canAfford ? 'disabled' : ''}"
           onclick="${owned ? '' : (canAfford ? `buyAccessory('${acc.id}')` : '')}">
        <div class="shop-item-emoji">${acc.emoji}</div>
        <div class="shop-item-name">${accName}</div>
        ${owned
          ? `<div class="shop-item-owned">${I18n.t('pet.acc.owned') || '已拥有'}</div>`
          : `<div class="shop-item-cost">💰 ${acc.cost}</div>`
        }
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById('pet-shop-list').innerHTML = html;
  modal.classList.remove('hidden');
}

// 关闭商店
function closePetShop() {
  document.getElementById('pet-shop-modal').classList.add('hidden');
}

// 购买装饰品
function buyAccessory(accessoryId) {
  const result = LearningPet.buyAccessory(accessoryId);

  if (result.success) {
    RewardSystem.playSound('complete');
    showPetShop(); // 刷新商店
    renderPetMain();
  } else {
    alert(result.message);
  }
}

// 显示装扮页面
function showPetAccessories() {
  const modal = document.getElementById('pet-accessories-modal');
  if (!modal) return;

  const owned = LearningPet.data.ownedAccessories;
  const equipped = LearningPet.data.equippedAccessory;

  let html = '';

  if (owned.length === 0) {
    html = `<div class="no-accessories">${I18n.t('pet.noAccessories') || '还没有装饰品，去商店看看吧！'}</div>`;
  } else {
    html = '<div class="accessories-grid">';
    owned.forEach(accId => {
      const acc = LearningPet.accessories.find(a => a.id === accId);
      if (!acc) return;

      const isEquipped = equipped === accId;
      const accName = I18n.t(`pet.acc.${acc.id}`) || acc.name;
      html += `
        <div class="accessory-item ${isEquipped ? 'equipped' : ''}"
             onclick="${isEquipped ? 'unequipPetAccessory()' : `equipPetAccessory('${accId}')`}">
          <div class="accessory-emoji">${acc.emoji}</div>
          <div class="accessory-name">${accName}</div>
          ${isEquipped ? `<div class="accessory-status">${I18n.t('pet.acc.equipped') || '已装备'}</div>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  document.getElementById('pet-accessories-list').innerHTML = html;
  modal.classList.remove('hidden');
}

// 关闭装扮页面
function closePetAccessories() {
  document.getElementById('pet-accessories-modal').classList.add('hidden');
}

// 装备装饰品
function equipPetAccessory(accessoryId) {
  LearningPet.equipAccessory(accessoryId);
  RewardSystem.playSound('click');
  showPetAccessories();
  renderPetMain();
}

// 卸下装饰品
function unequipPetAccessory() {
  LearningPet.unequipAccessory();
  RewardSystem.playSound('click');
  showPetAccessories();
  renderPetMain();
}

// 选择宠物类型
function selectPetType(typeId) {
  const cards = document.querySelectorAll('.pet-type-card');
  cards.forEach(card => {
    card.classList.toggle('selected', card.dataset.type === typeId);
  });
}

// 喂食宠物（新版）
function feedPetFood(foodId) {
  const result = LearningPet.feed(foodId);

  if (result.success) {
    RewardSystem.playSound('correct');
    closePetFoodMenu();
    LearningPet.updatePetDisplay();
    showPetMessage((typeof I18n !== 'undefined' && I18n.t('pet.fedMessage')) || '吃饱了，好满足！');

    // 检查是否进化
    if (result.evolved) {
      showPetEvolution(result.oldStage, result.newStage);
    }
  } else {
    alert(result.message);
  }
}

// 装备装饰品（简化版）
function equipAccessory(accId) {
  LearningPet.equipAccessory(accId);
  RewardSystem.playSound('click');
  closePetAccessories();
  LearningPet.updatePetDisplay();
}

// 卸下装饰品（简化版）
function unequipAccessory() {
  LearningPet.unequipAccessory();
  RewardSystem.playSound('click');
  closePetAccessories();
  LearningPet.updatePetDisplay();
}

// 显示宠物临时消息
function showPetMessage(message) {
  const msgEl = document.querySelector('.pet-speech-bubble');
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.classList.add('show');
    setTimeout(() => msgEl.classList.remove('show'), 2000);
  }
}

// 显示进化动画
function showPetEvolution(oldStage, newStage) {
  const modal = document.getElementById('pet-evolution-modal');
  if (!modal) return;

  const petType = LearningPet.petTypes.find(p => p.id === LearningPet.data.petType);
  if (!petType) return;

  const stageNames = ['蛋', '幼年期', '成年期', '进化形态'];

  document.getElementById('old-pet-stage').textContent = petType.stages[oldStage];
  document.getElementById('new-pet-stage').textContent = petType.stages[newStage];
  document.getElementById('evolution-stage-name').textContent = stageNames[newStage];

  modal.classList.remove('hidden');
}

// 关闭进化弹窗
function closePetEvolution() {
  document.getElementById('pet-evolution-modal').classList.add('hidden');
}

// ========== 换装系统扩展 ==========

// 显示换装页面
function showPetOutfit() {
  const modal = document.getElementById('pet-outfit-modal');
  if (!modal) return;

  renderOutfitTabs();
  renderOutfitContent('hat'); // 默认显示帽子

  modal.classList.remove('hidden');
}

// 关闭换装页面
function closePetOutfit() {
  document.getElementById('pet-outfit-modal').classList.add('hidden');
}

// 渲染换装标签
function renderOutfitTabs() {
  const tabs = document.getElementById('outfit-tabs');
  if (!tabs) return;

  const categories = [
    { id: 'hat', icon: '🎩', name: I18n.t('pet.outfit.hat') || '帽子' },
    { id: 'top', icon: '👕', name: I18n.t('pet.outfit.top') || '上衣' },
    { id: 'bottom', icon: '👖', name: I18n.t('pet.outfit.bottom') || '裤子' },
    { id: 'shoes', icon: '👟', name: I18n.t('pet.outfit.shoes') || '鞋子' },
    { id: 'accessory', icon: '👓', name: I18n.t('pet.outfit.accessory') || '配饰' }
  ];

  let html = '';
  categories.forEach((cat, index) => {
    html += `
      <button class="outfit-tab ${index === 0 ? 'active' : ''}" data-category="${cat.id}" onclick="switchOutfitTab('${cat.id}')">
        <span class="outfit-tab-icon">${cat.icon}</span>
        <span class="outfit-tab-name">${cat.name}</span>
      </button>
    `;
  });

  tabs.innerHTML = html;
}

// 切换换装标签
function switchOutfitTab(category) {
  // 更新标签状态
  document.querySelectorAll('.outfit-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });

  renderOutfitContent(category);
}

// 渲染换装内容
function renderOutfitContent(category) {
  const container = document.getElementById('outfit-items');
  if (!container) return;

  const items = LearningPet.clothes[category] || [];
  const owned = LearningPet.data.ownedClothes || [];
  const equipped = LearningPet.data.equippedOutfit[category];
  const totalScore = RewardSystem.data.totalScore || 0;

  let html = '<div class="outfit-grid">';

  // 添加"无"选项
  const noneEquipped = !equipped;
  html += `
    <div class="outfit-item ${noneEquipped ? 'equipped' : ''}" onclick="unequipOutfitSlot('${category}')">
      <div class="outfit-emoji">❌</div>
      <div class="outfit-name">${I18n.t('pet.outfit.none') || '不穿'}</div>
    </div>
  `;

  items.forEach(item => {
    const isOwned = owned.includes(item.id);
    const isEquipped = equipped === item.id;
    const canAfford = totalScore >= item.cost;
    const itemName = I18n.t(`pet.clothes.${item.id}`) || item.name;

    let clickAction = '';
    if (isOwned) {
      clickAction = isEquipped ? `unequipOutfitSlot('${category}')` : `equipOutfitItem('${category}', '${item.id}')`;
    } else if (canAfford) {
      clickAction = `buyOutfitItem('${category}', '${item.id}')`;
    }

    html += `
      <div class="outfit-item ${isEquipped ? 'equipped' : ''} ${!isOwned && !canAfford ? 'disabled' : ''} ${isOwned ? 'owned' : ''}"
           onclick="${clickAction}">
        <div class="outfit-emoji">${item.emoji}</div>
        <div class="outfit-name">${itemName}</div>
        ${isOwned
          ? (isEquipped ? `<div class="outfit-status">${I18n.t('pet.acc.equipped') || '已装备'}</div>` : '')
          : `<div class="outfit-cost">💰${item.cost}</div>`
        }
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // 更新预览
  updateOutfitPreview();
}

// 购买衣服
function buyOutfitItem(category, itemId) {
  const items = LearningPet.clothes[category];
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  if (RewardSystem.data.totalScore < item.cost) {
    alert(I18n.t('pet.error.noPoints') || '积分不够');
    return;
  }

  // 扣除积分
  RewardSystem.data.totalScore -= item.cost;
  RewardSystem.saveData();
  RewardSystem.updateDisplay();

  // 添加到拥有列表
  if (!LearningPet.data.ownedClothes) {
    LearningPet.data.ownedClothes = [];
  }
  LearningPet.data.ownedClothes.push(itemId);
  LearningPet.saveData();

  RewardSystem.playSound('complete');
  renderOutfitContent(category);
}

// 装备衣服
function equipOutfitItem(category, itemId) {
  if (!LearningPet.data.equippedOutfit) {
    LearningPet.data.equippedOutfit = { hat: null, top: null, bottom: null, shoes: null, accessory: null };
  }
  LearningPet.data.equippedOutfit[category] = itemId;
  LearningPet.saveData();

  RewardSystem.playSound('click');
  renderOutfitContent(category);
}

// 卸下某个槽位
function unequipOutfitSlot(category) {
  if (LearningPet.data.equippedOutfit) {
    LearningPet.data.equippedOutfit[category] = null;
    LearningPet.saveData();
  }

  RewardSystem.playSound('click');
  renderOutfitContent(category);
}

// 更新换装预览
function updateOutfitPreview() {
  const preview = document.getElementById('outfit-preview');
  if (!preview) return;

  const petType = LearningPet.petTypes.find(p => p.id === LearningPet.data.petType);
  const petEmoji = petType ? petType.stages[LearningPet.data.stage] : '🐱';
  const outfit = LearningPet.data.equippedOutfit || {};

  // 获取装备的emoji
  const getEquippedEmoji = (category, itemId) => {
    if (!itemId) return '';
    const items = LearningPet.clothes[category];
    const item = items.find(i => i.id === itemId);
    return item ? item.emoji : '';
  };

  preview.innerHTML = `
    <div class="outfit-preview-pet">
      <div class="outfit-layer hat">${getEquippedEmoji('hat', outfit.hat)}</div>
      <div class="outfit-layer pet">${petEmoji}</div>
      <div class="outfit-layer top">${getEquippedEmoji('top', outfit.top)}</div>
      <div class="outfit-layer bottom">${getEquippedEmoji('bottom', outfit.bottom)}</div>
      <div class="outfit-layer shoes">${getEquippedEmoji('shoes', outfit.shoes)}</div>
      <div class="outfit-layer accessory">${getEquippedEmoji('accessory', outfit.accessory)}</div>
    </div>
  `;
}

// ========== 房间装饰系统 ==========

// 显示房间装饰页面
function showPetRoom() {
  const modal = document.getElementById('pet-room-modal');
  if (!modal) return;

  renderRoomPreview();
  renderRoomTabs();
  renderRoomContent('wallpapers');

  modal.classList.remove('hidden');
}

// 关闭房间装饰页面
function closePetRoom() {
  document.getElementById('pet-room-modal').classList.add('hidden');
}

// 渲染房间预览
function renderRoomPreview() {
  const preview = document.getElementById('room-preview');
  if (!preview) return;

  const room = LearningPet.data.room || { currentWallpaper: 'wall-default', placedFurniture: [], currentCarpet: 'carpet-none' };
  const wallpaper = LearningPet.roomDecorations.wallpapers.find(w => w.id === room.currentWallpaper);
  const carpet = LearningPet.roomDecorations.carpets.find(c => c.id === room.currentCarpet);

  // 获取宠物emoji
  const petType = LearningPet.petTypes.find(p => p.id === LearningPet.data.petType);
  const petEmoji = petType ? petType.stages[LearningPet.data.stage] : '🐱';

  // 生成家具HTML
  let furnitureHtml = '';
  (room.placedFurniture || []).forEach(furnId => {
    const furn = LearningPet.roomDecorations.furniture.find(f => f.id === furnId);
    if (furn) {
      furnitureHtml += `<div class="room-furniture ${furn.position}">${furn.emoji}</div>`;
    }
  });

  // 判断壁纸是否深色
  const isDarkWallpaper = room.currentWallpaper === 'wall-space';

  preview.innerHTML = `
    <div class="room-scene ${isDarkWallpaper ? 'dark' : ''}" style="background-color: ${wallpaper ? wallpaper.color : '#FCE4EC'}">
      ${furnitureHtml}
      <div class="room-carpet">${carpet && carpet.id !== 'carpet-none' ? carpet.emoji : ''}</div>
      <div class="room-pet">${petEmoji}</div>
    </div>
  `;
}

// 渲染房间装饰标签
function renderRoomTabs() {
  const tabs = document.getElementById('room-tabs');
  if (!tabs) return;

  const categories = [
    { id: 'wallpapers', icon: '🖼️', name: I18n.t('pet.room.wallpaper') || '壁纸' },
    { id: 'furniture', icon: '🪑', name: I18n.t('pet.room.furniture') || '家具' },
    { id: 'carpets', icon: '🟫', name: I18n.t('pet.room.carpet') || '地毯' }
  ];

  let html = '';
  categories.forEach((cat, index) => {
    html += `
      <button class="room-tab ${index === 0 ? 'active' : ''}" data-category="${cat.id}" onclick="switchRoomTab('${cat.id}')">
        <span class="room-tab-icon">${cat.icon}</span>
        <span class="room-tab-name">${cat.name}</span>
      </button>
    `;
  });

  tabs.innerHTML = html;
}

// 切换房间标签
function switchRoomTab(category) {
  document.querySelectorAll('.room-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });

  renderRoomContent(category);
}

// 渲染房间装饰内容
function renderRoomContent(category) {
  const container = document.getElementById('room-items');
  if (!container) return;

  const items = LearningPet.roomDecorations[category] || [];
  const room = LearningPet.data.room || { ownedDecorations: ['wall-default', 'carpet-none'], placedFurniture: [] };
  const owned = room.ownedDecorations || [];
  const totalScore = RewardSystem.data.totalScore || 0;

  let html = '<div class="room-items-grid">';

  items.forEach(item => {
    const isOwned = owned.includes(item.id) || item.cost === 0;
    const canAfford = totalScore >= item.cost;

    // 判断是否已装备/放置
    let isActive = false;
    if (category === 'wallpapers') {
      isActive = room.currentWallpaper === item.id;
    } else if (category === 'carpets') {
      isActive = room.currentCarpet === item.id;
    } else if (category === 'furniture') {
      isActive = (room.placedFurniture || []).includes(item.id);
    }

    let clickAction = '';
    if (isOwned) {
      if (category === 'wallpapers') {
        clickAction = `setRoomWallpaper('${item.id}')`;
      } else if (category === 'carpets') {
        clickAction = `setRoomCarpet('${item.id}')`;
      } else if (category === 'furniture') {
        clickAction = isActive ? `removeFurniture('${item.id}')` : `placeFurniture('${item.id}')`;
      }
    } else if (canAfford) {
      clickAction = `buyRoomDecoration('${category}', '${item.id}')`;
    }

    const itemName = I18n.t(`pet.room.${item.id}`) || item.name;

    html += `
      <div class="room-item ${isActive ? 'active' : ''} ${!isOwned && !canAfford ? 'disabled' : ''}"
           onclick="${clickAction}">
        <div class="room-item-emoji">${item.emoji}</div>
        <div class="room-item-name">${itemName}</div>
        ${isOwned
          ? (isActive ? `<div class="room-item-status">✓</div>` : '')
          : `<div class="room-item-cost">💰${item.cost}</div>`
        }
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// 购买房间装饰
function buyRoomDecoration(category, itemId) {
  const items = LearningPet.roomDecorations[category];
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  if (RewardSystem.data.totalScore < item.cost) {
    alert(I18n.t('pet.error.noPoints') || '积分不够');
    return;
  }

  // 扣除积分
  RewardSystem.data.totalScore -= item.cost;
  RewardSystem.saveData();
  RewardSystem.updateDisplay();

  // 添加到拥有列表
  if (!LearningPet.data.room) {
    LearningPet.data.room = { currentWallpaper: 'wall-default', placedFurniture: [], currentCarpet: 'carpet-none', ownedDecorations: ['wall-default', 'carpet-none'] };
  }
  if (!LearningPet.data.room.ownedDecorations) {
    LearningPet.data.room.ownedDecorations = ['wall-default', 'carpet-none'];
  }
  LearningPet.data.room.ownedDecorations.push(itemId);
  LearningPet.saveData();

  RewardSystem.playSound('complete');
  renderRoomContent(category);
}

// 设置壁纸
function setRoomWallpaper(wallpaperId) {
  if (!LearningPet.data.room) {
    LearningPet.data.room = { currentWallpaper: 'wall-default', placedFurniture: [], currentCarpet: 'carpet-none', ownedDecorations: ['wall-default', 'carpet-none'] };
  }
  LearningPet.data.room.currentWallpaper = wallpaperId;
  LearningPet.saveData();

  RewardSystem.playSound('click');
  renderRoomPreview();
  renderRoomContent('wallpapers');
}

// 设置地毯
function setRoomCarpet(carpetId) {
  if (!LearningPet.data.room) {
    LearningPet.data.room = { currentWallpaper: 'wall-default', placedFurniture: [], currentCarpet: 'carpet-none', ownedDecorations: ['wall-default', 'carpet-none'] };
  }
  LearningPet.data.room.currentCarpet = carpetId;
  LearningPet.saveData();

  RewardSystem.playSound('click');
  renderRoomPreview();
  renderRoomContent('carpets');
}

// 放置家具
function placeFurniture(furnitureId) {
  if (!LearningPet.data.room) {
    LearningPet.data.room = { currentWallpaper: 'wall-default', placedFurniture: [], currentCarpet: 'carpet-none', ownedDecorations: ['wall-default', 'carpet-none'] };
  }
  if (!LearningPet.data.room.placedFurniture) {
    LearningPet.data.room.placedFurniture = [];
  }

  // 最多放5个家具
  if (LearningPet.data.room.placedFurniture.length >= 5) {
    alert(I18n.t('pet.room.maxFurniture') || '最多只能放置5件家具');
    return;
  }

  LearningPet.data.room.placedFurniture.push(furnitureId);
  LearningPet.saveData();

  RewardSystem.playSound('click');
  renderRoomPreview();
  renderRoomContent('furniture');
}

// 移除家具
function removeFurniture(furnitureId) {
  if (!LearningPet.data.room || !LearningPet.data.room.placedFurniture) return;

  const index = LearningPet.data.room.placedFurniture.indexOf(furnitureId);
  if (index > -1) {
    LearningPet.data.room.placedFurniture.splice(index, 1);
    LearningPet.saveData();
  }

  RewardSystem.playSound('click');
  renderRoomPreview();
  renderRoomContent('furniture');
}
