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

编辑 `js/videos.js` 或 `data/videos.json` 添加/修改视频：

```javascript
{
  id: "category-001",
  category: "math",           // 分类 ID
  title: "English Title",
  titleZh: "中文标题",
  youtubeId: "VIDEO_ID",
  duration: "5:00",
  ageMin: 5,
  ageMax: 7,
  skills: ["技能1", "技能2"],
  description: "视频简介",
  whyRecommend: "推荐理由",
  parentTips: "家长贴士"
}
```

## 部署

推送到 main 分支后，GitHub Pages 会自动部署（如已配置）。
