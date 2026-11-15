// 05 – Kategorijos (kolekcijos: kategorija/<id>, meniu, poraštė) ir kvapo šeimos (filtrai, „Pagal nuotaiką“).
// Redaguojama lange: pavadinimas, id (tik kuriant), aprašymas / užuomina, eilė, rodymas; kategorijai – paveikslas.
const TAXO = {
  categories: {
    title: "Kategorijos",
    one: "Kategorija",
    hint: "Kolekcijos parduotuvės meniu: kategorija/<id>. Kvapus priskirkite kvapo puslapyje.",
    text: ["description", "Aprašymas", "Rodomas kategorijos puslapio viršuje"],
    image: true
  },
  families: {
    title: "Kvapo šeimos",
    one: "Kvapo šeima",
    hint: "Kiekvienas kvapas priklauso vienai šeimai – pagal ją filtruojama ir rodoma „Pagal nuotaiką“.",
    text: ["hint", "Užuomina", "pvz. Rožė, jazminas, bijūnas"],
    image: false
  }
};
const taxoState = { categories: [], families: [], counts: { categories: new Map(), families: new Map() } };

async function renderCategories(main, _param, seq) {
  main.innerHTML = pageHead("Kategorijos") + loading();
  const [categories, families, links, products] = await Promise.all([
    sbRest("categories?select=*&order=sort.asc,name.asc"),
    sbRest("families?select=*&order=sort.asc,name.asc"),
    sbRest("product_categories?select=product_id,category_id"),
    sbRest("products?select=id,family")
  ]);
  if (stale(seq)) return;
  Object.assign(taxoState, { categories, families });
  taxoState.counts.categories = new Map();
  for (const l of links) taxoState.counts.categories.set(l.category_id, (taxoState.counts.categories.get(l.category_id) || 0) + 1);
  taxoState.counts.families = new Map();
  for (const p of products) taxoState.counts.families.set(p.family, (taxoState.counts.families.get(p.family) || 0) + 1);
  main.innerHTML = `${pageHead("Kategorijos ir šeimos")}${["categories", "families"]
    .map(
      kind => `<section class="admSec"><div class="admSecHead"><div><h2 class="admH2">${TAXO[kind].title}</h2><p class="admNote">${esc(TAXO[kind].hint)}</p></div><button class="btn ghost small" type="button" data-taxo-new="${kind}">${glyph("plus")}Nauja</button></div>
<div class="group">${
        taxoState[kind].length
          ? taxoState[kind]
              .map(
                x => `<button class="row" type="button" data-taxo-edit="${kind}" data-id="${esc(x.id)}">${
                  kind === "families" ? `<span class="admFam" style="background:${esc(VD.FAMILY_LOOK?.[x.id]?.tint || "#F6F7F9")}">${familyIco(x.id)}</span>` : x.image ? `<img class="admCatImg" src="${esc(x.image)}" alt="" loading="lazy" />` : `<span class="rowIco" style="background:var(--ink3)">${glyph("grid")}</span>`
                }<span class="rowTxt">${esc(x.name)}${x.visible === false ? ` <span class="pill">paslėpta</span>` : ""}<small>${esc(x.description || x.hint || "")}</small></span><span class="admMuted">${plural(
                  taxoState.counts[kind].get(x.id) || 0,
                  "kvapas",
                  "kvapai",
                  "kvapų"
                )}</span><span class="chev">${glyph("chev-right")}</span></button>`
              )
              .join("")
          : `<div class="row"><span class="rowTxt admMuted">Dar nėra</span></div>`
      }</div></section>`
    )
    .join("")}`;
  hydrateIcons(main);
  main.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const nw = t?.closest("[data-taxo-new]");
    if (nw) return openTaxo(nw.dataset.taxoNew, null);
    const ed = t?.closest("[data-taxo-edit]");
    if (ed) openTaxo(ed.dataset.taxoEdit, taxoState[ed.dataset.taxoEdit].find(x => x.id === ed.dataset.id));
  });
}
const familyIco = id => {
  const look = VD.FAMILY_LOOK?.[id];
  return look?.svg || glyph("drop");
};
function openTaxo(kind, item) {
  const T = TAXO[kind];
  const isNew = !item;
  const x = item || { id: "", name: "", sort: (taxoState[kind].at(-1)?.sort || 0) + 1, visible: true, description: "", hint: "", image: "" };
  let image = x.image || "";
  openSheet({
    title: isNew ? `Nauja: ${T.one.toLowerCase()}` : T.one,
    html: `<form class="sheetPad admForm" novalidate>
<label class="field"><span>Pavadinimas</span><input name="name" required maxlength="60" value="${esc(x.name)}" /></label>
<label class="field"><span>Adresas (id)</span><input name="id" required maxlength="60" value="${esc(x.id)}"${attr(!isNew, "readonly")} /><small>${
      kind === "categories" ? "vaidore.com/kategorija/" : "Filtro reikšmė "
    }<span data-id-prev>${esc(x.id || "…")}</span>${isNew ? "" : " – nebekeičiamas"}</small></label>
<label class="field"><span>${T.text[1]}</span>${
      kind === "categories" ? `<textarea name="text" rows="3" maxlength="300">${esc(x[T.text[0]] || "")}</textarea>` : `<input name="text" maxlength="120" value="${esc(x[T.text[0]] || "")}" />`
    }<small>${esc(T.text[2])}</small></label>
${
  T.image
    ? `<div class="field"><span>Paveikslas (nebūtina)</span><div class="admTaxoImg" id="taxoImg"></div><label class="btn ghost small admUpload">${glyph("upload")}Įkelti<input type="file" accept="image/*" hidden data-taxo-img /></label></div>`
    : ""
}
<div class="fieldRow"><label class="field"><span>Eilė</span><input name="sort" type="number" inputmode="numeric" value="${esc(x.sort ?? 0)}" /></label>
<label class="admToggleRow"><span><b>Rodoma</b></span><input type="checkbox" name="visible" class="admSwitchInp"${attr(x.visible !== false, "checked")} /></label></div>
<p class="formErr" role="alert" hidden></p>
<div class="confirmActs">${isNew ? "" : `<button class="btn danger" type="button" data-taxo-del>${glyph("trash")}Ištrinti</button>`}<button class="btn primary" type="submit">${isNew ? "Sukurti" : "Išsaugoti"}</button></div>
</form>`
  });
  const form = $("#sheetBody form");
  const paintImg = () => {
    const box = $("#taxoImg", form);
    if (box) box.innerHTML = image ? `<img src="${esc(image)}" alt="" /><button class="roundBtn" type="button" data-taxo-img-rm aria-label="Pašalinti paveikslą">${glyph("trash")}</button>` : "";
  };
  paintImg();
  form.addEventListener("input", e => {
    if (e.target.name === "name" && isNew && !form.elements.id.dataset.touched) form.elements.id.value = slugify(e.target.value);
    if (e.target.name === "id") form.elements.id.dataset.touched = "1";
    $("[data-id-prev]", form).textContent = form.elements.id.value || "…";
  });
  form.addEventListener("change", async e => {
    if (!e.target.matches("[data-taxo-img]")) return;
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const id = form.elements.id.value.trim() || "kategorija";
    try {
      [image] = await uploadImages([file], `kategorijos/${id}`);
      paintImg();
    } catch (err) {
      toast(errText(err), { icon: "info" });
    }
  });
  form.addEventListener("click", async e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-taxo-img-rm]")) {
      image = "";
      paintImg();
    }
    if (t?.closest("[data-taxo-del]")) {
      const n = taxoState.counts[kind].get(x.id) || 0;
      if (kind === "families" && n) return toast(`Šeimai priklauso ${plural(n, "kvapas", "kvapai", "kvapų")} – pirma pakeiskite jų šeimą`, { icon: "info", ms: 4200 });
      const ok = await askConfirm(`„${x.name}“ bus ištrinta${kind === "categories" && n ? ` (kvapai liks, tik nebebus šioje kategorijoje)` : ""}.`, { title: "Ištrinti?", ok: "Ištrinti", danger: true });
      if (!ok) return;
      try {
        await sbRest(`${kind}?id=eq.${encodeURIComponent(x.id)}`, { method: "DELETE" });
        await catalogChanged("Ištrinta");
        render("kategorijos");
      } catch (err) {
        toast(errText(err), { icon: "info", ms: 4200 });
      }
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), async () => {
      const f = form.elements;
      const err = $(".formErr", form);
      const row = { id: f.id.value.trim(), name: f.name.value.trim(), sort: Math.round(Number(f.sort.value) || 0), visible: f.visible.checked, [T.text[0]]: f.text.value.trim() };
      if (T.image) row.image = image;
      const problems = [
        !row.name && "Įrašykite pavadinimą",
        !/^[a-z0-9-]+$/.test(row.id) && "Adresas – tik mažosios raidės, skaičiai ir „-“",
        isNew && taxoState[kind].some(y => y.id === row.id) && "Toks adresas jau yra"
      ].filter(Boolean);
      err.hidden = !problems.length;
      err.textContent = problems.join(" · ");
      if (problems.length) return;
      if (isNew) await sbRest(kind, { method: "POST", body: row });
      else {
        const { id, ...patch } = row;
        await sbRest(`${kind}?id=eq.${encodeURIComponent(x.id)}`, { method: "PATCH", body: patch });
      }
      closeSheet();
      await catalogChanged(isNew ? "Sukurta" : "Išsaugota");
      render("kategorijos");
    });
  });
}
