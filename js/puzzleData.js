// ========== 拼图游戏数据配置 ==========

// 难度配置
const puzzleDifficulty = {
  easy: {
    id: 'easy',
    grid: 2,
    pieces: 4,
    points: 20,
    name: '简单',
    icon: '⭐'
  },
  medium: {
    id: 'medium',
    grid: 3,
    pieces: 9,
    points: 40,
    name: '中等',
    icon: '⭐⭐'
  },
  hard: {
    id: 'hard',
    grid: 4,
    pieces: 16,
    points: 60,
    name: '较难',
    icon: '⭐⭐⭐'
  }
};

// 拼图主题配置 - 使用 Lorem Picsum 免费图片服务
const puzzleThemes = {
  animal: {
    id: 'animal',
    name: '可爱动物',
    icon: '🦁',
    images: [
      { id: 'animal_001', name: '狮子', imageUrl: 'https://picsum.photos/seed/lion/400/400' },
      { id: 'animal_002', name: '熊猫', imageUrl: 'https://picsum.photos/seed/panda/400/400' },
      { id: 'animal_003', name: '小兔', imageUrl: 'https://picsum.photos/seed/rabbit/400/400' },
      { id: 'animal_004', name: '小狗', imageUrl: 'https://picsum.photos/seed/puppy/400/400' },
      { id: 'animal_005', name: '小猫', imageUrl: 'https://picsum.photos/seed/kitten/400/400' },
      { id: 'animal_006', name: '大象', imageUrl: 'https://picsum.photos/seed/elephant/400/400' }
    ]
  },
  fruit: {
    id: 'fruit',
    name: '新鲜水果',
    icon: '🍎',
    images: [
      { id: 'fruit_001', name: '苹果', imageUrl: 'https://picsum.photos/seed/apple/400/400' },
      { id: 'fruit_002', name: '香蕉', imageUrl: 'https://picsum.photos/seed/banana/400/400' },
      { id: 'fruit_003', name: '葡萄', imageUrl: 'https://picsum.photos/seed/grapes/400/400' },
      { id: 'fruit_004', name: '西瓜', imageUrl: 'https://picsum.photos/seed/watermelon/400/400' },
      { id: 'fruit_005', name: '橙子', imageUrl: 'https://picsum.photos/seed/orange/400/400' },
      { id: 'fruit_006', name: '草莓', imageUrl: 'https://picsum.photos/seed/strawberry/400/400' }
    ]
  },
  vehicle: {
    id: 'vehicle',
    name: '交通工具',
    icon: '🚗',
    images: [
      { id: 'vehicle_001', name: '汽车', imageUrl: 'https://picsum.photos/seed/car/400/400' },
      { id: 'vehicle_002', name: '公交车', imageUrl: 'https://picsum.photos/seed/bus/400/400' },
      { id: 'vehicle_003', name: '火车', imageUrl: 'https://picsum.photos/seed/train/400/400' },
      { id: 'vehicle_004', name: '飞机', imageUrl: 'https://picsum.photos/seed/airplane/400/400' },
      { id: 'vehicle_005', name: '轮船', imageUrl: 'https://picsum.photos/seed/ship/400/400' },
      { id: 'vehicle_006', name: '自行车', imageUrl: 'https://picsum.photos/seed/bicycle/400/400' }
    ]
  },
  nature: {
    id: 'nature',
    name: '自然风景',
    icon: '🌈',
    images: [
      { id: 'nature_001', name: '日出', imageUrl: 'https://picsum.photos/seed/sunrise/400/400' },
      { id: 'nature_002', name: '月亮', imageUrl: 'https://picsum.photos/seed/moon/400/400' },
      { id: 'nature_003', name: '彩虹', imageUrl: 'https://picsum.photos/seed/rainbow/400/400' },
      { id: 'nature_004', name: '花朵', imageUrl: 'https://picsum.photos/seed/flower/400/400' },
      { id: 'nature_005', name: '森林', imageUrl: 'https://picsum.photos/seed/forest/400/400' },
      { id: 'nature_006', name: '海滩', imageUrl: 'https://picsum.photos/seed/beach/400/400' }
    ]
  },
  cartoon: {
    id: 'cartoon',
    name: '可爱物品',
    icon: '🧸',
    images: [
      { id: 'cartoon_001', name: '玩具熊', imageUrl: 'https://picsum.photos/seed/teddybear/400/400' },
      { id: 'cartoon_002', name: '气球', imageUrl: 'https://picsum.photos/seed/balloon/400/400' },
      { id: 'cartoon_003', name: '冰淇淋', imageUrl: 'https://picsum.photos/seed/icecream/400/400' },
      { id: 'cartoon_004', name: '蛋糕', imageUrl: 'https://picsum.photos/seed/cake/400/400' },
      { id: 'cartoon_005', name: '糖果', imageUrl: 'https://picsum.photos/seed/candy/400/400' },
      { id: 'cartoon_006', name: '玩具', imageUrl: 'https://picsum.photos/seed/toys/400/400' }
    ]
  }
};

// 获取所有主题列表
function getPuzzleThemes() {
  return Object.values(puzzleThemes);
}

// 获取指定主题
function getPuzzleTheme(themeId) {
  return puzzleThemes[themeId];
}

// 获取难度配置
function getPuzzleDifficulty(difficultyId) {
  return puzzleDifficulty[difficultyId];
}

// 获取所有难度列表
function getPuzzleDifficulties() {
  return Object.values(puzzleDifficulty);
}
