// @contexto HANDOFF.md §2b punto 6 (push del navegador) · api-peon/src/push.ts (CargaPush)
/**
 * sw.js — service worker de Peón en Marcha. SOLO notificaciones push (Web Push/VAPID): no cachea ni intercepta
 * peticiones. La API manda { titulo, cuerpo, enlace, tag } cifrado; aquí se muestra la notificación del sistema y,
 * al tocarla, se enfoca (o se abre) la app y se le pide seguir el `enlace` (noticia, ficha, chat…).
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titulo: 'Peón en Marcha', cuerpo: e.data ? e.data.text() : '' };
  }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Peón en Marcha', {
    body: d.cuerpo || '',
    icon: './assets/logo-192.png',
    badge: './assets/logo-96.png',
    tag: d.tag || undefined,
    lang: 'es-CO',
    data: { enlace: d.enlace || null },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const enlace = e.notification.data && e.notification.data.enlace;
  const destino = new URL(enlace ? `./?ir=${encodeURIComponent(enlace)}` : './', self.registration.scope).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = ventanas.find((c) => c.url.startsWith(self.registration.scope));
    if (abierta) {
      await abierta.focus();
      if (enlace) abierta.postMessage({ tipo: 'peon:ir', enlace });
      return;
    }
    await self.clients.openWindow(destino);
  })());
});
