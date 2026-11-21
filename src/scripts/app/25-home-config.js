// 25 - Pradžios puslapio turinys iš nustatymų (keičiamas administravimo skydelyje „Pradžia“, admin/pradzia):
//   settings.slides  - skaidrės (eilė = rodymo tvarka): { id, on, preset, image, imageM, focus, focusM, scene, product,
//                      eyebrow, title, text, cta, href, dark }. Nėra lauko - rodomos numatytosios trys (DEFAULT_SLIDES).
//                      Tušti tekstai imami iš šablono (preset): kainos ir pavadinimai visada tikri. Tekstas iš kelių
//                      eilučių - teiginiai su auksinėmis linijomis (kaip parfumada.lt), preset "claims".
//                      preset "photo" - „Tik nuotrauka“: tik image (kompiuteriui) ir / ar imageM (telefonui), nebūtina
//                      nuoroda href ir aprašymas title (tik skaitytuvams) - svetainė ant nuotraukos nieko neuždeda.
//   settings.tiles   - plytelės po skaidrėmis: { key, on, title, image, focus, dark }; key - kvepalai / difuzoriai /
//                      aliejai (prekių tipai) / moterims / vyrams / unisex / meginukai / rinkinys / naujienos /
//                      kat-<kategorijos id>. Nėra lauko - trys tipai. Plytelė be prekių nerodoma.
//   settings.slideSeconds - kas kiek sekundžių keičiasi skaidrės (0 - nesikeičia pačios).
//   settings.rails   - skyriai su produktais (karuselės, v15): { id, on, title, line, mode, rule, ids, limit, href }.
//                      mode "auto" - pagal taisyklę rule { type, gender, family, category, scent, sale,
//                      sort } (v19: seni time / season / occasion ignoruojami); "manual" - ids (pasirinkti produktai, ta tvarka). href: "" - automatiškai,
//                      "none" - be nuorodos, kitaip - adresas. Nėra lauko - DEFAULT_RAILS. Skyrius be produktų nerodomas.
// Fonas: įkelta nuotrauka (kompiuteriui ir, nebūtinai, telefonui; „focus“ - kuri vieta lieka matoma) arba Vaidore
// scena (24-stage.js) su pasirinkto kvapo buteliukais. dark - tamsi nuotrauka, tekstas ant jos baltas.
// Peržiūra: administravimo skydelis įkelia parduotuvę į <iframe> (?vdPreview=1) ir siunčia juodraštį postMessage.

const byRankAll = () => [...PRODUCTS].sort((a, b) => a.rank - b.rank);
const DEFAULT_SLIDES = [
  { id: "kolekcija", on: true, preset: "collection" },
  { id: "meginukai", on: true, preset: "samples" },
  { id: "dovana", on: true, preset: "gift" },
  { id: "teiginiai", on: true, preset: "claims" }
];
const DEFAULT_TILES = ["kvepalai", "difuzoriai", "zvakes", "aliejai", "elektriniai-difuzoriai"].map(key => ({ key, on: true }));
// Numatytieji skyriai - tokie pat kaip iki v15 (naujienos, moterims, vyrams, unisex, nuolaidos)
const DEFAULT_RAILS = [
  { id: "naujienos", on: true, title: "Kvapnios naujienos", line: "", mode: "auto", rule: { type: "kvepalai", sort: "new" }, limit: 8 },
  { id: "moterims", on: true, title: "Populiariausi moterims", line: "Kvapai, kuriuos dažniausiai renkasi moterys", mode: "auto", rule: { type: "kvepalai", gender: "moterims", sort: "rank" }, limit: 12 },
  { id: "vyrams", on: true, title: "Populiariausi vyrams", line: "Kvapai, kuriuos dažniausiai renkasi vyrai", mode: "auto", rule: { type: "kvepalai", gender: "vyrams", sort: "rank" }, limit: 12 },
  { id: "unisex", on: true, title: "Unisex kvapai", line: "Tinka visiems - be taisyklių", mode: "auto", rule: { type: "kvepalai", gender: "unisex", sort: "rank" }, limit: 12 },
  { id: "nuolaidos", on: true, title: "Didžiausios nuolaidos", line: "Kvapai, kuriems dabar taikoma nuolaida", mode: "auto", rule: { sale: true, sort: "sale" }, limit: 12 }
];
const RAIL_SORTS = [
  ["rank", "Populiariausi"],
  ["new", "Naujausi"],
  ["price-asc", "Pigiausi"],
  ["price-desc", "Brangiausi"],
  ["sale", "Didžiausia nuolaida"]
];
const homeRails = () => (Array.isArray(SET.rails) ? SET.rails : DEFAULT_RAILS);
// Skyriaus produktai: pasirinkti ranka (ta tvarka, tik matomi) arba pagal taisyklę. Kiek rodyti - 1-RAIL_MAX
// (numatyta 12); railMatches - visi taisyklę atitinkantys (be ribos, administravimo santraukai).
const RAIL_MAX = 48;
function railLimit(r) {
  return Math.max(1, Math.min(RAIL_MAX, Math.round(Number(r.limit) || 12)));
}
function railProducts(r) {
  return r.mode === "manual" ? railMatches(r) : railMatches(r).slice(0, railLimit(r));
}
function railMatches(r) {
  if (r.mode === "manual") return (r.ids || []).map(id => BY_ID.get(id)).filter(p => p && p.visible !== false);
  const q = r.rule || {};
  const list = PRODUCTS.filter(
    p =>
      (!q.type || typeOf(p) === q.type) &&
      forGender(p, q.gender) &&
      (!q.family || p.family === q.family) &&
      (!q.category || (p.categories || []).includes(q.category)) &&
      (!q.scent || p.scent === q.scent) &&
      (!q.sale || (onSale(p) && inStock(p)))
  );
  const by = {
    rank: (a, b) => a.rank - b.rank,
    new: (a, b) => String(b.added).localeCompare(String(a.added)) || a.rank - b.rank,
    "price-asc": (a, b) => minPrice(a) - minPrice(b),
    "price-desc": (a, b) => minPrice(b) - minPrice(a),
    sale: (a, b) => salePct(b) - salePct(a) || a.rank - b.rank
  };
  return list.sort(by[q.sort] || by.rank);
}
// Paantraštė, kai administratorius jos neįrašė (v22) - pagal taisyklę; pakeičiama Vitrina → Skyriai → „Paantraštė“
const RAIL_LINES = {
  zvakes: "Jaukiems namams",
  difuzoriai: "Kvapūs namai be ugnies",
  aliejai: "Mėgstamas kvapas jūsų difuzoriui",
  "elektriniai-difuzoriai": "Tyliai ir tolygiai po visus namus",
  moterims: "Kvapai, kuriuos renkasi moterys",
  vyrams: "Kvapai, kuriuos renkasi vyrai",
  unisex: "Tinka ir jai, ir jam",
  kvepalai: "Įkvėpti garsiausių kvapų"
};
function railLine(r) {
  const q = r.rule || {};
  if (r.mode === "manual") return "Mūsų atrinkti kvapai";
  if (q.sale) return "Kvapai, kuriems dabar taikoma nuolaida";
  if (q.sort === "new") return "Naujausi kvapai";
  if (q.category) return CATEGORY.get(q.category)?.description?.split(/[.!?]/)[0] || "Kolekcija";
  return RAIL_LINES[q.type && q.type !== "kvepalai" ? q.type : q.gender || q.type || "kvepalai"] || "";
}
// „Peržiūrėti“ nuoroda: nustatyta ranka arba sudaroma iš taisyklės (tie patys filtrai kaip katalogo puslapyje)
function railHref(r) {
  if (r.href === "none") return "";
  if (r.href) return r.href;
  if (r.mode === "manual") return "";
  const q = r.rule || {};
  if (q.sale) return "nuolaidos";
  if (q.category) return `kategorija/${q.category}`;
  const base = q.gender && (!q.type || q.type === "kvepalai") ? q.gender : q.type || "kvepalai";
  const ps = new URLSearchParams();
  if (q.family) ps.set("seima", q.family);
  if (q.sort && q.sort !== "rank" && q.sort !== "sale") ps.set("rikiuoti", q.sort);
  const qs = ps.toString();
  return base + (qs ? `?${qs}` : "");
}

// Skaidrių šablonai - numatytieji tekstai ir scena (galioja, kol administratorius neįrašė savo)
const SLIDE_PRESETS = {
  // Tik nuotrauka: be kvapo ir be svetainės teksto (tekstas, jei reikia, - pačioje nuotraukoje); nuoroda - nebūtina
  photo: {
    name: "Tik nuotrauka",
    make() {
      return { scene: "collection", eyebrow: "", title: SET.shop || "Vaidore", text: "", cta: "", href: "" };
    }
  },
  collection: {
    name: "Kolekcija (kvapas)",
    make(p) {
      const h = SET.hero || {};
      return { scene: "collection", eyebrow: h.eyebrow || "Kolekcija", title: p.name, text: p.tagline, cta: `Atrasti ${p.name}`, href: productUrl(p) };
    }
  },
  // Teiginiai su auksinėmis linijomis (kaip antroji parfumada.lt skaidrė): kiekviena teksto eilutė - atskiras teiginys.
  // Numatytieji - tik tikri parduotuvės nustatymai (mėginukai, išsiuntimas, nemokamas pristatymas, grąžinimas)
  claims: {
    name: "Teiginiai su linijomis",
    make() {
      return {
        scene: "collection",
        eyebrow: "",
        title: SET.shop || "Vaidore",
        text: [
          `Kiekvienas kvapas - ir 2 ml mėginuku`,
          `Išsiunčiame per ${nb(SET.dispatch || "1-2 d. d.")}`,
          `Nemokamas pristatymas nuo ${eurShort(SET.freeShippingFrom)}`,
          `Grąžinimas per ${SET.returnDays || 14} d.`
        ].join("\n"),
        cta: "Visi kvepalai",
        href: "kvepalai"
      };
    }
  },
  samples: {
    name: "Mėginukai",
    make() {
      return {
        scene: "samples",
        eyebrow: "Mėginukai 2 ml",
        title: "Pirma išbandykite",
        text: SET.sampleCredit ? `Mėginukas nuo ${eur(sampleFrom())} - kainą grąžinsime perkant buteliuką.` : `Kiekvienas kvapas - ir 2 ml mėginuku nuo ${eur(sampleFrom())}.`,
        cta: "Rinktis mėginukus",
        href: "meginukai"
      };
    }
  },
  gift: {
    name: "Dovana / rinkinys",
    make() {
      return DISC
        ? { scene: "gift", eyebrow: "Dovanai", title: DISC.name, text: `Bet kurie ${DISC.count} kvapai po 2 ml už ${eurShort(DISC.price)} - raskite savo kvapą.`, cta: "Susidaryti rinkinį", href: "rinkinys" }
        : { scene: "gift", eyebrow: "Dovanai", title: "Kvapas dovanų", text: "Raskite kvapą, kuris tiks būtent jam ar jai.", cta: "Rinktis dovaną", href: "kvepalai" };
    }
  },
  custom: {
    name: "Sava skaidrė",
    make(p) {
      return { scene: "collection", eyebrow: "", title: p.name, text: "", cta: "Peržiūrėti", href: "kvepalai" };
    }
  }
};
// Skaidrės kvapas: nurodytas → nustatymų „hero“ kvapas → populiariausias
function slideProduct(s) {
  return BY_ID.get(s.product) || BY_ID.get(SET.hero?.product) || byRankAll()[0];
}
function slideDefaults(s) {
  const p = slideProduct(s);
  return (SLIDE_PRESETS[s.preset] || SLIDE_PRESETS.custom).make(p);
}
function resolveSlide(s) {
  if (s.preset === "photo") {
    const image = s.image || s.imageM;
    if (!image) return null;
    return {
      id: s.id,
      title: s.title || SET.shop || "Vaidore",
      href: s.href || "",
      image,
      imageM: s.imageM && s.image ? s.imageM : "",
      focus: s.focus || "50% 50%",
      focusM: s.focusM || s.focus || "50% 50%",
      dark: false,
      textless: true,
      list: []
    };
  }
  const p = slideProduct(s);
  if (!p) return null;
  const d = slideDefaults(s);
  const rest = byRankAll().filter(x => x !== p);
  const list = s.preset === "collection" || s.product ? [p, ...rest] : s.preset === "gift" ? rest.slice(2) : rest;
  return {
    id: s.id,
    eyebrow: s.eyebrow || d.eyebrow,
    title: s.title || d.title,
    text: s.text || d.text,
    cta: s.cta || d.cta,
    href: s.href || d.href,
    stage: s.scene || d.scene,
    list,
    image: s.image || "",
    imageM: s.imageM || "",
    focus: s.focus || "50% 50%",
    focusM: s.focusM || s.focus || "50% 50%",
    dark: !!s.dark
  };
}
function homeSlides() {
  const raw = Array.isArray(SET.slides) ? SET.slides : DEFAULT_SLIDES;
  return raw.filter(s => s && s.on !== false).map(resolveSlide).filter(Boolean);
}

// Plytelių šablonai: pavadinimas, adresas, scena, kvapai
function tilePreset(key) {
  const byRank = byRankAll();
  const of = g => byRank.filter(p => isPerfume(p) && forGender(p, g));
  // Prekių tipas - be įkeltos plytelės nuotraukos rodoma pirmos to tipo prekės nuotrauka
  if (TYPE.has(key)) {
    const list = byRank.filter(p => typeOf(p) === key);
    return { name: TYPE.get(key).name, href: key, stage: { kvepalai: "unisex", difuzoriai: "fresh", zvakes: "set", aliejai: "vials", "elektriniai-difuzoriai": "fresh" }[key], list, image: list.find(p => p.images?.[0])?.images[0] || "" };
  }
  if (key === "moterims" || key === "vyrams" || key === "unisex") {
    const st = { moterims: "women", vyrams: "men", unisex: "unisex" }[key];
    return { name: GENDER_NAME[key], href: key, stage: st, list: of(key) };
  }
  if (key === "meginukai") return { name: "Mėginukai", href: "meginukai", stage: "vials", list: byRank.slice(3) };
  if (key === "rinkinys") return DISC ? { name: "Rinkiniai", href: "rinkinys", stage: "set", list: byRank.slice(6) } : null;
  if (key === "naujienos") {
    const fresh = [...PRODUCTS].sort((a, b) => String(b.added).localeCompare(String(a.added)));
    return { name: "Naujienos", href: "kvepalai?rikiuoti=new", stage: "fresh", list: fresh };
  }
  if (key.startsWith("kat-")) {
    const c = CATEGORY.get(key.slice(4));
    if (!c || c.visible === false) return null;
    const list = byRank.filter(p => (p.categories || []).includes(c.id));
    return { name: c.name, href: `kategorija/${c.id}`, stage: categoryStageName(c.id), list, image: c.image || "" };
  }
  return null;
}
// Išsaugotame sąraše trūkstami prekių tipai (nauji, v15) įterpiami po paskutinio esamo tipo - įjungti
// (rodomi tik atsiradus prekių); jei administratorius tipą išjungė, jis lieka išjungtas
function tileList() {
  if (!Array.isArray(SET.tiles)) return DEFAULT_TILES;
  const raw = [...SET.tiles];
  const last = raw.findLastIndex(t => TYPE.has(t?.key));
  if (last < 0) return raw;
  const missing = TYPES.filter(t => !raw.some(x => x?.key === t.id)).map(t => ({ key: t.id, on: true }));
  raw.splice(last + 1, 0, ...missing);
  return raw;
}
function homeTiles() {
  const raw = tileList();
  return raw
    .filter(t => t && t.on !== false)
    .map(t => {
      const p = tilePreset(t.key);
      if (!p || !p.list.length) return null;
      return { ...p, key: t.key, name: t.title || p.name, image: t.image || p.image || "", focus: t.focus || "50% 50%", dark: !!t.dark };
    })
    .filter(Boolean);
}
// Katalogo puslapio antraštės nuotrauka (ta pati kaip plytelės): lytis / mėginukai / kategorija
function groupPhoto(key) {
  const t = (Array.isArray(SET.tiles) ? SET.tiles : []).find(x => x.key === key);
  if (t?.image) return { image: t.image, focus: t.focus || "50% 50%", dark: !!t.dark };
  if (key.startsWith("kat-")) {
    const c = CATEGORY.get(key.slice(4));
    if (c?.image) return { image: c.image, focus: "50% 50%", dark: false };
  }
  return null;
}
// Nuotrauka (kompiuteriui / telefonui) - užpildo vietą, „focus“ - object-position
function photoHTML({ image, imageM = "", focus = "50% 50%", focusM = "" }, { eager = false, cls = "" } = {}) {
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  const style = `--fx:${esc(focus)};--fxm:${esc(focusM || focus)}`;
  return `<picture class="scenePic${cls ? ` ${cls}` : ""}" style="${style}">${
    imageM ? `<source media="(min-width: 700px), (orientation: landscape) and (max-height: 500px)" srcset="${esc(image)}" />` : ""
  }<img src="${esc(imageM || image)}" alt="" ${load} decoding="async" /></picture>`;
}

// ── Peržiūra administravimo skydelyje ────────────────
const PREVIEW = /[?&]vdPreview=1\b/.test(location.search) && window.parent !== window;
const centerIn = el => el && window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - (innerHeight - el.offsetHeight) / 2));
if (PREVIEW) {
  document.documentElement.classList.add("vdPreview");
  // Peržiūroje nuorodos niekur neveda (kad juodraštis nedingtų)
  document.addEventListener("click", e => e.target instanceof Element && e.target.closest("a") && e.preventDefault(), true);
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || e.data?.type !== "vd-home-preview") return;
    window.__vdPreviewSet = e.data.settings || {}; // setCatalog() jį pritaiko ir po katalogo atnaujinimo
    Object.assign(SET, window.__vdPreviewSet);
    if ("topbar" in window.__vdPreviewSet) renderTopNote();
    if (ui.view === "home") {
      const rail = $("#homeHero .heroRail");
      const i = Number(e.data.slide);
      renderHome();
      const r = $("#homeHero .heroRail");
      if (r && i >= 0) r.scrollLeft = i * r.clientWidth;
      if (e.data.scroll === "top") window.scrollTo(0, 0);
      // Slenkama tik peržiūros langas (scrollIntoView slinktų ir administravimo puslapį aplink <iframe>)
      else if (e.data.scroll === "tiles") centerIn($("#homeTiles"));
      else if (String(e.data.scroll || "").startsWith("rail:")) centerIn($(`#homeRails [data-rail="${CSS.escape(e.data.scroll.slice(5))}"]`));
      else if (!rail) window.scrollTo(0, 0);
    }
  });
  setTimeout(() => window.parent.postMessage({ type: "vd-home-preview-ready" }, location.origin), 0);
}
