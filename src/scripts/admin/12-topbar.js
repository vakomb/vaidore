// 12 – Juosta virš header'io (admin/pradzia, pirmas skyrius): žinutės (tekstas, trumpas variantas telefonui, nuoroda,
// rodoma / paslėpta, eilė), dizainas (paruošti variantai + savos spalvos, gradientas, šrifto dydis telefone / kompiuteryje,
// storis, tarpai tarp raidžių, didžiosios raidės, aukštis, linija), keitimosi laikas, rodyklės, animacija.
// Saugoma settings.topbar (formatas – 21-header.js). Peržiūra – ta pati kaip pradžios puslapio (10-home.js).
const TB_DESIGNS = {
  black: { name: "Juoda", style: { bg: "#111111", color: "#c7c7c7", accent: "#ffffff", grad: "solid", weight: 400, upper: false } },
  gold: { name: "Aukso gradientas", style: { bg: "#b8974a", bg2: "#d8be74", grad: "mid", color: "#1a1a1a", accent: "#000000", weight: 600, upper: true, ls: 0.06 } },
  champagne: { name: "Šampanas", style: { bg: "#f3ead8", color: "#4a3a1a", accent: "#2b2010", grad: "solid", weight: 400, upper: false, line: true } },
  white: { name: "Balta su linija", style: { bg: "#ffffff", color: "#3a3a3a", accent: "#000000", grad: "solid", weight: 400, upper: false, line: true } },
  noir: { name: "Juoda su auksu", style: { bg: "#111111", bg2: "#2a2418", grad: "lr", color: "#e6d3a3", accent: "#f6e3b4", weight: 500, upper: true, ls: 0.08 } },
  red: { name: "Raudona (akcija)", style: { bg: "#b3001b", color: "#ffffff", accent: "#ffffff", grad: "solid", weight: 600, upper: true, ls: 0.06 } },
  green: { name: "Tamsiai žalia", style: { bg: "#2d6a3f", color: "#ffffff", accent: "#ffffff", grad: "solid", weight: 400, upper: false } }
};
const TB_DEFAULT = () => ({ on: true, seconds: 5, arrows: true, anim: "slide", items: VD.autoNoteItems().map(x => ({ ...x, on: true })), style: {} });
const TB = { cfg: null, open: null };

// Kontrastas (WCAG): tekstui ≥ 4,5:1
function tbLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const tbRatio = (a, b) => {
  const [x, y] = [tbLum(a), tbLum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
function tbContrast() {
  const st = TB.cfg.style || {};
  const bg = st.bg || "#111111";
  const bgs = st.grad && st.grad !== "solid" && st.bg2 ? [bg, st.bg2] : [bg];
  const fg = st.color || "#c7c7c7";
  const acc = st.accent || "#ffffff";
  return Math.min(...bgs.flatMap(b => [tbRatio(fg, b), tbRatio(acc, b)]));
}

function topbarSectionHTML(S) {
  TB.cfg = clone(S.topbar && typeof S.topbar === "object" ? { ...TB_DEFAULT(), ...S.topbar } : TB_DEFAULT());
  TB.cfg.items = (TB.cfg.items || []).map(x => ({ id: x.id || uid(), on: x.on !== false, ...x }));
  TB.cfg.style = TB.cfg.style || {};
  return `<section class="admCard tbCard" id="tbSec"><div class="heSecHead"><h2>Juosta virš header'io</h2><label class="admToggleRow tbOn"><span><b>Rodyti</b></span><input type="checkbox" class="admSwitchInp" data-tb="on"${attr(
    TB.cfg.on !== false,
    "checked"
  )} /></label></div>
<p class="admNote">Trumpos žinutės, kurios keičiasi viena po kitos. Tekste <b>*žodis*</b> – paryškinamas (akcento spalva). „Trumpas“ – rodomas telefone, jei ilgas netelpa į 2 eilutes.</p>
<div class="heList" id="tbItems"></div>
<div class="heAdd"><button class="btn ghost small" type="button" data-tb-add>${glyph("plus")}Pridėti žinutę</button><button class="btn ghost small" type="button" data-tb-auto>${glyph("spark")}Numatytosios žinutės</button></div>
<h3 class="tbSub">Dizainas</h3>
<div class="tbDesigns" id="tbDesigns"></div>
<div class="tbGrid" id="tbStyle"></div>
<h3 class="tbSub">Elgsena</h3>
<div class="tbGrid">
<label class="field"><span>Keičiasi kas, s</span><input type="number" min="0" max="30" step="1" data-tb="seconds" value="${esc(TB.cfg.seconds ?? 5)}" /><small>0 – nesikeičia pačios</small></label>
<label class="field"><span>Animacija</span><select data-tb="anim">${[
    ["slide", "Iš apačios"],
    ["fade", "Išryškėja"],
    ["none", "Be animacijos"]
  ]
    .map(([v, n]) => `<option value="${v}"${sel((TB.cfg.anim || "slide") === v)}>${n}</option>`)
    .join("")}</select></label>
<label class="admToggleRow"><span><b>Rodyklės ‹ ›</b><small>Pirkėjas gali perjungti pats</small></span><input type="checkbox" class="admSwitchInp" data-tb="arrows"${attr(TB.cfg.arrows !== false, "checked")} /></label>
</div>
</section>`;
}
function tbItemHTML(x, i) {
  const open = TB.open === x.id;
  const custom = x.href && !isKnownLink(x.href) ? x.href : "";
  return `<article class="heItem tbItem${open ? " open" : ""}${x.on === false ? " off" : ""}" data-tb-item="${esc(x.id)}">
<div class="heRow">
<button class="heRowMain" type="button" data-tb-open aria-expanded="${open}"><span class="heRowTxt"><b>${i + 1}. ${VD.fmtNote(x.text || "Nauja žinutė")}</b><small>${x.href ? `Nuoroda: ${esc(x.href)}` : "Be nuorodos"}${
    x.short ? " · yra trumpas variantas" : ""
  }${x.on === false ? " · paslėpta" : ""}</small></span></button>
<div class="heRowActs"><button class="roundBtn" type="button" data-tb-move="-1" aria-label="Aukščiau"${attr(i === 0, "disabled")}>${glyph("chev-left")}</button><button class="roundBtn" type="button" data-tb-move="1" aria-label="Žemiau"${attr(
    i === TB.cfg.items.length - 1,
    "disabled"
  )}>${glyph("chev-right")}</button><input type="checkbox" class="admSwitchInp" data-tb-on aria-label="Rodoma"${attr(x.on !== false, "checked")} /></div>
</div>
${
  open
    ? `<div class="heForm admForm">
<label class="field"><span>Tekstas</span><input name="text" maxlength="140" value="${esc(x.text || "")}" placeholder="pvz. Nemokamas pristatymas nuo *60 €*" /></label>
<label class="field"><span>Trumpas (nebūtina)</span><input name="short" maxlength="70" value="${esc(x.short || "")}" placeholder="pvz. Nemokamai nuo *60 €*" /><small>Rodomas, jei ilgas netelpa (siauras telefonas)</small></label>
<label class="field"><span>Nuoroda (nebūtina)</span><select name="hrefSel">${linkOptions(x.href || "", "Be nuorodos")}</select></label>
<label class="field heCustom"${attr(!custom, "hidden")}><span>Adresas</span><input name="hrefCustom" maxlength="200" value="${esc(custom)}" placeholder="pvz. nuolaidos arba https://…" /></label>
<div class="heFormActs"><button class="btn danger small" type="button" data-tb-del>${glyph("trash")}Ištrinti</button></div>
</div>`
    : ""
}
</article>`;
}
function paintTbItems() {
  const box = $("#tbItems");
  box.innerHTML = TB.cfg.items.length ? TB.cfg.items.map(tbItemHTML).join("") : `<p class="admMuted heEmpty">Žinučių nėra – juosta nerodoma.</p>`;
  hydrateIcons(box);
}
function paintTbStyle() {
  const st = TB.cfg.style;
  const cur = Object.entries(TB_DESIGNS).find(([, d]) => Object.entries(d.style).every(([k, v]) => (st[k] ?? "") === v))?.[0];
  $("#tbDesigns").innerHTML = Object.entries(TB_DESIGNS)
    .map(([k, d]) => {
      const s = d.style;
      const bg = s.grad === "mid" ? `linear-gradient(90deg,${s.bg},${s.bg2},${s.bg})` : s.grad === "lr" ? `linear-gradient(90deg,${s.bg},${s.bg2})` : s.bg;
      return `<button class="tbDesign" type="button" data-tb-design="${k}" aria-pressed="${cur === k}" style="background:${bg};color:${s.color}${s.line ? ";box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)" : ""}"><span style="text-transform:${s.upper ? "uppercase" : "none"};font-weight:${s.weight}">Nemokamai nuo <b style="color:${s.accent}">60 €</b></span><small>${esc(d.name)}</small></button>`;
    })
    .join("");
  const col = (k, label, def) => `<label class="field tbColor"><span>${label}</span><span class="tbColorIn"><input type="color" data-tb-st="${k}" value="${esc(st[k] || def)}" /><code>${esc(st[k] || def)}</code></span></label>`;
  const rng = (k, label, min, max, step, def, unit) =>
    `<label class="field tbRange"><span>${label} <output>${esc(st[k] ?? def)}${unit}</output></span><input type="range" data-tb-st="${k}" min="${min}" max="${max}" step="${step}" value="${esc(st[k] ?? def)}" /></label>`;
  const ratio = tbContrast();
  $("#tbStyle").innerHTML = `${col("bg", "Fonas", "#111111")}
<label class="field"><span>Fonas – tipas</span><select data-tb-st="grad">${[
    ["solid", "Vienspalvis"],
    ["lr", "Gradientas →"],
    ["mid", "Gradientas ↔ (vidurys šviesus)"]
  ]
    .map(([v, n]) => `<option value="${v}"${sel((st.grad || "solid") === v)}>${n}</option>`)
    .join("")}</select></label>
${st.grad && st.grad !== "solid" ? col("bg2", "Antra fono spalva", st.bg || "#333333") : ""}
${col("color", "Tekstas", "#c7c7c7")}${col("accent", "Paryškintas tekstas (*…*)", "#ffffff")}
${rng("fs", "Šriftas telefone", 12, 24, 0.5, 19.5, " px")}${rng("fsD", "Šriftas kompiuteryje", 12, 24, 0.5, 17, " px")}
${rng("weight", "Storis", 300, 800, 100, 400, "")}${rng("ls", "Tarpai tarp raidžių", 0, 0.2, 0.01, 0.04, " em")}
${rng("h", "Aukštis telefone", 36, 96, 1, 66, " px")}${rng("hD", "Aukštis kompiuteryje", 32, 80, 1, 49, " px")}
<label class="admToggleRow"><span><b>DIDŽIOSIOS RAIDĖS</b></span><input type="checkbox" class="admSwitchInp" data-tb-st="upper"${attr(!!st.upper, "checked")} /></label>
<label class="admToggleRow"><span><b>Linija apačioje</b><small>Šviesiam fonui</small></span><input type="checkbox" class="admSwitchInp" data-tb-st="line"${attr(!!st.line, "checked")} /></label>
<p class="tbContrast${ratio < 4.5 ? " bad" : ""}" role="status">${ratio < 4.5 ? `${glyph("info")}Per mažas kontrastas (${ratio.toFixed(1)}:1) – tekstas bus sunkiai įskaitomas. Reikia bent 4,5:1.` : `${glyph("check")}Kontrastas ${ratio.toFixed(1)}:1 – gerai įskaitoma`}</p>
<button class="btn ghost small tbResetStyle" type="button" data-tb-design="black">Numatytasis dizainas</button>`;
  hydrateIcons($("#tbStyle"));
}
function tbChanged({ items = false, style = false } = {}) {
  if (items) paintTbItems();
  if (style) paintTbStyle();
  changed({ scroll: "top" });
}
function bindTopbar(main) {
  paintTbItems();
  paintTbStyle();
  const sec = $("#tbSec", main);
  const itemAt = el => {
    const a = el.closest("[data-tb-item]");
    const i = a ? TB.cfg.items.findIndex(x => x.id === a.dataset.tbItem) : -1;
    return i < 0 ? null : { i, x: TB.cfg.items[i] };
  };
  sec.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("[data-tb-add]")) {
      const x = { id: uid(), on: true, text: "" };
      TB.cfg.items.push(x);
      TB.open = x.id;
      tbChanged({ items: true });
      return $(`[data-tb-item="${x.id}"] input[name="text"]`)?.focus();
    }
    if (t.closest("[data-tb-auto]")) {
      TB.cfg.items = VD.autoNoteItems().map(x => ({ ...x, on: true }));
      TB.open = null;
      return tbChanged({ items: true });
    }
    const d = t.closest("[data-tb-design]");
    if (d) {
      TB.cfg.style = { ...TB.cfg.style, bg2: "", line: false, ls: 0.04, ...clone(TB_DESIGNS[d.dataset.tbDesign].style) };
      if (d.dataset.tbDesign === "black") TB.cfg.style = {};
      return tbChanged({ style: true });
    }
    const it = itemAt(t);
    if (!it) return;
    if (t.closest("[data-tb-open]")) {
      TB.open = TB.open === it.x.id ? null : it.x.id;
      paintTbItems();
      return;
    }
    const mv = t.closest("[data-tb-move]");
    if (mv) {
      const j = it.i + Number(mv.dataset.tbMove);
      if (j < 0 || j >= TB.cfg.items.length) return;
      [TB.cfg.items[it.i], TB.cfg.items[j]] = [TB.cfg.items[j], TB.cfg.items[it.i]];
      return tbChanged({ items: true });
    }
    if (t.closest("[data-tb-del]")) {
      TB.cfg.items.splice(it.i, 1);
      return tbChanged({ items: true });
    }
  });
  const onField = e => {
    const t = e.target;
    if (t.dataset.tb) {
      const k = t.dataset.tb;
      TB.cfg[k] = t.type === "checkbox" ? t.checked : k === "seconds" ? Math.max(0, Math.min(30, Math.round(Number(t.value) || 0))) : t.value;
      return tbChanged();
    }
    if (t.dataset.tbSt) {
      const k = t.dataset.tbSt;
      const v = t.type === "checkbox" ? t.checked : t.type === "range" ? Number(t.value) : t.value;
      TB.cfg.style = { ...TB.cfg.style, [k]: v };
      if (t.type === "range") $("output", t.closest("label")).textContent = `${v}${{ fs: " px", fsD: " px", h: " px", hD: " px", ls: " em" }[k] || ""}`;
      if (t.type === "color") $("code", t.closest("label")).textContent = v;
      // Spalvos ir tipas – perpiešiame (kontrastas, antra spalva); slankikliai – tik peržiūra (kad neprarastų fokuso)
      if (e.type === "change" && (k === "grad" || t.type === "color" || t.type === "checkbox")) return tbChanged({ style: true });
      return tbChanged();
    }
    const it = itemAt(t);
    if (!it) return;
    if (t.matches("[data-tb-on]")) {
      it.x.on = t.checked;
      t.closest(".heItem").classList.toggle("off", !t.checked);
      return tbChanged();
    }
    if (t.name === "text" || t.name === "short") {
      const v = t.value;
      if (v.trim()) it.x[t.name] = v;
      else delete it.x[t.name];
      if (t.name === "text") $(".heRowTxt b", t.closest(".heItem")).innerHTML = `${it.i + 1}. ${VD.fmtNote(v || "Nauja žinutė")}`;
      return tbChanged();
    }
    if (t.name === "hrefSel") {
      const custom = $(".heCustom", t.closest(".heForm"));
      custom.hidden = t.value !== "__custom";
      it.x.href = t.value === "__custom" ? $("input", custom).value.trim() : t.value;
      if (!it.x.href) delete it.x.href;
      return tbChanged();
    }
    if (t.name === "hrefCustom") {
      it.x.href = t.value.trim().replace(/^\/+(?!\/)/, "");
      if (!it.x.href) delete it.x.href;
      return tbChanged();
    }
  };
  sec.addEventListener("input", onField);
  sec.addEventListener("change", e => {
    if (e.target.type === "color" || e.target.type === "checkbox" || e.target.tagName === "SELECT" || e.target.dataset.tb === "seconds") onField(e);
  });
}
// Išsaugojimui: tušti stiliaus laukai nesaugomi
function topbarData() {
  const c = clone(TB.cfg);
  c.items = c.items.filter(x => String(x.text || "").trim()).map(({ id, on, text, short, href }) => ({ id, on, text: text.trim(), ...(short ? { short: short.trim() } : {}), ...(href ? { href } : {}) }));
  c.style = Object.fromEntries(Object.entries(c.style || {}).filter(([, v]) => v !== "" && v != null && v !== false));
  return c;
}
