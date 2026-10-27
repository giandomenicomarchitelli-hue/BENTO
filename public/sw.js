// Service worker minimo: solo Web Push, nessuna cache offline (non è un
// requisito di questa fase - vedi conversazione sul deploy web).

self.addEventListener('push', (event) => {
  let dati = { title: 'Bento', body: '', url: '/notifiche' };
  try {
    dati = { ...dati, ...event.data.json() };
  } catch {
    // payload non JSON: tiene i valori di default sopra
  }

  event.waitUntil(
    self.registration.showNotification(dati.title, {
      body: dati.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: dati.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/notifiche';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      for (const finestra of finestre) {
        if ('focus' in finestra) {
          finestra.navigate(url);
          return finestra.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
