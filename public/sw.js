/* Service worker: cache do "app shell" e de arquivos estáticos.
   Dados (páginas dinâmicas e APIs) sempre vêm da rede para evitar informação desatualizada. */
const CACHE = "equo-nsa-shell-v3";
const PRECACHE = ["/offline", "/icons/icon-192.png", "/brand/symbol-blue-320.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline")));
  }
});
