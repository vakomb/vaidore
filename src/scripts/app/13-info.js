// 13 - informaciniai puslapiai: /pagalba (pristatymas, grąžinimas, apmokėjimas, DUK, kontaktai), /apie-mus
// (istorija, kaip renkamės, rekvizitai), /atsiliepimai (visi TIKRI atsiliepimai), /verslui (dovanos įmonėms, didesni
// kiekiai) ir /naujienlaiskis (atsisakymas: ?atsisakyti=<raktas>). Tekstai - iš settings (administravimo „Nustatymai“).
const FAQ = () => [
  [t("faq.lasts.q"), nb(t("faq.lasts.a"))],
  [t("faq.choose.q"), nb(`${t("faq.choose.a")} ${creditText()}`)],
  [t("faq.return.q"), nb(t("faq.return.a", { n: SET.returnDays || 14 }))],
  [t("faq.ship.q"), t("faq.ship.a", { d: nb(dispatchText()) })],
  [t("faq.account.q"), t("faq.account.a")],
  [t("faq.gift.q"), SET.gift ? t("faq.gift.a", { price: eur(SET.gift.price) }) : t("faq.gift.aNo")]
];
function infoHelpHTML() {
  const days = SET.returnDays || 14;
  const ship = SET.shipping
    .map(
      o =>
        `<div class="row"><span class="rowIco">${glyph(o.id === "omniva" ? "locker" : "truck")}</span><span class="rowTxt">${esc(o.name)}<small>${esc(nb(o.days))}</small></span><b class="money">${eur(o.price)}</b></div>`
    )
    .join("");
  return `<header class="pageHead"><h1>${t("help.title")}</h1><p class="pageSub">${t("help.sub")}</p></header>
<div class="infoGrid">
<nav class="infoToc" aria-label="${t("help.toc")}"><a href="pagalba#pristatymas">${t("help.delivery")}</a><a href="pagalba#grazinimas">${t("help.returns")}</a><a href="pagalba#apmokejimas">${t("help.payment")}</a><a href="pagalba#duk">${t("help.faqShort")}</a><a href="pagalba#kontaktai">${t("help.contact")}</a></nav>
<div class="infoBody">
<section id="pristatymas" class="infoSec"><h2>${t("help.delivery")}</h2>
<div class="group">${ship}<div class="row"><span class="rowIco" style="background:var(--green)">${glyph("check")}</span><span class="rowTxt">${t("common.free")}<small>${t("help.freeFrom", { price: eurShort(SET.freeShippingFrom) })}</small></span></div></div>
<p class="infoTxt">${t("help.shipTo", { countries: SET.countries.map(c => (LANG === "lt" ? { LT: "Lietuvą", LV: "Latviją", EE: "Estiją" }[c] : regionName(c)) || c).join(", "), d: esc(nb(dispatchText()).replace(/\.$/, "")) })}</p></section>
<section id="grazinimas" class="infoSec"><h2>${nb(t("help.returnsIn", { n: days }))}</h2>
<ol class="group steps">
<li class="row"><span class="stepNo">1</span><span class="rowTxt">${t("help.ret1")}<small>${t("help.ret1Sub", { email: esc(SET.company.email) })}</small></span></li>
<li class="row"><span class="stepNo">2</span><span class="rowTxt">${t("help.ret2")}<small>${t("help.ret2Sub")}</small></span></li>
<li class="row"><span class="stepNo">3</span><span class="rowTxt">${t("help.ret3")}<small>${nb(t("help.ret3Sub"))}</small></span></li>
</ol></section>
<section id="apmokejimas" class="infoSec"><h2>${t("help.payment")}</h2>
<p class="infoTxt">${t("help.paymentText")}</p></section>
<section id="duk" class="infoSec"><h2>${t("help.faq")}</h2>
<div class="faq">${FAQ()
    .map(([q, a]) => `<details><summary>${esc(q)}${glyph("chev-down")}</summary><p>${esc(a)}</p></details>`)
    .join("")}</div></section>
<section id="kontaktai" class="infoSec"><h2>${t("help.contact")}</h2>
<div class="group"><a class="row" href="mailto:${esc(SET.company.email)}"><span class="rowIco">${glyph("mail")}</span><span class="rowTxt">${esc(SET.company.email)}<small>${nb(t("help.replyIn"))}</small></span><span class="chev">${glyph("chev-right")}</span></a>${
    filled(SET.company.phone)
      ? `<a class="row" href="tel:${esc(SET.company.phone.replace(/\s/g, ""))}"><span class="rowIco" style="background:var(--green)">${glyph("bell")}</span><span class="rowTxt">${esc(SET.company.phone)}<small>${nb(t("help.hours"))}</small></span><span class="chev">${glyph("chev-right")}</span></a>`
      : ""
  }</div>
<p class="infoTxt">${companyParts().map(esc).join(" · ")}</p></section>
</div></div>`;
}
function infoAboutHTML() {
  const st = SET.story || {};
  const trio = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 3);
  return `<header class="pageHead"><h1>${esc(L(st, "title") || t("about.title"))}</h1><p class="pageSub">${esc(L(SET, "tagline") || "")}</p></header>
<section class="story about">
<div class="storyArt">${st.image ? `<img src="${esc(st.image)}" alt="" loading="lazy" decoding="async" />` : stageHTML("collection", trio, { cls: "storyStage" })}</div>
<div class="storyTxt"><p>${esc(L(st, "text") || "")}</p></div>
</section>
<section class="sec"><div class="secHead"><h2>${t("about.how")}</h2></div>
<div class="aboutPts">
<div><span class="prIco">${glyph("drop")}</span><b>${t("about.p1")}</b><p>${nb(t("about.p1Text"))} ${esc(creditText())}</p></div>
<div><span class="prIco">${glyph("spark")}</span><b>${t("about.p2")}</b><p>${t("about.p2Text")}</p></div>
<div><span class="prIco">${glyph("truck")}</span><b>${t("about.p3")}</b><p>${t("about.p3Text", { d: esc(nb(dispatchText())) })}</p></div>
</div></section>
<section class="sec"><div class="secHead"><h2>${t("about.company")}</h2></div><p class="infoTxt">${companyParts().map(esc).join("<br />")}<br /><a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></p></section>`;
}
// Atsiliepimai: tik tikri (rašo pirkę, skelbiami po peržiūros) - vidurkis, kiekis ir visi atsiliepimai
function infoReviewsHTML() {
  const all = reviewsOf(PRODUCTS).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const rated = all.filter(r => r.rating);
  const avg = rated.length ? rated.reduce((n, r) => n + r.rating, 0) / rated.length : 0;
  const head = `<header class="pageHead revHead"><h1>${t("pd.reviewsTitle")}</h1>${
    rated.length
      ? `<p class="revSum">${starsHTML(avg)}<b>${avg.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b><span>${t("reviews.outOf5")} · ${tn("reviews.ratings", rated.length)}</span></p>`
      : ""
  }<p class="pageSub">${t("reviews.sub")}</p></header>`;
  if (!all.length)
    return `${head}<div class="empty"><h3>${t("reviews.none")}</h3><p>${t("reviews.noneText")}</p><a class="btn primary" href="kvepalai" data-nav>${t("type.kvepalai.title")}</a></div>`;
  return `${head}<div class="revGrid">${all
    .map(
      r =>
        `<figure class="review"><a class="art revArt" href="${productUrl(r.p)}" data-nav tabindex="-1" aria-hidden="true" style="--tint:${r.p.look.tint}">${artImg(r.p)}</a>${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(
          r.text
        )}</blockquote><figcaption>${esc(r.name)} · <a href="${productUrl(r.p)}" data-nav>${esc(L(r.p, "name"))}</a>${r.verified ? ` · <span class="verified">${t("reviews.verified")}</span>` : ""}${
          (r.lang || "lt") !== LANG ? ` · <span class="revLang">${t(`reviews.lang.${r.lang === "en" ? "en" : "lt"}`)}</span>` : ""
        }${
          r.date ? ` · <time datetime="${esc(r.date)}">${esc(fmtDate(r.date))}</time>` : ""
        }</figcaption></figure>`
    )
    .join("")}</div>`;
}
// Verslui: dovanos darbuotojams ir klientams, didesni kiekiai, renginiai. Kaina - individuali (pasiūlymas laišku)
function infoBusinessHTML() {
  const b = SET.business || {};
  const mail = `mailto:${SET.company.email}?subject=${encodeURIComponent(t("biz.mailSubject"))}&body=${encodeURIComponent(t("biz.mailBody"))}`;
  const pts = [
    ["box", t("biz.gifts"), t("biz.giftsText", { what: DISC ? esc(L(DISC, "name").toLowerCase()) : t("biz.sampleSets"), receipt: SET.gift ? t("biz.noReceipt") : "" })],
    ["drop", t("biz.events"), nb(t("biz.eventsText"))],
    ["truck", t("biz.bulk"), t("biz.bulkText", { d: esc(nb(dispatchText())) })]
  ];
  return `<header class="pageHead"><h1>${t("biz.title")}</h1><p class="pageSub">${esc(nb(L(b, "text") || t("biz.sub")))}</p></header>
<div class="aboutPts bizPts">${pts.map(([i, t, d]) => `<div><span class="prIco">${glyph(i)}</span><b>${t}</b><p>${d}</p></div>`).join("")}</div>
<section class="infoSec"><h2>${t("biz.how")}</h2>
<ol class="group steps">
<li class="row"><span class="stepNo">1</span><span class="rowTxt">${t("help.ret1")}<small>${t("biz.s1Sub")}</small></span></li>
<li class="row"><span class="stepNo">2</span><span class="rowTxt">${t("biz.s2")}<small>${nb(t("biz.s2Sub"))}</small></span></li>
<li class="row"><span class="stepNo">3</span><span class="rowTxt">${t("biz.s3")}<small>${t("biz.s3Sub")}</small></span></li>
</ol>
<p class="bizCta"><a class="btn primary" href="${esc(mail)}">${glyph("mail")}${t("biz.cta")}</a><a class="linkBtn" href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></p></section>`;
}
function renderInfo(kind, hash) {
  const html = { "apie-mus": infoAboutHTML, atsiliepimai: infoReviewsHTML, verslui: infoBusinessHTML, naujienlaiskis: infoNewsletterHTML }[kind] || infoHelpHTML;
  $("#infoRoot").innerHTML = html();
  document.title = `${{ "apie-mus": t("about.title"), atsiliepimai: t("pd.reviewsTitle"), verslui: t("biz.title"), naujienlaiskis: t("news.title") }[kind] || t("help.title")} | ${SET.shop}`;
  if (kind === "naujienlaiskis") newsletterUnsubscribe();
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
}
document.addEventListener("click", e => {
  const tx = e.target instanceof Element ? e.target : null;
  if (tx?.closest("[data-info]")) navigate("pagalba");
  // „pagalba#…“ - tame pačiame puslapyje slenkame be naujo įrašo
  const a = tx?.closest('a[href^="pagalba#"]');
  if (a && ui.view === "info" && ui.path === "pagalba") {
    e.preventDefault();
    document.getElementById(a.getAttribute("href").split("#")[1])?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  }
});
