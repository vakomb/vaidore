// 18 - Omniva paštomato pasirinkimas krepšelyje. Sąrašą (data/omniva.json) surinkimo metu parsiunčia tools/build-site.mjs
// iš viešo Omniva API; window.VAIDORE_LOCKERS - kiek paštomatų yra (0 - sąrašo nėra, adresą pirkėjas nurodo Stripe lange).
// Įrašas: [zip, pavadinimas, adresas, miestas, šalis, platuma, ilguma]. Sąrašas įkeliamas tik atidarius pasirinkimą.
const LOCKERS_N = Number(window.VAIDORE_LOCKERS) || 0;
let lockersP = null;
function loadLockers() {
  lockersP ||= fetch("data/omniva.json")
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(d =>
      (d.list || []).map(([zip, name, addr, city, cc, lat, lng]) => ({ zip, name, addr, city, cc, lat, lng, ix: fold(`${name} ${addr} ${city} ${zip}`) }))
    )
    .catch(err => {
      lockersP = null;
      throw err;
    });
  return lockersP;
}
// Paieška be galūnių: „Vilnius“ randa „Vilniaus“, „Kaunas“ - „Kauno“, „Klaipeda“ - „Klaipėdos“
const stem = w => (w.length > 5 ? w.replace(/(ius|ias|io|us|as|is|ys|es|os|e|a|ai|iu|u|o)$/, "") : w);
// v33g: paštomatas reikalingas pasirinkus paštomato būdą: Omniva - iš sąrašo (tos šalies), LP Express - įrašomas pavadinimas / adresas
const needLocker = () => {
  const m = curMethod();
  return isLocker(m) && (m.carrier !== "omniva" || LOCKERS_N > 0);
};
function lockerRowHTML(l, on = false) {
  return `<button class="row" data-locker="${esc(l.zip)}" role="radio" aria-checked="${on}"><span class="rowIco" style="background:#F59E0B">${glyph("locker")}</span><span class="rowTxt">${esc(l.name)}<small>${esc([l.addr, l.city].filter(Boolean).join(", "))}</small></span>${on ? `<span class="tickIco">${glyph("check")}</span>` : ""}</button>`;
}
async function openLockerPicker() {
  if (curMethod() && curMethod().carrier !== "omniva") return openLpPicker();
  openSheet({
    title: t("locker.title"),
    html: `<div class="sheetPad lockerPick">
<label class="search"><span aria-hidden="true">${glyph("search")}</span><input id="lkQ" type="search" placeholder="${t("locker.ph")}" autocomplete="off" enterkeyhint="search" /></label>
<button class="btn ghost block" data-lk-near>${glyph("pin")}${t("locker.near")}</button>
<div class="lkList" aria-live="polite"><p class="qzHint">${t("locker.loading")}</p></div>
</div>`
  });
  const root = $("#sheetBody");
  const listEl = $(".lkList", root);
  const q = $("#lkQ", root);
  let all = [];
  let near = null;
  const draw = () => {
    const words = fold(q.value.trim()).split(/\s+/).filter(Boolean).map(stem);
    let list = words.length ? all.filter(l => words.every(w => l.ix.includes(w))) : near || [];
    const cur = state.ship.locker;
    const head = !words.length && !near && cur ? `<p class="groupTitle">${t("locker.selected")}</p><div class="group">${lockerRowHTML(cur, true)}</div>` : "";
    if (!words.length && !near) {
      listEl.innerHTML = `${head}<p class="qzHint">${tn("locker.count", all.length, { country: regionName(state.ship.country || "LT") })}</p>`;
      return;
    }
    const total = list.length;
    list = list.slice(0, 60);
    listEl.innerHTML = total
      ? `<div class="group">${list.map(l => lockerRowHTML(l, cur?.zip === l.zip)).join("")}</div>${total > 60 ? `<p class="qzHint">${t("locker.shown", { n: total })}</p>` : ""}`
      : `<p class="qzHint">${t("locker.none")}</p>`;
  };
  try {
    all = (await loadLockers()).filter(l => !state.ship.country || !l.cc || l.cc === state.ship.country);
  } catch (err) {
    logError("lockers", err);
    listEl.innerHTML = `<p class="qzHint">${t("locker.unavailable")}</p>`;
    return;
  }
  if (!root.isConnected) return;
  q.addEventListener("input", () => {
    near = null;
    draw();
  });
  root.addEventListener("click", e => {
    const tx = e.target instanceof Element ? e.target : null;
    const row = tx?.closest("[data-locker]");
    if (row) {
      const l = all.find(x => x.zip === row.dataset.locker) || state.ship.locker;
      setShip(state.ship.method, { zip: l.zip, name: l.name, addr: l.addr, city: l.city, cc: l.cc, carrier: "omniva" });
      closeSheet();
      return;
    }
    if (tx?.closest("[data-lk-near]")) {
      if (!navigator.geolocation) return toast(t("locker.noGeo"), { icon: "info" });
      const btn = tx.closest("[data-lk-near]");
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        pos => {
          btn.disabled = false;
          const { latitude: la, longitude: lo } = pos.coords;
          const k = Math.cos((la * Math.PI) / 180);
          near = [...all].sort((a, b) => (a.lat - la) ** 2 + ((a.lng - lo) * k) ** 2 - ((b.lat - la) ** 2 + ((b.lng - lo) * k) ** 2)).slice(0, 12);
          q.value = "";
          draw();
        },
        () => {
          btn.disabled = false;
          toast(t("locker.geoFail"), { icon: "info" });
          q.focus();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    }
  });
  draw();
}

// LP Express ir DPD Pickup paštomatai (v33g, v33i): viešo sąrašo nėra - pirkėjas įrašo paštomato pavadinimą arba adresą
// (perduodama Stripe ir užsakymui)
function openLpPicker() {
  const cur = shipLocker();
  const m = curMethod();
  const ph = state.ship.country === "LT" && m?.carrier === "lpexpress" ? t("locker.lpPh") : t("locker.anyPh");
  openSheet({
    title: methodName(m) || t("locker.lpTitle"),
    html: `<form class="sheetPad lockerPick" id="lpForm" novalidate><p class="qzHint">${t("locker.lpText")}</p><label class="field"><span>${t("locker.lpLabel")}</span><input name="lp" required minlength="3" maxlength="120" autocomplete="off" placeholder="${ph}" value="${esc(cur?.name || "")}" /></label><p class="formErr" role="alert" hidden></p><button class="btn primary block" type="submit">${t("common.save")}</button></form>`
  });
  const f = $("#lpForm");
  f.elements.lp.focus();
  f.addEventListener("submit", e => {
    e.preventDefault();
    const v = f.elements.lp.value.trim();
    if (v.length < 3) {
      const err = $(".formErr", f);
      err.textContent = t("locker.lpShort");
      err.hidden = false;
      return;
    }
    setShip(state.ship.method, { zip: "", name: v, addr: "", city: "", cc: state.ship.country, carrier: m?.carrier || "lpexpress" });
    closeSheet();
  });
}
