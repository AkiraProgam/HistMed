/* Service worker do Saúde da família.
   Estratégia: tenta a internet primeiro (sempre a versão mais nova); se estiver offline
   ou demorar mais de 3 s, usa a cópia guardada. Só apaga caches deste app (prefixo próprio). */
const PREFIXO = 'saude-familia-';
const CACHE = PREFIXO + 'v7.6';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ARQUIVOS.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith(PREFIXO) && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(new Promise((resolve) => {
    let feito = false;
    const daCopia = () => caches.match(req, { ignoreSearch: true }).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    const timer = setTimeout(() => { daCopia().then((c) => { if (c && !feito) { feito = true; resolve(c); } }); }, 3000);
    fetch(req.url, { cache: 'no-cache' }).then((r) => {
      clearTimeout(timer);
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      if (!feito) { feito = true; resolve(r); }
    }).catch(() => {
      clearTimeout(timer);
      daCopia().then((c) => { if (!feito) { feito = true; resolve(c || Response.error()); } });
    });
  }));
});
