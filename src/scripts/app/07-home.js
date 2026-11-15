// 07 – Pradžia: vertės žinutė, kolekcijos kortelė, kategorijos, „Rask savo kvapą“ ir atradimų rinkinys, populiariausi,
// nuotaikos (kvapo šeimos), naujienos, atsiliepimai (tik tikri), pasitikėjimas, „Mūsų istorija“.
const FAMILY_FALLBACK = {
  tint: "#F3F5F8",
  svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="#C7D2FE"/><circle cx="12" cy="12" r="4" fill="#818CF8"/></svg>'
};
// Pradžia (kaip parfumada.lt): platus kolekcijos paveikslas → bėganti privalumų juosta → kategorijos → karuselės
// (naujienos, populiariausi moterims / vyrams / unisex, mėginukai) → „Rask savo kvapą“ ir rinkinys → nuotaikos →
// atsiliepimai (tik tikri) → istorija. Skyrių antraštės – tamsios juostos per visą plotį.
const sampleFrom = () => Math.min(...PRODUCTS.map(p => p.sample));
function heroHTML() {
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  const best = Math.max(...PRODUCTS.map(p => p.longevity));
  const perks = [
    ["drop", `Kiekvienas kvapas – ir 2 ml mėginuku`],
    ["clock", `Išsilaiko iki ${LASTS[best].replace("+ ", "+").replace(" val.", " valandų")}`],
    ["truck", `Nemokamas pristatymas nuo ${eurShort(SET.freeShippingFrom)}`]
  ];
  return `<section class="hero" style="--tint:${hp.look.tint};--liquid:${hp.look.liquid}">
<div class="heroIn">
<div class="heroTxt">
<p class="eyebrow">${esc(h.eyebrow || "Kolekcija")}</p>
<h1 class="heroTitle">${esc(h.title || hp.name)}</h1>
<p class="heroLede" id="homeLede">${esc(h.text || SET.tagline || hp.tagline)}</p>
<ul class="heroPerks">${perks.map(([ico, t]) => `<li><span>${glyph(ico)}</span>${esc(t)}</li>`).join("")}</ul>
<div class="heroActs"><a class="btn light" href="${productUrl(hp)}" data-nav>Atrasti ${esc(hp.name)}</a><a class="btn outlineLight" href="meginukai" data-nav>Mėginukai nuo ${eur(sampleFrom())}</a></div>
</div>
<a class="heroArt" href="${productUrl(hp)}" data-nav aria-label="${esc(hp.name)}" tabindex="-1">${hp.images?.[0] ? `<img src="${esc(hp.images[0])}" alt="" fetchpriority="high" />` : bottleSVG(hp)}</a>
</div></section>`;
}
function marqueeHTML() {
  const items = [
    ["drop", "Mėginukai 2 ml"],
    ["truck", `Nemokamas pristatymas nuo ${eurShort(SET.freeShippingFrom)}`],
    ["clock", `Išsiunčiame per ${SET.dispatch || "1–2 d. d."}`],
    ["return", `Grąžinimas per ${SET.returnDays || 14} d.`],
    ["lock", "Saugus apmokėjimas"],
    ["spark", "Nišiniai kvapai"]
  ];
  const row = hidden => `<ul class="mqRow"${hidden ? ' aria-hidden="true"' : ""}>${items.map(([i, t]) => `<li>${glyph(i)}<span>${esc(t)}</span></li>`).join("")}</ul>`;
  return `<div class="mqTrack">${row(false)}${row(true)}</div>`;
}
// Kategorijos plytelė: pavadinimas viršuje, apačioje – tos grupės buteliukai minkštame fone
function tileHTML({ name, href, list, sub, tint }) {
  const trio = list.slice(0, 3);
  return `<a class="tile" href="${href}" data-nav><span class="tileName">${esc(name)}</span><span class="tileArt" style="--tint:${tint || trio[0]?.look.tint || "#F6F7F9"}">${trio
    .map(p => `<i>${p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="" loading="lazy" />` : bottleSVG(p)}</i>`)
    .join("")}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</a>`;
}
// Skyrius su juosta ir karusele (kompiuteryje – rodyklės ir „1/3“)
function railHTML(cards) {
  return `<div class="railWrap"><div class="rail">${cards}</div><div class="railNav" hidden><button class="railBtn" type="button" data-rail-step="-1" aria-label="Atgal">${glyph(
    "chev-left"
  )}</button><span class="railPage" aria-live="polite"></span><button class="railBtn" type="button" data-rail-step="1" aria-label="Pirmyn">${glyph("chev-right")}</button></div></div>`;
}
function railSecHTML({ title, line, href, list, sample = false }) {
  return `<section class="hsec"><h2 class="band">${esc(title)}</h2><div class="wrap">${
    line ? `<p class="secLine"><span>${esc(line)}</span><a href="${href}" data-nav>Peržiūrėti</a></p>` : ""
  }${railHTML(list.map(p => cardHTML(p, { sample })).join(""))}</div></section>`;
}
function syncRail(wrap) {
  const rail = $(".rail", wrap);
  const nav = $(".railNav", wrap);
  if (!rail || !nav) return;
  const pages = Math.max(1, Math.round(rail.scrollWidth / Math.max(1, rail.clientWidth)));
  nav.hidden = pages < 2;
  const cur = Math.min(pages, Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)) + 1);
  $(".railPage", nav).textContent = `${cur}/${pages}`;
  $('[data-rail-step="-1"]', nav).disabled = cur <= 1;
  $('[data-rail-step="1"]', nav).disabled = cur >= pages;
}
function bindRails(root = document) {
  $$(".railWrap", root).forEach(w => {
    syncRail(w);
    if (w.dataset.bound) return;
    w.dataset.bound = "1";
    let t = 0;
    $(".rail", w).addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(t);
        t = requestAnimationFrame(() => syncRail(w));
      },
      { passive: true }
    );
  });
}
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-rail-step]");
  if (!b) return;
  const rail = $(".rail", b.closest(".railWrap"));
  rail.scrollBy({ left: Number(b.dataset.railStep) * rail.clientWidth, behavior: reduceMotion() ? "auto" : "smooth" });
});
window.addEventListener("resize", () => {
  clearTimeout(window.__vdRailT);
  window.__vdRailT = setTimeout(() => $$(".view.active .railWrap").forEach(syncRail), 150);
});

function renderHome() {
  $("#homeHero").innerHTML = heroHTML();
  $("#homeMarquee").innerHTML = marqueeHTML();
  const byRank = [...PRODUCTS].sort((a, b) => a.rank - b.rank);
  const fresh = [...PRODUCTS].sort((a, b) => String(b.added).localeCompare(String(a.added)));
  const of = g => byRank.filter(p => p.gender === g);
  const tiles = [
    { name: "Moterims", href: "moterims", list: of("moterims"), sub: plural(of("moterims").length, "kvapas", "kvapai", "kvapų") },
    { name: "Vyrams", href: "vyrams", list: of("vyrams"), sub: plural(of("vyrams").length, "kvapas", "kvapai", "kvapų") },
    { name: "Unisex", href: "unisex", list: of("unisex"), sub: plural(of("unisex").length, "kvapas", "kvapai", "kvapų") },
    { name: "Mėginukai", href: "meginukai", list: byRank.slice(3), sub: `2 ml nuo ${eur(sampleFrom())}`, tint: "#F3EAD8" },
    ...(DISC ? [{ name: DISC.name, href: "rinkinys", list: byRank.slice(6), sub: `${DISC.count} × 2 ml už ${eur(DISC.price)}`, tint: "#EEF1F8" }] : []),
    { name: "Naujienos", href: "kvepalai?rikiuoti=new", list: fresh, sub: "Naujausi kvapai" }
  ];
  $("#homeTiles").innerHTML = tiles.filter(t => t.list.length).map(tileHTML).join("");

  const sec = [
    { title: "Kvapnios naujienos", line: "Naujausi kvapai mūsų kolekcijoje", href: "kvepalai?rikiuoti=new", list: fresh.slice(0, 8) },
    { title: "Populiariausi moterims", line: "Kvapai, kuriuos dažniausiai renkasi moterys", href: "moterims", list: of("moterims") },
    { title: "Populiariausi vyrams", line: "Kvapai, kuriuos dažniausiai renkasi vyrai", href: "vyrams", list: of("vyrams") },
    { title: "Unisex kvapai", line: "Tinka visiems – be taisyklių", href: "unisex", list: of("unisex") },
    { title: "Mėginukai 2 ml", line: SET.sampleCredit ? "Išbandykite prieš pirkdami – kainą grąžinsime perkant buteliuką" : "Išbandykite namuose prieš pirkdami", href: "meginukai", list: byRank.filter(inStock).slice(0, 8), sample: true }
  ].filter(x => x.list.length >= 2);
  $("#homeRails").innerHTML = sec.map(railSecHTML).join("");
  bindRails($("#view-home"));

  $("#homePromos").innerHTML =
    `<button class="promo dark" type="button" data-quiz><span class="prIco">${glyph("spark")}</span><span class="prTxt"><b>Rask savo kvapą</b><small>4 klausimai · 30 sekundžių · 3 pasiūlymai, kurie tiks būtent jums</small></span><span class="prGo">Pradėti${glyph("chev-right")}</span></button>` +
    (DISC
      ? `<button class="promo gold" type="button" data-disc><span class="prIco">${glyph("drop")}</span><span class="prTxt"><b>${esc(DISC.name)}</b><small>Bet kurie ${DISC.count} kvapai po 2 ml už ${eur(DISC.price)} – išbandykite namuose</small></span><span class="prGo">Rinktis${glyph("chev-right")}</span></button>`
      : "");

  $("#homeMoods").innerHTML = visibleFamilies()
    .map(f => {
      const look = FAMILY_LOOK[f.id] || FAMILY_FALLBACK;
      return `<a class="mood" href="kvepalai?seima=${encodeURIComponent(f.id)}" data-nav style="--mt:${look.tint}"><span class="moodDot">${look.svg}</span><span><b>${esc(f.name)}</b><small>${esc(f.hint)}</small></span></a>`;
    })
    .join("");

  renderReviews($("#homeReviews"), PRODUCTS, { band: true });
  $("#homeTrust").innerHTML = `<div>${glyph("truck")}<span>Nemokamai nuo <b>${eurShort(SET.freeShippingFrom)}</b></span></div><div>${glyph("drop")}<span>Mėginukai <b>2 ml</b></span></div><div>${glyph("return")}<span>Grąžinimas per <b>${SET.returnDays || 14} d.</b></span></div>`;
  const st = SET.story;
  const storyEl = $("#homeStory");
  storyEl.hidden = !st?.text;
  if (st?.text) {
    const trio = byRank.slice(0, 3);
    storyEl.innerHTML = `<div class="storyArt">${
      st.image ? `<img src="${esc(st.image)}" alt="" loading="lazy" decoding="async" />` : trio.map(p => `<span style="--tint:${p.look.tint}">${bottleSVG(p)}</span>`).join("")
    }</div><div class="storyTxt"><p class="eyebrow">Vaidore</p><h2 id="storyTitle">${esc(st.title || "Mūsų istorija")}</h2><p>${esc(st.text)}</p><a class="btn ghost" href="apie-mus" data-nav>Daugiau apie mus</a></div>`;
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
function renderReviews(el, list, { title = "Pirkėjų atsiliepimai", showProduct = true, band = false } = {}) {
  if (!el) return;
  const all = reviewsOf(list).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  el.hidden = !all.length;
  if (!all.length) return (el.innerHTML = "");
  const head = band ? `<h2 class="band">${esc(title)}</h2><div class="wrap">` : `<div class="secHead"><h2>${esc(title)}</h2></div>`;
  el.innerHTML = `${head}<div class="reviews">${all
    .slice(0, 9)
    .map(
      r =>
        `<figure class="review">${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}${
          showProduct ? ` · <a href="${productUrl(r.p)}" data-nav>${esc(r.p.name)}</a>` : ""
        }${r.verified ? ` · <span class="verified">Patvirtintas pirkėjas</span>` : ""}</figcaption></figure>`
    )
    .join("")}</div>${band ? "</div>" : ""}`;
}
