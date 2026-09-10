const TRACKPORT_CACHE = 'trackport-shell-v1.13.2';

self.addEventListener('install', () => {
  // Keep the new worker waiting so the app's update button can activate it.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('trackport-shell-') && key !== TRACKPORT_CACHE)
          .map(key => caches.delete(key))
      ))
    ])
  );
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if(response.ok){
          const copy = response.clone();
          caches.open(TRACKPORT_CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./')))
  );
});