// 24 – Vaidore scenos: vieno stiliaus kompozicijos iš tikrų buteliukų be fono (img/kvapai/<id>-1.webp), 2 ml mėginukų
// (img/meginukas.webp) ir CSS formų – arka, cilindras, blokas, diskas, juoda dovanų dėžutė su VAIDORE logotipu.
// Naudoja: pradžios skaidrės (07-home), kategorijų plytelės „Produktai“ (07-home), katalogo antraštė (08-shop).
// Išdėstymas ir spalvos – 12-stage.css ir 01-tokens.css (--st-*). Matai – „u“: 100u ≈ scenos aukštis
// (siauroje ar žemoje scenoje kompozicija proporcingai sumažėja, todėl niekas nenukerpama ir niekas nepasislenka).
//   [tipas, x, y, w|s, h, spalva]  x – centro poslinkis nuo kompozicijos ašies, y – apačia virš grindų,
//   w/h – plotis/aukštis, s – buteliuko (kvadratinio paveikslo) ar mėginuko aukštis.
//   Tipai: ar – arka, sn – diskas, pl – cilindras, bk – blokas, bx – dovanų dėžutė, b – buteliukas (n-tas sąrašo kvapas),
//   v – mėginukas. Spalva: "" – scenos tonas, "d" – tamsi (grafitas), "l" – šviesi.
const STAGES = {
  // Pradžios skaidrės – plačios, didesni objektai
  collection: {
    tone: "stone",
    items: [
      ["ar", 6, 0, 62, 86],
      ["pl", 6, 0, 40, 20, "l"],
      ["b", -34, 0, 50, 1],
      ["b", 6, 20, 70, 0]
    ]
  },
  samples: {
    tone: "ivory",
    items: [
      ["sn", 0, 22, 74],
      ["bk", 0, 0, 92, 9, "l"],
      ["b", 36, 9, 56, 0],
      ["v", -32, 9, 40],
      ["v", -20, 9, 40],
      ["v", -8, 9, 40],
      ["v", 4, 9, 40],
      ["v", 16, 9, 40]
    ]
  },
  gift: {
    tone: "taupe",
    items: [
      ["b", 38, 0, 62, 0],
      ["v", -30, 14, 40],
      ["v", -18, 14, 40],
      ["v", -6, 14, 40],
      ["v", 6, 14, 40],
      ["v", 18, 14, 40],
      ["bx", -6, 0, 72, 30]
    ]
  },
  // Kategorijos – skirtingos kompozicijos, tas pats stilius
  women: {
    tone: "rose",
    items: [
      ["ar", -10, 0, 54, 84],
      ["pl", -14, 0, 32, 16, "l"],
      ["b", -14, 16, 60, 0],
      ["b", 18, 0, 50, 1]
    ]
  },
  men: {
    tone: "cool",
    items: [
      ["bk", 12, 0, 38, 30, "d"],
      ["b", 12, 30, 56, 0],
      ["b", -22, 0, 50, 1]
    ]
  },
  unisex: {
    tone: "sand",
    items: [
      ["sn", 0, 14, 66],
      ["pl", 0, 0, 72, 10, "l"],
      ["b", -15, 10, 54, 0],
      ["b", 15, 10, 54, 1]
    ]
  },
  vials: {
    tone: "ivory",
    items: [
      ["bk", -14, 0, 42, 12, "l"],
      ["b", -14, 12, 58, 0],
      ["v", 14, 0, 36],
      ["v", 25, 0, 36],
      ["v", 36, 0, 36]
    ]
  },
  set: {
    tone: "taupe",
    items: [
      ["v", -24, 12, 38],
      ["v", -12, 12, 38],
      ["v", 0, 12, 38],
      ["v", 12, 12, 38],
      ["v", 24, 12, 38],
      ["bx", 0, 0, 66, 28]
    ]
  },
  fresh: {
    tone: "sage",
    items: [
      ["bk", -24, 0, 24, 8, "l"],
      ["bk", 0, 0, 24, 18, "l"],
      ["bk", 24, 0, 24, 28, "l"],
      ["b", -24, 8, 40, 2],
      ["b", 0, 18, 44, 1],
      ["b", 24, 28, 48, 0]
    ]
  }
};
// Administratoriaus sukurtoms kategorijoms – kompozicija pagal eilės numerį (vis tiek vienodo stiliaus)
const STAGE_CYCLE = ["unisex", "women", "fresh", "men"];
// Katalogo puslapio scena (08-shop): lytis / mėginukai / kategorija
function shopStageName() {
  if (shop.samples) return "vials";
  if (shop.gender === "moterims") return "women";
  if (shop.gender === "vyrams") return "men";
  if (shop.gender === "unisex") return "unisex";
  if (shop.category) return categoryStageName(shop.category);
  return "";
}
function categoryStageName(id) {
  const i = Math.max(0, visibleCategories().findIndex(c => c.id === id));
  return STAGE_CYCLE[i % STAGE_CYCLE.length];
}
// list – kvapai, kurių buteliukai rodomi (n-tas elementas – ["b", …, n]); eager – pirmo ekrano scena (be lazy)
function stageHTML(name, list, { eager = false, cls = "" } = {}) {
  const st = STAGES[name] || STAGES.unisex;
  const ps = (list || []).filter(Boolean);
  const load = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const pos = (x, y) => `--x:${x};--y:${y}`;
  const body = st.items
    .map(([t, x, y, a, b, c]) => {
      if (t === "b") {
        const p = ps.length ? ps[b % ps.length] : null;
        if (!p) return "";
        const art = p.images?.[0] ? `<img${flatImg(p.images[0]) ? ' class="flat"' : ""} src="${esc(p.images[0])}" alt="" ${load} />` : bottleSVG(p);
        return `<span class="sb" style="${pos(x, y)};--s:${a}">${art}</span>`;
      }
      if (t === "v") return `<span class="sv" style="${pos(x, y)};--s:${a}"><img src="img/meginukas.webp" alt="" ${load} /></span>`;
      if (t === "bx") return `<i class="sx bx" style="${pos(x, y)};--w:${a};--h:${b}">${logoHTML()}</i>`;
      return `<i class="sx ${t}${c ? ` c-${c}` : ""}" style="${pos(x, y)};--w:${a};--h:${b ?? a}"></i>`;
    })
    .join("");
  return `<span class="stage st-${st.tone}${cls ? ` ${cls}` : ""}" aria-hidden="true">${body}</span>`;
}
