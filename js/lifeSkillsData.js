// ========== 生活技能模块数据 ==========

const LifeSkillsData = {
  // 时钟数据
  clock: {
    // 整点
    hour: {
      name: '整点',
      points: 10,
      times: [
        { hour: 1, minute: 0 },
        { hour: 2, minute: 0 },
        { hour: 3, minute: 0 },
        { hour: 4, minute: 0 },
        { hour: 5, minute: 0 },
        { hour: 6, minute: 0 },
        { hour: 7, minute: 0 },
        { hour: 8, minute: 0 },
        { hour: 9, minute: 0 },
        { hour: 10, minute: 0 },
        { hour: 11, minute: 0 },
        { hour: 12, minute: 0 }
      ]
    },
    // 半点
    halfHour: {
      name: '半点',
      points: 15,
      times: [
        { hour: 1, minute: 30 },
        { hour: 2, minute: 30 },
        { hour: 3, minute: 30 },
        { hour: 4, minute: 30 },
        { hour: 5, minute: 30 },
        { hour: 6, minute: 30 },
        { hour: 7, minute: 30 },
        { hour: 8, minute: 30 },
        { hour: 9, minute: 30 },
        { hour: 10, minute: 30 },
        { hour: 11, minute: 30 },
        { hour: 12, minute: 30 }
      ]
    },
    // 刻钟
    quarter: {
      name: '刻钟',
      points: 20,
      times: [
        { hour: 1, minute: 15 },
        { hour: 1, minute: 45 },
        { hour: 2, minute: 15 },
        { hour: 2, minute: 45 },
        { hour: 3, minute: 15 },
        { hour: 3, minute: 45 },
        { hour: 4, minute: 15 },
        { hour: 4, minute: 45 },
        { hour: 5, minute: 15 },
        { hour: 5, minute: 45 },
        { hour: 6, minute: 15 },
        { hour: 6, minute: 45 },
        { hour: 7, minute: 15 },
        { hour: 7, minute: 45 },
        { hour: 8, minute: 15 },
        { hour: 8, minute: 45 },
        { hour: 9, minute: 15 },
        { hour: 9, minute: 45 },
        { hour: 10, minute: 15 },
        { hour: 10, minute: 45 },
        { hour: 11, minute: 15 },
        { hour: 11, minute: 45 },
        { hour: 12, minute: 15 },
        { hour: 12, minute: 45 }
      ]
    }
  },

  // 钱币数据
  money: {
    rmb: {
      name: '人民币',
      symbol: '¥',
      flag: '🇨🇳',
      coins: [
        { value: 0.1, name: '1角', emoji: '🪙', color: '#C0C0C0' },
        { value: 0.5, name: '5角', emoji: '🪙', color: '#FFD700' },
        { value: 1, name: '1元', emoji: '🪙', color: '#FFD700' }
      ],
      bills: [
        { value: 1, name: '1元', color: '#8B7355' },
        { value: 5, name: '5元', color: '#9370DB' },
        { value: 10, name: '10元', color: '#4169E1' },
        { value: 20, name: '20元', color: '#CD853F' },
        { value: 50, name: '50元', color: '#2E8B57' },
        { value: 100, name: '100元', color: '#DC143C' }
      ]
    },
    usd: {
      name: '美元',
      symbol: '$',
      flag: '🇺🇸',
      coins: [
        { value: 0.01, name: '1美分', emoji: '🪙', color: '#CD7F32' },
        { value: 0.05, name: '5美分', emoji: '🪙', color: '#C0C0C0' },
        { value: 0.10, name: '10美分', emoji: '🪙', color: '#C0C0C0' },
        { value: 0.25, name: '25美分', emoji: '🪙', color: '#C0C0C0' },
        { value: 1, name: '1美元', emoji: '🪙', color: '#FFD700' }
      ],
      bills: [
        { value: 1, name: '$1', color: '#228B22' },
        { value: 5, name: '$5', color: '#228B22' },
        { value: 10, name: '$10', color: '#228B22' },
        { value: 20, name: '$20', color: '#228B22' }
      ]
    }
  },

  // 钱币游戏类型
  moneyGameTypes: {
    identify: { name: '认识面值', points: 10, icon: '👀' },
    count: { name: '数钱', points: 15, icon: '🧮' },
    make: { name: '凑钱', points: 20, icon: '💰' }
  },

  // 日历数据
  calendar: {
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    weekdaysFull: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    seasons: [
      { name: '春天', months: [3, 4, 5], emoji: '🌸' },
      { name: '夏天', months: [6, 7, 8], emoji: '☀️' },
      { name: '秋天', months: [9, 10, 11], emoji: '🍂' },
      { name: '冬天', months: [12, 1, 2], emoji: '❄️' }
    ],
    holidays: [
      { name: '元旦', month: 1, day: 1, emoji: '🎉' },
      { name: '情人节', month: 2, day: 14, emoji: '💕' },
      { name: '妇女节', month: 3, day: 8, emoji: '👩' },
      { name: '植树节', month: 3, day: 12, emoji: '🌳' },
      { name: '愚人节', month: 4, day: 1, emoji: '🤡' },
      { name: '劳动节', month: 5, day: 1, emoji: '👷' },
      { name: '母亲节', month: 5, day: 12, emoji: '👩‍👧' },
      { name: '儿童节', month: 6, day: 1, emoji: '🎈' },
      { name: '父亲节', month: 6, day: 16, emoji: '👨‍👧' },
      { name: '建党节', month: 7, day: 1, emoji: '🎊' },
      { name: '建军节', month: 8, day: 1, emoji: '🎖️' },
      { name: '教师节', month: 9, day: 10, emoji: '👨‍🏫' },
      { name: '国庆节', month: 10, day: 1, emoji: '🇨🇳' },
      { name: '万圣节', month: 10, day: 31, emoji: '🎃' },
      { name: '感恩节', month: 11, day: 28, emoji: '🦃' },
      { name: '圣诞节', month: 12, day: 25, emoji: '🎄' }
    ]
  },

  // 日历问题类型
  calendarQuestionTypes: {
    date: { name: '今天几号', points: 10, icon: '📅' },
    weekday: { name: '星期几', points: 15, icon: '📆' },
    season: { name: '月份季节', points: 15, icon: '🌸' },
    holiday: { name: '节日', points: 20, icon: '🎉' }
  },

  // 生活技能子模块
  modules: [
    { id: 'clock', name: '认识时钟', icon: '🕐', desc: '整点半点刻钟' },
    { id: 'money', name: '认识钱币', icon: '💰', desc: '人民币美元' },
    { id: 'calendar', name: '认识日历', icon: '📅', desc: '日期星期节日' }
  ]
};
