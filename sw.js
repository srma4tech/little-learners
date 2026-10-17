const C='little-learners-v46';
const F=['./?section=alphabets','./?section=numbers','./?section=varnamala','./','index.html','manifest.webmanifest','firebase-config.js','progress-model.js','privacy.html','audio/manifest.json','icon-192.png','icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(C).then(cache=>cache.addAll(F)));
  // Activate immediately only on first install; updates wait for the parent's choice.
  if(!self.registration.active) self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('little-learners-')&&key!==C).map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  // Never intercept Firebase, Google Identity Services, or any other cross-origin request.
  if(url.origin!==self.location.origin) return;
  event.respondWith(
    fetch(request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        void caches.open(C).then(cache=>cache.put(request,copy));
      }
      return response;
    }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html')))
  );
});
