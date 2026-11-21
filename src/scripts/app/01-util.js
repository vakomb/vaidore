// 01 - pagalbinės funkcijos: DOM, tekstas, pinigai, vietinė atmintis.
// Visi src/scripts/app/*.js sujungiami eilės tvarka į vieną IIFE (bendras scope, be import/export).
const $ = (s, root = document) => root.querySelector(s);
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
const nb = t => plain(t).replace(/(\d) (?=d\.|ml\b|val\.|vnt\.)/g, "$1\u00a0").replace(/d\. d\./g, "d.\u00a0d.").replace(/(\d)-(\d)/g, "$1\u2060-\u2060$2");
const fold = s =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const eurFmt = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" });
const eur = n => plain(eurFmt.format(Math.round(Number(n || 0) * 100) / 100)); // lt-LT neigiamą sumą rašo su „-“
const eurShort = n => (Number.isInteger(n) ? `${n} €` : eur(n));
const plural = (n, one, few, many) => {
  const d = n % 10,
    t = n % 100;
  if (d === 1 && t !== 11) return `${n} ${one}`;
  if (d >= 2 && d <= 9 && (t < 11 || t > 19)) return `${n} ${few}`;
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
// Svetainės šaknis: <base href> (Vercel - „/“, GitHub Pages - „/vaidore/“, nustato tools/build-site.mjs BASE_PATH)
const BASE_PATH = new URL(document.baseURI).pathname.replace(/[^/]*$/, "");
const SITE_ROOT = new URL(BASE_PATH, location.origin).href;
const absUrl = rel => new URL(rel, SITE_ROOT).href;
const dateFmt = new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
