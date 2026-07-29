// ========== AI聊天模块 ==========
// 基于WebLLM的本地AI聊天功能，专为儿童设计

const AIChat = {
  // 状态
  engine: null,
  isLoaded: false,
  isLoading: false,
  messages: [],

  // 配置
  config: {
    // Qwen2.5-0.5B（约 280MB：权重 265MB + tokenizer/wasm）
    modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    // 备选模型：SmolLM2-360M（约300MB，加载快，但中文较差）
    // modelId: "SmolLM2-360M-Instruct-q4f32_1-MLC",
    maxTokens: 150,
    temperature: 0.7
  },

  // 系统提示词（儿童安全）
  systemPrompt: `你是"学习小助手"，一个友好的AI朋友，专为4-8岁小朋友设计。

规则：
1. 用简单的话回答，每句话不超过20个字
2. 保持积极、鼓励的态度，多用"真棒"、"加油"、"好厉害"
3. 只讨论：学习、动物、自然、故事、游戏、数学、英语
4. 如果问题不适合小朋友或太难，温和地说"这个问题好难呀，问问爸爸妈妈吧~"
5. 可以用emoji让回答更有趣
6. 回答要简短，不超过3句话`,

  // 加载时的趣味小知识
  funFacts: [
    "💡 大象是陆地上最大的动物哦！",
    "🦋 蝴蝶用脚来品尝食物~",
    "🐌 蜗牛有四个鼻子呢！",
    "🦒 长颈鹿的舌头有50厘米长！",
    "🐙 章鱼有三颗心脏~",
    "🌈 彩虹有7种颜色哦！",
    "🌙 月球上没有风~",
    "🐝 蜜蜂的翅膀每秒扇动200次！",
    "🦈 鲨鱼没有骨头，都是软骨~",
    "⭐ 太阳是一颗巨大的恒星！",
    "🐘 大象不会跳跃哦~",
    "🦜 鹦鹉可以学人说话！",
    "🐧 企鹅生活在南极~",
    "🌻 向日葵会跟着太阳转！",
    "🐋 蓝鲸是世界上最大的动物！"
  ],

  factInterval: null,

  // 检查WebGPU支持
  isSupported() {
    return !!navigator.gpu;
  },

  // 初始化检查
  async init() {
    if (!this.isSupported()) {
      console.log('WebGPU不支持，AI功能不可用');
      return false;
    }
    return true;
  },

  // 动态加载WebLLM脚本
  async loadWebLLMScript() {
    if (window.webllm) return true;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';

      // 创建一个内联模块来加载WebLLM (使用 @mlc-ai/web-llm)
      const moduleCode = `
        import * as webllm from 'https://esm.run/@mlc-ai/web-llm@0.2.84';
        window.webllm = webllm;
        window.dispatchEvent(new Event('webllm-loaded'));
      `;

      script.textContent = moduleCode;

      const onLoaded = () => {
        window.removeEventListener('webllm-loaded', onLoaded);
        resolve(true);
      };

      window.addEventListener('webllm-loaded', onLoaded);

      script.onerror = () => {
        reject(new Error('WebLLM加载失败'));
      };

      document.head.appendChild(script);

      // 超时处理
      setTimeout(() => {
        if (!window.webllm) {
          reject(new Error('WebLLM加载超时'));
        }
      }, 30000);
    });
  },

  // 加载模型
  async loadModel(onProgress) {
    if (this.isLoaded) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      // 先加载WebLLM库
      await this.loadWebLLMScript();

      if (!window.webllm) {
        throw new Error('WebLLM未正确加载');
      }

      // 创建引擎
      this.engine = await window.webllm.CreateMLCEngine(this.config.modelId, {
        initProgressCallback: (progress) => {
          const percent = Math.round(progress.progress * 100);
          const text = progress.text || '';
          if (onProgress) onProgress(percent, text);
        }
      });

      this.isLoaded = true;
      this.isLoading = false;

      // 保存启用状态
      safeSetItem('aiChatEnabled', 'true');

      return true;
    } catch (error) {
      console.error('模型加载失败:', error);
      this.isLoading = false;
      return false;
    }
  },

  // 发送消息
  async sendMessage(userMessage) {
    if (!this.isLoaded || !this.engine) {
      return { error: '小助手还没准备好哦，稍等一下~' };
    }

    // 添加用户消息
    this.messages.push({ role: 'user', content: userMessage });

    // 限制历史长度（节省内存，保持上下文简短）
    if (this.messages.length > 6) {
      this.messages = this.messages.slice(-6);
    }

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.messages
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      });

      const aiReply = response.choices[0].message.content;
      this.messages.push({ role: 'assistant', content: aiReply });

      return { content: aiReply };
    } catch (error) {
      console.error('AI回复失败:', error);
      return { error: '小助手打了个盹，再试一次吧~' };
    }
  },

  // 流式回复（打字机效果）
  async sendMessageStream(userMessage, onToken, onComplete) {
    if (!this.isLoaded || !this.engine) {
      if (onComplete) onComplete('小助手还没准备好哦~', true);
      return;
    }

    this.messages.push({ role: 'user', content: userMessage });

    if (this.messages.length > 6) {
      this.messages = this.messages.slice(-6);
    }

    try {
      const stream = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.messages
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true
      });

      let fullReply = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        fullReply += token;
        if (onToken) onToken(token, fullReply);
      }

      this.messages.push({ role: 'assistant', content: fullReply });
      if (onComplete) onComplete(fullReply, false);

      return fullReply;
    } catch (error) {
      console.error('AI流式回复失败:', error);
      if (onComplete) onComplete('小助手打了个盹，再试一次吧~', true);
    }
  },

  // 清空对话历史
  clearHistory() {
    this.messages = [];
  },

  // 检查是否已下载过模型（缓存检测）
  // 注意：WebLLM 默认 cacheBackend 是 "cache"（Cache API），scope 名实测为
  // webllm/model、webllm/wasm、webllm/config，**根本不写 IndexedDB**。
  // 原来查 indexedDB.databases() 恒为 false，导致模型明明在本地，
  // 孩子每次点开 AI 聊天都还要看一遍「需要下载 350MB」的吓人确认框。
  async checkModelCached() {
    try {
      if (typeof caches !== 'undefined' && caches.keys) {
        const names = await caches.keys();
        if (names.some(n => n.startsWith('webllm'))) return true;
      }
      // 老版本 WebLLM 用 IndexedDB，一并兼容
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        if (dbs.some(db => db.name && db.name.includes('webllm'))) return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // 获取随机趣味小知识
  getRandomFunFact() {
    return this.funFacts[Math.floor(Math.random() * this.funFacts.length)];
  },

  // 开始趣味小知识轮播
  startFunFactRotation(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = this.getRandomFunFact();

    this.factInterval = setInterval(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = this.getRandomFunFact();
        el.style.opacity = '1';
      }, 300);
    }, 4000);
  },

  // 停止趣味小知识轮播
  stopFunFactRotation() {
    if (this.factInterval) {
      clearInterval(this.factInterval);
      this.factInterval = null;
    }
  }
};

// ========== AI聊天UI控制 ==========

// 打开AI聊天
async function openAIChat() {
  const modal = document.getElementById('ai-chat-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // 检查支持性
  if (!AIChat.isSupported()) {
    showAIChatState('error');
    document.getElementById('ai-error-message').textContent =
      '你的设备暂不支持AI小助手，试试用爸爸妈妈的新手机吧~';
    return;
  }

  // 检查是否已加载
  if (AIChat.isLoaded) {
    showAIChatState('main');
    return;
  }

  // 检查是否有缓存
  const hasCached = await AIChat.checkModelCached();

  if (hasCached) {
    // 有缓存，直接加载
    showAIChatState('loading');
    AIChat.startFunFactRotation('ai-loading-fact');

    const success = await AIChat.loadModel(updateLoadingProgress);

    AIChat.stopFunFactRotation();

    if (success) {
      showAIChatState('main');
    } else {
      showAIChatState('error');
      document.getElementById('ai-error-message').textContent =
        '加载失败了，检查一下网络再试试吧~';
    }
  } else {
    // 无缓存，显示下载确认
    showAIChatState('download-prompt');
  }
}

// 显示指定状态界面
function showAIChatState(state) {
  const states = ['download-prompt', 'loading', 'main', 'error'];
  states.forEach(s => {
    const el = document.getElementById(`ai-chat-${s}`);
    if (el) {
      el.classList.toggle('hidden', s !== state);
    }
  });
}

// 开始下载模型
async function startAIModelDownload() {
  showAIChatState('loading');
  AIChat.startFunFactRotation('ai-loading-fact');

  const success = await AIChat.loadModel(updateLoadingProgress);

  AIChat.stopFunFactRotation();

  if (success) {
    showAIChatState('main');
    // 播放成功音效
    if (typeof playSound === 'function') {
      playSound('reward');
    }
  } else {
    showAIChatState('error');
    document.getElementById('ai-error-message').textContent =
      '下载失败了，检查一下网络再试试吧~';
  }
}

// 更新加载进度
function updateLoadingProgress(percent, text) {
  const percentEl = document.getElementById('ai-loading-percent');
  const barEl = document.getElementById('ai-loading-bar-fill');

  if (percentEl) percentEl.textContent = percent;
  if (barEl) barEl.style.width = percent + '%';
}

// 发送消息
async function sendAIMessage() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  // 📊 追踪 AI 聊天
  if (typeof Analytics !== 'undefined') {
    Analytics.sendEvent('ai_chat_message', {
      message_length: message.length
    });
  }

  // 清空输入
  input.value = '';

  // 添加用户消息到界面
  appendChatMessage('user', message);

  // 显示思考中
  const thinkingEl = showAIThinking();

  // 滚动到底部
  scrollChatToBottom();

  // 获取AI回复
  const response = await AIChat.sendMessage(message);

  // 移除思考中
  if (thinkingEl) thinkingEl.remove();

  // 添加AI回复
  if (response.error) {
    appendChatMessage('ai', response.error, true);
  } else {
    appendChatMessage('ai', response.content);
    // 播放提示音
    if (typeof playSound === 'function') {
      playSound('correct');
    }
  }

  // 滚动到底部
  scrollChatToBottom();
}

// 使用预设问题
function usePresetQuestion(question) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = question;
    sendAIMessage();
  }
}

// 添加消息到聊天界面
function appendChatMessage(role, content, isError = false) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;

  // 移除欢迎消息
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `chat-message chat-${role}` + (isError ? ' chat-error' : '');

  // 转义HTML防止XSS
  const safeContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  if (role === 'ai') {
    div.innerHTML = `
      <span class="chat-avatar">🤖</span>
      <div class="chat-bubble">${safeContent}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="chat-bubble">${safeContent}</div>
      <span class="chat-avatar">👶</span>
    `;
  }

  container.appendChild(div);
}

// 显示AI思考中
function showAIThinking() {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return null;

  const div = document.createElement('div');
  div.className = 'chat-message chat-ai chat-thinking';
  div.innerHTML = `
    <span class="chat-avatar">🤖</span>
    <div class="chat-bubble">
      <span class="thinking-dot"></span>
      <span class="thinking-dot"></span>
      <span class="thinking-dot"></span>
    </div>
  `;

  container.appendChild(div);
  return div;
}

// 滚动聊天到底部
function scrollChatToBottom() {
  const container = document.getElementById('ai-chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// 关闭AI聊天
function closeAIChat() {
  const modal = document.getElementById('ai-chat-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  AIChat.stopFunFactRotation();
}

// 清空聊天记录
function clearAIChat() {
  AIChat.clearHistory();

  const container = document.getElementById('ai-chat-messages');
  if (container) {
    container.innerHTML = `
      <div class="chat-welcome">
        <span class="welcome-emoji">🤖</span>
        <p>你好呀！我是学习小助手~</p>
        <p>有什么想问我的吗？</p>
      </div>
    `;
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  AIChat.init();
});

// ========== 语音对话功能 ==========

const AIVoice = {
  // 语音识别对象
  recognition: null,
  isListening: false,
  currentAudio: null,

  // 初始化语音识别
  init() {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('浏览器不支持语音识别');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    // 识别结果
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      // 更新输入框显示
      const input = document.getElementById('ai-chat-input');
      if (input) input.value = text;

      // 如果是最终结果，自动发送
      if (result.isFinal) {
        this.stopListening();
        if (text.trim()) {
          setTimeout(() => sendAIMessage(), 300);
        }
      }
    };

    // 识别结束
    this.recognition.onend = () => {
      this.stopListening();
    };

    // 识别错误
    this.recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      this.stopListening();

      const statusText = document.getElementById('ai-voice-text');
      if (statusText) {
        if (event.error === 'no-speech') {
          statusText.textContent = '没听到声音，再试一次吧~';
        } else if (event.error === 'not-allowed') {
          statusText.textContent = '请允许使用麦克风哦~';
        } else {
          statusText.textContent = '没听清楚，再说一次~';
        }
      }

      // 2秒后隐藏状态
      setTimeout(() => {
        const status = document.getElementById('ai-voice-status');
        if (status) status.classList.add('hidden');
      }, 2000);
    };

    return true;
  },

  // 开始语音输入
  startListening() {
    if (!this.recognition) {
      if (!this.init()) {
        alert('你的浏览器不支持语音输入，试试用Chrome浏览器吧~');
        return;
      }
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    // 停止当前播放的音频
    this.stopSpeaking();

    try {
      this.recognition.start();
      this.isListening = true;

      // 更新UI
      const btn = document.getElementById('ai-voice-btn');
      const status = document.getElementById('ai-voice-status');
      const statusText = document.getElementById('ai-voice-text');

      if (btn) btn.classList.add('listening');
      if (status) status.classList.remove('hidden');
      if (statusText) statusText.textContent = '正在听你说话...';

    } catch (error) {
      console.error('启动语音识别失败:', error);
    }
  },

  // 停止语音输入
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;

    // 更新UI
    const btn = document.getElementById('ai-voice-btn');
    const status = document.getElementById('ai-voice-status');

    if (btn) btn.classList.remove('listening');
    if (status) status.classList.add('hidden');
  },

  // 朗读文本（使用 Puter.js AI TTS）
  async speak(text) {
    // 先停止之前的播放
    this.stopSpeaking();

    try {
      if (PuterTTS.available()) {
        const audio = await PuterTTS.speak(text);

        this.currentAudio = audio;
        audio.play();

        audio.onended = () => {
          this.currentAudio = null;
        };
      } else {
        // 备选方案：Web Speech API
        this.speakWithWebSpeech(text);
      }
    } catch (error) {
      console.error('TTS失败，使用备选方案:', error);
      this.speakWithWebSpeech(text);
    }
  },

  // 备选语音方案
  speakWithWebSpeech(text) {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  },

  // 停止朗读
  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    speechSynthesis.cancel();
  },

  // 检查是否开启自动朗读
  isAutoSpeakEnabled() {
    const checkbox = document.getElementById('ai-auto-speak');
    return checkbox ? checkbox.checked : true;
  }
};

// 切换语音输入
function toggleVoiceInput() {
  AIVoice.startListening();
}

// 修改发送消息函数，添加自动朗读
const originalSendAIMessage = sendAIMessage;
sendAIMessage = async function() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  // 清空输入
  input.value = '';

  // 添加用户消息到界面
  appendChatMessage('user', message);

  // 显示思考中
  const thinkingEl = showAIThinking();

  // 滚动到底部
  scrollChatToBottom();

  // 获取AI回复
  const response = await AIChat.sendMessage(message);

  // 移除思考中
  if (thinkingEl) thinkingEl.remove();

  // 添加AI回复
  if (response.error) {
    appendChatMessage('ai', response.error, true);
  } else {
    appendChatMessage('ai', response.content);

    // 自动朗读回复
    if (AIVoice.isAutoSpeakEnabled()) {
      AIVoice.speak(response.content);
    }

    // 播放提示音
    if (typeof playSound === 'function') {
      playSound('correct');
    }
  }

  // 滚动到底部
  scrollChatToBottom();
};

// 关闭聊天时停止语音
const originalCloseAIChat = closeAIChat;
closeAIChat = function() {
  AIVoice.stopListening();
  AIVoice.stopSpeaking();
  originalCloseAIChat();
};

// 页面加载时初始化语音
document.addEventListener('DOMContentLoaded', () => {
  AIVoice.init();
});

// 全局暴露
window.AIChat = AIChat;
window.AIVoice = AIVoice;
window.openAIChat = openAIChat;
window.closeAIChat = closeAIChat;
window.sendAIMessage = sendAIMessage;
window.usePresetQuestion = usePresetQuestion;
window.clearAIChat = clearAIChat;
window.startAIModelDownload = startAIModelDownload;
window.toggleVoiceInput = toggleVoiceInput;
