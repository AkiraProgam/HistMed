/* Saúde da família 8.11: HTML obrigatório, recursos auxiliares opcionais.
   Uma atualização aguarda a ação do usuário antes de substituir a versão ativa. */
const PREFIXO='saude-familia-';
const CACHE=PREFIXO+'v8.12';
const ESSENCIAIS=['./','./index.html'];
const OPCIONAIS=['./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(async cache=>{
    await cache.addAll(ESSENCIAIS.map(url=>new Request(url,{cache:'reload'})));
    await Promise.all(OPCIONAIS.map(url=>cache.add(new Request(url,{cache:'reload'})).catch(()=>{})));
  }));
});
self.addEventListener('message',e=>{if(e.data&&e.data.action==='skipWaiting')self.skipWaiting();});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIXO)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
async function fallback(req){
  const cache=await caches.open(CACHE);
  return await cache.match(req,{ignoreSearch:true})||(req.mode==='navigate'?await cache.match('./index.html'):undefined);
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  let timer;
  const network=fetch(req).then(async response=>{
    if(response.ok){try{const cache=await caches.open(CACHE);await cache.put(req,response.clone());}catch(err){}}
    else{const copy=await fallback(req);if(copy)return copy;}
    return response;
  }).catch(async()=>await fallback(req)||Response.error()).finally(()=>clearTimeout(timer));
  const timeout=new Promise(resolve=>{timer=setTimeout(()=>{fallback(req).then(copy=>{if(copy)resolve(copy);}).catch(()=>{});},3000);});
  e.respondWith(Promise.race([network,timeout]));
  e.waitUntil(network.then(()=>{}));
});
