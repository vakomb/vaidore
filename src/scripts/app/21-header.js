// 21 - header'is, šoninis meniu, „Kvepalai“ išskleidžiamas meniu, paieška (kompiuteryje - pasiūlymai po lauku,
// telefone - langas), informacinė juosta ir poraštė. Kategorijos ir šeimos - iš katalogo (administravimo skydelio).
// Informacinė juosta - kelios trumpos žinutės, keičiasi vietoje kas 5 s (rodyklės - rankiniu būdu; sustoja užvedus,
// fokusuojant ir jei įjungtas „mažiau judesio“). Visos žinutės - tikri parduotuvės nustatymai.
// Juostos aukštis fiksuotas (--noteH), tekstas - iki 2 eilučių (v10, kaip parfumada.lt): kiekviena žinutė turi ilgą
// ir trumpą variantą; jei ilgas netelpa (siauras telefonas, nuo 360 px), rodomas trumpesnis.
// Visa juosta valdoma administravime (Pradžia → „Juosta virš header'io“), settings.topbar:
//   { on, seconds, arrows, anim: "slide" | "fade" | "none",
//     items: [{ id, on, text, short, href }]  - tekste *žodis* paryškinamas (akcento spalva); short - trumpesnis variantas,
//                                              rodomas, jei ilgas netelpa; href - nuoroda (santykinė arba https://)
//     style: { bg, bg2, grad: "solid" | "lr" | "mid", color, accent, fs, fsD, weight, ls, upper, h, hD, line } }
//   Nėra items - automatinės žinutės iš parduotuvės nustatymų (žemiau). Visos reikšmės - CSS kintamieji ant #topNote.
const note = { i: 0, t: 0, paused: false };
const fmtNote = tx => esc(tx).replace(/\*([^*]+)\*/g, "<b>$1</b>");
// Numatytosios žinutės (tikri nustatymai) - tokiu pat formatu kaip administravime
function autoNoteItems() {
  const free = eurShort(SET.freeShippingFrom);
  const sample = eur(Math.min(...PRODUCTS.filter(hasSample).map(p => p.sample)));
  const days = nb(dispatchText());
  const ret = nb(t("top.days", { n: SET.returnDays || 14 }));
  const v = { free, sample, days, ret };
  return [
    { id: "free", text: t("top.free", v), short: t("top.freeShort", v) },
    { id: "samples", text: nb(t("top.samples", v)), short: nb(t("top.samplesShort", v)) },
    { id: "dispatch", text: t("top.dispatch", v), short: t("top.dispatchShort", v) },
    SET.sampleCredit ? { id: "credit", text: t("top.credit"), short: t("top.creditShort") } : null,
    { id: "returns", text: t("top.returns", v), short: t("top.returnsShort", v) }
  ].filter(Boolean);
}
const topbarCfg = () => SET.topbar || {};
const noteItems = () => {
  const c = topbarCfg();
  const list = Array.isArray(c.items) ? c.items : autoNoteItems();
  return list.filter(x => x && x.on !== false && String(x.text || "").trim());
};
// Žinutė → HTML variantai (ilgas, trumpas); su nuoroda - visa žinutė paspaudžiama
function noteMessages() {
  return noteItems().map(x => {
    const wrap = h => {
      if (!x.href) return h;
      const ext = /^https?:\/\//.test(x.href);
      return `<a href="${esc(x.href)}"${ext ? ' target="_blank" rel="noopener"' : " data-nav"}>${h}</a>`;
    };
    return [x.text, x.short].filter(tx => String(tx || "").trim()).map(tx => wrap(fmtNote(tx)));
  });
}
// Stilius → CSS kintamieji (tušti - numatytieji iš 01-tokens.css)
function applyTopbarStyle() {
  const bar = $("#topNote");
  if (!bar) return;
  const c = topbarCfg();
  const st = c.style || {};
  const set = (k, v) => (v === "" || v == null ? bar.style.removeProperty(k) : bar.style.setProperty(k, String(v)));
  const hex = v => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : "");
  const bg = hex(st.bg);
  const bg2 = hex(st.bg2) || bg;
  set("--nbg", !bg ? "" : st.grad === "lr" ? `linear-gradient(90deg, ${bg} 0%, ${bg2} 100%)` : st.grad === "mid" ? `linear-gradient(90deg, ${bg} 0%, ${bg2} 50%, ${bg} 100%)` : bg);
  set("--nfg", hex(st.color));
  set("--nacc", hex(st.accent));
  const num = (v, lo, hi) => (v === "" || v == null || !isFinite(v) ? "" : Math.min(hi, Math.max(lo, Number(v))));
  set("--nfs", num(st.fs, 10, 30) !== "" ? `${num(st.fs, 10, 30)}px` : "");
  set("--nfsd", num(st.fsD, 10, 30) !== "" ? `${num(st.fsD, 10, 30)}px` : "");
  set("--nw", num(st.weight, 300, 800));
  set("--nls", num(st.ls, 0, 0.3) !== "" ? `${num(st.ls, 0, 0.3)}em` : "");
  set("--ntt", st.upper ? "uppercase" : "");
  set("--nh", num(st.h, 30, 110) !== "" ? `${num(st.h, 30, 110)}px` : "");
  set("--nhd", num(st.hD, 30, 110) !== "" ? `${num(st.hD, 30, 110)}px` : "");
  bar.classList.toggle("line", !!st.line);
  bar.classList.toggle("noArrows", c.arrows === false);
  bar.dataset.anim = c.anim || "slide";
  bar.hidden = c.on === false || !noteItems().length;
}
// Įrašo ilgiausią telpantį variantą (ne daugiau kaip 2 eilutės)
function fitNote() {
  const el = $("#topNoteTxt");
  const v = noteMessages()[note.i];
  if (!el || !v) return;
  for (const tx of v) {
    el.innerHTML = tx;
    if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) return;
  }
}
function showNote(step = 0) {
  const msgs = noteMessages();
  if (!msgs.length) return;
  note.i = (note.i + step + msgs.length) % msgs.length;
  const el = $("#topNoteTxt");
  el.classList.remove("in");
  void el.offsetWidth;
  fitNote();
  if (($("#topNote").dataset.anim || "slide") !== "none") el.classList.add("in");
}
window.addEventListener("resize", () => {
  clearTimeout(note.r);
  note.r = setTimeout(fitNote, 120);
});
function renderTopNote() {
  applyTopbarStyle();
  note.i = Math.min(note.i, Math.max(0, noteMessages().length - 1));
  showNote(0);
  const bar = $("#topNote");
  if (!bar.dataset.bound) {
    bar.dataset.bound = "1";
    bar.addEventListener("click", e => {
      const b = e.target instanceof Element && e.target.closest("[data-note-step]");
      if (b) showNote(Number(b.dataset.noteStep));
    });
    bar.addEventListener("mouseenter", () => (note.paused = true));
    bar.addEventListener("mouseleave", () => (note.paused = false));
    bar.addEventListener("focusin", () => (note.paused = true));
    bar.addEventListener("focusout", () => (note.paused = false));
  }
  clearInterval(note.t);
  const secs = Number(topbarCfg().seconds ?? 5);
  if (!reduceMotion() && secs > 0 && noteMessages().length > 1) note.t = setInterval(() => !note.paused && !document.hidden && showNote(1), secs * 1000);
}
// Kompiuteryje - antra header'io eilutė (tamsi juosta su kategorijomis). v10 (kaip parfumada.lt): 16 px / 700,
// „Moterims / Vyrams / Unisex“ - išskleidžiamame „Pagal lytį“, kad visos nuorodos tilptų vienoje eilutėje.
// Visos nuorodos vienoje eilutėje: jei netelpa (siauresnis kompiuteris, yra „Nuolaidos“), slepiamos mažiausiai svarbios
// (data-fit - kuo didesnis, tuo anksčiau slepiama); jos lieka šoniniame meniu ir poraštėje
function renderHeaderNav() {
  const fit = { verslui: 3, "apie-mus": 4, atsiliepimai: 5, naujienos: 2, bestselleriai: 1 };
  const link = (href, name, path = href) => `<a href="${href}" data-nav data-path="${path}"${fit[path] ? ` data-fit="${fit[path]}"` : ""}>${name}</a>`;
  // Kvepalai ▾ (lytis, kolekcijos, kvapo šeima - išskleidžiamame meniu) · kiti prekių tipai (tik jei yra prekių)
  $("#hdrNav").innerHTML = `<div class="hdrNavIn"><button type="button" id="megaBtn" aria-expanded="false" aria-controls="mega">${t("type.kvepalai.name")}${glyph("chev-down")}</button>${typesInUse()
    .filter(tx => tx.id !== "kvepalai")
    .map(tx => link(tx.id, tx.name))
    .join("")}
${saleList().length ? link("nuolaidos", t("nav.sale")) : ""}${DISC ? link("rinkinys", t("nav.sets")) : ""}${link("meginukai", t("nav.samples"))}${link("bestselleriai", t("nav.best"))}${link(
    "kvepalai?rikiuoti=new",
    t("nav.new"),
    "naujienos"
  )}${visibleCategories()
    .slice(0, 1)
    .map(c => link(`kategorija/${c.id}`, esc(L(c, "name"))))
    .join("")}<button type="button" data-quiz data-fit="6">${t("quiz.cta")}</button>${link("verslui", t("biz.title"))}${link("apie-mus", t("nav.story"), "apie-mus")}${link("atsiliepimai", t("pd.reviewsTitle"))}</div>`;
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
function megaHTML() {
  const h = SET.hero || {};
  const hp = BY_ID.get(h.product) || PRODUCTS[0];
  const cats = visibleCategories();
  return `<div class="megaIn">
<div class="megaCol"><h3>${t("type.kvepalai.name")}</h3><a href="kvepalai" data-nav>${t("type.kvepalai.title")}</a><a href="moterims" data-nav>${GENDER_NAME.moterims}</a><a href="vyrams" data-nav>${GENDER_NAME.vyrams}</a><a href="unisex" data-nav>${GENDER_NAME.unisex}</a><a href="kvepalai?rikiuoti=new" data-nav>${t("nav.new")}</a><a href="meginukai" data-nav>${nb(t("shop.samples.title"))}</a>${
    DISC ? `<a href="rinkinys" data-nav>${esc(L(DISC, "name"))}</a>` : ""
  }</div>
<div class="megaCol"><h3>${t("shop.collections")}</h3>${cats.map(c => `<a href="kategorija/${c.id}" data-nav>${esc(L(c, "name"))}</a>`).join("") || `<a href="kvepalai" data-nav>${t("type.kvepalai.title")}</a>`}</div>
<div class="megaCol"><h3>${t("nav.family")}</h3>${visibleFamilies()
    .map(f => `<a href="kvepalai?seima=${encodeURIComponent(f.id)}" data-nav>${esc(L(f, "name"))}</a>`)
    .join("")}</div>
<a class="megaFeat" href="${productUrl(hp)}" data-nav style="--tint:${hp.look.tint}"><span class="art" style="--tint:transparent">${artImg(hp)}</span><span><small>${esc(L(h, "eyebrow") || t("nav.collection"))}</small><b>${esc(L(h, "title") || L(hp, "name"))}</b><span>${esc(L(h, "text") || L(hp, "tagline"))}</span></span></a>
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
// Šoninis meniu (telefone ir planšetėje, v17 - kaip iOS programėlė): paieška → paskyros kortelė → sugrupuoti sąrašai
// (Parduotuvė - prekių tipai; Kvepalai - lytis, naujienos, bestselleriai, nuolaidos; Kolekcijos) → trys greiti pasirinkimai
// (mėginukai, rinkinys, testas) → Pagalba; apačioje - kiek liko iki nemokamo pristatymo (su juostele)
const TYPE_ICO = { kvepalai: "drop", difuzoriai: "spark", zvakes: "sun", aliejai: "drop", "elektriniai-difuzoriai": "home" };
function drawerHTML() {
  const cats = visibleCategories();
  const cur = ui.path || "";
  const row = (href, name, ico = "", extra = "") =>
    `<li><a class="mRow" href="${href}" data-nav${cur === href ? ' aria-current="page"' : ""}>${ico ? `<span class="mIco">${glyph(ico)}</span>` : ""}<span class="mTxt">${esc(name)}</span>${extra}${glyph("chev-right")}</a></li>`;
  const tile = (attrs, ico, name) => `<li><${attrs.startsWith("href") ? "a" : "button type=\"button\""} class="navTile" ${attrs}>${glyph(ico)}<span>${esc(name)}</span></${attrs.startsWith("href") ? "a" : "button"}></li>`;
  const favN = state.fav.size;
  const who = auth.user ? auth.profile?.name || auth.user.email || t("nav.myAccount") : t("nav.signIn");
  const initials = auth.user ? (auth.profile?.name || auth.user.email || "?").trim().slice(0, 1).toUpperCase() : "";
  const left = shipLeft();
  const free = Number(SET.freeShippingFrom) || 0;
  const pct = state.cart.length && free ? Math.min(100, Math.round(((free - Math.max(0, left)) / free) * 100)) : 0;
  return `<header class="drawerHead"><a class="logo" href="./" data-nav aria-label="${t("nav.homeAria", { shop: "Vaidore" })}"><span>${logoHTML()}</span></a><button class="iconBtn" type="button" data-sheet-close aria-label="${t("nav.closeMenu")}">${glyph("x")}</button></header>
<div class="drawerBody">
<button class="navSearch" type="button" data-drawer-search>${glyph("search")}<span>${t("search.drawer")}</span></button>
<a class="mAcct" href="paskyra" data-nav><span class="mAvatar"${initials ? "" : ' aria-hidden="true"'}>${initials ? esc(initials) : glyph("user")}</span><span class="mAcctTxt"><b>${esc(who)}</b><small>${
    auth.user ? t("nav.accSub") : t("nav.accSubGuest")
  }</small></span>${glyph("chev-right")}</a>
<ul class="mGroup">${row("visos-prekes", t("shop.all.title"), "grid")}${typesInUse()
    .map(tx => row(tx.id, tx.name, TYPE_ICO[tx.id] || "tag"))
    .join("")}${row("megstami", t("fav.title"), "heart", favN ? `<b class="mCount">${favN}</b>` : "")}</ul>
<p class="mHead">${t("type.kvepalai.name")}</p>
<ul class="mGroup">${row("moterims", GENDER_NAME.moterims)}${row("vyrams", GENDER_NAME.vyrams)}${row("unisex", GENDER_NAME.unisex)}${row("kvepalai?rikiuoti=new", t("nav.new"))}${row("bestselleriai", t("nav.best"))}${
    saleList().length ? row("nuolaidos", t("nav.sale")) : ""
  }</ul>
${cats.length ? `<p class="mHead">${t("shop.collections")}</p><ul class="mGroup">${cats.map(c => row(`kategorija/${c.id}`, L(c, "name"))).join("")}</ul>` : ""}
<p class="mHead">${t("nav.discover")}</p>
<ul class="navTiles">${tile('href="meginukai" data-nav', "drop", nb(t("shop.samples.title")))}${DISC ? tile("data-disc", "box", L(DISC, "name")) : ""}${tile("data-quiz", "spark", t("quiz.cta"))}</ul>
<p class="mHead">${t("help.title")}</p>
<ul class="mGroup">${row("pagalba", t("pd.shipReturns"), "truck")}${row("apie-mus", t("nav.story"), "doc")}${row("atsiliepimai", t("pd.reviewsTitle"), "star")}${row("verslui", t("biz.title"), "box")}${row(
    "pagalba#kontaktai",
    t("nav.contact"),
    "mail"
  )}${auth.isAdmin ? row("admin", "Administravimas", "gear") : ""}</ul>
${langRowHTML()}
</div>
<footer class="drawerFoot"><p class="navShip">${glyph("truck")}<span>${
    !state.cart.length ? t("nav.freeFrom", { price: `<b>${eurShort(SET.freeShippingFrom)}</b>` }) : left > 0 ? t("cart.freeLeft", { sum: `<b>${eur(left)}</b>` }) : `<b>${t("cart.freeDone")}</b>`
  }</span></p>${state.cart.length ? `<span class="mShipBar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ""}</footer>`;
}
function openDrawer() {
  $("#drawer").innerHTML = drawerHTML();
  showOverlay("drawer");
  $("#menuBtn").setAttribute("aria-expanded", "true");
}

// Paieška: pasiūlymai (iki 6 kvapų) + „Visi rezultatai“
function suggHTML(q) {
  const list = q ? PRODUCTS.filter(p => matches(p, q)).slice(0, 6) : [...PRODUCTS].sort((a, b) => a.rank - b.rank).slice(0, 4);
  if (!list.length) return `<p class="suggEmpty">${t("search.none", { q: esc(q) })} <button class="linkBtn" type="button" data-quiz>${t("quiz.cta")}</button></p>`;
  return `${q ? "" : `<p class="navSub" style="padding:6px 8px">${t("cart.popular")}</p>`}${list
    .map(
      p =>
        `<a class="sugg" href="${productUrl(p)}" data-nav><span class="art" style="--tint:${p.look.tint}">${artImg(p)}</span><span><b>${esc(L(p, "name"))}</b>${inspiredOf(p) ? inspiredHTML(p, "sm") : `<small>${esc(familyName(p.family))} · ${esc(L(p, "tagline"))}</small>`}</span><span class="money">${eurShort(minPrice(p))}</span></a>`
    )
    .join("")}${q ? `<a class="suggAll" href="kvepalai?q=${encodeURIComponent(q)}" data-nav>${t("search.all", { q: esc(q) })}</a>` : ""}`;
}
function openSearchSheet() {
  openSheet({
    title: t("search.title"),
    html: `<div class="sheetPad"><form class="search" role="search" data-search-form><span aria-hidden="true">${glyph("search")}</span><input type="search" name="q" placeholder="${t("search.ph")}" autocomplete="off" enterkeyhint="search" aria-label="${t("search.title")}" /></form><div class="suggList" style="margin-top:10px">${suggHTML("")}</div></div>`
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
  // Paieška: kompiuteryje (v17) - laukas visada matomas header'io kairėje (piktograma paslėpta); telefone ir planšetėje - langas
  $("#searchBtn").addEventListener("click", () => (matchMedia("(min-width: 1024px)").matches ? setHdrSearch(true) : openSearchSheet()));
  // Meniu paieškos laukas - paieškos langas atsidaro meniu vietoje
  $("#drawer").addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("[data-drawer-search]")) openSearchSheet();
  });
  // „Kvepalai“ meniu: paspaudus arba užvedus (kompiuteryje)
  const hdr = $("#hdr");
  let megaT = 0;
  hdr.addEventListener("click", e => {
    const tx = e.target instanceof Element ? e.target : null;
    if (tx?.closest("#megaBtn")) return setMega($("#mega").hidden);
    if (tx?.closest("#mega a")) setMega(false);
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
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#mega").hidden) setMega(false), $("#megaBtn")?.focus();
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
      q.blur();
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
  // Užslinkus - švelnus šešėlis (klasė keičiama tik pasikeitus būsenai - slenkant nieko neperskaičiuojama)
  let on = null;
  const onScroll = () => {
    const v = window.scrollY > 4;
    if (v !== on) hdr.classList.toggle("scrolled", (on = v));
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
  $("#megaBtn")?.toggleAttribute("data-current", ["kvepalai", "moterims", "vyrams", "unisex", "meginukai"].includes(path) || path.startsWith("kategorija/"));
  setMega(false);
}
// Poraštė - šviesi ir kompaktiška: telefone naujienlaiškis → trys išskleidžiamos grupės (Parduotuvė, Pagalba, Vaidore)
// → kontaktai → mokėjimo būdai → © ir teisinės nuorodos; kompiuteryje - viena eilė: prekės ženklas ir kontaktai, trys
// nuorodų stulpeliai (visada atskleisti), naujienlaiškis dešinėje
const ftrDesk = matchMedia("(min-width: 1024px)");
function renderFooter() {
  const a = (href, name, nav = true) => `<a href="${href}"${nav ? " data-nav" : ""}>${esc(name)}</a>`;
  const grp = (title, links) =>
    `<details class="ftrGrp"><summary>${esc(title)}${glyph("chev-down")}</summary><div class="ftrGrpBody">${links.join("")}</div></details>`;
  const ph = filled(SET.company.phone) ? SET.company.phone : "";
  $("#ftrIn").innerHTML = `<div class="ftrMain">
<div class="ftrNews">${newsletterFormHTML("footer")}</div>
${grp(t("ftr.shop"), [
  a("visos-prekes", t("shop.all.title")),
  ...typesInUse().map(tx => a(tx.id, tx.name)),
  a("kvepalai?rikiuoti=new", t("nav.new")),
  a("bestselleriai", t("nav.best")),
  a("meginukai", nb(t("shop.samples.title")))
])}
${grp(t("help.title"), [
  a("pagalba#pristatymas", t("help.delivery")),
  a("pagalba#grazinimas", t("help.returns")),
  a("pagalba#duk", t("help.faq")),
  a("pagalba#kontaktai", t("nav.contact")),
  a("paskyra", t("nav.myAccount"))
])}
${grp("Vaidore", [a("apie-mus", t("nav.story")), a("atsiliepimai", t("pd.reviewsTitle")), a("verslui", t("biz.title"))])}
<div class="ftrBrand"><a class="logo" href="./" data-nav aria-label="${esc(t("nav.homeAria", { shop: SET.shop }))}"><span>${logoHTML()}</span></a>
<ul class="ftrContact"><li>${glyph("mail")}<a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a></li>${
    ph ? `<li>${glyph("phone")}<a href="tel:${esc(ph.replace(/\s+/g, ""))}">${esc(ph)}</a></li>` : ""
  }<li>${glyph("truck")}<span>${esc(nb(t("pd.dispatch", { d: dispatchText() })))} · ${t("ftr.freeFrom", { price: eurShort(SET.freeShippingFrom) })}</span></li></ul></div>
</div>
<div class="ftrPay" aria-label="${t("ftr.payAria")}">${PAY_MARKS}</div>
<div class="ftrBottom"><small>${companyLine()}</small><small class="ftrLegal">${a("salygos", t("ftr.terms"), false)}${a("privatumas", t("ftr.privacy"), false)}</small>${langFooterHTML()}</div>`;
  syncFooterGroups();
}
// Kompiuteryje grupės visada atskleistos (stulpeliai), telefone - suskleistos, atsidaro paspaudus
function syncFooterGroups() {
  $$("#ftrIn .ftrGrp").forEach(d => (d.open = ftrDesk.matches));
}
ftrDesk.addEventListener?.("change", syncFooterGroups);
document.addEventListener("click", e => {
  if (ftrDesk.matches && e.target instanceof Element && e.target.closest("#ftrIn .ftrGrp > summary")) e.preventDefault();
});
// Mokėjimo būdų ženkliukai (tekstiniai - be svetimų logotipų failų)
const PAY_MARKS = ["VISA", "Mastercard", "Apple Pay", "Google Pay"].map(tx => `<span>${tx}</span>`).join("");

