// 03 – katalogas: kvapai, šeimos, kategorijos, nustatymai. Pradžioje – surinkimo metu įdėtas window.VAIDORE_CATALOG
// (iš duomenų bazės arba src/data/catalog.json), vėliau setCatalog() pakeičia jį šviežiais duomenimis iš Supabase (20-supabase.js).
// Visi kintamieji – let: po atnaujinimo perskaičiuojami (BY_ID, paieškos indeksas…).
let CAT, SET, PRODUCTS, ALL_PRODUCTS, BY_ID, FAMILY, CATEGORY, SEARCH_IX, DISC;
const SAMPLE_ML = 2;

const GENDER_NAME = { moterims: "Moterims", vyrams: "Vyrams", unisex: "Unisex" };
const GENDER_TITLE = { moterims: "Kvepalai moterims", vyrams: "Kvepalai vyrams", unisex: "Unisex kvepalai" };
const CONC_NAME = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
const SEASON_NAME = { pavasaris: "Pavasaris", vasara: "Vasara", ruduo: "Ruduo", žiema: "Žiema" };
const LEVEL = ["", "Labai lengvas", "Lengvas", "Vidutinis", "Stiprus", "Labai stiprus"];
const LASTS = ["", "2–3 val.", "3–5 val.", "5–7 val.", "7–9 val.", "9+ val."];

function setCatalog(c) {
  CAT = c;
  SET = c.settings;
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
const cardSub = p => `${familyName(p.family)} · ${p.conc}`;
const productUrl = p => `kvepalai/${p.id}`;
// Likutis: laukas stock (nėra – neskaičiuojama, 0 – laikinai išparduota). Tą pačią taisyklę tikrina serveris.
const inStock = p => p.stock == null || p.stock > 0;
// Atradimų rinkinys (settings.discovery): bet kurie N mėginukų už fiksuotą kainą. Krepšelio eilutė { id, ml: 0, qty, picks }.
const isDisc = id => !!DISC && id === DISC.id;
const SAMPLEABLE = () => PRODUCTS.filter(inStock);

// „Tiks …“ – viena eilutė kvapo puslapyje iš laukų time, sillage, seasons (be naujų duomenų)
const SEASON_DAT = { pavasaris: "pavasariui", vasara: "vasarai", ruduo: "rudeniui", žiema: "žiemai" };
function suitsLine(p) {
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
  return seasons ? `Tiks ${when} · ${seasons}` : `Tiks ${when}`;
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
