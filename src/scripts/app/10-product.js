// 10 - prekės puslapis /<tipas>/<id> (kaip parfumada.lt): PAVADINIMAS tarp linijų ir paantraštė, švari galerija
// (nuotraukos braukiant arba buteliukas), kaina, talpa (33 ml / 100 ml / 2 ml mėginukas), kiekis, „Įdėti į krepšelį“,
// susietos prekės, „Į mėgstamus“ / „Dalintis“, aprašymas; po straipsniu - turinio blokai pagal kategoriją ir išskleidžiamos
// dalys (28-story.js, v29), atsiliepimai (tik tikri), „Jums gali patikti“. Prilipusi pirkimo juosta: telefone - praslinkus mygtuką, kompiuteryje -
// kai mygtuko nesimato (nuotrauka, pavadinimas, kaina, kiekis, mygtukas - kaip parfumada.lt). Išparduotam - „Pranešti, kai bus“.
function galleryHTML(p) {
  const imgs = (p.images || []).filter(Boolean);
  if (!imgs.length) return bottleSVG(p);
  return `<div class="gal" tabindex="0" aria-label="${esc(p.name)} nuotraukos">${imgs
    .map(
      (src, i) =>
        `<img${flatImg(src) ? ' class="flat"' : ""} src="${esc(src)}" alt="${esc(L(p, "name"))}${imgs.length > 1 ? ` - ${t("common.nOfM", { i: i + 1, n: imgs.length })}` : ""}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" />`
    )
    .join("")}</div>${imgs.length > 1 ? `<div class="galDots" aria-hidden="true">${imgs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}`;
}
// Pristatymo laikas ant „Į krepšelį“ (v25): išsiuntimas (SET.dispatch) + greičiausias pristatymo būdas (SET.shipping[].days),
// pvz. „1-2 d. d.“ + „1-2 d. d.“ → „Pristatysime per 2-4 d. d.“. Neatpažinus - „Išsiunčiame per …“ (tik tikri duomenys).
function deliveryEta() {
  const rng = s => {
    const m = String(s || "").match(/(\d+)\s*(?:[\u2013-]\s*(\d+))?/);
    return m ? [Number(m[1]), Number(m[2] || m[1])] : null;
  };
  const d = rng(dispatchText());
  const ship = (SET.shipping || []).map(o => rng(o.days)).filter(Boolean).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
  if (!d || !ship) return t("pd.dispatch", { d: dispatchText() });
  const lo = d[0] + ship[0],
    hi = d[1] + ship[1];
  return t("pd.eta", { d: lo === hi ? lo : `${lo}-${hi}` });
}
// „Įdėti į krepšelį“ - dvi eilutės: veiksmas ir pristatymo laikas su žaliu „gyvu“ tašku
const addBtnHTML = () => `<span class="addMain">${t("cart.add")}</span><span class="addEta"><i class="liveDot" aria-hidden="true"></i>${esc(nb(deliveryEta()))}</span>`;
// Susietų prekių eilutė (v25, v28): nuotrauka, pavadinimas, antraeilė (forma · talpa / originalas / savybės), kaina,
// „+“ - iškart į krepšelį. hidden - „Rodyti dar …“ sąrašuose
function formRowHTML(x, { sub = "", hidden = false } = {}) {
  const ml = defaultMl(x);
  const sold = !inStock(x);
  const line = sub || `${TYPE.get(typeOf(x)).one} · ${sizeLabel(ml, x)}`;
  return `<div class="formRow"${hidden ? " hidden data-more-row" : ""}><a class="formLink" href="${productUrl(x)}" data-nav><span class="art${x.images?.length ? " hasPhoto" : ""}" style="--tint:${x.look.tint}">${artImg(
    x
  )}</span><span class="formTxt"><b>${esc(x.name)}</b><small>${esc(line)}</small><span class="formPrice money">${sold ? t("common.soldOut") : eur(priceOf(x, ml))}</span></span></a>${
    sold ? "" : `<button class="formAdd" type="button" data-form-add="${esc(x.id)}" aria-label="${t("cart.addNamed", { name: esc(L(x, "name")) })}">${glyph("plus")}</button>`
  }</div>`;
}
// Susietų prekių blokas: antraštė ir sąrašas; daugiau nei „limit“ - „Rodyti dar N“ (išskleidžia likusias)
function pickListHTML(title, items, { sub = () => "", limit = 0 } = {}) {
  if (!items.length) return "";
  const more = limit && items.length > limit ? items.length - limit : 0;
  return `<section class="pdForms"><h2 class="pdLabel">${esc(title)}</h2><div class="formList">${items
    .map((x, i) => formRowHTML(x, { sub: sub(x), hidden: more && i >= limit }))
    .join("")}</div>${more ? `<button class="formMore" type="button" data-more-forms>${esc(t("pd.showMore", { n: more }))}${glyph("chev-down")}</button>` : ""}</section>`;
}
// Originalas eilutėje („Paco Rabanne One Million · 10 ml“) - renkantis aliejų pagal kvapą
const inspLine = x => {
  const insp = inspiredOf(x);
  if (!insp) return "";
  const { brand, name } = splitInspired(insp);
  return `${[brand, name].filter(Boolean).join(" ")} · ${sizeLabel(defaultMl(x), x)}`;
};
// Elektrinio difuzoriaus savybės eilutėje („300 ml · iki 10 val.“)
const deviceLine = x => [x.attrs?.tank && `${x.attrs.tank} ml`, x.attrs?.runtime && `${x.attrs.runtime} ${t("unit.h")}`].filter(Boolean).join(" · ") || TYPE.get(typeOf(x)).one;
// Pagrindinės savybės kortelėmis po kaina (v28, ne kvepalams): reikšmė stambiai, pavadinimas - po ja
const SPEC_FMT = {
  tank: v => [`${v} ml`, t("spec.tank")],
  runtime: v => [`${v} ${t("unit.h")}`, t("spec.runtime")],
  // „LED, 7 spalvos“ → LED / 7 spalvos
  light: v => {
    const [main, ...rest] = String(v).split(/,\s*/);
    return [main, rest.join(", ") || t("spec.light")];
  },
  weeks: v => [`${v} ${t("unit.weeks")}`, t("spec.weeks")],
  sticks: v => [`${v} ${t("unit.pcs")}`, t("spec.sticks")],
  burn: v => [`${v} ${t("unit.h")}`, t("spec.burn")],
  wax: v => [attrVal(v), t("spec.wax")],
  wick: v => [attrVal(v), t("spec.wick")]
};
// Taip / ne savybės - viena aiški eilutė su varnele po kaina (v28b), ne kortelė
const SPEC_LINE = { forDiffuser: t("spec.forDiffuser") };
function specsHTML(p) {
  const lines = (ATTR_DEFS[typeOf(p)] || []).filter(([k]) => SPEC_LINE[k] && p.attrs?.[k] === true).map(([k]) => SPEC_LINE[k]);
  const specs = (ATTR_DEFS[typeOf(p)] || [])
    .map(([k]) => k)
    .filter(k => SPEC_FMT[k] && p.attrs?.[k] != null && p.attrs[k] !== "" && p.attrs[k] !== false)
    .slice(0, 3)
    .map(k => SPEC_FMT[k](p.attrs[k]));
  return (
    lines.map(tx => `<p class="pdFit">${glyph("check")}<span>${esc(tx)}</span></p>`).join("") +
    (specs.length ? `<ul class="pdSpecs">${specs.map(([v, l]) => `<li><b>${esc(nb(v))}</b><span>${esc(l)}</span></li>`).join("")}</ul>` : "")
  );
}
function sampleNoteHTML() {
  return `<p class="pdNote" data-sample-note>${glyph("return")}<span>${esc(creditText())}${
    DISC ? ` <button class="linkBtn" type="button" data-disc>${t("pd.orDisc", { n: DISC.count, price: eur(DISC.price) })}</button>` : ""
  }</span></p>`;
}
function priceBlockHTML(p, ml) {
  const was = wasOf(p, ml);
  return `${was ? `<s class="money" data-buy-was>${eur(was)}</s>` : ""}<b class="money${was ? " sale" : ""}" data-buy-price>${eur(priceOf(p, ml))}</b><small data-buy-size>${sizeLabel(ml, p)}</small>${
    was ? `<span class="pill salePill">${t("common.sale")}</span>` : ""
  }`;
}
const accHTML = (ico, title, body, { open = false, id = "" } = {}) =>
  `<details class="acc"${open ? " open" : ""}><summary${id ? ` id="${id}"` : ""}><span class="accIco">${glyph(ico)}</span>${esc(title)}${glyph("chev-down")}</summary><div class="accBody">${body}</div></details>`;
const qtyHTML = (cls = "") =>
  `<div class="qty${cls}" role="group" aria-label="${t("common.qty")}"><button type="button" data-qty-step="-1" aria-label="${t("common.less")}">${glyph("minus")}</button><output data-qty>${pdState.qty}</output><button type="button" data-qty-step="1" aria-label="${t("common.more")}">${glyph("plus")}</button></div>`;
function productPageHTML(p, ml) {
  const sizes = [...p.sizes.map(s => ({ ml: s.ml, price: s.price, was: s.was })), ...(hasSample(p) ? [{ ml: SAMPLE_ML, price: p.sample }] : [])];
  const sizeBtn = s =>
    `<button class="sizeOpt" type="button" role="radio" data-ml="${s.ml}" aria-checked="${s.ml === ml}" aria-label="${sizeLabel(s.ml, p)}, ${eur(s.price)}"><b>${
      s.ml === SAMPLE_ML && isPerfume(p) ? nb(t("pd.sampleOpt")) : sizeLabel(s.ml, p)
    }</b></button>`;
  const device = typeOf(p) === "elektriniai-difuzoriai";
  const attrs = attrList(p);
  const T = TYPE.get(typeOf(p));
  // Tas pats kvapas kitose kategorijose (products.scent_id): „Šis kvapas taip pat“ - kvepalai, difuzorius, žvakė…
  const forms = p.scent ? PRODUCTS.filter(x => x.scent === p.scent && x.id !== p.id).sort((a, b) => TYPES.findIndex(tx => tx.id === typeOf(a)) - TYPES.findIndex(tx => tx.id === typeOf(b))) : [];
  const similar = PRODUCTS.filter(x => x.id !== p.id && inStock(x) && typeOf(x) === typeOf(p) && (x.family === p.family || x.gender === p.gender || !isPerfume(p)))
    .sort((a, b) => (b.family === p.family) - (a.family === p.family) || a.rank - b.rank)
    .slice(0, 8);
  // Kartu reikalingos prekės (v28): aliejui - elektriniai difuzoriai, elektriniam difuzoriui - aliejai (pirmi 5, kiti - „Rodyti dar“)
  const byNeed = list => list.sort((a, b) => inStock(b) - inStock(a) || a.rank - b.rank);
  const devices = typeOf(p) === "aliejai" ? byNeed(PRODUCTS.filter(x => typeOf(x) === "elektriniai-difuzoriai")) : [];
  const oils = device ? byNeed(PRODUCTS.filter(x => typeOf(x) === "aliejai")) : [];
  const pairsHTML = devices.length
    ? pickListHTML(devices.length > 1 ? t("pd.devices") : t("pd.device"), devices, { sub: deviceLine, limit: 5 })
    : oils.length
      ? pickListHTML(t("pd.oils"), oils, { sub: inspLine, limit: 5 })
      : "";
  const sold = !inStock(p);
  const rate = ratingOf(p);
  const buyBtn = sold
    ? `<button class="btn primary" type="button" data-notify="${p.id}">${glyph("bell")}${t("notify.cta")}</button>`
    : `<button class="btn primary pdAdd" type="button" data-add>${addBtnHTML()}</button>`;
  // Natos - trys eilutės (kaip parfumada.lt): „Viršutinės natos: …“
  const noteRow = (lab, list) => `<div><dt>${lab}</dt><dd>${list.map(esc).join(" · ")}</dd></div>`;
  const notes = `<dl class="pdNotes">${noteRow(t("notes.top"), p.notes.top.map(noteName))}${noteRow(t("notes.heart"), p.notes.heart.map(noteName))}${noteRow(t("notes.base"), p.notes.base.map(noteName))}</dl>`;
  // Kam skirti - lytis ir kvapų šeima
  const who = `<ul class="accList">${[
    p.gender === "unisex" ? t("pd.unisex") : GENDER_NAME[p.gender],
    familyName(p.family) && t("pd.familyScents", { name: familyName(p.family) })
  ]
    .filter(Boolean)
    .map(tx => `<li>${esc(tx)}</li>`)
    .join("")}</ul>`;
  // Išskleidžiamos dalys - turinio blokų pabaigoje (28-story.js). Natos - tik jei natų blokas išjungtas administravime.
  const cfg = pdpOf(typeOf(p));
  const notesInStory = blockOn(cfg.notes) && T.scented;
  const ship = `<ul class="accList"><li>${SET.shipping.map(o => `${esc(o.name)} - ${eur(o.price)} (${esc(nb(o.days))})`).join("</li><li>")}</li><li>${t("pd.freeFrom", { price: eurShort(SET.freeShippingFrom) })}</li><li>${esc(nb(t("pd.dispatch", { d: dispatchText() })))}</li><li>${nb(t("pd.returns", { n: SET.returnDays || 14 }))} - <a href="pagalba#grazinimas" data-nav>${t("pd.howReturn")}</a></li></ul>`;
  const details = [
    isPerfume(p) ? accHTML("user", t("pd.who"), who) : "",
    !notesInStory && keyNotes(p).length ? accHTML("drop", isPerfume(p) ? t("pd.notes") : t("pd.scentNotes"), notes, { id: "pdNotesH" }) : "",
    attrs.length && !specsHTML(p) ? accHTML("info", t("pd.specs"), `<dl class="pdNotes">${attrs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`, { open: device }) : "",
    p.ingredients ? accHTML("doc", t("pd.ingredients"), `<p>${esc(L(p, "ingredients"))}</p>`) : "",
    accHTML("truck", t("pd.shipReturns"), ship)
  ].join("");
  return `<article class="pd${sold ? " sold" : ""}" style="--tint:${p.look.tint};--liquid:${p.look.liquid}">
<header class="pdHead"><h1 class="pdH1"><span>${esc(p.name)}</span></h1><p class="pdSub">${esc(subtitleOf(p))}</p>${
    rate ? `<p class="pdRate">${starsHTML(rate.avg)}<button class="linkBtn" type="button" data-scroll-to="pdReviews">${tn("pd.reviews", rate.n)}</button></p>` : ""
  }</header>
<div class="pdGal${p.images?.length ? " hasPhoto" : ""}">
${galleryHTML(p)}
</div>
<div class="pdInfo">
${inspiredOf(p) ? `<p class="pdInsp">${inspiredHTML(p, "pd")}</p>` : ""}
${descHTML(p)}
<div class="pdPrice">${sold ? `<b>${t("pd.tempSold")}</b>` : priceBlockHTML(p, ml)}</div>
${specsHTML(p)}
${
  device
    ? ""
    : `<p class="pdLabel pdLabSize">${typeOf(p) === "zvakes" ? t("pd.weight") : t("pd.size")}</p>
<div class="sizes" role="radiogroup" aria-label="${typeOf(p) === "zvakes" ? t("pd.weight") : t("pd.size")}">${sizes.map(sizeBtn).join("")}</div>`
}
${sold ? "" : `<p class="pdLabel pdLabQty">${t("common.qty")}</p>`}
<div class="pdBuy" data-buy-anchor>${sold ? "" : qtyHTML()}${buyBtn}</div>
${pairsHTML}
${pickListHTML(isPerfume(p) && forms.every(x => !isPerfume(x)) ? t("pd.formsHome") : t("pd.forms"), forms)}
<div class="pdActs">${heartBtn(p, "pdAct")}<button class="pdAct" type="button" data-share="${p.id}">${glyph("share")}<span>${t("pd.share")}</span></button></div>
${inspiredOf(p) && SET.inspired?.note ? `<p class="pdLegal">${esc(L(SET.inspired, "note"))}</p>` : ""}
<div data-note-slot>${ml === SAMPLE_ML && !sold ? sampleNoteHTML() : ""}</div>
</div>
</article>
${storyHTML(p, details)}
<div class="pdBelow">
<section class="sec" id="pdReviews" data-pd-reviews hidden></section>
${
  similar.length
    ? `<section class="hsec pdSimilar">${bandHTML(t("pd.similar"), isPerfume(p) ? t("pd.similarLine") : T.title, isPerfume(p) ? `kvepalai?seima=${encodeURIComponent(p.family)}` : typeOf(p))}<div class="wrap">${railHTML(similar.map(x => cardHTML(x, { heart: false })).join(""))}</div></section>`
    : ""
}
</div>
<div class="buyBar" id="buyBar"><div class="bbIn"><span class="bbProd"><span class="bbThumb">${artImg(p)}</span><b>${esc(p.name)}</b></span><span class="price">${
    sold
      ? `<b>${t("common.soldOut")}</b><small>${esc(L(p, "name"))}</small>`
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
  // Senas adresas (kvepalai/<difuzoriaus id>) - pataisomas į tikrąjį be naujo įrašo istorijoje
  const want = absUrl(productUrl(p) + (urlParams().toString() ? `?${urlParams()}` : ""));
  if (currentPath() !== productUrl(p) && want !== location.href) history.replaceState(history.state, "", want);
  pdState.id = id;
  pdState.ml = ml;
  pdState.qty = 1;
  root.innerHTML = productPageHTML(p, ml);
  document.title = `${p.name} - ${kindName(p)} | ${SET.shop}`;
  renderReviews($("[data-pd-reviews]", root), [p], { title: t("pd.reviewsTitle"), showProduct: false });
  bindGallery(root);
  bindRails(root);
  bindStory(root);
  track("Peržiūrėjo kvapą", { kvapas: p.name });
  // Prilipusi pirkimo juosta (telefone ir kompiuteryje): kai pagrindinis mygtukas išslenka viršun
  buyObs?.disconnect();
  const bar = $("#buyBar", root);
  buyObs = new IntersectionObserver(([en]) => bar.classList.toggle("show", !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 });
  buyObs.observe($("[data-buy-anchor]", root));
  return true;
}
function bindProduct() {
  $("#productRoot").addEventListener("click", e => {
    const tx = e.target instanceof Element ? e.target : null;
    const p = BY_ID.get(pdState.id);
    if (!p) return;
    const root = $("#productRoot");
    const size = tx?.closest("[data-ml]");
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
    const qs = tx?.closest("[data-qty-step]");
    if (qs) {
      pdState.qty = Math.max(1, Math.min(SET.maxQty, pdState.qty + Number(qs.dataset.qtyStep)));
      $$("[data-qty]", root).forEach(o => (o.textContent = pdState.qty));
      return;
    }
    const add = tx?.closest("[data-add]");
    if (add) {
      addToCart(p.id, pdState.ml, pdState.qty);
      pdState.qty = 1;
      $$("[data-qty]", root).forEach(o => (o.textContent = "1"));
      $$("[data-add]", root).forEach(b => {
        b.dataset.html ||= b.innerHTML;
        b.innerHTML = `<span class="addMain">${glyph("check")}${t("cart.addedShort")}</span>`;
        b.classList.add("added");
      });
      setTimeout(() => $$("[data-add]", root).forEach(b => ((b.innerHTML = b.dataset.html || addBtnHTML()), b.classList.remove("added"))), 1400);
      openMiniCart({ added: `${p.name} · ${sizeLabel(pdState.ml, p)}` });
      return;
    }
    // „Rodyti dar N“ - išskleidžia likusias susietas prekes (švelniai), mygtukas dingsta
    const more = tx?.closest("[data-more-forms]");
    if (more) {
      const sec = more.closest(".pdForms");
      $$("[data-more-row]", sec).forEach(r => {
        r.hidden = false;
        r.classList.add("formIn");
      });
      more.remove();
      $("[data-more-row] .formLink", sec)?.focus({ preventScroll: true });
      return;
    }
    // „Tas pats kvapas“: „+“ - kita forma (difuzorius, žvakė…) iškart į krepšelį, numatyta talpa
    const fa = tx?.closest("[data-form-add]");
    if (fa) {
      const x = BY_ID.get(fa.dataset.formAdd);
      if (!x || !inStock(x)) return;
      const ml = defaultMl(x);
      addToCart(x.id, ml, 1);
      fa.classList.add("added");
      fa.innerHTML = glyph("check");
      setTimeout(() => ((fa.innerHTML = glyph("plus")), fa.classList.remove("added")), 1400);
      openMiniCart({ added: `${x.name} · ${sizeLabel(ml, x)}` });
    }
  });
}
// Dalintis - švari nuoroda į kvapo puslapį
async function shareProduct(id) {
  const p = BY_ID.get(id);
  const url = absUrl(BY_ID.has(id) ? productUrl(BY_ID.get(id)) : `kvepalai/${id}`);
  try {
    if (navigator.share) return await navigator.share({ title: `${p.name} - ${SET.shop}`, text: p.tagline, url });
    await navigator.clipboard.writeText(url);
    toast(t("pd.linkCopied"), { icon: "copy" });
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
