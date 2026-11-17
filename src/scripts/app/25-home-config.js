// 25 – Pradžios puslapio turinys iš nustatymų (keičiamas administravimo skydelyje „Pradžia“, admin/pradzia):
//   settings.slides  – skaidrės (eilė = rodymo tvarka): { id, on, preset, image, imageM, focus, focusM, scene, product,
//                      eyebrow, title, text, cta, href, dark }. Nėra lauko – rodomos numatytosios trys (DEFAULT_SLIDES).
//                      Tušti tekstai imami iš šablono (preset): kainos ir pavadinimai visada tikri.
//                      preset "photo" – „Tik nuotrauka“: tik image (kompiuteriui) ir / ar imageM (telefonui), nebūtina
//                      nuoroda href ir aprašymas title (tik skaitytuvams) – svetainė ant nuotraukos nieko neuždeda.
//   settings.tiles   – „Produktai“ plytelės: { key, on, title, image, focus, dark }; key – moterims / vyrams / unisex /
//                      meginukai / rinkinys / naujienos / kat-<kategorijos id>. Nėra lauko – numatytosios šešios.
//   settings.slideSeconds – kas kiek sekundžių keičiasi skaidrės (0 – nesikeičia pačios).
// Fonas: įkelta nuotrauka (kompiuteriui ir, nebūtinai, telefonui; „focus“ – kuri vieta lieka matoma) arba Vaidore
// scena (24-stage.js) su pasirinkto kvapo buteliukais. dark – tamsi nuotrauka, tekstas ant jos baltas.
// Peržiūra: administravimo skydelis įkelia parduotuvę į <iframe> (?vdPreview=1) ir siunčia juodraštį postMessage.

const byRankAll = () => [...PRODUCTS].sort((a, b) => a.rank - b.rank);
const DEFAULT_SLIDES = [
  { id: "kolekcija", on: true, preset: "collection" },
  { id: "meginukai", on: true, preset: "samples" },
  { id: "dovana", on: true, preset: "gift" }
];
const DEFAULT_TILES = ["moterims", "vyrams", "unisex", "meginukai", "rinkinys", "naujienos"].map(key => ({ key, on: true }));

// Skaidrių šablonai – numatytieji tekstai ir scena (galioja, kol administratorius neįrašė savo)
const SLIDE_PRESETS = {
  // Tik nuotrauka: be kvapo ir be svetainės teksto (tekstas, jei reikia, – pačioje nuotraukoje); nuoroda – nebūtina
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
  samples: {
    name: "Mėginukai",
    make() {
      return {
        scene: "samples",
        eyebrow: "Mėginukai 2 ml",
        title: "Pirma išbandykite",
        text: SET.sampleCredit ? `Mėginukas nuo ${eur(sampleFrom())} – kainą grąžinsime perkant buteliuką.` : `Kiekvienas kvapas – ir 2 ml mėginuku nuo ${eur(sampleFrom())}.`,
        cta: "Rinktis mėginukus",
        href: "meginukai"
      };
    }
  },
  gift: {
    name: "Dovana / rinkinys",
    make() {
      return DISC
        ? { scene: "gift", eyebrow: "Dovanai", title: DISC.name, text: `Bet kurie ${DISC.count} kvapai po 2 ml už ${eurShort(DISC.price)} – raskite savo kvapą.`, cta: "Susidaryti rinkinį", href: "rinkinys" }
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
  const of = g => byRank.filter(p => p.gender === g);
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
function homeTiles() {
  const raw = Array.isArray(SET.tiles) ? SET.tiles : DEFAULT_TILES;
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
// Nuotrauka (kompiuteriui / telefonui) – užpildo vietą, „focus“ – object-position
function photoHTML({ image, imageM = "", focus = "50% 50%", focusM = "" }, { eager = false, cls = "" } = {}) {
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  const style = `--fx:${esc(focus)};--fxm:${esc(focusM || focus)}`;
  return `<picture class="scenePic${cls ? ` ${cls}` : ""}" style="${style}">${
    imageM ? `<source media="(min-width: 700px), (orientation: landscape) and (max-height: 500px)" srcset="${esc(image)}" />` : ""
  }<img src="${esc(imageM || image)}" alt="" ${load} decoding="async" /></picture>`;
}

// ── Peržiūra administravimo skydelyje ────────────────
const PREVIEW = /[?&]vdPreview=1\b/.test(location.search) && window.parent !== window;
if (PREVIEW) {
  document.documentElement.classList.add("vdPreview");
  // Peržiūroje nuorodos niekur neveda (kad juodraštis nedingtų)
  document.addEventListener("click", e => e.target instanceof Element && e.target.closest("a") && e.preventDefault(), true);
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || e.data?.type !== "vd-home-preview") return;
    window.__vdPreviewSet = e.data.settings || {}; // setCatalog() jį pritaiko ir po katalogo atnaujinimo
    Object.assign(SET, window.__vdPreviewSet);
    if (ui.view === "home") {
      const rail = $("#homeHero .heroRail");
      const i = Number(e.data.slide);
      renderHome();
      const r = $("#homeHero .heroRail");
      if (r && i >= 0) r.scrollLeft = i * r.clientWidth;
      if (e.data.scroll === "tiles") $("#homeTiles")?.scrollIntoView({ block: "center" });
      else if (!rail) window.scrollTo(0, 0);
    }
  });
  setTimeout(() => window.parent.postMessage({ type: "vd-home-preview-ready" }, location.origin), 0);
}
