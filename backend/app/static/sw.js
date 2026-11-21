const CACHE_NAME = 'truthlens-pwa-v1';
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('PWA core asset cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For API endpoints, prefer fresh network; do not cache POST requests
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') {
    return;
  }

  // Network-first for main document HTML to ensure fresh app updates
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match('/') || caches.match(req))
    );
    return;
  }

  // Stale-while-revalidate for static assets (icons, manifest, etc.)
  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
