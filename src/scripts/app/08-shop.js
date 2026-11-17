// 08 – Katalogas: /kvepalai, /moterims, /vyrams, /unisex, /meginukai, /kategorija/<id>.
// Filtrai ir paieška – adreso parametruose (?q=&seima=&natos=&proga=&sezonas=&konc=&kaina=&rikiuoti=), todėl nuorodą galima
// nukopijuoti ir pasidalinti. v10 (kaip parfumada.lt): Pagal lytį · Kvapo pobūdis · Natos · Proga · Sezonas (+ kaina, koncentracija).
// Kompiuteryje filtrai – kairėje šoninėje juostoje, telefone – lange („Filtrai“). Po 24 kvapus, „Rodyti daugiau“.
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
const TIME_NAME = { diena: "Dienai", vakaras: "Vakarui" };
const SEASONS = ["pavasaris", "vasara", "ruduo", "žiema"];
const noteList = p => [...p.notes.top, ...p.notes.heart, ...p.notes.base];
const allNotes = () => [...new Set(PRODUCTS.flatMap(noteList))].sort((a, b) => a.localeCompare(b, "lt"));
// Sąrašo filtrai: būsenos raktas → adreso parametras ir tikrinimas
const SET_FILTERS = {
  families: { param: "seima", test: (p, set) => set.has(p.family) },
  notes: { param: "natos", test: (p, set) => noteList(p).some(n => set.has(n)) },
  time: { param: "proga", test: (p, set) => p.time.some(t => set.has(t)) },
  seasons: { param: "sezonas", test: (p, set) => p.seasons.some(t => set.has(t)) },
  conc: { param: "konc", test: (p, set) => set.has(p.conc) },
  price: { param: "kaina", test: (p, set) => PRICE_BANDS.some(b => set.has(b.id) && b.test(minPrice(p))) }
};
const PAGE = 24;
const shop = { base: "kvepalai", gender: "all", category: null, samples: false, q: "", sort: "rank", limit: PAGE };
for (const k in SET_FILTERS) shop[k] = new Set();
const concs = () => [...new Set(PRODUCTS.map(p => p.conc))];
const setOf = v => new Set(String(v || "").split(",").filter(Boolean));

// Iš adreso (router) → būsena
function shopFromRoute(base, params) {
  shop.base = base;
  shop.gender = GENDER_NAME[base] ? base : "all";
  shop.samples = base === "meginukai";
  shop.category = base.startsWith("kategorija/") ? base.slice(11) : null;
  shop.q = params.get("q") || "";
  for (const [k, f] of Object.entries(SET_FILTERS)) shop[k] = setOf(params.get(f.param));
  shop.sort = SORTS.some(s => s.id === params.get("rikiuoti")) ? params.get("rikiuoti") : "rank";
  shop.limit = PAGE;
}
// Būsena → adresas (be naujo įrašo istorijoje)
function shopToUrl() {
  const ps = new URLSearchParams();
  if (shop.q) ps.set("q", shop.q);
  for (const [k, f] of Object.entries(SET_FILTERS)) if (shop[k].size) ps.set(f.param, [...shop[k]].join(","));
  if (shop.sort !== "rank") ps.set("rikiuoti", shop.sort);
  const qs = ps.toString();
  const url = absUrl(shop.base + (qs ? `?${qs}` : ""));
  if (url !== location.href) history.replaceState(history.state, "", url);
}
function shopFilter(p, skip = "") {
  return (
    (shop.gender === "all" || p.gender === shop.gender) &&
    (!shop.category || (p.categories || []).includes(shop.category)) &&
    Object.entries(SET_FILTERS).every(([k, f]) => skip === k || !shop[k].size || f.test(p, shop[k])) &&
    matches(p, shop.q)
  );
}
function shopList() {
  const list = PRODUCTS.filter(p => shopFilter(p));
  const by = {
    rank: (a, b) => a.rank - b.rank,
    new: (a, b) => String(b.added).localeCompare(String(a.added)),
    "price-asc": (a, b) => (shop.samples ? a.sample - b.sample : minPrice(a) - minPrice(b)),
    "price-desc": (a, b) => (shop.samples ? b.sample - a.sample : minPrice(b) - minPrice(a))
  };
  // Išparduoti – sąrašo gale
  return list.sort((a, b) => inStock(b) - inStock(a) || (by[shop.sort] || by.rank)(a, b));
}
const filterCount = () => Object.keys(SET_FILTERS).reduce((n, k) => n + shop[k].size, 0);

function shopTitle() {
  if (shop.category) return CATEGORY.get(shop.category)?.name || "Kategorija";
  if (shop.samples) return "Mėginukai 2 ml";
  if (shop.gender !== "all") return GENDER_TITLE[shop.gender];
  return "Kvepalai";
}
function shopSub() {
  if (shop.category) return CATEGORY.get(shop.category)?.description || "";
  if (shop.samples) return `Išbandykite kvapą namuose prieš pirkdami buteliuką. ${creditText()}`;
  return "";
}
function filtersHTML(live = true) {
  const n = (fn, skip) => PRODUCTS.filter(p => shopFilter(p, skip) || false).filter(fn).length;
  const check = (group, id, name, count) =>
    `<label class="fCheck"><input type="checkbox" data-f="${group}" value="${esc(id)}"${shop[group].has(id) ? " checked" : ""} /><span>${esc(name)}</span><small>${count}</small></label>`;
  const genders = [
    ["kvepalai", "Visi"],
    ["moterims", "Moterims"],
    ["vyrams", "Vyrams"],
    ["unisex", "Unisex"]
  ];
  const cats = visibleCategories();
  const sortGroup = live
    ? ""
    : `<details class="fGroup" open><summary>Rūšiuoti${glyph("chev-down")}</summary><div class="fChecks">${SORTS.map(
        o => `<label class="fCheck"><input type="radio" name="fSortS" data-sort="${o.id}"${shop.sort === o.id ? " checked" : ""} /><span>${o.name}</span></label>`
      ).join("")}</div></details>`;
  const group = (title, body, open = true) => `<details class="fGroup"${open ? " open" : ""}><summary>${title}${glyph("chev-down")}</summary><div class="fChecks">${body}</div></details>`;
  const notes = allNotes().filter(x => n(p => noteList(p).includes(x), "notes") || shop.notes.has(x));
  return `${sortGroup}<details class="fGroup" open><summary>Pagal lytį${glyph("chev-down")}</summary><div class="fChecks">${genders
    .map(
      ([href, name]) =>
        `<label class="fCheck"><input type="radio" name="fGender${live ? "" : "S"}" data-f-go="${href}"${
          (href === "kvepalai" ? shop.gender === "all" && !shop.samples && !shop.category : shop.gender === href) ? " checked" : ""
        } /><span>${name}</span></label>`
    )
    .join("")}</div></details>
${
  cats.length
    ? `<details class="fGroup" open><summary>Kategorijos${glyph("chev-down")}</summary><div class="fChecks">${cats
        .map(c => `<label class="fCheck"><input type="radio" name="fCat${live ? "" : "S"}" data-f-go="kategorija/${c.id}"${shop.category === c.id ? " checked" : ""} /><span>${esc(c.name)}</span></label>`)
        .join("")}</div></details>`
    : ""
}
${group("Kvapo pobūdis", visibleFamilies()
  .map(f => check("families", f.id, f.name, n(p => p.family === f.id, "families")))
  .join(""))}
${group("Natos", `<div class="fScroll">${notes.map(x => check("notes", x, x, n(p => noteList(p).includes(x), "notes"))).join("")}</div>`, !!shop.notes.size)}
${group("Proga", Object.entries(TIME_NAME).map(([id, name]) => check("time", id, name, n(p => p.time.includes(id), "time"))).join(""))}
${group("Sezonas", SEASONS.map(id => check("seasons", id, SEASON_NAME[id], n(p => p.seasons.includes(id), "seasons"))).join(""))}
<details class="fGroup" open><summary>Koncentracija${glyph("chev-down")}</summary><div class="fChecks">${concs()
    .map(c => check("conc", c, `${c} · ${CONC_NAME[c] || ""}`, n(p => p.conc === c, "conc")))
    .join("")}</div></details>
<details class="fGroup" open><summary>Kaina${glyph("chev-down")}</summary><div class="fChecks">${PRICE_BANDS.map(b => check("price", b.id, b.name, n(p => b.test(minPrice(p)), "price"))).join("")}</div></details>
<details class="fGroup" open><summary>Formatas${glyph("chev-down")}</summary><div class="fChecks"><label class="fCheck"><input type="radio" name="fFmt${live ? "" : "S"}" data-f-go="meginukai"${
    shop.samples ? " checked" : ""
  } /><span>Mėginukai 2 ml</span></label></div></details>
${filterCount() ? `<button class="btn ghost small block" type="button" data-reset-filters>Išvalyti filtrus</button>` : ""}`;
}
function renderShop() {
  const list = shopList();
  $("#shopTitle").textContent = shopTitle();
  $("#shopSub").textContent = shopSub();
  // Kategorijos / lyties / mėginukų puslapyje – tos grupės scena (24-stage.js); perpiešiama tik pasikeitus grupei
  // Nuotrauka – ta pati kaip pradžios plytelės (arba kategorijos paveikslas), kitaip – scena
  const stName = shopStageName();
  const photo = stName ? groupPhoto(shop.samples ? "meginukai" : shop.category ? `kat-${shop.category}` : shop.gender) : null;
  const stKey = `${stName}|${shop.base}|${photo?.image || ""}|${photo?.focus || ""}`;
  const stBox = $("#shopStage");
  if (stBox.dataset.key !== stKey) {
    stBox.dataset.key = stKey;
    const group = PRODUCTS.filter(p => (shop.gender === "all" || p.gender === shop.gender) && (!shop.category || (p.categories || []).includes(shop.category))).sort((a, b) => a.rank - b.rank);
    stBox.innerHTML = !stName ? "" : photo ? photoHTML(photo, { eager: true, cls: "shopStage" }) : stageHTML(stName, group.length ? group : PRODUCTS, { eager: true, cls: "shopStage" });
  }
  $("#shopHead").classList.toggle("hasStage", !!stName);
  $("#shopHead").classList.toggle("onDark", !!photo?.dark);
  const discRow =
    shop.samples && DISC
      ? `<button class="discBanner" type="button" data-disc><span class="rowIco" style="background:var(--pink)">${glyph("drop")}</span><span class="rowTxt"><b>${esc(DISC.name)}</b><small>Bet kurie ${DISC.count} mėginukai už ${eur(DISC.price)}</small></span><span class="chev">${glyph("chev-right")}</span></button>`
      : "";
  const shown = list.slice(0, shop.limit);
  $("#shopGrid").innerHTML = list.length
    ? discRow + shown.map(p => cardHTML(p, { sample: shop.samples })).join("")
    : `<div class="empty" style="grid-column:1/-1">${glyph("search")}<h3>Nieko neradome</h3><p>Pabandykite kitą žodį arba atsakykite į 4 klausimus – pasiūlysime 3 kvapus.</p><button class="btn primary" type="button" data-quiz>${glyph("spark")}Rask savo kvapą</button><button class="btn ghost" type="button" data-reset-filters>Rodyti visus kvapus</button></div>`;
  $("#shopMore").innerHTML =
    list.length > shop.limit
      ? `<span>Rodoma ${shown.length} iš ${list.length}</span><button class="btn ghost" type="button" data-shop-more>Rodyti daugiau</button>`
      : "";
  $("#shopCount").textContent = plural(list.length, "kvapas", "kvapai", "kvapų");
  $("#shopSort").value = shop.sort;
  const n = filterCount();
  const fc = $("#shopFilterCount");
  fc.hidden = !n;
  fc.textContent = n;
  const chips = [
    ...[...shop.families].map(id => ["families", id, familyName(id)]),
    ...[...shop.notes].map(id => ["notes", id, id]),
    ...[...shop.time].map(id => ["time", id, TIME_NAME[id] || id]),
    ...[...shop.seasons].map(id => ["seasons", id, SEASON_NAME[id] || id]),
    ...[...shop.conc].map(id => ["conc", id, id]),
    ...[...shop.price].map(id => ["price", id, PRICE_BANDS.find(b => b.id === id)?.name || id])
  ];
  $("#shopActive").innerHTML = chips
    .map(([k, id, name]) => `<button class="chip" type="button" data-unset="${k}" data-id="${esc(id)}">${esc(name)} <span class="x" aria-hidden="true">✕</span><span class="sr">– pašalinti filtrą</span></button>`)
    .join("");
  $("#shopFilters").innerHTML = filtersHTML(true);
  const q = $("#shopQ");
  if (document.activeElement !== q) q.value = shop.q;
  $("#shopQClear").hidden = !q.value;
  shopToUrl();
}
function resetFilters() {
  for (const k in SET_FILTERS) shop[k].clear();
  shop.q = "";
  $("#shopQ").value = "";
  if (ui.view === "shop") renderShop();
}
function applyFilterInput(input) {
  if (input.dataset.sort) {
    shop.sort = input.dataset.sort;
    renderShop();
    return true;
  }
  if (input.dataset.fGo) {
    const keep = new URLSearchParams(location.search);
    navigate(input.dataset.fGo + (keep.toString() ? `?${keep}` : ""), { replace: true, keepScroll: true });
    return true;
  }
  const set = shop[input.dataset.f];
  if (!set) return false;
  input.checked ? set.add(input.value) : set.delete(input.value);
  shop.limit = PAGE;
  renderShop();
  return true;
}
let qTimer = 0;
function bindShop() {
  $("#shopSort").innerHTML = SORTS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  const q = $("#shopQ");
  q.addEventListener("input", () => {
    $("#shopQClear").hidden = !q.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      shop.q = q.value.trim();
      shop.limit = PAGE;
      renderShop();
    }, 120);
  });
  q.addEventListener("keydown", e => e.key === "Enter" && q.blur());
  $("#shopQClear").addEventListener("click", () => {
    q.value = "";
    shop.q = "";
    renderShop();
    q.focus();
  });
  $("#shopSort").addEventListener("change", e => {
    shop.sort = e.target.value;
    renderShop();
  });
  $("#shopFilterBtn").addEventListener("click", openFilters);
  $("#shopFilters").addEventListener("change", e => applyFilterInput(e.target));
  $("#view-shop").addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const b = t?.closest("[data-unset]");
    if (b) {
      shop[b.dataset.unset].delete(b.dataset.id);
      return renderShop();
    }
    if (t?.closest("[data-shop-more]")) {
      shop.limit += PAGE;
      renderShop();
    }
  });
  document.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("[data-reset-filters]")) {
      resetFilters();
      if (shop.gender !== "all" || shop.samples || shop.category) navigate("kvepalai", { replace: true });
    }
  });
}
// Telefone – tie patys filtrai lange; keičiami iškart, mygtukas rodo, kiek kvapų liks
function openFilters() {
  const body = () => `<div class="sheetPad fSheet">${filtersHTML(false)}<div class="fActions"><button class="btn ghost" type="button" data-f-clear>Išvalyti</button><button class="btn primary" type="button" data-f-apply>Rodyti ${plural(shopList().length, "kvapą", "kvapus", "kvapų")}</button></div></div>`;
  // Kol langas atidarytas, adresas įrašomas į lango istorijos įrašą, kuris uždarant pašalinamas („Atgal“) –
  // todėl uždarius filtrus adresą su filtrais įrašome dar kartą (dalinimuisi ir puslapio atnaujinimui)
  openSheet({ title: "Filtruoti ir rūšiuoti", html: body(), onClose: () => ui.view === "shop" && shopToUrl() });
  const root = $("#sheetBody");
  const redraw = () => {
    root.querySelector(".sheetPad").outerHTML = body();
  };
  root.addEventListener("change", e => {
    if (applyFilterInput(e.target) && !e.target.dataset.fGo) redraw();
    else if (e.target.dataset.fGo) setTimeout(redraw, 30);
  });
  root.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-f-apply]")) return closeSheet();
    if (t?.closest("[data-f-clear]") || t?.closest("[data-reset-filters]")) {
      resetFilters();
      redraw();
    }
  });
}
