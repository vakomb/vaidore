// Parduotuvės naršyklės testas (Playwright), be interneto: node tools/test-smoke.mjs [--shots]
// Supabase (katalogas, „Pranešti, kai bus“, apmokėjimas, padėkos puslapis) imituojamas – tools/mock-supabase.mjs;
// Omniva paštomatai – tools/fixtures/omniva-sample.json. Surenkamos dvi kopijos į .verify/:
//   site          – tikras katalogas
//   site-variant  – išparduotas kvapas, nuotraukos ir atsiliepimai (funkcijoms, kurių tikrame kataloge dar nėra)
// Tikrina telefoną (430 × 932) ir kompiuterį (1440 × 900): pradžia, meniu, katalogas, paieška, filtrai, rūšiavimas,
// kvapo puslapis (tūris, mėginukas), mini krepšelis, atradimų rinkinys, „Rask savo kvapą“, krepšelis (kiekis, atšaukimas,
// paštomatas, dovanų pakavimas), apmokėjimas (siunčiami tik id / ml / kiekis), /aciu (kodas, krepšelis išvalytas),
// mėgstami, paskyros forma, informacija, 404, seni #/ adresai; SEO (JSON-LD, sitemap, robots); išparduota + „Pranešti,
// kai bus“, galerija, atsiliepimai; be JS klaidų. --shots – ekrano nuotraukos į .verify/shots/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startServer } from "./serve.mjs";
import { mockSupabase } from "./mock-supabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");
const shots = process.argv.includes("--shots");
const verify = path.join(root, ".verify");
const shotDir = path.join(verify, "shots");
if (shots) fs.mkdirSync(shotDir, { recursive: true });

// 1. Surinkimas
const fixture = path.join(root, "tools/fixtures/omniva-sample.json");
const build = (out, extra = {}) => {
  const r = spawnSync(process.execPath, [path.join(root, "tools/build-site.mjs")], { env: { ...process.env, OUT: out, NO_DB: "1", OMNIVA_FILE: fixture, ...extra }, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
};
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const variant = structuredClone(cat);
const vp = id => variant.products.find(p => p.id === id);
vp("arven").stock = 0;
vp("vanor").images = ["img/kvapai/vanor-1.webp", "img/kvapai/safrane-1.webp", "og/home.jpg"]; // galerija iš kelių nuotraukų
// Pradžios puslapis iš nustatymų (administravimo „Pradžia“): 2 skaidrės (viena – su nuotrauka, tamsi), viena paslėpta;
// plytelės – Vyrams su nuotrauka ir kategorija „Vakarui“
variant.settings.slides = [
  { id: "a", on: true, preset: "samples" },
  { id: "b", on: true, preset: "custom", title: "Ruduo", text: "Šilti kvapai", cta: "Žiūrėti", href: "vyrams", image: "og/home.jpg", focus: "30% 40%", dark: true },
  { id: "c", on: false, preset: "gift" }
];
variant.settings.tiles = [
  { key: "vyrams", on: true, image: "og/home.jpg", title: "Jam" },
  { key: "kat-vakarui", on: true },
  { key: "naujienos", on: false }
];
variant.settings.slideSeconds = 0;
vp("safrane").sizes.forEach(s => (s.was = s.price + 20)); // akcija (sena kaina) // akcija (sena kaina)
vp("vanor").reviews = [
  { name: "Ona K.", text: "Gaivus ir švelnus, puikiai tinka darbui.", rating: 5, date: "2026-11-01", verified: true },
  { name: "Rūta P.", text: "Išsilaiko visą dieną.", rating: 4, date: "2026-10-20", verified: true }
];
fs.mkdirSync(verify, { recursive: true });
const variantFile = path.join(verify, "catalog-variant.json");
fs.writeFileSync(variantFile, JSON.stringify(variant));
const siteA = path.join(verify, "site");
const siteB = path.join(verify, "site-variant");
build(siteA);
build(siteB, { CATALOG: variantFile });
const SB_URL = JSON.parse(fs.readFileSync(path.join(root, "src/data/supabase.json"), "utf8")).url;
const serverA = await startServer(siteA, 4181);
const serverB = await startServer(siteB, 4182);
const A = "http://localhost:4181/";
const B = "http://localhost:4182/";

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const errors = [];
const until = async (fn, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
};
const fold = s =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const money = t => String(t || "").replace(/\s/g, "");
const eur = n => `${n.toFixed(2).replace(".", ",")}€`;
const browser = await chromium.launch();

// 2. SEO failai (be naršyklės)
const rasaHtml = fs.readFileSync(path.join(siteA, "kvepalai/vanor.html"), "utf8");
check(/"@type":"Product"/.test(rasaHtml) && rasaHtml.includes('<link rel="canonical" href="https://vaidore.com/kvepalai/vanor"'), "SEO: kvapo puslapis su Product JSON-LD ir kanoniniu adresu");
check(rasaHtml.includes("<title>Vanor – Eau de Parfum | Vaidore</title>"), "SEO: kvapo pavadinimas <title>");
const sitemap = fs.readFileSync(path.join(siteA, "sitemap.xml"), "utf8");
check(cat.products.every(p => sitemap.includes(`/kvepalai/${p.id}<`)) && !sitemap.includes("/admin"), "sitemap.xml: visi kvapai, be administravimo");
check(fs.readFileSync(path.join(siteA, "robots.txt"), "utf8").includes("Disallow: /admin"), "robots.txt: /admin neindeksuojamas");
check(fs.existsSync(path.join(siteA, "assets/admin.js")) && fs.statSync(path.join(siteA, "assets/admin.js")).size > 20000, "administravimo skydelis – atskiras failas");
const appHtml = fs.readFileSync(path.join(siteA, "index.html"), "utf8");
check(!appHtml.includes("VDAdmin = {") && !appHtml.includes("renderOrders"), "pirkėjams administravimo kodas nesiunčiamas");

async function newPage(site, viewport, catalog) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const page = await ctx.newPage();
  const sb = mockSupabase({ url: SB_URL, catalog });
  page.on("pageerror", e => errors.push(`${viewport.width} ${page.url()}: ${e.message}`));
  await page.route(`${SB_URL}/**`, sb.handle);
  await page.route(/plausible\.io|omniva\.ee/, r => r.abort());
  return { page, sb };
}
const shot = async (page, name) => shots && page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: false });
// Atidaro ir palaukia, kol programėlė parsisiunčia šviežią katalogą (kad jis nepersipieštų testo viduryje)
const open = async (pg, url) => {
  await pg.goto(url);
  await pg.waitForLoadState("networkidle").catch(() => {});
};
const view = page => page.locator(".view.active").getAttribute("data-view");
const cartBadge = page => page.locator('#cartBtn [data-badge="cart"]').textContent();

async function run(viewport) {
  const mobile = viewport.width < 800;
  const tag = mobile ? "tel" : "pc";
  console.log(`\n— ${mobile ? "telefonas" : "kompiuteris"} ${viewport.width}×${viewport.height} —`);
  const { page, sb } = await newPage(siteA, viewport, cat);

  // Pradžia
  await open(page, A);
  await page.waitForSelector("#homeTiles a");
  const tileHrefs = await page.locator("#homeTiles .tile").evaluateAll(a => a.map(x => x.getAttribute("href")));
  check(["moterims", "vyrams", "unisex", "meginukai", "rinkinys"].every(h => tileHrefs.includes(h)), "pradžia: kategorijos (Moterims, Vyrams, Unisex, Mėginukai, rinkinys, Naujienos)");
  check((await page.locator("#homeHero h1.heroTitle").textContent()).length > 2 && !(await page.locator("#homeMarquee, .marquee").count()), "pradžia: kolekcijos paveikslas, be bėgančios juostos");
  check(
    (await page.locator("#homeRails .band").allTextContents()).slice(0, 4).join("|").toLowerCase() === "kvapnios naujienos|populiariausi moterims|populiariausi vyrams|unisex kvapai" &&
      !(await page.locator("#homeRails .band").allTextContents()).some(t => /mėginukai/i.test(t)),
    "pradžia: naujienos → moterims → vyrams → unisex, be mėginukų karuselės"
  );
  check(
    await page.evaluate(() => {
      const rails = document.querySelector("#homeRails");
      const tiles = document.querySelector("#homeTiles").closest(".hsec");
      return !!(rails.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING);
    }),
    "pradžia: „Produktai“ plytelės – po unisex karuselės"
  );
  check(
    await page.evaluate(() => Math.abs(document.querySelector("#homeRails .band").getBoundingClientRect().top - document.querySelector("#homeHero").getBoundingClientRect().bottom) < 1),
    "pradžia: „Kvapnios naujienos“ – iškart po pagrindine nuotrauka (be tarpo)"
  );
  check((await page.locator("#homeRails .band").count()) >= 4, "pradžia: skyriai juostose (naujienos, moterims, vyrams, unisex)");
  const noteOk = await page.evaluate(async () => {
    const el = document.querySelector("#topNoteTxt");
    const bar = document.querySelector("#topNote");
    if (getComputedStyle(bar).display === "none") return true;
    const h = bar.getBoundingClientRect().height;
    for (let i = 0; i < 6; i++) {
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 || bar.getBoundingClientRect().height !== h) return false;
      document.querySelector('[data-note-step="1"]').click();
      await new Promise(r => setTimeout(r, 30));
    }
    return true;
  });
  check(noteOk, "informacinė juosta: kiekviena žinutė telpa (iki 2 eilučių), aukštis nesikeičia");
  const note1 = await page.locator("#topNoteTxt").textContent();
  await page.click('[data-note-step="1"]');
  check((await page.locator("#topNoteTxt").textContent()) !== note1, "informacinė juosta: rodyklės keičia žinutę");
  const slideHrefs = await page.locator("#homeHero .slide").evaluateAll(a => a.map(x => x.getAttribute("href")));
  check(slideHrefs.length === 4 && slideHrefs.includes("meginukai") && slideHrefs.includes("rinkinys"), "pradžia: skaidrės (kolekcija, teiginiai, mėginukai, rinkinys)");
  check((await page.locator("#homeHero .heroClaims li").count()) >= 3, "skaidrė su teiginiais ir auksinėmis linijomis");
  check((await page.locator("#homeTiles .tile .tileName").first().evaluate(e => [getComputedStyle(e).fontWeight, getComputedStyle(e).textTransform, e.offsetHeight > 0].join())) === "700,uppercase,true", "plytelės: pavadinimas virš paveikslo (700, didžiosiomis)");
  check((await page.locator("#homeHero h1").count()) === 1, "pradžia: vienas h1");
  // v7: skaidrės ir kategorijos – scenos su Vaidore buteliukais be fono, kiekviena skaidrė – vienas veiksmas
  const heroInfo = await page.evaluate(() =>
    [...document.querySelectorAll("#homeHero .slide")].map(s => ({
      stage: !!s.querySelector(".stage"),
      bottles: [...s.querySelectorAll(".stage img")].map(i => i.getAttribute("src")),
      ctas: s.querySelectorAll(".heroCta").length
    }))
  );
  check(heroInfo.every(x => x.stage && x.bottles.length >= 2 && x.ctas === 1), "skaidrės: kiekviena – scena su buteliukais ir vienu veiksmu");
  check(heroInfo.flatMap(x => x.bottles).every(src => /^img\/(kvapai\/[a-z0-9-]+-1|meginukas)\.webp$/.test(src)), "skaidrės: tik buteliukai be fono (-1.webp) ir mėginukai");
  const firstLoaded = await until(() => page.evaluate(() => [...document.querySelectorAll("#homeHero .slide:first-child .stage img")].every(i => i.complete && i.naturalWidth > 0)));
  check(firstLoaded, "skaidrės: pirmos skaidrės buteliukai įsikėlė");
  check(
    await page.evaluate(() => [...document.querySelectorAll("#homeTiles .tile")].every(t => t.querySelector(".stage") && t.querySelectorAll(".stage img").length >= 2)),
    "kategorijos: kiekviena plytelė – scena su buteliukais"
  );
  const heroBox = await page.locator("#homeHero").boundingBox();
  await page.locator("#homeHero .heroRail").evaluate(r => r.scrollTo({ left: r.clientWidth }));
  await page.waitForTimeout(400);
  const heroBox2 = await page.locator("#homeHero").boundingBox();
  check(Math.abs(heroBox.height - heroBox2.height) < 1, "skaidrės: aukštis nesikeičia keičiantis skaidrėms");
  const cls = await page.evaluate(
    () =>
      new Promise(res => {
        let v = 0;
        new PerformanceObserver(l => l.getEntries().forEach(e => !e.hadRecentInput && (v += e.value))).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => res(v), 300);
      })
  );
  check(cls < 0.05, `pradžia: CLS ${cls.toFixed(3)} < 0,05`);
  // v7: spalvos – juoda vietoje mėlynos, krepšelio skaičiukas raudonas, VAIDORE – etiketės šriftu (SVG)
  check((await page.locator(".hdr .logo svg.wordmark").count()) === 1, "logotipas: VAIDORE kontūrai (etiketės šriftas)");
  const blue = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].filter(el => {
      const c = getComputedStyle(el);
      return [c.backgroundColor, c.color, c.borderTopColor].some(v => /rgba?\(\s*(40, 76, 162|53, 97, 196|28, 47, 94|59, 103, 204)\b/.test(v));
    }).length
  );
  check(blue === 0, `mėlynos spalvos nebėra (${blue})`);
  check(await page.locator("#homeReviews").isHidden(), "be tikrų atsiliepimų – atsiliepimų sekcijos nėra");
  check((await page.locator("#homeRails .card").count()) > 8, "pradžia: karuselės su kvapais");
  if (!mobile) {
    const nav = page.locator("#homeRails .railNav:not([hidden])").first();
    const before = await nav.locator(".railPage").textContent();
    await nav.locator('[data-rail-step="1"]').click();
    check(await until(async () => (await nav.locator(".railPage").textContent()) !== before), `karuselė: rodyklė „pirmyn“ (${before} → kitas puslapis)`);
  }
  await shot(page, `${tag}-pradzia`);

  // Meniu → katalogas
  if (mobile) {
    await page.click("#menuBtn");
    await page.waitForSelector("#drawerWrap:not([hidden]) #drawer a[href='moterims']");
    await page.click("#drawer a[href='moterims']");
  } else {
    await page.click("#genderBtn");
    await page.click('#hdrNav a[href="moterims"]');
  }
  await page.waitForURL(/\/moterims$/);
  check((await page.locator("#shopTitle").textContent()) === "Kvepalai moterims", "meniu → „Moterims“");
  const women = cat.products.filter(p => p.gender === "moterims").length;
  check((await page.locator("#shopGrid .card").count()) === women, `moterims: ${women} kvapai`);
  await open(page, `${A}kvepalai`);
  await page.waitForSelector("#shopGrid .card");
  check((await page.locator("#shopCount").textContent()).includes(String(cat.products.length)), `katalogas: ${cat.products.length} kvapų`);
  // Paieška (ir pagal natas, be diakritikų)
  const vanilla = cat.products.filter(p => fold([...p.notes.top, ...p.notes.heart, ...p.notes.base].join(" ")).includes("vanile")).length;
  await page.fill("#shopQ", "vanile");
  check(await until(async () => (await page.locator("#shopGrid .card").count()) === vanilla), `paieška „vanile“ (be diakritikų): ${vanilla}`);
  await page.fill("#shopQ", "");
  await until(async () => (await page.locator("#shopGrid .card").count()) === cat.products.length);
  // Filtrai
  const floral = cat.products.filter(p => p.family === "geliu").length;
  if (mobile) {
    await page.click("#shopFilterBtn");
    await page.locator("#sheetBody .fGroup summary", { hasText: "Kvapo pobūdis" }).click(); // grupės suskleistos (kaip parfumada.lt)
    await page.locator('#sheetBody [data-f="families"][value="geliu"], #sheetBody input[data-f][value="geliu"]').first().check();
    await page.click("[data-f-apply]");
  } else {
    await page.locator("#shopFilters .fGroup summary", { hasText: "Kvapo pobūdis" }).click();
    await page.locator('#shopFilters input[data-f][value="geliu"]').check();
    check(await page.locator("#shopFilters .fGroup", { hasText: "Kvapo pobūdis" }).evaluate(d => d.open), "filtrų grupė lieka atskleista perpiešus");
  }
  check(await until(async () => (await page.locator("#shopGrid .card").count()) === floral), `filtras „Gėlių“: ${floral}`);
  check(await until(() => new URL(page.url()).search.includes("geliu")), "filtras įrašomas į adresą (galima dalintis)");
  await open(page, `${A}kvepalai`);
  await page.waitForSelector("#shopGrid .card");
  const sortVals = await page.locator("#shopSort option").evaluateAll(o => o.map(x => x.value));
  const cheap = sortVals.find(v => /price|kaina|pig/i.test(v) && !/desc|brang/i.test(v));
  if (cheap) {
    if (mobile) {
      await page.click("#shopFilterBtn");
      await page.locator(`#sheetBody input[data-sort="${cheap}"]`).check();
      await page.click("[data-f-apply]");
    } else await page.selectOption("#shopSort", cheap);
    const minAll = Math.min(...cat.products.map(p => Math.min(...p.sizes.map(s => s.price))));
    check(await until(async () => money(await page.locator("#shopGrid .card .cardPrice").first().textContent()).includes(eur(minAll))), "rūšiavimas: pigiausi pirmi");
  }
  await shot(page, `${tag}-katalogas`);

  // Mėgstami
  await page.waitForSelector("#backdrop", { state: "hidden" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("#shopGrid .card [data-fav]").first().click();
  check(await until(async () => (await page.locator('[data-badge="fav"]').first().textContent()) === "1"), "širdelė → mėgstami (1)");

  // Kvapo puslapis
  const vanor = cat.products.find(p => p.id === "vanor");
  await open(page, `${A}kvepalai/vanor`);
  await page.waitForSelector("#productRoot h1");
  check((await page.locator("#productRoot h1").textContent()).includes("Vanor"), "kvapo puslapis: pavadinimas");
  check((await page.locator("#productRoot .sizeOpt").count()) === vanor.sizes.length + 1, "kvapo puslapis: tūriai + mėginukas 2 ml");
  const s30 = vanor.sizes[0];
  await page.click(`#productRoot .sizeOpt[data-ml="${s30.ml}"]`);
  check(money(await page.locator("#buyBar [data-buy-price]").textContent()) === eur(s30.price), `tūris ${s30.ml} ml – kaina ${s30.price} €`);
  await page.locator("#productRoot [data-add]").first().click();
  await page.waitForSelector("#miniWrap:not([hidden])");
  check((await cartBadge(page)) === "1", "„Į krepšelį“ → mini krepšelis, skaičiukas 1");
  check(
    (await page.locator('#cartBtn [data-badge="cart"]').evaluate(b => getComputedStyle(b).backgroundColor)) === "rgb(209, 16, 43)",
    "krepšelio skaičiukas – raudonas"
  );
  await shot(page, `${tag}-mini`);
  await page.locator("#mini [data-sheet-close]").first().click();
  await page.waitForTimeout(350);
  await page.click('#productRoot .sizeOpt[data-ml="2"]');
  check(money(await page.locator("#buyBar [data-buy-price]").textContent()) === eur(vanor.sample), "mėginukas 2 ml – kaina");
  await page.click('#productRoot [data-qty-step="1"]');
  check((await page.locator("#productRoot [data-qty]").textContent()) === "2", "kiekis kvapo puslapyje: 2");
  await page.locator("#productRoot [data-add]").first().click();
  await page.waitForSelector("#miniWrap:not([hidden])");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  check((await cartBadge(page)) === "3", "2 mėginukai pridėti (3)");
  check((await page.locator("#productRoot [data-qty]").textContent()) === "1", "kiekis po įdėjimo – vėl 1");
  check((await page.locator("#productRoot .acc").count()) === 5 && (await page.locator("#productRoot .acc[open]").count()) === 0, "kvapo puslapis: 5 išskleidžiamos dalys");

  // Atradimų rinkinys
  await open(page, `${A}rinkinys`);
  await page.waitForSelector("#sheetBody [data-pick]");
  const D = cat.settings.discovery;
  const picks = page.locator("#sheetBody [data-pick]");
  for (let i = 0; i < D.count; i++) await picks.nth(i).click();
  check(await page.locator("#sheetBody [data-disc-add]").isEnabled(), `rinkinys: pasirinkta ${D.count}`);
  await page.click("#sheetBody [data-disc-add]");
  check(await until(async () => (await cartBadge(page)) === "4"), "rinkinys krepšelyje (4)");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);

  // Rask savo kvapą
  await open(page, `${A}testas`);
  await page.waitForSelector("#quizRoot [data-qz]");
  await page.click('#quizRoot [data-qz="any"]');
  await page.click('#quizRoot [data-qz="daily"]');
  await page.click('#quizRoot [data-qz="geliu"]');
  await page.click("#quizRoot [data-qz-next]");
  await page.click('#quizRoot [data-qz="3"]');
  await page.waitForSelector("#quizRoot .qzCard");
  check((await page.locator("#quizRoot .qzCard").count()) === 3, "„Rask savo kvapą“: 3 pasiūlymai su „Kodėl tinka“");
  await shot(page, `${tag}-testas`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);

  // Krepšelis
  await open(page, `${A}krepselis`);
  await page.waitForSelector("#cartRoot [data-line]");
  check((await page.locator("#cartRoot [data-line]").count()) === 3, "krepšelis: 3 eilutės");
  const first = page.locator("#cartRoot [data-line]").first();
  await first.locator('[data-step="1"]').click();
  check(await until(async () => (await first.locator("output").textContent()) === "2"), "kiekis +1");
  await first.locator('[data-step="-1"]').click();
  await until(async () => (await first.locator("output").textContent()) === "1");
  await page.locator("#cartRoot [data-line]").first().locator('[data-step="-1"]').click();
  check(await until(async () => (await page.locator("#cartRoot [data-line]").count()) === 2), "kiekis 0 – eilutė pašalinta");
  await page.locator(".toast button", { hasText: "Atšaukti" }).click();
  check(await until(async () => (await page.locator("#cartRoot [data-line]").count()) === 3), "„Atšaukti“ – eilutė grąžinta");
  // Pristatymas: paštomatas
  await page.click('#cartRoot [data-ship="omniva"]');
  // Paštomato langas atsidaro pats, jei paštomatas dar nepasirinktas
  if (!(await until(() => page.locator("#lkQ").isVisible(), 1200))) await page.click("#cartRoot [data-pick-locker]");
  await page.waitForSelector("#lkQ");
  await page.fill("#lkQ", "Vilni");
  await page.waitForTimeout(250);
  const lk = page.locator("#sheetBody [data-locker]").first();
  const lkName = (await lk.locator(".rowTxt").textContent()).trim();
  await lk.click();
  check(await until(async () => (await page.locator("#cartRoot").textContent()).includes(lkName.split("\n")[0].slice(0, 12))), "paštomatas pasirinktas");
  // Dovanų pakavimas
  await page.click("#cartRoot [data-gift]");
  await page.fill("#giftNote", "Su meile");
  check((await page.locator("#cartRoot [data-gift]").getAttribute("aria-checked")) === "true", "dovanų pakavimas įjungtas");
  await shot(page, `${tag}-krepselis`);
  // Apmokėjimas
  await page.click("#payBtn");
  await page.waitForURL(/__stripe/);
  const co = sb.calls.find(c => c.name === "checkout");
  check(!!co, "„Apmokėti“ → Stripe (serverio funkcija)");
  const items = co?.body.items || [];
  check(items.length === 3 && items.every(i => i.id && i.qty && !("price" in i) && !("unit" in i)), "serveriui siunčiami tik id, ml / picks, kiekis (be kainų)");
  check(items.some(i => i.picks?.length === D.count), "rinkinio kvapai perduoti");
  check(co?.body.shipping?.method === "omniva" && /^\d{4,6}$/.test(co?.body.shipping?.locker?.zip || ""), "paštomatas perduotas");
  check(co?.body.gift?.on && co.body.gift.note === "Su meile", "dovanų pakavimas ir rašteliukas perduoti");
  // Padėkos puslapis
  await open(page, `${A}aciu?s=cs_test_abcdefghij1234567890`);
  await page.waitForSelector("#credit:not([hidden])");
  check((await page.locator("#creditCode").textContent()) === "VD-MOCK1234", "/aciu: mėginukų kainos grąžinimo kodas");
  check((await page.evaluate(() => localStorage.getItem("vaidore_cart_v1"))) === null, "/aciu: krepšelis išvalytas");
  await open(page, A);
  await page.waitForSelector("#homeTiles > *");
  check(await page.locator('#cartBtn [data-badge="cart"]').isHidden(), "grįžus – krepšelis tuščias");

  // Mėgstami, paskyra, informacija, 404, seni adresai
  await open(page, `${A}megstami`);
  check((await page.locator("#favGrid .card").count()) === 1, "mėgstami: 1 kvapas");
  await open(page, `${A}paskyra`);
  check(await page.locator('.authForm input[name="email"]').isVisible(), "paskyra: prisijungimo forma");
  await open(page, `${A}pagalba`);
  check((await view(page)) === "info" && (await page.locator(".infoSec").count()) >= 3, "pagalba: pristatymas, grąžinimas, DUK");
  // Nauji puslapiai (kaip parfumada.lt): bestselleriai, nuolaidos, atsiliepimai, verslui
  await open(page, `${A}bestselleriai`);
  check((await view(page)) === "shop" && (await page.locator("#shopGrid .card").count()) === 8 && (await page.locator("#shopTitle").textContent()) === "Bestselleriai", "/bestselleriai: 8 populiariausi");
  await open(page, `${A}nuolaidos`);
  check((await view(page)) === "shop" && (await page.locator("#shopGrid").textContent()).includes("nuolaidų nėra"), "/nuolaidos: be nuolaidų – aiškus pranešimas");
  await open(page, `${A}atsiliepimai`);
  check((await view(page)) === "info" && (await page.locator("#infoRoot h1").textContent()) === "Atsiliepimai", "/atsiliepimai");
  await open(page, `${A}verslui`);
  check((await view(page)) === "info" && (await page.locator('#infoRoot a[href^="mailto:"]').count()) >= 1, "/verslui: užklausa laišku");
  // Kaina nuo–iki ir likutis (adrese)
  await open(page, `${A}kvepalai?kaina=-25`);
  const under25 = cat.products.filter(p => Math.min(...p.sizes.map(s => s.price)) <= 25).length;
  check((await page.locator("#shopGrid .card").count()) === under25 && (await page.locator('#shopActive [data-unset="price"]').count()) === 1, `kaina iki 25 €: ${under25} kvapai, filtras matomas`);
  // Naujienlaiškis poraštėje
  await page.fill('#ftr input[name="email"]', "naujienos@example.com");
  await page.click("#ftr .newsField button");
  check(await until(async () => (await page.locator("#ftr .newsMsg").textContent()).includes("Ačiū")), "naujienlaiškis: prenumerata poraštėje");
  check(await until(() => sb.db.newsletter.some(r => r.email === "naujienos@example.com" && r.welcomed_at)), "naujienlaiškis: įrašyta ir išsiųstas pasisveikinimas");
  const tok = sb.db.newsletter.find(r => r.email === "naujienos@example.com")?.token;
  await open(page, `${A}naujienlaiskis?atsisakyti=${tok}`);
  check(await until(async () => (await page.locator("#newsUnsub").textContent()).includes("atsisakėte")), "naujienlaiškis: atsisakymas pagal nuorodą");
  await open(page, `${A}nera-tokio-puslapio`);
  check((await view(page)) === "404", "nežinomas adresas – „Puslapis nerastas“");
  await open(page, `${A}#/kvepalai/vanor`);
  await page.waitForTimeout(300);
  check(new URL(page.url()).pathname === "/kvepalai/vanor" && (await view(page)) === "product", "senas #/ adresas nukreipiamas");
  for (const [p, h] of [
    ["salygos", "Pirkimo sąlygos"],
    ["privatumas", "Privatumo politika"]
  ]) {
    await open(page, A + p);
    check((await page.locator("h1").first().textContent()).includes(h.split(" ")[0]), `${p}: puslapis`);
  }
  if (!mobile) {
    // Paieška antraštėje
    await open(page, A);
    await page.click("#searchBtn");
    await page.waitForSelector("#hdrSearch input:visible");
    check((await page.locator(".hdrSearch").evaluate(e => getComputedStyle(e).display)) === "flex", "kompiuteryje paieška – piktograma, laukas atsiveria paspaudus");
    await page.fill("#hdrQ", "vanor");
    await page.waitForSelector("#searchPop:not([hidden])");
    check((await page.locator("#searchPop").textContent()).includes("Vanor"), "antraštės paieška: pasiūlymai");
  }
  await page.context().close();

  // Variantas: išparduota, nuotraukos, atsiliepimai
  const v = await newPage(siteB, viewport, variant);
  await open(v.page, `${B}kvepalai/arven`);
  await v.page.waitForSelector("#productRoot [data-notify]");
  check(true, "išparduota – „Pranešti, kai bus“ vietoje „Į krepšelį“");
  await v.page.locator("#productRoot [data-notify]").first().click();
  await v.page.fill('#sheetBody input[name="email"]', "laukiu@example.com");
  await v.page.click("#sheetBody button[type=submit]");
  check(await until(() => v.sb.db.restock_requests.some(r => r.product_id === "arven" && r.email === "laukiu@example.com")), "„Pranešti, kai bus“ – įrašyta į duomenų bazę");
  await v.page.waitForSelector("#backdrop", { state: "hidden" });
  await open(v.page, `${B}kvepalai/vanor`);
  await v.page.waitForSelector("#productRoot .gal img");
  check((await v.page.locator("#productRoot .gal img").count()) === 3, "galerija: 3 nuotraukos");
  check(await until(async () => (await v.page.locator("[data-pd-reviews]").isVisible()) && (await v.page.locator("[data-pd-reviews]").textContent()).includes("Ona K.")), "kvapo atsiliepimai");
  await open(v.page, `${B}kvepalai`);
  const g = v.page.locator('#shopGrid .card:has(a[href="kvepalai/safrane"])');
  check((await g.locator(".cardPrice s").count()) === 1 && (await g.locator(".cardPrice .sale").count()) === 1 && (await g.locator(".salePill").count()) === 1, "akcija: perbraukta sena kaina, raudona kaina, žymė „Akcija“");
  check((await v.page.locator('#shopGrid .card:has(a[href="kvepalai/vanor"]) .cardRate .stars').count()) === 1, "kortelė: žvaigždutės iš tikrų atsiliepimų");
  await open(v.page, `${B}kvepalai/safrane`);
  check((await v.page.locator("#productRoot .pdPrice s").count()) === 1, "akcija kvapo puslapyje: sena kaina");
  await open(v.page, B);
  check(await until(() => v.page.locator("#homeReviews").isVisible()), "pradžia: atsiliepimai (kai yra tikrų)");
  const vs = await v.page.evaluate(() =>
    [...document.querySelectorAll("#homeHero .slide")].map(s => ({ t: s.querySelector(".heroTitle").textContent, href: s.getAttribute("href"), dark: s.classList.contains("onDark"), img: s.querySelector(".scenePic img")?.getAttribute("src") || "" }))
  );
  check(vs.length === 2 && vs[0].t === "Pirma išbandykite" && vs[1].t === "Ruduo" && vs[1].href === "vyrams" && vs[1].dark && vs[1].img === "og/home.jpg", "pradžia iš nustatymų: skaidrių eilė, nuotrauka, tekstai, paslėpta nerodoma");
  const vt = await v.page.locator("#homeTiles .tile").evaluateAll(a => a.map(x => `${x.getAttribute("href")}:${x.querySelector(".tileName").textContent}:${!!x.querySelector(".scenePic")}`));
  check(vt.length === 2 && vt[0] === "vyrams:Jam:true" && vt[1].startsWith("kategorija/vakarui:Vakarui:false"), "pradžia iš nustatymų: plytelės (nuotrauka, pavadinimas, kategorija)");
  await open(v.page, `${B}vyrams`);
  check((await v.page.locator("#shopHead.hasStage .scenePic img").getAttribute("src")) === "og/home.jpg", "grupės puslapyje – ta pati nuotrauka");
  await shot(v.page, `${tag}-variantas`);
  await v.page.context().close();
}

await run({ width: 430, height: 932 });
await run({ width: 360, height: 780 });
await run({ width: 1440, height: 900 });
await browser.close();
serverA.close();
serverB.close();
check(!errors.length, `be JS klaidų${errors.length ? `: ${errors.slice(0, 5).join(" | ")}` : ""}`);
console.log(failed ? `\n${failed} patikrinimai nepavyko` : "\nNaršyklės testai praėjo");
process.exit(failed ? 1 : 0);
