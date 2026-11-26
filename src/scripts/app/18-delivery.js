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
const needLocker = () => LOCKERS_N > 0 && state.ship.method === "omniva";
function lockerRowHTML(l, on = false) {
  return `<button class="row" data-locker="${esc(l.zip)}" role="radio" aria-checked="${on}"><span class="rowIco" style="background:#F59E0B">${glyph("locker")}</span><span class="rowTxt">${esc(l.name)}<small>${esc([l.addr, l.city].filter(Boolean).join(", "))}</small></span>${on ? `<span class="tickIco">${glyph("check")}</span>` : ""}</button>`;
}
async function openLockerPicker() {
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
      listEl.innerHTML = `${head}<p class="qzHint">${tn("locker.count", all.length)}</p>`;
      return;
    }
    const total = list.length;
    list = list.slice(0, 60);
    listEl.innerHTML = total
      ? `<div class="group">${list.map(l => lockerRowHTML(l, cur?.zip === l.zip)).join("")}</div>${total > 60 ? `<p class="qzHint">${t("locker.shown", { n: total })}</p>` : ""}`
      : `<p class="qzHint">${t("locker.none")}</p>`;
  };
  try {
    all = await loadLockers();
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
      setShip("omniva", { zip: l.zip, name: l.name, addr: l.addr, city: l.city, cc: l.cc });
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
