// 30 - interaktyvios pamokos „Kaip naudoti“ (v34d - aromalempa, v34e - visi namų kvapai): kiekvienai kategorijai - SVG scena,
// kuri keičiasi pagal žingsnį (1-2-3), ir paaiškinimas po ja. Žingsnių pavadinimai ir tekstai - tie patys kaip „Kaip naudoti“
// (pdp.json / administravimas „Prekių puslapiai“), aromalempai - savi (dvi pamokos: „Vaškas / Aliejus“, žodynas demo.*).
// Kai blokas pasirodo ekrane - žingsniai parodomi patys (vieną kartą; ne, jei sumažintas judesys arba pirkėjas jau spaudė).
// Scenos: burnerScene (aromalempa, kaitinamas vaškas), candleScene (žvakė), reedScene (difuzorius su lazdelėmis),
// mistScene (aliejus, elektrinis difuzorius), sprayScene (namų purškiklis). Būsenos - CSS pagal .demo[data-kind][data-step].
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
// Bendros scenos dalys (judantys elementai - vidinėje grupėje, kad CSS transform nenutrintų SVG transform)
const DEMO_VB = 'viewBox="0 24 240 192"';
const demoWaves = (x = 120, y = 0, cls = "dWaves") =>
  `<g class="${cls}"><g transform="translate(${x - 120} ${y})"><g class="dMove" fill="none" stroke="#0F172A" stroke-opacity=".32" stroke-width="1.6" stroke-linecap="round"><path d="M104 96c-6-8 6-14 0-22s6-14 0-22"/><path d="M120 92c-6-8 6-14 0-22s6-14 0-22"/><path d="M136 96c-6-8 6-14 0-22s6-14 0-22"/></g></g></g>`;
const demoFlame = (x, y) =>
  `<g class="dFlame"><g transform="translate(${x} ${y})"><g class="dMove"><path d="M0-19c-6 7-6.5 14-0.2 18.5 6.4-4.5 5.9-11.5 0.2-18.5z" fill="#f2a33a"/><path d="M0-12c-2.6 3.2-2.8 6.6 0 8.6 2.8-2 2.6-5.4 0-8.6z" fill="#fff2c4"/></g></g></g>`;
const demoGlow = id =>
  `<radialGradient id="${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd58a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>`;
const demoLabel = (x, y, w, h, fs = 6.4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#111"/><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="1.5" fill="none" stroke="#C9A35A" stroke-width=".5"/><text x="${x + w / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${fs}" letter-spacing="1.1" fill="#D9B86A">VAIDORE</text>`;
const demoClock = (x, y) =>
  `<g class="dClock"><circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="#0F172A" stroke-width="1.4"/><path d="M${x} ${y - 10}v1.6M${x + 10} ${y}h-1.6M${x} ${y + 10}v-1.6M${x - 10} ${y}h1.6" stroke="#0F172A" stroke-width="1.2" stroke-linecap="round"/><g class="dHandle"><path d="M${x} ${y}v-8" stroke="#0F172A" stroke-width="1.6" stroke-linecap="round"/></g><path d="M${x} ${y}h5" stroke="#0F172A" stroke-width="1.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="1.6" fill="#0F172A"/></g>`;

// Žvakė stiklinėje su medine dagtimi (žingsniai kaip „Pirmasis uždegimas ir priežiūra“):
// 1 - pirmą kartą dega ilgai: ištirpsta visas paviršius; 2 - užgesinta, žirklės patrumpina dagtį; 3 - dega su laikrodžiu (iki 4 val.)
function candleScene(p) {
  const id = `vdc${++burnerSeq}`;
  const liq = p?.look?.liquid || "#e7c9a5";
  return `<svg class="demoSvg" ${DEMO_VB} role="img" aria-label="${esc(t("story.how"))}">
<defs>${demoGlow(`${id}l`)}</defs>
<ellipse cx="120" cy="207" rx="52" ry="5" fill="#0F172A" fill-opacity=".1"/>
<circle class="dGlow" cx="120" cy="100" r="64" fill="url(#${id}l)"/>
<rect x="80" y="112" width="80" height="94" rx="12" fill="#fff" fill-opacity=".6" stroke="#0F172A" stroke-opacity=".14"/>
<rect x="84" y="128" width="72" height="74" rx="8" fill="${shade(liq, 0.55)}"/>
<ellipse cx="120" cy="128" rx="36" ry="6" fill="${shade(liq, 0.7)}"/>
<ellipse class="dPool" cx="120" cy="128" rx="35" ry="5.6" fill="${shade(liq, 0.2)}"/>
${demoLabel(94, 154, 52, 22)}
<path d="M86 118c0-4 2-6 6-6M154 118c0-4-2-6-6-6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round"/>
<rect x="117.5" y="112" width="5" height="16" rx="1" fill="#9a7650"/>
<rect class="dWickTop" x="117.5" y="102" width="5" height="10.5" rx="1" fill="#9a7650"/>
<g class="dScissors"><g fill="none" stroke="#0F172A" stroke-width="1.8" stroke-linecap="round"><circle cx="158" cy="98" r="5"/><circle cx="158" cy="116" r="5"/><path d="M153.6 100.4 124 109.6M153.6 113.6 124 104.4"/></g></g>
${demoFlame(120, 111)}
<path class="dSmoke" d="M120 100c-5-6 5-11 0-17s5-11 0-17" fill="none" stroke="#0F172A" stroke-opacity=".25" stroke-width="1.6" stroke-linecap="round"/>
${demoWaves(120, -8)}
${demoClock(188, 76)}
</svg>`;
}
// Difuzorius su lazdelėmis (žingsniai „Kaip naudoti“): 1 - nuimamas dangtelis, 2 - įmerkiamos lazdelės,
// aliejus kyla jomis, kvapas sklinda; 3 - lazdelės apverčiamos (rodyklė), kvapas sustiprėja
function reedScene(p) {
  const liq = p?.look?.liquid || "#e7c9a5";
  // Lazdelės kertasi kaklelyje (120; 134): viršūnės išskleistos vėduokle, apačios - buteliuko viduje
  const reed = d => `M${(120 - d * 0.68).toFixed(1)} 198L${120 + d} 42`;
  const ds = [-38, -19, 0, 19, 38];
  return `<svg class="demoSvg" ${DEMO_VB} role="img" aria-label="${esc(t("story.how"))}">
<ellipse cx="120" cy="207" rx="44" ry="5" fill="#0F172A" fill-opacity=".1"/>
<g class="dReeds"><g fill="none" stroke-linecap="round" stroke-width="2.6">
<g stroke="#d8c09a">${ds.map(d => `<path d="${reed(d)}"/>`).join("")}</g>
<g class="dSoak" stroke="${shade(liq, -0.4)}">${ds.map(d => `<path d="${reed(d)}" pathLength="100"/>`).join("")}</g>
</g></g>
<rect x="110" y="126" width="20" height="16" rx="2" fill="#fff" fill-opacity=".7" stroke="#0F172A" stroke-opacity=".16"/>
<rect x="86" y="140" width="68" height="64" rx="15" fill="#fff" fill-opacity=".5" stroke="#0F172A" stroke-opacity=".16"/>
<path d="M87 166h66v22a15 15 0 0 1-15 15h-36a15 15 0 0 1-15-15z" fill="${liq}" fill-opacity=".8"/>
<path d="M92 156c0-6 3-10 8-11" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4" stroke-linecap="round"/>
${demoLabel(100, 172, 40, 18, 5.4)}
<g class="dCap"><rect x="106" y="108" width="28" height="20" rx="3" fill="#111"/><rect x="106" y="123" width="28" height="2" fill="#C9A35A"/></g>
<g class="dFlip"><g fill="none" stroke="#0F172A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M196 96a16 16 0 1 1-5-11.6"/><path d="M192 76v9h-9"/></g></g>
${demoWaves(62, 12)}${demoWaves(178, 12, "dWaves dWaves2")}
</svg>`;
}
// Elektrinis difuzorius su aliejumi (žingsniai „Kaip naudoti“ / „Kaip veikia“):
// 1 - talpa pripildoma vandens iki žymos, 2 - įlašinama aliejaus (vanduo nusidažo), 3 - įjungiama: šviesa ir migla
function mistScene(p) {
  const id = `vdm${++burnerSeq}`;
  const liq = typeOf(p) === "aliejai" && p?.look?.liquid ? p.look.liquid : "#e2c48e";
  return `<svg class="demoSvg" ${DEMO_VB} role="img" aria-label="${esc(t("story.how"))}">
<defs>${demoGlow(`${id}l`)}<clipPath id="${id}k"><rect x="96" y="134" width="48" height="44" rx="7"/></clipPath></defs>
<ellipse cx="120" cy="207" rx="56" ry="5" fill="#0F172A" fill-opacity=".1"/>
<circle class="dGlow" cx="120" cy="194" r="62" fill="url(#${id}l)"/>
<path d="M78 190v-38c0-30 18-48 42-50 24 2 42 20 42 50v38a12 12 0 0 1-12 12H90a12 12 0 0 1-12-12z" fill="#f6f3ee" stroke="#0F172A" stroke-opacity=".14"/>
<path d="M90 140c2-14 10-24 20-28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
<rect x="78" y="186" width="84" height="16" rx="8" fill="#e6dccd"/>
<rect class="dLed" x="88" y="190" width="64" height="3.4" rx="1.7" fill="#ffc861"/>
<circle class="dBtn" cx="120" cy="197.4" r="2.2" fill="#9a9a9a"/>
<ellipse cx="120" cy="103.6" rx="6" ry="2" fill="#0F172A" fill-opacity=".3"/>
<rect x="96" y="134" width="48" height="44" rx="7" fill="#fff" stroke="#0F172A" stroke-opacity=".16"/>
<g clip-path="url(#${id}k)"><g class="dTank"><rect x="96" y="144" width="48" height="34" fill="#d9e6ec"/><rect class="dTint" x="96" y="144" width="48" height="34" fill="${liq}" fill-opacity=".6"/><path d="M96 144c8 2 16 2 24 0s16-2 24 0" fill="none" stroke="#fff" stroke-opacity=".8"/></g></g>
<path d="M100 144h40" stroke="#0F172A" stroke-opacity=".28" stroke-dasharray="2.5 2.5"/>
<g class="dPour"><path d="M151 60c-8 8-22 18-31 38" fill="none" stroke="#b8d3df" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-38 168 52)"><path d="M154 34h30l-3 34h-24z" fill="#fff" fill-opacity=".85" stroke="#0F172A" stroke-opacity=".3" stroke-width="1.2" stroke-linejoin="round"/><path d="M156 50h26l-1.6 17h-22.8z" fill="#d9e6ec"/></g></g>
<g class="dDrops"><g fill="${shade(liq, -0.25)}"><path d="M120 46c-3.4 4.6-3.4 8 0 9.2 3.4-1.2 3.4-4.6 0-9.2z"/><path d="M120 64c-3.4 4.6-3.4 8 0 9.2 3.4-1.2 3.4-4.6 0-9.2z"/></g></g>
<g class="dMist"><g fill="#dfe3e8" fill-opacity=".9"><circle cx="120" cy="92" r="7"/><circle cx="114" cy="78" r="10"/><circle cx="126" cy="62" r="12"/><circle cx="116" cy="44" r="13"/></g></g>
</svg>`;
}
// Namų purškiklis (žingsniai „Kaip naudoti“): 1 - 1-2 purškimai į orą, 2 - ant užuolaidų iš ~30 cm, 3 - kvapas pasklinda (prieš svečius)
function sprayScene(p) {
  const liq = p?.look?.liquid || "#e7c9a5";
  const dots = (cls, pts) =>
    `<g class="${cls}"><g fill="${shade(liq, -0.2)}" fill-opacity=".5">${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g></g>`;
  return `<svg class="demoSvg" ${DEMO_VB} role="img" aria-label="${esc(t("story.how"))}">
<ellipse cx="72" cy="207" rx="30" ry="5" fill="#0F172A" fill-opacity=".1"/>
<path d="M150 40h76" stroke="#0F172A" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/>
<path class="dCurtain" d="M156 42c-4 52 4 108-3 160h66c-7-52 1-108-3-160z" fill="#efe9e1" stroke="#0F172A" stroke-opacity=".12"/>
<path d="M171 44c-3 50 3 104-1 156M187 44c3 50-3 104 1 156M203 44c-3 50 3 104-1 156" fill="none" stroke="#0F172A" stroke-opacity=".08" stroke-width="1.4"/>
<rect x="52" y="120" width="40" height="84" rx="8" fill="#fff" fill-opacity=".6" stroke="#0F172A" stroke-opacity=".14"/>
<rect x="56" y="152" width="32" height="48" rx="5" fill="${liq}" fill-opacity=".38"/>
${demoLabel(57, 140, 30, 22, 4.6)}
<rect x="65" y="108" width="14" height="13" rx="2" fill="#111"/>
<g class="dCapS"><path d="M60 92h24l9 5v6H60z" fill="#111"/><rect x="93" y="98" width="3" height="3" rx="1" fill="#333"/></g>
${dots("dPuff", [[106, 98, 4], [116, 92, 6], [128, 99, 7], [118, 106, 5], [134, 88, 4], [140, 104, 4]])}
${dots("dPuff2", [[104, 100, 2], [118, 101, 2.6], [134, 102, 3], [152, 103, 3.6], [170, 98, 6], [182, 112, 7], [172, 126, 6], [190, 96, 5], [194, 124, 5]])}
${demoWaves(186, -2)}${demoWaves(112, -10, "dWaves dWaves2")}
${demoClock(130, 168)}
</svg>`;
}
// Kategorija → scena ir pamokos; aromalempa - dvi pamokos (vaškas / aliejus) su žodyno tekstais
const DEMO_KINDS = {
  aromalempos: { scene: burnerScene, modes: ["wax", "oil"] },
  vaskai: { scene: burnerScene, modes: ["wax"] },
  zvakes: { scene: candleScene },
  difuzoriai: { scene: reedScene },
  aliejai: { scene: mistScene },
  "elektriniai-difuzoriai": { scene: mistScene },
  purskikliai: { scene: sprayScene }
};
const DEMO_STEPS = { wax: ["wax.1", "wax.2", "wax.3"], oil: ["oil.1", "wax.2", "oil.3"] };
function demoBlockHTML(p, cfg) {
  const kind = typeOf(p);
  const def = DEMO_KINDS[kind];
  if (!def || (cfg.demo && cfg.demo.on === false)) return "";
  const modes = def.modes || [];
  // Žingsniai: aromalempai / vaškui - žodynas (pagal pamoką), kitiems - „Kaip naudoti“ tekstai (iki 3)
  const own = modes.length ? null : (cfg.steps?.items || []).filter(x => x?.title || x?.text).slice(0, 3);
  if (own && (!blockOn(cfg.steps) || !own.length)) return "";
  const cap = (k, f) => esc(nb(t(`demo.${k}.${f}`)));
  const steps = (own || DEMO_STEPS.wax.map(() => ({})))
    .map((x, i) => {
      const data = own
        ? `data-cap="${esc(nb(x.text || ""))}"`
        : modes.map(m => `data-t-${m}="${cap(DEMO_STEPS[m][i], "t")}" data-cap-${m}="${cap(DEMO_STEPS[m][i], "d")}"`).join(" ");
      return `<li><button type="button" class="demoStep" data-demo-step="${i + 1}" aria-pressed="false" ${data}><i>${i + 1}</i><span>${esc(own ? x.title || "" : t(`demo.${DEMO_STEPS.wax[i]}.t`))}</span></button></li>`;
    })
    .join("");
  const mode = modes[0] || kind;
  return blockHTML(
    "pbDemo",
    own ? cfg.steps.title || t("story.how") : t("demo.title"),
    `<div class="demo${modes.length ? " demoBurner" : ""}" data-demo data-kind="${esc(kind)}" data-step="0" data-mode="${esc(mode)}" data-n="${own ? own.length : 3}">
<div class="demoStage">${def.scene(p, { demo: true })}</div>
${
  modes.length > 1
    ? `<div class="demoMode" role="radiogroup" aria-label="${esc(t("demo.mode"))}">${modes
        .map((m, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-demo-mode="${m}">${esc(t(`demo.${m}`))}</button>`)
        .join("")}</div>`
    : ""
}
<ol class="demoSteps">${steps}</ol>
<p class="demoCap" aria-live="polite">${esc(t("demo.start"))}</p>
</div>`,
    { lead: modes.length ? t("demo.lead") : t("demo.leadUse") }
  );
}
function setDemo(box, step, mode = box.dataset.mode) {
  box.dataset.mode = mode;
  box.dataset.step = String(step);
  const btns = $$("[data-demo-step]", box);
  btns.forEach((b, i) => {
    b.setAttribute("aria-pressed", String(i + 1 === step));
    b.classList.toggle("done", i + 1 <= step);
    const tt = b.getAttribute(`data-t-${mode}`);
    if (tt != null) $("span", b).textContent = tt;
  });
  $$("[data-demo-mode]", box).forEach(b => b.setAttribute("aria-checked", String(b.dataset.demoMode === mode)));
  const cur = btns[step - 1];
  $(".demoCap", box).textContent = cur ? cur.getAttribute(`data-cap-${mode}`) ?? cur.dataset.cap ?? "" : t("demo.start");
}
let demoObs = null;
function bindDemo(root) {
  demoObs?.disconnect();
  const box = $("[data-demo]", root);
  if (!box || reduceMotion() || !("IntersectionObserver" in window)) return;
  const n = Number(box.dataset.n) || 3;
  demoObs = new IntersectionObserver(
    ents => {
      if (!ents.some(e => e.isIntersecting)) return;
      demoObs.disconnect();
      let s = 0;
      const tick = () => {
        if (box.dataset.touched || !box.isConnected || ++s > n) return;
        setDemo(box, s);
        setTimeout(tick, 2100);
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
