// 10 – kvapo puslapis /kvepalai/<id>: naršymo kelias, galerija (nuotraukos braukiant arba buteliukas), pavadinimas,
// „Tiks …“, kaina, tūris / mėginukas, „Į krepšelį“ (telefone – ir prilipęs apačioje), pristatymo eilutė, mėginuko kainos
// grąžinimas, aprašymas, natų piramidė, savybės, atsiliepimai (tik tikri), „Jums gali patikti“; išparduotam – „Pranešti, kai bus“.
function meter(n) {
  return `<div class="meter" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;
}
function galleryHTML(p) {
  const imgs = (p.images || []).filter(Boolean);
  if (!imgs.length) return bottleSVG(p);
  return `<div class="gal" tabindex="0" aria-label="${esc(p.name)} nuotraukos">${imgs
    .map(
      (src, i) =>
        `<img src="${esc(src)}" alt="${esc(p.name)}${imgs.length > 1 ? ` – ${i + 1} iš ${imgs.length}` : ""}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" />`
    )
    .join("")}</div>${imgs.length > 1 ? `<div class="galDots" aria-hidden="true">${imgs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}`;
}
const shipLine = () =>
  `Išsiunčiame per ${SET.dispatch || "1–2 d. d."} · Nemokamai nuo ${eurShort(SET.freeShippingFrom)} · Grąžinimas ${SET.returnDays || 14} d.`;
function sampleNoteHTML() {
  return `<p class="pdNote" data-sample-note>${glyph("return")}<span>${esc(creditText())}${
    DISC ? ` <button class="linkBtn" type="button" data-disc>Arba ${DISC.count} mėginukai už ${eur(DISC.price)}</button>` : ""
  }</span></p>`;
}
function priceBlockHTML(p, ml) {
  const was = wasOf(p, ml);
  return `${was ? `<s class="money" data-buy-was>${eur(was)}</s>` : ""}<b class="money${was ? " sale" : ""}" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${sizeLabel(ml)}</small>`;
}
const accHTML = (ico, title, body, { open = false, id = "" } = {}) =>
  `<details class="acc"${open ? " open" : ""}><summary${id ? ` id="${id}"` : ""}><span class="accIco">${glyph(ico)}</span>${esc(title)}${glyph("chev-down")}</summary><div class="accBody">${body}</div></details>`;
function productPageHTML(p, ml) {
  const sizes = [...p.sizes.map(s => ({ ml: s.ml, price: s.price, was: s.was })), { ml: SAMPLE_ML, price: p.sample }];
  const sizeBtn = s =>
    `<button class="sizeOpt" type="button" role="radio" data-ml="${s.ml}" aria-checked="${s.ml === ml}"><b>${s.ml === SAMPLE_ML ? "2 ml" : `${s.ml} ml`}</b><span class="money">${eur(s.price)}</span><em class="per">${s.ml === SAMPLE_ML ? "mėginukas" : `${eur((s.price / s.ml) * 10).replace(/\s€/, " €")}/10 ml`}</em></button>`;
  const similar = PRODUCTS.filter(x => x.id !== p.id && inStock(x) && (x.family === p.family || x.gender === p.gender))
    .sort((a, b) => (b.family === p.family) - (a.family === p.family) || a.rank - b.rank)
    .slice(0, 8);
  const time = p.time.map(t => (t === "diena" ? "dienai" : "vakarui")).join(" ir ");
  const sold = !inStock(p);
  const rate = ratingOf(p);
  const cat = (p.categories || []).map(id => CATEGORY.get(id)).find(c => c && c.visible !== false);
  const crumbs = [
    { name: "Pradžia", href: "./" },
    { name: GENDER_TITLE[p.gender] || "Kvepalai", href: p.gender in GENDER_TITLE ? p.gender : "kvepalai" },
    ...(cat ? [{ name: cat.name, href: `kategorija/${cat.id}` }] : []),
    { name: p.name }
  ];
  const buyBtn = sold
    ? `<button class="btn primary" type="button" data-notify="${p.id}">${glyph("bell")}Pranešti, kai bus</button>`
    : `<button class="btn primary" type="button" data-add>${glyph("bag")}Į krepšelį</button>`;
  const notes = `<div class="pyr">
<div class="pyrRow"><span class="pyrLab"><i></i>Viršutinės</span><span class="pyrNotes">${p.notes.top.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
<div class="pyrRow"><span class="pyrLab"><i></i>Širdies</span><span class="pyrNotes">${p.notes.heart.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
<div class="pyrRow"><span class="pyrLab"><i></i>Bazinės</span><span class="pyrNotes">${p.notes.base.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
</div>`;
  const facts = `<div class="facts">
<div class="fact"><small>Ilgaamžiškumas</small><b>${LASTS[p.longevity]}</b>${meter(p.longevity)}</div>
<div class="fact"><small>Sklaida</small><b>${LEVEL[p.sillage]}</b>${meter(p.sillage)}</div>
<div class="fact"><small>Sezonas</small><b>${p.seasons.map(s => SEASON_NAME[s] || s).join(", ")}</b></div>
<div class="fact"><small>Koncentracija</small><b>${esc(CONC_NAME[p.conc] || p.conc)}</b></div>
</div>`;
  const who = `<p>${esc(GENDER_NAME[p.gender])} · ${esc(familyName(p.family))} kvapas · tinka ${esc(time)}.</p><p>${esc(suitsLine(p))}.</p>`;
  const ship = `<ul class="accList"><li>${SET.shipping.map(o => `${esc(o.name)} – ${eur(o.price)} (${esc(o.days)})`).join("</li><li>")}</li><li>Nemokamai, kai užsakymas nuo ${eurShort(SET.freeShippingFrom)}</li><li>Išsiunčiame per ${esc(SET.dispatch || "1–2 d. d.")}</li><li>Grąžinimas per ${SET.returnDays || 14} d. – <a href="pagalba#grazinimas" data-nav>kaip grąžinti</a></li></ul>`;
  const use = `<ul class="accList"><li>Purkškite ant pulsuojančių vietų – riešų, kaklo, už ausų – iš 15–20 cm atstumo.</li><li>Netrinkite – leiskite kvapui atsiskleisti pačiam.</li><li>Ant švarios, sudrėkintos odos kvapas išsilaiko ilgiau.</li><li>Laikykite vėsioje, nuo saulės apsaugotoje vietoje.</li></ul>`;
  return `<nav class="crumbs" aria-label="Naršymo kelias">${crumbsHTML(crumbs)}</nav>
<header class="pdHead"><h1 class="pdH1"><span>${esc(p.name)}</span></h1><p class="pdKey">${keyNotes(p).map(esc).join(" · ")}</p>${
    rate ? `<p class="pdRate">${starsHTML(rate.avg)}<button class="linkBtn" type="button" data-scroll-to="pdReviews">${plural(rate.n, "atsiliepimas", "atsiliepimai", "atsiliepimų")}</button></p>` : ""
  }</header>
<article class="pd${sold ? " sold" : ""}" style="--tint:${p.look.tint};--liquid:${p.look.liquid}">
<div class="pdGal${p.images?.length ? " hasPhoto" : ""}">
<div class="pdTools"><button class="roundBtn" type="button" data-share="${p.id}" aria-label="Dalintis">${glyph("share")}</button>${heartBtn(p)}</div>
${galleryHTML(p)}
<div class="pdBadges"><span class="pill glass">${esc(GENDER_NAME[p.gender])}</span><span class="pill glass">${esc(p.conc)}</span>${
    sold ? `<span class="pill glass soldPill">Laikinai išparduota</span>` : onSale(p) ? `<span class="pill glass salePill">Akcija</span>` : p.badge ? `<span class="pill glass">${esc(p.badge)}</span>` : ""
  }</div>
</div>
<div class="pdInfo">
<p class="pdTag"><b>${esc(p.name)}</b> – ${esc(p.tagline)}</p>
<p class="pdSuits">${glyph(p.time.includes("vakaras") && !p.time.includes("diena") ? "moon" : "sun")}${esc(suitsLine(p))}</p>
<div class="pdPrice">${sold ? `<b>Laikinai išparduota</b>` : priceBlockHTML(p, ml)}</div>
<p class="pdLabel">Tūris</p>
<div class="sizes" role="radiogroup" aria-label="Tūris">${sizes.map(sizeBtn).join("")}</div>
${sold ? "" : `<p class="pdLabel">Kiekis</p>`}
<div class="pdBuy" data-buy-anchor>${
    sold
      ? ""
      : `<div class="qty" role="group" aria-label="Kiekis"><button type="button" data-qty-step="-1" aria-label="Mažiau">${glyph("minus")}</button><output data-qty>1</output><button type="button" data-qty-step="1" aria-label="Daugiau">${glyph("plus")}</button></div>`
  }${buyBtn}<button class="btn ghost heartBtn" type="button" data-fav="${p.id}" aria-pressed="${state.fav.has(p.id)}" aria-label="Į mėgstamus"><svg class="gl" viewBox="0 0 24 24">${GLYPH.heart}</svg></button></div>
<p class="pdShip">${glyph("truck")}<span>${esc(shipLine())}</span></p>
<div data-note-slot>${ml === SAMPLE_ML && !sold ? sampleNoteHTML() : ""}</div>
<p class="pdDesc">${esc(p.desc)}</p>
<div class="accs">
${accHTML("drop", "Kvapo natos", notes, { open: true, id: "pdNotesH" })}
${accHTML("chart", "Savybės", facts, { id: "pdFactsH" })}
${accHTML("user", "Kam skirti", who)}
${accHTML("truck", "Pristatymas ir grąžinimas", ship)}
${accHTML("spark", "Kaip naudoti", use)}
</div>
</div>
<div class="pdBelow">
<section class="sec" id="pdReviews" data-pd-reviews hidden></section>
${
  similar.length
    ? `<section class="hsec pdSimilar"><h2 class="band">Jums gali patikti</h2><div class="wrap"><p class="secLine"><span>${esc(familyName(p.family))} ir panašūs kvapai</span><a href="kvepalai?seima=${encodeURIComponent(
        p.family
      )}" data-nav>Peržiūrėti</a></p>${railHTML(similar.map(x => cardHTML(x)).join(""))}</div></section>`
    : ""
}
</div>
</article>
<div class="buyBar" id="buyBar"><span class="price">${sold ? `<b>Išparduota</b><small>${esc(p.name)}</small>` : `<b class="money" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${esc(p.name)} · ${sizeLabel(ml)}</small>`}</span>${buyBtn}</div>`;
}
function bindGallery(root) {
  const gal = $(".gal", root);
  const dots = $$(".galDots i", root);
  if (!gal || dots.length < 2) return;
  gal.addEventListener(
    "scroll",
    () => {
      const i = Math.round(gal.scrollLeft / gal.clientWidth);
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
    },
    { passive: true }
  );
}
let buyObs = null;
const pdState = { id: null, ml: null, qty: 1 };
function renderProduct(id, params) {
  const p = BY_ID.get(id);
  const root = $("#productRoot");
  if (!p || p.visible === false) return false;
  const ml = Number(params?.get("ml")) === SAMPLE_ML ? SAMPLE_ML : defaultMl(p);
  pdState.id = id;
  pdState.ml = ml;
  pdState.qty = 1;
  root.innerHTML = productPageHTML(p, ml);
  document.title = `${p.name} – ${CONC_NAME[p.conc] || p.conc} | ${SET.shop}`;
  renderReviews($("[data-pd-reviews]", root), [p], { title: "Atsiliepimai", showProduct: false });
  bindGallery(root);
  bindRails(root);
  track("Peržiūrėjo kvapą", { kvapas: p.name });
  // Telefone prilipęs „Į krepšelį“ pasirodo, kai pagrindinis mygtukas išslenka iš ekrano
  buyObs?.disconnect();
  const bar = $("#buyBar", root);
  buyObs = new IntersectionObserver(([en]) => bar.classList.toggle("show", !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 });
  buyObs.observe($("[data-buy-anchor]", root));
  return true;
}
function bindProduct() {
  $("#productRoot").addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const p = BY_ID.get(pdState.id);
    if (!p) return;
    const root = $("#productRoot");
    const size = t?.closest("[data-ml]");
    if (size && size.matches(".sizeOpt")) {
      pdState.ml = Number(size.dataset.ml);
      $$(".sizeOpt", root).forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.ml) === pdState.ml)));
      if (inStock(p)) {
        $$("[data-buy-price]", root).forEach(el => (el.textContent = eur(priceOf(p, pdState.ml))));
        $(".pdPrice", root).innerHTML = priceBlockHTML(p, pdState.ml);
        $("#buyBar [data-buy-size]", root).textContent = `${p.name} · ${sizeLabel(pdState.ml)}`;
        $("[data-note-slot]", root).innerHTML = pdState.ml === SAMPLE_ML ? sampleNoteHTML() : "";
      }
      return;
    }
    const qs = t?.closest("[data-qty-step]");
    if (qs) {
      pdState.qty = Math.max(1, Math.min(SET.maxQty, pdState.qty + Number(qs.dataset.qtyStep)));
      $("[data-qty]", root).textContent = pdState.qty;
      return;
    }
    const add = t?.closest("[data-add]");
    if (add) {
      addToCart(p.id, pdState.ml, pdState.qty);
      pdState.qty = 1;
      const qo = $("[data-qty]", root);
      if (qo) qo.textContent = "1";
      $$("[data-add]", root).forEach(b => {
        b.innerHTML = `${glyph("check")}Įdėta`;
        b.classList.add("added");
      });
      setTimeout(() => $$("[data-add]", root).forEach(b => ((b.innerHTML = `${glyph("bag")}Į krepšelį`), b.classList.remove("added"))), 1400);
      openMiniCart({ added: `${p.name} · ${sizeLabel(pdState.ml)}` });
    }
  });
}
// Dalintis – švari nuoroda į kvapo puslapį
async function shareProduct(id) {
  const p = BY_ID.get(id);
  const url = absUrl(`kvepalai/${id}`);
  try {
    if (navigator.share) return await navigator.share({ title: `${p.name} – ${SET.shop}`, text: p.tagline, url });
    await navigator.clipboard.writeText(url);
    toast("Nuoroda nukopijuota", { icon: "copy" });
  } catch (err) {
    if (err?.name !== "AbortError") toast(url, { icon: "share", ms: 5000 });
  }
}
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-share]");
  if (b) shareProduct(b.dataset.share);
});
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-scroll-to]");
  if (b) document.getElementById(b.dataset.scrollTo)?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
});
