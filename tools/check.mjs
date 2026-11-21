// Greita patikra prieš įkeliant: katalogo duomenys, JS sintaksė, surinkimas.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildApp } from "./build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = m => errors.push(m);

// 1. Katalogas
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const fam = new Set(cat.families.map(f => f.id));
const ids = new Set();
for (const p of cat.products) {
  if (!/^[a-z0-9-]+$/.test(p.id)) fail(`${p.id}: id tik mažosios raidės, skaičiai ir „-“`);
  if (ids.has(p.id)) fail(`${p.id}: pasikartojantis id`);
  ids.add(p.id);
  if (!fam.has(p.family)) fail(`${p.id}: nežinoma kvapo šeima „${p.family}“`);
  if (!["moterims", "vyrams", "unisex"].includes(p.gender)) fail(`${p.id}: gender - moterims / vyrams / unisex`);
  if (!p.sizes?.length) fail(`${p.id}: nėra tūrių`);
  for (const s of p.sizes || []) {
    if (!(s.ml > 0 && s.price > 0)) fail(`${p.id}: blogas tūris / kaina`);
    if (s.was != null && !(s.was > s.price)) fail(`${p.id}: sizes.was (sena kaina) turi būti didesnė už price`);
  }
  for (const k of ["top", "heart", "base"]) if (!p.notes?.[k]?.length) fail(`${p.id}: nėra natų „${k}“`);
  if (!/^#[0-9a-f]{6}$/i.test(p.look?.liquid || "")) fail(`${p.id}: look.liquid - spalva #RRGGBB`);
  if (p.inspired != null && (typeof p.inspired !== "string" || p.inspired.length > 120)) fail(`${p.id}: inspired - tekstas iki 120 simbolių, pvz. „Tom Ford - Tobacco Vanille“`);
  if (p.stock != null && !(Number.isInteger(p.stock) && p.stock >= 0)) fail(`${p.id}: stock - sveikas skaičius ≥ 0 (arba nėra lauko)`);
  for (const img of p.images || []) {
    if (/^\/|^https?:/.test(img)) fail(`${p.id}: images - santykinis kelias, pvz. img/${p.id}-1.webp`);
    else if (!fs.existsSync(path.join(root, "src/public", img))) fail(`${p.id}: nėra failo src/public/${img}`);
  }
  for (const r of p.reviews || []) {
    if (!r?.name || !r?.text) fail(`${p.id}: reviews - reikia name ir text (tik tikri atsiliepimai)`);
    if (r?.rating != null && !(r.rating >= 1 && r.rating <= 5)) fail(`${p.id}: reviews.rating - 1-5`);
  }
}
const D = cat.settings.discovery;
if (D && !(D.count >= 2 && D.count <= cat.products.length && D.price > 0)) fail("settings.discovery: count ir price");
if (D && ids.has(D.id)) fail("settings.discovery.id sutampa su kvapo id");
// Neužpildyti rekvizitai - tik įspėjimas (parduotuvė veikia, bet prieš paleidimą užpildykite)
const todo = Object.entries(cat.settings.company).filter(([, v]) => /^\[.*\]$/.test(String(v)));
if (todo.length) console.warn(`! settings.company neužpildyta: ${todo.map(([k]) => k).join(", ")}`);

// CSS: surinkimo glaudintuvas (build.mjs minCss) šalina tarpą prieš „:“, todėl selektorius „.a :is(…)“ virstų „.a:is(…)“
for (const f of fs.readdirSync(path.join(root, "src/styles")).filter(f => f.endsWith(".css"))) {
  fs.readFileSync(path.join(root, "src/styles", f), "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (/\{\s*$/.test(line) && /[\w)\]] :[a-z-]/.test(line)) fail(`src/styles/${f}:${i + 1}: selektoriuje „ :“ - rašykite „ *:“ arba konkretų elementą`);
    });
}

// v30: jokių ilgų brūkšnių (U+2012-2015) ir minuso ženklo (U+2212) - visur paprastas „-“ (parduotuvė, skydelis, serveris,
// statiniai puslapiai, duomenys). Įvestyje juos atpažinti galima tik per \u2013 / \u2014 (pvz. 13-autofill.js)
{
  const LONG = /[\u2012-\u2015\u2212]/;
  const walk = dir =>
    fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  const files = [...walk("src"), ...walk("supabase/functions"), "supabase/seed.sql", "tools/build.mjs", "tools/build-site.mjs", "tools/db-catalog.mjs"].filter(
    f => /\.(js|mjs|ts|css|html|json|svg|webmanifest|xml|sql)$/.test(f) && !f.startsWith("src/public/fonts/")
  );
  for (const f of files)
    fs.readFileSync(path.join(root, f), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (LONG.test(line)) fail(`${f}:${i + 1}: ilgas brūkšnys - rašykite paprastą „-“`);
      });
}

// 2. JS sintaksė (programėlė kaip vienas scope)
const html = buildApp();
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((s, i) => {
  try {
    new vm.Script(s, { filename: `inline-${i}.js` });
  } catch (e) {
    fail(`JS klaida (${i}): ${e.message}`);
  }
});
for (const f of ["supabase/functions/_shared/shop.js", "src/public/sw.js", ...fs.readdirSync(path.join(root, "src/scripts/admin")).map(f => `src/scripts/admin/${f}`)]) {
  const r = spawnSync(process.execPath, ["--check", path.join(root, f)], { encoding: "utf8" });
  if (r.status !== 0) fail(`${f}: ${r.stderr.split("\n").slice(0, 5).join(" ")}`);
}

if (errors.length) {
  console.error("✗ " + errors.join("\n✗ "));
  process.exit(1);
}
console.log(`✓ katalogas: ${cat.products.length} kvapai, ${cat.families.length} šeimos · JS sintaksė gera`);
