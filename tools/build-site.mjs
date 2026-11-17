// Svetainės surinkimas: node tools/build-site.mjs → aplankas site/ (Vercel: outputDirectory "site", cleanUrls; GitHub Pages – tas pats).
// Kiekvienam adresui – statinis HTML su savo title, description, kanoniniu adresu ir Open Graph (paieškos sistemoms
// ir dalinimuisi); viduje – ta pati programėlė, kuri pagal adresą parodo puslapį:
//   index.html, kvepalai/index.html, moterims.html, vyrams.html, unisex.html, meginukai.html,
//   kategorija/<id>.html, kvepalai/<id>.html (+ Product JSON-LD), pagalba.html, apie-mus.html,
//   krepselis.html, megstami.html, paskyra.html, admin.html (noindex), 404.html (nežinomi adresai – programėlė nusprendžia)
//   aciu.html, salygos.html, privatumas.html – statiniai puslapiai (src/pages/)
//   assets/admin.js, assets/admin.css – administravimo skydelis (įkeliamas tik /admin)
//   data/omniva.json – Omniva paštomatai; sitemap.xml, robots.txt, catalog.json + src/public/*
// Katalogas: iš Supabase (tools/db-catalog.mjs), nepavykus – src/data/catalog.json.
// Aplinkos kintamieji (nebūtini):
//   BASE_PATH=/vaidore/ – svetainė poaplankyje (GitHub Pages); numatyta „/“
//   SITE_URL     – kanoninių adresų pradžia (numatyta https://<settings.domain>)
//   NOINDEX=1    – peržiūros kopija: paieškos sistemoms neindeksuoti
//   NO_DB=1      – nesikreipti į duomenų bazę; CATALOG=kelias – kitas katalogas (testams); OUT=kelias – kitas aplankas
//   OMNIVA=0     – neparsiųsti paštomatų; OMNIVA_FILE=kelias – vietinis locations.json (testams)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, buildAdmin } from "./build.mjs";
import { dbCatalog } from "./db-catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const site = process.env.OUT ? path.resolve(process.env.OUT) : path.join(root, "site");
const fileCatalog = JSON.parse(fs.readFileSync(process.env.CATALOG ? path.resolve(process.env.CATALOG) : path.join(src, "data", "catalog.json"), "utf8"));
const sb = JSON.parse(fs.readFileSync(path.join(src, "data", "supabase.json"), "utf8"));
const useDb = !process.env.CATALOG && process.env.NO_DB !== "1";
const catalog = (useDb && (await dbCatalog(sb, fileCatalog))) || fileCatalog;
const fromDb = catalog !== fileCatalog;
const S = catalog.settings;
const SITE = (process.env.SITE_URL || `https://${S.domain}`).replace(/\/$/, "");
const NOINDEX = process.env.NOINDEX === "1";
const BASE = ("/" + (process.env.BASE_PATH || "/").replace(/^\/+|\/+$/g, "") + "/").replace("//", "/");
const BUILT = Date.now();

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
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
    console.warn(`! Omniva paštomatų parsiųsti nepavyko (${err.message}) – adresą pirkėjas nurodys Stripe lange`);
    return 0;
  }
  const cc = new Set(S.countries);
  const list = raw
    // TYPE 0 – paštomatas (1 – paštas); „1. eelistus“ – Estijos virtualus „pirmasis pasirinkimas“, ne vieta
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
  fs.writeFileSync(path.join(site, "data", "omniva.json"), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), list }));
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
function page(file, { route, title, desc, image = `${SITE}/og/home.jpg`, type = "website", noindex = false, extra = [], noscript = "" }) {
  const canonical = `${SITE}/${route}`;
  const head = [
    route != null ? `<link rel="canonical" href="${esc(canonical)}" />` : "",
    route != null ? `<meta property="og:url" content="${esc(canonical)}" />` : "",
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="${esc(S.shop)}" />`,
    `<meta property="og:locale" content="lt_LT" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    noindex && !NOINDEX ? `<meta name="robots" content="noindex" />` : robotsMeta,
    analyticsHead,
    ...extra
  ]
    .filter(Boolean)
    .join("\n    ");
  let html = buildApp({ lockers, catalog, base: BASE, built: BUILT, head });
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
  if (!noindex && route != null) sitemap.push(canonical);
  return html;
}
const app = page("index.html", {
  route: "",
  title: `${S.shop} – kvepalai`,
  desc: S.tagline,
  extra: [ld({ "@context": "https://schema.org", "@type": "OnlineStore", name: S.shop, url: `${SITE}/`, description: S.tagline, email: S.company.email })]
});
const listDesc = list =>
  `${list.length} kvapai: ${list
    .slice(0, 5)
    .map(p => p.name)
    .join(", ")}${list.length > 5 ? " ir kiti" : ""}. Mėginukai 2 ml, nemokamas pristatymas nuo ${S.freeShippingFrom} €.`;
page("kvepalai/index.html", { route: "kvepalai", title: `Kvepalai | ${S.shop}`, desc: listDesc(products) });
for (const [g, t] of [
  ["moterims", "Kvepalai moterims"],
  ["vyrams", "Kvepalai vyrams"],
  ["unisex", "Unisex kvepalai"]
])
  page(`${g}.html`, { route: g, title: `${t} | ${S.shop}`, desc: listDesc(products.filter(p => p.gender === g)) });
page("meginukai.html", { route: "meginukai", title: `Kvepalų mėginukai 2 ml | ${S.shop}`, desc: `Išbandykite kvapą prieš pirkdami: ${products.length} kvapų mėginukai po 2 ml.` });
for (const c of categories)
  page(`kategorija/${c.id}.html`, {
    route: `kategorija/${c.id}`,
    title: `${c.name} | ${S.shop}`,
    desc: c.description || listDesc(products.filter(p => (p.categories || []).includes(c.id)))
  });
for (const p of products) {
  const url = `${SITE}/kvepalai/${p.id}`;
  const prices = p.sizes.map(s => s.price);
  const notes = [...p.notes.top, ...p.notes.heart, ...p.notes.base].slice(0, 5).join(", ");
  const insp = S.inspired?.show !== false && p.inspired ? `Įkvėpti ${p.inspired}. ` : "";
  const desc = `${insp}${p.tagline}. ${FAM[p.family]} kvapas: ${notes}. ${p.sizes.map(s => `${s.ml} ml`).join(" / ")} nuo ${money(Math.min(...prices))}, mėginukas 2 ml – ${money(p.sample)}.`.slice(0, 300);
  const image = p.images?.length ? p.images.map(i => new URL(i, `${SITE}/`).href) : [`${SITE}/${ogFile(p.id)}`];
  const reviews = (p.reviews || []).filter(r => r?.name && r?.text);
  const rated = reviews.filter(r => r.rating);
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} ${CONC[p.conc] || p.conc}`,
    description: p.desc,
    image,
    sku: p.id,
    category: "Kvepalai",
    brand: { "@type": "Brand", name: S.shop },
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
      ratingValue: Math.round((rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10) / 10,
      reviewCount: rated.length
    };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pradžia", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Kvepalai", item: `${SITE}/kvepalai` },
      { "@type": "ListItem", position: 3, name: p.name, item: url }
    ]
  };
  page(`kvepalai/${p.id}.html`, {
    route: `kvepalai/${p.id}`,
    title: `${p.name} – ${CONC[p.conc] || p.conc} | ${S.shop}`,
    desc,
    image: fs.existsSync(path.join(src, "public", "og", `${p.id}.jpg`)) ? `${SITE}/og/${p.id}.jpg` : image[0],
    type: "product",
    extra: [ld(product), ld(crumbs)],
    noscript: `<h1>${esc(p.name)} – ${esc(CONC[p.conc] || p.conc)}</h1>${insp ? `<p>${esc(insp.trim())}</p>` : ""}<p>${esc(p.desc)}</p><p>${esc(desc)}</p>`
  });
}
page("pagalba.html", {
  route: "pagalba",
  title: `Pagalba: pristatymas, grąžinimas, DUK | ${S.shop}`,
  desc: `Pristatymas per ${S.dispatch || "1–2 d. d."}, nemokamai nuo ${S.freeShippingFrom} €, grąžinimas per ${S.returnDays || 14} d.`
});
page("apie-mus.html", { route: "apie-mus", title: `Apie mus | ${S.shop}`, desc: S.story?.text || S.tagline });
const ranked = [...products].sort((a, b) => a.rank - b.rank);
page("bestselleriai.html", { route: "bestselleriai", title: `Bestselleriai – populiariausi kvepalai | ${S.shop}`, desc: listDesc(ranked.slice(0, 8)) });
const onSaleList = products.filter(p => p.sizes.some(s => s.was > s.price));
page("nuolaidos.html", {
  route: "nuolaidos",
  title: `Didžiausios nuolaidos | ${S.shop}`,
  desc: onSaleList.length ? listDesc(onSaleList) : `Kvepalų nuolaidos ${S.shop}. Nuolaidas skelbiame naujienlaiškyje.`,
  noindex: !onSaleList.length
});
page("atsiliepimai.html", { route: "atsiliepimai", title: `Atsiliepimai | ${S.shop}`, desc: `Tikri ${S.shop} pirkėjų atsiliepimai – rašo tik pirkę.` });
page("verslui.html", { route: "verslui", title: `Verslui – kvepalai įmonių dovanoms | ${S.shop}`, desc: S.business?.text || `Kvepalai ir mėginukų rinkiniai įmonių dovanoms, renginiams ir partneriams. Pasiūlymas per 1 d. d.` });
page("naujienlaiskis.html", { route: "naujienlaiskis", title: `Naujienlaiškis | ${S.shop}`, noindex: true });
for (const [f, t] of [
  ["krepselis", "Krepšelis"],
  ["megstami", "Mėgstami"],
  ["paskyra", "Paskyra"],
  ["admin", "Administravimas"],
  ["testas", "Rask savo kvapą"],
  ["rinkinys", S.discovery?.name || "Atradimų rinkinys"]
])
  page(`${f}.html`, { route: f, title: `${t} | ${S.shop}`, noindex: true });
page("404.html", { route: null, title: `Puslapis nerastas | ${S.shop}`, noindex: true });

// 4. Administravimo skydelis, vieši failai
const admin = buildAdmin();
fs.mkdirSync(path.join(site, "assets"), { recursive: true });
fs.writeFileSync(path.join(site, "assets", "admin.js"), admin.js);
fs.writeFileSync(path.join(site, "assets", "admin.css"), admin.css);
fs.cpSync(path.join(src, "public"), site, { recursive: true });
fs.writeFileSync(path.join(site, "catalog.json"), JSON.stringify(catalog));

// 5. Statiniai puslapiai – tas pats dizainas (src/pages/_layout.html + src/styles/01, 02, 08)
const css = ["styles/01-tokens.css", "styles/02-base.css", "styles/08-pages.css"]
  .map(f => fs.readFileSync(path.join(src, f), "utf8"))
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ");
const layout = fs.readFileSync(path.join(src, "pages", "_layout.html"), "utf8");
const c = S.company;
const filled = v => v && !/^\[.*\]$/.test(String(v).trim());
const companyLine = `© ${new Date().getFullYear()} ${[
  filled(c.name) ? c.name : S.shop,
  filled(c.code) && `įm. k. ${c.code}`,
  filled(c.vat) && `PVM k. ${c.vat}`,
  filled(c.address) && c.address,
  filled(c.phone) && c.phone
]
  .filter(Boolean)
  .map(esc)
  .join(" · ")}`;
const fill = s =>
  s
    .replace(/\{\{company\.(\w+)\}\}/g, (_, k) => esc(c[k] ?? ""))
    .replace(/\{\{companyLine\}\}/g, () => companyLine)
    .replace(/\{\{freeShippingFrom\}\}/g, String(S.freeShippingFrom))
    .replace(/\{\{returnDays\}\}/g, String(S.returnDays || 14))
    .replace(/\{\{dispatch\}\}/g, esc(S.dispatch || "1–2 d. d."))
    .replace(/\{\{shipping\}\}/g, () => S.shipping.map(o => `<li>${esc(o.name)} – ${money(o.price)} (${esc(o.days)})</li>`).join(""))
    .replace(/\{\{supabase\}\}/g, () => JSON.stringify(sb))
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()))
    .replace(/\{\{logo\}\}/g, () => fs.readFileSync(path.join(src, "partials", "logo.svg"), "utf8").trim());
for (const f of fs.readdirSync(path.join(src, "pages")).filter(f => !f.startsWith("_") && f.endsWith(".html"))) {
  const pg = fs.readFileSync(path.join(src, "pages", f), "utf8");
  const title = (pg.match(/<!-- title: (.*?) -->/) || [])[1] || S.shop;
  const slug = f.replace(/\.html$/, "");
  const noindex = slug === "aciu";
  if (!noindex) sitemap.push(`${SITE}/${slug}`);
  const head = [`<base href="${BASE}" />`, `<link rel="canonical" href="${SITE}/${slug}" />`, noindex && !NOINDEX ? `<meta name="robots" content="noindex" />` : "", robotsMeta, analyticsHead]
    .filter(Boolean)
    .join("\n    ");
  const html = fill(layout.replace("{{title}}", esc(title)).replace("{{css}}", css).replace("{{head}}", head).replace("{{body}}", pg));
  fs.writeFileSync(path.join(site, f), html);
}

// 6. sitemap.xml ir robots.txt
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(site, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
fs.writeFileSync(
  path.join(site, "robots.txt"),
  NOINDEX ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nDisallow: /admin\nDisallow: /paskyra\nDisallow: /krepselis\nDisallow: /aciu\n\nSitemap: ${SITE}/sitemap.xml\n`
);

const files = fs.readdirSync(site, { recursive: true }).filter(f => fs.statSync(path.join(site, f)).isFile());
console.log(
  `${path.relative(root, site) || "."}/ – ${files.length} failai, programėlė ${Math.round(app.length / 1024)} KB, administravimas ${Math.round((admin.js.length + admin.css.length) / 1024)} KB, ${products.length} kvapų ir ${categories.length} kategorijų puslapiai, katalogas – ${fromDb ? "duomenų bazė" : "catalog.json"}, paštomatų: ${lockers}, šaknis ${BASE}${NOINDEX ? " · noindex" : ""}`
);
