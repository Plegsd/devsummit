//navigator.serviceWorker.register('/devsummit/sw.js');
(async () => {
  const cachedResponse = await caches.match(location.href);
  if (!cachedResponse) return;
  const url = new URL(location);
  url.searchParams.set('bypass-sw', '1');
  const freshResponse = await fetch(url);
  if (
    cachedResponse.headers.get('ETag') === freshResponse.headers.get('ETag')
  ) {
    return;
  }
  const cache = await caches.open('dynamic');
  await cache.put(location.href, freshResponse);
  location.reload();
})();
