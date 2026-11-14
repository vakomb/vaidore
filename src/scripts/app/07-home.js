// 07 – Pradžia: kolekcijos kortelė, 4 plytelės, populiariausi, nuotaikos (kvapo šeimos), naujienos, pasitikėjimas.
function renderHome() {
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

  $("#homeTrust").innerHTML = `<div>${glyph("truck")}Nemokamai nuo ${eurShort(SET.freeShippingFrom)}</div><div>${glyph("drop")}Mėginukai 2 ml</div><div>${glyph("return")}Grąžinimas per 14 d.</div>`;
  $("#homeFoot").innerHTML = `<button data-info>Pristatymas</button><a href="/salygos">Pirkimo sąlygos</a><a href="/privatumas">Privatumas</a><a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a><span>© ${new Date().getFullYear()} ${esc(SET.shop)}</span>`;
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
