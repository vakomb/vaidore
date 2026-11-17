// 13 – Kvapo importas iš Allegro (admin/kvapai/importas): skelbimo nuoroda, žymelė „Į Vaidore“ arba nukopijuotas
// tekstas → serveris (shop/admin „import“, supabase/functions/_shared/import.js) perskaito faktus ir parašo lietuvišką
// kvapo kortelę (su ANTHROPIC_API_KEY – Claude, be jo – žodynas ir šablonai) → peržiūra → „Sukurti kvapą“ atidaro
// užpildytą naujo kvapo formą (A.importDraft), kurioje dar pasitikrinama, įrašoma kaina ir nuotraukos.
// Iš skelbimo imami tik faktai: aprašymas – savas, nuotraukos neimamos (autorių teisės).
const IMP = { draft: null, facts: null, ai: null };

// Žymelė: Allegro puslapyje surenka JSON-LD (pavadinimas, aprašymas, kaina), parametrus ir sudėtį ir atidaro šį puslapį
function importBookmarklet() {
  const target = new URL("admin/kvapai/importas", document.baseURI).href;
  const code = `(()=>{try{const L=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>{try{return JSON.parse(s.textContent)}catch(e){return null}}).flat().find(x=>x&&x['@type']==='Product')||{};const t=document.body.innerText;const i=t.indexOf('Parametry');const j=t.indexOf('Dodatkowe informacje',i);const o=Array.isArray(L.offers)?L.offers[0]:(L.offers||{});const d={url:location.href.split('?')[0],title:L.name||document.title,brand:typeof L.brand==='object'?(L.brand&&L.brand.name)||'':L.brand||'',gtin:L.gtin||'',price:o.price||'',cur:o.priceCurrency||'',desc:L.description||'',text:i>=0?t.slice(i,j>i?j:i+8000):t.slice(0,8000)};window.open('${target}#imp='+encodeURIComponent(JSON.stringify(d)),'_blank')}catch(e){alert('Vaidore: '+e.message)}})()`;
  return `javascript:${encodeURIComponent(code)}`;
}

async function renderImport(main, seq) {
  const fromHash = (() => {
    const m = location.hash.match(/[#&]imp=([^&]+)/);
    if (!m) return null;
    history.replaceState(history.state, "", location.pathname + location.search);
    try {
      return JSON.parse(decodeURIComponent(m[1]));
    } catch {
      return null;
    }
  })();
  main.innerHTML = `<nav class="crumbs admCrumbs"><a href="admin/kvapai" data-nav>${glyph("chev-left")}Kvapai</a></nav>
${pageHead("Importuoti iš Allegro", "Iš skelbimo – lietuviškas aprašymas, natos ir savybės. Prieš išsaugant viską peržiūrėsite.")}
<div class="impCols">
<section class="admCard"><h2>Skelbimas</h2>
<form class="admForm" id="impForm" novalidate>
<label class="field"><span>Allegro nuoroda</span><input name="url" type="url" inputmode="url" autocomplete="off" placeholder="https://allegro.pl/oferta/…" /><small>Įklijuokite skelbimo adresą ir spauskite „Sugeneruoti“</small></label>
<details class="impAlt" id="impAlt"><summary>${glyph("doc")}Arba įklijuokite skelbimo tekstą</summary>
<p class="admNote">Jei Allegro neleidžia nuskaityti automatiškai: atidarykite skelbimą, pažymėkite visą puslapį (kompiuteryje Ctrl + A, telefone – „Pažymėti viską“), nukopijuokite ir įklijuokite čia.</p>
<textarea name="text" rows="7" placeholder="Parametry… Opis… Nuta głowy: …"></textarea></details>
<p class="formErr" role="alert" hidden></p>
<button class="btn primary" type="submit">${glyph("spark")}Sugeneruoti</button>
</form>
<p class="admNote impAiNote" id="impAi">Tikrinama…</p>
</section>
<section class="admCard impBm"><h2>Žymelė „Į Vaidore“</h2>
<p class="admNote">Kompiuteryje nutempkite mygtuką į naršyklės žymelių juostą. Atidarę Allegro skelbimą, paspauskite žymelę – duomenys atkeliaus čia ir aprašymas bus sugeneruotas automatiškai. Veikia ir tada, kai Allegro serveriui neleidžia.</p>
<a class="btn ghost" id="impBmLink" href="#" draggable="true" title="Nutempkite į žymelių juostą">${glyph("tag")}Į Vaidore</a>
</section>
</div>
<div id="impResult"></div>`;
  hydrateIcons(main);
  $("#impBmLink").setAttribute("href", importBookmarklet());
  $("#impBmLink").addEventListener("click", e => {
    e.preventDefault();
    toast("Nutempkite mygtuką į žymelių juostą, tada spauskite jį Allegro skelbime", { icon: "info", ms: 4200 });
  });
  shopAdmin({ action: "import-status" })
    .then(d => {
      if (stale(seq)) return;
      IMP.ai = !!d.ai;
      $("#impAi").innerHTML = d.ai
        ? `${glyph("spark")}<span>Tekstus rašo dirbtinis intelektas (Claude) – sklandus, savas aprašymas.</span>`
        : `${glyph("info")}<span>Dirbtinis intelektas neįjungtas – aprašymas sudaromas iš šablono. Aukščiausiai kokybei Supabase → Edge Functions → Secrets pridėkite <b>ANTHROPIC_API_KEY</b>.</span>`;
      hydrateIcons($("#impAi"));
    })
    .catch(() => ($("#impAi").hidden = true));
  const form = $("#impForm");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const url = form.elements.url.value.trim();
    const text = form.elements.text.value.trim();
    if (!url && !text) return showImportErr("Įklijuokite Allegro nuorodą arba skelbimo tekstą");
    busy($("button[type=submit]", form), () => runImport({ url, text }, seq));
  });
  main.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-imp-create]")) {
      A.importDraft = structuredClone(IMP.draft);
      navigate("admin/kvapai/naujas");
    }
    if (t?.closest("[data-imp-again]")) form.requestSubmit();
  });
  if (fromHash) {
    form.elements.url.value = fromHash.url || "";
    await busy($("button[type=submit]", form), () => runImport({ data: fromHash }, seq));
  }
}
function showImportErr(msg) {
  const err = $("#impForm .formErr");
  if (!err) return;
  err.textContent = msg || "";
  err.hidden = !msg;
}
async function runImport(body, seq) {
  showImportErr("");
  let d;
  try {
    d = await shopAdmin({ action: "import", ...body });
  } catch (err) {
    if (stale(seq)) return;
    showImportErr(err.message);
    if (/žymelę|tekstą/.test(err.message)) {
      $("#impAlt").open = true;
      $("#impForm textarea").focus();
    }
    return;
  }
  if (stale(seq)) return;
  IMP.draft = d.draft;
  IMP.facts = d.facts;
  const exists = (await sbRest(`products?select=id,name&id=eq.${encodeURIComponent(d.draft.id)}`).catch(() => []))?.[0];
  if (stale(seq)) return;
  paintImport(d, exists);
}
function paintImport(d, exists) {
  const x = d.draft;
  const f = d.facts;
  const fam = VD.CAT.families.find(v => v.id === x.family)?.name || x.family;
  const row = (k, v) => (v ? `<div class="impRow"><dt>${esc(k)}</dt><dd>${v}</dd></div>` : "");
  const chips = list => (list?.length ? `<span class="impChips">${list.map(n => `<span class="chip">${esc(n)}</span>`).join("")}</span>` : `<span class="admMuted">–</span>`);
  const warn = [
    exists && `Kvapas su adresu „${esc(x.id)}“ jau yra (<a href="admin/kvapai/${esc(exists.id)}" data-nav>${esc(exists.name)}</a>) – formoje pakeiskite pavadinimą ar adresą.`,
    x.untranslated?.length && `Neišverstos natos: ${x.untranslated.map(esc).join(", ")} – pataisykite formoje.`,
    d.aiError && `Dirbtinis intelektas neatsakė (${esc(d.aiError.slice(0, 120))}) – naudotas šablonas.`,
    !x.sizes?.length && "Skelbime neradau tūrio – įrašykite formoje.",
    "Kainą, likutį ir nuotraukas įrašykite formoje (nuotraukos iš skelbimo neimamos – autorių teisės)."
  ].filter(Boolean);
  const box = $("#impResult");
  box.innerHTML = `<div class="impCols">
<section class="admCard impDraft"><div class="impHead"><h2>Vaidore kortelė</h2><span class="pill ${x.ai ? "impAiPill" : ""}">${x.ai ? `${glyph("spark")}Claude` : "Šablonas"}</span></div>
<div class="impTitle"><b>${esc(x.name)}</b><small>vaidore.com/kvepalai/${esc(x.id)}</small></div>
<p class="impTag">${esc(x.tagline)}</p>
<p class="impDesc">${esc(x.description)}</p>
<dl class="impList">
${row("Kam", esc(VD.GENDER_NAME[x.gender] || x.gender))}
${row("Koncentracija", esc(VD.CONC_NAME[x.conc] || x.conc))}
${row("Kvapo šeima", esc(fam))}
${row("Viršutinės natos", chips(x.notes.top))}
${row("Širdies natos", chips(x.notes.heart))}
${row("Bazinės natos", chips(x.notes.base))}
${row("Ilgaamžiškumas", esc(`${x.longevity} – ${VD.LASTS[x.longevity]}`))}
${row("Sklaida", esc(`${x.sillage} – ${VD.LEVEL[x.sillage]}`))}
${row("Metų laikai", esc(x.seasons.map(s => VD.SEASON_NAME[s]).join(", ")))}
${row("Paros metas", esc(x.times.map(t => (t === "diena" ? "Diena" : "Vakaras")).join(", ")))}
${row("Tūris", esc(x.sizes.map(s => `${s.ml} ml`).join(", ")))}
${row("Įkvėpta", esc(x.inspired))}
${row("Ingredientai", x.ingredients ? `<small class="impInci">${esc(x.ingredients)}</small>` : "")}
</dl>
${warn.length ? `<ul class="impWarn">${warn.map(w => `<li>${glyph("info")}<span>${w}</span></li>`).join("")}</ul>` : ""}
<div class="impActs"><button class="btn ghost" type="button" data-imp-again>${glyph("spark")}Generuoti iš naujo</button><button class="btn primary" type="button" data-imp-create>${glyph("check")}Sukurti kvapą</button></div>
</section>
<section class="admCard impSrc"><h2>Iš skelbimo</h2>
<dl class="impList">
${row("Skelbimas", f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.title || f.url)}</a>` : esc(f.title))}
${row("Prekės ženklas", esc(f.brand))}
${row("Kaina", esc(f.price))}
${row("GTIN", esc(f.gtin))}
${row("Kvapų grupė", esc(f.group))}
${row("Natos", [f.notes.top, f.notes.heart, f.notes.base].map(l => esc(l.join(", ") || "–")).join("<br />"))}
${row("Tūris", f.ml ? `${f.ml} ml` : "")}
${row("Koncentracija", esc([f.conc, f.concPct ? `${f.concPct} %` : ""].filter(Boolean).join(" · ")))}
</dl>
${d.blocked ? `<p class="admNote">Allegro neleido serveriui atidaryti puslapio – naudotas įklijuotas tekstas.</p>` : ""}
</section></div>`;
  hydrateIcons(box);
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}
