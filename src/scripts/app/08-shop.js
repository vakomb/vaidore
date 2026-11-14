// 08 – Katalogas: paieška, Visi / Moterims / Vyrams / Unisex, filtrai (šeima, koncentracija, kaina), rūšiavimas, mėginukai.
const PRICE_BANDS = [
  { id: "low", name: "iki 60 €", test: v => v < 60 },
  { id: "mid", name: "60–90 €", test: v => v >= 60 && v <= 90 },
  { id: "high", name: "nuo 90 €", test: v => v > 90 }
];
const SORTS = [
  { id: "rank", name: "Populiariausi" },
  { id: "new", name: "Naujausi" },
  { id: "price-asc", name: "Pigiausi" },
  { id: "price-desc", name: "Brangiausi" }
];
const shop = {
  q: "",
  gender: "all",
  families: new Set(),
  conc: new Set(),
  price: new Set(),
  sort: "rank",
  samples: false
};
const CONCS = [...new Set(PRODUCTS.map(p => p.conc))];

function shopList() {
  const list = PRODUCTS.filter(
    p =>
      (shop.gender === "all" || p.gender === shop.gender) &&
      (!shop.families.size || shop.families.has(p.family)) &&
      (!shop.conc.size || shop.conc.has(p.conc)) &&
      (!shop.price.size || PRICE_BANDS.some(b => shop.price.has(b.id) && b.test(minPrice(p)))) &&
      matches(p, shop.q)
  );
  const by = {
    rank: (a, b) => a.rank - b.rank,
    new: (a, b) => b.added.localeCompare(a.added),
    "price-asc": (a, b) => (shop.samples ? a.sample - b.sample : minPrice(a) - minPrice(b)),
    "price-desc": (a, b) => (shop.samples ? b.sample - a.sample : minPrice(b) - minPrice(a))
  };
  return list.sort(by[shop.sort] || by.rank);
}
const filterCount = () => shop.families.size + shop.conc.size + shop.price.size + (shop.samples ? 1 : 0);

function renderShopSeg() {
  const opts = [["all", "Visi"], ...Object.entries(GENDER_NAME)];
  $("#shopSeg").innerHTML = opts
    .map(([id, name]) => `<button role="tab" data-gender="${id}" aria-selected="${shop.gender === id}">${name}</button>`)
    .join("");
}
function renderShop() {
  const list = shopList();
  const grid = $("#shopGrid");
  const discRow =
    shop.samples && DISC
      ? `<button class="discBanner" data-disc><span class="rowIco" style="background:#DB2777">${glyph("drop")}</span><span class="rowTxt"><b>${esc(DISC.name)}</b><small>Bet kurie ${DISC.count} mėginukai už ${eur(DISC.price)}</small></span><span class="chev">${glyph("chev-right")}</span></button>`
      : "";
  grid.innerHTML = list.length
    ? discRow + list.map(p => cardHTML(p, { sample: shop.samples })).join("")
    : `<div class="empty" style="grid-column:1/-1">${glyph("search")}<h3>Nieko neradome</h3><p>Pabandykite kitą žodį arba atsakykite į 4 klausimus – pasiūlysime 3 kvapus.</p><button class="btn primary" data-quiz>${glyph("spark")}Rask savo kvapą</button><button class="btn ghost" data-reset-filters>Rodyti visus kvapus</button></div>`;
  $("#shopCount").textContent = plural(list.length, "kvapas", "kvapai", "kvapų");
  $("#shopSortLabel").textContent = SORTS.find(s => s.id === shop.sort).name;
  const n = filterCount();
  const fc = $("#shopFilterCount");
  fc.hidden = !n;
  fc.textContent = n;
  const chips = [
    ...(shop.samples ? [["samples", "", "Mėginukai 2 ml"]] : []),
    ...[...shop.families].map(id => ["families", id, familyName(id)]),
    ...[...shop.conc].map(id => ["conc", id, id]),
    ...[...shop.price].map(id => ["price", id, PRICE_BANDS.find(b => b.id === id).name])
  ];
  $("#shopActive").innerHTML = chips
    .map(([k, id, name]) => `<button class="chip" data-unset="${k}" data-id="${esc(id)}">${esc(name)} <span class="x">✕</span></button>`)
    .join("");
  $$("#shopSeg button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.gender === shop.gender)));
}
// Iš Pradžios (plytelės, nuotaikos, „Visi“) – į Katalogą su filtru
function goShop(opts = {}) {
  shop.q = "";
  $("#shopQ").value = "";
  $("#shopQClear").hidden = true;
  shop.gender = opts.gender || "all";
  shop.families = new Set(opts.families || []);
  shop.conc.clear();
  shop.price.clear();
  shop.samples = !!opts.samples;
  shop.sort = opts.sort || "rank";
  renderShop();
  showTab("shop", { top: true });
}
function resetFilters() {
  shop.families.clear();
  shop.conc.clear();
  shop.price.clear();
  shop.samples = false;
  shop.q = "";
  shop.gender = "all";
  $("#shopQ").value = "";
  $("#shopQClear").hidden = true;
  renderShop();
}

let qTimer = 0;
function bindShop() {
  const q = $("#shopQ");
  q.addEventListener("input", () => {
    $("#shopQClear").hidden = !q.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      shop.q = q.value.trim();
      renderShop();
    }, 90);
  });
  q.addEventListener("keydown", e => e.key === "Enter" && q.blur());
  $("#shopQClear").addEventListener("click", () => {
    q.value = "";
    shop.q = "";
    $("#shopQClear").hidden = true;
    renderShop();
    q.focus();
  });
  $("#shopSeg").addEventListener("click", e => {
    const b = e.target.closest("[data-gender]");
    if (!b || shop.gender === b.dataset.gender) return;
    shop.gender = b.dataset.gender;
    renderShop();
  });
  $("#shopFilterBtn").addEventListener("click", openFilters);
  $("#shopSortBtn").addEventListener("click", openSort);
  $("#shopActive").addEventListener("click", e => {
    const b = e.target.closest("[data-unset]");
    if (!b) return;
    if (b.dataset.unset === "samples") shop.samples = false;
    else shop[b.dataset.unset].delete(b.dataset.id);
    renderShop();
  });
  document.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("[data-reset-filters]")) resetFilters();
  });
}

// Filtrų langas – keičiama kopija, pritaikoma „Rodyti“
function openFilters() {
  const draft = {
    families: new Set(shop.families),
    conc: new Set(shop.conc),
    price: new Set(shop.price),
    samples: shop.samples
  };
  const chip = (group, id, name) =>
    `<button class="chip" data-f="${group}" data-id="${esc(id)}" aria-pressed="${draft[group].has(id)}">${esc(name)}</button>`;
  const count = () =>
    PRODUCTS.filter(
      p =>
        (shop.gender === "all" || p.gender === shop.gender) &&
        (!draft.families.size || draft.families.has(p.family)) &&
        (!draft.conc.size || draft.conc.has(p.conc)) &&
        (!draft.price.size || PRICE_BANDS.some(b => draft.price.has(b.id) && b.test(minPrice(p)))) &&
        matches(p, shop.q)
    ).length;
  const body = () => `<div class="sheetPad">
<section class="fGroup"><h3>Kvapo šeima</h3><div class="fChips">${CAT.families.map(f => chip("families", f.id, f.name)).join("")}</div></section>
<section class="fGroup"><h3>Koncentracija</h3><div class="fChips">${CONCS.map(c => chip("conc", c, `${c} · ${CONC_NAME[c] || ""}`)).join("")}</div></section>
<section class="fGroup"><h3>Kaina</h3><div class="fChips">${PRICE_BANDS.map(b => chip("price", b.id, b.name)).join("")}</div></section>
<section class="fGroup"><h3>Formatas</h3><div class="fChips"><button class="chip" data-f="samples" aria-pressed="${draft.samples}">Mėginukai 2 ml</button></div></section>
<div class="fActions"><button class="btn ghost" data-f-clear>Išvalyti</button><button class="btn primary" data-f-apply>Rodyti ${plural(count(), "kvapą", "kvapus", "kvapų")}</button></div></div>`;
  openSheet({ title: "Filtrai", html: body() });
  const root = $("#sheetBody");
  root.addEventListener("click", function onF(e) {
    const b = e.target.closest("[data-f], [data-f-clear], [data-f-apply]");
    if (!b) return;
    if (b.hasAttribute("data-f-apply")) {
      Object.assign(shop, draft);
      renderShop();
      closeSheet();
      root.removeEventListener("click", onF);
      return;
    }
    if (b.hasAttribute("data-f-clear")) {
      draft.families.clear();
      draft.conc.clear();
      draft.price.clear();
      draft.samples = false;
    } else if (b.dataset.f === "samples") draft.samples = !draft.samples;
    else {
      const set = draft[b.dataset.f];
      set.has(b.dataset.id) ? set.delete(b.dataset.id) : set.add(b.dataset.id);
    }
    $$("[data-f]", root).forEach(c =>
      c.setAttribute("aria-pressed", String(c.dataset.f === "samples" ? draft.samples : draft[c.dataset.f].has(c.dataset.id)))
    );
    $("[data-f-apply]", root).textContent = `Rodyti ${plural(count(), "kvapą", "kvapus", "kvapų")}`;
  });
}
function openSort() {
  openSheet({
    title: "Rūšiuoti",
    html: `<div class="sheetPad"><div class="group">${SORTS.map(
      s =>
        `<button class="row" data-sort="${s.id}"><span class="rowTxt">${s.name}</span>${shop.sort === s.id ? `<span style="color:var(--brand)">${glyph("check")}</span>` : ""}</button>`
    ).join("")}</div></div>`
  });
  $("#sheetBody").addEventListener("click", e => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    shop.sort = b.dataset.sort;
    renderShop();
    closeSheet();
  });
}
