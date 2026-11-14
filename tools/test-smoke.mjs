// Naršyklės testas (Playwright): node tools/test-smoke.mjs [--shots]
// Surenka dvi svetainės kopijas į .verify/ (be interneto: paštomatai – tools/fixtures/omniva-sample.json):
//   .verify/site          – tikras katalogas
//   .verify/site-variant  – katalogas su išparduotu kvapu, nuotraukomis ir atsiliepimais (funkcijoms, kurių tikrame kataloge dar nėra)
// Tikrina telefoną (430 × 932) ir kompiuterį (1440 × 900): pradžia (vertės žinutė, istorija), katalogas, paieška, filtrai,
// „Rask savo kvapą“, atradimų rinkinys, kvapo lapas („Tiks …“, pristatymo eilutė, mėginuko kainos grąžinimas), krepšelis
// (kiekis, atšaukimas, paštomatas, dovanų pakavimas), apmokėjimas (api/checkout – imituojamas), /aciu (kodas), mėgstami,
// SEO puslapis kvepalai/<id>, sitemap / robots, išparduota + „Pranešti, kai bus“, galerija, atsiliepimai, be JS klaidų.
// --shots – ekrano nuotraukos į .verify/shots/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const shots = process.argv.includes("--shots");
const verify = path.join(root, ".verify");
const shotDir = path.join(verify, "shots");
if (shots) fs.mkdirSync(shotDir, { recursive: true });

// 1. Surinkimas
const fixture = path.join(root, "tools/fixtures/omniva-sample.json");
const build = (out, extra = {}) => {
  const r = spawnSync(process.execPath, [path.join(root, "tools/build-site.mjs")], {
    env: { ...process.env, OUT: out, OMNIVA_FILE: fixture, ...extra },
    encoding: "utf8"
  });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
};
const siteA = path.join(verify, "site");
const siteB = path.join(verify, "site-variant");
build(siteA);
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const variant = structuredClone(cat);
const vp = id => variant.products.find(p => p.id === id);
vp("jura").stock = 0;
vp("rasa").images = ["img/test-1.svg", "img/test-2.svg"];
vp("rasa").reviews = [{ name: "Testas T.", text: "Tikras atsiliepimas testui.", rating: 5, date: "2026-11-01" }];
fs.mkdirSync(verify, { recursive: true });
fs.writeFileSync(path.join(verify, "catalog-variant.json"), JSON.stringify(variant));
build(siteB, { CATALOG: path.join(verify, "catalog-variant.json"), NOINDEX: "1" });
fs.mkdirSync(path.join(siteB, "img"), { recursive: true });
for (const [n, c] of [
  [1, "#F6C6CF"],
  [2, "#C7D7F5"]
])
  fs.writeFileSync(path.join(siteB, "img", `test-${n}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${c}"/></svg>`);

// 2. Serveris (kaip Vercel cleanUrls)
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".js": "text/javascript", ".xml": "application/xml", ".txt": "text/plain" };
function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let f = path.join(dir, p);
    if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r({ server, base: `http://127.0.0.1:${server.address().port}` })));
}
const A = await serve(siteA);
const B = await serve(siteB);

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const browser = await chromium.launch();
const closed = p => p.waitForSelector("#backdrop", { state: "hidden" });

async function page(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 700 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => m.type() === "error" && !/favicon|404|api\/order/.test(m.text()) && errors.push(m.text()));
  return { ctx, p, errors };
}

async function run(name, viewport) {
  console.log(`\n— ${name} ${viewport.width}×${viewport.height} —`);
  const base = A.base;
  const { ctx, p, errors } = await page(viewport);
  let checkoutBody = null;
  await p.route("**/api/checkout", async r => {
    checkoutBody = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "cs_test_1", url: `${base}/aciu?s=cs_test_ABCDEFGH` }) });
  });
  await p.route("**/api/order*", r =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paid: true, ref: "ABCDEFGH", total: 155.4, credit: { code: "VD-ABCDEFGH", amount: 1490, expires: 1797000000 } })
    })
  );
  const shot = async n => shots && p.screenshot({ path: path.join(shotDir, `${name}-${n}.png`) });

  // Pradžia
  await p.goto(base + "/");
  await p.waitForSelector("#view-home.active .card");
  check((await p.locator("#homeTiles .tile").count()) === 4, "pradžia: 4 plytelės");
  check((await p.locator("#homeMoods .mood").count()) === 5, "pradžia: 5 kvapo šeimos");
  check((await p.textContent("#homeLede")) === cat.settings.tagline, "pradžia: vertės žinutė");
  check((await p.locator("#homeHelp .row").count()) === 2, "pradžia: „Rask savo kvapą“ ir atradimų rinkinys");
  check(await p.locator("#homeStory h2").isVisible(), "pradžia: „Mūsų istorija“");
  check(await p.locator("#homeReviews").isHidden(), "be tikrų atsiliepimų – atsiliepimų sekcijos nėra");
  await shot("01-home");

  // Katalogas ir paieška
  await p.locator(".tile", { hasText: "Vyrams" }).click();
  await p.waitForSelector("#view-shop.active");
  const men = await p.locator("#shopGrid .card").count();
  check(men > 0 && (await p.locator('#shopSeg [aria-selected="true"]').textContent()) === "Vyrams", `„Vyrams“ plytelė → katalogas (${men})`);
  await p.locator('#shopSeg [data-gender="all"]').click();
  check((await p.locator("#shopGrid .card").count()) === 12, "katalogas: visi 12");
  await p.fill("#shopQ", "vanile");
  await p.waitForTimeout(200);
  const van = await p.locator("#shopGrid .card .cardName").allTextContents();
  check(van.length >= 2 && van.includes("Gintaras"), `paieška be diakritikų „vanile“ → ${van.join(", ")}`);
  await p.fill("#shopQ", "zzzz");
  await p.waitForTimeout(200);
  check(await p.locator("#shopGrid .empty [data-quiz]").isVisible(), "tuščia paieška – „Rask savo kvapą“");
  await p.click("#shopQClear");
  await shot("02-shop");

  // Filtrai
  await p.click("#shopFilterBtn");
  await p.waitForSelector(".sheet .fChips");
  await p.locator('.sheet [data-f="families"][data-id="medienos"]').click();
  const applyTxt = await p.locator(".sheet [data-f-apply]").textContent();
  await shot("03-filters");
  await p.locator(".sheet [data-f-apply]").click();
  await closed(p);
  const wood = await p.locator("#shopGrid .card").count();
  check(wood === 3 && /3 kvapus/.test(applyTxt), `filtras „Medienos“ → ${wood} (${applyTxt.trim()})`);
  check((await p.locator("#shopActive .chip").count()) === 1, "aktyvus filtras rodomas žyme");
  await p.locator("#shopActive .chip").click();

  // Kvapo lapas, tūris, į krepšelį
  await p.locator('#shopGrid [data-open="gintaras"]').click();
  await p.waitForSelector(".sheet .pd");
  check(/#\/kvepalai\/gintaras$/.test(p.url()), "kvapo lapas turi savo adresą");
  check((await p.locator(".sheet .pyrRow").count()) === 3, "natų piramidė – 3 eilutės");
  check(/^Tiks vakarui/.test((await p.textContent(".sheet .pdSuits")).trim()), `„Tiks …“: ${(await p.textContent(".sheet .pdSuits")).trim()}`);
  check(/Išsiunčiame per .* Nemokamai nuo 60 € · Grąžinimas 14 d\./.test(await p.textContent(".sheet .pdShip")), "pristatymo eilutė po kaina");
  await shot("04-product");
  await p.locator('.sheet [data-ml="100"]').click();
  check((await p.locator("[data-buy-price]").textContent()).includes("129,00"), "100 ml – 129,00 €");
  await p.locator(".sheet [data-add]").click();
  await p.locator('.sheet [data-ml="2"]').click();
  check(await p.locator(".sheet [data-sample-note]").isVisible(), "mėginukas – kainos grąžinimo žinutė");
  await p.locator(".sheet [data-add]").click();
  await p.waitForTimeout(150);
  const badge = await p.locator('.tab [data-badge="cart"], .sideLink [data-badge="cart"]').first().textContent();
  check(badge.trim() === "2", `krepšelio skaičiukas: ${badge}`);
  await p.goBack();
  await closed(p);
  check(!/kvepalai/.test(p.url()), "„Atgal“ uždaro kvapo lapą");

  // Mėgstami
  await p.locator('#shopGrid [data-fav="rasa"]').click();
  await p.locator('[data-tab="fav"]:visible').first().click();
  check((await p.locator("#favGrid .card").count()) === 1, "mėgstami: 1");

  // „Rask savo kvapą“ → atradimų rinkinys
  await p.locator('[data-tab="home"]:visible').first().click();
  await p.locator("#homeHelp [data-quiz]").click();
  await p.waitForSelector(".sheet .qzOpts");
  await p.locator('.sheet [data-qz="moterims"]').click();
  await p.locator('.sheet [data-qz="evening"]').click();
  await p.locator('.sheet [data-qz="ambros"]').click();
  await p.locator(".sheet [data-qz-next]").click();
  await p.locator('.sheet [data-qz="3"]').click();
  await p.waitForSelector(".sheet .qzCard");
  const res = await p.locator(".sheet .qzCard b").allTextContents();
  const whyOk = (await p.locator(".sheet .qzCard").evaluateAll(cs => cs.every(c => c.querySelectorAll(".qzWhy span").length >= 1))) === true;
  const women = new Set(cat.products.filter(x => x.gender !== "vyrams").map(x => x.name));
  check(res.length === 3 && res.every(n => women.has(n)) && whyOk, `testas: 3 kvapai su „Kodėl tinka“ (${res.join(", ")})`);
  await shot("05-quiz");
  await p.locator(".sheet [data-qz-disc]").click();
  await p.waitForSelector(".sheet .discGrid");
  check((await p.locator('.sheet [data-pick][aria-pressed="true"]').count()) === 5, "rinkinys: 5 kvapai parinkti pagal testą");
  await p.locator('.sheet [data-pick][aria-pressed="true"]').first().click();
  check(await p.locator(".sheet [data-disc-add]").isDisabled(), "rinkinys: 4 iš 5 – mygtukas neaktyvus");
  await p.locator('.sheet [data-pick][aria-pressed="false"]:not([disabled])').first().click();
  await shot("06-discovery");
  await p.locator(".sheet [data-disc-add]").click();
  await closed(p);

  // Krepšelis
  await p.locator('[data-tab="cart"]:visible').first().click();
  await p.waitForSelector("#view-cart.active .line");
  check((await p.locator(".line").count()) === 3, "krepšelyje 3 eilutės (100 ml, mėginukas, rinkinys)");
  const total = await p.locator(".sumRow.total b").textContent();
  check(/149,80/.test(total), `iš viso su nemokamu pristatymu: ${total}`);
  check(await p.locator(".ship.done").isVisible(), "nemokamo pristatymo juosta – „nemokamas“");
  const sample = '.line[data-line="gintaras:2"]';
  await p.locator(`${sample} [data-step="1"]`).click();
  check((await p.locator(`${sample} output`).textContent()) === "2", "kiekis +1");
  await p.locator(`${sample} [data-step="-1"]`).click();
  await p.locator(`${sample} [data-step="-1"]`).click();
  check((await p.locator(".line").count()) === 2, "kiekis 0 – eilutė pašalinta");
  await p.locator(".toast button", { hasText: "Atšaukti" }).click();
  check((await p.locator(".line").count()) === 3, "„Atšaukti“ grąžina eilutę");

  // Dovanų pakavimas
  await p.locator("[data-gift]").click();
  await p.fill("#giftNote", "Su gimtadieniu, Ona!");
  check(/152,30/.test(await p.locator(".sumRow.total b").textContent()), "dovanų pakavimas +2,50 € suvestinėje");
  await shot("07-cart");

  // Apmokėjimas: be paštomato – pirmiausia pasirinkimas
  await p.click("#payBtn");
  await p.waitForSelector(".sheet .lockerPick .group, .sheet .lockerPick .qzHint");
  await p.fill("#lkQ", "kaunas");
  await p.waitForTimeout(100);
  const found = await p.locator(".sheet [data-locker]").count();
  check(found === 2, `paštomato paieška „kaunas“ → ${found}`);
  await shot("08-locker");
  await p.locator(".sheet [data-locker]").first().click();
  await closed(p);
  check(/Kauno/.test(await p.textContent('[data-ship="omniva"] small')), "pasirinktas paštomatas rodomas krepšelyje");
  await p.click("#payBtn");
  await p.waitForURL(/\/aciu/);
  const items = checkoutBody?.items || [];
  check(items.length === 3 && items.every(i => i.id && i.qty && !("price" in i)), "į api/checkout – tik id, ml / picks, kiekis (be kainų)");
  check(items.some(i => i.picks?.length === 5), "rinkinys siunčiamas su 5 kvapais");
  check(checkoutBody?.shipping?.method === "omniva" && /^\d{5}$/.test(checkoutBody.shipping.locker?.zip), "siunčiamas paštomatas");
  check(checkoutBody?.gift?.note === "Su gimtadieniu, Ona!", "siunčiamas rašteliukas");
  check(/Ačiū už užsakymą/.test(await p.textContent("h1")), "/aciu – padėkos puslapis");
  await p.waitForSelector("#credit:not([hidden])");
  check((await p.textContent("#creditCode")) === "VD-ABCDEFGH", "/aciu – mėginukų kainos grąžinimo kodas");
  await shot("09-thanks");
  await p.goto(base + "/");
  await p.waitForSelector("#view-home.active");
  check((await p.evaluate(() => localStorage.getItem("vaidore_cart_v1"))) === null, "po apmokėjimo krepšelis išvalytas");

  // Tiesioginė nuoroda, SEO puslapis, teisiniai puslapiai
  await p.goto(base + "/#/kvepalai/jura");
  await p.waitForSelector(".sheet .pd");
  check((await p.textContent("#sheetTitle")) === "Jūra", "tiesioginė nuoroda atidaro kvapą");
  await p.keyboard.press("Escape");
  await closed(p);
  check(await p.locator("#view-home").isVisible(), "uždarius – pradžia matoma");
  await p.goto(base + "/kvepalai/baltijos-pusys");
  await p.waitForSelector(".sheet .pd");
  const seo = await p.evaluate(() => ({
    title: document.title,
    canon: document.querySelector('link[rel="canonical"]')?.href,
    og: document.querySelector('meta[property="og:image"]')?.content,
    ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
    url: location.href,
    sheet: document.querySelector("#sheetTitle")?.textContent
  }));
  check(seo.sheet === "Baltijos pušys" && /#\/kvepalai\/baltijos-pusys$/.test(seo.url), "kvepalai/<id> – atsidaro tas pats kvapo lapas");
  check(/^Baltijos pušys – /.test(seo.title) && seo.canon === "https://vaidore.com/kvepalai/baltijos-pusys", "kvepalai/<id> – title ir kanoninis adresas");
  check(seo.ld["@type"] === "Product" && seo.ld.offers.lowPrice > 0 && /InStock/.test(seo.ld.offers.availability), "kvepalai/<id> – Product JSON-LD");
  check(/og\/baltijos-pusys\.jpg$/.test(seo.og), "kvepalai/<id> – Open Graph paveikslas");
  for (const pg of ["/salygos", "/privatumas"]) {
    const r = await p.goto(base + pg);
    check(r.ok() && (await p.locator(".pgDoc h1").count()) === 1, `${pg} – puslapis`);
  }
  if (name === "telefonas") {
    const sm = await (await p.goto(base + "/sitemap.xml")).text();
    check((sm.match(/<loc>/g) || []).length === 15, "sitemap.xml – 15 adresų");
    check(/Sitemap: https:\/\/vaidore\.com\/sitemap\.xml/.test(await (await p.goto(base + "/robots.txt")).text()), "robots.txt");
  }
  if (shots) {
    await p.goto(base + "/");
    await p.waitForSelector("#view-home.active");
    await p.evaluate(() => window.scrollTo(0, 99999));
    await shot("10-home-bottom");
  }
  check(errors.length === 0, `be JS klaidų${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

// Variantas: išparduota, nuotraukos, atsiliepimai, noindex
async function runVariant(name, viewport) {
  console.log(`\n— ${name}: katalogo variantas —`);
  const { ctx, p, errors } = await page(viewport);
  await p.goto(B.base + "/");
  await p.waitForSelector("#view-home.active .card");
  check(await p.locator("#homeReviews .review").first().isVisible(), "su tikrais atsiliepimais – sekcija rodoma");
  check((await p.locator('.card[data-open="rasa"] img.photo').count()) > 0, "kortelėje – tikra nuotrauka");
  await p.goto(B.base + "/#/kvepalai/rasa");
  await p.waitForSelector(".sheet .pd");
  check((await p.locator(".sheet .gal img").count()) === 2 && (await p.locator(".sheet .galDots i").count()) === 2, "kvapo lape – galerija (2 nuotraukos)");
  check(await p.locator(".sheet [data-pd-reviews] .review").isVisible(), "kvapo lape – atsiliepimas");
  await p.keyboard.press("Escape");
  await closed(p);
  await p.goto(B.base + "/#/kvepalai/jura");
  await p.waitForSelector(".sheet .pd.sold");
  check((await p.locator(".sheet [data-add]").count()) === 0 && (await p.locator(".sheet [data-notify]").isVisible()), "išparduota – „Pranešti, kai bus“ vietoje „Į krepšelį“");
  await p.locator(".sheet [data-notify]").click();
  await p.waitForSelector('.sheet input[type="email"]');
  await p.fill('.sheet input[type="email"]', "blogas");
  await p.locator('.sheet button[type="submit"]').click();
  check(await p.locator(".sheet .formErr").isVisible(), "neteisingas el. paštas – klaida");
  if (shots) await p.screenshot({ path: path.join(shotDir, `${name}-variant-notify.png`) });
  const seo = await (await p.goto(B.base + "/kvepalai/jura")).text();
  check(/OutOfStock/.test(seo) && /<meta name="robots" content="noindex"/.test(seo), "išparduotas – OutOfStock JSON-LD; NOINDEX=1 – noindex");
  const rasa = await (await p.goto(B.base + "/kvepalai/rasa")).text();
  check(/"aggregateRating"/.test(rasa) && /img\/test-1\.svg/.test(rasa), "su atsiliepimais – aggregateRating, nuotrauka JSON-LD");
  check(/Disallow: \//.test(await (await p.goto(B.base + "/robots.txt")).text()), "NOINDEX=1 – robots.txt uždraudžia");
  check(errors.length === 0, `be JS klaidų${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

await run("telefonas", { width: 430, height: 932 });
await run("kompiuteris", { width: 1440, height: 900 });
await runVariant("telefonas", { width: 390, height: 844 });
await browser.close();
A.server.close();
B.server.close();
console.log(failed ? `\n✗ Nepavyko: ${failed}` : "\nVisi testai praėjo");
process.exit(failed ? 1 : 0);
