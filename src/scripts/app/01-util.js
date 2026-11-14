// 01 – pagalbinės funkcijos: DOM, tekstas, pinigai, vietinė atmintis.
// Visi src/scripts/app/*.js sujungiami eilės tvarka į vieną IIFE (bendras scope, be import/export).
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v =>
  String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fold = s =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const eurFmt = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" });
const eur = n => eurFmt.format(Math.round(Number(n || 0) * 100) / 100);
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
      /* privatus režimas – tęsiame be išsaugojimo */
    }
  }
};
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
const raf2 = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
function logError(where, err) {
  console.error(`[Vaidore] ${where}`, err);
}
