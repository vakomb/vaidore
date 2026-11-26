// 19 - „Pranešti, kai bus“ (išparduotam kvapui, stock: 0): el. paštas įrašomas į duomenų bazę (restock_requests -
// matoma administravimo skydelyje). Be duomenų bazės - settings.notifyForm (pvz. Formspree) arba laiškas parduotuvei.
function openNotify(id) {
  const p = BY_ID.get(id);
  if (!p) return;
  openSheet({
    title: t("notify.cta"),
    html: `<form class="sheetPad notify" novalidate>
<p class="notifyLead">${t("notify.lead", { name: `<b>${esc(L(p, "name"))}</b>` })}</p>
<label class="field"><span>${t("form.email")}</span><input type="email" name="email" autocomplete="email" inputmode="email" required placeholder="${t("form.emailPh")}" value="${esc(auth.user?.email || "")}" /></label>
<p class="formErr" role="alert" hidden></p>
<button class="btn primary block" type="submit">${glyph("bell")}${t("notify.submit")}</button>
<p class="qzHint">${t("notify.privacy", { link: `<a href="privatumas">${t("notify.privacyLink")}</a>` })}</p>
</form>`
  });
  const form = $("#sheetBody form");
  const input = form.elements.email;
  requestAnimationFrame(() => input.focus());
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".formErr", form);
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      err.hidden = false;
      err.textContent = t("form.emailBad");
      input.focus();
      return;
    }
    err.hidden = true;
    if (SB) {
      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      try {
        await sbRest("restock_requests", { method: "POST", body: { product_id: p.id, email }, anon: true, prefer: "return=minimal" });
      } catch (ex) {
        if (ex.code !== "23505") {
          logError("restock", ex);
          btn.disabled = false;
          err.hidden = false;
          err.textContent = t("errors.sendFail");
          return;
        }
      }
      track("Pranešti, kai bus", { kvapas: p.name });
      closeSheet();
      toast(t("notify.done"), { icon: "bell" });
      return;
    }
    if (!SET.notifyForm) {
      location.href = `mailto:${SET.company.email}?subject=${encodeURIComponent(`Pranešti, kai bus: ${p.name}`)}&body=${encodeURIComponent(email)}`;
      return;
    }
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      const r = await fetch(SET.notifyForm, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, kvapas: p.name, id: p.id, _subject: `Pranešti, kai bus: ${p.name}` })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      track("Pranešti, kai bus", { kvapas: p.name });
      closeSheet();
      toast(t("notify.done"), { icon: "bell" });
    } catch (ex) {
      logError("notify", ex);
      btn.disabled = false;
      err.hidden = false;
      err.textContent = t("errors.sendFail");
    }
  });
}
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-notify]");
  if (b) openNotify(b.dataset.notify);
});
