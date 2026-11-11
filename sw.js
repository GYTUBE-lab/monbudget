// Mon Budget — service worker : fonctionnement hors connexion
// Réseau d'abord (mises à jour automatiques), copie locale si pas de connexion.
const CACHE = 'mon-budget-v47';
const FILES = ['./', './index.html', './config.js', './drive-sync.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Google Drive : jamais mis en cache
  const v2 = new URL('./v2/', self.registration.scope).pathname;
  if (url.pathname.startsWith(v2) || url.pathname + '/' === v2) return; // la v2 a son propre fonctionnement hors connexion
  const cacheKey = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(cacheKey, copy)); } return r; })
      .catch(() => caches.match(cacheKey, { ignoreSearch: true }))
  );
});
