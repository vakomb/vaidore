// 12 – Apmokėjimas: krepšelis (id, ml, kiekis) siunčiamas į api/checkout (Vercel funkcija, žr. api/checkout.js).
// Adresai santykiniai – veikia ir Vercel (vaidore.com/), ir GitHub Pages (vakomb.github.io/vaidore/; ten apmokėjimo nėra).
// Kainas serveris ima iš savo katalogo kopijos – naršyklėje pakeista kaina nieko nekeičia.
// Siunčiama: items [{ id, ml, qty, picks? }], shipping { method, locker? }, gift { on, note }.
// Atsakymas { url } – Stripe Checkout puslapis (kortelė, Apple Pay, Google Pay; adresas – jei ne paštomatas).
async function startCheckout(btn) {
  if (!state.cart.length) return;
  if (needLocker() && !state.ship.locker) {
    toast("Pasirinkite paštomatą", { icon: "info" });
    return openLockerPicker();
  }
  const label = btn.innerHTML;
  btn.classList.add("loading");
  btn.innerHTML = `<span class="spin"></span>Jungiamasi prie Stripe…`;
  try {
    const res = await fetch("api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: state.cart.map(l => (l.picks ? { id: l.id, qty: l.qty, picks: l.picks } : { id: l.id, ml: l.ml, qty: l.qty })),
        shipping: { method: state.ship.method, locker: state.ship.method === "omniva" ? state.ship.locker : null },
        gift: state.gift.on ? { on: true, note: state.gift.note.trim() } : null
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      track("Pradėjo apmokėjimą", { suma: Math.round(cartSubtotal()) });
      store.set("vaidore_pending_v1", { at: Date.now(), session: data.id || null });
      location.href = data.url;
      return;
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  } catch (err) {
    logError("checkout", err);
    btn.classList.remove("loading");
    btn.innerHTML = label;
    const offline = !navigator.onLine;
    toast(offline ? "Nėra interneto ryšio" : "Apmokėjimas laikinai nepasiekiamas", {
      icon: "info",
      ms: 4200,
      action: offline ? null : "Parašyti",
      onAction: () => (location.href = `mailto:${SET.company.email}?subject=${encodeURIComponent("Užsakymas Vaidore")}`)
    });
  }
}
