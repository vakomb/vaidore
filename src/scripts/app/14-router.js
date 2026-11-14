// 14 – skirtukai ir adresai: #/ (Pradžia), #/katalogas, #/megstami, #/krepselis, #/kvepalai/<id>, #/info.
// Skirtukai keičiami akimirksniu (kaip iOS), kiekvienas prisimena savo slinkimo vietą; aktyvaus skirtuko paspaudimas – į viršų.
const TAB_HASH = { home: "#/", shop: "#/katalogas", fav: "#/megstami", cart: "#/krepselis" };
const HASH_TAB = Object.fromEntries(Object.entries(TAB_HASH).map(([k, v]) => [v, k]));
const ui = { tab: "home", scroll: {} };

function showTab(tab, { top = false, push = false } = {}) {
  if (!TAB_HASH[tab]) tab = "home";
  if (ui.tab !== tab) ui.scroll[ui.tab] = window.scrollY;
  const same = ui.tab === tab;
  ui.tab = tab;
  $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === tab));
  $$("[data-tab]").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
    if (b.matches(".tab, .sideLink")) b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  });
  if (tab === "fav") renderFav();
  if (tab === "cart") renderCart();
  const y = top || same ? 0 : ui.scroll[tab] || 0;
  window.scrollTo({ top: y, behavior: same && !reduceMotion() ? "smooth" : "instant" });
  const url = TAB_HASH[tab];
  if (!sheetUI.open && location.hash !== url && !(tab === "home" && !location.hash)) {
    history[push ? "pushState" : "replaceState"](null, "", url);
  }
  updateHeadShadow();
}
function routeFromHash() {
  const h = location.hash || "#/";
  const m = h.match(/^#\/kvepalai\/([a-z0-9-]+)/);
  if ((m || h === "#/info") && !$(".view.active")) {
    $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === ui.tab));
    $$("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === ui.tab));
  }
  if (m && BY_ID.has(m[1])) {
    if (!sheetUI.open) {
      history.replaceState(null, "", TAB_HASH[ui.tab]);
      openProduct(m[1]);
    }
    return;
  }
  if (h === "#/info") {
    history.replaceState(null, "", TAB_HASH[ui.tab]);
    openInfo();
    return;
  }
  showTab(HASH_TAB[h] || "home");
}
function renderFav() {
  const list = PRODUCTS.filter(p => state.fav.has(p.id));
  $("#favGrid").innerHTML = list.length
    ? list.map(p => cardHTML(p)).join("")
    : `<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 84 84" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linejoin="round"><path d="M42 68S16 53 16 34a13.5 13.5 0 0 1 26-5 13.5 13.5 0 0 1 26 5c0 19-26 34-26 34z"/></svg><h3>Dar nieko nepažymėjote</h3><p>Spauskite širdelę ant kvapo – jis atsiras čia.</p><button class="btn primary" data-go-tab="shop">Į katalogą</button></div>`;
}
function updateBadges() {
  const n = cartCount();
  $$('[data-badge="cart"]').forEach(b => {
    const was = b.textContent;
    b.hidden = !n;
    b.textContent = n > 99 ? "99+" : String(n);
    if (n && was !== b.textContent && b.classList.contains("tabBadge")) {
      b.classList.remove("bump");
      void b.offsetWidth;
      b.classList.add("bump");
    }
  });
  const f = state.fav.size;
  $$('[data-badge="fav"]').forEach(b => {
    b.hidden = !f || b.classList.contains("tabBadge");
    b.textContent = String(f);
  });
  const left = shipLeft();
  $$("[data-ship-note]").forEach(
    el =>
      (el.innerHTML = !state.cart.length
        ? `Nemokamas pristatymas nuo <b>${eur(SET.freeShippingFrom)}</b>`
        : left > 0
          ? `Iki nemokamo pristatymo liko <b>${eur(left)}</b>`
          : `<b>Pristatymas nemokamas</b>`)
  );
}
let headRaf = 0;
function updateHeadShadow() {
  cancelAnimationFrame(headRaf);
  headRaf = requestAnimationFrame(() => {
    const head = $(".view.active .largeHead");
    head?.classList.toggle("scrolled", window.scrollY > 8);
  });
}
function bindTabs() {
  document.addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest(".tab[data-tab], .sideLink[data-tab], .sideBrand[data-tab]");
    if (!b) return;
    e.preventDefault();
    showTab(b.dataset.tab);
  });
  window.addEventListener("scroll", updateHeadShadow, { passive: true });
}
