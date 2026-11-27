// 30 - aromalempa (v34d): piešinys (kol nėra nuotraukos) ir interaktyvus blokas „Kaip tai veikia“ aromalempos ir kaitinamo
// vaško puslapiuose. Scena - SVG: auksinis dubenėlis ant juodo keraminio pagrindo, arbatinė žvakutė, vaško kubelis / aliejaus
// lašai, tirpstantis vaškas ir kylantis kvapas. Žingsniai 1-2-3 (mygtukai), aromalempai - ir „Vaškas / Aliejus“.
// Kai blokas pasirodo ekrane - žingsniai parodomi patys (vieną kartą; ne, jei sumažintas judesys arba pirkėjas jau spaudė).
let burnerSeq = 0;
function burnerScene(p, { demo = false } = {}) {
  const id = `vbn${++burnerSeq}`;
  const liq = p?.look?.liquid || "#e7c9a5";
  const wax = shade(liq, 0.2);
  const pool = shade(liq, 0.05);
  const name = demo ? "" : String(p?.name || "");
  return `<svg class="${demo ? "demoSvg" : "bottle burner"}" viewBox="${demo ? "0 24 240 192" : "0 0 240 220"}" role="img" aria-label="${esc(name || t("demo.title"))}">
<defs>
<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#8a6a2c"/><stop offset=".35" stop-color="#e9cf8c"/><stop offset=".6" stop-color="#c49a45"/><stop offset="1" stop-color="#7a5a22"/></linearGradient>
<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".42" stop-color="#2c2c2c"/><stop offset=".58" stop-color="#121212"/><stop offset="1" stop-color="#000"/></linearGradient>
<radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd58a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="120" cy="207" rx="62" ry="6" fill="#0F172A" fill-opacity=".1"/>
${demo ? `<circle class="dGlow" cx="120" cy="172" r="56" fill="url(#${id}l)"/>` : ""}
<path d="M72 204c3-40 14-66 34-84h28c20 18 31 44 34 84z" fill="url(#${id}b)"/>
<path d="M88 202c2-26 9-46 22-62M152 202c-2-26-9-46-22-62M80 186c8-14 16-22 26-26M160 186c-8-14-16-22-26-26" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.4" stroke-linecap="round"/>
<path d="M100 204c1-22 8-34 20-37 12 3 19 15 20 37z" fill="#1d1d1d"/>
<rect x="107" y="190" width="26" height="12" rx="2.5" fill="#f4f1ea" stroke="#0F172A" stroke-opacity=".15"/>
<path d="M120 190v-5" stroke="#333" stroke-width="1.2" stroke-linecap="round"/>
<g class="dFlame"${demo ? "" : ' style="opacity:1"'}><path d="M120 167c-6 7-6.5 14-0.2 18.5 6.4-4.5 5.9-11.5 0.2-18.5z" fill="#f2a33a"/><path d="M120 174c-2.6 3.2-2.8 6.6 0 8.6 2.8-2 2.6-5.4 0-8.6z" fill="#fff2c4"/></g>
<path d="M78 112c3 20 18 30 42 30s39-10 42-30z" fill="url(#${id}g)"/>
<ellipse cx="120" cy="112" rx="42" ry="9" fill="url(#${id}g)"/>
<ellipse cx="120" cy="112.5" rx="37" ry="6.8" fill="#6f5320"/>
<ellipse class="dPool" cx="120" cy="113" rx="34" ry="5.6" fill="${pool}"${demo ? "" : ' style="opacity:0"'}/>
<ellipse class="dWater" cx="120" cy="113" rx="34" ry="5.6" fill="#e9eef0" fill-opacity=".9"${demo ? "" : ' style="opacity:0"'}/>
${
  demo
    ? `<g class="dCube"><rect x="104" y="40" width="32" height="24" rx="4" fill="${wax}"/><rect x="107" y="43" width="26" height="4" rx="2" fill="#fff" fill-opacity=".45"/><rect x="104" y="60" width="32" height="4" rx="2" fill="#000" fill-opacity=".08"/></g>
<g class="dDrops" fill="${shade(liq, -0.15)}"><path d="M112 52c-3 4-3 7 0 8 3-1 3-4 0-8z"/><path d="M121 38c-3 4-3 7 0 8 3-1 3-4 0-8z"/><path d="M130 50c-3 4-3 7 0 8 3-1 3-4 0-8z"/></g>
<g class="dWaves" fill="none" stroke="#0F172A" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"><path d="M104 96c-6-8 6-14 0-22s6-14 0-22"/><path d="M120 92c-6-8 6-14 0-22s6-14 0-22"/><path d="M136 96c-6-8 6-14 0-22s6-14 0-22"/></g>`
    : ""
}
</svg>`;
}
const DEMO_STEPS = { wax: ["wax.1", "wax.2", "wax.3"], oil: ["oil.1", "wax.2", "oil.3"] };
function demoBlockHTML(p, cfg) {
  const kind = typeOf(p);
  if ((kind !== "aromalempos" && kind !== "vaskai") || (cfg.demo && cfg.demo.on === false)) return "";
  const both = kind === "aromalempos";
  const steps = DEMO_STEPS.wax
    .map((k, i) => `<li><button type="button" class="demoStep" data-demo-step="${i + 1}" aria-pressed="false"><i>${i + 1}</i><span>${esc(t(`demo.${k}.t`))}</span></button></li>`)
    .join("");
  return blockHTML(
    "pbDemo",
    t("demo.title"),
    `<div class="demo" data-demo data-step="0" data-mode="wax">
<div class="demoStage">${burnerScene(p, { demo: true })}</div>
${
  both
    ? `<div class="demoMode" role="radiogroup" aria-label="${esc(t("demo.mode"))}"><button type="button" role="radio" aria-checked="true" data-demo-mode="wax">${esc(t("demo.wax"))}</button><button type="button" role="radio" aria-checked="false" data-demo-mode="oil">${esc(t("demo.oil"))}</button></div>`
    : ""
}
<ol class="demoSteps">${steps}</ol>
<p class="demoCap" aria-live="polite">${esc(t("demo.start"))}</p>
</div>`,
    { lead: t("demo.lead") }
  );
}
function setDemo(box, step, mode = box.dataset.mode) {
  box.dataset.mode = mode;
  box.dataset.step = String(step);
  const keys = DEMO_STEPS[mode];
  $$("[data-demo-step]", box).forEach((b, i) => {
    b.setAttribute("aria-pressed", String(i + 1 === step));
    b.classList.toggle("done", i + 1 <= step);
    $("span", b).textContent = t(`demo.${keys[i]}.t`);
  });
  $$("[data-demo-mode]", box).forEach(b => b.setAttribute("aria-checked", String(b.dataset.demoMode === mode)));
  $(".demoCap", box).textContent = step ? t(`demo.${keys[step - 1]}.d`) : t("demo.start");
}
let demoObs = null;
function bindDemo(root) {
  demoObs?.disconnect();
  const box = $("[data-demo]", root);
  if (!box || reduceMotion() || !("IntersectionObserver" in window)) return;
  demoObs = new IntersectionObserver(
    ents => {
      if (!ents.some(e => e.isIntersecting)) return;
      demoObs.disconnect();
      let s = 0;
      const tick = () => {
        if (box.dataset.touched || !box.isConnected || ++s > 3) return;
        setDemo(box, s);
        setTimeout(tick, 1900);
      };
      setTimeout(tick, 500);
    },
    { threshold: 0.55 }
  );
  demoObs.observe(box);
}
document.addEventListener("click", e => {
  const el = e.target instanceof Element ? e.target : null;
  const step = el?.closest("[data-demo-step]");
  const mode = el?.closest("[data-demo-mode]");
  if (!step && !mode) return;
  const box = (step || mode).closest("[data-demo]");
  box.dataset.touched = "1";
  if (step) setDemo(box, Number(step.dataset.demoStep));
  else setDemo(box, 0, mode.dataset.demoMode);
});
