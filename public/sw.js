const CACHE_NAME = 'agenda-money-v2';

self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Clear the old "agenda-money-v1" cache that trapped the users in a white screen
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take over all open tabs immediately
    );
});

// Network-First strategy — only for same-origin app-shell/static requests.
// Cross-origin API calls (e.g. GET /api/admin/auth/me on a different
// origin/port than the frontend) must never be intercepted here: a failure
// re-fetching them from the SW thread falls through to the synthetic 503
// below, which silently breaks auth checks even though the real network
// call would have succeeded from the page itself.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (new URL(event.request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If the network succeeds, save a fresh copy to the v2 cache
                return caches.open(CACHE_NAME).then((cache) => {
                    if (networkResponse.ok && event.request.url.startsWith('http')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // Only fall back to cache if the user is completely offline
                return caches.match(event.request).then(response => {
                    if (response) return response;
                    // If no cache match and network failed, we must return a valid Response or let it fail
                    return new Response('Offline and not in cache', { status: 503, statusText: 'Service Unavailable' });
                });
            })
    );
});

// Push Notifications Listener
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: data.url || '/',
        };
        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow(event.notification.data);
        })
    );
});
