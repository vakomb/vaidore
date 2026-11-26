// Vaidore surinkimas (kaip AutoEasier): src/index.html su <!-- @inline … --> žymomis → dist/index.html (vienas failas).
//   <!-- @inline <style id="x"> styles/01-tokens.css -->   - CSS įdedamas į <style>
//   <!-- @partial partials/view-home.html -->               - HTML įdedamas kaip yra
//   <!-- @app scripts/app -->                               - visi scripts/app/*.js eilės tvarka viename IIFE (bendras scope)
//   <!-- @catalog -->                                       - katalogas kaip window.VAIDORE_CATALOG (+ prekių puslapių tekstai
//                                                             window.VAIDORE_PDP iš data/pdp.json, Supabase adresas, surinkimo laikas)
//   <!-- @base -->                                          - <base href> (svetainės šaknis: „/“ arba GitHub Pages „/vaidore/“)
//   {{t:raktas}}                                            - v33: tekstas iš src/i18n/<kalba>.json (ir atributuose); <html lang>
// Naudojimas: node tools/build.mjs [--out kelias] [--pretty] [--lang en]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DICTS, ROUTES, CONFIG, EN_PUBLIC, URL_SRC, t } from "./i18n.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const args = process.argv.slice(2);
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const pretty = args.includes("--pretty");

const read = rel => fs.readFileSync(path.join(src, rel), "utf8");
const guard = (rel, text) => {
  if (/<\/(style|script)/i.test(text)) throw new Error(`${rel}: literalus </style> ar </script> sulaužytų puslapį`);
  return text;
};
const minCss = css =>
  pretty
    ? css
    : css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,>])\s*/g, "$1")
        .replace(/;}/g, "}")
        .trim();

// opts.lockers - kiek Omniva paštomatų parsiųsta (tools/build-site.mjs); opts.head - papildomos <head> eilutės;
// opts.catalog - katalogo objektas (testams; numatyta - src/data/catalog.json)
// v33: opts.lang - puslapio kalba („lt“ / „en“); opts.dicts - kurių kalbų žodynus įdėti (numatyta - tik puslapio;
// 404.html - abiejų, nes ji aptarnauja nežinomus abiejų kalbų adresus)
const escAttr = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Natos raktas - kaip programėlės fold() (01-util.js): mažosios raidės, be diakritikų
const foldKey = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
// Lietuviškam puslapiui vertimai nereikalingi: i18n laukai pašalinami (katalogas nedidėja)
export function stripI18n(c) {
  for (const k of ["products", "families", "categories", "scents"]) for (const o of c[k] || []) delete o.i18n;
  if (c.settings) delete c.settings.i18n;
  return c;
}
export function buildApp(opts = {}) {
  const lang = opts.lang || "lt";
  const dicts = opts.dicts || [lang];
  let html = read("index.html");
  html = html.replace(/<!-- @inline <style id="([\w-]+)"> ([\w./-]+) -->/g, (_, id, rel) => {
    return `<style id="${id}">${minCss(guard(rel, read(rel)))}</style>`;
  });
  // @partial gali būti ir dalies viduje (pvz. partials/header.html → partials/logo.svg)
  const partials = s => s.replace(/<!-- @partial ([\w./-]+) -->/g, (_, rel) => partials(guard(rel, read(rel)).trim()));
  html = partials(html);
  // Puslapis su keliais žodynais (404.html - abiem kalboms): programėlė statinius tekstus išverčia pati (29-lang.js)
  html = html.replace(/<html lang="[a-z]+"/, `<html lang="${lang}"${dicts.length > 1 ? ` data-build-lang="${lang}"` : ""}`);
  html = html.replace(/\{\{t:([\w.-]+)\}\}/g, (_, key) => {
    if (DICTS.lt[key] == null) throw new Error(`Žodyne nėra rakto: ${key}`);
    return escAttr(t(lang, key));
  });
  html = html.replace(/<!-- @base -->/, () => `<base href="${opts.base || "/"}" />`);
  html = html.replace(/<!-- @catalog -->/, () => {
    // v33: vertimai (i18n) įdedami tik į puslapius, kuriems reikia kitos kalbos (EN ir 404); lietuviškiems - pašalinami
    const foreign = dicts.some(l => l !== "lt");
    const json = JSON.stringify(foreign ? opts.catalog || JSON.parse(read("data/catalog.json")) : stripI18n(structuredClone(opts.catalog || JSON.parse(read("data/catalog.json")))));
    const sb = opts.supabase === undefined ? JSON.parse(read("data/supabase.json")) : opts.supabase;
    // Prekių puslapių turinio blokų numatytieji tekstai pagal tipą (v29; administravime keičiami - settings.pdp)
    const pdp = JSON.stringify(JSON.parse(read("data/pdp.json")));
    // Numatytoji natų biblioteka - ingredientai, iškirpti iš tikrų Vaidore produktų nuotraukų (img/natos/; bazėje - note_media)
    const notes = JSON.stringify(JSON.parse(read("data/notes.json")));
    // v33: kalba - tik reikiamų kalbų žodynai, adresų žemėlapis ir jo vertimas (src/i18n/url.js)
    const i18n = JSON.stringify(Object.fromEntries(dicts.map(l => [l, DICTS[l]])));
    const pub = opts.enPublic ?? EN_PUBLIC;
    const l10n = `window.VAIDORE_ROUTES=${JSON.stringify(ROUTES)};window.VAIDORE_I18N=${i18n.replace(/</g, "\\u003c")};window.VAIDORE_I18N_PUBLIC=${pub ? "true" : "false"};window.VAIDORE_L10N=(function(){${guard("i18n/url.js", URL_SRC)}\nreturn makeL10n(Object.assign({},window.VAIDORE_ROUTES,{enStatic:${CONFIG.enStaticPages ? "true" : "false"}}));})();`;
    // Prekių puslapių tekstai ir natų pavadinimai kitomis kalbomis (src/i18n/pdp.<kalba>.json, notes.<kalba>.json)
    const extra = dicts
      .filter(l => l !== "lt")
      .map(l => {
        const pdpL = fs.existsSync(path.join(src, `i18n/pdp.${l}.json`)) ? read(`i18n/pdp.${l}.json`) : "{}";
        const notesL = fs.existsSync(path.join(src, `i18n/notes.${l}.json`)) ? JSON.parse(read(`i18n/notes.${l}.json`)) : {};
        const folded = Object.fromEntries(Object.entries(notesL).map(([k, v]) => [foldKey(k), v]));
        return `window.VAIDORE_PDP_I18N=Object.assign(window.VAIDORE_PDP_I18N||{},{${l}:${JSON.stringify(JSON.parse(pdpL)).replace(/</g, "\\u003c")}});window.VAIDORE_NOTES_${l.toUpperCase()}=${JSON.stringify(folded).replace(/</g, "\\u003c")};`;
      })
      .join("");
    return `<script>window.VAIDORE_CATALOG=${json.replace(/</g, "\\u003c")};window.VAIDORE_PDP=${pdp.replace(/</g, "\\u003c")};window.VAIDORE_NOTES=${notes.replace(/</g, "\\u003c")};${extra}window.VAIDORE_SB=${JSON.stringify(sb)};window.VAIDORE_BUILT=${opts.built || Date.now()};${l10n}</script>`;
  });
  html = html.replace(/<!-- @lockers -->/, () => `<script>window.VAIDORE_LOCKERS=${Number(opts.lockers) || 0};</script>`);
  html = html.replace(/<!-- @app ([\w./-]+) -->/, (_, dir) => {
    const files = fs
      .readdirSync(path.join(src, dir))
      .filter(f => f.endsWith(".js"))
      .sort();
    const body = files.map(f => `// ── ${f}\n${guard(`${dir}/${f}`, read(`${dir}/${f}`))}`).join("\n");
    return `<script>\n(() => {\n"use strict";\n${body}\n})();\n</script>`;
  });
  if (opts.head) html = html.replace("</head>", `${opts.head}\n  </head>`);
  const left = html.match(/<!-- @[\w]+[^>]*-->/);
  if (left) throw new Error(`Neišspręsta žyma: ${left[0]}`);
  return html;
}

// Administravimo skydelis - atskiras failas (įkeliamas tik /admin): src/scripts/admin/*.js + src/styles/admin.css
export function buildAdmin() {
  const dir = "scripts/admin";
  const files = fs
    .readdirSync(path.join(src, dir))
    .filter(f => f.endsWith(".js"))
    .sort();
  const js = `(() => {\n"use strict";\n${files.map(f => `// ── ${f}\n${read(`${dir}/${f}`)}`).join("\n")}\n})();\n`;
  return { js, css: minCss(read("styles/admin.css")) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const html = buildApp({ lang: args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "lt" });
  const out = outArg ? path.resolve(outArg) : path.join(root, "dist", "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Built ${path.relative(root, out)} - ${Math.round(html.length / 1024)} KB`);
}
