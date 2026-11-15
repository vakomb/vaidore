// 07 – Pradžia: skaidrės, bėganti juosta, produktų plytelės, karuselės, atsiliepimai (tik tikri).
// Pradžia (kaip parfumada.lt): skaidrės (kolekcija · mėginukai · rinkinys) → bėganti privalumų juosta → „Produktai“
// (plytelės) → karuselės (naujienos, populiariausi moterims / vyrams / unisex, nuolaidos, mėginukai) → atsiliepimai.
// Skyrių antraštės – tamsios juostos per visą plotį.
const sampleFrom = () => Math.min(...PRODUCTS.map(p => p.sample));
// Pradžios skaidrės (v7): trys vieno stiliaus skaidrės su Vaidore buteliukais be fono – sezono kolekcija,
// „pirma išbandykite mėginuką“, dovana / atradimų rinkinys. Kiekviena – sava kompozicija (24-stage.js),
// trumpas tekstas ir VIENAS aiškus veiksmas. Aukštis fiksuotas (CSS) – keičiantis skaidrėms niekas nepasislenka.
function heroSlidesData() {
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  const byRank = [...PRODUCTS].sort((a, b) => a.rank - b.rank);
  const rest = byRank.filter(p => p !== hp);
  return [
    {
      stage: "collection",
      list: [hp, ...rest],
      href: productUrl(hp),
      eyebrow: h.eyebrow || "Kolekcija",
      title: h.title || hp.name,
      text: h.text || hp.tagline,
      cta: `Atrasti ${hp.name}`
    },
    {
      stage: "samples",
      list: rest,
      href: "meginukai",
      eyebrow: "Mėginukai 2 ml",
      title: "Pirma išbandykite",
      text: SET.sampleCredit ? `Mėginukas nuo ${eur(sampleFrom())} – kainą grąžinsime perkant buteliuką.` : `Kiekvienas kvapas – ir 2 ml mėginuku nuo ${eur(sampleFrom())}.`,
      cta: "Rinktis mėginukus"
    },
    DISC && {
      stage: "gift",
      list: rest.slice(2),
      href: "rinkinys",
      eyebrow: "Dovanai",
      title: DISC.name,
      text: `Bet kurie ${DISC.count} kvapai po 2 ml už ${eurShort(DISC.price)} – raskite savo kvapą.`,
      cta: "Susidaryti rinkinį"
    }
  ].filter(Boolean);
}
function heroHTML() {
  const slides = heroSlidesData();
  return `<section class="hero" aria-roledescription="carousel" aria-label="Pasiūlymai"><div class="railWrap heroWrap"><div class="rail heroRail">${slides
    .map((x, i) => {
      const H = i ? "h2" : "h1";
      return `<a class="slide" href="${x.href}" data-nav aria-roledescription="slide" aria-label="${i + 1} iš ${slides.length}: ${esc(x.title)}">${stageHTML(x.stage, x.list, { eager: !i, cls: "heroStage" })}<div class="slideIn">
<div class="heroTxt"><p class="eyebrow">${esc(x.eyebrow)}</p><${H} class="heroTitle">${esc(x.title)}</${H}>
<p class="heroLine">${esc(x.text)}</p>
<span class="heroCta">${esc(x.cta)}${glyph("chev-right")}</span></div>
</div></a>`;
    })
    .join("")}</div></div>${
    slides.length > 1
      ? `<div class="heroDots" role="tablist" aria-label="Skaidrės">${slides
          .map((x, i) => `<button type="button" role="tab" data-hero-go="${i}" aria-label="${esc(x.title)}" aria-selected="${!i}"></button>`)
          .join("")}</div>`
      : ""
  }</section>`;
}
// Taškai po skaidrėmis: rodo aktyvią, paspaudus – pereina
function syncHeroDots() {
  const rail = $("#homeHero .heroRail");
  if (!rail) return;
  const i = Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth));
  $$("#homeHero [data-hero-go]").forEach((b, n) => b.setAttribute("aria-selected", String(n === i)));
}
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-hero-go]");
  if (!b) return;
  const rail = $("#homeHero .heroRail");
  rail.scrollTo({ left: Number(b.dataset.heroGo) * rail.clientWidth, behavior: reduceMotion() ? "auto" : "smooth" });
});
// Skaidrės keičiasi pačios kas 6 s (sustoja palietus, užvedus pelę ar kai įjungtas „mažiau judesio“)
let heroTimer = 0;
function startHeroAuto() {
  clearInterval(heroTimer);
  const rail = $("#homeHero .heroRail");
  if (!rail || reduceMotion() || rail.children.length < 2) return;
  let hold = false;
  const stop = () => {
    hold = true;
  };
  ["pointerdown", "touchstart", "wheel", "focusin"].forEach(ev => rail.addEventListener(ev, stop, { passive: true, once: true }));
  rail.addEventListener("scroll", () => requestAnimationFrame(syncHeroDots), { passive: true });
  rail.addEventListener("mouseenter", () => (hold = true));
  rail.addEventListener("mouseleave", () => (hold = false));
  heroTimer = setInterval(() => {
    if (hold || document.hidden || !rail.isConnected || !$("#view-home").classList.contains("active")) return;
    const end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    rail.scrollTo({ left: end ? 0 : rail.scrollLeft + rail.clientWidth, behavior: "smooth" });
  }, 6000);
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
// Kategorijos plytelė (v7): visa plytelė – scena su tos grupės buteliukais (24-stage.js), pavadinimas ant sienos viršuje
function tileHTML({ name, href, list, sub, stage }) {
  return `<a class="tile" href="${href}" data-nav>${stageHTML(stage, list, { cls: "tileStage" })}<span class="tileTxt"><span class="tileName">${esc(name)}</span>${
    sub ? `<small>${esc(sub)}</small>` : ""
  }</span></a>`;
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
    { name: "Moterims", href: "moterims", stage: "women", list: of("moterims"), sub: plural(of("moterims").length, "kvapas", "kvapai", "kvapų") },
    { name: "Vyrams", href: "vyrams", stage: "men", list: of("vyrams"), sub: plural(of("vyrams").length, "kvapas", "kvapai", "kvapų") },
    { name: "Unisex", href: "unisex", stage: "unisex", list: of("unisex"), sub: plural(of("unisex").length, "kvapas", "kvapai", "kvapų") },
    { name: "Mėginukai", href: "meginukai", stage: "vials", list: byRank.slice(3), sub: `2 ml nuo ${eur(sampleFrom())}` },
    ...(DISC ? [{ name: "Rinkiniai", href: "rinkinys", stage: "set", list: byRank.slice(6), sub: `${DISC.count} × 2 ml už ${eur(DISC.price)}` }] : []),
    { name: "Naujienos", href: "kvepalai?rikiuoti=new", stage: "fresh", list: fresh, sub: "Naujausi kvapai" }
  ];
  $("#homeTiles").innerHTML = tiles.filter(t => t.list.length).map(tileHTML).join("");

  const sec = [
    { title: "Kvapnios naujienos", href: "kvepalai?rikiuoti=new", list: fresh.slice(0, 8) },
    { title: "Populiariausi moterims", line: "Kvapai, kuriuos dažniausiai renkasi moterys", href: "moterims", list: of("moterims") },
    { title: "Populiariausi vyrams", line: "Kvapai, kuriuos dažniausiai renkasi vyrai", href: "vyrams", list: of("vyrams") },
    { title: "Unisex kvapai", line: "Tinka visiems – be taisyklių", href: "unisex", list: of("unisex") },
    { title: "Didžiausios nuolaidos", line: "Kvapai, kuriems dabar taikoma nuolaida", href: "kvepalai", list: byRank.filter(p => inStock(p) && onSale(p)) },
    { title: "Mėginukai 2 ml", line: SET.sampleCredit ? "Išbandykite prieš pirkdami – kainą grąžinsime perkant buteliuką" : "Išbandykite namuose prieš pirkdami", href: "meginukai", list: byRank.filter(inStock).slice(0, 8), sample: true }
  ].filter(x => x.list.length >= 2);
  $("#homeRails").innerHTML = sec.map(railSecHTML).join("");
  bindRails($("#view-home"));

  renderReviews($("#homeReviews"), PRODUCTS, { band: true, title: "Leiskime pirkėjams kalbėti už mus", line: "Tikri atsiliepimai – rašo tik pirkę" });
  startHeroAuto();
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
function renderReviews(el, list, { title = "Pirkėjų atsiliepimai", showProduct = true, band = false, line = "" } = {}) {
  if (!el) return;
  const all = reviewsOf(list).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  el.hidden = !all.length;
  if (!all.length) return (el.innerHTML = "");
  const head = band
    ? `<h2 class="band">${esc(title)}</h2><div class="wrap">${line ? `<p class="revLine">${esc(line)}</p>` : ""}`
    : `<div class="secHead"><h2>${esc(title)}</h2></div>`;
  el.innerHTML = `${head}<div class="reviews">${all
    .slice(0, 9)
    .map(
      r =>
        `<figure class="review">${showProduct ? `<a class="art revArt" href="${productUrl(r.p)}" data-nav tabindex="-1" aria-hidden="true" style="--tint:${r.p.look.tint}">${artImg(r.p)}</a>` : ""}${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}${
          showProduct ? ` · <a href="${productUrl(r.p)}" data-nav>${esc(r.p.name)}</a>` : ""
        }${r.verified ? ` · <span class="verified">Patvirtintas pirkėjas</span>` : ""}</figcaption></figure>`
    )
    .join("")}</div>${band ? "</div>" : ""}`;
}
