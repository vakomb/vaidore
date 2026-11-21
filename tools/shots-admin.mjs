// Administravimo skydelio ekrano nuotraukos keliais dydžiais (be interneto, Supabase imituojamas):
//   node tools/shots-admin.mjs [plotis×aukštis …] [-- adresas …]
// Numatyta: 390×844, 430×932, 844×390, 768×1024, 1440×900; adresai – visi skyriai. Rezultatas – .verify/shots/ax-*.png
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startServer } from "./serve.mjs";
import { mockSupabase, sampleOrders, ADMIN } from "./mock-supabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");
const args = process.argv.slice(2);
const sep = args.indexOf("--");
const sizes = (sep < 0 ? args : args.slice(0, sep)).filter(a => /^\d+[x×]\d+$/.test(a));
const routes = sep < 0 ? [] : args.slice(sep + 1);
const SIZES = (sizes.length ? sizes : ["390x844", "430x932", "844x390", "768x1024", "1440x900"]).map(s => s.split(/[x×]/).map(Number));
const ROUTES = routes.length
  ? routes
  : ["admin", "admin/uzsakymai", "admin/uzsakymai/AB12CD01", "admin/kvapai", "admin/kvapai/vanor", "admin/kvapai/naujas", "admin/kvapu-sarasas", "admin/kategorijos", "admin/natos", "admin/vitrina", "admin/vitrina/skaidres", "admin/vitrina/skyriai", "admin/vitrina/plyteles", "admin/vitrina/juosta", "admin/vitrina/korteles", "admin/vitrina/puslapiai", "admin/daugiau", "admin/atsiliepimai", "admin/nustatymai/pristatymas", "admin/zurnalas"];
const out = path.join(root, ".verify", "site-admin");
if (process.env.NO_BUILD !== "1") {
  const r = spawnSync(process.execPath, [path.join(root, "tools/build-site.mjs")], { env: { ...process.env, OUT: out, NO_DB: "1", OMNIVA_FILE: path.join(root, "tools/fixtures/omniva-sample.json") }, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}
const shotDir = path.join(root, ".verify", "shots");
fs.mkdirSync(shotDir, { recursive: true });
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const SB_URL = JSON.parse(fs.readFileSync(path.join(root, "src/data/supabase.json"), "utf8")).url;
const PORT = 4185;
const server = await startServer(out, PORT);
const sb = mockSupabase({ url: SB_URL, catalog: cat });
sb.reset();
sampleOrders(sb.db);
sb.db.products.find(p => p.id === "arven").stock = 0;
const browser = await chromium.launch();
const errs = [];
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 900 ? 2 : 1, hasTouch: w < 900 });
  const page = await ctx.newPage();
  page.on("pageerror", e => errs.push(`${w}: ${e.message}`));
  await page.route(`${SB_URL}/**`, sb.handle);
  await page.route(`${SB_URL}/storage/v1/object/public/**`, rt => rt.fulfill({ path: path.join(root, "src/public/og/home.jpg"), contentType: "image/jpeg" }));
  await page.route(/plausible\.io|omniva\.ee/, rt => rt.abort());
  await page.addInitScript(t => localStorage.setItem("vaidore_auth_v1", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: 4e9 })), ADMIN.token);
  for (const r of ROUTES) {
    await page.goto(`http://localhost:${PORT}/${r}`);
    await page.waitForSelector("#admMain .axPage", { timeout: 8000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector("#admMain .axSkel"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(350);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) errs.push(`${w}×${h} ${r}: platesnis už ekraną ${over}px`);
    await page.screenshot({ path: path.join(shotDir, `ax-${w}x${h}-${r.replace(/\//g, "-")}.png`), fullPage: process.env.FULL === "1" });
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(errs.length ? errs.join("\n") : "be klaidų");
