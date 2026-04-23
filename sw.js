// Dom.io Service Worker — naprawiona ścieżka dla GitHub Pages
const CACHE = 'domio-cache-v3';
const CORE  = ['/domio/', '/domio/index.html'];
 
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});
 
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});
 
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && e.request.destination === 'document') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/domio/index.html');
        }
      });
    })
  );
});
 
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'Dom.io 🏠', body: 'Nowe powiadomienie' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, tag: data.tag || 'domio', vibrate: [200, 100, 200],
    })
  );
});
 
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(cs => {
      const ex = cs.find(c => c.url.includes('/domio'));
      if (ex) return ex.focus();
      return clients.openWindow('/domio/');
    })
  );
});
