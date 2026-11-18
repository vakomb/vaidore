// 27 – švelnus, prabangus slinkimas pelės ratuku kompiuteryje: vietoje šuolių po 100 px puslapis tolygiai „nuplaukia“
// iki tikslo (kiekviename kadre priartėja ~10 % likusio kelio, nepriklausomai nuo ekrano dažnio). Liečiamas kilimėlis,
// telefonas, klaviatūra, slinkties juosta ir vidiniai slenkami laukai (langai, filtrai, karuselės) lieka natūralūs.
// Neveikia, jei vartotojas pasirinko „mažiau judesio“ arba atidarytas langas (puslapio slinkimas užrakintas).
(() => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const LERP = 0.1; // kiek likusio kelio nueinama per 1 kadrą (60 Hz)
  let target = 0;
  let cur = 0;
  let raf = 0;
  let last = 0;
  const maxY = () => document.documentElement.scrollHeight - innerHeight;
  const locked = () => document.documentElement.style.overflow === "hidden";
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  // Elementas po pele, kuris pats slenka ta kryptimi – jam paliekamas natūralus slinkimas
  const ownScroller = el => {
    for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "overlay") return true;
    }
    return false;
  };
  // Liečiamas kilimėlis siunčia daug mažų, trupmeninių žingsnių ir turi savo inerciją – jo neliečiame
  const isTouchpad = e => (e.wheelDeltaY && e.wheelDeltaY === -3 * e.deltaY) || (e.deltaMode === 0 && Math.abs(e.deltaY) < 25 && !raf);
  function frame(now) {
    // Jei puslapį pastūmė kas kita (slinkties juosta, klaviatūra, perėjimas į kitą puslapį) – nusileidžiame
    if (locked() || Math.abs(window.scrollY - cur) > 2) return stop();
    const dt = Math.min(64, now - (last || now - 16.7));
    last = now;
    const k = 1 - Math.pow(1 - LERP, dt / 16.7);
    cur += (target - cur) * k;
    if (Math.abs(target - cur) < 0.5) {
      cur = target;
      window.scrollTo(0, cur);
      return stop();
    }
    window.scrollTo(0, cur);
    raf = requestAnimationFrame(frame);
  }
  window.addEventListener(
    "wheel",
    e => {
      if (!fine.matches || reduceMotion() || e.defaultPrevented || e.ctrlKey || e.shiftKey || locked()) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || isTouchpad(e)) return;
      if (ownScroller(e.target instanceof Element ? e.target : null)) return;
      const step = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      e.preventDefault();
      if (!raf) {
        cur = target = window.scrollY;
        last = 0;
        raf = requestAnimationFrame(frame);
      }
      target = Math.max(0, Math.min(maxY(), target + step));
    },
    { passive: false }
  );
})();
