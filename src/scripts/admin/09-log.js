// 09 – Veiksmų žurnalas (audit_log, pildo duomenų bazės trigeriai): kas, kada ir ką pakeitė kvapuose, kategorijose,
// šeimose, nustatymuose, užsakymuose, atsiliepimuose. Tik skaitomas.
const LOG_ENTITY = {
  products: "Kvapas",
  categories: "Kategorija",
  families: "Kvapo šeima",
  settings: "Nustatymai",
  orders: "Užsakymas",
  reviews: "Atsiliepimas",
  product_categories: "Kvapo kategorija"
};
const LOG_ACTION = { insert: ["Sukurta", "green"], update: ["Pakeista", "blue"], delete: ["Ištrinta", "red"] };
const LOG_FIELD = {
  name: "pavadinimas",
  sizes: "tūriai ir kainos",
  sample: "mėginuko kaina",
  stock: "likutis",
  visible: "rodymas",
  images: "nuotraukos",
  status: "būsena",
  tracking: "siuntos nr.",
  description: "aprašymas",
  tagline: "trumpas aprašymas",
  notes: "natos",
  look: "išvaizda",
  badge: "žymė",
  rank: "eilė",
  data: "nustatymai",
  family: "šeima"
};
const logValue = v => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "taip" : "ne";
  if (Array.isArray(v) && v.every(x => x && typeof x === "object" && "ml" in x)) return v.map(s => `${s.ml} ml – ${s.price} €`).join(", ");
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};
function logChanges(row) {
  const ch = row.changes || {};
  if (row.action !== "update") return esc(ch.name || ch.ref || ch.email || ch.category_id || "");
  return Object.entries(ch)
    .filter(([k]) => !["updated_at", "stock_applied", "mailed"].includes(k))
    .map(([k, v]) =>
      k === "data"
        ? `nustatymai: ${Object.keys(v?.dabar || {})
            .filter(key => JSON.stringify(v?.buvo?.[key]) !== JSON.stringify(v?.dabar?.[key]))
            .join(", ") || "—"}`
        : `<span>${esc(LOG_FIELD[k] || k)}: <s>${esc(logValue(v?.buvo))}</s> → ${esc(logValue(v?.dabar))}</span>`
    )
    .join("");
}
async function renderLog(main, _param, seq) {
  main.innerHTML = pageHead("Žurnalas") + loading();
  const rows = (await sbRest("audit_log?select=*&order=at.desc&limit=300")) || [];
  if (stale(seq)) return;
  main.innerHTML = `${pageHead("Žurnalas", "Paskutiniai 300 pakeitimų. Įrašo duomenų bazė – ištrinti ar pakeisti negalima.")}${
    rows.length
      ? `<div class="group admLog">${rows
          .map(
            r => `<div class="row"><span class="rowTxt"><span class="admLogHead"><span class="pill ${LOG_ACTION[r.action]?.[1] || ""}">${LOG_ACTION[r.action]?.[0] || esc(r.action)}</span><b>${esc(LOG_ENTITY[r.entity] || r.entity)}</b>${
              r.entity_id ? `<code>${esc(r.entity_id.length > 12 && r.entity === "orders" ? r.entity_id.slice(-8).toUpperCase() : r.entity_id)}</code>` : ""
            }</span><span class="admLogCh">${logChanges(r)}</span><small>${fmtDateTime(r.at)} · ${esc(r.actor_email || "sistema (pirkimas, Stripe)")}</small></span></div>`
          )
          .join("")}</div>`
      : emptyBox("Įrašų dar nėra", "Čia matysite visus kvapų, nustatymų ir užsakymų pakeitimus.")
  }`;
}
