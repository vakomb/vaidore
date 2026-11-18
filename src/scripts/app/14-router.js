// 14 – maršrutai (tikri adresai, History API): „“ (Pradžia), kvepalai, moterims, vyrams, unisex, meginukai,
// kategorija/<id>, kvepalai/<id>, bestselleriai, nuolaidos, krepselis, megstami, paskyra, admin, pagalba, apie-mus,
// atsiliepimai, verslui, naujienlaiskis (atsisakymas), testas, rinkinys.
// Kiekvienam adresui build-site.mjs sukuria statinį HTML (paieškos sistemoms); nežinomus adresus aptarnauja 404.html –
// ta pati programėlė, kuri pati nusprendžia, ką rodyti (pvz. naujas kvapas, pridėtas administravimo skydelyje).
// Seni adresai #/… (iki v3) nukreipiami į naujus.
const ui = { view: null, path: null };
const STATIC_PAGES = new Set(["salygos", "privatumas", "aciu"]);
const OLD_HASH = { "#/": "", "#/katalogas": "kvepalai", "#/megstami": "megstami", "#/krepselis": "krepselis", "#/info": "pagalba", "#/testas": "testas", "#/rinkinys": "rinkinys" };

function currentPath() {
  let p = decodeURIComponent(location.pathname);
  p = p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) : p.replace(/^\//, "");
  return p.replace(/\.html$/, "").replace(/\/+$/, "").replace(/^index$/, "");
}
function matchRoute(path) {
  if (path === "") return { view: "home" };
  if (["kvepalai", "difuzoriai", "aliejai", "moterims", "vyrams", "unisex", "meginukai", "bestselleriai", "nuolaidos"].includes(path)) return { view: "shop", base: path };
  let m = path.match(/^kategorija\/([a-z0-9-]+)$/);
  if (m) return CATEGORY.get(m[1]) ? { view: "shop", base: path } : { view: "404" };
  // Prekė: <tipas>/<id> (kvepalai/rasa, difuzoriai/…); senas adresas su kitu tipu – pataisomas (renderProduct)
  m = path.match(/^(kvepalai|difuzoriai|aliejai)\/([a-z0-9-]+)$/);
  if (m) return { view: "product", id: m[2] };
  if (path === "krepselis") return { view: "cart" };
  if (path === "megstami") return { view: "fav" };
  if (path === "paskyra" || path.startsWith("paskyra/")) return { view: "account", sub: path.split("/")[1] || "" };
  if (path === "admin" || path.startsWith("admin/")) return { view: "admin", sub: path.slice(6) };
  if (["pagalba", "apie-mus", "atsiliepimai", "verslui", "naujienlaiskis"].includes(path)) return { view: "info", kind: path };
  if (path === "testas" || path === "rinkinys") return { view: "home", open: path };
  return { view: "404" };
}
function showView(name) {
  $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  ui.view = name;
}
const TITLES = { home: null, cart: "Krepšelis", fav: "Mėgstami", account: "Paskyra", admin: "Administravimas", 404: "Puslapis nerastas" };
function route({ restoreY = null } = {}) {
  const path = currentPath();
  const params = new URLSearchParams(location.search);
  let r = matchRoute(path);
  if (r.view === "product" && !renderProduct(r.id, params)) r = { view: "404" };
  ui.path = path;
  if (r.view === "shop") {
    shopFromRoute(r.base, params);
    renderShop();
    document.title = `${shopTitle()} | ${SET.shop}`;
  }
  if (r.view === "home") renderHome();
  if (r.view === "cart") renderCart();
  if (r.view === "fav") renderFav();
  if (r.view === "info") renderInfo(r.kind, location.hash.slice(1));
  if (r.view === "account") renderAccount(r.sub);
  if (r.view === "admin") openAdmin(r.sub);
  if (r.view !== "admin") document.documentElement.classList.remove("isAdmin");
  showView(r.view);
  if (TITLES[r.view] !== undefined) document.title = TITLES[r.view] ? `${TITLES[r.view]} | ${SET.shop}` : `${SET.shop} – kvepalai`;
  updateNavCurrent(path);
  if (restoreY != null) requestAnimationFrame(() => window.scrollTo(0, restoreY));
  if (r.open === "testas") openQuiz();
  if (r.open === "rinkinys") openDiscovery();
}
// navigate("kvepalai/rasa") – be puslapio perkrovimo; replace – be naujo įrašo istorijoje
function navigate(path, { replace = false, keepScroll = false } = {}) {
  const url = absUrl(path);
  history.replaceState({ ...(history.state || {}), y: window.scrollY }, "", location.href);
  const fromOverlay = !!overlay.kind && overlay.pushed;
  if (overlay.kind) hideOverlayNow();
  overlay.pushed = false;
  if (url === location.href && !fromOverlay) return;
  history[replace || fromOverlay ? "replaceState" : "pushState"]({ y: 0 }, "", url);
  route();
  if (!keepScroll) {
    const hash = new URL(url).hash;
    if (!hash) window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  }
}
window.addEventListener("popstate", e => {
  if (overlay.kind) return finishOverlay();
  if (e.state?.vdOverlay) return history.back(); // atgal per jau uždaryto lango įrašą
  route({ restoreY: e.state?.y ?? 0 });
});
// Vidinės nuorodos su data-nav – be perkrovimo (naujame skirtuke – įprastai)
document.addEventListener("click", e => {
  const a = e.target instanceof Element && e.target.closest("a[data-nav]");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
  const url = new URL(a.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE_PATH)) return;
  const rel = url.pathname.slice(BASE_PATH.length) + url.search + url.hash;
  if (STATIC_PAGES.has(rel.replace(/[?#].*$/, ""))) return;
  e.preventDefault();
  navigate(rel);
});
function renderFav() {
  const list = PRODUCTS.filter(p => state.fav.has(p.id));
  $("#favSub").textContent = list.length ? plural(list.length, "kvapas", "kvapai", "kvapų") : "";
  $("#favGrid").innerHTML = list.length
    ? list.map(p => cardHTML(p)).join("")
    : `<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 84 84" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linejoin="round"><path d="M42 68S16 53 16 34a13.5 13.5 0 0 1 26-5 13.5 13.5 0 0 1 26 5c0 19-26 34-26 34z"/></svg><h3>Dar nieko nepažymėjote</h3><p>Spauskite širdelę ant kvapo – jis atsiras čia${
        auth.user ? "" : ". Prisijungę matysite mėgstamus visuose įrenginiuose"
      }.</p><a class="btn primary" href="kvepalai" data-nav>Į katalogą</a></div>`;
}
function updateBadges() {
  const n = cartCount();
  $$('[data-badge="cart"]').forEach(b => {
    const was = b.textContent;
    b.hidden = !n;
    b.textContent = n > 99 ? "99+" : String(n);
    if (n && was !== b.textContent) {
      b.classList.remove("bump");
      void b.offsetWidth;
      b.classList.add("bump");
    }
  });
  const f = state.fav.size;
  $$('[data-badge="fav"]').forEach(b => {
    b.hidden = !f;
    b.textContent = String(f);
  });
  $("#cartBtn").setAttribute("aria-label", n ? `Krepšelis, ${plural(n, "prekė", "prekės", "prekių")}` : "Krepšelis");
}
// Seni #/… adresai → nauji (vieną kartą paleidžiant)
function redirectOldHash() {
  const h = location.hash;
  if (!h.startsWith("#/")) return;
  const m = h.match(/^#\/kvepalai\/([a-z0-9-]+)/);
  const to = m ? `kvepalai/${m[1]}` : OLD_HASH[h];
  if (to != null) history.replaceState(null, "", absUrl(to));
}
