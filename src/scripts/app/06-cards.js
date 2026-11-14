// 06 – prekės kortelė (katalogas, mėgstami, pradžios karuselės) ir širdelė.
function heartBtn(p) {
  const on = state.fav.has(p.id);
  return `<button class="heart" data-fav="${p.id}" aria-pressed="${on}" aria-label="${on ? "Pašalinti iš mėgstamų" : "Į mėgstamus"}"><svg viewBox="0 0 24 24">${GLYPH.heart}</svg></button>`;
}
function badgePill(p) {
  if (!p.badge) return "";
  return `<span class="pill glass">${esc(p.badge)}</span>`;
}
function cardHTML(p, opts = {}) {
  const sample = !!opts.sample;
  const price = sample
    ? `<span class="money">${eur(p.sample)}</span><small>· 2 ml</small>`
    : `<small>nuo</small><span class="money">${eurShort(minPrice(p))}</span>`;
  return `<article class="card" data-open="${p.id}"${sample ? ' data-sample="1"' : ""} role="button" tabindex="0" aria-label="${esc(p.name)}, ${esc(cardSub(p))}">
<div class="art" style="--tint:${p.look.tint}">${bottleSVG(p)}${badgePill(p)}${heartBtn(p)}</div>
<div class="cardTxt"><span class="cardName">${esc(p.name)}</span><span class="cardSub">${esc(GENDER_NAME[p.gender])} · ${esc(familyName(p.family))}</span><span class="cardPrice">${price}</span></div>
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
// Vienas klausytojas visoms kortelėms ir širdelėms
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  const fav = t?.closest("[data-fav]");
  if (fav) {
    e.stopPropagation();
    const on = toggleFav(fav.dataset.fav);
    $$(`[data-fav="${fav.dataset.fav}"]`).forEach(b => {
      b.classList.remove("pop");
      void b.offsetWidth;
      if (on) b.classList.add("pop");
    });
    toast(on ? "Įdėta į mėgstamus" : "Pašalinta iš mėgstamų", { icon: "heart" });
    return;
  }
  const card = t?.closest("[data-open]");
  if (card) openProduct(card.dataset.open, { sample: card.dataset.sample === "1" });
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.matches("[data-open]")) {
    e.preventDefault();
    openProduct(e.target.dataset.open, { sample: e.target.dataset.sample === "1" });
  }
});
