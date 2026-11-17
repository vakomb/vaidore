// 10 – Pradžios puslapis (admin/pradzia): skaidrės ir „Produktai“ plytelės su gyva peržiūra (telefonas / kompiuteris).
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
const TILE_NAMES = { moterims: "Moterims", vyrams: "Vyrams", unisex: "Unisex", meginukai: "Mėginukai", rinkinys: "Rinkiniai", naujienos: "Naujienos" };
const HE = { slides: [], tiles: [], secs: 6, open: null, openTile: null, view: "phone", frame: null, ready: false, focus: 0 };
const uid = () => Math.random().toString(36).slice(2, 8);
const clone = x => JSON.parse(JSON.stringify(x));

async function renderHomeEditor(main, _param, seq) {
  main.innerHTML = pageHead("Pradžia") + loading();
  const [rows, categories] = await Promise.all([sbRest("settings?select=data&id=eq.1"), sbRest("categories?select=id,name,image,visible&order=sort.asc,name.asc")]);
  if (stale(seq)) return;
  const S = rows?.[0]?.data || VD.SET;
  HE.slides = clone(Array.isArray(S.slides) ? S.slides : VD.DEFAULT_SLIDES).map(s => ({ id: s.id || uid(), on: s.on !== false, ...s }));
  HE.tiles = clone(Array.isArray(S.tiles) ? S.tiles : VD.DEFAULT_TILES);
  HE.secs = Number(S.slideSeconds ?? 6);
  HE.cats = categories;
  HE.open = null;
  HE.openTile = null;
  HE.ready = false;
  main.innerHTML = `${pageHead("Pradžios puslapis", "Skaidrės ir „Produktai“ plytelės. Peržiūra – kaip pirkėjui, dar prieš išsaugant.")}
<div class="heLayout">
<div class="heEdit">
<section class="admCard"><div class="heSecHead"><h2>Skaidrės</h2><label class="heSecs">Keičiasi kas <input type="number" inputmode="numeric" min="0" max="30" value="${HE.secs}" data-he-secs aria-label="Sekundės" /> s</label></div>
<p class="admNote">Rodoma iš eilės, pirmoji – svarbiausia. Nuotrauka – kompiuteriui plati (2880 × 934), telefonui – kvadratinė (1080 × 1080; nebūtina – nėra, naudojama ta pati). „Tik nuotrauka“ – be jokių užrašų ant jos. 0 s – skaidrės nesikeičia pačios.</p>
<div class="heList" id="heSlides"></div>
<div class="heAdd"><span class="admMuted">Pridėti:</span>${Object.entries(VD.SLIDE_PRESETS)
    .map(([k, p]) => `<button class="btn ${k === "photo" ? "primary" : "ghost"} small" type="button" data-he-add="${k}">${glyph(k === "photo" ? "upload" : "plus")}${esc(p.name)}</button>`)
    .join("")}</div>
</section>
<section class="admCard"><h2>„Produktai“ plytelės</h2>
<p class="admNote">Kategorijų plytelės po skaidrėmis – tik nuotrauka (4:5, 1000 × 1250), pavadinimas turi būti pačioje nuotraukoje. Be nuotraukos – Vaidore scena su tos grupės buteliukais. Ta pati nuotrauka rodoma ir grupės puslapio viršuje.</p>
<div class="heList" id="heTiles"></div>
<div class="heAdd" id="heTileAdd"></div>
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
  fitFrame();
  bindHomeEditor(main);
}

// ── Peržiūra ──────────────────────────────────────────
const draft = () => ({ slides: HE.slides, tiles: HE.tiles, slideSeconds: HE.secs });
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
    ["Puslapiai", [["kvepalai", "Visi kvepalai"], ["moterims", "Moterims"], ["vyrams", "Vyrams"], ["unisex", "Unisex"], ["meginukai", "Mėginukai 2 ml"], ["rinkinys", "Atradimų rinkinys"], ["kvepalai?rikiuoti=new", "Naujienos"], ["apie-mus", "Apie mus"]]],
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
<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui", "kvadratinė, 1080 × 1080", s.imageM, s.focusM)}</div>
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
    ? `<div class="heZones">${imgZone("image", "Kompiuteriui", "plati, 2880 × 934", s.image, s.focus)}${imgZone("imageM", "Telefonui (nebūtina)", "kvadratinė, 1080 × 1080", s.imageM, s.focusM)}</div>
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
${fld("text", "Tekstas", d.text, 160)}
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
  }${p?.list?.length === 0 ? " · nėra kvapų – nerodoma" : ""}${t.on === false ? " · paslėpta" : ""}</small></span></button>
<div class="heRowActs"><button class="roundBtn" type="button" data-he-move="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-he-move="1" aria-label="Žemiau"${attr(
    i === HE.tiles.length - 1,
    "disabled"
  )}>${glyph("chev-right")}</button><input type="checkbox" class="admSwitchInp" data-he-on aria-label="Rodoma"${attr(t.on !== false, "checked")} /></div>
</div>
${
  open
    ? `<div class="heForm admForm">
<label class="field"><span>Pavadinimas</span><input name="title" maxlength="30" value="${esc(t.title || "")}" placeholder="${esc(p?.name || tileName(t))}" /><small>Svetainėje nerodomas (užrašas – pačioje nuotraukoje): skaitytuvams ir šiam sąrašui. Tuščia – „${esc(p?.name || tileName(t))}“</small></label>
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
  if (slide != null) HE.focus = slide;
  sendPreview({ slide: HE.focus, scroll });
}
function itemOf(el) {
  const s = el.closest("[data-he-slide]");
  if (s) return { kind: "slides", arr: HE.slides, i: HE.slides.findIndex(x => x.id === s.dataset.heSlide) };
  const t = el.closest("[data-he-tile]");
  if (t) return { kind: "tiles", arr: HE.tiles, i: HE.tiles.findIndex(x => x.key === t.dataset.heTile) };
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
    if (t.closest("[data-he-save]")) return busy(t.closest("[data-he-save]"), saveHome);
    if (t.closest("[data-he-reset]")) return resetHome();
    const it = itemOf(t);
    if (!it || it.i < 0) return;
    const x = it.arr[it.i];
    const isSlide = it.kind === "slides";
    if (t.closest("[data-he-open]")) {
      if (isSlide) HE.open = HE.open === x.id ? null : x.id;
      else HE.openTile = HE.openTile === x.key ? null : x.key;
      if (isSlide) HE.focus = it.i;
      (isSlide ? paintSlides : paintTiles)();
      return sendPreview({ slide: HE.focus, scroll: isSlide ? "" : "tiles" });
    }
    const mv = t.closest("[data-he-move]");
    if (mv) {
      const j = it.i + Number(mv.dataset.heMove);
      if (j < 0 || j >= it.arr.length) return;
      [it.arr[it.i], it.arr[j]] = [it.arr[j], it.arr[it.i]];
      return changed({ repaint: it.kind, slide: isSlide ? j : null, scroll: isSlide ? "" : "tiles" });
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
      HE.open = c.id;
      return changed({ repaint: "slides", slide: it.i + 1 });
    }
    if (t.closest("[data-he-del]")) {
      askConfirm(isSlide ? `Skaidrė „${VD.resolveSlide(x)?.title || ""}“ bus pašalinta (išsaugojus).` : "Plytelė bus pašalinta iš pradžios puslapio.", {
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
      return changed({ repaint: it.kind, slide: it.kind === "slides" ? it.i : null, scroll: it.kind === "tiles" ? "tiles" : "" });
    }
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
  const ok = await askConfirm("Skaidrės ir plytelės grįš į numatytąsias (Vaidore scenos). Įkeltos nuotraukos liks saugykloje, bet nebus rodomos.", {
    title: "Grąžinti numatytuosius?",
    ok: "Grąžinti"
  });
  if (!ok) return;
  HE.slides = clone(VD.DEFAULT_SLIDES);
  HE.tiles = clone(VD.DEFAULT_TILES);
  HE.secs = 6;
  $("[data-he-secs]").value = 6;
  HE.open = HE.openTile = null;
  changed({ repaint: "slides", slide: 0 });
  paintTiles();
}
async function saveHome() {
  const err = $(".admSaveBar .formErr");
  const problems = [];
  HE.slides.forEach((s, i) => {
    if (s.preset === "photo" && !s.image && !s.imageM) problems.push(`${i + 1} skaidrė: įkelkite nuotrauką (kompiuteriui ar telefonui)`);
    if (s.bg === "photo" && !s.image) problems.push(`${i + 1} skaidrė: įkelkite nuotrauką arba pasirinkite „Vaidore scena“`);
    if (s.href && /^(https?:)?\/\//.test(s.href) && !/^https:\/\//.test(s.href)) problems.push(`${i + 1} skaidrė: nuoroda turi prasidėti https://`);
  });
  err.hidden = !problems.length;
  err.textContent = problems.join(" · ");
  if (problems.length) return;
  const slides = HE.slides.map(({ bg, ...s }) => ({ ...s, ...(s.image ? {} : { focus: undefined, focusM: undefined }) }));
  const [cur] = (await sbRest("settings?select=data&id=eq.1")) || [];
  const data = { ...(cur?.data || VD.SET), slides: clone(slides), tiles: clone(HE.tiles), slideSeconds: HE.secs };
  const saved = await sbRest("settings?id=eq.1", { method: "PATCH", body: { data }, prefer: "return=representation" });
  if (!saved?.length) throw new Error("Nustatymų įrašo nėra – paleiskite supabase/seed.sql");
  await catalogChanged("Pradžios puslapis išsaugotas");
}
