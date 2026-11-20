// 13 – automatinis produktų pridėjimas (v15): įklijuotas prekės aprašymas (LT / PL / EN) → produkto formos laukai lietuviškai.
// Be jokio API: taisyklės, žodynai (13-autofill-words.js) ir lietuviški šablonai. Grynas JS be DOM – tikrina tools/test-autofill.mjs.
//
//   afParse(text, { scent, type, families }) → { lang, type, fields, auto, facts, missing, unknown }
//     scent    – pasirinktas esamas kvapas (scents eilutė): kvapo laukai imami iš jo, tekstas papildo tik tipą, talpą, savybes
//     type     – dabartinis formos tipas (jei tekste tipo nėra)
//     families – leidžiamos kvapo šeimos (id); kitos – nenaudojamos
//   Iš šaltinio imami tik faktai; aprašymas ir šūkis – savi (šablonai), be pardavėjo teiginių ir prekės ženklų.
//   Rezultatas deterministinis: sakinių variantai parenkami pagal pavadinimą (afPick).

const AF_TYPE_IDS = ["kvepalai", "difuzoriai", "zvakes", "aliejai", "elektriniai-difuzoriai"];
const AF_SCENTED = new Set(["kvepalai", "difuzoriai", "zvakes", "aliejai"]);
const AF_NAME_PREFIX = { kvepalai: "", difuzoriai: "Difuzorius", zvakes: "Kvapni žvakė", aliejai: "Aromatinis aliejus", "elektriniai-difuzoriai": "Elektrinis difuzorius" };
// Tipui būdingos savybės (products.attrs): raktas, pavadinimas, vienetas (formoje ir parduotuvėje)
const AF_ATTRS = {
  kvepalai: [],
  difuzoriai: [
    ["sticks", "Lazdelių skaičius", "vnt."],
    ["weeks", "Trukmė", "sav."]
  ],
  zvakes: [
    ["burn", "Degimo trukmė", "val."],
    ["wax", "Vaškas", ""],
    ["wick", "Dagtis", ""]
  ],
  aliejai: [
    ["weeks", "Trukmė", "sav."],
    ["forDiffuser", "Elektriniams difuzoriams", ""]
  ],
  "elektriniai-difuzoriai": [
    ["tank", "Vandens talpa", "ml"],
    ["runtime", "Veikimo laikas", "val."],
    ["light", "Apšvietimas", ""]
  ]
};
const afProductName = (type, scentName) => [AF_NAME_PREFIX[type] || "", scentName || ""].filter(Boolean).join(" ").trim();

// ── Pagalbinės ──
const afFold = s =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const afSlug = s =>
  afFold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const afCap = s => (s ? s.charAt(0).toLocaleUpperCase("lt") + s.slice(1) : s);
const afAnd = a => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} ir ${a.at(-1)}`);
function afHash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}
const afPick = (arr, seed, salt = "") => arr[afHash(`${seed}|${salt}`) % arr.length];
// Lietuviškas skaičiaus linksnis: 1 lazdelė, 2 lazdelės, 10 lazdelių
const afPlural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && (n % 100 < 10 || n % 100 > 20) ? few : many);
const afNum = v => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
// Natos rodymas sakinio viduryje: mažoji raidė, išskyrus tikrinius pavadinimus (Kalabrijos, Madagaskaro, Iso E Super…)
const AF_PROPER = /^(Kalabrijos|Amalfio|Madagaskaro|Burbono|Damasko|Sičuano|Atlaso|Virdžinijos|Peru|Tolu|Iso|Kašmyro|Judzu|Neroli|Oud|Matcha)\b/;
const afLc = n => (AF_PROPER.test(n) || /^[A-Z]{2,}/.test(n) ? n : n.charAt(0).toLocaleLowerCase("lt") + n.slice(1));

// Natų rodyklė: PL / EN raktai ir lietuviški pavadinimai (be diakritikų), kad atpažintų ir lietuvišką tekstą
const AF_NOTE_IX = new Map();
for (const [k, v] of Object.entries(AF_NOTES)) AF_NOTE_IX.set(afFold(k), v);
for (const v of Object.values(AF_NOTES)) if (!AF_NOTE_IX.has(afFold(v))) AF_NOTE_IX.set(afFold(v), v);
const AF_DROP_IX = new Set(AF_NAME_DROP.map(afFold));

// ── Žymos (etiketės) ──
const AF_LABELS = {
  top: ["nut[ay] g[łl]owy", "nut[ay] g[óo]rn[aey]", "nut[ay] otwarcia", "top notes?", "head notes?", "opening notes?", "vir[šs]utin[ėe]s natos", "vir[šs]utin[ėe] nata", "prad[žz]ios natos"],
  heart: ["nut[ay] serca", "nut[ay] [śs]rodka", "heart notes?", "middle notes?", "mid notes?", "[šs]irdies natos", "vidurin[ėe]s natos"],
  base: ["nut[ay] bazy", "nut[ay] bazow[aey]", "podstawa", "baza", "base notes?", "bottom notes?", "dry ?down", "bazin[ėe]s natos", "pagrindo natos"],
  notes: ["nuty zapachowe", "kompozycja zapachowa", "fragrance notes", "scent notes", "kvapo natos", "notes", "natos", "nuty"],
  group: ["grupa zapachowa", "rodzina zapachowa", "typ zapachu", "charakter zapachu", "rodzaj zapachu", "fragrance family", "olfactory family", "scent family", "fragrance type", "kvap[ųu] grup[ėe]", "kvapo grup[ėe]", "kvap[ųu] [šs]eima", "kvapo tipas"],
  gender: ["dla kogo", "p[łl]e[ćc]", "przeznaczenie", "gender", "for whom", "kam skirta", "lytis"],
  tank: ["pojemno[śs][ćc] zbiornika", "tank capacity", "water tank", "bakelio talpa", "rezervuaro talpa"],
  volume: ["pojemno[śs][ćc]", "obj[ęe]to[śs][ćc]", "volume", "capacity", "size", "talpa", "t[ūu]ris"],
  weight: ["waga netto", "waga", "masa", "gramatura", "net weight", "weight", "svoris"],
  conc: ["zaperfumowanie", "st[ęe][żz]enie", "koncentracja", "perfume concentration", "concentration", "koncentracija"],
  inci: ["sk[łl]ad \\(inci\\)", "inci", "ingredients", "sud[ėe]tis"],
  burn: ["czas palenia", "czas spalania", "czas [śs]wiecenia", "burn(?:ing)? time", "degimo trukm[ėe]", "degimo laikas"],
  wax: ["rodzaj wosku", "wosk", "wax type", "wax", "va[šs]kas"],
  wick: ["knot", "wick", "dagtis"],
  sticks: ["liczba patyczk[óo]w", "patyczki", "pa[łl]eczki", "number of (?:sticks|reeds)", "sticks", "reeds", "lazdel[ėe]s", "lazdeli[ųu] skai[čc]ius"],
  duration: ["wystarcza na", "starcza na", "czas trwania", "tr[wv]a[łl]o[śs][ćc]", "lasts", "duration", "trukm[ėe]", "u[žz]tenka"],
  runtime: ["czas pracy", "run(?:ning)? time", "working time", "operating time", "veikimo laikas"],
  light: ["pod[śs]wietlenie", "o[śs]wietlenie", "lighting", "light", "ap[šs]vietimas"],
  brand: ["marka", "producent", "brand", "manufacturer", "prek[ėe]s [žz]enklas", "gamintojas"],
  line: ["linia zapachowa", "linia", "seria", "linija"],
  inspired: ["inspirowane", "inspirowany", "inspirowana", "inspiracja", "odpowiednik", "zamiennik", "inspired by", "alternative to", "dupe of", "[įi]kv[ėe]pta", "[įi]kv[ėe]ptas", "analogas", "originalas"]
};
const AF_LABEL_ORDER = Object.keys(AF_LABELS);
const AF_LABEL_RE = Object.fromEntries(AF_LABEL_ORDER.map(k => [k, new RegExp(`^(?:${AF_LABELS[k].join("|")})\\s*(?:\\([^)]{0,30}\\))?\\s*[:：=\\-–—]\\s*(.*)$`, "i")]));
const AF_LABEL_SPLIT = new RegExp(`(^|[\\s.;,)])((?:${AF_LABEL_ORDER.flatMap(k => AF_LABELS[k]).join("|")})\\s*(?:\\([^)]{0,30}\\))?\\s*[:：])`, "gi");

// Tekstas → eilutės: be emoji, ženklų (✅ ❤️ ▶ •) ir brūkšnių eilučių; žinomos žymos – naujoje eilutėje
function afLines(text) {
  let t = String(text ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]/g, " ")
    .replace(/[\p{Extended_Pictographic}←-⇿─-➿⬀-⯿️‍]/gu, " ");
  t = t.replace(AF_LABEL_SPLIT, "$1\n$2");
  return t
    .split("\n")
    .map(l =>
      l
        .replace(/^[\s*•·\-–—>|]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(l => l && !/^[-_=~.*\s]+$/.test(l));
}
// Žymų reikšmės: { top: ["…"], volume: ["33ml"], … } (pirmoji eilutė – pavadinimas, jei ne žyma)
function afLabeled(lines) {
  const out = {};
  const rest = [];
  for (const line of lines) {
    let hit = false;
    for (const k of AF_LABEL_ORDER) {
      const m = line.match(AF_LABEL_RE[k]);
      if (m) {
        (out[k] ||= []).push(m[1].trim());
        hit = true;
        break;
      }
    }
    if (!hit) rest.push(line);
  }
  return { out, rest };
}

// ── Kalba ──
function afLang(text) {
  const t = String(text).toLowerCase();
  const pl = (t.match(/[ąćęłńśźż]/g) || []).length + 3 * (t.match(/\b(nuta|nuty|zapach\w*|dla|pojemno\w*|perfumy|świec\w*|olejek)\b/g) || []).length;
  const lt = (t.match(/[ėįųūč]/g) || []).length + 3 * (t.match(/\b(natos|kvapas|kvapo|kvepalai|skirta|žvakė|aliejus|talpa)\b/g) || []).length;
  const en = 3 * (t.match(/\b(notes|the|and|with|for|fragrance|scent|candle|oil|women|men)\b/g) || []).length;
  const best = Math.max(pl, lt, en);
  return !best ? "lt" : best === pl ? "pl" : best === lt ? "lt" : "en";
}
const AF_LANG_NAME = { pl: "lenkų", en: "anglų", lt: "lietuvių" };

// ── Tipas ──
function afDetectType(text) {
  const t = String(text).toLowerCase();
  const n = re => (t.match(re) || []).length;
  const score = {
    "elektriniai-difuzoriai": 4 * n(/dyfuzor\w* elektryczn|elektryczn\w* dyfuzor|nawil[żz]acz|ultrad[źz]wi[ęe]k|ultrasonic|electric (?:aroma )?diffuser|aroma diffuser|humidifier|nebuli[sz]er|elektrinis difuzorius|elektriniai difuzoriai|ultragars|dr[ėe]kintuv/g),
    zvakes: 4 * n(/[śs]wiec[aey]?\b|[śs]wieczk|candle|[žz]vak[ėe]/g),
    aliejai: 4 * n(/olej\w* (?:do|dla) (?:dyfuzor|nawil|aromaterap)|oil for (?:diffuser|humidifier)|diffuser oil|aliej\w* (?:difuzori|elektrini)|difuzori\w* aliej/g) + 2 * n(/olejek|fragrance oil|essential oil|aroma oil|aromatinis aliejus|eterinis aliejus/g),
    difuzoriai: 4 * n(/patycz|pa[łl]ecz|reed diffuser|diffuser sticks|reeds|lazdel/g) + n(/dyfuzor|diffuser|difuzori/g),
    kvepalai: 2 * n(/perfum|parfum|eau de|\bedp\b|\bedt\b|woda toaletowa|woda perfumowana|kvepal|tualetinis vanduo|zaperfumowanie/g)
  };
  if (score["elektriniai-difuzoriai"]) score.difuzoriai = 0;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

// ── Natos ──
function afAdjForm(forms, lt) {
  const w = lt.toLowerCase();
  if (/ai$/.test(w)) return forms[2];
  if (/(ės|os)$/.test(w)) return forms[3];
  if (/(as|is|us|ys)$/.test(w)) return forms[1];
  return forms[0];
}
function afNote(raw) {
  const s = String(raw)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.!?:;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length > 48 || /\d/.test(s)) return null;
  const k = afFold(s);
  if (AF_NOTE_IX.has(k)) return { lt: AF_NOTE_IX.get(k), ok: true };
  const words = s.split(" ");
  let adj = null;
  let i = 0;
  while (i < words.length - 1) {
    const a = AF_ADJ.find(([re]) => re.test(words[i]));
    if (a) adj ||= a[1];
    else if (!AF_ADJ_DROP.test(words[i])) break;
    i++;
  }
  // Būdvardis po daiktavardžio (lenkiškai: „piżmo białe“, „nuty drzewne delikatne“)
  let j = words.length;
  while (j - 1 > i && AF_ADJ_DROP.test(words[j - 1])) j--;
  const k2 = afFold(words.slice(i, j).join(" "));
  if (AF_NOTE_IX.has(k2)) {
    const lt = AF_NOTE_IX.get(k2);
    return { lt: adj && !lt.includes(" ") ? afCap(`${afAdjForm(adj, lt)} ${lt.toLowerCase()}`) : lt, ok: true };
  }
  return { lt: afCap(s), ok: false };
}
const afSplitNotes = s =>
  String(s ?? "")
    .replace(/\s+(i|oraz|and|ir|&|ou|und)\s+/gi, ", ")
    .split(/\s*[,;•·/|+]\s*|\s+[-–—]\s+/)
    .map(x => x.trim())
    .filter(x => x && x.length < 50);

// ── Kvapo šeima ──
const AF_FAMILY_LT = [
  ["gurmaniski", /vanil|karamel|pralin|šokolad|kakav|\bkava|medus|tonk|cukr|morengo|pien/i],
  ["ambros", /ambr|smilkal|oud|agaras|sakai|benzoj|labdan|tabak|^oda|olibanas|mira\b/i],
  ["geliu", /rož|jazmin|tuberoz|iris|bijūn|žied|gėl|lelij|frezij|magnolij|pakalnut|žibuokl|orchid|gardenij/i],
  ["medienos", /kedr|santal|vetiver|pačiul|medien|samanos|kašmyr|gvajak|beržas|pušis|eglė/i],
  ["sviezi", /bergamot|citrin|apelsin|mandarin|greipfrut|laim|jūr|vand|mėt|arbat|ozon|žaliosios|levand|judzu|neroli/i]
];
function afFamily(group, notes) {
  const g = String(group || "").toLowerCase();
  if (g) {
    const by = w => (AF_FAMILY_WORDS.find(([, re]) => re.test(w) || re.test(afFold(w))) || [])[0] || null;
    const first = g.split(/[-\s,/]+/)[0];
    const f = by(first) || by(g);
    if (f === "gurmaniski" && /owoc|fruit|vais/.test(first) && /kwiat|flor|gėl/.test(g)) return "geliu";
    if (f) return f;
  }
  const all = [...notes.base, ...notes.heart, ...notes.top];
  if (!all.length) return null;
  // Svarbiausia – bazė ir širdis: skaičiuojami atitikmenys su svoriais
  const score = Object.fromEntries(AF_FAMILY_LT.map(([id]) => [id, 0]));
  const add = (list, w) => list.forEach(n => AF_FAMILY_LT.forEach(([id, re]) => re.test(n) && (score[id] += w)));
  add(notes.top, 1);
  add(notes.heart, 2);
  add(notes.base, 2);
  if (notes.heart.some(n => AF_FAMILY_LT[2][1].test(n))) score.geliu += 2; // gėlių širdis – lemia charakterį
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "sviezi";
}

// ── Koncentracija ──
const AF_CONC_WORDS = [
  ["Extrait", /ekstrakt|extrait|esencja perfum|perfume extract|ekstraktas/i],
  ["Parfum", /(?<!de )\bparfum\b(?! de)|perfumy w olejku/i],
  ["EDP", /woda perfumowana|eau de parfum|\bedp\b|kvapusis vanduo/i],
  ["EDT", /woda toaletowa|eau de toilette|\bedt\b|tualetinis vanduo/i]
];
const afConcFromPct = p => (p > 30 ? "Extrait" : p > 20 ? "Parfum" : p >= 10 ? "EDP" : p >= 5 ? "EDT" : null);
function afConc(lines, pct) {
  // 1) Eilutė su „nasz produkt / our product / mūsų produktas“ (koncentracijų lentelėse)
  const mark = lines.find(l => /nasz produkt|our product|m[ūu]s[ųu] produkt|ten produkt|this product/i.test(l));
  if (mark) {
    const c = AF_CONC_WORDS.find(([, re]) => re.test(mark));
    if (c) return { conc: c[0], how: "pažymėta aprašyme" };
  }
  // 2) Procentai (zaperfumowanie 20 %)
  if (pct) {
    const c = afConcFromPct(pct);
    if (c) return { conc: c, how: `${pct} %` };
  }
  // 3) Vienintelis paminėjimas tekste
  const found = new Set();
  for (const l of lines) for (const [c, re] of AF_CONC_WORDS) if (re.test(l)) found.add(c);
  if (found.size === 1) return { conc: [...found][0], how: "nurodyta aprašyme" };
  return { conc: "EDP", how: null };
}

// ── Lytis ──
function afGender(s) {
  const t = String(s || "").toLowerCase();
  const w = /damsk|kobie|dla niej|women|woman|for her|femme|female|moter|jai\b/.test(t);
  const m = /m[ęe]sk|m[ęe][żz]czyzn|dla niego|\bmen\b|\bman\b|for him|homme|male\b|vyr|jam\b/.test(t);
  if (/unisex|uniseks|dla obojga|for both|abiem/.test(t) || (w && m)) return "unisex";
  return w ? "moterims" : m ? "vyrams" : null;
}

// ── Pavadinimas ──
function afName(title, body, brand) {
  const words = String(title || "")
    .replace(/\s(?:[-–—]\s*)?(?:inspired by|inspirowan\w*|odpowiednik\w*|zamiennik\w*|[įi]kv[ėe]pt\w*|analog\w*)\b.*$/i, "")
    .replace(/\s(?:with|z|ze|su)\s.*$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|l|g|gr|kg|szt|pcs|vnt|h|%)\b\.?/gi, " ")
    .replace(/\bx\s*\d+\b/gi, " ")
    .replace(/[^\p{L}\p{N}'’&.\- ]+/gu, " ")
    .split(/\s+/)
    .map(w => w.replace(/^[-.]+|[-.]+$/g, ""))
    .filter(Boolean);
  const brandSet = new Set(afFold(brand).split(" ").filter(Boolean));
  const fbody = ` ${afFold(body)} `;
  let keep = words.filter(w => !AF_DROP_IX.has(afFold(w)) && !brandSet.has(afFold(w)) && !/^\d+$/.test(w));
  // Pavadinimas didžiosiomis tarp kitų žodžių („Aromatinis aliejus … SAULĖS SODAS“) – imamas jis
  const isCaps = w => /\p{L}{2}/u.test(w) && w === w.toLocaleUpperCase("pl") && w !== w.toLocaleLowerCase("pl");
  const caps = keep.filter(isCaps);
  if (caps.length && caps.length < keep.length) {
    const from = keep.findIndex(isCaps);
    let to = from;
    while (to < keep.length && isCaps(keep[to])) to++;
    keep = keep.slice(from, to);
  }
  // Prekės ženklas: žodis, kuris aprašyme pasikartoja ≥ 2 kartus (pvz. „NOMI Perfumetki“, „Perfumetki NOMI“)
  const recurring = keep.filter(w => w.length >= 2 && fbody.split(` ${afFold(w)} `).length - 1 >= 2);
  if (recurring.length && recurring.length < keep.length) keep = keep.filter(w => !recurring.includes(w));
  const name = keep
    .slice(0, 5)
    .map(w => (/\d/.test(w) ? w : w.charAt(0).toLocaleUpperCase("pl") + w.slice(1).toLocaleLowerCase("pl")))
    .join(" ");
  return { name, brand: [...new Set([...(brand ? [brand] : []), ...recurring])].join(", ") };
}

// ── Skaičiai su vienetais ──
const AF_RX = {
  ml: /(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i,
  g: /(\d+(?:[.,]\d+)?)\s*(g|gr|gram\w*|kg)\b/i,
  hours: /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:h\b|godz\w*|hours?|hrs?|val\w*)/i,
  weeks: /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:tygod\w*|weeks?|savai\w*|sav\.)/i,
  months: /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:miesi\w*|months?|m[ėe]nes\w*|m[ėe]n\.)/i,
  pct: /(\d+(?:[.,]\d+)?)\s*%/,
  count: /(\d+)\s*(?:szt\.?\s*)?(?:[\p{L}]+\s+){0,3}?(?:patycz\p{L}*|pa[łl]ecz\p{L}*|sticks?|reeds?|lazdel\p{L}*)/iu
};
const afMl = s => {
  const m = String(s || "").match(AF_RX.ml);
  if (!m) return null;
  const v = afNum(m[1]);
  return v && /^l$/i.test(m[2]) ? v * 1000 : v;
};
const afG = s => {
  const m = String(s || "").match(AF_RX.g);
  if (!m) return null;
  const v = afNum(m[1]);
  return v && /^kg$/i.test(m[2]) ? v * 1000 : v;
};
const afMax = m => (m ? Math.max(Number(m[1]), Number(m[2] || 0)) : null);

const AF_WAX = [
  [/soj|soy|sojų/i, "Sojų vaškas", "sojų vaško"],
  [/rzepak|rapeseed|rapsų/i, "Rapsų vaškas", "rapsų vaško"],
  [/kokos|coconut|kokosų/i, "Kokosų vaškas", "kokosų vaško"],
  [/pszczel|beeswax|bičių/i, "Bičių vaškas", "bičių vaško"],
  [/parafin|paraffin/i, "Parafinas", "parafino"]
];
const AF_WICK = [
  [/drewnian|wooden|wood wick|medin/i, "Medinė"],
  [/bawe[łl]n|cotton|medvil/i, "Medvilninė"]
];

// ── Sugeneruoti laukai pagal šeimą ──
const AF_FAMILY_TXT = {
  geliu: { homeMood: ["Sukuria šviesią, romantišką nuotaiką.", "Namuose kvepia lyg žydinčiame sode."], kind: ["švelnus gėlių kvapas", "elegantiškas gėlių kvapas"], home: ["švelnus gėlių aromatas", "elegantiškas gėlių aromatas"], mood: ["Šviesus ir elegantiškas – švelniai gaubia ir palieka malonų pėdsaką.", "Subtilus ir švelnus, jis kuria lengvą, elegantišką įspūdį."], look: [{ liquid: "#F1C9CF", tint: "#FBF0F1" }, { liquid: "#EFC3CB", tint: "#FAEEF0" }] },
  sviezi: { homeMood: ["Gaivina erdvę ir suteikia švaros pojūtį.", "Namuose kvepia lengvai ir švariai, lyg po lietaus."], kind: ["gaivus, šviesus kvapas", "švarus ir gaivus kvapas"], home: ["gaivus, švarus aromatas", "lengvas ir gaivus aromatas"], mood: ["Lengvas ir švarus – suteikia gaivumo ir energijos.", "Gaivus kaip ryto oras, jis palieka švarų ir šviesų įspūdį."], look: [{ liquid: "#CFE4EA", tint: "#EEF5F7" }, { liquid: "#D5E8E0", tint: "#F0F6F3" }] },
  medienos: { homeMood: ["Kuria ramią ir jaukią atmosferą.", "Suteikia namams šilumos ir ramybės."], kind: ["elegantiškas medienos kvapas", "ramus, sodrus medienos kvapas"], home: ["šiltas medienos aromatas", "ramus medienos aromatas"], mood: ["Ramus ir pasitikintis savimi – medienos gilumas suteikia jam charakterio.", "Sodrus, bet santūrus, jis kuria tvirtą ir elegantišką įspūdį."], look: [{ liquid: "#C9A27A", tint: "#F3ECE4" }, { liquid: "#BF9C78", tint: "#F2EBE3" }] },
  ambros: { homeMood: ["Kuria šiltą, prabangią atmosferą.", "Namai prisipildo šilumos ir jaukumo."], kind: ["šiltas, gaubiantis ambros kvapas", "sodrus ambros kvapas"], home: ["šiltas, gaubiantis ambros aromatas", "sodrus ambros aromatas"], mood: ["Sodrus ir paslaptingas – gaubiantis ir įsimintinas.", "Šiltas ir gaubiantis, jis ilgai išlieka ir palieka įsimintiną pėdsaką."], look: [{ liquid: "#D9A05B", tint: "#F7EEE2" }, { liquid: "#D49A57", tint: "#F6EDE1" }] },
  gurmaniski: { homeMood: ["Kuria jaukią, šiltą namų atmosferą.", "Namuose kvepia jaukiai, lyg ką tik iškeptais saldumynais."], kind: ["saldus, gurmaniškas kvapas", "jaukus gurmaniškas kvapas"], home: ["jaukus, saldus aromatas", "šiltas gurmaniškas aromatas"], mood: ["Jaukus ir viliojantis – saldus, bet subtilus.", "Saldus, bet ne per saldus, jis kuria jaukumo ir artumo jausmą."], look: [{ liquid: "#C98B5A", tint: "#F6EDE4" }, { liquid: "#C4875A", tint: "#F5ECE3" }] }
};
const AF_GENDER_TXT = { moterims: " moterims", vyrams: " vyrams", unisex: ", tinkantis ir jai, ir jam" };
const AF_CONC_TXT = {
  EDT: "Eau de Toilette – lengvesnės koncentracijos, gaivus kvapas.",
  EDP: "Eau de Parfum koncentracija – kvapas ilgai išlieka ant odos.",
  Parfum: "Parfum koncentracija – sodrus ir itin ilgai išliekantis kvapas.",
  Extrait: "Extrait de Parfum – didžiausia koncentracija, kvapas išlieka visą dieną."
};
const AF_LEVELS = { EDT: [3, 2], EDP: [4, 3], Parfum: [5, 4], Extrait: [5, 4] };

function afTagline(f) {
  const keys = [f.notes.top[0], f.notes.heart[0], f.notes.base[0]].filter(Boolean);
  let line = keys.length ? afCap(afAnd(keys.map((x, i) => (i ? afLc(x) : x)))) : "";
  if (line.length > 60 && keys.length > 2) line = afCap(afAnd(keys.slice(0, 2).map((x, i) => (i ? afLc(x) : x))));
  if (!line && f.type === "elektriniai-difuzoriai") line = f.attrs.light ? "Tylus aromato difuzorius su apšvietimu" : "Tylus ir tolygus aromato difuzorius";
  if (!line && f.family) line = afCap(AF_FAMILY_TXT[f.family].home[0]);
  return line.slice(0, 60);
}
function afNotesSentence(f, seed) {
  const n = f.notes;
  const lc = a => afAnd(a.map(afLc));
  if (!n.top.length && !n.heart.length && !n.base.length) return "";
  const v = afPick([0, 1], seed, "notes");
  const parts =
    v === 0
      ? [n.top.length && `viršutinės natos – ${lc(n.top)}`, n.heart.length && `širdies – ${lc(n.heart)}`, n.base.length && `bazinės – ${lc(n.base)}`]
      : [n.top.length && `pradžioje – ${lc(n.top)}`, n.heart.length && `širdyje – ${lc(n.heart)}`, n.base.length && `${n.top.length || n.heart.length ? "o bazėje" : "bazėje"} – ${lc(n.base)}`];
  return `${afCap(parts.filter(Boolean).join(", "))}.`;
}
function afDescribe(f) {
  const seed = f.scentName || f.name || f.type;
  const ft = AF_FAMILY_TXT[f.family] || null;
  const S = [];
  const a = f.attrs || {};
  if (f.type === "kvepalai") {
    S.push(`${f.name} – ${ft ? afPick(ft.kind, seed, "kind") : "išskirtinis kvapas"}${AF_GENDER_TXT[f.gender] || ""}.`);
    S.push(afNotesSentence(f, seed));
    if (ft) S.push(afPick(ft.mood, seed, "mood"));
    S.push(AF_CONC_TXT[f.conc] || "");
  } else if (f.type === "elektriniai-difuzoriai") {
    S.push(`${f.name} – ${f.name === "Elektrinis difuzorius" ? "aromato prietaisas" : "elektrinis aromato difuzorius"}, kuris tyliai ir tolygiai paskleidžia mėgstamą kvapą po visus namus.`);
    const tech = [a.tank && `vandens talpa – ${a.tank} ml`, a.runtime && `veikimo laikas – iki ${a.runtime} val.`].filter(Boolean);
    if (tech.length) S.push(`${afCap(tech.join(", "))}`.replace(/([^.])$/, "$1."));
    if (a.light) S.push(/spalv/.test(a.light) ? `Turi LED apšvietimą (${a.light.replace(/^LED,?\s*/i, "")}), kuris sukuria jaukią nuotaiką.` : "Turi švelnų LED apšvietimą, kuris sukuria jaukią nuotaiką.");
    S.push("Įlašinkite kelis lašus aromatinio aliejaus į vandenį – ir namai prisipildys kvapo.");
    S.push(afPick(["Tinka miegamajam, svetainei ar biurui.", "Puikiai tinka miegamajam, svetainei ir darbo kambariui."], seed, "rooms"));
  } else {
    const home = ft ? afPick(ft.home, seed, "home") : "malonus aromatas";
    const intro = {
      difuzoriai: `${f.name} – ${home} jūsų namams.`,
      zvakes: `${f.name} – ${home} jaukiai namų atmosferai.`,
      aliejai: `${f.name} – ${home} elektriniams difuzoriams ir drėkintuvams.`
    }[f.type];
    S.push(intro);
    S.push(afNotesSentence(f, seed));
    if (f.type === "difuzoriai") {
      S.push("Lazdelės tolygiai sugeria kvapą ir skleidžia jį be ugnies ir elektros.");
      if (a.sticks) S.push(`Komplekte – ${a.sticks} ${afPlural(a.sticks, "lazdelė", "lazdelės", "lazdelių")}.`);
      if (a.weeks) S.push(`Kvapo užtenka iki ${a.weeks} ${afPlural(a.weeks, "savaitės", "savaičių", "savaičių")}.`);
      S.push(afPick(["Tinka svetainei, miegamajam ar biurui.", "Puikiai tinka svetainei, prieškambariui ar vonios kambariui."], seed, "rooms"));
      S.push("Apvertus lazdeles kas kelias dienas, kvapas sustiprėja.");
    } else if (f.type === "zvakes") {
      const wax = AF_WAX.find(w => w[1] === a.wax);
      if (wax) S.push(`Žvakė pagaminta iš ${wax[2]}${a.wick ? `, su ${a.wick === "Medinė" ? "medine" : "medvilnine"} dagtimi` : ""}.`);
      if (a.burn) S.push(`Degimo trukmė – iki ${a.burn} val.`);
      S.push("Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi.");
    } else if (f.type === "aliejai") {
      S.push("Užtenka kelių lašų į difuzoriaus vandenį – kvapas tolygiai pasklinda po visą patalpą.");
      if (a.weeks) S.push(`Vieno buteliuko užtenka iki ${a.weeks} ${afPlural(a.weeks, "savaitės", "savaičių", "savaičių")}.`);
      S.push("Skirtas tik patalpoms aromatizuoti.");
    }
    if (ft) S.push(afPick(ft.homeMood, seed, "homeMood"));
  }
  let text = S.filter(Boolean).join(" ");
  if (text.length < 350 && f.type === "kvepalai")
    text += ` ${afPick(["Prieš renkantis didesnį buteliuką, verta išbandyti 2 ml mėginuką – taip geriausiai pajusite, kaip kvapas skleidžiasi ant jūsų odos.", "Kvapas ant kiekvieno žmogaus odos skleidžiasi savitai, todėl pradėti verta nuo 2 ml mėginuko."], seed, "sample")}`;
  else if (text.length < 350 && f.type === "zvakes") text += ` ${afPick(["Tinka svetainei, miegamajam ar vonios kambariui.", "Puikiai tinka vonios ritualams ar dovanai."], seed, "rooms")}`;
  else if (text.length < 350 && f.type === "aliejai") text += " Tinka svetainei, miegamajam ar biurui.";
  return text.replace(/\s+/g, " ").trim().slice(0, 1500);
}

// ── Pagrindinė funkcija ──
function afParse(text, opts = {}) {
  const raw = String(text ?? "");
  const scent = opts.scent || null;
  const families = opts.families?.length ? new Set(opts.families) : null;
  const lines = afLines(raw);
  const { out: L, rest } = afLabeled(lines);
  const get = k => (L[k] || []).filter(Boolean);
  const first = k => get(k)[0] || "";
  const lang = raw.trim() ? afLang(raw) : "lt";
  const facts = [];
  const auto = new Set();
  const missing = [];
  const unknown = [];
  const fact = (label, value) => value && facts.push([label, String(value)]);

  // Tipas
  const detected = afDetectType(raw);
  const type = detected || (AF_TYPE_IDS.includes(opts.type) ? opts.type : "kvepalai");
  if (raw.trim()) fact("Kalba", AF_LANG_NAME[lang]);
  fact("Kategorija", detected ? "atpažinta iš aprašymo" : "nepakeista (aprašyme nenurodyta)");
  const scented = AF_SCENTED.has(type);

  // Pavadinimas: „Linia: inna (MY PINK)“ → MY PINK; kitaip – pirmoji eilutė be prekės ženklo ir rinkodaros žodžių
  const title = rest[0] || "";
  const body = lines.filter(l => l !== title).join(" ");
  const line = first("line");
  const brand = first("brand");
  let nm = { name: "", brand: "" };
  if (line) {
    const inner = line.match(/\(([^)]+)\)/)?.[1] || line.replace(/^inna\s*/i, "");
    nm = afName(inner, "", brand);
    if (!nm.name) nm = afName(title, body, brand);
  } else if (title) nm = afName(title, body, brand);
  if (title) fact("Pavadinimas šaltinyje", title.slice(0, 120));
  if (nm.brand) fact("Prekės ženklas (pašalintas)", nm.brand);

  // Natos
  const notes = { top: [], heart: [], base: [] };
  const tr = (list, into) => {
    for (const x of list.flatMap(afSplitNotes)) {
      const r = afNote(x);
      if (!r) continue;
      if (!r.ok) unknown.push(r.lt);
      if (![...notes.top, ...notes.heart, ...notes.base, ...into].includes(r.lt)) into.push(r.lt);
    }
  };
  tr(get("top"), notes.top);
  tr(get("heart"), notes.heart);
  tr(get("base"), notes.base);
  if (!notes.top.length && !notes.heart.length && !notes.base.length && get("notes").length) {
    const all = [];
    tr(get("notes"), all);
    if (all.length <= 2) notes.heart.push(...all);
    else {
      const t = Math.ceil(all.length / 3);
      notes.top.push(...all.slice(0, t));
      notes.heart.push(...all.slice(t, 2 * t));
      notes.base.push(...all.slice(2 * t));
    }
  }
  for (const k of ["top", "heart", "base"]) notes[k] = notes[k].slice(0, 8);
  const srcNotes = [...get("top"), ...get("heart"), ...get("base"), ...get("notes")].join("; ");
  if (srcNotes) fact("Natos šaltinyje", srcNotes.slice(0, 300));
  if (unknown.length) fact("Neatpažintos natos (patikrinkite)", unknown.join(", "));

  // Lytis, šeima, koncentracija
  const genderSrc = [...get("gender"), title].join(" ");
  const gender = afGender(genderSrc) || afGender(body);
  const group = first("group");
  if (group) fact("Kvapų grupė", group);
  let family = afFamily(group, notes);
  if (family && families && !families.has(family)) family = null;
  const concLine = first("conc");
  const pct = afNum((concLine.match(AF_RX.pct) || [])[1]);
  if (pct) fact("Koncentracija", `${pct} %`);
  const cc = afConc(lines, pct);

  // Talpa, svoris, savybės
  const ml = afMl(first("volume")) || afMl(title) || afMl(body);
  const grams = afG(first("weight")) || (type === "zvakes" ? afG(title) || afG(body) : null);
  if (ml) fact("Talpa", `${ml} ml`);
  if (grams) fact("Svoris", `${grams} g`);
  const attrs = {};
  const all = `${title}\n${body}`;
  if (type === "difuzoriai") {
    const st = afNum((first("sticks").match(/\d+/) || [])[0]) || afNum((all.match(AF_RX.count) || [])[1]);
    if (st) attrs.sticks = st;
    const wk = afMax(first("duration").match(AF_RX.weeks) || all.match(AF_RX.weeks)) || (afMax(first("duration").match(AF_RX.months) || all.match(AF_RX.months)) || 0) * 4;
    if (wk) attrs.weeks = wk;
  } else if (type === "zvakes") {
    const near = all.match(/(?:palen|spalan|[śs]wiecen|burn|deg)\w*[^.\n\d]{0,20}(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:h\b|godz|hours?|hrs?|val)/i) || all.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:h\b|godz\w*|hours?|hrs?|val\w*)\.?\s*(?:palen|spalan|[śs]wiecen|burn|deg)/i);
    const b = afMax(first("burn").match(AF_RX.hours)) || afMax(near) || afMax(first("duration").match(AF_RX.hours));
    if (b) attrs.burn = b;
    const wx = AF_WAX.find(([re]) => re.test(first("wax") || all));
    if (wx) attrs.wax = wx[1];
    const wickSrc = first("wick") || (all.match(/(?:knot|wick|dagt)\w*[^.\n]{0,25}/i) || [""])[0];
    const wc = AF_WICK.find(([re]) => re.test(wickSrc));
    if (wc) attrs.wick = wc[1];
  } else if (type === "aliejai") {
    attrs.forDiffuser = true;
    const wk = afMax(first("duration").match(AF_RX.weeks) || all.match(AF_RX.weeks)) || (afMax(first("duration").match(AF_RX.months) || all.match(AF_RX.months)) || 0) * 4;
    if (wk) attrs.weeks = wk;
  } else if (type === "elektriniai-difuzoriai") {
    const tk = afMl(first("tank")) || ml;
    if (tk) attrs.tank = tk;
    const rt = afMax(first("runtime").match(AF_RX.hours) || (all.match(/(?:czas pracy|run(?:ning)? time|working time|veikimo)[^.\n]{0,30}/i) || [""])[0].match(AF_RX.hours));
    if (rt) attrs.runtime = rt;
    const colors = all.match(/(\d+)\s*(?:kolor\w*|colou?rs?|spalv\w*)/i);
    if (colors) attrs.light = `LED, ${colors[1]} ${afPlural(Number(colors[1]), "spalva", "spalvos", "spalvų")}`;
    else if (/\bled\b|pod[śs]wietl|apšviet|light/i.test(all)) attrs.light = "LED";
  }
  for (const [k] of AF_ATTRS[type] || []) if (attrs[k] != null) auto.add(`attr:${k}`);

  // Originalo kvapas – tik aiškiai parašytas
  let inspired = first("inspired");
  if (!inspired) {
    const m = all.match(/(?:inspirowan\w*|odpowiednik\w*|zamiennik\w*|inspired by|alternative to|dupe of|[įi]kv[ėe]pt\w*|analogas)\s*(?:zapachem|zapachu|perfumami|perfum|kvapo|kvapu|by)?\s*[:\-–]?\s*[„"“]?([A-ZÀ-Ž][^.,;\n"“”]{2,60})/u);
    inspired = m?.[1] || "";
  }
  inspired = inspired
    .replace(/[„"“”]/g, "")
    .replace(/\s+[-–—]\s+/g, " – ")
    .trim()
    .slice(0, 120);
  if (inspired) fact("Originalo kvapas", inspired);

  // INCI: po „Skład (INCI)“ / „Ingredients“ iki tuščios eilutės
  const inciAt = raw.search(/(?:sk[łl]ad\s*\(inci\)|\binci\b|ingredients|sud[ėe]tis)\s*:?/i);
  const ingredients = inciAt >= 0
    ? raw
        .slice(inciAt)
        .replace(/^(?:sk[łl]ad\s*\(inci\)|\binci\b|ingredients|sud[ėe]tis)\s*:?\s*/i, "")
        .split(/\n\s*\n|dodatkowe informacje|additional information/i)[0]
        .replace(/\s*[•·]\s*/g, ", ")
        .replace(/\s*\n\s*/g, " ")
        .replace(/,\s*$/, "")
        .trim()
        .slice(0, 1500)
    : "";
  if (ingredients) fact("Sudėtis (INCI)", "rasta");

  // ── Laukai ──
  const f = { type, attrs, ingredients, inspired, notes, sizes: [] };
  const fromScent = !!scent && scented;
  if (fromScent) {
    f.scentName = scent.name;
    f.inspired = scent.inspired || inspired;
    f.gender = scent.gender || "unisex";
    f.family = scent.family || family;
    f.notes = { top: [...(scent.notes?.top || [])], heart: [...(scent.notes?.heart || [])], base: [...(scent.notes?.base || [])] };
    f.longevity = scent.longevity || 3;
    f.sillage = scent.sillage || 3;
    f.look = { ...(scent.look || {}) };
    for (const k of ["inspired", "gender", "family", "notes", "longevity", "sillage", "look"]) auto.add(k);
  } else {
    f.scentName = nm.name;
    f.gender = scented ? gender || "unisex" : "unisex";
    f.family = scented ? family : null;
    const [lon, sil] = type === "kvepalai" ? AF_LEVELS[cc.conc] : [3, 3];
    f.longevity = lon;
    f.sillage = sil;
    f.look = { ...(f.family ? afPick(AF_FAMILY_TXT[f.family].look, f.scentName || raw.slice(0, 40), "look") : {}) };
    if (inspired) auto.add("inspired");
    if (gender && scented) auto.add("gender");
    if (f.family) auto.add("family");
    if (notes.top.length || notes.heart.length || notes.base.length) auto.add("notes");
    if (scented) auto.add("longevity").add("sillage");
    if (f.family) auto.add("look");
  }
  f.name = afProductName(type, type === "elektriniai-difuzoriai" ? nm.name : f.scentName);
  if (f.name) auto.add("name");
  f.id = afSlug(f.name);
  if (type === "kvepalai") {
    f.conc = cc.conc;
    auto.add("conc");
    if (ml && [33, 100].includes(Math.round(ml))) {
      f.sizes = [{ ml: Math.round(ml), price: "" }];
      auto.add("sizes");
    }
  } else if (type === "zvakes" && grams) {
    f.sizes = [{ ml: grams, unit: "g", price: "" }];
    auto.add("sizes");
  } else if (type !== "elektriniai-difuzoriai" && ml) {
    f.sizes = [{ ml, price: "" }];
    auto.add("sizes");
  } else if (type === "elektriniai-difuzoriai") {
    f.sizes = [{ ml: 1, unit: "vnt", price: "" }];
  }
  if (f.ingredients) auto.add("ingredients");
  f.tagline = afTagline(f);
  if (f.tagline) auto.add("tagline");
  f.description = f.name ? afDescribe(f) : "";
  if (f.description) auto.add("description");

  // ── Ko trūksta ──
  const need = (key, label) => missing.push({ key, label });
  if (!f.name) need("name", "Pavadinimas");
  if (scented && !f.notes.top.length && !f.notes.heart.length && !f.notes.base.length) need("notes", "Natos");
  if (scented && !f.family) need("family", "Kvapo pobūdis");
  if (type === "kvepalai" && !fromScent && !gender) need("gender", "Kam skirta (lytis)");
  if (type === "kvepalai" && !cc.how) need("conc", "Koncentracija (patikrinkite)");
  if (!f.sizes.length) need("sizes", type === "kvepalai" ? (ml ? `Talpa (${ml} ml – parduotuvėje tik 33 / 100 ml)` : "Talpa") : type === "zvakes" ? "Svoris" : "Talpa");
  need("price", "Kaina");
  need("stock", "Likutis");
  need("images", "Nuotraukos");
  if (scented && !f.inspired) need("inspired", "Originalo kvapas");
  if (unknown.length) need("notes", `Natos – patikrinkite: ${unknown.slice(0, 4).join(", ")}`);

  return { lang, type, detected: !!detected, fromScent, fields: f, auto: [...auto], facts, missing, unknown };
}
