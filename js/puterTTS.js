// ========== Puter TTS 统一入口 ==========
// Puter 的神经网络语音（Zhiyu 中文女声）比系统语音自然，但它**需要用户同意条款/登录**才能用。
//
// 【为什么要有这个文件】
// 原来 4 个模块（aiChat / pictureBook / songPractice / writing）各自写着同一个判断：
//     if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) { ... }
// 这个判断只检查 API **存在**，不检查是否**可用**——未登录时它同样为 true。
// 实测（2026-07-28）：未登录状态下调用会先弹一个**英文的服务条款同意框**
// （给 5-7 岁中国孩子看的），然后挂起约 7 秒才失败。孩子那边的体感就是「点了没反应」。
//
// 所以这里统一做三件事：
//   1. 调用前先探测可用性（没登录直接判定不可用，不去打扰孩子）
//   2. 加超时，绝不让一次朗读卡住整个交互
//   3. 失败后本次会话不再重试，避免每句话都重蹈覆辙
//
// 调用方拿到 false / 异常时，一律降级到 Web Speech API（系统语音，即时可用，
// 实测有 18 个中文语音可选）。

const PuterTTS = {
  _blocked: false,     // 本次会话已确认不可用，别再浪费时间
  TIMEOUT: 3000,

  // 是否值得一试。返回 false 时调用方应直接走 Web Speech。
  available() {
    if (this._blocked) return false;
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2speech) return false;
    try {
      // 未登录 → Puter 会弹英文条款框并挂起，对儿童应用不可接受
      if (puter.auth && typeof puter.auth.isSignedIn === 'function' && !puter.auth.isSignedIn()) {
        return false;
      }
    } catch (e) {
      return false;
    }
    return true;
  },

  // 成功返回 audio 对象；不可用/超时/出错都抛异常，由调用方降级
  async speak(text, options) {
    if (!this.available()) throw new Error('puter tts unavailable');
    const opts = options || { voice: 'Zhiyu', engine: 'neural', language: 'cmn-CN' };
    try {
      return await Promise.race([
        puter.ai.txt2speech(text, opts),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('puter tts timeout')), this.TIMEOUT))
      ]);
    } catch (e) {
      this._blocked = true;
      throw e;
    }
  }
};

window.PuterTTS = PuterTTS;
