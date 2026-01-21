/**
 * 科学探索题库
 * 编写: 小美 (内容策划)
 * 版本: v1.0
 * 日期: 2026-01-20
 *
 * 包含3个主题，共30道题目:
 * - 动物世界 (animal): 10题
 * - 神奇植物 (plant): 10题
 * - 自然现象 (nature): 10题
 */

const scienceQuestions = {
    // ==================== 动物世界 ====================
    animal: [
        {
            id: "science_animal_001",
            theme: "animal",
            question: "这是什么动物？",
            hint: "它被称为"森林之王"",
            image: "🦁",
            options: [
                { id: "A", text: "老虎", emoji: "🐯" },
                { id: "B", text: "狮子", emoji: "🦁" },
                { id: "C", text: "熊", emoji: "🐻" },
                { id: "D", text: "狼", emoji: "🐺" }
            ],
            answer: "B",
            explanation: "狮子是唯一群居的猫科动物，一个狮群通常有10-15只狮子。雄狮有漂亮的鬃毛，生活在非洲草原上。",
            difficulty: 1
        },
        {
            id: "science_animal_002",
            theme: "animal",
            question: "哪种动物会飞？",
            hint: "它有翅膀和羽毛",
            image: "🐦",
            options: [
                { id: "A", text: "鱼", emoji: "🐟" },
                { id: "B", text: "鸟", emoji: "🐦" },
                { id: "C", text: "蛇", emoji: "🐍" },
                { id: "D", text: "青蛙", emoji: "🐸" }
            ],
            answer: "B",
            explanation: "鸟类是唯一有羽毛的动物，大多数鸟都会飞。它们的骨骼中空，身体轻盈，非常适合飞行。",
            difficulty: 1
        },
        {
            id: "science_animal_003",
            theme: "animal",
            question: "哪种动物生活在水里？",
            hint: "它用鳃呼吸",
            image: "🐟",
            options: [
                { id: "A", text: "鱼", emoji: "🐟" },
                { id: "B", text: "狗", emoji: "🐕" },
                { id: "C", text: "猫", emoji: "🐈" },
                { id: "D", text: "鸡", emoji: "🐔" }
            ],
            answer: "A",
            explanation: "鱼生活在水中，用鳃呼吸，用鳍游泳。它们是冷血动物，身体表面有鳞片保护。",
            difficulty: 1
        },
        {
            id: "science_animal_004",
            theme: "animal",
            question: "熊猫最爱吃什么？",
            hint: "这是一种绿色的植物",
            image: "🐼",
            options: [
                { id: "A", text: "苹果", emoji: "🍎" },
                { id: "B", text: "竹子", emoji: "🎋" },
                { id: "C", text: "胡萝卜", emoji: "🥕" },
                { id: "D", text: "肉", emoji: "🍖" }
            ],
            answer: "B",
            explanation: "大熊猫99%的食物都是竹子，每天要吃12-38公斤竹子！它们是中国的国宝，非常珍贵。",
            difficulty: 2
        },
        {
            id: "science_animal_005",
            theme: "animal",
            question: "哪种动物是哺乳动物？",
            hint: "它会给宝宝喂奶",
            image: "🐋",
            options: [
                { id: "A", text: "鲨鱼", emoji: "🦈" },
                { id: "B", text: "鲸鱼", emoji: "🐋" },
                { id: "C", text: "金鱼", emoji: "🐠" },
                { id: "D", text: "章鱼", emoji: "🦑" }
            ],
            answer: "B",
            explanation: "虽然鲸鱼生活在水里，但它是哺乳动物！它用肺呼吸，会给宝宝喂奶，是地球上最大的动物。",
            difficulty: 2
        },
        {
            id: "science_animal_006",
            theme: "animal",
            question: "蜜蜂采花蜜是为了做什么？",
            hint: "这是一种甜甜的食物",
            image: "🐝",
            options: [
                { id: "A", text: "做蜂蜜", emoji: "🍯" },
                { id: "B", text: "做面包", emoji: "🍞" },
                { id: "C", text: "做糖果", emoji: "🍬" },
                { id: "D", text: "做果汁", emoji: "🧃" }
            ],
            answer: "A",
            explanation: "蜜蜂采集花蜜带回蜂巢，经过加工变成香甜的蜂蜜。一只蜜蜂一生只能生产约1/12茶匙的蜂蜜！",
            difficulty: 1
        },
        {
            id: "science_animal_007",
            theme: "animal",
            question: "哪种动物会冬眠？",
            hint: "它整个冬天都在睡觉",
            image: "🐻",
            options: [
                { id: "A", text: "熊", emoji: "🐻" },
                { id: "B", text: "兔子", emoji: "🐰" },
                { id: "C", text: "小鸟", emoji: "🐦" },
                { id: "D", text: "猴子", emoji: "🐵" }
            ],
            answer: "A",
            explanation: "熊在冬天会冬眠，它们在秋天吃很多食物储存脂肪，然后找一个温暖的洞穴睡上好几个月！",
            difficulty: 2
        },
        {
            id: "science_animal_008",
            theme: "animal",
            question: "企鹅生活在哪里？",
            hint: "那里非常非常冷",
            image: "🐧",
            options: [
                { id: "A", text: "沙漠", emoji: "🏜️" },
                { id: "B", text: "森林", emoji: "🌲" },
                { id: "C", text: "南极", emoji: "🧊" },
                { id: "D", text: "草原", emoji: "🌿" }
            ],
            answer: "C",
            explanation: "企鹅主要生活在南极，那里非常冷。它们不会飞，但是游泳特别厉害，身上的羽毛可以防水保暖。",
            difficulty: 2
        },
        {
            id: "science_animal_009",
            theme: "animal",
            question: "蝴蝶小时候是什么样子？",
            hint: "它会爬，吃树叶",
            image: "🦋",
            options: [
                { id: "A", text: "毛毛虫", emoji: "🐛" },
                { id: "B", text: "小蝴蝶", emoji: "🦋" },
                { id: "C", text: "蚂蚁", emoji: "🐜" },
                { id: "D", text: "蜗牛", emoji: "🐌" }
            ],
            answer: "A",
            explanation: "蝴蝶小时候是毛毛虫！毛毛虫吃很多树叶长大后，会变成蛹，最后破茧而出变成美丽的蝴蝶。",
            difficulty: 2
        },
        {
            id: "science_animal_010",
            theme: "animal",
            question: "大象用什么喝水？",
            hint: "它长长的，很灵活",
            image: "🐘",
            options: [
                { id: "A", text: "嘴巴", emoji: "👄" },
                { id: "B", text: "鼻子", emoji: "👃" },
                { id: "C", text: "耳朵", emoji: "👂" },
                { id: "D", text: "尾巴", emoji: "🦯" }
            ],
            answer: "B",
            explanation: "大象用长长的鼻子吸水，然后送到嘴里喝。大象的鼻子非常灵活，还可以用来抓东西、打招呼呢！",
            difficulty: 1
        }
    ],

    // ==================== 神奇植物 ====================
    plant: [
        {
            id: "science_plant_001",
            theme: "plant",
            question: "向日葵为什么叫向日葵？",
            hint: "它会跟着太阳转",
            image: "🌻",
            options: [
                { id: "A", text: "喜欢太阳", emoji: "☀️" },
                { id: "B", text: "喜欢月亮", emoji: "🌙" },
                { id: "C", text: "喜欢星星", emoji: "⭐" },
                { id: "D", text: "喜欢下雨", emoji: "🌧️" }
            ],
            answer: "A",
            explanation: "向日葵的花朵会跟着太阳转动，从早到晚追随阳光，所以叫向日葵。它的种子还可以炒着吃呢！",
            difficulty: 1
        },
        {
            id: "science_plant_002",
            theme: "plant",
            question: "植物通过什么吸收水分？",
            hint: "它藏在土里",
            image: "🌱",
            options: [
                { id: "A", text: "根", emoji: "🌱" },
                { id: "B", text: "叶子", emoji: "🍃" },
                { id: "C", text: "花", emoji: "🌸" },
                { id: "D", text: "果实", emoji: "🍎" }
            ],
            answer: "A",
            explanation: "植物的根藏在土壤里，负责吸收水分和养分。根就像植物的"嘴巴"，把营养送到全身。",
            difficulty: 1
        },
        {
            id: "science_plant_003",
            theme: "plant",
            question: "哪种植物是蔬菜？",
            hint: "它是橙色的，兔子爱吃",
            image: "🥕",
            options: [
                { id: "A", text: "玫瑰", emoji: "🌹" },
                { id: "B", text: "胡萝卜", emoji: "🥕" },
                { id: "C", text: "松树", emoji: "🌲" },
                { id: "D", text: "仙人掌", emoji: "🌵" }
            ],
            answer: "B",
            explanation: "胡萝卜是一种蔬菜，含有丰富的维生素A，对眼睛特别好。我们吃的是它的根部哦！",
            difficulty: 1
        },
        {
            id: "science_plant_004",
            theme: "plant",
            question: "仙人掌为什么能在沙漠生活？",
            hint: "它能存很多水",
            image: "🌵",
            options: [
                { id: "A", text: "不需要水", emoji: "🚫" },
                { id: "B", text: "体内储水", emoji: "💧" },
                { id: "C", text: "有很多叶子", emoji: "🍃" },
                { id: "D", text: "长得很高", emoji: "📏" }
            ],
            answer: "B",
            explanation: "仙人掌的茎又厚又多肉，可以储存大量水分。它的叶子变成了刺，减少水分蒸发，所以能在干旱的沙漠生存。",
            difficulty: 2
        },
        {
            id: "science_plant_005",
            theme: "plant",
            question: "树的年龄怎么看？",
            hint: "砍开树干可以看到圆圈",
            image: "🪵",
            options: [
                { id: "A", text: "数树叶", emoji: "🍃" },
                { id: "B", text: "数年轮", emoji: "🪵" },
                { id: "C", text: "量高度", emoji: "📏" },
                { id: "D", text: "看颜色", emoji: "🎨" }
            ],
            answer: "B",
            explanation: "树干里面有一圈一圈的纹路叫年轮，每一圈代表一年。数年轮的数量就能知道树的年龄啦！",
            difficulty: 2
        },
        {
            id: "science_plant_006",
            theme: "plant",
            question: "苹果树先开花还是先结果？",
            hint: "蜜蜂来采蜜的时候",
            image: "🍎",
            options: [
                { id: "A", text: "先开花", emoji: "🌸" },
                { id: "B", text: "先结果", emoji: "🍎" },
                { id: "C", text: "同时", emoji: "⏰" },
                { id: "D", text: "不一定", emoji: "❓" }
            ],
            answer: "A",
            explanation: "苹果树先开花，花谢了之后才会结出苹果。蜜蜂帮助花朵传粉，这样才能结出甜甜的苹果！",
            difficulty: 1
        },
        {
            id: "science_plant_007",
            theme: "plant",
            question: "含羞草被碰到会怎样？",
            hint: "它很害羞",
            image: "🌿",
            options: [
                { id: "A", text: "叶子合拢", emoji: "🙈" },
                { id: "B", text: "开花", emoji: "🌸" },
                { id: "C", text: "变色", emoji: "🎨" },
                { id: "D", text: "发出声音", emoji: "🔊" }
            ],
            answer: "A",
            explanation: "含羞草被触碰后，叶子会快速合拢低垂，就像害羞一样！过一会儿它又会慢慢张开。这是它保护自己的方式。",
            difficulty: 2
        },
        {
            id: "science_plant_008",
            theme: "plant",
            question: "荷花生长在哪里？",
            hint: "它的根在泥里",
            image: "🪷",
            options: [
                { id: "A", text: "水里", emoji: "💧" },
                { id: "B", text: "树上", emoji: "🌳" },
                { id: "C", text: "沙漠", emoji: "🏜️" },
                { id: "D", text: "山顶", emoji: "⛰️" }
            ],
            answer: "A",
            explanation: "荷花生长在池塘或湖泊的水中，根扎在泥土里。"出淤泥而不染"说的就是荷花虽然生在泥里，但花朵却很干净美丽。",
            difficulty: 1
        },
        {
            id: "science_plant_009",
            theme: "plant",
            question: "蒲公英的种子怎么传播？",
            hint: "它像小降落伞一样",
            image: "🌬️",
            options: [
                { id: "A", text: "风吹", emoji: "💨" },
                { id: "B", text: "水流", emoji: "🌊" },
                { id: "C", text: "动物吃", emoji: "🐿️" },
                { id: "D", text: "自己跳", emoji: "🦘" }
            ],
            answer: "A",
            explanation: "蒲公英的种子上有白色的绒毛，像小降落伞一样。风一吹，种子就飘到远方，落地生根长出新的蒲公英！",
            difficulty: 2
        },
        {
            id: "science_plant_010",
            theme: "plant",
            question: "植物的叶子是什么颜色？",
            hint: "因为它含有叶绿素",
            image: "🍀",
            options: [
                { id: "A", text: "绿色", emoji: "💚" },
                { id: "B", text: "红色", emoji: "❤️" },
                { id: "C", text: "蓝色", emoji: "💙" },
                { id: "D", text: "黄色", emoji: "💛" }
            ],
            answer: "A",
            explanation: "大多数植物的叶子是绿色的，因为含有叶绿素。叶绿素帮助植物进行光合作用，制造食物。秋天叶子变黄是因为叶绿素减少了。",
            difficulty: 1
        }
    ],

    // ==================== 自然现象 ====================
    nature: [
        {
            id: "science_nature_001",
            theme: "nature",
            question: "彩虹有几种颜色？",
            hint: "红橙黄绿...",
            image: "🌈",
            options: [
                { id: "A", text: "5种", emoji: "5️⃣" },
                { id: "B", text: "7种", emoji: "7️⃣" },
                { id: "C", text: "3种", emoji: "3️⃣" },
                { id: "D", text: "10种", emoji: "🔟" }
            ],
            answer: "B",
            explanation: "彩虹有7种颜色：红、橙、黄、绿、青、蓝、紫。彩虹是阳光照射到空气中的小水滴，被分解成不同颜色的光形成的。",
            difficulty: 1
        },
        {
            id: "science_nature_002",
            theme: "nature",
            question: "太阳从哪个方向升起？",
            hint: "早上起床看到太阳的方向",
            image: "🌅",
            options: [
                { id: "A", text: "东方", emoji: "➡️" },
                { id: "B", text: "西方", emoji: "⬅️" },
                { id: "C", text: "南方", emoji: "⬇️" },
                { id: "D", text: "北方", emoji: "⬆️" }
            ],
            answer: "A",
            explanation: "太阳每天从东方升起，从西方落下。这是因为地球在不停地自转，我们就看到太阳在天空中移动了。",
            difficulty: 1
        },
        {
            id: "science_nature_003",
            theme: "nature",
            question: "下雨前天上有什么？",
            hint: "它们黑黑的、厚厚的",
            image: "🌧️",
            options: [
                { id: "A", text: "乌云", emoji: "🌥️" },
                { id: "B", text: "星星", emoji: "⭐" },
                { id: "C", text: "彩虹", emoji: "🌈" },
                { id: "D", text: "太阳", emoji: "☀️" }
            ],
            answer: "A",
            explanation: "下雨前天空会有乌云。云是由小水滴组成的，当水滴越来越多、越来越重，就会落下来变成雨！",
            difficulty: 1
        },
        {
            id: "science_nature_004",
            theme: "nature",
            question: "一年有几个季节？",
            hint: "春天、夏天...",
            image: "🍂",
            options: [
                { id: "A", text: "2个", emoji: "2️⃣" },
                { id: "B", text: "4个", emoji: "4️⃣" },
                { id: "C", text: "6个", emoji: "6️⃣" },
                { id: "D", text: "12个", emoji: "🔢" }
            ],
            answer: "B",
            explanation: "一年有4个季节：春、夏、秋、冬。春天万物复苏，夏天炎热，秋天落叶，冬天寒冷。这是因为地球绕太阳公转造成的。",
            difficulty: 1
        },
        {
            id: "science_nature_005",
            theme: "nature",
            question: "雪是什么变成的？",
            hint: "它平时是液体",
            image: "❄️",
            options: [
                { id: "A", text: "水", emoji: "💧" },
                { id: "B", text: "沙子", emoji: "🏖️" },
                { id: "C", text: "糖", emoji: "🍬" },
                { id: "D", text: "盐", emoji: "🧂" }
            ],
            answer: "A",
            explanation: "雪是水变成的！当温度很低的时候，空气中的水蒸气会直接变成冰晶，落下来就是美丽的雪花。每片雪花的形状都不一样哦！",
            difficulty: 1
        },
        {
            id: "science_nature_006",
            theme: "nature",
            question: "为什么会打雷？",
            hint: "闪电之后听到的声音",
            image: "⛈️",
            options: [
                { id: "A", text: "云在碰撞", emoji: "☁️" },
                { id: "B", text: "太阳生气", emoji: "😠" },
                { id: "C", text: "风在吹", emoji: "💨" },
                { id: "D", text: "下雨太大", emoji: "🌧️" }
            ],
            answer: "A",
            explanation: "打雷是因为云层中的电荷碰撞产生闪电，闪电让周围的空气快速膨胀，发出巨大的声音就是雷声。闪电比雷声快，所以我们先看到闪电后听到雷声。",
            difficulty: 2
        },
        {
            id: "science_nature_007",
            theme: "nature",
            question: "月亮会发光吗？",
            hint: "想想月亮的光从哪来",
            image: "🌙",
            options: [
                { id: "A", text: "不会", emoji: "❌" },
                { id: "B", text: "会", emoji: "✅" },
                { id: "C", text: "有时会", emoji: "🤔" },
                { id: "D", text: "晚上会", emoji: "🌃" }
            ],
            answer: "A",
            explanation: "月亮自己不会发光！我们看到的月光其实是太阳光照到月亮上反射回来的。月亮就像一面大镜子，反射太阳的光芒。",
            difficulty: 2
        },
        {
            id: "science_nature_008",
            theme: "nature",
            question: "风是怎么形成的？",
            hint: "和温度有关",
            image: "💨",
            options: [
                { id: "A", text: "空气流动", emoji: "🌬️" },
                { id: "B", text: "树在摇", emoji: "🌳" },
                { id: "C", text: "云在飘", emoji: "☁️" },
                { id: "D", text: "地球转动", emoji: "🌍" }
            ],
            answer: "A",
            explanation: "风是空气的流动。当太阳把地面晒热，热空气上升，冷空气就会流过来补充，这样就形成了风。风可以帮助传播种子、带来凉爽。",
            difficulty: 2
        },
        {
            id: "science_nature_009",
            theme: "nature",
            question: "白天为什么是亮的？",
            hint: "天上有一个大火球",
            image: "☀️",
            options: [
                { id: "A", text: "太阳照射", emoji: "☀️" },
                { id: "B", text: "月亮照射", emoji: "🌙" },
                { id: "C", text: "星星照射", emoji: "⭐" },
                { id: "D", text: "灯光照射", emoji: "💡" }
            ],
            answer: "A",
            explanation: "白天亮是因为太阳在照射地球！太阳是一颗恒星，会发光发热。地球自转时，面对太阳的一面是白天，背对太阳的一面是黑夜。",
            difficulty: 1
        },
        {
            id: "science_nature_010",
            theme: "nature",
            question: "地震是怎么发生的？",
            hint: "地球内部在运动",
            image: "🌋",
            options: [
                { id: "A", text: "地壳运动", emoji: "🌍" },
                { id: "B", text: "下大雨", emoji: "🌧️" },
                { id: "C", text: "刮大风", emoji: "💨" },
                { id: "D", text: "打雷", emoji: "⚡" }
            ],
            answer: "A",
            explanation: "地震是地球内部的岩石层（地壳）运动造成的。地球像一个大鸡蛋，外壳会移动和碰撞。地震时要躲在桌子下面保护自己哦！",
            difficulty: 3
        }
    ]
};

// 主题配置
const scienceThemes = {
    animal: {
        id: "animal",
        name: "动物世界",
        icon: "🦁",
        description: "认识各种神奇的动物",
        color: "#FF9800",
        totalQuestions: 10
    },
    plant: {
        id: "plant",
        name: "神奇植物",
        icon: "🌻",
        description: "探索植物的奥秘",
        color: "#4CAF50",
        totalQuestions: 10
    },
    nature: {
        id: "nature",
        name: "自然现象",
        icon: "🌈",
        description: "了解大自然的秘密",
        color: "#2196F3",
        totalQuestions: 10
    }
};

// 获取指定主题的题目
function getScienceQuestions(theme) {
    return scienceQuestions[theme] || [];
}

// 获取随机题目（可指定数量）
function getRandomScienceQuestions(theme, count = 5) {
    const questions = [...scienceQuestions[theme]];
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// 获取指定难度的题目
function getQuestionsByDifficulty(theme, difficulty) {
    return scienceQuestions[theme].filter(q => q.difficulty === difficulty);
}

// 获取所有主题信息
function getScienceThemes() {
    return Object.values(scienceThemes);
}

// 获取单个主题信息
function getScienceTheme(themeId) {
    return scienceThemes[themeId];
}

// 统计题目信息
function getScienceStats() {
    return {
        totalQuestions: Object.values(scienceQuestions).flat().length,
        themes: Object.keys(scienceQuestions).map(theme => ({
            theme,
            count: scienceQuestions[theme].length,
            byDifficulty: {
                easy: scienceQuestions[theme].filter(q => q.difficulty === 1).length,
                medium: scienceQuestions[theme].filter(q => q.difficulty === 2).length,
                hard: scienceQuestions[theme].filter(q => q.difficulty === 3).length
            }
        }))
    };
}
