// 07 - „Pranešti, kai bus“: kas laukia kurio kvapo. Kvapą vėl turint (likutis ne 0) - „Pranešti“ išsiunčia laiškus
// (shop/admin, Resend) ir pažymi užklausas. Ištrintos užklausos - pirkėjo prašymu (BDAR).
const restockState = { rows: [] };

async function renderRestock(main, _param, seq) {
  const back = hubBack();
  main.innerHTML = pageHTML({ title: "Laukiantys", back, body: loading(4) });
  const [rows, products] = await Promise.all([sbRest("restock_requests?select=*&order=created_at.desc&limit=2000"), sbRest("products?select=id,name,stock,look,images,visible")]);
  if (stale(seq)) return;
  restockState.rows = rows;
  const byId = new Map(products.map(p => [p.id, p]));
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.product_id)) groups.set(r.product_id, []);
    groups.get(r.product_id).push(r);
  }
  main.innerHTML = pageHTML({ title: "Laukiantys", back, cls: "axNarrow", body: `<p class="axLead">Pirkėjai, paspaudę „Pranešti, kai bus“ prie išparduotos prekės.</p>${
    groups.size
      ? `<div class="admReviews">${[...groups]
          .sort((a, b) => b[1].filter(r => !r.notified).length - a[1].filter(r => !r.notified).length)
          .map(([pid, list]) => {
            const p = byId.get(pid) || { id: pid, name: pid, look: {} };
            const waiting = list.filter(r => !r.notified);
            const inStock = p.stock == null || p.stock > 0;
            return `<article class="ig admRestock" data-pid="${esc(pid)}">
<header><a class="admProd" href="admin/kvapai/${esc(pid)}" data-nav><span class="admThumb" style="--tint:${esc(p.look?.tint || "#F6F7F9")}">${VD.artImg(appProduct(p))}</span><span><b>${esc(p.name)}</b><small>${
              inStock ? `Vėl prekyboje${p.stock != null ? ` · liko ${p.stock}` : ""}` : "Išparduota - papildykite likutį, tada praneškite"
            }</small></span></a>${
              waiting.length
                ? `<button class="btn ${inStock ? "primary" : "ghost"} small" type="button" data-notify${attr(!inStock, "disabled")} >${glyph("mail")}Pranešti (${waiting.length})</button>`
                : `<span class="pill green">Visiems pranešta</span>`
            }</header>
<details><summary>${plural(list.length, "užklausa", "užklausos", "užklausų")}${waiting.length ? ` · laukia ${waiting.length}` : ""}</summary><ul class="admEmails">${list
              .map(
                r => `<li data-rq="${esc(r.id)}"><span>${esc(r.email)}</span><small>${fmtDate(r.created_at)}${r.notified ? " · pranešta" : ""}</small><button class="roundBtn" type="button" data-rq-del aria-label="Ištrinti ${esc(r.email)}">${glyph("trash")}</button></li>`
              )
              .join("")}</ul></details>
</article>`;
          })
          .join("")}</div>`
      : emptyBox("Niekas nelaukia", "Kai prekė išparduota (likutis 0), pirkėjai gali palikti el. paštą - jie atsiras čia.")
  }` });
  hydrateIcons(main);
  main.addEventListener("click", async e => {
    const t = e.target instanceof Element ? e.target : null;
    const nb = t?.closest("[data-notify]");
    if (nb) return busy(nb, () => notifyRestock(nb.closest("[data-pid]").dataset.pid).then(() => render("laukia")));
    const del = t?.closest("[data-rq-del]");
    if (del) {
      const id = del.closest("[data-rq]").dataset.rq;
      busy(del, async () => {
        await sbRest(`restock_requests?id=eq.${id}`, { method: "DELETE" });
        del.closest("li").remove();
        loadCounts();
      });
    }
  });
}
async function notifyRestock(productId) {
  const d = await shopAdmin({ action: "restock-notify", product_id: productId });
  if (!d.mail) toast("Laiškų siuntimas neįjungtas (RESEND_API_KEY) - parašykite pirkėjams patys", { icon: "info", ms: 6000 });
  else toast(`Išsiųsta ${d.sent} iš ${d.total}`, { icon: "mail", ms: 3600 });
  loadCounts();
  return d;
}
