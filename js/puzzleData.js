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

// 拼图主题配置
const puzzleThemes = {
  animal: {
    id: 'animal',
    name: '可爱动物',
    icon: '🦁',
    images: [
      { id: 'animal_001', name: '狮子', emoji: '🦁', backgroundColor: '#FFF3E0' },
      { id: 'animal_002', name: '熊猫', emoji: '🐼', backgroundColor: '#E8F5E9' },
      { id: 'animal_003', name: '小兔', emoji: '🐰', backgroundColor: '#FCE4EC' },
      { id: 'animal_004', name: '小狗', emoji: '🐶', backgroundColor: '#E3F2FD' },
      { id: 'animal_005', name: '小猫', emoji: '🐱', backgroundColor: '#FFF8E1' },
      { id: 'animal_006', name: '大象', emoji: '🐘', backgroundColor: '#F3E5F5' }
    ]
  },
  fruit: {
    id: 'fruit',
    name: '新鲜水果',
    icon: '🍎',
    images: [
      { id: 'fruit_001', name: '苹果', emoji: '🍎', backgroundColor: '#FFEBEE' },
      { id: 'fruit_002', name: '香蕉', emoji: '🍌', backgroundColor: '#FFFDE7' },
      { id: 'fruit_003', name: '葡萄', emoji: '🍇', backgroundColor: '#EDE7F6' },
      { id: 'fruit_004', name: '西瓜', emoji: '🍉', backgroundColor: '#E8F5E9' },
      { id: 'fruit_005', name: '橙子', emoji: '🍊', backgroundColor: '#FFF3E0' },
      { id: 'fruit_006', name: '草莓', emoji: '🍓', backgroundColor: '#FCE4EC' }
    ]
  },
  vehicle: {
    id: 'vehicle',
    name: '交通工具',
    icon: '🚗',
    images: [
      { id: 'vehicle_001', name: '汽车', emoji: '🚗', backgroundColor: '#FFEBEE' },
      { id: 'vehicle_002', name: '公交车', emoji: '🚌', backgroundColor: '#FFF8E1' },
      { id: 'vehicle_003', name: '火车', emoji: '🚂', backgroundColor: '#E3F2FD' },
      { id: 'vehicle_004', name: '飞机', emoji: '✈️', backgroundColor: '#E0F7FA' },
      { id: 'vehicle_005', name: '轮船', emoji: '🚢', backgroundColor: '#E8F5E9' },
      { id: 'vehicle_006', name: '火箭', emoji: '🚀', backgroundColor: '#F3E5F5' }
    ]
  },
  nature: {
    id: 'nature',
    name: '自然风景',
    icon: '🌈',
    images: [
      { id: 'nature_001', name: '太阳', emoji: '☀️', backgroundColor: '#FFF8E1' },
      { id: 'nature_002', name: '月亮', emoji: '🌙', backgroundColor: '#E8EAF6' },
      { id: 'nature_003', name: '彩虹', emoji: '🌈', backgroundColor: '#E3F2FD' },
      { id: 'nature_004', name: '花朵', emoji: '🌸', backgroundColor: '#FCE4EC' },
      { id: 'nature_005', name: '大树', emoji: '🌳', backgroundColor: '#E8F5E9' },
      { id: 'nature_006', name: '星星', emoji: '⭐', backgroundColor: '#FFFDE7' }
    ]
  },
  cartoon: {
    id: 'cartoon',
    name: '卡通人物',
    icon: '🧸',
    images: [
      { id: 'cartoon_001', name: '小熊', emoji: '🧸', backgroundColor: '#FFF3E0' },
      { id: 'cartoon_002', name: '公主', emoji: '👸', backgroundColor: '#FCE4EC' },
      { id: 'cartoon_003', name: '超人', emoji: '🦸', backgroundColor: '#E3F2FD' },
      { id: 'cartoon_004', name: '机器人', emoji: '🤖', backgroundColor: '#ECEFF1' },
      { id: 'cartoon_005', name: '独角兽', emoji: '🦄', backgroundColor: '#F3E5F5' },
      { id: 'cartoon_006', name: '小丑', emoji: '🤡', backgroundColor: '#FFFDE7' }
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
