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
    // Qwen2.5-0.5B（中文更好，约350MB）
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
        import * as webllm from 'https://esm.run/@mlc-ai/web-llm';
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
      localStorage.setItem('aiChatEnabled', 'true');

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
  async checkModelCached() {
    try {
      const dbs = await indexedDB.databases();
      return dbs.some(db => db.name && db.name.includes('webllm'));
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

// 全局暴露
window.AIChat = AIChat;
window.openAIChat = openAIChat;
window.closeAIChat = closeAIChat;
window.sendAIMessage = sendAIMessage;
window.usePresetQuestion = usePresetQuestion;
window.clearAIChat = clearAIChat;
window.startAIModelDownload = startAIModelDownload;
