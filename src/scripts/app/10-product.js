// 10 – kvepalų lapas: buteliukas, tūris / mėginukas, natų piramidė, ilgaamžiškumas, sklaida, sezonas, panašūs, „Į krepšelį“.
function meter(n) {
  return `<div class="meter" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;
}
function productHTML(p, ml) {
  const sizes = [...p.sizes.map(s => ({ ml: s.ml, price: s.price })), { ml: SAMPLE_ML, price: p.sample }];
  const sizeBtn = s =>
    `<button class="sizeOpt" role="radio" data-ml="${s.ml}" aria-checked="${s.ml === ml}"><b>${s.ml === SAMPLE_ML ? "2 ml" : `${s.ml} ml`}</b><span class="money">${eur(s.price)}</span><em class="per">${s.ml === SAMPLE_ML ? "mėginukas" : `${eur((s.price / s.ml) * 10).replace(/\s€/, " €")}/10 ml`}</em></button>`;
  const similar = PRODUCTS.filter(x => x.id !== p.id && (x.family === p.family || x.gender === p.gender))
    .sort((a, b) => (b.family === p.family) - (a.family === p.family) || a.rank - b.rank)
    .slice(0, 6);
  const time = p.time.map(t => (t === "diena" ? "Diena" : "Vakaras")).join(" · ");
  return `<div class="pd" style="--tint:${p.look.tint};--liquid:${p.look.liquid}">
<div class="pdHero">
<div class="pdTop"><button class="roundBtn" data-sheet-close aria-label="Uždaryti">${glyph(isDesktop() ? "x" : "chev-down")}</button>${heartBtn(p)}</div>
${bottleSVG(p)}
<div class="pdBadges"><span class="pill glass">${esc(GENDER_NAME[p.gender])}</span><span class="pill glass">${esc(CONC_NAME[p.conc] || p.conc)}</span>${p.badge ? `<span class="pill glass">${esc(p.badge)}</span>` : ""}</div>
</div>
<div class="pdRight">
<div class="pdMain">
<div class="pdTitle"><h2 id="sheetTitle">${esc(p.name)}</h2><span class="pill blue">${esc(familyName(p.family))}</span></div>
<p class="pdTag">${esc(p.tagline)}</p>
<div class="sizes" role="radiogroup" aria-label="Tūris">${sizes.map(sizeBtn).join("")}</div>
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
${
  similar.length
    ? `<section class="block"><div class="blockHead"><h2>Jums gali patikti</h2></div><div class="rail">${similar.map(x => cardHTML(x)).join("")}</div></section>`
    : ""
}
</div>
<div class="buyBar"><span class="price"><b class="money" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${sizeLabel(ml)}</small></span><button class="btn primary" data-add>${glyph("bag")}Į krepšelį</button></div>
</div>
</div>`;
}
function openProduct(id, { sample = false, ml = null } = {}) {
  const p = BY_ID.get(id);
  if (!p) return;
  let sel = ml ?? (sample ? SAMPLE_ML : (p.sizes.find(s => s.ml === 50) || p.sizes[0]).ml);
  openSheet({ html: productHTML(p, sel), wide: true, url: `#/kvepalai/${p.id}` });
  const root = $("#sheetBody");
  root.addEventListener("click", e => {
    const size = e.target.closest("[data-ml]");
    if (size) {
      sel = Number(size.dataset.ml);
      $$("[data-ml]", root).forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.ml) === sel)));
      $("[data-buy-price]", root).textContent = eur(priceOf(p, sel));
      $("[data-buy-size]", root).textContent = sizeLabel(sel);
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
