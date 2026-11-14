// 07 – Pradžia: vertės žinutė, kolekcijos kortelė, kategorijos, „Rask savo kvapą“ ir atradimų rinkinys, populiariausi,
// nuotaikos (kvapo šeimos), naujienos, atsiliepimai (tik tikri), pasitikėjimas, „Mūsų istorija“.
const FAMILY_FALLBACK = {
  tint: "#F3F5F8",
  svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="#C7D2FE"/><circle cx="12" cy="12" r="4" fill="#818CF8"/></svg>'
};
function renderHome() {
  $("#homeLede").textContent = SET.tagline || "";
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  $("#homeHero").innerHTML = `<a class="hero press" href="${productUrl(hp)}" data-nav style="--hero-bg:${hp.look.tint}">
<span class="heroTxt"><span class="eyebrow">${esc(h.eyebrow || "Kolekcija")}</span><h2>${esc(h.title || hp.name)}</h2><p>${esc(h.text || hp.tagline)}</p><span class="btn primary">Atrasti ${glyph("chev-right")}</span></span>
<span class="heroArt">${hp.images?.[0] ? `<img src="${esc(hp.images[0])}" alt="" fetchpriority="high" />` : bottleSVG(hp)}</span></a>`;

  const minSample = Math.min(...PRODUCTS.map(p => p.sample));
  const tiles = [
    { key: "moterims", name: "Moterims", href: "moterims" },
    { key: "vyrams", name: "Vyrams", href: "vyrams" },
    { key: "unisex", name: "Unisex", href: "unisex" },
    { key: "meginukai", name: "Mėginukai", sub: `nuo ${eur(minSample)}`, href: "meginukai" }
  ];
  $("#homeTiles").innerHTML = tiles
    .map(t => `<a class="tile" href="${t.href}" data-nav>${TILE_ICO[t.key]}<span>${t.name}</span>${t.sub ? `<small>${t.sub}</small>` : ""}</a>`)
    .join("");

  $("#homePromos").innerHTML =
    `<button class="promo" type="button" data-quiz><span class="prIco">${glyph("spark")}</span><span><b>Rask savo kvapą</b><small>4 klausimai · 30 sekundžių · 3 pasiūlymai</small></span><span class="chev">${glyph("chev-right")}</span></button>` +
    (DISC
      ? `<button class="promo pink" type="button" data-disc><span class="prIco">${glyph("drop")}</span><span><b>${esc(DISC.name)}</b><small>Bet kurie ${DISC.count} mėginukai po 2 ml už ${eur(DISC.price)}</small></span><span class="chev">${glyph("chev-right")}</span></button>`
      : "");

  const popular = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 6);
  $("#homePopular").innerHTML = popular.map(p => cardHTML(p)).join("");
  const fresh = [...PRODUCTS].sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, 6);
  $("#homeNew").innerHTML = fresh.map(p => cardHTML(p)).join("");

  $("#homeMoods").innerHTML = visibleFamilies()
    .map(f => {
      const look = FAMILY_LOOK[f.id] || FAMILY_FALLBACK;
      return `<a class="mood" href="kvepalai?seima=${encodeURIComponent(f.id)}" data-nav style="--mt:${look.tint}"><span class="moodDot">${look.svg}</span><span><b>${esc(f.name)}</b><small>${esc(f.hint)}</small></span></a>`;
    })
    .join("");

  renderReviews($("#homeReviews"), PRODUCTS);
  $("#homeTrust").innerHTML = `<div>${glyph("truck")}<span>Nemokamai nuo <b>${eurShort(SET.freeShippingFrom)}</b></span></div><div>${glyph("drop")}<span>Mėginukai <b>2 ml</b></span></div><div>${glyph("return")}<span>Grąžinimas per <b>${SET.returnDays || 14} d.</b></span></div>`;
  const st = SET.story;
  const storyEl = $("#homeStory");
  storyEl.hidden = !st?.text;
  if (st?.text) {
    const trio = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 3);
    storyEl.innerHTML = `<div class="storyArt">${
      st.image ? `<img src="${esc(st.image)}" alt="" loading="lazy" decoding="async" />` : trio.map(p => `<span style="--tint:${p.look.tint}">${bottleSVG(p)}</span>`).join("")
    }</div><div class="storyTxt"><h2 id="storyTitle">${esc(st.title || "Mūsų istorija")}</h2><p>${esc(st.text)}</p><a class="more" href="apie-mus" data-nav>Daugiau apie mus</a></div>`;
  }
}
// Pardavėjo rekvizitai (settings.company) – neužpildyti laukai „[…]“ nerodomi
const filled = v => v && !/^\[.*\]$/.test(String(v).trim());
function companyParts() {
  const c = SET.company;
  return [
    filled(c.name) ? c.name : SET.shop,
    filled(c.code) && `įm. k. ${c.code}`,
    filled(c.vat) && `PVM k. ${c.vat}`,
    filled(c.address) && c.address,
    filled(c.phone) && c.phone
  ].filter(Boolean);
}
const companyLine = () => `© ${new Date().getFullYear()} ${companyParts().map(esc).join(" · ")}`;
// Atsiliepimai – rodomi TIK tikri (patvirtinti duomenų bazėje arba products[].reviews kataloge); jei nėra – sekcijos nėra
function reviewsOf(list) {
  return list.flatMap(p => (p.reviews || []).filter(r => r?.text && r?.name).map(r => ({ ...r, p })));
}
function starsHTML(n) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="stars" role="img" aria-label="Įvertinimas ${r} iš 5">${"★".repeat(r)}<i>${"★".repeat(5 - r)}</i></span>`;
}
function renderReviews(el, list, { title = "Pirkėjų atsiliepimai", showProduct = true } = {}) {
  if (!el) return;
  const all = reviewsOf(list).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  el.hidden = !all.length;
  if (!all.length) return (el.innerHTML = "");
  el.innerHTML = `<div class="secHead"><h2>${esc(title)}</h2></div><div class="reviews">${all
    .slice(0, 9)
    .map(
      r =>
        `<figure class="review">${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}${
          showProduct ? ` · <a href="${productUrl(r.p)}" data-nav>${esc(r.p.name)}</a>` : ""
        }${r.verified ? ` · <span class="verified">Patvirtintas pirkėjas</span>` : ""}</figcaption></figure>`
    )
    .join("")}</div>`;
}
