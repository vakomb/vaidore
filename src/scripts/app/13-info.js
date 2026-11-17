// 13 – informaciniai puslapiai: /pagalba (pristatymas, grąžinimas, apmokėjimas, DUK, kontaktai), /apie-mus
// (istorija, kaip renkamės, rekvizitai), /atsiliepimai (visi TIKRI atsiliepimai), /verslui (dovanos įmonėms, didesni
// kiekiai) ir /naujienlaiskis (atsisakymas: ?atsisakyti=<raktas>). Tekstai – iš settings (administravimo „Nustatymai“).
const FAQ = () => [
  ["Kiek laiko išlieka kvapas?", "Priklauso nuo koncentracijos ir odos: Eau de Toilette – 3–5 val., Eau de Parfum – 5–8 val., Parfum – 8 val. ir ilgiau. Kiekvieno kvapo puslapyje rasite ilgaamžiškumo ir sklaidos skales."],
  ["Kaip išsirinkti nematant kvapo?", `Pradėkite nuo „Rask savo kvapą“ (4 klausimai) arba 2 ml mėginukų. ${creditText()}`],
  ["Ar galiu grąžinti atidarytus kvepalus?", `Dėl higienos grąžinami tik neatidaryti, neišpakuoti kvepalai su nepažeista plėvele per ${SET.returnDays || 14} d. Todėl siūlome pradėti nuo mėginuko.`],
  ["Kada išsiųsite užsakymą?", `Per ${SET.dispatch || "1–2 d. d."} nuo apmokėjimo. Išsiuntę atsiųsime siuntos numerį el. paštu, jį matysite ir paskyroje.`],
  ["Ar reikia kurti paskyrą?", "Ne – pirkti galima ir be jos. Paskyroje matysite užsakymų istoriją, siuntų būseną, mėgstamus kvapus ir nuolaidos kodus."],
  ["Ar galima supakuoti dovanai?", SET.gift ? `Taip – krepšelyje pažymėkite „Dovanų pakavimas“ (+${eur(SET.gift.price)}) ir, jei norite, parašykite rašteliuką. Kainos čekio pakuotėje nebus.` : "Parašykite mums – supakuosime."]
];
function infoHelpHTML() {
  const days = SET.returnDays || 14;
  const ship = SET.shipping
    .map(
      o =>
        `<div class="row"><span class="rowIco">${glyph(o.id === "omniva" ? "locker" : "truck")}</span><span class="rowTxt">${esc(o.name)}<small>${esc(o.days)}</small></span><b class="money">${eur(o.price)}</b></div>`
    )
    .join("");
  return `<header class="pageHead"><h1>Pagalba</h1><p class="pageSub">Pristatymas, grąžinimas, apmokėjimas ir dažniausi klausimai.</p></header>
<div class="infoGrid">
<nav class="infoToc" aria-label="Turinys"><a href="pagalba#pristatymas">Pristatymas</a><a href="pagalba#grazinimas">Grąžinimas</a><a href="pagalba#apmokejimas">Apmokėjimas</a><a href="pagalba#duk">DUK</a><a href="pagalba#kontaktai">Kontaktai</a></nav>
<div class="infoBody">
<section id="pristatymas" class="infoSec"><h2>Pristatymas</h2>
<div class="group">${ship}<div class="row"><span class="rowIco" style="background:var(--green)">${glyph("check")}</span><span class="rowTxt">Nemokamai<small>Užsakymams nuo ${eur(SET.freeShippingFrom)}</small></span></div></div>
<p class="infoTxt">Siunčiame į ${SET.countries.map(c => ({ LT: "Lietuvą", LV: "Latviją", EE: "Estiją" })[c] || c).join(", ")}. Išsiunčiame per ${esc((SET.dispatch || "1–2 d. d.").replace(/\.$/, ""))}. Omniva paštomatą pasirenkate krepšelyje.</p></section>
<section id="grazinimas" class="infoSec"><h2>Grąžinimas per ${days} d.</h2>
<ol class="group steps">
<li class="row"><span class="stepNo">1</span><span class="rowTxt">Parašykite mums<small>${esc(SET.company.email)} – nurodykite užsakymo numerį</small></span></li>
<li class="row"><span class="stepNo">2</span><span class="rowTxt">Išsiųskite prekę<small>Neatidarytą, su nepažeista plėvele – grąžinimo adresą nurodysime atsakyme</small></span></li>
<li class="row"><span class="stepNo">3</span><span class="rowTxt">Gaukite pinigus<small>Per 14 d. nuo grąžinimo, tuo pačiu mokėjimo būdu</small></span></li>
</ol></section>
<section id="apmokejimas" class="infoSec"><h2>Apmokėjimas</h2>
<p class="infoTxt">Kortele, Apple Pay arba Google Pay – saugiai per „Stripe“. Kortelės duomenų mes nematome ir nesaugome. Nuolaidos kodą įvesite apmokėjimo lange. Visos kainos – su PVM.</p></section>
<section id="duk" class="infoSec"><h2>Dažni klausimai</h2>
<div class="faq">${FAQ()
    .map(([q, a]) => `<details><summary>${esc(q)}${glyph("chev-down")}</summary><p>${esc(a)}</p></details>`)
    .join("")}</div></section>
<section id="kontaktai" class="infoSec"><h2>Kontaktai</h2>
<div class="group"><a class="row" href="mailto:${esc(SET.company.email)}"><span class="rowIco">${glyph("mail")}</span><span class="rowTxt">${esc(SET.company.email)}<small>Atsakome per 1 d. d.</small></span><span class="chev">${glyph("chev-right")}</span></a>${
    filled(SET.company.phone)
      ? `<a class="row" href="tel:${esc(SET.company.phone.replace(/\s/g, ""))}"><span class="rowIco" style="background:var(--green)">${glyph("bell")}</span><span class="rowTxt">${esc(SET.company.phone)}<small>Darbo dienomis 9–17 val.</small></span><span class="chev">${glyph("chev-right")}</span></a>`
      : ""
  }</div>
<p class="infoTxt">${companyParts().map(esc).join(" · ")}</p></section>
</div></div>`;
}
function infoAboutHTML() {
  const st = SET.story || {};
  const trio = [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 3);
  return `<header class="pageHead"><h1>${esc(st.title || "Apie mus")}</h1><p class="pageSub">${esc(SET.tagline || "")}</p></header>
<section class="story about">
<div class="storyArt">${st.image ? `<img src="${esc(st.image)}" alt="" loading="lazy" decoding="async" />` : stageHTML("collection", trio, { cls: "storyStage" })}</div>
<div class="storyTxt"><p>${esc(st.text || "")}</p></div>
</section>
<section class="sec"><div class="secHead"><h2>Kaip mes dirbame</h2></div>
<div class="aboutPts">
<div><span class="prIco">${glyph("drop")}</span><b>Pirma – mėginukas</b><p>Kiekvieną kvapą siūlome 2 ml mėginuku. ${esc(creditText())}</p></div>
<div><span class="prIco">${glyph("spark")}</span><b>Natos be žargono</b><p>Aprašome, kaip kvapas skamba ir kada jis tinka – ne tik ingredientų sąrašą.</p></div>
<div><span class="prIco">${glyph("truck")}</span><b>Greitai ir patogiai</b><p>Išsiunčiame per ${esc(SET.dispatch || "1–2 d. d.")}, į Omniva paštomatą ar iki durų.</p></div>
</div></section>
<section class="sec"><div class="secHead"><h2>Rekvizitai</h2></div><p class="infoTxt">${companyParts().map(esc).join("<br />")}<br /><a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></p></section>`;
}
// Atsiliepimai: tik tikri (rašo pirkę, skelbiami po peržiūros) – vidurkis, kiekis ir visi atsiliepimai
function infoReviewsHTML() {
  const all = reviewsOf(PRODUCTS).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const rated = all.filter(r => r.rating);
  const avg = rated.length ? rated.reduce((n, r) => n + r.rating, 0) / rated.length : 0;
  const head = `<header class="pageHead revHead"><h1>Atsiliepimai</h1>${
    rated.length
      ? `<p class="revSum">${starsHTML(avg)}<b>${avg.toFixed(1).replace(".", ",")}</b><span>iš 5 · ${plural(rated.length, "įvertinimas", "įvertinimai", "įvertinimų")}</span></p>`
      : ""
  }<p class="pageSub">Atsiliepimus rašo tik pirkėjai – po pirkimo atsiųstoje nuorodoje arba paskyroje. Skelbiame visus, kurie atitinka taisykles, ir nieko neredaguojame.</p></header>`;
  if (!all.length)
    return `${head}<div class="empty"><h3>Atsiliepimų dar nėra</h3><p>Būkite pirmi – po pirkimo atsiųsime nuorodą įvertinti kvapą.</p><a class="btn primary" href="kvepalai" data-nav>Visi kvepalai</a></div>`;
  return `${head}<div class="revGrid">${all
    .map(
      r =>
        `<figure class="review"><a class="art revArt" href="${productUrl(r.p)}" data-nav tabindex="-1" aria-hidden="true" style="--tint:${r.p.look.tint}">${artImg(r.p)}</a>${r.rating ? starsHTML(r.rating) : ""}<blockquote>${esc(
          r.text
        )}</blockquote><figcaption>${esc(r.name)} · <a href="${productUrl(r.p)}" data-nav>${esc(r.p.name)}</a>${r.verified ? ` · <span class="verified">Patvirtintas pirkėjas</span>` : ""}${
          r.date ? ` · <time datetime="${esc(r.date)}">${esc(String(r.date).slice(0, 10))}</time>` : ""
        }</figcaption></figure>`
    )
    .join("")}</div>`;
}
// Verslui: dovanos darbuotojams ir klientams, didesni kiekiai, renginiai. Kaina – individuali (pasiūlymas laišku)
function infoBusinessHTML() {
  const b = SET.business || {};
  const mail = `mailto:${SET.company.email}?subject=${encodeURIComponent("Verslui: užklausa")}&body=${encodeURIComponent(
    "Sveiki,\n\nĮmonė:\nKiekis:\nKvapai / mėginukai / rinkiniai:\nPageidaujama data:\n\nAčiū!"
  )}`;
  const pts = [
    ["box", "Dovanos darbuotojams ir klientams", `Kvepalai ar ${DISC ? esc(DISC.name.toLowerCase()) : "mėginukų rinkiniai"} – supakuoti dovanai${SET.gift ? ", be kainos čekio" : ""}. Galime pridėti jūsų rašteliuką.`],
    ["drop", "Mėginukai renginiams", "2 ml mėginukai – svečiai išsirenka kvapą, kurį vėliau užsisako patys."],
    ["truck", "Didesni kiekiai", `Išsiunčiame per ${esc(SET.dispatch || "1–2 d. d.")} visoje Lietuvoje. Kaina – pagal kiekį, pasiūlymą atsiųsime laišku.`]
  ];
  return `<header class="pageHead"><h1>Verslui</h1><p class="pageSub">${esc(b.text || "Kvapai įmonių dovanoms, renginiams ir partneriams. Parašykite, kiek ir kam reikia – per 1 d. d. atsiųsime pasiūlymą.")}</p></header>
<div class="aboutPts bizPts">${pts.map(([i, t, d]) => `<div><span class="prIco">${glyph(i)}</span><b>${t}</b><p>${d}</p></div>`).join("")}</div>
<section class="infoSec"><h2>Kaip užsakyti</h2>
<ol class="group steps">
<li class="row"><span class="stepNo">1</span><span class="rowTxt">Parašykite mums<small>Kiekis, kvapai ar rinkiniai, data</small></span></li>
<li class="row"><span class="stepNo">2</span><span class="rowTxt">Gaukite pasiūlymą<small>Per 1 d. d. – su kaina ir pristatymo laiku</small></span></li>
<li class="row"><span class="stepNo">3</span><span class="rowTxt">Patvirtinkite<small>Sąskaita įmonei, išsiunčiame sutartu laiku</small></span></li>
</ol>
<p class="bizCta"><a class="btn primary" href="${esc(mail)}">${glyph("mail")}Gauti pasiūlymą</a><a class="linkBtn" href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></p></section>`;
}
function renderInfo(kind, hash) {
  const html = { "apie-mus": infoAboutHTML, atsiliepimai: infoReviewsHTML, verslui: infoBusinessHTML, naujienlaiskis: infoNewsletterHTML }[kind] || infoHelpHTML;
  $("#infoRoot").innerHTML = html();
  document.title = `${{ "apie-mus": "Apie mus", atsiliepimai: "Atsiliepimai", verslui: "Verslui", naujienlaiskis: "Naujienlaiškis" }[kind] || "Pagalba"} | ${SET.shop}`;
  if (kind === "naujienlaiskis") newsletterUnsubscribe();
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
}
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest("[data-info]")) navigate("pagalba");
  // „pagalba#…“ – tame pačiame puslapyje slenkame be naujo įrašo
  const a = t?.closest('a[href^="pagalba#"]');
  if (a && ui.view === "info" && ui.path === "pagalba") {
    e.preventDefault();
    document.getElementById(a.getAttribute("href").split("#")[1])?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  }
});
