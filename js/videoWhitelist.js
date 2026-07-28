// ========== 视频白名单（只看家长指定的频道/视频） ==========
// 白名单配置在 js/videoWhitelistConfig.js（家长唯一编辑入口）。
//
// 【数据分层】最终展示的是各层去重合并的结果，优先级从高到低：
//   1. data/videos.json —— 服务端（GitHub Actions 定时脚本）预生成的频道全量清单。
//      同源相对路径，无跨域、无代理、无 API key，SW 预缓存后离线可用。这是主力数据源，
//      必须最快最稳，所以 init() 一进来就拉，拉到即重渲染。
//   2. YouTube Data API —— 只在家长配了 apiKey 时启用，拉到的最新视频合并到静态清单前面。
//   3. CORS 代理 + RSS —— 历史遗留兜底。公共免费代理近期基本全挂（403/429/522/超时），
//      所以超时压到 5 秒且只在后台跑，绝不能拖慢首屏；失败也不影响静态清单的展示。
//   4. localStorage 累积缓存 —— 第 2/3 层的结果落盘（去重、新在前、只增不减），
//      离线或网络层全挂时兜底，也让 RSS 那 15 条能积少成多。
//
// 【为什么静态 JSON 优先】RSS 接口硬上限只有 15 条，而目标频道有 400+ 视频；
// 公共代理又不可靠。预生成静态文件把「不确定的跨域请求」变成「确定的同源文件」。
//
// 【分批渲染】一个频道可能有 400+ 视频，一次性插入几百个 <img> 在低端手机上会卡，
// 所以初始只渲染 24 条，底部「加载更多」按钮 + 滚动到底自动追加，每次再加 24 条。
// 追加走 insertAdjacentHTML，不重渲整个列表，避免已加载的缩略图闪烁。
//
// 频道标题旁常驻「播放频道」按钮：播放列表模式天然包含频道全部视频，
// 即使所有数据层都失败也永远可播。

const VideoWhitelist = {
  CACHE_KEY: 'videoWhitelistCache',
  CACHE_TTL: 6 * 60 * 60 * 1000,
  FETCH_TIMEOUT: 8000,
  PROXY_TIMEOUT: 5000,        // 代理基本全挂，超时压短，别拖慢首屏
  STATIC_URL: 'data/videos.json',
  PAGE_SIZE: 24,              // 每批渲染的卡片数
  MAX_VIDEOS: 1000,           // 单频道展示上限，防止异常数据撑爆 DOM
  VIDEO_ID_RE: /^[A-Za-z0-9_-]{11}$/,
  CHANNEL_ID_RE: /^[A-Za-z0-9_-]{6,64}$/,
  DURATION_RE: /^\d{1,3}:\d{2}(:\d{2})?$/,

  // 公共 CORS 代理，按序尝试（最后手段）
  PROXIES: [
    (url) => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ],

  _static: null,          // 静态清单：channelId -> { name, videos }
  _staticState: 'idle',   // idle | loading | loaded | error
  _staticAt: 0,
  _refreshing: false,
  _attempted: {},         // 本次会话已尝试过网络刷新的频道（代理全挂时避免反复重试）
  _shown: {},             // channelId -> 当前已渲染的卡片数（跨重渲染保持，防止回退）
  _lastSig: null,         // 上次渲染的数据签名，相同则跳过 DOM 写入，避免闪烁
  _observer: null,        // 「加载更多」哨兵的 IntersectionObserver

  init() {
    this.render();        // 先用已有缓存渲染，保证秒开（离线也有内容）
    this.ensureStatic();  // 主力数据源，到手后自动重渲
    this.refreshIfStale(); // 后台增量刷新（可选层）
  },

  // ---------- 第 1 层：静态 JSON ----------
  ensureStatic() {
    if (this._staticState === 'loading' || this._staticState === 'loaded') return Promise.resolve();
    // 失败后 60 秒内不重试，避免每次进页面都白打一次请求
    if (this._staticState === 'error' && Date.now() - this._staticAt < 60000) return Promise.resolve();

    this._staticState = 'loading';
    // 注意：这里绝不能加随机查询串做 cache-busting。SW 是 cache-first 且预缓存了
    // data/videos.json，带查询串的请求匹配不到缓存条目，离线就直接白屏了。
    // JSON 内容更新靠发布时 bump sw.js 的 CACHE_NAME 版本号。
    return this.fetchWithTimeout(this.STATIC_URL, this.FETCH_TIMEOUT)
      .then(text => {
        this._static = this.normalizeStatic(JSON.parse(text));
        this._staticState = 'loaded';
        this._staticAt = Date.now();
        this.render();
      })
      .catch(() => {
        // 文件缺失 / 还没生成 / 格式损坏，都静默降级到其他层
        this._static = null;
        this._staticState = 'error';
        this._staticAt = Date.now();
        this.render();
      });
  },

  // 静态文件同样按不可信输入处理：逐条校验 videoId，标题只收字符串
  normalizeStatic(data) {
    const out = {};
    const channels = data && data.channels;
    if (!channels || typeof channels !== 'object') return out;

    for (const channelId of Object.keys(channels)) {
      const ch = channels[channelId];
      if (!ch || !Array.isArray(ch.videos)) continue;
      const videos = [];
      const seen = new Set();
      for (const v of ch.videos) {
        if (!v || !this.VIDEO_ID_RE.test(String(v.id || ''))) continue;
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        const item = { id: v.id, title: typeof v.title === 'string' ? v.title : '' };
        if (typeof v.duration === 'string' && this.DURATION_RE.test(v.duration)) {
          item.duration = v.duration;
        }
        videos.push(item);
        if (videos.length >= this.MAX_VIDEOS) break;
      }
      out[channelId] = { name: typeof ch.name === 'string' ? ch.name : '', videos };
    }
    return out;
  },

  staticVideos(channelId) {
    const ch = this._static && this._static[channelId];
    return (ch && ch.videos) || [];
  },

  // ---------- 第 4 层：localStorage 累积缓存 ----------
  getCache() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY)) || {};
    } catch {
      return {};
    }
  },

  // 网络层拉到的结果并入缓存：新列表在前，历史见过但这次没拉到的旧视频保留在后
  mergeIntoCache(channelId, fetched) {
    try {
      const cache = this.getCache();
      const old = ((cache[channelId] || {}).videos || []);
      const seen = new Set(fetched.map(v => v.id));
      const merged = fetched.concat(old.filter(v => !seen.has(v.id))).slice(0, 600);
      cache[channelId] = { fetchedAt: Date.now(), videos: merged };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage 满了或被禁用，不影响本次展示
    }
  },

  cachedVideos(channelId) {
    const c = this.getCache()[channelId];
    return (c && Array.isArray(c.videos) ? c.videos : [])
      .filter(v => v && this.VIDEO_ID_RE.test(String(v.id || '')));
  },

  // ---------- 合并各层 ----------
  // 缓存（来自 API/RSS，永远是最新的那几条）在前，静态清单里没重复的接在后面。
  // 两边都是「新 → 旧」顺序，所以合并后整体顺序仍然成立。
  displayVideos(channelId) {
    const head = this.cachedVideos(channelId);
    const tail = this.staticVideos(channelId);
    const seen = new Set();
    const out = [];
    for (const v of head.concat(tail)) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
      if (out.length >= this.MAX_VIDEOS) break;
    }
    return out;
  },

  channels() {
    return ((typeof VIDEO_WHITELIST !== 'undefined' && VIDEO_WHITELIST.channels) || [])
      .filter(ch => ch && this.CHANNEL_ID_RE.test(String(ch.channelId || '')));
  },

  manualVideos() {
    return ((typeof VIDEO_WHITELIST !== 'undefined' && VIDEO_WHITELIST.videos) || [])
      .filter(v => v && this.VIDEO_ID_RE.test(String(v.id || '')));
  },

  // ---------- 第 2/3 层：网络拉取 ----------
  // 超过 6 小时的频道后台刷新（stale-while-revalidate：先用已有数据渲染，拉到新的再重渲染）
  refreshIfStale() {
    this.ensureStatic();   // 静态层没加载成功过就顺便重试

    if (this._refreshing) return;
    const cache = this.getCache();
    const stale = this.channels().filter(ch => {
      if (this._attempted[ch.channelId]) return false;   // 本会话已试过，别反复打死代理
      const c = cache[ch.channelId];
      return !c || (Date.now() - c.fetchedAt) > this.CACHE_TTL;
    });
    // navigator.onLine 为 false 时一定离线，省一次必然失败的请求
    if (stale.length === 0 || navigator.onLine === false) return;

    this._refreshing = true;
    stale.forEach(ch => { this._attempted[ch.channelId] = true; });
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

    // 第 2 层：官方 Data API（配置了 key 时），直连无代理，可拉全量
    if (key) {
      try {
        videos = await this.fetchViaApi(channelId, key);
      } catch (e) {
        lastErr = e;
      }
    }

    // 第 3 层：RSS 最新 15 条，经 CORS 代理。实测代理目前基本全挂，
    // 这里纯属兜底，5 秒超时，失败静默（静态清单已经把列表撑起来了）。
    if (!videos || videos.length === 0) {
      const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
      for (const buildUrl of this.PROXIES) {
        try {
          const xml = await this.fetchWithTimeout(buildUrl(feedUrl), this.PROXY_TIMEOUT);
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

  // onclick 只传 id（标题可能含引号），id 已经过正则校验，可安全拼进 URL / onclick
  thumbCard(video) {
    const duration = video.duration && this.DURATION_RE.test(video.duration)
      ? `<span class="video-thumb-duration">${video.duration}</span>` : '';
    return `
      <div class="video-thumb-card" onclick="VideoWhitelist.play('${video.id}')">
        <img class="video-thumb-img" src="https://i.ytimg.com/vi/${video.id}/mqdefault.jpg" alt="" loading="lazy">
        ${duration}
        <div class="video-thumb-title">${this.escapeHtml(video.title || '')}</div>
      </div>`;
  },

  // 「加载更多」区块（已全部显示时返回空串）
  moreBarHtml(channelId, shown, total) {
    if (shown >= total) return '';
    return `
      <button class="btn-load-more" onclick="VideoWhitelist.loadMore('${channelId}')">
        <span data-i18n="videos.loadMore">加载更多</span>
        <span class="load-more-count">${shown} / ${total}</span>
      </button>`;
  },

  // 数据签名：完全相同就跳过 DOM 写入，避免后台刷新把已加载的缩略图重渲成闪烁
  renderSignature() {
    const parts = [this.isBusy() ? 'busy' : 'idle'];
    for (const ch of this.channels()) {
      const list = this.displayVideos(ch.channelId);
      parts.push([
        ch.channelId,
        list.length,
        this._shown[ch.channelId] || 0,
        list.length ? list[0].id : ''
      ].join(':'));
    }
    parts.push('manual:' + this.manualVideos().length);
    return parts.join('|');
  },

  // 静态清单还没到手 / 后台在刷新 → 显示「加载中」而不是空态
  isBusy() {
    return this._refreshing || this._staticState === 'idle' || this._staticState === 'loading';
  },

  render() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    const sig = this.renderSignature();
    if (sig === this._lastSig) return;

    const busy = this.isBusy();
    let html = '';

    // 每个白名单频道一个分区
    for (const ch of this.channels()) {
      const channelId = ch.channelId;
      const list = this.displayVideos(channelId);
      const staticName = (this._static && this._static[channelId] && this._static[channelId].name) || '';
      const name = ch.name || staticName;

      html += `
        <div class="channel-section">
          <div class="channel-header">
            <span class="channel-icon">${this.escapeHtml(ch.icon || '📺')}</span>
            <span class="channel-name">${this.escapeHtml(name)}${list.length ? ' · ' + list.length : ''}</span>
            <button class="btn-play-channel small" onclick="VideoWhitelist.playChannel('${channelId}')">
              ▶️ <span data-i18n="videos.playChannel">播放频道</span>
            </button>
          </div>`;

      if (list.length > 0) {
        // 分批：已展开过多少就还渲染多少（用户点过「加载更多」后，
        // 后台刷新触发的重渲染不会把他弹回第一批）
        const shown = Math.min(list.length, this._shown[channelId] || this.PAGE_SIZE);
        this._shown[channelId] = shown;
        html += `
          <div class="video-thumb-grid" id="vt-grid-${channelId}">
            ${list.slice(0, shown).map(v => this.thumbCard(v)).join('')}
          </div>
          <div class="video-load-more" id="vt-more-${channelId}">
            ${this.moreBarHtml(channelId, shown, list.length)}
          </div>`;
      } else if (busy) {
        html += `
          <div class="channel-fallback">
            <span class="loading-icon">🎬</span>
            <p data-i18n="videos.loading">加载中...</p>
          </div>`;
      } else {
        // 所有数据层都拿不到列表：给一个永远可用的「播放频道」兜底
        html += `
          <div class="channel-fallback">
            <p data-i18n="videos.empty">视频列表加载不出来，直接播放频道吧！</p>
            <button class="btn-play-channel" onclick="VideoWhitelist.playChannel('${channelId}')">
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
    this._lastSig = this.renderSignature();

    this.observeMoreBars();

    // 新渲染的 data-i18n 节点补翻译
    if (typeof I18n !== 'undefined') I18n.applyTranslations();
  },

  // 追加下一批：只往末尾插 DOM，不重渲已有卡片（避免图片闪烁）
  loadMore(channelId) {
    if (!this.CHANNEL_ID_RE.test(String(channelId || ''))) return;
    const list = this.displayVideos(channelId);
    const shown = Math.min(list.length, this._shown[channelId] || this.PAGE_SIZE);
    if (shown >= list.length) return;

    const next = list.slice(shown, shown + this.PAGE_SIZE);
    const grid = document.getElementById('vt-grid-' + channelId);
    if (!grid) return;
    grid.insertAdjacentHTML('beforeend', next.map(v => this.thumbCard(v)).join(''));

    this._shown[channelId] = shown + next.length;

    const more = document.getElementById('vt-more-' + channelId);
    if (more) more.innerHTML = this.moreBarHtml(channelId, this._shown[channelId], list.length);

    this._lastSig = this.renderSignature();
    this.observeMoreBars();
    if (typeof I18n !== 'undefined') I18n.applyTranslations();
  },

  // 滚动到底自动加载（IntersectionObserver 不支持时，用户点按钮一样能加载）
  observeMoreBars() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (this._observer) this._observer.disconnect();
    this._observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // 关键：探索视频页没打开时是 display:none，此时哨兵是零尺寸矩形，
        // Chrome 会把它判成 isIntersecting=true，导致孩子还没进页面就把
        // 几百张卡片全渲染了（分批直接失效）。用高度过滤掉这种假命中。
        if (entry.boundingClientRect.height <= 0) continue;
        const id = entry.target.id.replace('vt-more-', '');
        this.loadMore(id);
      }
    }, { rootMargin: '200px' });

    for (const ch of this.channels()) {
      const el = document.getElementById('vt-more-' + ch.channelId);
      if (el && el.firstElementChild) this._observer.observe(el);
    }
  },

  // ---------- 播放 ----------
  // onclick 只传 id（标题可能含引号），标题按 id 反查
  play(videoId) {
    if (!this.VIDEO_ID_RE.test(videoId)) return;

    let title = videoId;
    for (const ch of this.channels()) {
      const hit = this.displayVideos(ch.channelId).find(v => v.id === videoId);
      if (hit && hit.title) { title = hit.title; break; }
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
