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

  // 装饰品
  accessories: [
    { id: 'bow', emoji: '🎀', name: '蝴蝶结', cost: 50 },
    { id: 'hat', emoji: '🎩', name: '小帽子', cost: 80 },
    { id: 'glasses', emoji: '👓', name: '眼镜', cost: 60 },
    { id: 'crown', emoji: '👑', name: '皇冠', cost: 200 },
    { id: 'scarf', emoji: '🧣', name: '围巾', cost: 70 },
    { id: 'flower', emoji: '🌸', name: '小花', cost: 40 }
  ],

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
    createdAt: null
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
    closePetFeed();
    LearningPet.updatePetDisplay();
    showPetMessage('吃饱了，好满足！');

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
