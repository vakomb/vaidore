// Administravimo skydelis (/admin, v16 - iOS stilius) - atskiras failas assets/admin.js, įkeliamas tik administratoriui
// (23-admin-loader.js). src/scripts/admin/*.js sujungiami eilės tvarka į vieną IIFE (bendras scope, be import/export).
// Programėlės funkcijos - per window.VD. Duomenys - tiesiai iš Supabase (sbRest) su administratoriaus teisėmis (RLS: is_admin());
// veiksmai, kuriems reikia paslapčių (laiškai, Stripe grąžinimai, perrinkimas) - per Edge Function shop/admin.
//
// Struktūra (5 skirtukai; telefone - apačioje, planšetėje - ikonų juosta kairėje, kompiuteryje - šoninis meniu):
//   Šiandien    admin                         apžvalga, „Reikia dėmesio“, maži likučiai, perkamiausi, naujausi užsakymai
//   Užsakymai   admin/uzsakymai[/<nr.>]       sąrašas → užsakymas (kompiuteryje - dviem stulpeliais)
//   Katalogas   admin/kvapai[/<id>]           Produktai (admin/kvapai/naujas - naujas)
//               admin/kvapu-sarasas[/<id>]    Kvapai (bendri kvapai, scents)
//               admin/kategorijos             Kolekcijos ir kvapo šeimos
//               admin/natos                   Natų biblioteka - ingredientų nuotraukos (15-pdp.js, v29)
//   Vitrina     admin/vitrina[/<dalis>]       skaidres, skyriai, plyteles, juosta (su peržiūra), korteles, istorija,
//                                             puslapiai (prekių puslapių tekstai pagal tipą, v29)
//   Daugiau     admin/daugiau                 Klientai, Nustatymai, Žurnalas, Atnaujinti svetainę, Atsijungti
//               admin/atsiliepimai, admin/laukia, admin/naujienlaiskis, admin/nustatymai/<grupė>, admin/zurnalas
// Seni adresai: admin/pradzia → admin/vitrina, admin/nustatymai(#…) → admin/daugiau / admin/nustatymai/<grupė>.
const VD = window.VD;
const { $, $$, esc, eur, plural, fold, slugify, fmtDate, fmtDateTime, glyph, hydrateIcons, bottleSVG, toast, openSheet, closeSheet, askConfirm, navigate, sbRest, sbFn, sbUpload, statusPill, ORDER_STATUS } = VD;

// Papildomos ikonos (tik administravimui)
Object.assign(VD.GLYPH, {
  store: '<path d="M4 9.5 5.6 4.5h12.8L20 9.5"/><path d="M4 9.5c0 1.5 1.1 2.6 2.5 2.6S9 11 9 9.5c0 1.5 1.1 2.6 2.5 2.6h1c1.4 0 2.5-1.1 2.5-2.6 0 1.5 1.1 2.6 2.5 2.6S20 11 20 9.5z"/><path d="M5.5 12v7.5h13V12M10 19.5v-4.2h4v4.2"/>',
  more: '<circle cx="12" cy="12" r="9"/><path stroke-width="2.6" d="M7.8 12h.01M12 12h.01M16.2 12h.01"/>',
  grip: '<path stroke-width="2.4" d="M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01"/>',
  dots: '<path stroke-width="2.6" d="M6 12h.01M12 12h.01M18 12h.01"/>'
});

// ── Skirtukai, skyriai, šoninis meniu ─────────────────
const TABS = [
  { id: "siandien", name: "Šiandien", ico: "chart", href: "admin" },
  { id: "uzsakymai", name: "Užsakymai", ico: "box", href: "admin/uzsakymai", counts: ["orders"] },
  { id: "katalogas", name: "Katalogas", ico: "tag", href: "admin/kvapai" },
  { id: "vitrina", name: "Vitrina", ico: "store", href: "admin/vitrina" },
  { id: "daugiau", name: "Daugiau", ico: "more", href: "admin/daugiau", counts: ["reviews", "restock"] }
];
// split - kompiuteryje sąrašas ir detalės dviem stulpeliais
const SECTIONS = {
  "": { tab: "siandien", name: "Šiandien", render: (m, p, s) => renderOverview(m, p, s) },
  uzsakymai: { tab: "uzsakymai", name: "Užsakymai", split: true, render: (m, p, s) => renderOrders(m, p, s) },
  kvapai: { tab: "katalogas", name: "Produktai", split: true, render: (m, p, s) => renderProducts(m, p, s) },
  "kvapu-sarasas": { tab: "katalogas", name: "Kvapai", split: true, render: (m, p, s) => renderScents(m, p, s) },
  kategorijos: { tab: "katalogas", name: "Kategorijos", render: (m, p, s) => renderCategories(m, p, s) },
  natos: { tab: "katalogas", name: "Natos", render: (m, p, s) => renderNotes(m, p, s) },
  vitrina: { tab: "vitrina", name: "Vitrina", render: (m, p, s) => renderVitrina(m, p, s) },
  daugiau: { tab: "daugiau", name: "Daugiau", render: (m, p, s) => renderMore(m, p, s) },
  atsiliepimai: { tab: "daugiau", name: "Atsiliepimai", render: (m, p, s) => renderReviews(m, p, s) },
  laukia: { tab: "daugiau", name: "Laukiantys", render: (m, p, s) => renderRestock(m, p, s) },
  naujienlaiskis: { tab: "daugiau", name: "Naujienlaiškis", render: (m, p, s) => renderNewsletter(m, p, s) },
  nustatymai: { tab: "daugiau", name: "Nustatymai", render: (m, p, s) => renderSettings(m, p, s) },
  zurnalas: { tab: "daugiau", name: "Žurnalas", render: (m, p, s) => renderLog(m, p, s) }
};
// Vitrinos ir nustatymų dalys (šoniniame meniu, Vitrinos ir Daugiau ekranuose)
const VITRINA = [
  ["skaidres", "Skaidrės"],
  ["skyriai", "Skyriai su produktais"],
  ["plyteles", "Plytelės"],
  ["juosta", "Juosta virš header'io"],
  ["korteles", "Prekių kortelės"],
  ["puslapiai", "Prekių puslapiai"],
  ["istorija", "Mūsų istorija"]
];
const SET_GROUPS = [
  ["parduotuve", "Parduotuvė", "store"],
  ["pristatymas", "Pristatymas ir grąžinimas", "truck"],
  ["meginukai", "Mėginukai ir pakavimas", "gift"],
  ["imone", "Įmonės rekvizitai", "doc"],
  ["matavimas", "Lankytojų matavimas", "chart"],
  ["vertimai", "Anglų kalba (EN)", "globe"]
];
const SIDE = [
  { name: "Šiandien", ico: "chart", href: "admin" },
  { name: "Užsakymai", ico: "box", href: "admin/uzsakymai", count: "orders" },
  {
    name: "Katalogas",
    ico: "tag",
    items: [
      ["admin/kvapai", "Produktai"],
      ["admin/kvapu-sarasas", "Kvapai"],
      ["admin/kategorijos", "Kategorijos"],
      ["admin/natos", "Natos"]
    ]
  },
  { name: "Vitrina", ico: "store", items: VITRINA.map(([id, n]) => [`admin/vitrina/${id}`, n]), hub: "admin/vitrina" },
  {
    name: "Klientai",
    ico: "users",
    items: [
      ["admin/atsiliepimai", "Atsiliepimai", "reviews"],
      ["admin/laukia", "Laukiantys", "restock"],
      ["admin/naujienlaiskis", "Naujienlaiškis"]
    ]
  },
  { name: "Nustatymai", ico: "gear", items: SET_GROUPS.map(([id, n]) => [`admin/nustatymai/${id}`, n]) },
  { name: "Žurnalas", ico: "clock", href: "admin/zurnalas" }
];
// Seni adresai
const OLD_SETTINGS_HASH = { parduotuve: "parduotuve", pristatymas: "pristatymas", meginukai: "meginukai", imone: "imone", matavimas: "matavimas", korteles: "korteles", ikvepti: "korteles", istorija: "istorija" };

const A = {
  sec: "",
  param: "",
  path: "",
  counts: {},
  seq: 0,
  last: {}, // paskutinis adresas kiekviename skirtuke (kaip iOS)
  _dirty: false,
  get dirty() {
    return this._dirty;
  },
  set dirty(v) {
    this._dirty = !!v;
    syncSave();
  }
};
const splitMQ = window.matchMedia("(min-width: 1024px)");
const isSplit = () => splitMQ.matches;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Pagalbinės ────────────────────────────────────────
const num = v => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
const centsEur = c => eur((Number(c) || 0) / 100);
// Kainos laukuose - su kableliu (lietuviškai); num() supranta ir kablelį, ir tašką
const dec = v => (v === "" || v == null ? "" : String(v).replace(".", ","));
const list = s =>
  String(s || "")
    .split(/[,\n]/)
    .map(x => x.trim())
    .filter(Boolean);
const attr = (cond, name) => (cond ? ` ${name}` : "");
const sel = cond => (cond ? " selected" : "");
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString();
const errText = err => {
  const m = String(err?.message || err || "Nepavyko");
  if (/row-level security|permission denied/i.test(m)) return "Neturite teisių šiam veiksmui";
  if (/duplicate key/i.test(m)) return "Toks įrašas (id) jau yra";
  if (/foreign key/i.test(m)) return "Įrašas naudojamas kitur - pirma pakeiskite susijusius įrašus";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Nėra ryšio - bandykite dar kartą";
  return m;
};
// Mygtukas „dirba“: išjungiamas ir rodo suktuką, kol vyksta veiksmas
async function busy(btn, fn) {
  if (!btn || btn.disabled) return;
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add("loading");
  btn.innerHTML = `<span class="spin"></span>${html}`;
  try {
    return await fn();
  } catch (err) {
    VD.logError("admin", err);
    toast(errText(err), { icon: "info", ms: 4200 });
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.classList.remove("loading");
      btn.innerHTML = html;
    }
    syncSave();
  }
}
// Edge Function shop/admin (laiškai, Stripe, perrinkimas). Klaidos tekstas - iš serverio.
async function shopAdmin(body) {
  const r = await sbFn("shop/admin", { method: "POST", body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Serveris: ${r.status}`);
  return d;
}
// Duomenų bazės eilutė → programėlės kvapas (buteliuko piešiniui, nuotraukai)
const appProduct = row => ({ ...row, look: row.look || {}, images: row.images || [], name: row.name || "Kvapas" });
const thumb = p => `<span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span>`;
// Katalogo pakeitimai programėlėje matomi iškart; statiniai (SEO) puslapiai atsinaujina po „Atnaujinti svetainę“
async function catalogChanged(msg = "Išsaugota") {
  A.dirty = false;
  await VD.refreshCatalog({ rerender: false }).catch(() => {});
  toast(`${msg} - parduotuvėje matoma iškart`, { icon: "check", action: "Atnaujinti svetainę", onAction: rebuildSite, ms: 5200 });
}
async function rebuildSite() {
  try {
    const d = await shopAdmin({ action: "rebuild" });
    if (d.done?.length) toast(`Svetainė atnaujinama (${d.done.join(", ")}) - po 1-2 min.`, { icon: "check", ms: 4200 });
    else toast("Automatinis atnaujinimas nenustatytas - žr. SKAITYK.txt (GITHUB_TOKEN arba VERCEL_DEPLOY_HOOK)", { icon: "info", ms: 6000 });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}
function downloadFile(name, text, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// CSV Excel'iui (LT): kabliataškis, BOM
const csv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
const emptyBox = (title, text = "", extra = "") => `<div class="axEmpty"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${extra}</div>`;
// Kraunant - skeleton eilutės, ne tuščias ekranas
const loading = (rows = 6) => `<div class="axSkel" aria-busy="true" aria-label="Įkeliama"><div class="ig">${'<div class="axSkelRow"><i></i><span><b></b><s></s></span></div>'.repeat(rows)}</div></div>`;
// Paleidžia skyriaus įkėlimą; jei vartotojas jau perėjo kitur - rezultato nebepiešia
const stale = seq => seq !== A.seq;

// ── Puslapio dalys ────────────────────────────────────
// Navigacijos juosta: atgal (kairėje) · pavadinimas (pasirodo nuslinkus) · veiksmai (dešinėje); didelė antraštė
// back: { href, label } - nuoroda atgal; save: { form, label, always } - „Išsaugoti“ (aktyvus tik kai yra pakeitimų)
function barHTML({ title = "", back = null, actions = "" } = {}) {
  return `<header class="axBar"><div class="axBarL">${back ? `<a class="axBack" href="${esc(back.href)}" data-nav>${glyph("chev-left")}<span>${esc(back.label)}</span></a>` : ""}<button class="axBack axPop" type="button" data-pop hidden>${glyph(
    "chev-left"
  )}<span></span></button></div><p class="axBarT" aria-hidden="true">${esc(title)}</p><div class="axBarR">${actions}</div></header>`;
}
function pageHTML({ title, back = null, actions = "", tools = "", body = "", sub = "", cls = "", titleId = true }) {
  return `<div class="axPage${cls ? ` ${cls}` : ""}">${barHTML({ title, back, actions })}<div class="axBody"><div class="axHead"><h1 class="axLarge"${titleId ? ' id="admTitle"' : ""}>${esc(title)}</h1>${
    sub ? `<p class="axSub">${sub}</p>` : ""
  }</div>${tools ? `<div class="axTools">${tools}</div>` : ""}${body}</div></div>`;
}
const saveBtn = ({ form = "", label = "Išsaugoti", always = false, attrs = "" } = {}) =>
  `<button class="axSave" type="${form ? "submit" : "button"}"${form ? ` form="${form}"` : ""}${always ? "" : " data-dirty disabled"}${attrs ? ` ${attrs}` : ""}>${esc(label)}</button>`;
const barBtn = (ico, label, extra = "") => `<button class="axBarBtn" type="button" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${glyph(ico)}</button>`;
const barLink = (ico, label, href, extra = "") => `<a class="axBarBtn" href="${esc(href)}" data-nav aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${glyph(ico)}</a>`;
function syncSave() {
  $$(".axSave[data-dirty]").forEach(b => {
    if (!b.classList.contains("loading")) b.disabled = !A._dirty;
  });
}
// Segmentuotas valdiklis (filtrai)
const segHTML = (items, cur, attrName) =>
  `<div class="axSeg" role="tablist">${items.map(([id, name, n]) => `<button role="tab" type="button" ${attrName}="${id}" aria-selected="${cur === id}">${esc(name)}${n != null ? ` <small>${n}</small>` : ""}</button>`).join("")}</div>`;
const searchHTML = (id, ph, value = "", label = "Paieška") =>
  `<label class="axSearch"><span data-glyph="search" aria-hidden="true"></span><input type="search" id="${id}" placeholder="${esc(ph)}" value="${esc(value)}" aria-label="${esc(label)}" enterkeyhint="search" autocomplete="off" /></label>`;
// Sugrupuotas sąrašas: antraštė, eilutės, poraštė
const groupHTML = (rows, { head = "", foot = "", cls = "" } = {}) => `${head ? `<h2 class="igHead">${head}</h2>` : ""}<div class="ig${cls ? ` ${cls}` : ""}">${rows}</div>${foot ? `<p class="igFoot">${foot}</p>` : ""}`;
// Eilutė su nuoroda: ikona / paveikslas, tekstas, reikšmė, „›“
function navRow({ href = "", ico = "", icoBg = "", lead = "", title, sub = "", value = "", badge = 0, count = "", attrs = "", danger = false, button = false, ext = false }) {
  const leadHTML = lead || (ico ? `<span class="axIco"${icoBg ? ` style="background:${icoBg}"` : ""}>${glyph(ico)}</span>` : "");
  const inner = `${leadHTML}<span class="axRowTxt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span>${value ? `<span class="axVal">${value}</span>` : ""}${count ? countBadge(count) : badge ? `<b class="axBadge">${badge}</b>` : ""}${
    danger ? "" : `<span class="axChev">${glyph(ext ? "ext" : "chev-right")}</span>`
  }`;
  const cls = `axRow${danger ? " danger" : ""}`;
  if (button || !href) return `<button class="${cls}" type="button" ${attrs}>${inner}</button>`;
  return `<a class="${cls}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : " data-nav"} ${attrs}>${inner}</a>`;
}
const pillHTML = (text, tone = "") => `<span class="pill${tone ? ` ${tone}` : ""}">${esc(text)}</span>`;

// ── Dviejų stulpelių vaizdas (kompiuteryje): sąrašas lieka, keičiasi tik detalės ──
function splitPanes(main, key) {
  let wrap = $(`.axSplit[data-key="${key}"]`, main);
  const fresh = !wrap;
  if (fresh) {
    main.innerHTML = `<div class="axSplit" data-key="${key}"><section class="axCol axListCol" id="admList" aria-label="Sąrašas"></section><section class="axCol axDetailCol" id="admDetail" aria-label="Detalės"></section></div>`;
    wrap = main.firstElementChild;
  }
  const old = $("#admDetail", wrap);
  const detail = old.cloneNode(false);
  old.replaceWith(detail);
  return { list: $("#admList", wrap), detail, fresh };
}
// Skyriams po „Daugiau“ - „‹ Daugiau“ (kompiuteryje - šoninis meniu)
const hubBack = () => (isSplit() ? null : { href: "admin/daugiau", label: "Daugiau" });
const detailEmpty = (ico, text) => `<div class="axDetailEmpty">${glyph(ico)}<p>${esc(text)}</p></div>`;
// Pažymima pasirinkta eilutė sąraše (kompiuteryje)
function markCurrent(listEl, href) {
  $$(".axRow[aria-current]", listEl).forEach(a => a.removeAttribute("aria-current"));
  const a = href && $(`.axRow[href="${CSS.escape(href)}"]`, listEl);
  if (a) {
    a.setAttribute("aria-current", "page");
    const col = a.closest(".axCol");
    if (col) {
      const r = a.getBoundingClientRect();
      const c = col.getBoundingClientRect();
      if (r.top < c.top + 110 || r.bottom > c.bottom) a.scrollIntoView({ block: "nearest" });
    }
  }
}

// ── Vidiniai ekranai (formose): [data-pane="main"] + [data-pane="<vardas>"]; eilutė [data-push="<vardas>"] ──
function pushPane(page, name) {
  const target = $(`[data-pane="${CSS.escape(name)}"]`, page);
  if (!target || !target.hidden) return target;
  const stack = (page._panes ||= []);
  const cur = $("[data-pane]:not([hidden])", page);
  const scroller = page.closest(".axCol") || document.scrollingElement;
  stack.push({ pane: cur, y: scroller.scrollTop, title: $(".axLarge", page).textContent });
  cur.hidden = true;
  target.hidden = false;
  if (!reduceMotion()) target.classList.add("axIn");
  setTimeout(() => target.classList.remove("axIn"), 360);
  setPageTitle(page, target.dataset.title || "", stack.at(-1).title);
  scroller.scrollTop = 0;
  const f = $("input:not([type=hidden]):not([type=checkbox]):not([type=file]), textarea", target);
  if (f && target.dataset.focus !== "no" && window.matchMedia("(pointer: fine)").matches) f.focus({ preventScroll: true });
  return target;
}
function popPane(page) {
  const stack = page?._panes;
  if (!stack?.length) return false;
  const cur = $("[data-pane]:not([hidden])", page);
  const prev = stack.pop();
  cur.hidden = true;
  prev.pane.hidden = false;
  if (!reduceMotion()) prev.pane.classList.add("axBackIn");
  setTimeout(() => prev.pane.classList.remove("axBackIn"), 360);
  setPageTitle(page, prev.title, stack.length ? stack.at(-1).title : null);
  const scroller = page.closest(".axCol") || document.scrollingElement;
  scroller.scrollTop = prev.y;
  page.dispatchEvent(new CustomEvent("axpop", { detail: { pane: cur.dataset.pane } }));
  return true;
}
function popAll(page) {
  while (page?._panes?.length) popPane(page);
}
function setPageTitle(page, title, backLabel) {
  $(".axLarge", page).textContent = title;
  $(".axBarT", page).textContent = title;
  const pop = $(".axPop", page);
  const link = $("a.axBack", page);
  if (backLabel != null) {
    pop.hidden = false;
    $("span", pop).textContent = backLabel;
    if (link) link.hidden = true;
  } else {
    pop.hidden = true;
    if (link) link.hidden = false;
  }
}
// Laukas paslėptame ekrane - atidaromas jo ekranas, laukas parodomas ir sufokusuojamas
function revealField(el) {
  if (!el) return;
  const pane = el.closest("[data-pane]");
  const page = el.closest(".axPage");
  if (pane?.hidden && page) {
    popAll(page);
    if (pane.dataset.pane !== "main") pushPane(page, pane.dataset.pane);
  }
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
    if (el.focus) setTimeout(() => el.focus({ preventScroll: true }), 280);
  });
}
// Formos klaida - rodoma viršuje (pagrindiniame ekrane)
function showFormErr(form, errors) {
  const err = $(".formErr", form);
  if (!err) return;
  err.hidden = !errors.length;
  err.textContent = errors.join(" · ");
  if (errors.length) {
    const page = form.closest(".axPage");
    popAll(page);
    err.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
  }
}
// Kompaktiška antraštė juostoje, kai didelė nuslenka
function watchTitle(scope) {
  for (const page of $$(".axPage", scope)) {
    const h = $(".axLarge", page);
    if (!h || page._io) continue;
    const root = page.closest(".axCol");
    page._io = new IntersectionObserver(([e]) => page.classList.toggle("scrolled", !e.isIntersecting), { root: root || null, rootMargin: "-52px 0px 0px 0px", threshold: 0 });
    page._io.observe(h);
  }
}

// ── Veiksmų lapas (action sheet), kontekstinis meniu, braukimas ──
function actionSheet({ title = "", text = "", actions = [] }) {
  return new Promise(resolve => {
    let pick = null;
    openSheet({
      // Pasirinkimų sąrašas (a.checked apibrėžtas): tekstas kairėje, pasirinktas - su varnele dešinėje
      html: `<div class="axSheet">${title || text ? `<div class="axSheetHead">${title ? `<b>${esc(title)}</b>` : ""}${text ? `<p>${esc(text)}</p>` : ""}</div>` : ""}<div class="axActs${actions.some(a => "checked" in a) ? " axPick" : ""}">${actions
        .map(
          a =>
            `<button type="button" class="axAct${a.danger ? " danger" : ""}" data-sheet-act="${esc(a.key)}"${attr(a.disabled, "disabled")}${"checked" in a ? ` role="menuitemradio" aria-checked="${!!a.checked}"` : ""}>${a.ico ? glyph(a.ico) : ""}<span>${esc(a.label)}</span>${a.checked ? glyph("check") : ""}</button>`
        )
        .join("")}</div><button type="button" class="axAct axActCancel" data-sheet-close>Atšaukti</button></div>`,
      onClose: () => resolve(pick)
    });
    $("#sheetBody").addEventListener("click", e => {
      const b = e.target instanceof Element && e.target.closest("[data-sheet-act]");
      if (!b) return;
      pick = b.dataset.sheetAct;
      closeSheet();
    });
  });
}
// Sąrašo eilučių greiti veiksmai: braukiant kairėn (telefone), ilgai palaikius, dešiniuoju pelės mygtuku arba „⋯“.
// getActs(cell) → [{ key, label, ico, tone, danger }]; onAct(cell, key)
function rowActions(box, getActs, onAct) {
  let sw = null;
  const close = (except = null) =>
    $$(".axCell.open", box).forEach(c => {
      if (c === except) return;
      c.classList.remove("open");
      $(".axRow", c).style.transform = "";
    });
  const actsHTML = acts =>
    `<div class="axSwipe">${acts
      .slice(0, 3)
      .map(a => `<button type="button" class="axSwAct ${a.tone || ""}" data-sw="${esc(a.key)}">${glyph(a.ico || "dots")}<span>${esc(a.short || a.label)}</span></button>`)
      .join("")}</div>`;
  const menu = async cell => {
    const acts = getActs(cell);
    if (!acts.length) return;
    const k = await actionSheet({ title: cell.dataset.title || "", actions: acts });
    if (k) onAct(cell, k);
  };
  box.addEventListener("contextmenu", e => {
    const cell = e.target instanceof Element && e.target.closest(".axCell");
    if (!cell || e.target.closest("input, textarea")) return;
    e.preventDefault();
    menu(cell);
  });
  box.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const more = t?.closest("[data-row-more]");
    if (more) {
      e.preventDefault();
      return menu(more.closest(".axCell"));
    }
    const b = t?.closest("[data-sw]");
    if (b) {
      e.preventDefault();
      const cell = b.closest(".axCell");
      close();
      return onAct(cell, b.dataset.sw);
    }
    if (box._swiped) {
      e.preventDefault();
      e.stopPropagation();
      box._swiped = false;
      return;
    }
    if ($(".axCell.open", box)) {
      e.preventDefault();
      close();
    }
  });
  box.addEventListener(
    "pointerdown",
    e => {
      if (e.pointerType !== "touch") return;
      const cell = e.target instanceof Element && e.target.closest(".axCell");
      if (!cell) return close();
      close(cell);
      const row = $(".axRow", cell);
      sw = { cell, row, x: e.clientX, y: e.clientY, dx: 0, on: false, base: cell.classList.contains("open") ? -cell._w : 0, t: setTimeout(() => sw && !sw.on && Math.abs(sw.dx) < 6 && (box._swiped = true) && menu(cell), 550) };
    },
    { passive: true }
  );
  box.addEventListener(
    "pointermove",
    e => {
      if (!sw) return;
      const dx = e.clientX - sw.x;
      const dy = e.clientY - sw.y;
      sw.dx = dx;
      if (!sw.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          clearTimeout(sw.t);
          sw = null;
          return;
        }
        if (Math.abs(dx) < 10) return;
        clearTimeout(sw.t);
        const acts = getActs(sw.cell);
        if (!acts.length) {
          sw = null;
          return;
        }
        $(".axSwipe", sw.cell)?.remove();
        sw.cell.insertAdjacentHTML("beforeend", actsHTML(acts));
        hydrateIcons(sw.cell);
        sw.cell._w = $(".axSwipe", sw.cell).offsetWidth;
        sw.on = true;
        sw.row.style.transition = "none";
      }
      const x = Math.max(-sw.cell._w - 30, Math.min(0, sw.base + dx));
      sw.row.style.transform = `translateX(${x}px)`;
    },
    { passive: true }
  );
  const end = () => {
    if (!sw) return;
    clearTimeout(sw.t);
    if (sw.on) {
      box._swiped = true;
      setTimeout(() => (box._swiped = false), 400);
      sw.row.style.transition = "";
      const open = sw.base + sw.dx < -sw.cell._w / 2;
      sw.cell.classList.toggle("open", open);
      sw.row.style.transform = open ? `translateX(${-sw.cell._w}px)` : "";
    }
    sw = null;
  };
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
}
// Eilės keitimas tempiant rankenėlę (⋮⋮); klaviatūra - ↑ ↓ ant rankenėlės. onMove(from, to)
function sortable(box, { item, handle = ".axGrip", onMove, axis = "y", touch = true }) {
  if (box._sortable) return;
  box._sortable = true;
  const items = () => $$(item, box).filter(el => el.parentElement === box || el.closest(item) === el);
  box.addEventListener("keydown", e => {
    const h = e.target instanceof Element && e.target.closest(handle);
    if (!h) return;
    const keys = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const all = items();
    const from = all.indexOf(h.closest(item));
    const to = from + (e.key === keys[0] ? -1 : 1);
    if (from < 0 || to < 0 || to >= all.length) return;
    onMove(from, to);
    requestAnimationFrame(() => $(handle, items()[to])?.focus());
  });
  box.addEventListener("pointerdown", e => {
    const h = e.target instanceof Element && e.target.closest(handle);
    if (!h || e.button > 0 || (!touch && e.pointerType === "touch")) return;
    const el = h.closest(item);
    const all = items();
    const from = all.indexOf(el);
    if (from < 0) return;
    e.preventDefault();
    h.setPointerCapture?.(e.pointerId);
    const pos = ev => (axis === "x" ? ev.clientX : ev.clientY);
    let start = pos(e);
    let moved = false;
    el.classList.add("axDragging");
    const move = ev => {
      let d = pos(ev) - start;
      if (!moved && Math.abs(d) < 5) return;
      moved = true;
      const sibs = items();
      const i = sibs.indexOf(el);
      const next = sibs[i + 1];
      const prev = sibs[i - 1];
      const size = n => (axis === "x" ? n.offsetWidth : n.offsetHeight);
      if (next && d > size(next) / 2) {
        next.after(el);
        start += size(next);
        d = pos(ev) - start;
      } else if (prev && d < -size(prev) / 2) {
        prev.before(el);
        start -= size(prev);
        d = pos(ev) - start;
      }
      el.style.transform = axis === "x" ? `translateX(${d}px)` : `translateY(${d}px)`;
    };
    const up = () => {
      h.removeEventListener("pointermove", move);
      h.removeEventListener("pointerup", up);
      h.removeEventListener("pointercancel", up);
      el.classList.remove("axDragging");
      el.style.transform = "";
      const to = items().indexOf(el);
      if (moved) {
        // Po tempimo - paspaudimas nebeskaičiuojamas
        const stop = ev => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        box.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => box.removeEventListener("click", stop, { capture: true }), 300);
      }
      if (moved && to !== from) onMove(from, to);
    };
    h.addEventListener("pointermove", move);
    h.addEventListener("pointerup", up);
    h.addEventListener("pointercancel", up);
  });
}
const gripHTML = (label = "Perkelti") => `<button class="axGrip" type="button" aria-label="${esc(label)} (tempkite arba ↑ ↓)" title="Tempkite">${glyph("grip")}</button>`;
const moveItem = (arr, from, to) => arr.splice(to, 0, ...arr.splice(from, 1));

// Paveikslų įkėlimas: sumažinama iki 1600 px ir išsaugoma WebP (Safari - JPEG), kad puslapis liktų greitas.
// Jei createImageBitmap formato neatpažįsta (pvz. iPhone HEIC kompiuteryje), bandoma per <img>; nepavykus - aiški klaida.
async function decodeImage(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error(
        /\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)
          ? `${file.name}: HEIC formato ši naršyklė neatidaro - išsaugokite nuotrauką kaip JPG arba įkelkite iš telefono`
          : `${file.name}: nepavyko atidaryti nuotraukos (tinka JPG, PNG, WebP)`
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
// Ar paveikslas turi permatomų vietų (tikrinama kas kelintas taškas - greitai ir dideliems paveikslams)
function hasAlpha(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  const step = Math.max(1, Math.floor((w * h) / 250000)) * 4;
  for (let i = 3; i < d.length; i += step) if (d[i] < 250) return true;
  return false;
}
// Prekės nuotrauka (v15b): permatomas fonas išlieka (WebP, o jei naršyklė WebP nekoduoja, pvz. senesnis iPhone - PNG,
// ne JPEG, kuris fonas taptų baltas). Nepermatoma prekės nuotrauka - JPEG: parduotuvė pagal .jpg žino, kad tai
// stačiakampė nuotrauka, ir nededa šešėlio (kitaip šonuose matomos pilkos juostos).
async function prepareImage(file, max = 1600, { product = false } = {}) {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|avif|hei[cf])$/i.test(file.name)) throw new Error(`${file.name}: ne paveikslas`);
  const bmp = await decodeImage(file);
  const bw = bmp.naturalWidth || bmp.width;
  const bh = bmp.naturalHeight || bmp.height;
  const k = Math.min(1, max / Math.max(bw, bh));
  const c = document.createElement("canvas");
  c.width = Math.round(bw * k);
  c.height = Math.round(bh * k);
  const ctx = c.getContext("2d");
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const toBlob = (type, q) => new Promise(res => c.toBlob(res, type, q));
  const alpha = hasAlpha(ctx, c.width, c.height);
  if (product && !alpha) return toBlob("image/jpeg", 0.86);
  let blob = await toBlob("image/webp", 0.84);
  if (!blob || blob.type !== "image/webp") blob = alpha ? await toBlob("image/png") : await toBlob("image/jpeg", 0.86);
  return blob;
}
async function uploadImages(files, prefix, max = 1600, opts = {}) {
  const urls = [];
  for (const f of files) {
    const blob = await prepareImage(f, max, opts);
    const ext = { "image/webp": "webp", "image/png": "png" }[blob.type] || "jpg";
    urls.push(await sbUpload("products", `${prefix}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`, blob));
  }
  return urls;
}
// Originalo nuotrauka (v18): grupė su miniatiūra, „Įkelti / Pakeisti“ ir „Pašalinti“ (kvape ir produkte be kvapo)
function inspImgHTML(src, foot = "Kvadratinė, šviesiame fone. Rodoma kortelėse ir produkto puslapyje.", bare = false) {
  const rows = `${src ? `<div class="axInspPrev"><img src="${esc(src)}" alt="Originalo nuotrauka" /><button class="axInspRm" type="button" data-insp-rm>Pašalinti</button></div>` : ""}<label class="axRow admUpload">${glyph(
    "upload"
  )}<span class="axRowTxt"><b class="axLink">${src ? "Pakeisti nuotrauką" : "Įkelti originalo nuotrauką"}</b></span><input type="file" accept="image/*" hidden data-insp-img /></label>`;
  return bare ? rows : `<div class="ig axInspImg" data-insp-box>${rows}</div>${foot ? `<p class="igFoot">${foot}</p>` : ""}`;
}
// Įkėlimas: kvadratas iki 600 px, WebP (permatomas fonas lieka); kelias products/originalai/<id>-…
async function uploadInspImg(input, prefix) {
  const file = input.files[0];
  input.value = "";
  if (!file) return null;
  const lab = input.closest("label");
  lab.classList.add("loading");
  try {
    const [url] = await uploadImages([file], `originalai/${prefix || "be-id"}`, 600);
    return url;
  } finally {
    lab.classList.remove("loading");
  }
}
// Nustatymų (settings.data) dalinis išsaugojimas: sujungiama su naujausia versija duomenų bazėje
async function saveSettingsPatch(next) {
  const [cur] = (await sbRest("settings?select=data&id=eq.1")) || [];
  const data = { ...(cur?.data || VD.SET), ...next };
  const saved = await sbRest("settings?id=eq.1", { method: "PATCH", body: { data }, prefer: "return=representation" });
  if (!saved?.length) throw new Error("Nustatymų įrašo nėra - paleiskite supabase/seed.sql");
  return data;
}

// ── Skaitikliai (kas laukia) ──────────────────────────
async function loadCounts() {
  try {
    const [orders, reviews, restock] = await Promise.all([
      sbRest("orders?select=id&status=in.(paid,packed)"),
      sbRest("reviews?select=id&status=eq.pending"),
      sbRest("restock_requests?select=id&notified=eq.false")
    ]);
    A.counts = { orders: orders.length, reviews: reviews.length, restock: restock.length };
    paintCounts();
  } catch (err) {
    VD.logError("counts", err);
  }
}
function paintCounts() {
  $$("[data-adm-count]").forEach(b => {
    const n = b.dataset.admCount.split(",").reduce((s, k) => s + (A.counts[k] || 0), 0);
    b.hidden = !n;
    b.textContent = String(n);
  });
}
const countBadge = keys => `<b class="axBadge" data-adm-count="${keys}"${keys.split(",").some(k => A.counts[k]) ? "" : " hidden"}>${keys.split(",").reduce((s, k) => s + (A.counts[k] || 0), 0) || ""}</b>`;

// ── Apvalkalas ────────────────────────────────────────
function shellHTML() {
  return `<div class="ax">
<aside class="axSide" aria-label="Administravimas">
<div class="axBrand"><span data-logo></span><small>Administravimas</small></div>
<nav class="axNav" id="axNav"></nav>
<div class="axSideFoot">
<button type="button" class="axSideLink" data-adm-rebuild>${glyph("upload")}<span>Atnaujinti svetainę</span></button>
<a class="axSideLink" href="./" data-nav>${glyph("eye")}<span>Peržiūrėti parduotuvę</span></a>
<button type="button" class="axSideLink" data-logout>${glyph("logout")}<span>Atsijungti</span></button>
</div>
</aside>
<nav class="axTabs" aria-label="Skyriai">${TABS.map(
    t => `<a class="axTab" href="${t.href}" data-nav data-tab="${t.id}">${glyph(t.ico)}<span>${t.name}</span>${t.counts ? countBadge(t.counts.join(",")) : ""}</a>`
  ).join("")}</nav>
<main class="axMain" id="admMain"></main>
</div>`;
}
function sideHTML() {
  const cur = A.path;
  const on = href => (href === "admin" ? cur === "admin" : cur === href || cur.startsWith(`${href}/`));
  return SIDE.map(g => {
    if (!g.items) return `<a class="axNavItem" href="${g.href}" data-nav${on(g.href) ? ' aria-current="page"' : ""}>${glyph(g.ico)}<span>${g.name}</span>${g.count ? countBadge(g.count) : ""}</a>`;
    const open = g.items.some(([h]) => on(h)) || (g.hub && on(g.hub));
    const allCounts = g.items.map(i => i[2]).filter(Boolean).join(",");
    return `<div class="axNavGroup${open ? " open" : ""}"><a class="axNavItem" href="${g.hub || g.items[0][0]}" data-nav${open ? ' aria-expanded="true"' : ""}>${glyph(g.ico)}<span>${g.name}</span>${
      allCounts && !open ? countBadge(allCounts) : ""
    }</a>${
      open ? `<div class="axNavSub">${g.items.map(([h, n, c]) => `<a href="${h}" data-nav${on(h) ? ' aria-current="page"' : ""}><span>${esc(n)}</span>${c ? countBadge(c) : ""}</a>`).join("")}</div>` : ""
    }</div>`;
  }).join("");
}
function paintChrome() {
  const nav = $("#axNav");
  if (nav) {
    nav.innerHTML = sideHTML();
    hydrateIcons(nav);
  }
  const tab = SECTIONS[A.sec]?.tab;
  $$(".axTab").forEach(a => {
    const isCur = a.dataset.tab === tab;
    if (isCur) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
    // Skirtukas veda į paskutinį jame atidarytą ekraną; jau atidarytas - į pradžią (kaip iOS)
    const t = TABS.find(x => x.id === a.dataset.tab);
    a.setAttribute("href", !isCur && A.last[t.id] ? A.last[t.id] : t.href);
  });
}
function render(sub = "") {
  // Seni adresai
  const raw = String(sub || "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "pradzia") return navigate(`admin/vitrina${parts[1] ? `/${parts[1]}` : ""}`, { replace: true });
  if (parts[0] === "nustatymai" && !parts[1]) {
    const h = location.hash.slice(1);
    const to = OLD_SETTINGS_HASH[h];
    if (to === "korteles" || to === "istorija") return navigate(`admin/vitrina/${to}`, { replace: true });
    return navigate(to ? `admin/nustatymai/${to}` : "admin/daugiau", { replace: true });
  }
  if (parts[0] === "kvapai" && parts[1] === "kvapu-sarasas") return navigate("admin/kvapu-sarasas", { replace: true });
  const secId = SECTIONS[parts[0] || ""] ? parts[0] || "" : "";
  const sec = SECTIONS[secId];
  const prevSec = A.sec;
  A.sec = secId;
  A.param = parts.slice(1).join("/");
  A.path = ["admin", ...parts].join("/");
  A.seq++;
  A.dirty = false;
  A.last[sec.tab] = A.path + location.search;
  const root = $("#adminRoot");
  if (!$(".ax", root)) {
    root.innerHTML = shellHTML();
    hydrateIcons(root);
  }
  paintChrome();
  let main = $("#admMain");
  const reuse = sec.split && isSplit() && prevSec === secId && $(".axSplit", main);
  if (!reuse) {
    const m = main.cloneNode(false);
    main.replaceWith(m);
    main = m;
  }
  $(".ax", root).classList.toggle("isSplit", !!(sec.split && isSplit()));
  document.title = `${sec.name} | Administravimas`;
  try {
    const p = sec.render(main, A.param, A.seq);
    if (p?.then) p.then(() => watchTitle(main)).catch(err => fail(main, err));
    else watchTitle(main);
  } catch (err) {
    fail(main, err);
  }
  watchTitle(main);
  loadCounts();
}
function fail(main, err) {
  VD.logError("admin", err);
  const box = $("#admDetail", main) && A.param ? $("#admDetail", main) : main;
  box.innerHTML = pageHTML({
    title: "Nepavyko įkelti",
    body: emptyBox("Nepavyko įkelti", errText(err), `<button class="btn primary" type="button" onclick="location.reload()">Perkrauti</button>`)
  });
}
// Pasikeitus pločiui (pvz. pasukus planšetę) - vienas ar du stulpeliai
splitMQ.addEventListener("change", () => {
  if (document.documentElement.classList.contains("isAdmin") && $("#admMain") && SECTIONS[A.sec]?.split && !A.dirty) {
    A.sec = "__";
    render(location.pathname.split("/admin")[1]?.replace(/^\//, "") || "");
  }
});

// Neišsaugoti pakeitimai - perspėjama prieš išeinant
document.addEventListener(
  "click",
  e => {
    const a = e.target instanceof Element && e.target.closest("a[data-nav]");
    if (!a || !A.dirty || !document.documentElement.classList.contains("isAdmin")) return;
    if (a.target === "_blank") return;
    if (!window.confirm("Yra neišsaugotų pakeitimų. Išeiti neišsaugojus?")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else A.dirty = false;
  },
  true
);
window.addEventListener("beforeunload", e => {
  if (A.dirty && document.documentElement.classList.contains("isAdmin")) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("click", e => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t || !document.documentElement.classList.contains("isAdmin")) return;
  const b = t.closest("[data-adm-rebuild]");
  if (b) return busy(b, rebuildSite);
  if (t.closest("[data-pop]")) return popPane(t.closest(".axPage"));
  const push = t.closest("[data-push]");
  if (push) {
    e.preventDefault();
    pushPane(push.closest(".axPage"), push.dataset.push);
  }
});
// Klaviatūra (kompiuteryje): „/“ - paieška, ⌘/Ctrl+S - išsaugoti, Esc - atgal, ↑ ↓ - sąraše
document.addEventListener("keydown", e => {
  if (!document.documentElement.classList.contains("isAdmin") || !$("#admMain")) return;
  const t = e.target instanceof Element ? e.target : null;
  const typing = t?.matches("input, textarea, select, [contenteditable]");
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    const b = $$(".axSave").find(x => x.offsetParent && !x.disabled);
    if (b) {
      e.preventDefault();
      b.click();
    }
    return;
  }
  if ($("#backdrop") && !$("#backdrop").hidden) return;
  if (e.key === "/" && !typing) {
    const s = $$(".axSearch input").find(x => x.offsetParent);
    if (s) {
      e.preventDefault();
      s.focus();
      s.select();
    }
    return;
  }
  if (e.key === "Escape") {
    if (typing && t.matches(".axSearch input") && t.value) return;
    const prev = $(".hePrev.open");
    if (prev) return closePreview();
    const page = $$(".axPage").find(p => p._panes?.length);
    if (page) {
      e.preventDefault();
      popPane(page);
    }
    return;
  }
  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t?.matches(".axRow") && t.closest(".axList")) {
    const rows = $$(".axRow", t.closest(".axList"));
    const i = rows.indexOf(t);
    const n = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (n) {
      e.preventDefault();
      n.focus();
    }
  }
});

// Iš anksto įkeliama užvedus pelę ar palietus meniu nuorodą (sąrašų duomenys - talpykloje 30 s)
const PREFETCH = { "admin/uzsakymai": () => loadOrders(), "admin/kvapai": () => loadProducts() };
const prefetched = {};
function prefetch(e) {
  const a = e.target instanceof Element && e.target.closest("a[href^='admin/']");
  const key = a && a.getAttribute("href").split("?")[0];
  if (!key || !PREFETCH[key] || Date.now() - (prefetched[key] || 0) < 20000) return;
  prefetched[key] = Date.now();
  PREFETCH[key]().catch(() => {});
}
document.addEventListener("pointerover", prefetch, { passive: true });
document.addEventListener("touchstart", prefetch, { passive: true });
// Telefone klaviatūra neuždengia aktyvaus lauko: skirtukų juosta slepiama (CSS), laukas parodomas virš klaviatūros
document.addEventListener("focusin", e => {
  const t = e.target;
  if (!(t instanceof Element) || !t.matches("input:not([type=checkbox]):not([type=color]), textarea") || !t.closest(".ax") || window.innerWidth >= 700) return;
  setTimeout(() => {
    const vv = window.visualViewport;
    const r = t.getBoundingClientRect();
    if (vv && (r.bottom > vv.height - 16 || r.top < 60)) t.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
  }, 320);
});

window.VDAdmin = { render };
