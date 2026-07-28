# 开发规范

## 分支策略

**直接在 `main` 分支开发，不需要创建新分支。**

### 原因

- 项目为个人/小团队使用，流程简化
- 减少分支管理开销
- 快速迭代，即时生效

### 开发流程

```
1. git pull origin main          # 拉取最新代码
2. 进行开发和修改
3. git add .                     # 暂存更改
4. git commit -m "描述"          # 提交
5. git push origin main          # 推送到远程
```

### 提交信息规范

使用中文或英文均可，格式建议：

```
<类型>: <简短描述>

类型包括：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 样式调整
- refactor: 重构代码
- perf: 性能优化
```

示例：
```
feat: 添加视频分类筛选功能
fix: 修复视频播放器在移动端的显示问题
docs: 更新 README 使用说明
```

## 代码规范

- HTML/CSS/JS 使用 2 空格缩进
- 中文注释说明关键逻辑
- 保持代码简洁，避免过度封装

## 视频内容更新

视频采用**白名单制**：孩子只能看到白名单里的频道和视频。唯一的编辑入口是
`js/videoWhitelistConfig.js`：

```javascript
const VIDEO_WHITELIST = {
  apiKey: '',                                 // 可选，见文件内说明
  channels: [
    { channelId: 'UC...', name: '频道名', icon: '📚' }
  ],
  videos: [
    { id: 'VIDEO_ID', title: '标题' }         // 单独指定的视频
  ]
};
```

配置改动 push 到 main 后，GitHub Actions 会自动运行 `scripts/fetch_videos.py`
抓取频道全部视频、重新生成 `data/videos.json` 并 bump Service Worker 版本号。
也可以本地手动跑一次：

```bash
python3 scripts/fetch_videos.py
```

> `js/videos.js` 是旧的内置视频库，已停用不再加载，请勿在它里面加内容。

## 部署

推送到 main 分支后，GitHub Pages 会自动部署（如已配置）。
