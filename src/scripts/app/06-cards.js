// 06 – prekės kortelė (katalogas, pradžia, mėgstami, krepšelis): tikra nuoroda į kvapo puslapį (kvepalai/<id>),
// širdelė ir – kompiuteryje užvedus – greitas veiksmas „Į krepšelį“ / „Mėginukas“.
function heartBtn(p, cls = "heart") {
  const on = state.fav.has(p.id);
  return `<button class="${cls}" type="button" data-fav="${p.id}" aria-pressed="${on}" aria-label="${on ? "Pašalinti iš mėgstamų" : "Į mėgstamus"}"><svg viewBox="0 0 24 24">${GLYPH.heart}</svg></button>`;
}
function badgePill(p) {
  if (!inStock(p)) return `<span class="pill glass soldPill">Išparduota</span>`;
  if (onSale(p)) return `<span class="pill glass salePill">Akcija</span>`;
  if (!p.badge) return "";
  return `<span class="pill glass">${esc(p.badge)}</span>`;
}
// Paveikslas: tikra nuotrauka (images[0], WebP), jei yra; kitaip – buteliuko SVG
function artImg(p, { eager = false } = {}) {
  const src = p.images?.[0];
  return src
    ? `<img class="photo" src="${esc(src)}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
    : bottleSVG(p);
}
const defaultMl = p => (p.sizes.find(s => s.ml === 50) || p.sizes[0]).ml;
function cardPriceHTML(p, sample) {
  if (sample) return `<span class="money">${eur(p.sample)}</span><small>· 2 ml</small>`;
  const c = cheapestSize(p);
  const from = p.sizes.length > 1 ? "nuo " : "";
  return c.was > c.price
    ? `<s class="money">${eur(c.was)}</s><span class="money sale">${from}${eur(c.price)}</span>`
    : `<span class="money">${from}${eur(c.price)}</span>`;
}
function cardHTML(p, opts = {}) {
  const sample = !!opts.sample;
  const sold = !inStock(p);
  const rate = ratingOf(p);
  const quick = sold
    ? ""
    : `<div class="quick"><button class="btn primary small" type="button" data-quick="${p.id}" data-ml="${sample ? SAMPLE_ML : defaultMl(p)}">${glyph("bag")}${sample ? "Mėginukas" : `${defaultMl(p)} ml`}</button>${
        sample ? "" : `<button class="btn light small" type="button" data-quick="${p.id}" data-ml="${SAMPLE_ML}">2 ml</button>`
      }</div>`;
  return `<article class="card${sold ? " sold" : ""}">
<div class="art${p.images?.length ? " hasPhoto" : ""}" style="--tint:${p.look.tint}">${artImg(p)}${badgePill(p)}${heartBtn(p)}${quick}</div>
<div class="cardTxt"><span class="cardName">${esc(p.name)}</span><span class="cardNotes">${keyNotes(p).map(esc).join(" · ")}</span><span class="cardPrice">${cardPriceHTML(p, sample)}</span>${
    rate ? `<span class="cardRate">${starsHTML(rate.avg)}<small>(${rate.n})</small></span>` : ""
  }</div>
<a class="cardLink" href="${productUrl(p)}${sample ? "?ml=2" : ""}" data-nav aria-label="${esc(p.name)}, ${esc(cardSub(p))}"></a>
</article>`;
}
function syncHearts(root = document) {
  $$("[data-fav]", root).forEach(b => {
    const on = state.fav.has(b.dataset.fav);
    if (b.getAttribute("aria-pressed") !== String(on)) {
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? "Pašalinti iš mėgstamų" : "Į mėgstamus");
    }
  });
}
// Vienas klausytojas visoms širdelėms ir greitiems veiksmams
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  const fav = t?.closest("[data-fav]");
  if (fav) {
    e.preventDefault();
    const on = toggleFav(fav.dataset.fav);
    $$(`[data-fav="${fav.dataset.fav}"]`).forEach(b => {
      b.classList.remove("pop");
      void b.offsetWidth;
      if (on) b.classList.add("pop");
    });
    toast(on ? "Įdėta į mėgstamus" : "Pašalinta iš mėgstamų", { icon: "heart" });
    return;
  }
  const q = t?.closest("[data-quick]");
  if (q) {
    e.preventDefault();
    const p = BY_ID.get(q.dataset.quick);
    addToCart(p.id, Number(q.dataset.ml));
    openMiniCart({ added: `${p.name} · ${sizeLabel(Number(q.dataset.ml))}` });
  }
});
