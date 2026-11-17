// Administravimo skydelis (/admin) – atskiras failas assets/admin.js, įkeliamas tik administratoriui (23-admin-loader.js).
// src/scripts/admin/*.js sujungiami eilės tvarka į vieną IIFE (bendras scope, be import/export), kaip ir programėlė.
// Programėlės funkcijos – per window.VD. Duomenys – tiesiai iš Supabase (sbRest) su administratoriaus teisėmis (RLS: is_admin());
// veiksmai, kuriems reikia paslapčių (laiškai, Stripe grąžinimai, perrinkimas) – per Edge Function shop/admin.
//
// Skyriai (adresai):
//   admin                    Apžvalga – pajamos, kas laukia, maži likučiai, perkamiausi
//   admin/uzsakymai          Užsakymai – supakuota / išsiųsta (+ laiškas) / pristatyta / grąžinti pinigus, CSV buhalterijai
//   admin/kvapai[/<id>]      Kvapai – sąrašas, redagavimas, nuotraukos, likučiai, rodymas; admin/kvapai/naujas
//   admin/pradzia            Pradžios puslapis – skaidrės (nuotraukos, tekstai, nuorodos, eilė) ir „Produktai“ plytelės, su peržiūra
//   admin/kategorijos        Kategorijos ir kvapo šeimos
//   admin/atsiliepimai       Atsiliepimų peržiūra (paskelbti / paslėpti / ištrinti)
//   admin/laukia             „Pranešti, kai bus“ užklausos
//   admin/nustatymai         Parduotuvės nustatymai (pristatymas, rekvizitai, pagrindinis puslapis…)
//   admin/zurnalas           Veiksmų žurnalas (kas, kada, ką pakeitė)
const VD = window.VD;
const { $, $$, esc, eur, plural, fold, slugify, fmtDate, fmtDateTime, glyph, hydrateIcons, bottleSVG, toast, openSheet, closeSheet, askConfirm, navigate, sbRest, sbFn, sbUpload, statusPill, ORDER_STATUS } = VD;

const SECTIONS = [
  { id: "", name: "Apžvalga", ico: "chart", render: renderOverview },
  { id: "uzsakymai", name: "Užsakymai", ico: "box", render: renderOrders, count: "orders" },
  { id: "kvapai", name: "Kvapai", ico: "drop", render: renderProducts },
  { id: "pradzia", name: "Pradžia", ico: "home", render: renderHomeEditor },
  { id: "kategorijos", name: "Kategorijos", ico: "grid", render: renderCategories },
  { id: "atsiliepimai", name: "Atsiliepimai", ico: "star", render: renderReviews, count: "reviews" },
  { id: "laukia", name: "Laukiantys", ico: "bell", render: renderRestock, count: "restock" },
  { id: "naujienlaiskis", name: "Naujienlaiškis", ico: "mail", render: renderNewsletter },
  { id: "nustatymai", name: "Nustatymai", ico: "gear", render: renderSettings },
  { id: "zurnalas", name: "Žurnalas", ico: "clock", render: renderLog }
];
const A = { sec: "", param: "", dirty: false, counts: {}, seq: 0 };

// ── Pagalbinės ────────────────────────────────────────
const num = v => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
const centsEur = c => eur((Number(c) || 0) / 100);
// Kainos laukuose – su kableliu (lietuviškai); num() supranta ir kablelį, ir tašką
const dec = v => (v === "" || v == null ? "" : String(v).replace(".", ","));
const list = s =>
  String(s || "")
    .split(/[,\n]/)
    .map(x => x.trim())
    .filter(Boolean);
const attr = (cond, name) => (cond ? ` ${name}` : "");
const sel = cond => (cond ? " selected" : "");
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString();
const errText = err => {
  const m = String(err?.message || err || "Nepavyko");
  if (/row-level security|permission denied/i.test(m)) return "Neturite teisių šiam veiksmui";
  if (/duplicate key/i.test(m)) return "Toks įrašas (id) jau yra";
  if (/foreign key/i.test(m)) return "Įrašas naudojamas kitur – pirma pakeiskite susijusius įrašus";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Nėra ryšio – bandykite dar kartą";
  return m;
};
// Mygtukas „dirba“: išjungiamas ir rodo suktuką, kol vyksta veiksmas
async function busy(btn, fn) {
  if (!btn || btn.disabled) return;
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add("loading");
  btn.innerHTML = `<span class="spin"></span>${html}`;
  try {
    return await fn();
  } catch (err) {
    VD.logError("admin", err);
    toast(errText(err), { icon: "info", ms: 4200 });
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = html;
  }
}
// Edge Function shop/admin (laiškai, Stripe, perrinkimas). Klaidos tekstas – iš serverio.
async function shopAdmin(body) {
  const r = await sbFn("shop/admin", { method: "POST", body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Serveris: ${r.status}`);
  return d;
}
// Duomenų bazės eilutė → programėlės kvapas (buteliuko piešiniui, nuotraukai)
const appProduct = row => ({ ...row, look: row.look || {}, images: row.images || [], name: row.name || "Kvapas" });
// Katalogo pakeitimai programėlėje matomi iškart; statiniai (SEO) puslapiai atsinaujina po „Atnaujinti svetainę“
async function catalogChanged(msg = "Išsaugota") {
  A.dirty = false;
  await VD.refreshCatalog({ rerender: false }).catch(() => {});
  toast(`${msg} – parduotuvėje matoma iškart`, { icon: "check", action: "Atnaujinti svetainę", onAction: rebuildSite, ms: 5200 });
}
async function rebuildSite() {
  try {
    const d = await shopAdmin({ action: "rebuild" });
    if (d.done?.length) toast(`Svetainė atnaujinama (${d.done.join(", ")}) – po 1–2 min.`, { icon: "check", ms: 4200 });
    else toast("Automatinis atnaujinimas nenustatytas – žr. SKAITYK.txt (GITHUB_TOKEN arba VERCEL_DEPLOY_HOOK)", { icon: "info", ms: 6000 });
  } catch (err) {
    toast(errText(err), { icon: "info", ms: 4200 });
  }
}
function downloadFile(name, text, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// CSV Excel'iui (LT): kabliataškis, BOM
const csv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
const pageHead = (title, sub = "", actions = "") =>
  `<header class="admHead"><div><h1 id="admTitle">${esc(title)}</h1>${sub ? `<p class="pageSub">${sub}</p>` : ""}</div>${actions ? `<div class="admHeadActs">${actions}</div>` : ""}</header>`;
const emptyBox = (title, text = "", extra = "") => `<div class="empty"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${extra}</div>`;
const loading = (txt = "Įkeliama…") => `<p class="loadingTxt">${esc(txt)}</p>`;
// Paleidžia skyriaus įkėlimą; jei vartotojas jau perėjo kitur – rezultato nebepiešia
const stale = seq => seq !== A.seq;
// Paveikslų įkėlimas: sumažinama iki 1600 px ir išsaugoma WebP (Safari – JPEG), kad puslapis liktų greitas
// Nuotrauka sumažinama naršyklėje (iki 1600 px) ir paverčiama WebP (arba JPEG). Jei createImageBitmap formato
// neatpažįsta (pvz. iPhone HEIC kompiuteryje), bandoma per <img>; nepavykus – aiški klaida.
async function decodeImage(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error(
        /\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)
          ? `${file.name}: HEIC formato ši naršyklė neatidaro – išsaugokite nuotrauką kaip JPG arba įkelkite iš telefono`
          : `${file.name}: nepavyko atidaryti nuotraukos (tinka JPG, PNG, WebP)`
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
async function prepareImage(file, max = 1600) {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|avif|hei[cf])$/i.test(file.name)) throw new Error(`${file.name}: ne paveikslas`);
  const bmp = await decodeImage(file);
  const bw = bmp.naturalWidth || bmp.width;
  const bh = bmp.naturalHeight || bmp.height;
  const k = Math.min(1, max / Math.max(bw, bh));
  const c = document.createElement("canvas");
  c.width = Math.round(bw * k);
  c.height = Math.round(bh * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const toBlob = (type, q) => new Promise(res => c.toBlob(res, type, q));
  let blob = await toBlob("image/webp", 0.84);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.86);
  return blob;
}
async function uploadImages(files, prefix, max = 1600) {
  const urls = [];
  for (const f of files) {
    const blob = await prepareImage(f, max);
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    urls.push(await sbUpload("products", `${prefix}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`, blob));
  }
  return urls;
}

// ── Skaitikliai meniu (kas laukia) ────────────────────
async function loadCounts() {
  try {
    const [orders, reviews, restock] = await Promise.all([
      sbRest("orders?select=id&status=in.(paid,packed)"),
      sbRest("reviews?select=id&status=eq.pending"),
      sbRest("restock_requests?select=id&notified=eq.false")
    ]);
    A.counts = { orders: orders.length, reviews: reviews.length, restock: restock.length };
    $$("[data-adm-count]").forEach(b => {
      const n = A.counts[b.dataset.admCount] || 0;
      b.hidden = !n;
      b.textContent = String(n);
    });
  } catch (err) {
    VD.logError("counts", err);
  }
}

// ── Karkasas ──────────────────────────────────────────
function shellHTML() {
  return `<div class="adm">
<aside class="admSide">
<p class="admBrand">${glyph("gear")}<span>Administravimas</span></p>
<nav class="admNav" aria-label="Administravimas">${SECTIONS.map(
    s =>
      `<a href="admin${s.id ? `/${s.id}` : ""}" data-nav${A.sec === s.id ? ' aria-current="page"' : ""}>${glyph(s.ico)}<span>${s.name}</span>${
        s.count ? `<b class="admCount" data-adm-count="${s.count}"${A.counts[s.count] ? "" : " hidden"}>${A.counts[s.count] || ""}</b>` : ""
      }</a>`
  ).join("")}</nav>
<div class="admSideFoot"><button class="btn ghost small" type="button" data-adm-rebuild>${glyph("upload")}Atnaujinti svetainę</button><a class="linkBtn" href="./" data-nav>Į parduotuvę</a></div>
</aside>
<div class="admMain" id="admMain"></div>
</div>`;
}
function render(sub = "") {
  const parts = String(sub || "")
    .split("/")
    .filter(Boolean);
  const sec = SECTIONS.find(s => s.id === (parts[0] || "")) || SECTIONS[0];
  A.sec = sec.id;
  A.param = parts.slice(1).join("/");
  A.seq++;
  A.dirty = false;
  const root = $("#adminRoot");
  root.innerHTML = shellHTML();
  hydrateIcons(root);
  const main = $("#admMain");
  document.title = `${sec.name} | Administravimas`;
  try {
    const p = sec.render(main, A.param, A.seq);
    if (p?.catch) p.catch(err => fail(main, err));
  } catch (err) {
    fail(main, err);
  }
  loadCounts();
  // Telefone meniu – slenkama juosta: dabartinis skyrius – per vidurį
  const nav = $(".admNav");
  const cur = $(".admNav [aria-current]");
  if (nav && cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
}
function fail(main, err) {
  VD.logError("admin", err);
  main.innerHTML = emptyBox("Nepavyko įkelti", errText(err), `<button class="btn primary" type="button" onclick="location.reload()">Perkrauti</button>`);
}

// Neišsaugoti pakeitimai – perspėjama prieš išeinant
document.addEventListener(
  "click",
  e => {
    const a = e.target instanceof Element && e.target.closest("a[data-nav]");
    if (!a || !A.dirty || !document.documentElement.classList.contains("isAdmin")) return;
    if (!window.confirm("Yra neišsaugotų pakeitimų. Išeiti neišsaugojus?")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else A.dirty = false;
  },
  true
);
window.addEventListener("beforeunload", e => {
  if (A.dirty && document.documentElement.classList.contains("isAdmin")) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("click", e => {
  const b = e.target instanceof Element && e.target.closest("[data-adm-rebuild]");
  if (b) busy(b, rebuildSite);
});

window.VDAdmin = { render };
