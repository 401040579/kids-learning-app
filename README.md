# 宝贝学习乐园

专为 6 岁小朋友设计的趣味学习应用，集娱乐与教育于一体。

## 功能特点

### 探索视频
- 精选儿童教育视频，嵌入式播放
- 视频结束自动遮罩，防止点击推荐
- 无需跳转，安全可控

### 数学游戏
- 10 以内加减法练习
- 随机出题，越答越有趣
- 连续答对有额外奖励

### 英语学习
- 26 个常用单词配图
- 点击发音，跟读学习
- 中文释义选择题

### 中文学习
- 20 个基础汉字认读
- 拼音标注
- 选择正确意思

### 奖励系统
- 答对得积分
- 连续答对奖励翻倍
- 星星飘落动画效果
- 进度自动保存

## 技术特点

- **PWA 支持**：可安装到手机桌面，像 App 一样使用
- **离线缓存**：Service Worker 支持离线访问
- **纯静态**：无需后端，GitHub Pages 直接部署
- **响应式设计**：适配手机和平板

## 本地运行

```bash
# 方式一：使用 npx serve
npx serve .

# 方式二：使用 Python
python3 -m http.server 8000
```

## 自定义视频

编辑 `index.html` 中的视频列表，替换 YouTube 视频 ID：

```html
<div class="video-card" onclick="playVideo('名称', 'YouTube视频ID')">
  <div class="video-thumb">emoji</div>
  <p>视频标题</p>
</div>
```

## 添加更多题目

- 英语单词：编辑 `js/app.js` 中的 `englishWords` 数组
- 中文汉字：编辑 `js/app.js` 中的 `chineseChars` 数组

## 项目结构

```
kids-learning-app/
├── index.html          # 主页面
├── manifest.json       # PWA 配置
├── sw.js              # Service Worker
├── css/
│   └── style.css      # 样式和动画
├── js/
│   ├── app.js         # 主应用逻辑
│   └── rewards.js     # 奖励系统
└── icons/
    └── icon-192.svg   # 应用图标
```

## 许可

仅供个人学习使用
