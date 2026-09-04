/* TrackPort service worker
 * The HTML version remains the single release number to edit.
 * Navigations use the network first so a newly uploaded HTML file is picked
 * up without asking users to clear browser or app data.
 */
const TRACKPORT_CACHE = 'trackport-runtime-v6';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(TRACKPORT_CACHE)
      .then(cache => cache.add('./'))
      .catch(() => undefined)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('trackport-') && key !== TRACKPORT_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isVersionProbe = url.searchParams.has('tp_version_probe');
  const isNavigation = request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');

  if(isVersionProbe){
    event.respondWith(fetch(request, {cache:'no-store'}));
    return;
  }

  if(isNavigation){
    event.respondWith(
      fetch(request, {cache:'no-store'})
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(TRACKPORT_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if(response.ok){
          const copy = response.clone();
          caches.open(TRACKPORT_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }))
  );
});
