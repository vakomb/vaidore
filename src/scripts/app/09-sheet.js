// 09 - langai: #sheet (telefone - apatinis lapas, kompiuteryje - centre), šoniniai langai (meniu iš kairės,
// mini krepšelis iš dešinės), patvirtinimo langas, pranešimai. Vienu metu atidarytas vienas langas.
// Kiekvienas atidarymas įrašomas į istoriją (tas pats adresas), todėl „Atgal“ (ir iOS braukimas) jį uždaro.
const overlay = { kind: null, pushed: false, onClose: null, closing: false, lastFocus: null };
const OVL = {
  sheet: { wrap: () => $("#backdrop"), panel: () => $("#sheet") },
  drawer: { wrap: () => $("#drawerWrap"), panel: () => $("#drawer") },
  mini: { wrap: () => $("#miniWrap"), panel: () => $("#mini") }
};
function showOverlay(kind, { onClose = null } = {}) {
  if (overlay.kind === kind) {
    overlay.onClose = onClose;
    return;
  }
  const reuse = !!overlay.kind && overlay.pushed; // kitas langas vietoje ankstesnio - tas pats istorijos įrašas
  if (overlay.kind) hideOverlayNow();
  else overlay.lastFocus = document.activeElement;
  overlay.onClose = onClose;
  const w = OVL[kind].wrap();
  w.hidden = false;
  w.classList.remove("closing");
  document.documentElement.style.overflow = "hidden";
  overlay.kind = kind;
  if (reuse) history.replaceState({ vdOverlay: kind }, "", location.href);
  else history.pushState({ vdOverlay: kind }, "", location.href);
  overlay.pushed = true;
  requestAnimationFrame(() => OVL[kind].panel().focus({ preventScroll: true }));
}
function closeOverlay() {
  if (!overlay.kind || overlay.closing) return;
  if (overlay.pushed && history.state?.vdOverlay) history.back();
  else finishOverlay();
}
// Paslepia be animacijos ir be istorijos keitimo (naudoja navigate() ir kito lango atidarymas)
function hideOverlayNow() {
  if (!overlay.kind) return;
  const kind = overlay.kind;
  const w = OVL[kind].wrap();
  w.hidden = true;
  w.classList.remove("closing");
  OVL[kind].panel().style.transform = "";
  if (kind === "drawer") $("#menuBtn").setAttribute("aria-expanded", "false");
  overlay.kind = null;
  overlay.closing = false;
  document.documentElement.style.overflow = "";
  const fn = overlay.onClose;
  overlay.onClose = null;
  fn?.();
}
function finishOverlay() {
  if (!overlay.kind || overlay.closing) return;
  const kind = overlay.kind;
  overlay.closing = true;
  overlay.pushed = false;
  const w = OVL[kind].wrap();
  w.classList.add("closing");
  if (kind === "drawer") $("#menuBtn").setAttribute("aria-expanded", "false");
  const done = () => {
    w.hidden = true;
    w.classList.remove("closing");
    OVL[kind].panel().style.transform = "";
    document.documentElement.style.overflow = "";
    overlay.kind = null;
    overlay.closing = false;
    const fn = overlay.onClose;
    overlay.onClose = null;
    fn?.();
    overlay.lastFocus?.focus?.({ preventScroll: true });
  };
  if (reduceMotion()) done();
  else setTimeout(done, 240);
}

function sheetHeadHTML(title) {
  return `<header class="sheetHead"><span></span><h2 id="sheetTitle">${esc(title)}</h2><button class="roundBtn" type="button" data-sheet-close aria-label="Uždaryti">${glyph("x")}</button></header>`;
}
// openSheet({ title?, html, wide?, onClose? }) - html be antraštės, jei title nenurodytas
function openSheet({ title, html, wide = false, onClose = null }) {
  const old = $("#sheetBody");
  const body = old.cloneNode(false); // naujas mazgas - seni klausytojai nelieka
  old.replaceWith(body);
  body.innerHTML = (title ? sheetHeadHTML(title) : "") + html;
  body.scrollTop = 0;
  hydrateIcons(body);
  const sheet = $("#sheet");
  sheet.classList.toggle("wide", wide);
  sheet.style.transform = "";
  showOverlay("sheet", { onClose });
}
const closeSheet = closeOverlay;
function sheetOpen() {
  return overlay.kind === "sheet";
}

// Patvirtinimas (ištrinti, grąžinti pinigus…): Promise<boolean>
function askConfirm(text, { title = "Patvirtinkite", ok = "Taip", danger = false } = {}) {
  return new Promise(resolve => {
    let answer = false;
    openSheet({
      title,
      html: `<div class="sheetPad"><p class="confirmTxt">${esc(text)}</p><div class="confirmActs"><button class="btn ghost" type="button" data-sheet-close>Atšaukti</button><button class="btn ${danger ? "danger" : "primary"}" type="button" data-confirm-ok>${esc(ok)}</button></div></div>`,
      onClose: () => resolve(answer)
    });
    $("#sheetBody").addEventListener("click", e => {
      if (e.target instanceof Element && e.target.closest("[data-confirm-ok]")) {
        answer = true;
        closeSheet();
      }
    });
  });
}

function bindOverlays() {
  for (const kind of Object.keys(OVL)) {
    OVL[kind].wrap().addEventListener("click", e => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.target === OVL[kind].wrap() || t?.closest("[data-sheet-close]")) closeOverlay();
    });
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.kind) closeOverlay();
    // Fokusas lieka atidarytame lange
    if (e.key === "Tab" && overlay.kind) {
      const panel = OVL[overlay.kind].panel();
      const f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', panel).filter(
        el => el.offsetParent !== null
      );
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === panel)) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    }
  });
  bindSwipe($("#sheet"), "y", () => {
    const body = $("#sheetBody");
    return body.scrollTop <= 0;
  });
  bindSwipe($("#drawer"), "-x");
  bindSwipe($("#mini"), "x");
}
// Braukimas uždaryti: lapas - žemyn (kai turinys viršuje), meniu - į kairę, mini krepšelis - į dešinę
function bindSwipe(panel, dir, canStart = () => true) {
  let s0 = 0,
    d = 0,
    t0 = 0,
    drag = false,
    other0 = 0;
  const axis = dir.replace("-", "");
  const sign = dir.startsWith("-") ? -1 : 1;
  panel.addEventListener(
    "touchstart",
    e => {
      if (e.touches.length !== 1 || (axis === "y" && isDesktop())) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("input, textarea, select, .rail, .gal, .discGrid, button.sizeOpt")) return;
      if (axis === "y" && !canStart() && !t?.closest(".grabber, .sheetHead")) return;
      s0 = axis === "y" ? e.touches[0].clientY : e.touches[0].clientX;
      other0 = axis === "y" ? e.touches[0].clientX : e.touches[0].clientY;
      t0 = performance.now();
      d = 0;
      drag = true;
    },
    { passive: true }
  );
  panel.addEventListener(
    "touchmove",
    e => {
      if (!drag) return;
      const cur = axis === "y" ? e.touches[0].clientY : e.touches[0].clientX;
      const other = axis === "y" ? e.touches[0].clientX : e.touches[0].clientY;
      d = Math.max(0, (cur - s0) * sign);
      if (Math.abs(other - other0) > 24 && d < 12) return (drag = false);
      if (d > 6) {
        panel.classList.add("dragging");
        panel.style.transform = axis === "y" ? `translateY(${d}px)` : `translateX(${d * sign}px)`;
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );
  const end = () => {
    if (!drag) return;
    drag = false;
    panel.classList.remove("dragging");
    const v = d / Math.max(1, performance.now() - t0);
    if (d > 110 || (d > 40 && v > 0.6)) {
      panel.style.transition = "transform .22s cubic-bezier(.4,0,1,1)";
      panel.style.transform = axis === "y" ? "translateY(100%)" : `translateX(${100 * sign}%)`;
      setTimeout(() => {
        panel.style.transition = "";
        closeOverlay();
      }, 190);
    } else {
      panel.style.transition = "transform .42s var(--spring)";
      panel.style.transform = "";
      setTimeout(() => (panel.style.transition = ""), 420);
    }
  };
  panel.addEventListener("touchend", end);
  panel.addEventListener("touchcancel", end);
}

// Pranešimas viršuje (tamsi kapsulė), su veiksmu
function toast(text, { icon = "check", action = null, onAction = null, ms = 2600 } = {}) {
  const wrap = $("#toastWrap");
  while (wrap.children.length > 1) wrap.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="tIco">${glyph(icon)}</span><span>${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
  if (action)
    el.querySelector("button").addEventListener("click", () => {
      onAction?.();
      hide();
    });
  wrap.append(el);
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  };
  setTimeout(hide, ms);
}
