// 04 – Kvapai: sąrašas (paieška, filtras, greitas likučio keitimas, rodyti / slėpti) ir redagavimo puslapis
// admin/kvapai/<id> (admin/kvapai/naujas – naujas kvapas): pagrindinė informacija, natos ir savybės, tūriai ir kainos,
// likutis, išvaizda (buteliuko spalvos ir forma – su peržiūra), nuotraukos (Supabase Storage, WebP), kategorijos, rodymas.
// id – adresas kvepalai/<id>; sukūrus nebekeičiamas (gali būti pirkėjų krepšeliuose ir nuorodose).
const PROD_FILTERS = [
  ["visi", "Visi", () => true],
  ["matomi", "Matomi", p => p.visible !== false],
  ["paslepti", "Paslėpti", p => p.visible === false],
  ["isparduoti", "Išparduoti", p => p.stock === 0]
];
const prodState = { filter: "visi", q: "", rows: [] };
const SEASONS = ["pavasaris", "vasara", "ruduo", "žiema"];
const TIMES = [
  ["diena", "Diena"],
  ["vakaras", "Vakaras"]
];
const CAPS = [
  ["gold", "Auksinis"],
  ["black", "Juodas"],
  ["silver", "Sidabrinis"],
  ["wood", "Medinis"]
];
const SHAPES = [
  ["rect", "Stačiakampis"],
  ["tall", "Aukštas"],
  ["round", "Apvalus"],
  ["square", "Kvadratinis"]
];
const BADGES = ["", "Populiaru", "Naujiena", "Riboto leidimo"];

async function renderProducts(main, param, seq) {
  if (param) return renderProductEdit(main, param, seq);
  main.innerHTML = pageHead("Kvapai") + loading();
  prodState.rows = (await sbRest("products?select=*&order=rank.asc,name.asc")) || [];
  if (stale(seq)) return;
  main.innerHTML = `${pageHead("Kvapai", plural(prodState.rows.length, "kvapas", "kvapai", "kvapų"), `<a class="btn primary small" href="admin/kvapai/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`)}
<div class="admToolbar"><div class="seg admSeg" role="tablist">${PROD_FILTERS.map(
    ([id, name, fn]) => `<button role="tab" type="button" data-pf="${id}" aria-selected="${prodState.filter === id}">${name} <small>${prodState.rows.filter(fn).length}</small></button>`
  ).join("")}</div>
<label class="search admSearch"><span data-glyph="search" aria-hidden="true"></span><input type="search" id="prodQ" placeholder="Pavadinimas, nata, šeima" value="${esc(prodState.q)}" aria-label="Paieška kvapuose" /></label></div>
<p class="admNote">Likutis: tuščias laukas – neskaičiuojamas (visada galima pirkti), 0 – „Laikinai išparduota“ ir „Pranešti, kai bus“.</p>
<div id="prodList"></div>`;
  hydrateIcons(main);
  paintProducts();
  $("#prodQ").addEventListener("input", e => {
    prodState.q = e.target.value;
    paintProducts();
  });
  main.addEventListener("click", productsClick);
  main.addEventListener("change", productsChange);
}
function paintProducts() {
  const box = $("#prodList");
  if (!box) return;
  $$("[data-pf]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.pf === prodState.filter)));
  const fn = PROD_FILTERS.find(f => f[0] === prodState.filter)[2];
  const q = fold(prodState.q.trim());
  const fam = id => VD.CAT.families.find(f => f.id === id)?.name || id;
  const rows = prodState.rows.filter(
    p => fn(p) && (!q || fold([p.name, p.id, p.inspired || "", p.tagline, fam(p.family), ...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || [])].join(" ")).includes(q))
  );
  if (!rows.length) {
    box.innerHTML = emptyBox(prodState.q ? "Nieko nerasta" : "Kvapų nėra", "", `<a class="btn primary" href="admin/kvapai/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`);
    return hydrateIcons(box);
  }
  box.innerHTML = `<div class="admTable" role="table" aria-label="Kvapai">
<div class="admTr admTh" role="row"><span role="columnheader">Kvapas</span><span role="columnheader">Kaina</span><span role="columnheader">Likutis</span><span role="columnheader">Rodomas</span><span></span></div>
${rows
  .map(p => {
    const prices = (p.sizes || []).map(s => Number(s.price));
    return `<div class="admTr${p.visible === false ? " off" : ""}" role="row" data-pid="${esc(p.id)}">
<a class="admProd" href="admin/kvapai/${esc(p.id)}" data-nav role="cell"><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span><b>${esc(p.name)}</b><small>${esc(VD.GENDER_NAME[p.gender] || "")} · ${esc(fam(p.family))} · ${esc(p.conc)}${
      p.badge ? ` · ${esc(p.badge)}` : ""
    }</small></span></a>
<span role="cell" class="money admPrice">${prices.length ? `${eur(Math.min(...prices))}${prices.length > 1 ? `–${eur(Math.max(...prices))}` : ""}` : "—"}</span>
<span role="cell"><input class="admStock" type="number" inputmode="numeric" min="0" step="1" value="${p.stock ?? ""}" placeholder="∞" aria-label="${esc(p.name)} likutis" data-stock /></span>
<span role="cell"><button class="admSwitch" type="button" role="switch" aria-checked="${p.visible !== false}" aria-label="${esc(p.name)} rodomas parduotuvėje" data-visible></button></span>
<a class="roundBtn admEditBtn" role="cell" href="admin/kvapai/${esc(p.id)}" data-nav aria-label="Redaguoti ${esc(p.name)}">${glyph("edit")}</a>
</div>`;
  })
  .join("")}</div>`;
  hydrateIcons(box);
}
async function patchProduct(id, patch) {
  const [row] = (await sbRest(`products?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
  if (!row) throw new Error("Kvapas nerastas arba neturite teisių");
  const i = prodState.rows.findIndex(p => p.id === id);
  if (i >= 0) prodState.rows[i] = row;
  return row;
}
function productsClick(e) {
  const t = e.target instanceof Element ? e.target : null;
  const f = t?.closest("[data-pf]");
  if (f) {
    prodState.filter = f.dataset.pf;
    return paintProducts();
  }
  const v = t?.closest("[data-visible]");
  if (v) {
    const id = v.closest("[data-pid]").dataset.pid;
    const on = v.getAttribute("aria-checked") !== "true";
    busy(v, async () => {
      await patchProduct(id, { visible: on });
      paintProducts();
      catalogChanged(on ? "Kvapas rodomas" : "Kvapas paslėptas");
    });
  }
}
function productsChange(e) {
  const inp = e.target instanceof Element && e.target.closest("[data-stock]");
  if (!inp) return;
  const id = inp.closest("[data-pid]").dataset.pid;
  const raw = inp.value.trim();
  const stock = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
  if (raw !== "" && !Number.isFinite(stock)) return toast("Likutis – sveikas skaičius", { icon: "info" });
  const before = prodState.rows.find(p => p.id === id)?.stock;
  inp.disabled = true;
  patchProduct(id, { stock })
    .then(row => {
      inp.value = row.stock ?? "";
      catalogChanged(stock === 0 ? "Pažymėta: išparduota" : "Likutis išsaugotas");
      // Vėl turime – pasiūlome pranešti laukiantiems
      if (before === 0 && stock !== 0) offerRestockNotify(row);
    })
    .catch(err => {
      inp.value = before ?? "";
      toast(errText(err), { icon: "info" });
    })
    .finally(() => (inp.disabled = false));
}
async function offerRestockNotify(p) {
  const waiting = await sbRest(`restock_requests?select=id&product_id=eq.${encodeURIComponent(p.id)}&notified=eq.false`).catch(() => []);
  if (!waiting?.length) return;
  toast(`${p.name}: laukia ${plural(waiting.length, "pirkėjas", "pirkėjai", "pirkėjų")}`, {
    icon: "bell",
    action: "Pranešti",
    ms: 8000,
    onAction: () => notifyRestock(p.id).catch(err => toast(errText(err), { icon: "info" }))
  });
}

// ── Redagavimas ───────────────────────────────────────
const blankProduct = () => ({
  id: "",
  name: "",
  inspired: "",
  conc: "EDP",
  gender: "unisex",
  family: VD.CAT.families[0]?.id || "",
  tagline: "",
  description: "",
  ingredients: "",
  notes: { top: [], heart: [], base: [] },
  longevity: 3,
  sillage: 3,
  seasons: [],
  times: ["diena"],
  sizes: [
    { ml: 30, price: 0 },
    { ml: 50, price: 0 }
  ],
  sample: 4.9,
  look: { liquid: "#E8D9C4", tint: "#F7F1E8", cap: "gold", shape: "rect" },
  badge: "Naujiena",
  rank: 100,
  added: new Date().toISOString().slice(0, 10),
  stock: null,
  images: [],
  visible: true
});
async function renderProductEdit(main, id, seq) {
  const isNew = id === "naujas";
  main.innerHTML = pageHead(isNew ? "Naujas kvapas" : "Kvapas") + loading();
  const [rows, fams, cats, links] = await Promise.all([
    // Naujam kvapui laukai „Įkvėpta“ ir „Ingredientai“ rodomi tik jei duomenų bazėje jau yra stulpeliai inspired
    // (migracija 0300) ir ingredients (20261117000000)
    isNew
      ? sbRest("products?select=*&limit=1").then(r => {
          const b = blankProduct();
          if (r?.[0] && !("inspired" in r[0])) delete b.inspired;
          if (r?.[0] && !("ingredients" in r[0])) delete b.ingredients;
          return [b];
        })
      : sbRest(`products?select=*&id=eq.${encodeURIComponent(id)}`),
    sbRest("families?select=*&order=sort.asc"),
    sbRest("categories?select=*&order=sort.asc"),
    isNew ? Promise.resolve([]) : sbRest(`product_categories?select=category_id&product_id=eq.${encodeURIComponent(id)}`)
  ]);
  if (stale(seq)) return;
  const p = rows?.[0];
  if (!p) {
    main.innerHTML = pageHead("Kvapas nerastas") + emptyBox("Tokio kvapo nėra", "Galbūt jis ištrintas.", `<a class="btn primary" href="admin/kvapai" data-nav>Visi kvapai</a>`);
    return;
  }
  const ed = { p: structuredClone(p), isNew, cats: new Set(links.map(l => l.category_id)), images: [...(p.images || [])] };
  const n = p.notes || {};
  const check = (name, value, on, label) => `<label class="admCheck"><input type="checkbox" name="${name}" value="${esc(value)}"${attr(on, "checked")} /><span>${esc(label)}</span></label>`;
  const opt = (v, label, cur) => `<option value="${esc(v)}"${sel(String(cur) === String(v))}>${esc(label)}</option>`;
  const levels = cur => [1, 2, 3, 4, 5].map(i => opt(i, `${i} – ${VD.LEVEL[i]}`, cur)).join("");
  const lasts = cur => [1, 2, 3, 4, 5].map(i => opt(i, `${i} – ${VD.LASTS[i]}`, cur)).join("");
  main.innerHTML = `<nav class="crumbs admCrumbs"><a href="admin/kvapai" data-nav>${glyph("chev-left")}Kvapai</a></nav>
${pageHead(isNew ? "Naujas kvapas" : p.name, isNew ? "Užpildykite ir išsaugokite – kvapas iškart atsiras parduotuvėje." : `vaidore.com/kvepalai/${esc(p.id)}`, isNew ? "" : `<a class="btn ghost small" href="kvepalai/${esc(p.id)}" target="_blank" rel="noopener">${glyph("eye")}Peržiūrėti</a>`)}
<form class="admEdit admForm" id="prodForm" novalidate>
<div class="admEditCols"><div class="admEditMain">
<section class="admCard"><h2>Pagrindinė informacija</h2>
<label class="field"><span>Pavadinimas</span><input name="name" required maxlength="60" value="${esc(p.name)}" /><small>Užrašomas ir ant buteliuko etiketės, pvz. VANOR</small></label>
${"inspired" in p ? `<label class="field"><span>Įkvėpta</span><input name="inspired" maxlength="120" value="${esc(p.inspired || "")}" placeholder="pvz. Tom Ford – Tobacco Vanille" /><small>Prekės ženklas – kvapas. Rodoma „Įkvėpti …“ kortelėse ir kvapo puslapyje</small></label>` : ""}
<label class="field"><span>Adresas (id)</span><input name="id" required maxlength="60" pattern="[a-z0-9-]+" value="${esc(p.id)}"${attr(!isNew, "readonly")} /><small>${
    isNew ? "Mažosios raidės, skaičiai ir „-“. Sukūrus nebekeičiamas." : "Nebekeičiamas – gali būti pirkėjų krepšeliuose ir nuorodose."
  }</small></label>
<div class="fieldRow3"><label class="field"><span>Kam</span><select name="gender">${Object.entries(VD.GENDER_NAME)
    .map(([v, l]) => opt(v, l, p.gender))
    .join("")}</select></label>
<label class="field"><span>Koncentracija</span><select name="conc">${Object.entries(VD.CONC_NAME)
    .map(([v, l]) => opt(v, l, p.conc))
    .join("")}</select></label>
<label class="field"><span>Kvapo šeima</span><select name="family">${fams.map(f => opt(f.id, f.name, p.family)).join("")}</select></label></div>
<label class="field"><span>Trumpas aprašymas</span><input name="tagline" maxlength="90" value="${esc(p.tagline)}" placeholder="pvz. Ryto gaiva ant baltųjų rožių" /><small>Rodomas kortelėje ir paieškoje</small></label>
<label class="field"><span>Aprašymas</span><textarea name="description" rows="5" maxlength="1500">${esc(p.description)}</textarea></label>${
  "ingredients" in p
    ? `
<label class="field"><span>Ingredientai (INCI)</span><textarea name="ingredients" rows="3" maxlength="1500" placeholder="pvz. Alcohol Denat., Parfum, Aqua, Linalool, Limonene">${esc(p.ingredients || "")}</textarea><small>Kaip ant pakuotės. Rodoma kvapo puslapyje skiltyje „Ingredientai“; tuščia – skiltis nerodoma</small></label>`
    : ""
}
</section>
<section class="admCard"><h2>Natos ir savybės</h2>
<label class="field"><span>Viršutinės natos</span><input name="top" value="${esc((n.top || []).join(", "))}" placeholder="Bergamotė, Kriaušė" /><small>Atskirkite kableliais</small></label>
<label class="field"><span>Širdies natos</span><input name="heart" value="${esc((n.heart || []).join(", "))}" placeholder="Rožė, Jazminas" /></label>
<label class="field"><span>Bazinės natos</span><input name="base" value="${esc((n.base || []).join(", "))}" placeholder="Muskusas, Kedras" /></label>
<div class="fieldRow"><label class="field"><span>Ilgaamžiškumas</span><select name="longevity">${lasts(p.longevity)}</select></label>
<label class="field"><span>Sklaida</span><select name="sillage">${levels(p.sillage)}</select></label></div>
<div class="admChecks"><span>Metų laikai</span>${SEASONS.map(s => check("seasons", s, (p.seasons || []).includes(s), VD.SEASON_NAME[s])).join("")}</div>
<div class="admChecks"><span>Paros metas</span>${TIMES.map(([v, l]) => check("times", v, (p.times || []).includes(v), l)).join("")}</div>
</section>
<section class="admCard"><h2>Tūriai, kainos ir likutis</h2>
<div class="admSizes" id="sizesBox"></div>
<p class="admNote">„Sena kaina“ – tik akcijai: parduotuvėje ji perbraukiama, o kaina rodoma raudonai. Įrašykite tikrą mažiausią
kainą per paskutines 30 dienų (Omnibus direktyva); be akcijos palikite tuščią.</p>
<button class="btn ghost small" type="button" data-size-add>${glyph("plus")}Pridėti tūrį</button>
<div class="fieldRow" style="margin-top:16px"><label class="field"><span>Mėginukas 2 ml, €</span><input name="sample" inputmode="decimal" value="${esc(dec(p.sample))}" /></label>
<label class="field"><span>Likutis, vnt.</span><input name="stock" type="number" inputmode="numeric" min="0" step="1" value="${p.stock ?? ""}" placeholder="neskaičiuojamas" /><small>0 – išparduota; tuščia – neskaičiuojama</small></label></div>
</section>
<section class="admCard"><h2>Nuotraukos</h2>
<p class="admNote">Pirmoji – kortelėje ir dalinantis. Įkeliant sumažinama iki 1600 px (WebP). Kol nuotraukų nėra – rodomas nupieštas buteliukas.</p>
<div class="admImgs" id="imgsBox"></div>
<label class="btn ghost small admUpload">${glyph("upload")}Įkelti nuotraukas<input type="file" accept="image/*" multiple hidden data-img-input /></label>
</section>
</div>
<aside class="admEditSide">
<section class="admCard"><h2>Rodymas</h2>
<label class="admToggleRow"><span><b>Rodomas parduotuvėje</b><small>Paslėptas – matomas tik jums</small></span><input type="checkbox" name="visible" class="admSwitchInp"${attr(p.visible !== false, "checked")} /></label>
<label class="field"><span>Žymė</span><select name="badge">${BADGES.map(b => opt(b, b || "Be žymės", p.badge || "")).join("")}</select></label>
<div class="fieldRow"><label class="field"><span>Eilė</span><input name="rank" type="number" inputmode="numeric" value="${esc(p.rank)}" /><small>1 – pirmas („Populiariausi“)</small></label>
<label class="field"><span>Pridėta</span><input name="added" type="date" value="${esc(p.added || "")}" /><small>Naujienoms</small></label></div>
</section>
<section class="admCard"><h2>Kategorijos</h2>${
    cats.length ? `<div class="admChecks col">${cats.map(c => check("cats", c.id, ed.cats.has(c.id), c.name)).join("")}</div>` : `<p class="admNote">Kategorijų dar nėra – <a href="admin/kategorijos" data-nav>sukurti</a>.</p>`
  }</section>
<section class="admCard"><h2>Išvaizda</h2>
<div class="admBottle" id="bottlePrev"></div>
<div class="fieldRow"><label class="field"><span>Skysčio spalva</span><input type="color" name="liquid" value="${esc(p.look?.liquid || "#E8D9C4")}" /></label>
<label class="field"><span>Fono atspalvis</span><input type="color" name="tint" value="${esc(p.look?.tint || "#F7F1E8")}" /></label></div>
<div class="fieldRow"><label class="field"><span>Dangtelis</span><select name="cap">${CAPS.map(([v, l]) => opt(v, l, p.look?.cap)).join("")}</select></label>
<label class="field"><span>Forma</span><select name="shape">${SHAPES.map(([v, l]) => opt(v, l, p.look?.shape)).join("")}</select></label></div>
</section>
${isNew ? "" : `<section class="admCard admDangerCard"><h2>Ištrinti</h2><p class="admNote">Geriau paslėpkite – ištrynus dings ir atsiliepimai. Užsakymų įrašai liks.</p><button class="btn danger small" type="button" data-prod-delete>${glyph("trash")}Ištrinti kvapą</button></section>`}
</aside></div>
<div class="admSaveBar"><p class="formErr" role="alert" hidden></p><a class="btn ghost" href="admin/kvapai" data-nav>Atšaukti</a><button class="btn primary" type="submit">${glyph("check")}${isNew ? "Sukurti kvapą" : "Išsaugoti"}</button></div>
</form>`;
  hydrateIcons(main);
  const form = $("#prodForm");
  paintSizes(form, ed.p.sizes || []);
  paintImages(ed);
  paintBottle(form);
  form.addEventListener("input", e => {
    A.dirty = true;
    if (e.target.name === "name" && isNew && !form.elements.id.dataset.touched) form.elements.id.value = slugify(e.target.value);
    if (e.target.name === "id") form.elements.id.dataset.touched = "1";
    if (["liquid", "tint", "cap", "shape", "name"].includes(e.target.name)) paintBottle(form);
  });
  form.addEventListener("change", e => {
    if (e.target.matches("[data-img-input]")) addImages(ed, form, e.target);
    else A.dirty = true;
    if (["cap", "shape"].includes(e.target.name)) paintBottle(form);
  });
  form.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-size-add]")) {
      const sizes = readSizes(form);
      sizes.push({ ml: "", price: "" });
      paintSizes(form, sizes);
      $$("[data-size-ml]", form).at(-1)?.focus();
      A.dirty = true;
    }
    const rm = t?.closest("[data-size-rm]");
    if (rm) {
      const sizes = readSizes(form);
      sizes.splice(Number(rm.dataset.sizeRm), 1);
      paintSizes(form, sizes);
      A.dirty = true;
    }
    const im = t?.closest("[data-img]");
    if (im) {
      const i = Number(im.closest("[data-img-i]").dataset.imgI);
      const act = im.dataset.img;
      if (act === "rm") ed.images.splice(i, 1);
      if (act === "left" && i > 0) [ed.images[i - 1], ed.images[i]] = [ed.images[i], ed.images[i - 1]];
      if (act === "right" && i < ed.images.length - 1) [ed.images[i + 1], ed.images[i]] = [ed.images[i], ed.images[i + 1]];
      paintImages(ed);
      A.dirty = true;
    }
    if (t?.closest("[data-prod-delete]")) deleteProduct(ed.p);
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), () => saveProduct(ed, form));
  });
}
function paintSizes(form, sizes) {
  $("#sizesBox", form).innerHTML = sizes
    .map(
      (s, i) => `<div class="admSize"><label class="field"><span>Tūris, ml</span><input inputmode="numeric" data-size-ml value="${esc(s.ml)}" /></label>
<label class="field"><span>Kaina, €</span><input inputmode="decimal" data-size-price value="${esc(dec(s.price))}" /></label>
<label class="field"><span>Sena kaina, €</span><input inputmode="decimal" data-size-was value="${esc(dec(s.was ?? ""))}" placeholder="—" /></label>
<button class="roundBtn" type="button" data-size-rm="${i}" aria-label="Pašalinti tūrį">${glyph("trash")}</button></div>`
    )
    .join("");
}
const readSizes = form =>
  $$(".admSize", form).map(r => ({ ml: $("[data-size-ml]", r).value.trim(), price: $("[data-size-price]", r).value.trim(), was: $("[data-size-was]", r).value.trim() }));
function paintImages(ed) {
  const box = $("#imgsBox");
  box.innerHTML = ed.images.length
    ? ed.images
        .map(
          (src, i) => `<figure class="admImg" data-img-i="${i}"><img src="${esc(src)}" alt="" loading="lazy" />${i === 0 ? `<span class="pill glass">Pagrindinė</span>` : ""}
<div class="admImgActs"><button type="button" data-img="left" aria-label="Į kairę"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button type="button" data-img="rm" aria-label="Pašalinti nuotrauką">${glyph("trash")}</button><button type="button" data-img="right" aria-label="Į dešinę"${attr(
            i === ed.images.length - 1,
            "disabled"
          )}>${glyph("chev-right")}</button></div></figure>`
        )
        .join("")
    : `<p class="admMuted">Nuotraukų nėra</p>`;
}
function paintBottle(form) {
  const f = form.elements;
  const p = { name: f.name.value || "Kvapas", look: { liquid: f.liquid.value, tint: f.tint.value, cap: f.cap.value, shape: f.shape.value } };
  const box = $("#bottlePrev");
  box.style.setProperty("--tint", p.look.tint);
  box.innerHTML = bottleSVG(p);
}
async function addImages(ed, form, input) {
  const files = [...input.files];
  input.value = "";
  if (!files.length) return;
  const id = form.elements.id.value.trim();
  if (!/^[a-z0-9-]+$/.test(id)) return toast("Pirma įrašykite pavadinimą (adresą)", { icon: "info" });
  const label = input.closest("label");
  label.classList.add("loading");
  try {
    const urls = await uploadImages(files, id);
    ed.images.push(...urls);
    paintImages(ed);
    A.dirty = true;
    toast(`${plural(urls.length, "nuotrauka įkelta", "nuotraukos įkeltos", "nuotraukų įkelta")} – neužmirškite išsaugoti`, { icon: "check", ms: 3600 });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  } finally {
    label.classList.remove("loading");
  }
}
function readProduct(ed, form) {
  const f = form.elements;
  const fd = new FormData(form);
  const errors = [];
  const id = f.id.value.trim();
  const sizes = readSizes(form)
    .filter(s => s.ml !== "" || s.price !== "")
    .map(s => {
      const out = { ml: Math.round(num(s.ml)), price: Math.round(num(s.price) * 100) / 100 };
      const was = s.was === "" ? null : Math.round(num(s.was) * 100) / 100;
      if (was != null) out.was = was;
      return out;
    });
  const notes = { top: list(f.top.value), heart: list(f.heart.value), base: list(f.base.value) };
  const stockRaw = f.stock.value.trim();
  const row = {
    id,
    name: f.name.value.trim(),
    ...(f.inspired ? { inspired: f.inspired.value.trim() } : {}),
    gender: f.gender.value,
    conc: f.conc.value,
    family: f.family.value,
    tagline: f.tagline.value.trim(),
    description: f.description.value.trim(),
    ...(f.ingredients ? { ingredients: f.ingredients.value.trim() } : {}),
    notes,
    longevity: Number(f.longevity.value),
    sillage: Number(f.sillage.value),
    seasons: fd.getAll("seasons"),
    times: fd.getAll("times"),
    sizes: sizes.sort((a, b) => a.ml - b.ml),
    sample: Math.round(num(f.sample.value) * 100) / 100,
    stock: stockRaw === "" ? null : Math.round(Number(stockRaw)),
    look: { liquid: f.liquid.value, tint: f.tint.value, cap: f.cap.value, shape: f.shape.value },
    images: ed.images,
    visible: f.visible.checked,
    badge: f.badge.value || null,
    rank: Math.round(Number(f.rank.value) || 100),
    added: f.added.value || new Date().toISOString().slice(0, 10)
  };
  if (!row.name) errors.push("Įrašykite pavadinimą");
  if (!/^[a-z0-9-]+$/.test(id)) errors.push("Adresas (id) – tik mažosios raidės, skaičiai ir „-“");
  if (ed.isNew && VD.CAT.products.some(p => p.id === id)) errors.push("Toks adresas jau užimtas – pakeiskite");
  if (VD.SET.discovery?.id === id) errors.push("Šis adresas skirtas atradimų rinkiniui");
  if (!row.family) errors.push("Pasirinkite kvapo šeimą");
  if (!sizes.length) errors.push("Pridėkite bent vieną tūrį su kaina");
  if (sizes.some(s => !(s.ml > 2 && s.price > 0))) errors.push("Tūris – daugiau nei 2 ml, kaina – daugiau nei 0 €");
  if (new Set(sizes.map(s => s.ml)).size !== sizes.length) errors.push("Tūriai kartojasi");
  if (sizes.some(s => s.was != null && !(s.was > s.price))) errors.push("Sena kaina turi būti didesnė už kainą (arba tuščia)");
  if (!(row.sample >= 0)) errors.push("Mėginuko kaina – skaičius");
  if (row.stock != null && !(Number.isInteger(row.stock) && row.stock >= 0)) errors.push("Likutis – sveikas skaičius ≥ 0");
  if (!notes.top.length || !notes.heart.length || !notes.base.length) errors.push("Įrašykite viršutines, širdies ir bazines natas");
  return { row, cats: fd.getAll("cats"), errors };
}
async function saveProduct(ed, form) {
  const err = $(".formErr", form);
  const { row, cats, errors } = readProduct(ed, form);
  err.hidden = !errors.length;
  err.textContent = errors.join(" · ");
  if (errors.length) return;
  const wasStock = ed.p.stock;
  let saved;
  if (ed.isNew) [saved] = await sbRest("products", { method: "POST", body: row, prefer: "return=representation" });
  else {
    const { id, ...patch } = row;
    [saved] = (await sbRest(`products?id=eq.${encodeURIComponent(ed.p.id)}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
    if (!saved) throw new Error("Kvapas nerastas – galbūt ištrintas");
  }
  // Kategorijos: pašaliname nebepažymėtas, pridedame naujas
  const removed = [...ed.cats].filter(c => !cats.includes(c));
  const added = cats.filter(c => !ed.cats.has(c));
  if (removed.length) await sbRest(`product_categories?product_id=eq.${encodeURIComponent(row.id)}&category_id=in.(${removed.map(encodeURIComponent).join(",")})`, { method: "DELETE" });
  if (added.length) await sbRest("product_categories", { method: "POST", body: added.map(c => ({ product_id: row.id, category_id: c })) });
  ed.cats = new Set(cats);
  ed.p = saved;
  await catalogChanged(ed.isNew ? "Kvapas sukurtas" : "Išsaugota");
  if (wasStock === 0 && saved.stock !== 0) offerRestockNotify(saved);
  if (ed.isNew) navigate(`admin/kvapai/${saved.id}`, { replace: true });
}
async function deleteProduct(p) {
  const ok = await askConfirm(`„${p.name}“ bus ištrintas kartu su atsiliepimais ir laukiančiųjų sąrašu. Užsakymų įrašai liks. Atšaukti nebus galima – gal geriau paslėpti?`, {
    title: "Ištrinti kvapą?",
    ok: "Ištrinti",
    danger: true
  });
  if (!ok) return;
  try {
    await sbRest(`products?id=eq.${encodeURIComponent(p.id)}`, { method: "DELETE" });
    A.dirty = false;
    await catalogChanged("Kvapas ištrintas");
    navigate("admin/kvapai", { replace: true });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}
