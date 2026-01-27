// ========== 歌曲数据 ==========

const SongData = {
  songs: [
    {
      id: 'new-year-rap',
      title: '新年歌 RAP',
      author: 'Chris Huang 曲词',
      emoji: '🧧',
      lyrics: [
        { chinese: '新 年 好  新 年 妙', pinyin: 'Xīn nián hǎo  xīn nián miào', group: 'black' },
        { chinese: '新 春 好 运 呱 呱 叫', pinyin: 'Xīn chūn hǎo yùn guā guā jiào', group: 'black' },
        { chinese: '穿 新 衣  戴 新 帽', pinyin: 'Chuān xīn yī  dài xīn mào', group: 'blue' },
        { chinese: '我 们 都 是 好 宝 宝', pinyin: 'Wǒ men dōu shì hǎo bǎo bǎo', group: 'both', groups: ['black', 'blue'] },
        { chinese: '贺 新 年  祝 新 年', pinyin: 'Hè xīn nián  zhù xīn nián', group: 'black' },
        { chinese: '家 家 户 户 庆 团 圆', pinyin: 'Jiā jiā hù hù qìng tuán yuán', group: 'black' },
        { chinese: '放 鞭 炮  吃 年 糕', pinyin: 'Fàng biān pào  chī nián gāo', group: 'blue' },
        { chinese: '好 玩 好 吃 不 可 少', pinyin: 'Hǎo wán hǎo chī bù kě shǎo', group: 'both', groups: ['black', 'blue'] },
        { chinese: '祝 你 财 源 滚 滚 好 运 到', pinyin: 'Zhù nǐ cái yuán gǔn gǔn hǎo yùn dào', group: 'black' },
        { chinese: '祝 你 健 健 康 康 身 体 好', pinyin: 'Zhù nǐ jiàn jiàn kāng kāng shēn tǐ hǎo', group: 'blue' },
        { chinese: '祝 你 鼠 牛 虎 兔', pinyin: 'Zhù nǐ shǔ niú hǔ tù', group: 'red' },
        { chinese: '龙 蛇 马 羊', pinyin: 'Lóng shé mǎ yáng', group: 'red' },
        { chinese: '猴 鸡 狗 猪', pinyin: 'Hóu jī gǒu zhū', group: 'red' },
        { chinese: '年 年 没 烦 恼', pinyin: 'Nián nián méi fán nǎo', group: 'red' },
        { chinese: '祝 你 一 元 复 始', pinyin: 'Zhù nǐ yī yuán fù shǐ', group: 'black' },
        { chinese: '两 全 其 美', pinyin: 'Liǎng quán qí měi', group: 'black' },
        { chinese: '三 阳 开 泰', pinyin: 'Sān yáng kāi tài', group: 'black' },
        { chinese: '四 季 平 安', pinyin: 'Sì jì píng ān', group: 'black' },
        { chinese: '五 福 临 门', pinyin: 'Wǔ fú lín mén', group: 'black' },
        { chinese: '六 六 大 顺', pinyin: 'Liù liù dà shùn', group: 'blue' },
        { chinese: '七 星 高 照', pinyin: 'Qī xīng gāo zhào', group: 'blue' },
        { chinese: '八 面 威 风', pinyin: 'Bā miàn wēi fēng', group: 'blue' },
        { chinese: '九 九 重 阳', pinyin: 'Jiǔ jiǔ chóng yáng', group: 'blue' },
        { chinese: '十 全 十 美', pinyin: 'Shí quán shí měi', group: 'blue' },
        { chinese: '百 事 可 乐', pinyin: 'Bǎi shì kě lè', group: 'red' },
        { chinese: '千 事 吉 祥', pinyin: 'Qiān shì jí xiáng', group: 'red' },
        { chinese: '万 事 如 意', pinyin: 'Wàn shì rú yì', group: 'red' },
        { chinese: '亿 万 家 财', pinyin: 'Yì wàn jiā cái', group: 'red' },
        { chinese: '红 包 拿 来', pinyin: 'Hóng bāo ná lái', group: 'red' }
      ]
    }
  ],

  // 分组配置
  groups: {
    black: { name: '黑组', color: '#333333', bgColor: '#f5f5f5', emoji: '⬛' },
    blue: { name: '蓝组', color: '#2196F3', bgColor: '#E3F2FD', emoji: '🔵' },
    red: { name: '红组', color: '#E53935', bgColor: '#FFEBEE', emoji: '🔴' }
  }
};
