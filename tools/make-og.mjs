// Open Graph paveikslai (1200 × 630 JPEG) dalinimuisi: src/public/og/<id>.jpg kiekvienam kvapui ir og/home.jpg.
// Buteliukas – tas pats SVG kaip programėlėje (paimamas iš surinktos programėlės). Paleisti pakeitus katalogą:
//   node tools/make-og.mjs        (reikia Playwright: npm install)
// Kai kvapas turi tikrą nuotrauką (images), puslapis naudoja ją, o ne šį paveikslą.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { buildApp } from "./build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const S = catalog.settings;
const out = path.join(root, "src/public/og");
fs.mkdirSync(out, { recursive: true });

const CONC = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
const FAM = Object.fromEntries(catalog.families.map(f => [f.id, f.name]));
const money = n => (Number.isInteger(n) ? `${n} €` : `${n.toFixed(2).replace(".", ",")} €`);
const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LOGO =
  '<svg viewBox="0 0 26 26" width="40" height="40"><defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B67CC"/><stop offset="1" stop-color="#1E3A86"/></linearGradient></defs><path d="M13 2.5c4.4 5 7.4 9.1 7.4 12.7a7.4 7.4 0 0 1-14.8 0C5.6 11.6 8.6 7.5 13 2.5z" fill="url(#og)"/></svg>';
const page = (tint, art, text) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#0F172A;
background:radial-gradient(70% 90% at 28% 45%,#fff 0%,${tint} 70%);display:grid;grid-template-columns:520px 1fr;align-items:center}
.art{height:630px;display:flex;align-items:flex-end;justify-content:center;gap:10px;padding:40px 0 50px}.art svg{height:520px;width:auto;filter:drop-shadow(0 24px 30px rgba(15,23,42,.16))}
.art.trio svg{height:400px}.txt{padding:0 70px 0 10px}.brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800;letter-spacing:.18em;margin-bottom:34px}
h1{font-size:84px;line-height:1.02;letter-spacing:-.03em}h1.home{font-size:58px;line-height:1.1}p{margin-top:18px;font-size:34px;line-height:1.3;color:#475569;font-weight:600}
.meta{margin-top:30px;display:inline-flex;padding:14px 22px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px rgba(226,232,240,.7),0 8px 24px -8px rgba(15,23,42,.15);font-size:26px;font-weight:700;color:#284CA2}
</style></head><body><div class="art${art.trio ? " trio" : ""}">${art.svg}</div><div class="txt"><div class="brand">${LOGO}VAIDORE</div>${text}</div></body></html>`;

const app = buildApp({ catalog });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.setContent(app.replace('<script>\n(() => {', "<script>\nlocation.hash='#/katalogas';\n(() => {"));
await p.waitForSelector("#shopGrid .card");
const svgs = await p.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll("#shopGrid .card")].map(c => [c.dataset.open, c.querySelector(".art svg")?.outerHTML || ""]))
);
for (const pr of catalog.products) {
  const min = Math.min(...pr.sizes.map(s => s.price));
  await p.setContent(
    page(pr.look.tint, { svg: svgs[pr.id] }, `<h1>${esc(pr.name)}</h1><p>${esc(pr.tagline)}</p><p style="font-size:26px;margin-top:10px">${esc(FAM[pr.family])} · ${esc(CONC[pr.conc] || pr.conc)}</p><div class="meta">nuo ${money(min)} · mėginukas ${money(pr.sample)}</div>`)
  );
  await p.screenshot({ path: path.join(out, `${pr.id}.jpg`), type: "jpeg", quality: 84 });
}
const top = [...catalog.products].sort((a, b) => a.rank - b.rank).slice(0, 3);
await p.setContent(
  page("#F3F5F8", { svg: top.map(x => svgs[x.id]).join(""), trio: true }, `<h1 class="home">${esc(S.tagline || "Kvepalai")}</h1><div class="meta">Nemokamas pristatymas nuo ${money(S.freeShippingFrom)}</div>`)
);
await p.screenshot({ path: path.join(out, "home.jpg"), type: "jpeg", quality: 84 });
await browser.close();
const files = fs.readdirSync(out);
console.log(`og/ – ${files.length} paveikslai, ${Math.round(files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0) / 1024)} KB`);
