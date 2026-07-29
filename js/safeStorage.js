// ========== localStorage 安全写入 ==========
//
// 【为什么需要这个文件】
// localStorage 的配额是**按整个域**算的（iOS Safari 约 5MB）。项目里有 37 处
// setItem，原来只有 1 处包了 try/catch。只要任何一个模块把配额撑满
// （罪魁是画作相册：每幅全分辨率 PNG 的 base64 约 1~2MB），
// 之后**所有**模块的 setItem 都会抛 QuotaExceededError：
// 答对题加星星、解锁成就、每日签到、错题本、宠物状态……全部存不进去，
// 而且异常没人接住，还会中断调用它的那个函数（比如保存画作时连加分和
// 家长通知都不执行了）。孩子的学习进度从此再也存不下来。
//
// 所以：**所有写入都要走 safeSetItem**，不要再裸调 localStorage.setItem。

const SafeStorage = {
  // 配额告急时可以牺牲的键，按「先丢谁」排序。
  // 画作相册是纯展示内容，丢了不影响学习进度，排第一。
  EVICTABLE: ['artworkGallery', 'musicCompositions', 'videoWhitelistCache'],

  _onFull: null,   // 配额满时的回调（UI 层可以注册一个友好提示）

  isQuotaError(e) {
    return e && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014
    );
  },

  // 返回 true=写入成功，false=最终没写进去（调用方可据此提示用户）
  set(key, value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(key, str);
      return true;
    } catch (e) {
      if (!this.isQuotaError(e)) {
        console.warn('[SafeStorage] 写入失败：' + key, e);
        return false;
      }
      // 配额满了：依次丢掉可牺牲的数据再重试，尽量保住学习进度类的写入
      for (const victim of this.EVICTABLE) {
        if (victim === key) continue;
        if (localStorage.getItem(victim) === null) continue;
        try {
          localStorage.removeItem(victim);
          localStorage.setItem(key, str);
          console.warn('[SafeStorage] 配额已满，已清理 ' + victim + ' 后写入成功：' + key);
          return true;
        } catch (e2) {
          if (!this.isQuotaError(e2)) return false;
        }
      }
      console.warn('[SafeStorage] 配额已满且清理无效，放弃写入：' + key);
      if (typeof this._onFull === 'function') {
        try { this._onFull(key); } catch (e3) { /* 忽略 */ }
      }
      return false;
    }
  },

  // 读取并 JSON.parse，损坏时返回 fallback 而不是抛异常
  getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch (e) {
      console.warn('[SafeStorage] 数据损坏，已回退默认值：' + key);
      return fallback;
    }
  },

  onFull(fn) { this._onFull = fn; }
};

// 全局快捷方式：把 localStorage.setItem 直接换成 safeSetItem 即可
function safeSetItem(key, value) {
  return SafeStorage.set(key, value);
}

window.SafeStorage = SafeStorage;
window.safeSetItem = safeSetItem;
