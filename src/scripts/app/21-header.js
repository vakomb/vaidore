// 21 – header'is, šoninis meniu, „Kvepalai“ išskleidžiamas meniu, paieška (kompiuteryje – pasiūlymai po lauku,
// telefone – langas), informacinė juosta ir poraštė. Kategorijos ir šeimos – iš katalogo (administravimo skydelio).
// Informacinė juosta – kelios trumpos žinutės, keičiasi vietoje kas 5 s (rodyklės – rankiniu būdu; sustoja užvedus,
// fokusuojant ir jei įjungtas „mažiau judesio“). Visos žinutės – tikri parduotuvės nustatymai.
// Juostos aukštis fiksuotas (--noteH), tekstas – iki 2 eilučių (v10, kaip parfumada.lt): kiekviena žinutė turi ilgą
// ir trumpą variantą; jei ilgas netelpa (siauras telefonas, nuo 360 px), rodomas trumpesnis.
const note = { i: 0, t: 0, paused: false };
function noteMessages() {
  const free = eurShort(SET.freeShippingFrom);
  const sample = eur(Math.min(...PRODUCTS.map(p => p.sample)));
  const days = esc(SET.dispatch || "1–2 d. d.");
  const ret = `${SET.returnDays || 14} d.`;
  return [
    [`Nemokamas pristatymas nuo <b>${free}</b>`, `Nemokamas pristatymas nuo <b>${free}</b>`, `Nemokamai nuo <b>${free}</b>`],
    [`Kiekvieną kvapą – ir <b>2 ml mėginuku</b> nuo ${sample}`, `<b>2 ml mėginukai</b> nuo ${sample}`, `Mėginukai nuo <b>${sample}</b>`],
    [`Išsiunčiame per <b>${days}</b> · Omniva ir DPD`, `Išsiunčiame per <b>${days}</b>`, `Išsiunčiame per <b>${days}</b>`],
    SET.sampleCredit ? [`Mėginukų kainą <b>grąžiname</b> perkant buteliuką`, `Mėginuko kainą <b>grąžiname</b>`, `Mėginuko kaina <b>grąžinama</b>`] : null,
    [`Grąžinimas per <b>${ret}</b> · Saugus apmokėjimas`, `Grąžinimas per <b>${ret}</b>`, `Grąžinimas per <b>${ret}</b>`]
  ].filter(Boolean);
}
// Įrašo ilgiausią telpantį variantą (ne daugiau kaip 2 eilutės)
function fitNote() {
  const el = $("#topNoteTxt");
  const v = noteMessages()[note.i];
  if (!el || !v) return;
  for (const t of v) {
    el.innerHTML = t;
    if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) return;
  }
}
function showNote(step = 0) {
  const msgs = noteMessages();
  note.i = (note.i + step + msgs.length) % msgs.length;
  const el = $("#topNoteTxt");
  el.classList.remove("in");
  void el.offsetWidth;
  fitNote();
  el.classList.add("in");
}
window.addEventListener("resize", () => {
  clearTimeout(note.r);
  note.r = setTimeout(fitNote, 120);
});
function renderTopNote() {
  showNote(0);
  const bar = $("#topNote");
  if (bar.dataset.bound) return;
  bar.dataset.bound = "1";
  bar.addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest("[data-note-step]");
    if (b) showNote(Number(b.dataset.noteStep));
  });
  bar.addEventListener("mouseenter", () => (note.paused = true));
  bar.addEventListener("mouseleave", () => (note.paused = false));
  bar.addEventListener("focusin", () => (note.paused = true));
  bar.addEventListener("focusout", () => (note.paused = false));
  clearInterval(note.t);
  if (!reduceMotion()) note.t = setInterval(() => !note.paused && !document.hidden && showNote(1), 5000);
}
// Kompiuteryje – antra header'io eilutė (tamsi juosta su kategorijomis). v10 (kaip parfumada.lt): 16 px / 700,
// „Moterims / Vyrams / Unisex“ – išskleidžiamame „Pagal lytį“, kad visos nuorodos tilptų vienoje eilutėje.
// Visos nuorodos vienoje eilutėje: jei netelpa (siauresnis kompiuteris, yra „Nuolaidos“), slepiamos mažiausiai svarbios
// (data-fit – kuo didesnis, tuo anksčiau slepiama); jos lieka šoniniame meniu ir poraštėje
function renderHeaderNav() {
  const fit = { verslui: 3, "apie-mus": 4, atsiliepimai: 5, naujienos: 2, bestselleriai: 1 };
  const link = (href, name, path = href) => `<a href="${href}" data-nav data-path="${path}"${fit[path] ? ` data-fit="${fit[path]}"` : ""}>${name}</a>`;
  $("#hdrNav").innerHTML = `<div class="hdrNavIn"><button type="button" id="megaBtn" aria-expanded="false" aria-controls="mega">Visi kvepalai${glyph("chev-down")}</button>
<div class="navDd" id="navDd"><button type="button" id="genderBtn" aria-expanded="false" aria-controls="genderMenu">Pagal lytį${glyph("chev-down")}</button><div class="navDdMenu" id="genderMenu" hidden>${link("moterims", "Moterims")}${link("vyrams", "Vyrams")}${link("unisex", "Unisex")}</div></div>
${saleList().length ? link("nuolaidos", "Nuolaidos") : ""}${DISC ? link("rinkinys", "Rinkiniai") : ""}${link("meginukai", "Mėginukai")}${link("bestselleriai", "Bestselleriai")}${link(
    "kvepalai?rikiuoti=new",
    "Naujienos",
    "naujienos"
  )}${visibleCategories()
    .slice(0, 1)
    .map(c => link(`kategorija/${c.id}`, esc(c.name)))
    .join("")}<button type="button" data-quiz data-fit="6">Rask savo kvapą</button>${link("verslui", "Verslui")}${link("apie-mus", "Mūsų istorija", "apie-mus")}${link("atsiliepimai", "Atsiliepimai")}</div>`;
  fitHeaderNav();
}
function fitHeaderNav() {
  const n = $("#hdrNav .hdrNavIn");
  if (!n) return;
  const items = $$("[data-fit]", n).sort((a, b) => b.dataset.fit - a.dataset.fit);
  items.forEach(a => (a.hidden = false));
  if (!matchMedia("(min-width: 1024px)").matches) return;
  for (const a of items) {
    if (n.scrollWidth <= n.clientWidth + 1) break;
    a.hidden = true;
  }
}
window.addEventListener("resize", () => {
  clearTimeout(window.__vdNavT);
  window.__vdNavT = setTimeout(fitHeaderNav, 120);
});
function setGender(open) {
  const btn = $("#genderBtn");
  if (!btn) return;
  $("#genderMenu").hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
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
<ul class="navList">${link("kvepalai", "Visi kvepalai", "grid")}${link("moterims", "Moterims")}${link("vyrams", "Vyrams")}${link("unisex", "Unisex")}${
    saleList().length ? link("nuolaidos", "Didžiausios nuolaidos") : ""
  }${link("bestselleriai", "Bestselleriai")}${link("kvepalai?rikiuoti=new", "Naujienos")}</ul>
${cats.length ? `<p class="navSub">Kategorijos</p><ul class="navList">${cats.map(c => link(`kategorija/${c.id}`, c.name)).join("")}</ul>` : ""}
<div class="navSep"></div>
<ul class="navList">${link("meginukai", "Mėginukai 2 ml", "drop")}${DISC ? `<li><button type="button" data-disc>${glyph("box")}${esc(DISC.name)}</button></li>` : ""}<li><button type="button" data-quiz>${glyph("spark")}Rask savo kvapą</button></li></ul>
<div class="navSep"></div>
<ul class="navList">${link("megstami", `Mėgstami${state.fav.size ? ` (${state.fav.size})` : ""}`, "heart")}${link("paskyra", auth.user ? "Mano paskyra" : "Prisijungti / registruotis", "user")}${
    auth.isAdmin ? link("admin", "Administravimas", "gear") : ""
  }</ul>
<div class="navSep"></div>
<ul class="navList">${link("pagalba", "Pristatymas ir grąžinimas")}${link("verslui", "Verslui")}${link("apie-mus", "Mūsų istorija")}${link("atsiliepimai", "Atsiliepimai")}${link(
    "pagalba#kontaktai",
    "Susisiekite"
  )}<li><a class="small" href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></li></ul>
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
        `<a class="sugg" href="${productUrl(p)}" data-nav><span class="art" style="--tint:${p.look.tint}">${artImg(p)}</span><span><b>${esc(p.name)}</b><small>${inspiredOf(p) ? `Įkvėpti ${esc(inspiredOf(p))}` : `${esc(familyName(p.family))} · ${esc(p.tagline)}`}</small></span><span class="money">${eurShort(minPrice(p))}</span></a>`
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
  // Paieška: kompiuteryje (kaip parfumada.lt) – tik piktograma, paspaudus header'yje atsiveria laukas; telefone – langas
  $("#searchBtn").addEventListener("click", () => (matchMedia("(min-width: 1024px)").matches ? setHdrSearch(true) : openSearchSheet()));
  // „Kvepalai“ meniu: paspaudus arba užvedus (kompiuteryje)
  const hdr = $("#hdr");
  let megaT = 0;
  hdr.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("#megaBtn")) return setGender(false), setMega($("#mega").hidden);
    if (t?.closest("#mega a")) setMega(false);
    if (t?.closest("#genderBtn")) return setMega(false), setGender($("#genderMenu").hidden);
    if (t?.closest("#genderMenu a")) setGender(false);
  });
  // „Pagal lytį“ – užvedus atsidaro, nuėjus – užsidaro; paspaudus kitur – užsidaro
  let ddT = 0;
  const dd = $("#navDd");
  dd.addEventListener("mouseenter", () => (clearTimeout(ddT), setMega(false), setGender(true)));
  dd.addEventListener("mouseleave", () => (ddT = setTimeout(() => setGender(false), 180)));
  document.addEventListener("click", e => e.target instanceof Element && !e.target.closest("#navDd") && setGender(false));
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
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#mega").hidden) setMega(false);
    if (!$("#genderMenu").hidden) setGender(false), $("#genderBtn").focus();
  });
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
      setHdrSearch(false);
      $("#searchBtn").focus();
    }
  });
  form.addEventListener("focusout", () =>
    setTimeout(() => {
      if (form.contains(document.activeElement)) return;
      pop.hidden = true;
      if (!q.value) setHdrSearch(false);
    }, 150)
  );
  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = q.value.trim();
    pop.hidden = true;
    q.blur();
    q.value = "";
    setHdrSearch(false);
    navigate(v ? `kvepalai?q=${encodeURIComponent(v)}` : "kvepalai");
  });
  pop.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("a")) {
      pop.hidden = true;
      q.value = "";
      setHdrSearch(false);
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
function setHdrSearch(open) {
  $("#hdr").classList.toggle("searchOpen", open);
  $("#searchBtn").setAttribute("aria-expanded", String(open));
  if (open) requestAnimationFrame(() => $("#hdrQ").focus());
}
function updateNavCurrent(path) {
  $$("#hdrNav [data-path]").forEach(a => (a.dataset.path === path ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  $("#genderBtn")?.toggleAttribute("data-current", ["moterims", "vyrams", "unisex"].includes(path));
  setMega(false);
  setGender(false);
}
// Poraštė (kaip parfumada.lt): naujienlaiškis viršuje → nuorodos be antraščių (3 stulpeliai kompiuteryje, vienas – telefone)
// → mokėjimo būdai → © ir smulkios teisinės nuorodos
function renderFooter() {
  const a = (href, name, nav = true) => `<a href="${href}"${nav ? " data-nav" : ""}>${name}</a>`;
  $("#ftrIn").innerHTML = `<div class="ftrNews">${newsletterFormHTML("footer")}</div>
<div class="ftrLinks">
<div class="ftrCol">${a("apie-mus", "Mūsų istorija")}${a("pagalba#kontaktai", "Susisiekite")}${a("atsiliepimai", "Atsiliepimai")}${a("verslui", "Verslui")}</div>
<div class="ftrCol">${a("salygos", "Pirkimo – pardavimo sąlygos", false)}${a("pagalba#pristatymas", "Prekių pristatymas")}${a("pagalba#grazinimas", "Prekių grąžinimas")}${a("pagalba#duk", "DUK")}</div>
<div class="ftrCol">${a("privatumas", "Privatumo politika", false)}${a("kvepalai", "Produktai")}${a("bestselleriai", "Bestselleriai")}${a("paskyra", "Mano paskyra")}</div>
</div>
<div class="ftrPay" aria-label="Mokėjimo būdai">${PAY_MARKS}</div>
<div class="ftrBottom"><small>${companyLine()}</small><small class="ftrLegal">${a("salygos", "Paslaugų teikimo sąlygos", false)}${a("privatumas", "Privatumo politika", false)}${a("pagalba#grazinimas", "Grąžinimo politika")}${a("pagalba#pristatymas", "Siuntimo politika")}${a("pagalba#kontaktai", "Kontaktinė informacija")}</small></div>`;
}
// Mokėjimo būdų ženkliukai (tekstiniai – be svetimų logotipų failų)
const PAY_MARKS = ["VISA", "Mastercard", "Apple Pay", "Google Pay", "Stripe"].map(t => `<span>${t}</span>`).join("");

