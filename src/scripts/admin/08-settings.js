// 08 – Nustatymai (lentelė settings, viena eilutė id=1, laukas data – tas pats formatas kaip catalog.json „settings“).
// Grupės kaip iOS „Nustatymai“ – kiekviena savo ekrane admin/nustatymai/<grupė>: parduotuvė, pristatymas ir grąžinimas,
// mėginukai ir pakavimas, įmonės rekvizitai, lankytojų matavimas. Vitrinos dalys „Prekių kortelės“ ir „Mūsų istorija“ –
// tas pats mechanizmas (admin/vitrina/korteles, admin/vitrina/istorija). Saugant sujungiama su naujausia versija
// duomenų bazėje – kiti laukai neprarandami. Čia pat – „Daugiau“ ekranas (admin/daugiau).
const COUNTRY_NAME = { LT: "Lietuva", LV: "Latvija", EE: "Estija" };
const unfilled = v => (/^\[.*\]$/.test(String(v || "")) ? "" : v);
const sfld = (name, label, value, { type = "text", ph = "", mode = "", max = 200 } = {}) =>
  fieldHTML(label, `<input name="${name}" type="${type}"${mode ? ` inputmode="${mode}"` : ""} maxlength="${max}" value="${esc(value ?? "")}"${ph ? ` placeholder="${esc(ph)}"` : ""} />`);
const sarea = (name, label, value, { ph = "", rows = 4 } = {}) => fieldHTML(label, `<textarea name="${name}" rows="${rows}" maxlength="1500"${ph ? ` placeholder="${esc(ph)}"` : ""}>${esc(value ?? "")}</textarea>`, { stack: true });
const sswitch = (name, label, on) => `<label class="axField axSwitchRow"><span>${label}</span><input type="checkbox" name="${name}" class="admSwitchInp"${attr(on, "checked")} /></label>`;
const money = (f, n) => Math.round(num(f[n].value.trim()) * 100) / 100;
const int = (f, n) => Math.round(num(f[n].value.trim()));

// Kiekviena grupė: pavadinimas, laukai (html), nuskaitymas (read → { next, errors }), santrauka „Daugiau“ ekrane
const SET_PAGES = {
  parduotuve: {
    title: "Parduotuvė",
    html: S => `${groupHTML(`${sfld("shop", "Pavadinimas", S.shop, { max: 40 })}${sfld("tagline", "Šūkis", S.tagline, { max: 160, ph: "Viena eilutė" })}`, { foot: "Šūkis – pradžios puslapyje ir paieškos sistemose." })}
${groupHTML(`${sfld("freeShippingFrom", "Nemokamai nuo, €", dec(S.freeShippingFrom), { mode: "decimal" })}${sfld("maxQty", "Daugiausia vnt. eilutėje", S.maxQty, { mode: "numeric" })}`, { head: "Krepšelis" })}`,
    read: f => {
      const next = { shop: f.shop.value.trim() || "Vaidore", tagline: f.tagline.value.trim(), freeShippingFrom: money(f, "freeShippingFrom"), maxQty: int(f, "maxQty") };
      return { next, errors: [!(next.freeShippingFrom >= 0) && "Nemokamo pristatymo riba – skaičius", !(next.maxQty >= 1) && "Daugiausia vienetų – bent 1"].filter(Boolean) };
    },
    sum: S => esc(S.shop || "")
  },
  pristatymas: {
    title: "Pristatymas ir grąžinimas",
    html: S => `${(S.shipping || [])
      .map((o, i) =>
        groupHTML(
          `${sfld(`ship_name_${i}`, "Pavadinimas", o.name, { max: 60 })}${sfld(`ship_price_${i}`, "Kaina, €", dec(o.price), { mode: "decimal" })}${sfld(`ship_days_${i}`, "Trukmė", o.days, { max: 30 })}`,
          { head: esc(o.id === "omniva" ? "Omniva paštomatas" : o.id === "dpd" ? "Kurjeris" : o.id) }
        )
      )
      .join("")}
${groupHTML(`${sfld("dispatch", "Išsiunčiame per", S.dispatch, { ph: "1–2 d. d.", max: 30 })}${sfld("returnDays", "Grąžinimas per, d.", S.returnDays, { mode: "numeric" })}`, { head: "Terminai" })}
<h2 class="igHead">Šalys</h2><div class="ig">${Object.entries(COUNTRY_NAME)
      .map(([cc, name]) => `<label class="admCheck axCheckRow"><span>${name}</span><input type="checkbox" name="countries" value="${cc}"${attr((S.countries || []).includes(cc), "checked")} /></label>`)
      .join("")}</div>`,
    read: (f, S, form) => {
      const shipping = (S.shipping || []).map((o, i) => ({ ...o, name: f[`ship_name_${i}`].value.trim() || o.name, price: money(f, `ship_price_${i}`), days: f[`ship_days_${i}`].value.trim() }));
      const countries = new FormData(form).getAll("countries");
      const next = { shipping, countries, dispatch: f.dispatch.value.trim(), returnDays: int(f, "returnDays") };
      return { next, errors: [shipping.some(o => !(o.price >= 0)) && "Pristatymo kaina – skaičius", !countries.length && "Pasirinkite bent vieną šalį", !(next.returnDays >= 0) && "Grąžinimo terminas – skaičius"].filter(Boolean) };
    },
    sum: S => {
      const p = (S.shipping || []).map(o => Number(o.price) || 0);
      return p.length ? `${plural(p.length, "būdas", "būdai", "būdų")} · nuo ${eur(Math.min(...p))}` : "—";
    }
  },
  meginukai: {
    title: "Mėginukai ir pakavimas",
    html: S => {
      const d = S.discovery || {};
      const sc = S.sampleCredit || {};
      const g = S.gift || {};
      return `${groupHTML(`${sfld("discName", "Pavadinimas", d.name, { max: 40 })}${sfld("discCount", "Mėginukų, vnt.", d.count, { mode: "numeric" })}${sfld("discPrice", "Kaina, €", dec(d.price), { mode: "decimal" })}${sfld(
        "discText",
        "Aprašymas",
        d.text,
        { max: 200 }
      )}`, { head: "Atradimų rinkinys" })}
${groupHTML(`${sfld("scDays", "Kodas galioja, d.", sc.days, { mode: "numeric" })}${sfld("scMin", "Kodas – nuo, €", dec(sc.minOrder), { mode: "decimal" })}`, { head: "Mėginukų kodas", foot: "Mėginukų kaina grąžinama nuolaidos kodu kitam užsakymui." })}
${groupHTML(`${sfld("giftPrice", "Kaina, €", dec(g.price), { mode: "decimal" })}${sfld("giftMax", "Rašteliukas, simb.", g.noteMax, { mode: "numeric" })}`, { head: "Dovanų pakavimas" })}`;
    },
    read: (f, S) => {
      const next = {
        discovery: { ...(S.discovery || {}), name: f.discName.value.trim(), count: int(f, "discCount"), price: money(f, "discPrice"), text: f.discText.value.trim() },
        sampleCredit: { ...(S.sampleCredit || {}), days: int(f, "scDays"), minOrder: money(f, "scMin") },
        gift: { ...(S.gift || {}), price: money(f, "giftPrice"), noteMax: int(f, "giftMax") }
      };
      return {
        next,
        errors: [
          !(next.discovery.count >= 2 && next.discovery.price > 0) && "Rinkinys – bent 2 mėginukai ir kaina",
          !(next.sampleCredit.days >= 1) && "Kodo galiojimas – bent 1 diena",
          !(next.gift.price >= 0 && next.gift.noteMax >= 10) && "Pakavimo kaina ir rašteliuko ilgis"
        ].filter(Boolean)
      };
    },
    sum: S => `Rinkinys ${eur(S.discovery?.price || 0)}`
  },
  imone: {
    title: "Įmonės rekvizitai",
    html: S => {
      const c = S.company || {};
      return groupHTML(
        `${sfld("coName", "Pavadinimas", unfilled(c.name), { ph: "UAB „…“" })}${sfld("coCode", "Įmonės kodas", unfilled(c.code))}${sfld("coVat", "PVM kodas", unfilled(c.vat), { ph: "LT…" })}${sfld(
          "coAddress",
          "Adresas",
          unfilled(c.address)
        )}${sfld("coPhone", "Telefonas", unfilled(c.phone), { type: "tel" })}${sfld("coEmail", "El. paštas", c.email, { type: "email" })}`,
        { foot: "Rodomi poraštėje, pirkimo sąlygose ir privatumo politikoje. Neužpildyti nerodomi." }
      );
    },
    read: (f, S) => {
      const v = n => f[n].value.trim();
      const next = {
        company: {
          ...(S.company || {}),
          name: v("coName") || "[Įmonės pavadinimas]",
          code: v("coCode") || "[Įmonės kodas]",
          vat: v("coVat") || "[PVM mokėtojo kodas]",
          address: v("coAddress") || "[Buveinės adresas]",
          phone: v("coPhone") || "[Telefonas]",
          email: v("coEmail")
        }
      };
      return { next, errors: [!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.company.email) && "Patikrinkite el. paštą"].filter(Boolean) };
    },
    sum: S => (Object.values(S.company || {}).some(v => /^\[.*\]$/.test(String(v))) ? `<span class="axWarn">Neužpildyta</span>` : esc(S.company?.name || ""))
  },
  matavimas: {
    title: "Lankytojų matavimas",
    html: S => {
      const an = S.analytics || {};
      return groupHTML(`${sfld("plausible", "Plausible domenas", an.plausible, { ph: "vaidore.com" })}${sswitch("vercelAn", "Vercel Web Analytics", an.vercel)}`, {
        foot: "Be slapukų. Pakeitimai įsigalioja atnaujinus svetainę."
      });
    },
    read: (f, S) => ({ next: { analytics: { ...(S.analytics || {}), plausible: f.plausible.value.trim(), vercel: f.vercelAn.checked } }, errors: [] }),
    sum: S => (S.analytics?.plausible || S.analytics?.vercel ? "Įjungta" : "Išjungta")
  },
  // Vitrina
  korteles: {
    title: "Prekių kortelės",
    vitrina: true,
    html: S => {
      const ins = S.inspired || {};
      return `${groupHTML(`${sswitch("cardHeart", "Širdelė „Į mėgstamus“", S.cards?.heart !== false)}${sswitch("cardBadges", "Ženkliukai („Naujiena“, „Akcija“…)", S.cards?.badges !== false)}`, {
        foot: "Kortelės paveikslo kampe. Išjungus ženkliukus, nuolaida matoma iš raudonos kainos."
      })}
${groupHTML(`${sswitch("insShow", "Rodyti „Įkvėpti …“", ins.show !== false)}${sarea("insNote", "Pastaba apie prekių ženklus", ins.note, { rows: 3 })}`, {
  head: "„Įkvėpti …“",
  foot: "Pvz. „Įkvėpti Tom Ford – Tobacco Vanille“. Pastaba – produkto puslapyje po „Į krepšelį“."
})}`;
    },
    read: (f, S) => ({
      next: { cards: { ...(S.cards || {}), heart: f.cardHeart.checked, badges: f.cardBadges.checked }, inspired: { ...(S.inspired || {}), show: f.insShow.checked, note: f.insNote.value.trim() } },
      errors: []
    }),
    sum: S => [S.cards?.heart !== false && "širdelė", S.cards?.badges !== false && "ženkliukai", S.inspired?.show !== false && "„Įkvėpti“"].filter(Boolean).join(", ") || "—"
  },
  istorija: {
    title: "Mūsų istorija",
    vitrina: true,
    html: S => {
      const st = S.story || {};
      return `${groupHTML(`${sfld("storyTitle", "Antraštė", st.title, { ph: "Mūsų istorija", max: 60 })}${sarea("storyText", "Tekstas", st.text, { rows: 8 })}`, {
        foot: "Pradžios puslapyje ir „Apie mus“. Tuščias tekstas – sekcija nerodoma."
      })}
<h2 class="igHead">Nuotrauka</h2><div class="ig axImgBox"><div class="admTaxoImg" id="storyImg"></div><label class="axRow admUpload">${glyph("upload")}<span class="axRowTxt"><b class="axLink">Įkelti nuotrauką</b></span><input type="file" accept="image/*" hidden data-story-img /></label></div>`;
    },
    read: (f, S, form, ctx) => ({ next: { story: { ...(S.story || {}), title: f.storyTitle.value.trim(), text: f.storyText.value.trim(), image: ctx.storyImage } }, errors: [] }),
    sum: S => (S.story?.text ? esc(S.story.title || "Mūsų istorija") : "Nerodoma")
  }
};

async function loadSettings() {
  const rows = await sbRest("settings?select=data&id=eq.1");
  return { ...VD.SET, ...(rows?.[0]?.data || {}) };
}
async function renderSettings(main, param, seq) {
  if (!SET_PAGES[param] || SET_PAGES[param].vitrina) return navigate(SET_PAGES[param]?.vitrina ? `admin/vitrina/${param}` : "admin/daugiau", { replace: true });
  return renderSettingsPage(main, param, seq, hubBack());
}
// Viena nustatymų grupė (ir Vitrinos „Prekių kortelės“, „Mūsų istorija“)
async function renderSettingsPage(main, key, seq, back) {
  const P = SET_PAGES[key];
  main.innerHTML = pageHTML({ title: P.title, back, body: loading(5) });
  const S = await loadSettings();
  if (stale(seq)) return;
  const ctx = { storyImage: S.story?.image || "" };
  main.innerHTML = pageHTML({
    title: P.title,
    back,
    actions: saveBtn({ form: "setForm" }),
    body: `<form class="admForm admSettings" id="setForm" data-set="${key}" novalidate><p class="formErr axErr" role="alert" hidden></p>${P.html(S)}</form>`,
    cls: "axNarrow"
  });
  hydrateIcons(main);
  const form = $("#setForm", main);
  const paintStory = () => {
    const box = $("#storyImg", form);
    if (box) box.innerHTML = ctx.storyImage ? `<img src="${esc(ctx.storyImage)}" alt="" /><button class="roundBtn" type="button" data-story-rm aria-label="Pašalinti nuotrauką">${glyph("trash")}</button>` : "";
  };
  paintStory();
  form.addEventListener("input", () => (A.dirty = true));
  form.addEventListener("change", async e => {
    A.dirty = true;
    if (!e.target.matches("[data-story-img]")) return;
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const lab = e.target.closest("label");
    lab.classList.add("loading");
    try {
      [ctx.storyImage] = await uploadImages([file], "istorija");
      paintStory();
    } catch (err) {
      toast(errText(err), { icon: "info" });
    } finally {
      lab.classList.remove("loading");
    }
  });
  form.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("[data-story-rm]")) {
      ctx.storyImage = "";
      paintStory();
      A.dirty = true;
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($('.axSave[form="setForm"]', main), async () => {
      const { next, errors } = P.read(form.elements, S, form, ctx);
      showFormErr(form, errors);
      if (errors.length) return;
      Object.assign(S, await saveSettingsPatch(next));
      await catalogChanged(`${P.title}: išsaugota`);
    });
  });
}

// ── Daugiau ──────────────────────────────────────────
async function renderMore(main, _param, seq) {
  const paint = S =>
    pageHTML({
      title: "Daugiau",
      cls: "axNarrow",
      body: `${groupHTML(
        [
          navRow({ href: "admin/atsiliepimai", ico: "star", icoBg: "var(--amber)", title: "Atsiliepimai", count: "reviews", attrs: 'data-more="reviews"' }),
          navRow({ href: "admin/laukia", ico: "bell", icoBg: "var(--red)", title: "Laukiantys", sub: "„Pranešti, kai bus“", count: "restock", attrs: 'data-more="restock"' }),
          navRow({ href: "admin/naujienlaiskis", ico: "mail", icoBg: "var(--green)", title: "Naujienlaiškis" })
        ].join(""),
        { head: "Klientai" }
      )}
${groupHTML(
  Object.entries(SET_PAGES)
    .filter(([, P]) => !P.vitrina)
    .map(([k, P]) => navRow({ href: `admin/nustatymai/${k}`, ico: SET_GROUPS.find(g => g[0] === k)?.[2] || "gear", icoBg: "var(--ink2)", title: P.title, value: S ? `<span class="axValTxt">${P.sum(S)}</span>` : "" }))
    .join(""),
  { head: "Nustatymai" }
)}
${groupHTML(
  [
    navRow({ href: "admin/zurnalas", ico: "clock", icoBg: "var(--ink3)", title: "Žurnalas", sub: "Kas, kada ir ką pakeitė" }),
    navRow({ button: true, attrs: "data-adm-rebuild", ico: "upload", icoBg: "var(--brand)", title: "Atnaujinti svetainę", sub: "Paieškos sistemų puslapiai – po 1–2 min." }),
    navRow({ href: "./", ico: "eye", icoBg: "var(--brand)", title: "Peržiūrėti parduotuvę" })
  ].join(""),
  { head: "Svetainė" }
)}
${groupHTML(`<button class="axRow danger" type="button" data-logout><span class="axRowTxt"><b>Atsijungti</b></span></button>`, { foot: esc(VD.auth.user?.email || "") })}`
    });
  main.innerHTML = paint(null);
  hydrateIcons(main);
  const S = await loadSettings().catch(() => null);
  if (stale(seq) || !S) return;
  main.innerHTML = paint(S);
  hydrateIcons(main);
}
