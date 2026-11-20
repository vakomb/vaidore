// 10 – kvapo puslapis /kvepalai/<id> (kaip parfumada.lt): PAVADINIMAS tarp linijų ir natos, švari galerija
// (nuotraukos braukiant arba buteliukas), aprašymas, išskleidžiamos dalys (Kam skirti, Natos, Ingredientai, Pristatymas),
// kaina, talpa (33 ml / 100 ml / 2 ml mėginukas), kiekis, „Įdėti į krepšelį“, pristatymo eilutė, „Į mėgstamus“ / „Dalintis“,
// atsiliepimai (tik tikri), „Jums gali patikti“. Prilipusi pirkimo juosta: telefone – praslinkus mygtuką, kompiuteryje –
// kai mygtuko nesimato (nuotrauka, pavadinimas, kaina, kiekis, mygtukas – kaip parfumada.lt). Išparduotam – „Pranešti, kai bus“.
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
  `Išsiunčiame per ${nb(SET.dispatch || "1–2 d. d.")} · Nemokamai nuo ${eurShort(SET.freeShippingFrom)} · Grąžinimas per ${SET.returnDays || 14} d.`;
function sampleNoteHTML() {
  return `<p class="pdNote" data-sample-note>${glyph("return")}<span>${esc(creditText())}${
    DISC ? ` <button class="linkBtn" type="button" data-disc>Arba ${DISC.count} mėginukai už ${eur(DISC.price)}</button>` : ""
  }</span></p>`;
}
function priceBlockHTML(p, ml) {
  const was = wasOf(p, ml);
  return `${was ? `<s class="money" data-buy-was>${eur(was)}</s>` : ""}<b class="money${was ? " sale" : ""}" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${sizeLabel(ml, p)}</small>${
    was ? `<span class="pill salePill">Akcija</span>` : ""
  }`;
}
const accHTML = (ico, title, body, { open = false, id = "" } = {}) =>
  `<details class="acc"${open ? " open" : ""}><summary${id ? ` id="${id}"` : ""}><span class="accIco">${glyph(ico)}</span>${esc(title)}${glyph("chev-down")}</summary><div class="accBody">${body}</div></details>`;
const qtyHTML = (cls = "") =>
  `<div class="qty${cls}" role="group" aria-label="Kiekis"><button type="button" data-qty-step="-1" aria-label="Mažiau">${glyph("minus")}</button><output data-qty>${pdState.qty}</output><button type="button" data-qty-step="1" aria-label="Daugiau">${glyph("plus")}</button></div>`;
function productPageHTML(p, ml) {
  const sizes = [...p.sizes.map(s => ({ ml: s.ml, price: s.price, was: s.was })), ...(hasSample(p) ? [{ ml: SAMPLE_ML, price: p.sample }] : [])];
  const sizeBtn = s =>
    `<button class="sizeOpt" type="button" role="radio" data-ml="${s.ml}" aria-checked="${s.ml === ml}" aria-label="${sizeLabel(s.ml, p)}, ${eur(s.price)}"><b>${
      s.ml === SAMPLE_ML && isPerfume(p) ? "2 ml mėginukas" : sizeLabel(s.ml, p)
    }</b></button>`;
  const device = typeOf(p) === "elektriniai-difuzoriai";
  const attrs = attrList(p);
  const similar = PRODUCTS.filter(x => x.id !== p.id && inStock(x) && typeOf(x) === typeOf(p) && (x.family === p.family || x.gender === p.gender || !isPerfume(p)))
    .sort((a, b) => (b.family === p.family) - (a.family === p.family) || a.rank - b.rank)
    .slice(0, 8);
  const sold = !inStock(p);
  const rate = ratingOf(p);
  const buyBtn = sold
    ? `<button class="btn primary" type="button" data-notify="${p.id}">${glyph("bell")}Pranešti, kai bus</button>`
    : `<button class="btn primary" type="button" data-add>Įdėti į krepšelį</button>`;
  // Natos – trys eilutės (kaip parfumada.lt): „Viršutinės natos: …“
  const noteRow = (lab, list) => `<div><dt>${lab}</dt><dd>${list.map(esc).join(" · ")}</dd></div>`;
  const notes = `<dl class="pdNotes">${noteRow("Viršutinės natos", p.notes.top)}${noteRow("Širdies natos", p.notes.heart)}${noteRow("Bazinės natos", p.notes.base)}</dl>`;
  // Kam skirti – kiekvienas faktas po kartą: lytis, kvapų šeima, kada, metų laikai
  const { when, seasons } = suitsParts(p);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const who = `<ul class="accList">${[
    p.gender === "unisex" ? "Unisex – moterims ir vyrams" : GENDER_NAME[p.gender],
    familyName(p.family) && `${familyName(p.family)} kvapai`,
    cap(when),
    seasons && cap(seasons),
    (p.occasions || []).length && `Proga: ${(p.occasions || []).map(o => (OCCASION_NAME[o] || "").toLowerCase()).filter(Boolean).join(", ")}`
  ]
    .filter(Boolean)
    .map(t => `<li>${esc(t)}</li>`)
    .join("")}</ul>`;
  const ship = `<ul class="accList"><li>${SET.shipping.map(o => `${esc(o.name)} – ${eur(o.price)} (${esc(nb(o.days))})`).join("</li><li>")}</li><li>Nemokamai, kai užsakymas nuo ${eurShort(SET.freeShippingFrom)}</li><li>Išsiunčiame per ${esc(nb(SET.dispatch || "1–2 d. d."))}</li><li>Grąžinimas per ${SET.returnDays || 14} d. – <a href="pagalba#grazinimas" data-nav>kaip grąžinti</a></li></ul>`;
  return `<header class="pdHead"><h1 class="pdH1"><span>${esc(p.name)}</span></h1>${
    inspiredOf(p) ? `<p class="pdInsp">Įkvėpti <b>${esc(inspiredOf(p))}</b></p>` : ""
  }<p class="pdKey">${keyLine(p)}</p>${
    rate ? `<p class="pdRate">${starsHTML(rate.avg)}<button class="linkBtn" type="button" data-scroll-to="pdReviews">${plural(rate.n, "atsiliepimas", "atsiliepimai", "atsiliepimų")}</button></p>` : ""
  }</header>
<article class="pd${sold ? " sold" : ""}" style="--tint:${p.look.tint};--liquid:${p.look.liquid}">
<div class="pdGal${p.images?.length ? " hasPhoto" : ""}">
${galleryHTML(p)}
</div>
<div class="pdInfo">
<p class="pdTag"><b>${esc(p.name)}</b> – ${esc(p.tagline)}.</p>
<p class="pdDesc">${esc(p.desc)}</p>
<div class="accs">
${isPerfume(p) ? accHTML("user", "Kam skirti", who) : ""}
${keyNotes(p).length ? accHTML("drop", "Natos", notes, { id: "pdNotesH" }) : ""}
${attrs.length ? accHTML("info", "Savybės", `<dl class="pdNotes">${attrs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`, { open: device }) : ""}
${p.ingredients ? accHTML("doc", "Ingredientai", `<p>${esc(p.ingredients)}</p>`) : ""}
${accHTML("truck", "Pristatymas ir grąžinimas", ship)}
</div>
<div class="pdPrice">${sold ? `<b>Laikinai išparduota</b>` : priceBlockHTML(p, ml)}</div>
${
  device
    ? ""
    : `<p class="pdLabel">${typeOf(p) === "zvakes" ? "Svoris" : "Talpa"}</p>
<div class="sizes" role="radiogroup" aria-label="${typeOf(p) === "zvakes" ? "Svoris" : "Talpa"}">${sizes.map(sizeBtn).join("")}</div>`
}
${sold ? "" : `<p class="pdLabel">Kiekis</p>`}
<div class="pdBuy" data-buy-anchor>${sold ? "" : qtyHTML()}${buyBtn}</div>
<p class="pdShip">${glyph("truck")}<span>${esc(shipLine())}</span></p>
<div class="pdActs">${heartBtn(p, "pdAct")}<button class="pdAct" type="button" data-share="${p.id}">${glyph("share")}<span>Dalintis</span></button></div>
${inspiredOf(p) && SET.inspired?.note ? `<p class="pdLegal">${esc(SET.inspired.note)}</p>` : ""}
<div data-note-slot>${ml === SAMPLE_ML && !sold ? sampleNoteHTML() : ""}</div>
</div>
</article>
<div class="pdBelow">
<section class="sec" id="pdReviews" data-pd-reviews hidden></section>
${
  similar.length
    ? `<section class="hsec pdSimilar"><h2 class="band">Jums gali patikti</h2><div class="wrap"><p class="secLine"><span>Panašūs kvapai</span><a href="kvepalai?seima=${encodeURIComponent(
        p.family
      )}" data-nav>Peržiūrėti</a></p>${railHTML(similar.map(x => cardHTML(x, { heart: false })).join(""), { cover: true })}</div></section>`
    : ""
}
</div>
<div class="buyBar" id="buyBar"><div class="bbIn"><span class="bbProd"><span class="bbThumb">${artImg(p)}</span><b>${esc(p.name)}</b></span><span class="price">${
    sold
      ? `<b>Išparduota</b><small>${esc(p.name)}</small>`
      : `<span class="bbNow">${wasOf(p, ml) ? `<s class="money" data-bb-was>${eur(wasOf(p, ml))}</s>` : ""}<b class="money${wasOf(p, ml) ? " sale" : ""}" data-buy-price>${eur(priceOf(p, ml))}</b></span><small data-buy-size>${esc(p.name)} · ${sizeLabel(ml, p)}</small>`
  }</span>${sold ? "" : qtyHTML(" bbQty")}${buyBtn}</div></div>`;
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
  const ml = Number(params?.get("ml")) === SAMPLE_ML && hasSample(p) ? SAMPLE_ML : defaultMl(p);
  // Senas adresas (kvepalai/<difuzoriaus id>) – pataisomas į tikrąjį be naujo įrašo istorijoje
  const want = absUrl(productUrl(p) + location.search);
  if (currentPath() !== productUrl(p) && want !== location.href) history.replaceState(history.state, "", want);
  pdState.id = id;
  pdState.ml = ml;
  pdState.qty = 1;
  root.innerHTML = productPageHTML(p, ml);
  document.title = `${p.name} – ${kindName(p)} | ${SET.shop}`;
  renderReviews($("[data-pd-reviews]", root), [p], { title: "Atsiliepimai", showProduct: false });
  bindGallery(root);
  bindRails(root);
  track("Peržiūrėjo kvapą", { kvapas: p.name });
  // Prilipusi pirkimo juosta: telefone – kai pagrindinis mygtukas išslenka viršun; kompiuteryje – kai jo nesimato
  buyObs?.disconnect();
  const bar = $("#buyBar", root);
  buyObs = new IntersectionObserver(
    ([en]) => bar.classList.toggle("show", !en.isIntersecting && (en.boundingClientRect.top < 0 || matchMedia("(min-width: 1024px)").matches)),
    { threshold: 0 }
  );
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
        const was = wasOf(p, pdState.ml);
        $$("[data-buy-price]", root).forEach(el => {
          el.textContent = eur(priceOf(p, pdState.ml));
          el.classList.toggle("sale", !!was);
        });
        $(".bbNow", root)?.querySelector("[data-bb-was]")?.remove();
        if (was) $(".bbNow", root)?.insertAdjacentHTML("afterbegin", `<s class="money" data-bb-was>${eur(was)}</s>`);
        $(".pdPrice", root).innerHTML = priceBlockHTML(p, pdState.ml);
        $("#buyBar [data-buy-size]", root).textContent = `${p.name} · ${sizeLabel(pdState.ml, p)}`;
        $("[data-note-slot]", root).innerHTML = pdState.ml === SAMPLE_ML ? sampleNoteHTML() : "";
      }
      return;
    }
    const qs = t?.closest("[data-qty-step]");
    if (qs) {
      pdState.qty = Math.max(1, Math.min(SET.maxQty, pdState.qty + Number(qs.dataset.qtyStep)));
      $$("[data-qty]", root).forEach(o => (o.textContent = pdState.qty));
      return;
    }
    const add = t?.closest("[data-add]");
    if (add) {
      addToCart(p.id, pdState.ml, pdState.qty);
      pdState.qty = 1;
      $$("[data-qty]", root).forEach(o => (o.textContent = "1"));
      $$("[data-add]", root).forEach(b => {
        b.innerHTML = `${glyph("check")}Įdėta`;
        b.classList.add("added");
      });
      setTimeout(() => $$("[data-add]", root).forEach(b => ((b.innerHTML = "Įdėti į krepšelį"), b.classList.remove("added"))), 1400);
      openMiniCart({ added: `${p.name} · ${sizeLabel(pdState.ml, p)}` });
    }
  });
}
// Dalintis – švari nuoroda į kvapo puslapį
async function shareProduct(id) {
  const p = BY_ID.get(id);
  const url = absUrl(BY_ID.has(id) ? productUrl(BY_ID.get(id)) : `kvepalai/${id}`);
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
