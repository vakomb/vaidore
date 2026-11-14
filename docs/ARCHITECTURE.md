# Vaidore – architektūra

## Kaip veikia

```
src/index.html ──tools/build.mjs──► vienas HTML (CSS + katalogas + JS viduje, ~145 KB, gzip ~42 KB)
                └─tools/build-site.mjs─► site/ ──► Vercel (vercel.json) arba GitHub Pages (.github/workflows/pages.yml)
                     + site/kvepalai/<id>.html (SEO), sitemap.xml, robots.txt, data/omniva.json (paštomatai)
api/checkout.js ───────► /api/checkout ──► Stripe Checkout
api/order.js ──────────► /api/order?s=…  ──► padėkos puslapiui: apmokėta? + mėginukų kodas
api/stripe-webhook.js ─► /api/stripe-webhook ◄── Stripe (parašas) ──► kodas + laiškai (Resend)
api/_lib.js ── bendros funkcijos (Stripe / Resend per fetch, ensureCredit)
src/data/catalog.json ── vienas tiesos šaltinis: programėlei (inline), site/catalog.json ir api/* (kainos, likučiai)
```

Be jokių priklausomybių produkcijoje: surinkimas – tik Node.js, apmokėjimas – Stripe REST API per `fetch`.
`playwright` (testams) ir `sharp` (ikonoms) – tik kūrėjo kompiuteryje.

Visi adresai santykiniai (`salygos`, `api/checkout`, `sw.js`, `manifest.webmanifest`), todėl ta pati svetainė veikia
ir šaknyje (Vercel, vaidore.com/), ir poaplankyje (GitHub Pages, vakomb.github.io/vaidore/).
`.github/workflows/pages.yml` – po kiekvieno įkėlimo į `main` surenka `site/` ir paskelbia GitHub Pages (apmokėjimo ten nėra).

## Dizainas (AutoEasier DNR)

- Fonas `#F3F5F8`, baltos 20 px kortelės; šešėlis `--sh` = viršutinis šviesos kraštas + plonas žiedas (`0 0 0 1px`) + švelnus šešėlis – be `border`, todėl niekas nepasislenka.
- Sistemos šriftas (SF Pro), `tabular-nums` visur, tekstas ≥ 12 px (antriniai užrašai 13–14 px, pagrindiniai 15–17 px).
- Apatinė juosta – matinis stiklas (`rgba(255,255,255,.8)` + `blur(24px) saturate(150%)`), kontūrinė / užpildyta ikona (`nvO` / `nvF`), raudonas „brangakmenio“ skaičiukas.
- Langai – apatinis lapas (telefone) / centruotas langas (kompiuteryje), pritemdymas `rgba(15,23,42,.25)` + `blur(2px)` atskirame `::before` sluoksnyje (lapas lieka nepermatomas), spyruoklė `cubic-bezier(.22,1,.36,1)`, braukimas žemyn uždaro, „Atgal“ uždaro.
- Paspaudimas – `scale(.975)` ir atšokimas spyruokle; skirtukai keičiami akimirksniu, kiekvienas prisimena slinkimo vietą.
- Žymės – permatoma spalva + 1 px vidinis žiedas; ant buteliuko – matinio stiklo žymės.
- `prefers-reduced-motion` – be animacijų.

## Parašo detalės

1. **Buteliukai** (`04-bottle.js`) – kiekvienas kvapas nupieštas SVG: stiklas su šviesos atspindžiais, skystis savo spalva, etiketė VAIDORE, dangtelis (auksas / juodas / sidabras / mediena), 4 formos. Nuotraukų nereikia; vėliau galima pakeisti tikromis.
2. **Natų piramidė** – viršutinės / širdies / bazinės natos su kylančiais spalvotais brūkšneliais kvapo spalva; ilgaamžiškumas ir sklaida – 5 dalių matuokliai.
3. **Nemokamo pristatymo juosta** krepšelyje ir šoniniame meniu: „Iki nemokamo pristatymo liko …“ → žalia „Pristatymas nemokamas“.

## Ekranai

| Adresas | Ekranas |
| --- | --- |
| `#/` | Pradžia: vertės žinutė (`settings.tagline`), kolekcija (`settings.hero`), Moterims / Vyrams / Unisex / Mėginukai, „Rask savo kvapą“ + atradimų rinkinys, Populiariausi, Pagal nuotaiką, Naujienos, atsiliepimai (tik tikri), pasitikėjimas, „Mūsų istorija“ (`settings.story`), poraštė su rekvizitais |
| `#/testas` | „Rask savo kvapą“ – 4 klausimai → 3 kvapai su „Kodėl tinka“ → „Išbandyti mėginukais“ (rinkinys su tais kvapais) |
| `#/rinkinys` | Atradimų rinkinys (`settings.discovery`): bet kurie N kvapų po 2 ml už fiksuotą kainą |
| `#/katalogas` | Paieška (be diakritikų, ir pagal natas), Visi / Moterims / Vyrams / Unisex, filtrai (šeima, koncentracija, kaina, mėginukai), rūšiavimas |
| `#/kvepalai/<id>` | Kvapo lapas: nuotraukos (galerija) arba buteliukas, „Dalintis“, „Tiks …“, tūris + mėginukas 2 ml, pristatymo eilutė, mėginuko kainos grąžinimas, piramidė, savybės, atsiliepimai, „Jums gali patikti“, „Į krepšelį“ arba „Pranešti, kai bus“ |
| `/kvepalai/<id>` | Statinis tas pats kvapas paieškos sistemoms ir dalinimuisi (title, description, kanoninis adresas, Open Graph `og/<id>.jpg`, Product JSON-LD) – atsidaro programėlė su kvapo lapu |
| `#/megstami` | Mėgstami (širdelė ant kortelės) |
| `#/krepselis` | Eilutės, kiekis (0 – pašalina, „Atšaukti“), pristatymas (Omniva paštomatas su paieška ir „Rasti artimiausius“ / DPD), dovanų pakavimas + rašteliukas, suvestinė, „Apmokėti saugiai“ |
| `#/info` | Pristatymas, pirkimas, grąžinimo žingsniai, kontaktai, dokumentai, rekvizitai |
| `/aciu`, `/salygos`, `/privatumas` | Statiniai puslapiai (`/aciu` – ir mėginukų kainos grąžinimo kodas) |

Kompiuteris (≥ 1024 px): kairėje šoninis meniu, prekės 4–5 stulpeliais, kvapo langas dviem stulpeliais, krepšelis – prekės ir lipni suvestinė.

## Apmokėjimas (Stripe)

1. Naršyklė siunčia `POST /api/checkout` – **be kainų**: `items: [{ id, ml, qty }]` (rinkinys – `{ id, qty, picks }`), `shipping: { method, locker }`, `gift: { on, note }`.
2. `api/checkout.js` kainas ima iš `src/data/catalog.json`, tikrina kiekius (`maxQty`), likučius (`stock: 0` → 409), rinkinio kvapus (N skirtingų), sukuria Checkout sesiją: `line_items`, dovanų pakavimas (atskira eilutė), pristatymas (tik pasirinktas būdas; nemokamai nuo `freeShippingFrom`, skaičiuojant prekes be pakavimo), paštomatas – `metadata.locker` ir be adreso klausimo, kurjeriui – adresas (LT / LV / EE), telefonas, nuolaidų kodai, `locale: lt`, `metadata` (`gift_note`, `ship_method`, `sample_credit_cents`).
3. Pirkėjas moka Stripe puslapyje (kortelė, Apple Pay, Google Pay) → `/aciu?s=<sesija>` → krepšelis išvalomas, `api/order` parodo mėginukų kodą, matavimas „Apmokėjo“.
4. `api/stripe-webhook.js` (parašas `STRIPE_WEBHOOK_SECRET`) → mėginukų kodas + laiškas savininkui (užsakymo santrauka, paštomatas, rašteliukas) ir pirkėjui (kodas), jei nustatytas `RESEND_API_KEY`. Kvitus pirkėjui siunčia pati Stripe.

### Mėginukų kainos grąžinimas (be duomenų bazės)

Perkant mėginukus ar atradimų rinkinį, `api/checkout.js` įrašo jų sumą į `metadata.sample_credit_cents`. Po apmokėjimo
`ensureCredit` (`api/_lib.js`) sukuria Stripe kuponą (`amount_off` = ta suma, vienkartinis) ir nuolaidos kodą `VD-<užsakymo nr.>`:
galioja `sampleCredit.days` d., vieną kartą, užsakymui nuo `sampleCredit.minOrder` € (t. y. buteliukui). Kodas visada tas pats
tam užsakymui, o Stripe `Idempotency-Key` ir paieška `promotion_codes?code=` neleidžia sukurti dviejų – todėl jį saugiai kviečia ir
webhook, ir padėkos puslapis. Pirkėjas kodą įveda Stripe lange (`allow_promotion_codes`).
Sąmoningai neribojama „tik to paties kvapo buteliukui“: Checkout eilutės kuriamos `price_data`, todėl Stripe `applies_to` produktų
nemato – kodas tinka bet kuriam buteliukui (pirkėjui dar palankiau, savininkui – tas pats pardavimas).

### Laiškai

Paprasčiausia (be kodo): Stripe → Settings → Customer emails → „Successful payments“ (kvitas pirkėjui) ir
Settings → Team and security → Notifications → „Successful payments“ (pranešimas savininkui). Tačiau Stripe pranešime nėra
paštomato, rašteliuko ir kodo – juos atsiunčia webhook per Resend (`RESEND_API_KEY`, `MAIL_FROM`, `ORDER_EMAIL_TO`).

Nustatymas: Vercel → Project → Settings → Environment Variables → `STRIPE_SECRET_KEY` (`sk_live_…`, bandymams `sk_test_…`),
`STRIPE_WEBHOOK_SECRET` (`whsec_…`), nebūtina: `RESEND_API_KEY`, `MAIL_FROM`, `ORDER_EMAIL_TO`, `SITE_URL=https://vaidore.com`.
Be rakto parduotuvė veikia, o „Apmokėti“ parodo „Apmokėjimas laikinai nepasiekiamas“ (taip ir GitHub Pages kopijoje).

## Pristatymas į Omniva paštomatą

`tools/build-site.mjs` surinkimo metu parsiunčia viešą `https://www.omniva.ee/locations.json` (≈1 500 paštomatų LT / LV / EE),
palieka `TYPE 0` (paštomatai) ir `settings.countries`, įrašo glaustai į `site/data/omniva.json` ([zip, pavadinimas, adresas, miestas,
šalis, platuma, ilguma]); programėlė jį atsisiunčia tik atidarius pasirinkimą. Paieška be diakritikų ir galūnių („Vilnius“ → „Vilniaus“),
„Rasti artimiausius“ – naršyklės vieta (tik paspaudus). Nepavykus parsiųsti – `window.VAIDORE_LOCKERS = 0`, paštomato pasirinkimo
nėra, adresą pirkėjas įrašo Stripe lange (kaip anksčiau). Sąrašas atnaujinamas kiekvieno surinkimo metu.

## SEO ir dalinimasis

- `site/kvepalai/<id>.html` – ta pati programėlė su `<base href="../">`, savo `title`, `description`, kanoniniu adresu
  (`SITE_URL` arba `https://<settings.domain>`), Open Graph (`src/public/og/<id>.jpg`, 1200 × 630, kuria `npm run og`) ir
  Product JSON-LD (kaina nuo–iki, prieinamumas, atsiliepimai – tik jei yra). Paleidus – `window.VAIDORE_OPEN` atidaro kvapo lapą.
- `sitemap.xml`, `robots.txt` (`/api/`, `/aciu` – neindeksuojami), kanoniniai adresai statiniuose puslapiuose.
- GitHub Pages kopija surenkama su `NOINDEX=1` (`noindex` ir `Disallow: /`), kad paieškos sistemos indeksuotų tik vaidore.com.
- „Dalintis“ kvapo lape – `navigator.share` arba nuorodos kopija (`kvepalai/<id>`).

## Matavimas (be slapukų)

`settings.analytics`: `plausible` – domenas (pvz. `vaidore.com`, Plausible paskyra) ir / arba `vercel: true` (Vercel Web Analytics;
pasirinktiniai įvykiai – Vercel Pro plane). Abu be slapukų, todėl slapukų juostos nereikia. `track()` (`01-util.js`) siunčia:
„Peržiūrėjo kvapą“, „Į krepšelį“, „Pradėjo apmokėjimą“, „Apmokėjo“ (`aciu.html`, su suma), „Užbaigė testą“, „Pranešti, kai bus“.

## Likučiai

`products[].stock`: nėra lauko – neskaičiuojama; `0` – „Laikinai išparduota“: kortelėje žymė, kvapo lape „Pranešti, kai bus“
(el. paštas į `settings.notifyForm`, pvz. Formspree; tuščia – atidaromas laiškas parduotuvei), rinkinyje kvapo nėra, serveris
(`api/checkout.js`) neleidžia pirkti, JSON-LD – `OutOfStock`. Likutis automatiškai nemažėja (tam reikėtų duomenų bazės) –
išpardavus, įrašykite `0` ir įkelkite.

## Prekių keitimas (`src/data/catalog.json`)

- `id` – adresas `#/kvepalai/<id>` (mažosios raidės, skaičiai, „-“). Nekeiskite esamų – jie gali būti pirkėjų krepšeliuose.
- `gender`: `moterims` / `vyrams` / `unisex`; `family`: `families[].id`; `conc`: `EDT` / `EDP` / `Parfum` / `Extrait`.
- `sizes`: `[{ "ml": 50, "price": 65 }]`, `sample` – mėginuko 2 ml kaina.
- `notes.top/heart/base`, `longevity` ir `sillage` (1–5), `seasons`, `time` (`diena` / `vakaras`).
- `look`: `liquid` (skysčio spalva), `tint` (fono atspalvis), `cap` (`gold` / `black` / `silver` / `wood`), `shape` (`rect` / `tall` / `round` / `square`).
- `badge` (`Populiaru`, `Naujiena` arba `null`), `rank` (populiarumo eilė), `added` (data, naujienoms).
- `images`: `["img/rasa-1.webp", "img/rasa-2.webp"]` – failai `src/public/img/` (WebP, ~1200 px, ≤ 150 KB). Pirma – kortelėse ir
  dalinimuisi, visos – galerijoje braukiant. Tuščia – rodomas buteliuko SVG.
- `reviews`: `[{ "name": "Ona K.", "text": "…", "rating": 5, "date": "2026-11-01" }]` – **tik tikri** atsiliepimai (sutikus
  pirkėjui). Tuščia – atsiliepimų sekcijos nėra niekur.
- `stock` – žr. „Likučiai“.
- `settings`: `tagline` (vertės žinutė), `dispatch`, `returnDays`, `hero`, `story` (`image` – nebūtina), `discovery`, `sampleCredit`,
  `gift` (`price`, `noteMax`), `notifyForm`, `analytics`, `company` (rekvizitai poraštėje ir puslapiuose; „[…]“ – nerodoma).
- `node tools/check.mjs` patikrina katalogą prieš įkeliant (nuotraukų failai, atsiliepimai, likučiai, neužpildyti rekvizitai).

## Kodas

- `src/scripts/app/` – vienas scope: `01-util` (+ `track`) … `14-router`, `16-quiz`, `17-discovery`, `18-delivery` (paštomatai),
  `19-notify`, `99-boot` (paleidimas visada paskutinis – naujas failas gauna numerį 20–98).
- Krepšelio eilutės raktas – `lineKey(l)` (`id:ml` arba `id:picks`). localStorage: `vaidore_cart_v1`, `vaidore_fav_v1`,
  `vaidore_ship_v1` (būdas ir paštomatas), `vaidore_gift_v1` (pakavimas ir rašteliukas).
- Stiliai: `10-flows.css` (v2 funkcijos) įtraukiamas po `07-cart.css` ir prieš `09-desktop.css`.

## Testai

`npm test` = `tools/check.mjs` → `tools/test-api.mjs` → `tools/test-smoke.mjs` (be interneto).

- `test-api.mjs` – serverio funkcijos su imituotu Stripe / Resend: kainos tik iš katalogo, likučiai, rinkinys, paštomatas,
  pakavimas, mėginukų suma, kodas sukuriamas vieną kartą, `api/order` be asmens duomenų, webhook parašas ir laiškai.
- `test-smoke.mjs` – surenka `.verify/site` (tikras katalogas, paštomatai iš `tools/fixtures/omniva-sample.json`) ir
  `.verify/site-variant` (išparduotas kvapas, nuotraukos, atsiliepimai, `NOINDEX`), Playwright telefone (430 × 932), kompiuteryje
  (1440 × 900) ir varianto patikra: pradžia, katalogas, paieška, filtrai, testas, rinkinys, kvapo lapas, krepšelis, paštomatas,
  pakavimas, apmokėjimas (imituotas), `/aciu` su kodu, SEO puslapis, sitemap / robots, išparduota, galerija, atsiliepimai, be JS klaidų.
- `node tools/test-smoke.mjs --shots` – ekrano nuotraukos į `.verify/shots/`.

## Sąmoningai nedaryta

- Iššokantys langai, laiko atskaitos, „liko 2 vnt.“, netikri atsiliepimai, automatinis vaizdo įrašas – griauna pasitikėjimą.
- Slapukų juosta – nereikalinga: nėra slapukų (Plausible / Vercel Analytics jų nenaudoja; localStorage – tik krepšeliui).
- Kodas „tik to paties kvapo buteliukui“ – žr. „Mėginukų kainos grąžinimas“.
- Automatinis likučių mažinimas – reikėtų duomenų bazės; likutis keičiamas kataloge.
