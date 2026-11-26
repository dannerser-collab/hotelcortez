// Service worker de Hotel Cortéz: caché de la interfaz (no de datos) y notificaciones push.
const CACHE = 'hc-v3';
const BASE = ['/', '/manifest.webmanifest', '/logo-cortez.png', '/logo-cortez-03.png', '/icono-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // La API y las fotos nunca se cachean: siempre datos reales
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  // Archivos con hash (assets): primero caché, si no la red
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && url.pathname.startsWith('/assets/')) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
      return resp;
    }))
  );
});

self.addEventListener('push', e => {
  let d = { titulo: 'Hotel Cortéz', cuerpo: 'Tienes una novedad', url: '/' };
  try { d = { ...d, ...e.data.json() }; } catch (_) { /* aviso sin datos */ }
  e.waitUntil(self.registration.showNotification(d.titulo, { body: d.cuerpo, icon: '/icono-192.png', badge: '/icono-192.png', data: { url: d.url }, vibrate: [200, 100, 200] }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => 'focus' in x);
    return w ? w.navigate(url).then(x => x && x.focus()) : self.clients.openWindow(url);
  }));
});
