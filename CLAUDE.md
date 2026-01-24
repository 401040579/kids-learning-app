# CLAUDE.md

## 项目简介

「宝贝学习乐园」是一款专为 5-7 岁儿童设计的 PWA 学习应用，通过游戏化方式进行基础知识学习。

## 技术栈

- **前端**: 原生 HTML/CSS/JavaScript（无框架）
- **PWA**: Service Worker 支持离线访问
- **AI**: WebLLM + Qwen2.5-0.5B 本地模型（AI 聊天功能）
- **语音**: Web Speech API（发音和语音识别）
- **部署**: GitHub Pages 静态托管

## 目录结构

```
kids-learning-app/
├── index.html          # 单页应用主文件（所有 HTML 结构）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker 缓存策略
├── css/
│   └── style.css       # 所有样式（6000+ 行）
├── js/
│   ├── app.js          # 主应用逻辑、路由、核心功能
│   ├── videos.js       # 视频数据
│   ├── achievements.js # 成就系统
│   ├── rewards.js      # 奖励系统
│   ├── aiChat.js       # AI 聊天（WebLLM）
│   ├── pictureBook.js  # 绘本阅读
│   ├── pronunciation.js # 跟读练习
│   ├── memoryGame.js   # 记忆训练游戏
│   ├── puzzle.js       # 拼图游戏
│   ├── learningPet.js  # 学习宠物
│   ├── learningReport.js # 学习报告
│   ├── dailyCheckin.js # 每日签到
│   ├── wrongQuestions.js # 错题本
│   ├── parentNotify.js # 家长通知（Bark推送）
│   └── drawing.js      # 画画创作
├── data/
│   └── *.json          # 静态数据文件
├── music/              # 背景音乐资源
└── icons/              # 应用图标
```

## 开发规范

### CSS
- 使用 CSS 变量定义主题色（定义在 `:root`）
- 主色调: `--primary: #FF69B4`（粉色）
- 强调色: `--accent: #FFD93D`（黄色）
- 组件样式按功能模块分区，用注释标注

### JavaScript
- 所有模块代码在 `js/` 目录下按功能拆分
- 数据存储使用 `localStorage`
- 使用中文注释说明复杂逻辑

### 命名约定
- CSS 类名: 小写连字符（如 `reading-content`, `btn-back`）
- JS 函数: 驼峰命名（如 `showScreen`, `playVideo`）
- 常量数组: 驼峰命名（如 `englishWords`, `chineseChars`）

## 常用命令

```bash
# 本地运行（需要本地服务器支持 PWA）
npx serve .
# 或
python3 -m http.server 8000

# 部署（自动通过 GitHub Pages）
git push origin main
```

## 核心功能模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 探索视频 | videos.js | YouTube 嵌入播放 |
| 数学游戏 | app.js | 加减乘除（10/20/30以内） |
| 英语学习 | app.js | 26个单词+发音 |
| 中文学习 | app.js | 基础汉字认读 |
| AI 聊天 | aiChat.js | 本地 Qwen2.5 模型+语音对话 |
| 绘本阅读 | pictureBook.js | 图文故事+AI语音朗读 |
| 跟读练习 | pronunciation.js | 语音识别评分 |
| 记忆训练 | memoryGame.js | 翻牌配对游戏 |
| 学习宠物 | learningPet.js | 虚拟宠物养成 |
| 画画创作 | drawing.js | Apple Pencil 压感绘画 |
| 家长通知 | parentNotify.js | Bark 推送到 iPhone |

## 注意事项

1. **单页应用**: 所有页面都在 `index.html` 中，通过 `showScreen()` 切换显示
2. **PWA 缓存**: 修改资源后需更新 `sw.js` 中的版本号以清除缓存
3. **儿童安全**: 视频使用 youtube-nocookie.com，结束后显示遮罩防止推荐
4. **响应式**: 主要针对手机和平板设计，竖屏优先
5. **离线优先**: 核心功能支持完全离线使用

## 数据存储

所有用户数据保存在 `localStorage`：
- `learningProgress` - 学习进度
- `achievements` - 成就数据
- `dailyCheckin` - 签到记录
- `wrongQuestions` - 错题记录
- `petData` - 宠物状态
- `artworkGallery` - 画作作品集
- `parentNotifyConfig` - 家长通知配置
- `mathConfig` - 数学游戏设置
