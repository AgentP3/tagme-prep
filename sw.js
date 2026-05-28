/* ===========================================================
   sw.js — Service worker for offline support
   Strategy: app shell AND all content cached on install.
   Everything works offline from first launch. To roll out
   updates, bump the VERSION constant below — installed copies
   will detect the change and refresh their caches.
   =========================================================== */

const VERSION = 'v1.0.1';
const CACHE = `tagme-${VERSION}`;

// Everything the app needs, cached up front
const ASSETS = [
  // App shell
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
  // Icons
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
  // Content — pre-cached so app is fully offline from first launch
  'content/index.json',
  'content/doc1-residency-cpr.json',
  'content/doc2-fellowship-cpr.json',
  'content/doc3-institutional.json',
  'content/doc4-ads-guides.json',
  'content/doc5-policies.json',
  'content/doc6-nst-recognition.json',
  'content/doc7-ecfmg.json',
  'content/doc8-nrmp.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  // Activate the new worker immediately rather than waiting for all tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    // Cache any successful same-origin response we fetch on the fly
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Last-ditch: serve index.html for navigation requests so the SPA loads
    if (req.mode === 'navigate') {
      const fallback = await cache.match('index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}
