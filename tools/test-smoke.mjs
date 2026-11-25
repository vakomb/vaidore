// Parduotuvės naršyklės testas (Playwright), be interneto: node tools/test-smoke.mjs [--shots]
// Supabase (katalogas, „Pranešti, kai bus“, apmokėjimas, padėkos puslapis) imituojamas - tools/mock-supabase.mjs;
// Omniva paštomatai - tools/fixtures/omniva-sample.json. Surenkamos dvi kopijos į .verify/:
//   site          - tikras katalogas
//   site-variant  - išparduotas kvapas, nuotraukos ir atsiliepimai (funkcijoms, kurių tikrame kataloge dar nėra)
// Tikrina telefoną (430 × 932) ir kompiuterį (1440 × 900): pradžia, meniu, katalogas, paieška, filtrai, rūšiavimas,
// kvapo puslapis (tūris, mėginukas), mini krepšelis, atradimų rinkinys, „Rask savo kvapą“, krepšelis (kiekis, atšaukimas,
// paštomatas, dovanų pakavimas), apmokėjimas (siunčiami tik id / ml / kiekis), /aciu (kodas, krepšelis išvalytas),
// mėgstami, paskyros forma, informacija, 404, seni #/ adresai; SEO (JSON-LD, sitemap, robots); išparduota + „Pranešti,
// kai bus“, galerija, atsiliepimai; be JS klaidų. --shots - ekrano nuotraukos į .verify/shots/
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
// Pradžios puslapis iš nustatymų (administravimo „Pradžia“): 2 skaidrės (viena - su nuotrauka, tamsi), viena paslėpta;
// plytelės - Vyrams su nuotrauka ir kategorija „Vakarui“
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
// v28: aliejai (7) ir elektrinis difuzorius - susietos prekės („Aliejai šiam difuzoriui“, „Tinkamas elektrinis difuzorius“)
const OILS = variant.products.slice(0, 7).map((p, i) => ({
  ...structuredClone(p),
  id: `aliejus-${p.id}`,
  name: `Aromatinis aliejus ${p.name.toUpperCase()}`,
  type: "aliejai",
  sizes: [{ ml: 10, price: 4.99 }],
  attrs: { weeks: 4, forDiffuser: true },
  sample: 0,
  rank: 200 + i,
  badge: null,
  reviews: []
}));
const VDEVICE = {
  ...structuredClone(variant.products[0]),
  id: "el-difuzorius",
  name: "Elektrinis difuzorius AURA",
  type: "elektriniai-difuzoriai",
  inspired: "",
  notes: { top: [], heart: [], base: [] },
  sizes: [{ ml: 1, price: 39.9, unit: "vnt" }],
  attrs: { tank: 300, runtime: 10, light: "LED, 7 spalvos" },
  tagline: "Tylus difuzorius su LED apšvietimu",
  desc: "Elektrinis difuzorius AURA - tylus ir elegantiškas. Vanduo ir keli lašai aliejaus virsta švelnia migla visam kambariui.",
  sample: 0,
  rank: 190,
  badge: null,
  reviews: []
};
variant.products.push(...OILS, VDEVICE);
// v29: natų biblioteka (Vanilė, Šafranas), nuotaikos nuotrauka bendram kvapui VANOR, ilgas SAFRANE aprašymas („Skaityti daugiau“)
vp("vanor").scent = "vanor";
variant.scents = [{ id: "vanor", name: "Vanor", moodImage: "og/home.jpg", moodTitle: "Šiltas vakaras namuose", moodLine: "Kvapas, kuris lieka" }];
variant.noteMedia = [
  { name: "Vanilė", image: "img/kvapai/vanor-1.webp" },
  { name: "Šafranas", image: "img/kvapai/safrane-1.webp" }
];
vp("safrane").desc = [
  "Prabangus ir šiltas kvapas tiems, kurie mėgsta išsiskirti. Šafranas ir jazminas atsiveria švytinčiu blizgesiu, o ambra ir kedras suteikia kompozicijai gylio.",
  "Kvapas keičiasi visą dieną: ryte jis gaivus ir skaidrus, vakare - sodrus ir gaubiantis. Jis palieka švelnų pėdsaką ir ilgai išlieka ant drabužių.",
  "Puikiai tinka ypatingoms progoms, vakarienėms ir šventėms, kai norisi jaustis išskirtinai.",
  "Rekomenduojame pirmiausia išbandyti 2 ml mėginuką - taip suprasite, kaip kvapas atsiskleidžia būtent ant jūsų odos."
].join("\n");
// v30: duomenų bazės tekstai su ilgais brūkšniais ir minuso ženklu - parduotuvėje ir statiniuose puslapiuose rodomi su „-“
vp("safrane").desc = vp("safrane").desc.replace("Prabangus ir šiltas kvapas tiems", "Prabangus ir šiltas kvapas \u2013 tiems");
vp("safrane").tagline = "Šafranas \u2014 jazminas \u2212 ambra";
vp("safrane").inspired = "Maison Francis Kurkdjian \u2013 Baccarat Rouge 540";
fs.mkdirSync(verify, { recursive: true });
const variantFile = path.join(verify, "catalog-variant.json");
fs.writeFileSync(variantFile, JSON.stringify(variant));
// Pagrindinis testų katalogas = pradiniai kvepalai + vienas bandomasis difuzorius (tik testams; cat.products - kvepalai)
const DIF = {
  ...structuredClone(cat.products.find(p => p.id === "vanor")),
  id: "difuzorius-test",
  name: "Difuzorius TEST",
  type: "difuzoriai",
  sizes: [{ ml: 100, price: 19.99 }],
  sample: 0,
  rank: 99,
  badge: null
};
// v15: kvapni žvakė (svoris g, savybės) ir elektrinis difuzorius (be kvapo, „1 vnt.“); kvepalams - progos
const CANDLE = {
  ...structuredClone(cat.products.find(p => p.id === "vanor")),
  id: "kvapni-zvake-test",
  name: "Kvapni žvakė TEST",
  type: "zvakes",
  sizes: [{ ml: 180, price: 14.9, unit: "g" }],
  attrs: { burn: 40, wax: "Sojų vaškas" },
  sample: 0,
  rank: 98,
  badge: null
};
const DEVICE = {
  ...structuredClone(cat.products.find(p => p.id === "vanor")),
  id: "elektrinis-difuzorius-test",
  name: "Elektrinis difuzorius TEST",
  type: "elektriniai-difuzoriai",
  tagline: "Tylus aromato difuzorius su apšvietimu",
  notes: { top: [], heart: [], base: [] },
  inspired: "",
  sizes: [{ ml: 1, price: 29.9, unit: "vnt" }],
  attrs: { tank: 300, runtime: 10, power: "USB", light: "LED" },
  images: ["og/home.jpg"],
  sample: 0,
  rank: 97,
  badge: null
};
const shopCat = structuredClone(cat);
shopCat.products.push(DIF, CANDLE, DEVICE);
// Originalo nuotrauka (v18) - vienam kvapui (kitiems - prekės ženklo raidė)
shopCat.products.find(p => p.id === "vanor").inspiredImage = "img/kvapai/safrane-1.webp";
// Tas pats kvapas (scent): kvepalai VANOR, difuzorius ir žvakė - „Šis kvapas taip pat“
for (const p of shopCat.products) if (["vanor", DIF.id, CANDLE.id].includes(p.id)) p.scent = "vanor";
const shopFile = path.join(verify, "catalog-shop.json");
fs.writeFileSync(shopFile, JSON.stringify(shopCat));
const siteA = path.join(verify, "site");
const siteB = path.join(verify, "site-variant");
build(siteA, { CATALOG: shopFile });
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
check(rasaHtml.includes("<title>Vanor - Eau de Parfum | Vaidore</title>"), "SEO: kvapo pavadinimas <title>");
const sitemap = fs.readFileSync(path.join(siteA, "sitemap.xml"), "utf8");
check(cat.products.every(p => sitemap.includes(`/kvepalai/${p.id}<`)) && !sitemap.includes("/admin"), "sitemap.xml: visi kvapai, be administravimo");
check(
  sitemap.includes(`/difuzoriai/${DIF.id}<`) && sitemap.includes("/difuzoriai<") && !sitemap.includes("/aliejai<") && fs.existsSync(path.join(siteA, `difuzoriai/${DIF.id}.html`)),
  "SEO: difuzorius - /difuzoriai/<id>, sąrašas /difuzoriai (aliejų be prekių - nėra)"
);
check(fs.readFileSync(path.join(siteA, `difuzoriai/${DIF.id}.html`), "utf8").includes("<title>Difuzorius TEST - Namų kvapų difuzorius | Vaidore</title>"), "SEO: difuzoriaus <title> - be „Eau de Parfum“");
check(fs.readFileSync(path.join(siteA, "robots.txt"), "utf8").includes("Disallow: /admin"), "robots.txt: /admin neindeksuojamas");
check(fs.existsSync(path.join(siteA, "assets/admin.js")) && fs.statSync(path.join(siteA, "assets/admin.js")).size > 20000, "administravimo skydelis - atskiras failas");
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
  console.log(`\n- ${mobile ? "telefonas" : "kompiuteris"} ${viewport.width}×${viewport.height} -`);
  const { page, sb } = await newPage(siteA, viewport, shopCat);

  // Pradžia
  await open(page, A);
  await page.waitForSelector("#homeTiles a");
  const tileHrefs = await page.locator("#homeTiles .tile").evaluateAll(a => a.map(x => x.getAttribute("href")));
  check(tileHrefs.join() === "kvepalai,difuzoriai,zvakes,elektriniai-difuzoriai", `pradžia: kategorijos - su prekėmis (aliejų dar nėra - nerodoma): ${tileHrefs.join(", ")}`);
  check(
    await page.evaluate(() => {
      const t = [...document.querySelectorAll("#homeTiles .tile")];
      const arts = t.map(x => Math.round(x.querySelector(".tileArt").getBoundingClientRect().top - x.getBoundingClientRect().top));
      return t.every(x => x.querySelector(".tileName").scrollWidth <= x.querySelector(".tileName").clientWidth + 1) && new Set(arts).size === 1;
    }),
    "pradžia: ilgi kategorijų pavadinimai telpa, nuotraukos - vienoje linijoje"
  );
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
      return !!(tiles.compareDocumentPosition(rails) & Node.DOCUMENT_POSITION_FOLLOWING);
    }),
    "pradžia: „Produktai“ plytelės - virš „Kvapnios naujienos“"
  );
  check(
    await page.evaluate(() => {
      const sec = document.querySelector("#homeTilesSec");
      const gap = sec.getBoundingClientRect().top - document.querySelector("#homeHero").getBoundingClientRect().bottom;
      return !sec.querySelector(".band") && Math.abs(gap) < 1;
    }),
    "pradžia: kategorijos iškart po pagrindine nuotrauka, be antraštės „Produktai“"
  );
  if (mobile && viewport.width < 700) {
    const tl = await page.evaluate(() => {
      const t = [...document.querySelectorAll("#homeTiles .tile")].map(x => x.getBoundingClientRect());
      const a = document.querySelector("#homeTiles .tileArt").getBoundingClientRect();
      return { full: t.filter(r => r.left >= 0 && r.right <= innerWidth + 0.5).length, ratio: a.height / a.width };
    });
    check(tl.full === 2 && tl.ratio > 1 && tl.ratio < 1.15, `pradžia telefone: matomos 2 kategorijos (+ trečios dalis), beveik kvadratinės (${tl.full}, ${tl.ratio.toFixed(2)})`);
  }
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
  check(
    (await page.locator("#homeTiles .tile .tileName").first().evaluate(e => [Number(getComputedStyle(e).fontWeight) >= 600, getComputedStyle(e).textTransform, e.offsetHeight > 0].join())) === "true,uppercase,true",
    "plytelės: vientisa kortelė - pavadinimas po paveikslu (didžiosiomis, pusjuodis)"
  );
  check((await page.locator("#homeHero h1").count()) === 1, "pradžia: vienas h1");
  // v7: skaidrės ir kategorijos - scenos su Vaidore buteliukais be fono, kiekviena skaidrė - vienas veiksmas
  const heroInfo = await page.evaluate(() =>
    [...document.querySelectorAll("#homeHero .slide")].map(s => ({
      stage: !!s.querySelector(".stage"),
      bottles: [...s.querySelectorAll(".stage img")].map(i => i.getAttribute("src")),
      ctas: s.querySelectorAll(".heroCta").length
    }))
  );
  check(heroInfo.every(x => x.stage && x.bottles.length >= 2 && x.ctas === 1), "skaidrės: kiekviena - scena su buteliukais ir vienu veiksmu");
  check(heroInfo.flatMap(x => x.bottles).every(src => /^img\/(kvapai\/[a-z0-9-]+-1|meginukas)\.webp$/.test(src)), "skaidrės: tik buteliukai be fono (-1.webp) ir mėginukai");
  const firstLoaded = await until(() => page.evaluate(() => [...document.querySelectorAll("#homeHero .slide:first-child .stage img")].every(i => i.complete && i.naturalWidth > 0)));
  check(firstLoaded, "skaidrės: pirmos skaidrės buteliukai įsikėlė");
  check(
    await page.evaluate(() => [...document.querySelectorAll("#homeTiles .tile")].every(t => t.querySelector(".tileArt img"))),
    "kategorijos: kiekviena plytelė - su paveikslu (įkelta nuotrauka arba pirmos prekės nuotrauka)"
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
  // v7: spalvos - juoda vietoje mėlynos, krepšelio skaičiukas raudonas, VAIDORE - etiketės šriftu (SVG)
  check((await page.locator(".hdr .logo svg.wordmark").count()) === 1, "logotipas: VAIDORE kontūrai (etiketės šriftas)");
  const blue = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].filter(el => {
      const c = getComputedStyle(el);
      return [c.backgroundColor, c.color, c.borderTopColor].some(v => /rgba?\(\s*(40, 76, 162|53, 97, 196|28, 47, 94|59, 103, 204)\b/.test(v));
    }).length
  );
  check(blue === 0, `mėlynos spalvos nebėra (${blue})`);
  check(await page.locator("#homeReviews").isHidden(), "be tikrų atsiliepimų - atsiliepimų sekcijos nėra");
  check((await page.locator("#homeRails .card").count()) > 8, "pradžia: karuselės su kvapais");
  if (!mobile) {
    const nav = page.locator("#homeRails .railNav:not([hidden])").first();
    const before = await nav.locator(".railPage").textContent();
    await nav.locator('[data-rail-step="1"]').click();
    check(await until(async () => (await nav.locator(".railPage").textContent()) !== before), `karuselė: rodyklė „pirmyn“ (${before} → kitas puslapis)`);
  }
  check((await page.locator("#homeRails .card [data-fav]").count()) === 0, "pradžia: karuselių kortelėse širdelių nėra");
  // v31f: pavadinimas - juodoje juostoje, po ja paantraštė ir „Peržiūrėti viską“ (kiekviename skyriuje)
  const heads = await page.locator("#homeRails .hsec").evaluateAll(a =>
    a.map(s => [!!s.querySelector(".bandBox .band"), !!s.querySelector(".bandSub .bandLine"), !!s.querySelector(".bandSub .bandMore[href]"), getComputedStyle(s.querySelector(".bandSub")).backgroundColor !== getComputedStyle(s.querySelector(".band")).backgroundColor])
  );
  check(heads.length && heads.every(h => h.every(Boolean)), "pradžia: kiekviename skyriuje - juosta, paantraštė baltame fone ir „Peržiūrėti viską“");
  check((await page.locator("#homeRails .bandMore span").first().evaluate(el => getComputedStyle(el).animationName)) === "bandSweep", "pradžia: „Peržiūrėti viską“ - judantis pabraukimas");
  // v32c: nuotrauka → pavadinimas → originalas → kaina, vardas nekartojamas
  const top = await page.locator("#homeRails .rail .card").first().evaluate(c => [c.firstElementChild.classList.contains("art"), c.querySelectorAll(".cardName").length, c.querySelector(".cardHead").getBoundingClientRect().top >= c.querySelector(".art").getBoundingClientRect().bottom]);
  check(top[0] && top[1] === 1 && top[2], `pradžia: pavadinimas po nuotrauka (${top.join(", ")})`);
  const ri = await page.locator("#homeRails .rail .inspTxt").first().evaluate(el => [getComputedStyle(el.querySelector(".inspBrand")).display, parseFloat(getComputedStyle(el).fontSize)]);
  check(ri[0] === "inline" && ri[1] >= 16, `pradžia: originalas vienoje eilutėje, stambiau (${ri.join(", ")})`);
  // v32c: originalas - po pavadinimu, po nuotrauka, virš kainos; kaina - ryški; be viršutinės linijos; kortelės lygios
  const v32 = await page.locator("#homeRails .rail").first().evaluate(r => {
    const cards = [...r.children].slice(0, 3);
    const c = cards[0];
    const head = c.querySelector(".cardHead"), insp = head.querySelector(".cardInsp"), art = c.querySelector(".art");
    const price = c.querySelector(".cardPrice .money:not(s)");
    const sub = r.closest(".hsec").querySelector(".bandSub");
    const top = sel => new Set(cards.map(x => Math.round(x.querySelector(sel).getBoundingClientRect().top))).size;
    return {
      insp: !!insp && insp.getBoundingClientRect().top >= art.getBoundingClientRect().bottom && insp.getBoundingClientRect().bottom <= c.querySelector(".cardPrice").getBoundingClientRect().top && !c.querySelector(".cardTxt .cardInsp"),
      price: Number(getComputedStyle(price).fontWeight) >= 600 && parseFloat(getComputedStyle(price).fontSize) >= 20,
      lines: getComputedStyle(sub).borderTopWidth === "0px" && getComputedStyle(sub).borderBottomWidth === "1px",
      fonts: parseFloat(getComputedStyle(c.querySelector(".cardName")).fontSize) >= 21 && parseFloat(getComputedStyle(head.querySelector(".inspTxt")).fontSize) >= 17.5 && parseFloat(getComputedStyle(sub.querySelector(".bandLine")).fontSize) >= 18 && parseFloat(getComputedStyle(sub.querySelector(".bandMore")).fontSize) >= 18 && parseFloat(getComputedStyle(r.closest(".hsec").querySelector(".band")).fontSize) >= 22,
      gap: Math.round(sub.getBoundingClientRect().top - r.closest(".hsec").querySelector(".band").getBoundingClientRect().bottom),
      even: top(".art") === 1 && top(".cardName") === 1 && top(".cardPrice") === 1
    };
  });
  check(v32.insp && v32.price && v32.lines && v32.fonts && v32.gap === 0 && v32.even, `pradžia (v32c): po nuotrauka - pavadinimas, originalas, kaina; ryški kaina, be viršutinės linijos (apatinė lieka), stambūs šriftai, kortelės lygios (${JSON.stringify(v32)})`);
  if (mobile && viewport.width < 700) {
    // v21b: didelė kortelė (kaip parfumada.lt) ir kitos dalis dešinėje; rodyklės ir „1/N“
    const rail = page.locator("#homeRails .rail").first();
    const g = await rail.evaluate(r => {
      const rs = [...r.children].map(c => c.getBoundingClientRect());
      const full = rs.filter(x => x.left >= -0.5 && x.right <= innerWidth + 0.5).length;
      const part = rs.filter(x => x.left < innerWidth - 1 && x.right > innerWidth + 1).length;
      return { full, part, nav: getComputedStyle(r.closest(".railWrap").querySelector(".railNav")).display };
    });
    const cw = await rail.evaluate(r => r.children[0].getBoundingClientRect().width / innerWidth);
    check(g.full === 1 && g.part === 1 && g.nav !== "none" && cw > 0.7, `pradžios karuselė telefone: didelė kortelė (${Math.round(cw * 100)} %) ir kitos dalis, rodyklės (${g.full}+${g.part})`);
    const tp = await page.evaluate(() => [...document.querySelectorAll("#homeTiles .tile")].filter(t => { const x = t.getBoundingClientRect(); return x.left < innerWidth - 1 && x.right > innerWidth + 1; }).length);
    check(tp === 1 || (await page.locator("#homeTiles .tile").count()) <= 2, "pradžia telefone: matosi trečios kategorijos dalis");
    await rail.evaluate(r => r.scrollTo({ left: 0, behavior: "auto" }));
  }
  await shot(page, `${tag}-pradzia`);

  // Meniu → katalogas
  if (mobile) {
    await page.click("#menuBtn");
    await page.waitForSelector("#drawerWrap:not([hidden]) #drawer a[href='moterims']");
    check(
      (await page.locator("#drawer .mAcct").isVisible()) && (await page.locator("#drawer .mGroup").count()) >= 3 && (await page.locator("#drawer .mHead").allTextContents()).join("|").includes("Pagalba"),
      "☰ meniu - kaip iOS: paskyros kortelė, sugrupuoti sąrašai, „Pagalba“"
    );
    check((await page.locator("#drawer a.mRow[href='visos-prekes']").count()) === 1, "☰ meniu: „Visos prekės“ - pirmoje grupėje");
    await page.click("#drawer a[href='moterims']");
  } else {
    await page.click("#megaBtn");
    await page.click('#mega a[href="moterims"]');
  }
  await page.waitForURL(/\/moterims$/);
  check((await page.locator("#shopTitle").textContent()) === "Kvepalai moterims", "meniu → „Moterims“");
  // v20: unisex kvapai - ir „Moterims“, ir „Vyrams“
  const women = cat.products.filter(p => p.gender === "moterims" || p.gender === "unisex").length;
  check((await page.locator("#shopGrid .card").count()) === women, `moterims: ${women} kvapai (su unisex)`);
  const uni = cat.products.find(p => p.gender === "unisex");
  check((await page.locator(`#shopGrid .card a[href$="/${uni.id}"], #shopGrid .card a[href$="${uni.id}"]`).count()) >= 1, "unisex kvapas - tarp „Moterims“");
  await open(page, `${A}kvepalai`);
  await page.waitForSelector("#shopGrid .card");
  check((await page.locator("#shopCount").textContent()).includes(String(cat.products.length)), `katalogas: ${cat.products.length} kvapų`);
  // Originalas (v18): kortelėje vietoj natų - nuotrauka (arba raidė) ir pavadinimas; kortelių aukštis vienodas
  const insp = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#shopGrid .card")];
    const v = document.querySelector('#shopGrid .card:has(a[href="kvepalai/vanor"]) .insp');
    const tops = new Map();
    for (const c of cards) {
      const t = Math.round(c.getBoundingClientRect().top);
      tops.set(t, [...(tops.get(t) || []), Math.round(c.getBoundingClientRect().height)]);
    }
    return {
      notes: document.querySelectorAll("#shopGrid .cardNotes").length,
      blocks: document.querySelectorAll("#shopGrid .cardInsp .insp").length,
      img: !!v?.querySelector(".inspPh img[src*='safrane']"),
      brand: v?.querySelector(".inspBrand")?.textContent,
      name: v?.querySelector(".inspName")?.textContent,
      letters: document.querySelectorAll("#shopGrid .inspL").length,
      even: [...tops.values()].every(h => Math.max(...h) - Math.min(...h) <= 1),
      h: Math.round(v?.getBoundingClientRect().height || 0),
      over: document.documentElement.scrollWidth - innerWidth
    };
  });
  check(
    insp.notes === 0 && insp.blocks >= 8 && insp.img && insp.brand === "Tom Ford" && insp.name === "Tobacco Vanille" && insp.letters >= 1 && insp.even && insp.h <= 46 && insp.over <= 0,
    `kortelės: vietoj natų - originalo blokelis (nuotrauka / raidė, „Tom Ford“ + „Tobacco Vanille“, ${insp.h} px), kortelės lygios`
  );
  check((await page.locator(`#shopGrid a[href*="${DIF.id}"]`).count()) === 0, "kvepalų puslapyje - tik kvepalai (be difuzoriaus)");
  // Difuzoriai: savas puslapis, be lyties / koncentracijos / mėginukų filtrų; prekės puslapis - be mėginuko ir „Kam skirti“
  await open(page, `${A}difuzoriai`);
  await page.waitForSelector("#shopGrid .card");
  check(
    (await page.locator("#shopTitle").textContent()) === "Difuzoriai" && (await page.locator("#shopGrid .card").count()) === 1 && (await page.locator(`#shopGrid a[href="difuzoriai/${DIF.id}"]`).count()) >= 1,
    "/difuzoriai - tik difuzoriai, nuoroda difuzoriai/<id>"
  );
  check(!(await page.locator("#shopFilters").textContent()).match(/Pagal lytį|Koncentracija|Mėginukai 2 ml/), "difuzorių filtruose - be lyties, koncentracijos ir mėginukų");
  await open(page, `${A}kvepalai/${DIF.id}`);
  await page.waitForSelector("#productRoot .sizeOpt");
  check(page.url().endsWith(`/difuzoriai/${DIF.id}`), "senas adresas kvepalai/<difuzorius> - pataisomas į difuzoriai/<id>");
  check(
    (await page.locator("#productRoot .sizeOpt").allTextContents()).join().replace(/\u00a0/g, " ") === "100 ml" &&
      !(await page.locator("#productRoot .acc summary").allTextContents()).includes("Kam skirti") &&
      (await page.title()).includes("Namų kvapų difuzorius"),
    "difuzoriaus puslapis: tik 100 ml (be mėginuko), be „Kam skirti“, be „Eau de Parfum“"
  );
  // v29: difuzoriaus su lazdelėmis turinys - paantraštė, natos (v30c - visos: viršutinės, širdies, bazinės), žingsniai, „Kur pastatyti“, pastaba
  check(
    (await page.locator("#productRoot .pdSub").textContent()) === "Namų kvapas su lazdelėmis" &&
      (await page.locator("#productRoot .pbNotes .pbT").textContent()) === "Kvapo natos" &&
      (await page.locator("#productRoot .pbNotes .ntPanel.on .nt").count()) >= 1 &&
      (await page.locator("#productRoot .pbSteps .useStep").count()) === 3 &&
      (await page.locator("#productRoot .pbSteps .pbT").textContent()) === "Kaip naudoti" &&
      (await page.locator("#productRoot .pbWhere .pbT").textContent()) === "Kur pastatyti" &&
      (await page.locator("#productRoot .pbWhere .icoGrid li").count()) === 6 &&
      (await page.locator("#productRoot .pdNotice").count()) === 1 &&
      (await page.locator("#productRoot .pbTraits, #productRoot .pdTry").count()) === 0,
    "difuzoriaus puslapis: natos, „Kaip naudoti“ (3), „Kur pastatyti“ (6), pastaba; be kvepalų blokų (v29)"
  );
  // v30b: natos - tikros ingredientų nuotraukos (iškirptos iš Vaidore produktų nuotraukų), visos skirtingos
  const mainSrc = await page.locator("#productRoot .pbNotes .ntArt img").evaluateAll(a => a.map(i => i.getAttribute("src")));
  check(mainSrc.length >= 2 && new Set(mainSrc).size === mainSrc.length && mainSrc.every(x => x.startsWith("img/natos/")), "v30b: natos - su skirtingomis tikromis nuotraukomis");
  check(
    await page.evaluate(() => {
      const st = document.querySelector("#productRoot .useSteps");
      const wide = innerWidth >= 700;
      return wide ? st.scrollWidth <= st.clientWidth + 1 : getComputedStyle(st).overflowX === "auto" && st.scrollWidth > st.clientWidth && document.documentElement.scrollWidth <= innerWidth;
    }),
    "žingsniai: telefone - slenkama eilė (be puslapio horizontalaus slinkimo), plačiau - stulpeliais"
  );
  // v15: žvakė - svoris g ir savybės; elektrinis difuzorius - be talpos ir kvapo, savybės atskleistos
  // v27: „Visos prekės“ - visi tipai viename sąraše, filtras „Kategorija“ (?tipas=)
  await open(page, `${A}visos-prekes`);
  await page.waitForSelector("#shopGrid .card");
  const allN = shopCat.products.filter(p => p.visible !== false).length;
  check(
    (await page.locator("#shopTitle").textContent()) === "Visos prekės" && (await page.locator("#shopGrid .card").count()) === Math.min(allN, 24) && /prek/.test(await page.locator("#shopCount").textContent()),
    `„Visos prekės“: ${allN} prekės (kvepalai, difuzoriai, žvakės…)`
  );
  await open(page, `${A}visos-prekes?tipas=zvakes`);
  await page.waitForSelector("#shopGrid .card");
  check((await page.locator("#shopGrid .card").count()) === shopCat.products.filter(p => p.type === "zvakes").length, "„Visos prekės“: filtras „Kategorija“ - tik žvakės");
  await open(page, `${A}zvakes`);
  await page.waitForSelector("#shopGrid .card");
  check((await page.locator("#shopGrid .card .inspPh img").count()) >= 1, "originalo nuotrauka - ir žvakei be savos nuotraukos (iš to paties originalo kvepalų)");
  await open(page, `${A}zvakes/${CANDLE.id}`);
  await page.waitForSelector("#productRoot .sizeOpt");
  const accTitles = async () => (await page.locator("#productRoot .acc summary").allTextContents()).map(t => t.trim());
  check(
    (await page.locator("#productRoot .sizeOpt").allTextContents()).join().replace(/\u00a0/g, " ") === "180 g" &&
      (await page.locator("#productRoot .pdLabel").first().textContent()) === "Svoris" &&
      (await page.locator("#productRoot .pdSpecs").textContent()).includes("Sojų vaškas") &&
      /40\s*val\./.test(await page.locator("#productRoot .pdSpecs").textContent()) &&
      !(await accTitles()).includes("Savybės"),
    "žvakės puslapis: svoris 180 g, savybės kortelėmis (degimo trukmė, vaškas)"
  );
  check(
    (await page.locator("#productRoot .pdSub").textContent()) === "Kvapni žvakė namams" &&
      (await page.locator("#productRoot .pdForms .pdLabel").textContent()) === "Tas pats kvapas kitomis formomis" &&
      (await page.locator("#productRoot .formRow").count()) === 2 &&
      (await page.locator('#productRoot .formRow a.formLink[href="kvepalai/vanor"]').count()) === 1 &&
      (await page.locator("#productRoot .formRow .formLink .art img, #productRoot .formRow .formLink .art svg").count()) === 2,
    "žvakės puslapis: paantraštė (v29); „Tas pats kvapas kitomis formomis“ - 2 prekės su nuotraukomis (v25)"
  );
  // v29b: žvakės turinys - pagrindinės natos (pirmiausia su tikromis nuotraukomis), priežiūros žingsniai, saugos pastaba, kvapo linija
  check(
    (await page.locator("#productRoot .pbNotes .nt").count()) >= 3 &&
      (await page.locator("#productRoot .pbNotes .nt .ntArt img").count()) >= 2 &&
      (await page.locator("#productRoot .pbSteps .pbT").textContent()) === "Pirmasis uždegimas ir priežiūra" &&
      (await page.locator("#productRoot .pbSteps .useStep").count()) === 3 &&
      (await page.locator("#productRoot .pbWhere").count()) === 0 &&
      /be priežiūros/.test(await page.locator("#productRoot .pdNotice").textContent()) &&
      (await page.locator("#productRoot .pdMood.isLine .mlItem").count()) === 3 &&
      (await page.locator('#productRoot .pdMood.isLine .mlItem[aria-current="page"]').count()) === 1,
    "žvakės puslapis: natos su tikromis nuotraukomis, „Pirmasis uždegimas ir priežiūra“, saugos pastaba, kvapo linija (v29b)"
  );
  // „+“ prie kitos formos - iškart į krepšelį (numatyta talpa)
  const cartBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("vaidore_cart_v1") || "[]").length);
  await page.locator('#productRoot [data-form-add="vanor"]').click();
  check(
    await until(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem("vaidore_cart_v1") || "[]").some(l => l.id === "vanor" && l.ml === 33))) && cartBefore >= 0),
    "„+“ prie kitos formos - į krepšelį (VANOR 33 ml)"
  );
  await page.evaluate(() => localStorage.setItem("vaidore_cart_v1", "[]"));
  await page.keyboard.press("Escape");
  await open(page, `${A}elektriniai-difuzoriai/${DEVICE.id}`);
  await page.waitForSelector("#productRoot [data-add]");
  check(
    (await page.locator("#productRoot .sizes").count()) === 0 &&
      !(await accTitles()).includes("Natos") &&
      (await page.locator("#productRoot .pdSpecs").textContent()).includes("300") &&
      !/Maitinimas|Plotas/.test(await page.locator("#productRoot .pdSpecs").textContent()) &&
      (await page.locator("#productRoot .pdTag").textContent()).includes("Tylus") && (await page.locator("#productRoot .pdKey").count()) === 0,
    "elektrinio difuzoriaus puslapis: be talpos ir natų, savybės kortelėmis po kaina (be maitinimo ir ploto)"
  );
  check(
    (await page.locator("#productRoot .pdSub").textContent()) === "Aromato difuzorius namams" &&
      (await page.locator("#productRoot .pbNotes, #productRoot .pdMood").count()) === 0 &&
      (await page.locator("#productRoot .pbSteps .pbT").textContent()) === "Kaip veikia" &&
      (await page.locator("#productRoot .pbWhere .icoL").allTextContents()).join() === "Svetainė,Miegamasis,Darbo kambarys,Biuras" &&
      (await page.locator("#productRoot .pdNotice b").textContent()) === "Priežiūra.",
    "elektrinio difuzoriaus puslapis: „Kaip veikia“, „Kur naudoti“, priežiūra; be natų ir kvapo linijos (v29b)"
  );
  // Nuotrauka su fonu (JPEG) - be šešėlio (kitaip šonuose pilkos juostos), permatoma (WebP) - su šešėliu
  check((await page.locator("#productRoot .gal img").evaluate(el => el.classList.contains("flat") && getComputedStyle(el).filter)) === "none", "JPEG nuotrauka prekės puslapyje - be šešėlio (be juostų šonuose)");
  await open(page, `${A}elektriniai-difuzoriai`);
  await page.waitForSelector("#shopGrid .card");
  check((await page.locator("#shopGrid .art img.photo").first().evaluate(el => el.classList.contains("flat") && getComputedStyle(el).filter)) === "none", "JPEG nuotrauka kortelėje - be šešėlio");
  check(!(await page.locator("#shopFilters").textContent()).match(/Natos|Kvapo pobūdis|Sezonas|Pagal lytį/), "elektrinių difuzorių filtruose - be kvapo filtrų");
  // v19: „Kada tinka“ nebėra - seni ?proga= / ?laikas= / ?sezonas= adresai nieko nefiltruoja
  await open(page, `${A}kvepalai?proga=kasdien&laikas=vakaras&sezonas=vasara`);
  await page.waitForSelector("#shopGrid .card");
  const perfN = cat.products.filter(p => (p.type || "kvepalai") === "kvepalai").length;
  check(
    (await page.locator("#shopGrid .card").count()) === Math.min(perfN, 24) &&
      !/Proga|Paros laikas|Sezonas/.test(await page.locator("#shopFilters").textContent()) &&
      (await page.locator("#shopFilters").textContent()).includes("Originalo kvapas"),
    "kvepalų filtrai: be „Proga“, „Paros laikas“, „Sezonas“; seni adresai nefiltruoja; yra „Originalo kvapas“"
  );
  await open(page, `${A}kvepalai`);
  await page.waitForSelector("#shopGrid .card");
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
  check((await page.locator("#shopGrid .card [data-fav]").count()) === 0, "katalogo kortelėse širdelių nėra (v22)");
  const perfArt = await page.locator("#shopGrid .art.isPerf img.photo").first().evaluate(el => [getComputedStyle(el.parentElement).aspectRatio, getComputedStyle(el).transform, getComputedStyle(el).transformOrigin.split(" ")[1]].join("|")).catch(() => "nėra");
  check(perfArt === "nėra" || /^0\.8|^4 \/ 5/.test(perfArt.split("|")[0]) && perfArt.includes("1.06") && perfArt.endsWith("|0px"), `katalogas: kvepalų nuotrauka - to paties dydžio, kamštelis nenukerpamas (${perfArt})`);

  // Kvapo puslapis
  const vanor = cat.products.find(p => p.id === "vanor");
  await open(page, `${A}kvepalai/vanor`);
  await page.waitForSelector("#productRoot h1");
  check((await page.locator("#productRoot h1").textContent()).includes("Vanor"), "kvapo puslapis: pavadinimas");
  const ord = await page.evaluate(() => ["pdPrice", "pdBuy", "pdDesc"].map(c => document.querySelector(`#productRoot .${c}`).getBoundingClientRect().top));
  check(ord[0] < ord[1] && ord[1] < ord[2], "kvapo puslapis: kaina ir „Į krepšelį“ - prieš aprašymą (v23)");
  const eta = await page.locator("#productRoot .pdBuy [data-add] .addEta").textContent();
  check(/^Pristatysime per \d+(-\d+)?\s?d\.\s?d\.$/.test(eta.replace(/\u00a0/g, " ").replace(/\u2060/g, "")) && (await page.locator("#productRoot .pdBuy [data-add] .liveDot").count()) === 1 && (await page.locator("#productRoot .pdShip").count()) === 0, `„Įdėti į krepšelį“ - su pristatymo laiku (${eta}), be teksto po mygtuku (v25)`);
  const fl = await page.locator("#productRoot .pdForms .pdLabel").textContent().catch(() => "");
  check(fl === "Šis kvapas jūsų namams", `kvepalų puslapyje - „Šis kvapas jūsų namams“ (${fl})`);
  await page.locator("#productRoot .pdActs [data-fav]").click();
  check(await until(async () => (await page.locator('[data-badge="fav"]').first().textContent()) === "1"), "širdelė kvapo puslapyje → mėgstami (1)");
  check(
    await page.evaluate(() => {
      const ins = document.querySelector("#productRoot .pdInsp");
      const t = ins.querySelector(".inspTxt"), r = ins.getBoundingClientRect(), g = document.querySelector("#productRoot .pdGal").getBoundingClientRect();
      const one = innerWidth >= 1024 || r.top >= g.bottom - 1;
      return (
        !!ins.querySelector(".insp-pd .inspPh img") &&
        ins.querySelector(".inspBrand").textContent === "Tom Ford" &&
        getComputedStyle(ins.querySelector(".inspBrand")).display === "inline" &&
        parseFloat(getComputedStyle(t).fontSize) >= 18 &&
        ins.querySelector(".inspPh").getBoundingClientRect().width === 52 &&
        r.height <= 60 &&
        one &&
        r.top < document.querySelector("#productRoot .pdPrice").getBoundingClientRect().top
      );
    }),
    "kvapo puslapis: originalas vienoje eilutėje, stambiau, po nuotrauka, prieš kainą (v24)"
  );
  check(
    (await page.locator("#productRoot .sizeOpt").allTextContents()).join().replace(/\u00a0/g, " ") === "33 ml,100 ml,2 ml mėginukas",
    "kvapo puslapis: talpos - tik 33 ml, 100 ml ir 2 ml mėginukas"
  );
  const accs = (await page.locator("#productRoot .acc summary").allTextContents()).map(t => t.trim());
  check(
    !accs.some(t => /Savybės|Panaudojimo/.test(t)) && accs[0] === "Kam skirti" && !accs.includes("Natos") && (await page.locator("#productRoot .pdStory .pdAccs .acc").count()) === accs.length,
    `kvapo puslapis: išskleidžiamos dalys - turinio pabaigoje, natos - bloke, ne dalyje (${accs.join(", ")})`
  );
  const who = await page.locator("#productRoot .acc").first().locator("li").allTextContents();
  check(who.length === 2 && !/Tiks|tinka|dienai|vakarui|kasdien|darbui|pavasar|vasar|rudeni|žiem|metų laik|Proga/i.test(who.join()), `„Kam skirti“ - tik lytis ir šeima, be „kada tinka“ (${who.join(" · ")})`);
  // v29: paantraštė, aprašymas su paryškinimais, turinio blokai pagal kategoriją
  check((await page.locator("#productRoot .pdSub").textContent()) === "Eau de Parfum · Unisex", "kvapo puslapis: paantraštė „Eau de Parfum · Unisex“ (v29)");
  const bolds = await page.locator("#productRoot .pdText b").allTextContents();
  check(
    bolds[0] === vanor.name && bolds.some(b => /^tabako lapai$/i.test(b)) && bolds.some(b => /^vanil/i.test(b)) && new Set(bolds.map(b => b.toLowerCase())).size === bolds.length,
    `aprašymas: pavadinimas ir natos paryškinti, kiekviena - vieną kartą (${bolds.join(", ")})`
  );
  check(
    (await page.locator("#productRoot .pbNotes .pbT").textContent()) === "Kvapo natos" &&
      (await page.locator("#productRoot .pbTraits .trBar").first().locator("i.on").count()) === vanor.longevity &&
      (await page.locator("#productRoot .pbWhere .pbT").textContent()) === "Kur purkšti" &&
      (await page.locator("#productRoot .pbWhere .icoL").allTextContents()).join() === "Riešai,Kaklas,Už ausų,Drabužiai" &&
      (await page.locator("#productRoot .pbSteps").count()) === 0 &&
      (await page.locator("#productRoot .pdNotice").count()) === 1 &&
      (await page.evaluate(() => document.querySelector("#productRoot .pdStory").getBoundingClientRect().top > document.querySelector("#productRoot .pdBuy").getBoundingClientRect().bottom)),
    "kvapo puslapis: natos, charakteris, „Kur purkšti“, pastaba - po pirkimu; be „Kaip naudoti“ (v29)"
  );
  const seg = page.locator("#productRoot .ntSeg");
  const onNotes = () => page.locator("#productRoot .ntPanel.on .nt b").allTextContents();
  check((await seg.locator("[role=tab]").allTextContents()).join() === "Viršutinės,Širdies,Bazinės" && (await onNotes()).join() === vanor.notes.top.join(), "natos: segmentai Viršutinės · Širdies · Bazinės, pradžioje - viršutinės");
  const panelsH = () => page.locator("#productRoot .ntPanels").evaluate(el => el.getBoundingClientRect().height);
  const h0 = await panelsH();
  await seg.locator("[role=tab]").nth(1).click();
  check(
    (await until(async () => (await onNotes()).join() === vanor.notes.heart.join())) && (await seg.locator('[aria-selected="true"]').textContent()) === "Širdies" && Math.abs((await panelsH()) - h0) < 1,
    "natos: „Širdies“ - širdies natos, bloko aukštis nesikeičia (niekas nešokinėja)"
  );
  await page.keyboard.press("ArrowRight");
  check((await seg.locator('[aria-selected="true"]').textContent()) === "Bazinės" && (await onNotes()).join() === vanor.notes.base.join(), "natos: klaviatūra (→) - „Bazinės“");
  check(
    (await page.locator("#productRoot .ntPanel.on .nt:has-text('Mediena') .ntArt img").getAttribute("src")) === "img/natos/medienos-natos.webp" &&
      (await page.locator("#productRoot .ntPanel.on .nt:has-text('Džiovinti vaisiai') .ntArt img").getAttribute("src")) === "img/natos/dziovinti-vaisiai.webp" &&
      (await page.locator("#productRoot .ntPanel .nt:has-text('Imbieras') .ntArt img").getAttribute("src")) === "img/natos/imbieras.webp" &&
      (await page.locator("#productRoot .ntPanel .nt:has-text('Tabako žiedai') .ntArt img").getAttribute("src")) === "img/natos/tabako-ziedai.webp",
    "natos: ingredientų nuotraukos iš numatytosios bibliotekos (v30b, v31e)"
  );
  // Kvapo linija - tikros to paties kvapo produktų nuotraukos (be įkeltos nuotaikos nuotraukos)
  check(
    (await page.locator("#productRoot .pdMood.isLine .mlItem img").count()) === 3 &&
      (await page.locator('#productRoot .pdMood.isLine a.mlItem[href="difuzoriai/difuzorius-test"]').count()) === 1 &&
      (await page.locator("#productRoot .pdMood.isLine figcaption span").textContent()) === "Kvepalai · Difuzorius · Žvakė",
    "kvapo linija: tikros kvepalų, difuzoriaus ir žvakės nuotraukos, nuorodos į prekes (v29)"
  );
  await page.locator("#productRoot [data-try-sample]").click();
  check(
    (await until(async () => (await page.locator(`#productRoot .sizeOpt[data-ml="2"]`).getAttribute("aria-checked")) === "true")) &&
      money(await page.locator("#productRoot .pdPrice [data-buy-price]").textContent()) === eur(vanor.sample),
    "mėginuko kortelė → pasirinktas 2 ml mėginukas, kaina atnaujinta (v29)"
  );
  if (viewport.width >= 1024) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const geo = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      return { gal: r("#productRoot .pdGal"), h1: r("#productRoot .pdH1"), buy: r("#productRoot [data-buy-anchor]"), desc: r("#productRoot .pdDesc"), bar: document.querySelector("#buyBar").classList.contains("show") };
    });
    check(geo.h1.left > geo.gal.right && geo.buy.top < geo.desc.top && geo.buy.bottom < 900 && !geo.bar, "kompiuteryje - pavadinimas ir „Į krepšelį“ dešinėje šalia nuotraukos, matomi be slinkimo; aprašymas - žemiau");
    await page.evaluate(() => window.scrollTo(0, 1100));
    await page.waitForTimeout(400);
    const bar = await page.evaluate(() => {
      const b = document.querySelector("#buyBar");
      return { show: b.classList.contains("show"), thumb: !!b.querySelector(".bbThumb img, .bbThumb svg"), qty: getComputedStyle(b.querySelector(".bbQty")).display !== "none" };
    });
    check(bar.show && bar.thumb && bar.qty, "kompiuteryje - nuslinkus žemiau „Į krepšelį“ - prilipusi pirkimo juosta su nuotrauka ir kiekiu");
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const s30 = vanor.sizes[0];
  await page.click(`#productRoot .sizeOpt[data-ml="${s30.ml}"]`);
  check(money(await page.locator("#buyBar [data-buy-price]").textContent()) === eur(s30.price), `tūris ${s30.ml} ml - kaina ${s30.price} €`);
  await page.locator("#productRoot [data-add]").first().click();
  await page.waitForSelector("#miniWrap:not([hidden])");
  check((await cartBadge(page)) === "1", "„Į krepšelį“ → mini krepšelis, skaičiukas 1");
  check(
    (await page.locator('#cartBtn [data-badge="cart"]').evaluate(b => getComputedStyle(b).backgroundColor)) === "rgb(209, 16, 43)",
    "krepšelio skaičiukas - raudonas"
  );
  await shot(page, `${tag}-mini`);
  await page.locator("#mini [data-sheet-close]").first().click();
  await page.waitForTimeout(350);
  await page.click('#productRoot .sizeOpt[data-ml="2"]');
  check(money(await page.locator("#buyBar [data-buy-price]").textContent()) === eur(vanor.sample), "mėginukas 2 ml - kaina");
  await page.click('#productRoot .pdBuy [data-qty-step="1"]');
  check((await page.locator("#productRoot .pdBuy [data-qty]").textContent()) === "2", "kiekis kvapo puslapyje: 2");
  await page.locator("#productRoot [data-add]").first().click();
  await page.waitForSelector("#miniWrap:not([hidden])");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  check((await cartBadge(page)) === "3", "2 mėginukai pridėti (3)");
  check((await page.locator("#productRoot .pdBuy [data-qty]").textContent()) === "1", "kiekis po įdėjimo - vėl 1");
  check(
    (await page.locator("#productRoot .acc").count()) === (vanor.ingredients ? 3 : 2) && (await page.locator("#productRoot .acc[open]").count()) === 0,
    "kvapo puslapis: išskleidžiamos dalys - Kam skirti, (Ingredientai), Pristatymas"
  );

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
  check(await until(async () => (await page.locator("#cartRoot [data-line]").count()) === 2), "kiekis 0 - eilutė pašalinta");
  await page.locator(".toast button", { hasText: "Atšaukti" }).click();
  check(await until(async () => (await page.locator("#cartRoot [data-line]").count()) === 3), "„Atšaukti“ - eilutė grąžinta");
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
  check(await page.locator('#cartBtn [data-badge="cart"]').isHidden(), "grįžus - krepšelis tuščias");

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
  check((await view(page)) === "shop" && (await page.locator("#shopGrid").textContent()).includes("nuolaidų nėra"), "/nuolaidos: be nuolaidų - aiškus pranešimas");
  await open(page, `${A}atsiliepimai`);
  check((await view(page)) === "info" && (await page.locator("#infoRoot h1").textContent()) === "Atsiliepimai", "/atsiliepimai");
  await open(page, `${A}verslui`);
  check((await view(page)) === "info" && (await page.locator('#infoRoot a[href^="mailto:"]').count()) >= 1, "/verslui: užklausa laišku");
  // Kaina nuo-iki ir likutis (adrese)
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
  check((await view(page)) === "404", "nežinomas adresas - „Puslapis nerastas“");
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
    check(
      (await page.locator("#hdrSearch input").isVisible()) && !(await page.locator("#menuBtn").isVisible()) && !(await page.locator("#searchBtn").isVisible()) && (await page.locator(".hdrTools .iconLbl:visible").count()) === 3,
      "kompiuteryje: paieškos laukas visada matomas, be ☰; Paskyra · Mėgstami · Krepšelis su užrašais"
    );
    // v26: ≥ 1024 px header'is ir meniu juosta neprilipę, balta eilutė - 68 px; mažiau - prilipę
    const hd = await page.evaluate(() => ({ pos: getComputedStyle(document.querySelector("#hdr")).position, h: document.querySelector(".hdrIn").getBoundingClientRect().height, w: innerWidth }));
    check(hd.w >= 1024 ? hd.pos !== "sticky" && hd.h <= 70 : hd.pos === "sticky", `header'is: ${hd.w >= 1024 ? "kompiuteryje neprilipęs, žemesnis" : "planšetėje prilipęs"} (${hd.pos}, ${Math.round(hd.h)} px)`);
    await page.click("#hdrQ");
    await page.fill("#hdrQ", "vanor");
    await page.waitForSelector("#searchPop:not([hidden])");
    check((await page.locator("#searchPop").textContent()).includes("Vanor"), "antraštės paieška: pasiūlymai");
  }
  await page.context().close();

  // Variantas: išparduota, nuotraukos, atsiliepimai
  const v = await newPage(siteB, viewport, variant);
  // v28: elektrinio difuzoriaus puslapyje - savybės kortelėmis ir „Aliejai šiam difuzoriui“ (5 + „Rodyti dar 2“)
  await open(v.page, `${B}elektriniai-difuzoriai/el-difuzorius`);
  await v.page.waitForSelector("#productRoot .pdForms");
  const oilSec = v.page.locator("#productRoot .pdForms").filter({ hasText: "Aliejai šiam difuzoriui" });
  check(
    (await v.page.locator("#productRoot .pdSpecs li").allTextContents()).join("|").replace(/\u00a0/g, " ").startsWith("300 ml") &&
      (await oilSec.locator(".formRow:visible").count()) === 5 &&
      (await oilSec.locator("[data-more-forms]").textContent()).includes("Rodyti dar 2"),
    "elektrinis difuzorius: savybės kortelėmis; „Aliejai šiam difuzoriui“ - 5 ir „Rodyti dar 2“"
  );
  // v29: aprašymas prasideda pavadinimu - pavadinimas paryškinamas aprašyme ir nekartojamas
  const devTxt = (await v.page.locator("#productRoot .pdText").textContent()).replace(/\u00a0|\u2060/g, " ");
  check(
    (await v.page.locator("#productRoot .pdTag b").first().textContent()) === "Elektrinis difuzorius AURA" && devTxt.split("Elektrinis difuzorius AURA").length === 2,
    "aprašymas, prasidedantis pavadinimu: pavadinimas paryškintas ir nekartojamas"
  );
  await oilSec.locator("[data-more-forms]").click();
  check((await oilSec.locator(".formRow:visible").count()) === 7 && (await oilSec.locator("[data-more-forms]").count()) === 0, "„Rodyti dar“ - išskleidžia visus 7 aliejus");
  check(/·\s*10\s*ml/.test(await oilSec.locator(".formRow small").first().textContent()), "aliejaus eilutėje - originalas ir talpa");
  // Aliejaus puslapyje - „Tinkamas elektrinis difuzorius“
  await open(v.page, `${B}aliejai/${OILS[0].id}`);
  await v.page.waitForSelector("#productRoot .pdForms");
  check(
    (await v.page.locator("#productRoot .pdForms .pdLabel").first().textContent()) === "Tinkamas elektrinis difuzorius" &&
      (await v.page.locator('#productRoot .formRow a[href="elektriniai-difuzoriai/el-difuzorius"]').count()) === 1,
    "aliejaus puslapyje - „Tinkamas elektrinis difuzorius“"
  );
  // v28b: „Tinka elektriniams difuzoriams“ - viena eilutė su varnele (ne kortelė), savybių kortelės - atskirai
  const fit = v.page.locator("#productRoot .pdFit");
  check(
    (await fit.textContent()) === "Tinka elektriniams difuzoriams" &&
      (await fit.evaluate(el => el.getBoundingClientRect().height)) < 40 &&
      !(await v.page.locator("#productRoot .pdSpecs").textContent()).includes("Tinka"),
    "aliejus: „Tinka elektriniams difuzoriams“ - vienoje eilutėje"
  );
  check(
    (await v.page.locator("#productRoot .pdSub").textContent()) === "Aromatinis aliejus difuzoriui" &&
      (await v.page.locator("#productRoot .pbSteps .useT").first().textContent()).includes("Įpilkite vandens") &&
      (await v.page.locator("#productRoot .pbNotes .pbT").textContent()) === "Kvapo natos" &&
      /nevartokite viduje/.test(await v.page.locator("#productRoot .pdNotice").textContent()),
    "aliejaus puslapis: natos, „Kaip naudoti“ su difuzoriumi, saugos pastaba (v29b)"
  );
  await open(v.page, `${B}kvepalai/arven`);
  await v.page.waitForSelector("#productRoot [data-notify]");
  check(true, "išparduota - „Pranešti, kai bus“ vietoje „Į krepšelį“");
  await v.page.locator("#productRoot [data-notify]").first().click();
  await v.page.fill('#sheetBody input[name="email"]', "laukiu@example.com");
  await v.page.click("#sheetBody button[type=submit]");
  check(await until(() => v.sb.db.restock_requests.some(r => r.product_id === "arven" && r.email === "laukiu@example.com")), "„Pranešti, kai bus“ - įrašyta į duomenų bazę");
  await v.page.waitForSelector("#backdrop", { state: "hidden" });
  await open(v.page, `${B}kvepalai/vanor`);
  await v.page.waitForSelector("#productRoot .gal img");
  check((await v.page.locator("#productRoot .gal img").count()) === 3, "galerija: 3 nuotraukos");
  // v29: įkelta nuotaikos nuotrauka (bendram kvapui) ir natos nuotrauka iš natų bibliotekos
  check(
    (await v.page.locator("#productRoot .pdMood:not(.isLine) .moodPh > img").getAttribute("src")) === "og/home.jpg" &&
      (await v.page.locator("#productRoot .pdMood figcaption b").textContent()) === "Šiltas vakaras namuose",
    "nuotaikos juosta: bendro kvapo nuotrauka ir šūkis (v29)"
  );
  await v.page.locator("#productRoot .ntSeg [role=tab]").nth(1).click();
  check(
    await until(async () => (await v.page.locator("#productRoot .ntPanel.on .nt:has-text('Vanilė') .ntArt img").getAttribute("src").catch(() => "")) === "img/kvapai/vanor-1.webp"),
    "natos: nuotrauka iš natų bibliotekos (Vanilė)"
  );
  check(await until(async () => (await v.page.locator("[data-pd-reviews]").isVisible()) && (await v.page.locator("[data-pd-reviews]").textContent()).includes("Ona K.")), "kvapo atsiliepimai");
  await open(v.page, `${B}kvepalai`);
  const g = v.page.locator('#shopGrid .card:has(a[href="kvepalai/safrane"])');
  check((await g.locator(".cardPrice s").count()) === 1 && (await g.locator(".cardPrice .sale").count()) === 1 && (await g.locator(".salePill").count()) === 1, "akcija: perbraukta sena kaina, raudona kaina, žymė „Akcija“");
  check((await v.page.locator('#shopGrid .card:has(a[href="kvepalai/vanor"]) .cardRate .stars').count()) === 1, "kortelė: žvaigždutės iš tikrų atsiliepimų");
  await open(v.page, `${B}kvepalai/safrane`);
  check((await v.page.locator("#productRoot .pdPrice s").count()) === 1, "akcija kvapo puslapyje: sena kaina");
  // v29: be nuotaikos nuotraukos ir be kitų to paties kvapo formų - juostos nėra (jokių savų kompozicijų)
  check((await v.page.locator("#productRoot .pdMood").count()) === 0, "be nuotaikos nuotraukos ir kitų formų - juostos nėra (v29)");
  const txt = v.page.locator("#productRoot [data-pd-text]");
  const txtH = () => txt.evaluate(el => el.getBoundingClientRect().height);
  const t0 = await txtH();
  check((await txt.evaluate(el => el.classList.contains("clamp"))) && (await v.page.locator("#productRoot [data-pd-more]").textContent()).trim() === "Skaityti daugiau", "ilgas aprašymas suskleistas - „Skaityti daugiau“");
  await v.page.locator("#productRoot [data-pd-more]").click();
  check(await until(async () => !(await txt.evaluate(el => el.classList.contains("clamp"))) && (await txtH()) > t0 + 40 && (await v.page.locator("#productRoot [data-pd-more]").count()) === 0), "„Skaityti daugiau“ - išskleidžia visą aprašymą");
  const LONG_DASH = /[\u2012-\u2015\u2212]/;
  check(
    !LONG_DASH.test(await v.page.evaluate(() => document.body.innerText)) && (await v.page.locator("#productRoot .pdText").textContent()).includes("kvapas - tiems"),
    "v30: kvapo puslapyje - jokių ilgų brūkšnių (ir bazės tekstuose)"
  );
  check(
    (await v.page.locator("#productRoot .insp-pd .inspBrand").textContent()).trim() === "Maison Francis Kurkdjian",
    "v30: originalas su ilgu brūkšniu bazėje - vis tiek atpažįstamas (prekės ženklas ir kvapas)"
  );
  if (!mobile) check(!LONG_DASH.test(fs.readFileSync(path.join(siteB, "kvepalai/safrane.html"), "utf8")), "v30: statiniame puslapyje (SEO, įdėtas katalogas) - jokių ilgų brūkšnių");
  await open(v.page, `${B}kvepalai`);
  check(!LONG_DASH.test(await v.page.evaluate(() => document.body.innerText)), "v30: kataloge - jokių ilgų brūkšnių");
  await open(v.page, B);
  check(await until(() => v.page.locator("#homeReviews").isVisible()), "pradžia: atsiliepimai (kai yra tikrų)");
  check(!LONG_DASH.test(await v.page.evaluate(() => document.body.innerText)), "v30: pradžioje - jokių ilgų brūkšnių");
  const vs = await v.page.evaluate(() =>
    [...document.querySelectorAll("#homeHero .slide")].map(s => ({ t: s.querySelector(".heroTitle").textContent, href: s.getAttribute("href"), dark: s.classList.contains("onDark"), img: s.querySelector(".scenePic img")?.getAttribute("src") || "" }))
  );
  check(vs.length === 2 && vs[0].t === "Pirma išbandykite" && vs[1].t === "Ruduo" && vs[1].href === "vyrams" && vs[1].dark && vs[1].img === "og/home.jpg", "pradžia iš nustatymų: skaidrių eilė, nuotrauka, tekstai, paslėpta nerodoma");
  const vt = await v.page.locator("#homeTiles .tile").evaluateAll(a => a.map(x => `${x.getAttribute("href")}:${x.querySelector(".tileName").textContent}:${!!x.querySelector(".scenePic")}`));
  check(vt.length === 2 && vt[0] === "vyrams:Jam:true" && vt[1].startsWith("kategorija/vakarui:Vakarui:false"), "pradžia iš nustatymų: plytelės (nuotrauka, pavadinimas, kategorija)");
  await open(v.page, `${B}vyrams`);
  check((await v.page.locator("#shopHead.hasStage .scenePic img").getAttribute("src")) === "og/home.jpg", "grupės puslapyje - ta pati nuotrauka");
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
