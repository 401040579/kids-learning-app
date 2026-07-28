// ========== 视频白名单配置（家长编辑区） ==========
// 孩子在「探索视频」里只能看到这里列出的内容。
// 改完后 git push 上线，记得同步 bump sw.js 的 CACHE_NAME 版本号。
//
// 【添加频道】channelId 是 UC 开头的 24 位 ID，获取方法：
//   浏览器打开 https://www.youtube.com/@频道名 → 查看网页源代码 → 搜索 "externalId"
//
// 【列表数量说明】
//   - 不配 apiKey（默认）：走 YouTube RSS，只能拿到最新 15 条；应用会把每次
//     刷新的结果累积进本地缓存（去重、只增不减），列表随频道更新慢慢变多。
//     频道标题旁的「▶️ 播放频道」按钮永远能播放频道全部视频（播放列表模式）。
//   - 配置 apiKey：走官方 YouTube Data API，直接拉取频道全部视频（上限 500 条，
//     自动分页），依然每 6 小时自动刷新。强烈推荐，5 分钟一次性配置：
//       1. 打开 https://console.cloud.google.com → 新建项目
//       2. 「API 和服务」→「库」→ 搜索 YouTube Data API v3 → 启用
//       3. 「凭据」→ 创建凭据 → API 密钥
//       4. 编辑密钥做两个限制：应用限制选「网站」填你的站点域名（如
//          https://xxx.github.io/*），API 限制只勾 YouTube Data API v3
//       5. 把密钥粘贴到下面 apiKey 里
//     免费配额每天 10000 单位，本应用一次全量刷新只花约 10 单位，完全够用。
//
// 【添加单个视频】id 是视频链接 watch?v= 后面的 11 位字符，title 随便写（显示用）。

const VIDEO_WHITELIST = {
  // YouTube Data API 密钥（可选，见上方说明；留空则走 RSS 模式）
  apiKey: '',

  // 白名单频道
  channels: [
    {
      channelId: 'UCVgXBX_6nrVUWFXYN5nTMRQ',   // @RikosReadingRoom
      name: "Riko's Reading Room",
      icon: '📚'
    }
  ],

  // 家长手动指定的单个视频
  videos: [
    // { id: 'dQw4w9WgXcQ', title: '视频标题' }
  ]
};
