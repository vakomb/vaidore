// 05 – Kategorijos (kolekcijos: kategorija/<id>, meniu, poraštė) ir kvapo šeimos (filtrai, „Pagal nuotaiką“).
// Redaguojama lange: pavadinimas, id (tik kuriant), aprašymas / užuomina, eilė, rodymas; kategorijai – paveikslas.
const TAXO = {
  categories: {
    title: "Kolekcijos",
    one: "Kolekcija",
    hint: "Parduotuvės meniu „Kolekcijos“. Produktus priskirkite produkto ekrane.",
    text: ["description", "Aprašymas", "Rodomas kategorijos puslapio viršuje"],
    image: true
  },
  families: {
    title: "Kvapo šeimos",
    one: "Kvapo šeima",
    hint: "Pagal šeimą filtruojama ir rodoma „Pagal nuotaiką“.",
    text: ["hint", "Užuomina", "pvz. Rožė, jazminas, bijūnas"],
    image: false
  }
};
const taxoState = { categories: [], families: [], counts: { categories: new Map(), families: new Map() } };

async function renderCategories(main, _param, seq) {
  const tools = catalogSeg("kategorijos");
  main.innerHTML = pageHTML({ title: "Kategorijos", tools, body: loading(6) });
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
  const body = ["categories", "families"]
    .map(kind =>
      groupHTML(
        `${taxoState[kind]
          .map(x =>
            navRow({
              button: true,
              attrs: `data-taxo-edit="${kind}" data-id="${esc(x.id)}"`,
              lead:
                kind === "families"
                  ? `<span class="admFam" style="background:${esc(VD.FAMILY_LOOK?.[x.id]?.tint || "#F6F7F9")}">${familyIco(x.id)}</span>`
                  : x.image
                    ? `<img class="admCatImg" src="${esc(x.image)}" alt="" loading="lazy" />`
                    : `<span class="axIco" style="background:var(--ink3)">${glyph("grid")}</span>`,
              title: `${esc(x.name)}${x.visible === false ? ` ${pillHTML("paslėpta")}` : ""}`,
              sub: esc(x.description || x.hint || ""),
              value: `<span class="admMuted">${taxoState.counts[kind].get(x.id) || 0}</span>`
            })
          )
          .join("")}<button class="axRow axAddRow" type="button" data-taxo-new="${kind}">${glyph("plus")}<span class="axRowTxt"><b>${kind === "categories" ? "Nauja kolekcija" : "Nauja kvapo šeima"}</b></span></button>`,
        { head: TAXO[kind].title, foot: esc(TAXO[kind].hint) }
      )
    )
    .join("");
  main.innerHTML = pageHTML({ title: "Kategorijos", tools, body });
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
<div class="ig">
<label class="field axField"><span>Pavadinimas</span><input name="name" required maxlength="60" value="${esc(x.name)}" /></label>
<label class="field axField"><span>Adresas</span><input name="id" required maxlength="60" value="${esc(x.id)}"${attr(!isNew, "readonly")} /></label>
<label class="field axField stack"><span>${T.text[1]}</span>${
      kind === "categories" ? `<textarea name="text" rows="3" maxlength="300" placeholder="${esc(T.text[2])}">${esc(x[T.text[0]] || "")}</textarea>` : `<input name="text" maxlength="120" value="${esc(x[T.text[0]] || "")}" placeholder="${esc(T.text[2])}" />`
    }</label>
<label class="field axField"><span>Eilė</span><input name="sort" type="number" inputmode="numeric" value="${esc(x.sort ?? 0)}" /></label>
<label class="axField axSwitchRow"><span>Rodoma</span><input type="checkbox" name="visible" class="admSwitchInp"${attr(x.visible !== false, "checked")} /></label>
</div>
<p class="igFoot">${kind === "categories" ? "vaidore.com/kategorija/" : "Filtro reikšmė: "}<span data-id-prev>${esc(x.id || "…")}</span>${isNew ? "" : " – nebekeičiamas"}</p>
${
  T.image
    ? `<h2 class="igHead">Paveikslas</h2><div class="ig axImgBox"><div class="admTaxoImg" id="taxoImg"></div><label class="axRow admUpload">${glyph("upload")}<span class="axRowTxt"><b class="axLink">Įkelti paveikslą</b></span><input type="file" accept="image/*" hidden data-taxo-img /></label></div>`
    : ""
}
<p class="formErr axErr" role="alert" hidden></p>
<button class="btn primary block" type="submit">${isNew ? "Sukurti" : "Išsaugoti"}</button>
${isNew ? "" : `<button class="btn ghost block axDangerBtn" type="button" data-taxo-del>${glyph("trash")}Ištrinti</button>`}
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
