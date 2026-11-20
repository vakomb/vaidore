// 14 – Kvapai (v15, lentelė scents): atskira administravimo skiltis admin/kvapu-sarasas – visų kvapų valdymas.
//   admin/kvapu-sarasas            sąrašas (paieška; spalva, pavadinimas, originalas, šeima, kiek produktų)
//   admin/kvapu-sarasas/naujas     naujas kvapas: įklijuotas aprašymas → kvapo laukai (13-autofill.js), papildyti ranka
//   admin/kvapu-sarasas/<id>       kvapas: pavadinimas, originalas, lytis, šeima, natos, spalvos;
//                                  susieti produktai („Naujas produktas su šiuo kvapu“), pakeitimai – pasirinktinai ir
//                                  susietiems produktams; ištrynimas (produktai lieka, tik atsiejami).
// Kvapas – šaltinis naujų produktų automatiniam užpildymui (04-products.js, laukas „Kvapas“).
const scentState = { rows: [], counts: new Map(), q: "" };
const SCENT_KEYS = ["name", "inspired", "gender", "family", "notes", "look"];
// Laukai, kurie pritaikomi susietiems produktams (pavadinimas, aprašymas, spalvos – produkto)
const SCENT_TO_PRODUCT = ["inspired", "inspired_image", "gender", "family", "notes", "longevity", "sillage"];

async function loadScents(force = false) {
  if (!force && scentState.rows.length && Date.now() - (scentState.at || 0) < 30000) return scentState.rows;
  const [rows, products] = await Promise.all([sbRest("scents?select=*&order=name.asc").catch(() => null), sbRest("products?select=id,scent_id")]);
  if (rows) {
    scentState.rows = rows;
    scentState.counts = new Map();
    for (const p of products || []) if (p.scent_id) scentState.counts.set(p.scent_id, (scentState.counts.get(p.scent_id) || 0) + 1);
    scentState.at = Date.now();
  }
  return rows;
}
async function renderScents(main, param, seq) {
  if (isSplit()) {
    const { list, detail, fresh } = splitPanes(main, "scents");
    if (fresh) {
      list.innerHTML = scentsListHTML(true);
      hydrateIcons(list);
      const rows = await loadScents(true);
      if (stale(seq)) return;
      if (rows === null) {
        list.innerHTML = pageHTML({ title: "Kvapai", body: noScentsTable() });
        return;
      }
      mountScentsList(list);
    } else markCurrent(list, param ? `admin/kvapu-sarasas/${param}` : "");
    if (!param) {
      detail.innerHTML = detailEmpty("drop", "Pasirinkite kvapą");
      return;
    }
    return renderScentEdit(detail, param, seq);
  }
  if (param) return renderScentEdit(main, param, seq);
  main.innerHTML = scentsListHTML(true);
  hydrateIcons(main);
  const rows = await loadScents(true);
  if (stale(seq)) return;
  if (rows === null) {
    main.innerHTML = pageHTML({ title: "Kvapai", tools: catalogSeg("kvapu-sarasas"), body: noScentsTable() });
    return;
  }
  mountScentsList(main);
}
const noScentsTable = () => emptyBox("Kvapų lentelės dar nėra", "Reikia duomenų bazės migracijos 20261120120000_scents_types.sql.");
function scentsListHTML(skeleton) {
  return pageHTML({
    title: "Kvapai",
    titleId: !isSplit() || !A.param,
    actions: barLink("plus", "Naujas kvapas", "admin/kvapu-sarasas/naujas"),
    tools: `${catalogSeg("kvapu-sarasas")}${searchHTML("scentQ", "Pavadinimas, originalas, nata", scentState.q, "Paieška kvapuose")}`,
    body: `<div id="scentList">${skeleton ? loading(8) : ""}</div><p class="igFoot">Vienas kvapas – keli produktai (kvepalai, difuzorius, žvakė, aliejus).</p>`
  });
}
function mountScentsList(box) {
  paintScents();
  $("#scentQ", box).addEventListener("input", e => {
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
  const cur = isSplit() && A.sec === "kvapu-sarasas" ? A.param : "";
  box.innerHTML = rows.length
    ? `<div class="ig axList">${rows
        .map(
          x => `<a class="axRow axRow2" href="admin/kvapu-sarasas/${esc(x.id)}" data-nav data-scent-row="${esc(x.id)}"${cur === x.id ? ' aria-current="page"' : ""}>${x.inspired_image ? `<span class="scOrig"><img src="${esc(x.inspired_image)}" alt="" loading="lazy" /></span>` : ""}<span class="scDot"${x.inspired_image ? " hidden" : ""} style="--liquid:${esc(x.look?.liquid || "#E8D9C4")};--tint:${esc(
            x.look?.tint || "#F7F1E8"
          )}" aria-hidden="true"></span><span class="axRowTxt"><b>${esc(x.name)}</b><small>${esc([x.inspired ? `Įkvėpti ${x.inspired}` : "Originalas nenurodytas", fam(x.family)].filter(Boolean).join(" · "))}</small></span><span class="axVal admMuted">${plural(
            scentState.counts.get(x.id) || 0,
            "produktas",
            "produktai",
            "produktų"
          )}</span><span class="axChev">${glyph("chev-right")}</span></a>`
        )
        .join("")}</div>`
    : emptyBox(scentState.q ? "Nieko nerasta" : "Kvapų dar nėra", "", `<a class="btn primary" href="admin/kvapu-sarasas/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`);
  hydrateIcons(box);
}

// ── Kvapo ekranas ──
async function renderScentEdit(main, id, seq) {
  const isNew = id === "naujas";
  const back = isSplit() ? null : { href: "admin/kvapu-sarasas", label: "Kvapai" };
  main.innerHTML = pageHTML({ title: isNew ? "Naujas kvapas" : "Kvapas", back, body: loading(6) });
  const [rows, fams, linked, all] = await Promise.all([
    isNew ? Promise.resolve([null]) : sbRest(`scents?select=*&id=eq.${encodeURIComponent(id)}`),
    sbRest("families?select=*&order=sort.asc"),
    isNew ? Promise.resolve([]) : sbRest(`products?select=id,name,type,images,look&scent_id=eq.${encodeURIComponent(id)}&order=rank.asc`),
    sbRest("scents?select=id")
  ]);
  if (stale(seq)) return;
  const x = isNew
    ? { id: "", name: "", inspired: "", gender: "unisex", family: fams[0]?.id || "", notes: { top: [], heart: [], base: [] }, longevity: 3, sillage: 3, look: { liquid: "#E8D9C4", tint: "#F7F1E8" } }
    : rows?.[0];
  if (!x) {
    main.innerHTML = pageHTML({ title: "Kvapas nerastas", back, body: emptyBox("Tokio kvapo nėra", "Galbūt jis ištrintas.", `<a class="btn primary" href="admin/kvapu-sarasas" data-nav>Visi kvapai</a>`) });
    return;
  }
  const ed = { x, isNew, fams, linked: linked || [], ids: new Set((all || []).map(r => r.id)) };
  // Originalo nuotrauka (v18) – tik jei duomenų bazėje jau yra stulpelis scents.inspired_image (migracija 20261121090000)
  ed.imgCol = isNew ? (scentState.rows[0] ? "inspired_image" in scentState.rows[0] : true) : "inspired_image" in x;
  ed.img = x.inspired_image || "";
  const n = x.notes || {};
  const opt = (v, label, cur) => `<option value="${esc(v)}"${sel(String(cur) === String(v))}>${esc(label)}</option>`;
  const typeOne = t => VD.TYPES.find(y => y.id === (t || "kvepalai"))?.one || "";
  const body = `<form class="admForm" id="scentForm" novalidate>
<p class="formErr axErr" role="alert" hidden></p>
${
  isNew
    ? `<h2 class="igHead">Užpildyti iš aprašymo</h2><div class="ig afCard" id="afCard"><label class="field axField stack"><span>Aprašymas</span><textarea id="afText" rows="5" placeholder="Įklijuokite kvapo aprašymą (LT, PL, EN)"></textarea></label><button class="axRow" type="button" data-af-run>${glyph(
        "spark"
      )}<span class="axRowTxt"><b class="axLink">Sutvarkyti</b></span></button></div>
<div class="afOut" id="afOut" hidden></div>`
    : ""
}
<div class="scPrev" id="scPrev"></div>
${groupHTML(
  `${fieldHTML("Pavadinimas", `<input name="name" required maxlength="60" value="${esc(x.name)}" />`)}${
    isNew ? fieldHTML("Adresas", `<input name="id" required maxlength="60" pattern="[a-z0-9-]+" value="" placeholder="mazosios-raides" />`) : ""
  }${fieldHTML("Originalas", `<input name="inspired" maxlength="120" value="${esc(x.inspired || "")}" placeholder="Emporio Armani – My Way" />`)}${fieldHTML(
    "Kam",
    `<select name="gender">${Object.entries(VD.GENDER_NAME).map(([v, l]) => opt(v, l, x.gender)).join("")}</select>`
  )}${fieldHTML("Kvapo šeima", `<select name="family">${fams.map(f => opt(f.id, f.name, x.family)).join("")}</select>`)}`,
  { head: "Kvapas" }
)}
${ed.imgCol ? `<h2 class="igHead">Originalo nuotrauka</h2><div id="scInsp">${inspImgHTML(ed.img)}</div>` : ""}
${groupHTML(
  `${fieldHTML("Viršutinės", `<input name="top" value="${esc((n.top || []).join(", "))}" placeholder="Bergamotė, Kriaušė" />`, { stack: true })}${fieldHTML(
    "Širdies",
    `<input name="heart" value="${esc((n.heart || []).join(", "))}" placeholder="Rožė, Jazminas" />`,
    { stack: true }
  )}${fieldHTML("Bazinės", `<input name="base" value="${esc((n.base || []).join(", "))}" placeholder="Muskusas, Kedras" />`, { stack: true })}`,
  { head: "Natos" }
)}
${groupHTML(
  `${fieldHTML("Skystis", `<input type="color" name="liquid" value="${esc(x.look?.liquid || "#E8D9C4")}" />`)}${fieldHTML("Fonas", `<input type="color" name="tint" value="${esc(x.look?.tint || "#F7F1E8")}" />`)}`,
  { head: "Spalvos", foot: "Naujiems produktams su šiuo kvapu." }
)}
${
  isNew
    ? ""
    : `<h2 class="igHead">Produktai su šiuo kvapu</h2><div class="ig scLinked">${ed.linked
        .map(p => navRow({ href: `admin/kvapai/${p.id}`, lead: thumb(p), title: esc(p.name), sub: esc(typeOne(p.type)) }))
        .join("")}${
        ed.linked.length
          ? `<label class="axField axSwitchRow"><span>Pakeitimus pritaikyti ir produktams</span><input type="checkbox" name="apply" class="admSwitchInp" checked /></label>`
          : ""
      }<a class="axRow axAddRow scNewProd" href="admin/kvapai/naujas?kvapas=${esc(x.id)}" data-nav>${glyph("plus")}<span class="axRowTxt"><b>Naujas produktas su šiuo kvapu</b></span></a></div>
${groupHTML(`<button class="axRow danger" type="button" data-scent-del><span class="axRowTxt"><b>Ištrinti kvapą</b></span></button>`, { foot: "Produktai liks parduotuvėje – tik nebebus susieti su šiuo kvapu." })}`
}
</form>`;
  main.innerHTML = pageHTML({
    title: isNew ? "Naujas kvapas" : x.name,
    sub: isNew ? "" : x.inspired ? `Įkvėpti ${esc(x.inspired)}` : "",
    back,
    actions: saveBtn({ form: "scentForm", label: isNew ? "Sukurti" : "Išsaugoti", always: isNew }),
    body,
    cls: "axNarrow"
  });
  hydrateIcons(main);
  const form = $("#scentForm", main);
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
  const paintInsp = () => {
    const box = $("#scInsp", form);
    if (box) {
      box.innerHTML = inspImgHTML(ed.img);
      hydrateIcons(box);
    }
  };
  form.addEventListener("change", async e => {
    A.dirty = true;
    afTouched(form, e.target);
    if (e.target.matches("[data-insp-img]")) {
      try {
        const url = await uploadInspImg(e.target, ed.x.id || form.elements.id?.value.trim());
        if (url) {
          ed.img = url;
          paintInsp();
        }
      } catch (err) {
        toast(errText(err), { icon: "info", ms: 4200 });
      }
    }
  });
  form.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-insp-rm]")) {
      ed.img = "";
      A.dirty = true;
      paintInsp();
    }
    if (t?.closest("[data-af-run]")) scentAutofill(ed, form, paintPrev);
    const go = t?.closest("[data-af-go]");
    if (go) afGo(form, go.dataset.afGo);
    if (t?.closest("[data-scent-del]")) deleteScent(ed);
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($('.axSave[form="scentForm"]', main), () => saveScent(ed, form));
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
  const row = {
    name: f.name.value.trim(),
    inspired: f.inspired.value.trim(),
    gender: f.gender.value,
    family: f.family.value || null,
    notes: { top: list(f.top.value), heart: list(f.heart.value), base: list(f.base.value) },
    longevity: ed.x.longevity || 3,
    sillage: ed.x.sillage || 3,
    look: { liquid: f.liquid.value, tint: f.tint.value },
    ...(ed.imgCol ? { inspired_image: ed.img } : {})
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
  const { row, errors } = readScent(ed, form);
  showFormErr(form, errors);
  if (errors.length) return;
  if (ed.isNew) {
    const [sc] = (await sbRest("scents", { method: "POST", body: row, prefer: "return=representation" })) || [];
    if (sc) scentState.rows = [...scentState.rows, sc].sort((a, b) => a.name.localeCompare(b.name, "lt"));
    paintScents();
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
  const i = scentState.rows.findIndex(r => r.id === ed.x.id);
  if (i >= 0) scentState.rows[i] = { ...scentState.rows[i], ...row };
  paintScents();
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
    scentState.rows = scentState.rows.filter(r => r.id !== ed.x.id);
    paintScents();
    A.dirty = false;
    toast("Kvapas ištrintas", { icon: "check" });
    navigate("admin/kvapu-sarasas", { replace: true });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}
