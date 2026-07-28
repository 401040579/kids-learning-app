// ========== 视频白名单（只看家长指定的频道/视频） ==========
// 白名单配置在 js/videoWhitelistConfig.js。
// 频道视频获取分两档（结果都缓存到 localStorage，6 小时过期，离线用缓存）：
//   1. 配置了 apiKey：官方 YouTube Data API 直连（无代理），分页拉全量（≤500 条）
//   2. 未配置（默认）：YouTube RSS 只给最新 15 条（接口硬上限），经公共 CORS 代理
//      获取，并采用累积缓存——每次刷新并入历史，列表只增不减
// 频道标题旁常驻「播放频道」按钮：播放列表模式天然包含频道全部视频。

const VideoWhitelist = {
  CACHE_KEY: 'videoWhitelistCache',
  CACHE_TTL: 6 * 60 * 60 * 1000,
  FETCH_TIMEOUT: 8000,
  VIDEO_ID_RE: /^[A-Za-z0-9_-]{11}$/,

  // 公共 CORS 代理，按序尝试
  PROXIES: [
    (url) => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ],

  _refreshing: false,

  init() {
    this.refreshIfStale();
    this.render();
  },

  // ---------- 缓存 ----------
  getCache() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY)) || {};
    } catch {
      return {};
    }
  },

  // 拉取结果并入缓存：新列表在前，历史见过但这次没拉到的旧视频保留在后
  // （RSS 模式一次只有 15 条，靠这里积少成多）
  mergeIntoCache(channelId, fetched) {
    const cache = this.getCache();
    const old = ((cache[channelId] || {}).videos || []);
    const seen = new Set(fetched.map(v => v.id));
    const merged = fetched.concat(old.filter(v => !seen.has(v.id))).slice(0, 600);
    cache[channelId] = { fetchedAt: Date.now(), videos: merged };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  },

  channels() {
    return (typeof VIDEO_WHITELIST !== 'undefined' && VIDEO_WHITELIST.channels) || [];
  },

  manualVideos() {
    return ((typeof VIDEO_WHITELIST !== 'undefined' && VIDEO_WHITELIST.videos) || [])
      .filter(v => this.VIDEO_ID_RE.test(v.id));
  },

  // ---------- 拉取 ----------
  // 超过 6 小时的频道后台刷新（stale-while-revalidate：先用旧缓存渲染，拉到新数据再重渲染）
  refreshIfStale() {
    if (this._refreshing) return;
    const cache = this.getCache();
    const stale = this.channels().filter(ch => {
      const c = cache[ch.channelId];
      return !c || (Date.now() - c.fetchedAt) > this.CACHE_TTL;
    });
    // navigator.onLine 为 false 时一定离线，省一次必然失败的请求
    if (stale.length === 0 || navigator.onLine === false) return;

    this._refreshing = true;
    Promise.allSettled(stale.map(ch => this.fetchChannel(ch.channelId)))
      .then(() => {
        this._refreshing = false;
        this.render();
      });
  },

  async fetchChannel(channelId) {
    const key = ((typeof VIDEO_WHITELIST !== 'undefined' && VIDEO_WHITELIST.apiKey) || '').trim();
    let videos = null;
    let lastErr = null;

    // 第一档：官方 Data API（配置了 key 时），直连无代理，可拉全量
    if (key) {
      try {
        videos = await this.fetchViaApi(channelId, key);
      } catch (e) {
        lastErr = e;
      }
    }

    // 第二档：RSS 最新 15 条，经 CORS 代理
    if (!videos || videos.length === 0) {
      const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
      for (const buildUrl of this.PROXIES) {
        try {
          const xml = await this.fetchWithTimeout(buildUrl(feedUrl));
          const list = this.parseFeed(xml);
          if (list.length === 0) throw new Error('empty feed');
          videos = list;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
    }

    if (!videos || videos.length === 0) throw lastErr || new Error('fetch failed');
    this.mergeIntoCache(channelId, videos);
    return videos;
  },

  // 官方 Data API：分页拉取频道上传列表（新→旧，最多 10 页 × 50 = 500 条）。
  // 一次全量刷新约花 10 单位配额（每日免费 10000），浏览器直连自带 CORS。
  async fetchViaApi(channelId, key) {
    const playlistId = 'UU' + channelId.slice(2);
    const videos = [];
    let pageToken = '';
    for (let page = 0; page < 10; page++) {
      const url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        + '?part=snippet&maxResults=50&playlistId=' + playlistId
        + '&key=' + encodeURIComponent(key)
        + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      const data = JSON.parse(await this.fetchWithTimeout(url, 10000));
      for (const item of (data.items || [])) {
        const sn = item.snippet || {};
        const id = sn.resourceId && sn.resourceId.videoId;
        if (!this.VIDEO_ID_RE.test(id || '')) continue;
        // 上传列表里已删除/私享视频的占位条目
        if (sn.title === 'Private video' || sn.title === 'Deleted video') continue;
        videos.push({ id: id, title: sn.title || '' });
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return videos;
  },

  async fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || this.FETCH_TIMEOUT);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  },

  // 解析 RSS。内容经第三方代理而来，一律按不可信输入处理：
  // videoId 不合法直接丢弃，标题渲染前 escapeHtml
  parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    // 代理有时 200 返回 HTML 错误页
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML parse error');
    }
    const YT_NS = 'http://www.youtube.com/xml/schemas/2015';
    const videos = [];
    const entries = doc.getElementsByTagName('entry');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let id = '';
      const idEl = entry.getElementsByTagNameNS(YT_NS, 'videoId')[0];
      if (idEl) {
        id = idEl.textContent.trim();
      } else {
        const rawId = entry.getElementsByTagName('id')[0];
        if (rawId) id = rawId.textContent.split(':').pop().trim();
      }
      if (!this.VIDEO_ID_RE.test(id)) continue;
      const titleEl = entry.getElementsByTagName('title')[0];
      videos.push({ id, title: titleEl ? titleEl.textContent : '' });
    }
    return videos;
  },

  // ---------- 渲染 ----------
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  thumbCard(video) {
    return `
      <div class="video-thumb-card" onclick="VideoWhitelist.play('${video.id}')">
        <img class="video-thumb-img" src="https://i.ytimg.com/vi/${video.id}/mqdefault.jpg" alt="" loading="lazy">
        <div class="video-thumb-title">${this.escapeHtml(video.title || '')}</div>
      </div>`;
  },

  render() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    const cache = this.getCache();
    let html = '';

    // 每个白名单频道一个分区
    for (const ch of this.channels()) {
      const cached = cache[ch.channelId];
      const count = cached && cached.videos ? cached.videos.length : 0;
      html += `
        <div class="channel-section">
          <div class="channel-header">
            <span class="channel-icon">${this.escapeHtml(ch.icon || '📺')}</span>
            <span class="channel-name">${this.escapeHtml(ch.name || '')}${count ? ' · ' + count : ''}</span>
            <button class="btn-play-channel small" onclick="VideoWhitelist.playChannel('${this.escapeHtml(ch.channelId)}')">
              ▶️ <span data-i18n="videos.playChannel">播放频道</span>
            </button>
          </div>`;

      if (cached && cached.videos.length > 0) {
        html += `<div class="video-thumb-grid">${cached.videos.map(v => this.thumbCard(v)).join('')}</div>`;
      } else if (this._refreshing) {
        html += `
          <div class="channel-fallback">
            <span class="loading-icon">🎬</span>
            <p data-i18n="videos.loading">加载中...</p>
          </div>`;
      } else {
        // 列表拿不到（首次访问且离线/代理全挂）：给一个永远可用的「播放频道」兜底
        html += `
          <div class="channel-fallback">
            <p data-i18n="videos.empty">视频列表加载不出来，直接播放频道吧！</p>
            <button class="btn-play-channel" onclick="VideoWhitelist.playChannel('${this.escapeHtml(ch.channelId)}')">
              ▶️ <span data-i18n="videos.playChannel">播放频道</span>
            </button>
          </div>`;
      }
      html += '</div>';
    }

    // 家长手动指定的单个视频
    const manual = this.manualVideos();
    if (manual.length > 0) {
      html += `
        <div class="channel-section">
          <div class="channel-header">
            <span class="channel-icon">💝</span>
            <span class="channel-name" data-i18n="videos.parentPicks">爸妈精选</span>
          </div>
          <div class="video-thumb-grid">${manual.map(v => this.thumbCard(v)).join('')}</div>
        </div>`;
    }

    grid.innerHTML = html;

    // 新渲染的 data-i18n 节点补翻译
    if (typeof I18n !== 'undefined') I18n.applyTranslations();
  },

  // ---------- 播放 ----------
  // onclick 只传 id（标题可能含引号），标题按 id 反查
  play(videoId) {
    if (!this.VIDEO_ID_RE.test(videoId)) return;

    let title = videoId;
    const cache = this.getCache();
    for (const ch of this.channels()) {
      const hit = ((cache[ch.channelId] || {}).videos || []).find(v => v.id === videoId);
      if (hit) { title = hit.title; break; }
    }
    const manual = this.manualVideos().find(v => v.id === videoId);
    if (manual && manual.title) title = manual.title;

    playVideo(videoId, title);
  },

  playChannel(channelId) {
    const ch = this.channels().find(c => c.channelId === channelId);
    if (!ch) return;
    playChannelPlaylist(channelId, ch.name);
  }
};
