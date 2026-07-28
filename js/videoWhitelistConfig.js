// ========== 视频白名单配置（家长编辑区） ==========
// 孩子在「探索视频」里只能看到这里列出的内容。这是家长唯一需要编辑的文件。
//
// 【列表是怎么来的 —— 已改成 CI 自动生成，不用再手动维护】
//   你只要改这个文件里的 channels，然后 git push 到 main，
//   GitHub Actions（.github/workflows/update-videos.yml）就会自动：
//     1. 跑 scripts/fetch_videos.py 抓取该频道的**全部**视频（几百条也没问题）
//     2. 把结果写进 data/videos.json 并提交回仓库
//     3. 顺手把 sw.js 的缓存版本号 +1，保证已装到手机上的旧版本能拿到新列表
//   应用运行时只读同源的 data/videos.json —— 不跨域、不走代理、不需要密钥，
//   Service Worker 缓存后离线也能看到列表。
//   除了 push 触发，CI 每天还会自动重跑一次，跟进频道的新投稿。
//   想立刻刷新：GitHub 仓库 → Actions → Update videos.json → Run workflow。
//
// 【添加频道】channelId 是 UC 开头的 24 位 ID，获取方法：
//   浏览器打开 https://www.youtube.com/@频道名 → 查看网页源代码 → 搜索 "externalId"
//   在下面 channels 里照着现有格式加一项（channelId / name / icon），push 即可。
//
// 【添加单个视频】id 是视频链接 watch?v= 后面的 11 位字符，title 随便写（显示用）。
//   写在下面的 videos 数组里，适合"这一个视频不属于白名单频道但我想让孩子看"的情况。
//
// 【apiKey 现在是可选的加速项，不配也完全正常】
//   静态的 data/videos.json 已经包含全量视频，所以**留空就够用了**。
//   配了 apiKey 只是让应用在有网时能额外走官方 YouTube Data API 做一次实时补充，
//   拿到比上次 CI 生成时间更新的视频，属于锦上添花。配置方法（约 5 分钟）：
//     1. 打开 https://console.cloud.google.com → 新建项目
//     2. 「API 和服务」→「库」→ 搜索 YouTube Data API v3 → 启用
//     3. 「凭据」→ 创建凭据 → API 密钥
//     4. 编辑密钥做两个限制：应用限制选「网站」填你的站点域名（如
//        https://app.tao.irish/*），API 限制只勾 YouTube Data API v3
//     5. 把密钥粘贴到下面 apiKey 里
//   注意：前端代码里的密钥是公开可见的，务必按上面第 4 步加好域名限制。
//
// 【兜底】频道标题旁的「▶️ 播放频道」按钮走的是播放列表模式，
//   不依赖上面任何列表数据，任何时候都能播放该频道的全部视频。

const VIDEO_WHITELIST = {
  // YouTube Data API 密钥（可选加速项，见上方说明；留空完全正常，列表来自 data/videos.json）
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
