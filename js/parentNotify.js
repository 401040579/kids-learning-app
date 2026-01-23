// ========== 家长通知模块 ==========
// 通过 Bark 推送通知到家长手机

const ParentNotify = {
  // 配置
  config: {
    barkUrl: '',           // Bark 推送 URL
    enabled: false,        // 是否启用
    notifyAchievement: true,  // 成就通知
    notifyProgress: true,     // 学习进度通知
    notifyMessage: true,      // 消息通知
    progressThreshold: 10     // 每答多少题通知一次
  },

  // 答题计数器
  questionCount: 0,

  // 初始化
  init() {
    this.loadConfig();
  },

  // 加载配置
  loadConfig() {
    const saved = localStorage.getItem('parentNotifyConfig');
    if (saved) {
      this.config = { ...this.config, ...JSON.parse(saved) };
    }
  },

  // 保存配置
  saveConfig() {
    localStorage.setItem('parentNotifyConfig', JSON.stringify(this.config));
  },

  // 设置 Bark URL
  setBarkUrl(url) {
    // 确保 URL 格式正确
    if (url && !url.endsWith('/')) {
      url = url + '/';
    }
    this.config.barkUrl = url;
    this.config.enabled = !!url;
    this.saveConfig();
  },

  // 发送通知
  async send(title, content, options = {}) {
    if (!this.config.enabled || !this.config.barkUrl) {
      console.log('家长通知未启用');
      return false;
    }

    try {
      // 构建 Bark URL
      // 格式: https://api.day.app/YOUR_KEY/title/content?params
      let url = this.config.barkUrl;
      url += encodeURIComponent(title) + '/';
      url += encodeURIComponent(content);

      // 添加参数
      const params = new URLSearchParams();

      // 通知级别 (active, timeSensitive, passive)
      if (options.level) {
        params.append('level', options.level);
      }

      // 声音
      if (options.sound) {
        params.append('sound', options.sound);
      }

      // 图标
      if (options.icon) {
        params.append('icon', options.icon);
      }

      // 分组
      params.append('group', options.group || '宝贝学习乐园');

      const paramStr = params.toString();
      if (paramStr) {
        url += '?' + paramStr;
      }

      // 发送请求
      const response = await fetch(url);
      const result = await response.json();

      if (result.code === 200) {
        console.log('通知发送成功');
        return true;
      } else {
        console.error('通知发送失败:', result);
        return false;
      }
    } catch (error) {
      console.error('通知发送错误:', error);
      return false;
    }
  },

  // ========== 预设通知类型 ==========

  // 成就通知
  notifyAchievement(achievementName) {
    if (!this.config.notifyAchievement) return;
    this.send(
      '🏆 获得新成就！',
      `宝贝刚刚获得了「${achievementName}」成就！`,
      { sound: 'fanfare', level: 'active' }
    );
  },

  // 学习进度通知
  notifyProgress(subject, count) {
    if (!this.config.notifyProgress) return;
    this.send(
      '📚 学习进度更新',
      `宝贝在${subject}已经完成了 ${count} 道题！`,
      { sound: 'chord', level: 'passive' }
    );
  },

  // 开始学习通知
  notifyStartLearning(subject) {
    this.send(
      '📖 开始学习啦',
      `宝贝开始学习${subject}了~`,
      { sound: 'chord', level: 'passive' }
    );
  },

  // 完成绘本通知
  notifyBookComplete(bookName) {
    this.send(
      '📕 读完绘本啦',
      `宝贝读完了《${bookName}》！`,
      { sound: 'chord', level: 'passive' }
    );
  },

  // 签到通知
  notifyCheckin(days) {
    this.send(
      '✅ 每日签到',
      `宝贝完成了今日签到，已连续签到 ${days} 天！`,
      { sound: 'chord', level: 'passive' }
    );
  },

  // 孩子发送的消息
  notifyMessage(message) {
    if (!this.config.notifyMessage) return;
    this.send(
      '💬 宝贝发来消息',
      message,
      { sound: 'bell', level: 'timeSensitive' }
    );
  },

  // SOS 紧急通知
  notifySOS() {
    this.send(
      '🆘 紧急求助！',
      '宝贝按下了紧急求助按钮，请尽快查看！',
      { sound: 'alarm', level: 'timeSensitive' }
    );
  },

  // 答题计数（每N题通知一次）
  trackQuestion(subject) {
    this.questionCount++;
    if (this.questionCount >= this.config.progressThreshold) {
      this.notifyProgress(subject, this.questionCount);
      this.questionCount = 0;
    }
  },

  // 测试通知
  async testNotify() {
    const success = await this.send(
      '🎉 测试成功！',
      '家长通知已正确配置，可以收到宝贝的消息啦~',
      { sound: 'chord', level: 'active' }
    );
    return success;
  }
};

// ========== UI 控制函数 ==========

// 打开家长设置
function openParentSettings() {
  const modal = document.getElementById('parent-settings-modal');
  if (!modal) return;

  // 填充当前配置
  const urlInput = document.getElementById('bark-url-input');
  if (urlInput) {
    urlInput.value = ParentNotify.config.barkUrl || '';
  }

  // 更新开关状态
  updateSettingSwitches();

  modal.classList.remove('hidden');
}

// 关闭家长设置
function closeParentSettings() {
  const modal = document.getElementById('parent-settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 更新设置开关状态
function updateSettingSwitches() {
  const switches = {
    'notify-achievement': ParentNotify.config.notifyAchievement,
    'notify-progress': ParentNotify.config.notifyProgress,
    'notify-message': ParentNotify.config.notifyMessage
  };

  for (const [id, value] of Object.entries(switches)) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
  }

  // 进度阈值
  const thresholdEl = document.getElementById('progress-threshold');
  if (thresholdEl) {
    thresholdEl.value = ParentNotify.config.progressThreshold;
  }
}

// 保存 Bark URL
async function saveBarkUrl() {
  const input = document.getElementById('bark-url-input');
  if (!input) return;

  const url = input.value.trim();

  if (!url) {
    ParentNotify.setBarkUrl('');
    showSettingStatus('已关闭通知', 'info');
    return;
  }

  // 验证 URL 格式
  if (!url.includes('api.day.app') && !url.includes('bark')) {
    showSettingStatus('URL 格式不正确，请检查', 'error');
    return;
  }

  ParentNotify.setBarkUrl(url);
  showSettingStatus('正在测试...', 'info');

  // 发送测试通知
  const success = await ParentNotify.testNotify();

  if (success) {
    showSettingStatus('✅ 设置成功！请检查手机是否收到通知', 'success');
  } else {
    showSettingStatus('❌ 发送失败，请检查URL是否正确', 'error');
  }
}

// 显示设置状态
function showSettingStatus(message, type) {
  const statusEl = document.getElementById('bark-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = 'bark-status ' + type;
  statusEl.classList.remove('hidden');
}

// 更新通知设置
function updateNotifySetting(key, value) {
  ParentNotify.config[key] = value;
  ParentNotify.saveConfig();
}

// 打开消息发送界面
function openMessageToParent() {
  const modal = document.getElementById('message-parent-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// 关闭消息发送界面
function closeMessageToParent() {
  const modal = document.getElementById('message-parent-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  // 停止语音识别
  if (MessageVoice.isListening) {
    MessageVoice.stopListening();
  }
}

// 发送消息给家长
async function sendMessageToParent() {
  const input = document.getElementById('parent-message-input');
  if (!input) return;

  const message = input.value.trim();
  if (!message) {
    alert('请输入要发送的消息~');
    return;
  }

  if (!ParentNotify.config.enabled) {
    alert('还没有设置家长通知哦，请先让爸爸妈妈设置~');
    return;
  }

  // 显示发送中
  const btn = document.getElementById('send-parent-msg-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '发送中...';
  }

  const success = await ParentNotify.notifyMessage(message);

  if (btn) {
    btn.disabled = false;
    btn.textContent = '发送给爸爸妈妈 💌';
  }

  if (success) {
    input.value = '';
    alert('消息已发送！爸爸妈妈会收到的~');
    closeMessageToParent();
  } else {
    alert('发送失败了，稍后再试试~');
  }
}

// 使用预设消息
function usePresetMessage(message) {
  const input = document.getElementById('parent-message-input');
  if (input) {
    input.value = message;
  }
}

// SOS 紧急求助
async function triggerSOS() {
  if (!ParentNotify.config.enabled) {
    alert('还没有设置家长通知，请先让爸爸妈妈设置~');
    return;
  }

  // 确认
  const confirmed = confirm('确定要发送紧急求助吗？');
  if (!confirmed) return;

  // 发送 SOS 通知
  await ParentNotify.notifySOS();

  // 显示本地提示
  alert('已发送紧急求助！爸爸妈妈会很快来的~');
}

// ========== 语音输入消息 ==========

const MessageVoice = {
  recognition: null,
  isListening: false,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      const input = document.getElementById('parent-message-input');
      if (input) input.value = text;

      if (result.isFinal) {
        this.stopListening();
      }
    };

    this.recognition.onend = () => {
      this.stopListening();
    };

    this.recognition.onerror = () => {
      this.stopListening();
    };

    return true;
  },

  startListening() {
    if (!this.recognition && !this.init()) {
      alert('你的浏览器不支持语音输入~');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;

      const btn = document.getElementById('msg-voice-btn');
      if (btn) btn.classList.add('listening');
    } catch (e) {
      console.error('语音识别启动失败:', e);
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.isListening = false;

    const btn = document.getElementById('msg-voice-btn');
    if (btn) btn.classList.remove('listening');
  }
};

function toggleMessageVoice() {
  MessageVoice.startListening();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  ParentNotify.init();
});

// 全局暴露
window.ParentNotify = ParentNotify;
window.openParentSettings = openParentSettings;
window.closeParentSettings = closeParentSettings;
window.saveBarkUrl = saveBarkUrl;
window.updateNotifySetting = updateNotifySetting;
window.openMessageToParent = openMessageToParent;
window.closeMessageToParent = closeMessageToParent;
window.sendMessageToParent = sendMessageToParent;
window.usePresetMessage = usePresetMessage;
window.triggerSOS = triggerSOS;
window.toggleMessageVoice = toggleMessageVoice;
