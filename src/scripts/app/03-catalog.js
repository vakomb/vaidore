// 03 – katalogas: kvapai, šeimos, kategorijos, nustatymai. Pradžioje – surinkimo metu įdėtas window.VAIDORE_CATALOG
// (iš duomenų bazės arba src/data/catalog.json), vėliau setCatalog() pakeičia jį šviežiais duomenimis iš Supabase (20-supabase.js).
// Visi kintamieji – let: po atnaujinimo perskaičiuojami (BY_ID, paieškos indeksas…).
let CAT, SET, PRODUCTS, ALL_PRODUCTS, BY_ID, FAMILY, CATEGORY, SEARCH_IX, DISC;
const SAMPLE_ML = 2;
// Buteliukų talpos – tik 33 ml ir 100 ml (+ 2 ml mėginukas). Kitos (seni 30 / 50 ml įrašai) parduotuvėje nerodomos.
const BOTTLE_ML = [33, 100];

const GENDER_NAME = { moterims: "Moterims", vyrams: "Vyrams", unisex: "Unisex" };
const GENDER_TITLE = { moterims: "Kvepalai moterims", vyrams: "Kvepalai vyrams", unisex: "Unisex kvepalai" };
const CONC_NAME = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
const SEASON_NAME = { pavasaris: "Pavasaris", vasara: "Vasara", ruduo: "Ruduo", žiema: "Žiema" };
const LEVEL = ["", "Labai lengvas", "Lengvas", "Vidutinis", "Stiprus", "Labai stiprus"];
const LASTS = ["", "2–3 val.", "3–5 val.", "5–7 val.", "7–9 val.", "9+ val."];

function setCatalog(c) {
  CAT = c;
  for (const p of c.products) {
    const ok = (p.sizes || []).filter(s => BOTTLE_ML.includes(Number(s.ml)));
    if (ok.length) p.sizes = ok;
  }
  SET = window.__vdPreviewSet ? { ...c.settings, ...window.__vdPreviewSet } : c.settings; // administravimo peržiūra (25)
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
          ...p.seasons,
          ...p.time
        ].join(" ")
      )
    ])
  );
}
const visibleFamilies = () => CAT.families.filter(f => f.visible !== false);
const visibleCategories = () => (CAT.categories || []).filter(c => c.visible !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

const minPrice = p => Math.min(...p.sizes.map(s => s.price));
// Akcija: tūrio „was“ – ankstesnė kaina (administratorius įrašo tik tikrą – mažiausią per 30 d., Omnibus direktyva)
const wasOf = (p, ml) => {
  const s = ml === SAMPLE_ML ? null : p.sizes.find(x => x.ml === ml);
  return s?.was > s?.price ? s.was : null;
};
const cheapestSize = p => p.sizes.reduce((a, b) => (b.price < a.price ? b : a), p.sizes[0]);
const onSale = p => p.sizes.some(s => s.was > s.price);
// Didžiausia nuolaida, % (pagal tikrą seną kainą – sizes[].was)
const salePct = p => Math.max(0, ...p.sizes.filter(s => s.was > s.price).map(s => Math.round((1 - s.price / s.was) * 100)));
// „Didžiausios nuolaidos“ – turimi kvapai su nuolaida, didžiausia nuolaida pirma
const saleList = () => PRODUCTS.filter(p => inStock(p) && onSale(p)).sort((a, b) => salePct(b) - salePct(a) || a.rank - b.rank);
// „Bestselleriai“ – populiariausi (eilė „rank“ – administravimo skydelyje)
const BEST_N = 8;
const bestList = () => [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, BEST_N);
// Trys būdingiausios natos (po vieną iš viršutinių, širdies, bazinių) – kortelėse ir kvapo puslapyje
const keyNotes = p => [p.notes.top[0], p.notes.heart[0], p.notes.base[0]].filter(Boolean);
// Vidutinis įvertinimas iš tikrų atsiliepimų (be įvertinimo – null)
function ratingOf(p) {
  const r = (p.reviews || []).filter(x => x?.rating);
  return r.length ? { avg: r.reduce((s, x) => s + x.rating, 0) / r.length, n: r.length } : null;
}
const familyName = id => FAMILY?.get(id)?.name || "";
const priceOf = (p, ml) => (ml === SAMPLE_ML ? p.sample : p.sizes.find(s => s.ml === ml)?.price);
const sizeLabel = ml => (ml === SAMPLE_ML ? "Mėginukas 2 ml" : `${ml} ml`);
// „Įkvėpti Tom Ford – Tobacco Vanille“ – rodoma, jei kvapas turi lauką inspired ir nustatymuose neišjungta
const inspiredOf = p => (SET.inspired?.show !== false && p.inspired) || "";
const cardSub = p => `${familyName(p.family)} · ${p.conc}`;
const productUrl = p => `kvepalai/${p.id}`;
// Likutis: laukas stock (nėra – neskaičiuojama, 0 – laikinai išparduota). Tą pačią taisyklę tikrina serveris.
const inStock = p => p.stock == null || p.stock > 0;
// Atradimų rinkinys (settings.discovery): bet kurie N mėginukų už fiksuotą kainą. Krepšelio eilutė { id, ml: 0, qty, picks }.
const isDisc = id => !!DISC && id === DISC.id;
const SAMPLEABLE = () => PRODUCTS.filter(inStock);

// „Tiks …“ – viena eilutė kvapo puslapyje iš laukų time, sillage, seasons (be naujų duomenų)
const SEASON_DAT = { pavasaris: "pavasariui", vasara: "vasarai", ruduo: "rudeniui", žiema: "žiemai" };
// „Kam skirti“ (kvapo puslapis): kada ir kokiu metų laiku – po vieną kartą, be pasikartojimų
function suitsParts(p) {
  const when = p.time.includes("vakaras")
    ? p.time.includes("diena")
      ? "dienai ir vakarui"
      : p.sillage >= 4
        ? "vakarui ir šventėms"
        : "vakarui"
    : p.sillage <= 2
      ? "kasdienai ir darbui"
      : "dienai";
  const seasons =
    p.seasons.length >= 4
      ? "visiems metų laikams"
      : ["pavasaris", "vasara", "ruduo", "žiema"]
          .filter(x => p.seasons.includes(x))
          .map(x => SEASON_DAT[x])
          .join(" ir ")
          .replace(/ ir (?=.* ir )/g, ", ");
  return { when, seasons };
}

function matches(p, q) {
  if (!q) return true;
  const ix = SEARCH_IX.get(p.id) || "";
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every(w => ix.includes(w));
}
setCatalog(window.VAIDORE_CATALOG);
