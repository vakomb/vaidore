// Vaidore service worker: tinklas pirmiausia (visada naujausia versija), be ryšio - paskutinė išsaugota kopija.
// Keičiant CACHE pavadinimą, telefonai išmeta seną kopiją. Duomenų bazė ir apmokėjimas (Supabase) - kitas adresas, neliečiami.
const CACHE = "vaidore-v10";
// Santykiniai keliai - veikia ir svetainės šaknyje, ir GitHub Pages poaplankyje (/vaidore/)
const CORE = ["./", "manifest.webmanifest", "favicon.svg", "icons/icon-192.png"];
const HOME = new URL("./", self.registration.scope).href;

self.addEventListener("install", e => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("vaidore-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match(HOME)))
  );
});
