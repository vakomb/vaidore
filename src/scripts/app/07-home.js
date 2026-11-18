// 07 – Pradžia: skaidrės, bėganti juosta, produktų plytelės, karuselės, atsiliepimai (tik tikri).
// Pradžia (kaip parfumada.lt): skaidrės (kolekcija · mėginukai · rinkinys) → bėganti privalumų juosta → „Produktai“
// (plytelės) → karuselės (naujienos, populiariausi moterims / vyrams / unisex, nuolaidos, mėginukai) → atsiliepimai.
// Skyrių antraštės – tamsios juostos per visą plotį.
const sampleFrom = () => Math.min(...PRODUCTS.map(p => p.sample));
// Pradžios skaidrės ir plytelės – iš nustatymų (25-home-config.js, administravimo skydelis „Pradžia“):
// nuotrauka arba Vaidore scena (24-stage.js), trumpas tekstas ir VIENAS aiškus veiksmas.
// Aukštis fiksuotas (CSS) – keičiantis skaidrėms ir kraunantis nuotraukoms niekas nepasislenka.
const slideBg = (x, i) => (x.image ? photoHTML(x, { eager: !i, cls: "heroStage" }) : stageHTML(x.stage, x.list, { eager: !i, cls: "heroStage" }));
function heroHTML() {
  const slides = homeSlides();
  if (!slides.length) return "";
  return `<section class="hero" aria-roledescription="carousel" aria-label="Pasiūlymai"><div class="railWrap heroWrap"><div class="rail heroRail">${slides
    .map((x, i) => {
      const H = i ? "h2" : "h1";
      // Tik nuotrauka: su nuoroda – visa skaidrė paspaudžiama, be nuorodos – tiesiog paveikslas; pavadinimas – skaitytuvams
      if (x.textless) {
        const tag = x.href ? "a" : "div";
        return `<${tag} class="slide hasPhoto textless"${x.href ? ` href="${esc(x.href)}" data-nav` : ""} aria-roledescription="slide" aria-label="${i + 1} iš ${slides.length}: ${esc(
          x.title
        )}">${slideBg(x, i)}<${H} class="sr">${esc(x.title)}</${H}></${tag}>`;
      }
      return `<a class="slide${x.dark ? " onDark" : ""}${x.image ? " hasPhoto" : ""}${/\n\s*\S/.test(x.text || "") ? " claims" : ""}" href="${esc(x.href)}" data-nav aria-roledescription="slide" aria-label="${i + 1} iš ${slides.length}: ${esc(x.title)}">${slideBg(x, i)}<div class="slideIn">
<div class="heroTxt">${x.eyebrow ? `<p class="eyebrow">${esc(x.eyebrow)}</p>` : ""}<${H} class="heroTitle">${esc(x.title)}</${H}>
${heroTextHTML(x.text)}
${x.cta ? `<span class="heroCta">${esc(x.cta)}${glyph("chev-right")}</span>` : ""}</div>
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
// Skaidrės tekstas: viena eilutė – sakinys; kelios – teiginiai su auksinėmis linijomis (kaip parfumada.lt)
function heroTextHTML(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map(t => t.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.length === 1 ? `<p class="heroLine">${esc(lines[0])}</p>` : `<ul class="heroClaims">${lines.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
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
  const secs = Number(SET.slideSeconds ?? 6);
  if (!rail || reduceMotion() || rail.children.length < 2 || !(secs > 0) || PREVIEW) return;
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
  }, secs * 1000);
}
// Bėganti juosta (kaip parfumada.lt): emoji + tikri parduotuvės privalumai (iš nustatymų)
function marqueeHTML() {
  const allEdp = PRODUCTS.length && PRODUCTS.every(p => p.conc === "EDP");
  const items = [
    ["💧", allEdp ? "Eau de Parfum koncentracija" : "Mėginukai 2 ml"],
    ["🚚", `Nemokamas pristatymas nuo ${eurShort(SET.freeShippingFrom)}`],
    ["⏳", `Išsiunčiame per ${SET.dispatch || "1–2 d. d."}`],
    ["✨", allEdp ? "Mėginukai 2 ml" : "Nišiniai kvapai"],
    ["↩️", `Grąžinimas per ${SET.returnDays || 14} d.`],
    ["🔒", "Saugus apmokėjimas"]
  ];
  const row = hidden => `<ul class="mqRow"${hidden ? ' aria-hidden="true"' : ""}>${items.map(([i, t]) => `<li><span class="mqIco" aria-hidden="true">${i}</span>${esc(t)}</li>`).join("")}</ul>`;
  return `<div class="mqTrack">${row(false)}${row(true)}</div>`;
}
// Greitis kaip parfumada.lt (~41 px/s), nepriklausomai nuo teksto ilgio
function syncMarquee() {
  const row = $("#homeMarquee .mqRow");
  if (row) $("#homeMarquee").style.setProperty("--mqDur", `${Math.max(12, row.scrollWidth / 41).toFixed(1)}s`);
}

// Kategorijos plytelė (kaip parfumada.lt): pavadinimas VIRŠ paveikslo (22,75 px / 700, didžiosiomis), po juo – paveikslas
// 4:5 su apvalintais kampais (nuotrauka arba scena su tos grupės buteliukais – 24-stage.js).
function tileHTML({ name, href, list, stage, image, focus, dark }) {
  const bg = image ? photoHTML({ image, focus }, { cls: "tileStage" }) : stageHTML(stage, list, { cls: "tileStage" });
  return `<a class="tile${dark ? " onDark" : ""}${image ? " hasPhoto" : ""}" href="${href}" data-nav><span class="tileName">${esc(name)}</span><span class="tileArt">${bg}</span></a>`;
}
// Skyrius su juosta ir karusele (rodyklės ir „1/3“, kaip parfumada.lt)
function railHTML(cards) {
  return `<div class="railWrap"><div class="rail">${cards}</div><div class="railNav" hidden><button class="railBtn" type="button" data-rail-step="-1" aria-label="Atgal">${glyph(
    "chev-left"
  )}</button><span class="railPage" aria-live="polite"></span><button class="railBtn" type="button" data-rail-step="1" aria-label="Pirmyn">${glyph("chev-right")}</button></div></div>`;
}
function railSecHTML({ title, line, href, list }) {
  return `<section class="hsec"><h2 class="band">${esc(title)}</h2><div class="wrap">${
    line ? `<p class="secLine"><span>${esc(line)}</span><a href="${href}" data-nav>Peržiūrėti</a></p>` : ""
  }${railHTML(list.map(p => cardHTML(p)).join(""))}</div></section>`;
}
function syncRail(wrap) {
  const rail = $(".rail", wrap);
  const nav = $(".railNav", wrap);
  if (!rail || !nav) return;
  const pages = Math.max(1, Math.round(rail.scrollWidth / Math.max(1, rail.clientWidth)));
  nav.hidden = pages < 2;
  const cur = Math.min(pages, Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)) + 1);
  $(".railPage", nav).textContent = `${cur}/${pages}`;
  $(".railPage", nav).setAttribute("aria-label", `${cur} iš ${pages}`);
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
  requestAnimationFrame(syncMarquee);
  document.fonts?.ready.then(syncMarquee);
  const byRank = [...PRODUCTS].sort((a, b) => a.rank - b.rank);
  const fresh = [...PRODUCTS].sort((a, b) => String(b.added).localeCompare(String(a.added)));
  const of = g => byRank.filter(p => p.gender === g);
  const tiles = homeTiles();
  $("#homeTiles").innerHTML = tiles.map(tileHTML).join("");
  $("#homeTiles").closest(".hsec").hidden = !tiles.length;

  const sec = [
    { title: "Kvapnios naujienos", href: "kvepalai?rikiuoti=new", list: fresh.slice(0, 8) },
    { title: "Populiariausi moterims", line: "Kvapai, kuriuos dažniausiai renkasi moterys", href: "moterims", list: of("moterims") },
    { title: "Populiariausi vyrams", line: "Kvapai, kuriuos dažniausiai renkasi vyrai", href: "vyrams", list: of("vyrams") },
    { title: "Unisex kvapai", line: "Tinka visiems – be taisyklių", href: "unisex", list: of("unisex") },
    { title: "Didžiausios nuolaidos", line: "Kvapai, kuriems dabar taikoma nuolaida", href: "nuolaidos", list: saleList() }
  ].filter(x => x.list.length); // skyrius rodomas, jei yra bent vienas kvapas
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
