// 11 – Krepšelis: nemokamo pristatymo juosta, eilutės su kiekio keitikliu (0 – pašalina, su „Atšaukti“), suvestinė, apmokėjimas.
function shipBoxHTML() {
  const left = shipLeft();
  const pct = Math.min(100, (cartSubtotal() / SET.freeShippingFrom) * 100);
  return left > 0
    ? `<div class="ship"><div class="shipTxt">${glyph("truck")}<span>Iki nemokamo pristatymo liko <b class="money">${eur(left)}</b></span></div><div class="shipBar"><i style="width:${pct}%"></i></div></div>`
    : `<div class="ship done"><div class="shipTxt">${glyph("check")}<span><b>Pristatymas nemokamas</b></span></div><div class="shipBar"><i style="width:100%"></i></div></div>`;
}
function lineHTML(l) {
  const p = BY_ID.get(l.id);
  const unit = priceOf(p, l.ml);
  return `<div class="line" data-line="${l.id}" data-ml="${l.ml}">
<div class="art" data-open="${p.id}" style="--tint:${p.look.tint}">${bottleSVG(p)}</div>
<div class="lineName"><b>${esc(p.name)}</b><small>${esc(sizeLabel(l.ml))} · ${esc(p.conc)}</small></div>
<span class="linePrice money">${eur(unit * l.qty)}</span>
<div class="stepper"><div class="step"><button class="stepBtn" data-step="-1" aria-label="Mažiau">${glyph(l.qty === 1 ? "x" : "minus")}</button><output aria-live="polite">${l.qty}</output><button class="stepBtn" data-step="1" aria-label="Daugiau"${l.qty >= SET.maxQty ? " disabled" : ""}>${glyph("plus")}</button></div>${l.qty > 1 ? `<span class="unit money">${eur(unit)} / vnt.</span>` : ""}</div>
</div>`;
}
function renderCart() {
  const root = $("#cartRoot");
  if (!state.cart.length) {
    root.classList.remove("has");
    const pop = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 4);
    root.innerHTML = `<div class="empty">${emptyBagSVG()}<h3>Krepšelis tuščias</h3><p>Išsirinkite kvapą arba pradėkite nuo mėginukų – 2 ml užtenka kelioms dienoms.</p><button class="btn primary" data-go-tab="shop">Į katalogą</button></div>
<section class="block cartMore"><div class="blockHead"><h2>Populiariausi</h2></div><div class="grid">${pop.map(p => cardHTML(p)).join("")}</div></section>`;
    return;
  }
  root.classList.add("has");
  const sub = cartSubtotal();
  const free = shipLeft() <= 0;
  root.innerHTML = `<div class="cartMain">${shipBoxHTML()}<div class="lines">${state.cart.map(lineHTML).join("")}</div></div>
<aside class="cartSide"><div class="sum">
<div class="sumRow"><span>Prekės (${cartCount()})</span><b class="money">${eur(sub)}</b></div>
<div class="sumRow"><span>Pristatymas</span><b class="money">${free ? "Nemokamai" : `nuo ${eur(minShipping())}`}</b></div>
<div class="sumRow total"><span>Iš viso</span><b class="money">${eur(sub + (free ? 0 : minShipping()))}</b></div>
<p class="sumNote">${free ? "Kainos su PVM." : "Pristatymo būdą pasirinksite apmokėdami. Kainos su PVM."}</p>
</div>
<div class="payBox"><button class="btn primary" id="payBtn">${glyph("lock")}Apmokėti saugiai</button>
<p class="payNote">${glyph("card")}Kortelė, Apple Pay, Google Pay · per Stripe</p></div></aside>`;
}
function emptyBagSVG() {
  return '<svg viewBox="0 0 84 84" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 30h44l-3.5 38.5a4.5 4.5 0 0 1-4.5 4H28a4.5 4.5 0 0 1-4.5-4z"/><path d="M32 30v-4a10 10 0 0 1 20 0v4"/><path d="M36 50c2 2.6 10 2.6 12 0" opacity=".6"/></svg>';
}
function bindCart() {
  $("#cartRoot").addEventListener("click", e => {
    const step = e.target.closest("[data-step]");
    if (step) {
      const line = step.closest("[data-line]");
      const id = line.dataset.line;
      const ml = Number(line.dataset.ml);
      const cur = state.cart.find(l => l.id === id && l.ml === ml);
      if (!cur) return;
      const next = cur.qty + Number(step.dataset.step);
      const res = setQty(id, ml, next);
      if (next <= 0 && res) {
        const p = BY_ID.get(id);
        toast(`${p.name} pašalinta`, { icon: "x", action: "Atšaukti", onAction: () => restoreLine(res.line, res.index) });
      }
      return;
    }
    if (e.target.closest("#payBtn")) startCheckout(e.target.closest("#payBtn"));
  });
  document.addEventListener("click", e => {
    const go = e.target instanceof Element && e.target.closest("[data-go-tab]");
    if (go) showTab(go.dataset.goTab, { top: true });
  });
}
