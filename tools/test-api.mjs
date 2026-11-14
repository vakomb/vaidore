// Serverio funkcijų testas be interneto: node tools/test-api.mjs
// Stripe ir Resend API imituojami (globalThis.fetch). Tikrina api/checkout.js (kainos tik iš katalogo, likučiai,
// atradimų rinkinys, paštomatas, dovanų pakavimas, mėginukų suma), api/_lib.js (nuolaidos kodas vieną kartą),
// api/order.js ir api/stripe-webhook.js (parašas, laiškai).
import crypto from "node:crypto";

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.RESEND_API_KEY = "re_test";
process.env.SITE_URL = "https://vaidore.com";

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const calls = [];
const promos = new Map();
const session = {
  id: "cs_test_a1B2c3D4e5F6g7H8",
  payment_status: "paid",
  amount_total: 15540,
  payment_intent: "pi_1",
  metadata: { sample_credit_cents: "1980", ship_method: "omniva", locker: "55512 · Kauno paštomatas", gift: "taip", gift_note: "Su gimtadieniu" },
  customer_details: { name: "Ona", email: "ona@example.com", phone: "+37060000000" },
  shipping_cost: { amount_total: 0 },
  line_items: { data: [{ description: "Vaidore Gintaras · 100 ml", quantity: 1, amount_total: 12900 }] }
};
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const body = init.body ? new URLSearchParams(init.body) : null;
  calls.push({ url: u, method: init.method || "GET", body, headers: init.headers || {}, raw: init.body });
  const ok = data => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
  if (u.includes("/checkout/sessions") && init.method === "POST") return ok({ id: "cs_test_new", url: "https://checkout.stripe.com/x" });
  if (u.includes("/checkout/sessions/")) return ok(session);
  if (u.includes("/promotion_codes?code=")) {
    const code = decodeURIComponent(u.split("code=")[1].split("&")[0]);
    return ok({ data: promos.has(code) ? [promos.get(code)] : [] });
  }
  if (u.endsWith("/coupons")) return ok({ id: "co_1" });
  if (u.endsWith("/promotion_codes")) {
    promos.set(body.get("code"), { code: body.get("code"), expires_at: Number(body.get("expires_at")) });
    return ok({ id: "promo_1" });
  }
  if (u.includes("api.resend.com")) return ok({ id: "mail_1" });
  return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
};
function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => (r.headers[k] = v);
  r.status = c => ((r.code = c), r);
  r.json = b => ((r.body = b), r);
  return r;
}
const call = async (handler, req) => {
  const res = mockRes();
  await handler({ headers: { host: "vaidore.com" }, ...req }, res);
  return res;
};

const { default: checkout } = await import("../api/checkout.js");
const { default: order } = await import("../api/order.js");
const { POST: webhook } = await import("../api/stripe-webhook.js");
const { catalog, verifySignature } = await import("../api/_lib.js");
const D = catalog.settings.discovery;

// checkout
let r = await call(checkout, { method: "GET" });
check(r.code === 405, "checkout: GET → 405");
r = await call(checkout, { method: "POST", body: { items: [{ id: "rasa", ml: 77, qty: 1 }] } });
check(r.code === 400, "checkout: neegzistuojantis tūris → 400");
r = await call(checkout, { method: "POST", body: { items: [{ id: D.id, qty: 1, picks: ["rasa", "rasa", "jura", "ruta", "smilga"] }] } });
check(r.code === 400, "checkout: rinkinys su pasikartojančiu kvapu → 400");
catalog.products.find(p => p.id === "jura").stock = 0;
r = await call(checkout, { method: "POST", body: { items: [{ id: "jura", ml: 50, qty: 1 }] } });
check(r.code === 409 && /išparduotas/.test(r.body.error), "checkout: stock 0 → 409 „išparduotas“");
r = await call(checkout, { method: "POST", body: { items: [{ id: D.id, qty: 1, picks: ["rasa", "jura", "gintaras", "ruta", "smilga"] }] } });
check(r.code === 409, "checkout: rinkinys su išparduotu kvapu → 409");
delete catalog.products.find(p => p.id === "jura").stock;

calls.length = 0;
r = await call(checkout, {
  method: "POST",
  body: JSON.stringify({
    items: [
      { id: "gintaras", ml: 100, qty: 1, price: 0.01 },
      { id: "rasa", ml: 2, qty: 1 },
      { id: D.id, qty: 1, picks: ["rasa", "jura", "gintaras", "ruta", "smilga"] }
    ],
    shipping: { method: "omniva", locker: { zip: "55512", name: "Kauno EXPRESS MARKET Donelaičio paštomatas", addr: "K. Donelaičio g. 44A", city: "Kauno m.", cc: "LT" } },
    gift: { on: true, note: "Su gimtadieniu!\n<b>" }
  })
});
const b = calls[0]?.body;
check(r.code === 200 && r.body.url, "checkout: sesija sukurta");
check(b.get("line_items[0][price_data][unit_amount]") === "12900", "checkout: kaina iš katalogo (12900), ne iš naršyklės");
check(b.get("line_items[2][price_data][unit_amount]") === String(Math.round(D.price * 100)) && /Rasa, Jūra/.test(b.get("line_items[2][price_data][product_data][description]")), "checkout: rinkinys – fiksuota kaina ir kvapai");
check(b.get("line_items[3][price_data][product_data][name]") === "Dovanų pakavimas", "checkout: dovanų pakavimo eilutė");
check(b.get("metadata[gift_note]") === "Su gimtadieniu! <b>", "checkout: rašteliukas metaduomenyse (be eilučių lūžių)");
check(b.get("metadata[sample_credit_cents]") === String(490 + Math.round(D.price * 100)), "checkout: mėginukų suma kodui");
check(!b.has("shipping_address_collection[allowed_countries][0]") && /55512/.test(b.get("metadata[locker]")), "checkout: paštomatas – adreso neklausiama");
check(b.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "0" && !b.has("shipping_options[1][shipping_rate_data][type]"), "checkout: tik pasirinktas būdas, nemokamai nuo 60 €");
check(/success_url=https%3A%2F%2Fvaidore\.com%2Faciu%3Fs%3D\{CHECKOUT_SESSION_ID\}/.test(calls[0].raw), "checkout: {CHECKOUT_SESSION_ID} neužkoduotas");

calls.length = 0;
await call(checkout, { method: "POST", body: { items: [{ id: "jura", ml: 50, qty: 1 }], shipping: { method: "dpd" } } });
check(calls[0].body.get("shipping_address_collection[allowed_countries][0]") === "LT" && calls[0].body.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "499", "checkout: kurjeris – adresas, 4,99 €");
check(!calls[0].body.has("metadata[sample_credit_cents]"), "checkout: be mėginukų – kodo nėra");

// order + nuolaidos kodas
calls.length = 0;
r = await call(order, { method: "GET", query: { s: session.id } });
check(r.code === 200 && r.body.paid && r.body.credit?.code === "VD-E5F6G7H8" && r.body.credit.amount === 1980, `order: kodas ${r.body.credit?.code}`);
const promoCall = calls.find(c => c.url.endsWith("/promotion_codes"));
check(promoCall?.body.get("restrictions[minimum_amount]") === String(catalog.settings.sampleCredit.minOrder * 100) && promoCall.body.get("max_redemptions") === "1", "kodas: vienkartinis, užsakymui nuo buteliuko kainos");
check(promoCall?.headers["Idempotency-Key"] === `vd-promo-${session.id}`, "kodas: Stripe idempotency raktas");
check(!("customer_details" in r.body) && !JSON.stringify(r.body).includes("ona@"), "order: asmens duomenų negrąžina");
calls.length = 0;
await call(order, { method: "GET", query: { s: session.id } });
check(!calls.some(c => c.url.endsWith("/coupons")), "kodas: antrą kartą nekuriamas");
r = await call(order, { method: "GET", query: { s: "../../x" } });
check(r.code === 400, "order: neteisingas id → 400");

// webhook
const raw = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: session.id } } });
const t = Math.floor(Date.now() / 1000);
const sig = crypto.createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
check(verifySignature(raw, `t=${t},v1=${sig}`, "whsec_test"), "webhook: teisingas parašas priimamas");
check(!verifySignature(raw + " ", `t=${t},v1=${sig}`, "whsec_test"), "webhook: pakeistas tekstas atmetamas");
check(!verifySignature(raw, `t=${t - 1000},v1=${sig}`, "whsec_test"), "webhook: senas parašas atmetamas");
let w = await webhook(new Request("https://vaidore.com/api/stripe-webhook", { method: "POST", body: raw, headers: { "stripe-signature": "t=1,v1=00" } }));
check(w.status === 400, "webhook: be teisingo parašo → 400");
calls.length = 0;
w = await webhook(new Request("https://vaidore.com/api/stripe-webhook", { method: "POST", body: raw, headers: { "stripe-signature": `t=${t},v1=${sig}` } }));
const mails = calls.filter(c => c.url.includes("resend"));
const owner = mails[0] && JSON.parse(mails[0].raw);
check(w.status === 200 && mails.length === 2, "webhook: 2 laiškai (savininkui ir pirkėjui su kodu)");
check(owner?.to?.[0] === catalog.settings.company.email && /Kauno paštomatas/.test(owner.html) && /Su gimtadieniu/.test(owner.html) && /VD-E5F6G7H8/.test(owner.html), "webhook: savininko laiške – paštomatas, rašteliukas, kodas");
check(mails[1] && JSON.parse(mails[1].raw).to[0] === "ona@example.com", "webhook: pirkėjui – kodas");

console.log(failed ? `\n✗ Nepavyko: ${failed}` : "\nAPI testai praėjo");
process.exit(failed ? 1 : 0);
