// 99 – paleidimas (visada paskutinis: naujų failų 16–98 const reikšmės jau paruoštos): ikonos, ekranai, klausytojai, adresas, PWA (service worker).
function boot() {
  hydrateIcons();
  renderHome();
  renderShopSeg();
  renderShop();
  bindShop();
  bindSheet();
  bindCart();
  bindTabs();
  updateBadges();
  onChange(what => {
    updateBadges();
    if ((what === "cart" || what === "ship" || what === "gift") && ui.tab === "cart") renderCart();
    if (what === "fav") {
      syncHearts();
      if (ui.tab === "fav") renderFav();
    }
  });
  routeFromHash();
  document.documentElement.classList.add("ready");
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(err => logError("sw", err));
  }
}
try {
  boot();
} catch (err) {
  logError("boot", err);
}
