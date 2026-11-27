// 11 - Krepšelis: puslapis /krepselis ir mini krepšelis (šoninis langas iš dešinės, atsidaro įdėjus prekę).
// Nemokamo pristatymo juosta, eilutės su kiekio keitikliu (0 - pašalina, su „Atšaukti“), pristatymo būdas
// (Omniva - su paštomatu, 18-delivery.js), dovanų pakavimas ir rašteliukas, suvestinė, apmokėjimas.
function shipBoxHTML() {
  const left = shipLeft();
  const pct = Math.min(100, (cartSubtotal() / (freeFrom() || 1)) * 100);
  return left > 0
    ? `<div class="ship"><div class="shipTxt">${glyph("truck")}<span>${t("cart.freeLeft", { sum: `<b class="money">${eur(left)}</b>` })}</span></div><div class="shipBar"><i style="width:${pct}%"></i></div></div>`
    : `<div class="ship done"><div class="shipTxt">${glyph("check")}<span><b>${t("cart.freeDone")}</b></span></div><div class="shipBar"><i style="width:100%"></i></div></div>`;
}
function lineHTML(l) {
  const disc = isDisc(l.id);
  const p = disc ? null : BY_ID.get(l.id);
  const unit = linePrice(l);
  const art = disc
    ? `<div class="art discArt" data-disc-edit="${esc(lineKey(l))}">${l.picks
        .slice(0, 3)
        .map(id => `<span>${artImg(BY_ID.get(id))}</span>`)
        .join("")}</div>`
    : `<a class="art" href="${productUrl(p)}${l.ml === SAMPLE_ML ? "?ml=2" : ""}" data-nav style="--tint:${p.look.tint}" aria-hidden="true" tabindex="-1">${artImg(p)}</a>`;
  const name = disc
    ? `<b>${esc(DISC.name)}</b><small>${esc(l.picks.map(id => BY_ID.get(id).name).join(", "))}</small>`
    : `<a href="${productUrl(p)}${l.ml === SAMPLE_ML ? "?ml=2" : ""}" data-nav>${esc(p.name)}</a><small>${esc(sizeLabel(l.ml, p))} · ${esc(isPerfume(p) ? p.conc : TYPE.get(typeOf(p)).one)}</small>`;
  return `<div class="line" data-line="${esc(lineKey(l))}">
${art}
<div class="lineName">${name}</div>
<span class="linePrice money">${eur(unit * l.qty)}</span>
<div class="stepper"><div class="step"><button class="stepBtn" data-step="-1" aria-label="${t("common.less")}">${glyph(l.qty === 1 ? "x" : "minus")}</button><output aria-live="polite">${l.qty}</output><button class="stepBtn" data-step="1" aria-label="${t("common.more")}"${l.qty >= SET.maxQty ? " disabled" : ""}>${glyph("plus")}</button></div>${l.qty > 1 ? `<span class="unit money">${eur(unit)} ${t("cart.perUnit")}</span>` : ""}${disc ? `<button class="linkBtn" data-disc-edit="${esc(lineKey(l))}">${t("common.change")}</button>` : ""}</div>
</div>`;
}
function deliveryHTML() {
  const free = shipLeft() <= 0;
  const cc = state.ship.country;
  const ms = shipMethods();
  const lk = shipLocker();
  const country = `<button class="row" data-ship-country><span class="rowIco">${glyph("pin")}</span><span class="rowTxt">${t("ship.country")}<small${cc ? "" : ' class="warn"'}>${esc(cc ? regionName(cc) : t("ship.chooseCountry"))}</small></span><span class="chev">${glyph("chev-right")}</span></button>`;
  const rows = ms
    .map(o => {
      const on = state.ship.method === o.id;
      const pick = isLocker(o) && on && (o.carrier !== "omniva" || LOCKERS_N);
      const sub = pick ? (lk ? lk.name : t("locker.choose")) : methodDays(o);
      return `<button class="row" role="radio" aria-checked="${on}" data-ship="${esc(o.id)}"><span class="radio" aria-hidden="true"></span><span class="rowTxt">${esc(methodName(o))}<small${pick && !lk ? ' class="warn"' : ""}>${esc(sub)}</small></span><b class="money">${free ? eur(0) : eur(Number(o.price))}</b></button>${
        pick
          ? `<button class="row sub" data-pick-locker><span class="rowIco" style="background:#F59E0B">${glyph("locker")}</span><span class="rowTxt">${lk ? t("locker.change") : t("locker.pick")}</span><span class="chev">${glyph("chev-right")}</span></button>`
          : ""
      }`;
    })
    .join("");
  const m = curMethod();
  const restricted = cc && cartHasPerfume() && (zoneOf(cc)?.methods || []).some(x => x.on !== false && x.perfume === false);
  const note = !cc
    ? t("ship.chooseCountryNote")
    : !ms.length
      ? t("ship.noMethods")
      : [m && (!isLocker(m) || (m.carrier === "omniva" && !LOCKERS_N)) && t("cart.addressLater"), restricted && t("ship.perfumeNote")].filter(Boolean).join(" ");
  return `<p class="groupTitle">${t("cart.delivery")}</p><div class="group" role="radiogroup" aria-label="${t("cart.deliveryMethod")}">${country}${rows}</div>${note ? `<p class="groupNote">${esc(note)}</p>` : ""}`;
}
// Pristatymo šalies pasirinkimas (visos zonų šalys, pagal pavadinimą kalba, su paieška)
function openCountryPicker() {
  const list = ALL_COUNTRIES()
    .map(cc => ({ cc, name: regionName(cc) }))
    .sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  openSheet({
    title: t("ship.countryTitle"),
    html: `<div class="sheetPad lockerPick"><label class="search"><span aria-hidden="true">${glyph("search")}</span><input id="ccQ" type="search" placeholder="${t("ship.countryPh")}" autocomplete="off" /></label><div class="group ccList" role="radiogroup">${list
      .map(x => `<button class="row" role="radio" aria-checked="${x.cc === state.ship.country}" data-cc="${x.cc}" data-ix="${esc(fold(`${x.name} ${x.cc}`))}"><span class="rowTxt">${esc(x.name)}</span>${x.cc === state.ship.country ? `<span class="tickIco">${glyph("check")}</span>` : ""}</button>`)
      .join("")}</div></div>`
  });
  const root = $("#sheetBody");
  $("#ccQ", root).addEventListener("input", e => {
    const q = fold(e.target.value.trim());
    root.querySelectorAll("[data-cc]").forEach(b => (b.hidden = q && !b.dataset.ix.includes(q)));
  });
  root.addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest("[data-cc]");
    if (!b) return;
    setShip(state.ship.method, state.ship.locker, b.dataset.cc);
    closeSheet();
  });
}
function giftHTML() {
  const g = SET.gift;
  if (!g) return "";
  const on = state.gift.on;
  return `<p class="groupTitle">${t("cart.gift")}</p><div class="group">
<button class="row" role="switch" aria-checked="${on}" data-gift><span class="rowIco" style="background:#DB2777">${glyph("gift")}</span><span class="rowTxt">${t("cart.giftWrap")}<small>${t("cart.giftWrapSub")}</small></span><b class="money">+${eur(g.price)}</b><span class="switch" aria-hidden="true"></span></button>
${
  on
    ? `<label class="row noteRow"><span class="rowTxt">${t("cart.giftNote")}<small>${t("cart.giftNoteSub", { n: g.noteMax })}</small></span><textarea id="giftNote" rows="3" maxlength="${g.noteMax}" placeholder="${t("cart.giftNotePh")}">${esc(state.gift.note)}</textarea></label>`
    : ""
}</div>`;
}
function renderCart() {
  const root = $("#cartRoot");
  if (!state.cart.length) {
    root.classList.remove("has");
    const pop = [...PRODUCTS].filter(inStock).sort((a, b) => a.rank - b.rank).slice(0, 4);
    const acc = SB && !auth.user ? `<h3 class="emptyAcc">${t("cart.haveAcc")}</h3><p>${t("cart.signInFaster", { link: `<a href="paskyra" data-nav>${t("cart.signIn")}</a>` })}</p>` : "";
    root.innerHTML = `<div class="empty">${emptyBagSVG()}<h2>${t("cart.empty")}</h2><p>${nb(t("cart.emptyText"))}</p><a class="btn primary" href="kvepalai" data-nav>${t("cart.continue")}</a>${acc}</div>
<section class="sec cartMore"><h2 class="band">${t("cart.popular")}</h2><div class="grid">${pop.map(p => cardHTML(p, { heart: false })).join("")}</div></section>`;
    return;
  }
  root.classList.add("has");
  const sub = cartSubtotal();
  const sp = shipPrice();
  const gift = giftPrice();
  root.innerHTML = `<div class="cartMain">${shipBoxHTML()}<div class="lines">${state.cart.map(lineHTML).join("")}</div>
<div class="cartOpts">${deliveryHTML()}${giftHTML()}</div></div>
<aside class="cartSide"><div class="sum">
<div class="sumRow"><span>${t("cart.items", { n: cartCount() })}</span><b class="money">${eur(sub)}</b></div>
${gift ? `<div class="sumRow"><span>${t("cart.giftWrap")}</span><b class="money">${eur(gift)}</b></div>` : ""}
<div class="sumRow"><span>${t("cart.delivery")}</span><b class="money">${sp === 0 ? t("common.free") : sp == null ? t("common.from", { price: eur(minShipping()) }) : eur(sp)}</b></div>
<div class="sumRow total"><span>${t("cart.total")}</span><b class="money">${eur(sub + gift + (sp ?? minShipping()))}</b></div>
<p class="sumNote">${t("cart.sumNote")}</p>
</div>
<div class="payBox"><button class="btn primary" id="payBtn">${glyph("lock")}${t("cart.pay")}</button>
<p class="payNote">${glyph("card")}${t("cart.payNote")}</p></div></aside>`;
}
function emptyBagSVG() {
  return '<svg viewBox="0 0 84 84" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 30h44l-3.5 38.5a4.5 4.5 0 0 1-4.5 4H28a4.5 4.5 0 0 1-4.5-4z"/><path d="M32 30v-4a10 10 0 0 1 20 0v4"/><path d="M36 50c2 2.6 10 2.6 12 0" opacity=".6"/></svg>';
}
// Mini krepšelis (šoninis langas) - atsidaro įdėjus prekę arba paspaudus krepšelio ikoną
function miniHTML(added) {
  if (!state.cart.length)
    return `<header class="drawerHead"><h2 id="miniTitle">${t("cart.title")}</h2><button class="iconBtn" type="button" data-sheet-close aria-label="${t("common.close")}">${glyph("x")}</button></header>
<div class="drawerBody"><div class="empty">${emptyBagSVG()}<h3>${t("cart.empty")}</h3><p>${nb(t("cart.emptyText"))}</p><a class="btn primary" href="kvepalai" data-nav>${t("cart.continue")}</a></div></div>`;
  const sub = cartSubtotal();
  return `<header class="drawerHead"><h2 id="miniTitle">${added ? t("cart.added") : t("cart.title")}</h2><button class="iconBtn" type="button" data-sheet-close aria-label="${t("common.close")}">${glyph("x")}</button></header>
<div class="drawerBody">${shipBoxHTML()}<div class="lines">${state.cart.map(lineHTML).join("")}</div></div>
<footer class="drawerFoot"><div class="miniTotal"><span>${t("cart.items", { n: cartCount() })}</span><b class="money">${eur(sub)}</b></div>
<div class="miniActs"><button class="btn primary block" type="button" data-mini-pay>${glyph("lock")}${t("cart.checkout")}</button><button class="btn ghost block" type="button" data-sheet-close>${t("cart.continue")}</button></div></footer>`;
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
  const tx = e.target instanceof Element ? e.target : null;
  const step = tx?.closest("[data-step]");
  if (step) {
    const key = step.closest("[data-line]").dataset.line;
    const cur = state.cart.find(l => lineKey(l) === key);
    if (!cur) return;
    const next = cur.qty + Number(step.dataset.step);
    const res = setQty(key, next);
    if (next <= 0 && res) {
      const name = isDisc(cur.id) ? DISC.name : BY_ID.get(cur.id).name;
      toast(t("cart.removed", { name }), { icon: "x", action: t("common.undo"), onAction: () => restoreLine(res.line, res.index) });
    }
    return true;
  }
  const edit = tx?.closest("[data-disc-edit]");
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
    const tx = e.target instanceof Element ? e.target : null;
    const ship = tx?.closest("[data-ship]");
    if (ship) {
      setShip(ship.dataset.ship);
      if (needLocker() && !shipLocker()) openLockerPicker();
      return;
    }
    if (tx?.closest("[data-pick-locker]")) return openLockerPicker();
    if (tx?.closest("[data-ship-country]")) return openCountryPicker();
    if (tx?.closest("[data-gift]")) {
      setGift({ on: !state.gift.on });
      if (state.gift.on) requestAnimationFrame(() => $("#giftNote")?.focus({ preventScroll: true }));
      return;
    }
    if (tx?.closest("#payBtn")) startCheckout(tx.closest("#payBtn"));
  });
  // Rašteliukas - išsaugomas be perpiešimo (kad nedingtų žymeklis)
  root.addEventListener("input", e => {
    if (e.target.id === "giftNote") {
      state.gift = sanitizeGift({ ...state.gift, note: e.target.value });
      store.set(GIFT_KEY, state.gift);
    }
  });
}
