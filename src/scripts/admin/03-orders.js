// 03 – Užsakymai: sąrašas (filtras pagal būseną, paieška – nr., vardas, el. paštas, telefonas, CSV buhalterijai) ir
// užsakymo ekranas admin/uzsakymai/<nr.> (kompiuteryje – šalia sąrašo). Veiksmai: „Supakuota“ → „Išsiųsta“ (siuntos nr. +
// laiškas pirkėjui, shop/admin) → „Pristatyta“; „Grąžinti pinigus“ (Stripe + likučiai). Greiti veiksmai sąraše – braukiant.
const ORDER_FILTERS = [
  ["laukia", "Laukia", o => o.status === "paid" || o.status === "packed"],
  ["issiusti", "Išsiųsti", o => o.status === "shipped"],
  ["visi", "Visi", () => true],
  ["grazinti", "Grąžinti", o => o.status === "refunded" || o.status === "cancelled"]
];
const SHIP_NAME = id => VD.SET.shipping?.find(s => s.id === id)?.name || id || "—";
const ordersState = { filter: "laukia", q: "", list: [], at: 0, shown: 50 };
const orderKey = o => o.ref || o.id;
const findOrder = key => ordersState.list.find(o => o.ref === key || o.id === key);

async function loadOrders(force = false) {
  if (!force && ordersState.list.length && Date.now() - ordersState.at < 30000) return ordersState.list;
  ordersState.list = (await sbRest("orders?select=*&order=created_at.desc&limit=1000")) || [];
  ordersState.at = Date.now();
  return ordersState.list;
}
async function renderOrders(main, param, seq) {
  const nr = new URLSearchParams(location.search).get("nr");
  if (nr && !param) return navigate(`admin/uzsakymai/${nr}`, { replace: true });
  if (isSplit()) {
    const { list, detail, fresh } = splitPanes(main, "orders");
    if (fresh) {
      list.innerHTML = ordersListHTML(true);
      hydrateIcons(list);
      await loadOrders(true);
      if (stale(seq)) return;
      mountOrdersList(list);
    }
    if (!param) {
      detail.innerHTML = detailEmpty("box", "Pasirinkite užsakymą");
      return;
    }
    if (!fresh) await loadOrders();
    if (stale(seq)) return;
    markCurrent(list, `admin/uzsakymai/${param}`);
    return renderOrder(detail, param, seq);
  }
  if (param) {
    main.innerHTML = pageHTML({ title: "Užsakymas", back: { href: "admin/uzsakymai", label: "Užsakymai" }, body: loading(5) });
    await loadOrders();
    if (stale(seq)) return;
    return renderOrder(main, param, seq);
  }
  main.innerHTML = ordersListHTML(!ordersState.list.length);
  hydrateIcons(main);
  if (ordersState.list.length) {
    mountOrdersList(main);
    loadOrders(true).then(() => !stale(seq) && paintOrders());
  } else {
    await loadOrders(true);
    if (stale(seq)) return;
    mountOrdersList(main);
  }
}
function ordersListHTML(skeleton) {
  return pageHTML({
    title: "Užsakymai",
    titleId: !isSplit(),
    actions: barBtn("doc", "CSV buhalterijai", "data-orders-csv"),
    tools: `${searchHTML("ordersQ", "Nr., vardas, el. paštas, telefonas", ordersState.q, "Paieška užsakymuose")}<div id="ordersSeg"></div>`,
    body: `<div id="ordersList">${skeleton ? loading(7) : ""}</div>`
  });
}
function mountOrdersList(box) {
  paintOrders();
  box.addEventListener("click", ordersListClick);
  $("#ordersQ", box).addEventListener("input", e => {
    ordersState.q = e.target.value;
    ordersState.shown = 50;
    paintOrders();
  });
  rowActions($("#ordersList", box), orderRowActs, (cell, k) => {
    const o = findOrder(cell.dataset.order);
    if (o) orderAction(o, k, null);
  });
}
function filteredOrders() {
  const fn = ORDER_FILTERS.find(f => f[0] === ordersState.filter)?.[2] || (() => true);
  const q = fold(ordersState.q.trim());
  return ordersState.list.filter(o => fn(o) && (!q || fold([o.ref, o.name, o.email, o.phone, o.tracking].join(" ")).includes(q)));
}
function orderRowActs(cell) {
  const o = findOrder(cell.dataset.order);
  if (!o) return [];
  const a = [];
  if (o.status === "paid") a.push({ key: "packed", label: "Supakuota", ico: "box", tone: "gray" });
  if (o.status === "paid" || o.status === "packed") a.push({ key: "ship", label: "Išsiųsta…", short: "Išsiųsta", ico: "truck", tone: "dark" });
  if (o.status === "shipped") a.push({ key: "delivered", label: "Pristatyta", ico: "check", tone: "dark" });
  a.push({ key: "copy", label: "Kopijuoti adresą", short: "Adresas", ico: "copy", tone: "gray" });
  return a;
}
function paintOrders() {
  const box = $("#ordersList");
  if (!box) return;
  const seg = $("#ordersSeg");
  if (seg) seg.innerHTML = segHTML(ORDER_FILTERS.map(([id, name, fn]) => [id, name, ordersState.list.filter(fn).length]), ordersState.filter, "data-of");
  const items = filteredOrders();
  if (!items.length) {
    box.innerHTML = emptyBox(
      ordersState.q ? "Nieko nerasta" : ordersState.filter === "laukia" ? "Visi užsakymai išsiųsti" : "Užsakymų nėra",
      ordersState.q ? "Pabandykite kitą paiešką" : ordersState.filter === "laukia" ? "Nauji apmokėti užsakymai atsiras čia." : ""
    );
    return;
  }
  const cur = isSplit() ? A.param : "";
  box.innerHTML = `<div class="ig axList admOrders">${items
    .slice(0, ordersState.shown)
    .map(o => {
      const what = (o.items || []).map(i => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join(", ");
      return `<div class="axCell" data-order="${esc(orderKey(o))}" data-title="${esc(o.ref)}"><a class="axRow axRow2" href="admin/uzsakymai/${esc(orderKey(o))}" data-nav${
        cur && (cur === o.ref || cur === o.id) ? ' aria-current="page"' : ""
      }><span class="axRowTxt"><b>${esc(o.ref)} · ${esc(o.name || o.email || "—")}</b><small>${fmtDateTime(o.created_at)} · ${esc(what)}</small></span><span class="axVal axValCol"><b class="money">${centsEur(
        o.amount_total
      )}</b>${statusPill(o.status)}</span><span class="axChev">${glyph("chev-right")}</span></a><button class="axRowMore" type="button" data-row-more aria-label="Veiksmai">${glyph("dots")}</button></div>`;
    })
    .join("")}</div>${items.length > ordersState.shown ? `<button class="axMoreBtn" type="button" data-orders-more>Rodyti daugiau (${items.length - ordersState.shown})</button>` : ""}`;
  hydrateIcons(box);
}
function ordersListClick(e) {
  const t = e.target instanceof Element ? e.target : null;
  const f = t?.closest("[data-of]");
  if (f) {
    ordersState.filter = f.dataset.of;
    ordersState.shown = 50;
    return paintOrders();
  }
  if (t?.closest("[data-orders-more]")) {
    ordersState.shown += 100;
    return paintOrders();
  }
  if (t?.closest("[data-orders-csv]")) return exportOrders();
}

// ── Užsakymo ekranas ──
function orderItemRow(i) {
  const picks = i.picks?.length ? `<small>${esc(i.picks.map(id => VD.CAT.products.find(p => p.id === id)?.name || id).join(", "))}</small>` : "";
  return `<li><span>${esc(i.name)}${picks}</span><span class="admMuted">${i.qty} × ${centsEur(i.unit)}</span><b class="money">${centsEur(i.total ?? i.unit * i.qty)}</b></li>`;
}
const shipTo = o => (o.shipping?.locker ? `Omniva paštomatas: ${o.shipping.locker}` : o.shipping?.address || "");
function orderActionsHTML(o) {
  const b = [];
  if (o.status === "paid" || o.status === "packed") b.push(`<button class="btn primary" type="button" data-oa="ship">${glyph("truck")}Išsiųsta…</button>`);
  if (o.status === "paid") b.push(`<button class="btn ghost" type="button" data-oa="packed">${glyph("box")}Supakuota</button>`);
  if (o.status === "shipped") b.push(`<button class="btn primary" type="button" data-oa="delivered">${glyph("check")}Pristatyta</button>`);
  return b.length ? `<div class="axActRow">${b.join("")}</div>` : "";
}
function renderOrder(box, key, seq) {
  const o = findOrder(key);
  const back = isSplit() ? null : { href: "admin/uzsakymai", label: "Užsakymai" };
  if (!o) {
    box.innerHTML = pageHTML({ title: "Užsakymas nerastas", back, body: emptyBox("Tokio užsakymo nėra", "Patikrinkite numerį.") });
    return;
  }
  const kv = (k, v) => `<div class="axKV"><span>${k}</span><span>${v}</span></div>`;
  const body = `<div class="axOrder" data-order="${esc(orderKey(o))}">
<div class="axOrderHead">${statusPill(o.status)}<b class="money">${centsEur(o.amount_total)}</b><small>${fmtDateTime(o.created_at)}</small></div>
${orderActionsHTML(o)}
${groupHTML(
  kv("Vardas", esc(o.name || "—")) +
    (o.email ? kv("El. paštas", `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`) : "") +
    (o.phone ? kv("Telefonas", `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>`) : "") +
    (o.user_id ? kv("Paskyra", "Su paskyra") : ""),
  { head: "Pirkėjas" }
)}
${groupHTML(
  kv("Būdas", `${esc(SHIP_NAME(o.shipping?.method))} · ${centsEur(o.amount_shipping)}`) +
    kv("Adresas", esc(shipTo(o) || "Stripe užsakyme")) +
    (o.tracking ? kv("Siuntos nr.", `<b>${esc(o.tracking)}</b>`) : "") +
    (o.shipped_at ? kv("Išsiųsta", fmtDateTime(o.shipped_at)) : "") +
    `<button class="axRow" type="button" data-oa="copy"><span class="axRowTxt"><b class="axLink">Kopijuoti adresą</b></span></button>` +
    (o.status === "shipped" ? `<button class="axRow" type="button" data-oa="ship"><span class="axRowTxt"><b class="axLink">Keisti siuntos nr.</b></span></button>` : ""),
  { head: "Pristatymas" }
)}
<h2 class="igHead">Prekės</h2><div class="ig"><ul class="admItems">${(o.items || []).map(orderItemRow).join("")}<li class="admTotal"><span>Iš viso (su pristatymu)</span><span></span><b class="money">${centsEur(o.amount_total)}</b></li></ul></div>
${o.gift || o.credit_code ? groupHTML((o.gift ? kv("Dovanų pakavimas", o.gift.note ? `„${esc(o.gift.note)}“` : "Be rašteliuko") : "") + (o.credit_code ? kv("Mėginukų kodas", `<b>${esc(o.credit_code)}</b>`) : "")) : ""}
${
  o.payment_intent
    ? groupHTML(
        navRow({ href: `https://dashboard.stripe.com/payments/${o.payment_intent}`, title: "Mokėjimas Stripe", ext: true }) +
          (o.status !== "refunded" && o.status !== "cancelled" ? `<button class="axRow danger" type="button" data-oa="refund"><span class="axRowTxt"><b>Grąžinti pinigus</b></span></button>` : "")
      )
    : ""
}
</div>`;
  box.innerHTML = pageHTML({ title: o.ref, back, body, cls: "axNarrow" });
  hydrateIcons(box);
  watchTitle(box);
  $(".axPage", box).addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest("[data-oa]");
    if (b) orderAction(o, b.dataset.oa, b);
  });
}
function repaintOrder(o) {
  paintOrders();
  const d = $(".axOrder");
  if (d && d.dataset.order === orderKey(o)) renderOrder(d.closest("#admDetail") || $("#admMain"), orderKey(o), A.seq);
  loadCounts();
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
<p class="axSheetNote">${esc(SHIP_NAME(o.shipping?.method))}: ${esc(shipTo(o) || "adresas – Stripe užsakyme")}</p>
<div class="ig"><label class="field axField"><span>Siuntos nr.</span><input name="tracking" maxlength="80" autocomplete="off" value="${esc(o.tracking || "")}" placeholder="CE123456789EE" /></label></div>
<p class="igFoot">${o.email ? `Pirkėjui (${esc(o.email)}) bus išsiųstas laiškas su siuntos numeriu.` : "Pirkėjo el. pašto nėra – laiškas nebus siunčiamas."}</p>
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
      repaintOrder(o);
    });
  });
}
async function orderAction(o, act, btn) {
  if (act === "ship") return openShipSheet(o);
  if (act === "copy") {
    const txt = [o.name, o.phone, shipTo(o)].filter(Boolean).join("\n");
    return navigator.clipboard?.writeText(txt).then(() => toast("Adresas nukopijuotas", { icon: "copy" }));
  }
  if (act === "refund") {
    const ok = await askConfirm(`Pirkėjui ${o.name || o.email} bus grąžinta ${centsEur(o.amount_total)} per Stripe, o likučiai – atstatyti. Atšaukti nebus galima.`, {
      title: `Grąžinti pinigus už ${o.ref}?`,
      ok: "Grąžinti pinigus",
      danger: true
    });
    if (!ok) return;
    const run = async () => {
      await shopAdmin({ action: "refund", order_id: o.id });
      o.status = "refunded";
      toast("Pinigai grąžinami – Stripe juos perves per 5–10 d.", { icon: "return", ms: 4200 });
      repaintOrder(o);
      VD.refreshCatalog({ rerender: false }).catch(() => {});
    };
    return btn ? busy(btn, run) : run().catch(err => toast(errText(err), { icon: "info" }));
  }
  const run = async () => {
    await setOrderStatus(o, act);
    toast(act === "packed" ? "Pažymėta: supakuota" : "Pažymėta: pristatyta", { icon: "check" });
    repaintOrder(o);
  };
  return btn ? busy(btn, run) : run().catch(err => toast(errText(err), { icon: "info" }));
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
