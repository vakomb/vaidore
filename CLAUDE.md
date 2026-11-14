# Instrukcijos Claude (ir žmonėms)

Kalba su vartotoju: **lietuvių**. Vaidore.com – kvepalų e-parduotuvė. Telefonui (iPhone, 430 px) ir kompiuteriui. Dizainas ir sandara – kaip AutoEasier (vakomb/skelbimai).

## Nekeičiamos taisyklės

1. Keisk tik `src/`, `api/`, `tools/`. `dist/` ir `site/` – surinkimo rezultatas (nekeliami į GitHub).
2. Po pakeitimų: `npm test` (patikra → surinkimas → naršyklės testas telefone ir kompiuteryje). Turi likti žalias.
3. `src/scripts/app/*.js` – **vienas bendras scope**, sujungiamas eilės tvarka (01 → 15). Nėra `import/export`. Naujas failas – kitas numeris.
4. Literalus `</style>` ar `</script>` šaltinio faile sulaužytų puslapį – build sustoja.
5. Prekės, kainos, pristatymas, įmonės duomenys – **tik** `src/data/catalog.json`. Tą patį failą naudoja ir `api/checkout.js` – kainos visada tikrinamos serveryje.
6. Dizaino reikšmės (spalvos, kampai, šešėliai, judesys) – tik `src/styles/01-tokens.css`.
7. Raktų (Stripe) į repozitoriją nedėk – tik Vercel → Settings → Environment Variables (`STRIPE_SECRET_KEY`).
8. localStorage raktų (`vaidore_cart_v1`, `vaidore_fav_v1`) nepervadink – jie pirkėjų telefonuose.

## Kur ką rasti

- Surinkimas: `tools/build.mjs` (`src/index.html` su `@inline` / `@partial` / `@catalog` / `@app` žymomis → vienas HTML), `tools/build-site.mjs` (→ `site/`, Vercel), `tools/serve.mjs` (peržiūra), `tools/check.mjs`, `tools/test-smoke.mjs`.
- Ekranai: `src/partials/` (Pradžia, Katalogas, Mėgstami, Krepšelis, apatinė juosta, šoninis meniu, langai).
- Stiliai: `src/styles/01-tokens` → `02-base` → `03-layout` (juosta, antraštės) → `04-components` → `05-products` → `06-detail` → `07-cart` → `08-pages` (statiniai puslapiai) → `09-desktop`.
- Logika: `01-util`, `02-icons`, `03-catalog`, `04-bottle` (buteliuko SVG), `05-state` (krepšelis, mėgstami), `06-cards`, `07-home`, `08-shop` (paieška, filtrai, rūšiavimas), `09-sheet` (langai, pranešimai), `10-product`, `11-cart`, `12-checkout`, `13-info`, `14-router`, `15-boot`.
- Apmokėjimas: `api/checkout.js` (Vercel funkcija, Stripe Checkout, be npm paketų) → `/aciu` (`src/pages/aciu.html` išvalo krepšelį).
- Statiniai puslapiai: `src/pages/` (`_layout.html` + `aciu`, `salygos`, `privatumas`; `{{company.*}}` iš katalogo).
- PWA: `src/public/` (`manifest.webmanifest`, `sw.js` – keičiant `CACHE` telefonai išmeta seną kopiją, ikonos – `tools/make-icons.mjs`).
- Išsamiau – `docs/ARCHITECTURE.md`.
