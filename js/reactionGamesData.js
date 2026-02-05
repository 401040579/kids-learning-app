/**
 * 反应训练游戏数据 - Reaction Games Data
 * 包含打地鼠、颜色闪电、抓星星、红绿灯的配置数据
 */

const ReactionGamesData = {
    // 打地鼠配置 - Whack-a-mole
    whackMole: {
        easy: {
            duration: 30,        // 游戏时长（秒）
            moleShowTime: 1500,  // 地鼠显示时间（毫秒）
            moleInterval: 1200,  // 地鼠出现间隔（毫秒）
            maxMoles: 1,         // 同时出现的最大地鼠数
            scorePerHit: 10
        },
        medium: {
            duration: 30,
            moleShowTime: 1000,
            moleInterval: 900,
            maxMoles: 2,
            scorePerHit: 15
        },
        hard: {
            duration: 30,
            moleShowTime: 700,
            moleInterval: 600,
            maxMoles: 3,
            scorePerHit: 20
        }
    },

    // 颜色闪电配置 - Color Flash
    colorFlash: {
        colors: [
            { name: 'red', emoji: '🔴', color: '#FF4444' },
            { name: 'blue', emoji: '🔵', color: '#4444FF' },
            { name: 'green', emoji: '🟢', color: '#44AA44' },
            { name: 'yellow', emoji: '🟡', color: '#FFCC00' }
        ],
        easy: {
            duration: 30,
            showTime: 2000,      // 颜色显示时间
            interval: 2500,      // 下一个颜色出现间隔
            scorePerCorrect: 10,
            penaltyPerWrong: -5
        },
        medium: {
            duration: 30,
            showTime: 1500,
            interval: 2000,
            scorePerCorrect: 15,
            penaltyPerWrong: -5
        },
        hard: {
            duration: 30,
            showTime: 1000,
            interval: 1500,
            scorePerCorrect: 20,
            penaltyPerWrong: -10
        }
    },

    // 抓星星配置 - Catch Stars
    catchStars: {
        items: ['⭐', '🌟', '✨', '💫'],
        easy: {
            duration: 30,
            itemShowTime: 2000,  // 星星显示时间
            spawnInterval: 1500, // 生成间隔
            maxItems: 2,         // 同时最多星星数
            scorePerCatch: 10
        },
        medium: {
            duration: 30,
            itemShowTime: 1500,
            spawnInterval: 1000,
            maxItems: 3,
            scorePerCatch: 15
        },
        hard: {
            duration: 30,
            itemShowTime: 1000,
            spawnInterval: 700,
            maxItems: 4,
            scorePerCatch: 20
        }
    },

    // 红绿灯配置 - Traffic Light
    trafficLight: {
        lights: [
            { type: 'go', emoji: '🟢', action: 'tap' },
            { type: 'stop', emoji: '🔴', action: 'wait' },
            { type: 'bonus', emoji: '🌟', action: 'tap' }  // 奖励星星
        ],
        easy: {
            duration: 30,
            lightShowTime: 2000,
            interval: 2500,
            greenRatio: 0.6,     // 绿灯出现概率
            bonusRatio: 0.1,     // 奖励出现概率
            scorePerCorrect: 10,
            scorePerBonus: 25,
            penaltyPerWrong: -10
        },
        medium: {
            duration: 30,
            lightShowTime: 1500,
            interval: 2000,
            greenRatio: 0.5,
            bonusRatio: 0.1,
            scorePerCorrect: 15,
            scorePerBonus: 30,
            penaltyPerWrong: -15
        },
        hard: {
            duration: 30,
            lightShowTime: 1000,
            interval: 1500,
            greenRatio: 0.4,
            bonusRatio: 0.15,
            scorePerCorrect: 20,
            scorePerBonus: 40,
            penaltyPerWrong: -20
        }
    },

    // 通用配置
    config: {
        // 难度系数
        difficultyMultiplier: {
            easy: 1,
            medium: 1.5,
            hard: 2
        },
        // 反应时间评级（毫秒）
        reactionRating: {
            excellent: 300,   // < 300ms 极速
            good: 500,        // < 500ms 很快
            normal: 800,      // < 800ms 正常
            slow: 1200        // > 1200ms 较慢
        },
        // 连击奖励
        comboBonus: {
            5: 50,    // 5连击 +50分
            10: 100,  // 10连击 +100分
            15: 200,  // 15连击 +200分
            20: 300   // 20连击 +300分
        }
    },

    // 地鼠表情
    moleEmojis: {
        normal: '🐹',
        hit: '😵',
        miss: '😜',
        golden: '👑'  // 金色地鼠，双倍分数
    },

    // 音效提示（对应 RewardSystem）
    sounds: {
        hit: 'correct',
        miss: 'wrong',
        bonus: 'win',
        countdown: 'click'
    }
};

// 确保数据可用
if (typeof window !== 'undefined') {
    window.ReactionGamesData = ReactionGamesData;
}
