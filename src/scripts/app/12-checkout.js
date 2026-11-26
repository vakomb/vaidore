// 12 - Apmokėjimas: krepšelis siunčiamas Supabase funkcijai shop/checkout (supabase/functions) - veikia ir
// Vercel, ir GitHub Pages kopijoje. Prisijungusio pirkėjo užsakymas susiejamas su paskyra (Authorization).
// Kainas serveris ima iš savo katalogo kopijos - naršyklėje pakeista kaina nieko nekeičia.
// Siunčiama: items [{ id, ml, qty, picks? }], shipping { method, locker? }, gift { on, note }.
// Atsakymas { url } - Stripe Checkout puslapis (kortelė, Apple Pay, Google Pay; adresas - jei ne paštomatas).
async function startCheckout(btn) {
  if (!state.cart.length) return;
  if (needLocker() && !state.ship.locker) {
    toast(t("locker.choose"), { icon: "info" });
    return openLockerPicker();
  }
  const label = btn.innerHTML;
  btn.classList.add("loading");
  btn.innerHTML = `<span class="spin"></span>${t("checkout.connecting")}`;
  try {
    const res = await sbFn("shop/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: state.cart.map(l => (l.picks ? { id: l.id, qty: l.qty, picks: l.picks } : { id: l.id, ml: l.ml, qty: l.qty })),
        shipping: { method: state.ship.method, locker: state.ship.method === "omniva" ? state.ship.locker : null },
        gift: state.gift.on ? { on: true, note: state.gift.note.trim() } : null,
        site: SITE_ROOT.replace(/\/$/, "")
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      track("Pradėjo apmokėjimą", { suma: Math.round(cartSubtotal()) });
      store.set("vaidore_pending_v1", { at: Date.now(), session: data.id || null });
      location.href = data.url;
      return;
    }
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { user: res.status >= 400 && res.status < 500 && res.status !== 404 ? data.error : null });
  } catch (err) {
    logError("checkout", err);
    btn.classList.remove("loading");
    btn.innerHTML = label;
    const offline = !navigator.onLine;
    if (err.user) return toast(err.user, { icon: "info", ms: 5000 });
    toast(offline ? t("errors.offline") : t("checkout.unavailable"), {
      icon: "info",
      ms: 4200,
      action: offline ? null : t("checkout.write"),
      onAction: () => (location.href = `mailto:${SET.company.email}?subject=${encodeURIComponent(t("checkout.mailSubject"))}`)
    });
  }
}
