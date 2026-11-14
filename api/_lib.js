// Bendros serverio funkcijos (Vercel failų, prasidedančių „_“, nelaiko atskiru adresu).
// Stripe ir Resend – per REST API su fetch, be npm paketų. Raktai – tik Vercel → Settings → Environment Variables:
//   STRIPE_SECRET_KEY      – Stripe slaptas raktas (sk_live_… / sk_test_…)
//   STRIPE_WEBHOOK_SECRET  – webhook parašo raktas (whsec_…), žr. api/stripe-webhook.js
//   RESEND_API_KEY         – (nebūtina) laiškams savininkui ir pirkėjui; be jo laiškų nesiunčiame
//   MAIL_FROM              – (nebūtina) siuntėjas, pvz. „Vaidore <uzsakymai@vaidore.com>“ (domenas patvirtintas Resend)
//   ORDER_EMAIL_TO         – (nebūtina) kam siųsti užsakymus; numatyta – settings.company.email
//   SITE_URL               – (nebūtina) pvz. https://vaidore.com
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const catalog = require("../src/data/catalog.json");
export const S = catalog.settings;
export const BY_ID = new Map(catalog.products.map(p => [p.id, p]));
export const SAMPLE_ML = 2;
export const DISC = S.discovery || null;
export const cents = eur => Math.round(eur * 100);
export const inStock = p => p.stock == null || p.stock > 0;
export const eur = c => `${(c / 100).toFixed(2).replace(".", ",")} €`;

// Stripe API laukia application/x-www-form-urlencoded su laužtiniais skliaustais (line_items[0][price_data][currency]=eur)
export function form(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}
export async function stripe(path, { method = "GET", params = null, idem = null } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error("Nėra STRIPE_SECRET_KEY"), { status: 503 });
  const headers = { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" };
  let body;
  if (params) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = (params instanceof URLSearchParams ? params : form(params)).toString().replace(/%7BCHECKOUT_SESSION_ID%7D/g, "{CHECKOUT_SESSION_ID}");
  }
  if (idem) headers["Idempotency-Key"] = idem;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data?.error?.message || `Stripe ${r.status}`), { status: r.status, stripe: data?.error });
  return data;
}
export function siteUrl(host) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  return host ? `https://${host}` : `https://${S.domain}`;
}
export const orderRef = id => String(id || "").slice(-8).toUpperCase();

// Mėginukų kainos grąžinimas: po apmokėjimo – vienkartinis nuolaidos kodas (Stripe Coupon + Promotion Code), be duomenų bazės.
// Suma – session.metadata.sample_credit_cents (apskaičiuoja api/checkout.js). Kodas VD-<užsakymo nr.> – tas pats kiekvieną kartą,
// todėl kvietimas iš webhook ir iš /api/order nesukuria dviejų kodų. Galioja settings.sampleCredit.days d., kartą,
// užsakymui nuo settings.sampleCredit.minOrder € (t. y. buteliukui). Pirkėjas įveda jį Stripe apmokėjimo lange.
export async function ensureCredit(session) {
  const c = S.sampleCredit;
  const amount = Number(session?.metadata?.sample_credit_cents) || 0;
  if (!c || !amount || session.payment_status !== "paid") return null;
  const code = `VD-${orderRef(session.id)}`;
  const found = await stripe(`promotion_codes?code=${encodeURIComponent(code)}&limit=1`);
  if (found.data?.[0]) return { code, amount, expires: found.data[0].expires_at };
  const expires = Math.floor(Date.now() / 1000) + c.days * 86400;
  const coupon = await stripe("coupons", {
    method: "POST",
    idem: `vd-coupon-${session.id}`,
    params: { amount_off: amount, currency: S.currency || "eur", duration: "once", name: "Mėginukų kaina grąžinta", max_redemptions: 1, redeem_by: expires }
  });
  await stripe("promotion_codes", {
    method: "POST",
    idem: `vd-promo-${session.id}`,
    params: {
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: expires,
      restrictions: { minimum_amount: cents(c.minOrder || 0), minimum_amount_currency: S.currency || "eur" },
      metadata: { session: session.id }
    }
  });
  return { code, amount, expires };
}

// Laiškai per Resend (https://resend.com) – nebūtina. Be RESEND_API_KEY grąžina false ir nieko nesiunčia.
export async function sendMail({ to, subject, html, idem }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idem ? { "Idempotency-Key": idem } : {}) },
    body: JSON.stringify({ from: process.env.MAIL_FROM || `${S.shop} <onboarding@resend.dev>`, to: [].concat(to), subject, html })
  });
  if (!r.ok) console.error("Resend", r.status, await r.text().catch(() => ""));
  return r.ok;
}
export const escHtml = v =>
  String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

// Stripe webhook parašas: Stripe-Signature „t=…,v1=…“, HMAC-SHA256(secret, `${t}.${neapdorotas tekstas}`), ±5 min.
const TOLERANCE = 300; // s
export function verifySignature(raw, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = {};
  const v1 = [];
  for (const kv of String(header).split(",")) {
    const [k, v] = kv.split("=");
    if (k === "t") parts.t = v;
    if (k === "v1") v1.push(v);
  }
  const t = Number(parts.t);
  if (!t || !v1.length || Math.abs(now - t) > TOLERANCE) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`, "utf8").digest("hex");
  return v1.some(sig => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}
