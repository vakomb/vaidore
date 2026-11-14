// Vaidore surinkimas (kaip AutoEasier): src/index.html su <!-- @inline … --> žymomis → dist/index.html (vienas failas).
//   <!-- @inline <style id="x"> styles/01-tokens.css -->   – CSS įdedamas į <style>
//   <!-- @partial partials/view-home.html -->               – HTML įdedamas kaip yra
//   <!-- @app scripts/app -->                               – visi scripts/app/*.js eilės tvarka viename IIFE (bendras scope)
//   <!-- @catalog -->                                       – src/data/catalog.json kaip window.VAIDORE_CATALOG
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

export function buildApp() {
  let html = read("index.html");
  html = html.replace(/<!-- @inline <style id="([\w-]+)"> ([\w./-]+) -->/g, (_, id, rel) => {
    return `<style id="${id}">${minCss(guard(rel, read(rel)))}</style>`;
  });
  html = html.replace(/<!-- @partial ([\w./-]+) -->/g, (_, rel) => guard(rel, read(rel)).trim());
  html = html.replace(/<!-- @catalog -->/, () => {
    const json = JSON.stringify(JSON.parse(read("data/catalog.json")));
    return `<script>window.VAIDORE_CATALOG=${json.replace(/</g, "\\u003c")};</script>`;
  });
  html = html.replace(/<!-- @app ([\w./-]+) -->/, (_, dir) => {
    const files = fs
      .readdirSync(path.join(src, dir))
      .filter(f => f.endsWith(".js"))
      .sort();
    const body = files.map(f => `// ── ${f}\n${guard(`${dir}/${f}`, read(`${dir}/${f}`))}`).join("\n");
    return `<script>\n(() => {\n"use strict";\n${body}\n})();\n</script>`;
  });
  const left = html.match(/<!-- @[\w]+[^>]*-->/);
  if (left) throw new Error(`Neišspręsta žyma: ${left[0]}`);
  return html;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const html = buildApp();
  const out = outArg ? path.resolve(outArg) : path.join(root, "dist", "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Built ${path.relative(root, out)} — ${Math.round(html.length / 1024)} KB`);
}
