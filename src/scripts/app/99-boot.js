// 99 – paleidimas (visada paskutinis: visų 01–98 failų reikšmės jau paruoštos): prisijungimo grįžimas, katalogo kopija,
// header'is, poraštė, klausytojai, maršrutas, šviežias katalogas ir paskyra iš duomenų bazės, PWA (service worker).
function boot() {
  history.scrollRestoration = "manual";
  handleAuthRedirect();
  redirectOldHash();
  useCachedCatalog();
  state.cart = sanitizeCart(state.cart);
  hydrateIcons();
  bindHeader();
  renderFooter();
  bindShop();
  bindProduct();
  bindOverlays();
  bindCart();
  updateBadges();
  renderHeaderAccount();
  onChange(what => {
    updateBadges();
    if ((what === "cart" || what === "ship" || what === "gift") && ui.view === "cart") renderCart();
    if (what === "cart" && overlay.kind === "mini") renderMini();
    if (what === "fav") {
      syncHearts();
      if (ui.view === "fav") renderFav();
    }
    if (what === "auth") renderHeaderAccount();
    if (what === "catalog") {
      renderHeaderNav();
      renderFooter();
      renderTopNote();
      if (ui.view !== "admin") route({ restoreY: window.scrollY });
    }
  });
  route();
  document.documentElement.classList.add("ready");
  // Duomenų bazė – po pirmo vaizdo (nestabdo puslapio)
  if (SB) {
    const later = window.requestIdleCallback || (fn => setTimeout(fn, 200));
    later(() => {
      if (auth.session) loadMe().then(() => auth.isAdmin && refreshCatalog());
      refreshCatalog();
    });
  }
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(err => logError("sw", err));
  }
}
try {
  boot();
} catch (err) {
  logError("boot", err);
}
