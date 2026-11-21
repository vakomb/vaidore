// 26 - Naujienlaiškis (kaip parfumada.lt - poraštės viršuje): el. paštas įrašomas į duomenų bazę (newsletter, RLS: tik
// įrašyti), tada Edge Function „shop/newsletter“ išsiunčia sveikinimo laišką su atsisakymo nuoroda. Jau užsiprenumeravusiam
// rodoma ta pati padėka (adresų sąrašo neatskleidžiame). Atsisakymas - /naujienlaiskis?atsisakyti=<raktas> (13-info.js).
function newsletterFormHTML(source = "footer") {
  return `<form class="news" data-news="${esc(source)}" novalidate>
<h2 class="newsTitle">Prenumeruokite naujienlaiškį</h2>
<p class="newsLead">Pirmi sužinokite apie naujus kvapus ir nuolaidas. Laiškų siunčiame retai.</p>
<div class="newsField"><input type="email" name="email" autocomplete="email" inputmode="email" required placeholder="El. pašto adresas" aria-label="El. pašto adresas" /><button type="submit" aria-label="Prenumeruoti">${glyph("arrow-right")}</button></div>
<p class="newsMsg" role="status" aria-live="polite" hidden></p>
<p class="newsNote">Prenumeruodami sutinkate gauti naujienas el. paštu. Atsisakyti galite bet kada - nuoroda kiekviename laiške. <a href="privatumas">Privatumo politika</a></p>
</form>`;
}
document.addEventListener("submit", async e => {
  const form = e.target instanceof Element && e.target.closest("form[data-news]");
  if (!form) return;
  e.preventDefault();
  const input = form.elements.email;
  const msg = $(".newsMsg", form);
  const btn = $("button[type=submit]", form);
  const say = (t, bad = false) => {
    msg.hidden = false;
    msg.textContent = t;
    msg.classList.toggle("bad", bad);
  };
  const email = input.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    say("Patikrinkite el. pašto adresą", true);
    input.focus();
    return;
  }
  if (!SB) {
    location.href = `mailto:${SET.company.email}?subject=${encodeURIComponent("Naujienlaiškis")}&body=${encodeURIComponent(`Noriu gauti naujienas: ${email}`)}`;
    return;
  }
  btn.disabled = true;
  try {
    await sbRest("newsletter", { method: "POST", body: { email, source: form.dataset.news || "" }, anon: true, prefer: "return=minimal" });
  } catch (ex) {
    if (ex.code !== "23505") {
      logError("newsletter", ex);
      btn.disabled = false;
      say("Nepavyko - bandykite dar kartą", true);
      return;
    }
  }
  // Sveikinimo laiškas - nelaukiame (jei funkcija dar neįdiegta, prenumerata vis tiek įrašyta)
  sbFn("shop/newsletter", { method: "POST", body: JSON.stringify({ action: "welcome", email }) }).catch(() => {});
  track("Naujienlaiškis", { vieta: form.dataset.news || "" });
  form.reset();
  btn.disabled = false;
  say("Ačiū! Patikrinkite el. paštą - atsiuntėme pasisveikinimo laišką.");
});

// /naujienlaiskis - prenumerata arba atsisakymas (?atsisakyti=<raktas> iš laiško)
function infoNewsletterHTML() {
  const token = new URLSearchParams(location.search).get("atsisakyti");
  return token
    ? `<header class="pageHead"><h1>Naujienlaiškis</h1></header><div class="empty" id="newsUnsub"><h3>Atsisakoma…</h3></div>`
    : `<header class="pageHead"><h1>Naujienlaiškis</h1></header><div class="newsPage">${newsletterFormHTML("page")}</div>`;
}
async function newsletterUnsubscribe() {
  const token = new URLSearchParams(location.search).get("atsisakyti");
  const box = $("#newsUnsub");
  if (!token || !box) return;
  const done = ok =>
    (box.innerHTML = ok
      ? `<h3>Naujienlaiškio atsisakėte</h3><p>Daugiau naujienų nesiųsime. Apsigalvojus - užsiprenumeruoti galite poraštėje.</p><a class="btn primary" href="./" data-nav>Į pradžią</a>`
      : `<h3>Nepavyko atsisakyti</h3><p>Nuoroda neteisinga arba pasenusi. Parašykite mums - <a href="mailto:${esc(SET.company.email)}">${esc(SET.company.email)}</a>.</p>`);
  try {
    const r = await sbFn("shop/newsletter", { method: "POST", body: JSON.stringify({ action: "unsubscribe", token }) });
    done(r.ok);
  } catch {
    done(false);
  }
}
