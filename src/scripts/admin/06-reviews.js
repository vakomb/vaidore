// 06 – Atsiliepimai: rašo tik pirkę (RLS), skelbiami tik peržiūrėti. Laukia → Paskelbti / Paslėpti; ištrinti.
const REV_FILTERS = [
  ["pending", "Laukia"],
  ["approved", "Paskelbti"],
  ["hidden", "Paslėpti"]
];
const revState = { filter: "pending", rows: [] };

async function renderReviews(main, _param, seq) {
  main.innerHTML = pageHead("Atsiliepimai") + loading();
  revState.rows = (await sbRest("reviews?select=*&order=created_at.desc&limit=500")) || [];
  if (stale(seq)) return;
  main.innerHTML = `${pageHead("Atsiliepimai", "Atsiliepimus rašyti gali tik pirkę kvapą. Parduotuvėje rodomi tik paskelbti.")}
<div class="admToolbar"><div class="seg admSeg" role="tablist">${REV_FILTERS.map(
    ([id, name]) => `<button role="tab" type="button" data-rf="${id}" aria-selected="${revState.filter === id}">${name} <small>${revState.rows.filter(r => r.status === id).length}</small></button>`
  ).join("")}</div></div>
<div id="revList"></div>`;
  paintReviews();
  main.addEventListener("click", reviewsClick);
}
function paintReviews() {
  const box = $("#revList");
  if (!box) return;
  $$("[data-rf]").forEach(b => {
    b.setAttribute("aria-selected", String(b.dataset.rf === revState.filter));
    $("small", b).textContent = String(revState.rows.filter(r => r.status === b.dataset.rf).length);
  });
  const rows = revState.rows.filter(r => r.status === revState.filter);
  if (!rows.length) {
    box.innerHTML = emptyBox(revState.filter === "pending" ? "Naujų atsiliepimų nėra" : "Nėra", revState.filter === "pending" ? "Kai pirkėjas parašys atsiliepimą, jis atsiras čia." : "");
    return;
  }
  const pname = id => VD.CAT.products.find(p => p.id === id)?.name || id;
  box.innerHTML = `<div class="admReviews">${rows
    .map(
      r => `<article class="admCard admReview" data-rid="${esc(r.id)}">
<header><a href="admin/kvapai/${esc(r.product_id)}" data-nav><b>${esc(pname(r.product_id))}</b></a><span class="admStars" aria-label="${r.rating || 0} iš 5">${"★".repeat(r.rating || 0)}<span>${"★".repeat(5 - (r.rating || 0))}</span></span></header>
<p class="admRevText">${esc(r.text)}</p>
<p class="admMuted">${esc(r.name)} · ${fmtDate(r.created_at)}${r.verified ? " · Patvirtintas pirkėjas" : ""}</p>
<div class="admOActs">${r.status !== "approved" ? `<button class="btn primary small" type="button" data-ra="approved">${glyph("check")}Paskelbti</button>` : ""}${
        r.status !== "hidden" ? `<button class="btn ghost small" type="button" data-ra="hidden">${glyph("eye-off")}Paslėpti</button>` : ""
      }<button class="btn danger small" type="button" data-ra="delete">${glyph("trash")}Ištrinti</button></div>
</article>`
    )
    .join("")}</div>`;
  hydrateIcons(box);
}
async function reviewsClick(e) {
  const t = e.target instanceof Element ? e.target : null;
  const f = t?.closest("[data-rf]");
  if (f) {
    revState.filter = f.dataset.rf;
    return paintReviews();
  }
  const b = t?.closest("[data-ra]");
  if (!b) return;
  const r = revState.rows.find(x => x.id === b.closest("[data-rid]").dataset.rid);
  const act = b.dataset.ra;
  const wasPublic = r.status === "approved";
  if (act === "delete" && !(await askConfirm("Atsiliepimas bus ištrintas visam laikui.", { title: "Ištrinti atsiliepimą?", ok: "Ištrinti", danger: true }))) return;
  busy(b, async () => {
    if (act === "delete") {
      await sbRest(`reviews?id=eq.${r.id}`, { method: "DELETE" });
      revState.rows = revState.rows.filter(x => x !== r);
    } else {
      await sbRest(`reviews?id=eq.${r.id}`, { method: "PATCH", body: { status: act } });
      r.status = act;
    }
    paintReviews();
    loadCounts();
    // Parduotuvėje matomi tik paskelbti – katalogą atnaujiname, jei pasikeitė, kas rodoma
    if (act === "approved" || wasPublic) await catalogChanged(act === "approved" ? "Atsiliepimas paskelbtas" : act === "delete" ? "Ištrinta" : "Paslėpta");
  });
}
