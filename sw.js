// Ancienne version (v1) retirée : ce service worker se supprime et efface ses copies hors connexion.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => /^mon-budget-v\d+$/.test(k)).map(k => caches.delete(k))))
    .then(() => self.registration.unregister()));
});
