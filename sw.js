
const CACHE = 'diario-moto-v8-2-pwa-2';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('diario-moto-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Le pagine HTML vengono aggiornate dalla rete.
  // In assenza di connessione si usa la cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            event.waitUntil(
              caches.open(CACHE).then(cache =>
                cache.put(request, copy)
              )
            );
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match('./index.html') ||
            Response.error()
          );
        })
    );

    return;
  }

  // Per gli altri file: cache prima, rete se assenti.
  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached;

      const response = await fetch(request);

      if (response.ok) {
        const copy = response.clone();

        event.waitUntil(
          caches.open(CACHE).then(cache =>
            cache.put(request, copy)
          )
        );
      }

      return response;
    })
  );
});
