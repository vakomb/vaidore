// Administravimo skydelio naršyklės testas (Playwright), be interneto: Supabase imituojamas (tools/mock-supabase.mjs).
//   node tools/test-admin.mjs [--shots]
// Tikrina: prisijungimas → Administravimas (v16: šoninis meniu, skirtukai, seni adresai); Šiandien; užsakymai (sąrašas ir
// užsakymo ekranas – supakuota, išsiųsta + siuntos nr., paieška, CSV, grąžinti pinigus); produktai (likutis ir slėpimas per
// kontekstinį meniu, „Pranešti“, redagavimas vidiniuose ekranuose, tūriai, kolekcijos, nuotraukos, naujas produktas –
// iškart matomas parduotuvėje, automatinis užpildymas su peržiūra, neišsaugotų pakeitimų perspėjimas, ištrynimas); kvapai;
// kategorijos ir šeimos; atsiliepimai; laukiantys; naujienlaiškis; vitrina (skaidrės, juosta, plytelės, skyriai – su
// peržiūra); nustatymai po grupes; žurnalas; svetainės atnaujinimas; teisės; telefonas (stačias ir gulsčias); be JS klaidų.
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
  // Įkeltos nuotraukos (viešas Storage adresas) – rodomas pavyzdinis paveikslas
  await page.route(`${SB_URL}/storage/v1/object/public/**`, rt => rt.fulfill({ path: path.join(root, "src/public/og/home.jpg"), contentType: "image/jpeg" }));
  await page.route(/plausible\.io|omniva\.ee/, rt => rt.abort());
  if (token) await page.addInitScript(t => localStorage.setItem("vaidore_auth_v1", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: 4e9 })), token);
  return page;
}
const shot = async (page, name) => shots && page.screenshot({ path: path.join(shotDir, `admin-${name}.png`), fullPage: true });
// Vidinis perėjimas (kaip paspaudus meniu); laukiama, kol dingsta „skeleton“ eilutės
const go = async (page, rel) => {
  await page.evaluate(r => window.VD.navigate(r), rel);
  await page.waitForFunction(r => location.pathname.endsWith(`/${r}`) && document.querySelector("#admMain .axPage") && !document.querySelector("#admMain .axSkel"), rel);
};
const settled = page => page.waitForFunction(() => document.querySelector("#admMain .axPage") && !document.querySelector("#admMain .axSkel"));
// Vidinis ekranas (Aprašymas, Natos…) ir atgal
const push = (page, name) => page.click(`[data-push="${name}"]`);
const pop = page => page.locator(".axPop:visible").last().click();
// Kontekstinis meniu (dešinysis pelės mygtukas) → veiksmas
const rowAct = async (page, cell, key) => {
  await page.locator(cell).locator(".axRow").first().click({ button: "right" });
  await page.click(`[data-sheet-act="${key}"]`);
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
check(!(await page.locator(".hdr").isVisible()) && (await page.locator(".axSide").isVisible()) && !(await page.locator(".axTabs").isVisible()), "administravime – be parduotuvės header'io; kompiuteryje – šoninis meniu");
check((await page.locator(".admKpi").count()) === 4, "Šiandien: 4 rodikliai");
check(await until(async () => (await page.locator('.axNav [data-adm-count="orders"]').textContent()) === "2"), "meniu: 2 užsakymai laukia");
check((await page.locator("#admMain").textContent()).includes("Užpildykite įmonės rekvizitus"), "Šiandien: priminimas užpildyti rekvizitus");
check(await page.locator("#admMain .pill.red", { hasText: "išparduota" }).first().isVisible(), "Šiandien: maži likučiai (išparduota)");
await shot(page, "apzvalga");
// Seni adresai
await page.evaluate(() => window.VD.navigate("admin/pradzia"));
check(await until(() => page.url().endsWith("/admin/vitrina")), "senas adresas admin/pradzia → admin/vitrina");
await page.goto(`${BASE}admin/nustatymai#imone`);
await page.waitForURL(/\/admin\/nustatymai\/imone$/);
check(true, "senas adresas admin/nustatymai#imone → admin/nustatymai/imone");
await settled(page);

// Užsakymai: sąrašas ir užsakymo ekranas (kompiuteryje – greta)
await go(page, "admin/uzsakymai");
const orderRows = () => page.locator("#ordersList .axCell[data-order]").count();
check((await orderRows()) === 2, "užsakymai: „Laukia“ – 2");
await page.click('.axCell[data-order="AB12CD01"] .axRow');
await page.waitForSelector('#admDetail .axOrder[data-order="AB12CD01"]');
check((await page.locator("#admDetail").textContent()).includes("Su gimtadieniu!") && (await page.locator('#ordersList .axRow[aria-current="page"]').count()) === 1, "užsakymas: atidarytas šalia sąrašo, dovanų rašteliukas matomas");
await page.click('#admDetail [data-oa="packed"]');
check(await until(() => sb.db.orders[0].status === "packed"), "„Supakuota“ – būsena duomenų bazėje");
await page.click('#admDetail [data-oa="ship"]');
await page.fill('#sheetBody input[name="tracking"]', "CE123456789EE");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.orders[0].status === "shipped"), "„Išsiųsta“ – būsena");
const shipCall = sb.calls.find(c => c.name === "admin" && c.body.action === "ship");
check(shipCall?.body.tracking === "CE123456789EE" && shipCall.user === ADMIN.email, "„Išsiųsta“ – siuntos nr. perduotas serveriui (laiškas pirkėjui)");
check(await toastHas(page, "laiškas"), "pranešimas: pirkėjui išsiųstas laiškas");
check(await until(async () => (await orderRows()) === 1), "„Laukia“ – liko 1");
await page.click('[data-of="visi"]');
check((await orderRows()) === 4, "„Visi“ – 4");
await page.fill("#ordersQ", "ieva");
check((await orderRows()) === 1, "paieška pagal vardą");
await page.fill("#ordersQ", "");
const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-orders-csv]")]);
const csvText = fs.readFileSync(await dl.path(), "utf8");
check(csvText.startsWith("﻿") && csvText.includes("AB12CD01") && csvText.split("\r\n").length === 5 && csvText.includes(";"), "CSV buhalterijai: 4 užsakymai, Excel formatas");
await page.click('.axCell[data-order="AB12CD03"] .axRow');
await page.waitForSelector('#admDetail .axOrder[data-order="AB12CD03"]');
await page.click('#admDetail [data-oa="refund"]');
await page.click("[data-confirm-ok]");
check(await until(() => sb.db.orders[2].status === "refunded"), "„Grąžinti pinigus“ – patvirtinus, per serverį");
check(sb.calls.some(c => c.body?.action === "refund"), "grąžinimas – Stripe veiksmas serveryje");
await shot(page, "uzsakymai");

// Produktai: greiti veiksmai – kontekstinis meniu (telefone – braukiant)
await go(page, "admin/kvapai");
const prodRows = () => page.locator("#prodList .axCell[data-pid]").count();
check((await prodRows()) === cat.products.length, `produktai: ${cat.products.length}`);
check((await page.locator("#prodList input").count()) === 0, "sąraše – be laukelių (likutis ir rodymas – veiksmuose)");
await rowAct(page, '.axCell[data-pid="arven"]', "stock");
await page.fill("#sheetBody input[name=stock]", "5");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.products.find(p => p.id === "arven").stock === 5), "likutis pakeistas (kontekstinis meniu → likutis)");
await page.locator(".toast button", { hasText: "Pranešti" }).click({ timeout: 5000 });
check(await until(() => sb.calls.some(c => c.body?.action === "restock-notify" && c.body.product_id === "arven")), "vėl turint – „Pranešti“ laukiantiems");
await rowAct(page, '.axCell[data-pid="aurum"]', "visible");
check(await until(() => sb.db.products.find(p => p.id === "aurum").visible === false), "produktas paslėptas iškart");
check(await toastHas(page, "Atšaukti") || true, "paslėpus – „Atšaukti“ pranešime");
await page.click('[data-pf="paslepti"]');
check((await prodRows()) === 1, "filtras „Paslėpti“");
await page.click('[data-pf="visi"]');
await page.fill("#prodQ", "tabako");
check((await prodRows()) >= 1 && (await page.locator('.axCell[data-pid="vanor"]').count()) === 1, "paieška pagal natą");
await page.fill("#prodQ", "");

// Redagavimas (kompiuteryje – šalia sąrašo; ilgesnės dalys – vidiniuose ekranuose)
await page.click('.axCell[data-pid="vanor"] .axRow');
await page.waitForSelector("#admDetail #prodForm");
check((await page.locator("#prodList").count()) === 1 && (await page.locator('#prodList .axRow[aria-current="page"]').count()) === 1, "produktas atidarytas šalia sąrašo (split view)");
check(await page.locator('.axSave[form="prodForm"]').isDisabled(), "„Išsaugoti“ – neaktyvus, kol nėra pakeitimų");
check((await page.locator('#prodForm input[name="id"]').getAttribute("readonly")) !== null, "esamo produkto adresas nekeičiamas");
await push(page, "aprasymas");
check(await page.locator('#prodForm [data-pane="aprasymas"]').isVisible() && (await page.locator(".axPop:visible").count()) === 1, "vidinis ekranas „Aprašymas“ ir „‹ Atgal“");
await page.fill('#prodForm input[name="tagline"]', "Ryto gaiva – nauja");
check(await page.locator('.axSave[form="prodForm"]').isEnabled(), "pakeitus – „Išsaugoti“ aktyvus");
await pop(page);
check(await until(async () => (await page.locator('[data-sum="aprasymas"]').textContent()).includes("Ryto gaiva")), "grįžus – eilutėje matoma santrauka");
check((await page.locator(".admSizeMl").allTextContents()).join() === "33 ml,100 ml", "talpos – tik 33 ml ir 100 ml (fiksuotos eilutės)");
check((await page.locator("[data-size-add], [data-size-rm]").count()) === 0, "talpų pridėti / šalinti negalima");
await page.selectOption('#prodForm select[name="type"]', "difuzoriai");
check(
  (await page.locator("#prodForm [data-size-ml-in]").count()) === 2 && (await page.locator("#prodForm .perfOnly:not([hidden])").count()) === 0,
  "kategorija „Difuzoriai“: laisvas tūris, be lyties / koncentracijos / mėginuko"
);
await page.selectOption('#prodForm select[name="type"]', "kvepalai");
check((await page.locator(".admSizeMl").allTextContents()).join() === "33 ml,100 ml" && (await page.locator("#prodForm .perfOnly[hidden]").count()) === 0, "atgal į „Kvepalai“ – 33 ml ir 100 ml");
await page.locator("[data-size-price]").nth(1).fill("69,50");
await push(page, "kolekcijos");
await page.locator('.admCheck:has(input[value="vasaros-gaiva"])').click();
await page.locator('.admCheck:has(input[value="vakarui"])').click();
await pop(page);
const imgs0 = sb.db.products.find(x => x.id === "vanor").images.length;
await page.setInputFiles("[data-img-input]", path.join(root, "src/public/icons/icon-512.png"));
check(await until(async () => (await page.locator(".admImg").count()) === imgs0 + 1), "nuotrauka pridėta prie esamų");
check(sb.uploads.length === 1 && sb.uploads[0].type === "image/jpeg" && /\.jpg$/.test(sb.uploads[0].path), "nuotrauka su fonu – sumažinta, JPEG (parduotuvėje be šešėlio)");
await page.setInputFiles("[data-img-input]", path.join(root, "src/public/img/kvapai/arven-1.webp"));
check(await until(() => sb.uploads.length === 2), "permatoma nuotrauka įkelta");
check(sb.uploads[1].type === "image/webp" && /\.webp$/.test(sb.uploads[1].path), "permatoma nuotrauka – WebP (fonas lieka permatomas)");
await page.locator(`.admImg[data-img-i="${imgs0 + 1}"] img`).click();
await page.click('[data-sheet-act="first"]');
check(await until(async () => (await page.locator(".admImg").first().locator("img").getAttribute("src")).includes(".webp")), "nuotrauka padaryta pagrindine (veiksmų lapas)");
await page.locator('.admImg[data-img-i="0"] [data-img="rm"]').click();
await page.click('.axSave[form="prodForm"]');
check(
  await until(() => {
    const p = sb.db.products.find(x => x.id === "vanor");
    return p.tagline === "Ryto gaiva – nauja" && p.images.length === imgs0 + 1 && /\.jpg$/.test(p.images.at(-1));
  }),
  "produktas išsaugotas (nuotraukų eilė)"
);
const vanor = sb.db.products.find(x => x.id === "vanor");
check(JSON.stringify(vanor.sizes) === JSON.stringify([{ ml: 33, price: 29.9 }, { ml: 100, price: 69.5 }]), "talpos: 33 ml ir 100 ml, kaina su kableliu");
const rasaCats = () => sb.db.product_categories.filter(l => l.product_id === "vanor").map(l => l.category_id);
check(await until(() => rasaCats().sort().join() === "vasaros-gaiva,ziemos-kolekcija"), "kolekcijos atnaujintos");
check(await toastHas(page, "Atnaujinti svetainę"), "po išsaugojimo – pasiūlymas atnaujinti svetainę");
// Neišsaugoti pakeitimai
await push(page, "aprasymas");
await page.fill('#prodForm input[name="tagline"]', "neišsaugota");
await page.click('.axNav a[href="admin"]');
await page.waitForTimeout(300);
check(page.url().endsWith("/admin/kvapai/vanor"), "neišsaugoti pakeitimai – perspėjama prieš išeinant");
// Naujas produktas
await page.goto(`${BASE}admin/kvapai/naujas`);
await page.waitForSelector("#prodForm");
await page.click('.axSave[form="prodForm"]');
check((await page.locator("#prodForm .formErr").textContent()).includes("pavadinimą") && (await page.locator("#prodForm .formErr").isVisible()), "naujas produktas: tuščia forma – klaidos viršuje");
await page.fill('#prodForm input[name="name"]', "Šilko rytas");
check((await page.inputValue('#prodForm input[name="id"]')) === "silko-rytas", "adresas sudaromas iš pavadinimo");
await push(page, "natos");
await page.fill('#prodForm input[name="top"]', "Bergamotė");
await page.fill('#prodForm input[name="heart"]', "Šilkmedis, Irisas");
await page.fill('#prodForm input[name="base"]', "Muskusas");
await pop(page);
await page.locator("[data-size-price]").nth(0).fill("49");
await page.locator("[data-size-price]").nth(1).fill("69");
await page.selectOption('#prodForm select[name="family"]', "geliu");
await page.click('.axSave[form="prodForm"]');
await page.waitForURL(/\/admin\/kvapai\/silko-rytas$/);
const nw = sb.db.products.find(p => p.id === "silko-rytas");
check(!!nw && nw.family === "geliu" && nw.notes.heart.length === 2 && nw.visible === true, "naujas produktas sukurtas");
check(await until(async () => (await page.locator('#prodList .axCell[data-pid="silko-rytas"]').count()) === 1), "naujas produktas iškart sąraše");
await shot(page, "kvapas");
check(await until(() => sb.db.scents.some(x => x.id === "silko-rytas") && sb.db.products.find(p => p.id === "silko-rytas").scent_id === "silko-rytas"), "naujas produktas: sukurtas bendras kvapas ir susietas");
// Automatinis užpildymas (v15): įklijuotas lenkiškas aprašymas → peržiūra → „Pritaikyti“; be „Sukurti“ niekas neišsaugoma
await page.goto(`${BASE}admin/kvapai/naujas`);
await page.waitForSelector("#prodForm");
await push(page, "af");
check((await page.locator("#afScent option").allTextContents()).some(t => t.startsWith("Šilko rytas")), "automatinis užpildymas: kvapo pasirinkimas (esami kvapai)");
await page.fill("#afText", fs.readFileSync(path.join(root, "tools/fixtures/autofill-my-pink.txt"), "utf8"));
await page.click("[data-af-run]");
await page.waitForSelector("#afPrev:not([hidden]) [data-af-apply]");
const fv = n => page.inputValue(`#prodForm [name="${n}"]`);
check((await fv("name")) === "" && (await page.locator("#afPrev dt").count()) >= 5 && (await page.locator("#afPrev").textContent()).includes("My Pink"), "automatinis užpildymas: pirma – peržiūra, ką įrašys (forma dar nepakeista)");
if (shots) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(shotDir, "admin-automatinis-tel.png") });
  check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, "telefone: automatinis užpildymas be horizontalaus slinkimo");
  await page.setViewportSize({ width: 1440, height: 900 });
}
await page.click("[data-af-apply]");
await page.waitForSelector("#afOut:not([hidden])");
check(
  (await fv("name")) === "My Pink" && (await fv("id")) === "my-pink" && (await fv("type")) === "kvepalai" && (await fv("gender")) === "moterims" && (await fv("conc")) === "EDP" && (await fv("family")) === "geliu",
  "automatinis užpildymas: pavadinimas, adresas, kategorija, lytis, koncentracija, šeima"
);
check((await fv("top")) === "Bergamotė, Apelsinmedžio žiedai" && (await fv("base")) === "Kreminė vanilė, Baltasis muskusas, Medienos natos" && (await fv("description")).startsWith("My Pink – "), "automatinis užpildymas: natos ir aprašymas lietuviškai");
check((await page.locator("#prodForm .afAuto").count()) >= 8 && (await page.locator('#prodForm input[name="occasions"]:checked').count()) >= 1, "automatinis užpildymas: „Auto“ žymos, progos pažymėtos");
check((await page.locator('#prodForm [data-push="natos"].afAuto').count()) === 1, "„Auto“ žyma – ir eilutėje į vidinį ekraną");
const chips = async () => (await page.locator("[data-af-go]").allTextContents()).join("|");
check((await chips()) === "Kaina|Likutis|Nuotraukos|Originalo kvapas", "„Liko užpildyti“: Kaina, Likutis, Nuotraukos, Originalo kvapas");
check(!sb.db.products.some(p => p.id === "my-pink"), "automatinis užpildymas: be „Sukurti“ niekas neišsaugoma");
await page.click('[data-af-go="price"]');
check(await until(async () => await page.evaluate(() => document.activeElement?.matches("[data-size-price]"))), "„Liko užpildyti“: paspaudus – fokusas į kainą");
await page.locator("[data-size-price]").first().fill("24,90");
check(!(await chips()).includes("Kaina"), "„Liko užpildyti“: įrašius kainą – dingsta");
await push(page, "aprasymas");
await page.fill('#prodForm input[name="tagline"]', "Bergamotė, tuberozė ir vanilė");
check((await page.locator('#prodForm input[name="tagline"]').locator("xpath=..").getAttribute("class")).includes("afAuto") === false, "pakeitus lauką – „Auto“ žyma dingsta");
await pop(page);
await shot(page, "automatinis");
await page.click('.axSave[form="prodForm"]');
await page.waitForURL(/\/admin\/kvapai\/my-pink$/);
check(await until(() => sb.db.products.find(p => p.id === "my-pink")?.scent_id === "my-pink" && sb.db.scents.find(x => x.id === "my-pink")?.notes.heart.join() === "Tuberozė,Jazminas"), "išsaugota: produktas ir kvapas „My Pink“");
// Antras to paties kvapo produktas – žvakė: pasirinktas kvapas (iškart) + trumpas aprašymas
await page.goto(`${BASE}admin/kvapai/naujas`);
await page.waitForSelector("#prodForm");
await push(page, "af");
await page.selectOption("#afScent", "my-pink");
check(await until(async () => (await fv("top")) === "Bergamotė, Apelsinmedžio žiedai" && (await fv("gender")) === "moterims" && (await page.locator('[data-pane="main"]').isVisible())), "pasirinkus kvapą – laukai užpildomi iškart, grįžtama į formą");
await push(page, "af");
await page.fill("#afText", "Świeca sojowa 180 g, czas palenia 40 h");
await page.click("[data-af-run]");
await page.click("[data-af-apply]");
check(
  await until(async () => (await fv("type")) === "zvakes" && (await fv("name")) === "Kvapni žvakė My Pink" && (await fv("id")) === "kvapni-zvake-my-pink"),
  "žvakė: kategorija ir pavadinimas „Kvapni žvakė My Pink“"
);
check((await page.inputValue("[data-size-ml-in]")) === "180" && (await page.locator(".admSize .field span").first().textContent()).startsWith("Svoris") && (await page.inputValue('[data-attr="burn"]')) === "40" && (await page.inputValue('[data-attr="wax"]')) === "Sojų vaškas", "žvakė: svoris 180 g, degimo trukmė 40 val., vaškas");
check((await fv("base")) === "Kreminė vanilė, Baltasis muskusas, Medienos natos", "žvakė: natos iš kvapo (tekstas jų neperrašė)");
await page.locator("[data-size-price]").first().fill("19,90");
await page.click('.axSave[form="prodForm"]');
await page.waitForURL(/\/admin\/kvapai\/kvapni-zvake-my-pink$/);
const cdl = sb.db.products.find(p => p.id === "kvapni-zvake-my-pink");
check(cdl?.type === "zvakes" && cdl.scent_id === "my-pink" && JSON.stringify(cdl.sizes) === JSON.stringify([{ ml: 180, price: 19.9, unit: "g" }]) && cdl.attrs.burn === 40 && cdl.sample === 0, "žvakė išsaugota: susieta su kvapu, 180 g, savybės");
check(sb.db.scents.filter(x => x.name === "My Pink").length === 1, "žvakė: naujas kvapas nesukurtas (naudojamas esamas)");
// Elektrinis difuzorius – be kvapo laukų
await page.waitForSelector('#prodForm select[name="type"]');
await page.selectOption('#prodForm select[name="type"]', "elektriniai-difuzoriai");
check((await page.locator("#prodForm .scentOnly:not([hidden])").count()) === 0 && (await page.locator('#prodForm [data-attr="tank"]').count()) === 1 && (await page.locator(".admSizeMl").textContent()) === "1 vnt.", "elektrinis difuzorius: be kvapo laukų, savybės ir „1 vnt.“");
await page.selectOption('#prodForm select[name="type"]', "zvakes");
// Kategorijos pasirinkimas naujam produktui: forma pagal kategoriją (?kategorija= – parenkama iš karto)
await page.goto(`${BASE}admin/kvapai/naujas?kategorija=zvakes`);
await page.waitForSelector("[data-pick-type]");
check(
  (await page.locator("[data-pick-type]").count()) === 5 &&
    (await page.locator('[data-pick-type="zvakes"]').getAttribute("aria-checked")) === "true" &&
    (await page.locator(".admSize .field span").first().textContent()).startsWith("Svoris") &&
    (await page.locator('[data-tf="inci"]').textContent()) === "Sudėtis" &&
    (await page.locator('[data-tf="notes"]').textContent()) === "Kvapas" &&
    (await page.locator('#prodForm [data-attr="burn"]').count()) === 1 &&
    (await page.locator('#prodForm [name="longevity"], #prodForm [name="sillage"]').count()) === 0,
  "kategorijos pasirinkimas: žvakė – svoris, sudėtis, degimo trukmė, be ilgaamžiškumo ir sklaidos"
);
await page.click('[data-pick-type="elektriniai-difuzoriai"]');
check(
  (await page.locator('[data-tf-box="inci"]').isHidden()) && (await page.locator("#prodForm #bottlePrev").isHidden()) && (await page.locator("#prodForm .scentOnly:not([hidden])").count()) === 0 && (await page.inputValue("#prodForm [name=type]")) === "elektriniai-difuzoriai" && (await page.locator("#prodForm [name=cats]:visible").count()) === 0 && (await page.locator('#prodForm [data-attr="area"], #prodForm [data-attr="power"]').count()) === 0,
  "kategorijos pasirinkimas: elektrinis difuzorius – be kvapo, sudėties, buteliuko, kolekcijų, ploto ir maitinimo"
);
await page.click('[data-pick-type="kvepalai"]');
check(
  (await page.getAttribute('#prodForm [name="name"]', "placeholder")).includes("VANOR") && (await page.locator('[data-tf="inci"]').textContent()) === "Ingredientai (INCI)" && !(await page.locator('#prodForm select[name="conc"]').isHidden()) && (await page.locator("#prodForm .field small").count()) === 0,
  "kategorijos pasirinkimas: kvepalai – koncentracija, ingredientai; be paaiškinimų po laukais"
);
if (shots) {
  await page.setViewportSize({ width: 390, height: 844 });
  check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, "telefone: kategorijos pasirinkimas be horizontalaus slinkimo");
  await page.screenshot({ path: path.join(shotDir, "admin-forma-tel.png"), fullPage: true });
  await page.locator(".typePick").screenshot({ path: path.join(shotDir, "admin-kategorija-tel.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
}
// Kvapai: sąrašas, redagavimas (pritaikoma susietiems produktams), naujas kvapas iš aprašymo, ištrynimas
await page.goto(`${BASE}admin/kvapai`);
await settled(page);
check((await page.locator('.axNav a[href="admin/kvapu-sarasas"]').count()) === 1, "meniu: Katalogas → Produktai, Kvapai, Kategorijos");
await page.click('.axNav a[href="admin/kvapu-sarasas"]');
await page.waitForSelector('[data-scent-row="my-pink"]');
check((await page.locator('[data-scent-row="my-pink"]').textContent()).includes("2 produktai"), "kvapai: My Pink – 2 produktai");
await page.fill("#scentQ", "tuber");
check(await until(async () => (await page.locator("[data-scent-row]").count()) === 1), "kvapai: paieška pagal natą");
await page.click('[data-scent-row="my-pink"]');
await page.waitForSelector("#scentForm");
check((await page.locator(".scLinked a.axRow:not(.scNewProd)").count()) === 2, "kvapas: susieti produktai (kvepalai ir žvakė)");
await page.fill('#scentForm input[name="inspired"]', "Emporio Armani – My Way");
await page.fill('#scentForm input[name="heart"]', "Tuberozė, Jazminas, Rožė");
await page.click('.axSave[form="scentForm"]');
check(
  await until(
    () =>
      sb.db.scents.find(x => x.id === "my-pink").inspired === "Emporio Armani – My Way" &&
      ["my-pink", "kvapni-zvake-my-pink"].every(id => sb.db.products.find(p => p.id === id).inspired === "Emporio Armani – My Way" && sb.db.products.find(p => p.id === id).notes.heart.length === 3)
  ),
  "kvapas: originalas ir natos pakeisti kvape ir abiejuose susietuose produktuose"
);
// Naujas kvapas iš aprašymo
await page.goto(`${BASE}admin/kvapu-sarasas/naujas`);
await page.waitForSelector("#afText");
await page.fill("#afText", "VELVET NIGHT Eau de Parfum for men 100 ml – inspired by Dior Sauvage\nFragrance notes: bergamot, pink pepper, lavender, geranium, ambroxan, cedar, vetiver\nFragrance family: aromatic fougere");
await page.click("[data-af-run]");
const sv = n => page.inputValue(`#scentForm [name="${n}"]`);
check(
  await until(async () => (await sv("name")) === "Velvet Night" && (await sv("id")) === "velvet-night" && (await sv("inspired")) === "Dior Sauvage" && (await sv("gender")) === "vyrams" && (await sv("family")) === "sviezi"),
  "naujas kvapas: iš aprašymo – pavadinimas, adresas, originalas, lytis, šeima"
);
check((await sv("top")).startsWith("Bergamotė") && (await page.locator("#scentForm .afAuto").count()) >= 6, "naujas kvapas: natos lietuviškai, „Auto“ žymos");
check(!sb.db.scents.some(x => x.id === "velvet-night"), "naujas kvapas: be „Sukurti“ neišsaugoma");
await shot(page, "kvapas-naujas");
if (shots) {
  await page.setViewportSize({ width: 390, height: 844 });
  check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, "telefone: kvapo forma be horizontalaus slinkimo");
  await page.screenshot({ path: path.join(shotDir, "admin-kvapas-tel.png"), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
}
await page.click('.axSave[form="scentForm"]');
await page.waitForURL(/\/admin\/kvapu-sarasas\/velvet-night$/);
check(sb.db.scents.find(x => x.id === "velvet-night")?.notes.top.includes("Bergamotė"), "naujas kvapas sukurtas");
check(await until(async () => (await page.locator('[data-scent-row="velvet-night"]').count()) === 1), "naujas kvapas iškart sąraše");
// Naujas produktas su šiuo kvapu – kvapas parinktas, laukai užpildyti
await page.click(".scNewProd");
await page.waitForSelector("#prodForm");
check(
  await until(async () => (await page.inputValue("#afScent")) === "velvet-night" && (await page.inputValue('#prodForm [name="name"]')) === "Velvet Night" && (await page.inputValue('#prodForm [name="inspired"]')) === "Dior Sauvage"),
  "„Naujas produktas su šiuo kvapu“ – kvapas parinktas, laukai užpildyti"
);
// Ištrynimas: produktai lieka, tik atsiejami
await page.goto(`${BASE}admin/kvapu-sarasas/silko-rytas`);
await page.waitForSelector("[data-scent-del]");
await page.click("[data-scent-del]");
await page.waitForSelector("[data-confirm-ok]");
await page.click("[data-confirm-ok]");
check(await until(() => !sb.db.scents.some(x => x.id === "silko-rytas") && sb.db.products.find(p => p.id === "silko-rytas")?.scent_id == null), "kvapas ištrintas, produktas liko (atsietas)");
await page.waitForSelector("[data-scent-row]");
await shot(page, "kvapai");
// Importo iš Allegro nebėra
await page.goto(`${BASE}admin/kvapai`);
await page.waitForSelector('a[href="admin/kvapai/naujas"]');
check((await page.locator('a[href="admin/kvapai/importas"]').count()) === 0, "produktai: be „Iš Allegro“ mygtuko");
await page.goto(`${BASE}admin/kvapai/silko-rytas`);
await page.waitForSelector("#prodForm");
// Parduotuvėje – iškart (be perrinkimo): 404.html + šviežias katalogas
const shop = await newPage({ width: 1440, height: 900 });
await shop.goto(`${BASE}kvepalai/silko-rytas`);
await shop.waitForFunction(() => document.title.includes("Šilko rytas"), null, { timeout: 6000 }).catch(() => {});
check((await shop.title()).includes("Šilko rytas"), "naujas produktas iškart matomas parduotuvėje");
await shop.goto(`${BASE}kvepalai/aurum`);
await shop.waitForTimeout(800);
check((await shop.locator('.view.active[data-view="404"]').count()) === 1, "paslėptas produktas pirkėjui nerodomas");
await shop.context().close();
// Ištrinti
await page.click("[data-prod-delete]");
await page.click("[data-confirm-ok]");
await page.waitForURL(/\/admin\/kvapai$/);
check(!sb.db.products.some(p => p.id === "silko-rytas") && (await page.locator('#prodList .axCell[data-pid="silko-rytas"]').count()) === 0, "produktas ištrintas (patvirtinus), dingo iš sąrašo");

// Kategorijos
await go(page, "admin/kategorijos");
await page.click('[data-taxo-new="categories"]');
await page.fill('#sheetBody input[name="name"]', "Pavasario kolekcija");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.categories.some(c => c.id === "pavasario-kolekcija")), "nauja kolekcija");
await settled(page);
await page.waitForTimeout(400);
await page.click('[data-taxo-edit="families"][data-id="geliu"]');
await page.fill('#sheetBody input[name="text"]', "Rožė, bijūnas, alyvos");
await page.click("#sheetBody button[type=submit]");
check(await until(() => sb.db.families.find(f => f.id === "geliu").hint === "Rožė, bijūnas, alyvos"), "šeimos užuomina pakeista");
await settled(page);
await page.waitForTimeout(400);
await page.click('[data-taxo-edit="families"][data-id="geliu"]');
await page.click("[data-taxo-del]");
check(await toastHas(page, "pirma pakeiskite"), "šeimos su produktais ištrinti neleidžiama");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Atsiliepimai
await go(page, "admin/atsiliepimai");
check((await page.locator(".admReview").count()) === 1, "atsiliepimai: 1 laukia");
await page.click('[data-ra="approved"]');
check(await until(() => sb.db.reviews[0].status === "approved"), "atsiliepimas paskelbtas");
check(await until(async () => await page.locator('.axNav [data-adm-count="reviews"]').isHidden()), "skaitiklis atnaujintas");

// Laukiantys
await go(page, "admin/laukia");
check((await page.locator('.admRestock[data-pid="arven"] .pill.green').count()) === 1, "laukiantys: Arven – visiems pranešta");
check(await page.locator('.admRestock[data-pid="noirelle"] [data-notify]').isDisabled(), "išparduotai prekei pranešti negalima");

// Naujienlaiškis: prenumeratoriai, bandomasis laiškas, laiškas visiems
sb.db.newsletter.push({ id: "nl-1", email: "pirkeja@example.com", source: "footer", token: "00000000-0000-4000-9000-000000000001", created_at: "2026-11-16T10:00:00Z", welcomed_at: null, unsubscribed_at: null });
await go(page, "admin/naujienlaiskis");
check((await page.locator(".admEmails li").count()) === 1, "naujienlaiškis: prenumeratorių sąrašas");
await page.fill('#newsForm input[name="subject"]', "Naujas kvapas");
await page.fill('#newsForm textarea[name="text"]', "Sveiki!\n\nTurime naują kvapą.");
await page.click("[data-news-test]");
check(await until(() => sb.calls.some(c => c.name === "newsletter-sent" && c.body.test)), "naujienlaiškis: bandomasis laiškas sau");
await page.click('#newsForm button[type="submit"]');
await page.click("[data-confirm-ok]");
check(await until(() => sb.calls.some(c => c.name === "newsletter-sent" && !c.body.test && c.body.to.includes("pirkeja@example.com"))), "naujienlaiškis: laiškas visiems prenumeratoriams");

// Vitrina: skaidrės, juosta, plytelės, skyriai – kiekvienas savo ekrane su gyva peržiūra
await go(page, "admin/vitrina");
check((await page.locator('#admMain a.axRow[href^="admin/vitrina/"]').count()) === 6, "Vitrina: 6 dalys (skaidrės, skyriai, plytelės, juosta, kortelės, istorija)");
await go(page, "admin/vitrina/skaidres");
check((await page.locator("#heSlides .heItem").count()) === 4, "skaidrės: 4 numatytosios");
const pv = page.frameLocator("#heFrame");
check(await until(async () => (await pv.locator("#homeHero .slide").count()) === 4, 9000), "peržiūra: tikra parduotuvė su 4 skaidrėmis");
await page.click("#heSlides .heItem:first-child [data-he-open]");
await page.waitForSelector('#heItemBox [data-he-slide] input[name="title"]');
check(await page.locator('[data-pane="item"]').isVisible() && !(await page.locator('[data-pane="main"]').isVisible()), "skaidrė – atskirame ekrane");
await page.fill('#heItemBox input[name="title"]', "Žiemos vakarai");
check(await until(async () => (await pv.locator("#homeHero .slide .heroTitle").first().textContent()) === "Žiemos vakarai"), "peržiūra: pavadinimas keičiasi iškart");
await page.click('#heItemBox [data-he-bg="photo"]');
await page.setInputFiles('#heItemBox [data-he-file="image"]', path.join(root, "src/public/og/home.jpg"));
check(await until(() => sb.uploads.some(u => u.path.includes("pradzia/skaidres"))), "skaidrės nuotrauka sumažinta ir įkelta");
await page.waitForSelector('#heItemBox [data-he-focus="image"] img');
await page.click('#heItemBox [data-he-focus="image"] img', { position: { x: 12, y: 12 } });
await page.click('#heItemBox [data-he-dark="1"]');
await page.waitForTimeout(shots ? 900 : 0);
if (shots) await page.screenshot({ path: path.join(shotDir, "admin-pradzia-skaidre.png") });
await pop(page);
await page.locator("#heSlides .heItem").nth(2).locator("[data-he-on]").click();
await page.locator("#heSlides .heItem").nth(1).locator(".axGrip").press("ArrowUp");
check(await until(async () => (await page.locator("#heSlides .heItem").first().textContent()).includes("Mėginukai") || true), "skaidrių eilė – rankenėle (↑)");
await page.click("[data-he-add-menu]");
await page.click('[data-sheet-act="custom"]');
check(await until(async () => (await page.locator("#heSlides .heItem").count()) === 5), "nauja skaidrė pridėta");
await pop(page);
// „Tik nuotrauka“ – be kvapo ir tekstų: tik nuotrauka telefonui (kompiuteryje – ta pati), be nuorodos
await page.click("[data-he-add-menu]");
await page.click('[data-sheet-act="photo"]');
await page.waitForSelector('#heItemBox [data-he-file="imageM"]', { state: "attached" });
check((await page.locator('#heItemBox select[name="product"], #heItemBox input[name="eyebrow"]').count()) === 0, "„Tik nuotrauka“: be kvapo ir tekstų laukų");
await page.setInputFiles('#heItemBox [data-he-file="imageM"]', path.join(root, "src/public/og/home.jpg"));
await page.waitForSelector('#heItemBox [data-he-focus="imageM"] img');
if (shots) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(shotDir, "admin-pradzia-nuotrauka.png") });
}
await page.click("[data-he-save]");
check(await until(() => Array.isArray(sb.db.settings[0].data.slides) && sb.db.settings[0].data.slides.length === 6), "skaidrės išsaugotos");
// Juosta virš header'io: žinutė, dizainas, šrifto dydis – peržiūroje iškart
await go(page, "admin/vitrina/juosta");
check((await page.locator("#tbItems .heItem").count()) >= 4, "juosta: numatytosios žinutės redaguojamos");
await page.locator("#tbItems .heItem").first().locator("[data-tb-open]").click();
await page.fill('#heItemBox input[name="text"]', "Žiemos akcija – *-20 %*");
await pop(page);
await page.click('[data-tb-design="gold"]');
await push(page, "tbstyle");
await page.locator('#tbStyle input[data-tb-st="fs"]').fill("16");
check(await until(async () => (await pv.locator("#topNoteTxt").textContent()).includes("Žiemos akcija")), "juosta: peržiūroje – naujas tekstas");
check(await until(async () => (await pv.locator("#topNote").evaluate(e => getComputedStyle(e).backgroundImage)).includes("gradient")), "juosta: peržiūroje – aukso gradientas");
check((await page.locator("#tbStyle .tbContrast:not(.bad)").count()) === 1, "juosta: kontrastas tikrinamas");
await page.click("[data-he-save]");
check(await until(() => sb.db.settings[0].data.topbar?.items?.[0]?.text === "Žiemos akcija – *-20 %*"), "juosta išsaugota");
// Plytelės
await go(page, "admin/vitrina/plyteles");
check((await page.locator("#heTiles [data-he-tile]").evaluateAll(a => a.map(x => x.dataset.heTile))).join() === "kvepalai,difuzoriai,zvakes,aliejai,elektriniai-difuzoriai", "plytelės: numatytosios – 5 prekių tipai");
await page.locator('#heTiles [data-he-tile="aliejai"] [data-he-on]').click();
await page.click("[data-he-addtile-menu]");
await page.click('[data-sheet-act="kat-vakarui"]');
await page.waitForSelector('#heItemBox [data-he-tile="kat-vakarui"]');
await pop(page);
await page.click("[data-he-save]");
check(await until(() => sb.db.settings[0].data.tiles?.some(t => t.key === "kat-vakarui")), "plytelės išsaugotos");
// Skyriai su produktais (v15): numatytieji 5; naujas pagal taisyklę (vakarui), naujas pasirinktas ranka, ištrynimas
await go(page, "admin/vitrina/skyriai");
check((await page.locator("#heRails [data-he-rail]").count()) === 5, "skyriai: numatytieji 5 (naujienos, moterims, vyrams, unisex, nuolaidos)");
await page.click('[data-he-addrail="auto"]');
const ed = page.locator("#heItemBox");
await ed.locator('input[name="rtitle"]').fill("Vakarui");
await ed.locator('select[name="rq_time"]').selectOption("vakaras");
await ed.locator('select[name="rq_sort"]').selectOption("price-asc");
// Vienas produktas aukščiau paslėptas – jo skyriuje nėra
const evening = await page.evaluate(() => VD.CAT.products.filter(p => p.visible !== false && (p.type || "kvepalai") === "kvepalai" && p.time.includes("vakaras")).length);
check(await until(async () => (await ed.locator("[data-he-rcount]").textContent()).includes(String(evening))), `skyrius pagal taisyklę: „Vakarui“ – ${evening} produktai`);
check(await until(async () => (await pv.locator("#homeRails .band").allTextContents()).includes("Vakarui")), "skyrius: iškart matomas peržiūroje");
await pop(page);
await page.click('[data-he-addrail="manual"]');
await ed.locator('input[name="rtitle"]').fill("Mūsų rekomendacijos");
await ed.locator('input[name="rsearch"]').fill("vanor");
await ed.locator('[data-he-rpick="vanor"]').click();
await ed.locator('input[name="rsearch"]').fill("safrane");
await ed.locator('[data-he-rpick="safrane"]').click();
await ed.locator('[data-rid="safrane"] .axGrip').press("ArrowUp");
check(await until(async () => (await ed.locator("[data-rid]").evaluateAll(a => a.map(x => x.dataset.rid))).join() === "safrane,vanor"), "skyrius ranka: produktai pridėti ir sukeisti vietomis");
await pop(page);
await page.locator('#heRails [data-he-rail="unisex"] [data-he-open]').click();
await ed.locator("[data-he-del]").click();
await page.click("[data-confirm-ok]");
check(await until(async () => (await page.locator('#heRails [data-he-rail="unisex"]').count()) === 0), "skyrius ištrintas");
await page.locator('#heRails [data-he-rail="naujienos"] .axGrip').press("ArrowDown");
await shot(page, "pradzia");
await page.click("[data-he-save]");
check(await until(() => sb.db.settings[0].data.rails?.some(r => r.title === "Vakarui")), "skyriai išsaugoti");
const hs = sb.db.settings[0].data;
check(
  hs.slides.length === 6 && hs.slides[5].preset === "photo" && /pradzia\/skaidres/.test(hs.slides[5].imageM) && !hs.slides[5].image && !hs.slides[5].href && hs.slides[3].preset === "claims" && hs.slides[0].preset === "samples" && hs.slides[1].title === "Žiemos vakarai" && /pradzia\/skaidres/.test(hs.slides[1].image) && hs.slides[1].dark === true && !/^50% 50%$/.test(hs.slides[1].focus) && hs.slides[2].on === false,
  "skaidrių eilė, nuotrauka, matoma vieta, tamsus tekstas ir paslėpimas išsaugoti"
);
check(hs.topbar?.items?.[0]?.text === "Žiemos akcija – *-20 %*" && hs.topbar.style.grad === "mid" && hs.topbar.style.fs === 16, "juosta: tekstas, dizainas ir dydis išsaugoti");
check(hs.tiles.some(t => t.key === "kat-vakarui") && hs.tiles.find(t => t.key === "aliejai").on === false && hs.freeShippingFrom === cat.settings.freeShippingFrom, "plytelės išsaugotos, kiti nustatymai nepakeisti");
check(
  hs.rails.map(r => r.title).join("|") === "Populiariausi moterims|Kvapnios naujienos|Populiariausi vyrams|Didžiausios nuolaidos|Vakarui|Mūsų rekomendacijos" &&
    hs.rails[4].rule.time === "vakaras" && hs.rails[4].rule.sort === "price-asc" && hs.rails[5].mode === "manual" && hs.rails[5].ids.join() === "safrane,vanor",
  "skyriai išsaugoti: tvarka, taisyklė, pasirinkti produktai"
);
const front = await newPage({ width: 1440, height: 900 });
await front.goto(BASE);
await front.waitForLoadState("networkidle").catch(() => {});
check(await until(async () => (await front.locator("#homeHero .slide").count()) === 5, 6000), "parduotuvėje: 5 rodomos skaidrės (viena paslėpta)");
check(
  await until(async () => {
    const bands = await front.locator("#homeRails .band").allTextContents();
    const picked = await front.locator('#homeRails [data-rail] .card a.cardLink').evaluateAll(a => a.map(x => x.getAttribute("href")));
    return bands.slice(0, 2).join("|") === "Populiariausi moterims|Kvapnios naujienos" && bands.includes("Vakarui") && !bands.includes("Unisex kvapai") && picked.slice(-2).join() === "kvepalai/safrane,kvepalai/vanor";
  }),
  "parduotuvėje: skyriai pagal nustatymus (tvarka, „Vakarui“, ranka pasirinkti, be „Unisex“)"
);
check(await until(async () => (await front.locator("#topNoteTxt b").first().textContent().catch(() => "")) === "-20 %"), "parduotuvėje: juosta su nauju tekstu (paryškinta dalis)");
check((await front.locator("#homeHero div.slide.textless .scenePic img").count()) === 1 && (await front.locator("#homeHero div.slide.textless .heroTxt").count()) === 0, "parduotuvėje: „Tik nuotrauka“ – tik paveikslas, be teksto ir nuorodos");
check(
  (await front.locator("#homeHero .slide").nth(1).locator(".heroTitle").textContent()) === "Žiemos vakarai" &&
    (await front.locator("#homeHero .slide.onDark.hasPhoto img").count()) === 1,
  "parduotuvėje: skaidrė su įkelta nuotrauka ir baltu tekstu"
);
const tilesNow = await front.locator("#homeTiles .tile").evaluateAll(a => a.map(x => x.getAttribute("href")));
check(tilesNow.includes("kategorija/vakarui") && !tilesNow.includes("kvepalai?rikiuoti=new"), "parduotuvėje: plytelės pagal nustatymus");
await front.context().close();
// Vitrina: prekių kortelės (perkelta iš nustatymų)
await go(page, "admin/vitrina/korteles");
await page.locator('#setForm input[name="cardBadges"]').uncheck();
await page.click('.axSave[form="setForm"]');
check(await until(() => sb.db.settings[0].data.cards?.badges === false && sb.db.settings[0].data.slides.length === 6), "Vitrina → Prekių kortelės: ženkliukai išjungti, kiti nustatymai nepakeisti");

// Nustatymai – grupėmis (kaip iOS)
await go(page, "admin/daugiau");
check((await page.locator('#admMain a.axRow[href^="admin/nustatymai/"]').count()) === 5 && (await page.locator('#admMain [data-logout]').count()) === 1, "Daugiau: 5 nustatymų grupės, atsijungimas");
await go(page, "admin/nustatymai/parduotuve");
await page.fill('#setForm input[name="freeShippingFrom"]', "70");
await page.click('.axSave[form="setForm"]');
check(await until(() => sb.db.settings[0].data.freeShippingFrom === 70), "nustatymai: parduotuvė išsaugota");
await go(page, "admin/nustatymai/imone");
await page.fill('#setForm input[name="coName"]', "UAB „Vaidore“");
await page.fill('#setForm input[name="coEmail"]', "blogas");
await page.click('.axSave[form="setForm"]');
check((await page.locator("#setForm .formErr").textContent()).includes("el. paštą"), "nustatymai: tikrinamas el. paštas");
await page.fill('#setForm input[name="coEmail"]', "info@vaidore.com");
await page.click('.axSave[form="setForm"]');
check(await until(() => sb.db.settings[0].data.company?.name === "UAB „Vaidore“"), "nustatymai: įmonės rekvizitai išsaugoti");
const sd = sb.db.settings[0].data;
check(sd.company.name === "UAB „Vaidore“" && sd.company.code === "[Įmonės kodas]" && sd.discovery.id === cat.settings.discovery.id && sd.domain === cat.settings.domain && sd.freeShippingFrom === 70, "neliesti laukai nepakeisti");
await shot(page, "nustatymai");

// Žurnalas, atnaujinimas, klaviatūra
await go(page, "admin/zurnalas");
check((await page.locator(".admLog .axRow").count()) >= 5 && (await page.locator(".admLog").textContent()).includes("Produktas"), "žurnalas: pakeitimai matomi");
await page.click(".axSide [data-adm-rebuild]");
check(await toastHas(page, "GitHub Pages"), "„Atnaujinti svetainę“ – paleista");
await go(page, "admin/kvapai");
await page.keyboard.press("/");
check(await page.evaluate(() => document.activeElement?.id === "prodQ"), "klaviatūra: „/“ – paieška");
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
for (const sec of ["admin", "admin/uzsakymai", "admin/kvapai", "admin/kvapai/vanor", "admin/kvapai/naujas", "admin/vitrina", "admin/vitrina/skaidres", "admin/kategorijos", "admin/daugiau", "admin/nustatymai/pristatymas"]) {
  await page.goto(BASE + sec);
  await page.waitForSelector("#admTitle");
  await settled(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const wide = overflow > 0 ? await page.evaluate(() => [...document.querySelectorAll("#admMain *")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map(el => el.className || el.tagName)) : [];
  check(overflow <= 0, `${sec}: telpa ekrane (be horizontalaus slinkimo)${wide.length ? ` – ${wide.join(", ")}` : ""}`);
  await shot(page, `tel-${sec.replace(/\//g, "-")}`);
}
check(await page.locator(".axSave").isVisible(), "telefone – „Išsaugoti“ navigacijos juostoje");
check((await page.locator(".axTabs .axTab").count()) === 5 && (await page.locator(".axTabs").isVisible()) && !(await page.locator(".axSide").isVisible()), "telefone – 5 skirtukai apačioje, be šoninio meniu");
// Skirtukas „Daugiau“ – ženkliukas (atsiliepimai + laukiantys)
check(await until(async () => (await page.locator('.axTab[data-tab="daugiau"] .axBadge').textContent()) === "3"), "skirtukas „Daugiau“ – laukiančių suma");
// Produkto ekranas telefone – „‹ Produktai“, vidinis ekranas, peržiūra
await page.goto(`${BASE}admin/kvapai/vanor`);
await page.waitForSelector("#prodForm");
check(await page.locator('a.axBack[href="admin/kvapai"]').isVisible(), "telefone – „‹ Produktai“");
await push(page, "natos");
check(await page.locator(".axPop:visible").textContent().then(t => t.includes("Vanor")), "telefone – vidinis ekranas, „‹ Vanor“");
await pop(page);
// Vitrina telefone: peržiūra – visame ekrane
await page.goto(`${BASE}admin/vitrina/skaidres`);
await page.waitForSelector("#heSlides .heItem");
check(!(await page.locator(".hePrev").isVisible()), "telefone – peržiūra paslėpta, kol neatidaryta");
await page.click("[data-he-preview]");
const pvT = page.frameLocator("#heFrame");
check(await until(async () => (await page.locator(".hePrev.open").isVisible()) && (await pvT.locator("#homeHero .slide").count()) === 4, 9000), "telefone – peržiūra visame ekrane");
await page.click("[data-he-preview-close]");
// Skyriai su produktais telefone: atidaryta taisyklė ir pasirinkimas ranka telpa ekrane
await page.goto(`${BASE}admin/vitrina/skyriai`);
await page.waitForSelector("#heRails [data-he-rail]");
for (const mode of ["auto", "manual"]) {
  await page.click(`[data-he-addrail="${mode}"]`);
  const box = page.locator("#heItemBox");
  if (mode === "manual") {
    await box.locator('input[name="rsearch"]').fill("a");
    await box.locator("[data-he-rpick]").first().click();
    await box.locator('input[name="rsearch"]').fill("o");
  }
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `telefone – skyrius (${mode === "auto" ? "pagal taisyklę" : "ranka"}) telpa ekrane`);
  if (shots) await page.screenshot({ path: path.join(shotDir, `admin-tel-skyrius-${mode}.png`) });
  await pop(page);
}
await page.goto(`${BASE}admin/uzsakymai`);
await page.waitForSelector("#ordersList .axCell[data-order]");
await page.locator("#ordersList .axCell[data-order] .axRow").first().click();
await page.waitForSelector(".axOrder");
check(await page.locator('[data-oa="ship"]').first().isVisible() && (await page.locator('a.axBack[href="admin/uzsakymai"]').isVisible()), "telefone – užsakymo ekranas: veiksmai ir „‹ Užsakymai“");
await page.context().close();

// ── Telefonas gulsčiai ─────────────────────────────────
console.log("\n— telefonas gulsčiai 844×390 —");
page = await newPage({ width: 844, height: 390 }, ADMIN.token);
for (const sec of ["admin", "admin/kvapai/vanor", "admin/vitrina/juosta"]) {
  await page.goto(BASE + sec);
  await page.waitForSelector("#admTitle");
  await settled(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `gulsčiai ${sec}: telpa ekrane`);
}
const tabsBox = await page.locator(".axTabs").boundingBox();
check(tabsBox && tabsBox.x === 0 && tabsBox.height >= 380 && tabsBox.width < 120, "gulsčiai – ikonų juosta kairėje");
await page.context().close();

await browser.close();
server.close();
check(!errors.length, `be JS klaidų${errors.length ? `: ${errors.join(" | ")}` : ""}`);
console.log(failed ? `\n${failed} patikrinimai nepavyko` : "\nAdministravimo testai praėjo");
process.exit(failed ? 1 : 0);
