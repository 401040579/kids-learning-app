/**
 * 画线砸怪兽 - 关卡数据
 * Draw to Smash - Level Data
 *
 * 坐标系: 画布宽400 x 高600 (逻辑坐标，实际会按比例缩放)
 * 目标(targets): 需要被砸中的怪物
 * 障碍(obstacles): 静态平台和墙壁
 * 绘画区(drawArea): 玩家可以画画的区域
 * 提示(hint): 教学提示文本
 */

const DrawSmashData = {
    // 章节定义
    chapters: [
        { id: 'tutorial', nameKey: 'drawSmash.ch.tutorial', icon: '📖', color: '#4CAF50', levels: [1, 2, 3, 4, 5] },
        { id: 'platforms', nameKey: 'drawSmash.ch.platforms', icon: '🏗️', color: '#2196F3', levels: [6, 7, 8, 9, 10] },
        { id: 'bounce', nameKey: 'drawSmash.ch.bounce', icon: '🏀', color: '#FF9800', levels: [11, 12, 13, 14, 15] },
        { id: 'precision', nameKey: 'drawSmash.ch.precision', icon: '🎯', color: '#E91E63', levels: [16, 17, 18, 19, 20] },
        { id: 'chain', nameKey: 'drawSmash.ch.chain', icon: '💥', color: '#9C27B0', levels: [21, 22, 23, 24, 25] },
        { id: 'expert', nameKey: 'drawSmash.ch.expert', icon: '🌟', color: '#FF5722', levels: [26, 27, 28, 29, 30] }
    ],

    // 怪物表情
    monsters: ['👾', '👻', '🤖', '👹', '💀', '🐙', '🦠', '👽', '🎃', '😈'],

    // 关卡数据
    levels: {
        // ========== 第1章: 教学 ==========
        1: {
            chapter: 'tutorial',
            hintKey: 'drawSmash.hint.drawAndDrop',
            stars: [5, 3, 1],  // 3星/2星/1星 所需剩余墨水百分比
            ink: 100,
            drawArea: { x: 50, y: 30, w: 300, h: 150 },
            targets: [
                { x: 200, y: 480, emoji: '👾', size: 40 }
            ],
            obstacles: [],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        2: {
            chapter: 'tutorial',
            hintKey: 'drawSmash.hint.hitAll',
            stars: [5, 3, 1],
            ink: 100,
            drawArea: { x: 50, y: 30, w: 300, h: 150 },
            targets: [
                { x: 130, y: 480, emoji: '👻', size: 35 },
                { x: 270, y: 480, emoji: '👾', size: 35 }
            ],
            obstacles: [],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        3: {
            chapter: 'tutorial',
            hintKey: 'drawSmash.hint.useShape',
            stars: [10, 5, 1],
            ink: 100,
            drawArea: { x: 50, y: 30, w: 300, h: 150 },
            targets: [
                { x: 100, y: 480, emoji: '🤖', size: 35 },
                { x: 200, y: 480, emoji: '👹', size: 35 },
                { x: 300, y: 480, emoji: '👾', size: 35 }
            ],
            obstacles: [],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        4: {
            chapter: 'tutorial',
            hintKey: 'drawSmash.hint.avoidPlatform',
            stars: [15, 8, 1],
            ink: 100,
            drawArea: { x: 50, y: 30, w: 300, h: 150 },
            targets: [
                { x: 200, y: 480, emoji: '👻', size: 40 }
            ],
            obstacles: [
                { x: 120, y: 350, w: 160, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        5: {
            chapter: 'tutorial',
            hintKey: 'drawSmash.hint.sideHit',
            stars: [15, 8, 1],
            ink: 100,
            drawArea: { x: 50, y: 30, w: 300, h: 200 },
            targets: [
                { x: 320, y: 480, emoji: '👾', size: 35 },
                { x: 80, y: 480, emoji: '🤖', size: 35 }
            ],
            obstacles: [
                { x: 140, y: 300, w: 120, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },

        // ========== 第2章: 平台关卡 ==========
        6: {
            chapter: 'platforms',
            hintKey: 'drawSmash.hint.usePlatform',
            stars: [20, 10, 1],
            ink: 80,
            drawArea: { x: 50, y: 30, w: 300, h: 150 },
            targets: [
                { x: 320, y: 480, emoji: '👹', size: 35 }
            ],
            obstacles: [
                { x: 100, y: 300, w: 120, h: 15, color: '#8B4513', angle: 15 },
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        7: {
            chapter: 'platforms',
            hintKey: 'drawSmash.hint.slideDown',
            stars: [20, 10, 1],
            ink: 80,
            drawArea: { x: 30, y: 30, w: 150, h: 150 },
            targets: [
                { x: 340, y: 480, emoji: '👻', size: 35 }
            ],
            obstacles: [
                { x: 80, y: 250, w: 150, h: 15, color: '#8B4513', angle: 20 },
                { x: 280, y: 370, w: 120, h: 15, color: '#8B4513', angle: -15 },
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        8: {
            chapter: 'platforms',
            hintKey: 'drawSmash.hint.multiPlatform',
            stars: [20, 10, 1],
            ink: 80,
            drawArea: { x: 50, y: 20, w: 300, h: 120 },
            targets: [
                { x: 80, y: 480, emoji: '🐙', size: 35 },
                { x: 320, y: 480, emoji: '👾', size: 35 }
            ],
            obstacles: [
                { x: 200, y: 280, w: 80, h: 15, color: '#8B4513' },
                { x: 200, y: 400, w: 200, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        9: {
            chapter: 'platforms',
            hintKey: 'drawSmash.hint.gap',
            stars: [25, 12, 1],
            ink: 70,
            drawArea: { x: 50, y: 20, w: 300, h: 130 },
            targets: [
                { x: 200, y: 480, emoji: '🦠', size: 35 }
            ],
            obstacles: [
                { x: 100, y: 300, w: 100, h: 15, color: '#8B4513' },
                { x: 300, y: 300, w: 100, h: 15, color: '#8B4513' },
                // 中间有缝隙，需要精准画
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        10: {
            chapter: 'platforms',
            hintKey: 'drawSmash.hint.zigzag',
            stars: [25, 12, 1],
            ink: 70,
            drawArea: { x: 130, y: 20, w: 140, h: 120 },
            targets: [
                { x: 80, y: 490, emoji: '👽', size: 30 },
                { x: 320, y: 490, emoji: '😈', size: 30 }
            ],
            obstacles: [
                { x: 200, y: 260, w: 200, h: 15, color: '#8B4513' },
                { x: 200, y: 380, w: 100, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },

        // ========== 第3章: 弹跳关卡 ==========
        11: {
            chapter: 'bounce',
            hintKey: 'drawSmash.hint.bounce',
            stars: [20, 10, 1],
            ink: 80,
            drawArea: { x: 50, y: 20, w: 300, h: 130 },
            targets: [
                { x: 320, y: 250, emoji: '👾', size: 35 }
            ],
            obstacles: [
                { x: 200, y: 400, w: 200, h: 15, color: '#8B4513' },
                { x: 350, y: 320, w: 15, h: 100, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 200, y: 395, w: 60, h: 10, power: 1.2 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        12: {
            chapter: 'bounce',
            hintKey: 'drawSmash.hint.doubleBounce',
            stars: [25, 12, 1],
            ink: 75,
            drawArea: { x: 20, y: 20, w: 160, h: 130 },
            targets: [
                { x: 340, y: 160, emoji: '🎃', size: 35 }
            ],
            obstacles: [
                { x: 200, y: 480, w: 250, h: 15, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 120, y: 475, w: 60, h: 10, power: 1.5 },
                { x: 300, y: 350, w: 60, h: 10, power: 1.3 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        13: {
            chapter: 'bounce',
            hintKey: 'drawSmash.hint.wallBounce',
            stars: [25, 12, 1],
            ink: 70,
            drawArea: { x: 50, y: 20, w: 300, h: 120 },
            targets: [
                { x: 60, y: 400, emoji: '👹', size: 35 }
            ],
            obstacles: [
                { x: 350, y: 350, w: 15, h: 200, color: '#8B4513' },
                { x: 100, y: 350, w: 15, h: 60, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 320, y: 470, w: 50, h: 10, power: 1.4 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        14: {
            chapter: 'bounce',
            hintKey: 'drawSmash.hint.precisionBounce',
            stars: [30, 15, 1],
            ink: 65,
            drawArea: { x: 50, y: 20, w: 140, h: 130 },
            targets: [
                { x: 330, y: 200, emoji: '🐙', size: 30 },
                { x: 80, y: 350, emoji: '👻', size: 30 }
            ],
            obstacles: [
                { x: 200, y: 320, w: 120, h: 15, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 200, y: 470, w: 80, h: 10, power: 1.5 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        15: {
            chapter: 'bounce',
            hintKey: 'drawSmash.hint.superBounce',
            stars: [30, 15, 1],
            ink: 60,
            drawArea: { x: 100, y: 20, w: 200, h: 100 },
            targets: [
                { x: 200, y: 100, emoji: '😈', size: 35 }
            ],
            obstacles: [
                { x: 200, y: 250, w: 300, h: 15, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 100, y: 470, w: 60, h: 10, power: 1.8 },
                { x: 300, y: 470, w: 60, h: 10, power: 1.8 },
                { x: 200, y: 245, w: 60, h: 10, power: 2.0 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },

        // ========== 第4章: 精准关卡 ==========
        16: {
            chapter: 'precision',
            hintKey: 'drawSmash.hint.tightSpace',
            stars: [25, 12, 1],
            ink: 60,
            drawArea: { x: 100, y: 20, w: 200, h: 100 },
            targets: [
                { x: 200, y: 450, emoji: '👾', size: 25 }
            ],
            obstacles: [
                { x: 130, y: 300, w: 15, h: 200, color: '#8B4513' },
                { x: 270, y: 300, w: 15, h: 200, color: '#8B4513' },
                { x: 200, y: 350, w: 120, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        17: {
            chapter: 'precision',
            hintKey: 'drawSmash.hint.narrowGap',
            stars: [30, 15, 1],
            ink: 55,
            drawArea: { x: 50, y: 20, w: 300, h: 100 },
            targets: [
                { x: 200, y: 490, emoji: '🤖', size: 25 }
            ],
            obstacles: [
                { x: 140, y: 250, w: 15, h: 300, color: '#8B4513' },
                { x: 260, y: 250, w: 15, h: 300, color: '#8B4513' },
                { x: 100, y: 250, w: 100, h: 15, color: '#8B4513' },
                { x: 300, y: 250, w: 100, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        18: {
            chapter: 'precision',
            hintKey: 'drawSmash.hint.maze',
            stars: [30, 15, 1],
            ink: 50,
            drawArea: { x: 30, y: 20, w: 130, h: 100 },
            targets: [
                { x: 330, y: 490, emoji: '👻', size: 30 }
            ],
            obstacles: [
                { x: 200, y: 200, w: 250, h: 15, color: '#8B4513' },
                { x: 280, y: 330, w: 200, h: 15, color: '#8B4513' },
                { x: 150, y: 430, w: 200, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        19: {
            chapter: 'precision',
            hintKey: 'drawSmash.hint.hiddenTarget',
            stars: [35, 18, 1],
            ink: 50,
            drawArea: { x: 50, y: 20, w: 300, h: 100 },
            targets: [
                { x: 80, y: 420, emoji: '🦠', size: 25 },
                { x: 320, y: 420, emoji: '👽', size: 25 }
            ],
            obstacles: [
                { x: 80, y: 340, w: 80, h: 15, color: '#8B4513' },
                { x: 320, y: 340, w: 80, h: 15, color: '#8B4513' },
                { x: 200, y: 280, w: 160, h: 15, color: '#8B4513' },
                { x: 50, y: 340, w: 15, h: 100, color: '#8B4513' },
                { x: 110, y: 340, w: 15, h: 100, color: '#8B4513' },
                { x: 290, y: 340, w: 15, h: 100, color: '#8B4513' },
                { x: 350, y: 340, w: 15, h: 100, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        20: {
            chapter: 'precision',
            hintKey: 'drawSmash.hint.smallTarget',
            stars: [35, 18, 1],
            ink: 45,
            drawArea: { x: 50, y: 20, w: 300, h: 100 },
            targets: [
                { x: 200, y: 490, emoji: '🎃', size: 20 }
            ],
            obstacles: [
                { x: 120, y: 250, w: 15, h: 300, color: '#8B4513' },
                { x: 280, y: 250, w: 15, h: 300, color: '#8B4513' },
                { x: 200, y: 350, w: 140, h: 15, color: '#8B4513' },
                { x: 160, y: 420, w: 40, h: 15, color: '#8B4513' },
                { x: 240, y: 420, w: 40, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },

        // ========== 第5章: 连锁反应 ==========
        21: {
            chapter: 'chain',
            hintKey: 'drawSmash.hint.chain',
            stars: [25, 12, 1],
            ink: 60,
            drawArea: { x: 50, y: 20, w: 300, h: 120 },
            targets: [
                { x: 100, y: 490, emoji: '👾', size: 30 },
                { x: 200, y: 490, emoji: '🤖', size: 30 },
                { x: 300, y: 490, emoji: '👹', size: 30 }
            ],
            obstacles: [],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        22: {
            chapter: 'chain',
            hintKey: 'drawSmash.hint.splitHit',
            stars: [30, 15, 1],
            ink: 55,
            drawArea: { x: 130, y: 20, w: 140, h: 120 },
            targets: [
                { x: 70, y: 490, emoji: '👻', size: 30 },
                { x: 330, y: 490, emoji: '🐙', size: 30 }
            ],
            obstacles: [
                { x: 200, y: 300, w: 30, h: 15, color: '#8B4513', angle: 0 }
            ],
            bouncePads: [
                { x: 200, y: 420, w: 50, h: 10, power: 1.0 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        23: {
            chapter: 'chain',
            hintKey: 'drawSmash.hint.multiLevel',
            stars: [30, 15, 1],
            ink: 50,
            drawArea: { x: 50, y: 20, w: 300, h: 100 },
            targets: [
                { x: 100, y: 280, emoji: '👽', size: 28 },
                { x: 300, y: 380, emoji: '😈', size: 28 },
                { x: 200, y: 490, emoji: '🦠', size: 28 }
            ],
            obstacles: [
                { x: 150, y: 330, w: 120, h: 15, color: '#8B4513' },
                { x: 250, y: 430, w: 120, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        24: {
            chapter: 'chain',
            hintKey: 'drawSmash.hint.cornerHit',
            stars: [35, 18, 1],
            ink: 50,
            drawArea: { x: 150, y: 20, w: 100, h: 120 },
            targets: [
                { x: 60, y: 200, emoji: '🎃', size: 28 },
                { x: 340, y: 200, emoji: '👾', size: 28 },
                { x: 60, y: 490, emoji: '👹', size: 28 },
                { x: 340, y: 490, emoji: '🤖', size: 28 }
            ],
            obstacles: [
                { x: 200, y: 300, w: 200, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        25: {
            chapter: 'chain',
            hintKey: 'drawSmash.hint.oneDrawAll',
            stars: [40, 20, 1],
            ink: 45,
            drawArea: { x: 100, y: 20, w: 200, h: 100 },
            targets: [
                { x: 80, y: 250, emoji: '👻', size: 25 },
                { x: 320, y: 250, emoji: '🐙', size: 25 },
                { x: 80, y: 400, emoji: '👽', size: 25 },
                { x: 320, y: 400, emoji: '😈', size: 25 },
                { x: 200, y: 490, emoji: '💀', size: 25 }
            ],
            obstacles: [
                { x: 200, y: 200, w: 80, h: 15, color: '#8B4513' },
                { x: 200, y: 340, w: 160, h: 15, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 200, y: 335, w: 60, h: 10, power: 1.3 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },

        // ========== 第6章: 专家关卡 ==========
        26: {
            chapter: 'expert',
            hintKey: 'drawSmash.hint.expert1',
            stars: [35, 18, 1],
            ink: 40,
            drawArea: { x: 50, y: 20, w: 130, h: 100 },
            targets: [
                { x: 330, y: 490, emoji: '😈', size: 30 }
            ],
            obstacles: [
                { x: 200, y: 200, w: 300, h: 15, color: '#8B4513' },
                { x: 350, y: 350, w: 15, h: 150, color: '#8B4513' },
                { x: 250, y: 400, w: 200, h: 15, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 80, y: 395, w: 50, h: 10, power: 1.5 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        27: {
            chapter: 'expert',
            hintKey: 'drawSmash.hint.expert2',
            stars: [40, 20, 1],
            ink: 40,
            drawArea: { x: 130, y: 20, w: 140, h: 90 },
            targets: [
                { x: 80, y: 490, emoji: '🐙', size: 25 },
                { x: 320, y: 490, emoji: '👹', size: 25 },
                { x: 200, y: 300, emoji: '👾', size: 25 }
            ],
            obstacles: [
                { x: 200, y: 250, w: 120, h: 15, color: '#8B4513' },
                { x: 80, y: 400, w: 80, h: 15, color: '#8B4513' },
                { x: 320, y: 400, w: 80, h: 15, color: '#8B4513' },
                { x: 50, y: 400, w: 15, h: 120, color: '#8B4513' },
                { x: 350, y: 400, w: 15, h: 120, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        28: {
            chapter: 'expert',
            hintKey: 'drawSmash.hint.expert3',
            stars: [45, 22, 1],
            ink: 35,
            drawArea: { x: 50, y: 20, w: 300, h: 80 },
            targets: [
                { x: 200, y: 490, emoji: '🦠', size: 25 },
                { x: 100, y: 350, emoji: '👻', size: 25 },
                { x: 300, y: 350, emoji: '🎃', size: 25 }
            ],
            obstacles: [
                { x: 200, y: 200, w: 350, h: 15, color: '#8B4513' },
                { x: 200, y: 300, w: 100, h: 15, color: '#8B4513' },
                { x: 60, y: 300, w: 15, h: 80, color: '#8B4513' },
                { x: 340, y: 300, w: 15, h: 80, color: '#8B4513' },
                { x: 150, y: 420, w: 100, h: 15, color: '#8B4513' },
                { x: 250, y: 420, w: 100, h: 15, color: '#8B4513' }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        29: {
            chapter: 'expert',
            hintKey: 'drawSmash.hint.expert4',
            stars: [45, 22, 1],
            ink: 35,
            drawArea: { x: 150, y: 20, w: 100, h: 80 },
            targets: [
                { x: 60, y: 180, emoji: '👽', size: 22 },
                { x: 340, y: 180, emoji: '😈', size: 22 },
                { x: 60, y: 380, emoji: '💀', size: 22 },
                { x: 340, y: 380, emoji: '🤖', size: 22 },
                { x: 200, y: 490, emoji: '👾', size: 22 }
            ],
            obstacles: [
                { x: 200, y: 250, w: 250, h: 15, color: '#8B4513' },
                { x: 200, y: 430, w: 250, h: 15, color: '#8B4513' },
                { x: 130, y: 340, w: 15, h: 100, color: '#8B4513' },
                { x: 270, y: 340, w: 15, h: 100, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 200, y: 245, w: 50, h: 10, power: 1.5 },
                { x: 200, y: 425, w: 50, h: 10, power: 1.5 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
        },
        30: {
            chapter: 'expert',
            hintKey: 'drawSmash.hint.finalBoss',
            stars: [50, 25, 1],
            ink: 30,
            drawArea: { x: 130, y: 15, w: 140, h: 75 },
            targets: [
                { x: 200, y: 160, emoji: '😈', size: 35 },
                { x: 80, y: 300, emoji: '👹', size: 28 },
                { x: 320, y: 300, emoji: '👹', size: 28 },
                { x: 80, y: 490, emoji: '💀', size: 25 },
                { x: 200, y: 490, emoji: '👾', size: 25 },
                { x: 320, y: 490, emoji: '💀', size: 25 }
            ],
            obstacles: [
                { x: 200, y: 220, w: 300, h: 15, color: '#8B4513' },
                { x: 200, y: 370, w: 300, h: 15, color: '#8B4513' },
                { x: 50, y: 300, w: 15, h: 80, color: '#8B4513' },
                { x: 350, y: 300, w: 15, h: 80, color: '#8B4513' },
                { x: 160, y: 300, w: 15, h: 80, color: '#8B4513' },
                { x: 240, y: 300, w: 15, h: 80, color: '#8B4513' }
            ],
            bouncePads: [
                { x: 200, y: 215, w: 50, h: 10, power: 2.0 },
                { x: 200, y: 365, w: 50, h: 10, power: 1.5 }
            ],
            decorations: [
                { x: 200, y: 560, type: 'ground' }
            ]
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
    }
};

// 全局可用
if (typeof window !== 'undefined') {
    window.DrawSmashData = DrawSmashData;
}
