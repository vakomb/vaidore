// Vercel surinkimas: node tools/build-site.mjs → aplankas site/ (vercel.json: outputDirectory "site", cleanUrls).
//   site/index.html        – parduotuvė (programėlė)
//   site/aciu.html         – po sėkmingo Stripe apmokėjimo (/aciu)
//   site/salygos.html      – pirkimo sąlygos (/salygos)
//   site/privatumas.html   – privatumo politika (/privatumas)
//   site/catalog.json      – katalogas (tas pats, kurį naudoja api/checkout.js kainoms tikrinti)
//   + src/public/* (ikonos, manifest, sw.js)
// Be išorinių priklausomybių – veikia Vercel'yje be npm paketų.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const site = path.join(root, "site");

fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });

// 1. Programėlė
const app = buildApp();
fs.writeFileSync(path.join(site, "index.html"), app);

// 2. Vieši failai
fs.cpSync(path.join(src, "public"), site, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(src, "data", "catalog.json"), "utf8"));
fs.writeFileSync(path.join(site, "catalog.json"), JSON.stringify(catalog));

// 3. Statiniai puslapiai – tas pats dizainas (src/pages/_layout.html + src/styles/01–03)
const css = ["styles/01-tokens.css", "styles/02-base.css", "styles/08-pages.css"]
  .map(f => fs.readFileSync(path.join(src, f), "utf8"))
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ");
const layout = fs.readFileSync(path.join(src, "pages", "_layout.html"), "utf8");
const c = catalog.settings.company;
const fill = s =>
  s
    .replace(/\{\{company\.(\w+)\}\}/g, (_, k) => c[k] ?? "")
    .replace(/\{\{freeShippingFrom\}\}/g, String(catalog.settings.freeShippingFrom))
    .replace(/\{\{shipping\}\}/g, () =>
      catalog.settings.shipping
        .map(o => `<li>${o.name} – ${o.price.toFixed(2).replace(".", ",")} € (${o.days})</li>`)
        .join("")
    )
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
for (const f of fs.readdirSync(path.join(src, "pages")).filter(f => !f.startsWith("_") && f.endsWith(".html"))) {
  const page = fs.readFileSync(path.join(src, "pages", f), "utf8");
  const title = (page.match(/<!-- title: (.*?) -->/) || [])[1] || "Vaidore";
  const html = fill(layout.replace("{{title}}", title).replace("{{css}}", css).replace("{{body}}", page));
  fs.writeFileSync(path.join(site, f), html);
}

const files = fs.readdirSync(site, { recursive: true }).filter(f => fs.statSync(path.join(site, f)).isFile());
console.log(`site/ – ${files.length} failai, programėlė ${Math.round(app.length / 1024)} KB`);
