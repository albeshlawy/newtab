/* Glass New Tab — offline support (fast: cache first, refresh in background) */
const CACHE='glass-newtab-v5';
const ASSETS='glass-newtab-assets-v5';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./newtab.html'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==ASSETS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // The page: show the saved copy instantly, fetch the newest version in the background for next time
  if(req.mode==='navigate' || (url.origin===location.origin && url.pathname.endsWith('.html'))){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match('./newtab.html');
      const net=fetch(req.url,{cache:'no-store',credentials:'same-origin'}).then(r=>{ if(r&&r.ok) c.put('./newtab.html',r.clone()); return r; });
      if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
      return net.catch(()=>new Response('Offline',{status:503}));
    }));
    return;
  }
  // Icons, backgrounds, fonts and font stylesheets: from cache, refresh in background
  const d=req.destination;
  if(d==='image'||d==='font'||d==='style'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(ASSETS).then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(r=>{ if(r && (r.ok||r.type==='opaque')) c.put(req,r.clone()); return r; }).catch(()=>hit);
      if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
      return net;
    }));
  }
});
