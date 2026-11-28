// ========== 节日贺卡 ==========
// 给 Iris 的可翻开立体贺卡：生日（3/28）+ 每个大节日一张。
// 每张：信封拆开 → 封面 → 翻开（左/上：美人鱼和彩虹兔的互动场景；右/下：中英双语祝福）
// → 再翻（小活动：认单词/感恩叶子/吹蜡烛）→ 最后一页（聊一聊 + 落款 + 惊喜按钮）。
// 纯展示，不写存档；节日日期在本机计算，农历节日用查表。
// 开场是 3D 动效：信封从远处飘来 → 封蜡迸开 → 翻盖打开 → 贺卡升起、飞到眼前；翻页带光影，翻开后场景像立体书一样立起来。

const HolidayCards = {
  KID: { en: 'Iris', zh: '艾瑞斯' },
  FROM: { en: 'Love, Mommy & Daddy', zh: '爱你的爸爸妈妈' },
  BIRTHDAY: { month: 3, day: 28 },

  // 农历节日公历日期（春节 / 中秋），按年查表
  LUNAR_NEW_YEAR: { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11' },
  MID_AUTUMN: { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19' },
  DRAGON_BOAT: { 2026: '06-19', 2027: '06-09', 2028: '05-28', 2029: '06-16', 2030: '06-05', 2031: '06-24', 2032: '06-12' },
  // 没有粽子 emoji，用一个小 SVG 代替（只用在翻牌里）
  ZONGZI: '<svg class="hc-emoji-svg" viewBox="0 0 40 40" aria-hidden="true"><path d="M21 9 L38 31 Q24 37 4 32 Z" fill="#3f9b45"/><path d="M21 9 L4 32 Q12 35 19 35 Z" fill="#7bcf63"/><path d="M21 9 L19 35" stroke="#2f7a35" stroke-width="1.2"/><path d="M8 26 Q20 31 34 25 M13 19 Q22 22 30 18" stroke="#e8d29a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="21" cy="28.5" r="2.4" fill="#e0453a"/></svg>',
  ZODIAC: [['🐀', 'Rat', '鼠'], ['🐂', 'Ox', '牛'], ['🐅', 'Tiger', '虎'], ['🐇', 'Rabbit', '兔'], ['🐉', 'Dragon', '龙'], ['🐍', 'Snake', '蛇'],
    ['🐎', 'Horse', '马'], ['🐐', 'Goat', '羊'], ['🐒', 'Monkey', '猴'], ['🐓', 'Rooster', '鸡'], ['🐕', 'Dog', '狗'], ['🐖', 'Pig', '猪']],
  MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  RAINBOW: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'],

  // ========== 贺卡内容 ==========
  // message 里 {kid}/{kidZh}/{year}/{zodiacEn}/{zodiacZh}/{zodiacEmoji} 会被替换
  CARDS: [
    {
      id: 'birthday', hero: '🎂', seal: '🎀',
      en: 'Happy Birthday, {kid}!', zh: '{kidZh}，生日快乐！', short: { en: "Iris's Birthday", zh: '艾瑞斯的生日' },
      date: { type: 'birthday' },
      theme: { sky: ['#ffd1ec', '#c9f0ff'], cover: ['#ff8fc8', '#b48cff'], paper: '#fff5fb', ink: '#7a2d5f', accent: '#ff4fa3', sea: ['#7fe0ff', '#4cc3e6'], orb: 'sun' },
      hats: { mermaid: 'tiara', bunny: 'party' },
      fx: { type: 'rise', emoji: ['🎈', '🎈', '🫧', '🎈'] },
      props: ['🎁', '🧁', '🎈', '🐚', '🎉', '🍓'],
      confetti: ['🎉', '🎈', '🎂', '💖', '✨', '🌈', '🎁'],
      message: {
        en: 'Happy birthday, sweetheart! Pearl the mermaid and Rainbow Bunny are throwing an ocean party just for you. You make every day brighter than a rainbow. We love you to the moon and back!',
        zh: '宝贝，生日快乐！美人鱼珍珠和彩虹兔为你办了一场海边派对。你让每一天都比彩虹还要亮。我们爱你，从这里到月亮，再回来！'
      },
      activity: { type: 'candles', title: { en: 'Make a wish, then tap to blow out the candles!', zh: '先许个愿，再点一点吹灭蜡烛！' } },
      talk: { en: 'What made you the happiest this year?', zh: '这一年里，什么事让你最开心？' }
    },
    {
      id: 'thanksgiving', hero: '🦃', seal: '🍁',
      en: 'Happy Thanksgiving!', zh: '感恩节快乐！', short: { en: 'Thanksgiving', zh: '感恩节' },
      date: { type: 'nth', month: 11, weekday: 4, n: 4 },
      theme: { sky: ['#ffd39a', '#fff0da'], cover: ['#f6a24a', '#c8501f'], paper: '#fff7ec', ink: '#6b3412', accent: '#d9531e', sea: ['#7fd6cf', '#43a9b3'], orb: 'sun' },
      hats: { mermaid: 'leafCrown', bunny: 'pilgrim' },
      fx: { type: 'fall', emoji: ['🍁', '🍂', '🍁', '🍂'] },
      props: ['🥧', '🌽', '🍎', '🎃', '🍂', '🥖'],
      confetti: ['🍁', '🍂', '🌽', '🥧', '🦃', '🍎'],
      message: {
        en: 'Happy Thanksgiving, {kid}! Pearl the mermaid is thankful for the sparkly sea, and Rainbow Bunny is thankful for crunchy carrots. We are thankful for YOU: your giggles, your hugs, and your big kind heart.',
        zh: '感恩节快乐，{kidZh}！美人鱼珍珠感谢闪闪发光的大海，彩虹兔感谢脆脆的胡萝卜。我们最感谢的就是你：你的笑声、你的拥抱，还有你那颗善良的心。'
      },
      activity: {
        type: 'reveal', cover: '🍁',
        title: { en: 'Tap a leaf: what are you thankful for?', zh: '点一片叶子：你感谢什么呢？' },
        items: [['👪', 'my family', '我的家人'], ['🫂', 'my friends', '我的朋友'], ['🏠', 'a cozy home', '温暖的家'],
          ['🍲', 'yummy food', '好吃的饭菜'], ['🍎', 'my teachers', '我的老师'], ['🌈', 'rainbows', '彩虹']]
      },
      talk: { en: 'Give someone a big hug and tell them why you are thankful for them.', zh: '去抱抱一位家人，告诉对方你为什么感谢。' }
    },
    {
      id: 'christmas', hero: '🎄', seal: '⭐',
      en: 'Merry Christmas!', zh: '圣诞快乐！', short: { en: 'Christmas', zh: '圣诞节' },
      date: { type: 'fixed', month: 12, day: 25 },
      theme: { sky: ['#13285c', '#3566b5'], night: true, cover: ['#d9343f', '#0f7a4a'], paper: '#fffaf3', ink: '#7a1d25', accent: '#d9343f', sea: ['#4a7fc4', '#2f5f9e'], orb: 'moon' },
      hats: { mermaid: 'santa', bunny: 'antlers' },
      fx: { type: 'fall', emoji: ['❄️', '❄️', '✨', '❄️'] },
      props: ['🎁', '⛄', '🔔', '🍪', '🧦', '⭐'],
      confetti: ['❄️', '🎄', '🎁', '⭐', '🔔', '✨'],
      message: {
        en: 'Merry Christmas, {kid}! Pearl the mermaid is decorating a coral tree with glowing shells, and Rainbow Bunny is wrapping a present with a rainbow bow. The best gift we ever got is you!',
        zh: '圣诞快乐，{kidZh}！美人鱼珍珠用会发光的贝壳装饰珊瑚圣诞树，彩虹兔用彩虹丝带包礼物。我们收到过最好的礼物，就是你！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🎄', 'Christmas tree', '圣诞树'], ['⛄', 'snowman', '雪人'], ['🎁', 'present', '礼物'],
          ['🦌', 'reindeer', '驯鹿'], ['🔔', 'bell', '铃铛'], ['🧦', 'stocking', '圣诞袜']]
      },
      talk: { en: 'If you could give anyone a present, who would it be and what would you give?', zh: '如果你能送一份礼物，你想送给谁、送什么？' }
    },
    {
      id: 'newYear', hero: '🎆', seal: '✨',
      en: 'Happy New Year!', zh: '新年快乐！', short: { en: "New Year's Day", zh: '元旦' },
      date: { type: 'fixed', month: 1, day: 1 },
      theme: { sky: ['#1a1347', '#45309a'], night: true, cover: ['#2a1f6b', '#b77dff'], paper: '#fbf8ff', ink: '#3d2a80', accent: '#e9a817', sea: ['#5b5fc7', '#3a3c99'], orb: 'none' },
      hats: { mermaid: 'tiara', bunny: 'party' },
      fx: { type: 'fireworks' },
      props: ['🎉', '🎊', '🎈', '⭐', '🕛', '🥳'],
      confetti: ['🎉', '🎊', '✨', '⭐', '🎆', '🥳'],
      message: {
        en: 'Happy New Year, {kid}! Pearl the mermaid and Rainbow Bunny are counting down: 3, 2, 1… POP! In {year}, may you learn new things, laugh every day, and keep shining bright.',
        zh: '新年快乐，{kidZh}！美人鱼珍珠和彩虹兔一起倒数：3、2、1……砰！{year} 年，愿你学会好多新本领，天天开心，一直闪闪发光。'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🎆', 'fireworks', '烟花'], ['🎊', 'confetti', '彩纸'], ['🎈', 'balloon', '气球'],
          ['🕛', 'midnight', '午夜'], ['📅', 'calendar', '日历'], ['🥳', 'party', '派对']]
      },
      talk: { en: 'What is one new thing you want to learn this year?', zh: '新的一年，你想学会一件什么新本领？' }
    },
    {
      id: 'lunarNewYear', hero: '🧧', seal: '🏮',
      en: 'Happy Lunar New Year!', zh: '新春快乐！', short: { en: 'Lunar New Year', zh: '春节' },
      date: { type: 'LUNAR_NEW_YEAR' },
      theme: { sky: ['#ffcf9e', '#fff0d9'], cover: ['#d7262e', '#ff8a3d'], paper: '#fff6ec', ink: '#8d1a1f', accent: '#d7262e', sea: ['#73d1c8', '#3da5a6'], orb: 'sun' },
      hats: { mermaid: 'bow', bunny: 'bow' },
      fx: { type: 'hang', emoji: ['🏮', '🏮', '🏮'] },
      props: ['{zodiacEmoji}', '🥟', '🍊', '🧨', '🐉', '🎋'],
      confetti: ['🧧', '🏮', '🍊', '✨', '🎉', '🥟'],
      message: {
        en: "Happy Lunar New Year, {kid}! It's the Year of the {zodiacEn}! Pearl the mermaid hung red lanterns by the sea, and Rainbow Bunny brought you a lucky red envelope. Wishing you a year full of joy and good luck!",
        zh: '新春快乐，{kidZh}！{zodiacZh}年到啦！美人鱼珍珠在海边挂起红灯笼，彩虹兔给你送来红包。祝你新的一年快快乐乐、好运连连！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🧧', 'red envelope', '红包'], ['🏮', 'lantern', '灯笼'], ['🥟', 'dumplings', '饺子'],
          ['🧨', 'firecracker', '鞭炮'], ['🐉', 'dragon', '龙'], ['🍊', 'tangerine', '橘子']]
      },
      talk: { en: 'Can you say "Xin Nian Kuai Le" to everyone in the family?', zh: '你能对家里每个人说一句“新年快乐”吗？' }
    },
    {
      id: 'valentine', hero: '💝', seal: '💗',
      en: "Happy Valentine's Day!", zh: '情人节快乐！', short: { en: "Valentine's Day", zh: '情人节' },
      date: { type: 'fixed', month: 2, day: 14 },
      theme: { sky: ['#ffd6e7', '#fff0f6'], cover: ['#ff6fa5', '#ffb3cf'], paper: '#fff4f8', ink: '#a01e5a', accent: '#ff3d7f', sea: ['#9fe3ff', '#6cc8f0'], orb: 'sun' },
      hats: { mermaid: 'hearts', bunny: 'hearts' },
      fx: { type: 'rise', emoji: ['💗', '💖', '💕', '🫧'] },
      props: ['💌', '🌹', '🍫', '🧸', '💖', '🐚'],
      confetti: ['💖', '💗', '💕', '💝', '🌹', '✨'],
      message: {
        en: "Happy Valentine's Day, {kid}! Pearl the mermaid found a heart-shaped shell, and Rainbow Bunny made a card covered in hearts. Our hearts are full of love for you, every single day!",
        zh: '情人节快乐，{kidZh}！美人鱼珍珠找到一颗爱心贝壳，彩虹兔画了一张满是爱心的卡片。我们的心里装满了对你的爱，每一天都是！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['💖', 'heart', '爱心'], ['🌹', 'rose', '玫瑰花'], ['💌', 'love note', '爱心小纸条'],
          ['🍫', 'chocolate', '巧克力'], ['🧸', 'teddy bear', '泰迪熊'], ['🤗', 'hug', '拥抱']]
      },
      talk: { en: 'Who do you love? Let\'s draw a heart card for them!', zh: '你爱谁呀？我们一起画一张爱心卡送给对方吧！' }
    },
    {
      id: 'easter', hero: '🧺', seal: '🌷',
      en: 'Happy Easter!', zh: '复活节快乐！', short: { en: 'Easter', zh: '复活节' },
      date: { type: 'easter' },
      theme: { sky: ['#d3f3ff', '#f4ffe4'], cover: ['#8fdcb8', '#c3a6ff'], paper: '#fbfff6', ink: '#3f6b2a', accent: '#8a5cf6', sea: ['#8fe8f0', '#4fc6d6'], orb: 'sun' },
      hats: { mermaid: 'flowers', bunny: 'flowers' },
      fx: { type: 'rise', emoji: ['🦋', '🫧', '🦋', '🫧'] },
      props: ['🥚', '🐣', '🌷', '🥕', '🥚', '🌼'],
      confetti: ['🥚', '🐣', '🌷', '🌼', '🐰', '🦋'],
      message: {
        en: 'Happy Easter, {kid}! Rainbow Bunny hopped all the way to the beach to hide colorful eggs, and Pearl the mermaid hid some in the sea too! Let\'s go on a hunt and see how many you can find.',
        zh: '复活节快乐，{kidZh}！彩虹兔一路蹦蹦跳跳到海边藏彩蛋，美人鱼珍珠也在海里藏了几颗！我们一起去找找，看你能找到几颗？'
      },
      activity: {
        type: 'reveal', cover: '🥚',
        title: { en: 'Tap the eggs! What is inside?', zh: '点一点彩蛋，里面藏着什么？' },
        items: [['🐣', 'baby chick', '小鸡'], ['🌷', 'tulip', '郁金香'], ['🍫', 'chocolate', '巧克力'],
          ['🐰', 'bunny', '小兔子'], ['🧺', 'basket', '篮子'], ['🦋', 'butterfly', '蝴蝶']]
      },
      talk: { en: 'If you were a bunny, where would you hide an egg?', zh: '如果你是小兔子，你会把彩蛋藏在哪里？' }
    },
    {
      id: 'childrensDay', hero: '🎈', seal: '🌟',
      en: "Happy Children's Day!", zh: '六一儿童节快乐！', short: { en: "Children's Day", zh: '儿童节' },
      date: { type: 'fixed', month: 6, day: 1 },
      theme: { sky: ['#c3efff', '#fff6bf'], cover: ['#ffcf3d', '#4dabf7'], paper: '#fffdf2', ink: '#2b5a8a', accent: '#ff8f1f', sea: ['#7fe0ff', '#38b6e8'], orb: 'sun' },
      hats: { mermaid: 'stars', bunny: 'stars' },
      fx: { type: 'rise', emoji: ['🎈', '🫧', '🎈', '🫧'] },
      props: ['🪁', '🍭', '🍦', '🧸', '⭐', '🎠'],
      confetti: ['🎈', '🍭', '⭐', '🪁', '🎉', '🌈'],
      message: {
        en: "Happy Children's Day, {kid}! Today is a day just for kids, so Pearl the mermaid and Rainbow Bunny want to play all your favorite games. Stay curious, silly, and wonderfully you!",
        zh: '六一儿童节快乐，{kidZh}！今天是小朋友的节日，美人鱼珍珠和彩虹兔要陪你玩所有最喜欢的游戏。永远保持好奇和快乐，做最棒的自己！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🎈', 'balloon', '气球'], ['🪁', 'kite', '风筝'], ['🍭', 'lollipop', '棒棒糖'],
          ['🎠', 'carousel', '旋转木马'], ['🍦', 'ice cream', '冰淇淋'], ['🧸', 'teddy bear', '泰迪熊']]
      },
      talk: { en: 'What game should we play together today?', zh: '今天我们一起玩什么游戏？' }
    },
    {
      id: 'mothersDay', hero: '💐', seal: '🌸',
      en: "Happy Mother's Day!", zh: '母亲节快乐！', short: { en: "Mother's Day", zh: '母亲节' },
      date: { type: 'nth', month: 5, weekday: 0, n: 2 },
      // 这张是 Iris 送给妈妈的
      to: { en: 'Mommy', zh: '妈妈' }, from: { en: 'Love, Iris & Daddy', zh: '爱你的艾瑞斯和爸爸' },
      theme: { sky: ['#ffdbe9', '#fff1e4'], cover: ['#ff9cc2', '#ff7f8e'], paper: '#fff6f8', ink: '#8a2848', accent: '#ff4f7f', sea: ['#a8e6ff', '#72cbee'], orb: 'sun' },
      hats: { mermaid: 'flowers', bunny: 'hearts' },
      fx: { type: 'fall', emoji: ['🌸', '🌷', '🌸', '💮'] },
      props: ['🌷', '💌', '🧁', '🌸', '💖', '🐚'],
      confetti: ['🌸', '💐', '💖', '🌷', '✨', '💕'],
      message: {
        en: "Happy Mother's Day, Mommy! Pearl the mermaid picked the prettiest sea flowers, and Rainbow Bunny tied them with a rainbow ribbon, all for you. Thank you for your warm hugs, bedtime stories, and endless love. We love you so much!",
        zh: '妈妈，母亲节快乐！美人鱼珍珠摘来最漂亮的海底花，彩虹兔用彩虹丝带把它们扎成一束，全都送给你。谢谢你温暖的拥抱、睡前故事和满满的爱。我们好爱你！'
      },
      activity: {
        type: 'reveal', cover: '🌸',
        title: { en: 'Tap a flower: what do you love about Mommy?', zh: '点一朵花：你最爱妈妈的什么？' },
        items: [['🤗', 'warm hugs', '温暖的拥抱'], ['📖', 'bedtime stories', '睡前故事'], ['🍳', 'yummy cooking', '好吃的饭菜'],
          ['😘', 'good-night kisses', '晚安吻'], ['🎶', 'sweet songs', '好听的歌'], ['💖', 'her big love', '满满的爱']]
      },
      talk: { en: 'Give Mommy a big hug and tell her one thing you love about her.', zh: '给妈妈一个大大的拥抱，告诉她你最爱她哪一点。' }
    },
    {
      id: 'fathersDay', hero: '🦸', seal: '⭐',
      en: "Happy Father's Day!", zh: '父亲节快乐！', short: { en: "Father's Day", zh: '父亲节' },
      date: { type: 'nth', month: 6, weekday: 0, n: 3 },
      // 这张是 Iris 送给爸爸的
      to: { en: 'Daddy', zh: '爸爸' }, from: { en: 'Love, Iris & Mommy', zh: '爱你的艾瑞斯和妈妈' },
      theme: { sky: ['#cdeaff', '#eef9ff'], cover: ['#3d7bf0', '#2ec4b6'], paper: '#f5fbff', ink: '#1d3f7a', accent: '#2f6fe0', sea: ['#7fd3ff', '#3fa8e8'], orb: 'sun' },
      hats: { mermaid: 'stars', bunny: 'cap' },
      fx: { type: 'fly', emoji: ['✈️', '🪁', '⭐'] },
      props: ['🏆', '🔧', '⚽', '💙', '🎣', '🐚'],
      confetti: ['⭐', '💙', '🏆', '🎉', '✨', '👍'],
      message: {
        en: "Happy Father's Day, Daddy! Pearl the mermaid says you are as strong as a whale, and Rainbow Bunny loves your piggyback rides. Thank you for playing with us, fixing things, and keeping us safe. You are our superhero!",
        zh: '爸爸，父亲节快乐！美人鱼珍珠说你像鲸鱼一样强壮，彩虹兔最喜欢骑在你背上玩。谢谢你陪我们玩、帮我们修东西、保护我们。你是我们的超级英雄！'
      },
      activity: {
        type: 'reveal', cover: '⭐',
        title: { en: 'Tap a star: what is Daddy great at?', zh: '点一颗星星：爸爸最厉害的是什么？' },
        items: [['🐎', 'piggyback rides', '骑大马'], ['🔧', 'fixing things', '修东西'], ['⚽', 'playing ball', '踢球'],
          ['📚', 'reading stories', '讲故事'], ['🤣', 'silly jokes', '讲笑话'], ['🐻', 'big bear hugs', '大熊抱']]
      },
      talk: { en: 'Ask Daddy: what was your favorite game when you were little?', zh: '问问爸爸：你小时候最喜欢玩什么游戏？' }
    },
    {
      id: 'dragonBoat', hero: '🐲', seal: '🌿',
      en: 'Happy Dragon Boat Festival!', zh: '端午节快乐！', short: { en: 'Dragon Boat Festival', zh: '端午节' },
      date: { type: 'DRAGON_BOAT' },
      theme: { sky: ['#c9f3e6', '#f3ffe9'], cover: ['#2fae7a', '#e9b93f'], paper: '#f7fff8', ink: '#1f5c3d', accent: '#e0453a', sea: ['#5fd3c4', '#2a9d8f'], orb: 'sun' },
      hats: { mermaid: 'flowers', bunny: 'headband' },
      fx: { type: 'boat' },
      props: ['🥁', '🌿', '🐉', '🍃', '🛶', '🐚'],
      confetti: ['🐲', '🌿', '🥁', '🍃', '✨', '🛶'],
      message: {
        en: "Happy Dragon Boat Festival, {kid}! Boom, boom, boom go the drums! Pearl the mermaid is cheering for the dragon boats racing over the waves, and Rainbow Bunny is wrapping sticky rice in green leaves. Let's eat zongzi together!",
        zh: '端午节快乐，{kidZh}！咚、咚、咚，鼓声响起来啦！美人鱼珍珠在浪花里为龙舟加油，彩虹兔用绿绿的粽叶包粽子。我们一起吃粽子吧！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🛶', 'dragon boat', '龙舟'], ['ZONGZI', 'rice dumpling', '粽子'], ['🥁', 'drum', '鼓'],
          ['🐉', 'dragon', '龙'], ['🌿', 'mugwort', '艾草'], ['🧵', 'lucky threads', '五彩绳']]
      },
      talk: { en: 'If you rowed a dragon boat, what would you name it?', zh: '如果你来划龙舟，你想给它起什么名字？' }
    },
    {
      id: 'july4', hero: '🎇', seal: '⭐',
      en: 'Happy 4th of July!', zh: '独立日快乐！', short: { en: 'Fourth of July', zh: '美国独立日' },
      date: { type: 'fixed', month: 7, day: 4 },
      theme: { sky: ['#0f1c4d', '#30479a'], night: true, cover: ['#1f3f9e', '#d72638'], paper: '#f8fbff', ink: '#1f3f9e', accent: '#d72638', sea: ['#3f63b8', '#28488f'], orb: 'none' },
      hats: { mermaid: 'stars', bunny: 'stars' },
      fx: { type: 'fireworks' },
      props: ['🇺🇸', '🍉', '🌭', '⭐', '🎆', '🍦'],
      confetti: ['🎆', '🎇', '⭐', '🇺🇸', '✨', '🍉'],
      message: {
        en: 'Happy Fourth of July, {kid}! Pearl the mermaid is watching fireworks sparkle over the ocean, and Rainbow Bunny is waving a little flag. Boom, crackle, sparkle: what a colorful night!',
        zh: '独立日快乐，{kidZh}！美人鱼珍珠在海上看烟花闪闪，彩虹兔挥着小旗子。砰、噼啪、亮晶晶：好漂亮的夜晚！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🎆', 'fireworks', '烟花'], ['🇺🇸', 'flag', '国旗'], ['🍉', 'watermelon', '西瓜'],
          ['🌭', 'hot dog', '热狗'], ['🗽', 'Statue of Liberty', '自由女神像'], ['🎇', 'sparkler', '仙女棒']]
      },
      talk: { en: 'What colors can you see in the fireworks?', zh: '你在烟花里看到了哪些颜色？' }
    },
    {
      id: 'midAutumn', hero: '🥮', seal: '🌕',
      en: 'Happy Mid-Autumn Festival!', zh: '中秋节快乐！', short: { en: 'Mid-Autumn Festival', zh: '中秋节' },
      date: { type: 'MID_AUTUMN' },
      theme: { sky: ['#0f1f3d', '#2d4e7c'], night: true, cover: ['#1d2f5a', '#e8a33d'], paper: '#fffaf0', ink: '#5a3a10', accent: '#e8a33d', sea: ['#3b6ea0', '#264f7a'], orb: 'fullmoon' },
      hats: { mermaid: 'moon', bunny: 'moon' },
      fx: { type: 'hang', emoji: ['🏮', '🏮', '🏮'] },
      props: ['🥮', '🏮', '🍵', '⭐', '🐇', '🍐'],
      confetti: ['🥮', '🌕', '🏮', '⭐', '✨', '🐇'],
      message: {
        en: "Happy Mid-Autumn Festival, {kid}! Tonight the moon is big and round. Rainbow Bunny waved to the Jade Rabbit on the moon, and Pearl saw moonlight dancing on the waves. Let's share mooncakes and make a wish!",
        zh: '中秋节快乐，{kidZh}！今晚的月亮又大又圆。彩虹兔向月亮上的玉兔挥手，美人鱼珍珠看见月光在海浪上跳舞。我们一起吃月饼、许个愿吧！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🥮', 'mooncake', '月饼'], ['🌕', 'full moon', '满月'], ['🏮', 'lantern', '灯笼'],
          ['🐇', 'Jade Rabbit', '玉兔'], ['🍵', 'tea', '茶'], ['👪', 'family time', '团圆']]
      },
      talk: { en: 'If you could visit the moon, what would you bring?', zh: '如果你能去月亮上，你想带什么？' }
    },
    {
      id: 'halloween', hero: '🎃', seal: '🦇',
      en: 'Happy Halloween!', zh: '万圣节快乐！', short: { en: 'Halloween', zh: '万圣节' },
      date: { type: 'fixed', month: 10, day: 31 },
      theme: { sky: ['#2a1440', '#64307a'], night: true, cover: ['#ff7b1c', '#5b2a86'], paper: '#fff7ef', ink: '#4b2266', accent: '#ff7b1c', sea: ['#5b4a9e', '#3d2f73'], orb: 'moon' },
      hats: { mermaid: 'witch', bunny: 'witch' },
      fx: { type: 'fly', emoji: ['🦇', '🦇', '👻'] },
      props: ['🍬', '👻', '🍭', '🕸️', '🎃', '🧹'],
      confetti: ['🍬', '🎃', '👻', '🍭', '🦇', '⭐'],
      message: {
        en: 'Happy Halloween, {kid}! Pearl the mermaid dressed up as a sparkly sea witch, and Rainbow Bunny is a pumpkin bunny. Trick or treat! Let\'s fill our bags with candy and giggles.',
        zh: '万圣节快乐，{kidZh}！美人鱼珍珠扮成了亮晶晶的海洋小女巫，彩虹兔变成了南瓜兔。不给糖就捣蛋！我们一起装满一袋糖果和笑声吧！'
      },
      activity: {
        type: 'reveal', title: { en: 'Tap a picture to learn the word!', zh: '点一点图片，学一个词！' },
        items: [['🎃', 'pumpkin', '南瓜'], ['👻', 'ghost', '小幽灵'], ['🍬', 'candy', '糖果'],
          ['🦇', 'bat', '蝙蝠'], ['🧙', 'witch', '女巫'], ['🧹', 'broom', '扫帚']]
      },
      talk: { en: 'What do you want to dress up as next Halloween?', zh: '下次万圣节，你想扮成什么？' }
    }
  ],

  current: null,   // 当前打开的贺卡（已替换模板字段）
  state: 0,        // 0 封面 / 1 第一页展开 / 2 第二页展开
  LEAVES: 2,
  uid: 0,
  _timers: [],

  // ========== 日期 ==========
  dateOf(card, year) {
    const d = card.date;
    if (d.type === 'birthday') return new Date(year, this.BIRTHDAY.month - 1, this.BIRTHDAY.day);
    if (d.type === 'fixed') return new Date(year, d.month - 1, d.day);
    if (d.type === 'nth') {
      // 某月第 n 个星期几（感恩节：11 月第 4 个星期四）
      const first = new Date(year, d.month - 1, 1).getDay();
      return new Date(year, d.month - 1, 1 + (d.weekday - first + 7) % 7 + (d.n - 1) * 7);
    }
    if (d.type === 'easter') return this.easter(year);
    const md = this[d.type] && this[d.type][year];
    if (!md) return null;
    const [m, day] = md.split('-').map(Number);
    return new Date(year, m - 1, day);
  },

  // 复活节（公历，匿名算法）
  easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  },

  // 下一次（含今天）
  next(card, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
      const date = this.dateOf(card, y);
      if (date && date >= today) return { date, days: Math.round((date - today) / 86400000) };
    }
    return null;
  },

  ordered(now = new Date()) {
    return this.CARDS.map(card => ({ card, when: this.next(card, now) }))
      .sort((a, b) => (a.when ? a.when.days : 9999) - (b.when ? b.when.days : 9999));
  },

  // 填好名字/年份/生肖的贺卡副本
  fill(card, now = new Date()) {
    const when = this.next(card, now);
    const year = when ? when.date.getFullYear() : now.getFullYear();
    const z = this.ZODIAC[((year - 4) % 12 + 12) % 12];
    const vars = { kid: this.KID.en, kidZh: this.KID.zh, year, zodiacEmoji: z[0], zodiacEn: z[1], zodiacZh: z[2] };
    const sub = v => typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m)
      : Array.isArray(v) ? v.map(sub)
        : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v;
    return { ...sub(card), when };
  },

  dateLabel(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日 · ${this.MONTHS[date.getMonth()]} ${date.getDate()}`;
  },
  daysLabel(days) {
    if (days === 0) return '🎉 就是今天！Today!';
    if (days === 1) return '明天 · Tomorrow';
    return `还有 ${days} 天 · ${days} days`;
  },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // ========== 打开/关闭 ==========
  open(id) {
    const modal = document.getElementById('holiday-cards-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', e => this.onClick(e));
      this.bindSwipe(modal);
      window.addEventListener('resize', () => this.layout());
    }
    if (typeof RecentlyUsed !== 'undefined') RecentlyUsed.track('holidayCards');
    if (id) this.openCard(id); else this.renderGallery();
  },

  close() {
    this.clearTimers();
    this._picking = false;
    document.getElementById('holiday-cards-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  },

  back() {
    if (this.current) this.renderGallery();
    else this.close();
  },

  clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  },
  later(fn, ms) { this._timers.push(setTimeout(fn, ms)); },

  // ========== 贺卡列表 ==========
  renderGallery() {
    this.clearTimers();
    this.current = null;
    const modal = document.getElementById('holiday-cards-modal');
    const list = this.ordered();
    modal.dataset.view = 'gallery';
    this._picking = false;
    modal.style.removeProperty('--hc-a');
    modal.style.removeProperty('--hc-b');
    modal.innerHTML = `
      ${this.dream()}
      <div class="hc-top">
        <button class="hc-round" data-hc-act="back" aria-label="关闭">✕</button>
        <h2>💌 节日贺卡 <small>Holiday Cards</small></h2>
        <span class="hc-round-spacer"></span>
      </div>
      <div class="hc-gallery">
        <p class="hc-intro">给 ${this.esc(this.KID.zh)} 的贺卡 · Cards for ${this.esc(this.KID.en)} 🧜‍♀️🌈🐰</p>
        <div class="hc-grid">
          ${list.map(({ card, when }, i) => {
            const t = card.theme;
            const name = this.fill(card);
            return `
            <button class="hc-env${i === 0 ? ' is-next' : ''}" data-hc-card="${card.id}"
              style="--a:${t.cover[0]};--b:${t.cover[1]};--ink:${t.ink}">
              <span class="hc-env-hero">${card.hero}</span>
              <span class="hc-env-seal">${card.seal}</span>
              <span class="hc-env-label">
                <b>${this.esc(card.short.zh)}</b>
                <i>${this.esc(card.short.en)}</i>
                ${when ? `<em>${this.dateLabel(when.date)}</em><u>${this.daysLabel(when.days)}</u>` : ''}
              </span>
              ${i === 0 ? `<span class="hc-env-next">${when && when.days === 0 ? '今天的贺卡 · Today' : '下一个节日 · Coming up'}</span>` : ''}
              <span class="sr-only">${this.esc(name.en)}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="hc-foot">点信封拆开贺卡，爸爸妈妈读给你听 · Tap an envelope to open</p>
      </div>
      <div class="hc-fx" aria-hidden="true"></div>`;
  },

  // ========== 单张贺卡 ==========
  openCard(id) {
    const base = this.CARDS.find(c => c.id === id);
    if (!base) return;
    this.clearTimers();
    const card = this.current = this.fill(base);
    this.state = 0;
    this.uid++;
    const t = card.theme;
    const modal = document.getElementById('holiday-cards-modal');
    modal.dataset.view = 'card';
    modal.style.setProperty('--hc-a', t.cover[0]);
    modal.style.setProperty('--hc-b', t.cover[1]);
    const to = card.to || this.KID;
    modal.innerHTML = `
      ${this.dream(true)}
      <div class="hc-top">
        <button class="hc-round" data-hc-act="back" aria-label="返回">←</button>
        <h2>${this.esc(card.short.zh)} <small>${this.esc(card.short.en)}${card.when ? ' · ' + this.dateLabel(card.when.date) : ''}</small></h2>
        <span class="hc-round-spacer"></span>
      </div>
      <div class="hc-stage intro" data-state="0" style="--paper:${t.paper};--ink:${t.ink};--accent:${t.accent};--c1:${t.cover[0]};--c2:${t.cover[1]}">
        <div class="hc-world">
        <div class="hc-env-part hc-env-back"></div>
        <div class="hc-env-part hc-env-liner"></div>
        <div class="hc-rise"><div class="hc-float">
          <div class="hc-book" data-state="0">
            <div class="hc-page hc-base"><div class="hc-face hc-front">${this.pageFinal(card)}</div></div>
            <div class="hc-page hc-leaf" data-leaf="1">
              <div class="hc-face hc-front" data-turn="1">${this.pageMessage(card)}</div>
              <div class="hc-face hc-back">${this.pageActivity(card)}</div>
            </div>
            <div class="hc-page hc-leaf" data-leaf="0">
              <div class="hc-face hc-front hc-cover" data-turn="0">${this.pageCover(card)}</div>
              <div class="hc-face hc-back hc-scene-page">${this.pageScene(card)}</div>
            </div>
          </div>
        </div></div>
        <div class="hc-env-part hc-env-front"><span>To: ${this.esc(to.en)} 💕</span></div>
        <div class="hc-env-part hc-env-flap"></div>
        <div class="hc-env-part hc-env-seal">${card.seal}</div>
        </div>
      </div>
      <div class="hc-nav">
        <button class="hc-nav-btn" data-hc-act="prev" aria-label="上一页">◀</button>
        <span class="hc-dots">${[0, 1, 2].map(i => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</span>
        <button class="hc-nav-btn" data-hc-act="next" aria-label="下一页">▶</button>
      </div>
      <div class="hc-fx" aria-hidden="true"></div>`;
    this.layout();
    this.syncLeaves();
    // 开场时间线与 CSS 的 3.4s 关键帧对齐：1.05s 封蜡迸开，3.4s 结束（可点击跳过）
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.chime('open');
    if (calm) { this.later(() => this.finishIntro(true), 60); return; }
    this.later(() => this.sealPop(), 1050);
    this.later(() => this.chime('flip'), 1300);
    this.later(() => this.finishIntro(), 3400);
  },

  sealPop() {
    const seal = document.querySelector('#holiday-cards-modal .hc-env-seal');
    if (!seal || !this.current) return;
    const r = seal.getBoundingClientRect();
    this.burst(r.left + r.width / 2, r.top + r.height / 2, ['✨', '💫', '⭐', this.current.seal], 14);
    this.chime('sparkle');
  },

  // 开场结束：卡片四周闪一圈星光；skip 为点击跳过
  finishIntro(skip) {
    const stage = document.querySelector('#holiday-cards-modal .hc-stage');
    if (!stage || !stage.classList.contains('intro')) return;
    if (skip) this.clearTimers();
    stage.classList.remove('intro');
    if (skip) return;
    const cover = stage.querySelector('.hc-cover');
    if (!cover) return;
    const r = cover.getBoundingClientRect();
    [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]].forEach(([fx, fy], i) =>
      this.later(() => this.burst(r.left + r.width * fx, r.top + r.height * fy, ['✨', '💫', '⭐'], 4), i * 50));
    this.chime('sparkle');
  },

  // 背景：柔光光斑 +（贺卡页）缓慢旋转的光芒
  dream(rays) {
    const dots = Array.from({ length: 16 }, (_, i) => {
      const size = 18 + Math.random() * 70;
      return `<i class="c${i % 3}" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `--x:${Math.random() * 60 - 30}px;--y:${Math.random() * -70 - 10}px;--d:${7 + Math.random() * 7}s;--dl:${-Math.random() * 12}s"></i>`;
    }).join('');
    return `<div class="hc-dream" aria-hidden="true">${rays ? '<b class="hc-rays"></b>' : ''}${dots}</div>`;
  },

  // 宽屏横向翻（像书），窄屏/竖屏纵向翻（像台历）
  layout() {
    const stage = document.querySelector('#holiday-cards-modal .hc-stage');
    if (!stage) return;
    const wide = window.innerWidth >= 700 && window.innerWidth > window.innerHeight * 1.05;
    stage.dataset.dir = wide ? 'h' : 'v';
  },

  go(n) {
    n = Math.max(0, Math.min(this.LEAVES, n));
    if (!this.current || n === this.state) return;
    const moving = n > this.state ? this.state : n;
    this.state = n;
    const modal = document.getElementById('holiday-cards-modal');
    const book = modal.querySelector('.hc-book');
    book.dataset.state = n;
    modal.querySelector('.hc-stage').dataset.state = n;
    // 正在翻的那页和书本加 turning：翻页过程中的明暗光影
    const leaf = modal.querySelector(`.hc-leaf[data-leaf="${moving}"]`);
    [leaf, book].forEach(el => { el.classList.remove('turning'); void el.offsetWidth; el.classList.add('turning'); });
    const tok = this._turnTok = (this._turnTok || 0) + 1;
    this.later(() => { if (tok === this._turnTok) [leaf, book].forEach(el => el.classList.remove('turning')); }, 1200);
    modal.querySelectorAll('.hc-dots i').forEach((d, i) => d.classList.toggle('on', i === n));
    this.syncLeaves(moving);
    this.chime('flip');
    if (n === 1 && !this.current.cheered) {
      this.current.cheered = true;
      this.later(() => this.rain(this.current.confetti, 18), 500);
      this.later(() => this.chime('sparkle'), 650);
    }
  },

  // 翻动中的那页置顶，结束后按正反顺序排好层级
  syncLeaves(moving) {
    const leaves = document.querySelectorAll('#holiday-cards-modal .hc-leaf');
    leaves.forEach(leaf => {
      const i = Number(leaf.dataset.leaf);
      const flipped = i < this.state;
      leaf.classList.toggle('flipped', flipped);
      leaf.style.zIndex = i === moving ? 50 : (flipped ? 10 + i : 10 + this.LEAVES - i);
    });
    if (moving !== undefined) {
      this.later(() => this.syncLeaves(), 1150);
    }
  },

  // ========== 页面内容 ==========
  pageCover(card) {
    return `
      ${this.svgCover(card)}
      <div class="hc-cover-title">
        <div class="hc-ribbon">${this.esc(card.en)}</div>
        <div class="hc-cover-zh">${this.esc(card.zh)}</div>
      </div>
      <div class="hc-shine"></div>
      <div class="hc-tap">点我打开 ✨ Tap to open</div>`;
  },

  pageScene(card) {
    return `
      ${this.svgScene(card)}
      <div class="hc-scene-tip">点点美人鱼和彩虹兔 · Tap Pearl &amp; Bunny!</div>`;
  },

  pageMessage(card) {
    const c = card.props;
    return `
      <div class="hc-paper">
        <span class="hc-corner tl">${c[0]}</span><span class="hc-corner tr">${c[1]}</span>
        <span class="hc-corner bl">${c[2]}</span><span class="hc-corner br">${c[3]}</span>
        <h3>Dear ${this.esc((card.to || this.KID).en)}, <span>亲爱的${this.esc((card.to || this.KID).zh)}：</span></h3>
        <p class="hc-en">${this.esc(card.message.en)}</p>
        <div class="hc-divider"><i></i>🌈<i></i></div>
        <p class="hc-zh">${this.esc(card.message.zh)}</p>
        <div class="hc-turn-hint">翻页 · Turn the page ➜</div>
      </div>`;
  },

  pageActivity(card) {
    const a = card.activity;
    const title = `<h4>${this.esc(a.title.en)}<span>${this.esc(a.title.zh)}</span></h4>`;
    if (a.type === 'candles') {
      const n = this.candleCount();
      return `
        <div class="hc-paper hc-activity">
          ${title}
          <div class="hc-cake" data-left="${n}">
            <div class="hc-candles">
              ${Array.from({ length: n }, (_, i) => `
                <button class="hc-candle" data-hc-act="candle" style="--c:${this.RAINBOW[i % 6]}" aria-label="蜡烛 ${i + 1}">
                  <span class="hc-flame"></span>
                </button>`).join('')}
            </div>
            ${this.svgCake()}
          </div>
          <p class="hc-wish" hidden>愿望出发啦！Your wish is on its way! ✨</p>
        </div>`;
    }
    return `
      <div class="hc-paper hc-activity">
        ${title}
        <div class="hc-tiles">
          ${a.items.map(([pic, en, zh], i) => { const emoji = pic === 'ZONGZI' ? this.ZONGZI : pic; return `
            <button class="hc-tile" data-hc-act="tile" data-i="${i}">
              <span class="hc-tile-front">${a.cover || emoji}</span>
              <span class="hc-tile-back"><b>${emoji}</b><em>${this.esc(en)}</em><small>${this.esc(zh)}</small></span>
            </button>`; }).join('')}
        </div>
      </div>`;
  },

  pageFinal(card) {
    return `
      <div class="hc-paper hc-final">
        <div class="hc-talk">
          <b>💬 一起聊聊 · Let's talk</b>
          <p class="hc-en">${this.esc(card.talk.en)}</p>
          <p class="hc-zh">${this.esc(card.talk.zh)}</p>
        </div>
        <div class="hc-sign">
          <span>${this.esc((card.from || this.FROM).en)}</span>
          <span>${this.esc((card.from || this.FROM).zh)}</span>
          <span class="hc-sign-x">XOXO 💕</span>
        </div>
        <button class="hc-surprise" data-hc-act="surprise">🎁 惊喜！Surprise!</button>
        <div class="hc-final-row">
          <button data-hc-act="again">↺ 再读一遍 · Again</button>
          <button data-hc-act="back">💌 其他贺卡 · More</button>
        </div>
      </div>`;
  },

  // 蜡烛数：资料里有生日年份时按下一个生日的岁数，否则 5 根
  candleCount() {
    try {
      const p = typeof SafeStorage !== 'undefined' ? SafeStorage.getObject('kidsProfileData', {}) : {};
      const y = Number(String(p.birthday || '').slice(0, 4));
      const next = this.current && this.current.when;
      if (y > 1990 && next) {
        const age = next.date.getFullYear() - y;
        if (age >= 1 && age <= 12) return age;
      }
    } catch { /* 读不到资料就用默认值 */ }
    return 5;
  },

  // ========== 交互 ==========
  onClick(e) {
    const envBtn = e.target.closest('[data-hc-card]');
    if (envBtn) {
      if (this._picking) return;
      this._picking = true;
      envBtn.classList.add('picked');
      envBtn.closest('.hc-grid').classList.add('picking');
      this.chime('pop');
      this.later(() => { this._picking = false; this.openCard(envBtn.dataset.hcCard); }, 420);
      return;
    }
    // 开场动画中点一下 = 跳过
    const stage = e.target.closest('.hc-stage');
    if (stage && stage.classList.contains('intro')) { this.finishIntro(true); return; }
    const act = e.target.closest('[data-hc-act]');
    if (act) { this.act(act.dataset.hcAct, act, e); return; }
    // 点右/下方当前页翻到下一页
    const face = e.target.closest('[data-turn]');
    if (face && Number(face.dataset.turn) === this.state) this.go(this.state + 1);
  },

  act(name, el, e) {
    const x = e.clientX, y = e.clientY;
    const card = this.current;
    switch (name) {
      case 'back': this.back(); break;
      case 'next': this.go(this.state + 1); break;
      case 'prev': this.go(this.state - 1); break;
      case 'again':
        this.go(0);
        break;
      case 'mermaid':
        this.replay(el, 'joy');
        this.burst(x, y, ['🫧', '🫧', '✨', '🐚', '💖'], 9);
        this.chime('sparkle');
        break;
      case 'bunny':
        this.replay(el, 'joy');
        this.burst(x, y, ['🌈', '✨', '💜', '💛', '🥕'], 9);
        this.chime('boing');
        break;
      case 'prop':
        this.replay(el, 'joy');
        this.burst(x, y, ['✨', el.textContent], 6);
        this.chime('pop');
        break;
      case 'tile': {
        if (el.classList.contains('open')) { this.replay(el, 'joy'); break; }
        el.classList.add('turning');
        this.later(() => { el.classList.add('open'); }, 180);
        this.later(() => el.classList.remove('turning'), 400);
        this.burst(x, y, ['✨', '⭐'], 5);
        this.chime('pop');
        break;
      }
      case 'candle': {
        if (el.classList.contains('out')) break;
        el.classList.add('out');
        this.chime('puff');
        const cake = el.closest('.hc-cake');
        const left = cake.querySelectorAll('.hc-candle:not(.out)').length;
        if (!left) {
          cake.closest('.hc-activity').querySelector('.hc-wish').hidden = false;
          this.later(() => { this.rain(card.confetti, 30); this.chime('tada'); }, 300);
        }
        break;
      }
      case 'surprise':
        this.replay(el, 'joy');
        this.rain(card.confetti, 40);
        this.burst(x, y, card.confetti, 12);
        this.chime('tada');
        break;
    }
  },

  // 重新触发一次 CSS 动画
  replay(el, cls) {
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    this.later(() => el.classList.remove(cls), 1100);
  },

  bindSwipe(modal) {
    let sx = 0, sy = 0, on = false;
    modal.addEventListener('pointerdown', e => {
      if (!e.target.closest('.hc-stage')) return;
      on = true; sx = e.clientX; sy = e.clientY;
    });
    modal.addEventListener('pointerup', e => {
      if (!on) return;
      on = false;
      const stage = modal.querySelector('.hc-stage');
      if (!stage) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const along = stage.dataset.dir === 'h' ? dx : dy;
      const across = stage.dataset.dir === 'h' ? dy : dx;
      if (Math.abs(along) < 60 || Math.abs(across) > Math.abs(along)) return;
      this._swiped = Date.now();
      this.go(this.state + (along < 0 ? 1 : -1));
    });
    // 刚滑过就不再把同一次手势当成点击
    modal.addEventListener('click', e => {
      if (this._swiped && Date.now() - this._swiped < 300) { e.stopImmediatePropagation(); }
    }, true);
  },

  // ========== 粒子 ==========
  fxLayer() { return document.querySelector('#holiday-cards-modal .hc-fx'); },

  burst(x, y, emojis, n = 8) {
    const layer = this.fxLayer();
    if (!layer || !Number.isFinite(x)) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 50 + Math.random() * 60;
      s.className = 'hc-burst';
      s.textContent = emojis[i % emojis.length];
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist - 20 + 'px');
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  },

  rain(emojis, n = 30) {
    const layer = this.fxLayer();
    if (!layer) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'hc-rain';
      s.textContent = emojis[i % emojis.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = 18 + Math.random() * 22 + 'px';
      s.style.animationDuration = 2.4 + Math.random() * 2 + 's';
      s.style.animationDelay = Math.random() * 1.2 + 's';
      s.style.setProperty('--sway', (Math.random() * 80 - 40) + 'px');
      layer.appendChild(s);
      setTimeout(() => s.remove(), 6000);
    }
  },

  // ========== 音效（很轻的 WebAudio 小铃声） ==========
  chime(kind) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this._ac || (this._ac = new AC());
      if (ctx.state === 'suspended') ctx.resume();
      const notes = {
        open: [[659, 0], [784, 0.09], [1047, 0.18]],
        flip: [[523, 0], [659, 0.06]],
        sparkle: [[1319, 0], [1568, 0.07], [2093, 0.14]],
        boing: [[392, 0], [587, 0.08]],
        pop: [[880, 0]],
        puff: [[300, 0]],
        tada: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]]
      }[kind] || [];
      const t0 = ctx.currentTime;
      notes.forEach(([f, dt]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = kind === 'puff' ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(f, t0 + dt);
        if (kind === 'boing') o.frequency.exponentialRampToValueAtTime(f * 1.6, t0 + dt + 0.12);
        g.gain.setValueAtTime(0.0001, t0 + dt);
        g.gain.exponentialRampToValueAtTime(0.08, t0 + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(t0 + dt);
        o.stop(t0 + dt + 0.4);
      });
    } catch { /* 无音频也不影响 */ }
  },

  // ========== SVG 插画 ==========
  defs(u, t) {
    const rb = this.RAINBOW;
    const stops = rb.map((c, i) => `<stop offset="${i / (rb.length - 1)}" stop-color="${c}"/>`).join('');
    return `<defs>
      <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient>
      <linearGradient id="${u}cover" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.cover[0]}"/><stop offset="1" stop-color="${t.cover[1]}"/></linearGradient>
      <linearGradient id="${u}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sea[0]}"/><stop offset="1" stop-color="${t.sea[1]}"/></linearGradient>
      <linearGradient id="${u}hair" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ff9fd0"/><stop offset=".55" stop-color="#d07cff"/><stop offset="1" stop-color="#8a6bff"/></linearGradient>
      <linearGradient id="${u}tail" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#5fe3cf"/><stop offset=".5" stop-color="#4fa8ff"/><stop offset="1" stop-color="#b27bff"/></linearGradient>
      <linearGradient id="${u}fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b27bff"/><stop offset="1" stop-color="#ff9fd0"/></linearGradient>
      <linearGradient id="${u}rbv" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
      <linearGradient id="${u}rbh" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      <radialGradient id="${u}glow"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>
    </defs>`;
  },

  heart(cx, cy, s, fill) {
    return `<path transform="translate(${cx} ${cy}) scale(${s})" fill="${fill}" d="M0 3C-6-2-6-8-2.5-8C-1-8 0-7 0-5.5C0-7 1-8 2.5-8C6-8 6-2 0 3Z"/>`;
  },
  star(cx, cy, r, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = Math.PI / 5 * i - Math.PI / 2;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
  },
  flower(cx, cy, r, petal) {
    return `<g transform="translate(${cx} ${cy})">${[0, 72, 144, 216, 288].map(a =>
      `<circle cx="0" cy="${-r}" r="${r * 0.8}" fill="${petal}" transform="rotate(${a})"/>`).join('')}<circle r="${r * 0.7}" fill="#ffd43b"/></g>`;
  },

  // 帽子/头饰：原点在头顶中点，向上（负 y）画
  hat(kind) {
    switch (kind) {
      case 'party': return `<g transform="rotate(-14)">
          <path d="M-13 4 L0 -30 L13 4 Z" fill="#ff6fb0"/>
          <path d="M-9 -6 L9 -6 M-5 -17 L5 -17" stroke="#ffe066" stroke-width="3.5" stroke-linecap="round"/>
          <circle cy="-31" r="5" fill="#ffe066"/>${this.star(0, -31, 3, '#fff')}</g>`;
      case 'tiara': return `<g><path d="M-15 4 L-13 -9 L-7 -1 L0 -14 L7 -1 L13 -9 L15 4 Z" fill="#ffd84d" stroke="#e8a800" stroke-width="1.2" stroke-linejoin="round"/>
          <circle cy="-14" r="2.6" fill="#ff6fb0"/><circle cx="-13" cy="-9" r="2" fill="#6fd8ff"/><circle cx="13" cy="-9" r="2" fill="#6fd8ff"/><circle cy="0" r="2.6" fill="#b27bff"/></g>`;
      case 'pilgrim': return `<g><path d="M-12 -22 L12 -22 L15 2 L-15 2 Z" fill="#33303a"/>
          <ellipse cy="2" rx="24" ry="5" fill="#2a2730"/><path d="M-14 -7 L14 -7 L14.6 -1 L-14.6 -1 Z" fill="#c9873b"/>
          <rect x="-5" y="-8" width="10" height="8" rx="1" fill="none" stroke="#ffd43b" stroke-width="2"/></g>`;
      case 'leafCrown': return `<g>${[-56, -34, -12, 12, 34, 56].map((a, i) =>
          `<ellipse cx="0" cy="-5" rx="5.5" ry="10" fill="${['#e8572a', '#f2a03d', '#d9381e', '#f7c548', '#e8572a', '#f2a03d'][i]}" transform="rotate(${a} 0 22)"/>`).join('')}
          <circle cx="0" cy="-12" r="3" fill="#8a4a1c"/></g>`;
      case 'santa': return `<g><path d="M-17 2 Q-8 -34 24 -16 L19 -8 Q5 -18 17 2 Z" fill="#e0303c"/>
          <rect x="-19" y="-3" width="38" height="9" rx="4.5" fill="#fff"/><circle cx="24" cy="-15" r="5.5" fill="#fff"/></g>`;
      case 'antlers': return `<g stroke="#a0663a" stroke-width="3.4" stroke-linecap="round" fill="none">
          <path d="M-9 0 L-15 -20 M-13 -13 L-22 -16 M-15 -20 L-11 -28 M-15 -20 L-22 -26"/>
          <path d="M9 0 L15 -20 M13 -13 L22 -16 M15 -20 L11 -28 M15 -20 L22 -26"/></g>`;
      case 'bow': return `<g transform="translate(14 6) rotate(18)">
          <path d="M0 0 C-8 -12 -20 -6 -16 4 C-12 10 -4 6 0 0 Z M0 0 C8 -12 20 -6 16 4 C12 10 4 6 0 0 Z" fill="#e02b35"/>
          <path d="M-2 2 L-6 14 M2 2 L6 14" stroke="#e02b35" stroke-width="3" stroke-linecap="round"/>
          <circle r="4" fill="#ffd43b"/></g>`;
      case 'hearts': return `<g><path d="M-19 10 Q0 -8 19 10" stroke="#ff4f8b" stroke-width="3" fill="none"/>
          <path d="M-8 -2 L-11 -16 M8 -2 L11 -16" stroke="#ff4f8b" stroke-width="1.6"/>
          ${this.heart(-11, -18, 1.3, '#ff3d7f')}${this.heart(11, -18, 1.3, '#ff8fb8')}</g>`;
      case 'flowers': return `<g>${[-50, -25, 0, 25, 50].map((a, i) =>
          `<g transform="rotate(${a} 0 22)">${this.flower(0, -3, 3.6, ['#ff8fc8', '#ffd43b', '#b48cff', '#7fd6ff', '#ff9a6b'][i])}</g>`).join('')}</g>`;
      case 'stars': return `<g><path d="M-19 10 Q0 -6 19 10" stroke="#4dabf7" stroke-width="3" fill="none"/>
          ${this.star(-11, -6, 6.5, '#ffd43b')}${this.star(0, -12, 7.5, '#ff6b6b')}${this.star(11, -6, 6.5, '#69db7c')}</g>`;
      case 'witch': return `<g transform="rotate(-8)"><ellipse cy="2" rx="27" ry="6" fill="#3b2a5c"/>
          <path d="M-14 1 L2 -34 Q7 -40 12 -33 L8 -30 L14 1 Z" fill="#53388a"/>
          <path d="M-13 -4 L13.4 -4 L14 1 L-14 1 Z" fill="#ff8a2a"/>${this.star(6, -20, 4, '#ffd43b')}</g>`;
      case 'cap': return `<g transform="rotate(-8)"><path d="M-16 4 C-16 -18 16 -18 16 4 Z" fill="#2f6fe0"/>
          <path d="M9 1 L30 4 Q28 9 9 6 Z" fill="#1d4fb0"/><circle cy="-13.5" r="2.4" fill="#ffd43b"/>${this.star(0, -4, 4.6, '#fff')}</g>`;
      case 'headband': return `<g><path d="M-21 14 Q0 4 21 14" stroke="#e0453a" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M19 13 L30 6 M19 13 L31 17" stroke="#e0453a" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="13" r="3.2" fill="#ffd43b"/></g>`;
      case 'moon': return `<g transform="translate(13 4)"><path d="M0 -12 A12 12 0 1 0 10 6 A9 9 0 1 1 0 -12 Z" fill="#ffd84d" stroke="#f2b400" stroke-width="1"/>
          ${this.star(10, -8, 4, '#fff3a8')}</g>`;
      default: return '';
    }
  },

  mermaid(x, y, s, u, hat) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><g class="hc-char hc-mermaid" data-hc-act="mermaid">
      <ellipse cx="4" cy="60" rx="40" ry="90" fill="transparent"/>
      <path fill="url(#${u}hair)" d="M-24 0C-30-34 28-38 26-4C30 22 26 46 38 64C22 66 12 50 10 34L-12 34C-16 52-28 62-40 60C-30 44-28 22-24 0Z"/>
      <path fill="#ffe0cf" d="M-11 20C-13 32-14 44-14 54L14 54C14 44 13 32 11 20Z"/>
      <g class="hc-tail">
        <path fill="url(#${u}tail)" d="M-15 50C-24 84-10 114 20 130L30 125C15 106 12 82 15 50Z"/>
        <path d="M-10 64q4 4 8 0q4 4 8 0M-11 77q4 4 8 0q4 4 8 0M-7 90q4 4 8 0q4 4 8 0M0 103q4 4 8 0q4 4 8 0" stroke="#fff" stroke-opacity=".5" fill="none" stroke-width="1.5" stroke-linecap="round"/>
        <path fill="url(#${u}fin)" d="M23 126C35 110 55 108 64 98C64 119 49 133 30 133Z"/>
        <path fill="url(#${u}fin)" d="M23 126C25 145 39 159 58 161C49 147 41 137 30 130Z"/>
      </g>
      <path d="M-15 51Q0 58 15 51" stroke="#ffe066" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <circle cx="-6" cy="33" r="6" fill="#c79bff"/><circle cx="6" cy="33" r="6" fill="#c79bff"/>
      <path d="M-6 28v9M-9 29l3 6M-3 29l-3 6M6 28v9M3 29l3 6M9 29l-3 6" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
      <path d="M-11 25Q-22 36-16 48" stroke="#ffe0cf" stroke-width="6" stroke-linecap="round" fill="none"/>
      <g class="hc-wave"><path d="M11 25Q22 20 25 8" stroke="#ffe0cf" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="25" cy="6" r="4.2" fill="#ffe0cf"/></g>
      <circle r="22" fill="#ffe8da"/>
      <path fill="url(#${u}hair)" d="M-24-3C-22-27 20-31 24-6C14-16 4-18-2-10C-8-18-18-16-24-3Z"/>
      <ellipse cx="-8" cy="3" rx="3.2" ry="4.2" fill="#3a2340"/><ellipse cx="8" cy="3" rx="3.2" ry="4.2" fill="#3a2340"/>
      <circle cx="-7" cy="1.4" r="1.3" fill="#fff"/><circle cx="9" cy="1.4" r="1.3" fill="#fff"/>
      <path d="M-12 -1l-2.5-2M12 -1l2.5-2" stroke="#3a2340" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="-13.5" cy="10" rx="4.2" ry="2.6" fill="#ff9fb8" opacity=".65"/><ellipse cx="13.5" cy="10" rx="4.2" ry="2.6" fill="#ff9fb8" opacity=".65"/>
      <path d="M-5 10Q0 15.5 5 10" stroke="#c2456b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="-17" cy="-10" r="3" fill="#fff" opacity=".9"/><circle cx="-17" cy="-10" r="1.4" fill="#ffd6f0"/>
      <g transform="translate(0 -20)">${this.hat(hat)}</g>
    </g></g>`;
  },

  bunny(x, y, s, u, hat) {
    const rb = this.RAINBOW;
    const ear = (side) => `<g transform="translate(${side * 9} -15) rotate(${side * 14})"><g class="hc-ear">
        <ellipse cx="0" cy="-22" rx="8.5" ry="23" fill="#fff" stroke="#f0d4e6" stroke-width="1.4"/>
        <ellipse cx="0" cy="-21" rx="4.6" ry="17" fill="url(#${u}rbv)" opacity=".85"/></g></g>`;
    return `<g transform="translate(${x} ${y}) scale(${s})"><g class="hc-char hc-bunny" data-hc-act="bunny">
      <ellipse cx="0" cy="10" rx="40" ry="70" fill="transparent"/>
      <circle cx="25" cy="48" r="7" fill="${rb[0]}"/><circle cx="29" cy="42" r="6" fill="${rb[2]}"/><circle cx="31" cy="50" r="6" fill="${rb[4]}"/><circle cx="27" cy="45" r="4" fill="${rb[5]}"/>
      ${ear(-1)}${ear(1)}
      <ellipse cx="0" cy="40" rx="25" ry="23" fill="#fff" stroke="#f0d4e6" stroke-width="1.4"/>
      <ellipse cx="0" cy="44" rx="14" ry="13" fill="url(#${u}rbv)" opacity=".5"/>
      <path d="M-9 41a9 9 0 0 1 18 0M-6 41a6 6 0 0 1 12 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/>
      <ellipse cx="-17" cy="36" rx="5.5" ry="8.5" fill="#fff" stroke="#f0d4e6" stroke-width="1.2" transform="rotate(20 -17 36)"/>
      <ellipse cx="17" cy="36" rx="5.5" ry="8.5" fill="#fff" stroke="#f0d4e6" stroke-width="1.2" transform="rotate(-20 17 36)"/>
      <ellipse cx="-13" cy="62" rx="9.5" ry="5.5" fill="#fff" stroke="#f0d4e6" stroke-width="1.2"/>
      <ellipse cx="13" cy="62" rx="9.5" ry="5.5" fill="#fff" stroke="#f0d4e6" stroke-width="1.2"/>
      <circle r="21" fill="#fff" stroke="#f0d4e6" stroke-width="1.4"/>
      <ellipse cx="-7" cy="-1" rx="3.1" ry="3.9" fill="#2f2540"/><ellipse cx="7" cy="-1" rx="3.1" ry="3.9" fill="#2f2540"/>
      <circle cx="-6" cy="-2.4" r="1.2" fill="#fff"/><circle cx="8" cy="-2.4" r="1.2" fill="#fff"/>
      <ellipse cx="-13" cy="7" rx="4.3" ry="2.6" fill="#ffadc8" opacity=".75"/><ellipse cx="13" cy="7" rx="4.3" ry="2.6" fill="#ffadc8" opacity=".75"/>
      <path d="M-2.6 5.5L2.6 5.5L0 8.6Z" fill="#ff7aa8"/>
      <path d="M-4.5 10.5Q-2.2 13.5 0 10.5Q2.2 13.5 4.5 10.5" stroke="#b8577e" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <g transform="translate(0 -19) scale(.9)">${this.hat(hat)}</g>
    </g></g>`;
  },

  rainbowArc(cx, cy, r0, w, opacity) {
    return this.RAINBOW.map((c, i) => {
      const r = r0 - i * w;
      return `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" pathLength="1" stroke="${c}" stroke-width="${w + 0.6}" fill="none" opacity="${opacity}"/>`;
    }).join('');
  },

  orb(t) {
    if (t.orb === 'sun') return `<g class="hc-sun"><circle cx="338" cy="56" r="44" fill="url(#U_glow)"/><circle cx="338" cy="56" r="22" fill="#ffe066"/>
        <circle cx="331" cy="52" r="2.4" fill="#e0a800"/><circle cx="345" cy="52" r="2.4" fill="#e0a800"/><path d="M331 61Q338 67 345 61" stroke="#e0a800" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
    if (t.orb === 'moon') return `<circle cx="338" cy="58" r="44" fill="url(#U_glow)" opacity=".5"/><path d="M338 34A24 24 0 1 0 360 66A19 19 0 1 1 338 34Z" fill="#fff3b0"/>`;
    if (t.orb === 'fullmoon') return `<circle cx="320" cy="66" r="70" fill="url(#U_glow)" opacity=".6"/><circle cx="320" cy="66" r="38" fill="#fff1b8"/>
        <circle cx="306" cy="56" r="6" fill="#f2deb0"/><circle cx="330" cy="80" r="8" fill="#f2deb0"/><circle cx="334" cy="52" r="4" fill="#f2deb0"/>
        <text x="320" y="70" font-size="26" text-anchor="middle" dominant-baseline="central" opacity=".55">🐇</text>`;
    return '';
  },

  nightStars() {
    const pts = [[30, 30], [70, 80], [120, 24], [160, 60], [210, 20], [250, 70], [280, 30], [380, 120], [20, 130], [180, 110], [380, 20], [100, 140]];
    return pts.map(([x, y], i) => `<circle class="hc-twinkle" cx="${x}" cy="${y}" r="${1.2 + (i % 3) * 0.6}" fill="#fff" style="animation-delay:${(i * 0.37) % 3}s"/>`).join('');
  },

  sceneFx(fx) {
    if (!fx) return '';
    if (fx.type === 'fireworks') {
      const bursts = [[80, 70, '#ffd43b'], [210, 46, '#ff6fb0'], [300, 110, '#69db7c'], [140, 120, '#4dabf7']];
      return bursts.map(([x, y, c], i) => `<g transform="translate(${x} ${y})"><g class="hc-firework" style="animation-delay:${i * 0.6}s">
        ${Array.from({ length: 12 }, (_, k) => {
          const a = Math.PI * 2 * k / 12;
          return `<line x1="${(Math.cos(a) * 6).toFixed(1)}" y1="${(Math.sin(a) * 6).toFixed(1)}" x2="${(Math.cos(a) * 26).toFixed(1)}" y2="${(Math.sin(a) * 26).toFixed(1)}" stroke="${k % 2 ? '#fff' : c}" stroke-width="2.4" stroke-linecap="round"/>`;
        }).join('')}<circle r="3" fill="#fff"/></g></g>`).join('');
    }
    if (fx.type === 'boat') return `<g transform="translate(0 222)"><g class="hc-boat">${this.dragonBoat()}</g></g>`;
    const e = fx.emoji;
    if (fx.type === 'hang') {
      return [[60, 46], [200, 30], [370, 44]].map(([x, len], i) => `<g transform="translate(${x} 0)"><g class="hc-swing" style="animation-delay:${i * 0.5}s">
        <line x1="0" y1="0" x2="0" y2="${len}" stroke="#a33" stroke-width="1.4"/>
        <text y="${len + 14}" font-size="28" text-anchor="middle" dominant-baseline="central">${e[i % e.length]}</text></g></g>`).join('');
    }
    const xs = [40, 110, 170, 240, 300, 360, 75, 205];
    return xs.map((x, i) => {
      const dur = 5 + (i % 4) * 1.3, delay = -(i * 1.7) % dur;
      if (fx.type === 'fly') {
        return `<text class="hc-fly" x="-30" y="${30 + (i % 4) * 28}" font-size="${18 + (i % 3) * 5}" style="animation-duration:${dur + 3}s;animation-delay:${delay}s">${e[i % e.length]}</text>`;
      }
      const cls = fx.type === 'rise' ? 'hc-riser' : 'hc-faller';
      const y = fx.type === 'rise' ? 330 : -20;
      return `<text class="${cls}" x="${x}" y="${y}" font-size="${14 + (i % 3) * 6}" text-anchor="middle" style="animation-duration:${dur}s;animation-delay:${delay}s">${e[i % e.length]}</text>`;
    }).join('');
  },

  // 龙舟：船头朝右，五个小划手 + 鼓
  dragonBoat() {
    const rb = this.RAINBOW;
    const rowers = [22, 42, 62, 82, 102].map((x, i) => `<g transform="translate(${x} 0)">
        <rect x="-4.5" y="-9" width="9" height="9" rx="3" fill="${rb[i % 6]}"/><circle cy="-13" r="4.6" fill="#ffe0cf"/>
        <path d="M-1 -16 Q0 -20 4 -17" stroke="#3a2340" stroke-width="2" fill="none"/>
        <g class="hc-oar" style="animation-delay:${-i * 0.12}s"><line x1="3" y1="-6" x2="-9" y2="13" stroke="#8a5a2b" stroke-width="2.2" stroke-linecap="round"/></g></g>`).join('');
    return `<g class="hc-boat-bob">
      <path d="M-4 -2 Q-12 -14 -2 -18 Q2 -10 4 -2 Z" fill="#e9b93f"/>
      ${rowers}
      <circle cx="116" cy="-6" r="6" fill="#c0392b" stroke="#ffd43b" stroke-width="1.6"/>
      <path d="M0 -2 Q62 10 128 -4 L122 6 Q62 18 6 7 Z" fill="#e0453a"/>
      <path d="M8 3 Q62 13 120 1" stroke="#ffd43b" stroke-width="2" fill="none" stroke-dasharray="5 4"/>
      <text x="136" y="-12" font-size="24" text-anchor="middle" dominant-baseline="central">🐲</text>
    </g>`;
  },

  svgScene(card) {
    const t = card.theme, u = `hc${this.uid}s`;
    const p = card.props;
    const slots = [[46, 64, 30], [205, 150, 26], [368, 156, 28], [212, 278, 32], [30, 192, 26], [158, 300, 24]];
    return `<svg class="hc-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${this.defs(u, t)}
      <rect width="400" height="320" fill="url(#${u}sky)"/>
      ${t.night ? this.nightStars() : ''}
      ${this.orb(t).replaceAll('U_', u)}
      <g class="hc-arc">${this.rainbowArc(200, 252, 176, 9, t.night ? 0.45 : 0.6)}</g>
      ${this.sceneFx(card.fx)}
      <path class="hc-wave1" d="M-20 236Q30 224 80 236T180 236T280 236T380 236T480 236V340H-20Z" fill="url(#${u}sea)" opacity=".75"/>
      <g class="hc-pop" style="animation-delay:.42s"><ellipse cx="300" cy="250" rx="74" ry="17" fill="#ffe3a3"/><ellipse cx="300" cy="246" rx="62" ry="10" fill="#fff0c8"/>
      <path d="M248 244q4-10 8 0M346 246q3-9 7 0" stroke="#5fbf6a" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
      <g class="hc-pop" style="animation-delay:.36s"><path d="M40 262C34 236 60 212 98 214C132 208 172 222 174 250C176 268 140 276 104 274C70 276 44 276 40 262Z" fill="#a597d4"/>
      <path d="M58 236C70 224 92 220 112 224" stroke="#c7bdf0" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="150" cy="258" r="4" fill="#ffc6e0"/><circle cx="64" cy="252" r="3" fill="#fff"/></g>
      <g class="hc-pop" style="animation-delay:.62s">${this.bunny(300, 178, 0.95, u, card.hats.bunny)}</g>
      <g class="hc-pop" style="animation-delay:.52s">${this.mermaid(106, 120, 0.95, u, card.hats.mermaid)}</g>
      <path class="hc-wave2" d="M-20 280Q20 268 60 280T140 280T220 280T300 280T380 280T460 280V340H-20Z" fill="url(#${u}sea)"/>
      <g class="hc-bubbles"><circle cx="70" cy="290" r="3" fill="#fff" opacity=".7"/><circle cx="180" cy="296" r="4" fill="#fff" opacity=".6"/><circle cx="330" cy="292" r="3" fill="#fff" opacity=".7"/></g>
      ${slots.map(([x, y, s], i) => `<g transform="translate(${x} ${y})"><g class="hc-pop" style="animation-delay:${0.75 + i * 0.07}s"><text class="hc-prop" data-hc-act="prop" font-size="${s}" text-anchor="middle" dominant-baseline="central">${p[i]}</text></g></g>`).join('')}
    </svg>`;
  },

  svgCover(card) {
    const t = card.theme, u = `hc${this.uid}c`;
    const pattern = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 30 + c * 70 + (r % 2) * 35, y = 26 + r * 62;
        pattern.push(`<text x="${x}" y="${y}" font-size="18" text-anchor="middle" dominant-baseline="central" opacity=".22" transform="rotate(${(r * 31 + c * 17) % 40 - 20} ${x} ${y})">${card.props[(r + c) % card.props.length]}</text>`);
      }
    }
    return `<svg class="hc-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${this.defs(u, t)}
      <rect width="400" height="320" fill="url(#${u}cover)"/>
      ${pattern.join('')}
      <rect x="10" y="10" width="380" height="300" rx="16" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>
      ${this.rainbowArc(200, 330, 150, 10, 0.9)}
      <circle cx="200" cy="200" r="50" fill="url(#${u}glow)" opacity=".7"/>
      <g transform="translate(200 196)"><text class="hc-hero" font-size="66" text-anchor="middle" dominant-baseline="central">${card.hero}</text></g>
      ${this.mermaid(66, 246, 0.62, u, card.hats.mermaid)}
      ${this.bunny(338, 252, 0.62, u, card.hats.bunny)}
      <path d="M-20 296Q20 284 60 296T140 296T220 296T300 296T380 296T460 296V340H-20Z" fill="url(#${u}sea)" opacity=".95"/>
      ${this.star(40, 40, 7, '#fff')}${this.star(362, 36, 6, '#fff')}${this.star(372, 150, 4, '#fff')}${this.star(28, 140, 4, '#fff')}
    </svg>`;
  },

  svgCake() {
    const rb = this.RAINBOW;
    return `<svg class="hc-cake-svg" viewBox="0 0 220 120" aria-hidden="true">
      <ellipse cx="110" cy="112" rx="100" ry="8" fill="#000" opacity=".08"/>
      <rect x="22" y="58" width="176" height="50" rx="12" fill="#ff9fd0"/>
      <rect x="22" y="58" width="176" height="14" rx="7" fill="#fff"/>
      <path d="M22 70q11 14 22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0" fill="#fff"/>
      ${rb.map((c, i) => `<circle cx="${40 + i * 28}" cy="92" r="6" fill="${c}"/>`).join('')}
      <rect x="40" y="16" width="140" height="44" rx="10" fill="#c3a6ff"/>
      <rect x="40" y="16" width="140" height="11" rx="5.5" fill="#fff"/>
      <path d="M40 25q10 12 20 0t20 0t20 0t20 0t20 0t20 0t20 0" fill="#fff"/>
      <text x="110" y="45" font-size="16" text-anchor="middle" dominant-baseline="central">🧜‍♀️ 🐚 🐰</text>
    </svg>`;
  }
};

function showHolidayCards() { HolidayCards.open(); }
