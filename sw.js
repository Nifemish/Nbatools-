const CACHE='trackport-shell-v1';
const APP='./index.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.add(APP)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  event.respondWith(fetch(req).then(res=>{
    if(res.ok && new URL(req.url).origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  }).catch(()=>caches.match(req).then(r=>r||caches.match(APP))));
});
