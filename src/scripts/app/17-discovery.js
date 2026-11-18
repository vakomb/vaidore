// 17 – Atradimų rinkinys (settings.discovery): pasirenkami bet kurie N kvapų po 2 ml už fiksuotą kainą.
// Į krepšelį – eilutė { id: DISC.id, ml: 0, qty, picks }. Kainą ir pasirinkimą dar kartą tikrina serveris (supabase/functions/_shared/shop.js).
function openDiscovery({ preset = [], replaceKey = null } = {}) {
  if (!DISC) return;
  const pool = SAMPLEABLE();
  const sel = preset.filter(id => pool.some(p => p.id === id)).slice(0, DISC.count);
  openSheet({
    title: DISC.name,
    html: `<div class="sheetPad disc">
<p class="discLead">${esc(DISC.text || "")}</p>
<p class="discCredit">${glyph("return")}<span>${creditText()}</span></p>
<div class="discGrid" role="group" aria-label="Kvapai rinkiniui">${pool
      .map(
        p => `<button class="discOpt" data-pick="${p.id}" aria-pressed="${sel.includes(p.id)}"><span class="art" style="--tint:${p.look.tint}">${artImg(p)}</span><b>${esc(p.name)}</b><small>${esc(familyName(p.family))}</small><i class="discTick">${glyph("check")}</i></button>`
      )
      .join("")}</div>
</div>
<div class="buyBar discBar show"><span class="price"><b class="money">${eur(DISC.price)}</b><small data-disc-count></small></span><button class="btn primary" data-disc-add>${glyph("bag")}Į krepšelį</button></div>`
  });
  const root = $("#sheetBody");
  const sync = () => {
    $$("[data-pick]", root).forEach(b => {
      const on = sel.includes(b.dataset.pick);
      b.setAttribute("aria-pressed", String(on));
      b.disabled = !on && sel.length >= DISC.count;
    });
    $("[data-disc-count]", root).textContent = `Pasirinkta ${sel.length} iš ${DISC.count}`;
    $("[data-disc-add]", root).disabled = sel.length !== DISC.count;
  };
  root.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const b = t?.closest("[data-pick]");
    if (b) {
      const i = sel.indexOf(b.dataset.pick);
      if (i >= 0) sel.splice(i, 1);
      else if (sel.length < DISC.count) sel.push(b.dataset.pick);
      return sync();
    }
    if (t?.closest("[data-disc-add]") && sel.length === DISC.count) {
      if (replaceKey) {
        const i = state.cart.findIndex(l => lineKey(l) === replaceKey);
        if (i >= 0) state.cart.splice(i, 1);
      }
      addToCart(DISC.id, 0, 1, sel);
      if (ui.view === "cart") closeSheet();
      else openMiniCart({ added: DISC.name });
    }
  });
  sync();
}
// Mėginukų kainos grąžinimas (settings.sampleCredit): po apmokėjimo Stripe sukuria vienkartinį nuolaidos kodą (shop.js – ensureCredit)
function creditText() {
  const c = SET.sampleCredit;
  return c ? `Mėginukų kainą grąžinsime nuolaidos kodu – panaudokite jį perkant buteliuką per ${c.days} d.` : "Išbandykite namuose prieš pirkdami buteliuką.";
}
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest("[data-disc]")) openDiscovery();
});
