// 11 - Naujienlaiškis: prenumeratoriai (iš poraštės / /naujienlaiskis), CSV, laiškas visiems (shop/admin „newsletter-send“,
// Resend; kiekviename laiške - atsisakymo nuoroda). Pirma galima išsiųsti bandomąjį laišką sau.
async function renderNewsletter(main, _param, seq) {
  const back = hubBack();
  main.innerHTML = pageHTML({ title: "Naujienlaiškis", back, body: loading(4) });
  let rows;
  try {
    rows = await sbRest("newsletter?select=id,email,source,created_at,welcomed_at,unsubscribed_at&order=created_at.desc&limit=5000");
  } catch (ex) {
    if (stale(seq)) return;
    main.innerHTML = pageHTML({ title: "Naujienlaiškis", back, body: emptyBox("Lentelės dar nėra", "Paleiskite supabase/migrations/20261117000100_newsletter.sql (Supabase → SQL Editor).") });
    return;
  }
  if (stale(seq)) return;
  const active = rows.filter(r => !r.unsubscribed_at);
  main.innerHTML = pageHTML({
    title: "Naujienlaiškis",
    back,
    cls: "axNarrow",
    sub: `Prenumeruoja <b>${active.length}</b>${rows.length > active.length ? ` · atsisakė ${rows.length - active.length}` : ""}`,
    actions: rows.length ? barBtn("doc", "Atsisiųsti CSV", "data-news-csv") : "",
    body: `<form class="admForm" id="newsForm" novalidate>
<h2 class="igHead">Laiškas prenumeratoriams</h2>
<div class="ig"><label class="field axField"><span>Tema</span><input name="subject" maxlength="150" required placeholder="Naujas kvapas - Vanor" /></label>
${
  rows.some(r => "lang" in r)
    ? `<label class="field axField"><span>Kam</span><select name="lang"><option value="">Visiems (${active.length})</option><option value="lt">Lietuviškai (${active.filter(r => (r.lang || "lt") === "lt").length})</option><option value="en">Angliškai - EN (${active.filter(r => r.lang === "en").length})</option></select></label>`
    : ""
}<label class="field axField stack"><span>Tekstas</span><textarea name="text" rows="8" maxlength="20000" required placeholder="Sveiki!&#10;&#10;…"></textarea></label></div>
<p class="igFoot">Tuščia eilutė - nauja pastraipa. Apačioje automatiškai - nuoroda į parduotuvę ir „Atsisakyti“ (gavėjo kalba). Angliškiems prenumeratoriams laišką rašykite angliškai ir siųskite pasirinkę „Angliškai - EN“.</p>
<div class="axActRow"><button class="btn ghost" type="button" data-news-test>${glyph("mail")}Bandomasis man</button><button class="btn primary" type="submit"${attr(!active.length, "disabled")}>${glyph("mail")}Siųsti ${plural(
      active.length,
      "prenumeratoriui",
      "prenumeratoriams",
      "prenumeratorių"
    )}</button></div>
</form>
${
  rows.length
    ? `<h2 class="igHead">Prenumeratoriai</h2><div class="ig"><ul class="admEmails">${rows
        .slice(0, 500)
        .map(
          r =>
            `<li data-nl="${esc(r.id)}"><span>${esc(r.email)}</span><small>${fmtDate(r.created_at)}${r.lang === "en" ? " · EN" : ""}${r.unsubscribed_at ? " · atsisakė" : r.welcomed_at ? " · patvirtinta laišku" : ""}</small><button class="roundBtn" type="button" data-nl-del aria-label="Ištrinti ${esc(r.email)}">${glyph("trash")}</button></li>`
        )
        .join("")}</ul></div>${rows.length > 500 ? `<p class="igFoot">Rodomi 500 naujausių - visus rasite CSV.</p>` : ""}`
    : emptyBox("Prenumeratorių dar nėra", "Kai pirkėjai įrašys el. paštą poraštėje, jie atsiras čia.")
}`
  });
  hydrateIcons(main);
  const form = $("#newsForm", main);
  const send = async test => {
    const subject = form.elements.subject.value.trim();
    const text = form.elements.text.value;
    if (!subject || !text.trim()) return toast("Įrašykite temą ir tekstą", { icon: "info" });
    const only = form.elements.lang?.value || "";
    const n = only ? active.filter(r => (r.lang || "lt") === only).length : active.length;
    if (!test && !(await askConfirm(`Laiškas „${subject}“ bus išsiųstas ${plural(n, "prenumeratoriui", "prenumeratoriams", "prenumeratorių")}. Atšaukti nebus galima.`, { title: only ? "Siųsti?" : "Siųsti visiems?", ok: "Siųsti" })))
      return;
    const d = await shopAdmin({ action: "newsletter-send", subject, text, test, ...(only ? { lang: only } : {}) });
    toast(test ? "Bandomasis laiškas išsiųstas jums" : `Išsiųsta ${d.sent} iš ${d.total}`, { icon: "mail", ms: 4000 });
  };
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), () => send(false));
  });
  main.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("[data-news-test]")) return busy(t.closest("button"), () => send(true));
    if (t?.closest("[data-news-csv]"))
      return downloadFile(
        `naujienlaiskis-${new Date().toISOString().slice(0, 10)}.csv`,
        csv([["El. paštas", "Užsiprenumeravo", "Šaltinis", "Atsisakė"], ...rows.map(r => [r.email, fmtDate(r.created_at), r.source, r.unsubscribed_at ? fmtDate(r.unsubscribed_at) : ""])])
      );
    const del = t?.closest("[data-nl-del]");
    if (del) {
      const li = del.closest("[data-nl]");
      busy(del, async () => {
        if (!(await askConfirm(`${$("span", li).textContent} bus ištrintas iš sąrašo (pvz. pirkėjo prašymu).`, { title: "Ištrinti?", ok: "Ištrinti", danger: true }))) return;
        await sbRest(`newsletter?id=eq.${li.dataset.nl}`, { method: "DELETE" });
        li.remove();
      });
    }
  });
}
