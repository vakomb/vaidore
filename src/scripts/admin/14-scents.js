// 14 – Kvapai (v15, lentelė scents): atskira administravimo skiltis admin/kvapu-sarasas – visų kvapų valdymas.
//   admin/kvapu-sarasas            sąrašas (paieška; spalva, pavadinimas, originalas, šeima, kiek produktų)
//   admin/kvapu-sarasas/naujas     naujas kvapas: įklijuotas aprašymas → kvapo laukai (13-autofill.js), papildyti ranka
//   admin/kvapu-sarasas/<id>       kvapas: pavadinimas, originalas, lytis, šeima, natos, savybės, progos, spalvos;
//                                  susieti produktai („Naujas produktas su šiuo kvapu“), pakeitimai – pasirinktinai ir
//                                  susietiems produktams; ištrynimas (produktai lieka, tik atsiejami).
// Kvapas – šaltinis naujų produktų automatiniam užpildymui (04-products.js, laukas „Kvapas“).
const scentState = { rows: [], counts: new Map(), q: "" };
const SCENT_KEYS = ["name", "inspired", "gender", "family", "notes", "seasons", "times", "occasions", "look"];
// Laukai, kurie pritaikomi susietiems produktams (pavadinimas, aprašymas, spalvos – produkto)
const SCENT_TO_PRODUCT = ["inspired", "gender", "family", "notes", "seasons", "times", "occasions", "longevity", "sillage"];

async function renderScents(main, param, seq) {
  if (param) return renderScentEdit(main, param, seq);
  main.innerHTML = pageHead("Kvapai") + loading();
  const [rows, products] = await Promise.all([sbRest("scents?select=*&order=name.asc").catch(() => null), sbRest("products?select=id,scent_id")]);
  if (stale(seq)) return;
  if (rows === null) {
    main.innerHTML = pageHead("Kvapai") + emptyBox("Kvapų lentelės dar nėra", "Reikia duomenų bazės migracijos 20261120120000_scents_types.sql.", "");
    return;
  }
  scentState.rows = rows;
  scentState.counts = new Map();
  for (const p of products || []) if (p.scent_id) scentState.counts.set(p.scent_id, (scentState.counts.get(p.scent_id) || 0) + 1);
  main.innerHTML = `${pageHead("Kvapai", plural(rows.length, "kvapas", "kvapai", "kvapų"), `<a class="btn primary small" href="admin/kvapu-sarasas/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`)}
<p class="admNote">Vienas kvapas – keli produktai (kvepalai, difuzorius, žvakė, aliejus). Kuriant produktą pasirinkus kvapą, natos, lytis ir savybės užpildomos iš karto.</p>
<div class="admToolbar"><label class="search admSearch"><span data-glyph="search" aria-hidden="true"></span><input type="search" id="scentQ" placeholder="Pavadinimas, originalas, nata" value="${esc(scentState.q)}" aria-label="Paieška kvapuose" /></label></div>
<div id="scentList"></div>`;
  hydrateIcons(main);
  paintScents();
  $("#scentQ").addEventListener("input", e => {
    scentState.q = e.target.value;
    paintScents();
  });
}
function paintScents() {
  const box = $("#scentList");
  if (!box) return;
  const q = fold(scentState.q.trim());
  const fam = id => VD.CAT.families.find(f => f.id === id)?.name || "";
  const rows = scentState.rows.filter(x => !q || fold([x.name, x.inspired, fam(x.family), ...(x.notes?.top || []), ...(x.notes?.heart || []), ...(x.notes?.base || [])].join(" ")).includes(q));
  box.innerHTML = rows.length
    ? `<div class="group">${rows
        .map(
          x => `<a class="row" href="admin/kvapu-sarasas/${esc(x.id)}" data-nav data-scent-row="${esc(x.id)}"><span class="scDot" style="--liquid:${esc(x.look?.liquid || "#E8D9C4")};--tint:${esc(x.look?.tint || "#F7F1E8")}" aria-hidden="true"></span><span class="rowTxt">${esc(x.name)}<small>${esc(
            [x.inspired ? `Įkvėpti ${x.inspired}` : "Originalas nenurodytas", fam(x.family)].filter(Boolean).join(" · ")
          )}</small></span><span class="admMuted">${plural(scentState.counts.get(x.id) || 0, "produktas", "produktai", "produktų")}</span><span class="chev">${glyph("chev-right")}</span></a>`
        )
        .join("")}</div>`
    : emptyBox(scentState.q ? "Nieko nerasta" : "Kvapų dar nėra", "", `<a class="btn primary" href="admin/kvapu-sarasas/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`);
  hydrateIcons(box);
}

// ── Kvapo puslapis ──
async function renderScentEdit(main, id, seq) {
  const isNew = id === "naujas";
  main.innerHTML = pageHead(isNew ? "Naujas kvapas" : "Kvapas") + loading();
  const [rows, fams, linked, all] = await Promise.all([
    isNew ? Promise.resolve([null]) : sbRest(`scents?select=*&id=eq.${encodeURIComponent(id)}`),
    sbRest("families?select=*&order=sort.asc"),
    isNew ? Promise.resolve([]) : sbRest(`products?select=id,name,type,images,look&scent_id=eq.${encodeURIComponent(id)}&order=rank.asc`),
    sbRest("scents?select=id")
  ]);
  if (stale(seq)) return;
  const x = isNew
    ? { id: "", name: "", inspired: "", gender: "unisex", family: fams[0]?.id || "", notes: { top: [], heart: [], base: [] }, seasons: [], times: ["diena"], occasions: [], longevity: 3, sillage: 3, look: { liquid: "#E8D9C4", tint: "#F7F1E8" } }
    : rows?.[0];
  if (!x) {
    main.innerHTML = pageHead("Kvapas nerastas") + emptyBox("Tokio kvapo nėra", "Galbūt jis ištrintas.", `<a class="btn primary" href="admin/kvapu-sarasas" data-nav>Visi kvapai</a>`);
    return;
  }
  const ed = { x, isNew, fams, linked: linked || [], ids: new Set((all || []).map(r => r.id)) };
  const n = x.notes || {};
  const check = (name, value, on, label) => `<label class="admCheck"><input type="checkbox" name="${name}" value="${esc(value)}"${attr(on, "checked")} /><span>${esc(label)}</span></label>`;
  const opt = (v, label, cur) => `<option value="${esc(v)}"${sel(String(cur) === String(v))}>${esc(label)}</option>`;
  const typeOne = t => VD.TYPES.find(y => y.id === (t || "kvepalai"))?.one || "";
  main.innerHTML = `<nav class="crumbs admCrumbs"><a href="admin/kvapu-sarasas" data-nav>${glyph("chev-left")}Kvapai</a></nav>
${pageHead(
  isNew ? "Naujas kvapas" : x.name,
  isNew ? "Įklijuokite kvapo aprašymą arba užpildykite ranka. Nieko neišsaugoma, kol nepaspausite „Sukurti kvapą“." : x.inspired ? `Įkvėpti ${esc(x.inspired)}` : "Originalas nenurodytas",
  isNew ? "" : `<a class="btn primary small" href="admin/kvapai/naujas?kvapas=${esc(x.id)}" data-nav>${glyph("plus")}Naujas produktas</a>`
)}
<form class="admEdit admForm" id="scentForm" novalidate>
<div class="admEditCols"><div class="admEditMain">
${
  isNew
    ? `<section class="admCard afCard" id="afCard"><h2>Automatinis užpildymas</h2>
<p class="admNote">Įklijuokite kvepalų ar kito produkto aprašymą (lietuvių, lenkų ar anglų kalba) – kvapo duomenys bus užpildyti lietuviškai.</p>
<label class="field"><span>Aprašymas</span><textarea id="afText" rows="6" placeholder="Įklijuokite visą aprašymą…"></textarea></label>
<button class="btn primary small afRun" type="button" data-af-run>${glyph("spark")}Sutvarkyti</button>
<div class="afOut" id="afOut" hidden></div>
</section>`
    : ""
}
<section class="admCard"><h2>Pagrindinė informacija</h2>
<label class="field"><span>Pavadinimas</span><input name="name" required maxlength="60" value="${esc(x.name)}" /></label>
${
  isNew
    ? `<label class="field"><span>Adresas (id)</span><input name="id" required maxlength="60" pattern="[a-z0-9-]+" value="" placeholder="mazosios-raides" /></label>`
    : ""
}
<label class="field"><span>Originalo kvapas (įkvėpta)</span><input name="inspired" maxlength="120" value="${esc(x.inspired || "")}" placeholder="pvz. Emporio Armani – My Way" /></label>
<div class="fieldRow"><label class="field"><span>Kam</span><select name="gender">${Object.entries(VD.GENDER_NAME)
    .map(([v, l]) => opt(v, l, x.gender))
    .join("")}</select></label>
<label class="field"><span>Kvapo šeima</span><select name="family">${fams.map(f => opt(f.id, f.name, x.family)).join("")}</select></label></div>
</section>
<section class="admCard"><h2>Natos</h2>
<label class="field"><span>Viršutinės natos</span><input name="top" value="${esc((n.top || []).join(", "))}" placeholder="Bergamotė, Kriaušė" /></label>
<label class="field"><span>Širdies natos</span><input name="heart" value="${esc((n.heart || []).join(", "))}" placeholder="Rožė, Jazminas" /></label>
<label class="field"><span>Bazinės natos</span><input name="base" value="${esc((n.base || []).join(", "))}" placeholder="Muskusas, Kedras" /></label>
</section>
<section class="admCard"><h2>Kada tinka</h2>
<div class="admChecks"><span>Metų laikai</span>${SEASONS.map(s => check("seasons", s, (x.seasons || []).includes(s), VD.SEASON_NAME[s])).join("")}</div>
<div class="admChecks"><span>Paros metas</span>${TIMES.map(([v, l]) => check("times", v, (x.times || []).includes(v), l)).join("")}</div>
<div class="admChecks"><span>Proga</span>${AF_OCCASIONS.map(([v, l]) => check("occasions", v, (x.occasions || []).includes(v), l)).join("")}</div>
</section>
</div>
<aside class="admEditSide">
<section class="admCard"><h2>Spalvos</h2>
<div class="scPrev" id="scPrev"></div>
<div class="fieldRow"><label class="field"><span>Skysčio spalva</span><input type="color" name="liquid" value="${esc(x.look?.liquid || "#E8D9C4")}" /></label>
<label class="field"><span>Fono atspalvis</span><input type="color" name="tint" value="${esc(x.look?.tint || "#F7F1E8")}" /></label></div>
<p class="admNote">Naujiems produktams su šiuo kvapu – buteliuko ir fono spalva.</p>
</section>
${
  isNew
    ? ""
    : `<section class="admCard"><h2>Produktai su šiuo kvapu</h2>${
        ed.linked.length
          ? `<div class="group scLinked">${ed.linked
              .map(
                p => `<a class="row" href="admin/kvapai/${esc(p.id)}" data-nav><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span class="rowTxt">${esc(p.name)}<small>${esc(typeOne(p.type))}</small></span><span class="chev">${glyph("chev-right")}</span></a>`
              )
              .join("")}</div>
<label class="admToggleRow"><span><b>Pritaikyti pakeitimus produktams</b><small>${plural(ed.linked.length, "produktas", "produktai", "produktų")}</small></span><input type="checkbox" name="apply" class="admSwitchInp" checked /></label>`
          : `<p class="admNote">Su šiuo kvapu produktų dar nėra.</p>`
      }
<a class="btn ghost small scNewProd" href="admin/kvapai/naujas?kvapas=${esc(x.id)}" data-nav>${glyph("plus")}Naujas produktas su šiuo kvapu</a></section>
<section class="admCard admDangerCard"><h2>Ištrinti</h2><p class="admNote">Kvapas dings iš sąrašo. Produktai liks parduotuvėje – tik nebebus susieti su šiuo kvapu.</p><button class="btn danger small" type="button" data-scent-del>${glyph("trash")}Ištrinti kvapą</button></section>`
}
</aside></div>
<div class="admSaveBar"><p class="formErr" role="alert" hidden></p><a class="btn ghost" href="admin/kvapu-sarasas" data-nav>Atšaukti</a><button class="btn primary" type="submit">${glyph("check")}${isNew ? "Sukurti kvapą" : "Išsaugoti"}</button></div>
</form>`;
  hydrateIcons(main);
  const form = $("#scentForm");
  const paintPrev = () => {
    const box = $("#scPrev", form);
    box.style.setProperty("--tint", form.elements.tint.value);
    box.innerHTML = bottleSVG({ name: form.elements.name.value || "Kvapas", look: { liquid: form.elements.liquid.value, tint: form.elements.tint.value, cap: "gold", shape: "rect" } });
  };
  paintPrev();
  form.addEventListener("input", e => {
    A.dirty = true;
    afTouched(form, e.target);
    if (e.target.name === "name" && isNew && !form.elements.id.dataset.touched) form.elements.id.value = scentUniqueId(ed, afSlug(e.target.value));
    if (e.target.name === "id") form.elements.id.dataset.touched = "1";
    if (["name", "liquid", "tint"].includes(e.target.name)) paintPrev();
  });
  form.addEventListener("change", e => {
    A.dirty = true;
    afTouched(form, e.target);
  });
  form.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-af-run]")) scentAutofill(ed, form, paintPrev);
    const go = t?.closest("[data-af-go]");
    if (go) afGo(form, go.dataset.afGo);
    if (t?.closest("[data-scent-del]")) deleteScent(ed);
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), () => saveScent(ed, form));
  });
}
const scentUniqueId = (ed, base) => {
  let id = base || "kvapas";
  for (let i = 2; ed.ids.has(id) || id === "naujas"; i++) id = `${base}-${i}`;
  return id;
};
// Įklijuotas aprašymas → kvapo laukai (tas pats variklis kaip produktams; imami tik kvapo laukai)
function scentAutofill(ed, form, paintPrev) {
  const text = $("#afText", form)?.value || "";
  if (!text.trim()) return toast("Įklijuokite aprašymą", { icon: "info" });
  const res = afParse(text, { families: ed.fams.map(f => f.id) });
  const x = res.fields;
  const f = form.elements;
  const set = (name, v) => f[name] && v != null && v !== "" && (f[name].value = v);
  if (x.scentName) {
    f.name.value = x.scentName;
    if (!f.id.dataset.touched) f.id.value = scentUniqueId(ed, afSlug(x.scentName));
  }
  set("inspired", x.inspired);
  set("gender", x.gender);
  if (x.family && ed.fams.some(fm => fm.id === x.family)) f.family.value = x.family;
  set("top", x.notes.top.join(", "));
  set("heart", x.notes.heart.join(", "));
  set("base", x.notes.base.join(", "));
  // Ilgaamžiškumas ir sklaida formoje nerodomi (v15) – saugomi tyliai (naudoja kvapo testas)
  if (x.longevity) ed.x.longevity = x.longevity;
  if (x.sillage) ed.x.sillage = x.sillage;
  for (const k of ["seasons", "times", "occasions"]) if (x[k]?.length) $$(`input[name="${k}"]`, form).forEach(el => (el.checked = x[k].includes(el.value)));
  if (x.look?.liquid) set("liquid", x.look.liquid);
  if (x.look?.tint) set("tint", x.look.tint);
  paintPrev();
  const keys = new Set(SCENT_KEYS);
  afMark(form, res.auto.filter(k => keys.has(k)));
  const missing = [];
  if (!x.scentName) missing.push({ key: "name", label: "Pavadinimas" });
  if (!x.inspired) missing.push({ key: "inspired", label: "Originalo kvapas" });
  if (!x.notes.top.length && !x.notes.heart.length && !x.notes.base.length) missing.push({ key: "notes", label: "Natos" });
  if (!x.family) missing.push({ key: "family", label: "Kvapo šeima" });
  missing.push(...res.missing.filter(m => m.key === "notes" && m.label.startsWith("Natos –")));
  afReport(form, { ...res, missing });
  A.dirty = true;
}
function readScent(ed, form) {
  const f = form.elements;
  const fd = new FormData(form);
  const row = {
    name: f.name.value.trim(),
    inspired: f.inspired.value.trim(),
    gender: f.gender.value,
    family: f.family.value || null,
    notes: { top: list(f.top.value), heart: list(f.heart.value), base: list(f.base.value) },
    seasons: fd.getAll("seasons"),
    times: fd.getAll("times"),
    occasions: fd.getAll("occasions"),
    longevity: ed.x.longevity || 3,
    sillage: ed.x.sillage || 3,
    look: { liquid: f.liquid.value, tint: f.tint.value }
  };
  const errors = [];
  if (!row.name) errors.push("Įrašykite pavadinimą");
  if (ed.isNew) {
    row.id = f.id.value.trim();
    if (!/^[a-z0-9-]+$/.test(row.id)) errors.push("Adresas (id) – tik mažosios raidės, skaičiai ir „-“");
    else if (ed.ids.has(row.id) || row.id === "naujas") errors.push("Toks adresas jau užimtas – pakeiskite");
  }
  if (!row.notes.top.length && !row.notes.heart.length && !row.notes.base.length) errors.push("Įrašykite bent vieną natą");
  return { row, errors };
}
async function saveScent(ed, form) {
  const err = $(".formErr", form);
  const { row, errors } = readScent(ed, form);
  err.hidden = !errors.length;
  err.textContent = errors.join(" · ");
  if (errors.length) return;
  if (ed.isNew) {
    await sbRest("scents", { method: "POST", body: row, prefer: "return=representation" });
    A.dirty = false;
    toast("Kvapas sukurtas", { icon: "check" });
    return navigate(`admin/kvapu-sarasas/${row.id}`, { replace: true });
  }
  await sbRest(`scents?id=eq.${encodeURIComponent(ed.x.id)}`, { method: "PATCH", body: row });
  const apply = ed.linked.length && form.elements.apply?.checked;
  if (apply) {
    const patch = Object.fromEntries(SCENT_TO_PRODUCT.map(k => [k, row[k]]));
    if (!patch.family) delete patch.family;
    await sbRest(`products?scent_id=eq.${encodeURIComponent(ed.x.id)}`, { method: "PATCH", body: patch });
  }
  A.dirty = false;
  if (apply) await catalogChanged(`Išsaugota – pritaikyta ${plural(ed.linked.length, "produktui", "produktams", "produktų")}`);
  else toast("Išsaugota", { icon: "check" });
  render(`kvapu-sarasas/${ed.x.id}`);
}
async function deleteScent(ed) {
  const n = ed.linked.length;
  const ok = await askConfirm(`„${ed.x.name}“ bus ištrintas iš kvapų sąrašo.${n ? ` ${plural(n, "produktas liks", "produktai liks", "produktų liks")} parduotuvėje – tik nebebus susieti su šiuo kvapu.` : ""}`, {
    title: "Ištrinti kvapą?",
    ok: "Ištrinti",
    danger: true
  });
  if (!ok) return;
  try {
    if (n) await sbRest(`products?scent_id=eq.${encodeURIComponent(ed.x.id)}`, { method: "PATCH", body: { scent_id: null } });
    await sbRest(`scents?id=eq.${encodeURIComponent(ed.x.id)}`, { method: "DELETE" });
    A.dirty = false;
    toast("Kvapas ištrintas", { icon: "check" });
    navigate("admin/kvapu-sarasas", { replace: true });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}
