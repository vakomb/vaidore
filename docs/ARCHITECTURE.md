# Vaidore – architektūra (v3)

## Kaip veikia

```
src/index.html ──tools/build.mjs──► vienas HTML (CSS + katalogas + JS viduje)
               └─tools/build-site.mjs─► site/ ──► Vercel (vercel.json) arba GitHub Pages (.github/workflows/pages.yml)
                    puslapis kiekvienam adresui (SEO), kvepalai/<id>.html, 404.html, sitemap.xml, robots.txt,
                    data/omniva.json (paštomatai), assets/admin.js + admin.css (administravimas – tik /admin)
Supabase (ubtytpfsqbofqizgkxtc)
  ├─ Postgres + RLS ── kvapai, šeimos, kategorijos, nustatymai, profiliai, užsakymai, atsiliepimai, užklausos, žurnalas
  ├─ Auth ─────────── pirkėjų ir administratoriaus paskyros (el. paštas + slaptažodis, patvirtinimas laišku)
  ├─ Storage ──────── „products“ – nuotraukos (įkelia tik administratorius)
  └─ Edge Function „shop“ (supabase/functions/shop + _shared/shop.js)
        /checkout ─────► Stripe Checkout (kainos ir likučiai – iš bazės)
        /order ────────► padėkos puslapiui: apmokėta? + mėginukų kodas; įrašo užsakymą, jei webhook dar neatėjo
        /stripe-webhook ◄ Stripe (parašas) ──► užsakymas į bazę (likučiai sumažinami), kodas, laiškai (Resend)
        /admin ────────► išsiųsta (+ laiškas), grąžinti pinigus, „vėl turime“ laiškai, svetainės perrinkimas
        /account ──────► paskyros ištrynimas (BDAR)
src/data/catalog.json ── pradiniai duomenys (npm run seed → supabase/seed.sql) ir atsarginis katalogas
```

Produkcijoje – jokių npm priklausomybių: naršyklė ir serverio funkcija kalba su Supabase, Stripe ir Resend tik per `fetch`.
`playwright` (testams, dalinimosi paveikslams) ir `sharp` (ikonoms) – tik kūrėjo kompiuteryje.

### Katalogas: trys sluoksniai

1. **Surinkimo metu** `tools/build-site.mjs` paima katalogą iš Supabase (`tools/db-catalog.mjs`, viešas raktas, tik matomi įrašai);
   nepavykus – `src/data/catalog.json`. Jis įdedamas į kiekvieną puslapį (`window.VAIDORE_CATALOG`) ir naudojamas SEO puslapiams.
2. **Paleidus** programėlė iškart rodo įdėtą (arba naujesnę telefone išsaugotą `vaidore_catalog_v1`) kopiją – be laukimo.
3. **Po pirmo vaizdo** `refreshCatalog()` (`20-supabase.js`) parsisiunčia šviežią katalogą ir, jei pasikeitė, perpiešia –
   todėl kainos, likučiai ir nauji kvapai iš administravimo skydelio matomi iškart, net neperrinkus svetainės. Naujo kvapo
   adresas (`kvepalai/<naujas>`) veikia per `404.html` (ta pati programėlė); SEO puslapis atsiras po perrinkimo.

### Adresai

Tikri adresai (History API, `14-router.js`): „“, `kvepalai`, `moterims`, `vyrams`, `unisex`, `meginukai`, `kategorija/<id>`,
`kvepalai/<id>`, `krepselis`, `megstami`, `paskyra[/skirtukas]`, `admin[/skyrius[/id]]`, `pagalba`, `apie-mus`, `testas`, `rinkinys`.
Visos nuorodos santykinės, šaknis – `<base href>` (`BASE_PATH`: Vercel „/“, GitHub Pages „/vaidore/“). Seni `#/…` adresai (v1–v2)
nukreipiami. Vercel: `admin/*` ir `paskyra/*` perrašomi į `admin` / `paskyra` (atsakymas 200); GitHub Pages juos aptarnauja `404.html`.

## Duomenų bazė (`supabase/migrations/`)

| Lentelė | Kas | Skaito | Rašo |
| --- | --- | --- | --- |
| `products`, `families`, `categories`, `product_categories`, `settings` | katalogas (`settings.data` – kaip `catalog.json` „settings“) | visi (paslėptus – tik admin) | admin |
| `profiles` | vardas, telefonas, adresas, mėgstamas paštomatas, mėgstami, Stripe klientas | savininkas, admin | savininkas (be `email`, `stripe_customer`) |
| `orders` | užsakymai (eilutės, sumos centais, pristatymas, būsena, siuntos nr.) | pirkėjas (pagal paskyrą arba patvirtintą el. paštą), admin | serveris (`vd_record_order`), admin – būsena |
| `reviews` | atsiliepimai (`pending` → `approved` / `hidden`) | visi – paskelbtus | tik pirkę šį kvapą (RLS), admin |
| `restock_requests` | „Pranešti, kai bus“ | admin | bet kas (tik naujas, nepažymėtas) |
| `audit_log` | žurnalas (trigeriai `vd_audit`: kas, kada, kas pasikeitė „buvo → dabar“) | admin | tik trigeriai |
| `admin_emails` | administratorių el. paštai | niekas (tik `is_admin()`) | tik SQL |

- `is_admin()` – prisijungęs, el. paštas `admin_emails` ir **patvirtintas**. Naudojama visose politikose ir Storage.
- `vd_record_order(o)` – užsakymas įrašomas vieną kartą (`on conflict (stripe_session)`) ir toje pačioje transakcijoje sumažinami
  likučiai (buteliukai ir rinkinio kvapai; mėginukai 2 ml – ne). `vd_refund_order(id)` – grąžinus pinigus likutis atstatomas.
- `orders.mailed` – laiškai išsiunčiami vieną kartą, net jei užsakymą pirmas įrašė padėkos puslapis, o Stripe pakartoja webhook.

## Administravimo skydelis (`/admin`)

`23-admin-loader.js` patikrina teises (`auth.isAdmin`, iš `rpc/is_admin`) ir tik tada įkelia `assets/admin.js` ir `admin.css` –
pirkėjams administravimo kodas nesiunčiamas. Skydelis (`src/scripts/admin/`, vienas scope) programėlės funkcijas gauna per
`window.VD`, duomenis skaito ir rašo tiesiai į Supabase su administratoriaus teisėmis (RLS), o veiksmus su paslaptimis –
per `shop/admin`.

| Skyrius | Ką daro |
| --- | --- |
| Apžvalga | Pajamos šiandien / 7 d. / 30 d., vidutinis krepšelis; kas laukia (išsiųsti, atsiliepimai, užklausos); maži likučiai; perkamiausi; naujausi užsakymai; „Prieš paleidimą“ (rekvizitai, nuotraukos) |
| Užsakymai | Filtrai (Laukia / Išsiųsti / Visi / Grąžinti) su skaičiais, paieška, turinys (pirkėjas, pristatymas, rašteliukas, kodas, rinkinio kvapai); „Supakuota“, „Išsiųsta…“ (siuntos nr. + laiškas), „Pristatyta“, „Kopijuoti adresą“, „Grąžinti pinigus“ (patvirtinus), nuoroda į Stripe; CSV buhalterijai (Excel: `;`, BOM) |
| Kvapai | Sąrašas (paieška ir pagal natas, filtrai, greitas likučio keitimas, rodyti / slėpti); vėl turint – „Pranešti“ laukiantiems; redagavimas: informacija, natos ir savybės, tūriai ir kainos (kablelis ar taškas), mėginuko kaina, likutis, išvaizda su buteliuko peržiūra, nuotraukos (sumažinamos iki 1600 px, WebP; Safari – JPEG; tvarka, pašalinimas), kategorijos, žymė, eilė, data; naujas kvapas (adresas iš pavadinimo, nebekeičiamas); ištrynimas (patvirtinus) |
| Kategorijos | Kategorijos (aprašymas, paveikslas, eilė, rodymas) ir kvapo šeimos; šeimos su kvapais ištrinti neleidžiama |
| Atsiliepimai | Laukia / Paskelbti / Paslėpti; paskelbti, paslėpti, ištrinti |
| Laukiantys | Užklausos pagal kvapą; „Pranešti (N)“ – tik kai kvapas vėl prekyboje; ištrinti el. paštą |
| Nustatymai | Parduotuvė, pradžios kolekcija, pristatymas ir šalys, rinkinys / mėginukų kodas / pakavimas, įmonės rekvizitai, istorija (su nuotrauka), matavimas. Saugant sujungiama su esamais duomenimis |
| Žurnalas | Paskutiniai 300 pakeitimų: kas, kada, kas pasikeitė |

Po katalogo pakeitimo – `refreshCatalog()` ir pranešimas su „Atnaujinti svetainę“ (`shop/admin` `rebuild`: GitHub Actions
`pages.yml` per `GITHUB_TOKEN` ir / arba `VERCEL_DEPLOY_HOOK`). Neišsaugoti pakeitimai – perspėjama prieš išeinant.
Telefone skyriai – slenkama juosta viršuje, kompiuteryje – šoninis meniu.

## Paskyros (`/paskyra`, `22-account.js`)

Registracija ir prisijungimas (Supabase Auth be bibliotekos: `20-supabase.js`), slaptažodžio atkūrimas, patvirtinimas laišku
(grįžtama į `paskyra#access_token=…`). Prisijungus: užsakymai (būsena, siuntos nr., „Įvertinti“, „Pirkti dar kartą“), profilis,
adresas ir mėgstamas paštomatas (perduodami Stripe), nuolaidos kodai, slaptažodis, duomenų atsisiuntimas, paskyros ištrynimas.
Mėgstami sujungiami tarp įrenginių. Pirkti galima ir be paskyros; užsakymai be paskyros matomi, kai pirkėjas vėliau
užsiregistruoja tuo pačiu (patvirtintu) el. paštu.

## Apmokėjimas (Stripe)

1. Naršyklė siunčia `POST shop/checkout` – **be kainų**: `items: [{ id, ml, qty }]` (rinkinys – `{ id, qty, picks }`),
   `shipping: { method, locker }`, `gift: { on, note }`, `site` (grįžimo adresas – tik iš leidžiamų, `pickSite`).
2. Serveris kainas ir likučius ima iš bazės, tikrina kiekius (`maxQty`), likučius (409), rinkinį; sukuria Checkout sesiją
   (eilutės, pakavimas, pristatymas – nemokamai nuo `freeShippingFrom`, paštomatas `metadata.locker` arba adresas LT / LV / EE,
   telefonas, nuolaidų kodai, `locale: lt`). Prisijungusiam – Stripe klientas su išsaugotu adresu, užsakymas susiejamas su paskyra.
3. Pirkėjas moka Stripe puslapyje → `/aciu?s=<sesija>` (krepšelis išvalomas, `shop/order` – kodas ir užsakymo įrašas).
4. `shop/stripe-webhook` (parašas `STRIPE_WEBHOOK_SECRET`, ±5 min.) → užsakymas į bazę, mėginukų kodas, laiškai savininkui
   ir pirkėjui (jei `RESEND_API_KEY`). Kvitus siunčia pati Stripe.

### Mėginukų kainos grąžinimas

Perkant mėginukus ar rinkinį, jų suma įrašoma į `metadata.sample_credit_cents`. Po apmokėjimo `ensureCredit` sukuria vienkartinį
Stripe kuponą ir kodą `VD-<užsakymo nr.>` (galioja `sampleCredit.days` d., užsakymui nuo `sampleCredit.minOrder` €). Idempotency
raktai ir paieška pagal kodą neleidžia sukurti dviejų – todėl jį saugiai kviečia ir webhook, ir padėkos puslapis.

## Pristatymas į Omniva paštomatą

`build-site.mjs` parsiunčia `https://www.omniva.ee/locations.json`, palieka paštomatus (`TYPE 0`) iš `settings.countries` ir įrašo
glaustai į `site/data/omniva.json`; programėlė jį atsisiunčia tik atidarius pasirinkimą (paieška be diakritikų, „Rasti artimiausius“).
Nepavykus – paštomato pasirinkimo nėra, adresą pirkėjas įrašo Stripe lange.

## SEO ir dalinimasis

Kiekvienam adresui – statinis HTML su savo `title`, `description`, kanoniniu adresu ir Open Graph; kvapams – Product JSON-LD
(kainos, prieinamumas, paskelbti atsiliepimai) ir `og/<id>.jpg` (`npm run og`) arba pirma nuotrauka. `sitemap.xml`, `robots.txt`
(`/admin`, `/paskyra`, `/krepselis`, `/aciu` – neindeksuojami). GitHub Pages kopija – `NOINDEX=1`.

## Matavimas (be slapukų)

`settings.analytics`: `plausible` (domenas) ir / arba `vercel: true`. `track()` siunčia: „Peržiūrėjo kvapą“, „Į krepšelį“,
„Pradėjo apmokėjimą“, „Apmokėjo“ (su suma), „Užbaigė testą“, „Pranešti, kai bus“. Slapukų juostos nereikia.

## Dizainas (AutoEasier DNR)

Baltas fonas, skyriai atskiriami erdve ir plonomis linijomis; šešėliai (`--elev-*`) – tik objektams; sistemos šriftas,
`tabular-nums`; spyruoklinis judesys (`--spring`), paspaudimas `scale(.975)`; langai – apatinis lapas telefone / centre kompiuteryje,
braukimas ir „Atgal“ uždaro; jungikliai ir segmentai – kaip iOS. Buteliukai nupiešti SVG (`04-bottle.js`), kol nėra nuotraukų.
`prefers-reduced-motion` – be animacijų.

## Testai

`npm test` = `check.mjs` → `test-api.mjs` → `test-smoke.mjs` → `test-admin.mjs` (be interneto).

- `test-api.mjs` – serverio logika (`_shared/shop.js`) su imituotu Supabase, Stripe, Resend: kainos ir likučiai tik iš bazės,
  rinkinys, paštomatas, pakavimas, prisijungusio pirkėjo susiejimas, grįžimo adresas, užsakymas vieną kartą, kodas, webhook parašas
  ir laiškai, administratoriaus teisės ir veiksmai, paskyros ištrynimas.
- `test-smoke.mjs` – parduotuvė telefone (430 × 932) ir kompiuteryje (1440 × 900), Supabase imituojamas (`mock-supabase.mjs`):
  pradžia, meniu, katalogas, paieška, filtrai, rūšiavimas, kvapo puslapis, mini krepšelis, rinkinys, testas, krepšelis (kiekis,
  atšaukimas, paštomatas, pakavimas), apmokėjimas (be kainų), `/aciu`, mėgstami, 404, seni adresai, SEO failai; variantas –
  išparduota + „Pranešti, kai bus“, galerija, atsiliepimai; be JS klaidų.
- `test-admin.mjs` – prisijungimas → skydelis; užsakymų, kvapų (ir nuotraukų įkėlimo), kategorijų, atsiliepimų, laukiančiųjų,
  nustatymų, žurnalo veiksmai tikrinami imituotoje bazėje; naujas kvapas iškart matomas parduotuvėje, paslėptas – ne;
  pirkėjui ir neprisijungusiam – be teisių; telefone telpa ekrane; be JS klaidų.
- `--shots` – ekrano nuotraukos į `.verify/shots/`.

## Sąmoningai nedaryta

- Iššokantys langai, laiko atskaitos, „liko 2 vnt.“, netikri atsiliepimai – griauna pasitikėjimą.
- Slapukų juosta – nereikalinga (nėra slapukų; localStorage – krepšeliui, mėgstamiems, prisijungimui).
- Kodas „tik to paties kvapo buteliukui“ – Checkout eilutės kuriamos `price_data`, Stripe `applies_to` jų nemato.
- Pirkėjų sąrašas skydelyje – užsakymuose matyti visi pirkėjo duomenys; atskiro CRM nereikia.
