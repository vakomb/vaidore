// 16 - v33d: anglų kalba administravime. Sąsaja lieka lietuviška, o turiniui - EN laukai:
//   • produktas → „Anglų kalba (EN)“ (pavadinimas, trumpas aprašymas, aprašymas, paantraštė) + „Užpildyti automatiškai“
//     (be jokio API: tipo šablonai ir natų žodynas src/i18n/notes.en.json - įdedamas į administravimo failą surinkimo metu);
//   • produktų sąraše - žymė „be EN“ ir filtras „Vertimas“;
//   • šeimos ir kolekcijos - EN pavadinimas ir aprašymas (05-categories.js);
//   • Nustatymai → „Anglų kalba (EN)“ - visi parduotuvės tekstai vienoje vietoje (settings.data.i18n.en, pagal stabilius raktus).
// Neišversti laukai parduotuvėje rodomi lietuviškai (atsarginis variantas), todėl nieko nesugenda.
const EN_NOTE = new Map(Object.entries(typeof NOTES_EN === "object" ? NOTES_EN : {}).map(([k, v]) => [fold(k).trim(), v]));
const enNote = n => EN_NOTE.get(fold(n).trim()) || n;
const enJoin = arr => (arr.length > 1 ? `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}` : arr[0] || "");
const capFirst = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const EN_TYPE = {
  kvepalai: "",
  zvakes: "Scented candle",
  aliejai: "Fragrance oil",
  difuzoriai: "Reed diffuser",
  "elektriniai-difuzoriai": "Electric diffuser",
  purskikliai: "Room spray",
  vaskai: "Wax melt",
  aromalempos: "Wax burner"
};
const LT_PREFIX = /^(kvapni žvakė|aromatinis aliejus|namų kvapų difuzorius|elektrinis difuzorius|difuzorius|namų purškiklis|kaitinamas vaškas|aromalempa)\s+/i;
const EN_FOR = { moterims: "for women", vyrams: "for men", unisex: "for her and for him" };
const EN_TPL = {
  oil: "A few drops in your diffuser's water are enough - the scent spreads evenly through the whole room. For room fragrancing only.",
  candle: "On the first burn, let it burn for at least an hour so the wax melts evenly across the whole surface.",
  reed: "The reeds draw up the fragrance evenly and diffuse it with no flame or electricity. Turn the reeds every few days to refresh the scent.",
  edp: "concentration - long-lasting on the skin.",
  skin: "Every fragrance develops differently on each person's skin, so it's worth starting with a 2 ml sample.",
  spray: "One or two sprays are enough - into the air or onto curtains, bedding and upholstery from about 30 cm.",
  melt: "Place one or two cubes in the bowl of a wax burner and light a tealight underneath - the wax melts and releases its fragrance for hours, with no wick and no smoke."
};
// Ar produktui trūksta vertimo: aprašymas ar trumpas aprašymas be EN; ne kvepalams - ir pavadinimas
function enMissing(p) {
  const en = p.i18n?.en || {};
  if (p.description?.trim() && !en.description?.trim()) return true;
  if (p.tagline?.trim() && !en.tagline?.trim()) return true;
  return (p.type || "kvepalai") !== "kvepalai" && LT_PREFIX.test(p.name || "") && !en.name?.trim();
}
// Automatinis EN užpildymas iš lietuviškų laukų (pildomi tik tušti EN laukai)
function enAutoFill(v) {
  const type = v.type || "kvepalai";
  const core = String(v.name || "").replace(LT_PREFIX, "").trim();
  const name = EN_TYPE[type] ? `${EN_TYPE[type]} ${core}` : "";
  const tiers = [v.top, v.heart, v.base].map(l => (l || []).slice(0, 5).map(n => enNote(n).toLowerCase()));
  const notes = [
    tiers[0].length && `top notes of ${enJoin(tiers[0])}`,
    tiers[1].length && `a heart of ${enJoin(tiers[1])}`,
    tiers[2].length && `a base of ${enJoin(tiers[2])}`
  ].filter(Boolean);
  const noteLine = notes.length ? `${capFirst(notes.join("; "))}.` : "";
  const parts = String(v.tagline || "").split(/\s*,\s*|\s+ir\s+/).filter(Boolean);
  const known = parts.length && parts.every(x => EN_NOTE.has(fold(x).trim()));
  const tagline = known ? capFirst(enJoin(parts.map(x => enNote(x).toLowerCase()))) : capFirst(enJoin([tiers[0][0], tiers[1][0], tiers[2][0]].filter(Boolean)));
  const conc = VD.CONC_NAME[v.conc] || "Eau de Parfum";
  const who = EN_FOR[v.gender] || "";
  const desc = {
    kvepalai: [`${core || v.name} - ${/^[AEIOU]/i.test(conc) ? "an" : "a"} ${conc} ${who}.`.replace(" .", "."), noteLine, `${conc} ${EN_TPL.edp}`, EN_TPL.skin],
    zvakes: [`${name} - a fragrance for a cosy home.`, noteLine, EN_TPL.candle],
    aliejai: [`${name} - a fragrance for electric diffusers and humidifiers.`, noteLine, EN_TPL.oil],
    difuzoriai: [`${name} - a fragrance for your home.`, noteLine, EN_TPL.reed],
    "elektriniai-difuzoriai": [`${name} - an electric aroma diffuser that quietly and evenly spreads your favourite fragrance throughout your home.`, "Add a few drops of fragrance oil to the water and your home will fill with scent."],
    purskikliai: [`${name} - instant fragrance for your home.`, noteLine, EN_TPL.spray],
    vaskai: [`${name} - a fragrance for your wax burner.`, noteLine, EN_TPL.melt],
    aromalempos: [`${name} - a wax and oil burner that gently warms your favourite fragrance with the light of a tealight.`, EN_TPL.melt]
  }[type];
  return { name, tagline, description: (desc || []).filter(Boolean).join(" ") };
}
// Produkto formos vidinis ekranas „Anglų kalba (EN)“
function enPaneHTML(p) {
  const en = p.i18n?.en || {};
  const f = (k, label, input) => fieldHTML(label, input, { stack: true });
  return `<div data-pane="anglu" data-title="Anglų kalba (EN)" data-focus="no" hidden>
${groupHTML(
  `${f("name", "Pavadinimas", `<input name="en_name" maxlength="90" value="${esc(en.name || "")}" placeholder="Tuščias - kaip lietuviškai" />`)}${f(
    "tagline",
    "Trumpas aprašymas",
    `<input name="en_tagline" maxlength="90" value="${esc(en.tagline || "")}" />`
  )}${f("description", "Aprašymas", `<textarea name="en_description" rows="7" maxlength="1500">${esc(en.description || "")}</textarea>`)}${
    "subtitle" in p ? f("subtitle", "Paantraštė", `<input name="en_subtitle" maxlength="80" value="${esc(en.subtitle || "")}" />`) : ""
  }${"ingredients" in p ? f("ingredients", "Sudėtis", `<textarea name="en_ingredients" rows="3" maxlength="1500">${esc(en.ingredients || "")}</textarea>`) : ""}`,
  { head: "Angliška parduotuvė (vaidore.com/en)", foot: "Neužpildyti laukai rodomi lietuviškai." }
)}
${groupHTML(`<button class="axRow" type="button" data-en-auto><span class="axRowTxt"><b>Užpildyti automatiškai</b><small>Iš lietuviškų laukų ir natų - tik tuščius laukus</small></span></button>`)}
</div>`;
}
// Formos EN laukai → products.i18n (kitos kalbos ir nežinomi laukai išlieka)
function readEnFields(form, p) {
  const f = form.elements;
  const en = { ...(p.i18n?.en || {}) };
  for (const k of ["name", "tagline", "description", "subtitle", "ingredients"]) {
    const el = f[`en_${k}`];
    if (!el) continue;
    const v = el.value.trim();
    if (v) en[k] = v;
    else delete en[k];
  }
  const out = { ...(p.i18n || {}) };
  if (Object.keys(en).length) out.en = en;
  else delete out.en;
  return out;
}
function enSumHTML(form, p) {
  const f = form.elements;
  if (!f.en_tagline) return "";
  const probe = {
    type: f.type?.value || p.type,
    name: f.name.value,
    tagline: f.tagline.value,
    description: f.description.value,
    i18n: { en: { name: f.en_name.value, tagline: f.en_tagline.value, description: f.en_description.value } }
  };
  return enMissing(probe) ? `<span class="axWarn">Trūksta</span>` : `<span class="axMuted2">Išversta</span>`;
}
function bindEnAuto(form, markDirty) {
  form.addEventListener("click", e => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-en-auto]")) return;
    const f = form.elements;
    const list = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
    const r = enAutoFill({ type: f.type?.value, name: f.name.value, tagline: f.tagline.value, conc: f.conc.value, gender: f.gender.value, top: list(f.top.value), heart: list(f.heart.value), base: list(f.base.value) });
    let n = 0;
    for (const [k, v] of Object.entries(r))
      if (v && f[`en_${k}`] && !f[`en_${k}`].value.trim()) {
        f[`en_${k}`].value = v;
        n++;
      }
    markDirty();
    toast(n ? "EN laukai užpildyti - peržiūrėkite ir pataisykite" : "Visi EN laukai jau užpildyti", { icon: n ? "check" : "info" });
  });
}

// ── Nustatymai → Anglų kalba (EN): visi parduotuvės tekstai (settings.data.i18n.en) ──
const enGet = (o, path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
function enSet(o, path, v) {
  const keys = path.split(".");
  let cur = o;
  keys.slice(0, -1).forEach((k, i) => {
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = v;
}
// [antraštė, [[kelias, pavadinimas, LT tekstas, ilgas?]]] - tik laukai, kurie lietuviškai užpildyti
function enGroups(S) {
  const g = [];
  const add = (head, rows) => {
    rows = rows.filter(r => String(r[2] ?? "").trim());
    if (rows.length) g.push([head, rows]);
  };
  add("Parduotuvė", [
    ["tagline", "Šūkis", S.tagline],
    ["dispatch", "Išsiunčiame per", S.dispatch],
    ["inspired.note", "Prekių ženklų pastaba", S.inspired?.note, true]
  ]);
  add("Pradžia", [
    ["hero.eyebrow", "Viršutinė eilutė", S.hero?.eyebrow],
    ["hero.title", "Pavadinimas", S.hero?.title],
    ["hero.text", "Tekstas", S.hero?.text, true]
  ]);
  for (const s of S.slides || []) add(`Skaidrė ${s.id}`, ["eyebrow", "title", "text", "cta"].map(k => [`slides.${s.id}.${k}`, { eyebrow: "Viršutinė eilutė", title: "Pavadinimas", text: "Tekstas", cta: "Mygtukas" }[k], s[k], k === "text"]));
  add("Skyriai su produktais", (S.rails || []).flatMap(r => [[`rails.${r.id}.title`, `${r.title || r.id} - pavadinimas`, r.title], [`rails.${r.id}.line`, `${r.title || r.id} - paantraštė`, r.line]]));
  add("Plytelės", (S.tiles || []).map(x => [`tiles.${x.key}.title`, x.key, x.title]));
  add("Juosta virš header'io", (S.topbar?.items || []).flatMap(x => [[`topbar.${x.id}.text`, `${x.id} - tekstas`, x.text], [`topbar.${x.id}.short`, `${x.id} - trumpas`, x.short]]));
  add("Pristatymas", (S.shipping || []).flatMap(o => [[`shipping.${o.id}.name`, `${o.id} - pavadinimas`, o.name], [`shipping.${o.id}.days`, `${o.id} - trukmė`, o.days]]));
  add("Mėginukų rinkinys", [
    ["discovery.name", "Pavadinimas", S.discovery?.name],
    ["discovery.text", "Tekstas", S.discovery?.text, true]
  ]);
  add("Mūsų istorija", [
    ["story.title", "Pavadinimas", S.story?.title],
    ["story.text", "Tekstas", S.story?.text, true]
  ]);
  add("Verslui", [["business.text", "Tekstas", S.business?.text, true]]);
  // Prekių puslapiai: tik administravime pakeisti tekstai (numatytieji EN - src/i18n/pdp.en.json)
  for (const [type, o] of Object.entries(S.pdp || {})) {
    const rows = [];
    if (o.sub) rows.push([`pdp.${type}.sub`, "Paantraštė", o.sub]);
    for (const [blk, b] of Object.entries(o)) {
      if (!b || typeof b !== "object") continue;
      if (b.title) rows.push([`pdp.${type}.${blk}.title`, `${blk} - antraštė`, b.title]);
      if (b.text) rows.push([`pdp.${type}.${blk}.text`, `${blk} - tekstas`, b.text, true]);
      (b.items || []).forEach((it, i) => ["title", "text", "label"].forEach(k => it?.[k] && rows.push([`pdp.${type}.${blk}.items.${i}.${k}`, `${blk} ${i + 1} - ${k}`, it[k], k === "text"])));
    }
    add(`Prekių puslapiai: ${VD.TYPES.find(t => t.id === type)?.name || type}`, rows);
  }
  return g;
}
SET_PAGES.vertimai = {
  title: "Anglų kalba (EN)",
  html: S => {
    const en = S.i18n?.en || {};
    const groups = enGroups(S);
    if (!groups.length) return `<p class="igFoot">Lietuviškų tekstų nustatymuose dar nėra.</p>`;
    return groups
      .map(([head, rows]) =>
        groupHTML(
          rows
            .map(([path, label, lt, long]) =>
              fieldHTML(
                `${esc(label)}<small class="axEnLt">${esc(String(lt))}</small>`,
                long
                  ? `<textarea name="en__${esc(path)}" rows="3" maxlength="1500">${esc(enGet(en, path) || "")}</textarea>`
                  : `<input name="en__${esc(path)}" maxlength="300" value="${esc(enGet(en, path) || "")}" />`,
                { stack: true }
              )
            )
            .join(""),
          { head: esc(head) }
        )
      )
      .join("");
  },
  read: (f, S, form) => {
    const en = JSON.parse(JSON.stringify(S.i18n?.en || {}));
    for (const el of form.querySelectorAll("[name^='en__']")) {
      const path = el.name.slice(4);
      const v = el.value.trim();
      if (v) enSet(en, path, v);
      else if (enGet(en, path) != null) enSet(en, path, undefined);
    }
    // Prekių puslapių punktų sąrašai: piktogramos - iš lietuviškų
    for (const [type, o] of Object.entries(en.pdp || {}))
      for (const [blk, b] of Object.entries(o || {}))
        if (Array.isArray(b?.items)) b.items = b.items.map((it, i) => ({ ico: S.pdp?.[type]?.[blk]?.items?.[i]?.ico, ...(it || {}) }));
    return { next: { i18n: { ...(S.i18n || {}), en: JSON.parse(JSON.stringify(en)) } }, errors: [] };
  },
  sum: S => {
    const rows = enGroups(S).flatMap(([, r]) => r);
    const done = rows.filter(([p]) => String(enGet(S.i18n?.en || {}, p) || "").trim()).length;
    return rows.length ? `${done} iš ${rows.length}` : "-";
  }
};
