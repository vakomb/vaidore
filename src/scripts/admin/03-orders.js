// 03 – Užsakymai: filtras pagal būseną, paieška (nr., vardas, el. paštas, telefonas), užsakymo turinys, veiksmai:
// „Supakuota“ → „Išsiųsta“ (siuntos nr. + laiškas pirkėjui, shop/admin) → „Pristatyta“; „Grąžinti pinigus“ (Stripe + likučiai).
// CSV – buhalterijai (filtruotas sąrašas).
const ORDER_FILTERS = [
  ["laukia", "Laukia", o => o.status === "paid" || o.status === "packed"],
  ["issiusti", "Išsiųsti", o => o.status === "shipped"],
  ["visi", "Visi", () => true],
  ["grazinti", "Grąžinti", o => o.status === "refunded" || o.status === "cancelled"]
];
const SHIP_NAME = id => VD.SET.shipping?.find(s => s.id === id)?.name || id || "—";
const ordersState = { filter: "laukia", q: "", list: [], open: null };

async function renderOrders(main, _param, seq) {
  const nr = new URLSearchParams(location.search).get("nr");
  if (nr) {
    ordersState.q = nr;
    ordersState.filter = "visi";
    ordersState.open = nr;
  }
  main.innerHTML = pageHead("Užsakymai") + loading();
  ordersState.list = (await sbRest("orders?select=*&order=created_at.desc&limit=1000")) || [];
  if (stale(seq)) return;
  main.innerHTML = `${pageHead("Užsakymai", "", `<button class="btn ghost small" type="button" data-orders-csv>${glyph("doc")}CSV buhalterijai</button>`)}
<div class="admToolbar"><div class="seg admSeg" role="tablist">${ORDER_FILTERS.map(
    ([id, name, fn]) => `<button role="tab" type="button" data-of="${id}" aria-selected="${ordersState.filter === id}">${name} <small>${ordersState.list.filter(fn).length}</small></button>`
  ).join("")}</div>
<label class="search admSearch"><span data-glyph="search" aria-hidden="true"></span><input type="search" id="ordersQ" placeholder="Nr., vardas, el. paštas, telefonas" value="${esc(ordersState.q)}" aria-label="Paieška užsakymuose" /></label></div>
<div id="ordersList"></div>`;
  hydrateIcons(main);
  paintOrders();
  main.addEventListener("click", ordersClick);
  $("#ordersQ").addEventListener("input", e => {
    ordersState.q = e.target.value;
    paintOrders();
  });
}
function filteredOrders() {
  const fn = ORDER_FILTERS.find(f => f[0] === ordersState.filter)?.[2] || (() => true);
  const q = fold(ordersState.q.trim());
  return ordersState.list.filter(o => fn(o) && (!q || fold([o.ref, o.name, o.email, o.phone, o.tracking].join(" ")).includes(q)));
}
function orderItemRow(i) {
  const picks = i.picks?.length ? `<small>${esc(i.picks.map(id => VD.CAT.products.find(p => p.id === id)?.name || id).join(", "))}</small>` : "";
  return `<li><span>${esc(i.name)}${picks}</span><span class="admMuted">${i.qty} × ${centsEur(i.unit)}</span><b class="money">${centsEur(i.total ?? i.unit * i.qty)}</b></li>`;
}
function orderActions(o) {
  const b = [];
  if (o.status === "paid") b.push(`<button class="btn ghost small" type="button" data-oa="packed">${glyph("box")}Supakuota</button>`);
  if (o.status === "paid" || o.status === "packed") b.push(`<button class="btn primary small" type="button" data-oa="ship">${glyph("truck")}Išsiųsta…</button>`);
  if (o.status === "shipped") b.push(`<button class="btn primary small" type="button" data-oa="delivered">${glyph("check")}Pristatyta</button>`);
  if (o.status === "shipped") b.push(`<button class="btn ghost small" type="button" data-oa="ship">${glyph("edit")}Siuntos nr.</button>`);
  b.push(`<button class="btn ghost small" type="button" data-oa="copy">${glyph("copy")}Kopijuoti adresą</button>`);
  if (o.status !== "refunded" && o.status !== "cancelled" && o.payment_intent) b.push(`<button class="btn danger small" type="button" data-oa="refund">${glyph("return")}Grąžinti pinigus</button>`);
  return b.join("");
}
const shipTo = o => (o.shipping?.locker ? `Omniva paštomatas: ${o.shipping.locker}` : o.shipping?.address || "");
function paintOrders() {
  const box = $("#ordersList");
  if (!box) return;
  $$("[data-of]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.of === ordersState.filter)));
  const items = filteredOrders();
  if (!items.length) {
    box.innerHTML = emptyBox(
      ordersState.q ? "Nieko nerasta" : ordersState.filter === "laukia" ? "Visi užsakymai išsiųsti" : "Užsakymų nėra",
      ordersState.q ? "Pabandykite kitą paiešką" : ordersState.filter === "laukia" ? "Nauji apmokėti užsakymai atsiras čia." : ""
    );
    return;
  }
  box.innerHTML = `<div class="orders admOrders">${items
    .map(
      o => `<details class="order" data-order="${esc(o.id)}"${ordersState.open === o.ref || ordersState.open === o.id ? " open" : ""}>
<summary><span class="oMain"><b>${esc(o.ref)} · ${esc(o.name || o.email || "—")}</b><small>${fmtDateTime(o.created_at)} · ${esc((o.items || []).map(i => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join(", "))}</small></span>${statusPill(o.status)}<b class="money">${centsEur(o.amount_total)}</b>${glyph("chev-down")}</summary>
<div class="oBody admOBody">
<div class="admOGrid">
<div><h3>Pirkėjas</h3><p>${esc(o.name || "—")}<br />${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ""}${o.phone ? `<br /><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>` : ""}${o.user_id ? `<br /><span class="pill blue">Su paskyra</span>` : ""}</p></div>
<div><h3>Pristatymas</h3><p>${esc(SHIP_NAME(o.shipping?.method))} · ${centsEur(o.amount_shipping)}<br />${esc(shipTo(o) || "Adresas – Stripe užsakyme")}${o.tracking ? `<br />Siuntos nr.: <b>${esc(o.tracking)}</b>` : ""}${
        o.shipped_at ? `<br /><small>Išsiųsta ${fmtDateTime(o.shipped_at)}</small>` : ""
      }</p></div>
${o.gift ? `<div><h3>Dovanų pakavimas</h3><p>${o.gift.note ? `Rašteliukas: „${esc(o.gift.note)}“` : "Be rašteliuko"}</p></div>` : ""}
${o.credit_code ? `<div><h3>Mėginukų kodas</h3><p><b>${esc(o.credit_code)}</b></p></div>` : ""}
</div>
<ul class="admItems">${(o.items || []).map(orderItemRow).join("")}<li class="admTotal"><span>Iš viso (su pristatymu)</span><span></span><b class="money">${centsEur(o.amount_total)}</b></li></ul>
<div class="oActs admOActs">${orderActions(o)}${
        o.payment_intent ? `<a class="linkBtn" href="https://dashboard.stripe.com/payments/${esc(o.payment_intent)}" target="_blank" rel="noopener">Stripe ${glyph("ext")}</a>` : ""
      }</div>
</div></details>`
    )
    .join("")}</div>`;
  hydrateIcons(box);
}
async function setOrderStatus(o, status) {
  const patch = { status, ...(status === "delivered" ? { delivered_at: new Date().toISOString() } : {}) };
  const [row] = (await sbRest(`orders?id=eq.${o.id}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
  Object.assign(o, row || patch);
}
function openShipSheet(o) {
  openSheet({
    title: `Išsiųsti ${o.ref}`,
    html: `<form class="sheetPad admForm" novalidate>
<p class="admNote">${esc(SHIP_NAME(o.shipping?.method))}: ${esc(shipTo(o) || "adresas – Stripe užsakyme")}</p>
<label class="field"><span>Siuntos numeris</span><input name="tracking" maxlength="80" autocomplete="off" value="${esc(o.tracking || "")}" placeholder="pvz. CE123456789EE" /><small>${
      o.email ? `Pirkėjui (${esc(o.email)}) bus išsiųstas laiškas su siuntos numeriu.` : "Pirkėjo el. pašto nėra – laiškas nebus siunčiamas."
    }</small></label>
<p class="formErr" role="alert" hidden></p>
<button class="btn primary block" type="submit">${glyph("truck")}Pažymėti išsiųstu</button></form>`
  });
  const form = $("#sheetBody form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    busy($("button[type=submit]", form), async () => {
      const tracking = form.elements.tracking.value.trim();
      const d = await shopAdmin({ action: "ship", order_id: o.id, tracking });
      Object.assign(o, { status: "shipped", tracking: tracking || null, shipped_at: new Date().toISOString() });
      closeSheet();
      toast(d.mailed ? "Išsiųsta – pirkėjui išsiųstas laiškas" : "Pažymėta išsiųstu (laiškas nesiųstas)", { icon: "truck", ms: 3600 });
      ordersState.open = o.id;
      paintOrders();
      loadCounts();
    });
  });
}
async function ordersClick(e) {
  const t = e.target instanceof Element ? e.target : null;
  const f = t?.closest("[data-of]");
  if (f) {
    ordersState.filter = f.dataset.of;
    ordersState.open = null;
    return paintOrders();
  }
  if (t?.closest("[data-orders-csv]")) return exportOrders();
  const btn = t?.closest("[data-oa]");
  if (!btn) return;
  const o = ordersState.list.find(x => x.id === btn.closest("[data-order]").dataset.order);
  if (!o) return;
  const act = btn.dataset.oa;
  ordersState.open = o.id;
  if (act === "ship") return openShipSheet(o);
  if (act === "copy") {
    const txt = [o.name, o.phone, shipTo(o)].filter(Boolean).join("\n");
    return navigator.clipboard?.writeText(txt).then(() => toast("Adresas nukopijuotas", { icon: "copy" }));
  }
  if (act === "refund") {
    const ok = await askConfirm(`Pirkėjui ${o.name || o.email} bus grąžinta ${centsEur(o.amount_total)} per Stripe, o kvapų likučiai – atstatyti. Atšaukti nebus galima.`, {
      title: `Grąžinti pinigus už ${o.ref}?`,
      ok: "Grąžinti pinigus",
      danger: true
    });
    if (!ok) return;
    return busy(btn, async () => {
      await shopAdmin({ action: "refund", order_id: o.id });
      o.status = "refunded";
      toast("Pinigai grąžinami – Stripe juos perves per 5–10 d.", { icon: "return", ms: 4200 });
      paintOrders();
      loadCounts();
      VD.refreshCatalog({ rerender: false }).catch(() => {});
    });
  }
  return busy(btn, async () => {
    await setOrderStatus(o, act);
    toast(act === "packed" ? "Pažymėta: supakuota" : "Pažymėta: pristatyta", { icon: "check" });
    paintOrders();
    loadCounts();
  });
}
function exportOrders() {
  const rows = filteredOrders();
  if (!rows.length) return toast("Nėra ką eksportuoti", { icon: "info" });
  const head = ["Data", "Nr.", "Būsena", "Pirkėjas", "El. paštas", "Telefonas", "Prekės", "Prekės, €", "Pristatymas", "Pristatymas, €", "Iš viso, €", "Mėginukų kodas", "Siuntos nr.", "Stripe mokėjimas"];
  const n = c => ((Number(c) || 0) / 100).toFixed(2).replace(".", ",");
  const lines = rows.map(o => [
    fmtDateTime(o.created_at),
    o.ref,
    ORDER_STATUS[o.status]?.[0] || o.status,
    o.name,
    o.email,
    o.phone,
    (o.items || []).map(i => `${i.name} × ${i.qty}`).join("; "),
    n(o.amount_total - o.amount_shipping),
    `${SHIP_NAME(o.shipping?.method)}${shipTo(o) ? ` – ${shipTo(o)}` : ""}`,
    n(o.amount_shipping),
    n(o.amount_total),
    o.credit_code || "",
    o.tracking || "",
    o.payment_intent || ""
  ]);
  downloadFile(`vaidore-uzsakymai-${new Date().toISOString().slice(0, 10)}.csv`, csv([head, ...lines]));
}
