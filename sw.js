// sw.js - AnonMesh PWA Service Worker for Background Notifications
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Handle Background Push Notifications
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'AnonMesh Benachrichtigung', body: event.data.text() };
        }
    }

    const title = data.title || 'AnonMesh Benachrichtigung';
    const options = {
        body: data.body || 'Du hast eine neue Nachricht erhalten.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: data.url || '/'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
