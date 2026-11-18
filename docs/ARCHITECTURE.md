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

## Juosta virš header'io (settings.topbar)

Administravimas → Pradžia → „Juosta virš header'io“ (12-topbar.js, gyva peržiūra): žinutės (tekstas su `*paryškinimu*`,
trumpas variantas siauram telefonui, nuoroda, rodoma / paslėpta, eilė), 7 paruošti dizainai + savos spalvos (fonas,
gradientas → / ↔, tekstas, paryškintas tekstas), šriftas telefone / kompiuteryje, storis, tarpai tarp raidžių,
DIDŽIOSIOS, aukštis telefone / kompiuteryje, linija apačioje, keitimosi laikas, animacija, rodyklės, įjungta / išjungta.
Kontrastas tikrinamas (≥ 4,5:1). Svetainėje – CSS kintamieji `--nbg --nfg --nacc --nfs --nfsd --nw --nls --ntt --nh --nhd`
ant `#topNote` (21-header.js `applyTopbarStyle`); nėra `items` – automatinės žinutės iš nustatymų (`autoNoteItems`).

## v11: dar arčiau parfumada.lt (2026-11-17)

- Plytelės: pavadinimas VIRŠ paveikslo (22,75 px / 700, didžiosiomis; kompiuteryje 23,4 px), administravime – „Pavadinimas“.
- Kortelės: katalogo tinklelyje paveikslas 4:5, buteliukas per visą aukštį (`object-fit: cover`); akcijos kaina raudona
  (`--sale`); širdelė ir ženkliukai – Nustatymai → „Prekių kortelės“ (galima išjungti).
- Katalogas: kompiuteryje 3 stulpeliai; filtrai – Pagal lytį · Kategorijos · Kvapo pobūdis · Natos · Proga · Sezonas ·
  Koncentracija · Kaina (nuo–iki, `?kaina=20-40`) · Likutis (`?likutis=yra`) · Formatas; grupės suskleistos (atidaryta tik
  „Pagal lytį“ ir tos, kuriose yra pasirinkimų).
- Header'is kompiuteryje: ☰ · logotipas · paieška (piktograma → laukas header'yje) · paskyra · mėgstami · krepšelis;
  meniu juosta telpa vienoje eilutėje – netelpančios nuorodos slepiamos pagal `data-fit` (`fitHeaderNav`).
- Karuselių skaitiklis „1/5“. Skaidrė „Teiginiai su linijomis“ (preset `claims`): kelių eilučių tekstas – teiginiai su
  auksinėmis linijomis.
- Nauji puslapiai: `/bestselleriai` (8 populiariausi pagal `rank`), `/nuolaidos` (tik su tikra sena kaina, didžiausia
  nuolaida pirma), `/atsiliepimai` (visi tikri atsiliepimai, vidurkis), `/verslui` (užklausa laišku), `/naujienlaiskis`.
- Poraštė: naujienlaiškis viršuje → nuorodos be antraščių (3 stulpeliai) → mokėjimo būdai → © ir teisinės nuorodos.
- Naujienlaiškis: lentelė `newsletter` (migracija 20261117000100; pirkėjas gali tik įrašyti el. paštą), Edge Function
  `shop/newsletter` (pasisveikinimo laiškas, atsisakymas pagal raktą), administravime – `admin/naujienlaiskis`
  (sąrašas, CSV, bandomasis laiškas, laiškas visiems per Resend batch su „List-Unsubscribe“).

## Dizainas (v10: dydžiai ir sandara – kaip parfumada.lt, išmatuota 390 ir 1440 px pločio)

- Tekstas 19,5 px (`--fs`), 75 % juodos (`--text`), antraštės – #000. Spalvos ir dydžiai – `01-tokens.css`.
- Juosta virš header'io: telefone 66 px, 19,5 px, iki 2 eilučių; kompiuteryje 49 px (`--noteH`, `--noteFs`, `fitNote`).
- Header'is: telefone 57 px, ☰ · logotipas · paieška · krepšelis (mygtukai 57 × 57, paskyra – šoniniame meniu);
  kompiuteryje 95 px, logotipas centre (≈ 300 px), tamsi meniu juosta 45 px, nuorodos 16 px / 700,
  „Moterims / Vyrams / Unisex“ – išskleidžiamame „Pagal lytį“ (`#genderBtn`).
- Pradžia: skaidrė telefone – 1000 × 1150 proporcijų (nuotrauka 1000 × 1150), kompiuteryje 462 px (2880 × 934); bėganti juosta
  balta, 59 px; skyrių juostos 52 / 65 px; plytelės – tik paveikslas 4:5 (16 px kampai, 1000 × 1250), pavadinimas –
  pačioje nuotraukoje (svetainėje tik skaitytuvams), kompiuteryje visos vienoje eilėje (iki 246 px); „… | Peržiūrėti“ – 22 px, linijos #ccc; karuselės – kortelė 284 px
  telefone (29 px kraštai), 3 per visą plotį kompiuteryje, skaitiklis „1 / iš 3“.
- Kortelė: PAVADINIMAS · natos · kaina (be „Įkvėpti …“ ir greitų mygtukų); katalogo tinklelyje paveikslas 4:5;
  akcija – rožinis „Akcija“ ženkliukas, nubraukta kaina 16,9 px ir nauja 20,8 px / 700.
- Katalogas: be naršymo kelio; filtrai – Pagal lytį, Kategorijos, Kvapo pobūdis, Natos (`?natos=`), Proga
  (`?proga=`), Sezonas (`?sezonas=`), Koncentracija, Kaina (`SET_FILTERS`, `08-shop.js`).
- Kvapo puslapis: be naršymo kelio ir ženkliukų ant nuotraukos; išskleidžiamos eilutės 65 px; „Ingredientai“ –
  laukas `products.ingredients` (migracija `20261117000000_ingredients.sql`, administravime – „Ingredientai (INCI)“),
  rodoma tik jei užpildyta; „Įdėti į krepšelį“ 63 px; „Į mėgstamus“ / „Dalintis“ – po pirkimu.
- Poraštė: nuorodų eilutės 55 px, 18,2 px.

## Pradžios puslapis iš administravimo (v8: admin/pradzia)

- **Skyrius „Pradžia“** (`src/scripts/admin/10-home.js`, stiliai `admin.css` „Pradžios puslapis“): skaidrės ir „Produktai“
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

- Pradžia: skaidrės (kolekcija · mėginukai · rinkinys, „‹ 1/3 ›“, keičiasi kas 6 s) → bėganti juosta → karuselės
  juostose (naujienos, moterims, vyrams, unisex; mėginukų karuselės nėra) → „Produktai“ plytelės → nuolaidos (jei yra)
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

## Kvapo importas iš Allegro (admin/kvapai/importas)

- **Kaip:** Kvapai → „Iš Allegro“ → skelbimo nuoroda → „Sugeneruoti“ → peržiūra → „Sukurti kvapą“ atidaro užpildytą
  naujo kvapo formą (`A.importDraft`), kurioje įrašoma kaina, likutis, nuotraukos ir išsaugoma. Be patvirtinimo niekas
  neįrašoma.
- **Šaltinis:** serveris (`shop/admin` veiksmas `import`) parsisiunčia `allegro.pl` puslapį ir skaito JSON-LD Product,
  parametrų lentelę ir sudėtį (INCI). Allegro dažnai blokuoja serverius (DataDome) – tada: žymelė „Į Vaidore“
  (`javascript:` – Allegro puslapyje surenka tuos pačius duomenis ir atidaro `admin/kvapai/importas#imp=…`) arba
  nukopijuotas puslapio tekstas (Ctrl + A).
- **Tekstai:** `supabase/functions/_shared/import.js` – faktai (natos, kvapų grupė, lytis, koncentracija, tūris, INCI) →
  su `ANTHROPIC_API_KEY` (Supabase Secrets; modelis `IMPORT_MODEL`, numatytas `claude-sonnet-5-5`) aprašymą, šūkį, natas
  ir savybes parašo Claude (tonas – pagal 3 Vaidore kvapus); be rakto – PL→LT natų žodynas ir šablonai. AI atsakymas
  tikrinamas (`mergeDraft`): neleistinos reikšmės keičiamos šablono reikšmėmis.
- **Taisyklės:** iš skelbimo imami tik faktai, aprašymas – savas; nuotraukos neimamos (autorių teisės); kaina neimama
  (kita valiuta ir rinka – rodoma tik palyginimui).
- Testai: `tools/test-api.mjs` (pavyzdžiai `tools/fixtures/allegro-*`), `tools/test-admin.mjs` (puslapis, žymelė, forma).
