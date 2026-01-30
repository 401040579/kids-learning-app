// ========== 国际化系统 ==========

const I18n = {
  currentLang: 'en',
  translations: {},
  supportedLanguages: ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr'],

  languageNames: {
    en: 'English',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français'
  },

  languageCodes: {
    en: 'EN',
    zh: '中',
    ja: '日',
    ko: '한',
    es: 'ES',
    de: 'DE',
    fr: 'FR'
  },

  // 初始化
  init() {
    // 从 localStorage 读取语言设置，默认英语
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang && this.supportedLanguages.includes(savedLang)) {
      this.currentLang = savedLang;
    }

    this.applyTranslations();
    this.initLanguageSelector();
    this.initHeaderDropdown();
    this.updateHtmlLang();

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('lang-dropdown');
      const btn = document.getElementById('header-lang-btn');
      if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  },

  // 获取翻译文本
  t(key, fallback) {
    const translation = this.translations[this.currentLang]?.[key];
    if (translation) return translation;

    // 回退到英语
    if (this.currentLang !== 'en') {
      const enTranslation = this.translations['en']?.[key];
      if (enTranslation) return enTranslation;
    }

    return fallback || key;
  },

  // 设置语言
  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) return;

    this.currentLang = lang;
    localStorage.setItem('appLanguage', lang);
    this.applyTranslations();
    this.updateLanguageSelector();
    this.updateHeaderDropdown();
    this.updateHtmlLang();

    // 关闭下拉菜单
    const dropdown = document.getElementById('lang-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    // 触发语言变化事件，供其他模块监听
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  },

  // 应用翻译到所有带 data-i18n 属性的元素
  applyTranslations() {
    // 更新浏览器标题
    const appTitle = this.t('app.fullTitle');
    if (appTitle && appTitle !== 'app.fullTitle') {
      document.title = appTitle;
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);

      // 处理 placeholder 属性
      if (el.hasAttribute('data-i18n-placeholder')) {
        el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
      }

      // 处理 title 属性
      if (el.hasAttribute('data-i18n-title')) {
        el.title = this.t(el.getAttribute('data-i18n-title'));
      }

      // 设置文本内容
      if (translation && translation !== key) {
        el.textContent = translation;
      }
    });

    // 更新 placeholder 属性
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // 更新 title 属性
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  },

  // 初始化个人信息页面语言选择器
  initLanguageSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return;

    selector.innerHTML = '';

    this.supportedLanguages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'lang-btn' + (lang === this.currentLang ? ' active' : '');
      btn.setAttribute('data-lang', lang);
      btn.textContent = this.languageNames[lang];
      btn.onclick = () => this.setLanguage(lang);
      selector.appendChild(btn);
    });
  },

  // 初始化顶部语言下拉菜单
  initHeaderDropdown() {
    this.updateHeaderDropdown();
  },

  // 更新顶部语言下拉菜单状态
  updateHeaderDropdown() {
    // 更新当前语言代码显示
    const codeEl = document.getElementById('current-lang-code');
    if (codeEl) {
      codeEl.textContent = this.languageCodes[this.currentLang];
    }

    // 更新下拉菜单选项的 active 状态
    const dropdown = document.getElementById('lang-dropdown');
    if (dropdown) {
      dropdown.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-lang') === this.currentLang);
      });
    }
  },

  // 更新个人信息页面语言选择器状态
  updateLanguageSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return;

    selector.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
    });
  },

  // 更新 HTML lang 属性
  updateHtmlLang() {
    const langMap = {
      en: 'en',
      zh: 'zh-CN',
      ja: 'ja',
      ko: 'ko',
      es: 'es',
      de: 'de',
      fr: 'fr'
    };
    document.documentElement.lang = langMap[this.currentLang] || 'en';
  },

  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLang;
  },

  // 获取当前语言名称
  getCurrentLanguageName() {
    return this.languageNames[this.currentLang];
  }
};

// 快捷函数
function t(key, fallback) {
  return I18n.t(key, fallback);
}

// 切换语言下拉菜单
function toggleLanguageDropdown() {
  const dropdown = document.getElementById('lang-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// 选择语言
function selectLanguage(lang) {
  I18n.setLanguage(lang);
}
