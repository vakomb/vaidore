// Naršyklės testas (Playwright): node tools/test-smoke.mjs [--shots]
// Paleidžia site/ vietiniu serveriu, tikrina telefoną (430 × 932) ir kompiuterį (1440 × 900):
// pradžia, katalogas, paieška, filtrai, kvapo lapas, tūris, krepšelis, kiekis, atšaukimas, apmokėjimas (/api/checkout – imituojamas),
// mėgstami, tiesioginė nuoroda #/kvepalai/<id>, „Atgal“ uždaro langą, /aciu išvalo krepšelį, be JS klaidų.
// --shots – ekrano nuotraukos į .verify/shots/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const site = path.join(root, "site");
const shots = process.argv.includes("--shots");
const shotDir = path.join(root, ".verify", "shots");
if (shots) fs.mkdirSync(shotDir, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  let f = path.join(site, p);
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end();
  const ext = path.extname(f);
  res.writeHead(200, { "Content-Type": ext === ".html" ? "text/html; charset=utf-8" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const browser = await chromium.launch();

async function run(name, viewport) {
  console.log(`\n— ${name} ${viewport.width}×${viewport.height} —`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 700 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => m.type() === "error" && !/favicon|404/.test(m.text()) && errors.push(m.text()));
  let checkoutBody = null;
  await p.route("**/api/checkout", async r => {
    checkoutBody = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "cs_test_1", url: `${base}/aciu?s=cs_test_ABCDEFGH` }) });
  });
  const shot = async n => shots && p.screenshot({ path: path.join(shotDir, `${name}-${n}.png`) });

  await p.goto(base + "/");
  await p.waitForSelector("#view-home.active .card");
  check((await p.locator("#homeTiles .tile").count()) === 4, "pradžia: 4 plytelės");
  check((await p.locator("#homeMoods .mood").count()) === 5, "pradžia: 5 kvapo šeimos");
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
  await p.click("#shopQClear");
  await shot("02-shop");

  // Filtrai
  await p.click("#shopFilterBtn");
  await p.waitForSelector(".sheet .fChips");
  await p.locator('.sheet [data-f="families"][data-id="medienos"]').click();
  const applyTxt = await p.locator(".sheet [data-f-apply]").textContent();
  await shot("03-filters");
  await p.locator(".sheet [data-f-apply]").click();
  await p.waitForSelector("#backdrop", { state: "hidden" });
  const wood = await p.locator("#shopGrid .card").count();
  check(wood === 3 && /3 kvapus/.test(applyTxt), `filtras „Medienos“ → ${wood} (${applyTxt.trim()})`);
  check((await p.locator("#shopActive .chip").count()) === 1, "aktyvus filtras rodomas žyme");
  await p.locator("#shopActive .chip").click();

  // Kvapo lapas, tūris, į krepšelį
  await p.locator('#shopGrid [data-open="gintaras"]').click();
  await p.waitForSelector(".sheet .pd");
  check(/#\/kvepalai\/gintaras$/.test(p.url()), "kvapo lapas turi savo adresą");
  check((await p.locator(".sheet .pyrRow").count()) === 3, "natų piramidė – 3 eilutės");
  await shot("04-product");
  await p.locator('.sheet [data-ml="100"]').click();
  check((await p.locator("[data-buy-price]").textContent()).includes("129,00"), "100 ml – 129,00 €");
  await p.locator(".sheet [data-add]").click();
  await p.locator('.sheet [data-ml="2"]').click();
  await p.locator(".sheet [data-add]").click();
  await p.waitForTimeout(150);
  const badge = await p.locator('.tab [data-badge="cart"], .sideLink [data-badge="cart"]').first().textContent();
  check(badge.trim() === "2", `krepšelio skaičiukas: ${badge}`);
  await p.goBack();
  await p.waitForSelector("#backdrop", { state: "hidden" });
  check(!/kvepalai/.test(p.url()), "„Atgal“ uždaro kvapo lapą");

  // Mėgstami
  await p.locator('#shopGrid [data-fav="rasa"]').click();
  await p.locator('[data-tab="fav"]:visible').first().click();
  check((await p.locator("#favGrid .card").count()) === 1, "mėgstami: 1");

  // Krepšelis
  await p.locator('[data-tab="cart"]:visible').first().click();
  await p.waitForSelector("#view-cart.active .line");
  check((await p.locator(".line").count()) === 2, "krepšelyje 2 eilutės");
  const total = await p.locator(".sumRow.total b").textContent();
  check(/134,90/.test(total), `iš viso su nemokamu pristatymu: ${total}`);
  check(await p.locator(".ship.done").isVisible(), "nemokamo pristatymo juosta – „nemokamas“");
  await shot("05-cart");
  await p.locator('.line[data-ml="2"] [data-step="1"]').click();
  check((await p.locator('.line[data-ml="2"] output').textContent()) === "2", "kiekis +1");
  await p.locator('.line[data-ml="2"] [data-step="-1"]').click();
  await p.locator('.line[data-ml="2"] [data-step="-1"]').click();
  check((await p.locator(".line").count()) === 1, "kiekis 0 – eilutė pašalinta");
  await p.locator(".toast button", { hasText: "Atšaukti" }).click();
  check((await p.locator(".line").count()) === 2, "„Atšaukti“ grąžina eilutę");

  // Apmokėjimas
  await p.click("#payBtn");
  await p.waitForURL(/\/aciu/);
  check(
    checkoutBody?.items?.length === 2 && checkoutBody.items.every(i => i.id && i.ml && i.qty && !("price" in i)),
    "į /api/checkout siunčiami tik id, ml, kiekis (be kainų)"
  );
  check(/Ačiū už užsakymą/.test(await p.textContent("h1")), "/aciu – padėkos puslapis");
  await shot("06-thanks");
  await p.goto(base + "/");
  await p.waitForSelector("#view-home.active");
  check((await p.evaluate(() => localStorage.getItem("vaidore_cart_v1"))) === null, "po apmokėjimo krepšelis išvalytas");

  // Tiesioginė nuoroda ir teisiniai puslapiai
  await p.goto(base + "/#/kvepalai/jura");
  await p.waitForSelector(".sheet .pd");
  check((await p.textContent("#sheetTitle")) === "Jūra", "tiesioginė nuoroda atidaro kvapą");
  await p.keyboard.press("Escape");
  await p.waitForSelector("#backdrop", { state: "hidden" });
  check(await p.locator("#view-home").isVisible(), "uždarius – pradžia matoma");
  for (const pg of ["/salygos", "/privatumas"]) {
    const r = await p.goto(base + pg);
    check(r.ok() && (await p.locator(".pgDoc h1").count()) === 1, `${pg} – puslapis`);
  }
  if (shots) {
    await p.goto(base + "/");
    await p.waitForSelector("#view-home.active");
    await p.evaluate(() => window.scrollTo(0, 99999));
    await shot("07-home-bottom");
  }
  check(errors.length === 0, `be JS klaidų${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

await run("telefonas", { width: 430, height: 932 });
await run("kompiuteris", { width: 1440, height: 900 });
await browser.close();
server.close();
console.log(failed ? `\n✗ Nepavyko: ${failed}` : "\nVisi testai praėjo");
process.exit(failed ? 1 : 0);
