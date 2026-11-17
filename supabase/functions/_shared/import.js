// Kvapo importas iš kito skelbimo (Allegro ir pan.) – administravimo įrankis „Importuoti iš Allegro“.
// Grynas JS (Deno Edge Function ir Node testai): skelbimo HTML / nukopijuoto teksto skaitymas → faktai (pavadinimas,
// natos, lytis, koncentracija, tūris, kvapų grupė, sudėtis INCI, kaina) → Vaidore kvapo juodraštis lietuviškai.
// Su ANTHROPIC_API_KEY tekstus (aprašymą, natas, šūkį, savybes) parašo Claude; be jo – žodynas ir šablonai.
// Iš skelbimo imami tik FAKTAI: aprašymas visada savas (ne kopija), nuotraukos neimamos (autorių teisės).

const FAMILIES = ["geliu", "sviezi", "medienos", "ambros", "gurmaniski"];
const GENDERS = ["moterims", "vyrams", "unisex"];
const CONCS = ["EDT", "EDP", "Parfum", "Extrait"];
const SEASONS = ["pavasaris", "vasara", "ruduo", "žiema"];
const TIMES = ["diena", "vakaras"];

const clean = (v, n = 4000) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t\u00a0]+/g, " ")
    .trim()
    .slice(0, n);
const cap = s => (s ? s.charAt(0).toLocaleUpperCase("lt") + s.slice(1) : s);
const titleCase = s =>
  String(s || "")
    .toLocaleLowerCase("pl")
    .replace(/(^|[\s\-'’])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase("pl"));
export const slugify = s =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const decodeEntities = s =>
  String(s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)));
const stripTags = s =>
  decodeEntities(
    String(s || "")
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

// ── Skelbimo puslapis (HTML) → šaltinis ───────────────
// JSON-LD Product (pavadinimas, prekės ženklas, GTIN, aprašymas, kaina), parametrų lentelė, sudėtis (INCI).
export function sourceFromHtml(html, url = "") {
  const lds = [...String(html).matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .flatMap(x => (Array.isArray(x) ? x : x?.["@graph"] || [x]))
    .filter(Boolean);
  const ld = lds.find(x => x["@type"] === "Product") || {};
  const params = {};
  for (const m of String(html).matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)) {
    const k = stripTags(m[1]);
    const v = stripTags(m[2]);
    if (k && v && k.length < 60 && !(k in params)) params[k] = v.slice(0, 300);
  }
  const inci = (String(html).match(/showoffer\.inci[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1];
  const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers || {};
  return {
    url,
    title: clean(decodeEntities(ld.name || (String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""), 200),
    brand: clean(typeof ld.brand === "object" ? ld.brand?.name : ld.brand, 80),
    gtin: clean(ld.gtin || ld.gtin13 || "", 20),
    price: clean(offer.price || offer.lowPrice || "", 12),
    currency: clean(offer.priceCurrency || "", 5),
    desc: clean(decodeEntities(ld.description || ""), 8000),
    params,
    inci: inci ? clean(stripTags(inci), 2000) : "",
    text: ""
  };
}
// Ar puslapį užblokavo apsauga nuo robotų (Allegro – DataDome)
export const isBlocked = (status, html) => status === 403 || status === 429 || /captcha-delivery|datadome|geo\.captcha/i.test(String(html).slice(0, 20000));

// ── Faktai iš šaltinio (JSON-LD + parametrai + nukopijuotas tekstas) ──
const PARAM_LABELS = ["Stan", "Linia", "Grupa zapachowa", "Pojemność opakowania", "Pojemność", "Rodzaj", "Zaperfumowanie", "Stan opakowania", "Marka", "Płeć", "Przeznaczenie", "Nuty zapachowe", "Typ", "Kod producenta", "EAN (GTIN)"];
// Nukopijuotame puslapio tekste parametrai – „Pavadinimas\nReikšmė“ eilutėmis po „Parametry“
function paramsFromText(text) {
  const out = {};
  const lines = String(text || "")
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean);
  const start = lines.findIndex(l => /^parametry$/i.test(l));
  const from = start >= 0 ? start + 1 : 0;
  for (let i = from; i < Math.min(lines.length - 1, from + 80); i++) {
    const lab = PARAM_LABELS.find(x => x.toLowerCase() === lines[i].toLowerCase());
    if (lab && !(lab in out)) out[lab] = lines[++i];
    const kv = lines[i].match(/^([A-ZŁŚŻŹĆŃÓĄĘa-ząćęłńóśźż ()]{3,40}):\s*(.+)$/);
    if (kv && PARAM_LABELS.includes(kv[1].trim()) && !(kv[1].trim() in out)) out[kv[1].trim()] = kv[2].trim();
  }
  return out;
}
const splitNotes = s =>
  String(s || "")
    .replace(/\s+(i|oraz|and|ir)\s+/gi, ", ")
    .split(/\s*[,;•·/|]\s*|\s+-\s+/)
    .map(x =>
      x
        .replace(/^[\s\-\u2013\u2014:.\u25b6\u2764\ufe0f\u2705*]+|[\s.!]+$/gu, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(x => x && x.length < 50)
    .slice(0, 8);
function grab(text, labels) {
  const re = new RegExp(`(?:${labels.join("|")})\\s*[:：\\-–]\\s*([^\\n]+?)(?=\\s*(?:\\n|[.]\\s|$|${STOP.join("|")}))`, "i");
  return (String(text).match(re) || [])[1] || "";
}
const TOP = ["nut[ay] głowy", "nut[ay] górn[ae]", "nuta otwarcia", "top notes?", "viršutinės natos"];
const HEART = ["nut[ay] serca", "nuta środka", "heart notes?", "middle notes?", "širdies natos"];
const BASE = ["nut[ay] bazy", "nuta bazowa", "nuty bazowe", "podstawa", "baza", "base notes?", "bazinės natos"];
const STOP = [...TOP, ...HEART, ...BASE, "grupa zapachowa", "dla kogo", "pojemność", "zaperfumowanie", "skład", "-{5,}"].map(x => `${x}\\s*[:：]?`);

export function factsFrom(src) {
  const params = { ...paramsFromText(src.text), ...(src.params || {}) };
  const all = [src.title, src.desc, src.text].filter(Boolean).join("\n");
  const flat = all.replace(/\s+/g, " ");
  const lc = flat.toLowerCase();
  // Kvapo pavadinimas: „Linia“ (pvz. „inna (MY PINK)“) → skliaustuose; kitaip – iš antraštės be prekės ženklo ir bendrų žodžių
  let name = (params["Linia"] || "").replace(/^inna\s*/i, "").replace(/^\(|\)$/g, "").trim();
  if (!name) {
    const brand = src.brand || params["Marka"] || "";
    name = String(src.title || "")
      .replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ")
      .replace(/\b(\d+\s*ml|trwałe|francuskie|perfumy|perfumetki|perfumetka|damskie|męskie|meskie|unisex|woda|perfumowana|toaletowa|edp|edt|parfum|zapach|oryginalne|nowe|dla|niej|niego|kobiet|mężczyzn)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const notes = { top: splitNotes(grab(flat, TOP)), heart: splitNotes(grab(flat, HEART)), base: splitNotes(grab(flat, BASE)) };
  const group = grab(flat, ["grupa zapachowa", "rodzina zapachowa", "kvapų grupė"]) || params["Grupa zapachowa"] || "";
  const who = `${grab(flat, ["dla kogo", "płeć"])} ${params["Płeć"] || ""} ${params["Przeznaczenie"] || ""} ${src.title}`.toLowerCase();
  const gender = /unisex|uniseks/.test(who) ? "unisex" : /dams|kobie|dla niej|women|moter/.test(who) ? "moterims" : /męs|mes|mężczy|dla niego|men\b|vyr/.test(who) ? "vyrams" : "unisex";
  const kind = `${params["Rodzaj"] || ""} ${lc}`;
  const pct = Number((grab(flat, ["zaperfumowanie", "stężenie", "koncentracja"]) || params["Zaperfumowanie"] || "").match(/\d+/)?.[0] || 0);
  const conc = /ekstrakt|extrait/.test(kind) ? "Extrait" : /woda perfumowana|eau de parfum|\bedp\b/.test(kind) ? "EDP" : /woda toaletowa|eau de toilette|\bedt\b/.test(kind) ? "EDT" : pct >= 25 ? "Extrait" : pct >= 10 ? "EDP" : pct ? "EDT" : "EDP";
  const ml = Number((params["Pojemność opakowania"] || params["Pojemność"] || grab(flat, ["pojemność"]) || flat.match(/(\d{1,3})\s*ml\b/i)?.[0] || "").match(/\d+/)?.[0] || 0);
  const inspired = clean((flat.match(/(?:inspirowan\w*|odpowiednik\w*|zamiennik\w*|inspired by)\s*(?:zapachem|zapachu|perfum)?\s*[:–-]?\s*([A-Z][^.,;\n]{2,60})/) || [])[1] || "", 80);
  // Sudėtis (INCI): po „Skład (INCI)“ iki tuščios eilutės
  const at = all.search(/skład\s*\(inci\)\s*:?/i);
  const inciRaw = src.inci || (at >= 0 ? all.slice(at).replace(/^skład\s*\(inci\)\s*:?\s*/i, "").split(/\n\s*\n|dodatkowe informacje/i)[0] : "");
  const inci = clean(inciRaw.replace(/\s*[•·]\s*/g, ", ").replace(/\s*\n\s*/g, " ").replace(/,\s*$/, ""), 1500);
  return {
    url: src.url || "",
    title: clean(src.title, 200),
    brand: clean(src.brand || params["Marka"] || "", 60),
    name: clean(name, 60),
    gender,
    conc,
    concPct: pct || null,
    ml: ml || null,
    group: clean(group.replace(/[.,]$/, ""), 60),
    notes,
    inspired,
    ingredients: inci,
    price: src.price ? `${src.price} ${src.currency || ""}`.trim() : "",
    gtin: src.gtin || "",
    params,
    desc: clean(src.desc || "", 6000),
    text: clean(src.text || "", 8000)
  };
}

// ── Natos lenkiškai → lietuviškai (žodynas be AI) ─────
const NOTE_LT = {
  // citrusai
  bergamotka: "Bergamotė", "bergamotka kalabryjska": "Kalabrijos bergamotė", cytryna: "Citrina", "skórka cytryny": "Citrinos žievelė", pomarańcza: "Apelsinas", "słodka pomarańcza": "Saldusis apelsinas", "czerwona pomarańcza": "Raudonasis apelsinas", "krwista pomarańcza": "Kraujo apelsinas", mandarynka: "Mandarinas", "zielona mandarynka": "Žaliasis mandarinas", grejpfrut: "Greipfrutas", "różowy grejpfrut": "Rožinis greipfrutas", limonka: "Laimas", yuzu: "Judzu", neroli: "Neroli", petitgrain: "Petitgrenas", cytrusy: "Citrusai", "nuty cytrusowe": "Citrusų natos",
  "kwiat pomarańczy": "Apelsinmedžio žiedai", "kwiat pomarańczowy": "Apelsinmedžio žiedai", "kwiat cytryny": "Citrinmedžio žiedai",
  // vaisiai
  gruszka: "Kriaušė", jabłko: "Obuolys", "zielone jabłko": "Žaliasis obuolys", "czerwone jabłko": "Raudonasis obuolys", brzoskwinia: "Persikas", morela: "Abrikosas", śliwka: "Slyva", malina: "Avietė", truskawka: "Braškė", "czarna porzeczka": "Juodieji serbentai", porzeczka: "Serbentai", wiśnia: "Vyšnia", czereśnia: "Trešnė", ananas: "Ananasas", melon: "Melionas", arbuz: "Arbūzas", kokos: "Kokosas", liczi: "Ličiai", mango: "Mangas", marakuja: "Pasiflora", figa: "Figa", granat: "Granatas", "owoce leśne": "Miško uogos", "czerwone owoce": "Raudonieji vaisiai", jeżyna: "Gervuogė", borówka: "Mėlynė", "nuty owocowe": "Vaisių natos", rabarbar: "Rabarbaras", kiwi: "Kivis", banan: "Bananas", "suszone owoce": "Džiovinti vaisiai", daktyle: "Datulės", rodzynki: "Razinos", pigwa: "Svarainis",
  // prieskoniai ir žolės
  pieprz: "Pipirai", "czarny pieprz": "Juodieji pipirai", "różowy pieprz": "Rožiniai pipirai", "pieprz syczuański": "Sičuano pipirai", kardamon: "Kardamonas", imbir: "Imbieras", cynamon: "Cinamonas", goździki: "Gvazdikėliai", goździk: "Gvazdikas", "gałka muszkatołowa": "Muskato riešutas", szafran: "Šafranas", anyż: "Anyžius", "anyż gwiazdkowaty": "Žvaigždanyžis", kmin: "Kmynai", kolendra: "Kalendra", przyprawy: "Prieskoniai", lawenda: "Levanda", mięta: "Mėta", bazylia: "Bazilikas", rozmaryn: "Rozmarinas", szałwia: "Šalavijas", "szałwia muszkatołowa": "Muskatinis šalavijas", tymianek: "Čiobrelis", estragon: "Peletrūnas", bylica: "Kietis", artemizja: "Kietis", "zielone nuty": "Žaliosios natos", "nuty zielone": "Žaliosios natos", trawa: "Žolė", "liść figowca": "Figmedžio lapai", "liście fiołka": "Žibuoklės lapai", galbanum: "Galbanas", "liść pomidora": "Pomidoro lapai", herbata: "Arbata", "zielona herbata": "Žalioji arbata", "czarna herbata": "Juodoji arbata", matcha: "Matcha", bambus: "Bambukas",
  // gėlės
  róża: "Rožė", "róża damasceńska": "Damasko rožė", "róża bułgarska": "Bulgariška rožė", "róża turecka": "Turkiška rožė", jaśmin: "Jazminas", "jaśmin sambac": "Sambako jazminas", tuberoza: "Tuberozė", irys: "Irisas", fiołek: "Žibuoklė", konwalia: "Pakalnutė", piwonia: "Bijūnas", magnolia: "Magnolija", frezja: "Frezija", gardenia: "Gardenija", "ylang-ylang": "Ilang ilangas", "ylang ylang": "Ilang ilangas", heliotrop: "Heliotropas", orchidea: "Orchidėja", lilia: "Lelija", mimoza: "Mimoza", geranium: "Pelargonija", pelargonia: "Pelargonija", lotos: "Lotosas", "kwiat lotosu": "Lotoso žiedas", "kwiat wiśni": "Vyšnių žiedai", "kwiat jabłoni": "Obels žiedai", "kwiat bawełny": "Medvilnės žiedai", osmantus: "Osmantas", "kwiat osmantusa": "Osmantas", hibiskus: "Hibiskas", akacja: "Akacija", kamelia: "Kamelija", "lilia wodna": "Vandens lelija", "białe kwiaty": "Baltosios gėlės", "nuty kwiatowe": "Gėlių natos", kwiaty: "Gėlės", tiare: "Tiarės žiedai", "kwiat tiare": "Tiarės žiedai", wiciokrzew: "Sausmedis", bez: "Alyvos", "kwiat lipy": "Liepos žiedai", mak: "Aguona", nagietek: "Medetka", rumianek: "Ramunėlė",
  // mediena, ambra, muskusas
  "drzewo sandałowe": "Santalas", sandałowiec: "Santalas", "drzewo cedrowe": "Kedras", cedr: "Kedras", "cedr atlaski": "Atlaso kedras", "cedr wirginijski": "Virdžinijos kedras", wetiwer: "Vetiveris", paczula: "Pačiulis", "drzewo agarowe": "Agaras (oud)", oud: "Oud", "mech dębowy": "Ąžuolo samanos", mech: "Samanos", "nuty drzewne": "Medienos natos", drewno: "Mediena", "drzewo kaszmirowe": "Kašmyro mediena", kaszmeran: "Kašmeranas", gwajak: "Gvajako mediena", "drzewo gwajakowe": "Gvajako mediena", brzoza: "Beržas", sosna: "Pušis", jodła: "Eglė", "igły jodły": "Eglės spygliai", jałowiec: "Kadagys", cyprys: "Kiparisas", "drzewo różane": "Rožmedis", palisander: "Palisandras", "drzewo tekowe": "Tikmedis", "kora": "Žievė",
  ambra: "Ambra", "szara ambra": "Pilkoji ambra", ambroksan: "Ambroksanas", ambroxan: "Ambroksanas", ambrette: "Ambretė", ambretta: "Ambretė", bursztyn: "Gintaras", piżmo: "Muskusas", "białe piżmo": "Baltasis muskusas", "piżmo białe": "Baltasis muskusas", "czyste piżmo": "Švarus muskusas", kadzidło: "Smilkalai", olibanum: "Olibanas", mirra: "Mira", labdanum: "Labdanas", benzoes: "Benzojus", "żywica": "Sakai", "żywice": "Sakai", elemi: "Elemis", styraks: "Stirakas", "balsam tolu": "Tolu balzamas", "balsam peruwiański": "Peru balzamas", "iso e super": "Iso E Super", aldehydy: "Aldehidai", kumaryna: "Kumarinas", "skóra": "Oda", zamsz: "Zomša", tytoń: "Tabakas", "liście tytoniu": "Tabako lapai", "liść tytoniu": "Tabako lapai",
  // gurmaniškos
  wanilia: "Vanilė", "wanilia madagaskarska": "Madagaskaro vanilė", "wanilia bourbon": "Burbono vanilė", "kremowa wanilia": "Kreminė vanilė", "laska wanilii": "Vanilės ankštis", "fasola tonka": "Tonkos pupelės", "fasolka tonka": "Tonkos pupelės", "bób tonka": "Tonkos pupelės", tonka: "Tonkos pupelės", karmel: "Karamelė", "słony karmel": "Sūdyta karamelė", pralina: "Pralinė", praline: "Pralinė", pralinka: "Pralinė", czekolada: "Šokoladas", "gorzka czekolada": "Juodasis šokoladas", kakao: "Kakava", kawa: "Kava", miód: "Medus", migdał: "Migdolai", migdały: "Migdolai", "orzech laskowy": "Lazdyno riešutai", pistacja: "Pistacijos", cukier: "Cukrus", "brązowy cukier": "Rudasis cukrus", "wata cukrowa": "Cukraus vata", "bita śmietana": "Plakta grietinėlė", mleko: "Pienas", toffi: "Irisas", toffee: "Irisas", beza: "Morengas", bezy: "Morengai", ciasteczka: "Sausainiai", rum: "Romas", koniak: "Konjakas", whisky: "Viskis", likier: "Likeris", szampan: "Šampanas", "nuty gurmańskie": "Gurmaniškos natos", "słodkie nuty": "Saldžiosios natos",
  // vanduo, šviežumas
  "nuty morskie": "Jūros natos", "nuty wodne": "Vandens natos", "akord morski": "Jūros akordas", "sól morska": "Jūros druska", ozon: "Ozonas", "nuty ozonowe": "Ozono natos", "akord wodny": "Vandens akordas", "świeże powietrze": "Gaivus oras", "nuty świeże": "Gaivios natos", "nuty pudrowe": "Pudros natos", puder: "Pudra", "nuty zielone i świeże": "Žaliosios natos"
};
const ADJ_DROP = /^(delikatn\w*|kremow\w*|soczyst\w*|śwież\w*|swiez\w*|słodk\w*|subteln\w*|ciepł\w*|zmysłow\w*|egzotyczn\w*|lekk\w*|intensywn\w*|głębok\w*|aksamitn\w*|naturaln\w*|dzik\w*|ciemn\w*|jasn\w*|pikantn\w*|orzeźwiając\w*|otulając\w*|szlachetn\w*)\s+/i;
const ADJ_LT = { kremow: "kreminė", delikatn: "švelni", soczyst: "sultinga", śwież: "gaivi", słodk: "saldi", ciepł: "šilta", dzik: "laukinė", ciemn: "tamsi" };
export function noteLt(pl) {
  const k = String(pl || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (NOTE_LT[k]) return { lt: NOTE_LT[k], ok: true };
  const plain = k.replace(ADJ_DROP, "");
  if (NOTE_LT[plain]) {
    const adj = Object.entries(ADJ_LT).find(([a]) => k.startsWith(a));
    // Būdvardį paliekame tik vienaskaitos moteriškosios giminės natoms (vanilė, rožė…), kitaip – tik daiktavardis
    const lt = NOTE_LT[plain];
    return { lt: adj && /ė$/.test(lt) && !/s$/.test(lt) ? `${cap(adj[1])} ${lt.toLowerCase()}` : lt, ok: true };
  }
  return { lt: cap(String(pl || "").trim()), ok: false };
}

// ── Kvapų grupė → Vaidore šeima ───────────────────────
function familyOf(facts) {
  const g = `${facts.group}`.toLowerCase();
  const first = g.split(/[-\s,]/)[0];
  const byWord = w =>
    /kwiat|flor|kvet/.test(w) ? "geliu" : /drzew|wood|szypr|chypre|mech/.test(w) ? "medienos" : /orient|ambr|przypraw|spic|korzen|skór|kadz/.test(w) ? "ambros" : /gurman|słod|slod|wanil|owoc|fruit/.test(w) ? "gurmaniski" : /cytrus|śwież|swiez|wodn|morsk|aromat|zielon|fresh|fougere|paproc/.test(w) ? "sviezi" : "";
  const f = byWord(first) || byWord(g);
  if (f === "gurmaniski" && /owoc/.test(first) && /kwiat/.test(g)) return "geliu";
  if (f) return f;
  const n = [...facts.notes.top, ...facts.notes.heart, ...facts.notes.base].join(" ").toLowerCase();
  if (/wanil|karmel|pralin|czekol|kakao|kawa|miód|tonka/.test(n)) return "gurmaniski";
  if (/ambr|kadzid|oud|żywic|benzo|labdan|tytoń/.test(n)) return "ambros";
  if (/róż|jaśmin|tuberoz|irys|piwon|kwiat/.test(n)) return "geliu";
  if (/cedr|sandał|wetiw|paczul|drzew/.test(n)) return "medienos";
  return "sviezi";
}

// ── Juodraštis be AI (šablonai) ───────────────────────
const FAMILY_TXT = {
  geliu: { what: "švelnus gėlių kvapas", mood: "Šviesus ir elegantiškas – tinka kasdien, į darbą ir pasimatymui.", seasons: ["pavasaris", "vasara"], times: ["diena"], look: { liquid: "#F1C9CF", tint: "#FBF0F1" } },
  sviezi: { what: "gaivus, šviesus kvapas", mood: "Lengvas ir švarus – idealus šiltomis dienomis, į darbą ir po sporto.", seasons: ["pavasaris", "vasara"], times: ["diena"], look: { liquid: "#CFE4EA", tint: "#EEF5F7" } },
  medienos: { what: "elegantiškas medienos kvapas", mood: "Ramus ir pasitikintis savimi – tinka ir dienai, ir vakarui.", seasons: ["ruduo", "žiema"], times: ["diena", "vakaras"], look: { liquid: "#C9A27A", tint: "#F3ECE4" } },
  ambros: { what: "šiltas, gaubiantis ambros kvapas", mood: "Sodrus ir paslaptingas – sukurtas vakarams ir ypatingoms progoms.", seasons: ["ruduo", "žiema"], times: ["vakaras"], look: { liquid: "#D9A05B", tint: "#F7EEE2" } },
  gurmaniski: { what: "saldus, gurmaniškas kvapas", mood: "Jaukus ir viliojantis – geriausiai atsiskleidžia vėsesniais vakarais.", seasons: ["ruduo", "žiema"], times: ["vakaras"], look: { liquid: "#C98B5A", tint: "#F6EDE4" } }
};
const GENDER_TXT = { moterims: "moterims", vyrams: "vyrams", unisex: "tinkantis ir jai, ir jam" };
const SEASON_ACC = { pavasaris: "pavasarį", vasara: "vasarą", ruduo: "rudenį", žiema: "žiemą" };
const CONC_TXT = { EDT: "Eau de Toilette – lengvesnės koncentracijos kvapas kasdienai.", EDP: "Eau de Parfum koncentracija – kvapas ilgai išlieka ant odos.", Parfum: "Parfum koncentracija – sodrus ir itin ilgai išliekantis kvapas.", Extrait: "Extrait de Parfum – didžiausia koncentracija, kvapas išlieka visą dieną." };
const andList = a => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} ir ${a.at(-1)}`);

export function draftFromFacts(f) {
  const family = familyOf(f);
  const ft = FAMILY_TXT[family];
  const untranslated = [];
  const tr = list =>
    list.map(x => {
      const r = noteLt(x);
      if (!r.ok) untranslated.push(x);
      return r.lt;
    });
  const notes = { top: tr(f.notes.top), heart: tr(f.notes.heart), base: tr(f.notes.base) };
  const name = titleCase(f.name || "Naujas kvapas");
  const lc = a => a.map(x => (/^[A-Z]{2,}/.test(x) ? x : x.toLowerCase()));
  const parts = [notes.top.length && `viršutinės natos – ${andList(lc(notes.top))}`, notes.heart.length && `širdyje – ${andList(lc(notes.heart))}`, notes.base.length && `bazėje – ${andList(lc(notes.base))}`].filter(Boolean);
  const desc = [
    `${name} – ${ft.what} ${GENDER_TXT[f.gender]}.`,
    parts.length ? `${cap(parts.join(", "))}.` : "",
    `${ft.mood} Labiausiai atsiskleidžia ${andList(ft.seasons.map(s => SEASON_ACC[s]))}.`,
    CONC_TXT[f.conc] || ""
  ]
    .filter(Boolean)
    .join(" ");
  const keys = [notes.top[0], notes.heart[0], notes.base[0]].filter(Boolean);
  const tagline = keys.length ? cap(andList(keys.map((x, i) => (i ? x.toLowerCase() : x)))) : cap(ft.what);
  return {
    name,
    id: slugify(name),
    inspired: f.inspired || "",
    gender: f.gender,
    conc: f.conc,
    family,
    tagline: tagline.slice(0, 90),
    description: desc.slice(0, 1500),
    ingredients: f.ingredients || "",
    notes,
    longevity: f.conc === "EDT" ? 3 : f.conc === "EDP" ? 4 : 5,
    sillage: f.conc === "EDT" ? 3 : 4,
    seasons: ft.seasons,
    times: ft.times,
    sizes: f.ml ? [{ ml: f.ml, price: "" }] : [],
    look: { ...ft.look, cap: "gold", shape: "rect" },
    untranslated
  };
}

// ── Juodraštis su AI (Claude) ─────────────────────────
const TOOL = {
  name: "kvapo_juodrastis",
  description: "Vaidore kvapo kortelės laukai lietuviškai.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Kvapo pavadinimas (linijos pavadinimas, pvz. My Pink), be prekės ženklo ir tūrio" },
      inspired: { type: "string", description: "„Prekės ženklas – kvapas“ TIK jei šaltinyje aiškiai parašyta, kad įkvėpta / analogas; kitaip tuščia" },
      gender: { type: "string", enum: GENDERS },
      conc: { type: "string", enum: CONCS },
      family: { type: "string", enum: FAMILIES },
      tagline: { type: "string", description: "Trumpas šūkis, iki 60 simbolių, be taško gale" },
      description: { type: "string", description: "Aprašymas lietuviškai, 3–5 sakiniai, 350–650 simbolių" },
      top: { type: "array", items: { type: "string" } },
      heart: { type: "array", items: { type: "string" } },
      base: { type: "array", items: { type: "string" } },
      longevity: { type: "integer", minimum: 1, maximum: 5 },
      sillage: { type: "integer", minimum: 1, maximum: 5 },
      seasons: { type: "array", items: { type: "string", enum: SEASONS } },
      times: { type: "array", items: { type: "string", enum: TIMES } },
      liquid: { type: "string", description: "Skysčio spalva #RRGGBB, atitinkanti kvapo nuotaiką" },
      tint: { type: "string", description: "Labai šviesus fono atspalvis #RRGGBB" }
    },
    required: ["name", "gender", "conc", "family", "tagline", "description", "top", "heart", "base", "longevity", "sillage", "seasons", "times"]
  }
};
const SYSTEM = `Tu – prabangių kvepalų e. parduotuvės „Vaidore“ (Lietuva) tekstų autorius ir parfumerijos ekspertas.
Iš pateikto kito pardavėjo skelbimo paimk tik FAKTUS (natas, kvapų grupę, kam skirta, koncentraciją, tūrį) ir parašyk Vaidore kvapo kortelę taisyklinga, gyva lietuvių kalba.
Taisyklės:
- Aprašymas – savas, ne vertimas ir ne perpasakojimas: jokių sakinių ar reklaminių teiginių iš skelbimo (pvz. „francuziški aliejai“, „20 %“, „lenkiškas prekės ženklas“, „telpa į rankinę“), jokio pardavėjo ar prekės ženklo pavadinimo.
- Tonas kaip pavyzdžiuose: elegantiškas, vaizdingas, konkretus, be šauktukų ir emoji, be „tobulas“, „unikalus“, „nepakartojamas“. Kvapą aprašyk per natų atsiskleidimą, nuotaiką ir progas.
- Natos – lietuviški parfumerijos pavadinimai, vardininkas, didžioji pirmoji raidė (pvz. „Apelsinmedžio žiedai“, „Baltasis muskusas“, „Tonkos pupelės“). Neišgalvok natų, kurių nėra šaltinyje; bendras frazes kaip „delikatne nuty drzewne“ versk „Medienos natos“.
- inspired – tik jei šaltinyje aiškiai nurodytas originalus kvapas; kitaip tuščia eilutė.
- family: geliu (gėlių), sviezi (švieži, citrusiniai, vandens, aromatiniai), medienos, ambros (rytietiški, prieskoniniai, smilkalai), gurmaniski (saldūs, vanilė, karamelė).
- longevity ir sillage (1–5) – realistiškai pagal koncentraciją ir natas (EDP dažniausiai 4/3–4).`;

export async function aiDraft(f, env, examples = []) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const facts = { pavadinimas: f.title, prekes_zenklas: f.brand, linija: f.name, kam: f.gender, koncentracija: f.conc, procentai: f.concPct, turis_ml: f.ml, kvapu_grupe: f.group, natos: f.notes, parametrai: f.params, inspired: f.inspired };
  const user = `Vaidore pavyzdžiai (tonas ir ilgis):\n${examples
    .slice(0, 3)
    .map(p => `• ${p.name} – ${p.tagline}\n${p.description}`)
    .join("\n\n")}\n\nSkelbimo faktai (JSON):\n${JSON.stringify(facts)}\n\nSkelbimo aprašymas (tik faktams):\n${(f.desc || f.text).slice(0, 5000)}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: env.IMPORT_MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: user }]
    })
  });
  if (!r.ok) throw Object.assign(new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: 502 });
  const d = await r.json();
  return d.content?.find(b => b.type === "tool_use")?.input || null;
}

// AI atsakymas → patikrintas juodraštis (neleistinos reikšmės – iš šablono)
const hex = v => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? v : "");
const lvl = (v, d) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : d);
const noteList = (a, d) => (Array.isArray(a) && a.length ? a.map(x => cap(clean(x, 40))).filter(Boolean).slice(0, 8) : d);
export function mergeDraft(base, ai) {
  if (!ai) return { ...base, ai: false };
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const name = clean(ai.name, 60) || base.name;
  return {
    ...base,
    name,
    id: slugify(name) || base.id,
    inspired: clean(ai.inspired, 120) || base.inspired,
    gender: pick(ai.gender, GENDERS, base.gender),
    conc: pick(ai.conc, CONCS, base.conc),
    family: pick(ai.family, FAMILIES, base.family),
    tagline: clean(ai.tagline, 90).replace(/\.$/, "") || base.tagline,
    description: clean(ai.description, 1500) || base.description,
    notes: { top: noteList(ai.top, base.notes.top), heart: noteList(ai.heart, base.notes.heart), base: noteList(ai.base, base.notes.base) },
    longevity: lvl(ai.longevity, base.longevity),
    sillage: lvl(ai.sillage, base.sillage),
    seasons: Array.isArray(ai.seasons) && ai.seasons.some(s => SEASONS.includes(s)) ? ai.seasons.filter(s => SEASONS.includes(s)) : base.seasons,
    times: Array.isArray(ai.times) && ai.times.some(s => TIMES.includes(s)) ? ai.times.filter(s => TIMES.includes(s)) : base.times,
    look: { ...base.look, liquid: hex(ai.liquid) || base.look.liquid, tint: hex(ai.tint) || base.look.tint },
    untranslated: [],
    ai: true
  };
}

// Leidžiami skelbimų adresai (serveris parsisiunčia tik juos)
export function importUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    if (u.protocol !== "https:" || !/(^|\.)allegro\.pl$/i.test(u.hostname)) return null;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}
