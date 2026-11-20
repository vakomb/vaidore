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

### Struktūra ir išdėstymas (v16 – iOS stilius)

Panelė turi savo apvalkalą – parduotuvės header'is, juosta virš jo ir poraštė administravime nerodomi (`.isAdmin`).
Telefone (< 700 px) – 5 skirtukai apačioje, planšetėje ir telefone gulsčiai (700–1023 px) – ikonų juosta kairėje,
kompiuteryje (≥ 1024 px) – šoninis meniu su posąrašiais (atidaryta tik dabartinė grupė). Skirtukas veda į paskutinį jame
atidarytą ekraną, jau atidarytas – į pradžią (kaip iOS). Ženkliukai: Užsakymai – laukia išsiuntimo, Daugiau – atsiliepimai + laukiantys.

| Skirtukas | Adresai | Ką daro |
| --- | --- | --- |
| Šiandien | `admin` | Pajamos šiandien / 7 d. / 30 d., vidutinis krepšelis; „Prieš paleidimą“; „Reikia dėmesio“ (kiekviena eilutė veda į darbą); maži likučiai; naujausi užsakymai; perkamiausi |
| Užsakymai | `admin/uzsakymai[/<nr.>]` | Sąrašas (paieška, Laukia / Išsiųsti / Visi / Grąžinti, CSV buhalterijai, „Rodyti daugiau“) → užsakymo ekranas: „Išsiųsta…“ (siuntos nr. + laiškas), „Supakuota“, „Pristatyta“, pirkėjas, pristatymas, „Kopijuoti adresą“, prekės, Stripe, „Grąžinti pinigus“. Braukiant – greiti veiksmai. Senas `?nr=` nukreipiamas |
| Katalogas | `admin/kvapai[/<id>]`, `admin/kvapu-sarasas[/<id>]`, `admin/kategorijos` | Produktai · Kvapai · Kategorijos (telefone – segmentuotas valdiklis viršuje). Produkto forma – žr. žemiau |
| Vitrina | `admin/vitrina[/skaidres\|skyriai\|plyteles\|juosta\|korteles\|istorija]` | Viskas, ką mato pirkėjas: pradžios skaidrės, skyriai su produktais, plytelės, juosta virš header'io (su peržiūra), prekių kortelės ir „Įkvėpti…“, Mūsų istorija |
| Daugiau | `admin/daugiau`, `admin/atsiliepimai`, `admin/laukia`, `admin/naujienlaiskis`, `admin/nustatymai/<grupė>`, `admin/zurnalas` | Klientai; Nustatymai grupėmis (parduotuve, pristatymas, meginukai, imone, matavimas); Žurnalas; Atnaujinti svetainę; Peržiūrėti parduotuvę; Atsijungti |

Seni adresai: `admin/pradzia[/…]` → `admin/vitrina`, `admin/nustatymai` → `admin/daugiau`, `admin/nustatymai#imone` →
`admin/nustatymai/imone` (`#korteles`, `#istorija` → Vitrina).

**Ekranas** (`pageHTML`, `01-core.js`): navigacijos juosta (`.axBar`: „‹ Atgal“, kompaktiška antraštė – pasirodo nuslinkus
didelę, veiksmai) + didelė antraštė + prilipę įrankiai (`.axTools`: paieška, segmentuotas valdiklis) + turinys.
„Išsaugoti“ (`.axSave`, `form="…"`) – juostoje dešinėje, aktyvus tik kai `A.dirty` (setteris – `syncSave()`).
Kompiuteryje užsakymai, produktai ir kvapai – dviem stulpeliais (`splitPanes`: sąrašas lieka, keičiasi tik detalės; abu
stulpeliai slenka atskirai). Sąrašų duomenys – talpykloje 30 s, atnaujinami fone; užvedus pelę ar palietus meniu nuorodą –
įkeliami iš anksto (`PREFETCH`). Kraunant – „skeleton“ eilutės (`.axSkel`).

**Formos** – sugrupuoti įtraukti sąrašai (`.ig`, `.igHead`, `.igFoot`, laukas `.axField`: pavadinimas kairėje, reikšmė
dešinėje; `.stack` – ilgam tekstui). Ilgesnės dalys – vidiniuose ekranuose: `[data-pane="…"]` + eilutė `[data-push="…"]`
(`pushPane` / `popPane`, „‹ Atgal“ juostoje, Esc); eilutėje – santrauka (`paintSums`). Produktas: pagrindiniame ekrane –
nuotraukų juosta (tempiant – eilė, paspaudus – veiksmai, × – pašalinti), Prekė, Kaina, Rodymas; vidiniai – Aprašymas, Natos,
Savybės, Spalvos, Kolekcijos, Išsamiau (eilė, data, adresas), Užpildyti iš aprašymo (peržiūra „Bus įrašyta į formą“ →
„Pritaikyti“; pasirinktas kvapas pritaikomas iškart). Klaida – viršuje (`showFormErr`); laukas paslėptame ekrane atidaromas
(`revealField`). Paaiškinimai – tik grupės poraštėje, vienu sakiniu.

**Sąrašų veiksmai:** `rowActions` – braukiant kairėn (telefone), ilgai palaikius, dešiniuoju pelės mygtuku arba „⋯“ (užvedus)
→ iOS veiksmų lapas (`actionSheet`). Produktai: likutis (langas), rodyti / slėpti (iškart, su „Atšaukti“), atidaryti
parduotuvėje. Užsakymai: supakuota, išsiųsta, pristatyta, kopijuoti adresą. Eilė – `sortable` (tempiant ⋮⋮, klaviatūra ↑ ↓).
Pavojingi veiksmai – patvirtinimas (veiksmų lapo stiliumi).

**Klaviatūra:** „/“ – paieška, ⌘/Ctrl+S – išsaugoti, Esc – atgal / uždaryti peržiūrą, ↑ ↓ – sąraše. Telefone rašant skirtukų
juosta paslepiama, laukas parodomas virš klaviatūros. Spalvos, kampai, šešėliai – `--ax-*` (01-tokens.css).
Ekrano nuotraukos 5 dydžiais: `npm run shots:admin` (`.verify/shots/ax-*.png`).

Po katalogo pakeitimo – `refreshCatalog()` ir pranešimas su „Atnaujinti svetainę“ (`shop/admin` `rebuild`: GitHub Actions
`pages.yml` per `GITHUB_TOKEN` ir / arba `VERCEL_DEPLOY_HOOK`). Neišsaugoti pakeitimai – perspėjama prieš išeinant.

## Pradžios puslapis iš administravimo (v8; nuo v16 – Vitrina: admin/vitrina/skaidres, skyriai, plyteles, juosta)

- **Vitrina** (`src/scripts/admin/10-home.js`, stiliai `admin.css` „Vitrina“): skaidrės ir „Produktai“
  plytelės su gyva peržiūra – tikra parduotuvė `<iframe>` (`?vdPreview=1`), telefono arba kompiuterio dydžiu; juodraštis
  siunčiamas `postMessage` (`25-home-config.js` jį pritaiko ir po katalogo atnaujinimo), išsaugoma tik paspaudus „Išsaugoti“.
- **Skaidrė:** rodoma / paslėpta, eilė (↑ ↓), šablonas (Kolekcija, Mėginukai, Dovana, Sava), fonas – nuotrauka
  (kompiuteriui ≤ 2400 px ir, nebūtinai, telefonui; spustelėjus nurodoma vieta, kuri lieka matoma – `focus`) arba Vaidore
  scena (kompozicija + kvapas), tekstas juodas / baltas (`dark`), antraštė, pavadinimas, tekstas, mygtukas, nuoroda (puslapis,
  kvapas, kategorija ar savas adresas). Tušti tekstai – iš šablono (kainos visada tikros). Skaidrių kiekis – kiek pridėta
  (0 – pradžia prasideda plytelėmis), `slideSeconds` – kas kiek sekundžių keičiasi (0 – nesikeičia).
- **„Tik nuotrauka“** (`preset: "photo"`): tik nuotrauka kompiuteriui (2880 × 934) ir / ar telefonui (1000 × 1150), be kvapo
  ir be svetainės teksto ar mygtuko (tekstas, jei reikia, – pačioje nuotraukoje); nuoroda ir aprašymas (tik skaitytuvams) –
  nebūtini. Be nuorodos skaidrė – tiesiog paveikslas (`div.slide.textless`).
- **Plytelė:** rodoma, eilė, pavadinimas, nuotrauka (ta pati – ir grupės puslapio viršuje); galima pridėti kategorijas
  (`kat-<id>`; be nuotraukos – kategorijos paveikslas iš „Kategorijos“, o jei nėra – scena).
- Duomenys – `settings.slides`, `settings.tiles`, `settings.slideSeconds` (formatas – `25-home-config.js`). Nėra – rodomi
  numatytieji (`DEFAULT_SLIDES`, `DEFAULT_TILES`). Nuotraukos – Storage `products/pradzia/…` (WebP, sumažinama naršyklėje).
- Prekių kortelėse ir visur kitur kvapo nuotrauka – tik buteliukas, be fono ar kvadrato (`--photo-bg: transparent`).

## Dizainas (v7: nuotraukos be fono, juoda vietoje mėlynos, scenos)

- **Nuotraukos.** Kiekvienam kvapui – VIENA nuotrauka `src/public/img/kvapai/<id>-1.webp`: tik buteliukas permatomame fone
  (WebP su alfa, 1000 × 1000, visi vienodo dydžio, centruoti, be juodų dangtelio kampų). Kuria `python3 tools/make-bottles.py`
  (iš `tools/assets/vaidore-scena.png`; ten pat – 2 ml mėginukas `img/meginukas.webp`). Scenų su fonu (`-2.webp`) nebėra
  (migracija `20261115000400_vaidore_vienos_nuotraukos.sql`). Šešėlio paveiksle nėra – visur tas pats CSS `--bottle-shadow`,
  fonas `--photo-bg` (kortelės, galerija, krepšelis, paieška, administravimas).
- **Spalvos.** Akcentas – juoda `--brand: #111` (mygtukai, aktyvios būsenos, ženkliukai, pasirinkimai, juostos `--band`,
  `--focus`, `--brand-ring/-glow`); krepšelio skaičiukas – raudonas `--badge` (5,5:1). Perėjimai – `--ease`. Mėlynos nebėra
  (testas tikrina). Ikonos ir favicon – auksinė „V“ juodame fone (`tools/make-logo.py` → `favicon.svg`, `tools/make-icons.mjs`).
- **Logotipas.** VAIDORE – tas pats šriftas ir raidžių tarpai kaip buteliuko etiketėje (TeX Gyre Termes, GUST licencija),
  kontūrai `src/partials/logo.svg` (`python3 tools/make-logo.py`), įdedamas į header'į surinkimo metu (`@partial` dalies viduje),
  `logoHTML()` jį paima iš header'io; statiniai puslapiai – `{{logo}}`; OG paveikslai – `tools/make-og.mjs`. Aukštis – `--logoH`.
- **Header'is.** Mažesnis aukštis (`--hdrH` 54 / 60 px), didesnės ikonos (`--hdrIcon` 28–29 px, mygtukas 44 px).
- **Juosta virš header'io.** Fiksuotas aukštis `--noteH`, tekstas visada vienoje eilutėje: kiekviena žinutė turi ilgą ir
  trumpus variantus, `fitNote()` (21-header.js) įrašo ilgiausią telpantį (nuo 360 px); keičiasi vietoje.
- **Scenos** (`24-stage.js` + `12-stage.css`): vieno stiliaus kompozicijos – šilta studijos siena, grindys, CSS formos (arka,
  cilindras, blokas, diskas, juoda dovanų dėžutė su VAIDORE) ir tikri buteliukai / mėginukai su kontaktiniu šešėliu.
  Matas `u = min(--uh × aukščio, --uw × pločio)` (konteinerio užklausos) – kompozicija visada telpa, niekas nepasislenka.
  `STAGES`: skaidrėms `collection`, `samples`, `gift`; kategorijoms `women`, `men`, `unisex`, `vials`, `set`, `fresh`;
  administratoriaus kategorijoms – `STAGE_CYCLE`. Tonai – `--st-*` (01-tokens.css).
- **Pradžios skaidrės:** sezono kolekcija (settings.hero) · „Pirma išbandykite“ (mėginukai) · dovana / atradimų rinkinys.
  Kiekviena – sava kompozicija, trumpas tekstas ir vienas veiksmas (juodas mygtukas), taškai apačioje, keičiasi kas 6 s.
  Telefone tekstas viršuje, kompozicija apačioje (`--heroAR`); nuo 700 px ir gulsčiame telefone – tekstas kairėje (`--heroH`).
- **Kategorijos:** „Produktai“ plytelės – visa plytelė scena su pavadinimu viršuje; katalogo puslapiuose (lytis, mėginukai,
  kategorija) – scena antraštėje; „Apie mus“ – scena vietoje paveikslo (jei `settings.story.image` nenurodytas).

## Dizainas (v5: kaip parfumada.lt – matmenys perimti iš jos puslapių)

- Pradžia: skaidrės (kolekcija · mėginukai · rinkinys, „‹ 1/3 ›“, keičiasi kas 6 s) → „Produktai“ plytelės (iškart po
  skaidre) → karuselės juostose (naujienos, moterims, vyrams, unisex – rodoma, jei yra bent vienas kvapas) → nuolaidos (jei yra)
  → tikri atsiliepimai. Telefone karuselėje – ~1,6 kortelės (matosi kita), kompiuteryje – 3.
- Tekstas 18 px, raidžių tarpai .04em; mygtukai juodi, kampai 20 px; laukai 58 px su juodu rėmeliu; tūriai ir kiekis –
  „piliulės“ su 1 px juodu rėmeliu. Kvapo puslapis: pavadinimas tarp linijų → paveikslas → aprašymas →
  išskleidžiamos dalys → kaina → tūris → kiekis → mygtukas. Krepšelis: PREKĖ / SUMA, 100 px paveikslai.
- Juostų / poraštės spalva – vienas žetonas `--band` (01-tokens.css).

## Dizainas (v4: parfumada.lt išdėstymas, AutoEasier programėlės pojūtis)

- Šriftas Jost (geometrinis, SIL OFL, savame serveryje, 33 KB), lengvi storiai (400–600), teigiami raidžių tarpai; pavadinimai,
  juostos ir kortelių vardai – DIDŽIOSIOMIS su tarpais (`--caps`).
- Spalvos: baltas fonas, grafitas (`--band`, `--ink-grad` – juostos, pagrindiniai mygtukai), šampano auksas (`--gold*` – akcentai).
- Viršuje – tamsi rotuojanti žinučių juosta; header'is: telefone meniu · paieška · LOGOTIPAS · paskyra · krepšelis, kompiuteryje
  paieška · LOGOTIPAS · įrankiai + tamsi kategorijų juosta (`--navH`, lipniems elementams – `--hdrAll`).
- Pradžia: platus tamsus kolekcijos paveikslas su privalumais → bėganti privalumų juosta → skyriai su juostomis per visą plotį
  ir eilute „… | Peržiūrėti“ → kategorijų plytelės → karuselės (telefone braukiant, kompiuteryje rodyklės ir „1/3“).
- Kortelė: paveikslas be rėmelio (4:5), centruota: PAVADINIMAS, trys natos, kaina (akcija – perbraukta sena `sizes[].was` ir raudona),
  žvaigždutės iš tikrų atsiliepimų.
- Kvapo puslapis: PAVADINIMAS tarp linijų, natos, tūrio „piliulės“, kiekis, „Į krepšelį“, išskleidžiamos dalys (natos, savybės,
  kam skirti, pristatymas, naudojimas); telefone – prilipęs „Į krepšelį“.
- Katalogas: kompiuteryje – išskleidžiamos filtrų grupės kairėje, telefone – „Filtruoti ir rūšiuoti“ langas.
- Programėlės pojūtis lieka: spyruoklinis judesys, paspaudimas `scale(.975)`, apatiniai langai, braukimas ir „Atgal“ uždaro,
  `prefers-reduced-motion` – be animacijų. Iššokančių „X nusipirko“ langų sąmoningai nėra.

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

## Kvapo importas iš Allegro – pašalintas (v14)

Įrankis „Iš Allegro“ (`13-import.js`, `supabase/functions/_shared/import.js`, veiksmai `import` / `import-status`)
pašalintas visiškai. Vėliau bus kuriama nauja prekių kūrimo sistema.

## Automatinis produktų pridėjimas (v15)

- **5 prekių tipai** (`products.type`): `kvepalai`, `difuzoriai` (su lazdelėmis), `zvakes`, `aliejai` (elektriniams
  difuzoriams), `elektriniai-difuzoriai` (prietaisas be kvapo). `TYPES` – `03-catalog.js` (`scented`, daiktavardžiai),
  `TYPE_PAGE` – `build-site.mjs`, `TYPE_ONE` – `shop.js`. Tipas be prekių parduotuvėje nerodomas; nauji tipai į išsaugotą
  plytelių sąrašą įterpiami automatiškai (`tileList`, `25-home-config.js`).
- **Bendras kvapas** (`scents`, migracija `20261120120000_scents_types.sql`): vardas, originalas, lytis, šeima, natos,
  ilgaamžiškumas, sklaida, spalvos (v19: sezonai, paros laikas, progos – pašalinti, žr. „Be „Kada tinka“ (v19)“). `products.scent_id` – nuoroda; produktas turi savo
  laukų kopijas (parduotuvė ir filtrai jų neima iš `scents`). Esami produktai susieti pagal pavadinimą be tipo žodžio,
  likę – pagal originalo kvapą (pvz. „Difuzorius SIRED“ → SIDORE).
- **Nauji laukai**: `products.attrs` (tipo savybės: lazdelės, trukmė, plotas, degimo trukmė, vaškas, dagtis, vandens
  talpa, veikimo laikas, maitinimas, apšvietimas – `AF_ATTRS` / `ATTR_DEFS`), `sizes[].unit` – `g` (žvakės), `vnt` (elektrinis difuzorius), kitaip ml.
- **Variklis be API** – `src/scripts/admin/13-autofill-words.js` (natų žodynas PL / EN → LT: 520 raktų, 254 natos;
  būdvardžiai su giminėmis; šeimos; rinkodaros žodžiai) ir `13-autofill.js` (`afParse`): kalba, tipas (taškais pagal
  raktažodžius), pavadinimas (be prekės ženklo – pasikartojantis žodis; be rinkodaros, tipo, lyties žodžių; DIDŽIOSIOMIS
  parašytas pavadinimas tarp kitų žodžių), natos, lytis, šeima, koncentracija (eilutė „nasz produkt / our product“ →
  % → vienintelis paminėjimas), talpa / svoris, savybės, originalas (tik aiškiai parašytas), INCI. Trūkstami laukai –
  pagal šeimą ir natas; šūkis ir aprašymas – lietuviški šablonai (keli variantai, parenkami pagal pavadinimą – rezultatas
  deterministinis). Iš šaltinio – tik faktai.
- **Administravimas** (`04-products.js`, „Produktai“ → „Naujas produktas“): kvapo pasirinkimas (tik jei yra kvapų),
  aprašymo laukas, „Sutvarkyti“, „Auto“ žymos, „Liko užpildyti“, „Ką atpažinau“. Išsaugojus naują produktą be pasirinkto
  kvapo – sukuriamas `scents` įrašas ir susiejamas. Elektriniam difuzoriui kvapo laukai nerodomi.
- **Skiltis „Kvapai“** (`14-scents.js`, `admin/kvapu-sarasas`): sąrašas su paieška (pavadinimas, originalas, šeima,
  natos, kiek produktų); naujas kvapas – įklijuotas aprašymas → `afParse` → tik kvapo laukai (`SCENT_KEYS`), „Auto“
  žymos ir „Liko užpildyti“; kvapo puslapis – visi laukai, spalvų peržiūra, susieti produktai, „Pritaikyti pakeitimus
  produktams“ (`SCENT_TO_PRODUCT`: originalas, lytis, šeima, natos, ilgaamžiškumas, sklaida – ne pavadinimas, aprašymas, spalvos),
  „Naujas produktas su šiuo kvapu“ (`admin/kvapai/naujas?kvapas=<id>` – kvapas parenkamas iš karto), ištrynimas
  (pirma `products.scent_id = null`, tada `scents` įrašas). Senas `admin/kvapai/kvapu-sarasas` nukreipiamas.
- **Forma pagal kategoriją** (`TYPE_FORM`, `typePickHTML`, `applyTypeForm` – `04-products.js`): naujam produktui viršuje –
  5 kategorijų kortelės (`?kategorija=<tipas>` – parenkama iš karto); pasirinkus perpiešiama: užuominos ir pavyzdžiai,
  „Ingredientai (INCI)“ / „Sudėtis“ (elektriniam – nėra), „Natos ir savybės“ / „Kvapas“, „Sklaida“ / „Kvapo intensyvumas“,
  ilgaamžiškumas, buteliuko piešinys, dangtelis ir forma – tik kvepalams; talpos / svoris / „1 vnt.“, tipo savybės.
  Teminės kategorijos formoje vadinamos „Kolekcijos“.
- **Prekės puslapis pagal kategoriją**: ne kvepalams – kategorijos nuoroda virš pavadinimo (`.pdCat`), „Kvapo natos“,
  „Panašūs“ → kategorijos puslapis; visiems – „Šis kvapas taip pat“ (`.pdForms`: to paties `scent_id` produktai).
- **Parduotuvė**: „Savybės“ prekės puslapyje, „Svoris“ žvakėms, elektriniam difuzoriui – be talpos pasirinkimo;
  filtrai „Originalo kvapas“
  (`?originalas=`), „Formatas“ kitiems tipams (`?formatas=`); elektriniams difuzoriams kvapo filtrų nėra.
- Testai: `tools/test-autofill.mjs` (priimamumo „My Pink“ – `tools/fixtures/autofill-my-pink.txt`, žvakė su kvapu,
  PL / EN / LT difuzorius, aliejus, elektrinis difuzorius), `test-admin.mjs` (forma), `test-smoke.mjs` (parduotuvė).

## Pradžios skyriai su produktais (v15)

Karuselės po plytelėmis („Kvapnios naujienos“, „Populiariausi moterims“, „Populiariausi vyrams“, „Unisex kvapai“, „Didžiausios nuolaidos“) – nebe kodas, o nustatymas `settings.rails` (masyvas, tvarka = rodymo tvarka). Kol administratorius nieko neišsaugojo, naudojami `DEFAULT_RAILS` (`25-home-config.js`) – parduotuvė atrodo kaip anksčiau.

- Skyrius: `{ id, on, title, line, mode, rule, ids, limit, href }`. `on:false` – paslėptas; `line` – paantraštė su nuoroda „Peržiūrėti“.
- `mode:"auto"` – `rule` filtruoja matomus produktus: `type`, `gender`, `family`, `category` (kolekcija), `scent` (bendras kvapas), `sale` (tik su tikra sena kaina, turimi); `sort` – `rank` (populiariausi), `new`, `price-asc`, `price-desc`, `sale` (didžiausia nuolaida). `limit` 1–24 (numatyta 12).
- `mode:"manual"` – `ids` (administratoriaus nurodyta tvarka); paslėpti / ištrinti produktai praleidžiami.
- `href`: tuščia – automatinė nuoroda iš taisyklės (`kvepalai?seima=…`, `kategorija/<id>`, `nuolaidos`); `"none"` – be nuorodos; kitaip – santykinis adresas.
- Skyrius be produktų nerodomas. Administravime („Vitrina“ → „Skyriai su produktais“, atskiras ekranas su peržiūra): pridėti pagal taisyklę arba ranka, keisti, kopijuoti, ištrinti, perkelti tempiant ⋮⋮ (arba ↑ ↓), slėpti; produktų paieška pagal pavadinimą, originalą, natas; pakeitimai iš karto matomi peržiūroje. Testai – `test-admin.mjs` („skyriai…“).

### Produkto forma – minimalistinė (v15b)

- Kategorija – kapsulių eilė formos viršuje (telefone slenkama), be aprašymų; naujam produktui laukas `type` – paslėptas, esamam – pasirinkimas „Kategorija“.
- Po laukais paaiškinimų nėra – tik pavyzdžiai laukuose (`TYPE_FORM`). Viena trumpa pastaba – „Sena kaina – tik akcijai (mažiausia per 30 d.)“.
- Blokai: Užpildyti iš aprašymo → Prekė → Natos (kvapo prekėms) → Savybės → Kaina → Nuotraukos; šone – Rodymas (su adresu), Kolekcijos (ne elektriniams difuzoriams), Spalvos.
- Ilgaamžiškumas ir sklaida (`longevity`, `sillage`) formose (produkto ir kvapo) nerodomi: laukai duomenų bazėje lieka, reikšmė imama iš automatinio užpildymo arba lieka esama (naujam – 3). Juos naudoja kvapo testas.

## Be „Kada tinka“ (v19)

Sezonai, paros laikas ir progos pašalinti iš visos parduotuvės ir administravimo: kortelių / produkto puslapio („Kam skirti“ – tik lytis ir kvapų šeima), katalogo filtrų (seni `?proga=`, `?laikas=`, `?sezonas=` adresai ignoruojami), paieškos, kvapo testo (3 klausimai: kam, kokie kvapai, intensyvumas), pradžios skyrių taisyklių (seni `rule.time/season/occasion` išvalomi atidarius „Vitrina → Skyriai“), produkto ir kvapo formų, automatinio užpildymo (`afParse` šių laukų nebegrąžina; aprašyme nebėra sakinių apie sezoną, progą ar paros laiką). Duomenų bazės stulpeliai `products.seasons/times/occasions` ir `scents.seasons/times/occasions` paliekami (numatytos reikšmės, niekur nenaudojami), `catalog.json` jų nebeturi.
- Savybių `room`, `area` (m²) ir `power` (maitinimas) nebėra nei formoje, nei prekės puslapyje, nei automatiniame aprašyme; senos reikšmės duomenų bazėje nerodomos.


## Originalas „Įkvėpti …“ (v18)

Kortelėse po pavadinimu natų nebėra – vietoj jų originalo blokelis (`inspiredHTML`, 03-catalog.js): kairėje kvadratinė
originalo nuotrauka (40 px, telefone 36 px; baltas fonas, plonas kontūras, `object-fit: contain`, `loading="lazy"`), dešinėje
prekės ženklas (mažos didžiosios raidės, pilka) ir kvapo pavadinimas – abu po vieną eilutę su „…“. Laukas `inspired`
(„Tom Ford – Tobacco Vanille“) skaidomas per pirmą brūkšnį (`splitInspired`). Nėra nuotraukos – prekės ženklo raidė pilkame
kvadrate; nėra originalo arba išjungta – šūkis (`.cardTag`); `.cardInsp` aukštis rezervuotas, todėl kortelės lieka lygios.
Produkto puslapyje – tas pats komponentas, didesnis (`insp-lg`: 56 px nuotrauka, rėmelis, „Įkvėpti · Tom Ford“), po pavadinimu
(telefone – centre, kompiuteryje – kairėje); natų eilutė ir teisinė pastaba lieka. Paieškos pasiūlymuose – `insp-sm`.

Duomenys: `scents.inspired_image` ir `products.inspired_image` (migracijos 20261118010000, 20261121090000 – perkelia jau
įkeltas nuotraukas į kvapus). Administravime – Kvapai → kvapas → „Originalo nuotrauka“ (įkelti / pakeisti / pašalinti;
`uploadInspImg`, 600 px WebP, `products/originalai/<kvapo-id>/…`); pakeista nuotrauka išsaugant visada pritaikoma
visiems susietiems produktams (net išjungus „Pakeitimus pritaikyti ir produktams“). Jei `scents.inspired_image` stulpelio
dar nėra, nuotrauka laikoma tik produktuose (kvapo puslapyje ir sąraše rodoma iš susieto produkto). v19: įkelti galima
tik kvape – produkto formoje tik miniatiūra ir nuoroda į kvapą. Produkto puslapyje viršuje natų eilutės (`.pdKey`)
nebėra – po pavadinimu tik originalo blokelis. Nustatymai (Vitrina → Prekių kortelės): `inspired.show` – rodyti originalą, `inspired.photo` – rodyti nuotrauką.
Originalo nuotrauka į JSON-LD ir og:image nededama.
