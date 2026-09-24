const CACHE_NAME = 'muslimi-v4';
const URLS_TO_CACHE = [
  './', './index.html',
  './css/styles.css',
  './js/core.js', './js/prayer.js', './js/adhkar.js',
  './js/quran.js', './js/tools.js', './js/main.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
      }
      return res;
    }).catch(() => cached))
  );
});
// ═══════════════════════════════════════════════════════════
// 🔔 دعم الإشعارات في Service Worker
// ═══════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // إذا كان التطبيق مفتوحًا، ركّز عليه
      for (const client of clientList) {
        if (client.url.includes('muslimi') && 'focus' in client) {
          return client.focus();
        }
      }
      // إذا لم يكن مفتوحًا، افتحه
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// دعم الإشعارات الدفعية (مستقبلاً)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'مُسلِمي', {
        body: data.body || '',
        icon: data.icon,
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200]
      })
    );
  } catch (e) {
    console.error(e);
  }
});
