// Dom.io Service Worker
// Enables: offline access, PWA installation, background notification support

const CACHE = 'domio-cache-v2';
const CORE  = ['/', '/index.html'];

// ── Install: cache core files ─────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// ── Fetch: serve from cache, fallback to network ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache HTML pages
        if (response.ok && e.request.destination === 'document') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── Push notifications (future: FCM integration) ──
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'Dom.io 🏠', body: 'Nowe powiadomienie' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon  || '/icon-192.png',
      badge:   data.badge || '/icon-72.png',
      tag:     data.tag   || 'domio',
      data:    data.data  || {},
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click ────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes('domio') || c.url.endsWith('/'));
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});

// ── Message from app (scheduled reminders) ───
self.addEventListener('message', e => {
  if (e.data?.type === 'PING') {
    e.ports[0]?.postMessage({ type: 'PONG', active: true });
  }
});
