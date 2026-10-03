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
├── sw.js               # Service Worker (当前 v81，CI 更新视频列表时会自动 +1)
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
│   ├── music.js        # 音乐创作（钢琴/鼓点/音序器；睡眠音乐在 app.js）
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
| 音乐创作 | music.js | ✅ 完成（演奏录制/作品保存恢复） |
| 睡眠音乐 | app.js | ✅ 完成 |
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
# 无第三方依赖的核心逻辑回归测试
node --test tests/*.test.cjs

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

## 数据存储

通过 `AppStorage` 访问 localStorage：游客沿用原键，账号键以 `kids-learning-account:<id>:` 分区。
完整本机备份登记 31 个键；账号存档同步/整体恢复处理其中 28 个，语言、通知配置和视频缓存属于设备。
根类型以 `DataBackup` 和后端允许表为准。新增嵌套字段应保留旧数据，不能把累计记录猜成逐题事件。

| 键名 | 说明 |
|------|------|
| kidsProfileData | 个人资料 |
| kidsLearningData | 奖励累计计数与科学进度 |
| kidsCalendarData | 日历记录 |
| kidsAchievements | 成就 |
| kidsWrongQuestions | 错题本 |
| kidsDailyCheckin | 签到 |
| kidsMemoryGameStats | 记忆游戏统计 |
| kidsLearningPet | 宠物状态 |
| kidsPictureBookData | 绘本打开历史、收藏及 v2 页码/阅读会话/自报完成 |
| kidsPronunciationStats | v2 转写文字匹配统计、旧版统计单列 |
| kidsEnglishBoost | 英语提升 |
| kidsChoreTracker | 家庭积分榜 |
| kidsBirthdayParty | 生日派对 |
| kidsToothFairy | 牙仙子掉牙及奖励规则 |
| kidsLogicGames | 逻辑游戏 |
| kidsReactionGames | 反应游戏 |
| kidsDrawSmash | 画线砸怪兽 |
| kidsRagdollRobot | 弹弹机器人 |
| lifeSkillsStats | 生活技能 |
| mathGameConfig | 数学设置 |
| parentNotifyConfig | 设备级 Bark 配置，完整备份含凭据，不上传云端 |
| writingProgress | 书写进度 |
| petGamesStats | 宠物游戏 |
| videoWhitelistCache | 设备级可再下载缓存，不上传云端 |
| kidsFamilyPK | 亲子 PK |
| artworkGallery | 已保存画作数组 |
| musicCompositions | 作品数组；v2 含演奏事件/时间/音色，旧音序器兼容 |
| recentlyUsed | 最近使用数组 |
| appLanguage | 设备级语言字符串 |
| aiChatEnabled | 聊天开关字符串 |
| sleepMusicTimer | 睡眠音乐定时字符串 |

逐题事件另存 IndexedDB `kids-learning-history`，按 `[owner,id]` 分区，与 localStorage 快照分开导出。
账号元数据/写锁不进入备份；账号认证令牌只在 HttpOnly Cookie，不放 localStorage。

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

## 学习数据基础修复（2026-09-29）

- `RewardSystem` 只加载/写回 `DEFAULTS` 声明的计数器（含拼图计数）。不要把 `scienceProgress` 等模块存档读入奖励系统内存，再用整对象覆盖磁盘。旧版合并式写入仍会覆盖老用户科学进度，重新打开已有存档才能复现。
- 结构化读取使用 `SafeStorage.getObject(key, defaults)`；主要模块分别初始化，读取/保存失败显示提示。读取损坏数据时保留原文，不自动删除。结构兜底并不等于完整的数据迁移或云同步。
- 存储空间不足时只允许自动清理 `videoWhitelistCache`。画作和音乐作品属于用户数据，不能作为缓存自动淘汰；空间仍不足时提示保存失败。
- 错题再次答错须取消已掌握状态并重置复习间隔；数学题完成到切题之间只能计分一次；加法结果不得超过设置范围。
- SW 激活只清理 `kids-learning-v*` 旧缓存，不能删除同源 WebLLM 模型缓存。
- 回归测试在 `tests/storage.test.cjs`，使用 Node 内置测试工具，不连接第三方服务。
- `DataBackup` 在 `js/dataBackup.js` 登记本应用的 31 个存档键。新增持久数据时必须同步登记并明确根类型；测试会检查直接使用的存档键。v2 备份保存原文并校验导入，恢复失败尝试还原旧记录；v1 只恢复旧版导出的三类数据。完整备份包含个人资料和家长通知配置，不能上传到仓库。WebLLM 缓存和同源第三方凭据不导出。

## 账号规则（2026-09-29 用户确认）

- 用户端采用公网 HTTPS + 账号，不要求安装 Tailscale。游客保留纯网页和本机存档功能；后端故障不能阻止学习。
- **只有用户明确要求时才开通账号**。无公开注册入口、无 HTTP 创建用户接口。首个专属账号为 `iris`；通过 `python -m backend.manage` 在服务器操作。
- 独立后端代码位于 `backend/`，运维与测试见该目录 README。不得将机器人 8090 全部转发到公网；不得把账号数据库、密码、实际备份放进仓库或公开静态目录。
- `js/accountConfig.js` 的 `apiBase` 为空时不发后端请求。公网 Cookie 要求 Secure/HttpOnly/SameSite=Strict；API 与网页应同站或使用同源代理。
- `AppStorage` 管理 28 个学习存档键，游客沿用原键，账号使用独立前缀；登录不自动搬入游客数据。语言、家长通知凭据和视频缓存留在设备，不进入账号云存档。模块只能通过 AppStorage 读写。
- `scope: learning` 的 v2 备份只恢复包含的键，不能删除其他本机设置；排除家长通知凭据和视频缓存，前后端登记表必须一致。SW 不拦截 `/api/` 与写请求。
- 逐题事件接口在 `backend/learning.py`：追加与分页读取均从会话取账号；`expected_account_id` 仅检查队列归属。以 `(account_id, event_id)` 去重，同 ID 不同内容整批回滚；写入事务中重新检查撤销/过期会话。公开上传接口只允许 `source: web`；受信机器人适配器另行导入。
- `js/learningHistory.js` 使用 IndexedDB `kids-learning-history`，`events` 以 `[owner,id]` 为键。数学/英语/中文/科学每次有效作答即时固定账号归属，确认答对后不可重复提交。游客日志不迁移、不上传；原账号的断网队列只能在再次登录该账号后补传。
- 日志上传确认后才标记已同步；拉取日志和推进游标必须在一个 IndexedDB 事务中提交。使用写入序号而非作答时间分页，避免迟到的离线作答漏拉。日志独立导出，不在 localStorage 的 31 键备份内。
- 离线重新打开网页时不凭本机标记冒充已登录身份，进入游客模式。共用设备的 IndexedDB 不做加密隔离；账号 UI/云端隔离不能替代设备访问控制。
- Orin 的独立服务目录为 `~/robots/kids-learning-service`，`backend/run.sh` 用独立 `flock` 防止多实例，仅监听 `127.0.0.1:8091`，不使用机器人大脑的停止命令。用户 crontab 保留原机器人自启，另加学习服务自启、5 分钟启动兜底和每日 04:35 备份。
- `python -m backend.backup` 通过 SQLite Backup API 生成私有副本（默认保留 14 份、删除副本中的会话），不直接复制活跃数据库。WAL 模式会传给副本：须改为 DELETE journal 并真正关闭连接后再改名；sqlite3 的 `with connection` 只管理事务，不关闭连接。本轮已复制私有副本到 Mac 并临时恢复登录，未替换线上库。
- 公网隧道使用 `backend/run-tunnel.sh` 的独立 flock 与用户 crontab；实际凭据/配置均在仓库外，Orin 不持 Cloudflare 账号管理证书。仅 `api.tao.irish` 的 `^/api/` 转发 8091，所有其他请求 404；8090 与 8092 不公开。域名原有 DNSSEC 时必须处理父区旧 DS 及缓存期限，完成委派后恢复新签名；隧道 ready 不等于公网 HTTPS 已上线。详情见 backend README。
- DNSSEC 迁移缓存从父权威实际撤销起算；本域旧 DS TTL 为 1 小时，旧子区 NS TTL 为 6 小时。Squarespace 默认 DNSSEC 关后再开会换 KSK，不能当作密钥回滚。恢复 Cloudflare 父 DS 必须先等旧 NS 缓存期限，并实际校验新 DNSKEY。保留并检查原邮件转发规则；公开文档/日志不包含私有目标邮箱。

## 账号存档切换（2026-09-30）

- `LearningAccount` 先验证会话并取云存档，之后派发 `learningReady` 初始化游戏；登录/退出冻结写入并刷新网页。不要把独立模块恢复为 DOMContentLoaded 初始化，或立即执行 init，否则会先读游客内存。
- 登录后保存的学习存档自动同步，新设备启动恢复云端；冲突保留本机，家长选择保存本机或采用云端，不在游戏进行中静默覆盖。未保存的画布不会自动上传，切换前应保存作品。
- dirty 标记先于数据写入；上传确认只有 change 标记一致才能清 dirty，防止传输期间新作品被误标成已同步。Web Locks 阻止同账号多标签页并发写入；旧浏览器继续受服务端版本号保护。
- 学习备份包含的键和完整账号恢复不同：`replaceProfile` 仅整体替换 28 个账号键并可回滚，设备配置不动。账号元数据不进入导出；IndexedDB 日志单独同步。

## 机器人数据共享（2026-09-30）

- `backend/tutor_bridge.py` 按私有配置绑定已有 Iris 账号，每 10 秒只读 tutor_log；事件与导入游标同事务，源库重建回扫并以稳定 UUID 去重。原始 Marble topic_id/version 和 Jarvis/Friday 来源保留。
- `GET /api/tutor/plan` 是当前账号复习数据，不控制机器人。`js/learningPlan.js` 展示最多两道待复习基础加减法并可网页练习；服务器与机器人都从 question_id 重算答案。杂音不消除待复习，较新答对会消除；当天机器人已答错不反复追问。
- 学习服务原子写 0600 私有题单，机器人仅在正常家教开始读取有效题单；失效退回 Marble，预算不增加。机器人代码与文档在该仓库另行提交。当前仅单孩子绑定，不能把旧家教日志改归属给新账号。

## 复习事件时间精度（2026-10-02）

- 待复习题按已验证并统一为 UTC 毫秒的 `payload.occurred_at` 判断最新 correct/wrong，只有同毫秒才按 `seq` 排序。数据库秒字段不能代表同一秒内的作答先后；不需要迁移旧表。
- 网页复习 API 与私有机器人题单使用绑定配置的同一时区判断当天，不用设备时区替代孩子的绑定时区。
- 数据桥 `ready` 只表示数据导入/题单生成成功，不表示机器人在线。前端说明必须区分这两件事。

## 第一轮功能可靠性优化（2026-10-02）

- 周报告为滚动近 7 天，月报告为设备本地自然月，全部取当前分区逐题日志。unclear/skipped 单列且不进入正确率；积分/成就/错题本累计状态另列，不能反推掌握度。读取失败与零记录要区分；异步结果须检查 owner 和渲染版本。
- 绘本旧 `readingHistory` 仅表示打开过。v2 按会话保存已展示页及显式“我读完了”；未完成能续读，完成标记保存失败不奖，同次不能重复领取。自报完成不是阅读理解证据，完成与奖励两个键也不是原子事务。
- 跟读只比较浏览器转写文字与目标的编辑距离；不再宣称发音标准。杂音、空/低置信结果、权限失败不评分。拼音为示范自练；旧轮均值进 legacyStats，新匹配样本用 scoreTotal/matchedAttempts 累计。
- SOS 按 HTTP 与 Bark code 判断至少一个服务接受请求，10 秒超时覆盖正文，发送中锁定重复点击。不承诺家长已看见或会立即到场。
- 音乐保存检查 safeSetItem 结果，失败不显示成功/增成就，保留旧数据；v2 真正保存钢琴/鼓点演奏，可从作品列表恢复。旧钢琴/鼓点元数据无法补回录音，旧音序器可恢复。演奏最多 10 分钟/5,000 事件。
- 绘本/跟读按钮统一定义在所属模块，app.js 不再重复覆盖；宠物两个选择界面入口分名，装饰品使用真实 accessories-list，提示保留 pet-message 子元素。
- 浏览器回归必须等待新文档和 LearningAccount.booted，再读切换后的存档。重新加载会再次出现签到提醒，须先正常关闭；奖励弹窗也需按真实继续按钮处理，不能绕过遮罩声称按钮可用。
- 详细发现→修复→验证轨迹见 `docs/优化记录-2026-10.md`。

## 短课、阅读理解与间隔复习（2026-10-02）

- `data/curriculum.json` 为固定中文题库，26 个 topic/52 题，含 20 个已核对 Marble v1 的数学科学点与 6 本绘本；版本/适用方式/答案/提示/讲解必须齐全。数据许可见 `data/CURRICULUM-LICENSE.md`。更改题干、答案、选项须升级题目版本，不把旧记录算成新题证据。
- `StudyEngine` 与 `backend.study` 是同契约纯逻辑，JS/Python 有逐字段对照回归。日历间隔 1/3/7/14/30 天；同日不升阶段；错误/提示/机器人提示未知次日再测；杂音和跳过不改阶段。只能称复习阶段/练习证据，不称技能掌握。
- `StudySession` 等 learningReady 后初始化，默认 4 题/5 分钟，可调 2–6 题/3、5、10 分钟；时间到在题间结束。设置 merge 已有 kidsProfileData.learningSettings，不新增备份键；资料编辑器也需保留这个字段。读取失败不能当零记录。
- 新网页事件 v2 精确增加 schema_version/topic_id/taxonomy_version/question_version/hint_used；服务器从课程校验全部对应内容和判定，公开上传不能伪装 robot。受信机器人保留原始转写，提示未知为 null。v1 旧事件不迁移、不冒充新课程证据。
- `LearningHistory.record` 返回事务提交的 true/false，允许固定 ID/时间的幂等重试；成功后的 UI 异常不能伪装保存失败。短课未保存时保留 pending，不能下一题；切号/冻结/异步回包检查 owner/token。
- 绘本理解为可选两题，查看原文也记提示；稳定事件 ID 由 completionId/题目ID/版本派生，先查本账号日志，避免刷新后同轮重复。下一轮重读会话允许再练；读完自报不是理解证据。
- 目录 fetch 和 JSON 正文都有 10 秒超时，失败清缓存允许重试；后端目录缺失时原账号/旧加减法仍可工作，新课程明确不可用。SW 预缓存题库与两个模块，游客离线可用。
- 同机题单仅把到期 oral 数学/科学课接入下次正常机器人家教，总计最多占两个名额；不信题单自带题干和答案，不送 screen 阅读题、不新增公开唤醒接口。详见 `docs/短课与复习.md`。
- 报告区分提示/未知提示，周期证据与全部历史到期复习分开；课程与报告共用本账号设置时区。Mac 异机备份工具见 scripts/offsite_backup.py，实际配置/副本/LaunchAgent 均在仓库外；失败保留旧副本。
