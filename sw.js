/* ===========================================================
   sw.js — Service worker for offline support
   Strategy: app shell cached on install, content cached on first
   fetch (network-first w/ cache fallback) so updates roll out
   when online but full functionality available offline.
   =========================================================== */

const VERSION = 'v1.1.0';
const APP_CACHE = `tagme-app-${VERSION}`;
const CONTENT_CACHE = `tagme-content-${VERSION}`;

// App shell — version-bumping the SW will refresh these
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/app.js',
  'js/db.js',
  'js/content.js',
  'js/view-home.js',
  'js/view-sections.js',
  'js/view-mode-picker.js',
  'js/view-browse.js',
  'js/view-flashcards.js',
  'js/view-quiz.js',
  'js/view-review.js',
  'js/view-progress.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== CONTENT_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Content files: network-first so they update when online
  if (url.pathname.includes('/content/')) {
    event.respondWith(networkFirst(req, CONTENT_CACHE));
    return;
  }

  // App shell + everything else: cache-first
  event.respondWith(cacheFirst(req, APP_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Last-ditch: return index for navigation requests
    if (req.mode === 'navigate') {
      const fallback = await cache.match('index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}
