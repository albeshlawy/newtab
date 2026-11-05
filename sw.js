/* Glass New Tab — offline support */
const CACHE='glass-newtab-v1';
const ASSETS='glass-newtab-assets-v1';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./newtab.html'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==ASSETS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
function timeout(ms,p){ return new Promise((res,rej)=>{ const t=setTimeout(()=>rej(new Error('timeout')),ms); p.then(v=>{clearTimeout(t);res(v);},e=>{clearTimeout(t);rej(e);}); }); }
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // The page itself: network first (fresh version), fall back to cache when offline
  if(req.mode==='navigate' || (url.origin===location.origin && url.pathname.endsWith('.html'))){
    e.respondWith(
      timeout(4000,fetch(req)).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put('./newtab.html',cp)); return r; })
        .catch(()=>caches.match('./newtab.html'))
    );
    return;
  }
  // Icons, fonts, background images: serve from cache, refresh in background
  if(['image','font','style'].includes(req.destination)){
    e.respondWith(caches.open(ASSETS).then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(r=>{ if(r && (r.ok||r.type==='opaque')) c.put(req,r.clone()); return r; }).catch(()=>hit);
      return hit||net;
    }));
  }
});
