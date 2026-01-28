# CLAUDE.md

## 项目简介

「宝贝学习乐园」是一款专为 5-7 岁儿童设计的 PWA 学习应用，通过游戏化方式进行基础知识学习。

## 技术栈

| 技术 | 用途 |
|------|------|
| HTML/CSS/JS | 原生前端开发（无框架） |
| PWA | Service Worker 离线缓存 |
| Puter.js | AI 语音合成（TTS） |
| Web Speech API | 语音识别（STT） |
| WebLLM + Qwen2.5 | 本地 AI 聊天 |
| Canvas API | 画画创作、图片处理 |
| HanziWriter | 汉字笔顺动画与练习 |
| Bark API | iOS 家长推送通知 |
| Google Analytics | 用户行为追踪 |
| localStorage | 数据持久化 |

## 目录结构

```
kids-learning-app/
├── index.html          # 单页应用主文件
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker (当前 v38)
├── css/style.css       # 所有样式
├── js/
│   ├── app.js          # 主应用逻辑、数学/英语/中文、最近使用
│   ├── i18n.js         # 国际化核心模块
│   ├── locales/        # 多语言翻译文件
│   │   ├── en.js       # English
│   │   ├── zh.js       # 中文
│   │   ├── ja.js       # 日本語
│   │   ├── ko.js       # 한국어
│   │   ├── es.js       # Español
│   │   ├── de.js       # Deutsch
│   │   └── fr.js       # Français
│   ├── analytics.js    # Google Analytics 事件追踪
│   ├── drawing.js      # 画画创作（魔法画笔/贴纸/对称）
│   ├── writing.js      # 汉字书写练习（HanziWriter）
│   ├── aiChat.js       # AI 聊天 + 语音对话
│   ├── pictureBook.js  # 绘本阅读 + AI 朗读
│   ├── parentNotify.js # 家长通知（Bark）
│   ├── achievements.js # 成就系统
│   ├── rewards.js      # 奖励系统
│   ├── memoryGame.js   # 记忆训练
│   ├── puzzle.js       # 拼图游戏
│   ├── puzzleData.js   # 拼图数据
│   ├── pronunciation.js # 跟读练习
│   ├── learningPet.js  # 学习宠物
│   ├── learningReport.js # 学习报告
│   ├── dailyCheckin.js # 每日签到
│   ├── wrongQuestions.js # 错题本
│   ├── videos.js       # 视频数据
│   ├── scienceData.js  # 科学题库
│   ├── lifeSkills.js   # 生活技能（时钟/钱币/日历）
│   ├── lifeSkillsData.js # 生活技能数据
│   ├── music.js        # 睡眠音乐
│   ├── songPractice.js # 歌曲练习
│   └── songData.js     # 歌曲数据
├── music/              # 背景音乐
└── icons/              # 应用图标
```

## 开发规范

### 命名约定
- CSS 类名: `kebab-case` (如 `drawing-tool-btn`)
- JS 函数: `camelCase` (如 `setDrawingTool`)
- 文件名: `camelCase.js`
- i18n 键名: `module.key` (如 `menu.math`, `btn.back`)

### 主题色
- 主色: `#FF69B4` (粉色)
- 强调色: `#FFD93D` (黄色)
- 定义在 CSS `:root` 变量中

### 代码风格
- 使用中文注释说明复杂逻辑
- 模块化拆分，每个功能一个 JS 文件
- 数据存储使用 localStorage
- UI 文本使用 `data-i18n` 属性支持多语言

## 核心功能模块

| 模块 | 文件 | 状态 |
|------|------|------|
| 探索视频 | videos.js | ✅ 完成 |
| 数学游戏 | app.js | ✅ 完成（加减乘除/10/20/30） |
| 英语学习 | app.js | ✅ 完成 |
| 中文学习 | app.js | ✅ 完成 |
| AI 聊天 | aiChat.js | ✅ 完成（语音对话） |
| 绘本阅读 | pictureBook.js | ✅ 完成（AI 朗读） |
| 画画创作 | drawing.js | ✅ 完成（魔法画笔/贴纸/对称） |
| 书写练习 | writing.js | ✅ 完成（汉字笔顺/自由练习） |
| 家长通知 | parentNotify.js | ✅ 完成（爸爸/妈妈双端） |
| 成就系统 | achievements.js | ✅ 完成 |
| 记忆训练 | memoryGame.js | ✅ 完成 |
| 拼图游戏 | puzzle.js | ✅ 完成 |
| 学习宠物 | learningPet.js | ✅ 完成 |
| 学习报告 | learningReport.js | ✅ 完成 |
| 跟读练习 | pronunciation.js | ✅ 完成 |
| 每日签到 | dailyCheckin.js | ✅ 完成 |
| 错题本 | wrongQuestions.js | ✅ 完成 |
| 生活技能 | lifeSkills.js | ✅ 完成（时钟/钱币/日历） |
| 歌曲练习 | songPractice.js | ✅ 完成（新年歌RAP） |
| 睡眠音乐 | music.js | ✅ 完成 |
| 多语言支持 | i18n.js + locales/ | ✅ 完成（7种语言） |
| 最近使用 | app.js | ✅ 完成 |
| 数据分析 | analytics.js | ✅ 完成（Google Analytics） |

## 常用命令

```bash
# 本地运行
npx serve .
# 或
python3 -m http.server 8000

# 部署（GitHub Pages 自动部署）
git push origin main

# 更新缓存版本（修改 sw.js）
const CACHE_NAME = 'kids-learning-vXX';
```

## 数据存储 (localStorage)

| 键名 | 说明 |
|------|------|
| learningProgress | 学习进度 |
| achievements | 成就数据 |
| dailyCheckin | 签到记录 |
| wrongQuestions | 错题记录 |
| petData | 宠物状态 |
| artworkGallery | 画作作品集 |
| parentNotifyConfig | 家长通知配置 |
| mathConfig | 数学游戏设置 |
| lifeSkillsStats | 生活技能统计 |
| appLanguage | 当前语言设置 |
| recentlyUsed | 最近使用的功能 |
| writingProgress | 书写练习进度 |

## 注意事项

1. **单页应用**: 所有页面在 `index.html`，通过 `showScreen()` 切换
2. **PWA 缓存**: 修改资源后必须更新 `sw.js` 版本号
3. **儿童安全**: 视频用 youtube-nocookie.com，结束显示遮罩
4. **响应式**: 主要针对手机/平板，竖屏优先
5. **离线优先**: 核心功能支持完全离线使用
6. **多语言**: 使用 `data-i18n` 属性，调用 `I18n.t('key')` 获取翻译
7. **TTS 语音**: 优先使用 Puter.js 神经网络语音，降级到 Web Speech API
