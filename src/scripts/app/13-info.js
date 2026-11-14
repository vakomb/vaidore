// 13 – Informacija: pristatymas, grąžinimas, apmokėjimas, kontaktai, teisiniai puslapiai (iOS „Settings“ stiliaus grupės).
function openInfo() {
  const ship = SET.shipping
    .map(
      o =>
        `<div class="row"><span class="rowIco">${glyph("truck")}</span><span class="rowTxt">${esc(o.name)}<small>${esc(o.days)}</small></span><b class="money">${eur(o.price)}</b></div>`
    )
    .join("");
  openSheet({
    title: "Informacija",
    url: "#/info",
    html: `<div class="sheetPad">
<p class="groupTitle">Pristatymas</p>
<div class="group">${ship}<div class="row"><span class="rowIco" style="background:var(--green)">${glyph("check")}</span><span class="rowTxt">Nemokamai<small>Užsakymams nuo ${eur(SET.freeShippingFrom)}</small></span></div></div>
<p class="groupTitle">Pirkimas</p>
<div class="group">
<div class="row"><span class="rowIco" style="background:#0F172A">${glyph("card")}</span><span class="rowTxt">Apmokėjimas<small>Kortelė, Apple Pay, Google Pay – saugiai per Stripe</small></span></div>
<div class="row"><span class="rowIco" style="background:#7C3AED">${glyph("return")}</span><span class="rowTxt">Grąžinimas per 14 d.<small>Neatidarytos, neišpakuotos prekės</small></span></div>
<div class="row"><span class="rowIco" style="background:#DB2777">${glyph("drop")}</span><span class="rowTxt">Mėginukai 2 ml<small>Išbandykite prieš pirkdami didelį buteliuką</small></span></div>
</div>
<p class="groupTitle">Kontaktai</p>
<div class="group">
<a class="row" href="mailto:${esc(SET.company.email)}"><span class="rowIco">${glyph("mail")}</span><span class="rowTxt">${esc(SET.company.email)}<small>Atsakome per 1 d. d.</small></span><span class="chev">${glyph("chev-right")}</span></a>
</div>
<p class="groupTitle">Dokumentai</p>
<div class="group">
<a class="row" href="/salygos"><span class="rowIco" style="background:#475569">${glyph("doc")}</span><span class="rowTxt">Pirkimo sąlygos</span><span class="chev">${glyph("chev-right")}</span></a>
<a class="row" href="/privatumas"><span class="rowIco" style="background:#475569">${glyph("shield")}</span><span class="rowTxt">Privatumo politika</span><span class="chev">${glyph("chev-right")}</span></a>
</div>
<p class="foot"><span>${esc(SET.company.name)} · ${esc(SET.company.code)}</span></p>
</div>`
  });
}
document.addEventListener("click", e => {
  if (e.target instanceof Element && e.target.closest("[data-info]")) openInfo();
});
