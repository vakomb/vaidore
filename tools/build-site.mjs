// Svetainės surinkimas: node tools/build-site.mjs → aplankas site/ (Vercel: outputDirectory "site", cleanUrls; GitHub Pages - tas pats).
// Kiekvienam adresui - statinis HTML su savo title, description, kanoniniu adresu ir Open Graph (paieškos sistemoms
// ir dalinimuisi); viduje - ta pati programėlė, kuri pagal adresą parodo puslapį:
//   index.html, kvepalai/index.html, moterims.html, vyrams.html, unisex.html, meginukai.html,
//   kategorija/<id>.html, kvepalai/<id>.html (+ Product JSON-LD), pagalba.html, apie-mus.html,
//   krepselis.html, megstami.html, paskyra.html, admin.html (noindex), 404.html (nežinomi adresai - programėlė nusprendžia)
//   aciu.html, salygos.html, privatumas.html - statiniai puslapiai (src/pages/)
//   assets/admin.js, assets/admin.css - administravimo skydelis (įkeliamas tik /admin)
//   data/omniva.json - Omniva paštomatai; sitemap.xml, robots.txt, catalog.json + src/public/*
// Katalogas: iš Supabase (tools/db-catalog.mjs), nepavykus - src/data/catalog.json.
// Aplinkos kintamieji (nebūtini):
//   BASE_PATH=/vaidore/ - svetainė poaplankyje (GitHub Pages); numatyta „/“
//   SITE_URL     - kanoninių adresų pradžia (numatyta https://<settings.domain>)
//   NOINDEX=1    - peržiūros kopija: paieškos sistemoms neindeksuoti
//   NO_DB=1      - nesikreipti į duomenų bazę; CATALOG=kelias - kitas katalogas (testams); OUT=kelias - kitas aplankas
//   OMNIVA=0     - neparsiųsti paštomatų; OMNIVA_FILE=kelias - vietinis locations.json (testams)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, buildAdmin } from "./build.mjs";
import { dbCatalog, plain, plainDeep } from "./db-catalog.mjs";
import { EN_PUBLIC, routeFor, t as tr } from "./i18n.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const site = process.env.OUT ? path.resolve(process.env.OUT) : path.join(root, "site");
// Nelaužomi tarpai (kaip programėlėje - 01-util.js)
const nb = t => plain(t).replace(/(\d) (?=d\.|ml\b|val\.|vnt\.)/g, "$1\u00a0").replace(/d\. d\./g, "d.\u00a0d.").replace(/(\d)-(\d)/g, "$1\u2060-\u2060$2");
const fileCatalog = JSON.parse(fs.readFileSync(process.env.CATALOG ? path.resolve(process.env.CATALOG) : path.join(src, "data", "catalog.json"), "utf8"));
const sb = JSON.parse(fs.readFileSync(path.join(src, "data", "supabase.json"), "utf8"));
const useDb = !process.env.CATALOG && process.env.NO_DB !== "1";
const dbCat = useDb && (await dbCatalog(sb, fileCatalog));
const fromDb = !!dbCat;
// v30: tekstai be ilgų brūkšnių (kaip programėlėje - plainDeep, 01-util.js)
const catalog = plainDeep(dbCat || fileCatalog);
const S = catalog.settings;
// Prekių puslapių tekstai pagal tipą (v29): numatytieji + administravimo pakeitimai - SEO puslapiuose natos ir naudojimas tekstu.
// v33f: anglų kalba - src/i18n/pdp.en.json + settings.i18n.en.pdp, natos - src/i18n/notes.en.json
const PDP_DEF = JSON.parse(fs.readFileSync(path.join(src, "data", "pdp.json"), "utf8"));
const readI18n = f => (fs.existsSync(path.join(src, "i18n", f)) ? JSON.parse(fs.readFileSync(path.join(src, "i18n", f), "utf8")) : {});
const PDP_I18N = { en: readI18n("pdp.en.json") };
const foldKey = v => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const NOTES_I18N = { en: Object.fromEntries(Object.entries(readI18n("notes.en.json")).map(([k, v]) => [foldKey(k), v])) };
const noteName = (lang, n) => (lang === "lt" ? n : NOTES_I18N[lang]?.[foldKey(n)] || n);
const deepMerge = (a, b) => {
  if (!b || typeof b !== "object" || Array.isArray(b)) return b === undefined ? a : b;
  const out = { ...(a && typeof a === "object" && !Array.isArray(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) out[k] = Array.isArray(v) ? v : deepMerge(out[k], v);
  return out;
};
const pdpOf = (t, lang = "lt") => {
  const d = lang === "lt" ? PDP_DEF[t] || {} : deepMerge(PDP_DEF[t] || {}, PDP_I18N[lang]?.[t] || {});
  const o = lang === "lt" ? S.pdp?.[t] || {} : S.i18n?.[lang]?.pdp?.[t] || {};
  return deepMerge(d, o);
};
function storyText(p, ty, lang = "lt") {
  const c = pdpOf(ty, lang);
  const out = [];
  const all = [...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])].map(n => noteName(lang, n));
  if (c.notes?.on !== false && all.length) out.push(`<p><b>${esc(c.notes?.title || TX[lang].notes)}:</b> ${esc(all.join(", "))}.</p>`);
  const steps = (c.steps?.items || []).filter(x => x?.title || x?.text);
  if (c.steps?.on !== false && steps.length)
    out.push(`<h2>${esc(c.steps.title || TX[lang].how)}</h2><ol>${steps.map(x => `<li>${x.title ? `<b>${esc(x.title)}.</b> ` : ""}${esc(x.text || "")}</li>`).join("")}</ol>`);
  const where = (c.where?.items || []).filter(x => x?.label);
  if (c.where?.on !== false && where.length) out.push(`<p><b>${esc(c.where.title || TX[lang].where)}:</b> ${esc(where.map(x => x.label).join(", "))}.${c.where.text ? ` ${esc(c.where.text)}` : ""}</p>`);
  if (c.note?.on !== false && c.note?.text) out.push(`<p>${esc(c.note.text)}</p>`);
  return out.join("");
}
// Katalogas kalba (kaip programėlės localizeCatalog, 03-catalog.js): prekės, šeimos, kolekcijos, nustatymai
function localizeCatalog(c, lang) {
  if (lang === "lt") return c;
  c = JSON.parse(JSON.stringify(c));
  const over = o => {
    const tr = o?.i18n?.[lang];
    if (tr) for (const [k, v] of Object.entries(tr)) if (typeof v === "string" ? v.trim() : v != null && typeof v !== "object") o[k] = v;
  };
  for (const k of ["products", "families", "categories"]) (c[k] || []).forEach(over);
  const tr = c.settings?.i18n?.[lang] || {};
  const S2 = c.settings;
  for (const k of ["hero", "story", "inspired", "discovery", "business"]) if (tr[k] && S2[k]) S2[k] = { ...S2[k], ...tr[k] };
  for (const k of ["tagline", "dispatch"]) if (typeof tr[k] === "string" && tr[k].trim()) S2[k] = tr[k];
  if (Array.isArray(S2.shipping)) S2.shipping = S2.shipping.map(o => ({ ...o, ...(tr.shipping?.[o.id] || {}) }));
  return c;
}
const SITE = (process.env.SITE_URL || `https://${S.domain}`).replace(/\/$/, "");
const NOINDEX = process.env.NOINDEX === "1";
const BASE = ("/" + (process.env.BASE_PATH || "/").replace(/^\/+|\/+$/g, "") + "/").replace("//", "/");
const BUILT = Date.now();

const esc = v => plain(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const money = n => n.toFixed(2).replace(".", ",") + " €";
const inStock = p => p.stock == null || p.stock > 0;
const visible = x => x.visible !== false;

fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(path.join(site, "data"), { recursive: true });

// 1. Omniva paštomatai: [zip, pavadinimas, adresas, miestas, šalis, platuma, ilguma]
async function omniva() {
  if (process.env.OMNIVA === "0") return 0;
  let raw;
  try {
    if (process.env.OMNIVA_FILE) raw = JSON.parse(fs.readFileSync(process.env.OMNIVA_FILE, "utf8"));
    else {
      const r = await fetch("https://www.omniva.ee/locations.json", { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      raw = await r.json();
    }
  } catch (err) {
    console.warn(`! Omniva paštomatų parsiųsti nepavyko (${err.message}) - adresą pirkėjas nurodys Stripe lange`);
    return 0;
  }
  const cc = new Set(S.countries);
  const list = raw
    // TYPE 0 - paštomatas (1 - paštas); „1. eelistus“ - Estijos virtualus „pirmasis pasirinkimas“, ne vieta
    .filter(l => String(l.TYPE) === "0" && cc.has(l.A0_NAME) && /^\d{4,6}$/.test(String(l.ZIP)) && !/eelistus/i.test(l.NAME))
    .map(l => [
      String(l.ZIP),
      String(l.NAME || "").trim(),
      [l.A5_NAME, l.A7_NAME].filter(Boolean).join(" ").trim(),
      String(l.A3_NAME || l.A2_NAME || l.A1_NAME || "").trim(),
      l.A0_NAME,
      Math.round(Number(l.Y_COORDINATE) * 1e5) / 1e5,
      Math.round(Number(l.X_COORDINATE) * 1e5) / 1e5
    ])
    .sort((a, b) => a[4].localeCompare(b[4]) || a[3].localeCompare(b[3], "lt") || a[1].localeCompare(b[1], "lt"));
  fs.writeFileSync(path.join(site, "data", "omniva.json"), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), list: plainDeep(list) }));
  return list.length;
}
const lockers = await omniva();

// 2. Matavimas be slapukų (settings.analytics)
const A = S.analytics || {};
const analyticsHead = [
  A.plausible
    ? `<script defer data-domain="${esc(A.plausible)}" src="https://plausible.io/js/script.js"></script><script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>`
    : "",
  A.vercel ? `<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}</script><script defer src="/_vercel/insights/script.js"></script>` : ""
]
  .filter(Boolean)
  .join("\n    ");
const robotsMeta = NOINDEX ? `<meta name="robots" content="noindex" />` : "";

// 3. Programėlės puslapiai
const CONC = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
const FAM = Object.fromEntries(catalog.families.map(f => [f.id, f.name]));
const ogFile = id => (fs.existsSync(path.join(src, "public", "og", `${id}.jpg`)) ? `og/${id}.jpg` : "og/home.jpg");
const products = catalog.products.filter(visible);
const categories = (catalog.categories || []).filter(visible);
const sitemap = [];
// v33: kiekvienas puslapis - dviem kalbomis: LT (kaip iki šiol) ir EN (en/…, angliški adresai - src/i18n/routes.json).
// Kol angliška versija neparengta (src/i18n/config.json „enPublic“: false) - EN puslapiai noindex, be hreflang ir sitemap.
const OG_LOCALE = { lt: "lt_LT", en: "en_GB" };
const urlOf = route => `${SITE}/${route}`;
const enFile = (file, route) => {
  const r = routeFor("en", route);
  return r === route ? null : file.endsWith("index.html") ? `${r}/index.html` : `${r}.html`;
};
// v33f: puslapio duomenys kiekvienai kalbai - mk(kalba, katalogas kalba, tekstai) arba vienas objektas abiem kalboms
function page(file, mk) {
  const opts = lang => (typeof mk === "function" ? mk(lang, CAT[lang], TX[lang]) : mk);
  const o = opts("lt");
  const html = pageLang(file, o, "lt");
  // Administravimas - tik lietuviškai; 404.html - viena abiem kalboms (programėlė kalbą pasirenka pagal adresą)
  const ef = o.route != null && enFile(file, o.route);
  if (ef) pageLang(ef, opts("en"), "en");
  return html;
}
function pageLang(file, { route, title, desc, image = `${SITE}/og/home.jpg`, type = "website", noindex = false, extra = [], noscript = "" }, lang) {
  const lr = route != null ? routeFor(lang, route) : null;
  const canonical = lr != null ? urlOf(lr) : null;
  const hidden = lang === "en" && !EN_PUBLIC;
  const alt = route != null && EN_PUBLIC && routeFor("en", route) !== route;
  const head = [
    lr != null ? `<link rel="canonical" href="${esc(canonical)}" />` : "",
    lr != null ? `<meta property="og:url" content="${esc(canonical)}" />` : "",
    alt ? `<link rel="alternate" hreflang="lt" href="${esc(urlOf(route))}" />` : "",
    alt ? `<link rel="alternate" hreflang="en" href="${esc(urlOf(routeFor("en", route)))}" />` : "",
    alt ? `<link rel="alternate" hreflang="x-default" href="${esc(urlOf(routeFor("en", route)))}" />` : "",
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="${esc(S.shop)}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`,
    alt ? `<meta property="og:locale:alternate" content="${OG_LOCALE[lang === "lt" ? "en" : "lt"]}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    (noindex || hidden) && !NOINDEX ? `<meta name="robots" content="noindex" />` : robotsMeta,
    analyticsHead,
    ...extra
  ]
    .filter(Boolean)
    .join("\n    ");
  let html = buildApp({ lockers, catalog, base: BASE, built: BUILT, head, lang, dicts: route == null ? ["lt", "en"] : [lang] });
  if (title)
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`);
  if (desc)
    html = html
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = html.replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${type}" />`);
  if (noscript) html = html.replace("<body>", `<body>\n    <noscript>${noscript}</noscript>`);
  const out = path.join(site, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  if (!noindex && !hidden && lr != null) sitemap.push(canonical);
  return html;
}
// SEO tekstai kalba
const TX = {
  lt: {
    home: shop => `${shop} - kvepalai`,
    fragrances: "kvapai",
    andMore: " ir kiti",
    listTail: () => `Mėginukai 2 ml, nemokamas pristatymas nuo ${S.freeShippingFrom} €.`,
    perfumes: "Kvepalai",
    gender: { moterims: "Kvepalai moterims", vyrams: "Kvepalai vyrams", unisex: "Unisex kvepalai" },
    samplesTitle: "Kvepalų mėginukai 2 ml",
    samplesDesc: n => `Išbandykite kvapą prieš pirkdami: ${n} kvapų mėginukai po 2 ml.`,
    insp: x => `Įkvėpti ${x}. `,
    scent: (fam, notes) => `${fam} kvapas: ${notes}. `,
    from: "nuo",
    sample: x => `, mėginukas 2 ml - ${x}`,
    home1: "Pradžia",
    help: () => [`Pagalba: pristatymas, grąžinimas, DUK`, `Pristatymas per ${S.dispatch || "1-2 d. d."}, nemokamai nuo ${S.freeShippingFrom} €, grąžinimas per ${S.returnDays || 14} d.`],
    about: "Apie mus",
    all: "Visos prekės - kvepalai ir namų kvapai",
    best: "Bestselleriai - populiariausi kvepalai",
    sale: "Didžiausios nuolaidos",
    saleNone: () => `Kvepalų nuolaidos ${S.shop}. Nuolaidas skelbiame naujienlaiškyje.`,
    reviews: "Atsiliepimai",
    reviewsDesc: () => `Tikri ${S.shop} pirkėjų atsiliepimai - rašo tik pirkę.`,
    biz: "Verslui - kvepalai įmonių dovanoms",
    bizDesc: "Kvepalai ir mėginukų rinkiniai įmonių dovanoms, renginiams ir partneriams. Pasiūlymas per 1 d. d.",
    news: "Naujienlaiškis",
    misc: { krepselis: "Krepšelis", megstami: "Mėgstami", paskyra: "Paskyra", admin: "Administravimas", testas: "Rask savo kvapą" },
    discovery: "Atradimų rinkinys",
    nf: "Puslapis nerastas",
    notes: "Natos",
    how: "Kaip naudoti",
    where: "Kur naudoti",
    type: {
      kvepalai: { name: "Kvepalai", one: "Kvepalai", what: "kvapai" },
      difuzoriai: { name: "Namų kvapų difuzoriai", one: "Namų kvapų difuzorius", what: "difuzoriai" },
      zvakes: { name: "Kvapnios žvakės", one: "Kvapni žvakė", what: "žvakės" },
      aliejai: { name: "Aromatiniai aliejai difuzoriams", one: "Aromatinis aliejus", what: "aliejai" },
      "elektriniai-difuzoriai": { name: "Elektriniai difuzoriai", one: "Elektrinis difuzorius", what: "difuzoriai" }
    },
    money: n => n.toFixed(2).replace(".", ",") + " €"
  },
  en: {
    home: shop => `${shop} - perfume`,
    fragrances: "fragrances",
    andMore: " and more",
    listTail: () => `2 ml samples, free delivery over €${S.freeShippingFrom}.`,
    perfumes: "Perfume",
    gender: { moterims: "Perfume for women", vyrams: "Perfume for men", unisex: "Unisex perfume" },
    samplesTitle: "Perfume samples 2 ml",
    samplesDesc: n => `Try a fragrance before you buy: ${n} fragrances as 2 ml samples.`,
    insp: x => `Inspired by ${x}. `,
    scent: (fam, notes) => `${fam} fragrance: ${notes}. `,
    from: "from",
    sample: x => `, 2 ml sample - ${x}`,
    home1: "Home",
    help: () => [`Help: delivery, returns, FAQ`, `Dispatched within ${CAT.en.settings.dispatch || "1-2 business days"}, free delivery over €${S.freeShippingFrom}, ${S.returnDays || 14}-day returns.`],
    about: "About us",
    all: "All products - perfume and home fragrance",
    best: "Bestsellers - our most popular perfumes",
    sale: "Best offers",
    saleNone: () => `Perfume offers at ${S.shop}. We announce offers in our newsletter.`,
    reviews: "Reviews",
    reviewsDesc: () => `Genuine ${S.shop} customer reviews - written only by verified buyers.`,
    biz: "Business - perfume for corporate gifts",
    bizDesc: "Perfume and sample sets for corporate gifts, events and partners. A quote within 1 business day.",
    news: "Newsletter",
    misc: { krepselis: "Bag", megstami: "Favourites", paskyra: "Account", admin: "Administravimas", testas: "Find your fragrance" },
    discovery: "Discovery set",
    nf: "Page not found",
    notes: "Notes",
    how: "How to use",
    where: "Where to use",
    type: {
      kvepalai: { name: "Perfume", one: "Perfume", what: "fragrances" },
      difuzoriai: { name: "Reed diffusers", one: "Reed diffuser", what: "diffusers" },
      zvakes: { name: "Scented candles", one: "Scented candle", what: "candles" },
      aliejai: { name: "Fragrance oils for diffusers", one: "Fragrance oil", what: "oils" },
      "elektriniai-difuzoriai": { name: "Electric diffusers", one: "Electric diffuser", what: "diffusers" }
    },
    money: n => `€${n.toFixed(2)}`
  }
};
const CAT = { lt: catalog, en: localizeCatalog(catalog, "en") };
const famOf = (lang, id) => CAT[lang].families.find(f => f.id === id)?.name || "";
const listOf = (lang, ids) => ids.map(id => CAT[lang].products.find(p => p.id === id)).filter(Boolean);
const app = page("index.html", (lang, C) => ({
  route: "",
  title: TX[lang].home(S.shop),
  desc: C.settings.tagline,
  extra: [ld({ "@context": "https://schema.org", "@type": "OnlineStore", name: S.shop, url: `${SITE}/${routeFor(lang, "")}`, description: C.settings.tagline, email: S.company.email, inLanguage: lang })]
}));
const listDesc = (lang, list) =>
  `${list.length} ${TX[lang].fragrances}: ${list
    .slice(0, 5)
    .map(p => p.name)
    .join(", ")}${list.length > 5 ? TX[lang].andMore : ""}. ${TX[lang].listTail()}`;
// Prekių tipai (v13, v15 - 5 tipai; tie patys kaip TYPES, 03-catalog.js) - sąrašo puslapis tik tipui, kuriame yra prekių
const TYPE_PAGE = TX.lt.type;
const typeOf = p => (TYPE_PAGE[p.type] ? p.type : "kvepalai");
const perfumes = products.filter(p => typeOf(p) === "kvepalai");
const ids = list => list.map(p => p.id);
const productList = (lang, list, what) =>
  `${list.length} ${what}: ${list
    .slice(0, 5)
    .map(p => p.name)
    .join(", ")}${list.length > 5 ? TX[lang].andMore : ""}.`;
page("kvepalai/index.html", (lang, C, X) => ({ route: "kvepalai", title: `${X.perfumes} | ${S.shop}`, desc: listDesc(lang, listOf(lang, ids(perfumes))) }));
for (const tp of Object.keys(TYPE_PAGE).filter(tp => tp !== "kvepalai")) {
  const list = products.filter(p => typeOf(p) === tp);
  if (list.length) page(`${tp}/index.html`, (lang, C, X) => ({ route: tp, title: `${X.type[tp].name} | ${S.shop}`, desc: productList(lang, listOf(lang, ids(list)), X.type[tp].what) }));
}
for (const g of ["moterims", "vyrams", "unisex"])
  page(`${g}.html`, (lang, C, X) => ({
    route: g,
    title: `${X.gender[g]} | ${S.shop}`,
    desc: listDesc(lang, listOf(lang, ids(perfumes.filter(p => p.gender === g || (p.gender === "unisex" && g !== "unisex")))))
  }));
page("meginukai.html", (lang, C, X) => ({ route: "meginukai", title: `${X.samplesTitle} | ${S.shop}`, desc: X.samplesDesc(perfumes.filter(p => Number(p.sample) > 0).length) }));
for (const c of categories)
  page(`kategorija/${c.id}.html`, (lang, C) => {
    const cl = C.categories.find(x => x.id === c.id) || c;
    return { route: `kategorija/${c.id}`, title: `${cl.name} | ${S.shop}`, desc: cl.description || listDesc(lang, listOf(lang, ids(products.filter(p => (p.categories || []).includes(c.id))))) };
  });
for (const p0 of products)
  page(`${typeOf(p0)}/${p0.id}.html`, (lang, C, X) => {
    const p = C.products.find(x => x.id === p0.id) || p0;
    const ty = typeOf(p);
    const perf = ty === "kvepalai";
    const kind = perf ? CONC[p.conc] || p.conc : X.type[ty].one;
    const route = `${ty}/${p.id}`;
    const url = `${SITE}/${routeFor(lang, route)}`;
    const prices = p.sizes.map(s => s.price);
    const notes = [...p.notes.top, ...p.notes.heart, ...p.notes.base].slice(0, 5).map(n => noteName(lang, n)).join(", ");
    const insp = S.inspired?.show !== false && p.inspired ? X.insp(p.inspired) : "";
    const sizeTxt = s => (s.unit === "vnt" ? "" : `${s.ml} ${s.unit || "ml"}`);
    const scentTxt = notes ? X.scent(famOf(lang, p.family), notes) : "";
    const desc = `${insp}${p.tagline ? `${p.tagline}. ` : ""}${scentTxt}${p.sizes.map(sizeTxt).filter(Boolean).join(" / ")}${p.sizes.some(sizeTxt) ? " " : ""}${X.from} ${X.money(Math.min(...prices))}${
      perf && Number(p.sample) > 0 ? X.sample(X.money(Number(p.sample))) : ""
    }.`.slice(0, 300);
    const image = p.images?.length ? p.images.map(i => new URL(i, `${SITE}/`).href) : [`${SITE}/${ogFile(p.id)}`];
    const reviews = (p.reviews || []).filter(r => r?.name && r?.text);
    const rated = reviews.filter(r => r.rating);
    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: perf ? `${p.name} ${kind}` : p.name,
      description: p.desc,
      image,
      sku: p.id,
      category: X.type[ty].name,
      brand: { "@type": "Brand", name: S.shop },
      inLanguage: lang,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: (S.currency || "eur").toUpperCase(),
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: p.sizes.length,
        availability: inStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url
      }
    };
    if (reviews.length)
      product.review = reviews.slice(0, 10).map(r => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        reviewBody: r.text,
        ...(r.date ? { datePublished: r.date } : {}),
        ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } } : {})
      }));
    if (rated.length)
      product.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.round((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10) / 10,
        reviewCount: rated.length
      };
    const crumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: X.home1, item: `${SITE}/${routeFor(lang, "")}` },
        { "@type": "ListItem", position: 2, name: X.type[ty].name, item: `${SITE}/${routeFor(lang, ty)}` },
        { "@type": "ListItem", position: 3, name: p.name, item: url }
      ]
    };
    return {
      route,
      title: `${p.name} - ${kind} | ${S.shop}`,
      desc,
      image: fs.existsSync(path.join(src, "public", "og", `${p.id}.jpg`)) ? `${SITE}/og/${p.id}.jpg` : image[0],
      type: "product",
      extra: [ld(product), ld(crumbs)],
      noscript: `<h1>${esc(p.name)} - ${esc(kind)}</h1>${insp ? `<p>${esc(insp.trim())}</p>` : ""}<p>${esc(p.desc)}</p><p>${esc(desc)}</p>${storyText(p, ty, lang)}`
    };
  });
page("pagalba.html", (lang, C, X) => {
  const [title, desc] = X.help();
  return { route: "pagalba", title: `${title} | ${S.shop}`, desc };
});
page("apie-mus.html", (lang, C, X) => ({ route: "apie-mus", title: `${X.about} | ${S.shop}`, desc: C.settings.story?.text || C.settings.tagline }));
const ranked = [...products].sort((a, b) => a.rank - b.rank);
page("visos-prekes.html", (lang, C, X) => ({ route: "visos-prekes", title: `${X.all} | ${S.shop}`, desc: listDesc(lang, listOf(lang, ids(ranked.slice(0, 8)))) }));
page("bestselleriai.html", (lang, C, X) => ({ route: "bestselleriai", title: `${X.best} | ${S.shop}`, desc: listDesc(lang, listOf(lang, ids(ranked.slice(0, 8)))) }));
const onSaleList = products.filter(p => p.sizes.some(sz => sz.was > sz.price));
page("nuolaidos.html", (lang, C, X) => ({
  route: "nuolaidos",
  title: `${X.sale} | ${S.shop}`,
  desc: onSaleList.length ? listDesc(lang, listOf(lang, ids(onSaleList))) : X.saleNone(),
  noindex: !onSaleList.length
}));
page("atsiliepimai.html", (lang, C, X) => ({ route: "atsiliepimai", title: `${X.reviews} | ${S.shop}`, desc: X.reviewsDesc() }));
page("verslui.html", (lang, C, X) => ({ route: "verslui", title: `${X.biz} | ${S.shop}`, desc: C.settings.business?.text || X.bizDesc }));
page("naujienlaiskis.html", (lang, C, X) => ({ route: "naujienlaiskis", title: `${X.news} | ${S.shop}`, noindex: true }));
for (const f of ["krepselis", "megstami", "paskyra", "admin", "testas", "rinkinys"])
  page(`${f}.html`, (lang, C, X) => ({ route: f, title: `${f === "rinkinys" ? C.settings.discovery?.name || X.discovery : X.misc[f]} | ${S.shop}`, noindex: true }));
page("404.html", { route: null, title: `${TX.lt.nf} | ${S.shop}`, noindex: true });

// 4. Administravimo skydelis, vieši failai
const admin = buildAdmin();
fs.mkdirSync(path.join(site, "assets"), { recursive: true });
fs.writeFileSync(path.join(site, "assets", "admin.js"), admin.js);
fs.writeFileSync(path.join(site, "assets", "admin.css"), admin.css);
fs.cpSync(path.join(src, "public"), site, { recursive: true });
fs.writeFileSync(path.join(site, "catalog.json"), JSON.stringify(catalog));

// 5. Statiniai puslapiai - tas pats dizainas (src/pages/_layout.html + src/styles/01, 02, 08)
const css = ["styles/01-tokens.css", "styles/02-base.css", "styles/08-pages.css"]
  .map(f => fs.readFileSync(path.join(src, f), "utf8"))
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ");
const layout = fs.readFileSync(path.join(src, "pages", "_layout.html"), "utf8");
const c = S.company;
const filled = v => v && !/^\[.*\]$/.test(String(v).trim());
// v33f: statiniai puslapiai abiem kalbomis - src/pages/*.html (LT) ir src/pages/en/*.html (EN, adresai en/terms, en/privacy,
// en/thank-you - src/i18n/routes.json); maketas tas pats, tekstai - PAGE_TX
const PAGE_TX = {
  lt: { code: "įm. k.", vat: "PVM k.", backAria: "Į parduotuvę", backLbl: "Parduotuvė", termsLbl: "Pirkimo sąlygos", privacyLbl: "Privatumas", locale: "lt-LT" },
  en: { code: "Company no.", vat: "VAT no.", backAria: "Back to the shop", backLbl: "Shop", termsLbl: "Terms of sale", privacyLbl: "Privacy", locale: "en-GB" }
};
const companyLine = lang =>
  `© ${new Date().getFullYear()} ${[
    filled(c.name) ? c.name : S.shop,
    filled(c.code) && `${PAGE_TX[lang].code} ${c.code}`,
    filled(c.vat) && `${PAGE_TX[lang].vat} ${c.vat}`,
    filled(c.address) && c.address,
    filled(c.phone) && c.phone
  ]
    .filter(Boolean)
    .map(esc)
    .join(" · ")}`;
const countryNames = lang => {
  const dn = new Intl.DisplayNames([PAGE_TX[lang].locale], { type: "region" });
  return (S.countries || ["LT"]).map(cc => dn.of(cc) || cc).join(", ");
};
// v33i: pristatymas pagal šalis (settings.zones) - kiekviena zona: šalys, būdai su kaina ir terminu, nemokamai nuo
const shippingList = lang => {
  const dn = new Intl.DisplayNames([PAGE_TX[lang].locale], { type: "region" });
  const zones = Array.isArray(S.zones) && S.zones.length ? S.zones : null;
  if (!zones) return (CAT[lang].settings.shipping || []).map(o => `<li>${esc(o.name)} - ${TX[lang].money(Number(o.price))} (${esc(nb(o.days))})</li>`).join("");
  return zones
    .map(z => {
      const ms = (z.methods || []).filter(m => m.on !== false);
      const line = ms
        .map(m => `${esc(tr(lang, `ship.${m.carrier}.${m.kind}`))} ${TX[lang].money(Number(m.price))}${m.days ? ` (${esc(nb(tr(lang, "ship.days", { d: m.days })))})` : ""}${m.perfume === false ? ` - ${esc(tr(lang, "ship.noPerfume"))}` : ""}`)
        .join("; ");
      const free = Number(z.freeFrom ?? S.freeShippingFrom);
      return `<li><b>${esc((z.countries || []).map(cc => dn.of(cc) || cc).join(", "))}</b>: ${line}.${free > 0 ? ` ${esc(tr(lang, "terms.freeFrom", { sum: TX[lang].money(free) }))}` : ""}</li>`;
    })
    .join("");
};
const fill = (str, lang) => {
  const C = CAT[lang].settings;
  return str
    .replace(/\{\{company\.(\w+)\}\}/g, (_, k) => esc(c[k] ?? ""))
    .replace(/\{\{companyLine\}\}/g, () => companyLine(lang))
    .replace(/\{\{freeShippingFrom\}\}/g, String(S.freeShippingFrom))
    .replace(/\{\{returnDays\}\}/g, String(S.returnDays || 14))
    .replace(/\{\{dispatch\}\}/g, esc(nb(C.dispatch || (lang === "en" ? "1-2 business days" : "1-2 d. d."))))
    .replace(/\{\{countries\}\}/g, () => esc(countryNames(lang)))
    .replace(/\{\{shipping\}\}/g, () => shippingList(lang))
    .replace(/\{\{supabase\}\}/g, () => JSON.stringify(sb))
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()))
    .replace(/\{\{lang\}\}/g, lang)
    .replace(/\{\{homeHref\}\}/g, lang === "en" ? "en" : "./")
    .replace(/\{\{termsHref\}\}/g, routeFor(lang, "salygos"))
    .replace(/\{\{privacyHref\}\}/g, routeFor(lang, "privatumas"))
    .replace(/\{\{(backAria|backLbl|termsLbl|privacyLbl)\}\}/g, (_, k) => PAGE_TX[lang][k])
    .replace(/\{\{logo\}\}/g, () => fs.readFileSync(path.join(src, "partials", "logo.svg"), "utf8").trim());
};
for (const f of fs.readdirSync(path.join(src, "pages")).filter(f => !f.startsWith("_") && f.endsWith(".html"))) {
  const slug = f.replace(/\.html$/, "");
  const noindex = slug === "aciu";
  const enSrc = path.join(src, "pages", "en", f);
  const langs = ["lt", ...(fs.existsSync(enSrc) && routeFor("en", slug) !== slug ? ["en"] : [])];
  for (const lang of langs) {
    const pg = fs.readFileSync(lang === "lt" ? path.join(src, "pages", f) : enSrc, "utf8");
    const title = (pg.match(/<!-- title: (.*?) -->/) || [])[1] || S.shop;
    const route = routeFor(lang, slug);
    const hidden = lang === "en" && !EN_PUBLIC;
    const alt = EN_PUBLIC && langs.length > 1 && !noindex;
    if (!noindex && !hidden) sitemap.push(`${SITE}/${route}`);
    const head = [
      `<base href="${BASE}" />`,
      `<link rel="canonical" href="${SITE}/${route}" />`,
      alt ? `<link rel="alternate" hreflang="lt" href="${SITE}/${slug}" />` : "",
      alt ? `<link rel="alternate" hreflang="en" href="${SITE}/${routeFor("en", slug)}" />` : "",
      alt ? `<link rel="alternate" hreflang="x-default" href="${SITE}/${routeFor("en", slug)}" />` : "",
      (noindex || hidden) && !NOINDEX ? `<meta name="robots" content="noindex" />` : "",
      robotsMeta,
      analyticsHead
    ]
      .filter(Boolean)
      .join("\n    ");
    const html = fill(layout.replace("{{title}}", esc(title)).replace("{{css}}", css).replace("{{head}}", head).replace("{{body}}", pg), lang);
    const out = path.join(site, `${route}.html`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
  }
}

// 6. sitemap.xml ir robots.txt
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(site, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
fs.writeFileSync(
  path.join(site, "robots.txt"),
  NOINDEX ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nDisallow: /admin\nDisallow: /paskyra\nDisallow: /krepselis\nDisallow: /aciu\nDisallow: /en/account\nDisallow: /en/cart\nDisallow: /en/thank-you\n\nSitemap: ${SITE}/sitemap.xml\n`
);

const files = fs.readdirSync(site, { recursive: true }).filter(f => fs.statSync(path.join(site, f)).isFile());
console.log(
  `${path.relative(root, site) || "."}/ - ${files.length} failai, programėlė ${Math.round(app.length / 1024)} KB, administravimas ${Math.round((admin.js.length + admin.css.length) / 1024)} KB, ${products.length} kvapų ir ${categories.length} kategorijų puslapiai, katalogas - ${fromDb ? "duomenų bazė" : "catalog.json"}, paštomatų: ${lockers}, šaknis ${BASE}${NOINDEX ? " · noindex" : ""}`
);
