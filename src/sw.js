const files = SW_ASSET_LIST;
const urls = new Set(files.map(f => new URL(f, location).href));
const cacheName = 'dynamic';

addEventListener('install', event => {
  skipWaiting();

  event.waitUntil(
    (async () => {
      const toCache = new Set([
        ...files.filter(f => /\.(svg|js)$/.test(f)),
        //...files.filter(f => f.startsWith('/devsummit/assets/speakers/')),
        //...files.filter(f => f.startsWith('/devsummit/sessions/')),
        '/devsummit/',
        //'/devsummit/schedule/',
        '/devsummit/offline/',
      ]);
      const cache = await caches.open(cacheName);
      await cache.addAll([...toCache]);
    })(),
  );
});

addEventListener('activate', event => {
  clients.claim();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);

      for (const request of await cache.keys()) {
        if (!urls.has(request.url)) {
          cache.delete(request);
        }
      }

      for (const key of await caches.keys()) {
        if (key !== cacheName) await caches.delete(key);
      }
    })(),
  );
});

addEventListener('fetch', event => {
  if (!urls.has(event.request.url)) return;
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;
      let response;
      try {
        response = await fetch(event.request);
      } catch (err) {
        return caches.match('/devsummit/offline/');
      }
      const cache = await caches.open(cacheName);
      cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
