// Open Graph paveikslai (1200 × 630 JPEG) dalinimuisi: src/public/og/<id>.jpg kiekvienam kvapui ir og/home.jpg.
// Buteliukas - tas pats SVG kaip programėlėje (paimamas iš surinktos programėlės). Paleisti pakeitus katalogą:
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
// VAIDORE logotipas - tas pats kaip svetainėje (src/partials/logo.svg, tools/make-logo.py)
const LOGO = fs.readFileSync(path.join(root, "src/partials/logo.svg"), "utf8").trim();
const page = (tint, art, text) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#111;
background:radial-gradient(70% 90% at 28% 45%,#fff 0%,#ece6dd 72%);display:grid;grid-template-columns:520px 1fr;align-items:center}
.art{height:630px;display:flex;align-items:flex-end;justify-content:center;gap:10px;padding:40px 0 50px}.art svg{height:520px;width:auto;filter:drop-shadow(0 24px 30px rgba(15,23,42,.16))}
.art.trio svg{height:400px}.art img{height:560px;width:auto;object-fit:contain;filter:drop-shadow(0 18px 18px rgba(30,24,16,.18))}.art.trio img{height:400px;margin:0 -118px}.art{overflow:hidden}.txt{padding:0 70px 0 10px}.brand{margin-bottom:34px;color:#111}.brand svg{height:34px;width:auto;display:block}
h1{font-size:84px;line-height:1.02;letter-spacing:-.03em}h1.home{font-size:58px;line-height:1.1}p{margin-top:18px;font-size:34px;line-height:1.3;color:#475569;font-weight:600}
.meta{margin-top:30px;display:inline-flex;padding:14px 22px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px rgba(226,232,240,.7),0 8px 24px -8px rgba(15,23,42,.15);font-size:26px;font-weight:700;color:#111}
</style></head><body><div class="art${art.trio ? " trio" : ""}">${art.svg}</div><div class="txt"><div class="brand">${LOGO}</div>${text}</div></body></html>`;

// Buteliukų SVG - iš tikros programėlės (window.VD.bottleSVG), be duomenų bazės
const app = buildApp({ catalog, supabase: null });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.route("http://og.local/**", r => (r.request().url() === "http://og.local/" ? r.fulfill({ contentType: "text/html", body: app }) : r.fulfill({ status: 404, body: "" })));
await p.goto("http://og.local/");
await p.waitForFunction(() => window.VD?.bottleSVG);
const svgs = await p.evaluate(() => Object.fromEntries(window.VD.CAT.products.map(pr => [pr.id, window.VD.bottleSVG(pr)])));
// Jei kvapas turi savą nuotrauką (src/public/img/…) - naudojama ji (pirmoji, permatomame fone)
const photo = pr => {
  const f = pr.images?.[0] && path.join(root, "src/public", pr.images[0]);
  if (!f || !fs.existsSync(f)) return null;
  const type = f.endsWith(".png") ? "png" : f.endsWith(".webp") ? "webp" : "jpeg";
  return `<img src="data:image/${type};base64,${fs.readFileSync(f).toString("base64")}" alt="" />`;
};
for (const pr of catalog.products) if (photo(pr)) svgs[pr.id] = photo(pr);
for (const pr of catalog.products) {
  const min = Math.min(...pr.sizes.map(s => s.price));
  await p.setContent(
    page(pr.look.tint, { svg: svgs[pr.id] }, `<h1>${esc(pr.name)}</h1>${S.inspired?.show !== false && pr.inspired ? `<p style="font-size:28px;margin-top:12px">Įkvėpti ${esc(pr.inspired)}</p>` : ""}<p>${esc(pr.tagline)}</p><p style="font-size:26px;margin-top:10px">${esc(FAM[pr.family])} · ${esc(CONC[pr.conc] || pr.conc)}</p><div class="meta">nuo ${money(min)} · mėginukas ${money(pr.sample)}</div>`)
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
console.log(`og/ - ${files.length} paveikslai, ${Math.round(files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0) / 1024)} KB`);
