// 10 – kvepalų lapas: nuotraukos (galerija braukiant) arba buteliukas, tūris / mėginukas, „Tiks …“, pristatymo eilutė,
// natų piramidė, ilgaamžiškumas, sklaida, sezonas, atsiliepimai (tik tikri), panašūs, „Į krepšelį“ arba „Pranešti, kai bus“.
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
    DISC ? ` <button class="linkBtn" data-disc>Arba ${DISC.count} mėginukai už ${eur(DISC.price)}</button>` : ""
  }</span></p>`;
}
function productHTML(p, ml) {
  const sizes = [...p.sizes.map(s => ({ ml: s.ml, price: s.price })), { ml: SAMPLE_ML, price: p.sample }];
  const sizeBtn = s =>
    `<button class="sizeOpt" role="radio" data-ml="${s.ml}" aria-checked="${s.ml === ml}"><b>${s.ml === SAMPLE_ML ? "2 ml" : `${s.ml} ml`}</b><span class="money">${eur(s.price)}</span><em class="per">${s.ml === SAMPLE_ML ? "mėginukas" : `${eur((s.price / s.ml) * 10).replace(/\s€/, " €")}/10 ml`}</em></button>`;
  const similar = PRODUCTS.filter(x => x.id !== p.id && inStock(x) && (x.family === p.family || x.gender === p.gender))
    .sort((a, b) => (b.family === p.family) - (a.family === p.family) || a.rank - b.rank)
    .slice(0, 6);
  const time = p.time.map(t => (t === "diena" ? "Diena" : "Vakaras")).join(" · ");
  const sold = !inStock(p);
  return `<div class="pd${sold ? " sold" : ""}" style="--tint:${p.look.tint};--liquid:${p.look.liquid}">
<div class="pdHero${p.images?.length ? " hasPhoto" : ""}">
<div class="pdTop"><button class="roundBtn" data-sheet-close aria-label="Uždaryti">${glyph(isDesktop() ? "x" : "chev-down")}</button><span class="pdTopR"><button class="roundBtn glassBtn" data-share="${p.id}" aria-label="Dalintis">${glyph("share")}</button>${heartBtn(p)}</span></div>
${galleryHTML(p)}
<div class="pdBadges"><span class="pill glass">${esc(GENDER_NAME[p.gender])}</span><span class="pill glass">${esc(CONC_NAME[p.conc] || p.conc)}</span>${
    sold ? `<span class="pill glass soldPill">Laikinai išparduota</span>` : p.badge ? `<span class="pill glass">${esc(p.badge)}</span>` : ""
  }</div>
</div>
<div class="pdRight">
<div class="pdMain">
<div class="pdTitle"><h2 id="sheetTitle">${esc(p.name)}</h2><span class="pill blue">${esc(familyName(p.family))}</span></div>
<p class="pdTag">${esc(p.tagline)}</p>
<p class="pdSuits">${glyph(p.time.includes("vakaras") && !p.time.includes("diena") ? "moon" : "sun")}${esc(suitsLine(p))}</p>
<div class="sizes" role="radiogroup" aria-label="Tūris">${sizes.map(sizeBtn).join("")}</div>
<p class="pdShip">${glyph("truck")}<span>${esc(shipLine())}</span></p>
<div data-note-slot>${ml === SAMPLE_ML && !sold ? sampleNoteHTML() : ""}</div>
<p class="pdDesc">${esc(p.desc)}</p>
<div class="pyr" aria-label="Kvapo natos">
<div class="pyrRow"><span class="pyrLab"><i></i>Viršutinės</span><span class="pyrNotes">${p.notes.top.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
<div class="pyrRow"><span class="pyrLab"><i></i>Širdies</span><span class="pyrNotes">${p.notes.heart.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
<div class="pyrRow"><span class="pyrLab"><i></i>Bazinės</span><span class="pyrNotes">${p.notes.base.map(n => `<span>${esc(n)}</span>`).join("")}</span></div>
</div>
<div class="facts">
<div class="fact"><small>Ilgaamžiškumas</small><b>${LASTS[p.longevity]}</b>${meter(p.longevity)}</div>
<div class="fact"><small>Sklaida</small><b>${LEVEL[p.sillage]}</b>${meter(p.sillage)}</div>
<div class="fact"><small>Sezonas</small><b>${p.seasons.map(s => SEASON_NAME[s] || s).join(", ")}</b></div>
<div class="fact"><small>Paros metas</small><b>${time}</b></div>
</div>
<section class="block" data-pd-reviews hidden></section>
${
  similar.length
    ? `<section class="block"><div class="blockHead"><h2>Jums gali patikti</h2></div><div class="rail">${similar.map(x => cardHTML(x)).join("")}</div></section>`
    : ""
}
</div>
${
  sold
    ? `<div class="buyBar"><span class="price"><b>Laikinai išparduota</b><small>Pranešime el. paštu, kai vėl turėsime</small></span><button class="btn primary" data-notify="${p.id}">${glyph("bell")}Pranešti, kai bus</button></div>`
    : `<div class="buyBar"><span class="price"><b class="money" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${sizeLabel(ml)}</small></span><button class="btn primary" data-add>${glyph("bag")}Į krepšelį</button></div>`
}
</div>
</div>`;
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
function openProduct(id, { sample = false, ml = null } = {}) {
  const p = BY_ID.get(id);
  if (!p) return;
  let sel = ml ?? (sample ? SAMPLE_ML : (p.sizes.find(s => s.ml === 50) || p.sizes[0]).ml);
  openSheet({ html: productHTML(p, sel), wide: true, url: `#/kvepalai/${p.id}` });
  track("Peržiūrėjo kvapą", { kvapas: p.name });
  const root = $("#sheetBody");
  renderReviews($("[data-pd-reviews]", root), [p], { title: "Atsiliepimai", showProduct: false });
  bindGallery(root);
  root.addEventListener("click", e => {
    const size = e.target.closest("[data-ml]");
    if (size) {
      sel = Number(size.dataset.ml);
      $$("[data-ml]", root).forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.ml) === sel)));
      if (inStock(p)) {
        $("[data-buy-price]", root).textContent = eur(priceOf(p, sel));
        $("[data-buy-size]", root).textContent = sizeLabel(sel);
        $("[data-note-slot]", root).innerHTML = sel === SAMPLE_ML ? sampleNoteHTML() : "";
      }
      return;
    }
    const add = e.target.closest("[data-add]");
    if (add) {
      addToCart(p.id, sel);
      add.innerHTML = `${glyph("check")}Įdėta`;
      add.classList.add("added");
      setTimeout(() => {
        add.innerHTML = `${glyph("bag")}Į krepšelį`;
        add.classList.remove("added");
      }, 1400);
      toast(`${p.name} · ${sizeLabel(sel)} – krepšelyje`, {
        icon: "bag",
        action: "Peržiūrėti",
        onAction: () => {
          closeSheet();
          setTimeout(() => showTab("cart", { top: true }), 260);
        }
      });
    }
  });
}
// Dalintis – švari nuoroda į statinį kvapo puslapį (kvepalai/<id>, žr. tools/build-site.mjs)
async function shareProduct(id) {
  const p = BY_ID.get(id);
  const url = new URL(`kvepalai/${id}`, document.baseURI).href;
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
