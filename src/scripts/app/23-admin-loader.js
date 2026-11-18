// 23 – administravimas /admin: tik patvirtintam administratoriui (teisę tikrina duomenų bazė – is_admin(), RLS).
// Pats skydelis – atskiras failas assets/admin.js + admin.css (src/scripts/admin, src/styles/admin.css), įkeliamas tik čia,
// todėl pirkėjams svetainė lieka lengva. Skydeliui atveriamos bendros funkcijos per window.VD.
let adminLoad = null;
function adminGate(root, html) {
  root.innerHTML = `<div class="wrap"><div class="empty big">${html}</div></div>`;
}
async function openAdmin(sub = "") {
  const root = $("#adminRoot");
  document.documentElement.classList.add("isAdmin");
  document.title = `Administravimas | ${SET.shop}`;
  if (!SB) return adminGate(root, `<h1>Administravimas</h1><p>Duomenų bazė neprijungta (src/data/supabase.json).</p>`);
  if (!auth.session) return adminGate(root, `<h1>Administravimas</h1><p>Prisijunkite administratoriaus paskyra.</p><a class="btn primary" href="paskyra" data-nav>Prisijungti</a>`);
  if (!auth.user) {
    root.innerHTML = `<p class="loadingTxt">Tikrinamos teisės…</p>`;
    await loadMe();
    if (ui.view !== "admin") return;
  }
  if (!auth.isAdmin)
    return adminGate(root, `<h1>Neturite teisių</h1><p>Administravimo skydelis prieinamas tik parduotuvės administratoriui.</p><a class="btn primary" href="./" data-nav>Į parduotuvę</a>`);
  try {
    adminLoad ||= Promise.all([
      new Promise((res, rej) => {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = `assets/admin.css?v=${window.VAIDORE_BUILT || ""}`;
        l.onload = res;
        l.onerror = () => rej(new Error("admin.css"));
        document.head.append(l);
      }),
      new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = `assets/admin.js?v=${window.VAIDORE_BUILT || ""}`;
        s.onload = res;
        s.onerror = () => rej(new Error("admin.js"));
        document.head.append(s);
      })
    ]);
    await adminLoad;
    if (ui.view === "admin") window.VDAdmin.render(sub);
  } catch (err) {
    adminLoad = null;
    logError("admin", err);
    adminGate(root, `<h1>Nepavyko įkelti</h1><p>Patikrinkite ryšį ir bandykite dar kartą.</p><button class="btn primary" type="button" onclick="location.reload()">Perkrauti</button>`);
  }
}
// Bendros funkcijos administravimo skydeliui (assets/admin.js)
window.VD = {
  $, $$, esc, eur, eurShort, plural, fold, slugify, fmtDate, fmtDateTime, glyph, GLYPH, hydrateIcons, bottleSVG, artImg, toast, openSheet, closeSheet,
  askConfirm, navigate, sbRest, sbFn, sbUpload, auth, refreshCatalog, emit, logError, absUrl,
  get CAT() {
    return CAT;
  },
  get SET() {
    return SET;
  },
  GENDER_NAME, CONC_NAME, SEASON_NAME, LEVEL, LASTS, ORDER_STATUS, statusPill, FAMILY_LOOK, SAMPLE_ML, BOTTLE_ML, inspMonogram,
  catalogFromDb, fetchCatalog,
  // Pradžios puslapio redaktorius (admin/pradzia): šablonai, numatytieji, scenos, nuotraukos
  stageHTML, photoHTML, slideDefaults, resolveSlide, tilePreset, productUrl, autoNoteItems, fmtNote,
  get DEFAULT_SLIDES() {
    return DEFAULT_SLIDES;
  },
  get DEFAULT_TILES() {
    return DEFAULT_TILES;
  },
  get SLIDE_PRESETS() {
    return SLIDE_PRESETS;
  },
  get STAGES() {
    return STAGES;
  }
};
