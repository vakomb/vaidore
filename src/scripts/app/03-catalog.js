// 03 - katalogas: kvapai, šeimos, kategorijos, nustatymai. Pradžioje - surinkimo metu įdėtas window.VAIDORE_CATALOG
// (iš duomenų bazės arba src/data/catalog.json), vėliau setCatalog() pakeičia jį šviežiais duomenimis iš Supabase (20-supabase.js).
// Visi kintamieji - let: po atnaujinimo perskaičiuojami (BY_ID, paieškos indeksas…).
let CAT, SET, PRODUCTS, ALL_PRODUCTS, BY_ID, FAMILY, CATEGORY, SEARCH_IX, DISC, NOTE_IMG, SCENT_INFO;
const SAMPLE_ML = 2;
// Buteliukų talpos - tik 33 ml ir 100 ml (+ 2 ml mėginukas). Kitos (seni 30 / 50 ml įrašai) parduotuvėje nerodomos.
const BOTTLE_ML = [33, 100];

// Prekės tipai (v13, v15 - 5 tipai): pradžios plytelės, meniu, katalogo puslapiai /<tipas>.
// Lytis, mėginukas 2 ml, koncentracija ir talpos 33 / 100 ml - tik kvepalams. Tipas be prekių - nerodomas.
// scented - turi kvapą (elektrinis difuzorius - prietaisas be kvapo); n - daiktavardis skaičiui (1 / 2 / 10).
const TYPES = [
  { id: "kvepalai", name: "Kvepalai", one: "Kvepalai", title: "Visi kvepalai", scented: true, n: ["kvapas", "kvapai", "kvapų"] },
  { id: "difuzoriai", name: "Difuzoriai", one: "Namų kvapų difuzorius", title: "Namų kvapų difuzoriai", scented: true, n: ["difuzorius", "difuzoriai", "difuzorių"] },
  { id: "zvakes", name: "Žvakės", one: "Kvapni žvakė", title: "Kvapnios žvakės", scented: true, n: ["žvakė", "žvakės", "žvakių"] },
  { id: "aliejai", name: "Aliejai", one: "Aromatinis aliejus", title: "Aromatiniai aliejai difuzoriams", scented: true, n: ["aliejus", "aliejai", "aliejų"] },
  { id: "elektriniai-difuzoriai", name: "Elektriniai difuzoriai", one: "Elektrinis difuzorius", title: "Elektriniai difuzoriai", scented: false, n: ["difuzorius", "difuzoriai", "difuzorių"] }
];
const TYPE = new Map(TYPES.map(t => [t.id, t]));
const typeOf = p => (TYPE.has(p?.type) ? p.type : "kvepalai");
const isPerfume = p => typeOf(p) === "kvepalai";
const hasSample = p => isPerfume(p) && Number(p.sample) > 0;
const perfumes = () => PRODUCTS.filter(isPerfume);
const typesInUse = () => TYPES.filter(t => PRODUCTS.some(p => typeOf(p) === t.id));
// Po pavadinimu - „Eau de Parfum“ kvepalams, tipas kitoms prekėms
const kindName = p => (isPerfume(p) ? CONC_NAME[p.conc] || p.conc : TYPE.get(typeOf(p)).one);
const GENDER_NAME = { moterims: "Moterims", vyrams: "Vyrams", unisex: "Unisex" };
// Unisex kvapai rodomi ir „Moterims“, ir „Vyrams“ (puslapiai, skyriai, plytelės); „Unisex“ - tik unisex (v20)
const forGender = (p, g) => !g || g === "all" || p.gender === g || (p.gender === "unisex" && (g === "moterims" || g === "vyrams"));
const GENDER_TITLE = { moterims: "Kvepalai moterims", vyrams: "Kvepalai vyrams", unisex: "Unisex kvepalai" };
const CONC_NAME = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
// Tipo savybės (products.attrs) - tos pačios kaip administravime (13-autofill.js)
const ATTR_DEFS = {
  difuzoriai: [
    ["sticks", "Lazdelių skaičius", "vnt."],
    ["weeks", "Trukmė", "sav."]
  ],
  zvakes: [
    ["burn", "Degimo trukmė", "val."],
    ["wax", "Vaškas", ""],
    ["wick", "Dagtis", ""]
  ],
  aliejai: [
    ["weeks", "Trukmė", "sav."],
    ["forDiffuser", "Elektriniams difuzoriams", ""]
  ],
  "elektriniai-difuzoriai": [
    ["tank", "Vandens talpa", "ml"],
    ["runtime", "Veikimo laikas", "val."],
    ["light", "Apšvietimas", ""]
  ]
};
// Prekės savybės puslapiui: [[pavadinimas, reikšmė]] (tik įrašytos)
const attrList = p =>
  (ATTR_DEFS[typeOf(p)] || [])
    .filter(([k]) => p.attrs?.[k] != null && p.attrs[k] !== "" && p.attrs[k] !== false)
    .map(([k, label, unit]) => [label, p.attrs[k] === true ? "Taip" : nb(`${p.attrs[k]}${unit ? ` ${unit}` : ""}`)]);
const LEVEL = ["", "Labai lengvas", "Lengvas", "Vidutinis", "Stiprus", "Labai stiprus"];
const LASTS = ["", "2-3 val.", "3-5 val.", "5-7 val.", "7-9 val.", "9+ val."];

function setCatalog(c) {
  plainDeep(c); // v30: įdėtas, išsaugotas telefone ar iš bazės - be ilgų brūkšnių
  CAT = c;
  for (const p of c.products) {
    if (!TYPE.has(p.type)) p.type = "kvepalai";
    if (p.type !== "kvepalai") continue; // difuzorių ir aliejų talpos - laisvos
    const ok = (p.sizes || []).filter(s => BOTTLE_ML.includes(Number(s.ml)));
    if (ok.length) p.sizes = ok;
  }
  // Originalo nuotrauka (v22): jei prekė jos neturi - imama iš to paties kvapo (scent) arba to paties originalo prekės
  const inspKey = s => fold(String(s || "")).replace(/[^a-z0-9]+/g, " ").trim();
  const byScent = new Map(),
    byInsp = new Map();
  for (const p of c.products)
    if (p.inspiredImage) {
      if (p.scent && !byScent.has(p.scent)) byScent.set(p.scent, p.inspiredImage);
      if (inspKey(p.inspired) && !byInsp.has(inspKey(p.inspired))) byInsp.set(inspKey(p.inspired), p.inspiredImage);
    }
  for (const p of c.products) if (!p.inspiredImage && p.inspired) p.inspiredImage = (p.scent && byScent.get(p.scent)) || byInsp.get(inspKey(p.inspired)) || "";
  SET = window.__vdPreviewSet ? { ...c.settings, ...window.__vdPreviewSet } : c.settings; // administravimo peržiūra (25)
  // v29: natų biblioteka (natos vardas → nuotrauka) ir bendrų kvapų nuotaikos juosta (28-story.js - moodOf).
  // Produktų objektai nekeičiami - kitaip kiekvienas katalogo atnaujinimas perpieštų puslapį.
  // Numatytoji biblioteka (data/notes.json - ingredientai iš tikrų produktų nuotraukų), bazės įrašai ją papildo ir perrašo
  NOTE_IMG = new Map([...(window.VAIDORE_NOTES || []), ...(c.noteMedia || [])].filter(n => n?.name && n.image).map(n => [noteKey(n.name), { name: n.name, image: n.image }]));
  SCENT_INFO = new Map((c.scents || []).filter(s => s?.id).map(s => [s.id, s]));
  ALL_PRODUCTS = c.products;
  PRODUCTS = c.products.filter(p => p.visible !== false);
  BY_ID = new Map(c.products.map(p => [p.id, p]));
  FAMILY = new Map(c.families.map(f => [f.id, f]));
  CATEGORY = new Map((c.categories || []).map(x => [x.id, x]));
  DISC = SET.discovery || null;
  SEARCH_IX = new Map(
    c.products.map(p => [
      p.id,
      fold(
        [
          p.name,
          (SET.inspired?.show !== false && p.inspired) || "",
          p.tagline,
          familyName(p.family),
          GENDER_NAME[p.gender],
          p.conc,
          CONC_NAME[p.conc],
          ...(p.categories || []).map(id => CATEGORY.get(id)?.name || ""),
          ...p.notes.top,
          ...p.notes.heart,
          ...p.notes.base,
          TYPE.get(p.type)?.one || ""
        ].join(" ")
      )
    ])
  );
}
// Natos raktas natų bibliotekai: be diakritikų, mažosiomis, vienas tarpas („Tabako  Lapai“ = „tabako lapai“)
function noteKey(s) {
  return fold(s).replace(/\s+/g, " ").trim();
}
const visibleFamilies = () => CAT.families.filter(f => f.visible !== false);
const visibleCategories = () => (CAT.categories || []).filter(c => c.visible !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

const minPrice = p => Math.min(...p.sizes.map(s => s.price));
// Akcija: tūrio „was“ - ankstesnė kaina (administratorius įrašo tik tikrą - mažiausią per 30 d., Omnibus direktyva)
const wasOf = (p, ml) => {
  const s = ml === SAMPLE_ML ? null : p.sizes.find(x => x.ml === ml);
  return s?.was > s?.price ? s.was : null;
};
const cheapestSize = p => p.sizes.reduce((a, b) => (b.price < a.price ? b : a), p.sizes[0]);
const onSale = p => p.sizes.some(s => s.was > s.price);
// Didžiausia nuolaida, % (pagal tikrą seną kainą - sizes[].was)
const salePct = p => Math.max(0, ...p.sizes.filter(s => s.was > s.price).map(s => Math.round((1 - s.price / s.was) * 100)));
// „Didžiausios nuolaidos“ - turimi kvapai su nuolaida, didžiausia nuolaida pirma
const saleList = () => PRODUCTS.filter(p => inStock(p) && onSale(p)).sort((a, b) => salePct(b) - salePct(a) || a.rank - b.rank);
// „Bestselleriai“ - populiariausi (eilė „rank“ - administravimo skydelyje)
const BEST_N = 8;
const bestList = () => [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, BEST_N);
// Trys būdingiausios natos (po vieną iš viršutinių, širdies, bazinių) - kortelėse ir kvapo puslapyje
const keyNotes = p => [p.notes.top[0], p.notes.heart[0], p.notes.base[0]].filter(Boolean);
// Vidutinis įvertinimas iš tikrų atsiliepimų (be įvertinimo - null)
function ratingOf(p) {
  const r = (p.reviews || []).filter(x => x?.rating);
  return r.length ? { avg: r.reduce((s, x) => s + x.rating, 0) / r.length, n: r.length } : null;
}
const familyName = id => FAMILY?.get(id)?.name || "";
const priceOf = (p, ml) => (ml === SAMPLE_ML ? p.sample : p.sizes.find(s => s.ml === ml)?.price);
// Talpos vienetas (v15): sizes[].unit - "g" (žvakės), "vnt" (elektrinis difuzorius), kitaip ml
const unitOf = (p, ml) => p?.sizes?.find(s => s.ml === ml)?.unit || "ml";
const sizeLabel = (ml, p) => {
  if (ml === SAMPLE_ML && (!p || isPerfume(p))) return "Mėginukas 2 ml";
  const u = unitOf(p, ml);
  return u === "vnt" ? "1 vnt." : `${ml} ${u}`;
};
// „Įkvėpti Tom Ford - Tobacco Vanille“ - rodoma, jei kvapas turi lauką inspired ir nustatymuose neišjungta
const inspiredOf = p => (SET.inspired?.show !== false && p.inspired) || "";
// Originalo blokelis (v18): kairėje - kvadratinė originalo nuotrauka (nėra - prekės ženklo raidė), dešinėje - prekės ženklas
// ir kvapo pavadinimas. Kortelėje - vietoj natų (size "card"), produkto puslapyje - didesnis, vienoje eilutėje (size "pd"), paieškoje - "sm".
// „Tom Ford - Tobacco Vanille“ skaidoma per pirmą brūkšnį; be brūkšnio - tik pavadinimas.
function splitInspired(s) {
  const m = String(s || "").match(/^(.+?)\s+[\u2013\u2014-]\s+(.+)$/) || String(s || "").match(/^(.+?)\s*[\u2013\u2014]\s*(.+)$/);
  return m ? { brand: m[1].trim(), name: m[2].trim() } : { brand: "", name: String(s || "").trim() };
}
function inspiredHTML(p, size = "card") {
  const insp = inspiredOf(p);
  if (!insp) return "";
  const { brand, name } = splitInspired(insp);
  const px = { card: 40, pd: 52, sm: 30 }[size] || 40;
  const photo = SET.inspired?.photo !== false;
  const img = p.inspiredImage
    ? `<img src="${esc(p.inspiredImage)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async" />`
    : `<span class="inspL" aria-hidden="true">${esc((brand || name).charAt(0).toUpperCase())}</span>`;
  const label = esc(brand);
  return `<span class="insp insp-${size}" title="Įkvėpti ${esc(insp)}">${photo ? `<span class="inspPh">${img}</span>` : ""}<span class="inspTxt">${
    label ? `<span class="inspBrand">${label}</span>` : ""
  }<span class="inspName">${esc(name)}</span></span></span>`;
}
const cardSub = p => (isPerfume(p) ? `${familyName(p.family)} · ${p.conc}` : TYPE.get(typeOf(p)).one);
// Po pavadinimu produkto puslapyje: trys natos; prekei be natų (elektrinis difuzorius) - šūkis
const productUrl = p => `${typeOf(p)}/${p.id}`;
// Likutis: laukas stock (nėra - neskaičiuojama, 0 - laikinai išparduota). Tą pačią taisyklę tikrina serveris.
const inStock = p => p.stock == null || p.stock > 0;
// Atradimų rinkinys (settings.discovery): bet kurie N mėginukų už fiksuotą kainą. Krepšelio eilutė { id, ml: 0, qty, picks }.
const isDisc = id => !!DISC && id === DISC.id;
const SAMPLEABLE = () => PRODUCTS.filter(p => inStock(p) && hasSample(p));

function matches(p, q) {
  if (!q) return true;
  const ix = SEARCH_IX.get(p.id) || "";
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every(w => ix.includes(w));
}
setCatalog(window.VAIDORE_CATALOG);
