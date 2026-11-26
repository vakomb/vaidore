// 28 - prekės puslapio turinys pagal kategoriją (v29, parfumada.lt „namų kvapo“ lygis, Vaidore stiliumi):
//   paantraštė po pavadinimu, aprašymas su automatiškai paryškintais pavadinimu, talpa ir natomis („Skaityti daugiau“),
//   blokai po pirkimu: natos (kvepalams - segmentai Viršutinės · Širdies · Bazinės), kvapo charakteris, nuotaikos juosta,
//   „Kaip naudoti“ žingsniai, „Kur …“ piktogramos, mėginuko kortelė, pastaba; pabaigoje - išskleidžiamos dalys.
// Blokas rodomas tik turėdamas duomenų. Tekstai - data/pdp.json (window.VAIDORE_PDP) + administravimo settings.pdp[tipas];
// natų nuotraukos - natų biblioteka (NOTE_IMG), nuotaikos juosta - kvapo (SCENT_INFO) arba produkto laukai (moodOf).

// Savos linijinės piktogramos (24 × 24, brūkšnys - CSS): kūno vietos, kambariai, naudojimo žingsniai
const STORY_ICO = {
  wrist:
    '<path d="M9 12.5V5.6a1.25 1.25 0 0 1 2.5 0v5.4M11.5 10.6V4.3a1.25 1.25 0 0 1 2.5 0v6.3M14 10.8V5.8a1.25 1.25 0 0 1 2.5 0v6"/><path d="M16.5 11.6V8.4a1.25 1.25 0 0 1 2.5 0v6.1c0 3.6-2.6 6.4-6 6.4h-1.3c-1.8 0-3.2-.7-4.4-2l-2.8-3.3a1.3 1.3 0 0 1 1.9-1.8L9 16.4v-3.9"/>',
  neck: '<circle cx="12" cy="6.8" r="3.4"/><path d="M10.3 10v3.3M13.7 10v3.3"/><path d="M4.5 20.5c.4-3.9 2.9-6.6 5.8-7.2M19.5 20.5c-.4-3.9-2.9-6.6-5.8-7.2"/><path d="M16.9 11.4h.01" stroke-width="2.6"/>',
  ear: '<path d="M7.5 9.6a4.6 4.6 0 1 1 9.2 0c0 2.2-1.2 3.2-2.2 4.2-.9.9-1.3 1.7-1.3 2.8a2.6 2.6 0 0 1-4.7 1.5"/><path d="M10.3 9.7a1.9 1.9 0 1 1 3.5 1c-.5.7-1.4 1.1-1.4 2.2"/><path d="M19.6 14.2h.01" stroke-width="2.6"/>',
  clothes: '<path d="M10.2 5.1a1.9 1.9 0 1 1 2.7 1.7c-.6.3-.9.8-.9 1.4v.6"/><path d="M12 8.8 3.9 14.5a1 1 0 0 0 .6 1.8h15a1 1 0 0 0 .6-1.8z"/>',
  sofa: '<path d="M5 11V9a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 9v2"/><path d="M3 12.5a1.5 1.5 0 0 1 3 0v2h12v-2a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5.5 18v1.5M18.5 18v1.5"/>',
  bed: '<path d="M3.5 5.5v14"/><path d="M3.5 12.5h15a2 2 0 0 1 2 2v2h-17"/><path d="M20.5 16.5v3"/><rect x="6" y="9" width="5" height="3.5" rx="1.5"/>',
  bath: '<path d="M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5z"/><path d="M6 12V6.6a2.1 2.1 0 0 1 4-.9"/><path d="M8.8 7.4l2.6-1.5"/><path d="M7.2 19l-.9 1.5M16.8 19l.9 1.5"/>',
  door: '<path d="M6.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 17.5 5v15.5"/><path d="M4 20.5h16"/><path d="M14.6 12.5h.01" stroke-width="2.6"/>',
  laptop: '<path d="M5 15.5V7.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8"/><path d="M2.8 15.5h18.4l-.9 2.2a1.2 1.2 0 0 1-1.1.8H4.8a1.2 1.2 0 0 1-1.1-.8z"/>',
  office: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5"/><path d="M3.5 12.5h17"/><path d="M10.5 12v1.8h3V12"/>',
  cap: '<path d="M7.5 13a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7.5 19z"/><path d="M10.5 11V9h3v2"/><rect x="9.8" y="3.4" width="4.4" height="2.9" rx=".9"/>',
  reeds: '<path d="M7.5 14a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7.5 19z"/><path d="M10.5 12v-1.5h3V12"/><path d="M11 10.5 8 3.5M12 10.5V3M13 10.5l3-7"/>',
  flip: '<path d="M19.5 12A7.5 7.5 0 0 1 6.3 16.9M4.5 12A7.5 7.5 0 0 1 17.7 7.1"/><path d="M17.9 3.6v3.6h-3.6M6.1 20.4v-3.6h3.6"/>',
  water: '<path d="M5.5 4.5h13l-1.3 14.6a1.5 1.5 0 0 1-1.5 1.4H8.3a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M6.4 11c1.2-.7 2.4-.7 3.6 0s2.4.7 3.6 0 2.4-.7 3.6 0"/>',
  drops: '<path d="M10 3.5c2.8 3.3 4.5 5.8 4.5 8a4.5 4.5 0 0 1-9 0c0-2.2 1.7-4.7 4.5-8z"/><path d="M17.5 12c1.4 1.7 2.2 2.9 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1.1.8-2.3 2.2-4z"/>',
  power: '<path d="M12 3.5V11"/><path d="M7.3 6.6a7 7 0 1 0 9.4 0"/>',
  candle:
    '<path d="M7.5 12.5A1.5 1.5 0 0 1 9 11h6a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19z"/><path d="M7.5 14.3h9"/><path d="M12 11V9.4"/><path d="M12 3.3c1.5 1.7 2.3 2.9 2.3 4a2.3 2.3 0 0 1-4.6 0c0-1.1.8-2.3 2.3-4z"/>',
  scissors: '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.4 15.9 17.5 4.5M15.6 15.9 6.5 4.5"/>',
  vial: '<rect x="9" y="3.5" width="6" height="3" rx="1"/><path d="M9.8 6.5v12a2.2 2.2 0 0 0 4.4 0v-12"/><path d="M9.8 13h4.4"/>'
};
// Piktogramų pasirinkimas administravime (v29c): raktas → pavadinimas
const STORY_ICO_NAMES = {
  wrist: "Riešai",
  neck: "Kaklas",
  ear: "Už ausų",
  clothes: "Drabužiai",
  sofa: "Svetainė",
  bed: "Miegamasis",
  bath: "Vonia",
  door: "Prieškambaris",
  laptop: "Darbo kambarys",
  office: "Biuras",
  cap: "Atidaryti",
  reeds: "Lazdelės",
  flip: "Apversti",
  water: "Vanduo",
  drops: "Lašai",
  power: "Įjungti",
  candle: "Žvakė",
  scissors: "Žirklės",
  clock: "Laikas",
  vial: "Mėginukas",
  info: "Informacija"
};
const storyIco = k => `<svg class="sIco" viewBox="0 0 24 24" aria-hidden="true">${STORY_ICO[k] || GLYPH[k] || GLYPH.info}</svg>`;

// ── Tekstai pagal tipą: numatytieji (data/pdp.json) + administravimo pakeitimai (settings.pdp[tipas]) ──
// v33: kita kalba - numatytieji tekstai iš src/i18n/pdp.<kalba>.json, administravimo pakeitimai - settings.i18n.<kalba>.pdp
// (lietuviški administravimo tekstai kitoje kalboje nenaudojami - lieka tik įjungimo / piktogramų nustatymai)
const pdpMerge = (a, b) => {
  if (!b || typeof b !== "object" || Array.isArray(b)) return b === undefined ? a : b;
  const out = { ...(a && typeof a === "object" && !Array.isArray(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) out[k] = Array.isArray(v) ? v : pdpMerge(out[k], v);
  return out;
};
const PDP_DEF = LANG === "lt" ? window.VAIDORE_PDP || {} : pdpMerge(window.VAIDORE_PDP || {}, window.VAIDORE_PDP_I18N?.[LANG] || {});
const pdpFlags = o =>
  Object.fromEntries(Object.entries(o || {}).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? [[k, Object.fromEntries(Object.entries(v).filter(([kk]) => kk === "on"))]] : [])));
function pdpOf(type) {
  const d = PDP_DEF[type] || {};
  const o = LANG === "lt" ? SET.pdp?.[type] || {} : pdpMerge(pdpFlags(SET.pdp?.[type]), SET.i18n?.[LANG]?.pdp?.[type] || {});
  const out = { ...d, ...o };
  for (const k of Object.keys(d)) if (d[k] && typeof d[k] === "object" && !Array.isArray(d[k])) out[k] = { ...d[k], ...(o[k] && typeof o[k] === "object" ? o[k] : {}) };
  return out;
}
const blockOn = b => !!b && b.on !== false;
// Paantraštė po pavadinimu: produkto (administravime) → tipo tekstas → kvepalams „Eau de Parfum · Unisex“
function subtitleOf(p) {
  if (p.subtitle) return p.subtitle;
  const d = pdpOf(typeOf(p)).sub;
  if (d) return d;
  return isPerfume(p) ? [CONC_NAME[p.conc] || p.conc, GENDER_NAME[p.gender]].filter(Boolean).join(" · ") : TYPE.get(typeOf(p)).one;
}
// Nuotaikos juosta: produkto laukai, tušti - iš bendro kvapo (scents)
function moodOf(p) {
  const s = (p.scent && SCENT_INFO.get(p.scent)) || {};
  return { image: p.moodImage || s.moodImage || "", title: p.moodTitle || s.moodTitle || "", line: p.moodLine || s.moodLine || "" };
}

// ── Aprašymas: pastraipos ir paryškinimai ──
// Ilgą vientisą tekstą skaido į 2-3 pastraipas sakinių riba
function descParas(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const paras = raw
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
  if (paras.length > 1 || raw.length <= 300) return paras;
  const sent = raw.match(/[^.!?]+[.!?]+["”“]?(\s+|$)|[^.!?]+$/g) || [raw];
  const parts = Math.min(3, Math.ceil(raw.length / 260));
  const target = raw.length / parts;
  const out = [];
  let cur = "";
  for (const s of sent) {
    if (cur && cur.length + s.length / 2 > target && out.length < parts - 1) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
// Lietuviškų galūnių šalinimas: „Vanilė“ randa „vanilę“, „Tonkos pupelės“ - „tonkos pupeles“
const LT_END = /(iams|iems|ams|ems|oms|ėms|ims|ius|iai|ies|ių|ais|is|ys|us|as|ai|ės|os|ą|ę|į|ų|ū|a|ė|e|i|o|u|y)$/;
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function termRe(phrase) {
  const words = String(phrase || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;
  const body = words
    .map(w => {
      const stem = w.length >= 4 ? w.replace(LT_END, "") : w;
      return `${reEsc(stem.length >= 3 ? stem : w)}\\p{L}{0,4}`;
    })
    .join("\\s+");
  try {
    return new RegExp(`(^|[^\\p{L}])(${body})(?![\\p{L}])`, "iu");
  } catch {
    return null;
  }
}
const VOLUME_RE = /(^|[^\p{L}\d])(\d+(?:[.,]\d+)?\s?(?:ml|g))(?![\p{L}\d])/iu;
// Tekstas su paryškintais terminais (kiekvienas - tik pirmą kartą): segmentai [{ t, b }] → HTML
function boldify(segs, regs) {
  for (const re of regs) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.b) continue;
      const m = re.exec(s.t);
      if (!m) continue;
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      segs.splice(i, 1, { t: s.t.slice(0, start), b: false }, { t: s.t.slice(start, end), b: true }, { t: s.t.slice(end), b: false });
      break;
    }
  }
  return segs;
}
function descHTML(p) {
  const notes = [...new Set([...p.notes.top, ...p.notes.heart, ...p.notes.base].filter(Boolean).map(noteName))].sort((a, b) => b.length - a.length);
  const regs = [...notes.map(termRe), VOLUME_RE].filter(Boolean);
  // Pirma pastraipa: „PAVADINIMAS - šūkis.“ (be šūkio - pavadinimas prieš pirmą aprašymo pastraipą). Jei aprašymas pats
  // prasideda pavadinimu („Difuzorius CREEDORE - lengvas…“) - jis neištęsiamas: pavadinimas paryškinamas aprašyme, be šūkio
  const body = descParas(p.desc);
  const tag = String(p.tagline || "").replace(/[.\s]+$/, "");
  const own = body[0] && fold(body[0]).startsWith(fold(p.name));
  const head = own ? body[0].slice(0, p.name.length) : p.name;
  const paras = own ? [body[0].slice(p.name.length), ...body.slice(1)] : tag ? [` - ${tag}.`, ...body] : [` - ${body[0] || ""}`, ...body.slice(1)];
  // Visas tekstas - viena segmentų eilė (pastraipos atskirtos \n), kad terminas būtų paryškintas tik pirmą kartą
  const segs = boldify([{ t: head, b: true }, { t: paras.join("\n"), b: false }], regs);
  const html = segs
    .map(s => (s.b ? `<b>${esc(nb(s.t))}</b>` : esc(nb(s.t))))
    .join("")
    .split("\n");
  const len = paras.join(" ").length;
  const long = paras.length > 3 || len > 560;
  return `<div class="pdText${long ? " clamp" : ""}" data-pd-text><div class="pdTextIn">${html.map((h, i) => `<p class="${i ? "pdDesc" : "pdTag"}">${h}</p>`).join("")}</div>${
    long ? `<button class="pdMore" type="button" data-pd-more aria-expanded="false">${t("story.more")}${glyph("chev-down")}</button>` : ""
  }</div>`;
}

// ── Blokai ──
const blockHTML = (cls, title, body, { lead = "", rv = true, id = "" } = {}) =>
  `<section class="pdBlock ${cls}"${id ? ` id="${id}"` : ""}${rv ? " data-rv" : ""}><div class="pbHead"><h2 class="pbT">${esc(title)}</h2>${lead ? `<p class="pbLead">${esc(nb(lead))}</p>` : ""}</div><div class="pbBody">${body}</div></section>`;
// Natos nuotrauka iš natų bibliotekos: tikslus vardas, kitaip - pagrindinis žodis („Madagaskaro vanilė“ → „Vanilė“,
// „Jazminas sambac“ → „Jazminas“), kad vieną kartą įkelta nuotrauka tiktų visiems tos natos variantams
function noteMedia(name) {
  const key = noteKey(name);
  if (NOTE_IMG.has(key)) return NOTE_IMG.get(key);
  const w = key.split(" ").filter(x => x.length > 2);
  for (const k of [w[w.length - 1], w[0], ...w.slice(1, -1)]) if (k && NOTE_IMG.has(k)) return NOTE_IMG.get(k);
  return null;
}
const noteImg = name => noteMedia(name)?.image || "";
// Nata: nuotrauka iš natų bibliotekos arba monograma (pirmoji raidė)
const noteTileHTML = n => {
  const img = noteImg(n);
  return `<li class="nt"><span class="ntArt${img ? " hasImg" : ""}">${
    img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" />` : `<i aria-hidden="true">${esc(noteName(n).trim().charAt(0).toUpperCase())}</i>`
  }</span><b>${esc(noteName(n))}</b></li>`;
};
const noteGridHTML = list => `<ul class="ntGrid" data-n="${Math.min(list.length, 6)}">${list.map(noteTileHTML).join("")}</ul>`;
// Pagrindinės natos (ne kvepalams): po vieną iš viršutinių, širdies ir bazinių; pirmiausia - natos su skirtingomis tikromis
// nuotraukomis (natų biblioteka), tada - kitos eilės tvarka
function mainNotes(p, n = 3) {
  const tiers = [p.notes.top, p.notes.heart, p.notes.base].map(tx => (tx || []).filter(Boolean));
  const order = [];
  for (let i = 0; tiers.some(tx => tx[i]); i++) for (const tx of tiers) if (tx[i] && !order.includes(tx[i])) order.push(tx[i]);
  const seen = new Set();
  const withImg = order.filter(x => {
    const img = noteImg(x);
    if (!img || seen.has(img)) return false;
    seen.add(img);
    return true;
  });
  return [...withImg, ...order.filter(x => !withImg.includes(x))].slice(0, n);
}
const TIERS = [
      ["top", t("story.top"), t("story.topSub")],
    ["heart", t("story.heart"), t("story.heartSub")],
    ["base", t("story.base"), t("story.baseSub")]
];
function notesBlockHTML(p, cfg) {
  if (!blockOn(cfg.notes) || !TYPE.get(typeOf(p)).scented) return "";
  // v30c: visoms kvapnioms prekėms - visos natos (viršutinės, širdies, bazinės)
  const tiers = TIERS.filter(([k]) => p.notes[k]?.length);
  if (!tiers.length) return "";
  if (tiers.length === 1) return blockHTML("pbNotes", cfg.notes.title || t("pd.scentNotes"), noteGridHTML(p.notes[tiers[0][0]]));
  const uid = `nt-${p.id}`;
  const seg = `<div class="ntSeg" role="tablist" aria-label="${t("story.tiers")}" style="--n:${tiers.length};--i:0">${tiers
    .map(
      ([k, name], i) =>
        `<button class="ntSegBtn" type="button" role="tab" id="${uid}-${k}-t" aria-controls="${uid}-${k}" aria-selected="${!i}" tabindex="${i ? -1 : 0}" data-seg="${i}">${esc(name)}</button>`
    )
    .join("")}</div>`;
  const panels = `<div class="ntPanels">${tiers
    .map(
      ([k, , cap], i) =>
        `<div class="ntPanel${i ? "" : " on"}" role="tabpanel" id="${uid}-${k}" aria-labelledby="${uid}-${k}-t"${i ? ' aria-hidden="true"' : ""}><p class="ntCap">${esc(cap)}</p>${noteGridHTML(p.notes[k])}</div>`
    )
    .join("")}</div>`;
  return blockHTML("pbNotes pbPyramid", cfg.notes.title || t("pd.scentNotes"), seg + panels);
}
// Kvapo charakteris (kvepalams): ilgaamžiškumas ir sklaida 1-5 - tik jei nustatyti (numatytos „3“ nerodomos)
function traitsBlockHTML(p, cfg) {
  if (!isPerfume(p) || !blockOn(cfg.traits)) return "";
  const l = Number(p.longevity) || 0;
  const s = Number(p.sillage) || 0;
  if (!(l >= 1 && l <= 5 && s >= 1 && s <= 5) || (l === 3 && s === 3)) return "";
  const row = (label, v, val) =>
    `<div class="tr"><dt>${esc(label)}</dt><dd><span class="trBar" aria-hidden="true">${[0, 1, 2, 3, 4].map(k => `<i${k < v ? ` class="on" style="--k:${k}"` : ""}></i>`).join("")}</span><span class="trVal">${esc(nb(val))}</span></dd></div>`;
  return blockHTML("pbTraits", cfg.traits.title || t("story.traits"), `<dl class="traits">${row(t("story.longevity"), l, LASTS[l])}${row(t("story.sillage"), s, LEVEL[s])}</dl>`);
}
// Kvapo linija (be įkeltos nuotaikos nuotraukos): tikros to paties kvapo produktų nuotraukos vienoje eilėje - kvepalai, aliejus,
// žvakė, difuzorius (kaip parduotuvės nuotraukose: produktas su ingredientais baltame fone). Tik tikros nuotraukos, nieko savo.
const FORM_SHORT = { kvepalai: t("form.kvepalai"), difuzoriai: t("form.difuzoriai"), zvakes: t("form.zvakes"), aliejai: t("form.aliejai") };
function scentLine(p) {
  const kin = p.scent ? PRODUCTS.filter(x => x.scent === p.scent && x.id !== p.id && TYPE.get(typeOf(x)).scented && x.images?.[0]) : [];
  if (!kin.length || !p.images?.[0]) return null;
  const forms = [p, ...kin.sort((a, b) => TYPES.findIndex(tx => tx.id === typeOf(a)) - TYPES.findIndex(tx => tx.id === typeOf(b)))].slice(0, 4);
  const pic = x => `<img src="${esc(x.images[0])}" alt="${esc(L(x, "name"))}" loading="lazy" decoding="async" />`;
  const perfume = forms.find(isPerfume);
  return {
    html: `<span class="mlStrip" data-n="${forms.length}">${forms
      .map(x => (x.id === p.id ? `<span class="mlItem" aria-current="page">${pic(x)}</span>` : `<a class="mlItem" href="${productUrl(x)}" data-nav>${pic(x)}</a>`))
      .join("")}</span>`,
    title: L(perfume || p, "name"),
    line: forms.map(x => FORM_SHORT[typeOf(x)]).join(" · ")
  };
}
function moodBlockHTML(p, cfg) {
  if (!blockOn(cfg.mood)) return "";
  const m = moodOf(p);
  const line2 = m.image ? null : scentLine(p);
  if (!m.image && !line2) return "";
  const title = m.title || line2?.title || "";
  const line = m.line || line2?.line || "";
  return `<figure class="pdMood${line2 ? " isLine" : ""}" data-rv>${
    line2 ? line2.html : `<span class="moodPh"><img src="${esc(m.image)}" alt="" loading="lazy" decoding="async" /></span>`
  }${title || line ? `<figcaption>${title ? `<b>${esc(title)}</b>` : ""}${line ? `<span>${esc(line)}</span>` : ""}</figcaption>` : ""}</figure>`;
}
function stepsBlockHTML(cfg) {
  const b = cfg.steps;
  const items = (b?.items || []).filter(x => x?.title || x?.text);
  if (!blockOn(b) || !items.length) return "";
  return blockHTML(
    "pbSteps",
    b.title || t("story.how"),
    `<ol class="useSteps" data-n="${items.length}">${items
      .map((x, i) => `<li class="useStep"><span class="useIco">${storyIco(x.ico)}</span><b class="useT"><i>${i + 1}</i>${esc(x.title || "")}</b>${x.text ? `<p>${esc(nb(x.text))}</p>` : ""}</li>`)
      .join("")}</ol>`
  );
}
function whereBlockHTML(cfg) {
  const b = cfg.where;
  const items = (b?.items || []).filter(x => x?.label);
  if (!blockOn(b) || !items.length) return "";
  return blockHTML(
    "pbWhere",
    b.title || t("story.where"),
    `<ul class="icoGrid" data-n="${items.length}">${items.map(x => `<li><span class="icoC">${storyIco(x.ico)}</span><span class="icoL">${esc(x.label)}</span></li>`).join("")}</ul>`,
    { lead: b.text || "" }
  );
}
// Mėginuko kortelė (kvepalams su 2 ml mėginuku): „Rinktis mėginuką“ - pasirenka 2 ml ir grąžina prie pirkimo
function sampleBlockHTML(p, cfg) {
  if (!isPerfume(p) || !blockOn(cfg.sample) || !hasSample(p) || !inStock(p)) return "";
  return `<section class="pdBlock pdTry" data-rv><div class="tryCard"><span class="tryIco">${storyIco("vial")}</span><div class="tryTxt"><b>${nb(t("story.try"))}</b><p>${esc(
    nb(creditText())
  )}</p></div><button class="btn ghost tryBtn" type="button" data-try-sample>${t("story.tryCta", { price: eur(p.sample) })}</button></div></section>`;
}
function noticeHTML(cfg) {
  const b = cfg.note;
  if (!blockOn(b) || !b.text) return "";
  return `<aside class="pdNotice" data-rv>${glyph("info")}<p>${b.title ? `<b>${esc(b.title)}.</b> ` : ""}${esc(nb(b.text))}</p></aside>`;
}
// Visi turinio blokai + išskleidžiamos dalys (pabaigoje). details - jau paruoštos dalys (10-product.js)
function storyHTML(p, details = "") {
  const cfg = pdpOf(typeOf(p));
  const blocks = [notesBlockHTML(p, cfg), traitsBlockHTML(p, cfg), moodBlockHTML(p, cfg), stepsBlockHTML(cfg), whereBlockHTML(cfg), sampleBlockHTML(p, cfg), noticeHTML(cfg)].filter(Boolean);
  return `<div class="pdStory">${blocks.join("")}${details ? `<div class="accs pdAccs">${details}</div>` : ""}</div>`;
}

// ── Elgsena: segmentai, „Skaityti daugiau“, mėginukas, įsiliejimas slenkant ──
let storyObs = null;
function bindStory(root) {
  storyObs?.disconnect();
  const els = $$("[data-rv]", root);
  if (reduceMotion() || !("IntersectionObserver" in window)) return;
  els.forEach(el => el.classList.add("rv"));
  storyObs = new IntersectionObserver(
    ents =>
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        storyObs.unobserve(en.target);
      }),
    { rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach(el => storyObs.observe(el));
}
function selectSeg(seg, i, focus = false) {
  const tabs = $$("[role=tab]", seg);
  i = (i + tabs.length) % tabs.length;
  seg.style.setProperty("--i", i);
  tabs.forEach((tx, k) => {
    tx.setAttribute("aria-selected", String(k === i));
    tx.tabIndex = k === i ? 0 : -1;
    const panel = document.getElementById(tx.getAttribute("aria-controls"));
    panel?.classList.toggle("on", k === i);
    if (k === i) panel?.removeAttribute("aria-hidden");
    else panel?.setAttribute("aria-hidden", "true");
  });
  if (focus) tabs[i].focus();
}
document.addEventListener("click", e => {
  const tx = e.target instanceof Element ? e.target : null;
  if (!tx?.closest("#productRoot")) return;
  const tab = tx.closest(".ntSeg [role=tab]");
  if (tab) return selectSeg(tab.closest(".ntSeg"), Number(tab.dataset.seg));
  const more = tx.closest("[data-pd-more]");
  if (more) {
    const box = more.closest("[data-pd-text]");
    const inner = $(".pdTextIn", box);
    const from = inner.getBoundingClientRect().height;
    box.classList.remove("clamp");
    more.remove();
    if (reduceMotion()) return;
    const to = inner.scrollHeight;
    inner.style.overflow = "hidden";
    inner.style.maxHeight = `${from}px`;
    inner.getBoundingClientRect();
    inner.style.transition = "max-height .5s var(--spring)";
    inner.style.maxHeight = `${to}px`;
    inner.addEventListener("transitionend", () => inner.removeAttribute("style"), { once: true });
    return;
  }
  if (tx.closest("[data-try-sample]")) {
    const root = $("#productRoot");
    $(`.sizeOpt[data-ml="${SAMPLE_ML}"]`, root)?.click();
    $(".pdBuy", root)?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" });
  }
});
document.addEventListener("keydown", e => {
  const tab = e.target instanceof Element && e.target.closest(".ntSeg [role=tab]");
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const seg = tab.closest(".ntSeg");
  const n = $$("[role=tab]", seg).length;
  const cur = Number(tab.dataset.seg);
  selectSeg(seg, e.key === "Home" ? 0 : e.key === "End" ? n - 1 : cur + (e.key === "ArrowRight" ? 1 : -1), true);
});
