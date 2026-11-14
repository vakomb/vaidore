// Vercel funkcija POST /api/checkout – sukuria Stripe Checkout sesiją ir grąžina { url }.
// Be npm paketų: Stripe REST API per fetch. Raktas – Vercel aplinkos kintamasis STRIPE_SECRET_KEY
// (Vercel → Project → Settings → Environment Variables). Rakto į repozitoriją NEDĖKITE.
// Kainos imamos TIK iš src/data/catalog.json (serverio kopijos) – naršyklė siunčia tik id, ml ir kiekį.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalog = require("../src/data/catalog.json");
const S = catalog.settings;
const BY_ID = new Map(catalog.products.map(p => [p.id, p]));
const SAMPLE_ML = 2;
const cents = eur => Math.round(eur * 100);

// Stripe API laukia application/x-www-form-urlencoded su laužtiniais skliaustais (line_items[0][price_data][currency]=eur)
function form(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}
function priceOf(p, ml) {
  if (ml === SAMPLE_ML) return p.sample;
  return p.sizes.find(s => s.ml === ml)?.price;
}
function origin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Tik POST" });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: "Apmokėjimas dar neįjungtas (nėra STRIPE_SECRET_KEY)" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const items = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
  const lines = [];
  let subtotal = 0;
  for (const it of items) {
    const p = BY_ID.get(String(it?.id || ""));
    const ml = Number(it?.ml);
    const qty = Math.round(Number(it?.qty));
    const price = p && priceOf(p, ml);
    if (!p || !price || !(qty >= 1 && qty <= S.maxQty)) {
      return res.status(400).json({ error: "Krepšelyje yra nebegaliojanti prekė – atnaujinkite puslapį" });
    }
    subtotal += price * qty;
    lines.push({
      quantity: qty,
      price_data: {
        currency: S.currency || "eur",
        unit_amount: cents(price),
        product_data: {
          name: `${S.shop} ${p.name} · ${ml === SAMPLE_ML ? "mėginukas 2 ml" : `${ml} ml`}`,
          description: `${p.conc} · ${p.tagline}`.slice(0, 250),
          metadata: { product_id: p.id, ml: String(ml) }
        }
      }
    });
  }
  if (!lines.length) return res.status(400).json({ error: "Krepšelis tuščias" });

  const free = subtotal >= S.freeShippingFrom;
  const shipping_options = S.shipping.map(o => ({
    shipping_rate_data: {
      type: "fixed_amount",
      display_name: free ? `${o.name} – nemokamai` : o.name,
      fixed_amount: { amount: free ? 0 : cents(o.price), currency: S.currency || "eur" },
      delivery_estimate: {
        minimum: { unit: "business_day", value: 1 },
        maximum: { unit: "business_day", value: 3 }
      },
      metadata: { method: o.id }
    }
  }));
  const site = origin(req);
  const params = form({
    mode: "payment",
    locale: "lt",
    line_items: lines,
    shipping_options,
    shipping_address_collection: { allowed_countries: S.countries },
    phone_number_collection: { enabled: true },
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    success_url: `${site}/aciu?s={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/#/krepselis`,
    metadata: { shop: S.shop }
  });
  // URLSearchParams užkoduoja „{“ ir „}“ – Stripe {CHECKOUT_SESSION_ID} turi likti tikras
  const payload = params.toString().replace(/%7BCHECKOUT_SESSION_ID%7D/g, "{CHECKOUT_SESSION_ID}");

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20"
      },
      body: payload
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Stripe", r.status, data?.error?.message);
      return res.status(502).json({ error: "Stripe klaida" });
    }
    return res.status(200).json({ id: data.id, url: data.url });
  } catch (err) {
    console.error("Stripe fetch", err);
    return res.status(502).json({ error: "Stripe nepasiekiamas" });
  }
}
