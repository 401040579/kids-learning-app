// ========== 云端同步模块 (WebDAV) ==========

const CloudSync = {
  // 配置
  config: {
    serverUrl: '',
    username: '',
    password: '',
    remotePath: '/kids-learning-app/',
    enabled: false,
    autoSync: false,
    lastSync: null
  },

  // 需要同步的数据键
  syncKeys: [
    'kidsRewardData',
    'kidsAchievements',
    'kidsWrongQuestions',
    'kidsCheckinData',
    'kidsMemoryGameStats',
    'kidsLearningPet',
    'kidsPictureBookData',
    'kidsPronunciationStats',
    'kidsProfileData',
    'kidsCalendarEvents'
  ],

  // 同步状态
  syncStatus: 'idle', // idle, syncing, success, error
  lastError: null,

  // 初始化
  init() {
    this.loadConfig();
    if (this.config.enabled && this.config.autoSync) {
      this.scheduleAutoSync();
    }
  },

  // 加载配置
  loadConfig() {
    const saved = localStorage.getItem('kidsCloudSyncConfig');
    if (saved) {
      this.config = { ...this.config, ...JSON.parse(saved) };
    }
  },

  // 保存配置
  saveConfig() {
    localStorage.setItem('kidsCloudSyncConfig', JSON.stringify(this.config));
  },

  // 设置服务器配置
  setServerConfig(serverUrl, username, password) {
    this.config.serverUrl = serverUrl.replace(/\/$/, ''); // 移除末尾斜杠
    this.config.username = username;
    this.config.password = password;
    this.saveConfig();
  },

  // 启用/禁用同步
  setEnabled(enabled) {
    this.config.enabled = enabled;
    this.saveConfig();

    if (enabled && this.config.autoSync) {
      this.scheduleAutoSync();
    }
  },

  // 设置自动同步
  setAutoSync(enabled) {
    this.config.autoSync = enabled;
    this.saveConfig();

    if (enabled && this.config.enabled) {
      this.scheduleAutoSync();
    }
  },

  // 测试连接
  async testConnection() {
    if (!this.config.serverUrl) {
      return { success: false, message: '请先配置服务器地址' };
    }

    try {
      const response = await this.makeRequest('PROPFIND', this.config.remotePath, null, {
        'Depth': '0'
      });

      if (response.ok || response.status === 207) {
        return { success: true, message: '连接成功！' };
      } else if (response.status === 404) {
        // 目录不存在，尝试创建
        const createResult = await this.createRemoteDirectory();
        if (createResult.success) {
          return { success: true, message: '连接成功，已创建同步目录！' };
        }
        return createResult;
      } else if (response.status === 401) {
        return { success: false, message: '认证失败，请检查用户名和密码' };
      } else {
        return { success: false, message: `连接失败: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `连接错误: ${error.message}` };
    }
  },

  // 创建远程目录
  async createRemoteDirectory() {
    try {
      const response = await this.makeRequest('MKCOL', this.config.remotePath);
      if (response.ok || response.status === 201) {
        return { success: true, message: '目录创建成功' };
      }
      return { success: false, message: `创建目录失败: ${response.status}` };
    } catch (error) {
      return { success: false, message: `创建目录错误: ${error.message}` };
    }
  },

  // 发送 WebDAV 请求
  async makeRequest(method, path, body = null, extraHeaders = {}) {
    const url = this.config.serverUrl + path;
    const auth = btoa(`${this.config.username}:${this.config.password}`);

    const headers = {
      'Authorization': `Basic ${auth}`,
      ...extraHeaders
    };

    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const options = {
      method,
      headers,
      mode: 'cors'
    };

    if (body) {
      options.body = body;
    }

    return fetch(url, options);
  },

  // 收集所有需要同步的数据
  collectLocalData() {
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    this.syncKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    return data;
  },

  // 应用远程数据到本地
  applyRemoteData(data) {
    this.syncKeys.forEach(key => {
      if (data[key] !== undefined) {
        const value = typeof data[key] === 'object'
          ? JSON.stringify(data[key])
          : data[key];
        localStorage.setItem(key, value);
      }
    });
  },

  // 上传数据到云端
  async uploadToCloud() {
    if (!this.config.enabled) {
      return { success: false, message: '云同步未启用' };
    }

    this.syncStatus = 'syncing';
    this.updateSyncUI();

    try {
      const data = this.collectLocalData();
      const filename = 'backup.json';
      const path = this.config.remotePath + filename;

      const response = await this.makeRequest('PUT', path, data, {
        'Content-Type': 'application/json'
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        this.config.lastSync = new Date().toISOString();
        this.saveConfig();
        this.syncStatus = 'success';
        this.updateSyncUI();
        return { success: true, message: '上传成功！' };
      } else {
        throw new Error(`上传失败: ${response.status}`);
      }
    } catch (error) {
      this.syncStatus = 'error';
      this.lastError = error.message;
      this.updateSyncUI();
      return { success: false, message: error.message };
    }
  },

  // 从云端下载数据
  async downloadFromCloud() {
    if (!this.config.enabled) {
      return { success: false, message: '云同步未启用' };
    }

    this.syncStatus = 'syncing';
    this.updateSyncUI();

    try {
      const filename = 'backup.json';
      const path = this.config.remotePath + filename;

      const response = await this.makeRequest('GET', path);

      if (response.ok) {
        const data = await response.json();
        this.applyRemoteData(data);
        this.config.lastSync = new Date().toISOString();
        this.saveConfig();
        this.syncStatus = 'success';
        this.updateSyncUI();

        // 重新加载各模块数据
        this.reloadModules();

        return { success: true, message: '下载成功！数据已更新。' };
      } else if (response.status === 404) {
        this.syncStatus = 'idle';
        this.updateSyncUI();
        return { success: false, message: '云端没有备份数据' };
      } else {
        throw new Error(`下载失败: ${response.status}`);
      }
    } catch (error) {
      this.syncStatus = 'error';
      this.lastError = error.message;
      this.updateSyncUI();
      return { success: false, message: error.message };
    }
  },

  // 重新加载各模块数据
  reloadModules() {
    // 重新初始化各模块
    if (typeof RewardSystem !== 'undefined') RewardSystem.init();
    if (typeof AchievementSystem !== 'undefined') AchievementSystem.init();
    if (typeof WrongQuestions !== 'undefined') WrongQuestions.init();
    if (typeof DailyCheckin !== 'undefined') DailyCheckin.init();
    if (typeof MemoryGame !== 'undefined') MemoryGame.init();
    if (typeof LearningPet !== 'undefined') LearningPet.init();
    if (typeof PictureBook !== 'undefined') PictureBook.init();
    if (typeof Pronunciation !== 'undefined') Pronunciation.init();
  },

  // 自动同步定时器
  autoSyncTimer: null,

  // 设置自动同步
  scheduleAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    // 每30分钟自动同步一次
    this.autoSyncTimer = setInterval(() => {
      if (this.config.enabled && this.config.autoSync) {
        this.uploadToCloud();
      }
    }, 30 * 60 * 1000);
  },

  // 更新同步UI
  updateSyncUI() {
    const statusEl = document.getElementById('sync-status');
    const lastSyncEl = document.getElementById('last-sync-time');

    if (statusEl) {
      let icon, text;
      switch (this.syncStatus) {
        case 'syncing':
          icon = '🔄';
          text = '同步中...';
          break;
        case 'success':
          icon = '✅';
          text = '同步成功';
          break;
        case 'error':
          icon = '❌';
          text = '同步失败';
          break;
        default:
          icon = '☁️';
          text = '未同步';
      }
      statusEl.innerHTML = `${icon} ${text}`;
    }

    if (lastSyncEl && this.config.lastSync) {
      const date = new Date(this.config.lastSync);
      lastSyncEl.textContent = `上次同步: ${date.toLocaleString('zh-CN')}`;
    }
  },

  // 渲染设置界面
  renderSettingsUI() {
    const container = document.getElementById('cloud-sync-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="sync-settings">
        <div class="sync-header">
          <h3>☁️ 云端同步</h3>
          <div class="sync-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="sync-enabled" ${this.config.enabled ? 'checked' : ''}
                     onchange="toggleCloudSync(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="sync-form ${this.config.enabled ? '' : 'disabled'}">
          <div class="form-group">
            <label>WebDAV 服务器地址</label>
            <input type="url" id="sync-server" value="${this.config.serverUrl}"
                   placeholder="https://dav.jianguoyun.com/dav">
          </div>
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="sync-username" value="${this.config.username}"
                   placeholder="邮箱或用户名">
          </div>
          <div class="form-group">
            <label>密码/应用密码</label>
            <input type="password" id="sync-password" value="${this.config.password}"
                   placeholder="WebDAV 密码">
          </div>

          <div class="sync-actions">
            <button class="btn-save-sync" onclick="saveCloudSyncConfig()">
              💾 保存配置
            </button>
            <button class="btn-test-sync" onclick="testCloudConnection()">
              🔗 测试连接
            </button>
          </div>

          <div class="sync-auto">
            <label>
              <input type="checkbox" id="sync-auto" ${this.config.autoSync ? 'checked' : ''}
                     onchange="toggleAutoSync(this.checked)">
              自动同步（每30分钟）
            </label>
          </div>
        </div>

        <div class="sync-status-area">
          <div id="sync-status" class="sync-status">☁️ 未同步</div>
          <div id="last-sync-time" class="last-sync-time">
            ${this.config.lastSync ? `上次同步: ${new Date(this.config.lastSync).toLocaleString('zh-CN')}` : '从未同步'}
          </div>
        </div>

        <div class="sync-buttons">
          <button class="btn-upload-sync" onclick="uploadToCloud()" ${!this.config.enabled ? 'disabled' : ''}>
            ⬆️ 上传到云端
          </button>
          <button class="btn-download-sync" onclick="downloadFromCloud()" ${!this.config.enabled ? 'disabled' : ''}>
            ⬇️ 从云端恢复
          </button>
        </div>

        <div class="sync-tips">
          <h4>💡 使用说明</h4>
          <ul>
            <li>推荐使用坚果云 WebDAV</li>
            <li>坚果云需要在"账户设置-安全选项"中创建应用密码</li>
            <li>服务器地址格式: https://dav.jianguoyun.com/dav</li>
            <li>上传会覆盖云端数据，下载会覆盖本地数据</li>
          </ul>
        </div>
      </div>
    `;

    this.updateSyncUI();
  }
};

// ========== 全局函数 ==========

function showCloudSync() {
  const modal = document.getElementById('cloud-sync-modal');
  if (!modal) return;

  CloudSync.renderSettingsUI();
  modal.classList.remove('hidden');
}

function closeCloudSync() {
  const modal = document.getElementById('cloud-sync-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function toggleCloudSync(enabled) {
  CloudSync.setEnabled(enabled);
  CloudSync.renderSettingsUI();
}

function toggleAutoSync(enabled) {
  CloudSync.setAutoSync(enabled);
}

function saveCloudSyncConfig() {
  const serverUrl = document.getElementById('sync-server').value.trim();
  const username = document.getElementById('sync-username').value.trim();
  const password = document.getElementById('sync-password').value;

  if (!serverUrl || !username || !password) {
    alert('请填写完整的配置信息');
    return;
  }

  CloudSync.setServerConfig(serverUrl, username, password);
  alert('配置已保存！');
}

async function testCloudConnection() {
  const btn = document.querySelector('.btn-test-sync');
  if (btn) btn.disabled = true;

  const result = await CloudSync.testConnection();
  alert(result.message);

  if (btn) btn.disabled = false;
}

async function uploadToCloud() {
  if (!confirm('确定要上传数据到云端吗？这将覆盖云端已有的备份。')) {
    return;
  }

  const result = await CloudSync.uploadToCloud();
  alert(result.message);
}

async function downloadFromCloud() {
  if (!confirm('确定要从云端恢复数据吗？这将覆盖本地所有数据！')) {
    return;
  }

  const result = await CloudSync.downloadFromCloud();
  alert(result.message);

  if (result.success) {
    // 刷新页面以应用新数据
    location.reload();
  }
}
