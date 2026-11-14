// Vercel funkcija POST /api/checkout – sukuria Stripe Checkout sesiją ir grąžina { id, url }.
// Be npm paketų: Stripe REST API per fetch (api/_lib.js). Raktas – Vercel aplinkos kintamasis STRIPE_SECRET_KEY.
// Kainos imamos TIK iš src/data/catalog.json (serverio kopijos) – naršyklė siunčia tik:
//   items: [{ id, ml, qty }] arba atradimų rinkinys [{ id: settings.discovery.id, qty, picks: [5 id] }]
//   shipping: { method: "omniva" | "dpd", locker?: { zip, name, addr, city, cc } }
//   gift: { on: true, note } | null
import { S, BY_ID, DISC, SAMPLE_ML, cents, inStock, stripe, siteUrl } from "./_lib.js";

const clean = (v, n) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
function priceOf(p, ml) {
  if (ml === SAMPLE_ML) return p.sample;
  return p.sizes.find(s => s.ml === ml)?.price;
}
const fail = (res, code, error) => res.status(code).json({ error });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Tik POST");
  }
  if (!process.env.STRIPE_SECRET_KEY) return fail(res, 503, "Apmokėjimas dar neįjungtas (nėra STRIPE_SECRET_KEY)");

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const currency = S.currency || "eur";
  const items = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
  const lines = [];
  let subtotal = 0;
  let sampleCredit = 0;
  for (const it of items) {
    const qty = Math.round(Number(it?.qty));
    if (!(qty >= 1 && qty <= S.maxQty)) return fail(res, 400, "Neteisingas kiekis");
    if (DISC && it?.id === DISC.id) {
      const picks = Array.isArray(it.picks) ? it.picks.map(String) : [];
      const ok = picks.length === DISC.count && new Set(picks).size === picks.length && picks.every(id => BY_ID.has(id));
      if (!ok) return fail(res, 400, "Atradimų rinkinyje turi būti skirtingi kvapai – atnaujinkite puslapį");
      const out = picks.map(id => BY_ID.get(id)).find(p => !inStock(p));
      if (out) return fail(res, 409, `${out.name} laikinai išparduotas – pakeiskite rinkinį`);
      subtotal += DISC.price * qty;
      sampleCredit += cents(DISC.price) * qty;
      lines.push({
        quantity: qty,
        price_data: {
          currency,
          unit_amount: cents(DISC.price),
          product_data: {
            name: `${S.shop} ${DISC.name} · ${DISC.count} × 2 ml`,
            description: picks.map(id => BY_ID.get(id).name).join(", "),
            metadata: { product_id: DISC.id, picks: picks.join(",") }
          }
        }
      });
      continue;
    }
    const p = BY_ID.get(String(it?.id || ""));
    const ml = Number(it?.ml);
    const price = p && priceOf(p, ml);
    if (!p || !price) return fail(res, 400, "Krepšelyje yra nebegaliojanti prekė – atnaujinkite puslapį");
    if (!inStock(p)) return fail(res, 409, `${p.name} laikinai išparduotas – pašalinkite jį iš krepšelio`);
    subtotal += price * qty;
    if (ml === SAMPLE_ML) sampleCredit += cents(price) * qty;
    lines.push({
      quantity: qty,
      price_data: {
        currency,
        unit_amount: cents(price),
        product_data: {
          name: `${S.shop} ${p.name} · ${ml === SAMPLE_ML ? "mėginukas 2 ml" : `${ml} ml`}`,
          description: `${p.conc} · ${p.tagline}`.slice(0, 250),
          metadata: { product_id: p.id, ml: String(ml) }
        }
      }
    });
  }
  if (!lines.length) return fail(res, 400, "Krepšelis tuščias");

  // Dovanų pakavimas ir rašteliukas
  const metadata = { shop: S.shop };
  if (body?.gift?.on && S.gift) {
    lines.push({
      quantity: 1,
      price_data: { currency, unit_amount: cents(S.gift.price), product_data: { name: "Dovanų pakavimas" } }
    });
    metadata.gift = "taip";
    const note = clean(body.gift.note, Math.min(S.gift.noteMax || 200, 490));
    if (note) metadata.gift_note = note;
  }
  if (sampleCredit && S.sampleCredit) metadata.sample_credit_cents = String(sampleCredit);

  // Pristatymas: nemokamas nuo settings.freeShippingFrom (skaičiuojama nuo prekių, be pakavimo)
  const free = subtotal >= S.freeShippingFrom;
  const method = S.shipping.find(o => o.id === body?.shipping?.method) || null;
  const lk = body?.shipping?.locker;
  const locker =
    method?.id === "omniva" && lk && /^\d{4,6}$/.test(String(lk.zip))
      ? { zip: String(lk.zip), name: clean(lk.name, 120), addr: clean(lk.addr, 120), city: clean(lk.city, 60), cc: clean(lk.cc, 2) }
      : null;
  const rate = o => ({
    shipping_rate_data: {
      type: "fixed_amount",
      display_name: free ? `${o.name} – nemokamai` : o.name,
      fixed_amount: { amount: free ? 0 : cents(o.price), currency },
      delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 3 } },
      metadata: { method: o.id }
    }
  });
  const site = siteUrl(req.headers["x-forwarded-host"] || req.headers.host);
  const params = {
    mode: "payment",
    locale: "lt",
    line_items: lines,
    shipping_options: (method ? [method] : S.shipping).map(rate),
    phone_number_collection: { enabled: true },
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    success_url: `${site}/aciu?s={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/#/krepselis`,
    metadata
  };
  if (method) metadata.ship_method = method.id;
  if (locker) {
    // Paštomatas pasirinktas parduotuvėje – adreso Stripe lange neklausiame
    metadata.locker = `${locker.zip} · ${locker.name} · ${[locker.addr, locker.city].filter(Boolean).join(", ")}`.slice(0, 490);
    params.custom_text = { submit: { message: `Siunta – į Omniva paštomatą: ${locker.name}, ${[locker.addr, locker.city].filter(Boolean).join(", ")}.` } };
  } else {
    params.shipping_address_collection = { allowed_countries: S.countries };
  }

  try {
    const data = await stripe("checkout/sessions", { method: "POST", params });
    return res.status(200).json({ id: data.id, url: data.url });
  } catch (err) {
    console.error("Stripe", err.status, err.message);
    return fail(res, 502, err.status ? "Stripe klaida" : "Stripe nepasiekiamas");
  }
}
