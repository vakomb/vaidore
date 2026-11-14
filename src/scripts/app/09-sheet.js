// 09 – langas (#sheet): telefone – apatinis lapas (spyruoklė, braukimas žemyn uždaro), kompiuteryje – centre.
// Kiekvienas atidarymas įrašomas į naršyklės istoriją, todėl „Atgal“ (ir iOS braukimas) uždaro langą.
const sheetUI = { open: false, pushed: false, onClose: null, closing: false, lastFocus: null };

function sheetHeadHTML(title) {
  return `<header class="sheetHead"><span></span><h2 id="sheetTitle">${esc(title)}</h2><button class="roundBtn" data-sheet-close aria-label="Uždaryti">${glyph("x")}</button></header>`;
}
// openSheet({ title?, html, wide?, url?, onClose? }) – html be antraštės, jei title nenurodytas
function openSheet({ title, html, wide = false, url = null, onClose = null }) {
  const bd = $("#backdrop");
  const sheet = $("#sheet");
  // Naujas turinio mazgas – seni klausytojai nelieka
  const old = $("#sheetBody");
  const body = old.cloneNode(false);
  old.replaceWith(body);
  body.innerHTML = (title ? sheetHeadHTML(title) : "") + html;
  body.scrollTop = 0;
  hydrateIcons(body);
  sheet.classList.toggle("wide", wide);
  sheet.style.transform = "";
  sheetUI.onClose = onClose;
  if (!sheetUI.open) {
    sheetUI.lastFocus = document.activeElement;
    bd.hidden = false;
    bd.classList.remove("closing");
    document.documentElement.style.overflow = "hidden";
    sheetUI.open = true;
    history.pushState({ vdSheet: true }, "", url || location.href);
    sheetUI.pushed = true;
  } else if (url) {
    history.replaceState({ vdSheet: true }, "", url);
  }
  requestAnimationFrame(() => sheet.focus({ preventScroll: true }));
}
function closeSheet() {
  if (!sheetUI.open || sheetUI.closing) return;
  if (sheetUI.pushed) history.back();
  else finishCloseSheet();
}
function finishCloseSheet() {
  if (!sheetUI.open || sheetUI.closing) return;
  sheetUI.closing = true;
  sheetUI.pushed = false;
  const bd = $("#backdrop");
  bd.classList.add("closing");
  const done = () => {
    bd.hidden = true;
    bd.classList.remove("closing");
    $("#sheet").style.transform = "";
    document.documentElement.style.overflow = "";
    sheetUI.open = false;
    sheetUI.closing = false;
    const fn = sheetUI.onClose;
    sheetUI.onClose = null;
    fn?.();
    sheetUI.lastFocus?.focus?.({ preventScroll: true });
  };
  if (reduceMotion()) done();
  else setTimeout(done, 240);
}
window.addEventListener("popstate", () => {
  if (sheetUI.open) finishCloseSheet();
  else routeFromHash();
});
function bindSheet() {
  const bd = $("#backdrop");
  bd.addEventListener("click", e => {
    if (e.target === bd || (e.target instanceof Element && e.target.closest("[data-sheet-close]"))) closeSheet();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && sheetUI.open) closeSheet();
  });
  // Braukimas žemyn (telefone): kai turinys viršuje arba tempiama už rankenėlės / paveikslo
  const sheet = $("#sheet");
  let y0 = 0,
    dy = 0,
    t0 = 0,
    drag = false;
  sheet.addEventListener(
    "touchstart",
    e => {
      if (isDesktop() || e.touches.length !== 1) return;
      const body = $("#sheetBody");
      const fromTop = body.scrollTop <= 0;
      const onHandle = e.target instanceof Element && e.target.closest(".grabber, .sheetHead, .pdHero");
      if (!fromTop && !onHandle) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, .rail, button.sizeOpt")) return;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
      dy = 0;
      drag = true;
    },
    { passive: true }
  );
  sheet.addEventListener(
    "touchmove",
    e => {
      if (!drag) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 4) {
        sheet.classList.add("dragging");
        sheet.style.transform = `translateY(${dy}px)`;
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );
  const end = () => {
    if (!drag) return;
    drag = false;
    sheet.classList.remove("dragging");
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 120 || (dy > 40 && v > 0.6)) {
      sheet.style.transition = "transform .24s cubic-bezier(.4,0,1,1)";
      sheet.style.transform = "translateY(100%)";
      setTimeout(() => {
        sheet.style.transition = "";
        closeSheet();
      }, 200);
    } else {
      sheet.style.transition = "transform .42s var(--spring)";
      sheet.style.transform = "";
      setTimeout(() => (sheet.style.transition = ""), 420);
    }
  };
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
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
