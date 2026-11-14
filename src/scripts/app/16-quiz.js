// 16 – „Rask savo kvapą“: 4 klausimai apatiniame lape → 3 tinkamiausi kvapai su „Kodėl tinka“.
// Logika – tik iš catalog.json laukų (gender, family, time, sillage, seasons), be serverio. Įėjimai: [data-quiz] (Pradžia, tuščia paieška).
const QUIZ = [
  {
    id: "who",
    q: "Kam ieškote kvapo?",
    opts: [
      { id: "moterims", name: "Moteriai" },
      { id: "vyrams", name: "Vyrui" },
      { id: "any", name: "Nesvarbu", sub: "Patinka ir unisex kvapai" }
    ]
  },
  {
    id: "when",
    q: "Kokia proga?",
    opts: [
      { id: "daily", name: "Kasdien", sub: "Lengvai ir patogiai" },
      { id: "work", name: "Darbui", sub: "Diskretiškai, netrukdant kitiems" },
      { id: "evening", name: "Vakarui ir šventėms", sub: "Ryškiau, įsimintinai" },
      { id: "date", name: "Pasimatymui", sub: "Šilta ir artima" }
    ]
  },
  {
    id: "fam",
    q: "Kokie kvapai jums patinka?",
    hint: "Pasirinkite iki dviejų",
    multi: 2,
    opts: () => [...CAT.families.map(f => ({ id: f.id, name: f.name, sub: f.hint })), { id: "none", name: "Nežinau – pasiūlykite" }]
  },
  {
    id: "power",
    q: "Koks intensyvumas?",
    opts: [
      { id: "2", name: "Lengvas", sub: "Jaučiamas arti" },
      { id: "3", name: "Vidutinis", sub: "Jaučiamas šalia esančių" },
      { id: "4.5", name: "Ryškus", sub: "Ilgai ir toli jaučiamas" }
    ]
  }
];
const SEASON_NOW = ["žiema", "žiema", "pavasaris", "pavasaris", "pavasaris", "vasara", "vasara", "vasara", "ruduo", "ruduo", "ruduo", "žiema"][new Date().getMonth()];

// Grąžina [{ p, score, why: [tekstas…] }] – geriausi pirmi
function quizRank(a) {
  const fams = new Set((a.fam || []).filter(f => f !== "none"));
  const target = Number(a.power) || 3;
  return PRODUCTS.filter(inStock)
    .map(p => {
      let score = 0;
      const why = [];
      const add = (pts, text) => {
        score += pts;
        if (text && pts > 0) why.push([pts, text]);
      };
      if (a.who === "any") add(p.gender === "unisex" ? 2 : 0, "Unisex – tinka visiems");
      else if (p.gender === a.who) add(3, null);
      else if (p.gender === "unisex") add(1.5, "Unisex kvapas");
      else return null;
      if (fams.has(p.family)) add(4, `${familyName(p.family)} kvapas – kaip mėgstate`);
      const day = p.time.includes("diena"),
        eve = p.time.includes("vakaras");
      if (a.when === "daily") add((day ? 2 : 0) + (p.sillage <= 3 ? 1 : 0), day ? "Tinka kasdien" : null);
      if (a.when === "work") add((day ? 2 : 0) + (p.sillage <= 2 ? 2 : p.sillage >= 4 ? -2 : 0), day && p.sillage <= 3 ? "Diskretiškas – tinka darbui" : null);
      if (a.when === "evening") add((eve ? 2 : 0) + (p.sillage >= 3 ? 1 : 0), eve ? "Vakaro kvapas" : null);
      if (a.when === "date")
        add((eve ? 1.5 : 0) + (["ambros", "gurmaniski", "geliu"].includes(p.family) ? 1.5 : 0), eve ? "Šiltas ir artimas – pasimatymui" : null);
      const d = Math.abs(p.sillage - target);
      score -= d * 1.2;
      if (d <= 0.5) why.push([2, `${LEVEL[p.sillage]} – kaip norite`]);
      if (p.seasons.includes(SEASON_NOW)) add(1, `Tinka ${SEASON_DAT[SEASON_NOW]}`);
      return { p, score, why: why.sort((x, y) => y[0] - x[0]).map(w => w[1]).slice(0, 3) };
    })
    .filter(Boolean)
    .sort((x, y) => y.score - x.score || x.p.rank - y.p.rank);
}

function openQuiz() {
  const ans = {};
  let step = 0;
  openSheet({ title: "Rask savo kvapą", url: "#/testas", html: `<div class="sheetPad quiz" id="quizRoot" aria-live="polite"></div>` });
  const root = $("#quizRoot");
  const optsOf = q => (typeof q.opts === "function" ? q.opts() : q.opts);
  const draw = () => {
    if (step >= QUIZ.length) return drawResult();
    const q = QUIZ[step];
    const sel = [].concat(ans[q.id] || []);
    root.innerHTML = `<div class="qzProg" aria-label="Klausimas ${step + 1} iš ${QUIZ.length}">${QUIZ.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
<h3 class="qzQ">${esc(q.q)}</h3>${q.hint ? `<p class="qzHint">${esc(q.hint)}</p>` : ""}
<div class="group qzOpts" role="${q.multi ? "group" : "radiogroup"}">${optsOf(q)
      .map(
        o =>
          `<button class="row" data-qz="${o.id}" role="${q.multi ? "checkbox" : "radio"}" aria-checked="${sel.includes(o.id)}"><span class="rowTxt">${esc(o.name)}${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span><span class="qzTick">${glyph("check")}</span></button>`
      )
      .join("")}</div>
<div class="qzNav">${step ? `<button class="btn ghost" data-qz-back>${glyph("chev-left")}Atgal</button>` : "<span></span>"}${
      q.multi ? `<button class="btn primary" data-qz-next${sel.length ? "" : " disabled"}>Toliau</button>` : ""
    }</div>`;
    hydrateIcons(root);
  };
  const drawResult = () => {
    const top = quizRank(ans);
    const best = top.slice(0, 3);
    track("Užbaigė testą", { kvapai: best.map(r => r.p.name).join(", ") });
    root.innerHTML = `<h3 class="qzQ">Jums turėtų patikti</h3>
<div class="qzRes">${best
      .map(
        r => `<button class="qzCard" data-open="${r.p.id}" data-sample="1"><span class="art" style="--tint:${r.p.look.tint}">${artImg(r.p)}</span>
<span class="qzTxt"><b>${esc(r.p.name)}</b><small>${esc(GENDER_NAME[r.p.gender])} · ${esc(familyName(r.p.family))} · ${esc(r.p.conc)}</small>
<span class="qzWhy"><em>Kodėl tinka</em>${(r.why.length ? r.why : [r.p.tagline]).map(w => `<span>${glyph("check")}${esc(w)}</span>`).join("")}</span></span></button>`
      )
      .join("")}</div>
<div class="qzNav col">${
      DISC
        ? `<button class="btn primary block" data-qz-disc>${glyph("drop")}Išbandyti mėginukais · ${eur(DISC.price)}</button><p class="qzHint">${esc(DISC.name)}: šie 3 ir dar ${DISC.count - 3} pagal jūsų atsakymus – galėsite pakeisti.</p>`
        : ""
    }<button class="btn ghost block" data-qz-again>Pradėti iš naujo</button></div>`;
    hydrateIcons(root);
    root.dataset.picks = top
      .slice(0, DISC?.count || 5)
      .map(r => r.p.id)
      .join(",");
  };
  root.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    const opt = t?.closest("[data-qz]");
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
    if (t?.closest("[data-qz-next]")) return (step++, draw());
    if (t?.closest("[data-qz-back]")) return (step--, draw());
    if (t?.closest("[data-qz-again]")) {
      Object.keys(ans).forEach(k => delete ans[k]);
      step = 0;
      return draw();
    }
    if (t?.closest("[data-qz-disc]")) openDiscovery({ preset: root.dataset.picks.split(",") });
  });
  draw();
}
document.addEventListener("click", e => {
  if (e.target instanceof Element && e.target.closest("[data-quiz]")) openQuiz();
});
