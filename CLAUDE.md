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
├── sw.js               # Service Worker (当前 v62，CI 更新视频列表时会自动 +1)
├── css/style.css       # 所有样式
├── js/
│   ├── app.js          # 主应用逻辑、数学/英语/中文、最近使用、视频播放器
│   ├── homeScreen.js   # 首页分屏（iPhone 风图标 4 屏，36 个功能入口配置）
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
│   ├── videoWhitelistConfig.js # 视频白名单配置（家长编辑：频道/单视频）
│   ├── videoWhitelist.js # 视频白名单（读 data/videos.json、分批渲染、播放频道兜底）
│   ├── videos.js       # 旧视频数据（已停用，不再加载）
│   ├── scienceData.js  # 科学题库
│   ├── lifeSkills.js   # 生活技能（时钟/钱币/日历）
│   ├── lifeSkillsData.js # 生活技能数据
│   ├── music.js        # 睡眠音乐
│   ├── songPractice.js # 歌曲练习
│   ├── songData.js     # 歌曲数据
│   ├── familyPK.js     # 亲子PK模式
│   ├── logicGames.js   # 逻辑训练游戏
│   ├── logicGamesData.js # 逻辑游戏数据
│   ├── reactionGames.js # 反应训练游戏
│   ├── reactionGamesData.js # 反应游戏数据
│   ├── drawSmash.js     # 画线砸怪兽游戏
│   ├── drawSmashData.js # 画线砸怪兽关卡数据
│   ├── ragdollRobot.js  # 弹弹机器人游戏
│   ├── ragdollRobotData.js # 弹弹机器人关卡数据
│   ├── choreTracker.js    # 家庭积分榜
│   ├── birthdayParty.js   # 生日派对
│   ├── parkWallpaper.js   # 魔法公园（声音互动壁纸）
│   └── toothFairy.js      # 牙仙子传统（掉牙记录/惊喜信/收藏证书）
├── docs/
│   ├── 踩坑记录.md     # ⚠️ 改代码前先看：那些与官方文档/直觉相反的实测结论
│   └── 审计报告-2026-07.md # 全项目审计：66 条已验证问题（含已修复清单）
├── scripts/
│   └── fetch_videos.py # 抓取白名单频道全部视频 → 生成 data/videos.json（CI 调用）
├── data/
│   └── videos.json     # ★ CI 预生成的视频列表（同源静态文件，应用运行时读它）
├── .github/workflows/
│   └── update-videos.yml # 每日定时重跑抓取脚本，有变化才提交 + 自动 bump sw.js 版本
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
| 首页分屏 | homeScreen.js | ✅ 完成（iPhone 风 4 屏：常用/学习/游戏/工具） |
| 探索视频 | videoWhitelist.js + videoWhitelistConfig.js + scripts/fetch_videos.py | ✅ 完成（白名单制：CI 预生成 data/videos.json 全量列表，同源读取免代理） |
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
| 亲子PK | familyPK.js | ✅ 完成（时限/让分/历史记录） |
| 逻辑训练 | logicGames.js | ✅ 完成（找规律/找不同/配对/迷宫） |
| 反应训练 | reactionGames.js | ✅ 完成（打地鼠/颜色闪电/抓星星/红绿灯） |
| 画线砸怪兽 | drawSmash.js | ✅ 完成（6章30关/物理引擎/弹跳垫） |
| 弹弹机器人 | ragdollRobot.js | ✅ 完成（5章30关/布娃娃物理/弹射收星） |
| 家庭积分榜 | choreTracker.js | ✅ 完成（任务打卡/加减分/奖励兑换/语音输入） |
| 生日派对 | birthdayParty.js | ✅ 完成（倒计时/许愿墙/吹蜡烛/贺卡制作） |
| 魔法公园 | parkWallpaper.js | ✅ 完成（声音互动壁纸/麦克风风力/全屏Canvas） |
| 牙仙子传统 | toothFairy.js | ✅ 完成（20颗牙齿地图/掉牙记录/牙仙子的信/收藏证书/惊喜揭晓/家长奖励规则） |

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

# 手动刷新探索视频列表（本地跑，生成 data/videos.json）
python3 scripts/fetch_videos.py
# 本地刷新后记得手动 bump sw.js 版本号再提交（CI 跑的话会自动 bump）

# 让 CI 在线刷新一次（不用本地环境，推荐）
gh workflow run update-videos.yml
gh run watch          # 看进度
gh run list --workflow=update-videos.yml --limit 5   # 看历史/排查抓取失效
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
| familyPKHistory | 亲子PK历史记录 |
| kidsLogicGames | 逻辑游戏统计和解锁 |
| kidsReactionGames | 反应游戏统计 |
| kidsDrawSmash | 画线砸怪兽进度和星星 |
| kidsRagdollRobot | 弹弹机器人进度和星星 |
| kidsChoreTracker | 家庭积分榜数据 |
| kidsBirthdayParty | 生日派对数据 |
| kidsToothFairy | 牙仙子掉牙记录/奖励规则 |
| videoWhitelistCache | 白名单频道视频列表缓存（6 小时过期） |

## 注意事项

> 📌 **动手改代码前先翻一遍 [docs/踩坑记录.md](docs/踩坑记录.md)**。
> 那里记的都是「照官方文档做反而是错的」「看起来像 bug 其实是环境问题」这类事实，
> 每条都有实测日期和证据，能省掉大量重复排查。

1. **单页应用**: 所有页面在 `index.html`，通过 `navigateTo()` 切换 `.page`；首页是 `homeScreen.js` 渲染的横向分屏（scroll-snap），全屏功能各自用 modal
2. **PWA 缓存**: 修改资源后必须更新 `sw.js` 版本号；SW 只拦截同源请求（跨域早退）
3. **儿童安全 + 视频数据流**: 视频白名单制——孩子只能看 `videoWhitelistConfig.js` 里配置的频道/视频；播放用官方 YouTube IFrame API（www.youtube.com + enablejsapi），结束事件触发遮罩盖住推荐墙；fs:0 禁全屏（iOS 系统全屏时 DOM 遮罩失效）。

   **列表数据流（三层）**：
   - **主力**：CI 预生成的同源静态文件 `data/videos.json`，应用直接 `fetch('data/videos.json')`——无跨域、无代理、无 API key，SW 预缓存后离线可用，且能拿到频道全量视频（几百条）
   - **动态更新**：`.github/workflows/update-videos.yml` 每天定时重跑 `scripts/fetch_videos.py`；只有列表真正变化才提交（忽略 `generatedAt` 时间戳差异避免空提交），并**自动 bump `sw.js` 的 CACHE_NAME**——因为 SW 是 cache-first，不换版本号老设备永远读旧缓存，更新就到不了用户手上
   - **兜底**：「▶️ 播放频道」按钮走播放列表模式，不依赖任何列表数据，永远可播全量
   - `apiKey` 现已降级为**可选加速项**（有网时实时补充比 CI 更新的视频），不配也完全正常

   **为什么不再用 CORS 代理**：2026-07 实测 7 个免费公共代理（corsproxy.io / allorigins / codetabs / thingproxy / cors.lol / proxy.cors.sh 等）**全部失效**（403/429/522/超时），孩子端直接空列表；且 RSS 接口硬上限只有最新 15 条。**不要再引入任何运行时 CORS 代理依赖**
4. **响应式**: 主要针对手机/平板，竖屏优先
5. **离线优先**: 核心功能支持完全离线使用
6. **多语言**: 使用 `data-i18n` 属性，调用 `I18n.t('key')` 获取翻译
7. **TTS 语音**: 优先使用 Puter.js 神经网络语音，降级到 Web Speech API
