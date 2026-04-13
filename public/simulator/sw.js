const CACHE_NAME = 'simulator-pwa-cache-v1';
const urlsToCache = [
  '/simulator/index.html',
  '/simulator/app.html',
  '/css/style.css',
  '/css/index.css',
  '/js/simulator-landing.js',
  '/js/simulator-control.js',
  '/js/auth.js',
  '/js/firebase-config.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          // Fallback offline (jika perlu)
        });
      })
  );
});
