// 07 – Pradžia: vertės žinutė, kolekcijos kortelė, 4 plytelės, „Rask savo kvapą“ ir atradimų rinkinys, populiariausi,
// nuotaikos (kvapo šeimos), naujienos, atsiliepimai (tik tikri), pasitikėjimas, „Mūsų istorija“, poraštė su rekvizitais.
function renderHome() {
  $("#homeLede").textContent = SET.tagline || "";
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  $("#homeHero").innerHTML = `<button class="hero press" data-open="${hp.id}" style="--hero-bg:${hp.look.tint}">
<span class="heroTxt"><span class="eyebrow">${esc(h.eyebrow || "Kolekcija")}</span><h2>${esc(h.title || hp.name)}</h2><p>${esc(h.text || hp.tagline)}</p><span class="btn primary">Atrasti ${glyph("chev-right")}</span></span>
<span class="heroArt">${bottleSVG(hp)}</span></button>`;

  const tiles = [
    { key: "moterims", name: "Moterims", go: { gender: "moterims" } },
    { key: "vyrams", name: "Vyrams", go: { gender: "vyrams" } },
    { key: "unisex", name: "Unisex", go: { gender: "unisex" } },
    { key: "meginukai", name: "Mėginukai", sub: `nuo ${eur(Math.min(...PRODUCTS.map(p => p.sample)))}`, go: { samples: true } }
  ];
  $("#homeTiles").innerHTML = tiles
    .map(
      t =>
        `<button class="tile" data-tile='${JSON.stringify(t.go)}'>${TILE_ICO[t.key]}<span>${t.name}</span>${t.sub ? `<small>${t.sub}</small>` : ""}</button>`
    )
    .join("");

  $("#homeHelp").innerHTML =
    `<button class="row" data-quiz><span class="rowIco">${glyph("spark")}</span><span class="rowTxt">Rask savo kvapą<small>4 klausimai · 30 sekundžių</small></span><span class="chev">${glyph("chev-right")}</span></button>` +
    (DISC
      ? `<button class="row" data-disc><span class="rowIco" style="background:#DB2777">${glyph("drop")}</span><span class="rowTxt">${esc(DISC.name)}<small>${DISC.count} mėginukai po 2 ml už ${eur(DISC.price)}</small></span><span class="chev">${glyph("chev-right")}</span></button>`
      : "");

  const popular = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 6);
  $("#homePopular").innerHTML = popular.map(p => cardHTML(p)).join("");
  const fresh = [...PRODUCTS].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 6);
  $("#homeNew").innerHTML = fresh.map(p => cardHTML(p)).join("");

  $("#homeMoods").innerHTML = CAT.families
    .map(f => {
      const look = FAMILY_LOOK[f.id] || {};
      return `<button class="mood" data-family="${f.id}"><span class="moodDot" style="--mt:${look.tint || "#EEF2F8"}">${look.svg || ""}</span><span><b>${esc(f.name)}</b><small>${esc(f.hint)}</small></span></button>`;
    })
    .join("");

  renderReviews($("#homeReviews"), PRODUCTS);
  $("#homeTrust").innerHTML = `<div>${glyph("truck")}Nemokamai nuo ${eurShort(SET.freeShippingFrom)}</div><div>${glyph("drop")}Mėginukai 2 ml</div><div>${glyph("return")}Grąžinimas per ${SET.returnDays || 14} d.</div>`;
  const st = SET.story;
  const storyEl = $("#homeStory");
  storyEl.hidden = !st?.text;
  if (st?.text) {
    const trio = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 3);
    storyEl.innerHTML = `<div class="storyArt">${
      st.image ? `<img src="${esc(st.image)}" alt="" loading="lazy" decoding="async" />` : trio.map(p => `<span style="--tint:${p.look.tint}">${bottleSVG(p)}</span>`).join("")
    }</div><div class="storyTxt"><h2 id="storyTitle">${esc(st.title || "Mūsų istorija")}</h2><p>${esc(st.text)}</p></div>`;
  }
  $("#homeFoot").innerHTML = `<nav class="footLinks" aria-label="Informacija"><button data-info>Pristatymas ir grąžinimas</button><a href="salygos">Pirkimo sąlygos</a><a href="privatumas">Privatumas</a><a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></nav>${companyLine()}`;
}
// Pardavėjo rekvizitai (settings.company) – neužpildyti laukai „[…]“ nerodomi
const filled = v => v && !/^\[.*\]$/.test(String(v).trim());
function companyLine() {
  const c = SET.company;
  const parts = [
    filled(c.name) ? c.name : SET.shop,
    filled(c.code) && `įm. k. ${c.code}`,
    filled(c.vat) && `PVM k. ${c.vat}`,
    filled(c.address) && c.address,
    filled(c.phone) && c.phone
  ].filter(Boolean);
  return `<p class="footCo">© ${new Date().getFullYear()} ${parts.map(esc).join(" · ")}</p>`;
}
// Atsiliepimai – rodomi TIK tikri (products[].reviews: [{ name, text, rating?, date? }]); jei nėra – sekcijos nėra
function reviewsOf(list) {
  return list.flatMap(p => (p.reviews || []).filter(r => r?.text && r?.name).map(r => ({ ...r, p })));
}
function starsHTML(n) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="stars" role="img" aria-label="Įvertinimas ${r} iš 5">${"★".repeat(r)}<i>${"★".repeat(5 - r)}</i></span>`;
}
function renderReviews(el, list, { title = "Pirkėjų atsiliepimai", showProduct = true } = {}) {
  const all = reviewsOf(list).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  el.hidden = !all.length;
  if (!all.length) return (el.innerHTML = "");
  el.innerHTML = `<div class="blockHead"><h2>${esc(title)}</h2></div><div class="reviews">${all
    .slice(0, 8)
    .map(
      r =>
        `<figure class="review">${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}${showProduct ? ` · ${esc(r.p.name)}` : ""}</figcaption></figure>`
    )
    .join("")}</div>`;
}
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  const tile = t?.closest("[data-tile]");
  if (tile) return goShop(JSON.parse(tile.dataset.tile));
  const mood = t?.closest("[data-family]");
  if (mood) return goShop({ families: [mood.dataset.family] });
  const all = t?.closest("[data-go-shop]");
  if (all) return goShop({ sort: all.dataset.goShop });
});
