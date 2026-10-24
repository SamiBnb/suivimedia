const V = 'suivi-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Fichiers de l'appli : réseau d'abord (mises à jour immédiates), cache si hors ligne
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
    return;
  }

  // Polices et scripts Firebase : cache puis mise à jour en arrière-plan
  if (/(^|\.)gstatic\.com$|(^|\.)fonts\.googleapis\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.open(V).then(c => c.match(r).then(m => {
        const f = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m);
        return m || f;
      }))
    );
  }
  // Les API (AniList, TMDB, RAWG, Firestore…) ne sont jamais mises en cache.
});
