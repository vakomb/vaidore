// 08 – Nustatymai (lentelė settings, viena eilutė id=1, laukas data – tas pats formatas kaip catalog.json „settings“):
// parduotuvė (pradžios puslapis – 10-home.js), pristatymas, mėginukai / rinkinys / pakavimas, įmonės rekvizitai, istorija, matavimas.
// Saugant sujungiama su esamais duomenimis – nežinomi laukai neprarandami.
const COUNTRY_NAME = { LT: "Lietuva", LV: "Latvija", EE: "Estija" };

async function renderSettings(main, _param, seq) {
  main.innerHTML = pageHead("Nustatymai") + loading();
  const rows = await sbRest("settings?select=data&id=eq.1");
  if (stale(seq)) return;
  const S = { ...VD.SET, ...(rows?.[0]?.data || {}) };
  const c = S.company || {};
  const d = S.discovery || {};
  const sc = S.sampleCredit || {};
  const g = S.gift || {};
  const st = S.story || {};
  const an = S.analytics || {};
  const ins = S.inspired || {};
  const unfilled = v => (/^\[.*\]$/.test(String(v || "")) ? "" : v);
  const fld = (name, label, value, { type = "text", hint = "", ph = "", mode = "", max = 200 } = {}) =>
    `<label class="field"><span>${label}</span><input name="${name}" type="${type}"${mode ? ` inputmode="${mode}"` : ""} maxlength="${max}" value="${esc(value ?? "")}"${ph ? ` placeholder="${esc(ph)}"` : ""} />${hint ? `<small>${hint}</small>` : ""}</label>`;
  const area = (name, label, value, hint = "") => `<label class="field"><span>${label}</span><textarea name="${name}" rows="4" maxlength="1500">${esc(value ?? "")}</textarea>${hint ? `<small>${hint}</small>` : ""}</label>`;
  let storyImage = st.image || "";
  main.innerHTML = `${pageHead("Nustatymai", "Pakeitimai parduotuvėje matomi iškart.")}
<form class="admForm admSettings" id="setForm" novalidate>
<section class="admCard" id="parduotuve"><h2>Parduotuvė</h2>
${fld("shop", "Pavadinimas", S.shop, { max: 40 })}
${fld("tagline", "Šūkis", S.tagline, { hint: "Viena eilutė pradžios puslapyje ir paieškos sistemose", max: 160 })}
<div class="fieldRow">${fld("freeShippingFrom", "Nemokamai nuo, €", dec(S.freeShippingFrom), { mode: "decimal" })}${fld("dispatch", "Išsiunčiame per", S.dispatch, { ph: "1–2 d. d.", max: 30 })}</div>
<div class="fieldRow">${fld("returnDays", "Grąžinimas per, d.", S.returnDays, { mode: "numeric" })}${fld("maxQty", "Daugiausia vnt. eilutėje", S.maxQty, { mode: "numeric" })}</div>
</section>
<section class="admCard"><h2>Pradžios puslapis</h2><p class="admNote">Skaidrės, jų nuotraukos ir „Produktai“ plytelės – skyriuje <a href="admin/pradzia" data-nav>Pradžia</a>.</p></section>
<section class="admCard" id="korteles"><h2>Prekių kortelės</h2>
<label class="admToggleRow"><span><b>Širdelė („Į mėgstamus“)</b><small>Kortelės paveikslo kampe. Parfumada.lt jos neturi; išjungus – mėgstamus pirkėjai žymi kvapo puslapyje</small></span><input type="checkbox" name="cardHeart" class="admSwitchInp"${attr(S.cards?.heart !== false, "checked")} /></label>
<label class="admToggleRow"><span><b>Ženkliukai („Naujiena“, „Akcija“…)</b><small>Kortelės paveikslo kampe. Išjungus – nuolaida matoma tik iš raudonos kainos (kaip parfumada.lt)</small></span><input type="checkbox" name="cardBadges" class="admSwitchInp"${attr(S.cards?.badges !== false, "checked")} /></label>
</section>
<section class="admCard" id="ikvepti"><h2>„Įkvėpti …“</h2>
<label class="admToggleRow"><span><b>Rodyti, kokiu kvapu įkvėpta</b><small>Kortelėse ir kvapo puslapyje, pvz. „Įkvėpti Tom Ford – Tobacco Vanille“ (laukas „Įkvėpta“ kvapo kortelėje)</small></span><input type="checkbox" name="insShow" class="admSwitchInp"${attr(ins.show !== false, "checked")} /></label>
${area("insNote", "Pastaba apie prekių ženklus", ins.note, "Rodoma kvapo puslapyje po „Į krepšelį“ smulkiu šriftu")}
</section>
<section class="admCard" id="pristatymas"><h2>Pristatymas</h2>
${(S.shipping || [])
  .map(
    (o, i) => `<div class="admShipRow"><p class="admMuted">${esc(o.id === "omniva" ? "Omniva paštomatas (pirkėjas renkasi krepšelyje)" : o.id === "dpd" ? "Kurjeris (adresas – Stripe lange)" : o.id)}</p>
<div class="fieldRow3">${fld(`ship_name_${i}`, "Pavadinimas", o.name, { max: 60 })}${fld(`ship_price_${i}`, "Kaina, €", dec(o.price), { mode: "decimal" })}${fld(`ship_days_${i}`, "Trukmė", o.days, { max: 30 })}</div></div>`
  )
  .join("")}
<div class="admChecks"><span>Šalys</span>${Object.entries(COUNTRY_NAME)
    .map(([cc, name]) => `<label class="admCheck"><input type="checkbox" name="countries" value="${cc}"${attr((S.countries || []).includes(cc), "checked")} /><span>${name}</span></label>`)
    .join("")}</div>
</section>
<section class="admCard" id="meginukai"><h2>Mėginukai, rinkinys, pakavimas</h2>
<div class="fieldRow3">${fld("discName", "Rinkinys", d.name, { max: 40 })}${fld("discCount", "Mėginukų, vnt.", d.count, { mode: "numeric" })}${fld("discPrice", "Kaina, €", dec(d.price), { mode: "decimal" })}</div>
${fld("discText", "Rinkinio aprašymas", d.text, { max: 200 })}
<div class="fieldRow">${fld("scDays", "Kodas galioja, d.", sc.days, { mode: "numeric", hint: "Mėginukų kaina grąžinama nuolaidos kodu" })}${fld("scMin", "Kodas – nuo, €", dec(sc.minOrder), { mode: "decimal", hint: "Mažiausia užsakymo suma" })}</div>
<div class="fieldRow">${fld("giftPrice", "Pakavimas, €", dec(g.price), { mode: "decimal" })}${fld("giftMax", "Rašteliukas, simb.", g.noteMax, { mode: "numeric" })}</div>
</section>
<section class="admCard" id="imone"><h2>Įmonės rekvizitai</h2>
<p class="admNote">Rodomi poraštėje, pirkimo sąlygose ir privatumo politikoje. Neužpildyti nerodomi.</p>
<div class="fieldRow">${fld("coName", "Pavadinimas", unfilled(c.name), { ph: "UAB „…“" })}${fld("coCode", "Įmonės kodas", unfilled(c.code))}</div>
<div class="fieldRow">${fld("coVat", "PVM mokėtojo kodas", unfilled(c.vat), { ph: "LT…" })}${fld("coPhone", "Telefonas", unfilled(c.phone), { type: "tel" })}</div>
${fld("coAddress", "Buveinės adresas", unfilled(c.address))}
${fld("coEmail", "El. paštas", c.email, { type: "email", hint: "Pirkėjams ir užsakymų laiškams (jei nenurodytas ORDER_EMAIL_TO)" })}
</section>
<section class="admCard" id="istorija"><h2>Mūsų istorija</h2>
${fld("storyTitle", "Antraštė", st.title, { ph: "Mūsų istorija", max: 60 })}
${area("storyText", "Tekstas", st.text, "Rodoma pradžios puslapyje ir „Apie mus“. Tuščia – sekcija nerodoma.")}
<div class="field"><span>Nuotrauka (nebūtina)</span><div class="admTaxoImg" id="storyImg"></div><label class="btn ghost small admUpload">${glyph("upload")}Įkelti<input type="file" accept="image/*" hidden data-story-img /></label></div>
</section>
<section class="admCard" id="matavimas"><h2>Lankytojų matavimas (be slapukų)</h2>
${fld("plausible", "Plausible domenas", an.plausible, { ph: "vaidore.com", hint: "plausible.io paskyra; tuščia – išjungta" })}
<label class="admToggleRow"><span><b>Vercel Web Analytics</b><small>Jei svetainė Vercel'yje ir ten įjungta Analytics</small></span><input type="checkbox" name="vercelAn" class="admSwitchInp"${attr(an.vercel, "checked")} /></label>
<p class="admNote">Matavimo pakeitimai įsigalioja atnaujinus svetainę.</p>
</section>
<div class="admSaveBar"><p class="formErr" role="alert" hidden></p><button class="btn primary" type="submit">${glyph("check")}Išsaugoti nustatymus</button></div>
</form>`;
  hydrateIcons(main);
  const form = $("#setForm");
  const paintStory = () => {
    $("#storyImg").innerHTML = storyImage ? `<img src="${esc(storyImage)}" alt="" /><button class="roundBtn" type="button" data-story-rm aria-label="Pašalinti nuotrauką">${glyph("trash")}</button>` : "";
  };
  paintStory();
  if (location.hash) $(location.hash)?.scrollIntoView({ block: "start" });
  form.addEventListener("input", () => (A.dirty = true));
  form.addEventListener("change", async e => {
    A.dirty = true;
    if (!e.target.matches("[data-story-img]")) return;
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      [storyImage] = await uploadImages([file], "istorija");
      paintStory();
    } catch (err) {
      toast(errText(err), { icon: "info" });
    }
  });
  form.addEventListener("click", e => {
    if (e.target instanceof Element && e.target.closest("[data-story-rm]")) {
      storyImage = "";
      paintStory();
      A.dirty = true;
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), async () => {
      const f = form.elements;
      const v = n => f[n].value.trim();
      const money = n => Math.round(num(v(n)) * 100) / 100;
      const int = n => Math.round(num(v(n)));
      const errors = [];
      const shipping = (S.shipping || []).map((o, i) => ({ ...o, name: v(`ship_name_${i}`) || o.name, price: money(`ship_price_${i}`), days: v(`ship_days_${i}`) }));
      const countries = new FormData(form).getAll("countries");
      const next = {
        shop: v("shop") || "Vaidore",
        tagline: v("tagline"),
        freeShippingFrom: money("freeShippingFrom"),
        dispatch: v("dispatch"),
        returnDays: int("returnDays"),
        maxQty: int("maxQty"),
        shipping,
        countries,
        discovery: { ...d, name: v("discName"), count: int("discCount"), price: money("discPrice"), text: v("discText") },
        sampleCredit: { ...sc, days: int("scDays"), minOrder: money("scMin") },
        gift: { ...g, price: money("giftPrice"), noteMax: int("giftMax") },
        company: {
          ...c,
          name: v("coName") || "[Įmonės pavadinimas]",
          code: v("coCode") || "[Įmonės kodas]",
          vat: v("coVat") || "[PVM mokėtojo kodas]",
          address: v("coAddress") || "[Buveinės adresas]",
          phone: v("coPhone") || "[Telefonas]",
          email: v("coEmail")
        },
        story: { ...st, title: v("storyTitle"), text: v("storyText"), image: storyImage },
        analytics: { ...an, plausible: v("plausible"), vercel: f.vercelAn.checked },
        inspired: { ...ins, show: f.insShow.checked, note: v("insNote") },
        cards: { ...(S.cards || {}), heart: f.cardHeart.checked, badges: f.cardBadges.checked }
      };
      if (!(next.freeShippingFrom >= 0)) errors.push("Nemokamo pristatymo riba – skaičius");
      if (shipping.some(o => !(o.price >= 0))) errors.push("Pristatymo kaina – skaičius");
      if (!countries.length) errors.push("Pasirinkite bent vieną šalį");
      if (!(next.maxQty >= 1)) errors.push("Daugiausia vienetų – bent 1");
      if (!(next.discovery.count >= 2 && next.discovery.price > 0)) errors.push("Rinkinys – bent 2 mėginukai ir kaina");
      if (!(next.sampleCredit.days >= 1)) errors.push("Kodo galiojimas – bent 1 diena");
      if (!(next.gift.price >= 0 && next.gift.noteMax >= 10)) errors.push("Pakavimo kaina ir rašteliuko ilgis");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.company.email)) errors.push("Patikrinkite el. paštą");
      const err = $(".formErr", form);
      err.hidden = !errors.length;
      err.textContent = errors.join(" · ");
      if (errors.length) return;
      // Sujungiama su naujausia versija duomenų bazėje (kad nedingtų laukai, kurių šis langas nerodo)
      const [cur] = (await sbRest("settings?select=data&id=eq.1")) || [];
      const data = { ...(cur?.data || VD.SET), ...next };
      const saved = await sbRest("settings?id=eq.1", { method: "PATCH", body: { data }, prefer: "return=representation" });
      if (!saved?.length) throw new Error("Nustatymų įrašo nėra – paleiskite supabase/seed.sql");
      await catalogChanged("Nustatymai išsaugoti");
    });
  });
}
