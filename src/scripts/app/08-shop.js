// 08 – Katalogas: /kvepalai, /moterims, /vyrams, /unisex, /meginukai, /kategorija/<id>, /visos-prekes (?tipas=), /bestselleriai, /nuolaidos.
// Filtrai ir paieška – adreso parametruose (?q=&seima=&natos=&originalas=&konc=&formatas=&kaina=nuo-iki&likutis=&rikiuoti=),
// todėl nuorodą galima nukopijuoti ir pasidalinti. Kaip parfumada.lt: Pagal lytį · Kategorija · Kvapo pobūdis · Natos ·
// Originalo kvapas · Kaina (nuo–iki) · Likutis (+ koncentracija, formatas).
// v15: formatas – kitų tipų talpa / svoris; elektriniams difuzoriams kvapo filtrų nėra.
// v19: „Kada tinka“ (paros laikas, proga, sezonas) pašalinta – seni ?laikas=&proga=&sezonas= ignoruojami.
// Kompiuteryje filtrai – kairėje šoninėje juostoje, telefone – lange („Filtrai“). Po 24 kvapus, „Rodyti daugiau“.
const STOCK_NAME = { yra: "Yra sandėlyje", nera: "Išparduota" };
const SORTS = [
  { id: "rank", name: "Populiariausi" },
  { id: "new", name: "Naujausi" },
  { id: "price-asc", name: "Pigiausi" },
  { id: "price-desc", name: "Brangiausi" }
];
const noteList = p => [...p.notes.top, ...p.notes.heart, ...p.notes.base];
// Formatas (ne kvepalams): „100 ml“, „180 g“ – raktas ir pavadinimas sutampa
const fmtKey = (p, ml) => sizeLabel(ml, p).replace(/\u00a0/g, " ");
const allNotes = () => [...new Set(PRODUCTS.flatMap(noteList))].sort((a, b) => a.localeCompare(b, "lt"));
// Sąrašo filtrai: būsenos raktas → adreso parametras ir tikrinimas
const SET_FILTERS = {
  families: { param: "seima", test: (p, set) => set.has(p.family) },
  notes: { param: "natos", test: (p, set) => noteList(p).some(n => set.has(n)) },
  inspired: { param: "originalas", test: (p, set) => set.has(inspiredOf(p)) },
  types: { param: "tipas", test: (p, set) => set.has(typeOf(p)) },
  conc: { param: "konc", test: (p, set) => set.has(p.conc) },
  fmt: { param: "formatas", test: (p, set) => p.sizes.some(s => set.has(fmtKey(p, s.ml))) },
  stock: { param: "likutis", test: (p, set) => (set.has("yra") && inStock(p)) || (set.has("nera") && !inStock(p)) }
};
// Kaina nuo–iki (pagal pigiausią tūrį arba mėginuką): ?kaina=20-40
const shopPrice = p => (shop.samples ? p.sample : minPrice(p));
const priceOk = p => (shop.pmin == null || shopPrice(p) >= shop.pmin) && (shop.pmax == null || shopPrice(p) <= shop.pmax);
const priceBounds = () => {
  const v = PRODUCTS.filter(ofShopType).map(shopPrice);
  return { lo: Math.floor(Math.min(...v)), hi: Math.ceil(Math.max(...v)) };
};
// Ypatingi sąrašai: bestselleriai (populiariausi) ir nuolaidos (tik kvapai su tikra sena kaina)
const SPECIAL = {
  // v27: visos prekės – visi tipai viename sąraše (telefone – ☰ meniu viršuje), filtras „Kategorija“
  "visos-prekes": { title: "Visos prekės", sub: "", test: () => true },
  bestselleriai: { title: "Bestselleriai", sub: "Populiariausi Vaidore kvapai – juos dažniausiai renkasi pirkėjai.", test: p => bestList().includes(p) },
  nuolaidos: { title: "Didžiausios nuolaidos", sub: "Kvapai su nuolaida. Perbraukta – mažiausia kaina per 30 dienų iki nuolaidos.", test: p => onSale(p) }
};
const PAGE = 24;
// type – prekės tipas (TYPES, 03-catalog); lyties, mėginukų puslapiai – tik kvepalai; kategorijos,
// bestselleriai, nuolaidos – visi tipai (type: null)
const shop = { base: "kvepalai", type: "kvepalai", gender: "all", category: null, samples: false, special: null, q: "", sort: "rank", pmin: null, pmax: null, limit: PAGE };
for (const k in SET_FILTERS) shop[k] = new Set();
const concs = () => [...new Set(perfumes().map(p => p.conc))];
const ofShopType = p => !shop.type || typeOf(p) === shop.type;
const setOf = v => new Set(String(v || "").split(",").filter(Boolean));

// Iš adreso (router) → būsena
function shopFromRoute(base, params) {
  shop.base = base;
  shop.gender = GENDER_NAME[base] ? base : "all";
  shop.samples = base === "meginukai";
  shop.type = TYPE.has(base) ? base : shop.gender !== "all" || shop.samples ? "kvepalai" : null;
  shop.category = base.startsWith("kategorija/") ? base.slice(11) : null;
  shop.special = SPECIAL[base] ? base : null;
  shop.q = params.get("q") || "";
  const [lo, hi] = String(params.get("kaina") || "").split("-");
  shop.pmin = lo !== "" && lo != null && isFinite(lo) ? Number(lo) : null;
  shop.pmax = hi !== "" && hi != null && isFinite(hi) ? Number(hi) : null;
  for (const [k, f] of Object.entries(SET_FILTERS)) shop[k] = setOf(params.get(f.param));
  shop.sort = SORTS.some(s => s.id === params.get("rikiuoti")) ? params.get("rikiuoti") : "rank";
  shop.limit = PAGE;
}
// Būsena → adresas (be naujo įrašo istorijoje)
function shopToUrl() {
  const ps = new URLSearchParams();
  if (shop.q) ps.set("q", shop.q);
  for (const [k, f] of Object.entries(SET_FILTERS)) if (shop[k].size) ps.set(f.param, [...shop[k]].join(","));
  if (shop.pmin != null || shop.pmax != null) ps.set("kaina", `${shop.pmin ?? ""}-${shop.pmax ?? ""}`);
  if (shop.sort !== "rank") ps.set("rikiuoti", shop.sort);
  const qs = ps.toString();
  const url = absUrl(shop.base + (qs ? `?${qs}` : ""));
  if (url !== location.href) history.replaceState(history.state, "", url);
}
function shopFilter(p, skip = "") {
  return (
    ofShopType(p) &&
    (!shop.samples || hasSample(p)) &&
    forGender(p, shop.gender) &&
    (!shop.category || (p.categories || []).includes(shop.category)) &&
    (!shop.special || SPECIAL[shop.special].test(p)) &&
    (skip === "price" || priceOk(p)) &&
    Object.entries(SET_FILTERS).every(([k, f]) => skip === k || !shop[k].size || f.test(p, shop[k])) &&
    matches(p, shop.q)
  );
}
function shopList() {
  const list = PRODUCTS.filter(p => shopFilter(p));
  const by = {
    rank: shop.special === "nuolaidos" ? (a, b) => salePct(b) - salePct(a) || a.rank - b.rank : (a, b) => a.rank - b.rank,
    new: (a, b) => String(b.added).localeCompare(String(a.added)),
    "price-asc": (a, b) => shopPrice(a) - shopPrice(b),
    "price-desc": (a, b) => shopPrice(b) - shopPrice(a)
  };
  // Išparduoti – sąrašo gale
  return list.sort((a, b) => inStock(b) - inStock(a) || (by[shop.sort] || by.rank)(a, b));
}
const filterCount = () => Object.keys(SET_FILTERS).reduce((n, k) => n + shop[k].size, 0) + (shop.pmin != null || shop.pmax != null ? 1 : 0);

function shopTitle() {
  if (shop.category) return CATEGORY.get(shop.category)?.name || "Kategorija";
  if (shop.special) return SPECIAL[shop.special].title;
  if (shop.samples) return "Mėginukai 2 ml";
  if (shop.gender !== "all") return GENDER_TITLE[shop.gender];
  return TYPE.get(shop.type || "kvepalai").name;
}
function shopSub() {
  if (shop.category) return CATEGORY.get(shop.category)?.description || "";
  if (shop.special) return SPECIAL[shop.special].sub;
  if (shop.samples) return `Išbandykite kvapą namuose prieš pirkdami buteliuką. ${creditText()}`;
  return "";
}
// Filtrų grupės (kaip parfumada.lt) – suskleistos, išskyrus „Pagal lytį“ ir tas, kuriose yra pasirinkimų; pirkėjo
// atskleistos / suskleistos grupės tokios ir lieka perpiešiant
const openGroups = new Map();
const og = (title, def) => ((openGroups.has(title) ? openGroups.get(title) : def) ? " open" : "");
document.addEventListener(
  "toggle",
  e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.classList.contains("fGroup")) return;
    const t = d.querySelector("summary")?.textContent.trim();
    if (t) openGroups.set(t, d.open);
  },
  true
);
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
  const group = (title, body, open = true) => `<details class="fGroup"${og(title, open)}><summary>${title}${glyph("chev-down")}</summary><div class="fChecks">${body}</div></details>`;
  const notes = allNotes().filter(x => n(p => noteList(p).includes(x), "notes") || shop.notes.has(x));
  const perf = shop.type === "kvepalai";
  const scented = !shop.type || TYPE.get(shop.type).scented;
  const inType = PRODUCTS.filter(ofShopType);
  const insp = [...new Set(inType.map(inspiredOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "lt")).filter(x => n(p => inspiredOf(p) === x, "inspired") || shop.inspired.has(x));
  const fmts = perf || !shop.type ? [] : [...new Map(inType.flatMap(p => p.sizes.map(s => [fmtKey(p, s.ml), s.ml]))).entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
  // Visų prekių puslapyje (v27) – pirmas filtras „Kategorija“ (prekių tipai)
  const typeGroup =
    shop.special === "visos-prekes" && typesInUse().length > 1
      ? group("Kategorija", typesInUse().map(t => check("types", t.id, t.name, n(p => typeOf(p) === t.id, "types"))).join(""), !!shop.types.size)
      : "";
  return `${sortGroup}${typeGroup}${
    !perf
      ? ""
      : `<details class="fGroup" open><summary>Pagal lytį${glyph("chev-down")}</summary><div class="fChecks">${genders
    .map(
      ([href, name]) =>
        `<label class="fCheck"><input type="radio" name="fGender${live ? "" : "S"}" data-f-go="${href}"${
          (href === "kvepalai" ? shop.gender === "all" && !shop.samples && !shop.category : shop.gender === href) ? " checked" : ""
        } /><span>${name}</span></label>`
          )
          .join("")}</div></details>`
  }
${
  cats.length
    ? `<details class="fGroup"${og("Kolekcijos", !!shop.category)}><summary>Kolekcijos${glyph("chev-down")}</summary><div class="fChecks">${cats
        .map(c => `<label class="fCheck"><input type="radio" name="fCat${live ? "" : "S"}" data-f-go="kategorija/${c.id}"${shop.category === c.id ? " checked" : ""} /><span>${esc(c.name)}</span></label>`)
        .join("")}</div></details>`
    : ""
}
${
  scented
    ? `${group("Kvapo pobūdis", visibleFamilies()
        .map(f => check("families", f.id, f.name, n(p => p.family === f.id, "families")))
        .join(""), !!shop.families.size)}
${group("Natos", `<div class="fScroll">${notes.map(x => check("notes", x, x, n(p => noteList(p).includes(x), "notes"))).join("")}</div>`, !!shop.notes.size)}
${insp.length ? group("Originalo kvapas", `<div class="fScroll">${insp.map(x => check("inspired", x, x, n(p => inspiredOf(p) === x, "inspired"))).join("")}</div>`, !!shop.inspired.size) : ""}`
    : ""
}
${fmts.length > 1 || shop.fmt.size ? group("Formatas", fmts.map(x => check("fmt", x, x, n(p => p.sizes.some(s => fmtKey(p, s.ml) === x), "fmt"))).join(""), !!shop.fmt.size) : ""}
${
  perf
    ? `<details class="fGroup"${og("Koncentracija", !!shop.conc.size)}><summary>Koncentracija${glyph("chev-down")}</summary><div class="fChecks">${concs()
        .map(c => check("conc", c, `${c} · ${CONC_NAME[c] || ""}`, n(p => p.conc === c, "conc")))
        .join("")}</div></details>`
    : ""
}
${priceGroupHTML(live)}
${group("Likutis", Object.entries(STOCK_NAME).map(([id, name]) => check("stock", id, name, n(p => (id === "yra" ? inStock(p) : !inStock(p)), "stock"))).join(""), !!shop.stock.size)}
${
  perf
    ? `<details class="fGroup"${og("Formatas", shop.samples)}><summary>Formatas${glyph("chev-down")}</summary><div class="fChecks"><label class="fCheck"><input type="radio" name="fFmt${live ? "" : "S"}" data-f-go="meginukai"${
        shop.samples ? " checked" : ""
      } /><span>Mėginukai 2 ml</span></label></div></details>`
    : ""
}
${filterCount() ? `<button class="btn ghost small block" type="button" data-reset-filters>Išvalyti filtrus</button>` : ""}`;
}
// Kaina nuo–iki: du laukai (kaip parfumada.lt), pritaikoma įvedus („change“ – po Enter arba išėjus iš lauko)
function priceGroupHTML(live) {
  const { lo, hi } = priceBounds();
  const open = shop.pmin != null || shop.pmax != null;
  const inp = (k, ph, v) =>
    `<label class="fPrice"><span>${k === "pmin" ? "Nuo" : "Iki"}</span><span class="fPriceIn"><b aria-hidden="true">€</b><input type="number" inputmode="decimal" min="0" step="1" data-price="${k}" placeholder="${ph}" value="${v ?? ""}" aria-label="Kaina ${k === "pmin" ? "nuo" : "iki"}, €"${live ? "" : ' data-sheet="1"'} /></span></label>`;
  return `<details class="fGroup"${og("Kaina", open)}><summary>Kaina${glyph("chev-down")}</summary><div class="fChecks"><p class="fPriceHint">Didžiausia kaina – ${eurShort(hi)}</p><div class="fPriceRow">${inp("pmin", lo, shop.pmin)}${inp("pmax", hi, shop.pmax)}</div></div></details>`;
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
    const group = PRODUCTS.filter(p => ofShopType(p) && forGender(p, shop.gender) && (!shop.category || (p.categories || []).includes(shop.category))).sort(
      (a, b) => a.rank - b.rank
    );
    stBox.innerHTML = !stName ? "" : photo ? photoHTML(photo, { eager: true, cls: "shopStage" }) : stageHTML(stName, group.length ? group : PRODUCTS, { eager: true, cls: "shopStage" });
  }
  $("#shopHead").classList.toggle("hasStage", !!stName);
  $("#shopHead").classList.toggle("onDark", !!photo?.dark);
  const discRow =
    shop.samples && DISC
      ? `<button class="discBanner" type="button" data-disc><span class="rowIco">${glyph("drop")}</span><span class="rowTxt"><b>${esc(DISC.name)}</b><small>Bet kurie ${DISC.count} mėginukai už ${eur(DISC.price)}</small></span><span class="chev">${glyph("chev-right")}</span></button>`
      : "";
  const shown = list.slice(0, shop.limit);
  $("#shopGrid").innerHTML = list.length
    ? discRow + shown.map(p => cardHTML(p, { sample: shop.samples, heart: false })).join("")
    : shop.type && shop.type !== "kvepalai" && !PRODUCTS.some(p => typeOf(p) === shop.type)
      ? `<div class="empty" style="grid-column:1/-1"><h3>${esc(TYPE.get(shop.type).name)} – netrukus</h3><p>Šiuo metu šių prekių dar neturime.</p><a class="btn primary" href="kvepalai" data-nav>Visi kvepalai</a></div>`
      : shop.special === "nuolaidos" && !filterCount() && !shop.q
      ? `<div class="empty" style="grid-column:1/-1"><h3>Šiuo metu nuolaidų nėra</h3><p>Nuolaidas skelbiame naujienlaiškyje – užsiprenumeravę sužinosite pirmi.</p><a class="btn primary" href="kvepalai" data-nav>Visi kvepalai</a></div>`
      : `<div class="empty" style="grid-column:1/-1">${glyph("search")}<h3>Nieko neradome</h3><p>Pabandykite kitą žodį arba atsakykite į 3 klausimus – pasiūlysime 3 kvapus.</p><button class="btn primary" type="button" data-quiz>${glyph("spark")}Rask savo kvapą</button><button class="btn ghost" type="button" data-reset-filters>Rodyti visus kvapus</button></div>`;
  $("#shopMore").innerHTML =
    list.length > shop.limit
      ? `<span>Rodoma ${shown.length} iš ${list.length}</span><button class="btn ghost" type="button" data-shop-more>Rodyti daugiau</button>`
      : "";
  const nouns = shop.special === "visos-prekes" ? ["prekė", "prekės", "prekių"] : TYPE.get(shop.type)?.n || TYPES[0].n;
  $("#shopCount").textContent = plural(list.length, ...nouns);
  $("#shopSort").value = shop.sort;
  const n = filterCount();
  const fc = $("#shopFilterCount");
  fc.hidden = !n;
  fc.textContent = n;
  const chips = [
    ...[...shop.families].map(id => ["families", id, familyName(id)]),
    ...[...shop.notes].map(id => ["notes", id, id]),
    ...[...shop.types].map(id => ["types", id, TYPE.get(id)?.name || id]),
    ...[...shop.inspired].map(id => ["inspired", id, `Įkvėpti ${id}`]),
    ...[...shop.fmt].map(id => ["fmt", id, id]),
    ...[...shop.conc].map(id => ["conc", id, id]),
    ...[...shop.stock].map(id => ["stock", id, STOCK_NAME[id] || id]),
    ...(shop.pmin != null || shop.pmax != null ? [["price", "", `${shop.pmin != null ? `nuo ${eurShort(shop.pmin)}` : ""}${shop.pmin != null && shop.pmax != null ? " " : ""}${shop.pmax != null ? `iki ${eurShort(shop.pmax)}` : ""}`]] : [])
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
  shop.pmin = shop.pmax = null;
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
  if (input.dataset.price) {
    const v = input.value.trim() === "" ? null : Math.max(0, Number(input.value));
    shop[input.dataset.price] = Number.isFinite(v) ? v : null;
    if (shop.pmin != null && shop.pmax != null && shop.pmin > shop.pmax) [shop.pmin, shop.pmax] = [shop.pmax, shop.pmin];
    shop.limit = PAGE;
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
      if (b.dataset.unset === "price") shop.pmin = shop.pmax = null;
      else shop[b.dataset.unset].delete(b.dataset.id);
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
  const body = () => `<div class="sheetPad fSheet">${filtersHTML(false)}<div class="fActions"><button class="btn ghost" type="button" data-f-clear>Išvalyti</button><button class="btn primary" type="button" data-f-apply>Rodyti ${shop.special === "visos-prekes" ? plural(shopList().length, "prekę", "prekes", "prekių") : !shop.type || shop.type === "kvepalai" ? plural(shopList().length, "kvapą", "kvapus", "kvapų") : `(${shopList().length})`}</button></div></div>`;
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
