// v33: kalbos surinkimui (build.mjs, build-site.mjs, check.mjs, testai) - žodynai, adresų žemėlapis ir tas pats
// LT ↔ EN adresų vertimas, kurį naudoja programėlė (src/i18n/url.js - vienas šaltinis).
// Aplinkos kintamasis I18N_EN_PUBLIC=1 (arba 0) perrašo src/i18n/config.json „enPublic“.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "i18n");
const json = f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

export const CONFIG = json("config.json");
export const LANGS = CONFIG.langs;
export const ROUTES = json("routes.json");
export const DICTS = Object.fromEntries(LANGS.map(l => [l, json(`${l}.json`)]));
// Angliška versija viešai (perjungiklis LT puslapiuose, indeksavimas, hreflang, sitemap) - tik kai baigti vertimai
export const EN_PUBLIC = process.env.I18N_EN_PUBLIC != null ? process.env.I18N_EN_PUBLIC === "1" : !!CONFIG.enPublic;
export const URL_SRC = fs.readFileSync(path.join(dir, "url.js"), "utf8");
const makeL10n = new Function(`${URL_SRC}\nreturn makeL10n;`)();
export const L10N = makeL10n({ ...ROUTES, enStatic: !!CONFIG.enStaticPages });

// Raktas → tekstas (kintamieji {vardas}); trūkstamas - LT, tada pats raktas
export function t(lang, key, vars) {
  let s = DICTS[lang]?.[key] ?? DICTS.lt?.[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
// Vidinis (LT) maršrutas → kalbos maršrutas: „kvepalai/rasa“ → „en/perfumes/rasa“
export const routeFor = (lang, route) => (lang === "en" ? L10N.enRel(route) : route);
