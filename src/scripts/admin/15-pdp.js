// 15 - Prekių puslapių turinys (v29): natų biblioteka, nuotaikos juosta, tekstai pagal prekės tipą.
//   admin/natos               visos produktuose ir kvapuose naudojamos natos: nuotrauka (iškirpta / numatyta Vaidore /
//                             paveldėta iš pagrindinės natos / nėra), kiek prekių. Nata → „Iškirpti iš produkto nuotraukos“
//                             (bet kuri parduotuvės nuotrauka; kaip iOS „Perkelti ir keisti mastelį“ - tempiant, slankikliu,
//                             dviem pirštais ar pelės ratuku), „Įkelti nuotrauką“ (tada taip pat iškerpama), „Pašalinti“.
//                             Lentelė note_media (migracija 20261122090000), failai - Storage products/natos/….
//   Produkto ir kvapo formose - „Nuotaikos juosta“ (nuotrauka ir dvi eilutės; moodGroupHTML / bindMood),
//   produkte - ir paantraštė (04-products.js, vidinis ekranas „Puslapio turinys“).
//   admin/vitrina/puslapiai   tekstai ir blokai pagal tipą (settings.pdp; išsaugomi tik skirtumai nuo data/pdp.json).
const noteState = { media: null, notes: [], products: [], q: "", f: "visos", cur: "", crop: null };
const NOTE_CROP_PX = 480;

// Nata → nuotrauka: tikslus pavadinimas, kitaip - pagrindinis žodis (kaip parduotuvėje, 28-story.js noteMedia)
function noteResolve(name, map) {
  const key = VD.noteKey(name);
  if (map.has(key)) return { ...map.get(key), exact: true };
  const w = key.split(" ").filter(x => x.length > 2);
  for (const k of [w[w.length - 1], w[0], ...w.slice(1, -1)]) if (k && map.has(k)) return { ...map.get(k), exact: false };
  return null;
}
const noteMap = () =>
  new Map(
    [...VD.NOTE_DEFAULTS.map(n => ({ ...n, own: false })), ...(noteState.media || []).map(n => ({ name: n.name, image: n.image, own: true }))]
      .filter(n => n.name && n.image)
      .map(n => [VD.noteKey(n.name), n])
  );
async function loadNoteData() {
  const [media, products, scents] = await Promise.all([
    sbRest("note_media?select=name,image,updated_at&order=name.asc").catch(() => null),
    sbRest("products?select=id,name,type,images,notes,rank&order=rank.asc"),
    sbRest("scents?select=id,name,notes").catch(() => [])
  ]);
  noteState.media = Array.isArray(media) ? media : null; // null - lentelės dar nėra (migracija nepaleista)
  noteState.products = products || [];
  const all = new Map();
  const add = (raw, pid) => {
    const name = String(raw || "").trim();
    if (!name) return;
    const k = VD.noteKey(name);
    if (!all.has(k)) all.set(k, { name, ids: new Set() });
    if (pid) all.get(k).ids.add(pid);
  };
  for (const p of noteState.products) for (const t of ["top", "heart", "base"]) for (const n of p.notes?.[t] || []) add(n, p.id);
  for (const s of scents || []) for (const t of ["top", "heart", "base"]) for (const n of s.notes?.[t] || []) add(n);
  for (const n of noteState.media || []) add(n.name);
  noteState.notes = [...all.values()].sort((a, b) => b.ids.size - a.ids.size || a.name.localeCompare(b.name, "lt"));
}
const noteThumbHTML = (name, hit, cls = "ntThumb") =>
  `<span class="${cls}">${hit ? `<img src="${esc(hit.image)}" alt="" loading="lazy" />` : `<i>${esc(String(name).trim().charAt(0).toUpperCase())}</i>`}</span>`;
const noteSource = hit => (!hit ? "Be nuotraukos" : !hit.exact ? `Kaip „${hit.name}“` : hit.own ? "Iškirpta" : "Vaidore nuotrauka");

async function renderNotes(main, param, seq) {
  main.innerHTML = pageHTML({
    title: "Natos",
    sub: "Tikri ingredientai iš produktų nuotraukų",
    tools: `${catalogSeg("natos")}${searchHTML("noteQ", "Natos pavadinimas", noteState.q, "Paieška natose")}${segHTML(
      [
        ["visos", "Visos"],
        ["be", "Be nuotraukos"]
      ],
      noteState.f,
      "data-note-f"
    )}`,
    cls: "axNarrow axNotes",
    body: `<div data-pane="main"><div id="noteList">${loading(8)}</div><p class="igFoot">Nuotrauka įkeliama vieną kartą ir rodoma visuose produktuose su ta nata.</p></div>
<div data-pane="note" data-title="Nata" data-focus="no" hidden><div id="noteOne"></div></div>
<div data-pane="pick" data-title="Produkto nuotrauka" data-focus="no" hidden><div id="notePick"></div></div>
<div data-pane="crop" data-title="Iškirpkite ingredientą" data-focus="no" hidden><div id="noteCrop"></div></div>`
  });
  hydrateIcons(main);
  await loadNoteData();
  if (stale(seq)) return;
  const page = $(".axPage", main);
  paintNotes(page);
  $("#noteQ", page).addEventListener("input", e => {
    noteState.q = e.target.value;
    paintNotes(page);
  });
  page.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const f = t?.closest("[data-note-f]");
    if (f) {
      noteState.f = f.dataset.noteF;
      $$("[data-note-f]", page).forEach(b => b.setAttribute("aria-selected", String(b === f)));
      return paintNotes(page);
    }
    const open = t?.closest("[data-note-open]");
    if (open) {
      noteState.cur = open.dataset.noteOpen;
      paintNoteOne(page);
      return pushPane(page, "note");
    }
    if (t?.closest("[data-note-pick]")) {
      paintNotePick(page);
      return pushPane(page, "pick");
    }
    const pick = t?.closest("[data-pick-src]");
    if (pick) return openCrop(page, pick.dataset.pickSrc);
    if (t?.closest("[data-note-rm]")) return removeNoteImage(page);
    if (t?.closest("[data-crop-save]")) return busy(t.closest("[data-crop-save]"), () => saveNoteCrop(page));
    const z = t?.closest("[data-zoom]");
    if (z && noteState.crop) noteState.crop.zoomBy(Number(z.dataset.zoom) > 0 ? 1.25 : 0.8);
  });
  page.addEventListener("change", e => {
    const inp = e.target instanceof Element && e.target.closest("[data-note-file]");
    if (!inp?.files?.[0]) return;
    const file = inp.files[0];
    inp.value = "";
    openCrop(page, URL.createObjectURL(file), { local: true });
  });
}
function paintNotes(page) {
  const box = $("#noteList", page);
  if (!box) return;
  const map = noteMap();
  const q = fold(noteState.q.trim());
  const rows = noteState.notes.map(n => ({ ...n, hit: noteResolve(n.name, map) })).filter(n => (!q || fold(n.name).includes(q)) && (noteState.f !== "be" || !n.hit));
  const warn =
    noteState.media === null
      ? `<div class="ig axWarn"><p>Natų bibliotekos lentelės dar nėra - nuotraukų išsaugoti nepavyks. Supabase paleiskite migraciją 20261122090000_product_page.sql.</p></div>`
      : "";
  box.innerHTML = `${warn}${
    rows.length
      ? `<div class="ig axList">${rows
          .map(
            n =>
              `<button class="axRow axRow2 ntRow" type="button" data-note-open="${esc(n.name)}">${noteThumbHTML(n.name, n.hit)}<span class="axRowTxt"><b>${esc(n.name)}</b><small>${esc(
                [n.ids.size ? plural(n.ids.size, "prekė", "prekės", "prekių") : "Tik kvape", noteSource(n.hit)].join(" · ")
              )}</small></span><span class="axChev">${glyph("chev-right")}</span></button>`
          )
          .join("")}</div>`
      : emptyBox(noteState.q || noteState.f === "be" ? "Nieko nerasta" : "Natų dar nėra", noteState.f === "be" ? "Visos natos turi nuotraukas." : "")
  }`;
}
function paintNoteOne(page) {
  const n = noteState.notes.find(x => x.name === noteState.cur) || { name: noteState.cur, ids: new Set() };
  const hit = noteResolve(n.name, noteMap());
  const own = (noteState.media || []).some(m => VD.noteKey(m.name) === VD.noteKey(n.name));
  $("#noteOne", page).innerHTML = `<div class="ntBig">${noteThumbHTML(n.name, hit, "ntBigArt")}<b>${esc(n.name)}</b><small>${esc(noteSource(hit))}</small></div>
${groupHTML(
  `${navRow({ button: true, attrs: "data-note-pick", ico: "grid", icoBg: "var(--brand)", title: "Iškirpti iš produkto nuotraukos" })}<label class="axRow admUpload"><span class="axIco" style="background:var(--ink2)">${glyph(
    "upload"
  )}</span><span class="axRowTxt"><b>Įkelti nuotrauką</b></span><span class="axChev">${glyph("chev-right")}</span><input type="file" accept="image/*" hidden data-note-file /></label>${
    own ? `<button class="axRow danger" type="button" data-note-rm><span class="axRowTxt"><b>Pašalinti nuotrauką</b></span></button>` : ""
  }`,
  {
    foot: `${n.ids.size ? `Nuotrauka rodoma ${plural(n.ids.size, "prekėje", "prekėse", "prekių")}` : "Nuotrauka bus rodoma"} ir visuose šios natos variantuose (pvz. „Madagaskaro vanilė“ → „Vanilė“).`
  }
)}`;
  hydrateIcons($("#noteOne", page));
}
// Nuotraukos pasirinkimas: pirmiausia - prekių su šia nata (jose ingredientas greičiausiai matomas), tada - kitos
function paintNotePick(page) {
  const k = VD.noteKey(noteState.cur);
  const has = p => ["top", "heart", "base"].some(t => (p.notes?.[t] || []).some(n => VD.noteKey(n) === k));
  const seen = new Set();
  const pics = [[], []];
  for (const p of noteState.products)
    for (const src of p.images || []) {
      if (!src || seen.has(src)) continue;
      seen.add(src);
      pics[has(p) ? 0 : 1].push({ src, p });
    }
  const grid = list => `<div class="ntPicks">${list.map(x => `<button class="ntPick" type="button" data-pick-src="${esc(x.src)}" title="${esc(x.p.name)}"><img src="${esc(x.src)}" alt="${esc(x.p.name)}" loading="lazy" /></button>`).join("")}</div>`;
  $("#notePick", page).innerHTML =
    pics[0].length || pics[1].length
      ? `${pics[0].length ? `<h2 class="igHead">Prekės su šia nata</h2>${grid(pics[0])}` : ""}${pics[1].length ? `<h2 class="igHead">Kitos prekės</h2>${grid(pics[1])}` : ""}`
      : emptyBox("Produktų nuotraukų dar nėra", "Įkelkite nuotraukas produktuose arba pasirinkite „Įkelti nuotrauką“.");
}

// ── Iškirpimas: nuotrauka tempiama ir didinama, apskritimas lieka centre (kaip iOS „Perkelti ir keisti mastelį“) ──
function openCrop(page, src, { local = false } = {}) {
  const box = $("#noteCrop", page);
  box.innerHTML = `<div class="ntCrop" data-crop><img alt="" draggable="false" /><span class="ntMask" aria-hidden="true"></span></div>
<div class="ntZoom"><button class="roundBtn" type="button" data-zoom="-1" aria-label="Mažinti">${glyph("minus")}</button><input type="range" min="1" max="6" step="0.01" value="2.4" aria-label="Mastelis" data-zoom-in /><button class="roundBtn" type="button" data-zoom="1" aria-label="Didinti">${glyph(
    "plus"
  )}</button></div>
<p class="igFoot">Patraukite nuotrauką, kad ingredientas būtų apskritime. Mastelis - slankikliu, dviem pirštais arba pelės ratuku.</p>
<button class="btn primary block" type="button" data-crop-save disabled>Išsaugoti</button>`;
  if ($("[data-pane='crop']", page).hidden) pushPane(page, "crop");
  const stage = $("[data-crop]", box);
  const img = $("img", stage);
  const range = $("[data-zoom-in]", box);
  // Kito domeno nuotrauka (Storage) - su CORS, kad ją būtų galima iškirpti; atskiras adresas, kad nebūtų naudojama talpykla be CORS
  const sameOrigin = local || new URL(src, location.href).origin === location.origin;
  if (!sameOrigin) img.crossOrigin = "anonymous";
  const c = { img, src, local, W: 0, H: 0, C: 0, z: 2.4, s: 1, tx: 0, ty: 0 };
  noteState.crop = c;
  const base = () => c.C / Math.min(c.W, c.H);
  const clamp = () => {
    c.s = base() * c.z;
    c.tx = Math.min(0, Math.max(c.C - c.W * c.s, c.tx));
    c.ty = Math.min(0, Math.max(c.C - c.H * c.s, c.ty));
  };
  const apply = () => {
    clamp();
    img.style.transform = `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`;
    range.value = String(c.z);
  };
  // Mastelis aplink tašką (px, py) - tas nuotraukos taškas lieka po pirštu / pele
  const zoomAt = (z, px = c.C / 2, py = c.C / 2) => {
    const ix = (px - c.tx) / c.s;
    const iy = (py - c.ty) / c.s;
    c.z = Math.min(6, Math.max(1, z));
    c.s = base() * c.z;
    c.tx = px - ix * c.s;
    c.ty = py - iy * c.s;
    apply();
  };
  c.zoomBy = k => zoomAt(c.z * k);
  const layout = () => {
    const C = stage.clientWidth;
    if (!C || !c.W) return;
    const k = c.C ? C / c.C : 1;
    c.C = C;
    c.tx *= k;
    c.ty *= k;
    apply();
  };
  img.onload = () => {
    c.W = img.naturalWidth;
    c.H = img.naturalHeight;
    img.style.width = `${c.W}px`;
    img.style.height = `${c.H}px`;
    c.C = stage.clientWidth;
    c.s = base() * c.z;
    // Pradžioje - apatinė vidurio dalis (ingredientai produktų nuotraukose dažniausiai apačioje)
    c.tx = c.C / 2 - c.W * c.s * 0.5;
    c.ty = c.C / 2 - c.H * c.s * 0.74;
    apply();
    $("[data-crop-save]", box).disabled = false;
  };
  img.onerror = () => toast("Nuotraukos atidaryti nepavyko", { icon: "info" });
  img.src = local || sameOrigin ? src : `${src}${src.includes("?") ? "&" : "?"}vdcrop=1`;
  range.addEventListener("input", () => zoomAt(Number(range.value)));
  // Tempimas ir suėmimas dviem pirštais (pointer events)
  const pts = new Map();
  let start = null;
  const local2 = e => {
    const r = stage.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  stage.addEventListener("pointerdown", e => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, local2(e));
    start = { tx: c.tx, ty: c.ty, z: c.z, pts: new Map(pts) };
  });
  stage.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId) || !start) return;
    pts.set(e.pointerId, local2(e));
    const now = [...pts.values()];
    const was = [...start.pts.values()];
    if (now.length >= 2 && was.length >= 2) {
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const mid = [(now[0][0] + now[1][0]) / 2, (now[0][1] + now[1][1]) / 2];
      c.tx = start.tx;
      c.ty = start.ty;
      c.z = start.z;
      c.s = base() * c.z;
      zoomAt(start.z * (d(now[0], now[1]) / Math.max(1, d(was[0], was[1]))), mid[0], mid[1]);
    } else if (now.length === 1) {
      const p0 = start.pts.get(e.pointerId) || now[0];
      c.tx = start.tx + now[0][0] - p0[0];
      c.ty = start.ty + now[0][1] - p0[1];
      apply();
    }
  });
  const up = e => {
    pts.delete(e.pointerId);
    start = pts.size ? { tx: c.tx, ty: c.ty, z: c.z, pts: new Map(pts) } : null;
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const [px, py] = local2(e);
      zoomAt(c.z * Math.exp(-e.deltaY * 0.0015), px, py);
    },
    { passive: false }
  );
  stage.addEventListener("keydown", e => {
    const step = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] }[e.key];
    if (step) {
      e.preventDefault();
      c.tx += step[0];
      c.ty += step[1];
      apply();
    } else if (e.key === "+" || e.key === "=") c.zoomBy(1.25);
    else if (e.key === "-") c.zoomBy(0.8);
  });
  stage.tabIndex = 0;
  stage.setAttribute("aria-label", "Iškirpimo sritis: rodyklėmis perkelti, + ir - keisti mastelį");
  new ResizeObserver(layout).observe(stage);
}
async function saveNoteCrop(page) {
  const c = noteState.crop;
  const name = noteState.cur;
  if (!c?.W || !name) return;
  const cv = document.createElement("canvas");
  cv.width = cv.height = NOTE_CROP_PX;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, NOTE_CROP_PX, NOTE_CROP_PX);
  const side = c.C / c.s;
  ctx.drawImage(c.img, -c.tx / c.s, -c.ty / c.s, side, side, 0, 0, NOTE_CROP_PX, NOTE_CROP_PX);
  let blob;
  try {
    blob = await new Promise((res, rej) => {
      try {
        cv.toBlob(res, "image/webp", 0.86);
      } catch (err) {
        rej(err);
      }
    });
    if (!blob || blob.type !== "image/webp") blob = await new Promise(res => cv.toBlob(res, "image/jpeg", 0.88));
  } catch {
    return toast("Šios nuotraukos iškirpti nepavyko - atsisiųskite ją ir pasirinkite „Įkelti nuotrauką“", { icon: "info", ms: 6000 });
  }
  const url = await sbUpload("products", `natos/${slugify(name) || "nata"}-${Date.now().toString(36)}.${blob.type === "image/webp" ? "webp" : "jpg"}`, blob);
  const [row] = (await sbRest("note_media?on_conflict=name", { method: "POST", body: { name, image: url }, prefer: "resolution=merge-duplicates,return=representation" })) || [{ name, image: url }];
  noteState.media = [...(noteState.media || []).filter(m => VD.noteKey(m.name) !== VD.noteKey(name)), row];
  if (c.local) URL.revokeObjectURL(c.src);
  noteState.crop = null;
  while ($("[data-pane='note']", page).hidden && page._panes?.length) popPane(page);
  paintNoteOne(page);
  paintNotes(page);
  await catalogChanged(`Natos „${name}“ nuotrauka išsaugota`);
}
async function removeNoteImage(page) {
  const name = noteState.cur;
  const ok = await askConfirm(`„${name}“ nuotrauka bus pašalinta iš natų bibliotekos.`, { title: "Pašalinti nuotrauką?", ok: "Pašalinti", danger: true });
  if (!ok) return;
  try {
    for (const m of (noteState.media || []).filter(m => VD.noteKey(m.name) === VD.noteKey(name))) await sbRest(`note_media?name=eq.${encodeURIComponent(m.name)}`, { method: "DELETE" });
    noteState.media = (noteState.media || []).filter(m => VD.noteKey(m.name) !== VD.noteKey(name));
    paintNoteOne(page);
    paintNotes(page);
    await catalogChanged("Nuotrauka pašalinta");
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}

// ── Nuotaikos juosta (produkto ir kvapo formose) ──
// ed.mood = { image, title, line }; nuotrauka - plati (interjeras, ingredientai), kelias products/nuotaika/<id>-…
function moodGroupHTML(ed, { scent = false, cls = "" } = {}) {
  return `<div class="${cls}" data-mood-group><h2 class="igHead">Nuotaikos juosta</h2><div class="ig"><div data-mood-pic>${moodPicHTML(ed.mood.image)}</div>${fieldHTML(
    "Šūkis",
    `<input name="mood_title" maxlength="60" value="${esc(ed.mood.title)}" placeholder="Šiltas vakaras namuose" />`
  )}${fieldHTML("Antra eilutė", `<input name="mood_line" maxlength="90" value="${esc(ed.mood.line)}" placeholder="Kvapas, kuris sukuria jaukumą" />`)}</div><p class="igFoot">${
    scent
      ? "Plati nuotrauka - interjeras ar produktai su ingredientais. Rodoma visų šio kvapo produktų puslapiuose; be jos - to paties kvapo produktų nuotraukos."
      : "Tuščia - naudojama kvapo nuotaikos juosta (Katalogas → Kvapai)."
  }</p></div>`;
}
const moodPicHTML = src =>
  `${src ? `<div class="axMoodPrev"><img src="${esc(src)}" alt="Nuotaikos nuotrauka" /><button class="axInspRm" type="button" data-mood-rm>Pašalinti</button></div>` : ""}<label class="axRow admUpload">${glyph(
    "upload"
  )}<span class="axRowTxt"><b class="axLink">${src ? "Pakeisti nuotrauką" : "Įkelti nuotrauką"}</b></span><input type="file" accept="image/*" hidden data-mood-img /></label>`;
function bindMood(form, ed, prefix) {
  const paint = () => {
    const box = $("[data-mood-pic]", form);
    if (!box) return;
    box.innerHTML = moodPicHTML(ed.mood.image);
    hydrateIcons(box);
  };
  form.addEventListener("change", async e => {
    const inp = e.target instanceof Element && e.target.closest("[data-mood-img]");
    if (!inp?.files?.[0]) return;
    const file = inp.files[0];
    inp.value = "";
    const lab = inp.closest("label");
    lab.classList.add("loading");
    try {
      const [url] = await uploadImages([file], `nuotaika/${prefix() || "be-id"}`, 2000);
      ed.mood.image = url;
      A.dirty = true;
      paint();
    } catch (err) {
      toast(errText(err), { icon: "info", ms: 4200 });
    } finally {
      lab.classList.remove("loading");
    }
  });
  form.addEventListener("click", e => {
    if (!(e.target instanceof Element && e.target.closest("[data-mood-rm]"))) return;
    ed.mood.image = "";
    A.dirty = true;
    paint();
  });
}
const readMood = (form, ed) => ({ mood_image: ed.mood.image, mood_title: form.elements.mood_title.value.trim(), mood_line: form.elements.mood_line.value.trim() });

// ── Vitrina → Prekių puslapiai: tekstai ir blokai pagal tipą (settings.pdp) ──
const PDP_BLOCKS = [
  ["notes", "Natos"],
  ["traits", "Kvapo charakteris"],
  ["mood", "Nuotaikos juosta"],
  ["steps", "Žingsniai"],
  ["where", "Piktogramos"],
  ["sample", "Mėginuko kortelė"],
  ["note", "Pastaba"]
];
const PDP_STEP_SLOTS = 4;
const PDP_WHERE_SLOTS = 6;
async function renderPdpEditor(main, seq, back) {
  main.innerHTML = pageHTML({ title: "Prekių puslapiai", back, body: loading(5) });
  const [rows] = await Promise.all([sbRest("settings?select=data&id=eq.1")]);
  if (stale(seq)) return;
  const saved = rows?.[0]?.data?.pdp || {};
  const types = VD.TYPES.filter(t => VD.PDP_DEF[t.id]);
  const cfgOf = t => {
    const d = VD.PDP_DEF[t] || {};
    const o = saved[t] || {};
    const out = { ...d, ...o };
    for (const k of Object.keys(d)) if (d[k] && typeof d[k] === "object") out[k] = { ...d[k], ...(o[k] || {}) };
    return out;
  };
  const icoOpts = cur => Object.entries(VD.STORY_ICO_NAMES).map(([k, n]) => `<option value="${k}"${sel(k === cur)}>${esc(n)}</option>`).join("");
  const sw = (name, on, label) => `<label class="axField axSwitchRow"><span>${esc(label)}</span><input type="checkbox" name="${name}" class="admSwitchInp"${attr(on !== false, "checked")} /></label>`;
  const paneHTML = t => {
    const c = cfgOf(t.id);
    const n = `p.${t.id}`;
    const has = k => k in (VD.PDP_DEF[t.id] || {});
    const perf = t.id === "kvepalai";
    const steps = [...(c.steps?.items || [])];
    const where = [...(c.where?.items || [])];
    const first = VD.CAT.products.find(p => (p.type || "kvepalai") === t.id && p.visible !== false);
    return `<div data-pane="t-${t.id}" data-title="${esc(t.name)}" data-focus="no" hidden data-pdp-type="${t.id}">
${groupHTML(fieldHTML("Paantraštė", `<input name="${n}.sub" maxlength="80" value="${esc(c.sub || "")}" placeholder="${esc(perf ? "Eau de Parfum · Unisex (pagal prekę)" : t.one)}" />`), {
      head: "Po pavadinimu",
      foot: "Produkte galima įrašyti savą (Produktai → Puslapio turinys)."
    })}
${has("notes") && t.scented ? groupHTML(`${sw(`${n}.notes.on`, c.notes.on, "Rodyti natas")}${fieldHTML("Antraštė", `<input name="${n}.notes.title" maxlength="40" value="${esc(c.notes.title || "")}" />`)}`, { head: "Natos" }) : ""}
${has("traits") ? groupHTML(`${sw(`${n}.traits.on`, c.traits.on, "Rodyti")}${fieldHTML("Antraštė", `<input name="${n}.traits.title" maxlength="40" value="${esc(c.traits.title || "")}" />`)}`, { head: "Kvapo charakteris", foot: "Ilgaamžiškumas ir sklaida - tik kai nustatyti kvape." }) : ""}
${has("mood") && t.scented ? groupHTML(sw(`${n}.mood.on`, c.mood.on, "Rodyti"), { head: "Nuotaikos juosta", foot: "Nuotrauka - kvape arba produkte; be jos - to paties kvapo produktų nuotraukos." }) : ""}
${groupHTML(
  `${sw(`${n}.steps.on`, c.steps?.on, "Rodyti")}${fieldHTML("Antraštė", `<input name="${n}.steps.title" maxlength="50" value="${esc(c.steps?.title || "")}" placeholder="Kaip naudoti" />`)}${Array.from({ length: PDP_STEP_SLOTS }, (_, i) => {
    const s = steps[i] || {};
    return `<div class="pdpSlot"><span class="pdpIco" data-ico-prev>${VD.storyIco(s.ico || "info")}</span><div class="pdpSlotIn"><select name="${n}.steps.${i}.ico" aria-label="${i + 1} žingsnio piktograma">${icoOpts(s.ico || "info")}</select><input name="${n}.steps.${i}.title" maxlength="40" value="${esc(s.title || "")}" placeholder="${i + 1} žingsnis" aria-label="${i + 1} žingsnio pavadinimas" /><textarea name="${n}.steps.${i}.text" rows="2" maxlength="160" placeholder="Trumpas paaiškinimas" aria-label="${i + 1} žingsnio tekstas">${esc(s.text || "")}</textarea></div></div>`;
  }).join("")}`,
  { head: "Žingsniai", foot: "Tuščias žingsnis nerodomas." }
)}
${groupHTML(
  `${sw(`${n}.where.on`, c.where?.on, "Rodyti")}${fieldHTML("Antraštė", `<input name="${n}.where.title" maxlength="40" value="${esc(c.where?.title || "")}" placeholder="Kur naudoti" />`)}${fieldHTML(
    "Tekstas",
    `<textarea name="${n}.where.text" rows="2" maxlength="200">${esc(c.where?.text || "")}</textarea>`,
    { stack: true }
  )}${Array.from({ length: PDP_WHERE_SLOTS }, (_, i) => {
    const w = where[i] || {};
    return `<div class="pdpSlot"><span class="pdpIco" data-ico-prev>${VD.storyIco(w.ico || "sofa")}</span><div class="pdpSlotIn row"><select name="${n}.where.${i}.ico" aria-label="${i + 1} piktograma">${icoOpts(w.ico || "sofa")}</select><input name="${n}.where.${i}.label" maxlength="30" value="${esc(w.label || "")}" placeholder="Užrašas" aria-label="${i + 1} užrašas" /></div></div>`;
  }).join("")}`,
  { head: "Piktogramos", foot: "Pvz. „Kur purkšti“, „Kur pastatyti“. Be užrašo - nerodoma." }
)}
${has("sample") ? groupHTML(sw(`${n}.sample.on`, c.sample.on, "Rodyti"), { head: "Mėginuko kortelė", foot: "„Išbandykite 2 ml mėginuką“ - kvepalams su mėginuku." }) : ""}
${groupHTML(
  `${sw(`${n}.note.on`, c.note?.on, "Rodyti")}${fieldHTML("Paryškinta pradžia", `<input name="${n}.note.title" maxlength="30" value="${esc(c.note?.title || "")}" placeholder="Priežiūra" />`)}${fieldHTML(
    "Tekstas",
    `<textarea name="${n}.note.text" rows="3" maxlength="300">${esc(c.note?.text || "")}</textarea>`,
    { stack: true }
  )}`,
  { head: "Pastaba" }
)}
${groupHTML(
  `${first ? navRow({ href: `${VD.productUrl(first)}`, title: "Peržiūrėti parduotuvėje", sub: esc(first.name), ext: true }) : ""}<button class="axRow danger" type="button" data-pdp-reset="${t.id}"><span class="axRowTxt"><b>Atkurti numatytuosius</b></span></button>`
)}
</div>`;
  };
  const sumOf = t => {
    const c = cfgOf(t.id);
    const on = PDP_BLOCKS.filter(([k]) => k in c && c[k]?.on !== false && (k !== "notes" && k !== "mood" ? true : t.scented)).length;
    return `${on} blokai${saved[t.id] && Object.keys(saved[t.id]).length ? " · pakeista" : ""}`;
  };
  main.innerHTML = pageHTML({
    title: "Prekių puslapiai",
    sub: "Tekstai ir blokai pagal kategoriją",
    back,
    actions: saveBtn({ form: "pdpForm" }),
    cls: "axNarrow",
    body: `<form class="admForm" id="pdpForm" novalidate><div data-pane="main">${groupHTML(
      types.map(t => `<button class="axRow" type="button" data-push="t-${t.id}"><span class="axRowTxt"><b>${esc(t.name)}</b></span><span class="axVal" data-pdp-sum="${t.id}">${esc(sumOf(t))}</span><span class="axChev">${glyph("chev-right")}</span></button>`).join(""),
      { head: "Kategorijos", foot: "Kiekviena kategorija - savo blokai: natos, žingsniai, piktogramos, pastaba. Rodomi tik turintys duomenų." }
    )}</div>${types.map(paneHTML).join("")}</form>`
  });
  hydrateIcons(main);
  const form = $("#pdpForm", main);
  const page = form.closest(".axPage");
  form.addEventListener("input", () => (A.dirty = true));
  form.addEventListener("change", e => {
    A.dirty = true;
    const s = e.target instanceof Element && e.target.closest("select[name$='.ico']");
    if (s) $("[data-ico-prev]", s.closest(".pdpSlot")).innerHTML = VD.storyIco(s.value);
  });
  form.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const reset = t?.closest("[data-pdp-reset]");
    if (reset) {
      const type = types.find(x => x.id === reset.dataset.pdpReset);
      delete saved[type.id];
      const pane = $(`[data-pane="t-${type.id}"]`, form);
      const fresh = document.createElement("div");
      fresh.innerHTML = paneHTML(type);
      const np = fresh.firstElementChild;
      np.hidden = false;
      pane.replaceWith(np);
      hydrateIcons(np);
      A.dirty = true;
      toast("Atkurti numatytieji - neužmirškite išsaugoti", { icon: "check" });
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($('.axSave[form="pdpForm"]', main), async () => {
      const next = {};
      for (const t of types) {
        const diff = pdpDiff(t.id, readPdpType(form, t.id));
        if (Object.keys(diff).length) next[t.id] = diff;
      }
      await saveSettingsPatch({ pdp: next });
      for (const k of Object.keys(saved)) delete saved[k];
      Object.assign(saved, structuredClone(next));
      types.forEach(t => ($(`[data-pdp-sum="${t.id}"]`, form).textContent = sumOf(t)));
      await catalogChanged("Prekių puslapiai išsaugoti");
    });
  });
}
// Formos reikšmės → tipo nustatymai (raktų tvarka - kaip numatytuosiuose, kad palyginimas būtų tikslus)
function readPdpType(form, type) {
  const d = VD.PDP_DEF[type] || {};
  const v = name => form.elements[`p.${type}.${name}`];
  const val = name => (v(name)?.value ?? "").trim();
  const on = name => !!v(name)?.checked;
  const out = { ...structuredClone(d) };
  out.sub = val("sub");
  for (const k of ["notes", "traits", "mood", "sample"]) if (k in d && v(`${k}.on`)) out[k] = { ...d[k], on: on(`${k}.on`), ...("title" in d[k] ? { title: val(`${k}.title`) } : {}) };
  if ("steps" in d)
    out.steps = {
      ...d.steps,
      on: on("steps.on"),
      title: val("steps.title"),
      items: Array.from({ length: PDP_STEP_SLOTS }, (_, i) => ({ ico: val(`steps.${i}.ico`), title: val(`steps.${i}.title`), text: val(`steps.${i}.text`) })).filter(x => x.title || x.text)
    };
  if ("where" in d)
    out.where = {
      ...d.where,
      on: on("where.on"),
      title: val("where.title"),
      text: val("where.text"),
      items: Array.from({ length: PDP_WHERE_SLOTS }, (_, i) => ({ ico: val(`where.${i}.ico`), label: val(`where.${i}.label`) })).filter(x => x.label)
    };
  if ("note" in d) out.note = { ...d.note, on: on("note.on"), title: val("note.title"), text: val("note.text") };
  return out;
}
// Išsaugomi tik skirtumai nuo numatytųjų (data/pdp.json) - vėliau pakeisti numatytieji pasieks ir šią parduotuvę
function pdpDiff(type, cfg) {
  const d = VD.PDP_DEF[type] || {};
  const out = {};
  if ((cfg.sub || "") !== (d.sub || "")) out.sub = cfg.sub;
  for (const k of Object.keys(d)) if (k !== "sub" && JSON.stringify(cfg[k]) !== JSON.stringify(d[k])) out[k] = cfg[k];
  return out;
}
