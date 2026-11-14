// 21 – header'is, šoninis meniu, „Kvepalai“ išskleidžiamas meniu, paieška (kompiuteryje – pasiūlymai po lauku,
// telefone – langas), informacinė juosta ir poraštė. Kategorijos ir šeimos – iš katalogo (administravimo skydelio).
const NOTE_KEY = "vaidore_note_v1";
function renderTopNote() {
  const txt = `Nemokamas pristatymas nuo <b>${eurShort(SET.freeShippingFrom)}</b><span class="noteMore"> · Išsiunčiame per ${esc(SET.dispatch || "1–2 d. d.")}</span>`;
  const note = $("#topNote");
  note.hidden = store.get(NOTE_KEY, "") === txt;
  $("#topNoteTxt").innerHTML = txt;
  $("#topNoteX").onclick = () => {
    store.set(NOTE_KEY, txt);
    note.hidden = true;
  };
}
function renderHeaderNav() {
  $("#hdrNav").innerHTML = `<button type="button" id="megaBtn" aria-expanded="false" aria-controls="mega">Kvepalai${glyph("chev-down")}</button>
<a href="moterims" data-nav data-path="moterims">Moterims</a><a href="vyrams" data-nav data-path="vyrams">Vyrams</a><a href="unisex" data-nav data-path="unisex">Unisex</a>
<a href="meginukai" data-nav data-path="meginukai">Mėginukai</a><button type="button" data-quiz>Rask savo kvapą</button>`;
}
function megaHTML() {
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  const cats = visibleCategories();
  return `<div class="megaIn">
<div class="megaCol"><h3>Kvepalai</h3><a href="kvepalai" data-nav>Visi kvepalai</a><a href="moterims" data-nav>Moterims</a><a href="vyrams" data-nav>Vyrams</a><a href="unisex" data-nav>Unisex</a><a href="kvepalai?rikiuoti=new" data-nav>Naujienos</a><a href="meginukai" data-nav>Mėginukai 2 ml</a>${
    DISC ? `<a href="rinkinys" data-nav>${esc(DISC.name)}</a>` : ""
  }</div>
<div class="megaCol"><h3>Kategorijos</h3>${cats.map(c => `<a href="kategorija/${c.id}" data-nav>${esc(c.name)}</a>`).join("") || `<a href="kvepalai" data-nav>Visi kvepalai</a>`}</div>
<div class="megaCol"><h3>Kvapo šeima</h3>${visibleFamilies()
    .map(f => `<a href="kvepalai?seima=${encodeURIComponent(f.id)}" data-nav>${esc(f.name)}</a>`)
    .join("")}</div>
<a class="megaFeat" href="${productUrl(hp)}" data-nav style="--tint:${hp.look.tint}"><span class="art" style="--tint:transparent">${artImg(hp)}</span><span><small>${esc(h.eyebrow || "Kolekcija")}</small><b>${esc(h.title || hp.name)}</b><span>${esc(h.text || hp.tagline)}</span></span></a>
</div>`;
}
function setMega(open) {
  const mega = $("#mega");
  const btn = $("#megaBtn");
  if (!btn) return;
  if (open && mega.hidden) mega.innerHTML = megaHTML();
  mega.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}
function drawerHTML() {
  const cats = visibleCategories();
  const cur = ui.path || "";
  const link = (href, name, ico) =>
    `<li><a href="${href}" data-nav${cur === href ? ' aria-current="page"' : ""}>${ico ? glyph(ico) : ""}${esc(name)}<span class="chevR">${glyph("chev-right")}</span></a></li>`;
  return `<header class="drawerHead"><a class="logo" href="./" data-nav aria-label="Vaidore – pradžia"><span>${logoHTML()}</span></a><button class="iconBtn" type="button" data-sheet-close aria-label="Uždaryti meniu">${glyph("x")}</button></header>
<div class="drawerBody">
<ul class="navList">${link("kvepalai", "Visi kvepalai", "grid")}${link("moterims", "Moterims")}${link("vyrams", "Vyrams")}${link("unisex", "Unisex")}</ul>
${cats.length ? `<p class="navSub">Kategorijos</p><ul class="navList">${cats.map(c => link(`kategorija/${c.id}`, c.name)).join("")}</ul>` : ""}
<div class="navSep"></div>
<ul class="navList">${link("meginukai", "Mėginukai 2 ml", "drop")}${DISC ? `<li><button type="button" data-disc>${glyph("box")}${esc(DISC.name)}</button></li>` : ""}<li><button type="button" data-quiz>${glyph("spark")}Rask savo kvapą</button></li></ul>
<div class="navSep"></div>
<ul class="navList">${link("megstami", `Mėgstami${state.fav.size ? ` (${state.fav.size})` : ""}`, "heart")}${link("paskyra", auth.user ? "Mano paskyra" : "Prisijungti / registruotis", "user")}${
    auth.isAdmin ? link("admin", "Administravimas", "gear") : ""
  }</ul>
<div class="navSep"></div>
<ul class="navList">${link("pagalba", "Pristatymas ir grąžinimas")}${link("apie-mus", "Apie mus")}<li><a class="small" href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></li></ul>
</div>
<footer class="drawerFoot"><div class="ship${shipLeft() <= 0 && state.cart.length ? " done" : ""}"><div class="shipTxt">${glyph("truck")}<span>${
    !state.cart.length
      ? `Nemokamas pristatymas nuo <b>${eur(SET.freeShippingFrom)}</b>`
      : shipLeft() > 0
        ? `Iki nemokamo pristatymo liko <b>${eur(shipLeft())}</b>`
        : "<b>Pristatymas nemokamas</b>"
  }</span></div></div></footer>`;
}
function openDrawer() {
  $("#drawer").innerHTML = drawerHTML();
  showOverlay("drawer");
  $("#menuBtn").setAttribute("aria-expanded", "true");
}

// Paieška: pasiūlymai (iki 6 kvapų) + „Visi rezultatai“
function suggHTML(q) {
  const list = q ? PRODUCTS.filter(p => matches(p, q)).slice(0, 6) : [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 4);
  if (!list.length) return `<p class="suggEmpty">Nieko neradome pagal „${esc(q)}“. <button class="linkBtn" type="button" data-quiz>Rask savo kvapą</button></p>`;
  return `${q ? "" : `<p class="navSub" style="padding:6px 8px">Populiariausi</p>`}${list
    .map(
      p =>
        `<a class="sugg" href="${productUrl(p)}" data-nav><span class="art" style="--tint:${p.look.tint}">${artImg(p)}</span><span><b>${esc(p.name)}</b><small>${esc(familyName(p.family))} · ${esc(p.tagline)}</small></span><span class="money">${eurShort(minPrice(p))}</span></a>`
    )
    .join("")}${q ? `<a class="suggAll" href="kvepalai?q=${encodeURIComponent(q)}" data-nav>Visi rezultatai: „${esc(q)}“</a>` : ""}`;
}
function openSearchSheet() {
  openSheet({
    title: "Paieška",
    html: `<div class="sheetPad"><form class="search" role="search" data-search-form><span aria-hidden="true">${glyph("search")}</span><input type="search" name="q" placeholder="Kvapas, nata ar nuotaika" autocomplete="off" enterkeyhint="search" aria-label="Paieška" /></form><div class="suggList" style="margin-top:10px">${suggHTML("")}</div></div>`
  });
  const root = $("#sheetBody");
  const input = $("input", root);
  requestAnimationFrame(() => input.focus());
  input.addEventListener("input", () => ($(".suggList", root).innerHTML = suggHTML(input.value.trim())));
  $("form", root).addEventListener("submit", e => {
    e.preventDefault();
    const q = input.value.trim();
    navigate(q ? `kvepalai?q=${encodeURIComponent(q)}` : "kvepalai");
  });
}
function bindHeader() {
  renderTopNote();
  renderHeaderNav();
  $("#menuBtn").addEventListener("click", openDrawer);
  $("#searchBtn").addEventListener("click", openSearchSheet);
  // „Kvepalai“ meniu: paspaudus arba užvedus (kompiuteryje)
  const hdr = $("#hdr");
  let megaT = 0;
  hdr.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("#megaBtn")) return setMega($("#mega").hidden);
    if (t?.closest("#mega a")) setMega(false);
  });
  hdr.addEventListener("mouseover", e => {
    if (!(e.target instanceof Element)) return;
    clearTimeout(megaT);
    if (e.target.closest("#megaBtn")) megaT = setTimeout(() => setMega(true), 120);
  });
  hdr.addEventListener("mouseleave", () => {
    clearTimeout(megaT);
    megaT = setTimeout(() => setMega(false), 180);
  });
  hdr.addEventListener("mouseover", e => {
    if (e.target instanceof Element && e.target.closest(".hdrNav a, .hdrTools")) {
      clearTimeout(megaT);
      megaT = setTimeout(() => setMega(false), 120);
    }
  });
  document.addEventListener("keydown", e => e.key === "Escape" && !$("#mega").hidden && setMega(false));
  // Kompiuterio paieška
  const form = $("#hdrSearch");
  const q = $("#hdrQ");
  const pop = $("#searchPop");
  const showPop = () => {
    pop.innerHTML = suggHTML(q.value.trim());
    pop.hidden = false;
  };
  q.addEventListener("focus", showPop);
  q.addEventListener("input", showPop);
  q.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      pop.hidden = true;
      q.blur();
    }
  });
  form.addEventListener("focusout", () => setTimeout(() => !form.contains(document.activeElement) && (pop.hidden = true), 120));
  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = q.value.trim();
    pop.hidden = true;
    q.blur();
    navigate(v ? `kvepalai?q=${encodeURIComponent(v)}` : "kvepalai");
  });
  pop.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("a")) {
      pop.hidden = true;
      q.value = "";
    }
  });
  // Užslinkus – matinis stiklas
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => hdr.classList.toggle("scrolled", window.scrollY > 4));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
function updateNavCurrent(path) {
  $$("#hdrNav [data-path]").forEach(a => (a.dataset.path === path ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  setMega(false);
}
function renderFooter() {
  const cats = visibleCategories().slice(0, 4);
  $("#ftrIn").innerHTML = `<div class="ftrBrand"><a class="logo" href="./" data-nav aria-label="Vaidore – pradžia"><span>${logoHTML()}</span></a><p>${esc(SET.tagline || "")}</p></div>
<div class="ftrCols">
<div class="ftrCol"><h3>Parduotuvė</h3><a href="kvepalai" data-nav>Visi kvepalai</a><a href="moterims" data-nav>Moterims</a><a href="vyrams" data-nav>Vyrams</a><a href="unisex" data-nav>Unisex</a>${cats
    .map(c => `<a href="kategorija/${c.id}" data-nav>${esc(c.name)}</a>`)
    .join("")}<a href="meginukai" data-nav>Mėginukai</a></div>
<div class="ftrCol"><h3>Pagalba</h3><a href="pagalba#pristatymas" data-nav>Pristatymas</a><a href="pagalba#grazinimas" data-nav>Grąžinimas</a><a href="pagalba#duk" data-nav>DUK</a><a href="pagalba#kontaktai" data-nav>Kontaktai</a><button type="button" data-quiz>Rask savo kvapą</button></div>
<div class="ftrCol"><h3>Įmonė</h3><a href="apie-mus" data-nav>Apie mus</a><a href="paskyra" data-nav>Mano paskyra</a><a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></div>
<div class="ftrCol"><h3>Teisė</h3><a href="salygos">Pirkimo sąlygos</a><a href="privatumas">Privatumo politika</a><a href="pagalba#grazinimas" data-nav>Grąžinimo tvarka</a></div>
</div>
<div class="ftrBottom"><span>${companyLine()}</span><span class="payMarks" aria-label="Mokėjimo būdai"><span>VISA</span><span>Mastercard</span><span>Apple Pay</span><span>Google Pay</span></span></div>`;
}
