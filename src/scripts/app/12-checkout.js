// 12 – Apmokėjimas: krepšelis (id, ml, kiekis) siunčiamas į /api/checkout (Vercel funkcija, žr. api/checkout.js).
// Kainas serveris ima iš savo katalogo kopijos – naršyklėje pakeista kaina nieko nekeičia.
// Atsakymas { url } – Stripe Checkout puslapis (kortelė, Apple Pay, Google Pay, pristatymo būdas, adresas).
async function startCheckout(btn) {
  if (!state.cart.length) return;
  const label = btn.innerHTML;
  btn.classList.add("loading");
  btn.innerHTML = `<span class="spin"></span>Jungiamasi prie Stripe…`;
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: state.cart.map(l => ({ id: l.id, ml: l.ml, qty: l.qty })) })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
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
