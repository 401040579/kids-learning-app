// 英语提升乐园 - 数据文件
// 针对 WIDA 评估的四大能力区域：听说、词汇、阅读基础、写作

const EnglishBoostData = {

  // ========== 1. I Spy 猜猜看 (Listening & Speaking) ==========
  // TTS 描述物品特征，孩子根据描述选择正确图片
  iSpyRounds: [
    {
      clues: ['I am red', 'I am round', 'I grow on a tree', 'You can eat me'],
      answer: 'apple',
      image: '🍎',
      options: [
        { word: 'apple', image: '🍎' },
        { word: 'ball', image: '⚽' },
        { word: 'cherry', image: '🍒' },
        { word: 'orange', image: '🍊' }
      ]
    },
    {
      clues: ['I am yellow', 'I am long', 'Monkeys love me', 'You peel me to eat'],
      answer: 'banana',
      image: '🍌',
      options: [
        { word: 'corn', image: '🌽' },
        { word: 'banana', image: '🍌' },
        { word: 'pencil', image: '✏️' },
        { word: 'sun', image: '☀️' }
      ]
    },
    {
      clues: ['I have four legs', 'I say meow', 'I like to chase mice', 'I am a pet'],
      answer: 'cat',
      image: '🐱',
      options: [
        { word: 'dog', image: '🐶' },
        { word: 'rabbit', image: '🐰' },
        { word: 'cat', image: '🐱' },
        { word: 'bird', image: '🐦' }
      ]
    },
    {
      clues: ['I am very big', 'I am gray', 'I have a long nose', 'I live in Africa'],
      answer: 'elephant',
      image: '🐘',
      options: [
        { word: 'elephant', image: '🐘' },
        { word: 'hippo', image: '🦛' },
        { word: 'bear', image: '🐻' },
        { word: 'whale', image: '🐳' }
      ]
    },
    {
      clues: ['I shine in the sky', 'I come out at night', 'I am round and white', 'Stars are my friends'],
      answer: 'moon',
      image: '🌙',
      options: [
        { word: 'sun', image: '☀️' },
        { word: 'star', image: '⭐' },
        { word: 'moon', image: '🌙' },
        { word: 'cloud', image: '☁️' }
      ]
    },
    {
      clues: ['I am cold', 'I am sweet', 'I come in many flavors', 'You lick me on a cone'],
      answer: 'ice cream',
      image: '🍦',
      options: [
        { word: 'cake', image: '🎂' },
        { word: 'ice cream', image: '🍦' },
        { word: 'candy', image: '🍬' },
        { word: 'cookie', image: '🍪' }
      ]
    },
    {
      clues: ['I have wings', 'I can fly', 'I build a nest', 'I sing songs in the morning'],
      answer: 'bird',
      image: '🐦',
      options: [
        { word: 'butterfly', image: '🦋' },
        { word: 'bird', image: '🐦' },
        { word: 'bee', image: '🐝' },
        { word: 'bat', image: '🦇' }
      ]
    },
    {
      clues: ['I keep you dry', 'You open me when it rains', 'I have a handle', 'I can be many colors'],
      answer: 'umbrella',
      image: '☂️',
      options: [
        { word: 'hat', image: '🎩' },
        { word: 'umbrella', image: '☂️' },
        { word: 'coat', image: '🧥' },
        { word: 'boot', image: '🥾' }
      ]
    },
    {
      clues: ['I am orange', 'I have stripes', 'I am a big cat', 'I live in the jungle'],
      answer: 'tiger',
      image: '🐯',
      options: [
        { word: 'lion', image: '🦁' },
        { word: 'tiger', image: '🐯' },
        { word: 'zebra', image: '🦓' },
        { word: 'cheetah', image: '🐆' }
      ]
    },
    {
      clues: ['I am big and warm', 'I shine during the day', 'I give you light', 'Plants need me to grow'],
      answer: 'sun',
      image: '☀️',
      options: [
        { word: 'lamp', image: '💡' },
        { word: 'fire', image: '🔥' },
        { word: 'sun', image: '☀️' },
        { word: 'rainbow', image: '🌈' }
      ]
    },
    {
      clues: ['I have pages', 'You can read me', 'I tell stories', 'I am in the library'],
      answer: 'book',
      image: '📖',
      options: [
        { word: 'book', image: '📖' },
        { word: 'newspaper', image: '📰' },
        { word: 'letter', image: '✉️' },
        { word: 'phone', image: '📱' }
      ]
    },
    {
      clues: ['I am white and fluffy', 'I float in the sky', 'Sometimes I bring rain', 'I change my shape'],
      answer: 'cloud',
      image: '☁️',
      options: [
        { word: 'snow', image: '❄️' },
        { word: 'cloud', image: '☁️' },
        { word: 'cotton', image: '🧶' },
        { word: 'pillow', image: '🛏️' }
      ]
    },
    {
      clues: ['I have wheels', 'I go fast', 'You can drive me', 'I use gasoline'],
      answer: 'car',
      image: '🚗',
      options: [
        { word: 'bike', image: '🚲' },
        { word: 'bus', image: '🚌' },
        { word: 'car', image: '🚗' },
        { word: 'train', image: '🚂' }
      ]
    },
    {
      clues: ['I am green', 'I hop and jump', 'I live near water', 'I say ribbit'],
      answer: 'frog',
      image: '🐸',
      options: [
        { word: 'turtle', image: '🐢' },
        { word: 'snake', image: '🐍' },
        { word: 'frog', image: '🐸' },
        { word: 'fish', image: '🐟' }
      ]
    },
    {
      clues: ['I have a tail', 'I bark', 'I am your best friend', 'I love to play fetch'],
      answer: 'dog',
      image: '🐶',
      options: [
        { word: 'cat', image: '🐱' },
        { word: 'dog', image: '🐶' },
        { word: 'fox', image: '🦊' },
        { word: 'wolf', image: '🐺' }
      ]
    },
    {
      clues: ['I am very tall', 'I have a long neck', 'I eat leaves from trees', 'I have spots on my body'],
      answer: 'giraffe',
      image: '🦒',
      options: [
        { word: 'giraffe', image: '🦒' },
        { word: 'horse', image: '🐴' },
        { word: 'deer', image: '🦌' },
        { word: 'camel', image: '🐪' }
      ]
    },
    {
      clues: ['I fall from the sky', 'I am white and cold', 'Children make me into a man', 'I melt in the sun'],
      answer: 'snow',
      image: '❄️',
      options: [
        { word: 'rain', image: '🌧️' },
        { word: 'snow', image: '❄️' },
        { word: 'ice', image: '🧊' },
        { word: 'hail', image: '🌨️' }
      ]
    },
    {
      clues: ['I am colorful', 'I appear after rain', 'I have seven colors', 'I am shaped like an arch'],
      answer: 'rainbow',
      image: '🌈',
      options: [
        { word: 'rainbow', image: '🌈' },
        { word: 'sun', image: '☀️' },
        { word: 'paint', image: '🎨' },
        { word: 'flower', image: '🌸' }
      ]
    }
  ],

  // ========== 2. Sight Words 高频词 (Reading Foundational Skills) ==========
  // Dolch Sight Words - Pre-Primer & Primer Level
  sightWords: {
    // 预备级（最简单的高频词）
    prePrimer: [
      { word: 'a', sentence: 'I see a cat.' },
      { word: 'and', sentence: 'Mom and Dad' },
      { word: 'big', sentence: 'A big dog!' },
      { word: 'can', sentence: 'I can run.' },
      { word: 'for', sentence: 'This is for you.' },
      { word: 'go', sentence: 'Let us go!' },
      { word: 'he', sentence: 'He is happy.' },
      { word: 'I', sentence: 'I like apples.' },
      { word: 'in', sentence: 'The cat is in the box.' },
      { word: 'is', sentence: 'She is my friend.' },
      { word: 'it', sentence: 'I like it!' },
      { word: 'my', sentence: 'This is my book.' },
      { word: 'no', sentence: 'No, thank you.' },
      { word: 'on', sentence: 'The cup is on the table.' },
      { word: 'one', sentence: 'I have one apple.' },
      { word: 'red', sentence: 'I see a red ball.' },
      { word: 'run', sentence: 'I can run fast!' },
      { word: 'said', sentence: 'Mom said hello.' },
      { word: 'see', sentence: 'I see you!' },
      { word: 'the', sentence: 'The sun is bright.' },
      { word: 'to', sentence: 'I go to school.' },
      { word: 'up', sentence: 'Look up!' },
      { word: 'we', sentence: 'We are friends.' },
      { word: 'yes', sentence: 'Yes, I can!' },
      { word: 'you', sentence: 'I love you.' }
    ],
    // 初级（稍难一点的高频词）
    primer: [
      { word: 'all', sentence: 'We all like cake.' },
      { word: 'am', sentence: 'I am happy.' },
      { word: 'are', sentence: 'You are smart.' },
      { word: 'at', sentence: 'Look at me!' },
      { word: 'ate', sentence: 'I ate lunch.' },
      { word: 'be', sentence: 'I want to be a doctor.' },
      { word: 'but', sentence: 'I like cats, but I love dogs.' },
      { word: 'came', sentence: 'She came to school.' },
      { word: 'did', sentence: 'Did you see that?' },
      { word: 'do', sentence: 'What do you want?' },
      { word: 'get', sentence: 'Can I get a cookie?' },
      { word: 'good', sentence: 'You are a good friend.' },
      { word: 'has', sentence: 'She has a pet.' },
      { word: 'have', sentence: 'I have a book.' },
      { word: 'into', sentence: 'Jump into the pool!' },
      { word: 'like', sentence: 'I like pizza.' },
      { word: 'new', sentence: 'I got new shoes.' },
      { word: 'not', sentence: 'I am not tired.' },
      { word: 'now', sentence: 'Let us go now.' },
      { word: 'out', sentence: 'Go out and play.' },
      { word: 'play', sentence: 'I want to play.' },
      { word: 'she', sentence: 'She is kind.' },
      { word: 'so', sentence: 'I am so happy!' },
      { word: 'that', sentence: 'I like that toy.' },
      { word: 'they', sentence: 'They are my friends.' },
      { word: 'too', sentence: 'I want some too!' },
      { word: 'was', sentence: 'It was fun.' },
      { word: 'will', sentence: 'I will try.' },
      { word: 'with', sentence: 'Come with me.' }
    ]
  },

  // ========== 3. Phonics 自然拼读 (Reading Foundational Skills) ==========
  phonics: {
    // 字母发音
    letterSounds: [
      { letter: 'A', sound: 'æ', words: ['apple', 'ant', 'alligator'], images: ['🍎', '🐜', '🐊'] },
      { letter: 'B', sound: 'b', words: ['ball', 'bear', 'bus'], images: ['⚽', '🐻', '🚌'] },
      { letter: 'C', sound: 'k', words: ['cat', 'car', 'cup'], images: ['🐱', '🚗', '🥤'] },
      { letter: 'D', sound: 'd', words: ['dog', 'duck', 'door'], images: ['🐶', '🦆', '🚪'] },
      { letter: 'E', sound: 'ɛ', words: ['egg', 'elephant', 'elf'], images: ['🥚', '🐘', '🧝'] },
      { letter: 'F', sound: 'f', words: ['fish', 'frog', 'fire'], images: ['🐟', '🐸', '🔥'] },
      { letter: 'G', sound: 'ɡ', words: ['goat', 'grapes', 'guitar'], images: ['🐐', '🍇', '🎸'] },
      { letter: 'H', sound: 'h', words: ['hat', 'horse', 'house'], images: ['🎩', '🐴', '🏠'] },
      { letter: 'I', sound: 'ɪ', words: ['igloo', 'insect', 'ink'], images: ['🏠', '🐛', '🖊️'] },
      { letter: 'J', sound: 'dʒ', words: ['jam', 'jump', 'juice'], images: ['🍯', '🦘', '🧃'] },
      { letter: 'K', sound: 'k', words: ['kite', 'king', 'key'], images: ['🪁', '🤴', '🔑'] },
      { letter: 'L', sound: 'l', words: ['lion', 'lamp', 'leaf'], images: ['🦁', '💡', '🍃'] },
      { letter: 'M', sound: 'm', words: ['moon', 'mouse', 'milk'], images: ['🌙', '🐭', '🥛'] },
      { letter: 'N', sound: 'n', words: ['nest', 'nose', 'nut'], images: ['🪹', '👃', '🥜'] },
      { letter: 'O', sound: 'ɒ', words: ['octopus', 'orange', 'owl'], images: ['🐙', '🍊', '🦉'] },
      { letter: 'P', sound: 'p', words: ['pig', 'pen', 'pizza'], images: ['🐷', '🖊️', '🍕'] },
      { letter: 'Q', sound: 'kw', words: ['queen', 'quilt', 'question'], images: ['👸', '🛏️', '❓'] },
      { letter: 'R', sound: 'r', words: ['rabbit', 'rain', 'robot'], images: ['🐰', '🌧️', '🤖'] },
      { letter: 'S', sound: 's', words: ['sun', 'snake', 'star'], images: ['☀️', '🐍', '⭐'] },
      { letter: 'T', sound: 't', words: ['tiger', 'tree', 'turtle'], images: ['🐯', '🌳', '🐢'] },
      { letter: 'U', sound: 'ʌ', words: ['umbrella', 'unicorn', 'up'], images: ['☂️', '🦄', '⬆️'] },
      { letter: 'V', sound: 'v', words: ['van', 'violin', 'volcano'], images: ['🚐', '🎻', '🌋'] },
      { letter: 'W', sound: 'w', words: ['water', 'whale', 'wind'], images: ['💧', '🐳', '💨'] },
      { letter: 'X', sound: 'ks', words: ['fox', 'box', 'six'], images: ['🦊', '📦', '6️⃣'] },
      { letter: 'Y', sound: 'j', words: ['yellow', 'yogurt', 'yak'], images: ['💛', '🥛', '🐂'] },
      { letter: 'Z', sound: 'z', words: ['zebra', 'zoo', 'zero'], images: ['🦓', '🦁', '0️⃣'] }
    ],

    // 押韵词家族 (Word Families / Rhyming)
    wordFamilies: [
      {
        family: '-at',
        words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat'],
        images: ['🐱', '🦇', '🎩', '🧹', '🐀', '🪑', '🍔']
      },
      {
        family: '-an',
        words: ['can', 'fan', 'man', 'pan', 'ran', 'van', 'tan'],
        images: ['🥫', '🪭', '👨', '🍳', '🏃', '🚐', '🏖️']
      },
      {
        family: '-ig',
        words: ['big', 'dig', 'fig', 'pig', 'wig', 'jig'],
        images: ['🦕', '⛏️', '🫐', '🐷', '💇', '💃']
      },
      {
        family: '-op',
        words: ['hop', 'mop', 'pop', 'top', 'stop', 'drop'],
        images: ['🐰', '🧹', '🎉', '🔝', '🛑', '💧']
      },
      {
        family: '-ug',
        words: ['bug', 'hug', 'mug', 'rug', 'tug', 'dug'],
        images: ['🐛', '🤗', '☕', '🏠', '💪', '⛏️']
      },
      {
        family: '-en',
        words: ['hen', 'pen', 'ten', 'men', 'den', 'ben'],
        images: ['🐔', '🖊️', '🔟', '👥', '🏠', '👦']
      },
      {
        family: '-it',
        words: ['bit', 'fit', 'hit', 'kit', 'sit', 'lit'],
        images: ['🦷', '💪', '🥊', '🧰', '🪑', '💡']
      },
      {
        family: '-ot',
        words: ['hot', 'dot', 'got', 'lot', 'not', 'pot'],
        images: ['🔥', '⚫', '🎁', '📦', '❌', '🫕']
      }
    ]
  },

  // ========== 4. Sentence Builder 造句小达人 (Writing Skills) ==========
  sentenceBuilder: {
    // 简单句型 - 拖拽排列
    simplePatterns: [
      {
        words: ['I', 'like', 'cats'],
        image: '🐱',
        hint: 'What animal do you like?'
      },
      {
        words: ['The', 'dog', 'is', 'big'],
        image: '🐶',
        hint: 'Describe the dog'
      },
      {
        words: ['I', 'can', 'run', 'fast'],
        image: '🏃',
        hint: 'What can you do?'
      },
      {
        words: ['She', 'has', 'a', 'red', 'hat'],
        image: '🎩',
        hint: 'What does she have?'
      },
      {
        words: ['We', 'go', 'to', 'school'],
        image: '🏫',
        hint: 'Where do we go?'
      },
      {
        words: ['The', 'sun', 'is', 'hot'],
        image: '☀️',
        hint: 'Describe the sun'
      },
      {
        words: ['I', 'see', 'a', 'bird'],
        image: '🐦',
        hint: 'What do you see?'
      },
      {
        words: ['My', 'cat', 'is', 'soft'],
        image: '🐱',
        hint: 'Describe your cat'
      },
      {
        words: ['He', 'ate', 'the', 'apple'],
        image: '🍎',
        hint: 'What did he eat?'
      },
      {
        words: ['They', 'play', 'in', 'the', 'park'],
        image: '🌳',
        hint: 'Where do they play?'
      },
      {
        words: ['I', 'am', 'happy', 'today'],
        image: '😊',
        hint: 'How do you feel?'
      },
      {
        words: ['The', 'fish', 'can', 'swim'],
        image: '🐟',
        hint: 'What can the fish do?'
      }
    ],

    // 句子扩展 - 给基本句加细节
    expandSentences: [
      {
        base: 'I like cats',
        prompt: 'Why do you like cats? Add "because..."',
        example: 'I like cats because they are soft and playful.',
        starters: ['because they are', 'because they can']
      },
      {
        base: 'I see a dog',
        prompt: 'What does the dog look like? Add a describing word!',
        example: 'I see a big brown dog.',
        starters: ['big', 'small', 'brown', 'white', 'happy']
      },
      {
        base: 'I went to the park',
        prompt: 'When did you go? Add "yesterday" or "today"!',
        example: 'Yesterday I went to the park with my mom.',
        starters: ['yesterday', 'today', 'this morning']
      },
      {
        base: 'She is my friend',
        prompt: 'What is your friend like? Add more details!',
        example: 'She is my best friend and she is very kind.',
        starters: ['best', 'good', 'new', 'funny']
      },
      {
        base: 'I eat breakfast',
        prompt: 'What do you eat? Add what kind!',
        example: 'I eat eggs and toast for breakfast.',
        starters: ['eggs', 'cereal', 'pancakes', 'fruit']
      }
    ],

    // 句子开头提示 (Sentence Starters)
    sentenceStarters: [
      { starter: 'Today I saw...', category: 'observation', image: '👀' },
      { starter: 'I feel happy when...', category: 'feelings', image: '😊' },
      { starter: 'My favorite thing is...', category: 'preference', image: '⭐' },
      { starter: 'I can...', category: 'ability', image: '💪' },
      { starter: 'I like to play...', category: 'activity', image: '🎮' },
      { starter: 'At school I...', category: 'school', image: '🏫' },
      { starter: 'My family likes to...', category: 'family', image: '👨‍👩‍👧' },
      { starter: 'I want to be...', category: 'dream', image: '🌟' },
      { starter: 'The best part of my day was...', category: 'reflection', image: '🌅' },
      { starter: 'I helped my friend...', category: 'kindness', image: '🤝' }
    ]
  }
};
