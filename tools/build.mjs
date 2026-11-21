// Vaidore surinkimas (kaip AutoEasier): src/index.html su <!-- @inline … --> žymomis → dist/index.html (vienas failas).
//   <!-- @inline <style id="x"> styles/01-tokens.css -->   - CSS įdedamas į <style>
//   <!-- @partial partials/view-home.html -->               - HTML įdedamas kaip yra
//   <!-- @app scripts/app -->                               - visi scripts/app/*.js eilės tvarka viename IIFE (bendras scope)
//   <!-- @catalog -->                                       - katalogas kaip window.VAIDORE_CATALOG (+ prekių puslapių tekstai
//                                                             window.VAIDORE_PDP iš data/pdp.json, Supabase adresas, surinkimo laikas)
//   <!-- @base -->                                          - <base href> (svetainės šaknis: „/“ arba GitHub Pages „/vaidore/“)
// Naudojimas: node tools/build.mjs [--out kelias] [--pretty]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
export function buildApp(opts = {}) {
  let html = read("index.html");
  html = html.replace(/<!-- @inline <style id="([\w-]+)"> ([\w./-]+) -->/g, (_, id, rel) => {
    return `<style id="${id}">${minCss(guard(rel, read(rel)))}</style>`;
  });
  // @partial gali būti ir dalies viduje (pvz. partials/header.html → partials/logo.svg)
  const partials = s => s.replace(/<!-- @partial ([\w./-]+) -->/g, (_, rel) => partials(guard(rel, read(rel)).trim()));
  html = partials(html);
  html = html.replace(/<!-- @base -->/, () => `<base href="${opts.base || "/"}" />`);
  html = html.replace(/<!-- @catalog -->/, () => {
    const json = JSON.stringify(opts.catalog || JSON.parse(read("data/catalog.json")));
    const sb = opts.supabase === undefined ? JSON.parse(read("data/supabase.json")) : opts.supabase;
    // Prekių puslapių turinio blokų numatytieji tekstai pagal tipą (v29; administravime keičiami - settings.pdp)
    const pdp = JSON.stringify(JSON.parse(read("data/pdp.json")));
    // Numatytoji natų biblioteka - ingredientai, iškirpti iš tikrų Vaidore produktų nuotraukų (img/natos/; bazėje - note_media)
    const notes = JSON.stringify(JSON.parse(read("data/notes.json")));
    return `<script>window.VAIDORE_CATALOG=${json.replace(/</g, "\\u003c")};window.VAIDORE_PDP=${pdp.replace(/</g, "\\u003c")};window.VAIDORE_NOTES=${notes.replace(/</g, "\\u003c")};window.VAIDORE_SB=${JSON.stringify(sb)};window.VAIDORE_BUILT=${opts.built || Date.now()};</script>`;
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
  const html = buildApp();
  const out = outArg ? path.resolve(outArg) : path.join(root, "dist", "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Built ${path.relative(root, out)} - ${Math.round(html.length / 1024)} KB`);
}
