/**
 * 弹弹机器人 - 关卡数据
 * Bouncy Robot - Level Data
 *
 * 坐标系: 画布宽400 x 高600 (逻辑坐标，实际会按比例缩放)
 * robot: 机器人出生位置
 * throwables: 可拖拽弹射物体
 * platforms: 静态平台
 * bouncePads: 弹跳垫
 * stars: 星星收集物
 * zones: 特殊区域
 * starThresholds: [3星, 2星, 1星] 分数门槛
 */

const RagdollRobotData = {
    // 章节定义
    chapters: [
        { id: 'playground', nameKey: 'ragdollRobot.ch.playground', icon: '🎪', color: '#FF6B6B', gravityModifier: 1.0, levels: [1, 2, 3, 4, 5, 6] },
        { id: 'candy', nameKey: 'ragdollRobot.ch.candy', icon: '🍬', color: '#FF9FF3', gravityModifier: 1.0, levels: [7, 8, 9, 10, 11, 12] },
        { id: 'space', nameKey: 'ragdollRobot.ch.space', icon: '🚀', color: '#54A0FF', gravityModifier: 0.6, levels: [13, 14, 15, 16, 17, 18] },
        { id: 'ocean', nameKey: 'ragdollRobot.ch.ocean', icon: '🌊', color: '#00D2D3', gravityModifier: 0.8, levels: [19, 20, 21, 22, 23, 24] },
        { id: 'rainbow', nameKey: 'ragdollRobot.ch.rainbow', icon: '🏰', color: '#F368E0', gravityModifier: 1.0, levels: [25, 26, 27, 28, 29, 30] }
    ],

    // 可投掷物体类型
    throwableTypes: {
        ball: { emoji: '⚽', radius: 18, mass: 1.0, bounce: 0.7 },
        block: { emoji: '📦', radius: 20, mass: 1.5, bounce: 0.3 },
        spring: { emoji: '🧲', radius: 16, mass: 0.7, bounce: 0.9 },
        star: { emoji: '💫', radius: 15, mass: 0.5, bounce: 0.8 },
        bomb: { emoji: '💣', radius: 22, mass: 2.0, bounce: 0.2, explosive: true }
    },

    // 机器人表情
    expressions: {
        idle: '😊',
        flying: '😆',
        bouncing: '🤩',
        spinning: '😵',
        hurt: '😣',
        happy: '🥳'
    },

    // 关卡数据
    levels: {
        // ========== 第1章: 游乐场 🎪 ==========
        1: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.dragAndLaunch',
            starThresholds: [800, 500, 200],
            throwCount: 3,
            robot: { x: 200, y: 400 },
            throwables: [
                { type: 'ball', x: 200, y: 100 }
            ],
            platforms: [
                { x: 200, y: 500, w: 200, h: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 200, y: 300 },
                { x: 150, y: 350 },
                { x: 250, y: 350 }
            ],
            zones: []
        },
        2: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.aimForStars',
            starThresholds: [1000, 600, 300],
            throwCount: 3,
            robot: { x: 100, y: 400 },
            throwables: [
                { type: 'ball', x: 100, y: 80 },
                { type: 'ball', x: 200, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 200, y: 250 },
                { x: 300, y: 300 },
                { x: 350, y: 350 },
                { x: 150, y: 300 }
            ],
            zones: []
        },
        3: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.useBounce',
            starThresholds: [1200, 700, 350],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'ball', x: 100, y: 80 },
                { type: 'spring', x: 300, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 300, h: 15 },
                { x: 100, y: 300, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 300, y: 495, w: 60, h: 10, power: 1.5 }
            ],
            stars: [
                { x: 100, y: 200 },
                { x: 300, y: 200 },
                { x: 200, y: 150 },
                { x: 200, y: 400 }
            ],
            zones: []
        },
        4: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.combo',
            starThresholds: [1500, 900, 400],
            throwCount: 3,
            robot: { x: 80, y: 400 },
            throwables: [
                { type: 'ball', x: 80, y: 80 },
                { type: 'block', x: 200, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 300, y: 350, w: 100, h: 15, angle: -15 }
            ],
            bouncePads: [
                { x: 150, y: 495, w: 60, h: 10, power: 1.3 }
            ],
            stars: [
                { x: 300, y: 200 },
                { x: 350, y: 250 },
                { x: 100, y: 250 },
                { x: 200, y: 300 },
                { x: 250, y: 180 }
            ],
            zones: []
        },
        5: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.multiHit',
            starThresholds: [1800, 1100, 500],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'ball', x: 100, y: 70 },
                { type: 'spring', x: 200, y: 70 },
                { type: 'ball', x: 300, y: 70 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 300, w: 80, h: 15 },
                { x: 300, y: 300, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 1.6 }
            ],
            stars: [
                { x: 100, y: 200 },
                { x: 200, y: 150 },
                { x: 300, y: 200 },
                { x: 150, y: 250 },
                { x: 250, y: 250 }
            ],
            zones: []
        },
        6: {
            chapter: 'playground',
            hintKey: 'ragdollRobot.hint.flipBonus',
            starThresholds: [2000, 1300, 600],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'block', x: 100, y: 60 },
                { type: 'spring', x: 300, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 350, w: 60, h: 15, angle: 20 },
                { x: 320, y: 350, w: 60, h: 15, angle: -20 }
            ],
            bouncePads: [
                { x: 120, y: 495, w: 60, h: 10, power: 1.8 },
                { x: 280, y: 495, w: 60, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 200, y: 120 },
                { x: 100, y: 180 },
                { x: 300, y: 180 },
                { x: 80, y: 250 },
                { x: 320, y: 250 },
                { x: 200, y: 220 }
            ],
            zones: []
        },

        // ========== 第2章: 糖果世界 🍬 ==========
        7: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.slopeSlide',
            starThresholds: [1200, 700, 350],
            throwCount: 3,
            robot: { x: 80, y: 350 },
            throwables: [
                { type: 'ball', x: 80, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 200, y: 380, w: 180, h: 15, angle: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 250, y: 280 },
                { x: 320, y: 330 },
                { x: 350, y: 400 }
            ],
            zones: []
        },
        8: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.candyBounce',
            starThresholds: [1500, 900, 400],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'spring', x: 200, y: 70 },
                { type: 'ball', x: 100, y: 70 }
            ],
            platforms: [
                { x: 200, y: 500, w: 300, h: 15 },
                { x: 120, y: 300, w: 100, h: 15 },
                { x: 280, y: 250, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 70, h: 10, power: 1.6 }
            ],
            stars: [
                { x: 120, y: 220 },
                { x: 280, y: 170 },
                { x: 200, y: 150 },
                { x: 350, y: 200 }
            ],
            zones: []
        },
        9: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.multiPlatform',
            starThresholds: [1800, 1100, 500],
            throwCount: 3,
            robot: { x: 320, y: 200 },
            throwables: [
                { type: 'block', x: 80, y: 60 },
                { type: 'ball', x: 320, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 320, y: 280, w: 100, h: 15 },
                { x: 150, y: 350, w: 120, h: 15 },
                { x: 80, y: 250, w: 80, h: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 80, y: 170 },
                { x: 150, y: 270 },
                { x: 250, y: 400 },
                { x: 320, y: 180 },
                { x: 200, y: 200 }
            ],
            zones: []
        },
        10: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.zigzag',
            starThresholds: [2000, 1200, 600],
            throwCount: 3,
            robot: { x: 200, y: 150 },
            throwables: [
                { type: 'ball', x: 200, y: 60 },
                { type: 'spring', x: 100, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 250, w: 120, h: 15, angle: 20 },
                { x: 300, y: 350, w: 120, h: 15, angle: -20 },
                { x: 100, y: 430, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 100, y: 425, w: 50, h: 10, power: 1.4 }
            ],
            stars: [
                { x: 150, y: 180 },
                { x: 300, y: 260 },
                { x: 100, y: 350 },
                { x: 300, y: 420 },
                { x: 200, y: 300 }
            ],
            zones: []
        },
        11: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.springPower',
            starThresholds: [2200, 1400, 700],
            throwCount: 3,
            robot: { x: 200, y: 420 },
            throwables: [
                { type: 'spring', x: 100, y: 60 },
                { type: 'spring', x: 300, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 200, y: 300, w: 150, h: 15 }
            ],
            bouncePads: [
                { x: 130, y: 495, w: 60, h: 10, power: 2.0 },
                { x: 270, y: 495, w: 60, h: 10, power: 2.0 },
                { x: 200, y: 295, w: 50, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 200, y: 100 },
                { x: 100, y: 150 },
                { x: 300, y: 150 },
                { x: 150, y: 200 },
                { x: 250, y: 200 },
                { x: 200, y: 250 }
            ],
            zones: []
        },
        12: {
            chapter: 'candy',
            hintKey: 'ragdollRobot.hint.candyMaster',
            starThresholds: [2500, 1600, 800],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'block', x: 80, y: 50 },
                { type: 'spring', x: 200, y: 50 },
                { type: 'ball', x: 320, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 300, w: 80, h: 15, angle: 25 },
                { x: 320, y: 300, w: 80, h: 15, angle: -25 },
                { x: 200, y: 220, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 1.5 },
                { x: 200, y: 215, w: 50, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 200, y: 80 },
                { x: 80, y: 200 },
                { x: 320, y: 200 },
                { x: 150, y: 150 },
                { x: 250, y: 150 },
                { x: 200, y: 300 }
            ],
            zones: []
        },

        // ========== 第3章: 太空站 🚀 ==========
        13: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.lowGravity',
            starThresholds: [1500, 900, 400],
            throwCount: 3,
            robot: { x: 200, y: 400 },
            throwables: [
                { type: 'ball', x: 200, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 300, h: 15 },
                { x: 100, y: 350, w: 80, h: 15 },
                { x: 300, y: 250, w: 80, h: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 100, y: 270 },
                { x: 300, y: 170 },
                { x: 200, y: 200 },
                { x: 200, y: 300 }
            ],
            zones: []
        },
        14: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.floatUp',
            starThresholds: [1800, 1100, 500],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'spring', x: 200, y: 60 },
                { type: 'ball', x: 100, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 150, y: 320, w: 100, h: 15 },
                { x: 250, y: 200, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 70, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 150, y: 240 },
                { x: 250, y: 120 },
                { x: 350, y: 300 },
                { x: 100, y: 180 },
                { x: 200, y: 150 }
            ],
            zones: []
        },
        15: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.spaceStation',
            starThresholds: [2000, 1300, 600],
            throwCount: 3,
            robot: { x: 80, y: 400 },
            throwables: [
                { type: 'ball', x: 80, y: 60 },
                { type: 'spring', x: 200, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 200, y: 350, w: 120, h: 15 },
                { x: 100, y: 250, w: 80, h: 15 },
                { x: 300, y: 180, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 345, w: 60, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 100, y: 170 },
                { x: 300, y: 100 },
                { x: 200, y: 250 },
                { x: 350, y: 150 },
                { x: 50, y: 200 }
            ],
            zones: []
        },
        16: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.asteroidField',
            starThresholds: [2200, 1400, 700],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'ball', x: 100, y: 50 },
                { type: 'block', x: 300, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 300, w: 60, h: 15, angle: 15 },
                { x: 320, y: 300, w: 60, h: 15, angle: -15 },
                { x: 200, y: 200, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 80, y: 295, w: 40, h: 10, power: 1.5 },
                { x: 320, y: 295, w: 40, h: 10, power: 1.5 }
            ],
            stars: [
                { x: 200, y: 100 },
                { x: 80, y: 200 },
                { x: 320, y: 200 },
                { x: 150, y: 150 },
                { x: 250, y: 150 },
                { x: 200, y: 250 }
            ],
            zones: []
        },
        17: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.orbitalBounce',
            starThresholds: [2500, 1600, 800],
            throwCount: 3,
            robot: { x: 200, y: 420 },
            throwables: [
                { type: 'spring', x: 200, y: 50 },
                { type: 'ball', x: 100, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 120, y: 370, w: 80, h: 15, angle: 30 },
                { x: 280, y: 280, w: 80, h: 15, angle: -30 },
                { x: 150, y: 180, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 2.2 },
                { x: 150, y: 175, w: 50, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 150, y: 100 },
                { x: 280, y: 180 },
                { x: 120, y: 280 },
                { x: 300, y: 380 },
                { x: 200, y: 200 },
                { x: 80, y: 150 }
            ],
            zones: []
        },
        18: {
            chapter: 'space',
            hintKey: 'ragdollRobot.hint.spaceMaster',
            starThresholds: [2800, 1800, 900],
            throwCount: 3,
            robot: { x: 200, y: 400 },
            throwables: [
                { type: 'spring', x: 80, y: 50 },
                { type: 'block', x: 200, y: 50 },
                { type: 'ball', x: 320, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 350, w: 100, h: 15, angle: 20 },
                { x: 300, y: 280, w: 100, h: 15, angle: -20 },
                { x: 200, y: 180, w: 80, h: 15 },
                { x: 100, y: 120, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 150, y: 495, w: 60, h: 10, power: 2.0 },
                { x: 200, y: 175, w: 50, h: 10, power: 2.2 }
            ],
            stars: [
                { x: 100, y: 60 },
                { x: 300, y: 180 },
                { x: 100, y: 250 },
                { x: 300, y: 380 },
                { x: 200, y: 120 },
                { x: 200, y: 300 },
                { x: 50, y: 180 }
            ],
            zones: []
        },

        // ========== 第4章: 海洋乐园 🌊 ==========
        19: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.waterSlide',
            starThresholds: [1500, 900, 400],
            throwCount: 3,
            robot: { x: 80, y: 350 },
            throwables: [
                { type: 'ball', x: 80, y: 80 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 200, y: 400, w: 200, h: 15, angle: 15 }
            ],
            bouncePads: [],
            stars: [
                { x: 250, y: 300 },
                { x: 320, y: 350 },
                { x: 350, y: 420 }
            ],
            zones: [
                { type: 'water', x: 0, y: 460, w: 400, h: 40, drag: 0.92 }
            ]
        },
        20: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.bubbleZone',
            starThresholds: [1800, 1100, 500],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'ball', x: 200, y: 70 },
                { type: 'spring', x: 100, y: 70 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 150, y: 300, w: 100, h: 15 },
                { x: 300, y: 220, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 70, h: 10, power: 1.5 }
            ],
            stars: [
                { x: 150, y: 220 },
                { x: 300, y: 140 },
                { x: 80, y: 300 },
                { x: 350, y: 280 }
            ],
            zones: [
                { type: 'bubble', x: 80, y: 200, w: 100, h: 150, drag: 0.85 }
            ]
        },
        21: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.coralReef',
            starThresholds: [2000, 1300, 600],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'ball', x: 100, y: 60 },
                { type: 'block', x: 300, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 350, w: 80, h: 15 },
                { x: 300, y: 280, w: 80, h: 15 },
                { x: 200, y: 200, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 100, y: 345, w: 50, h: 10, power: 1.6 }
            ],
            stars: [
                { x: 300, y: 200 },
                { x: 200, y: 120 },
                { x: 100, y: 250 },
                { x: 350, y: 350 },
                { x: 50, y: 300 }
            ],
            zones: [
                { type: 'water', x: 0, y: 460, w: 400, h: 40, drag: 0.90 }
            ]
        },
        22: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.deepDive',
            starThresholds: [2200, 1400, 700],
            throwCount: 3,
            robot: { x: 200, y: 200 },
            throwables: [
                { type: 'spring', x: 200, y: 60 },
                { type: 'ball', x: 100, y: 60 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 200, y: 280, w: 120, h: 15 },
                { x: 80, y: 380, w: 80, h: 15, angle: 20 },
                { x: 320, y: 380, w: 80, h: 15, angle: -20 }
            ],
            bouncePads: [
                { x: 200, y: 275, w: 60, h: 10, power: 1.8 },
                { x: 200, y: 495, w: 80, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 200, y: 100 },
                { x: 80, y: 280 },
                { x: 320, y: 280 },
                { x: 150, y: 350 },
                { x: 250, y: 350 },
                { x: 200, y: 420 }
            ],
            zones: [
                { type: 'water', x: 0, y: 440, w: 400, h: 60, drag: 0.88 }
            ]
        },
        23: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.whirlpool',
            starThresholds: [2500, 1600, 800],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'spring', x: 80, y: 50 },
                { type: 'ball', x: 200, y: 50 },
                { type: 'block', x: 320, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 350, w: 80, h: 15, angle: 25 },
                { x: 320, y: 300, w: 80, h: 15, angle: -25 },
                { x: 200, y: 230, w: 100, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 1.8 },
                { x: 200, y: 225, w: 50, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 200, y: 100 },
                { x: 80, y: 250 },
                { x: 320, y: 200 },
                { x: 100, y: 180 },
                { x: 300, y: 380 },
                { x: 200, y: 300 }
            ],
            zones: [
                { type: 'bubble', x: 150, y: 130, w: 100, h: 100, drag: 0.82 }
            ]
        },
        24: {
            chapter: 'ocean',
            hintKey: 'ragdollRobot.hint.oceanMaster',
            starThresholds: [2800, 1800, 900],
            throwCount: 3,
            robot: { x: 200, y: 400 },
            throwables: [
                { type: 'spring', x: 100, y: 50 },
                { type: 'block', x: 200, y: 50 },
                { type: 'spring', x: 300, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 350, w: 100, h: 15, angle: 20 },
                { x: 300, y: 280, w: 100, h: 15, angle: -20 },
                { x: 200, y: 200, w: 80, h: 15 },
                { x: 100, y: 150, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 2.0 },
                { x: 200, y: 195, w: 50, h: 10, power: 2.2 }
            ],
            stars: [
                { x: 100, y: 80 },
                { x: 300, y: 180 },
                { x: 80, y: 250 },
                { x: 320, y: 350 },
                { x: 200, y: 130 },
                { x: 200, y: 300 },
                { x: 350, y: 250 }
            ],
            zones: [
                { type: 'water', x: 0, y: 460, w: 400, h: 40, drag: 0.88 },
                { type: 'bubble', x: 50, y: 100, w: 80, h: 100, drag: 0.80 }
            ]
        },

        // ========== 第5章: 彩虹城堡 🏰 ==========
        25: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.castleGate',
            starThresholds: [2000, 1200, 600],
            throwCount: 3,
            robot: { x: 200, y: 380 },
            throwables: [
                { type: 'ball', x: 200, y: 70 },
                { type: 'spring', x: 100, y: 70 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 120, y: 300, w: 15, h: 150 },
                { x: 280, y: 300, w: 15, h: 150 },
                { x: 200, y: 230, w: 170, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 200, y: 150 },
                { x: 60, y: 300 },
                { x: 340, y: 300 },
                { x: 200, y: 280 },
                { x: 200, y: 350 }
            ],
            zones: []
        },
        26: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.towerClimb',
            starThresholds: [2300, 1500, 700],
            throwCount: 3,
            robot: { x: 200, y: 420 },
            throwables: [
                { type: 'spring', x: 200, y: 50 },
                { type: 'ball', x: 300, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 400, w: 80, h: 15 },
                { x: 300, y: 320, w: 80, h: 15 },
                { x: 100, y: 240, w: 80, h: 15 },
                { x: 300, y: 160, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 100, y: 395, w: 50, h: 10, power: 1.6 },
                { x: 300, y: 315, w: 50, h: 10, power: 1.6 },
                { x: 100, y: 235, w: 50, h: 10, power: 1.6 }
            ],
            stars: [
                { x: 300, y: 100 },
                { x: 100, y: 160 },
                { x: 300, y: 240 },
                { x: 100, y: 320 },
                { x: 200, y: 200 },
                { x: 200, y: 350 }
            ],
            zones: []
        },
        27: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.rainbowBridge',
            starThresholds: [2600, 1700, 850],
            throwCount: 3,
            robot: { x: 80, y: 380 },
            throwables: [
                { type: 'block', x: 80, y: 50 },
                { type: 'spring', x: 200, y: 50 },
                { type: 'ball', x: 320, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 120, y: 380, w: 100, h: 15, angle: -15 },
                { x: 200, y: 300, w: 100, h: 15 },
                { x: 280, y: 220, w: 100, h: 15, angle: 15 },
                { x: 200, y: 150, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 295, w: 60, h: 10, power: 1.8 },
                { x: 200, y: 145, w: 40, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 200, y: 80 },
                { x: 80, y: 280 },
                { x: 320, y: 150 },
                { x: 120, y: 200 },
                { x: 280, y: 320 },
                { x: 200, y: 230 }
            ],
            zones: []
        },
        28: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.throneRoom',
            starThresholds: [3000, 1900, 950],
            throwCount: 3,
            robot: { x: 200, y: 350 },
            throwables: [
                { type: 'spring', x: 100, y: 50 },
                { type: 'block', x: 200, y: 50 },
                { type: 'spring', x: 300, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 350, w: 60, h: 15, angle: 25 },
                { x: 320, y: 350, w: 60, h: 15, angle: -25 },
                { x: 200, y: 250, w: 120, h: 15 },
                { x: 80, y: 180, w: 60, h: 15 },
                { x: 320, y: 180, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 2.0 },
                { x: 200, y: 245, w: 60, h: 10, power: 2.0 },
                { x: 80, y: 175, w: 40, h: 10, power: 1.8 }
            ],
            stars: [
                { x: 200, y: 80 },
                { x: 80, y: 100 },
                { x: 320, y: 100 },
                { x: 150, y: 180 },
                { x: 250, y: 180 },
                { x: 200, y: 300 },
                { x: 200, y: 420 }
            ],
            zones: []
        },
        29: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.crystalMaze',
            starThresholds: [3200, 2000, 1000],
            throwCount: 3,
            robot: { x: 200, y: 420 },
            throwables: [
                { type: 'spring', x: 80, y: 50 },
                { type: 'ball', x: 200, y: 50 },
                { type: 'block', x: 320, y: 50 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 100, y: 400, w: 80, h: 15, angle: 20 },
                { x: 300, y: 320, w: 80, h: 15, angle: -20 },
                { x: 100, y: 240, w: 80, h: 15, angle: 20 },
                { x: 300, y: 160, w: 80, h: 15, angle: -20 },
                { x: 200, y: 100, w: 60, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 80, h: 10, power: 2.2 },
                { x: 100, y: 235, w: 50, h: 10, power: 1.8 },
                { x: 200, y: 95, w: 40, h: 10, power: 2.0 }
            ],
            stars: [
                { x: 200, y: 50 },
                { x: 100, y: 160 },
                { x: 300, y: 240 },
                { x: 100, y: 320 },
                { x: 300, y: 400 },
                { x: 200, y: 200 },
                { x: 200, y: 350 }
            ],
            zones: []
        },
        30: {
            chapter: 'rainbow',
            hintKey: 'ragdollRobot.hint.finalChallenge',
            starThresholds: [3500, 2200, 1100],
            throwCount: 3,
            robot: { x: 200, y: 400 },
            throwables: [
                { type: 'spring', x: 80, y: 40 },
                { type: 'block', x: 200, y: 40 },
                { type: 'spring', x: 320, y: 40 }
            ],
            platforms: [
                { x: 200, y: 500, w: 350, h: 15 },
                { x: 80, y: 380, w: 80, h: 15, angle: 25 },
                { x: 320, y: 380, w: 80, h: 15, angle: -25 },
                { x: 200, y: 300, w: 100, h: 15 },
                { x: 80, y: 220, w: 80, h: 15, angle: 25 },
                { x: 320, y: 220, w: 80, h: 15, angle: -25 },
                { x: 200, y: 140, w: 80, h: 15 }
            ],
            bouncePads: [
                { x: 200, y: 495, w: 100, h: 10, power: 2.2 },
                { x: 200, y: 295, w: 60, h: 10, power: 2.0 },
                { x: 200, y: 135, w: 50, h: 10, power: 2.5 }
            ],
            stars: [
                { x: 200, y: 60 },
                { x: 80, y: 120 },
                { x: 320, y: 120 },
                { x: 80, y: 280 },
                { x: 320, y: 280 },
                { x: 150, y: 200 },
                { x: 250, y: 200 },
                { x: 200, y: 350 }
            ],
            zones: []
        }
    },

    /**
     * 获取关卡数据
     */
    getLevel(id) {
        return this.levels[id] || null;
    },

    /**
     * 获取章节的所有关卡
     */
    getChapterLevels(chapterId) {
        const chapter = this.chapters.find(c => c.id === chapterId);
        if (!chapter) return [];
        return chapter.levels.map(id => ({ id, ...this.levels[id] }));
    },

    /**
     * 获取总关卡数
     */
    getTotalLevels() {
        return Object.keys(this.levels).length;
    },

    /**
     * 获取章节的重力修正
     */
    getChapterGravity(chapterId) {
        const chapter = this.chapters.find(c => c.id === chapterId);
        return chapter ? chapter.gravityModifier : 1.0;
    }
};

// 全局可用
if (typeof window !== 'undefined') {
    window.RagdollRobotData = RagdollRobotData;
}
