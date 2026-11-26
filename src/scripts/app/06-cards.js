// 06 - prekės kortelė (katalogas, pradžia, mėgstami, krepšelis): tikra nuoroda į kvapo puslapį (kvepalai/<id>) ir
// širdelė. v10 (kaip parfumada.lt): kortelėje tik PAVADINIMAS · natos · kaina („Įkvėpti …“ - kvapo puslapyje).
function heartBtn(p, cls = "heart") {
  const on = state.fav.has(p.id);
  return `<button class="${cls}" type="button" data-fav="${p.id}" aria-pressed="${on}" aria-label="${on ? t("fav.remove") : t("fav.add")}" data-label="${on ? t("fav.saved") : t("fav.add")}"><svg viewBox="0 0 24 24">${GLYPH.heart}</svg></button>`;
}
function badgePill(p) {
  if (!inStock(p)) return `<span class="pill glass soldPill">${t("common.soldOut")}</span>`;
  if (onSale(p)) return `<span class="pill glass salePill">${t("common.sale")}</span>`;
  if (!p.badge) return "";
  return `<span class="pill glass">${esc(p.badge)}</span>`;
}
// Nuotrauka su fonu (JPEG - visada stačiakampė, be permatomumo): be šešėlio, kad šonuose nebūtų pilkų juostų (v15b)
const flatImg = src => /\.jpe?g(?:[?#]|$)/i.test(src || "");
// Paveikslas: tikra nuotrauka (images[0], WebP), jei yra; kitaip - buteliuko SVG
function artImg(p, { eager = false } = {}) {
  const src = p.images?.[0];
  return src
    ? `<img class="photo${flatImg(src) ? " flat" : ""}" src="${esc(src)}" alt="${esc(p.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
    : bottleSVG(p);
}
const defaultMl = p => (p.sizes.find(s => s.ml === BOTTLE_ML[0]) || p.sizes[0]).ml;
function cardPriceHTML(p, sample) {
  if (sample) return `<span class="money">${eur(p.sample)}</span><small>· 2 ml</small>`;
  const c = cheapestSize(p);
  const from = p.sizes.length > 1 ? "nuo " : "";
  return c.was > c.price
    ? `<s class="money">${eur(c.was)}</s><span class="money sale">${from}${eur(c.price)}</span>`
    : `<span class="money">${from}${eur(c.price)}</span>`;
}
// Originalas „Įkvėpti …“ (v18) arba šūkis, jei originalo nėra
const cardInspHTML = p => `<span class="cardInsp">${inspiredHTML(p) || `<span class="cardTag">${esc(p.tagline || keyNotes(p).join(" · "))}</span>`}</span>`;
// Pradžios karuselės (v32c): nuotrauka → pavadinimas (visas, vienodu stiliumi - „Aromatinis aliejus JADORE“, iki 2 eilučių)
// → originalas „Įkvėpti …“ → kaina. Eilučių aukščiai bendri visai karuselei (subgrid, 05-products.css) - pavadinimai,
// originalai ir kainos visose kortelėse vienoje linijoje
const cardHeadHTML = p => `<div class="cardHead"><span class="cardName">${esc(p.name)}</span>${cardInspHTML(p)}</div>`;
function cardHTML(p, opts = {}) {
  const sample = !!opts.sample;
  const sold = !inStock(p);
  const rate = ratingOf(p);
  const top = !!opts.top;
  return `<article class="card${sold ? " sold" : ""}${top ? " nameTop" : ""}">
<div class="art${p.images?.length ? ` hasPhoto${isPerfume(p) ? " isPerf" : ""}` : ""}" style="--tint:${p.look.tint}">${artImg(p)}${SET.cards?.badges !== false ? badgePill(p) : ""}${
    opts.heart !== false && SET.cards?.heart !== false ? heartBtn(p) : ""
  }</div>${top ? cardHeadHTML(p) : ""}
<div class="cardTxt">${top ? "" : `<span class="cardName">${esc(p.name)}</span>${cardInspHTML(p)}`}<span class="cardPrice">${cardPriceHTML(p, sample)}</span>${
    rate ? `<span class="cardRate">${starsHTML(rate.avg)}<small>(${rate.n})</small></span>` : ""
  }</div>
<a class="cardLink" href="${productUrl(p)}${sample ? "?ml=2" : ""}" data-nav aria-label="${esc(p.name)}${inspiredOf(p) ? `, ${t("insp.lower", { name: esc(inspiredOf(p)) })}` : ""}, ${esc(cardSub(p))}"></a>
</article>`;
}
function syncHearts(root = document) {
  $$("[data-fav]", root).forEach(b => {
    const on = state.fav.has(b.dataset.fav);
    if (b.getAttribute("aria-pressed") !== String(on)) {
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? t("fav.remove") : t("fav.add"));
      b.dataset.label = on ? t("fav.saved") : t("fav.add");
    }
  });
}
// Vienas klausytojas visoms širdelėms
document.addEventListener("click", e => {
  const tx = e.target instanceof Element ? e.target : null;
  const fav = tx?.closest("[data-fav]");
  if (fav) {
    e.preventDefault();
    const on = toggleFav(fav.dataset.fav);
    $$(`[data-fav="${fav.dataset.fav}"]`).forEach(b => {
      b.classList.remove("pop");
      void b.offsetWidth;
      if (on) b.classList.add("pop");
    });
    toast(on ? t("fav.added") : t("fav.removed"), { icon: "heart" });
    return;
  }
});
