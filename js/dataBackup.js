// 本机完整备份。仅操作登记过的应用键，不导出同源第三方凭据或清空整个 origin。
const DataBackup = {
  APP: 'kids-learning-app',
  VERSION: 2,
  OBJECT_KEYS: [
    'kidsProfileData', 'kidsLearningData', 'kidsCalendarData', 'kidsAchievements',
    'kidsWrongQuestions', 'kidsDailyCheckin', 'kidsMemoryGameStats', 'kidsLearningPet',
    'kidsPictureBookData', 'kidsPronunciationStats', 'kidsEnglishBoost', 'kidsChoreTracker',
    'kidsBirthdayParty', 'kidsToothFairy', 'kidsLogicGames', 'kidsReactionGames',
    'kidsDrawSmash', 'kidsRagdollRobot', 'lifeSkillsStats', 'mathGameConfig',
    'parentNotifyConfig', 'writingProgress', 'petGamesStats', 'videoWhitelistCache', 'kidsFamilyPK'
  ],
  ARRAY_KEYS: ['artworkGallery', 'musicCompositions', 'recentlyUsed'],
  TEXT_KEYS: ['appLanguage', 'aiChatEnabled', 'sleepMusicTimer'],
  CLOUD_EXCLUDED: ['parentNotifyConfig', 'videoWhitelistCache'],

  keys() { return [...this.OBJECT_KEYS, ...this.ARRAY_KEYS, ...this.TEXT_KEYS]; },

  create() {
    const entries = {};
    for (const key of this.keys()) {
      const raw = AppStorage.getItem(key);
      if (raw !== null) entries[key] = raw;
    }
    // 原文导出也保留损坏的 JSON，便于恢复；导入时严格校验，不能把坏数据带到另一台设备。
    return { app: this.APP, version: this.VERSION, exportedAt: new Date().toISOString(), entries };
  },

  createLearning() {
    const backup = this.create();
    backup.scope = 'learning';
    this.CLOUD_EXCLUDED.forEach(key => { delete backup.entries[key]; });
    return backup;
  },

  prepare(payload) {
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!object(payload)) throw Error('备份格式不正确');
    let entries, complete;
    if (payload.version === '1.0' && object(payload.data)) {
      entries = {};
      for (const [old, key] of Object.entries({ profile: 'kidsProfileData', learning: 'kidsLearningData', calendar: 'kidsCalendarData' })) {
        if (Object.hasOwn(payload.data, old)) entries[key] = JSON.stringify(payload.data[old]);
      }
      if (!Object.keys(entries).length) throw Error('旧版备份没有可恢复的数据');
      complete = false;
    } else if (payload.app === this.APP && payload.version === this.VERSION && object(payload.entries)) {
      if (payload.scope !== undefined && payload.scope !== 'learning') throw Error('不支持的备份范围');
      entries = payload.entries;
      complete = payload.scope !== 'learning';
    } else throw Error('不支持的备份版本或文件类型');

    const allowed = new Set(this.keys());
    for (const [key, raw] of Object.entries(entries)) {
      if (!allowed.has(key) || typeof raw !== 'string') throw Error('备份包含未知记录：' + key);
      if (payload.scope === 'learning' && this.CLOUD_EXCLUDED.includes(key)) throw Error('学习备份不能包含通知配置或视频缓存');
      if (this.TEXT_KEYS.includes(key)) continue;
      let parsed;
      try {
        parsed = JSON.parse(raw, (name, value) => {
          if (['__proto__', 'constructor', 'prototype'].includes(name)) throw Error('非法字段');
          return value;
        });
      } catch { throw Error('备份中的记录已损坏：' + key); }
      if (this.ARRAY_KEYS.includes(key) ? !Array.isArray(parsed) : !object(parsed)) {
        throw Error('备份中的记录类型不正确：' + key);
      }
    }
    return { entries: { ...entries }, complete };
  },

  restore(payload) {
    const prepared = this.prepare(payload);
    const keys = prepared.complete ? this.keys() : Object.keys(prepared.entries);
    const previous = new Map(keys.map(key => [key, AppStorage.getItem(key)]));
    try {
      // 此处不用 safeSetItem 的自动淘汰策略，避免导入失败时误删其他作品。
      // 先释放被替换记录所占的空间；失败则移除本次写入，再恢复原值。
      keys.forEach(key => AppStorage.removeItem(key));
      Object.entries(prepared.entries).forEach(([key, raw]) => AppStorage.setItem(key, raw));
    } catch (error) {
      try {
        keys.forEach(key => AppStorage.removeItem(key));
        previous.forEach((raw, key) => { if (raw !== null) AppStorage.setItem(key, raw); });
      } catch {
        throw Error('恢复未完成，旧记录也未能全部还原。请保留备份文件，暂时不要继续学习。');
      }
      throw Error('导入失败，原有记录已还原。请检查设备存储空间。');
    }
    return Object.keys(prepared.entries).length;
  }
};
