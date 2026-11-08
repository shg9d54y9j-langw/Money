const CACHE = 'money-v2';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'cloud.js', 'firebase-config.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const host = new URL(e.request.url);
  if (host.origin !== location.origin && host.hostname !== 'www.gstatic.com') return; // Firebase-API direkt, nicht über den Service Worker
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const url = new URL(e.request.url);
        // Eigene Dateien und das Firebase-SDK zwischenspeichern (offline nutzbar), keine API-Aufrufe
        if (res.ok && (url.origin === location.origin || url.hostname === 'www.gstatic.com')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
