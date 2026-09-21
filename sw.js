const CACHE='trackport-shell-v2';
const CORE=['/','/index.html','/manifest.webmanifest','/trackport-icon-192.png','/trackport-icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  event.respondWith(
    fetch(req).then(res=>{
      if(res.ok && new URL(req.url).origin===location.origin){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('/index.html')))
  );
});
