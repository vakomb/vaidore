// 11 – Krepšelis: puslapis /krepselis ir mini krepšelis (šoninis langas iš dešinės, atsidaro įdėjus prekę).
// Nemokamo pristatymo juosta, eilutės su kiekio keitikliu (0 – pašalina, su „Atšaukti“), pristatymo būdas
// (Omniva – su paštomatu, 18-delivery.js), dovanų pakavimas ir rašteliukas, suvestinė, apmokėjimas.
function shipBoxHTML() {
  const left = shipLeft();
  const pct = Math.min(100, (cartSubtotal() / SET.freeShippingFrom) * 100);
  return left > 0
    ? `<div class="ship"><div class="shipTxt">${glyph("truck")}<span>Iki nemokamo pristatymo liko <b class="money">${eur(left)}</b></span></div><div class="shipBar"><i style="width:${pct}%"></i></div></div>`
    : `<div class="ship done"><div class="shipTxt">${glyph("check")}<span><b>Pristatymas nemokamas</b></span></div><div class="shipBar"><i style="width:100%"></i></div></div>`;
}
function lineHTML(l) {
  const disc = isDisc(l.id);
  const p = disc ? null : BY_ID.get(l.id);
  const unit = linePrice(l);
  const art = disc
    ? `<div class="art discArt" data-disc-edit="${esc(lineKey(l))}">${l.picks
        .slice(0, 3)
        .map(id => `<span style="--tint:${BY_ID.get(id).look.tint}">${bottleSVG(BY_ID.get(id))}</span>`)
        .join("")}</div>`
    : `<a class="art" href="${productUrl(p)}${l.ml === SAMPLE_ML ? "?ml=2" : ""}" data-nav style="--tint:${p.look.tint}" aria-hidden="true" tabindex="-1">${artImg(p)}</a>`;
  const name = disc
    ? `<b>${esc(DISC.name)}</b><small>${esc(l.picks.map(id => BY_ID.get(id).name).join(", "))}</small>`
    : `<a href="${productUrl(p)}${l.ml === SAMPLE_ML ? "?ml=2" : ""}" data-nav>${esc(p.name)}</a><small>${esc(sizeLabel(l.ml))} · ${esc(p.conc)}</small>`;
  return `<div class="line" data-line="${esc(lineKey(l))}">
${art}
<div class="lineName">${name}</div>
<span class="linePrice money">${eur(unit * l.qty)}</span>
<div class="stepper"><div class="step"><button class="stepBtn" data-step="-1" aria-label="Mažiau">${glyph(l.qty === 1 ? "x" : "minus")}</button><output aria-live="polite">${l.qty}</output><button class="stepBtn" data-step="1" aria-label="Daugiau"${l.qty >= SET.maxQty ? " disabled" : ""}>${glyph("plus")}</button></div>${l.qty > 1 ? `<span class="unit money">${eur(unit)} / vnt.</span>` : ""}${disc ? `<button class="linkBtn" data-disc-edit="${esc(lineKey(l))}">Keisti</button>` : ""}</div>
</div>`;
}
function deliveryHTML() {
  const free = shipLeft() <= 0;
  const rows = SET.shipping
    .map(o => {
      const on = state.ship.method === o.id;
      const sub =
        o.id === "omniva" && on && LOCKERS_N
          ? state.ship.locker
            ? `${state.ship.locker.name}`
            : "Pasirinkite paštomatą"
          : o.days;
      return `<button class="row" role="radio" aria-checked="${on}" data-ship="${o.id}"><span class="radio" aria-hidden="true"></span><span class="rowTxt">${esc(o.name)}<small${
        o.id === "omniva" && on && LOCKERS_N && !state.ship.locker ? ' class="warn"' : ""
      }>${esc(sub)}</small></span><b class="money">${free ? "0,00 €" : eur(o.price)}</b></button>${
        o.id === "omniva" && on && LOCKERS_N
          ? `<button class="row sub" data-pick-locker><span class="rowIco" style="background:#F59E0B">${glyph("locker")}</span><span class="rowTxt">${state.ship.locker ? "Keisti paštomatą" : "Pasirinkti paštomatą"}</span><span class="chev">${glyph("chev-right")}</span></button>`
          : ""
      }`;
    })
    .join("");
  return `<p class="groupTitle">Pristatymas</p><div class="group" role="radiogroup" aria-label="Pristatymo būdas">${rows}</div>${
    state.ship.method === "dpd" || (state.ship.method === "omniva" && !LOCKERS_N) ? `<p class="groupNote">Adresą nurodysite apmokėdami.</p>` : ""
  }`;
}
function giftHTML() {
  const g = SET.gift;
  if (!g) return "";
  const on = state.gift.on;
  return `<p class="groupTitle">Dovana</p><div class="group">
<button class="row" role="switch" aria-checked="${on}" data-gift><span class="rowIco" style="background:#DB2777">${glyph("gift")}</span><span class="rowTxt">Dovanų pakavimas<small>Dėžutė, kaspinas, be kainos čekio</small></span><b class="money">+${eur(g.price)}</b><span class="switch" aria-hidden="true"></span></button>
${
  on
    ? `<label class="row noteRow"><span class="rowTxt">Rašteliukas<small>Nebūtina · iki ${g.noteMax} simbolių</small></span><textarea id="giftNote" rows="3" maxlength="${g.noteMax}" placeholder="Su gimtadieniu! …">${esc(state.gift.note)}</textarea></label>`
    : ""
}</div>`;
}
function renderCart() {
  const root = $("#cartRoot");
  if (!state.cart.length) {
    root.classList.remove("has");
    const pop = [...PRODUCTS].filter(inStock).sort((a, b) => a.rank - b.rank).slice(0, 4);
    root.innerHTML = `<div class="empty">${emptyBagSVG()}<h3>Krepšelis tuščias</h3><p>Išsirinkite kvapą arba pradėkite nuo mėginukų – 2 ml užtenka kelioms dienoms.</p><a class="btn primary" href="kvepalai" data-nav>Į katalogą</a></div>
<section class="sec cartMore"><div class="secHead"><h2>Populiariausi</h2></div><div class="grid">${pop.map(p => cardHTML(p)).join("")}</div></section>`;
    return;
  }
  root.classList.add("has");
  const sub = cartSubtotal();
  const sp = shipPrice();
  const gift = giftPrice();
  root.innerHTML = `<div class="cartMain">${shipBoxHTML()}<div class="lines">${state.cart.map(lineHTML).join("")}</div>
<div class="cartOpts">${deliveryHTML()}${giftHTML()}</div></div>
<aside class="cartSide"><div class="sum">
<div class="sumRow"><span>Prekės (${cartCount()})</span><b class="money">${eur(sub)}</b></div>
${gift ? `<div class="sumRow"><span>Dovanų pakavimas</span><b class="money">${eur(gift)}</b></div>` : ""}
<div class="sumRow"><span>Pristatymas</span><b class="money">${sp === 0 ? "Nemokamai" : sp == null ? `nuo ${eur(minShipping())}` : eur(sp)}</b></div>
<div class="sumRow total"><span>Iš viso</span><b class="money">${eur(sub + gift + (sp ?? minShipping()))}</b></div>
<p class="sumNote">Kainos su PVM. Nuolaidos kodą galėsite įvesti apmokėdami.</p>
</div>
<div class="payBox"><button class="btn primary" id="payBtn">${glyph("lock")}Apmokėti saugiai</button>
<p class="payNote">${glyph("card")}Kortelė, Apple Pay, Google Pay · per Stripe</p></div></aside>`;
}
function emptyBagSVG() {
  return '<svg viewBox="0 0 84 84" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 30h44l-3.5 38.5a4.5 4.5 0 0 1-4.5 4H28a4.5 4.5 0 0 1-4.5-4z"/><path d="M32 30v-4a10 10 0 0 1 20 0v4"/><path d="M36 50c2 2.6 10 2.6 12 0" opacity=".6"/></svg>';
}
// Mini krepšelis (šoninis langas) – atsidaro įdėjus prekę arba paspaudus krepšelio ikoną
function miniHTML(added) {
  if (!state.cart.length)
    return `<header class="drawerHead"><h2 id="miniTitle">Krepšelis</h2><button class="iconBtn" type="button" data-sheet-close aria-label="Uždaryti">${glyph("x")}</button></header>
<div class="drawerBody"><div class="empty">${emptyBagSVG()}<h3>Krepšelis tuščias</h3><p>Pradėkite nuo mėginukų – 2 ml užtenka kelioms dienoms.</p><a class="btn primary" href="kvepalai" data-nav>Į katalogą</a></div></div>`;
  const sub = cartSubtotal();
  return `<header class="drawerHead"><h2 id="miniTitle">${added ? "Įdėta į krepšelį" : "Krepšelis"}</h2><button class="iconBtn" type="button" data-sheet-close aria-label="Uždaryti">${glyph("x")}</button></header>
<div class="drawerBody">${shipBoxHTML()}<div class="lines">${state.cart.map(lineHTML).join("")}</div></div>
<footer class="drawerFoot"><div class="miniTotal"><span>Prekės (${cartCount()})</span><b class="money">${eur(sub)}</b></div>
<div class="miniActs"><button class="btn primary block" type="button" data-mini-pay>${glyph("lock")}Pristatymas ir apmokėjimas</button><button class="btn ghost block" type="button" data-sheet-close>Tęsti apsipirkimą</button></div></footer>`;
}
function renderMini(added = null) {
  const m = $("#mini");
  m.innerHTML = miniHTML(added);
}
function openMiniCart({ added = null } = {}) {
  renderMini(added);
  showOverlay("mini");
}
function onCartClick(e) {
  const t = e.target instanceof Element ? e.target : null;
  const step = t?.closest("[data-step]");
  if (step) {
    const key = step.closest("[data-line]").dataset.line;
    const cur = state.cart.find(l => lineKey(l) === key);
    if (!cur) return;
    const next = cur.qty + Number(step.dataset.step);
    const res = setQty(key, next);
    if (next <= 0 && res) {
      const name = isDisc(cur.id) ? DISC.name : BY_ID.get(cur.id).name;
      toast(`${name} pašalinta`, { icon: "x", action: "Atšaukti", onAction: () => restoreLine(res.line, res.index) });
    }
    return true;
  }
  const edit = t?.closest("[data-disc-edit]");
  if (edit) {
    const l = state.cart.find(x => lineKey(x) === edit.dataset.discEdit);
    if (l) openDiscovery({ preset: l.picks, replaceKey: lineKey(l) });
    return true;
  }
  return false;
}
function bindCart() {
  $("#mini").addEventListener("click", e => {
    if (onCartClick(e)) return;
    if (e.target instanceof Element && e.target.closest("[data-mini-pay]")) navigate("krepselis");
  });
  $("#cartBtn").addEventListener("click", () => openMiniCart());
  const root = $("#cartRoot");
  root.addEventListener("click", e => {
    if (onCartClick(e)) return;
    const t = e.target instanceof Element ? e.target : null;
    const ship = t?.closest("[data-ship]");
    if (ship) {
      setShip(ship.dataset.ship);
      if (needLocker() && !state.ship.locker) openLockerPicker();
      return;
    }
    if (t?.closest("[data-pick-locker]")) return openLockerPicker();
    if (t?.closest("[data-gift]")) {
      setGift({ on: !state.gift.on });
      if (state.gift.on) requestAnimationFrame(() => $("#giftNote")?.focus({ preventScroll: true }));
      return;
    }
    if (t?.closest("#payBtn")) startCheckout(t.closest("#payBtn"));
  });
  // Rašteliukas – išsaugomas be perpiešimo (kad nedingtų žymeklis)
  root.addEventListener("input", e => {
    if (e.target.id === "giftNote") {
      state.gift = sanitizeGift({ ...state.gift, note: e.target.value });
      store.set(GIFT_KEY, state.gift);
    }
  });
}
