// Svetainės surinkimas: node tools/build-site.mjs → aplankas site/ (Vercel: outputDirectory "site", cleanUrls; GitHub Pages – tas pats).
//   site/index.html              – parduotuvė (programėlė)
//   site/kvepalai/<id>.html      – kiekvieno kvapo statinis puslapis (SEO): title, description, kanoninis adresas, Open Graph,
//                                  Product JSON-LD; atidarius – ta pati programėlė su atidarytu kvapo lapu (window.VAIDORE_OPEN)
//   site/aciu.html, salygos.html, privatumas.html – statiniai puslapiai (src/pages/)
//   site/data/omniva.json        – Omniva paštomatų sąrašas (iš viešo Omniva API surinkimo metu; nepavykus – be jo)
//   site/sitemap.xml, robots.txt, catalog.json + src/public/* (ikonos, og/, manifest, sw.js)
// Aplinkos kintamieji (nebūtini):
//   SITE_URL     – kanoninių adresų pradžia (numatyta https://<settings.domain>)
//   NOINDEX=1    – peržiūros kopija (GitHub Pages): paieškos sistemoms neindeksuoti
//   OMNIVA=0     – neparsiųsti paštomatų; OMNIVA_FILE=kelias – naudoti vietinį locations.json (testams)
//   CATALOG=kelias, OUT=kelias – kitas katalogas / aplankas (testams)
// Be išorinių priklausomybių – veikia Vercel'yje ir GitHub Actions be npm paketų.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const site = process.env.OUT ? path.resolve(process.env.OUT) : path.join(root, "site");
const catalog = JSON.parse(fs.readFileSync(process.env.CATALOG ? path.resolve(process.env.CATALOG) : path.join(src, "data", "catalog.json"), "utf8"));
const S = catalog.settings;
const SITE = (process.env.SITE_URL || `https://${S.domain}`).replace(/\/$/, "");
const NOINDEX = process.env.NOINDEX === "1";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const money = n => n.toFixed(2).replace(".", ",") + " €";
const inStock = p => p.stock == null || p.stock > 0;

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
  .join("\n");
const robotsMeta = NOINDEX ? `<meta name="robots" content="noindex" />` : "";
const commonHead = (canonical, image) =>
  [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="${esc(S.shop)}" />`,
    `<meta property="og:locale" content="lt_LT" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    robotsMeta,
    analyticsHead
  ]
    .filter(Boolean)
    .join("\n    ");

// 3. Programėlė
const ogFile = id => (fs.existsSync(path.join(src, "public", "og", `${id}.jpg`)) ? `og/${id}.jpg` : "og/home.jpg");
const app = buildApp({
  lockers,
  catalog,
  head: commonHead(`${SITE}/`, `${SITE}/og/home.jpg`) + "\n    " + ld({ "@context": "https://schema.org", "@type": "OnlineStore", name: S.shop, url: `${SITE}/`, description: S.tagline, email: S.company.email })
});
fs.writeFileSync(path.join(site, "index.html"), app);

// 4. Vieši failai
fs.cpSync(path.join(src, "public"), site, { recursive: true });
fs.writeFileSync(path.join(site, "catalog.json"), JSON.stringify(catalog));

// 5. Kvapų puslapiai kvepalai/<id>
fs.mkdirSync(path.join(site, "kvepalai"), { recursive: true });
const CONC = { EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum" };
const FAM = Object.fromEntries(catalog.families.map(f => [f.id, f.name]));
for (const p of catalog.products) {
  const url = `${SITE}/kvepalai/${p.id}`;
  const prices = p.sizes.map(s => s.price);
  const title = `${p.name} – ${CONC[p.conc] || p.conc} | ${S.shop}`;
  const notes = [...p.notes.top, ...p.notes.heart, ...p.notes.base].slice(0, 5).join(", ");
  const desc = `${p.tagline}. ${FAM[p.family]} kvapas: ${notes}. ${p.sizes.map(s => `${s.ml} ml`).join(" / ")} nuo ${money(Math.min(...prices))}, mėginukas 2 ml – ${money(p.sample)}.`.slice(0, 300);
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
  let html = buildApp({
    lockers,
    catalog,
    head: [commonHead(url, image[0]), ld(product), `<script>window.VAIDORE_OPEN=${JSON.stringify(p.id)};</script>`].join("\n    ")
  });
  html = html
    .replace('<meta charset="utf-8" />', '<meta charset="utf-8" />\n    <base href="../" />')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(`${p.name} – ${p.tagline}`)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="product" />`)
    .replace(
      "<body>",
      `<body>\n    <noscript><h1>${esc(p.name)} – ${esc(CONC[p.conc] || p.conc)}</h1><p>${esc(p.desc)}</p><p>${esc(desc)}</p></noscript>`
    );
  fs.writeFileSync(path.join(site, "kvepalai", `${p.id}.html`), html);
}

// 6. Statiniai puslapiai – tas pats dizainas (src/pages/_layout.html + src/styles/01, 02, 08)
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
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
const pages = [];
for (const f of fs.readdirSync(path.join(src, "pages")).filter(f => !f.startsWith("_") && f.endsWith(".html"))) {
  const page = fs.readFileSync(path.join(src, "pages", f), "utf8");
  const title = (page.match(/<!-- title: (.*?) -->/) || [])[1] || S.shop;
  const slug = f.replace(/\.html$/, "");
  const noindex = slug === "aciu";
  if (!noindex) pages.push(slug);
  const head = [`<link rel="canonical" href="${SITE}/${slug}" />`, noindex && !NOINDEX ? `<meta name="robots" content="noindex" />` : "", robotsMeta, analyticsHead]
    .filter(Boolean)
    .join("\n    ");
  const html = fill(layout.replace("{{title}}", esc(title)).replace("{{css}}", css).replace("{{head}}", head).replace("{{body}}", page));
  fs.writeFileSync(path.join(site, f), html);
}

// 7. sitemap.xml ir robots.txt
const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE}/`, ...catalog.products.map(p => `${SITE}/kvepalai/${p.id}`), ...pages.map(s => `${SITE}/${s}`)];
fs.writeFileSync(
  path.join(site, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
fs.writeFileSync(
  path.join(site, "robots.txt"),
  NOINDEX ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nDisallow: /api/\nDisallow: /aciu\n\nSitemap: ${SITE}/sitemap.xml\n`
);

const files = fs.readdirSync(site, { recursive: true }).filter(f => fs.statSync(path.join(site, f)).isFile());
console.log(
  `${path.relative(root, site) || "."}/ – ${files.length} failai, programėlė ${Math.round(app.length / 1024)} KB, ${catalog.products.length} kvapų puslapiai, paštomatų: ${lockers}${NOINDEX ? " · noindex" : ""}`
);
