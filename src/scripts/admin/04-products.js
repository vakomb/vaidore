// 04 - Produktai: sąrašas (paieška, filtras; greiti veiksmai braukiant / dešiniuoju pelės mygtuku - likutis, rodyti / slėpti)
// ir produkto ekranas admin/kvapai/<id> (admin/kvapai/naujas - naujas; kompiuteryje - šalia sąrašo). Forma - iOS stiliumi:
// pagrindiniame ekrane nuotraukos, prekė, kaina, rodymas; ilgesnės dalys - vidiniuose ekranuose (Aprašymas, Natos, Savybės,
// Spalvos, Kolekcijos, Išsamiau, Užpildyti iš aprašymo). Automatinis užpildymas (v15, 13-autofill.js) - su peržiūra prieš
// pritaikant. Bendras kvapas (scents) - kvapo pasirinkimas ir naujo kvapo sukūrimas.
// id - adresas <tipas>/<id>; sukūrus nebekeičiamas (gali būti pirkėjų krepšeliuose ir nuorodose).
const PROD_FILTERS = [
  ["visi", "Visi", () => true],
  ["matomi", "Matomi", p => p.visible !== false],
  ["paslepti", "Paslėpti", p => p.visible === false],
  ["isparduoti", "Išparduoti", p => p.stock === 0]
];
const prodState = { filter: "visi", q: "", rows: [], at: 0, shown: 60, f: {}, pcats: new Map(), cats: [] };
// Sąrašo filtrai (v20): [raktas, pavadinimas, reikšmės(p) → [id…], vardas(id)]. Rodomi tik turintys ≥ 2 reikšmes.
const PROD_FACETS = [
  ["type", "Kategorija", p => [p.type || "kvepalai"], id => VD.TYPES.find(t => t.id === id)?.name || id],
  ["inspired", "Originalas", p => [(p.inspired || "").trim()], id => id || "Be originalo"],
  ["gender", "Kam", p => ((p.type || "kvepalai") === "kvepalai" ? [p.gender || ""] : []), id => VD.GENDER_NAME[id] || id],
  ["family", "Kvapo šeima", p => (p.family ? [p.family] : []), id => famName(id)],
  ["cat", "Kolekcija", p => prodState.pcats.get(p.id) || [], id => prodState.cats.find(c => c.id === id)?.name || id],
  // v33d: vertimas į anglų kalbą (16-i18n.js - enMissing)
  ["en", "Vertimas", p => ("i18n" in p ? [enMissing(p) ? "truksta" : "yra"] : []), id => (id === "truksta" ? "Trūksta EN" : "Išversta")]
];
const facetOk = (p, skip = "") => PROD_FACETS.every(([k, , vals]) => k === skip || !(k in prodState.f) || vals(p).includes(prodState.f[k]));
const facetCount = () => Object.keys(prodState.f).length;
const CAPS = [
  ["gold", "Auksinis"],
  ["black", "Juodas"],
  ["silver", "Sidabrinis"],
  ["wood", "Medinis"]
];
const SHAPES = [
  ["rect", "Stačiakampis"],
  ["tall", "Aukštas"],
  ["round", "Apvalus"],
  ["square", "Kvadratinis"]
];
const BADGES = ["", "Populiaru", "Naujiena", "Riboto leidimo"];
// Forma pagal kategoriją (v15, minimalistinė): pavyzdžiai laukuose ir pavadinimai - kiekvienam prekės tipui savi
const TYPE_FORM = {
  kvepalai: { name: "VANOR", tagline: "Ryto gaiva ant baltųjų rožių", desc: "Kaip kvapas atsiskleidžia, kam ir kada tinka", inci: "Ingredientai (INCI)", inciPh: "Alcohol Denat., Parfum, Aqua…", notes: "Natos" },
  difuzoriai: { name: "Difuzorius LIBRADORE", tagline: "Švelnus gėlių aromatas namams", desc: "Kvapas, kiek jo užtenka", inci: "Sudėtis", inciPh: "Isopropyl Myristate, Parfum…", notes: "Kvapas" },
  zvakes: { name: "Kvapni žvakė LIBRADORE", tagline: "Jaukus vanilės aromatas vakarams", desc: "Kvapas, vaškas, degimo trukmė", inci: "Sudėtis", inciPh: "Sojų vaškas, kvapioji kompozicija…", notes: "Kvapas" },
  aliejai: { name: "Aromatinis aliejus LIBRADORE", tagline: "Gaivus citrusų aromatas difuzoriui", desc: "Kvapas, kaip naudoti, kiek užtenka", inci: "Sudėtis", inciPh: "Parfum, Dipropylene Glycol…", notes: "Kvapas" },
  "elektriniai-difuzoriai": { name: "Elektrinis difuzorius AROMA", tagline: "Tylus difuzorius su apšvietimu", desc: "Kaip veikia, kas komplekte", inci: null, notes: "Kvapas" },
  purskikliai: { name: "Namų purškiklis LIBRADORE", tagline: "Gėlių ir vanilės aromatas akimirksniu", desc: "Kvapas, kaip ir kur purkšti", inci: "Sudėtis", inciPh: "Aqua, Alcohol Denat., Parfum…", notes: "Kvapas" },
  vaskai: { name: "Kaitinamas vaškas LIBRADORE", tagline: "Švelnus gėlių aromatas aromalempai", desc: "Kvapas, kiek kubelių, kaip naudoti", inci: "Sudėtis", inciPh: "Sojų vaškas, kvapioji kompozicija…", notes: "Kvapas" },
  aromalempos: { name: "Aromalempa RANKOS", tagline: "Keraminė aromalempa vaškui ir aliejams", desc: "Medžiaga, dydis, kaip naudoti", inci: null, notes: "Kvapas" }
};
// Trumpi pavadinimai kategorijos pasirinkimui
const TYPE_SHORT = { "elektriniai-difuzoriai": "Elektriniai", purskikliai: "Purškikliai", vaskai: "Vaškai", aromalempos: "Aromalempos" };
// Katalogo perjungiklis (telefone ir planšetėje; kompiuteryje - šoniniame meniu)
const catalogSeg = cur =>
  `<div class="axSeg axCatSeg" role="tablist" aria-label="Katalogas">${[
    ["kvapai", "Produktai"],
    ["kvapu-sarasas", "Kvapai"],
    ["kategorijos", "Kategorijos"],
    ["natos", "Natos"]
  ]
    .map(([id, n]) => `<a role="tab" href="admin/${id}" data-nav aria-selected="${cur === id}">${n}</a>`)
    .join("")}</div>`;

async function loadProducts(force = false) {
  if (!force && prodState.rows.length && Date.now() - prodState.at < 30000) return prodState.rows;
  const [rows, links, cats] = await Promise.all([
    sbRest("products?select=*&order=rank.asc,name.asc"),
    sbRest("product_categories?select=product_id,category_id").catch(() => []),
    sbRest("categories?select=id,name&order=sort.asc").catch(() => [])
  ]);
  prodState.rows = rows || [];
  prodState.cats = cats || [];
  prodState.pcats = new Map();
  for (const l of links || []) prodState.pcats.set(l.product_id, [...(prodState.pcats.get(l.product_id) || []), l.category_id]);
  prodState.at = Date.now();
  return prodState.rows;
}
async function renderProducts(main, param, seq) {
  if (isSplit()) {
    const { list, detail, fresh } = splitPanes(main, "products");
    if (fresh) {
      const cached = prodState.rows.length && Date.now() - prodState.at < 30000;
      list.innerHTML = productsListHTML(!cached);
      hydrateIcons(list);
      if (!cached) await loadProducts(true);
      if (stale(seq)) return;
      mountProductsList(list);
      if (cached) loadProducts(true).then(() => !stale(seq) && paintProducts());
    } else markCurrent(list, param ? `admin/kvapai/${param}` : "");
    if (!param) {
      detail.innerHTML = detailEmpty("tag", "Pasirinkite produktą arba sukurkite naują");
      return;
    }
    return renderProductEdit(detail, param, seq);
  }
  if (param) return renderProductEdit(main, param, seq);
  main.innerHTML = productsListHTML(!prodState.rows.length);
  hydrateIcons(main);
  if (prodState.rows.length) {
    mountProductsList(main);
    loadProducts(true).then(() => !stale(seq) && paintProducts());
  } else {
    await loadProducts(true);
    if (stale(seq)) return;
    mountProductsList(main);
  }
}
function productsListHTML(skeleton) {
  return pageHTML({
    title: "Produktai",
    titleId: !isSplit() || !A.param,
    actions: barLink("plus", "Naujas produktas", "admin/kvapai/naujas"),
    tools: `${catalogSeg("kvapai")}${searchHTML("prodQ", "Pavadinimas, nata, kategorija", prodState.q, "Paieška produktuose")}<div id="prodSeg"></div><div class="axFacets" id="prodFacets" role="toolbar" aria-label="Filtrai"></div>`,
    body: `<div id="prodList">${skeleton ? loading(8) : ""}</div>`
  });
}
function mountProductsList(box) {
  paintProducts();
  $("#prodQ", box).addEventListener("input", e => {
    prodState.q = e.target.value;
    prodState.shown = 60;
    paintProducts();
  });
  box.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const f = t?.closest("[data-pf]");
    if (f) {
      prodState.filter = f.dataset.pf;
      prodState.shown = 60;
      return paintProducts();
    }
    const fc = t?.closest("[data-facet]");
    if (fc) return pickFacet(fc.dataset.facet);
    if (t?.closest("[data-facet-clear]")) {
      prodState.f = {};
      prodState.shown = 60;
      return paintProducts();
    }
    if (t?.closest("[data-prod-more]")) {
      prodState.shown += 120;
      paintProducts();
    }
  });
  rowActions($("#prodList", box), cell => {
    const p = prodState.rows.find(x => x.id === cell.dataset.pid);
    if (!p) return [];
    return [
      { key: "stock", label: "Keisti likutį…", short: "Likutis", ico: "box", tone: "gray" },
      { key: "visible", label: p.visible === false ? "Rodyti parduotuvėje" : "Slėpti parduotuvėje", short: p.visible === false ? "Rodyti" : "Slėpti", ico: p.visible === false ? "eye" : "eye-off", tone: "dark" },
      { key: "view", label: "Atidaryti parduotuvėje", ico: "ext" }
    ];
  }, (cell, k) => productQuick(cell.dataset.pid, k));
}
const famName = id => VD.CAT.families.find(f => f.id === id)?.name || id || "";
function productLine(p) {
  return (p.type || "kvepalai") === "kvepalai"
    ? [VD.GENDER_NAME[p.gender] || "", famName(p.family), p.conc].filter(Boolean).join(" · ")
    : [typeName(p), AF_SCENTED.has(p.type || "kvepalai") ? famName(p.family) : ""].filter(Boolean).join(" · ");
}
// Sąraše - mažiausia kaina („nuo …“, jei talpų kelios)
function priceFrom(p) {
  const prices = (p.sizes || []).map(s => Number(s.price));
  if (!prices.length) return "-";
  return `${prices.length > 1 && Math.max(...prices) !== Math.min(...prices) ? "<small>nuo</small> " : ""}${eur(Math.min(...prices))}`;
}
function paintProducts() {
  const box = $("#prodList");
  if (!box) return;
  const seg = $("#prodSeg");
  if (seg) seg.innerHTML = segHTML(PROD_FILTERS.map(([id, name, fn]) => [id, name, prodState.rows.filter(fn).length]), prodState.filter, "data-pf");
  const fn = PROD_FILTERS.find(f => f[0] === prodState.filter)[2];
  const q = fold(prodState.q.trim());
  paintFacets();
  const rows = prodState.rows.filter(
    p => fn(p) && facetOk(p) && (!q || fold([p.name, p.id, p.inspired || "", p.tagline, famName(p.family), typeName(p), ...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])].join(" ")).includes(q))
  );
  if (!rows.length) {
    box.innerHTML = emptyBox(prodState.q || facetCount() ? "Nieko nerasta" : "Produktų nėra", facetCount() ? "Pakeiskite arba išvalykite filtrus." : "", `<a class="btn primary" href="admin/kvapai/naujas" data-nav>${glyph("plus")}Naujas produktas</a>`);
    return hydrateIcons(box);
  }
  const cur = isSplit() && A.sec === "kvapai" ? A.param : "";
  box.innerHTML = `<div class="ig axList admProducts">${rows
    .slice(0, prodState.shown)
    .map(p => {
      const pills = [p.visible === false && pillHTML("paslėptas"), "i18n" in p && enMissing(p) && pillHTML("be EN", "amber"), p.stock === 0 ? pillHTML("išparduota", "red") : p.stock != null && p.stock <= 3 ? pillHTML(`liko ${p.stock}`, "amber") : ""].filter(Boolean).join("");
      return `<div class="axCell${p.visible === false ? " off" : ""}" data-pid="${esc(p.id)}" data-title="${esc(p.name)}"><a class="axRow axRow2" href="admin/kvapai/${esc(p.id)}" data-nav${cur === p.id ? ' aria-current="page"' : ""}>${thumb(
        p
      )}<span class="axRowTxt"><b>${esc(p.name)}</b><small>${esc(productLine(p))}${p.badge ? ` · ${esc(p.badge)}` : ""}</small></span><span class="axVal axValCol"><span class="money">${priceFrom(p)}</span>${pills ? `<span class="axPills">${pills}</span>` : ""}</span><span class="axChev">${glyph(
        "chev-right"
      )}</span></a><button class="axRowMore" type="button" data-row-more aria-label="Veiksmai">${glyph("dots")}</button></div>`;
    })
    .join("")}</div>${rows.length > prodState.shown ? `<button class="axMoreBtn" type="button" data-prod-more>Rodyti daugiau (${rows.length - prodState.shown})</button>` : ""}`;
  hydrateIcons(box);
}
// Filtrų mygtukai po paieška: „Kategorija ▾“, „Originalas ▾“… (pasirinkta - juodas, su reikšme), „Išvalyti“
function facetOptions(key) {
  const [, , vals] = PROD_FACETS.find(f => f[0] === key);
  const fn = PROD_FILTERS.find(f => f[0] === prodState.filter)[2];
  const n = new Map();
  for (const p of prodState.rows) if (fn(p) && facetOk(p, key)) for (const v of new Set(vals(p))) n.set(v, (n.get(v) || 0) + 1);
  return n;
}
function paintFacets() {
  const box = $("#prodFacets");
  if (!box) return;
  const all = key => new Set(prodState.rows.flatMap(PROD_FACETS.find(f => f[0] === key)[2]));
  const btns = PROD_FACETS.filter(([k]) => k in prodState.f || all(k).size > 1).map(([k, label, , name]) => {
    const on = k in prodState.f;
    return `<button type="button" class="axFacet${on ? " on" : ""}" data-facet="${k}" aria-haspopup="menu"${on ? ` aria-label="${esc(label)}: ${esc(name(prodState.f[k]))}"` : ""}><span>${esc(on ? name(prodState.f[k]) : label)}</span>${glyph("chev-down")}</button>`;
  });
  box.hidden = !btns.length;
  box.innerHTML = btns.join("") + (facetCount() ? `<button type="button" class="axFacet axFacetClear" data-facet-clear>${glyph("x")}<span>Išvalyti</span></button>` : "");
  hydrateIcons(box);
}
async function pickFacet(key) {
  const [, label, , name] = PROD_FACETS.find(f => f[0] === key);
  const n = facetOptions(key);
  const cur = prodState.f[key];
  const opts = [...n.entries()].sort((a, b) => (key === "inspired" && !a[0]) - (key === "inspired" && !b[0]) || name(a[0]).localeCompare(name(b[0]), "lt"));
  const pick = await actionSheet({
    title: label,
    actions: [
      { key: "__all", label: `Visi (${prodState.rows.filter(p => PROD_FILTERS.find(f => f[0] === prodState.filter)[2](p) && facetOk(p, key)).length})`, checked: cur == null },
      ...opts.map(([v, c]) => ({ key: `v:${v}`, label: `${name(v)} (${c})`, checked: cur === v }))
    ]
  });
  if (pick == null) return;
  if (pick === "__all") delete prodState.f[key];
  else prodState.f[key] = pick.slice(2);
  prodState.shown = 60;
  paintProducts();
  $(`#prodFacets [data-facet="${key}"]`)?.focus();
}
async function patchProduct(id, patch) {
  const [row] = (await sbRest(`products?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
  if (!row) throw new Error("Produktas nerastas arba neturite teisių");
  const i = prodState.rows.findIndex(p => p.id === id);
  if (i >= 0) prodState.rows[i] = row;
  return row;
}
// Greiti veiksmai sąraše: likutis (langas), rodyti / slėpti (iškart, su „Atšaukti“), atidaryti parduotuvėje
async function productQuick(id, k) {
  const p = prodState.rows.find(x => x.id === id);
  if (!p) return;
  if (k === "view") return window.open(`${p.type || "kvepalai"}/${p.id}`, "_blank", "noopener");
  if (k === "stock") return openStockSheet(p);
  if (k === "visible") {
    const on = p.visible === false;
    try {
      await patchProduct(id, { visible: on });
      paintProducts();
      await VD.refreshCatalog({ rerender: false }).catch(() => {});
      toast(on ? `„${p.name}“ rodomas` : `„${p.name}“ paslėptas`, {
        icon: on ? "eye" : "eye-off",
        action: "Atšaukti",
        ms: 5000,
        onAction: () =>
          patchProduct(id, { visible: !on })
            .then(() => {
              paintProducts();
              return VD.refreshCatalog({ rerender: false });
            })
            .catch(err => toast(errText(err), { icon: "info" }))
      });
    } catch (err) {
      toast(errText(err), { icon: "info" });
    }
  }
}
function openStockSheet(p) {
  openSheet({
    title: p.name,
    html: `<form class="sheetPad admForm" novalidate>
<div class="ig"><div class="axField axStepper"><span>Likutis, vnt.</span><span class="axStep"><button type="button" class="roundBtn" data-step="-1" aria-label="Mažiau">${glyph("minus")}</button><input name="stock" type="number" inputmode="numeric" min="0" step="1" value="${
      p.stock ?? ""
    }" placeholder="∞" aria-label="Likutis" data-stock /><button type="button" class="roundBtn" data-step="1" aria-label="Daugiau">${glyph("plus")}</button></span></div></div>
<p class="igFoot">Tuščia - neribotas. 0 - „Laikinai išparduota“ ir „Pranešti, kai bus“.</p>
<button class="btn primary block" type="submit">Išsaugoti</button></form>`
  });
  const form = $("#sheetBody form");
  const inp = form.elements.stock;
  form.addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest("[data-step]");
    if (!b) return;
    inp.value = String(Math.max(0, (Number(inp.value) || 0) + Number(b.dataset.step)));
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const raw = inp.value.trim();
    const stock = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
    if (raw !== "" && !Number.isFinite(stock)) return toast("Likutis - sveikas skaičius", { icon: "info" });
    const before = p.stock;
    busy($("button[type=submit]", form), async () => {
      const row = await patchProduct(p.id, { stock });
      closeSheet();
      paintProducts();
      await catalogChanged(stock === 0 ? "Pažymėta: išparduota" : "Likutis išsaugotas");
      // Vėl turime - pasiūlome pranešti laukiantiems
      if (before === 0 && stock !== 0) offerRestockNotify(row);
    });
  });
}
async function offerRestockNotify(p) {
  const waiting = await sbRest(`restock_requests?select=id&product_id=eq.${encodeURIComponent(p.id)}&notified=eq.false`).catch(() => []);
  if (!waiting?.length) return;
  toast(`${p.name}: laukia ${plural(waiting.length, "pirkėjas", "pirkėjai", "pirkėjų")}`, {
    icon: "bell",
    action: "Pranešti",
    ms: 8000,
    onAction: () => notifyRestock(p.id).catch(err => toast(errText(err), { icon: "info" }))
  });
}

// ── Produkto ekranas ─────────────────────────────────
const blankProduct = () => ({
  id: "",
  name: "",
  inspired: "",
  type: "kvepalai",
  conc: "EDP",
  gender: "unisex",
  family: VD.CAT.families[0]?.id || "",
  tagline: "",
  description: "",
  ingredients: "",
  notes: { top: [], heart: [], base: [] },
  longevity: 3,
  sillage: 3,
  sizes: [],
  attrs: {},
  scent_id: null,
  sample: 4.9,
  look: { liquid: "#E8D9C4", tint: "#F7F1E8", cap: "gold", shape: "rect" },
  badge: "Naujiena",
  rank: 100,
  added: new Date().toISOString().slice(0, 10),
  stock: null,
  images: [],
  visible: true,
  // v29: prekės puslapio turinys (migracija 20261122090000)
  subtitle: "",
  mood_image: "",
  mood_title: "",
  mood_line: "",
  // v33d: vertimai (migracija 20261126120000)
  i18n: {}
});
// Laukas eilutėje: pavadinimas kairėje, reikšmė dešinėje; stack - pavadinimas virš (ilgam tekstui)
const fieldHTML = (label, input, { cls = "", stack = false, attrs = "" } = {}) => `<label class="field axField${stack ? " stack" : ""}${cls ? ` ${cls}` : ""}" ${attrs}><span>${label}</span>${input}</label>`;
const chipCheck = (name, value, on, label) => `<label class="admCheck"><input type="checkbox" name="${name}" value="${esc(value)}"${attr(on, "checked")} /><span>${esc(label)}</span></label>`;
const chipsRow = (label, chips) => `<div class="admChecks"><span>${label}</span><div class="admChipList">${chips}</div></div>`;

async function renderProductEdit(main, id, seq) {
  const isNew = id === "naujas";
  const back = isSplit() ? null : { href: "admin/kvapai", label: "Produktai" };
  main.innerHTML = pageHTML({ title: isNew ? "Naujas produktas" : "Produktas", back, body: loading(6) });
  const [rows, fams, cats, links, scents] = await Promise.all([
    // Naujam produktui laukai „Įkvėpta“ ir „Ingredientai“ rodomi tik jei duomenų bazėje jau yra stulpeliai inspired
    // (migracija 0300) ir ingredients (20261117000000)
    isNew
      ? sbRest("products?select=*&limit=1").then(r => {
          const b = blankProduct();
          if (r?.[0] && !("inspired" in r[0])) delete b.inspired;
          if (r?.[0] && !("ingredients" in r[0])) delete b.ingredients;
          if (r?.[0] && !("type" in r[0])) delete b.type;
          // v15: attrs, scent_id - tik po migracijos 20261120120000
          for (const k of ["attrs", "scent_id", "subtitle", "mood_image", "mood_title", "mood_line", "i18n"]) if (r?.[0] && !(k in r[0])) delete b[k];
          if (r?.[0] && "inspired_image" in r[0]) b.inspired_image = "";
          return [b];
        })
      : sbRest(`products?select=*&id=eq.${encodeURIComponent(id)}`),
    sbRest("families?select=*&order=sort.asc"),
    sbRest("categories?select=*&order=sort.asc"),
    isNew ? Promise.resolve([]) : sbRest(`product_categories?select=category_id&product_id=eq.${encodeURIComponent(id)}`),
    // Bendri kvapai (v15); lentelės dar nėra - null (automatinis užpildymas veikia ir be jų)
    sbRest("scents?select=*&order=name.asc").catch(() => null)
  ]);
  if (stale(seq)) return;
  const p = rows?.[0];
  if (!p) {
    main.innerHTML = pageHTML({ title: "Produktas nerastas", back, body: emptyBox("Tokio produkto nėra", "Galbūt jis ištrintas.", `<a class="btn primary" href="admin/kvapai" data-nav>Visi produktai</a>`) });
    return;
  }
  const ed = { p: structuredClone(p), isNew, cats: new Set(links.map(l => l.category_id)), images: [...(p.images || [])], scents, scentId: null, af: null, pending: null, fams };
  // Originalo nuotrauka (v18): produktui su kvapu - iš kvapo (keičiama kvape), be kvapo - įkeliama čia
  ed.inspImg = p.inspired_image || "";
  // Nuotaikos juosta (v29) - tik jei duomenų bazėje jau yra stulpeliai (migracija 20261122090000)
  ed.mood = { image: p.mood_image || "", title: p.mood_title || "", line: p.mood_line || "" };
  const n = p.notes || {};
  const opt = (v, label, cur) => `<option value="${esc(v)}"${sel(String(cur) === String(v))}>${esc(label)}</option>`;
  const tf = TYPE_FORM[p.type || "kvepalai"] || TYPE_FORM.kvepalai;
  const sumRow = (pane, title, cls = "", attrs = "") =>
    `<button class="axRow${cls ? ` ${cls}` : ""}" type="button" data-push="${pane}" ${attrs}><span class="axRowTxt"><b${pane === "natos" ? ' data-tf="notes"' : ""}>${title}</b></span><span class="axVal axSum" data-sum="${pane}"></span><span class="axChev">${glyph(
      "chev-right"
    )}</span></button>`;
  const body = `<form class="admForm prodForm" id="prodForm" novalidate>
<div data-pane="main">
<p class="formErr axErr" role="alert" hidden></p>
${isNew && "type" in p ? typePickHTML(p.type || "kvepalai") : ""}
${
  isNew
    ? `<div class="ig axAfEntry">${navRow({ button: true, attrs: 'data-push="af"', ico: "spark", icoBg: "var(--brand)", title: "Užpildyti iš aprašymo", sub: "Įklijuokite aprašymą arba pasirinkite kvapą" })}</div><div class="afOut" id="afOut" hidden></div>`
    : ""
}
<div class="admImgs" id="imgsBox"></div>
${groupHTML(
  `${fieldHTML("Pavadinimas", `<input name="name" required maxlength="60" value="${esc(p.name)}" placeholder="${esc(tf.name)}" data-tf-ph="name" />`)}${
    "type" in p && !isNew ? fieldHTML("Kategorija", `<select name="type">${VD.TYPES.map(t => opt(t.id, t.name, p.type || "kvepalai")).join("")}</select>`) : ""
  }${"type" in p && isNew ? `<input type="hidden" name="type" value="${esc(p.type || "kvepalai")}" />` : ""}${
    "inspired" in p ? fieldHTML("Originalas", `<input name="inspired" maxlength="120" value="${esc(p.inspired || "")}" placeholder="Tom Ford - Tobacco Vanille" />`, { cls: "scentOnly" }) : ""
  }${"inspired_image" in p ? `<div class="scentOnly" id="pInsp"></div>` : ""}${fieldHTML("Kam", `<select name="gender">${Object.entries(VD.GENDER_NAME).map(([v, l]) => opt(v, l, p.gender)).join("")}</select>`, { cls: "perfOnly" })}${fieldHTML(
    "Koncentracija",
    `<select name="conc">${Object.entries(VD.CONC_NAME).map(([v, l]) => opt(v, l, p.conc)).join("")}</select>`,
    { cls: "perfOnly" }
  )}${fieldHTML("Kvapo šeima", `<select name="family">${fams.map(f => opt(f.id, f.name, p.family)).join("")}</select>`, { cls: "scentOnly" })}`,
  { head: "Prekė" }
)}
<h2 class="igHead" id="sizesHead">Kaina</h2>
<div class="ig"><div class="admSizes" id="sizesBox"></div>${fieldHTML("Mėginukas 2 ml, €", `<input name="sample" inputmode="decimal" value="${esc(dec(p.sample))}" placeholder="0" />`, { cls: "perfOnly" })}${fieldHTML(
    "Likutis, vnt.",
    `<input name="stock" type="number" inputmode="numeric" min="0" step="1" value="${p.stock ?? ""}" placeholder="Neribotas" />`
  )}</div>
<p class="igFoot" id="sizesNote">Sena kaina - tik akcijai (mažiausia per 30 d.)</p>
${groupHTML(
  `<label class="axField axSwitchRow"><span>Rodomas parduotuvėje</span><input type="checkbox" name="visible" class="admSwitchInp"${attr(p.visible !== false, "checked")} /></label>${fieldHTML(
    "Žymė",
    `<select name="badge">${BADGES.map(b => opt(b, b || "Be žymės", p.badge || "")).join("")}</select>`
  )}`,
  { head: "Rodymas" }
)}
<div class="ig">${sumRow("aprasymas", "Aprašymas")}${sumRow("natos", esc(tf.notes), "scentOnly")}${"attrs" in p ? sumRow("savybes", "Savybės", "", 'id="attrsRow"') : ""}${sumRow("spalvos", "Spalvos")}${
    cats.length ? sumRow("kolekcijos", "Kolekcijos", "scentOnly") : ""
  }${"subtitle" in p ? sumRow("puslapis", "Puslapio turinys") : ""}${"i18n" in p ? sumRow("anglu", "Anglų kalba (EN)") : ""}${sumRow("isamiau", "Išsamiau")}</div>
${
  isNew
    ? ""
    : groupHTML(
        `${navRow({ href: `${p.type || "kvepalai"}/${p.id}`, title: "Peržiūrėti parduotuvėje", ext: true })}<button class="axRow danger" type="button" data-prod-delete><span class="axRowTxt"><b>Ištrinti produktą</b></span></button>`
      )
}
</div>
<div data-pane="aprasymas" data-title="Aprašymas" hidden>
<div class="ig">${fieldHTML("Trumpas aprašymas", `<input name="tagline" maxlength="90" value="${esc(p.tagline)}" placeholder="${esc(tf.tagline)}" />`, { stack: true })}${fieldHTML(
    "Aprašymas",
    `<textarea name="description" rows="7" maxlength="1500" placeholder="${esc(tf.desc)}">${esc(p.description)}</textarea>`,
    { stack: true }
  )}${
    "ingredients" in p
      ? fieldHTML(`<span data-tf="inci">${esc(tf.inci || "Sudėtis")}</span>`, `<textarea name="ingredients" rows="3" maxlength="1500" placeholder="${esc(tf.inciPh || "")}">${esc(p.ingredients || "")}</textarea>`, {
          stack: true,
          attrs: 'data-tf-box="inci"'
        })
      : ""
  }</div>
</div>
<div data-pane="natos" data-title="${esc(tf.notes)}" hidden>
${groupHTML(
  `${fieldHTML("Viršutinės", `<input name="top" value="${esc((n.top || []).join(", "))}" placeholder="Bergamotė, Kriaušė" />`, { stack: true })}${fieldHTML(
    "Širdies",
    `<input name="heart" value="${esc((n.heart || []).join(", "))}" placeholder="Rožė, Jazminas" />`,
    { stack: true }
  )}${fieldHTML("Bazinės", `<input name="base" value="${esc((n.base || []).join(", "))}" placeholder="Muskusas, Kedras" />`, { stack: true })}`,
  { foot: "Natos - kableliais." }
)}
</div>
${"attrs" in p ? `<div data-pane="savybes" data-title="Savybės" hidden><div class="ig admAttrs" id="attrsBox"></div></div>` : ""}
<div data-pane="spalvos" data-title="Spalvos" data-focus="no" hidden>
<div class="admBottle perfOnly" id="bottlePrev"></div>
<div class="ig">${fieldHTML("Skystis", `<input type="color" name="liquid" value="${esc(p.look?.liquid || "#E8D9C4")}" />`, { cls: "perfOnly" })}${fieldHTML(
    "Fonas",
    `<input type="color" name="tint" value="${esc(p.look?.tint || "#F7F1E8")}" />`
  )}${fieldHTML("Dangtelis", `<select name="cap">${CAPS.map(([v, l]) => opt(v, l, p.look?.cap)).join("")}</select>`, { cls: "perfOnly" })}${fieldHTML(
    "Forma",
    `<select name="shape">${SHAPES.map(([v, l]) => opt(v, l, p.look?.shape)).join("")}</select>`,
    { cls: "perfOnly" }
  )}</div>
<p class="igFoot">Fonas - kortelėje, kol nėra nuotraukos.</p>
</div>
${
  cats.length
    ? `<div data-pane="kolekcijos" data-title="Kolekcijos" data-focus="no" hidden><div class="ig">${cats
        .map(c => `<label class="admCheck axCheckRow"><span>${esc(c.name)}</span><input type="checkbox" name="cats" value="${esc(c.id)}"${attr(ed.cats.has(c.id), "checked")} /></label>`)
        .join("")}</div></div>`
    : ""
}
${
  "subtitle" in p
    ? `<div data-pane="puslapis" data-title="Puslapio turinys" data-focus="no" hidden>
${groupHTML(fieldHTML("Paantraštė", `<input name="subtitle" maxlength="80" value="${esc(p.subtitle || "")}" data-sub-ph />`), { head: "Po pavadinimu", foot: "Tuščia - pagal kategoriją." })}
${"mood_image" in p ? moodGroupHTML(ed, { cls: "scentOnly" }) : ""}
</div>`
    : ""
}
${"i18n" in p ? enPaneHTML(p) : ""}
<div data-pane="isamiau" data-title="Išsamiau" data-focus="no" hidden>
${groupHTML(
  `${fieldHTML("Eilė", `<input name="rank" type="number" inputmode="numeric" value="${esc(p.rank)}" />`)}${fieldHTML("Pridėta", `<input name="added" type="date" value="${esc(p.added || "")}" />`)}${fieldHTML(
    "Adresas",
    `<input name="id" required maxlength="60" pattern="[a-z0-9-]+" value="${esc(p.id)}"${attr(!isNew, "readonly")} />`
  )}`,
  { foot: isNew ? "Adresas sudaromas iš pavadinimo; sukūrus nebekeičiamas." : `vaidore.com/${esc(p.type || "kvepalai")}/${esc(p.id)}` }
)}
</div>
${isNew ? afPaneHTML(ed, opt) : ""}
</form>`;
  main.innerHTML = pageHTML({
    title: isNew ? "Naujas produktas" : p.name,
    back,
    actions: saveBtn({ form: "prodForm", label: isNew ? "Sukurti" : "Išsaugoti", always: isNew }),
    body,
    cls: "axNarrow"
  });
  hydrateIcons(main);
  const form = $("#prodForm", main);
  const page = form.closest(".axPage");
  paintSizes(form, ed.p.sizes || []);
  paintAttrs(form, ed.p.attrs || {});
  // „Naujas produktas su šiuo kvapu“ (skiltis „Kvapai“): admin/kvapai/naujas?kvapas=<id> - kvapas parenkamas iš karto
  const preType = isNew && new URLSearchParams(location.search).get("kategorija");
  if (preType && form.elements.type && VD.TYPES.some(t => t.id === preType)) {
    form.elements.type.value = preType;
    paintSizes(form, []);
    paintAttrs(form, {});
  }
  const pre = isNew && new URLSearchParams(location.search).get("kvapas");
  if (pre && $("#afScent", form) && (scents || []).some(x => x.id === pre)) {
    $("#afScent", form).value = pre;
    afScentChanged(ed, form, pre, false);
  }
  paintImages(ed, form);
  paintBottle(form);
  paintSums(form);
  paintProdInsp(ed, form);
  if ("mood_image" in p) bindMood(form, ed, () => form.elements.id.value.trim());
  if ("i18n" in p) bindEnAuto(form, () => (A.dirty = true));
  sortable($("#imgsBox", form), {
    item: ".admImg",
    handle: ".admImg img",
    axis: "x",
    touch: false,
    onMove: (from, to) => {
      moveItem(ed.images, from, to);
      paintImages(ed, form);
      A.dirty = true;
    }
  });
  page.addEventListener("axpop", () => paintSums(form));
  form.addEventListener("input", e => {
    A.dirty = true;
    afTouched(form, e.target);
    if (e.target.name === "name" && isNew && !form.elements.id.dataset.touched) form.elements.id.value = slugify(e.target.value);
    if (e.target.name === "id") form.elements.id.dataset.touched = "1";
    if (["liquid", "tint", "cap", "shape", "name"].includes(e.target.name)) paintBottle(form);
    if (e.target.name === "name" && !isNew) {
      $(".axLarge", page).textContent = e.target.value || "Produktas";
      $(".axBarT", page).textContent = e.target.value || "Produktas";
    }
  });
  form.addEventListener("change", e => {
    // Pakeitus kategoriją - talpų eilutės ir kvepalų laukai perpiešiami (įvestos kainos lieka)
    if (e.target.name === "type") {
      paintSizes(form, readSizes(form).filter(s => s.price !== "" || s.was !== ""));
      paintAttrs(form, readAttrs(form));
      afTypeChanged(ed, form);
      paintSums(form);
    }
    if (e.target.id === "afScent") return afScentChanged(ed, form, e.target.value, true);
    if (["conc", "gender"].includes(e.target.name)) paintSums(form);
    afTouched(form, e.target);
      if (e.target.matches("[data-img-input]")) addImages(ed, form, e.target);
    else if (e.target.id !== "afText") A.dirty = true;
    if (["cap", "shape"].includes(e.target.name)) paintBottle(form);
  });
  form.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const im = t?.closest("[data-img]");
    if (im) {
      const i = Number(im.closest("[data-img-i]").dataset.imgI);
      return imageAction(ed, form, i, im.dataset.img);
    }
    if (t?.closest("[data-prod-delete]")) deleteProduct(ed.p);
    const pick = t?.closest("[data-pick-type]");
    if (pick && form.elements.type.value !== pick.dataset.pickType) {
      form.elements.type.value = pick.dataset.pickType;
      form.elements.type.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (t?.closest("[data-af-run]")) afRun(ed, form);
    if (t?.closest("[data-af-apply]")) afApplyPending(ed, form);
    const go = t?.closest("[data-af-go]");
    if (go) afGo(form, go.dataset.afGo);
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($(`.axSave[form="prodForm"]`, page), () => saveProduct(ed, form));
  });
}
// Originalo nuotrauka įkeliama tik Katalogas → Kvapai → kvapas (v19). Produkte - tik peržiūra ir nuoroda į kvapą.
function paintProdInsp(ed, form) {
  const box = $("#pInsp", form);
  if (!box) return;
  const sid = ed.isNew ? ed.scentId : ed.p.scent_id;
  box.hidden = !sid;
  box.innerHTML = sid
    ? navRow({
        href: `admin/kvapu-sarasas/${sid}`,
        lead: ed.inspImg ? `<span class="scOrig"><img src="${esc(ed.inspImg)}" alt="" /></span>` : `<span class="axIco" style="background:var(--ink3)">${glyph("upload")}</span>`,
        title: "Originalo nuotrauka",
        sub: ed.inspImg ? "Keičiama kvape" : "Įkelkite kvape"
      })
    : "";
  hydrateIcons(box);
}
// Eilučių santraukos (kas įrašyta vidiniuose ekranuose)
function paintSums(form) {
  const f = form.elements;
  const set = (k, html) => {
    const el = $(`[data-sum="${k}"]`, form);
    if (el) el.innerHTML = html;
  };
  const short = (s, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const empty = `<span class="axMuted2">Neužpildyta</span>`;
  set("aprasymas", f.tagline.value.trim() || f.description.value.trim() ? esc(short(f.tagline.value.trim() || f.description.value.trim())) : empty);
  const notes = [...list(f.top.value), ...list(f.heart.value), ...list(f.base.value)];
  set("natos", notes.length ? esc(short(notes.slice(0, 4).join(", "))) : empty);
  const attrs = readAttrs(form);
  set("savybes", Object.keys(attrs).length ? plural(Object.values(attrs).filter(v => v !== false).length, "savybė", "savybės", "savybių") : empty);
  set("spalvos", `<i class="axSw" style="background:${esc(f.tint.value)}"></i>${formType(form) === "kvepalai" ? `<i class="axSw" style="background:${esc(f.liquid.value)}"></i>` : ""}`);
  const cats = $$('input[name="cats"]:checked', form).map(c => c.closest("label").textContent.trim());
  set("kolekcijos", cats.length ? esc(short(cats.join(", "))) : `<span class="axMuted2">Nėra</span>`);
  set("isamiau", `Eilė ${esc(f.rank.value || "100")}`);
  set("anglu", enSumHTML(form, {}));
  // Paantraštė (v29): numatyta - pagal kategoriją (kvepalams - koncentracija ir lytis)
  if (f.subtitle) {
    const def = VD.subtitleOf({ type: formType(form), conc: f.conc.value, gender: f.gender.value });
    f.subtitle.placeholder = def;
    set("puslapis", esc(short(f.subtitle.value.trim() || def)));
  }
}
// Talpos: kvepalams - fiksuotos (VD.BOTTLE_ML: 33 ir 100 ml); difuzoriams ir aliejams - dvi eilutės su laisvu tūriu (ml),
// žvakėms - svoris (g, sizes[].unit = "g"), elektriniam difuzoriui - viena eilutė „1 vnt.“ (unit = "vnt").
// Kiekvienai - kaina ir sena kaina; tuščia kaina - ta talpa neparduodama
const formType = form => form.elements.type?.value || "kvepalai";
function paintSizes(form, sizes) {
  const type = formType(form);
  const perf = type === "kvepalai";
  const unit = type === "zvakes" || type === "vaskai" ? "g" : "ml";
  const price = s => `<label class="field"><span>Kaina, €</span><input inputmode="decimal" data-size-price value="${esc(dec(s.price ?? ""))}" placeholder="-" /></label>
<label class="field"><span>Sena, €</span><input inputmode="decimal" data-size-was value="${esc(dec(s.was ?? ""))}" placeholder="-" /></label>`;
  const free = [...sizes.filter(s => s.ml !== "" && s.ml != null), {}, {}].slice(0, 2);
  if (!perf && !free[0].ml) free[0] = { ...free[0], ml: 100 };
  $("#sizesBox", form).innerHTML = perf
    ? VD.BOTTLE_ML.map(ml => `<div class="admSize" data-size-ml="${ml}"><b class="admSizeMl">${ml} ml</b>${price(sizes.find(x => Number(x.ml) === ml) || {})}</div>`).join("")
    : AF_DEVICE.has(type)
      ? `<div class="admSize" data-size-ml="1" data-size-unit="vnt"><b class="admSizeMl">1 vnt.</b>${price(sizes[0] || {})}</div>`
      : free
          .map(
            s =>
              `<div class="admSize free" data-size-unit="${unit}"><label class="field"><span>${unit === "g" ? "Svoris, g" : "Tūris, ml"}</span><input inputmode="numeric" data-size-ml-in value="${esc(s.ml ?? "")}" placeholder="${
                unit === "g" ? (type === "vaskai" ? 56 : 180) : type === "purskikliai" ? 250 : 100
              }" /></label>${price(s)}</div>`
          )
          .join("");
  $$(".perfOnly", form).forEach(el => (el.hidden = !perf));
  $$(".scentOnly, .afScentField", form).forEach(el => (el.hidden = !AF_SCENTED.has(type)));
  applyTypeForm(form, type);
}
const readSizes = form =>
  $$(".admSize", form).map(r => ({
    unit: r.dataset.sizeUnit || "ml",
    ml: r.dataset.sizeMl ?? $("[data-size-ml-in]", r)?.value.trim() ?? "",
    price: $("[data-size-price]", r).value.trim(),
    was: $("[data-size-was]", r).value.trim()
  }));
// Nuotraukų juosta: tempiant keičiama eilė, paspaudus - veiksmai, × - pašalinti, + - įkelti
function paintImages(ed, form) {
  const box = $("#imgsBox", form);
  box.innerHTML = `${ed.images
    .map(
      (src, i) => `<figure class="admImg" data-img-i="${i}"><img src="${esc(src)}" alt="" loading="lazy" draggable="false" data-img="menu" />${i === 0 ? `<span class="admImgMain">Pagrindinė</span>` : ""}<button type="button" class="admImgRm" data-img="rm" aria-label="Pašalinti nuotrauką">${glyph(
        "x"
      )}</button></figure>`
    )
    .join("")}<label class="admImgAdd admUpload" title="Įkelti nuotraukas">${glyph("plus")}<span>${ed.images.length ? "Pridėti" : "Nuotraukos"}</span><input type="file" accept="image/*" multiple hidden data-img-input /></label>`;
}
async function imageAction(ed, form, i, act) {
  if (act === "menu") {
    act = await actionSheet({
      title: `Nuotrauka ${i + 1} iš ${ed.images.length}`,
      actions: [
        { key: "first", label: "Padaryti pagrindine", ico: "star", disabled: i === 0 },
        { key: "left", label: "Perkelti kairėn", ico: "chev-left", disabled: i === 0 },
        { key: "right", label: "Perkelti dešinėn", ico: "chev-right", disabled: i === ed.images.length - 1 },
        { key: "rm", label: "Pašalinti", ico: "trash", danger: true }
      ]
    });
    if (!act) return;
  }
  if (act === "rm") ed.images.splice(i, 1);
  if (act === "first" && i > 0) moveItem(ed.images, i, 0);
  if (act === "left" && i > 0) moveItem(ed.images, i, i - 1);
  if (act === "right" && i < ed.images.length - 1) moveItem(ed.images, i, i + 1);
  paintImages(ed, form);
  A.dirty = true;
}
function paintBottle(form) {
  const f = form.elements;
  const p = { name: f.name.value || "Kvapas", look: { liquid: f.liquid.value, tint: f.tint.value, cap: f.cap.value, shape: f.shape.value } };
  const box = $("#bottlePrev", form);
  box.style.setProperty("--tint", p.look.tint);
  box.innerHTML = bottleSVG(p);
}
async function addImages(ed, form, input) {
  const files = [...input.files];
  input.value = "";
  if (!files.length) return;
  const id = form.elements.id.value.trim();
  if (!/^[a-z0-9-]+$/.test(id)) return toast("Pirma įrašykite pavadinimą (adresą)", { icon: "info" });
  const label = input.closest("label");
  label.classList.add("loading");
  try {
    const urls = await uploadImages(files, id, 1600, { product: true });
    ed.images.push(...urls);
    paintImages(ed, form);
    afDone("images");
    A.dirty = true;
    toast(`${plural(urls.length, "nuotrauka įkelta", "nuotraukos įkeltos", "nuotraukų įkelta")} - neužmirškite išsaugoti`, { icon: "check", ms: 3600 });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  } finally {
    label.classList.remove("loading");
  }
}
function readProduct(ed, form) {
  const f = form.elements;
  const fd = new FormData(form);
  const errors = [];
  const id = f.id.value.trim();
  const sizes = readSizes(form)
    .filter(s => s.price !== "")
    .map(s => {
      const out = { ml: Math.round(num(s.ml)), price: Math.round(num(s.price) * 100) / 100 };
      if (s.unit && s.unit !== "ml") out.unit = s.unit;
      const was = s.was === "" ? null : Math.round(num(s.was) * 100) / 100;
      if (was != null) out.was = was;
      return out;
    });
  const notes = { top: list(f.top.value), heart: list(f.heart.value), base: list(f.base.value) };
  const stockRaw = f.stock.value.trim();
  const row = {
    id,
    name: f.name.value.trim(),
    ...(f.inspired ? { inspired: f.inspired.value.trim() } : {}),
    ...("inspired_image" in ed.p ? { inspired_image: ed.inspImg } : {}),
    ...(f.type ? { type: f.type.value } : {}),
    gender: f.gender.value,
    conc: f.conc.value,
    family: f.family.value,
    tagline: f.tagline.value.trim(),
    description: f.description.value.trim(),
    ...(f.ingredients ? { ingredients: f.ingredients.value.trim() } : {}),
    notes,
    // Ilgaamžiškumas ir sklaida formoje nerodomi (v15) - saugomi tyliai (kvapo testas, „Kam skirti“)
    longevity: ed.p.longevity || 3,
    sillage: ed.p.sillage || 3,
    sizes: sizes.sort((a, b) => a.ml - b.ml),
    ...("attrs" in ed.p ? { attrs: readAttrs(form) } : {}),
    ...("subtitle" in ed.p ? { subtitle: f.subtitle.value.trim() } : {}),
    ...("mood_image" in ed.p ? readMood(form, ed) : {}),
    ...("i18n" in ed.p ? { i18n: readEnFields(form, ed.p) } : {}),
    ...("scent_id" in ed.p ? { scent_id: AF_SCENTED.has(f.type?.value || "kvepalai") ? (ed.isNew ? ed.scentId : ed.p.scent_id) || null : null } : {}),
    sample: Math.round(num(f.sample.value) * 100) / 100,
    stock: stockRaw === "" ? null : Math.round(Number(stockRaw)),
    look: { liquid: f.liquid.value, tint: f.tint.value, cap: f.cap.value, shape: f.shape.value },
    images: ed.images,
    visible: f.visible.checked,
    badge: f.badge.value || null,
    rank: Math.round(Number(f.rank.value) || 100),
    added: f.added.value || new Date().toISOString().slice(0, 10)
  };
  if (!row.name) errors.push("Įrašykite pavadinimą");
  if (!/^[a-z0-9-]+$/.test(id)) errors.push("Adresas (id) - tik mažosios raidės, skaičiai ir „-“");
  if (ed.isNew && VD.CAT.products.some(p => p.id === id)) errors.push("Toks adresas jau užimtas - pakeiskite");
  if (VD.SET.discovery?.id === id) errors.push("Šis adresas skirtas atradimų rinkiniui");
  if (ed.isNew && ["naujas", "kvapu-sarasas"].includes(id)) errors.push("Šis adresas užimtas - pakeiskite");
  const type = row.type || "kvepalai";
  const perf = type === "kvepalai";
  const scented = AF_SCENTED.has(type);
  // Elektrinis difuzorius - be kvapo: šeima (privaloma duomenų bazėje) - pirmoji, lytis - unisex
  if (!scented) {
    row.family = row.family || VD.CAT.families[0]?.id || "";
    row.gender = "unisex";
  }
  if (!row.family) errors.push("Pasirinkite kvapo šeimą");
  if (!perf) row.sample = 0;
  if (!sizes.length) errors.push(perf ? "Įrašykite kainą bent vienai talpai (33 ml arba 100 ml)" : AF_DEVICE.has(type) ? "Įrašykite kainą" : `Įrašykite ${type === "zvakes" || type === "vaskai" ? "svorį" : "tūrį"} ir kainą`);
  if (sizes.some(s => (s.unit || "ml") === "ml" && !(s.ml > 2))) errors.push("Tūris - daugiau nei 2 ml");
  if (sizes.some(s => !(s.ml > 0))) errors.push(type === "zvakes" ? "Svoris - daugiau nei 0 g" : "Tūris - daugiau nei 0");
  if (new Set(sizes.map(s => s.ml)).size !== sizes.length) errors.push("Tūriai kartojasi");
  if (sizes.some(s => !(s.price > 0))) errors.push("Kaina - daugiau nei 0 €");
  if (sizes.some(s => s.was != null && !(s.was > s.price))) errors.push("Sena kaina turi būti didesnė už kainą (arba tuščia)");
  if (!(row.sample >= 0)) errors.push("Mėginuko kaina - skaičius");
  if (row.stock != null && !(Number.isInteger(row.stock) && row.stock >= 0)) errors.push("Likutis - sveikas skaičius ≥ 0");
  if (perf && (!notes.top.length || !notes.heart.length || !notes.base.length)) errors.push("Įrašykite viršutines, širdies ir bazines natas");
  if (scented && !perf && !notes.top.length && !notes.heart.length && !notes.base.length) errors.push("Įrašykite bent vieną natą");
  return { row, cats: fd.getAll("cats"), errors };
}
async function saveProduct(ed, form) {
  const { row, cats, errors } = readProduct(ed, form);
  showFormErr(form, errors);
  if (errors.length) return;
  const wasStock = ed.p.stock;
  let saved;
  if (ed.isNew) [saved] = await sbRest("products", { method: "POST", body: row, prefer: "return=representation" });
  else {
    const { id, ...patch } = row;
    [saved] = (await sbRest(`products?id=eq.${encodeURIComponent(ed.p.id)}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
    if (!saved) throw new Error("Produktas nerastas - galbūt ištrintas");
  }
  // Kategorijos: pašaliname nebepažymėtas, pridedame naujas
  const removed = [...ed.cats].filter(c => !cats.includes(c));
  const added = cats.filter(c => !ed.cats.has(c));
  if (removed.length) await sbRest(`product_categories?product_id=eq.${encodeURIComponent(row.id)}&category_id=in.(${removed.map(encodeURIComponent).join(",")})`, { method: "DELETE" });
  if (added.length) await sbRest("product_categories", { method: "POST", body: added.map(c => ({ product_id: row.id, category_id: c })) });
  ed.cats = new Set(cats);
  // Naujas produktas be pasirinkto kvapo - sukuriamas bendras kvapas (scents) ir susiejamas (kitam produktui - sąraše)
  if (ed.isNew && ed.scents && "scent_id" in saved && !saved.scent_id && AF_SCENTED.has(saved.type || "kvepalai")) {
    try {
      const sid = await createScent(ed, saved);
      [saved] = (await sbRest(`products?id=eq.${encodeURIComponent(saved.id)}`, { method: "PATCH", body: { scent_id: sid }, prefer: "return=representation" })) || [saved];
    } catch (err) {
      toast(`Produktas išsaugotas, bet kvapo sukurti nepavyko: ${errText(err)}`, { icon: "info", ms: 5200 });
    }
  }
  ed.p = saved;
  const i = prodState.rows.findIndex(x => x.id === saved.id);
  if (i >= 0) prodState.rows[i] = saved;
  else prodState.rows.push(saved);
  paintProducts();
  await catalogChanged(ed.isNew ? "Produktas sukurtas" : "Išsaugota");
  if (wasStock === 0 && saved.stock !== 0) offerRestockNotify(saved);
  if (ed.isNew) navigate(`admin/kvapai/${saved.id}`, { replace: true });
}
async function deleteProduct(p) {
  const ok = await askConfirm(`„${p.name}“ bus ištrintas kartu su atsiliepimais ir laukiančiųjų sąrašu. Užsakymų įrašai liks. Atšaukti nebus galima - gal geriau paslėpti?`, {
    title: "Ištrinti produktą?",
    ok: "Ištrinti",
    danger: true
  });
  if (!ok) return;
  try {
    await sbRest(`products?id=eq.${encodeURIComponent(p.id)}`, { method: "DELETE" });
    A.dirty = false;
    prodState.rows = prodState.rows.filter(x => x.id !== p.id);
    paintProducts();
    await catalogChanged("Produktas ištrintas");
    navigate("admin/kvapai", { replace: true });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}

// ── Prekės tipas sąraše ──
const typeName = p => VD.TYPES.find(t => t.id === (p.type || "kvepalai"))?.one || "";

// ── Tipo savybės (products.attrs, v15) - laukai pagal AF_ATTRS (13-autofill.js) ──
// Taip / ne savybės - jungikliai; tekstinės - laisvas tekstas; kitos - skaičiai (v34: + purškikliai, vaškai, aromalempos)
const ATTR_BOOL = new Set(["forDiffuser", "forTextile", "forBurner"]);
const ATTR_TEXT = new Set(["wax", "wick", "power", "light", "material", "dims", "heat"]);
const ATTR_PH = { material: "Keramika", dims: "10 × 12", heat: "Arbatinė žvakutė", wax: "Sojų vaškas", pieces: "6" };
function paintAttrs(form, attrs) {
  const box = $("#attrsBox", form);
  if (!box) return;
  const defs = AF_ATTRS[formType(form)] || [];
  $("#attrsRow", form).hidden = !defs.length;
  box.innerHTML = defs
    .map(([k, label, unit]) =>
      ATTR_BOOL.has(k)
        ? `<label class="axField axSwitchRow" data-attr-row><span>${esc(label)}</span><input type="checkbox" class="admSwitchInp" data-attr="${k}"${attr(attrs?.[k] !== false, "checked")} /></label>`
        : `<label class="field axField"><span>${esc(label)}${unit ? `, ${esc(unit)}` : ""}</span><input data-attr="${k}"${ATTR_TEXT.has(k) ? ` maxlength="60"` : ` inputmode="decimal"`}${
            ATTR_PH[k] ? ` placeholder="${esc(ATTR_PH[k])}"` : ""
          } value="${esc(attrs?.[k] ?? "")}" /></label>`
    )
    .join("");
}
function readAttrs(form) {
  const out = {};
  for (const el of $$("[data-attr]", form)) {
    const k = el.dataset.attr;
    if (el.type === "checkbox") out[k] = el.checked;
    else if (ATTR_TEXT.has(k)) {
      if (el.value.trim()) out[k] = el.value.trim();
    } else if (el.value.trim() !== "" && num(el.value) > 0) out[k] = Math.round(num(el.value) * 100) / 100;
  }
  return out;
}

// ── Automatinis užpildymas (v15): kvapo pasirinkimas, peržiūra prieš pritaikant, „Auto“ žymos, „Liko užpildyti“ ──
function afPaneHTML(ed, opt) {
  const scents = ed.scents || [];
  return `<div data-pane="af" data-title="Užpildyti iš aprašymo" hidden>
${
  scents.length
    ? groupHTML(
        fieldHTML(
          "Kvapas",
          `<select id="afScent"><option value="">Naujas kvapas</option>${scents.map(x => opt(x.id, x.inspired ? `${x.name} - ${x.inspired}` : x.name, "")).join("")}</select>`,
          { cls: "afScentField" }
        ),
        { foot: "Pasirinkus esamą kvapą - natos, lytis ir savybės užpildomos iš karto." }
      )
    : ""
}
<div class="ig"><label class="field axField stack"><span>Aprašymas</span><textarea id="afText" rows="7" placeholder="Įklijuokite prekės aprašymą (LT, PL, EN)"></textarea></label></div>
<button class="btn primary block afRun" type="button" data-af-run>${glyph("spark")}Atpažinti</button>
<div class="afPrev" id="afPrev" hidden></div>
</div>`;
}
const afScentOf = ed => (ed.scents || []).find(x => x.id === ed.scentId) || null;
function afRun(ed, form) {
  const text = $("#afText", form)?.value || "";
  const scent = afScentOf(ed);
  if (!text.trim() && !scent) return toast("Įklijuokite prekės aprašymą", { icon: "info" });
  ed.pending = afParse(text, { scent, type: formType(form), families: ed.fams.map(f => f.id) });
  const prev = $("#afPrev", form);
  prev.hidden = false;
  const x = ed.pending.fields;
  const famN = id => ed.fams.find(f => f.id === id)?.name || "";
  const typeN = VD.TYPES.find(t => t.id === x.type)?.name || "";
  const scented = AF_SCENTED.has(x.type);
  const notes = scented ? [["Viršutinės natos", x.notes.top], ["Širdies natos", x.notes.heart], ["Bazinės natos", x.notes.base]].filter(([, v]) => v.length).map(([k, v]) => [k, v.join(", ")]) : [];
  const rows = [
    ["Pavadinimas", x.name],
    ["Kategorija", typeN],
    ["Originalas", x.inspired],
    ...(scented ? [["Kam", VD.GENDER_NAME[x.gender]], ["Kvapo šeima", famN(x.family)]] : []),
    ["Koncentracija", x.conc && VD.CONC_NAME[x.conc]],
    ...notes,
    ["Talpos", x.sizes.map(z => `${z.ml} ${z.unit || "ml"}`).join(", ")],
    ["Trumpas aprašymas", x.tagline]
  ].filter(([, v]) => v);
  prev.innerHTML = `<h2 class="igHead">Bus įrašyta į formą</h2><div class="ig"><dl class="afFactList">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("") || "<div><dd>Nieko neatpažinau</dd></div>"}</dl></div>
<p class="igFoot">Pritaikius - reikšmes galėsite pakeisti; „Auto“ žymi užpildytus laukus.</p>
<button class="btn primary block" type="button" data-af-apply>${glyph("check")}Pritaikyti</button>`;
  hydrateIcons(prev);
  prev.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
}
function afApplyPending(ed, form) {
  if (!ed.pending) return;
  afApply(ed, form, ed.pending);
  ed.pending = null;
  $("#afPrev", form).hidden = true;
  popAll(form.closest(".axPage"));
  toast("Forma užpildyta - patikrinkite ir išsaugokite", { icon: "check" });
}
function afScentChanged(ed, form, id, pop) {
  ed.scentId = id || null;
  if (!ed.scentId) return;
  const scent = afScentOf(ed);
  const res = afParse($("#afText", form)?.value || "", { scent, type: formType(form), families: ed.fams.map(f => f.id) });
  afApply(ed, form, res);
  ed.inspImg = scent.inspired_image || "";
  paintProdInsp(ed, form);
  if (pop) {
    popAll(form.closest(".axPage"));
    toast(`Užpildyta pagal kvapą „${scent.name}“`, { icon: "check" });
  }
}
// Kategorija pakeista ranka: automatinis pavadinimas pritaikomas naujam tipui („Kvapni žvakė My Pink“)
function afTypeChanged(ed, form) {
  const nameField = form.elements.name.closest(".field");
  if (!ed.af || !nameField.classList.contains("afAuto")) return;
  const name = afProductName(formType(form), ed.af.fields.scentName);
  form.elements.name.value = name;
  if (!form.elements.id.dataset.touched) form.elements.id.value = afUniqueId(afSlug(name));
  paintBottle(form);
}
function afUniqueId(base) {
  // „naujas“ ir „kvapu-sarasas“ - administravimo adresai (admin/kvapai/…)
  const taken = new Set([...VD.CAT.products.map(p => p.id), ...prodState.rows.map(p => p.id), VD.SET.discovery?.id, "naujas", "kvapu-sarasas"].filter(Boolean));
  let id = base || "produktas";
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}
function afApply(ed, form, res) {
  const f = form.elements;
  const x = res.fields;
  ed.af = res;
  const set = (name, v) => f[name] && v != null && v !== "" && (f[name].value = v);
  if (f.type && f.type.value !== x.type) f.type.value = x.type;
  if (x.name) {
    f.name.value = x.name;
    if (!f.id.dataset.touched) f.id.value = afUniqueId(x.id || afSlug(x.name));
  }
  set("inspired", x.inspired);
  if (AF_SCENTED.has(x.type)) {
    set("gender", x.gender);
    if (x.family && ed.fams.some(fm => fm.id === x.family)) f.family.value = x.family;
    set("top", x.notes.top.join(", "));
    set("heart", x.notes.heart.join(", "));
    set("base", x.notes.base.join(", "));
    if (x.longevity) ed.p.longevity = x.longevity;
    if (x.sillage) ed.p.sillage = x.sillage;
    if (x.look?.liquid) set("liquid", x.look.liquid);
    if (x.look?.tint) set("tint", x.look.tint);
  }
  if (x.conc) set("conc", x.conc);
  set("tagline", x.tagline);
  set("description", x.description);
  set("ingredients", x.ingredients);
  // Įvestos kainos lieka, jei talpa sutampa
  const prev = readSizes(form).filter(s => s.price !== "" || s.was !== "");
  paintSizes(form, x.sizes.length ? x.sizes.map(sz => ({ ...sz, ...(prev.find(p => Number(p.ml) === Number(sz.ml)) || {}), ml: sz.ml })) : prev);
  paintAttrs(form, { ...readAttrs(form), ...x.attrs });
  paintBottle(form);
  afMark(form, res.auto);
  afReport(form, res);
  paintSums(form);
  A.dirty = true;
}
// „Auto“ žymos: lauko pavadinime; pakeitus lauką - žyma dingsta. Vidinių ekranų eilutės - taškas „Auto“.
const AF_MARK_FIELDS = { name: ["name"], inspired: ["inspired"], gender: ["gender"], conc: ["conc"], family: ["family"], tagline: ["tagline"], description: ["description"], ingredients: ["ingredients"], notes: ["top", "heart", "base"], look: ["liquid", "tint"] };
function afMark(form, keys) {
  $$(".afAuto", form).forEach(el => el.classList.remove("afAuto"));
  for (const k of keys) {
    const els = AF_MARK_FIELDS[k]
      ? AF_MARK_FIELDS[k].map(n => form.elements[n]?.closest(".field"))
      : k === "sizes"
          ? [$("#sizesHead", form)]
          : k.startsWith("attr:")
            ? [$(`[data-attr="${k.slice(5)}"]`, form)?.closest(".field, .axSwitchRow")]
            : [];
    els.forEach(el => el && !el.closest(".perfOnly[hidden], .scentOnly[hidden]") && el.classList.add("afAuto"));
  }
  // Eilutės į vidinius ekranus, kuriuose yra „Auto“ laukų
  $$("[data-push]", form).forEach(r => r.classList.toggle("afAuto", !!$(`[data-pane="${r.dataset.push}"] .afAuto`, form)));
}
// Lauko pakeitimas: nuimama „Auto“ žyma, užpildytas trūkstamas laukas dingsta iš „Liko užpildyti“
const AF_GO = {
  name: ["name"],
  inspired: ["inspired"],
  gender: ["gender"],
  conc: ["conc"],
  family: ["family"],
  notes: ["top", "heart", "base"],
  stock: ["stock"]
};
function afTouched(form, el) {
  if (!(el instanceof Element) || el.id === "afText" || el.id === "afScent") return;
  el.closest(".field, .admChecks, .axSwitchRow")?.classList.remove("afAuto");
  if (el.closest("#sizesBox")) {
    $("#sizesHead", form)?.classList.remove("afAuto");
    if (el.matches("[data-size-price]") && el.value.trim()) afDone("price");
    if (el.matches("[data-size-ml-in]") && el.value.trim()) afDone("sizes");
  }
  for (const [key, names] of Object.entries(AF_GO)) if (names.includes(el.name) && String(el.value).trim()) afDone(key);
}
function afDone(key) {
  $$(`[data-af-go="${key}"]`).forEach(b => b.remove());
  const box = $("#afMissing");
  if (box && !$("[data-af-go]", box)) box.innerHTML = `<b>Liko užpildyti</b><p class="afAll">Viskas užpildyta - patikrinkite ir išsaugokite.</p>`;
}
function afReport(form, res) {
  const out = $("#afOut", form);
  if (!out) return;
  const seen = new Set();
  const missing = res.missing.filter(m => !seen.has(m.label) && seen.add(m.label));
  out.hidden = false;
  out.innerHTML = `<div class="afMissing" id="afMissing"><b>Liko užpildyti</b>${
    missing.length
      ? `<div class="afChips">${missing.map(m => `<button type="button" class="afChip" data-af-go="${esc(m.key)}">${esc(m.label)}</button>`).join("")}</div>`
      : `<p class="afAll">Viskas užpildyta - patikrinkite ir išsaugokite.</p>`
  }</div>
<details class="afFacts"><summary>Ką atpažinau</summary><dl>${res.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></details>`;
}
// „Liko užpildyti“ → atidaromas reikiamas ekranas, fokusas į lauką
function afGo(form, key) {
  const f = form.elements;
  const el =
    key === "price"
      ? $("[data-size-price]", form)
      : key === "sizes"
        ? $("[data-size-ml-in], [data-size-price]", form)
        : key === "images"
          ? $(".admImgAdd", form)
          : f[(AF_GO[key] || [key])[0]];
  revealField(el);
}
// Naujas bendras kvapas (scents) iš išsaugoto produkto; id - unikalus pagal pavadinimą
async function createScent(ed, row) {
  const prefix = AF_NAME_PREFIX[row.type || "kvepalai"];
  const name = ed.af?.fields.scentName || (prefix && row.name.startsWith(`${prefix} `) ? row.name.slice(prefix.length + 1) : row.name);
  const taken = new Set((ed.scents || []).map(x => x.id));
  const base = afSlug(name) || row.id;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  const body = {
    id,
    name,
    inspired: row.inspired || "",
    gender: row.gender,
    family: row.family,
    notes: row.notes,
    longevity: row.longevity,
    sillage: row.sillage,
    look: { liquid: row.look.liquid, tint: row.look.tint },
    ...(row.inspired_image && ed.scents?.[0] && "inspired_image" in ed.scents[0] ? { inspired_image: row.inspired_image } : {})
  };
  const [sc] = (await sbRest("scents", { method: "POST", body, prefer: "return=representation" })) || [];
  if (sc) ed.scents.push(sc);
  return sc?.id || id;
}

// ── Kategorijos pasirinkimas (naujas produktas) ir forma pagal kategoriją ──
function typePickHTML(cur) {
  return `<div class="typePick" role="radiogroup" aria-label="Kategorija">${VD.TYPES.map(
    t => `<button type="button" class="typeOpt" role="radio" data-pick-type="${t.id}" aria-checked="${t.id === cur}">${esc(TYPE_SHORT[t.id] || t.name)}</button>`
  ).join("")}</div>`;
}
function applyTypeForm(form, type) {
  const tf = TYPE_FORM[type] || TYPE_FORM.kvepalai;
  $$("[data-pick-type]", form).forEach(b => b.setAttribute("aria-checked", String(b.dataset.pickType === type)));
  for (const el of $$("[data-tf]", form)) if (tf[el.dataset.tf] != null) el.textContent = tf[el.dataset.tf];
  const np = $('[data-pane="natos"]', form);
  if (np) np.dataset.title = tf.notes;
  const f = form.elements;
  f.name.placeholder = tf.name;
  f.tagline.placeholder = tf.tagline;
  f.description.placeholder = tf.desc;
  if (f.ingredients) f.ingredients.placeholder = tf.inciPh || "";
  const inci = $('[data-tf-box="inci"]', form);
  if (inci) inci.hidden = !tf.inci;
}
