// Administravimo skydelio naršyklės testas (Playwright), be interneto: Supabase imituojamas (tools/mock-supabase.mjs).
//   node tools/test-admin.mjs [--shots]
// Tikrina: prisijungimas → Administravimas; apžvalga; užsakymai (supakuota, išsiųsta + siuntos nr., paieška, CSV,
// grąžinti pinigus); kvapai (likutis, „Pranešti“, slėpimas, redagavimas, tūriai, kategorijos, nuotrauka, naujas kvapas –
// iškart matomas parduotuvėje, neišsaugotų pakeitimų perspėjimas, ištrynimas); kategorijos ir šeimos; atsiliepimai;
// laukiantys; nustatymai; žurnalas; svetainės atnaujinimas; teisės (pirkėjas, neprisijungęs); telefonas; be JS klaidų.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startServer } from "./serve.mjs";
import { mockSupabase, sampleOrders, ADMIN, BUYER } from "./mock-supabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");
const shots = process.argv.includes("--shots");
const out = path.join(root, ".verify", "site-admin");
const shotDir = path.join(root, ".verify", "shots");
if (shots) fs.mkdirSync(shotDir, { recursive: true });

const r = spawnSync(process.execPath, [path.join(root, "tools/build-site.mjs")], {
  env: { ...process.env, OUT: out, NO_DB: "1", OMNIVA_FILE: path.join(root, "tools/fixtures/omniva-sample.json") },
  encoding: "utf8"
});
if (r.status !== 0) throw new Error(r.stderr || r.stdout);
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const SB_URL = JSON.parse(fs.readFileSync(path.join(root, "src/data/supabase.json"), "utf8")).url;
const PORT = 4183;
const BASE = `http://localhost:${PORT}/`;
const server = await startServer(out, PORT);

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const errors = [];
const sb = mockSupabase({ url: SB_URL, catalog: cat });
function seed() {
  sb.reset();
  sampleOrders(sb.db);
  sb.db.products.find(p => p.id === "arven").stock = 0;
  sb.db.products.find(p => p.id === "noirelle").stock = 0;
  sb.db.restock_requests.push(
    { id: "rq-1", product_id: "arven", email: "laukia@example.com", notified: false, created_at: new Date().toISOString() },
    { id: "rq-2", product_id: "noirelle", email: "kitas@example.com", notified: false, created_at: new Date().toISOString() }
  );
  sb.db.reviews.push({ id: "rv-1", product_id: "vanor", user_id: BUYER.id, name: "Ona K.", text: "Labai gaivus kvapas, tinka darbui.", rating: 5, status: "pending", verified: true, created_at: new Date().toISOString() });
}
seed();

const browser = await chromium.launch();
async function newPage(viewport, token = null) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`${viewport.width}: ${e.message}`));
  page.on("dialog", d => (d.type() === "beforeunload" ? d.accept() : d.dismiss()));
  await page.route(`${SB_URL}/**`, sb.handle);
  await page.route(/plausible\.io|omniva\.ee/, rt => rt.abort());
  if (token) await page.addInitScript(t => localStorage.setItem("vaidore_auth_v1", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: 4e9 })), token);
  return page;
}
const shot = async (page, name) => shots && page.screenshot({ path: path.join(shotDir, `admin-${name}.png`), fullPage: true });
const go = async (page, rel) => {
  await page.click(`.admNav a[href="${rel}"]`);
  await page.waitForFunction(() => !document.querySelector("#admMain .loadingTxt"));
};
const until = async (fn, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
};
const toastHas = (page, txt) => until(async () => (await page.locator(".toast").allTextContents()).some(t => t.includes(txt)));

// ── Kompiuteris ─────────────────────────────────────────
console.log("\n— kompiuteris 1440×900 —");
let page = await newPage({ width: 1440, height: 900 });
await page.goto(`${BASE}paskyra`);
await page.fill('.authForm input[name="email"]', ADMIN.email);
await page.fill('.authForm input[name="password"]', ADMIN.password);
await page.click(".authForm button[type=submit]");
await page.waitForSelector(".accNav .accAdmin");
check(true, "prisijungus administratoriumi – paskyroje „Administravimas“");
await page.click(".accNav .accAdmin");
await page.waitForSelector(".admKpi");
check((await page.locator(".admKpi").count()) === 4, "apžvalga: 4 rodikliai");
check((await page.locator('[data-adm-count="orders"]').textContent()) === "2", "meniu: 2 užsakymai laukia");
check((await page.locator(".admMain").textContent()).includes("Užpildykite įmonės rekvizitus"), "apžvalga: priminimas užpildyti rekvizitus");
check(await page.locator(".admMain .pill.red", { hasText: "išparduota" }).first().isVisible(), "apžvalga: maži likučiai (išparduota)");
await shot(page, "apzvalga");

// Užsakymai
await go(page, "admin/uzsakymai");
check((await page.locator(".admOrders .order").count()) === 2, "užsakymai: „Laukia“ – 2");
const o1 = page.locator('.order[data-order$="c0001"]');
await o1.locator("summary").click();
check((await o1.textContent()).includes("Su gimtadieniu!"), "užsakymas: dovanų rašteliukas matomas");
await o1.locator('[data-oa="packed"]').click();
check(await until(() => sb.db.orders[0].status === "packed"), "„Supakuota“ – būsena duomenų bazėje");
await page.locator('.order[data-order$="c0001"] [data-oa="ship"]').click();
await page.fill('#sheetBody input[name="tracking"]', "CE123456789EE");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.orders[0].status === "shipped"), "„Išsiųsta“ – būsena");
const shipCall = sb.calls.find(c => c.name === "admin" && c.body.action === "ship");
check(shipCall?.body.tracking === "CE123456789EE" && shipCall.user === ADMIN.email, "„Išsiųsta“ – siuntos nr. perduotas serveriui (laiškas pirkėjui)");
check(await toastHas(page, "laiškas"), "pranešimas: pirkėjui išsiųstas laiškas");
await page.waitForTimeout(400);
check((await page.locator(".admOrders .order").count()) === 1, "„Laukia“ – liko 1");
await page.click('[data-of="visi"]');
check((await page.locator(".admOrders .order").count()) === 4, "„Visi“ – 4");
await page.fill("#ordersQ", "ieva");
check((await page.locator(".admOrders .order").count()) === 1, "paieška pagal vardą");
await page.fill("#ordersQ", "");
const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-orders-csv]")]);
const csvText = fs.readFileSync(await dl.path(), "utf8");
check(csvText.startsWith("﻿") && csvText.includes("AB12CD01") && csvText.split("\r\n").length === 5 && csvText.includes(";"), "CSV buhalterijai: 4 užsakymai, Excel formatas");
const o3 = page.locator('.order[data-order$="c0003"]');
await o3.locator("summary").click();
await o3.locator('[data-oa="refund"]').click();
await page.click("[data-confirm-ok]");
check(await until(() => sb.db.orders[2].status === "refunded"), "„Grąžinti pinigus“ – patvirtinus, per serverį");
check(sb.calls.some(c => c.body?.action === "refund"), "grąžinimas – Stripe veiksmas serveryje");
await shot(page, "uzsakymai");

// Kvapai
await go(page, "admin/kvapai");
check((await page.locator(".admTr[data-pid]").count()) === cat.products.length, `kvapai: ${cat.products.length}`);
const juraStock = page.locator('[data-pid="arven"] [data-stock]');
await juraStock.fill("5");
await juraStock.press("Tab");
check(await until(() => sb.db.products.find(p => p.id === "arven").stock === 5), "likutis pakeistas sąraše");
await page.locator(".toast button", { hasText: "Pranešti" }).click({ timeout: 5000 });
check(await until(() => sb.calls.some(c => c.body?.action === "restock-notify" && c.body.product_id === "arven")), "vėl turint – „Pranešti“ laukiantiems");
await page.locator('[data-pid="aurum"] [data-visible]').click();
check(await until(() => sb.db.products.find(p => p.id === "aurum").visible === false), "kvapas paslėptas");
await page.click('[data-pf="paslepti"]');
check((await page.locator(".admTr[data-pid]").count()) === 1, "filtras „Paslėpti“");
await page.click('[data-pf="visi"]');
await page.fill("#prodQ", "tabako");
check((await page.locator(".admTr[data-pid]").count()) >= 1 && (await page.locator('.admTr[data-pid="vanor"]').count()) === 1, "paieška pagal natą");
await page.fill("#prodQ", "");

// Redagavimas
await page.click('.admTr[data-pid="vanor"] .admProd');
await page.waitForSelector("#prodForm");
check((await page.locator('#prodForm input[name="id"]').getAttribute("readonly")) !== null, "esamo kvapo adresas nekeičiamas");
await page.fill('#prodForm input[name="tagline"]', "Ryto gaiva – nauja");
await page.locator("[data-size-price]").nth(1).fill("69,50");
await page.click("[data-size-add]");
await page.locator("[data-size-ml]").last().fill("10");
await page.locator("[data-size-price]").last().fill("19");
await page.locator('.admCheck:has(input[value="vasaros-gaiva"])').click();
await page.locator('.admCheck:has(input[value="vakarui"])').click();
const imgs0 = sb.db.products.find(x => x.id === "vanor").images.length;
await page.setInputFiles("[data-img-input]", path.join(root, "src/public/icons/icon-512.png"));
check(await until(async () => (await page.locator(".admImg").count()) === imgs0 + 1), "nuotrauka pridėta prie esamų");
check(sb.uploads.length === 1 && /image\/(webp|jpeg)/.test(sb.uploads[0].type), "nuotrauka sumažinta ir įkelta (WebP)");
await page.click("#prodForm button[type=submit]");
check(
  await until(() => {
    const p = sb.db.products.find(x => x.id === "vanor");
    return p.tagline === "Ryto gaiva – nauja" && p.images.length === imgs0 + 1;
  }),
  "kvapas išsaugotas"
);
const vanor = sb.db.products.find(x => x.id === "vanor");
check(JSON.stringify(vanor.sizes) === JSON.stringify([{ ml: 10, price: 19 }, { ml: 30, price: 29.9 }, { ml: 50, price: 69.5 }, { ml: 100, price: 59.9 }]), "tūriai: pridėtas 10 ml, kaina su kableliu, surikiuota");
const rasaCats = () => sb.db.product_categories.filter(l => l.product_id === "vanor").map(l => l.category_id);
check(await until(() => rasaCats().sort().join() === "vasaros-gaiva,ziemos-kolekcija"), "kategorijos atnaujintos");
check(await toastHas(page, "Atnaujinti svetainę"), "po išsaugojimo – pasiūlymas atnaujinti svetainę");
// Neišsaugoti pakeitimai
await page.fill('#prodForm input[name="tagline"]', "neišsaugota");
await page.click('.admNav a[href="admin"]');
await page.waitForTimeout(300);
check(page.url().endsWith("/admin/kvapai/vanor"), "neišsaugoti pakeitimai – perspėjama prieš išeinant");
// Naujas kvapas
await page.goto(`${BASE}admin/kvapai/naujas`);
await page.waitForSelector("#prodForm");
await page.click("#prodForm button[type=submit]");
check((await page.locator("#prodForm .formErr").textContent()).includes("pavadinimą"), "naujas kvapas: tuščia forma – klaidos");
await page.fill('#prodForm input[name="name"]', "Šilko rytas");
check((await page.inputValue('#prodForm input[name="id"]')) === "silko-rytas", "adresas sudaromas iš pavadinimo");
await page.fill('#prodForm input[name="top"]', "Bergamotė");
await page.fill('#prodForm input[name="heart"]', "Šilkmedis, Irisas");
await page.fill('#prodForm input[name="base"]', "Muskusas");
await page.locator("[data-size-price]").nth(0).fill("49");
await page.locator("[data-size-price]").nth(1).fill("69");
await page.selectOption('#prodForm select[name="family"]', "geliu");
await page.click("#prodForm button[type=submit]");
await page.waitForURL(/\/admin\/kvapai\/silko-rytas$/);
const nw = sb.db.products.find(p => p.id === "silko-rytas");
check(!!nw && nw.family === "geliu" && nw.notes.heart.length === 2 && nw.visible === true, "naujas kvapas sukurtas");
await shot(page, "kvapas");
// Parduotuvėje – iškart (be perrinkimo): 404.html + šviežias katalogas
const shop = await newPage({ width: 1440, height: 900 });
await shop.goto(`${BASE}kvepalai/silko-rytas`);
await shop.waitForFunction(() => document.title.includes("Šilko rytas"), null, { timeout: 6000 }).catch(() => {});
check((await shop.title()).includes("Šilko rytas"), "naujas kvapas iškart matomas parduotuvėje");
await shop.goto(`${BASE}kvepalai/aurum`);
await shop.waitForTimeout(800);
check((await shop.locator('.view.active[data-view="404"]').count()) === 1, "paslėptas kvapas pirkėjui nerodomas");
await shop.context().close();
// Ištrinti
await page.click("[data-prod-delete]");
await page.click("[data-confirm-ok]");
await page.waitForURL(/\/admin\/kvapai$/);
check(!sb.db.products.some(p => p.id === "silko-rytas"), "kvapas ištrintas (patvirtinus)");

// Kategorijos
await go(page, "admin/kategorijos");
await page.click('[data-taxo-new="categories"]');
await page.fill('#sheetBody input[name="name"]', "Pavasario kolekcija");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.categories.some(c => c.id === "pavasario-kolekcija")), "nauja kategorija");
await page.waitForTimeout(500);
await page.click('[data-taxo-edit="families"][data-id="geliu"]');
await page.fill('#sheetBody input[name="text"]', "Rožė, bijūnas, alyvos");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.families.find(f => f.id === "geliu").hint === "Rožė, bijūnas, alyvos"), "šeimos užuomina pakeista");
await page.waitForTimeout(500);
await page.click('[data-taxo-edit="families"][data-id="geliu"]');
await page.click("[data-taxo-del]");
check(await toastHas(page, "pirma pakeiskite"), "šeimos su kvapais ištrinti neleidžiama");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Atsiliepimai
await go(page, "admin/atsiliepimai");
check((await page.locator(".admReview").count()) === 1, "atsiliepimai: 1 laukia");
await page.click('[data-ra="approved"]');
check(await until(() => sb.db.reviews[0].status === "approved"), "atsiliepimas paskelbtas");
check(await until(async () => await page.locator('[data-adm-count="reviews"]').isHidden()), "skaitiklis atnaujintas");

// Laukiantys
await go(page, "admin/laukia");
check((await page.locator('.admRestock[data-pid="arven"] .pill.green').count()) === 1, "laukiantys: Jūrai – visiems pranešta");
check(await page.locator('.admRestock[data-pid="noirelle"] [data-notify]').isDisabled(), "išparduotam kvapui pranešti negalima");

// Nustatymai
await go(page, "admin/nustatymai");
await page.fill('#setForm input[name="freeShippingFrom"]', "70");
await page.fill('#setForm input[name="coName"]', "UAB „Vaidore“");
await page.fill('#setForm input[name="coEmail"]', "blogas");
await page.click("#setForm button[type=submit]");
check((await page.locator("#setForm .formErr").textContent()).includes("el. paštą"), "nustatymai: tikrinamas el. paštas");
await page.fill('#setForm input[name="coEmail"]', "info@vaidore.com");
await page.click("#setForm button[type=submit]");
check(await until(() => sb.db.settings[0].data.freeShippingFrom === 70), "nustatymai išsaugoti");
const sd = sb.db.settings[0].data;
check(sd.company.name === "UAB „Vaidore“" && sd.company.code === "[Įmonės kodas]" && sd.discovery.id === cat.settings.discovery.id && sd.domain === cat.settings.domain, "neliesti laukai nepakeisti");
await shot(page, "nustatymai");

// Žurnalas, atnaujinimas
await go(page, "admin/zurnalas");
check((await page.locator(".admLog .row").count()) >= 5 && (await page.locator(".admLog").textContent()).includes("Kvapas"), "žurnalas: pakeitimai matomi");
await page.click("[data-adm-rebuild]");
check(await toastHas(page, "GitHub Pages"), "„Atnaujinti svetainę“ – paleista");
await page.context().close();

// Teisės
const buyer = await newPage({ width: 1440, height: 900 }, BUYER.token);
await buyer.goto(`${BASE}admin`);
await buyer.waitForSelector("#adminRoot h1");
check((await buyer.locator("#adminRoot h1").textContent()) === "Neturite teisių", "pirkėjui – „Neturite teisių“");
check(!sb.calls.some(c => c.name === "admin" && c.user === BUYER.email), "pirkėjas serverio veiksmų nekvietė");
await buyer.context().close();
const guest = await newPage({ width: 1440, height: 900 });
await guest.goto(`${BASE}admin/uzsakymai`);
await guest.waitForSelector("#adminRoot .empty");
check((await guest.locator("#adminRoot").textContent()).includes("Prisijunkite"), "neprisijungusiam – prisijungti");
await guest.context().close();

// ── Telefonas ───────────────────────────────────────────
console.log("\n— telefonas 430×932 —");
seed();
page = await newPage({ width: 430, height: 932 }, ADMIN.token);
for (const sec of ["admin", "admin/uzsakymai", "admin/kvapai", "admin/kvapai/vanor", "admin/kategorijos", "admin/nustatymai"]) {
  await page.goto(BASE + sec);
  await page.waitForSelector("#admTitle");
  await page.waitForFunction(() => !document.querySelector("#admMain .loadingTxt"));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${sec}: telpa ekrane (be horizontalaus slinkimo)`);
  await shot(page, `tel-${sec.replace(/\//g, "-")}`);
}
check(await page.locator(".admSaveBar button[type=submit]").isVisible(), "telefone – „Išsaugoti“ juosta matoma");
await page.goto(`${BASE}admin/uzsakymai`);
await page.waitForSelector(".admOrders .order");
await page.locator(".admOrders .order summary").first().click();
check(await page.locator('.admOrders [data-oa="ship"]').first().isVisible(), "telefone – užsakymo veiksmai pasiekiami");
await page.context().close();

await browser.close();
server.close();
check(!errors.length, `be JS klaidų${errors.length ? `: ${errors.join(" | ")}` : ""}`);
console.log(failed ? `\n${failed} patikrinimai nepavyko` : "\nAdministravimo testai praėjo");
process.exit(failed ? 1 : 0);
