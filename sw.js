const CACHE_NAME = 'kids-learning-v33';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/rewards.js',
  '/js/achievements.js',
  '/js/wrongQuestions.js',
  '/js/dailyCheckin.js',
  '/js/memoryGame.js',
  '/js/learningPet.js',
  '/js/learningReport.js',
  '/js/pictureBook.js',
  '/js/pronunciation.js',
  '/js/aiChat.js',
  '/js/parentNotify.js',
  '/js/videos.js',
  '/js/scienceData.js',
  '/js/puzzle.js',
  '/js/puzzleData.js',
  '/js/drawing.js',
  '/js/music.js',
  '/js/writing.js',
  '/js/analytics.js',
  '/js/lifeSkillsData.js',
  '/js/lifeSkills.js',
  '/js/songData.js',
  '/js/songPractice.js',
  // i18n files
  '/js/i18n.js',
  '/js/locales/en.js',
  '/js/locales/zh.js',
  '/js/locales/ja.js',
  '/js/locales/ko.js',
  '/js/locales/es.js',
  '/js/locales/de.js',
  '/js/locales/fr.js'
];

// 音乐文件列表（大文件，按需缓存）
const musicFiles = [
  '/music/christmas-light-music.mp3',
  '/music/super-relaxing-music.mp3',
  '/music/white-noise-sleep.mp3',
  '/music/orchestral-lullabies.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => {
      // 通知所有客户端有新版本已激活
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// 监听来自页面的消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 音乐文件使用网络优先策略，失败后使用缓存
  if (musicFiles.some(file => url.pathname.endsWith(file.replace('/music/', '')))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 成功获取后缓存
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时使用缓存
          return caches.match(event.request);
        })
    );
    return;
  }

  // 其他资源使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
