// 02 - Šiandien: pajamos (šiandien, 7 d., 30 d., vidutinis krepšelis), „Prieš paleidimą“, „Reikia dėmesio“ (kiekviena
// eilutė veda tiesiai į darbą), maži likučiai, perkamiausi per 30 d., naujausi užsakymai.
const PAID = ["paid", "packed", "shipped", "delivered"];
async function renderOverview(main, _param, seq) {
  const today = new Date();
  const dateTxt = today.toLocaleDateString("lt-LT", { weekday: "long", month: "long", day: "numeric" });
  const actions = barLink("plus", "Naujas produktas", "admin/kvapai/naujas");
  main.innerHTML = pageHTML({ title: "Šiandien", sub: esc(dateTxt), actions, body: loading(4) });
  const [orders, products, reviews, restock] = await Promise.all([
    sbRest(`orders?select=id,ref,status,amount_total,created_at,items,name&created_at=gte.${daysAgo(30)}&order=created_at.desc`),
    sbRest("products?select=id,name,stock,visible,look,images&order=rank.asc"),
    sbRest("reviews?select=id&status=eq.pending"),
    sbRest("restock_requests?select=id,product_id&notified=eq.false")
  ]);
  if (stale(seq)) return;
  const paid = orders.filter(o => PAID.includes(o.status));
  const sum = from => paid.filter(o => new Date(o.created_at) >= from).reduce((s, o) => s + o.amount_total, 0);
  today.setHours(0, 0, 0, 0);
  const d7 = new Date(Date.now() - 7 * 864e5);
  const waiting = orders.filter(o => o.status === "paid" || o.status === "packed");
  const low = products.filter(p => p.visible !== false && p.stock != null && p.stock <= 3).sort((a, b) => a.stock - b.stock);
  const qty = new Map();
  for (const o of paid)
    for (const i of o.items || []) {
      const ids = i.picks || [i.id];
      for (const id of ids) qty.set(id, (qty.get(id) || 0) + i.qty);
    }
  const byId = new Map(products.map(p => [p.id, p]));
  const top = [...qty]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const company = VD.SET.company || {};
  const todo = [
    Object.entries(company).some(([, v]) => /^\[.*\]$/.test(String(v))) && ["Užpildykite įmonės rekvizitus", "admin/nustatymai/imone", "Rodomi poraštėje ir pirkimo sąlygose"],
    !products.some(p => p.images?.length) && ["Įkelkite produktų nuotraukas", "admin/kvapai", "Kol nėra - rodomas nupieštas buteliukas"]
  ].filter(Boolean);
  const kpi = (label, value, sub = "") => `<div class="admKpi"><span>${label}</span><b class="money">${value}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const att = (n, text, href, ico, done) =>
    navRow({ href, ico, icoBg: n ? "var(--amber)" : "var(--green)", title: text, sub: n ? "" : done, value: n ? `<b class="admRowNum">${n}</b>` : "" });
  const body = `<div class="admKpis">${kpi("Šiandien", centsEur(sum(today)))}${kpi("7 dienos", centsEur(sum(d7)))}${kpi("30 dienų", centsEur(sum(new Date(0))), plural(paid.length, "užsakymas", "užsakymai", "užsakymų"))}${kpi(
    "Vidutinis krepšelis",
    paid.length ? centsEur(sum(new Date(0)) / paid.length) : "-"
  )}</div>
${todo.length ? groupHTML(todo.map(([t, href, sub]) => navRow({ href, ico: "check", icoBg: "var(--brand)", title: t, sub })).join(""), { head: "Prieš paleidimą" }) : ""}
<div class="axCols">
<section>${groupHTML(
    [
      att(waiting.length, "Laukia išsiuntimo", "admin/uzsakymai", "box", "Visi užsakymai išsiųsti"),
      att(reviews.length, "Atsiliepimai peržiūrai", "admin/atsiliepimai", "star", "Naujų nėra"),
      att(restock.length, "Laukia išparduotų prekių", "admin/laukia", "bell", "Niekas nelaukia")
    ].join(""),
    { head: "Reikia dėmesio" }
  )}
${
  low.length
    ? groupHTML(
        low.map(p => navRow({ href: `admin/kvapai/${p.id}`, lead: thumb(p), title: esc(p.name), value: p.stock ? pillHTML(`liko ${p.stock}`, "amber") : pillHTML("išparduota", "red") })).join(""),
        { head: "Maži likučiai" }
      )
    : ""
}</section>
<section>${groupHTML(
    orders.length
      ? orders
          .slice(0, 5)
          .map(o =>
            navRow({ href: `admin/uzsakymai/${o.ref}`, title: `${esc(o.ref)} · ${esc(o.name || "-")}`, sub: fmtDateTime(o.created_at), value: `${statusPill(o.status)}<b class="money">${centsEur(o.amount_total)}</b>` })
          )
          .join("")
      : `<p class="axRowNote">Kai pirkėjas apmokės, užsakymas atsiras čia.</p>`,
    { head: "Naujausi užsakymai" }
  )}
${
  top.length
    ? groupHTML(
        top.map(([id, n], i) => navRow({ href: `admin/kvapai/${id}`, lead: `<b class="admRank">${i + 1}</b>${thumb(byId.get(id))}`, title: esc(byId.get(id).name), value: `<span class="admMuted">${n} vnt.</span>` })).join(""),
        { head: "Perkamiausi per 30 d." }
      )
    : ""
}</section>
</div>`;
  main.innerHTML = pageHTML({ title: "Šiandien", sub: esc(dateTxt), actions, body });
  hydrateIcons(main);
}
