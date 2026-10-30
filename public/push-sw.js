/* SmartClinic Service Worker Web Push & Notification Click Handler */
/* Strict Lock-Screen Privacy: Never renders confidential clinical notes or diagnoses */

self.addEventListener('push', (event) => {
  let payload = {
    title: "It's Your Turn!",
    body: 'Clinic staff is ready for you. Please proceed to the designated clinic room.',
    tag: 'smartclinic-queue-call',
    url: '/?tab=dashboard&queueCall=1',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
          tag: parsed.tag || payload.tag,
          url: parsed.url || payload.url,
        };
      }
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const options = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url,
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?tab=dashboard&queueCall=1';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'SMARTCLINIC_NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
