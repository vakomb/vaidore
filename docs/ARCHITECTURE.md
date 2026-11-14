# Vaidore – architektūra

## Kaip veikia

```
src/index.html ──tools/build.mjs──► vienas HTML (CSS + katalogas + JS viduje, ~100 KB)
                └─tools/build-site.mjs─► site/ ──► Vercel (vercel.json: buildCommand, outputDirectory "site", cleanUrls)
api/checkout.js ─────────────────────────────► Vercel funkcija /api/checkout ──► Stripe Checkout
src/data/catalog.json ── vienas tiesos šaltinis: programėlei (inline), site/catalog.json ir api/checkout.js (kainos)
```

Be jokių priklausomybių produkcijoje: surinkimas – tik Node.js, apmokėjimas – Stripe REST API per `fetch`.
`playwright` (testams) ir `sharp` (ikonoms) – tik kūrėjo kompiuteryje.

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
| `#/` | Pradžia: kolekcija (`settings.hero`), Moterims / Vyrams / Unisex / Mėginukai, Populiariausi, Pagal nuotaiką (kvapo šeimos), Naujienos |
| `#/katalogas` | Paieška (be diakritikų, ir pagal natas), Visi / Moterims / Vyrams / Unisex, filtrai (šeima, koncentracija, kaina, mėginukai), rūšiavimas |
| `#/kvepalai/<id>` | Kvapo lapas: tūris + mėginukas 2 ml, kaina už 10 ml, aprašymas, piramidė, savybės, „Jums gali patikti“, „Į krepšelį“ |
| `#/megstami` | Mėgstami (širdelė ant kortelės) |
| `#/krepselis` | Eilutės, kiekis (0 – pašalina, „Atšaukti“), suvestinė, „Apmokėti saugiai“ |
| `#/info` | Pristatymas, grąžinimas, apmokėjimas, kontaktai, dokumentai |
| `/aciu`, `/salygos`, `/privatumas` | Statiniai puslapiai |

Kompiuteris (≥ 1024 px): kairėje šoninis meniu, prekės 4–5 stulpeliais, kvapo langas dviem stulpeliais, krepšelis – prekės ir lipni suvestinė.

## Apmokėjimas (Stripe)

1. Naršyklė siunčia `POST /api/checkout { items: [{ id, ml, qty }] }` – **be kainų**.
2. `api/checkout.js` kainas ima iš `src/data/catalog.json`, tikrina kiekius (`maxQty`), sukuria Checkout sesiją: `line_items` (pavadinimas, tūris), `shipping_options` (iš `settings.shipping`, nemokamai nuo `freeShippingFrom`), adresas (LT / LV / EE), telefonas, nuolaidų kodai, `locale: lt`.
3. Pirkėjas moka Stripe puslapyje (kortelė, Apple Pay, Google Pay) → `/aciu?s=<sesija>` → krepšelis išvalomas.
4. Užsakymai ir kvitai – Stripe valdymo skydelyje (Payments). Stripe gali siųsti kvitus el. paštu (Settings → Emails → Successful payments).

Nustatymas: Vercel → Project → Settings → Environment Variables → `STRIPE_SECRET_KEY` (`sk_live_…`, bandymams `sk_test_…`). Neprivaloma: `SITE_URL=https://vaidore.com`. Be rakto parduotuvė veikia, o „Apmokėti“ parodo „Apmokėjimas laikinai nepasiekiamas“.

## Prekių keitimas (`src/data/catalog.json`)

- `id` – adresas `#/kvepalai/<id>` (mažosios raidės, skaičiai, „-“). Nekeiskite esamų – jie gali būti pirkėjų krepšeliuose.
- `gender`: `moterims` / `vyrams` / `unisex`; `family`: `families[].id`; `conc`: `EDT` / `EDP` / `Parfum` / `Extrait`.
- `sizes`: `[{ "ml": 50, "price": 65 }]`, `sample` – mėginuko 2 ml kaina.
- `notes.top/heart/base`, `longevity` ir `sillage` (1–5), `seasons`, `time` (`diena` / `vakaras`).
- `look`: `liquid` (skysčio spalva), `tint` (fono atspalvis), `cap` (`gold` / `black` / `silver` / `wood`), `shape` (`rect` / `tall` / `round` / `square`).
- `badge` (`Populiaru`, `Naujiena` arba `null`), `rank` (populiarumo eilė), `added` (data, naujienoms).
- `node tools/check.mjs` patikrina katalogą prieš įkeliant.

## Nuotraukos (ateityje)

Norint rodyti tikras nuotraukas, pridėkite `image` lauką (pvz. `/img/rasa.webp`, failas – `src/public/img/`) ir `bottleSVG(p)` vietoje grąžinkite `<img src=… loading="lazy">`, kai `p.image` yra.

## Testai

`npm test` – katalogo ir JS patikra, surinkimas, Playwright testas telefone (430 × 932) ir kompiuteryje (1440 × 900): pradžia, katalogas, paieška, filtrai, kvapo lapas, tūris, krepšelis, kiekis, atšaukimas, apmokėjimas (imituotas `/api/checkout` – tikrinama, kad siunčiamos tik id/ml/kiekis), `/aciu`, mėgstami, tiesioginė nuoroda, „Atgal“, teisiniai puslapiai, be JS klaidų. `node tools/test-smoke.mjs --shots` – ekrano nuotraukos į `.verify/shots/`.
