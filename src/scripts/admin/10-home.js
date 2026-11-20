// 10 – Pradžios puslapis (admin/pradzia): juosta virš header'io (12-topbar.js), skaidrės, „Produktai“ plytelės ir skyriai su
// produktais (karuselės, v15: settings.rails – pagal taisyklę arba pasirinkti ranka) su gyva peržiūra (telefonas / kompiuteris).
// Skaidrė: rodoma / paslėpta, eilė, fonas – nuotrauka (kompiuteriui ir, nebūtinai, telefonui; spustelėjus nurodoma vieta,
// kuri turi likti matoma) arba Vaidore scena su pasirinkto kvapo buteliukais; tekstai (tušti – iš šablono), mygtukas,
// nuoroda, tekstas šviesus / tamsus. Plytelė: rodoma, eilė, pavadinimas, nuotrauka. Saugoma settings.slides / tiles /
// slideSeconds (formatas – 25-home-config.js). Peržiūra – tikra parduotuvė <iframe> (?vdPreview=1), juodraštis – postMessage.
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
const HE = { slides: [], tiles: [], rails: [], secs: 6, open: null, openTile: null, openRail: null, view: "phone", frame: null, ready: false, focus: 0, scents: [] };
const uid = () => Math.random().toString(36).slice(2, 8);
const clone = x => JSON.parse(JSON.stringify(x));

async function renderHomeEditor(main, _param, seq) {
  main.innerHTML = pageHead("Pradžia") + loading();
  const [rows, categories, scents] = await Promise.all([
    sbRest("settings?select=data&id=eq.1"),
    sbRest("categories?select=id,name,image,visible&order=sort.asc,name.asc"),
    sbRest("scents?select=id,name&order=name.asc").catch(() => [])
  ]);
  if (stale(seq)) return;
  const S = rows?.[0]?.data || VD.SET;
  HE.slides = clone(Array.isArray(S.slides) ? S.slides : VD.DEFAULT_SLIDES).map(s => ({ id: s.id || uid(), on: s.on !== false, ...s }));
  HE.tiles = clone(Array.isArray(S.tiles) ? S.tiles : VD.DEFAULT_TILES);
  HE.secs = Number(S.slideSeconds ?? 6);
  HE.rails = clone(Array.isArray(S.rails) ? S.rails : VD.DEFAULT_RAILS).map(r => ({ ...r, id: r.id || uid(), rule: r.rule || {}, ids: r.ids || [] }));
  HE.scents = scents || [];
  HE.openRail = null;
  HE.cats = categories;
  HE.open = null;
  HE.openTile = null;
  HE.ready = false;
  main.innerHTML = `${pageHead("Pradžios puslapis", "Juosta virš header'io, skaidrės ir „Produktai“ plytelės. Peržiūra – kaip pirkėjui, dar prieš išsaugant.")}
<div class="heLayout">
<div class="heEdit">
${topbarSectionHTML(S)}
<section class="admCard"><div class="heSecHead"><h2>Skaidrės</h2><label class="heSecs">Keičiasi kas <input type="number" inputmode="numeric" min="0" max="30" value="${HE.secs}" data-he-secs aria-label="Sekundės" /> s</label></div>
<p class="admNote">Rodoma iš eilės, pirmoji – svarbiausia. Nuotrauka – kompiuteriui plati (2880 × 934), telefonui – 1000 × 1150 (nebūtina – nėra, naudojama ta pati). „Tik nuotrauka“ – be jokių užrašų ant jos. 0 s – skaidrės nesikeičia pačios.</p>
<div class="heList" id="heSlides"></div>
<div class="heAdd"><span class="admMuted">Pridėti:</span>${Object.entries(VD.SLIDE_PRESETS)
    .map(([k, p]) => `<button class="btn ${k === "photo" ? "primary" : "ghost"} small" type="button" data-he-add="${k}">${glyph(k === "photo" ? "upload" : "plus")}${esc(p.name)}</button>`)
    .join("")}</div>
</section>
<section class="admCard"><h2>„Produktai“ plytelės</h2>
<p class="admNote">Kategorijų plytelės po skaidrėmis: pavadinimas virš plytelės (kaip parfumada.lt), po juo – nuotrauka (4:5, 1000 × 1250). Be nuotraukos – Vaidore scena su tos grupės buteliukais. Ta pati nuotrauka rodoma ir grupės puslapio viršuje.</p>
<div class="heList" id="heTiles"></div>
<div class="heAdd" id="heTileAdd"></div>
</section>
<section class="admCard"><h2>Skyriai su produktais</h2>
<p class="admNote">Karuselės pradžios puslapyje, pvz. „Kvapnios naujienos“, „Populiariausi moterims“. Produktai – pagal taisyklę (kategorija, lytis, kvapo šeima, kolekcija, kvapas, paros laikas, sezonas, proga, nuolaida) arba pasirinkti ranka. Skyrius be produktų nerodomas.</p>
<div class="heList" id="heRails"></div>
<div class="heAdd"><span class="admMuted">Pridėti:</span><button class="btn ghost small" type="button" data-he-addrail="auto">${glyph("plus")}Pagal taisyklę</button><button class="btn ghost small" type="button" data-he-addrail="manual">${glyph("plus")}Pasirinkti produktus</button></div>
</section>
<div class="admSaveBar"><p class="formErr" role="alert" hidden></p><button class="btn ghost" type="button" data-he-reset>Numatytieji</button><button class="btn primary" type="button" data-he-save>${glyph("check")}Išsaugoti</button></div>
</div>
<aside class="hePrev" aria-label="Peržiūra">
<div class="hePrevHead"><b>Peržiūra</b><div class="seg heSeg" role="tablist"><button type="button" role="tab" data-he-view="phone" aria-selected="true">Telefonas</button><button type="button" role="tab" data-he-view="desktop" aria-selected="false">Kompiuteris</button></div></div>
<div class="heFrameBox" data-view="phone"><iframe id="heFrame" title="Pradžios puslapio peržiūra" src="./?vdPreview=1" loading="eager"></iframe></div>
</aside>
</div>`;
  hydrateIcons(main);
  HE.frame = $("#heFrame");
  paintSlides();
  paintTiles();
  paintRails();
  fitFrame();
  bindHomeEditor(main);
  bindTopbar(main);
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
  const k = Math.min(1, box.clientWidth / W);
  box.dataset.view = HE.view;
  Object.assign(HE.frame.style, { width: `${W}px`, height: `${H}px`, transform: `scale(${k})` });
  box.style.height = `${Math.round(H * k)}px`;
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
function slideRow(s, i) {
  const r = VD.resolveSlide(s) || {};
  const open = HE.open === s.id;
  const preset = VD.SLIDE_PRESETS[s.preset] || VD.SLIDE_PRESETS.custom;
  return `<article class="heItem${open ? " open" : ""}${s.on === false ? " off" : ""}" data-he-slide="${esc(s.id)}">
<div class="heRow">
<button class="heRowMain" type="button" data-he-open aria-expanded="${open}">${
    s.preset === "photo" && !s.image && !s.imageM ? `<span class="heThumb heThumbEmpty">${glyph("upload")}</span>` : thumbHTML(r.stage, r.list || [], s.image || s.imageM, s.focus)
  }<span class="heRowTxt"><b>${i + 1}. ${esc(s.preset === "photo" ? s.title || "Nuotrauka" : r.title || "Be pavadinimo")}</b><small>${esc(preset.name)} · ${
    s.preset === "photo"
      ? [s.image && "kompiuteriui", s.imageM && "telefonui"].filter(Boolean).join(" ir ") || "įkelkite nuotrauką"
      : s.image
        ? "nuotrauka"
        : "scena"
  }${s.on === false ? " · paslėpta" : ""}</small></span></button>
<div class="heRowActs"><button class="roundBtn" type="button" data-he-move="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-he-move="1" aria-label="Žemiau"${attr(
    i === HE.slides.length - 1,
    "disabled"
  )}>${glyph("chev-right")}</button><input type="checkbox" class="admSwitchInp" data-he-on aria-label="Rodoma"${attr(s.on !== false, "checked")} /></div>
</div>
${open ? slideFormHTML(s, r) : ""}
</article>`;
}
function imgZone(field, label, hint, src, focus) {
  return `<div class="heZone${src ? " has" : ""}" data-he-zone="${field}">
<p class="heZoneLab"><b>${label}</b><small>${hint}</small></p>
${
  src
    ? `<div class="heFocus" data-he-focus="${field}"><img src="${esc(src)}" alt="" /><i class="heDot" style="left:${esc((focus || "50% 50%").split(" ")[0])};top:${esc((focus || "50% 50%").split(" ")[1])}"></i></div>
<p class="admNote">Spustelėkite vietą, kuri turi likti matoma siaurame ekrane.</p>
<div class="heZoneActs"><label class="btn ghost small admUpload">${glyph("upload")}Pakeisti<input type="file" accept="image/*" hidden data-he-file="${field}" /></label><button class="btn ghost small" type="button" data-he-rmimg="${field}">${glyph("trash")}Pašalinti</button></div>`
    : `<label class="heDrop">${glyph("upload")}<span>Įkelti nuotrauką</span><small>arba nutempkite čia · JPG, PNG, WebP</small><input type="file" accept="image/*" hidden data-he-file="${field}" /></label>`
}
</div>`;
}
// „Tik nuotrauka“: dvi nuotraukos (kompiuteriui / telefonui), nebūtina nuoroda ir aprašymas skaitytuvams – be kvapo ir tekstų
function photoSlideFormHTML(s) {
  const custom = s.href && !isKnownLink(s.href) ? s.href : "";
  return `<div class="heForm admForm">
<p class="admNote heFirst">Įkelkite nuotrauką kompiuteriui ir (nebūtinai) telefonui. Svetainė ant jos nieko neuždeda – jei reikia teksto, jis turi būti pačioje nuotraukoje.</p>
<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui", "1000 × 1150", s.imageM, s.focusM)}</div>
<label class="field"><span>Nuoroda (nebūtina)</span><select name="hrefSel">${linkOptions(s.href || "", "Be nuorodos")}</select><small>Paspaudus skaidrę – atidaromas šis puslapis</small></label>
<label class="field heCustom"${attr(!custom, "hidden")}><span>Adresas</span><input name="hrefCustom" maxlength="200" value="${esc(custom)}" placeholder="pvz. kvepalai?seima=gurmaniski" /><small>Svetainės adresas be „/“ pradžioje</small></label>
<label class="field"><span>Aprašymas (nebūtina)</span><input name="title" maxlength="80" value="${esc(s.title || "")}" placeholder="pvz. Žiemos kolekcija – Ventor" /><small>Nerodomas – skaitytuvams ir šiam sąrašui</small></label>
<div class="heFormActs"><button class="btn ghost small" type="button" data-he-dup>${glyph("copy")}Kopijuoti</button><button class="btn danger small" type="button" data-he-del>${glyph("trash")}Ištrinti</button></div>
</div>`;
}
function slideFormHTML(s, r) {
  if (s.preset === "photo") return photoSlideFormHTML(s);
  const d = VD.slideDefaults(s);
  const custom = s.href && !isKnownLink(s.href) ? s.href : "";
  const prods = VD.CAT.products;
  const fld = (name, label, ph, max) =>
    `<label class="field"><span>${label}</span><input name="${name}" maxlength="${max}" value="${esc(s[name] || "")}" placeholder="${esc(ph || "")}" /><small>Tuščia – „${esc(ph || "nerodoma")}“</small></label>`;
  return `<div class="heForm admForm">
<div class="seg heSeg" role="tablist" aria-label="Fonas"><button type="button" role="tab" data-he-bg="photo" aria-selected="${!!(s.image || s.bg === "photo")}">Nuotrauka</button><button type="button" role="tab" data-he-bg="scene" aria-selected="${!(s.image || s.bg === "photo")}">Vaidore scena</button></div>
${
  s.image || s.bg === "photo"
    ? `<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui (nebūtina)", "1000 × 1150", s.imageM, s.focusM)}</div>
<div class="seg heSeg" role="tablist" aria-label="Tekstas"><button type="button" role="tab" data-he-dark="0" aria-selected="${!s.dark}">Juodas tekstas</button><button type="button" role="tab" data-he-dark="1" aria-selected="${!!s.dark}">Baltas tekstas</button></div>`
    : `<label class="field"><span>Kompozicija</span><select name="scene">${Object.keys(SCENE_NAMES)
        .map(k => `<option value="${k}"${sel((s.scene || d.scene) === k)}>${SCENE_NAMES[k]}</option>`)
        .join("")}</select></label>`
}
<label class="field"><span>Kvapas</span><select name="product"><option value="">${esc(VD.CAT.products.find(p => p.id === VD.SET.hero?.product)?.name || "Pagal nustatymus")} (numatytas)</option>${prods
    .map(p => `<option value="${esc(p.id)}"${sel(p.id === s.product)}>${esc(p.name)}</option>`)
    .join("")}</select><small>Jo buteliukas scenoje ir numatytieji tekstai</small></label>
${fld("eyebrow", "Antraštė virš pavadinimo", d.eyebrow, 40)}
${fld("title", "Pavadinimas", d.title, 60)}
<label class="field"><span>Tekstas</span><textarea name="text" rows="${String(d.text || "").includes("\n") ? 4 : 2}" maxlength="240" placeholder="${esc(d.text || "")}">${esc(s.text || "")}</textarea><small>Kelios eilutės – teiginiai su auksinėmis linijomis (kaip parfumada.lt). Tuščia – numatytasis tekstas</small></label>
<div class="fieldRow">${fld("cta", "Mygtukas", d.cta, 30)}<label class="field"><span>Nuoroda</span><select name="hrefSel">${linkOptions(s.href || "")}</select><small>Tuščia – „${esc(d.href)}“</small></label></div>
<label class="field heCustom"${attr(!custom, "hidden")}><span>Adresas</span><input name="hrefCustom" maxlength="200" value="${esc(custom)}" placeholder="pvz. kvepalai?seima=gurmaniski" /><small>Svetainės adresas be „/“ pradžioje</small></label>
<div class="heFormActs"><button class="btn ghost small" type="button" data-he-dup>${glyph("copy")}Kopijuoti</button><button class="btn danger small" type="button" data-he-del>${glyph("trash")}Ištrinti</button></div>
</div>`;
}
function paintSlides() {
  const box = $("#heSlides");
  box.innerHTML = HE.slides.length ? HE.slides.map(slideRow).join("") : `<p class="admMuted heEmpty">Skaidrių nėra – pradžios puslapis prasidės plytelėmis.</p>`;
  hydrateIcons(box);
}

// ── Plytelės ──────────────────────────────────────────
function tileName(t) {
  if (TILE_NAMES[t.key]) return TILE_NAMES[t.key];
  return HE.cats.find(c => `kat-${c.id}` === t.key)?.name || t.key;
}
function tileRow(t, i) {
  const p = VD.tilePreset(t.key);
  const open = HE.openTile === t.key;
  const img = t.image || p?.image || "";
  return `<article class="heItem${open ? " open" : ""}${t.on === false ? " off" : ""}" data-he-tile="${esc(t.key)}">
<div class="heRow">
<button class="heRowMain" type="button" data-he-open aria-expanded="${open}">${thumbHTML(p?.stage || "unisex", p?.list || [], img, t.focus)}<span class="heRowTxt"><b>${esc(t.title || tileName(t))}</b><small>${
    img ? "nuotrauka" : "scena"
  }${p?.list?.length === 0 ? " · nėra prekių – nerodoma" : ""}${t.on === false ? " · paslėpta" : ""}</small></span></button>
<div class="heRowActs"><button class="roundBtn" type="button" data-he-move="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-he-move="1" aria-label="Žemiau"${attr(
    i === HE.tiles.length - 1,
    "disabled"
  )}>${glyph("chev-right")}</button><input type="checkbox" class="admSwitchInp" data-he-on aria-label="Rodoma"${attr(t.on !== false, "checked")} /></div>
</div>
${
  open
    ? `<div class="heForm admForm">
<label class="field"><span>Pavadinimas</span><input name="title" maxlength="30" value="${esc(t.title || "")}" placeholder="${esc(p?.name || tileName(t))}" /><small>Rodomas virš plytelės didžiosiomis raidėmis (kaip parfumada.lt). Tuščia – „${esc(p?.name || tileName(t))}“</small></label>
<div class="heZones one">${imgZone("image", "Nuotrauka", "stati 4:5, 1000 × 1250; užrašas – pačioje nuotraukoje", t.image, t.focus)}</div>
${
  t.image
    ? `<div class="seg heSeg" role="tablist" aria-label="Tekstas"><button type="button" role="tab" data-he-dark="0" aria-selected="${!t.dark}">Juodas tekstas</button><button type="button" role="tab" data-he-dark="1" aria-selected="${!!t.dark}">Baltas tekstas</button></div>`
    : p?.image
      ? `<p class="admNote">Dabar rodomas kategorijos paveikslas (Kategorijos).</p>`
      : ""
}
${t.key.startsWith("kat-") ? `<div class="heFormActs"><button class="btn danger small" type="button" data-he-del>${glyph("trash")}Pašalinti iš pradžios</button></div>` : ""}
</div>`
    : ""
}
</article>`;
}
function paintTiles() {
  const box = $("#heTiles");
  box.innerHTML = HE.tiles.map(tileRow).join("");
  const have = new Set(HE.tiles.map(t => t.key));
  const add = [...Object.keys(TILE_NAMES).filter(k => !have.has(k)).map(k => [k, TILE_NAMES[k]]), ...HE.cats.filter(c => !have.has(`kat-${c.id}`)).map(c => [`kat-${c.id}`, c.name])];
  $("#heTileAdd").innerHTML = add.length
    ? `<span class="admMuted">Pridėti:</span>${add.map(([k, n]) => `<button class="btn ghost small" type="button" data-he-addtile="${esc(k)}">${glyph("plus")}${esc(n)}</button>`).join("")}`
    : "";
  hydrateIcons(box);
  hydrateIcons($("#heTileAdd"));
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
  main.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const view = t.closest("[data-he-view]");
    if (view) {
      HE.view = view.dataset.heView;
      $$("[data-he-view]").forEach(b => b.setAttribute("aria-selected", String(b === view)));
      fitFrame();
      return sendPreview({ slide: HE.focus });
    }
    const add = t.closest("[data-he-add]");
    if (add) {
      const s = { id: uid(), on: true, preset: add.dataset.heAdd };
      HE.slides.push(s);
      HE.open = s.id;
      return changed({ repaint: "slides", slide: HE.slides.length - 1 });
    }
    const addTile = t.closest("[data-he-addtile]");
    if (addTile) {
      HE.tiles.push({ key: addTile.dataset.heAddtile, on: true });
      HE.openTile = addTile.dataset.heAddtile;
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
      if (isSlide) HE.open = HE.open === x.id ? null : x.id;
      else if (it.kind === "rails") HE.openRail = HE.openRail === x.id ? null : x.id;
      else HE.openTile = HE.openTile === x.key ? null : x.key;
      if (isSlide) HE.focus = it.i;
      ({ slides: paintSlides, tiles: paintTiles, rails: paintRails })[it.kind]();
      return sendPreview({ slide: HE.focus, scroll: isSlide ? "" : it.kind === "rails" ? `rail:${x.id}` : "tiles" });
    }
    const mv = t.closest("[data-he-move]");
    if (mv) {
      const j = it.i + Number(mv.dataset.heMove);
      if (j < 0 || j >= it.arr.length) return;
      [it.arr[it.i], it.arr[j]] = [it.arr[j], it.arr[it.i]];
      return changed({ repaint: it.kind, slide: isSlide ? j : null, scroll: isSlide ? "" : it.kind === "rails" ? `rail:${x.id}` : "tiles" });
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
      askConfirm(isSlide ? `Skaidrė „${VD.resolveSlide(x)?.title || ""}“ bus pašalinta (išsaugojus).` : it.kind === "rails" ? `Skyrius „${x.title}“ bus pašalintas iš pradžios puslapio (išsaugojus).` : "Plytelė bus pašalinta iš pradžios puslapio.", {
        title: "Pašalinti?",
        ok: "Pašalinti",
        danger: true
      }).then(ok => {
        if (!ok) return;
        it.arr.splice(it.i, 1);
        changed({ repaint: it.kind, slide: 0, scroll: isSlide ? "" : "tiles" });
      });
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
      return changed({ repaint: it.kind, slide: it.kind === "slides" ? it.i : null, scroll: it.kind === "tiles" ? "tiles" : it.kind === "rails" ? `rail:${x.id}` : "" });
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
    const b = $(".heRowTxt b", t.closest(".heItem"));
    if (b && it.kind === "slides" && t.name === "title") b.textContent = `${it.i + 1}. ${VD.resolveSlide(x)?.title || ""}`;
    if (b && it.kind === "tiles" && t.name === "title") b.textContent = v || tileName(x);
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
async function resetHome() {
  const ok = await askConfirm("Skaidrės, plytelės ir skyriai grįš į numatytuosius (Vaidore scenos). Įkeltos nuotraukos liks saugykloje, bet nebus rodomos.", {
    title: "Grąžinti numatytuosius?",
    ok: "Grąžinti"
  });
  if (!ok) return;
  HE.slides = clone(VD.DEFAULT_SLIDES);
  HE.tiles = clone(VD.DEFAULT_TILES);
  HE.rails = clone(VD.DEFAULT_RAILS);
  HE.openRail = null;
  HE.secs = 6;
  $("[data-he-secs]").value = 6;
  HE.open = HE.openTile = null;
  changed({ repaint: "slides", slide: 0 });
  paintTiles();
  paintRails();
}
async function saveHome() {
  const err = $(".admSaveBar .formErr");
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
  err.hidden = !problems.length;
  err.textContent = problems.join(" · ");
  if (problems.length) return;
  const slides = HE.slides.map(({ bg, ...s }) => ({ ...s, ...(s.image ? {} : { focus: undefined, focusM: undefined }) }));
  const [cur] = (await sbRest("settings?select=data&id=eq.1")) || [];
  const rails = HE.rails.map(r => ({ id: r.id, on: r.on !== false, title: r.title.trim(), line: (r.line || "").trim(), mode: r.mode, ...(r.mode === "manual" ? { ids: r.ids } : { rule: r.rule, limit: r.limit }), ...(r.href ? { href: r.href } : {}) }));
  const data = { ...(cur?.data || VD.SET), slides: clone(slides), tiles: clone(HE.tiles), rails: clone(rails), slideSeconds: HE.secs, topbar: topbarData() };
  const saved = await sbRest("settings?id=eq.1", { method: "PATCH", body: { data }, prefer: "return=representation" });
  if (!saved?.length) throw new Error("Nustatymų įrašo nėra – paleiskite supabase/seed.sql");
  await catalogChanged("Pradžios puslapis išsaugotas");
}

// ── Skyriai su produktais (karuselės, v15) ────────────
// Taisyklės laukai: [rule raktas, pavadinimas, parinktys]; tuščia reikšmė – „Visi“
function railRuleFields() {
  return [
    ["type", "Kategorija", VD.TYPES.map(t => [t.id, t.name]), "Visos"],
    ["gender", "Kam", Object.entries(VD.GENDER_NAME), "Visiems"],
    ["family", "Kvapo šeima", VD.CAT.families.map(f => [f.id, f.name]), "Visos"],
    ["category", "Kolekcija", HE.cats.map(c => [c.id, c.name]), "Visos"],
    ["scent", "Kvapas", HE.scents.map(x => [x.id, x.name]), "Visi"],
    ["time", "Paros laikas", [["diena", "Dienai"], ["vakaras", "Vakarui"]], "Bet koks"],
    ["season", "Sezonas", Object.entries(VD.SEASON_NAME), "Bet koks"],
    ["occasion", "Proga", Object.entries(VD.OCCASION_NAME), "Bet kokia"]
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
  return `${parts.filter(Boolean).join(" · ")} · ${plural(list.length, "produktas", "produktai", "produktų")}`;
}
function railRow(r, i) {
  const open = HE.openRail === r.id;
  const list = VD.railProducts(r);
  return `<article class="heItem${open ? " open" : ""}${r.on === false ? " off" : ""}" data-he-rail="${esc(r.id)}">
<div class="heRow">
<button class="heRowMain" type="button" data-he-open aria-expanded="${open}"><span class="heThumb heRailThumb">${
    list.length ? list.slice(0, 3).map(p => `<span style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span>`).join("") : glyph("grid")
  }</span><span class="heRowTxt"><b>${i + 1}. ${esc(r.title || "Be pavadinimo")}</b><small>${esc(railSummary(r))}${list.length ? "" : " · nerodoma"}${r.on === false ? " · paslėpta" : ""}</small></span></button>
<div class="heRowActs"><button class="roundBtn" type="button" data-he-move="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-he-move="1" aria-label="Žemiau"${attr(
    i === HE.rails.length - 1,
    "disabled"
  )}>${glyph("chev-right")}</button><input type="checkbox" class="admSwitchInp" data-he-on aria-label="Rodomas"${attr(r.on !== false, "checked")} /></div>
</div>
${open ? railFormHTML(r) : ""}
</article>`;
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
    .map(([k, label, opts, any]) => `<label class="field"><span>${label}</span><select name="rq_${k}">${opt("", any, q[k] || "")}${opts.map(([v, l]) => opt(v, l, q[k])).join("")}</select></label>`)
    .join("");
  const chosen = (r.ids || []).map(id => VD.CAT.products.find(p => p.id === id)).filter(Boolean);
  return `<div class="heForm admForm">
<label class="field"><span>Pavadinimas</span><input name="rtitle" maxlength="60" value="${esc(r.title || "")}" placeholder="pvz. Populiariausi vyrams" /><small>Juodoje juostoje virš karuselės</small></label>
<label class="field"><span>Paantraštė (nebūtina)</span><input name="rline" maxlength="90" value="${esc(r.line || "")}" placeholder="pvz. Kvapai, kuriuos dažniausiai renkasi vyrai" /><small>Rodoma su nuoroda „Peržiūrėti“</small></label>
<div class="seg heSeg" role="tablist" aria-label="Produktai"><button type="button" role="tab" data-he-rmode="auto" aria-selected="${r.mode !== "manual"}">Pagal taisyklę</button><button type="button" role="tab" data-he-rmode="manual" aria-selected="${r.mode === "manual"}">Pasirinkti ranka</button></div>
${
  r.mode === "manual"
    ? `<div class="heRChosen">${
        chosen.length
          ? chosen
              .map(
                (p, i) => `<div class="heRProd" data-rid="${esc(p.id)}"><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span class="rowTxt">${esc(p.name)}<small>${esc(railTypeName(p))}${p.visible === false ? " · paslėptas" : ""}</small></span><span class="heRProdActs"><button class="roundBtn" type="button" data-he-rmv="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-he-rmv="1" aria-label="Žemiau"${attr(
                  i === chosen.length - 1,
                  "disabled"
                )}>${glyph("chev-right")}</button><button class="roundBtn" type="button" data-he-rrm aria-label="Pašalinti ${esc(p.name)}">${glyph("x")}</button></span></div>`
              )
              .join("")
          : `<p class="admMuted heEmpty">Dar nepasirinkta – raskite produktą žemiau.</p>`
      }</div>
<label class="search admSearch heRSearch"><span data-glyph="search" aria-hidden="true"></span><input type="search" name="rsearch" placeholder="Pridėti produktą: pavadinimas, kvapas, kategorija" aria-label="Pridėti produktą" /></label>
<div class="heRResults" data-he-rresults></div>`
    : `<div class="heRRule">${rule}</div>
<div class="fieldRow"><label class="field"><span>Rikiuoti</span><select name="rq_sort">${VD.RAIL_SORTS.map(([v, l]) => opt(v, l, q.sort || "rank")).join("")}</select></label>
<label class="field"><span>Kiek rodyti</span><input name="rlimit" type="number" inputmode="numeric" min="1" max="24" value="${esc(r.limit || 12)}" /></label></div>
<label class="admToggleRow"><span><b>Tik su nuolaida</b><small>Tik turimi produktai su tikra sena kaina</small></span><input type="checkbox" name="rq_sale" class="admSwitchInp"${attr(!!q.sale, "checked")} /></label>`
}
<p class="admNote heRCount" data-he-rcount>${esc(railSummary(r))}</p>
<label class="field"><span>Nuoroda „Peržiūrėti“</span><select name="rhref">${railLinkOptions(r)}</select></label>
<label class="field heCustom"${attr(!custom, "hidden")}><span>Adresas</span><input name="rhrefCustom" maxlength="200" value="${esc(custom)}" placeholder="pvz. kvepalai?seima=gurmaniski" /><small>Svetainės adresas be „/“ pradžioje</small></label>
<div class="heFormActs"><button class="btn ghost small" type="button" data-he-dup>${glyph("copy")}Kopijuoti</button><button class="btn danger small" type="button" data-he-del>${glyph("trash")}Ištrinti</button></div>
</div>`;
}
function paintRails() {
  const box = $("#heRails");
  if (!box) return;
  box.innerHTML = HE.rails.length ? HE.rails.map(railRow).join("") : `<p class="admMuted heEmpty">Skyrių nėra – pridėkite žemiau.</p>`;
  hydrateIcons(box);
}
// Atnaujinama tik skyriaus santrauka (ne visa forma – kad nedingtų fokusas)
function railRefresh(r) {
  const it = $(`[data-he-rail="${CSS.escape(r.id)}"]`);
  if (!it) return;
  const txt = railSummary(r);
  const c = $("[data-he-rcount]", it);
  if (c) c.textContent = txt;
  const small = $(".heRowTxt small", it);
  if (small) small.textContent = `${txt}${VD.railProducts(r).length ? "" : " · nerodoma"}${r.on === false ? " · paslėpta" : ""}`;
}
function railResults(r, q) {
  const box = $(`[data-he-rail="${CSS.escape(r.id)}"] [data-he-rresults]`);
  if (!box) return;
  const f = fold(q.trim());
  const have = new Set(r.ids || []);
  const hits = f
    ? VD.CAT.products.filter(p => !have.has(p.id) && fold([p.name, p.inspired || "", railTypeName(p), ...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])].join(" ")).includes(f)).slice(0, 8)
    : [];
  box.innerHTML = hits
    .map(
      p => `<button class="heRPick" type="button" data-he-rpick="${esc(p.id)}"><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span class="rowTxt">${esc(p.name)}<small>${esc(railTypeName(p))}</small></span>${glyph("plus")}</button>`
    )
    .join("");
  hydrateIcons(box);
}
function railClick(t, r, it) {
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
    r.limit = Math.max(1, Math.min(24, Math.round(Number(t.value) || 12)));
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
    const b = $(".heRowTxt b", t.closest(".heItem"));
    if (b && t.name === "rtitle") b.textContent = `${HE.rails.indexOf(r) + 1}. ${t.value || "Be pavadinimo"}`;
  } else if (t.name === "rhrefCustom") r.href = t.value.trim().replace(/^\/+/, "");
  else return;
  changed({ scroll: `rail:${r.id}` });
}
