// 01 - pagalbinės funkcijos: DOM, tekstas, pinigai, vietinė atmintis.
// Visi src/scripts/app/*.js sujungiami eilės tvarka į vieną IIFE (bendras scope, be import/export).
const $ = (s, root = document) => root.querySelector(s);
// v33: kalba - iš adreso („en/…“ - anglų, visa kita - lietuvių); žodynas įdėtas į puslapį (tools/build.mjs, src/i18n/)
const BASE_PATH = new URL(document.baseURI).pathname.replace(/[^/]*$/, "");
const SITE_ROOT = new URL(BASE_PATH, location.origin).href;
const L10N = window.VAIDORE_L10N || { enRel: r => r, ltRel: r => r, isEn: () => false };
const pathRel = () => {
  const p = decodeURIComponent(location.pathname);
  return p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) : p.replace(/^\//, "");
};
const LANG = L10N.isEn(pathRel()) ? "en" : "lt";
const LOCALE = LANG === "en" ? "en-GB" : "lt-LT";
const I18N_ALL = window.VAIDORE_I18N || {};
const DICT = I18N_ALL[LANG] || {};
const DICT_LT = I18N_ALL.lt || {};
const EN_PUBLIC = !!window.VAIDORE_I18N_PUBLIC;
// t("cart.title"), t("cart.freeLeft", { sum }) - tekstas; trūkstamas - lietuviškas, tada raktas
function t(key, vars) {
  let s = DICT[key] ?? DICT_LT[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
// tn("shop.count.items", 3) → „3 prekės“ / „3 products“: raktai „….one“, „….few“, „….many“, „….other“ (Intl.PluralRules)
const PLURAL = new Intl.PluralRules(LOCALE);
function tn(key, n, vars) {
  const form = PLURAL.select(n);
  const k = [`${key}.${form}`, `${key}.other`, `${key}.many`].find(x => DICT[x] != null || DICT_LT[x] != null) || `${key}.other`;
  return t(k, { n, ...vars });
}
// Duomenų bazės įrašo laukas kalba: obj.i18n.en.name, nėra - lietuviškas obj.name
const L = (obj, field) => (LANG !== "lt" && obj?.i18n?.[LANG]?.[field]) || obj?.[field];
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// v30: ilgų brūkšnių (U+2012-2015) ir minuso ženklo (U+2212) nėra niekur - visur paprastas „-“:
// kode, duomenų bazės tekstuose (sbRest skaitant ir rašant, setCatalog) ir išvestyje (esc, nb, eur)
const DASH_RE = /[\u2012-\u2015\u2212]/g;
const plain = v => String(v ?? "").replace(DASH_RE, "-");
// Visi objekto ar masyvo tekstai - vietoje (grąžina tą patį objektą)
const plainDeep = v => {
  if (typeof v === "string") return plain(v);
  if (Array.isArray(v)) for (let i = 0; i < v.length; i++) v[i] = plainDeep(v[i]);
  else if (v && typeof v === "object") for (const k of Object.keys(v)) v[k] = plainDeep(v[k]);
  return v;
};
const esc = v =>
  plain(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Nelaužomi tarpai: „1-2 d. d.“, „30 d.“, „2 ml“, „5 val.“ niekada nelūžta per eilutę
const nb = tx => plain(tx).replace(/(\d) (?=d\.|ml\b|val\.|vnt\.|g\b|h\b|pcs\b|weeks?\b|days?\b|business\b|working\b)/g, "$1\u00a0").replace(/d\. d\./g, "d.\u00a0d.").replace(/(\d)-(\d)/g, "$1\u2060-\u2060$2");
const fold = s =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const eurFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const eur = n => plain(eurFmt.format(Math.round(Number(n || 0) * 100) / 100)); // lt-LT „29,90 €“, en-GB „€29.90“
const eurShort = n => (Number.isInteger(n) ? (LANG === "en" ? `€${n}` : `${n} €`) : eur(n));
const plural = (n, one, few, many) => {
  const d = n % 10,
    tx = n % 100;
  if (d === 1 && tx !== 11) return `${n} ${one}`;
  if (d >= 2 && d <= 9 && (tx < 11 || tx > 19)) return `${n} ${few}`;
  return `${n} ${many}`;
};
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* privatus režimas - tęsiame be išsaugojimo */
    }
  }
};
// Svetainės šaknis: <base href> (Vercel - „/“, GitHub Pages - „/vaidore/“, nustato tools/build-site.mjs BASE_PATH) - BASE_PATH viršuje.
// v33: programėlė viduje naudoja lietuviškus kelius; anglų versijoje jie verčiami tik čia - ties adreso riba.
const urlRel = rel => (LANG === "en" ? L10N.enRel(rel) : rel);
const absUrl = rel => new URL(urlRel(rel), SITE_ROOT).href;
// Adreso parametrai ir inkaras - vidiniais (lietuviškais) pavadinimais („type“ → „tipas“, „#delivery“ → „#pristatymas“)
const urlParams = () => new URLSearchParams(LANG === "en" ? L10N.ltRel(`en${location.search}`).replace(/^[^?]*/, "") : location.search);
const urlHash = () => (LANG === "en" ? L10N.ltRel(`en${location.hash}`).replace(/^[^#]*#?/, "") : location.hash.slice(1));
// Kokios kalbos adresas (santykinis nuo šaknies)
const langOfRel = rel => (L10N.isEn(rel) ? "en" : "lt");
// Tas pats puslapis kita kalba (perjungiklis): vidinis kelias + parametrai + inkaras → kitos kalbos adresas
function altUrl(lang, internal) {
  const rel = internal ?? `${currentPath()}${urlParams().toString() ? `?${urlParams()}` : ""}${urlHash() ? `#${urlHash()}` : ""}`;
  return new URL(lang === "en" ? L10N.enRel(rel) : rel, SITE_ROOT).href;
}
const dateFmt = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
// Šalies pavadinimas kalba („LV“ → „Latvija“ / „Latvia“)
const regionNames = (() => {
  try {
    return new Intl.DisplayNames([LOCALE], { type: "region" });
  } catch {
    return null;
  }
})();
const regionName = c => regionNames?.of(c) || c;
const fmtDate = v => (v ? dateFmt.format(new Date(v)) : "");
const fmtDateTime = v => (v ? dateTimeFmt.format(new Date(v)) : "");
const slugify = s =>
  fold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
const raf2 = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
function logError(where, err) {
  console.error(`[Vaidore] ${where}`, err);
}

// Matavimas be slapukų (settings.analytics): Plausible ir / arba Vercel Web Analytics, jei įjungta ir įkelta.
// Įvykiai: „Peržiūrėjo kvapą“, „Į krepšelį“, „Pradėjo apmokėjimą“, „Apmokėjo“ (aciu.html), „Užbaigė testą“.
function track(name, props = {}) {
  try {
    window.plausible?.(name, { props });
    window.va?.("event", { name, data: props });
  } catch {
    /* matavimas niekada nestabdo pirkimo */
  }
}
