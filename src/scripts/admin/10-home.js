// 10 – Vitrina (admin/vitrina): viskas, ką mato pirkėjas. Ekranai: Skaidrės, Skyriai su produktais, Plytelės, Juosta virš
// header'io (12-topbar.js) – su gyva peržiūra (kompiuteryje – šone, telefone – mygtukas „Peržiūra“, visame ekrane);
// Prekių kortelės ir Mūsų istorija – nustatymų ekranai (08-settings.js).
// Skaidrė: rodoma / paslėpta, eilė (tempiant), fonas – nuotrauka (kompiuteriui ir, nebūtinai, telefonui; spustelėjus
// nurodoma vieta, kuri turi likti matoma) arba Vaidore scena su pasirinkto kvapo buteliukais; tekstai (tušti – iš šablono),
// mygtukas, nuoroda, tekstas šviesus / tamsus. Plytelė: rodoma, eilė, pavadinimas, nuotrauka. Skyrius (v15, settings.rails):
// pagal taisyklę arba pasirinkti ranka. Saugoma settings.slides / tiles / rails / slideSeconds / topbar (formatas –
// 25-home-config.js). Peržiūra – tikra parduotuvė <iframe> (?vdPreview=1), juodraštis – postMessage.
const SCENE_NAMES = {
  collection: "Arka ir postamentas",
  samples: "Mėginukų eilė",
  gift: "Dovanų dėžutė",
  women: "Moterims – arka",
  men: "Vyrams – tamsus blokas",
  unisex: "Unisex – diskas",
  vials: "Buteliukas ir mėginukai",
  set: "Rinkinys",
  fresh: "Laiptai"
};
const TILE_NAMES = {
  kvepalai: "Kvepalai",
  difuzoriai: "Difuzoriai",
  zvakes: "Žvakės",
  aliejai: "Aliejai",
  "elektriniai-difuzoriai": "Elektriniai difuzoriai",
  moterims: "Moterims",
  vyrams: "Vyrams",
  unisex: "Unisex",
  meginukai: "Mėginukai",
  rinkinys: "Rinkiniai",
  naujienos: "Naujienos"
};
const HE = { slides: [], tiles: [], rails: [], secs: 6, open: null, openTile: null, openRail: null, view: "phone", frame: null, ready: false, focus: 0, scents: [], part: "" };
const uid = () => Math.random().toString(36).slice(2, 8);
const clone = x => JSON.parse(JSON.stringify(x));
const HE_PARTS = { skaidres: "Skaidrės", skyriai: "Skyriai su produktais", plyteles: "Plytelės", juosta: "Juosta virš header'io" };

async function renderVitrina(main, param, seq) {
  const back = isSplit() ? null : { href: "admin/vitrina", label: "Vitrina" };
  if (param === "korteles" || param === "istorija") return renderSettingsPage(main, param, seq, back);
  if (param === "puslapiai") return renderPdpEditor(main, seq, back);
  if (HE_PARTS[param]) return renderHomeEditor(main, param, seq, back);
  if (param) return navigate("admin/vitrina", { replace: true });
  // Vitrinos ekranas: visos dalys su santrauka
  const paint = S => {
    const sl = S ? (Array.isArray(S.slides) ? S.slides : VD.DEFAULT_SLIDES) : [];
    const rl = S ? (Array.isArray(S.rails) ? S.rails : VD.DEFAULT_RAILS) : [];
    const tl = S ? (Array.isArray(S.tiles) ? S.tiles : VD.DEFAULT_TILES) : [];
    const tb = S?.topbar;
    const on = a => a.filter(x => x.on !== false).length;
    const v = t => (S ? `<span class="axValTxt">${t}</span>` : "");
    return pageHTML({
      title: "Vitrina",
      sub: "Viskas, ką mato pirkėjas",
      actions: barLink("eye", "Peržiūrėti parduotuvę", "./"),
      cls: "axNarrow",
      body: `${groupHTML(
        [
          navRow({ href: "admin/vitrina/skaidres", ico: "home", icoBg: "var(--brand)", title: "Skaidrės", value: v(`${on(sl)} iš ${sl.length}`) }),
          navRow({ href: "admin/vitrina/skyriai", ico: "grid", icoBg: "var(--brand)", title: "Skyriai su produktais", value: v(`${on(rl)} iš ${rl.length}`) }),
          navRow({ href: "admin/vitrina/plyteles", ico: "tag", icoBg: "var(--brand)", title: "Plytelės", value: v(`${on(tl)} iš ${tl.length}`) }),
          navRow({ href: "admin/vitrina/juosta", ico: "bell", icoBg: "var(--brand)", title: "Juosta virš header'io", value: v(tb?.on === false ? "Išjungta" : "Įjungta") })
        ].join(""),
        { head: "Pradžios puslapis" }
      )}
${groupHTML(
  [
    navRow({ href: "admin/vitrina/korteles", ico: "heart", icoBg: "var(--ink2)", title: "Prekių kortelės", sub: "Širdelė, ženkliukai, originalas" }),
    navRow({ href: "admin/vitrina/puslapiai", ico: "drop", icoBg: "var(--ink2)", title: "Prekių puslapiai", sub: "Natos, naudojimas, pastabos" }),
    navRow({ href: "admin/vitrina/istorija", ico: "doc", icoBg: "var(--ink2)", title: "Mūsų istorija", value: v(S?.story?.text ? "Rodoma" : "Nerodoma") })
  ].join(""),
  { head: "Visi puslapiai" }
)}`
    });
  };
  main.innerHTML = paint(null);
  hydrateIcons(main);
  const S = await loadSettings().catch(() => null);
  if (stale(seq) || !S) return;
  main.innerHTML = paint(S);
  hydrateIcons(main);
}

async function renderHomeEditor(main, part, seq, back) {
  const title = HE_PARTS[part];
  main.innerHTML = pageHTML({ title, back, body: loading(5) });
  const [rows, categories, scents] = await Promise.all([
    sbRest("settings?select=data&id=eq.1"),
    sbRest("categories?select=id,name,image,visible&order=sort.asc,name.asc"),
    sbRest("scents?select=id,name&order=name.asc").catch(() => [])
  ]);
  if (stale(seq)) return;
  const S = rows?.[0]?.data || VD.SET;
  HE.part = part;
  HE.slides = clone(Array.isArray(S.slides) ? S.slides : VD.DEFAULT_SLIDES).map(s => ({ id: s.id || uid(), on: s.on !== false, ...s }));
  HE.tiles = clone(Array.isArray(S.tiles) ? S.tiles : VD.DEFAULT_TILES);
  HE.secs = Number(S.slideSeconds ?? 6);
  HE.rails = clone(Array.isArray(S.rails) ? S.rails : VD.DEFAULT_RAILS).map(r => {
    // v19: „Kada tinka“ (paros laikas, sezonas, proga) taisyklėse nebenaudojama
    const { time, season, occasion, ...rule } = r.rule || {};
    return { ...r, id: r.id || uid(), rule, ids: r.ids || [] };
  });
  HE.scents = scents || [];
  HE.cats = categories;
  HE.open = HE.openTile = HE.openRail = null;
  HE.ready = false;
  HE.focus = 0;
  initTopbar(S);
  const resetRow = `<div class="ig"><button class="axRow" type="button" data-he-reset><span class="axRowTxt"><b class="axLink">Grąžinti numatytuosius</b></span></button></div>`;
  const sections = {
    skaidres: `<div class="ig"><label class="field axField"><span>Keičiasi kas, s</span><input type="number" inputmode="numeric" min="0" max="30" value="${HE.secs}" data-he-secs aria-label="Sekundės" /></label></div>
<p class="igFoot">0 – skaidrės nesikeičia pačios.</p>
<h2 class="igHead">Skaidrės</h2><div class="ig heList" id="heSlides"></div>
<div class="ig"><button class="axRow axAddRow" type="button" data-he-add-menu>${glyph("plus")}<span class="axRowTxt"><b>Nauja skaidrė</b></span></button></div>
<p class="igFoot">Pirmoji – svarbiausia. Eilę keiskite tempdami ⋮⋮.</p>
${resetRow}`,
    plyteles: `<h2 class="igHead">Plytelės po skaidrėmis</h2><div class="ig heList" id="heTiles"></div>
<div class="ig" id="heTileAdd"></div>
<p class="igFoot">Nuotrauka – stati 4:5 (1000 × 1250). Be nuotraukos – Vaidore scena su tos grupės buteliukais.</p>
${resetRow}`,
    skyriai: `<h2 class="igHead">Karuselės pradžios puslapyje</h2><div class="ig heList" id="heRails"></div>
<div class="ig"><button class="axRow axAddRow" type="button" data-he-addrail="auto">${glyph("plus")}<span class="axRowTxt"><b>Naujas skyrius pagal taisyklę</b></span></button><button class="axRow axAddRow" type="button" data-he-addrail="manual">${glyph(
      "plus"
    )}<span class="axRowTxt"><b>Naujas skyrius – pasirinkti produktus</b></span></button></div>
<p class="igFoot">Skyrius be produktų nerodomas.</p>
${resetRow}`,
    juosta: topbarSectionHTML()
  };
  main.innerHTML = pageHTML({
    title,
    back,
    actions: `${barBtn("eye", "Peržiūra", 'data-he-preview class="axBarBtn hePrevBtn"')}${saveBtn({ attrs: "data-he-save" })}`,
    cls: "heLayoutPage",
    body: `<div class="heLayout">
<div class="heEdit">
<div data-pane="main"><p class="formErr axErr" role="alert" hidden></p>${sections[part]}</div>
<div data-pane="item" data-title="" data-focus="no" hidden><div id="heItemBox"></div></div>
${part === "juosta" ? `<div data-pane="tbstyle" data-title="Spalvos ir šriftas" data-focus="no" hidden><div class="ig tbGrid" id="tbStyle"></div></div>` : ""}
</div>
<aside class="hePrev" aria-label="Peržiūra">
<div class="hePrevHead"><div class="axSeg heSeg" role="tablist"><button type="button" role="tab" data-he-view="phone" aria-selected="${HE.view === "phone"}">Telefonas</button><button type="button" role="tab" data-he-view="desktop" aria-selected="${
      HE.view === "desktop"
    }">Kompiuteris</button></div><button class="roundBtn hePrevClose" type="button" data-he-preview-close aria-label="Uždaryti peržiūrą">${glyph("x")}</button></div>
<div class="heFrameBox" data-view="${HE.view}"><iframe id="heFrame" title="Pradžios puslapio peržiūra"${window.matchMedia("(min-width: 1024px)").matches ? ' src="./?vdPreview=1"' : ""} loading="eager"></iframe></div>
</aside>
</div>`
  });
  hydrateIcons(main);
  HE.frame = $("#heFrame", main);
  const page = $(".axPage", main);
  if (part === "skaidres") paintSlides();
  if (part === "plyteles") paintTiles();
  if (part === "skyriai") paintRails();
  fitFrame();
  bindHomeEditor(page);
  if (part === "juosta") bindTopbar(page);
  page.addEventListener("axpop", e => {
    if (e.detail.pane !== "item") return;
    HE.open = HE.openTile = HE.openRail = null;
    TB.open = null;
    ({ skaidres: paintSlides, plyteles: paintTiles, skyriai: paintRails, juosta: paintTbItems })[HE.part]?.();
  });
}
// Elemento redagavimas – atskirame ekrane (iOS „push“)
function openItem(page, title, html) {
  const pane = $('[data-pane="item"]', page);
  pane.dataset.title = title;
  $("#heItemBox", page).innerHTML = html;
  hydrateIcons(pane);
  if (pane.hidden) pushPane(page, "item");
  else setPageTitle(page, title, page._panes?.at(-1)?.title ?? null);
}
function closeItem() {
  const page = $(".heLayoutPage");
  if (page?._panes?.length) popPane(page);
}
// Peržiūra telefone – visame ekrane
function openPreview() {
  const box = $(".hePrev");
  if (!box) return;
  if (HE.frame && !HE.frame.getAttribute("src")) HE.frame.src = "./?vdPreview=1";
  box.classList.add("open");
  document.documentElement.classList.add("axNoScroll");
  fitFrame();
  sendPreview({ slide: HE.focus });
}
function closePreview() {
  $(".hePrev")?.classList.remove("open");
  document.documentElement.classList.remove("axNoScroll");
}

// ── Peržiūra ──────────────────────────────────────────
const draft = () => ({ slides: HE.slides, tiles: HE.tiles, rails: HE.rails, slideSeconds: HE.secs, ...(TB.cfg ? { topbar: topbarData() } : {}) });
let previewT = 0;
function sendPreview(extra = {}) {
  clearTimeout(previewT);
  previewT = setTimeout(() => {
    if (!HE.ready || !HE.frame?.contentWindow) return;
    HE.frame.contentWindow.postMessage({ type: "vd-home-preview", settings: clone(draft()), ...extra }, location.origin);
  }, 180);
}
function fitFrame() {
  const box = $(".heFrameBox");
  if (!box || !HE.frame) return;
  const W = HE.view === "phone" ? 390 : 1440;
  const H = HE.view === "phone" ? 760 : 900;
  const full = box.closest(".hePrev.open");
  const availH = full ? box.parentElement.clientHeight - $(".hePrevHead", box.parentElement).offsetHeight - 16 : Infinity;
  const k = Math.min(1, box.clientWidth / W, availH / H);
  box.dataset.view = HE.view;
  Object.assign(HE.frame.style, { width: `${W}px`, height: `${H}px`, transform: `scale(${k})` });
  box.style.height = `${Math.round(H * k)}px`;
  box.style.width = full ? `${Math.round(W * k)}px` : "";
}
window.addEventListener("message", e => {
  if (e.origin !== location.origin || e.data?.type !== "vd-home-preview-ready" || !HE.frame || e.source !== HE.frame.contentWindow) return;
  HE.ready = true;
  sendPreview({ slide: HE.focus });
});
window.addEventListener("resize", () => HE.frame?.isConnected && fitFrame());

// ── Skaidrės ──────────────────────────────────────────
function linkGroups() {
  return [
    ["Puslapiai", [["kvepalai", "Visi kvepalai"], ["difuzoriai", "Difuzoriai"], ["zvakes", "Žvakės"], ["aliejai", "Aliejai"], ["elektriniai-difuzoriai", "Elektriniai difuzoriai"], ["moterims", "Moterims"], ["vyrams", "Vyrams"], ["unisex", "Unisex"], ["meginukai", "Mėginukai 2 ml"], ["rinkinys", "Atradimų rinkinys"], ["kvepalai?rikiuoti=new", "Naujienos"], ["apie-mus", "Apie mus"]]],
    ["Kvapai", VD.CAT.products.map(p => [VD.productUrl(p), p.name])],
    ["Kategorijos", HE.cats.map(c => [`kategorija/${c.id}`, c.name])]
  ];
}
const isKnownLink = v => linkGroups().some(([, l]) => l.some(([x]) => x === v));
function linkOptions(cur, empty = "Pagal šabloną") {
  const groups = linkGroups();
  const known = isKnownLink(cur);
  return `<option value="">${esc(empty)}</option>${groups
    .map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([v, n]) => `<option value="${esc(v)}"${sel(v === cur)}>${esc(n)}</option>`).join("")}</optgroup>`)
    .join("")}<option value="__custom"${sel(cur && !known)}>Kitas adresas…</option>`;
}
function thumbHTML(bg, list, image, focus) {
  return `<span class="heThumb">${image ? `<img src="${esc(image)}" alt="" style="object-position:${esc(focus || "50% 50%")}" />` : VD.stageHTML(bg, list)}</span>`;
}
// Sąrašo eilutė: ⋮⋮ (eilė), miniatiūra, pavadinimas, jungiklis „Rodoma“, „›“
function heRowHTML({ kind, id, thumb: th = "", title, sub, on, cls = "" }) {
  return `<div class="heItem${on === false ? " off" : ""}${cls ? ` ${cls}` : ""}" data-he-${kind}="${esc(id)}"><div class="heRow">${gripHTML()}<button class="heRowMain" type="button" data-he-open>${th}<span class="heRowTxt"><b>${title}</b><small>${sub}</small></span></button><input type="checkbox" class="admSwitchInp" data-he-on aria-label="Rodoma"${attr(
    on !== false,
    "checked"
  )} /><span class="axChev" aria-hidden="true">${glyph("chev-right")}</span></div></div>`;
}
function slideRow(s, i) {
  const r = VD.resolveSlide(s) || {};
  const preset = VD.SLIDE_PRESETS[s.preset] || VD.SLIDE_PRESETS.custom;
  return heRowHTML({
    kind: "slide",
    id: s.id,
    on: s.on,
    thumb: s.preset === "photo" && !s.image && !s.imageM ? `<span class="heThumb heThumbEmpty">${glyph("upload")}</span>` : thumbHTML(r.stage, r.list || [], s.image || s.imageM, s.focus),
    title: `${i + 1}. ${esc(s.preset === "photo" ? s.title || "Nuotrauka" : r.title || "Be pavadinimo")}`,
    sub: `${esc(preset.name)} · ${
      s.preset === "photo" ? [s.image && "kompiuteriui", s.imageM && "telefonui"].filter(Boolean).join(" ir ") || "įkelkite nuotrauką" : s.image ? "nuotrauka" : "scena"
    }${s.on === false ? " · paslėpta" : ""}`
  });
}
function imgZone(field, label, hint, src, focus) {
  return `<div class="heZone${src ? " has" : ""}" data-he-zone="${field}">
<p class="heZoneLab"><b>${label}</b><small>${hint}</small></p>
${
  src
    ? `<div class="heFocus" data-he-focus="${field}"><img src="${esc(src)}" alt="" /><i class="heDot" style="left:${esc((focus || "50% 50%").split(" ")[0])};top:${esc((focus || "50% 50%").split(" ")[1])}"></i></div>
<div class="heZoneActs"><label class="btn ghost small admUpload">${glyph("upload")}Pakeisti<input type="file" accept="image/*" hidden data-he-file="${field}" /></label><button class="btn ghost small" type="button" data-he-rmimg="${field}">${glyph("trash")}Pašalinti</button></div>`
    : `<label class="heDrop">${glyph("upload")}<span>Įkelti nuotrauką</span><small>arba nutempkite čia</small><input type="file" accept="image/*" hidden data-he-file="${field}" /></label>`
}
</div>`;
}
const itemActs = (dup = true, del = "Ištrinti") =>
  `<div class="ig">${dup ? `<button class="axRow" type="button" data-he-dup><span class="axRowTxt"><b class="axLink">Kopijuoti</b></span></button>` : ""}<button class="axRow danger" type="button" data-he-del><span class="axRowTxt"><b>${del}</b></span></button></div>`;
const linkField = (cur, empty, custom, ph = "kvepalai?seima=gurmaniski") =>
  `${fieldHTML("Nuoroda", `<select name="hrefSel">${linkOptions(cur || "", empty)}</select>`)}${fieldHTML("Adresas", `<input name="hrefCustom" maxlength="200" value="${esc(custom)}" placeholder="${esc(ph)}" />`, {
    cls: "heCustom",
    attrs: custom ? "" : "hidden"
  })}`;
// „Tik nuotrauka“: dvi nuotraukos (kompiuteriui / telefonui), nebūtina nuoroda ir aprašymas skaitytuvams – be kvapo ir tekstų
function photoSlideFormHTML(s) {
  const custom = s.href && !isKnownLink(s.href) ? s.href : "";
  return `<div class="heForm admForm">
<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui", "1000 × 1150", s.imageM, s.focusM)}</div>
<p class="igFoot">Spustelėkite nuotraukoje vietą, kuri turi likti matoma siaurame ekrane. Tekstas – pačioje nuotraukoje.</p>
${groupHTML(`${linkField(s.href, "Be nuorodos", custom)}${fieldHTML("Aprašymas", `<input name="title" maxlength="80" value="${esc(s.title || "")}" placeholder="Žiemos kolekcija – Ventor" />`)}`, {
  foot: "Aprašymas nerodomas – skaitytuvams ir šiam sąrašui."
})}
${itemActs()}
</div>`;
}
function slideFormHTML(s) {
  if (s.preset === "photo") return photoSlideFormHTML(s);
  const d = VD.slideDefaults(s);
  const custom = s.href && !isKnownLink(s.href) ? s.href : "";
  const prods = VD.CAT.products;
  const fld = (name, label, ph, max) => fieldHTML(label, `<input name="${name}" maxlength="${max}" value="${esc(s[name] || "")}" placeholder="${esc(ph || "")}" />`);
  const photo = !!(s.image || s.bg === "photo");
  return `<div class="heForm admForm">
<div class="axSeg heSeg" role="tablist" aria-label="Fonas"><button type="button" role="tab" data-he-bg="photo" aria-selected="${photo}">Nuotrauka</button><button type="button" role="tab" data-he-bg="scene" aria-selected="${!photo}">Vaidore scena</button></div>
${
  photo
    ? `<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui (nebūtina)", "1000 × 1150", s.imageM, s.focusM)}</div>
<div class="axSeg heSeg" role="tablist" aria-label="Tekstas"><button type="button" role="tab" data-he-dark="0" aria-selected="${!s.dark}">Juodas tekstas</button><button type="button" role="tab" data-he-dark="1" aria-selected="${!!s.dark}">Baltas tekstas</button></div>`
    : groupHTML(fieldHTML("Kompozicija", `<select name="scene">${Object.keys(SCENE_NAMES).map(k => `<option value="${k}"${sel((s.scene || d.scene) === k)}>${SCENE_NAMES[k]}</option>`).join("")}</select>`))
}
${groupHTML(
  fieldHTML(
    "Kvapas",
    `<select name="product"><option value="">${esc(VD.CAT.products.find(p => p.id === VD.SET.hero?.product)?.name || "Pagal nustatymus")} (numatytas)</option>${prods
      .map(p => `<option value="${esc(p.id)}"${sel(p.id === s.product)}>${esc(p.name)}</option>`)
      .join("")}</select>`
  ),
  { foot: "Jo buteliukas scenoje ir numatytieji tekstai." }
)}
${groupHTML(
  `${fld("eyebrow", "Virš pavadinimo", d.eyebrow, 40)}${fld("title", "Pavadinimas", d.title, 60)}${fieldHTML(
    "Tekstas",
    `<textarea name="text" rows="${String(d.text || "").includes("\n") ? 4 : 2}" maxlength="240" placeholder="${esc(d.text || "")}">${esc(s.text || "")}</textarea>`,
    { stack: true }
  )}${fld("cta", "Mygtukas", d.cta, 30)}${linkField(s.href, "Pagal šabloną", custom)}`,
  { head: "Tekstai", foot: "Tuščias laukas – šablono tekstas (rodomas pilkai). Kelios teksto eilutės – teiginiai su linijomis." }
)}
${itemActs()}
</div>`;
}
function paintSlides() {
  const box = $("#heSlides");
  if (!box) return;
  box.innerHTML = HE.slides.length ? HE.slides.map(slideRow).join("") : `<p class="axRowNote heEmpty">Skaidrių nėra – pradžios puslapis prasidės plytelėmis.</p>`;
  hydrateIcons(box);
  sortable(box, { item: ".heItem", onMove: (from, to) => (moveItem(HE.slides, from, to), changed({ repaint: "slides", slide: to })) });
  const s = HE.open && HE.slides.find(x => x.id === HE.open);
  if (s) openItem(box.closest(".axPage"), `${HE.slides.indexOf(s) + 1} skaidrė`, `<article class="heItem open" data-he-slide="${esc(s.id)}">${slideFormHTML(s)}</article>`);
}

// ── Plytelės ──────────────────────────────────────────
function tileName(t) {
  if (TILE_NAMES[t.key]) return TILE_NAMES[t.key];
  return HE.cats.find(c => `kat-${c.id}` === t.key)?.name || t.key;
}
function tileRow(t) {
  const p = VD.tilePreset(t.key);
  const img = t.image || p?.image || "";
  return heRowHTML({
    kind: "tile",
    id: t.key,
    on: t.on,
    thumb: thumbHTML(p?.stage || "unisex", p?.list || [], img, t.focus),
    title: esc(t.title || tileName(t)),
    sub: `${img ? "nuotrauka" : "scena"}${p?.list?.length === 0 ? " · nėra prekių – nerodoma" : ""}${t.on === false ? " · paslėpta" : ""}`
  });
}
function tileFormHTML(t) {
  const p = VD.tilePreset(t.key);
  return `<div class="heForm admForm">
${groupHTML(fieldHTML("Pavadinimas", `<input name="title" maxlength="30" value="${esc(t.title || "")}" placeholder="${esc(p?.name || tileName(t))}" />`), { foot: "Rodomas virš plytelės didžiosiomis raidėmis." })}
<div class="heZones one">${imgZone("image", "Nuotrauka", "stati 4:5, 1000 × 1250", t.image, t.focus)}</div>
${
  t.image
    ? `<div class="axSeg heSeg" role="tablist" aria-label="Tekstas"><button type="button" role="tab" data-he-dark="0" aria-selected="${!t.dark}">Juodas tekstas</button><button type="button" role="tab" data-he-dark="1" aria-selected="${!!t.dark}">Baltas tekstas</button></div>`
    : p?.image
      ? `<p class="igFoot">Dabar rodomas kategorijos paveikslas.</p>`
      : ""
}
${t.key.startsWith("kat-") ? itemActs(false, "Pašalinti iš pradžios") : ""}
</div>`;
}
function paintTiles() {
  const box = $("#heTiles");
  if (!box) return;
  box.innerHTML = HE.tiles.map(tileRow).join("");
  const have = new Set(HE.tiles.map(t => t.key));
  const add = [...Object.keys(TILE_NAMES).filter(k => !have.has(k)), ...HE.cats.filter(c => !have.has(`kat-${c.id}`)).map(c => `kat-${c.id}`)];
  const addBox = $("#heTileAdd");
  addBox.hidden = !add.length;
  addBox.innerHTML = add.length ? `<button class="axRow axAddRow" type="button" data-he-addtile-menu>${glyph("plus")}<span class="axRowTxt"><b>Pridėti plytelę</b></span></button>` : "";
  hydrateIcons(box);
  hydrateIcons(addBox);
  sortable(box, { item: ".heItem", onMove: (from, to) => (moveItem(HE.tiles, from, to), changed({ repaint: "tiles", scroll: "tiles" })) });
  const t = HE.openTile && HE.tiles.find(x => x.key === HE.openTile);
  if (t) openItem(box.closest(".axPage"), t.title || tileName(t), `<article class="heItem open" data-he-tile="${esc(t.key)}">${tileFormHTML(t)}</article>`);
}

// ── Veiksmai ──────────────────────────────────────────
function changed({ repaint = "", slide = null, scroll = "" } = {}) {
  A.dirty = true;
  if (repaint === "slides") paintSlides();
  if (repaint === "tiles") paintTiles();
  if (repaint === "rails") paintRails();
  if (slide != null) HE.focus = slide;
  sendPreview({ slide: HE.focus, scroll });
}
function itemOf(el) {
  const s = el.closest("[data-he-slide]");
  if (s) return { kind: "slides", arr: HE.slides, i: HE.slides.findIndex(x => x.id === s.dataset.heSlide) };
  const t = el.closest("[data-he-tile]");
  if (t) return { kind: "tiles", arr: HE.tiles, i: HE.tiles.findIndex(x => x.key === t.dataset.heTile) };
  const r = el.closest("[data-he-rail]");
  if (r) return { kind: "rails", arr: HE.rails, i: HE.rails.findIndex(x => x.id === r.dataset.heRail) };
  return null;
}
async function setImage(el, field, file) {
  const it = itemOf(el);
  if (!it || !file) return;
  const x = it.arr[it.i];
  const zone = el.closest("[data-he-zone]");
  zone?.classList.add("busy");
  try {
    const max = it.kind === "slides" && field === "image" ? 2400 : 1500;
    const [url] = await uploadImages([file], it.kind === "slides" ? "pradzia/skaidres" : "pradzia/plyteles", max);
    x[field] = url;
    x[field === "imageM" ? "focusM" : "focus"] = "50% 50%";
    changed({ repaint: it.kind, slide: it.kind === "slides" ? it.i : null, scroll: it.kind === "tiles" ? "tiles" : "" });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  } finally {
    zone?.classList.remove("busy");
  }
}
function bindHomeEditor(main) {
  main.addEventListener("click", async e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("[data-he-preview]")) return openPreview();
    if (t.closest("[data-he-preview-close]")) return closePreview();
    const view = t.closest("[data-he-view]");
    if (view) {
      HE.view = view.dataset.heView;
      $$("[data-he-view]").forEach(b => b.setAttribute("aria-selected", String(b === view)));
      fitFrame();
      return sendPreview({ slide: HE.focus });
    }
    if (t.closest("[data-he-add-menu]")) {
      const k = await actionSheet({ title: "Nauja skaidrė", actions: Object.entries(VD.SLIDE_PRESETS).map(([key, p]) => ({ key, label: p.name, ico: key === "photo" ? "upload" : "home" })) });
      if (!k) return;
      const s = { id: uid(), on: true, preset: k };
      HE.slides.push(s);
      HE.open = s.id;
      return changed({ repaint: "slides", slide: HE.slides.length - 1 });
    }
    if (t.closest("[data-he-addtile-menu]")) {
      const have = new Set(HE.tiles.map(x => x.key));
      const opts = [...Object.keys(TILE_NAMES).filter(k => !have.has(k)).map(k => [k, TILE_NAMES[k], "tag"]), ...HE.cats.filter(c => !have.has(`kat-${c.id}`)).map(c => [`kat-${c.id}`, `Kolekcija: ${c.name}`, "grid"])];
      const k = await actionSheet({ title: "Pridėti plytelę", actions: opts.map(([key, label, ico]) => ({ key, label, ico })) });
      if (!k) return;
      HE.tiles.push({ key: k, on: true });
      HE.openTile = k;
      return changed({ repaint: "tiles", scroll: "tiles" });
    }
    const addRail = t.closest("[data-he-addrail]");
    if (addRail) {
      const manual = addRail.dataset.heAddrail === "manual";
      const r = { id: uid(), on: true, title: manual ? "Mūsų pasirinkimas" : "Naujas skyrius", line: "", mode: manual ? "manual" : "auto", rule: manual ? {} : { type: "kvepalai", sort: "rank" }, ids: [], limit: 12 };
      HE.rails.push(r);
      HE.openRail = r.id;
      return changed({ repaint: "rails", scroll: `rail:${r.id}` });
    }
    if (t.closest("[data-he-save]")) return busy(t.closest("[data-he-save]"), saveHome);
    if (t.closest("[data-he-reset]")) return resetHome();
    const it = itemOf(t);
    if (!it || it.i < 0) return;
    const x = it.arr[it.i];
    const isSlide = it.kind === "slides";
    if (it.kind === "rails" && railClick(t, x, it)) return;
    if (t.closest("[data-he-open]")) {
      if (isSlide) HE.open = x.id;
      else if (it.kind === "rails") HE.openRail = x.id;
      else HE.openTile = x.key;
      if (isSlide) HE.focus = it.i;
      ({ slides: paintSlides, tiles: paintTiles, rails: paintRails })[it.kind]();
      return sendPreview({ slide: HE.focus, scroll: isSlide ? "" : it.kind === "rails" ? `rail:${x.id}` : "tiles" });
    }
    const bg = t.closest("[data-he-bg]");
    if (bg) {
      if (bg.dataset.heBg === "scene") {
        x.bg = "scene";
        delete x.image;
        delete x.imageM;
      } else x.bg = "photo";
      return changed({ repaint: "slides", slide: it.i });
    }
    const dk = t.closest("[data-he-dark]");
    if (dk) {
      x.dark = dk.dataset.heDark === "1";
      return changed({ repaint: it.kind, slide: isSlide ? it.i : null, scroll: isSlide ? "" : "tiles" });
    }
    const rm = t.closest("[data-he-rmimg]");
    if (rm) {
      delete x[rm.dataset.heRmimg];
      return changed({ repaint: it.kind, slide: isSlide ? it.i : null, scroll: isSlide ? "" : "tiles" });
    }
    const fc = t.closest("[data-he-focus]");
    if (fc && t.tagName === "IMG") {
      const r = t.getBoundingClientRect();
      const fx = Math.round(((e.clientX - r.left) / r.width) * 100);
      const fy = Math.round(((e.clientY - r.top) / r.height) * 100);
      x[fc.dataset.heFocus === "imageM" ? "focusM" : "focus"] = `${fx}% ${fy}%`;
      const dot = $(".heDot", fc);
      Object.assign(dot.style, { left: `${fx}%`, top: `${fy}%` });
      return changed({ slide: isSlide ? it.i : null, scroll: isSlide ? "" : "tiles" });
    }
    if (t.closest("[data-he-dup]")) {
      const c = { ...clone(x), id: uid() };
      it.arr.splice(it.i + 1, 0, c);
      if (it.kind === "rails") {
        c.title = `${c.title} (kopija)`;
        HE.openRail = c.id;
        return changed({ repaint: "rails", scroll: `rail:${c.id}` });
      }
      HE.open = c.id;
      return changed({ repaint: "slides", slide: it.i + 1 });
    }
    if (t.closest("[data-he-del]")) {
      const ok = await askConfirm(
        isSlide ? `Skaidrė „${VD.resolveSlide(x)?.title || ""}“ bus pašalinta (išsaugojus).` : it.kind === "rails" ? `Skyrius „${x.title}“ bus pašalintas iš pradžios puslapio (išsaugojus).` : "Plytelė bus pašalinta iš pradžios puslapio.",
        { title: "Pašalinti?", ok: "Pašalinti", danger: true }
      );
      if (!ok) return;
      it.arr.splice(it.i, 1);
      HE.open = HE.openTile = HE.openRail = null;
      closeItem();
      changed({ repaint: it.kind, slide: 0, scroll: isSlide ? "" : "tiles" });
    }
  });
  main.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-he-secs]")) {
      HE.secs = Math.max(0, Math.min(30, Math.round(Number(t.value) || 0)));
      t.value = HE.secs;
      return changed();
    }
    const it = itemOf(t);
    if (!it || it.i < 0) return;
    const x = it.arr[it.i];
    if (t.matches("[data-he-on]")) {
      x.on = t.checked;
      t.closest(".heItem").classList.toggle("off", !t.checked);
      return changed({ slide: it.kind === "slides" ? it.i : null, scroll: it.kind === "tiles" ? "tiles" : it.kind === "rails" ? `rail:${x.id}` : "" });
    }
    if (it.kind === "rails") return railChange(t, x);
    if (t.matches("[data-he-file]")) {
      const f = t.files[0];
      t.value = "";
      return setImage(t, t.dataset.heFile, f);
    }
    if (t.name === "hrefSel") {
      const custom = $(".heCustom", t.closest(".heForm"));
      custom.hidden = t.value !== "__custom";
      x.href = t.value === "__custom" ? $("input", custom).value.trim() || "" : t.value;
      if (!custom.hidden) $("input", custom).focus();
      return changed({ slide: it.i });
    }
    if (t.name === "scene" || t.name === "product") {
      if (t.value) x[t.name] = t.value;
      else delete x[t.name];
      return changed({ repaint: "slides", slide: it.i });
    }
  });
  main.addEventListener("input", e => {
    const t = e.target;
    const it = itemOf(t);
    if (it?.kind === "rails" && it.i >= 0) return railInput(t, it.arr[it.i]);
    if (!it || it.i < 0 || !t.name || !["eyebrow", "title", "text", "cta", "hrefCustom"].includes(t.name)) return;
    const x = it.arr[it.i];
    const v = t.value.trim();
    if (t.name === "hrefCustom") x.href = v.replace(/^\/+/, "");
    else if (v) x[t.name] = v;
    else delete x[t.name];
    const row = it.kind === "slides" ? $(`#heSlides [data-he-slide="${CSS.escape(x.id)}"] .heRowTxt b`) : $(`#heTiles [data-he-tile="${CSS.escape(x.key)}"] .heRowTxt b`);
    if (row && t.name === "title") row.textContent = it.kind === "slides" ? `${it.i + 1}. ${(x.preset === "photo" ? x.title : VD.resolveSlide(x)?.title) || "Be pavadinimo"}` : v || tileName(x);
    changed({ slide: it.kind === "slides" ? it.i : null, scroll: it.kind === "tiles" ? "tiles" : "" });
  });
  // Nuotraukos nutempimas ant zonos
  main.addEventListener("dragover", e => {
    const z = e.target instanceof Element && e.target.closest("[data-he-zone]");
    if (!z) return;
    e.preventDefault();
    z.classList.add("drag");
  });
  main.addEventListener("dragleave", e => e.target instanceof Element && e.target.closest("[data-he-zone]")?.classList.remove("drag"));
  main.addEventListener("drop", e => {
    const z = e.target instanceof Element && e.target.closest("[data-he-zone]");
    if (!z) return;
    e.preventDefault();
    z.classList.remove("drag");
    setImage(z, z.dataset.heZone, e.dataTransfer.files[0]);
  });
}
// Numatytieji – tik šio ekrano daliai
async function resetHome() {
  const what = { skaidres: "Skaidrės", plyteles: "Plytelės", skyriai: "Skyriai", juosta: "Juostos žinutės ir dizainas" }[HE.part];
  const ok = await askConfirm(`${what} grįš į numatytuosius (išsaugojus). Įkeltos nuotraukos liks saugykloje, bet nebus rodomos.`, { title: "Grąžinti numatytuosius?", ok: "Grąžinti" });
  if (!ok) return;
  if (HE.part === "skaidres") {
    HE.slides = clone(VD.DEFAULT_SLIDES);
    HE.secs = 6;
    const sec = $("[data-he-secs]");
    if (sec) sec.value = 6;
    return changed({ repaint: "slides", slide: 0 });
  }
  if (HE.part === "plyteles") {
    HE.tiles = clone(VD.DEFAULT_TILES);
    return changed({ repaint: "tiles", scroll: "tiles" });
  }
  if (HE.part === "skyriai") {
    HE.rails = clone(VD.DEFAULT_RAILS);
    return changed({ repaint: "rails" });
  }
  if (HE.part === "juosta") {
    TB.cfg = TB_DEFAULT();
    TB.cfg.items = TB.cfg.items.map(x => ({ id: uid(), ...x }));
    $('[data-tb="on"]').checked = true;
    return tbChanged({ items: true, style: true });
  }
}
async function saveHome() {
  const err = $(".heLayoutPage .formErr");
  const problems = [];
  HE.slides.forEach((s, i) => {
    if (s.preset === "photo" && !s.image && !s.imageM) problems.push(`${i + 1} skaidrė: įkelkite nuotrauką (kompiuteriui ar telefonui)`);
    if (s.bg === "photo" && !s.image) problems.push(`${i + 1} skaidrė: įkelkite nuotrauką arba pasirinkite „Vaidore scena“`);
    if (s.href && /^(https?:)?\/\//.test(s.href) && !/^https:\/\//.test(s.href)) problems.push(`${i + 1} skaidrė: nuoroda turi prasidėti https://`);
  });
  HE.rails.forEach((r, i) => {
    if (!r.title?.trim()) problems.push(`${i + 1} skyrius: įrašykite pavadinimą`);
    if (r.href && r.href !== "none" && /^(https?:)?\/\//.test(r.href) && !/^https:\/\//.test(r.href)) problems.push(`${i + 1} skyrius: nuoroda turi prasidėti https://`);
  });
  if (TB.cfg && topbarData().on !== false && !topbarData().items.some(x => x.on !== false)) problems.push("Juosta virš header'io: įjunkite bent vieną žinutę arba išjunkite juostą");
  TB.cfg?.items.forEach((x, i) => {
    if (x.href && /^(https?:)?\/\//.test(x.href) && !/^https:\/\//.test(x.href)) problems.push(`${i + 1} žinutė: nuoroda turi prasidėti https://`);
  });
  if (err) showFormErr(err.closest(".heEdit"), problems);
  if (problems.length) return;
  const slides = HE.slides.map(({ bg, ...s }) => ({ ...s, ...(s.image ? {} : { focus: undefined, focusM: undefined }) }));
  const rails = HE.rails.map(r => ({ id: r.id, on: r.on !== false, title: r.title.trim(), line: (r.line || "").trim(), mode: r.mode, ...(r.mode === "manual" ? { ids: r.ids } : { rule: r.rule, limit: r.limit }), ...(r.href ? { href: r.href } : {}) }));
  await saveSettingsPatch({ slides: clone(slides), tiles: clone(HE.tiles), rails: clone(rails), slideSeconds: HE.secs, topbar: topbarData() });
  await catalogChanged(`${HE_PARTS[HE.part] || "Pradžios puslapis"}: išsaugota`);
}

// ── Skyriai su produktais (karuselės, v15) ────────────
// Taisyklės laukai: [rule raktas, pavadinimas, parinktys]; tuščia reikšmė – „Visi“
function railRuleFields() {
  return [
    ["type", "Kategorija", VD.TYPES.map(t => [t.id, t.name]), "Visos"],
    ["gender", "Kam", Object.entries(VD.GENDER_NAME), "Visiems"],
    ["family", "Kvapo šeima", VD.CAT.families.map(f => [f.id, f.name]), "Visos"],
    ["category", "Kolekcija", HE.cats.map(c => [c.id, c.name]), "Visos"],
    ["scent", "Kvapas", HE.scents.map(x => [x.id, x.name]), "Visi"]
  ].filter(([, , opts]) => opts.length);
}
const railTypeName = p => VD.TYPES.find(t => t.id === (p.type || "kvepalai"))?.one || "";
function railSummary(r) {
  const list = VD.railProducts(r);
  if (r.mode === "manual") return `Pasirinkti ranka · ${plural(list.length, "produktas", "produktai", "produktų")}`;
  const q = r.rule || {};
  const parts = railRuleFields()
    .filter(([k]) => q[k])
    .map(([k, , opts]) => opts.find(o => o[0] === q[k])?.[1] || q[k]);
  if (q.sale) parts.push("su nuolaida");
  parts.push(VD.RAIL_SORTS.find(s => s[0] === (q.sort || "rank"))?.[1] || "");
  const all = VD.railMatches(r).length;
  return `${parts.filter(Boolean).join(" · ")} · ${plural(list.length, "produktas", "produktai", "produktų")}${all > list.length ? ` iš ${all}` : ""}`;
}
function railRow(r, i) {
  const list = VD.railProducts(r);
  return heRowHTML({
    kind: "rail",
    id: r.id,
    on: r.on,
    thumb: `<span class="heThumb heRailThumb">${list.length ? list.slice(0, 3).map(p => `<span style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span>`).join("") : glyph("grid")}</span>`,
    title: `${i + 1}. ${esc(r.title || "Be pavadinimo")}`,
    sub: `${esc(railSummary(r))}${list.length ? "" : " · nerodoma"}${r.on === false ? " · paslėpta" : ""}`
  });
}
function railLinkOptions(r) {
  const auto = VD.railHref({ ...r, href: "" });
  const cur = r.href || "";
  const known = !cur || cur === "none" || isKnownLink(cur);
  return `<option value=""${sel(!cur)}>Automatiškai${auto ? ` (${esc(auto)})` : " – nerodoma"}</option><option value="none"${sel(cur === "none")}>Nerodyti</option>${linkGroups()
    .map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([v, n]) => `<option value="${esc(v)}"${sel(v === cur)}>${esc(n)}</option>`).join("")}</optgroup>`)
    .join("")}<option value="__custom"${sel(!known)}>Kitas adresas…</option>`;
}
function railFormHTML(r) {
  const q = r.rule || {};
  const custom = r.href && r.href !== "none" && !isKnownLink(r.href) ? r.href : "";
  const opt = (v, l, cur) => `<option value="${esc(v)}"${sel(String(cur ?? "") === String(v))}>${esc(l)}</option>`;
  const rule = railRuleFields()
    .map(([k, label, opts, any]) => fieldHTML(label, `<select name="rq_${k}">${opt("", any, q[k] || "")}${opts.map(([v, l]) => opt(v, l, q[k])).join("")}</select>`))
    .join("");
  const chosen = (r.ids || []).map(id => VD.CAT.products.find(p => p.id === id)).filter(Boolean);
  return `<div class="heForm admForm">
${groupHTML(
  `${fieldHTML("Pavadinimas", `<input name="rtitle" maxlength="60" value="${esc(r.title || "")}" placeholder="Populiariausi vyrams" />`)}${fieldHTML(
    "Paantraštė",
    `<input name="rline" maxlength="90" value="${esc(r.line || "")}" placeholder="${esc(VD.railLine(r) || "Nebūtina")}" />`
  )}`,
  { foot: "Pavadinimas ir paantraštė – juodoje juostoje virš karuselės, su nuoroda „Peržiūrėti viską“. Tuščia paantraštė parenkama automatiškai." }
)}
<div class="axSeg heSeg" role="tablist" aria-label="Produktai"><button type="button" role="tab" data-he-rmode="auto" aria-selected="${r.mode !== "manual"}">Pagal taisyklę</button><button type="button" role="tab" data-he-rmode="manual" aria-selected="${
    r.mode === "manual"
  }">Pasirinkti ranka</button></div>
${
  r.mode === "manual"
    ? `<div class="ig heRChosen">${
        chosen.length
          ? chosen
              .map(
                p => `<div class="heRProd" data-rid="${esc(p.id)}">${gripHTML()}${thumb(p)}<span class="axRowTxt"><b>${esc(p.name)}</b><small>${esc(railTypeName(p))}${p.visible === false ? " · paslėptas" : ""}</small></span><button class="roundBtn" type="button" data-he-rrm aria-label="Pašalinti ${esc(
                  p.name
                )}">${glyph("x")}</button></div>`
              )
              .join("")
          : `<p class="axRowNote heEmpty">Dar nepasirinkta – raskite produktą žemiau.</p>`
      }</div>
${searchHTML(`rs-${esc(r.id)}`, "Pridėti produktą: pavadinimas, kvapas", "", "Pridėti produktą").replace('type="search"', 'type="search" name="rsearch"')}
<div class="ig heRResults" data-he-rresults hidden></div>`
    : `<h2 class="igHead">Taisyklė</h2><div class="ig heRRule">${rule}${fieldHTML("Rikiuoti", `<select name="rq_sort">${VD.RAIL_SORTS.map(([v, l]) => opt(v, l, q.sort || "rank")).join("")}</select>`)}${`<div class="axField axStepper"><span>Kiek rodyti</span><span class="axStep"><button type="button" class="roundBtn" data-he-rstep="-1" aria-label="Mažiau">${glyph(
        "minus"
      )}</button><input name="rlimit" type="number" inputmode="numeric" min="1" max="${VD.RAIL_MAX}" step="1" value="${esc(VD.railLimit(r))}" aria-label="Kiek produktų rodyti" /><button type="button" class="roundBtn" data-he-rstep="1" aria-label="Daugiau">${glyph(
        "plus"
      )}</button></span></div>`}<label class="axField axSwitchRow"><span>Tik su nuolaida</span><input type="checkbox" name="rq_sale" class="admSwitchInp"${attr(!!q.sale, "checked")} /></label></div>`
}
<p class="igFoot heRCount" data-he-rcount>${esc(railSummary(r))}</p>
${groupHTML(
  `${fieldHTML("„Peržiūrėti“", `<select name="rhref">${railLinkOptions(r)}</select>`)}${fieldHTML("Adresas", `<input name="rhrefCustom" maxlength="200" value="${esc(custom)}" placeholder="kvepalai?seima=gurmaniski" />`, {
    cls: "heCustom",
    attrs: custom ? "" : "hidden"
  })}`
)}
${itemActs()}
</div>`;
}
function paintRails() {
  const box = $("#heRails");
  if (!box) return;
  box.innerHTML = HE.rails.length ? HE.rails.map(railRow).join("") : `<p class="axRowNote heEmpty">Skyrių nėra – pridėkite žemiau.</p>`;
  hydrateIcons(box);
  sortable(box, { item: ".heItem", onMove: (from, to) => (moveItem(HE.rails, from, to), changed({ repaint: "rails", scroll: `rail:${HE.rails[to].id}` })) });
  const r = HE.openRail && HE.rails.find(x => x.id === HE.openRail);
  if (r) {
    const page = box.closest(".axPage");
    const focused = document.activeElement?.name === "rsearch";
    openItem(page, r.title || "Skyrius", `<article class="heItem open" data-he-rail="${esc(r.id)}">${railFormHTML(r)}</article>`);
    const chosen = $("#heItemBox .heRChosen", page);
    if (chosen)
      sortable(chosen, {
        item: ".heRProd",
        onMove: (from, to) => {
          const rr = HE.rails.find(x => x.id === HE.openRail);
          moveItem(rr.ids, from, to);
          changed({ repaint: "rails", scroll: `rail:${rr.id}` });
        }
      });
    if (focused) $('#heItemBox input[name="rsearch"]', page)?.focus();
  }
}
// Atnaujinama tik skyriaus santrauka (ne visa forma – kad nedingtų fokusas)
function railRefresh(r) {
  const txt = railSummary(r);
  $$(`[data-he-rail="${CSS.escape(r.id)}"]`).forEach(it => {
    const c = $("[data-he-rcount]", it);
    if (c) c.textContent = txt;
    const small = $(".heRowTxt small", it);
    if (small) small.textContent = `${txt}${VD.railProducts(r).length ? "" : " · nerodoma"}${r.on === false ? " · paslėpta" : ""}`;
  });
}
function railResults(r, q) {
  const box = $(`[data-he-rail="${CSS.escape(r.id)}"] [data-he-rresults]`);
  if (!box) return;
  const f = fold(q.trim());
  const have = new Set(r.ids || []);
  const hits = f
    ? VD.CAT.products.filter(p => !have.has(p.id) && fold([p.name, p.inspired || "", railTypeName(p), ...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])].join(" ")).includes(f)).slice(0, 8)
    : [];
  box.hidden = !f;
  box.innerHTML = hits.length
    ? hits.map(p => `<button class="axRow heRPick" type="button" data-he-rpick="${esc(p.id)}">${thumb(p)}<span class="axRowTxt"><b>${esc(p.name)}</b><small>${esc(railTypeName(p))}</small></span><span class="axAddIco">${glyph("plus")}</span></button>`).join("")
    : `<p class="axRowNote">Nieko nerasta</p>`;
  hydrateIcons(box);
}
function railClick(t, r, it) {
  // „Kiek rodyti“: − / + (1–48); įrašyti skaičių galima ir ranka
  const step = t.closest("[data-he-rstep]");
  if (step) {
    const inp = $('input[name="rlimit"]', step.closest(".axStep"));
    inp.value = VD.railLimit({ limit: Number(inp.value || VD.railLimit(r)) + Number(step.dataset.heRstep) });
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  const mode = t.closest("[data-he-rmode]");
  if (mode) {
    r.mode = mode.dataset.heRmode;
    if (r.mode === "auto" && !Object.keys(r.rule || {}).length) r.rule = { type: "kvepalai", sort: "rank" };
    changed({ repaint: "rails", scroll: `rail:${r.id}` });
    return true;
  }
  const pick = t.closest("[data-he-rpick]");
  if (pick) {
    r.ids = [...(r.ids || []), pick.dataset.heRpick];
    changed({ repaint: "rails", scroll: `rail:${r.id}` });
    $(`[data-he-rail="${CSS.escape(r.id)}"] input[name="rsearch"]`)?.focus();
    return true;
  }
  const row = t.closest("[data-rid]");
  const mv = t.closest("[data-he-rmv]");
  if (row && mv) {
    const i = r.ids.indexOf(row.dataset.rid);
    const j = i + Number(mv.dataset.heRmv);
    if (i < 0 || j < 0 || j >= r.ids.length) return true;
    [r.ids[i], r.ids[j]] = [r.ids[j], r.ids[i]];
    changed({ repaint: "rails", scroll: `rail:${r.id}` });
    return true;
  }
  if (row && t.closest("[data-he-rrm]")) {
    r.ids = r.ids.filter(id => id !== row.dataset.rid);
    changed({ repaint: "rails", scroll: `rail:${r.id}` });
    return true;
  }
  return false;
}
function railChange(t, r) {
  if (t.name?.startsWith("rq_")) {
    const k = t.name.slice(3);
    r.rule = { ...(r.rule || {}) };
    const v = t.type === "checkbox" ? t.checked : t.value;
    if (v) r.rule[k] = v;
    else delete r.rule[k];
  } else if (t.name === "rlimit") {
    r.limit = VD.railLimit({ limit: t.value });
    t.value = r.limit;
  } else if (t.name === "rhref") {
    const custom = $(".heCustom", t.closest(".heForm"));
    custom.hidden = t.value !== "__custom";
    r.href = t.value === "__custom" ? $("input", custom).value.trim() || "" : t.value;
    if (!custom.hidden) $("input", custom).focus();
  } else return;
  railRefresh(r);
  changed({ scroll: `rail:${r.id}` });
}
function railInput(t, r) {
  if (t.name === "rsearch") return railResults(r, t.value);
  if (t.name === "rtitle" || t.name === "rline") {
    r[t.name === "rtitle" ? "title" : "line"] = t.value;
    const b = $(`#heRails [data-he-rail="${CSS.escape(r.id)}"] .heRowTxt b`);
    if (b && t.name === "rtitle") b.textContent = `${HE.rails.indexOf(r) + 1}. ${t.value || "Be pavadinimo"}`;
  } else if (t.name === "rhrefCustom") r.href = t.value.trim().replace(/^\/+/, "");
  else return;
  changed({ scroll: `rail:${r.id}` });
}
