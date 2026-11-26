// 26 - Naujienlaiškis (kaip parfumada.lt - poraštės viršuje): el. paštas įrašomas į duomenų bazę (newsletter, RLS: tik
// įrašyti), tada Edge Function „shop/newsletter“ išsiunčia sveikinimo laišką su atsisakymo nuoroda. Jau užsiprenumeravusiam
// rodoma ta pati padėka (adresų sąrašo neatskleidžiame). Atsisakymas - /naujienlaiskis?atsisakyti=<raktas> (13-info.js).
function newsletterFormHTML(source = "footer") {
  return `<form class="news" data-news="${esc(source)}" novalidate>
<h2 class="newsTitle">${t("news.h")}</h2>
<p class="newsLead">${t("news.lead")}</p>
<div class="newsField"><input type="email" name="email" autocomplete="email" inputmode="email" required placeholder="${t("news.ph")}" aria-label="${t("news.ph")}" /><button type="submit" aria-label="${t("news.submit")}">${glyph("arrow-right")}</button></div>
<p class="newsMsg" role="status" aria-live="polite" hidden></p>
<p class="newsNote">${t("news.note")} <a href="privatumas">${t("ftr.privacy")}</a></p>
</form>`;
}
document.addEventListener("submit", async e => {
  const form = e.target instanceof Element && e.target.closest("form[data-news]");
  if (!form) return;
  e.preventDefault();
  const input = form.elements.email;
  const msg = $(".newsMsg", form);
  const btn = $("button[type=submit]", form);
  const say = (tx, bad = false) => {
    msg.hidden = false;
    msg.textContent = tx;
    msg.classList.toggle("bad", bad);
  };
  const email = input.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    say(t("form.emailBad"), true);
    input.focus();
    return;
  }
  if (!SB) {
    location.href = `mailto:${SET.company.email}?subject=${encodeURIComponent("Naujienlaiškis")}&body=${encodeURIComponent(`Noriu gauti naujienas: ${email}`)}`;
    return;
  }
  btn.disabled = true;
  try {
    await sbRest("newsletter", { method: "POST", body: { email, source: form.dataset.news || "", ...(LANG !== "lt" ? { lang: LANG } : {}) }, anon: true, prefer: "return=minimal" });
  } catch (ex) {
    if (ex.code !== "23505") {
      logError("newsletter", ex);
      btn.disabled = false;
      say(t("errors.tryAgain"), true);
      return;
    }
  }
  // Sveikinimo laiškas - nelaukiame (jei funkcija dar neįdiegta, prenumerata vis tiek įrašyta)
  sbFn("shop/newsletter", { method: "POST", body: JSON.stringify({ action: "welcome", email }) }).catch(() => {});
  track("Naujienlaiškis", { vieta: form.dataset.news || "" });
  form.reset();
  btn.disabled = false;
  say(t("news.thanks"));
});

// /naujienlaiskis - prenumerata arba atsisakymas (?atsisakyti=<raktas> iš laiško)
function infoNewsletterHTML() {
  const token = urlParams().get("atsisakyti");
  return token
    ? `<header class="pageHead"><h1>${t("news.title")}</h1></header><div class="empty" id="newsUnsub"><h3>${t("news.unsubbing")}</h3></div>`
    : `<header class="pageHead"><h1>${t("news.title")}</h1></header><div class="newsPage">${newsletterFormHTML("page")}</div>`;
}
async function newsletterUnsubscribe() {
  const token = urlParams().get("atsisakyti");
  const box = $("#newsUnsub");
  if (!token || !box) return;
  const done = ok =>
    (box.innerHTML = ok
      ? `<h3>${t("news.unsubbed")}</h3><p>${t("news.unsubbedText")}</p><a class="btn primary" href="./" data-nav>${t("nf.home")}</a>`
      : `<h3>${t("news.unsubFail")}</h3><p>${t("news.unsubFailText", { email: `<a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a>` })}</p>`);
  try {
    const r = await sbFn("shop/newsletter", { method: "POST", body: JSON.stringify({ action: "unsubscribe", token }) });
    done(r.ok);
  } catch {
    done(false);
  }
}
