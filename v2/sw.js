// Mon Budget v2 — fonctionnement hors connexion (limité au dossier /v2/)
const CACHE = 'mon-budget-v2-12';
const FILES = ['./', './index.html', './app.js', './views.js', './sync.js', './manifest.webmanifest', '../config.js',
  '../icons/icon-192.png', '../icons/icon-512.png', '../icons/maskable-512.png', '../icons/apple-touch-icon.png', '../icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mon-budget-v2-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const key = e.request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : e.request;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return r; })
    .catch(() => caches.match(key, { ignoreSearch: true })));
});
