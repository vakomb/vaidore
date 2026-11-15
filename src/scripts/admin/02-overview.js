// 02 – Apžvalga: pajamos (šiandien, 7 d., 30 d.), kas laukia (išsiųsti, atsiliepimai, užklausos), maži likučiai,
// perkamiausi kvapai per 30 d. ir paruošimo darbai prieš paleidimą (rekvizitai, apmokėjimas).
const PAID = ["paid", "packed", "shipped", "delivered"];
async function renderOverview(main, _param, seq) {
  main.innerHTML = pageHead("Apžvalga", esc(fmtDate(new Date()))) + loading();
  const [orders, products, reviews, restock] = await Promise.all([
    sbRest(`orders?select=id,ref,status,amount_total,created_at,items,name&created_at=gte.${daysAgo(30)}&order=created_at.desc`),
    sbRest("products?select=id,name,stock,visible,look,images&order=rank.asc"),
    sbRest("reviews?select=id&status=eq.pending"),
    sbRest("restock_requests?select=id,product_id&notified=eq.false")
  ]);
  if (stale(seq)) return;
  const paid = orders.filter(o => PAID.includes(o.status));
  const sum = from => paid.filter(o => new Date(o.created_at) >= from).reduce((s, o) => s + o.amount_total, 0);
  const today = new Date();
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
    Object.entries(company).some(([, v]) => /^\[.*\]$/.test(String(v))) && ["Užpildykite įmonės rekvizitus", "admin/nustatymai#imone", "Jie rodomi poraštėje ir pirkimo sąlygose"],
    !products.some(p => p.images?.length) && ["Įkelkite kvapų nuotraukas", "admin/kvapai", "Kol nėra – rodomas nupieštas buteliukas"]
  ].filter(Boolean);
  const kpi = (label, value, sub = "") => `<div class="admKpi"><span>${label}</span><b class="money">${value}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const att = (n, text, href, ico) =>
    `<a class="row" href="${href}" data-nav><span class="rowIco" style="background:${n ? "var(--amber)" : "var(--green)"}">${glyph(ico)}</span><span class="rowTxt">${text}</span><b class="admRowNum">${n}</b><span class="chev">${glyph("chev-right")}</span></a>`;
  main.innerHTML = `${pageHead("Apžvalga", esc(fmtDate(new Date())), `<a class="btn primary small" href="admin/kvapai/naujas" data-nav>${glyph("plus")}Naujas kvapas</a>`)}
<div class="admKpis">${kpi("Šiandien", centsEur(sum(today)))}${kpi("7 dienos", centsEur(sum(d7)))}${kpi("30 dienų", centsEur(sum(new Date(0))), plural(paid.length, "užsakymas", "užsakymai", "užsakymų"))}${kpi(
    "Vidutinis krepšelis",
    paid.length ? centsEur(sum(new Date(0)) / paid.length) : "–"
  )}</div>
${todo.length ? `<h2 class="admH2">Prieš paleidimą</h2><div class="group">${todo.map(([t, href, sub]) => `<a class="row" href="${href}" data-nav><span class="rowIco" style="background:var(--brand)">${glyph("check")}</span><span class="rowTxt">${t}<small>${sub}</small></span><span class="chev">${glyph("chev-right")}</span></a>`).join("")}</div>` : ""}
<div class="admCols">
<section><h2 class="admH2">Reikia dėmesio</h2><div class="group">
${att(waiting.length, "Užsakymai laukia išsiuntimo", "admin/uzsakymai", "box")}
${att(reviews.length, "Atsiliepimai laukia peržiūros", "admin/atsiliepimai", "star")}
${att(restock.length, "Pirkėjai laukia išparduotų kvapų", "admin/laukia", "bell")}
</div>
<h2 class="admH2">Maži likučiai</h2>${
    low.length
      ? `<div class="group">${low
          .map(
            p =>
              `<a class="row" href="admin/kvapai/${p.id}" data-nav><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span class="rowTxt">${esc(p.name)}</span>${
                p.stock ? `<span class="pill amber">liko ${p.stock}</span>` : `<span class="pill red">išparduota</span>`
              }<span class="chev">${glyph("chev-right")}</span></a>`
          )
          .join("")}</div>`
      : `<p class="admNote">Visų matomų kvapų likutis didesnis nei 3 (arba neskaičiuojamas).</p>`
  }</section>
<section><h2 class="admH2">Perkamiausi per 30 d.</h2>${
    top.length
      ? `<div class="group">${top
          .map(
            ([id, n], i) =>
              `<a class="row" href="admin/kvapai/${id}" data-nav><b class="admRank">${i + 1}</b><span class="admThumb" style="--tint:${esc(byId.get(id).look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(byId.get(id)))}</span><span class="rowTxt">${esc(byId.get(id).name)}</span><span class="admMuted">${n} vnt.</span></a>`
          )
          .join("")}</div>`
      : `<p class="admNote">Užsakymų per 30 dienų dar nėra.</p>`
  }
<h2 class="admH2">Naujausi užsakymai</h2>${
    orders.length
      ? `<div class="group">${orders
          .slice(0, 5)
          .map(
            o =>
              `<a class="row" href="admin/uzsakymai?nr=${esc(o.ref)}" data-nav><span class="rowTxt"><b>${esc(o.ref)}</b> · ${esc(o.name || "—")}<small>${fmtDateTime(o.created_at)}</small></span>${statusPill(o.status)}<b class="money">${centsEur(o.amount_total)}</b></a>`
          )
          .join("")}</div>`
      : `<p class="admNote">Kai pirkėjas apmokės, užsakymas atsiras čia.</p>`
  }</section>
</div>`;
  hydrateIcons(main);
}
