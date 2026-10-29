const C='little-learners-v55',F=['./','index.html','manifest.webmanifest','firebase-config.js','progress-model.js','learning-stage-model.js','content/learning-stages.json','content/grade-1-reading-practice.json','reading-practice.js','home-guide.js','learning-path.js','mobile-back-navigation.js','content/stage-learning-activities.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(u=>c.add(u).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!='GET'||new URL(r.url).origin!=location.origin)return;
e.respondWith(fetch(r).then(x=>{const cp=x.clone();caches.open(C).then(c=>c.put(r,cp));return x}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});
