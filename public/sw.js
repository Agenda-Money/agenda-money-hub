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

// Network-First strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

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
                return caches.match(event.request);
            })
    );
});
