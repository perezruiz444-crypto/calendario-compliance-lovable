// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('No push data received');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.contenido || data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.referencia_id || 'notification',
    data: {
      url: data.url || '/',
      referencia_tipo: data.referencia_tipo,
      referencia_id: data.referencia_id
    },
    requireInteraction: data.tipo === 'urgente' || data.priority === 'high',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.titulo || data.title || 'Nueva notificación',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
