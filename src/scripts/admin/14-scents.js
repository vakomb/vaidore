// 14 – Kvapų sąrašas (v15, lentelė scents): admin/kvapai/kvapu-sarasas. Kvapą galima pervadinti, pakeisti originalo
// kvapą („Įkvėpti …“; pasirinktinai – ir susietuose produktuose) arba ištrinti. Ištrynus produktai lieka, tik atsiejami.
const scentState = { rows: [], counts: new Map() };

async function renderScents(main, seq) {
  main.innerHTML = pageHead("Kvapų sąrašas") + loading();
  const [rows, products] = await Promise.all([sbRest("scents?select=*&order=name.asc").catch(() => null), sbRest("products?select=id,scent_id")]);
  if (stale(seq)) return;
  scentState.rows = rows || [];
  scentState.counts = new Map();
  for (const p of products || []) if (p.scent_id) scentState.counts.set(p.scent_id, (scentState.counts.get(p.scent_id) || 0) + 1);
  main.innerHTML = `<nav class="crumbs admCrumbs"><a href="admin/kvapai" data-nav>${glyph("chev-left")}Produktai</a></nav>
${pageHead("Kvapų sąrašas", plural(scentState.rows.length, "kvapas", "kvapai", "kvapų"))}
<p class="admNote">Šie kvapai rodomi naujo produkto lauke „Kvapas“. Kvapas sukuriamas automatiškai, kai išsaugote naują produktą su nauju kvapu.</p>
<div class="group">${
    rows === null
      ? `<div class="row"><span class="rowTxt admMuted">Kvapų lentelės dar nėra (reikia migracijos 20261120120000)</span></div>`
      : scentState.rows.length
        ? scentState.rows
            .map(
              x => `<button class="row" type="button" data-scent-edit="${esc(x.id)}"><span class="rowIco" style="background:${esc(x.look?.liquid || "var(--ink3)")}">${glyph("drop")}</span><span class="rowTxt">${esc(x.name)}<small>${
                x.inspired ? `Įkvėpti ${esc(x.inspired)}` : "Originalo kvapas nenurodytas"
              }</small></span><span class="admMuted">${plural(scentState.counts.get(x.id) || 0, "produktas", "produktai", "produktų")}</span><span class="chev">${glyph("chev-right")}</span></button>`
            )
            .join("")
        : `<div class="row"><span class="rowTxt admMuted">Kvapų dar nėra</span></div>`
  }</div>`;
  hydrateIcons(main);
  main.addEventListener("click", e => {
    const b = e.target instanceof Element ? e.target.closest("[data-scent-edit]") : null;
    if (b) openScent(scentState.rows.find(x => x.id === b.dataset.scentEdit));
  });
}

function openScent(x) {
  if (!x) return;
  const n = scentState.counts.get(x.id) || 0;
  openSheet({
    title: "Kvapas",
    html: `<form class="sheetPad admForm" novalidate>
<label class="field"><span>Pavadinimas</span><input name="name" required maxlength="60" value="${esc(x.name)}" /><small>Rodomas lauke „Kvapas“ ir naujų produktų pavadinimuose (pvz. „Kvapni žvakė ${esc(x.name)}“)</small></label>
<label class="field"><span>Originalo kvapas (įkvėpta)</span><input name="inspired" maxlength="120" value="${esc(x.inspired || "")}" placeholder="pvz. Emporio Armani – My Way" /><small>Tuščia – originalas nenurodomas</small></label>
${
  n
    ? `<label class="admToggleRow"><span><b>Pakeisti ir susietuose produktuose</b><small>Originalo kvapas bus pakeistas ${plural(n, "produktui", "produktams", "produktų")} („Įkvėpti …“ parduotuvėje)</small></span><input type="checkbox" name="apply" class="admSwitchInp" checked /></label>`
    : ""
}
<p class="formErr" role="alert" hidden></p>
<div class="confirmActs"><button class="btn danger" type="button" data-scent-del>${glyph("trash")}Ištrinti</button><button class="btn primary" type="submit">Išsaugoti</button></div>
</form>`
  });
  const form = $("#sheetBody form");
  form.addEventListener("click", async e => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-scent-del]")) return;
    const ok = await askConfirm(
      `„${x.name}“ bus ištrintas iš kvapų sąrašo.${n ? ` ${plural(n, "produktas liks", "produktai liks", "produktų liks")} parduotuvėje – tik nebebus susieti su šiuo kvapu.` : ""}`,
      { title: "Ištrinti kvapą?", ok: "Ištrinti", danger: true }
    );
    if (!ok) return;
    try {
      if (n) await sbRest(`products?scent_id=eq.${encodeURIComponent(x.id)}`, { method: "PATCH", body: { scent_id: null } });
      await sbRest(`scents?id=eq.${encodeURIComponent(x.id)}`, { method: "DELETE" });
      closeSheet();
      toast("Kvapas ištrintas", { icon: "check" });
      render("kvapai/kvapu-sarasas");
    } catch (err) {
      toast(errText(err), { icon: "info", ms: 4200 });
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), async () => {
      const name = form.elements.name.value.trim();
      const inspired = form.elements.inspired.value.trim();
      const err = $(".formErr", form);
      err.hidden = !!name;
      err.textContent = name ? "" : "Įrašykite pavadinimą";
      if (!name) return;
      await sbRest(`scents?id=eq.${encodeURIComponent(x.id)}`, { method: "PATCH", body: { name, inspired } });
      const apply = n && form.elements.apply?.checked && inspired !== (x.inspired || "");
      if (apply) await sbRest(`products?scent_id=eq.${encodeURIComponent(x.id)}`, { method: "PATCH", body: { inspired } });
      closeSheet();
      if (apply) await catalogChanged("Išsaugota – originalas pakeistas ir produktuose");
      else toast("Išsaugota", { icon: "check" });
      render("kvapai/kvapu-sarasas");
    });
  });
}
