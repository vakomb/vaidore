# Instrukcijos Claude (ir žmonėms)

Kalba su vartotoju: **lietuvių**. Vaidore.com – kvepalų e-parduotuvė. Telefonui (iPhone, 430 px) ir kompiuteriui. Dizainas ir sandara – kaip AutoEasier (vakomb/skelbimai).

## Nekeičiamos taisyklės

1. Keisk tik `src/`, `api/`, `tools/`. `dist/` ir `site/` – surinkimo rezultatas (nekeliami į GitHub).
2. Po pakeitimų: `npm test` (patikra → serverio testas → surinkimas ir naršyklės testas telefone ir kompiuteryje). Turi likti žalias.
3. `src/scripts/app/*.js` – **vienas bendras scope**, sujungiamas eilės tvarka (01 → 19, `99-boot` – paskutinis). Nėra `import/export`. Naujas failas – kitas numeris (20–98).
4. Literalus `</style>` ar `</script>` šaltinio faile sulaužytų puslapį – build sustoja.
5. Prekės, kainos, likučiai, pristatymas, įmonės duomenys – **tik** `src/data/catalog.json`. Tą patį failą naudoja ir `api/*` – kainos ir likučiai visada tikrinami serveryje.
6. Dizaino reikšmės (spalvos, kampai, šešėliai, judesys) – tik `src/styles/01-tokens.css`. Tekstų kontrastas ≥ 4,5:1.
7. Raktų (Stripe, Resend) į repozitoriją nedėk – tik Vercel → Settings → Environment Variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`).
8. localStorage raktų (`vaidore_cart_v1`, `vaidore_fav_v1`, `vaidore_ship_v1`, `vaidore_gift_v1`) nepervadink – jie pirkėjų telefonuose.
9. Atsiliepimai – tik tikri (`reviews`); jokių iššokančių langų, laiko atskaitų, netikrų likučių.

## Kur ką rasti

- Surinkimas: `tools/build.mjs` (`src/index.html` su `@inline` / `@partial` / `@catalog` / `@lockers` / `@app` žymomis → vienas HTML), `tools/build-site.mjs` (→ `site/`: kvapų SEO puslapiai, sitemap, robots, Omniva paštomatai), `tools/make-og.mjs` (dalinimosi paveikslai), `tools/serve.mjs` (peržiūra), `tools/check.mjs`, `tools/test-api.mjs`, `tools/test-smoke.mjs`.
- Ekranai: `src/partials/` (Pradžia, Katalogas, Mėgstami, Krepšelis, apatinė juosta, šoninis meniu, langai).
- Stiliai: `src/styles/01-tokens` → `02-base` → `03-layout` (juosta, antraštės) → `04-components` → `05-products` → `06-detail` → `07-cart` → `10-flows` (testas, rinkinys, paštomatas, istorija…) → `09-desktop` (paskutinis); `08-pages` – statiniams puslapiams.
- Logika: `01-util` (+ `track`), `02-icons`, `03-catalog` (+ likučiai, „Tiks …“), `04-bottle` (buteliuko SVG), `05-state` (krepšelis, mėgstami, pristatymas, pakavimas), `06-cards`, `07-home`, `08-shop` (paieška, filtrai, rūšiavimas), `09-sheet` (langai, pranešimai), `10-product`, `11-cart`, `12-checkout`, `13-info`, `14-router`, `16-quiz`, `17-discovery`, `18-delivery` (paštomatai), `19-notify`, `99-boot`.
- Apmokėjimas: `api/checkout.js` (Stripe Checkout, be npm paketų) → `/aciu` (`src/pages/aciu.html` išvalo krepšelį, `api/order.js` – mėginukų kodas); `api/stripe-webhook.js` (parašas, kodas, laiškai), bendros funkcijos – `api/_lib.js`.
- Statiniai puslapiai: `src/pages/` (`_layout.html` + `aciu`, `salygos`, `privatumas`; `{{company.*}}` iš katalogo).
- PWA: `src/public/` (`manifest.webmanifest`, `sw.js` – keičiant `CACHE` telefonai išmeta seną kopiją, ikonos – `tools/make-icons.mjs`).
- GitHub Pages: `.github/workflows/pages.yml` (peržiūra be apmokėjimo, `NOINDEX=1`). Adresai – tik santykiniai (be „/“ pradžioje), kad veiktų ir poaplankyje.
- Išsamiau – `docs/ARCHITECTURE.md`.
