// 16 - „Rask savo kvapą“: 3 klausimai apatiniame lape → 3 tinkamiausi kvapai su „Kodėl tinka“.
// Logika - tik iš catalog.json laukų (gender, family, sillage), be serverio. Įėjimai: [data-quiz] (Pradžia, tuščia paieška).
const QUIZ = [
  {
    id: "who",
    q: t("quiz.who"),
    opts: [
      { id: "moterims", name: t("quiz.her") },
      { id: "vyrams", name: t("quiz.him") },
      { id: "any", name: t("quiz.any"), sub: t("quiz.anySub") }
    ]
  },
  {
    id: "fam",
    q: t("quiz.fam"),
    hint: t("quiz.famHint"),
    multi: 2,
    opts: () => [...CAT.families.map(f => ({ id: f.id, name: L(f, "name"), sub: L(f, "hint") })), { id: "none", name: t("quiz.famNone") }]
  },
  {
    id: "power",
    q: t("quiz.power"),
    opts: [
      { id: "2", name: t("level.2"), sub: t("quiz.p2") },
      { id: "3", name: t("level.3"), sub: t("quiz.p3") },
      { id: "4.5", name: t("quiz.p45"), sub: t("quiz.p45Sub") }
    ]
  }
];

// Grąžina [{ p, score, why: [tekstas…] }] - geriausi pirmi
function quizRank(a) {
  const fams = new Set((a.fam || []).filter(f => f !== "none"));
  const target = Number(a.power) || 3;
  return perfumes()
    .filter(inStock)
    .map(p => {
      let score = 0;
      const why = [];
      const add = (pts, text) => {
        score += pts;
        if (text && pts > 0) why.push([pts, text]);
      };
      if (a.who === "any") add(p.gender === "unisex" ? 2 : 0, t("quiz.whyUnisexAll"));
      else if (p.gender === a.who) add(3, null);
      else if (p.gender === "unisex") add(1.5, t("quiz.whyUnisex"));
      else return null;
      if (fams.has(p.family)) add(4, t("quiz.whyFamily", { name: familyName(p.family) }));
      const d = Math.abs(p.sillage - target);
      score -= d * 1.2;
      if (d <= 0.5) why.push([2, `${LEVEL[p.sillage]} - kaip norite`]);
      return { p, score, why: why.sort((x, y) => y[0] - x[0]).map(w => w[1]).slice(0, 3) };
    })
    .filter(Boolean)
    .sort((x, y) => y.score - x.score || x.p.rank - y.p.rank);
}

function openQuiz() {
  const ans = {};
  let step = 0;
  openSheet({ title: t("quiz.cta"), html: `<div class="sheetPad quiz" id="quizRoot" aria-live="polite"></div>` });
  const root = $("#quizRoot");
  const optsOf = q => (typeof q.opts === "function" ? q.opts() : q.opts);
  const draw = () => {
    if (step >= QUIZ.length) return drawResult();
    const q = QUIZ[step];
    const sel = [].concat(ans[q.id] || []);
    root.innerHTML = `<div class="qzProg" aria-label="${t("quiz.progress", { i: step + 1, n: QUIZ.length })}">${QUIZ.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
<h3 class="qzQ">${esc(q.q)}</h3>${q.hint ? `<p class="qzHint">${esc(q.hint)}</p>` : ""}
<div class="group qzOpts" role="${q.multi ? "group" : "radiogroup"}">${optsOf(q)
      .map(
        o =>
          `<button class="row" data-qz="${o.id}" role="${q.multi ? "checkbox" : "radio"}" aria-checked="${sel.includes(o.id)}"><span class="rowTxt">${esc(o.name)}${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span><span class="qzTick">${glyph("check")}</span></button>`
      )
      .join("")}</div>
<div class="qzNav">${step ? `<button class="btn ghost" data-qz-back>${glyph("chev-left")}${t("common.back")}</button>` : "<span></span>"}${
      q.multi ? `<button class="btn primary" data-qz-next${sel.length ? "" : " disabled"}>${t("common.continue")}</button>` : ""
    }</div>`;
    hydrateIcons(root);
  };
  const drawResult = () => {
    const top = quizRank(ans);
    const best = top.slice(0, 3);
    track("Užbaigė testą", { kvapai: best.map(r => r.p.name).join(", ") });
    root.innerHTML = `<h3 class="qzQ">${t("quiz.result")}</h3>
<div class="qzRes">${best
      .map(
        r => `<a class="qzCard" href="${productUrl(r.p)}?ml=2" data-nav><span class="art" style="--tint:${r.p.look.tint}">${artImg(r.p)}</span>
<span class="qzTxt"><b>${esc(L(r.p, "name"))}</b><small>${esc(GENDER_NAME[r.p.gender])} · ${esc(familyName(r.p.family))} · ${esc(r.p.conc)}</small>
<span class="qzWhy"><em>${t("quiz.why")}</em>${(r.why.length ? r.why : [L(r.p, "tagline")]).map(w => `<span>${glyph("check")}${esc(w)}</span>`).join("")}</span></span></a>`
      )
      .join("")}</div>
<div class="qzNav col">${
      DISC
        ? `<button class="btn primary block" data-qz-disc>${glyph("drop")}${t("quiz.trySamples", { price: eur(DISC.price) })}</button><p class="qzHint">${esc(t("quiz.discHint", { name: L(DISC, "name"), n: DISC.count - 3 }))}</p>`
        : ""
    }<button class="btn ghost block" data-qz-again>${t("quiz.again")}</button></div>`;
    hydrateIcons(root);
    root.dataset.picks = top
      .slice(0, DISC?.count || 5)
      .map(r => r.p.id)
      .join(",");
  };
  root.addEventListener("click", e => {
    const tx = e.target instanceof Element ? e.target : null;
    const opt = tx?.closest("[data-qz]");
    if (opt) {
      const q = QUIZ[step];
      if (q.multi) {
        let cur = [].concat(ans[q.id] || []);
        const id = opt.dataset.qz;
        if (id === "none") cur = cur.includes("none") ? [] : ["none"];
        else {
          cur = cur.filter(x => x !== "none");
          cur = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(-q.multi);
        }
        ans[q.id] = cur;
        draw();
      } else {
        ans[q.id] = opt.dataset.qz;
        opt.setAttribute("aria-checked", "true");
        step++;
        setTimeout(draw, reduceMotion() ? 0 : 140);
      }
      return;
    }
    if (tx?.closest("[data-qz-next]")) return (step++, draw());
    if (tx?.closest("[data-qz-back]")) return (step--, draw());
    if (tx?.closest("[data-qz-again]")) {
      Object.keys(ans).forEach(k => delete ans[k]);
      step = 0;
      return draw();
    }
    if (tx?.closest("[data-qz-disc]")) openDiscovery({ preset: root.dataset.picks.split(",") });
  });
  draw();
}
document.addEventListener("click", e => {
  if (e.target instanceof Element && e.target.closest("[data-quiz]")) openQuiz();
});
