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

// 拼图主题配置 - 使用 LoremFlickr 免费图片服务（支持关键词搜索）
const puzzleThemes = {
  animal: {
    id: 'animal',
    name: '可爱动物',
    icon: '🦁',
    images: [
      { id: 'animal_001', name: '狮子', imageUrl: 'https://loremflickr.com/400/400/lion?lock=1' },
      { id: 'animal_002', name: '熊猫', imageUrl: 'https://loremflickr.com/400/400/panda?lock=2' },
      { id: 'animal_003', name: '小兔', imageUrl: 'https://loremflickr.com/400/400/rabbit?lock=3' },
      { id: 'animal_004', name: '小狗', imageUrl: 'https://loremflickr.com/400/400/dog,puppy?lock=4' },
      { id: 'animal_005', name: '小猫', imageUrl: 'https://loremflickr.com/400/400/cat,kitten?lock=5' },
      { id: 'animal_006', name: '大象', imageUrl: 'https://loremflickr.com/400/400/elephant?lock=6' }
    ]
  },
  fruit: {
    id: 'fruit',
    name: '新鲜水果',
    icon: '🍎',
    images: [
      { id: 'fruit_001', name: '苹果', imageUrl: 'https://loremflickr.com/400/400/apple,fruit?lock=11' },
      { id: 'fruit_002', name: '香蕉', imageUrl: 'https://loremflickr.com/400/400/banana?lock=12' },
      { id: 'fruit_003', name: '葡萄', imageUrl: 'https://loremflickr.com/400/400/grapes?lock=13' },
      { id: 'fruit_004', name: '西瓜', imageUrl: 'https://loremflickr.com/400/400/watermelon?lock=14' },
      { id: 'fruit_005', name: '橙子', imageUrl: 'https://loremflickr.com/400/400/orange,citrus?lock=15' },
      { id: 'fruit_006', name: '草莓', imageUrl: 'https://loremflickr.com/400/400/strawberry?lock=16' }
    ]
  },
  vehicle: {
    id: 'vehicle',
    name: '交通工具',
    icon: '🚗',
    images: [
      { id: 'vehicle_001', name: '汽车', imageUrl: 'https://loremflickr.com/400/400/car?lock=21' },
      { id: 'vehicle_002', name: '公交车', imageUrl: 'https://loremflickr.com/400/400/bus?lock=22' },
      { id: 'vehicle_003', name: '火车', imageUrl: 'https://loremflickr.com/400/400/train?lock=23' },
      { id: 'vehicle_004', name: '飞机', imageUrl: 'https://loremflickr.com/400/400/airplane?lock=24' },
      { id: 'vehicle_005', name: '轮船', imageUrl: 'https://loremflickr.com/400/400/ship,boat?lock=25' },
      { id: 'vehicle_006', name: '自行车', imageUrl: 'https://loremflickr.com/400/400/bicycle?lock=26' }
    ]
  },
  nature: {
    id: 'nature',
    name: '自然风景',
    icon: '🌈',
    images: [
      { id: 'nature_001', name: '日出', imageUrl: 'https://loremflickr.com/400/400/sunrise?lock=31' },
      { id: 'nature_002', name: '月亮', imageUrl: 'https://loremflickr.com/400/400/moon,night?lock=32' },
      { id: 'nature_003', name: '彩虹', imageUrl: 'https://loremflickr.com/400/400/rainbow?lock=33' },
      { id: 'nature_004', name: '花朵', imageUrl: 'https://loremflickr.com/400/400/flower?lock=34' },
      { id: 'nature_005', name: '森林', imageUrl: 'https://loremflickr.com/400/400/forest?lock=35' },
      { id: 'nature_006', name: '海滩', imageUrl: 'https://loremflickr.com/400/400/beach,ocean?lock=36' }
    ]
  },
  cartoon: {
    id: 'cartoon',
    name: '可爱物品',
    icon: '🧸',
    images: [
      { id: 'cartoon_001', name: '玩具熊', imageUrl: 'https://loremflickr.com/400/400/teddy,bear?lock=41' },
      { id: 'cartoon_002', name: '气球', imageUrl: 'https://loremflickr.com/400/400/balloon?lock=42' },
      { id: 'cartoon_003', name: '冰淇淋', imageUrl: 'https://loremflickr.com/400/400/icecream?lock=43' },
      { id: 'cartoon_004', name: '蛋糕', imageUrl: 'https://loremflickr.com/400/400/cake?lock=44' },
      { id: 'cartoon_005', name: '糖果', imageUrl: 'https://loremflickr.com/400/400/candy?lock=45' },
      { id: 'cartoon_006', name: '玩具', imageUrl: 'https://loremflickr.com/400/400/toys?lock=46' }
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
