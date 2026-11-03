/* Service worker: la app funciona sin conexión.
   Sube VERSION cada vez que cambies archivos de la app. */
const VERSION = "v15";
const SHELL = `santos-shell-${VERSION}`;
const IMGS = `santos-img-${VERSION}`;
const FILES = [
  "./", "index.html", "css/app.css", "js/app.js", "data/santos.js", "data/retos.js", "data/imagenes.js",
  "manifest.webmanifest", "assets/brush.png", "icons/icon-192.png", "icons/icon-512.png",
  "fonts/outfit-latin.woff2", "fonts/outfit-latin-ext.woff2", "fonts/grenze-latin.woff2", "fonts/grenze-latin-ext.woff2",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== IMGS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("/img/santos/")) { // imágenes: de la caché, y si no, de la red y se guardan
    e.respondWith(caches.open(IMGS).then((c) => c.match(e.request).then((r) => r || fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  // resto: red primero (para recibir novedades), caché si no hay conexión
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then((c) => c.put(e.request, cp)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
});
