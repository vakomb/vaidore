# Instrukcijos Claude (ir žmonėms)

Kalba su vartotoju: **lietuvių**. Vaidore.com – kvepalų e-parduotuvė (v3). Telefonui (iPhone, 430 px) ir kompiuteriui. Dizainas ir sandara – kaip AutoEasier (vakomb/skelbimai).
Duomenų bazė, paskyros, failai ir serverio funkcijos – **Supabase** (projektas `ubtytpfsqbofqizgkxtc`); apmokėjimas – **Stripe**; svetainė – statinė (Vercel arba GitHub Pages).

## Nekeičiamos taisyklės

1. Keisk tik `src/`, `supabase/`, `tools/` (ir dokumentus). `dist/`, `site/`, `.verify/` – surinkimo rezultatas (nekeliami į GitHub).
2. Po pakeitimų: `npm test` (patikra → serverio testas → parduotuvės naršyklės testas → administravimo testas, be interneto). Turi likti žalias.
3. `src/scripts/app/*.js` ir `src/scripts/admin/*.js` – **vienas bendras scope** kiekvienas, sujungiami eilės tvarka. Nėra `import/export`. Programėlėje `99-boot` – paskutinis, naujas failas – kitas numeris (24–98). Administravimas programėlės funkcijas gauna per `window.VD` (`23-admin-loader.js`).
4. Literalus `</style>` ar `</script>` šaltinio faile sulaužytų puslapį – build sustoja.
5. Kainos, likučiai, kvapai, nustatymai – **duomenų bazėje** (keičiami administravimo skydelyje `/admin`). `src/data/catalog.json` – pradiniai duomenys (`npm run seed`) ir atsarginis katalogas, jei surinkimo metu bazė nepasiekiama. Kainas ir likučius visada tikrina serveris (`supabase/functions/_shared/shop.js`).
6. Saugumas – RLS (`supabase/migrations/`): kiekviena nauja lentelė su `enable row level security` ir politikomis; administratorius – `is_admin()` (el. paštas lentelėje `admin_emails`, patvirtintas). Veiksmai su paslaptimis (Stripe, laiškai) – tik Edge Function `shop`.
7. Dizaino reikšmės (spalvos, kampai, šešėliai, judesys) – tik `src/styles/01-tokens.css`. Tekstų kontrastas ≥ 4,5:1. Šriftas – Jost (SIL OFL, `src/public/fonts/jost-vf.woff2`, kintamas storis 300–700). CSS selektoriuose nerašyk „ :is(…)“ (tarpas prieš „:“) – glaudintuvas jį pašalina; `check.mjs` tai tikrina.
8. Raktų į repozitoriją nedėk. Paslaptys – Supabase → Edge Functions → Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `GITHUB_TOKEN`…). `src/data/supabase.json` – tik **publishable** raktas (viešas, duomenis saugo RLS).
9. localStorage raktų (`vaidore_cart_v1`, `vaidore_fav_v1`, `vaidore_ship_v1`, `vaidore_gift_v1`, `vaidore_auth_v1`, `vaidore_catalog_v1`) nepervadink – jie pirkėjų telefonuose.
10. Atsiliepimai – tik tikri (rašo tik pirkę, skelbiami po peržiūros); jokių iššokančių langų, laiko atskaitų, netikrų likučių.
11. Adresai – santykiniai (`kvepalai/rasa`, `admin/kvapai`), nes svetainė veikia ir šaknyje, ir poaplankyje (`<base href>`, `BASE_PATH`).

## Kur ką rasti

- Surinkimas: `tools/build.mjs` (`src/index.html` su `@inline` / `@partial` / `@catalog` / `@lockers` / `@app` / `@base` → vienas HTML; `buildAdmin()` → `assets/admin.js` + `admin.css`), `tools/build-site.mjs` (→ `site/`: puslapis kiekvienam adresui, kvapų SEO puslapiai, sitemap, robots, Omniva paštomatai; katalogas – iš Supabase, `tools/db-catalog.mjs`), `tools/serve.mjs` (peržiūra), `tools/check.mjs`.
- Ekranai: `src/partials/` (antraštė, šoninis meniu, poraštė, Pradžia, Kvepalai, Kvapas, Krepšelis, Mėgstami, Paskyra, Pagalba, Administravimas, 404, langai).
- Stiliai: `01-tokens` → `02-base` → `03-layout` → `04-components` → `05-products` → `06-detail` → `07-cart` → `10-flows` → `11-account` → `12-stage` (scenos) → `09-desktop` (paskutinis); `08-pages` – statiniams puslapiams; `admin.css` – tik administravimui.
- Programėlė: `01-util` … `14-router` (tikri adresai, History API), `16-quiz`, `17-discovery`, `18-delivery` (paštomatai), `19-notify`, `20-supabase` (REST, Auth, Storage, Edge Functions per `fetch`, katalogas iš bazės), `21-header`, `22-account`, `23-admin-loader`, `24-stage` (scenos: skaidrės, kategorijos), `25-home-config` (pradžios skaidrės ir plytelės iš nustatymų, peržiūra), `26-newsletter` (naujienlaiškis poraštėje, atsisakymas), `99-boot`.
- Paveikslai (v7): kvapo nuotrauka – tik buteliukas permatomame fone `img/kvapai/<id>-1.webp` (`python3 tools/make-bottles.py`, vienas failas kvapui, šešėlis – CSS `--bottle-shadow`); logotipas VAIDORE – etiketės šriftu, `src/partials/logo.svg` (`python3 tools/make-logo.py`, ten pat favicon); ikonos – `node tools/make-icons.mjs`; OG – `npm run og`. Akcentas – juoda (`--brand`), krepšelio skaičiukas – raudonas (`--badge`); mėlynos spalvos nenaudoti. Juosta virš header'io – fiksuoto aukščio, iki 2 eilučių (`fitNote`). Dydžiai ir sandara – kaip parfumada.lt (v10). Išsamiau – ARCHITECTURE „Dizainas (v10)“ ir „Dizainas (v7)“.
- Administravimas: `src/scripts/admin/` – `01-core` (meniu, pagalbinės), `02-overview`, `03-orders`, `04-products`, `05-categories`, `06-reviews`, `07-restock`, `08-settings`, `09-log`, `10-home` (Pradžia: skaidrės, nuotraukos, plytelės su gyva peržiūra), `11-newsletter` (prenumeratoriai, CSV, laiškas visiems), `12-topbar` (juosta virš header'io – žinutės, dizainas, dydžiai; Pradžios skyriuje, `settings.topbar`).
- Serveris: `supabase/functions/shop/index.ts` (maršrutai) + `supabase/functions/_shared/shop.js` (checkout, order, stripe-webhook, admin, account, newsletter). Duomenų bazė: `supabase/migrations/`, pradiniai duomenys – `supabase/seed.sql` (`npm run seed`).
- Statiniai puslapiai: `src/pages/` (`_layout.html` + `aciu`, `salygos`, `privatumas`; `{{company.*}}` iš nustatymų).
- Testai: `tools/test-api.mjs` (serverio logika), `tools/test-smoke.mjs` (parduotuvė), `tools/test-admin.mjs` (skydelis); Supabase imituojamas – `tools/mock-supabase.mjs`.
- Diegimas ir nustatymai – `SKAITYK.txt`; išsamiau – `docs/ARCHITECTURE.md`.
