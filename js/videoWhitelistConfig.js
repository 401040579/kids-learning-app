// ========== 视频白名单配置（家长编辑区） ==========
// 孩子在「探索视频」里只能看到这里列出的内容。
// 改完后 git push 上线，记得同步 bump sw.js 的 CACHE_NAME 版本号。
//
// 【添加频道】channelId 是 UC 开头的 24 位 ID，获取方法：
//   浏览器打开 https://www.youtube.com/@频道名 → 查看网页源代码 → 搜索 "externalId"
//   频道会自动显示最新 15 个视频（联网时自动更新，有缓存离线可看列表）。
//
// 【添加单个视频】id 是视频链接 watch?v= 后面的 11 位字符，title 随便写（显示用）。

const VIDEO_WHITELIST = {
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
