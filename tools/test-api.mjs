// Serverio logikos testas be interneto: node tools/test-api.mjs
// Testuojamas supabase/functions/_shared/shop.js (tas pats kodas veikia Supabase Edge Function „shop“).
// Imituojami: Supabase REST / Auth, Stripe, Resend (globalThis.fetch). Tikrinama: kainos ir likučiai tik iš duomenų bazės,
// atradimų rinkinys, paštomatas, dovanų pakavimas, mėginukų suma, prisijungusio pirkėjo susiejimas, grįžimo adresas,
// užsakymo įrašymas (vieną kartą), nuolaidos kodas, webhook parašas ir laiškai, administratoriaus teisės ir veiksmai, paskyros ištrynimas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createShop, verifySignature } from "../supabase/functions/_shared/shop.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const S = cat.settings;
const D = S.discovery;
const SBU = "https://sb.test";
const env = {
  SUPABASE_URL: SBU,
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_x" }),
  SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "sb_publishable_x" }),
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  RESEND_API_KEY: "re_test",
  SITE_URL: "https://vaidore.com"
};

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};

// ── Imituota duomenų bazė ──
const db = {
  products: cat.products.map(p => ({ ...p, description: p.desc, times: p.time, visible: true })),
  profiles: [{ id: "u1", email: "ona@example.com", name: "Ona Onaitė", phone: "+37060000000", address: { name: "Ona", line1: "Gedimino pr. 1", city: "Vilnius", postal: "01103", country: "LT" }, stripe_customer: null }],
  orders: [],
  restock: [{ id: "r1", product_id: "arven", email: "laukia@example.com", notified: false }]
};
const users = { "eyJ.user": { id: "u1", email: "ona@example.com" }, "eyJ.admin": { id: "a1", email: "vakomb@gmail.com" } };
const calls = [];
const promos = new Map();
const session = {
  id: "cs_test_a1B2c3D4e5F6g7H8",
  payment_status: "paid",
  amount_total: 15540,
  payment_intent: "pi_1",
  metadata: { sample_credit_cents: "1980", ship_method: "omniva", locker: "55512 · Kauno paštomatas", gift: "taip", gift_note: "Su gimtadieniu", user_id: "u1" },
  customer_details: { name: "Ona", email: "ona@example.com", phone: "+37060000000" },
  shipping_cost: { amount_total: 0 },
  line_items: {
    data: [
      { description: "Vaidore Safrane · 100 ml", quantity: 1, amount_total: 12900, price: { unit_amount: 12900, product: { metadata: { product_id: "safrane", ml: "100" } } } },
      { description: "Vaidore Atradimų rinkinys", quantity: 1, amount_total: 1490, price: { unit_amount: 1490, product: { metadata: { product_id: D.id, picks: "vanor,arven,safrane,noirelle,bellara" } } } },
      { description: "Dovanų pakavimas", quantity: 1, amount_total: 250, price: { unit_amount: 250, product: { metadata: {} } } }
    ]
  }
};
const ok = data => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = init.method || "GET";
  const headers = init.headers || {};
  const isForm = typeof init.body === "string" && headers["Content-Type"] === "application/x-www-form-urlencoded";
  const body = isForm ? new URLSearchParams(init.body) : init.body ? JSON.parse(init.body) : null;
  calls.push({ url: u, method, body, headers, raw: init.body });
  // Supabase
  if (u.startsWith(`${SBU}/auth/v1/user`)) {
    const user = users[(headers.Authorization || "").replace("Bearer ", "")];
    return user ? ok(user) : new Response("{}", { status: 401 });
  }
  if (u.startsWith(`${SBU}/auth/v1/admin/users/`) && method === "DELETE") return ok({});
  if (u === `${SBU}/rest/v1/rpc/is_admin`) return ok(headers.Authorization === "Bearer eyJ.admin");
  if (u.startsWith(`${SBU}/rest/v1/products`)) {
    const id = u.match(/id=eq\.([^&]+)/)?.[1];
    return ok(id ? db.products.filter(p => p.id === decodeURIComponent(id)) : db.products);
  }
  if (u.startsWith(`${SBU}/rest/v1/settings`)) return ok([{ data: S }]);
  if (u.startsWith(`${SBU}/rest/v1/profiles`)) {
    if (method === "PATCH") {
      Object.assign(db.profiles[0], body);
      return new Response(null, { status: 204 });
    }
    return ok(db.profiles);
  }
  if (u === `${SBU}/rest/v1/rpc/vd_record_order`) {
    const exists = db.orders.some(o => o.stripe_session === body.o.stripe_session);
    if (!exists) db.orders.push({ id: "o1", status: "paid", ...body.o });
    return ok(!exists);
  }
  if (u === `${SBU}/rest/v1/rpc/vd_refund_order`) {
    db.orders[0].status = "refunded";
    return ok(true);
  }
  if (u.startsWith(`${SBU}/rest/v1/orders`)) {
    if (method === "PATCH") {
      Object.assign(db.orders[0], body);
      return new Response(null, { status: 204 });
    }
    return ok(db.orders.map(o => ({ mailed: false, ...o })));
  }
  if (u.startsWith(`${SBU}/rest/v1/restock_requests`)) {
    if (method === "PATCH") {
      Object.assign(db.restock[0], body);
      return new Response(null, { status: 204 });
    }
    return ok(db.restock.filter(r => !r.notified));
  }
  // Stripe
  if (u === "https://api.stripe.com/v1/checkout/sessions" && method === "POST") return ok({ id: "cs_test_new", url: "https://checkout.stripe.com/x" });
  if (u.startsWith("https://api.stripe.com/v1/checkout/sessions/")) return ok(session);
  if (u === "https://api.stripe.com/v1/customers") return ok({ id: "cus_1" });
  if (u.startsWith("https://api.stripe.com/v1/customers/")) return ok({ id: "cus_1" });
  if (u.includes("/promotion_codes?code=")) {
    const code = decodeURIComponent(u.split("code=")[1].split("&")[0]);
    return ok({ data: promos.has(code) ? [promos.get(code)] : [] });
  }
  if (u.endsWith("/coupons")) return ok({ id: "co_1" });
  if (u.endsWith("/promotion_codes")) {
    promos.set(body.get("code"), { code: body.get("code"), expires_at: Number(body.get("expires_at")) });
    return ok({ id: "promo_1" });
  }
  if (u.endsWith("/refunds")) return ok({ id: "re_1" });
  if (u.includes("api.resend.com")) return ok({ id: "mail_1" });
  return new Response("{}", { status: 404 });
};
const shop = createShop(env);
const req = (url, { method = "POST", body, token, headers = {} } = {}) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
const F = "https://sb.test/functions/v1/shop";
const res = async r => ({ status: r.status, body: await r.json() });

// ── checkout ──
let r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: "vanor", ml: 77, qty: 1 }] } })));
check(r.status === 400, "checkout: neegzistuojantis tūris → 400");
r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: D.id, qty: 1, picks: ["vanor", "vanor", "arven", "noirelle", "bellara"] }] } })));
check(r.status === 400, "checkout: rinkinys su pasikartojančiu kvapu → 400");
db.products.find(p => p.id === "arven").stock = 0;
r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: "arven", ml: 50, qty: 1 }] } })));
check(r.status === 409 && /išparduotas/.test(r.body.error), "checkout: stock 0 → 409 „išparduotas“");
r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: D.id, qty: 1, picks: ["vanor", "arven", "safrane", "noirelle", "bellara"] }] } })));
check(r.status === 409, "checkout: rinkinys su išparduotu kvapu → 409");
db.products.find(p => p.id === "arven").stock = 2;
r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: "arven", ml: 50, qty: 3 }] } })));
check(r.status === 409 && /liko tik 2/.test(r.body.error), "checkout: daugiau nei likutis → 409 „liko tik 2“");
db.products.find(p => p.id === "arven").stock = null;
db.products.find(p => p.id === "bellara").visible = false;
r = await res(await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: "bellara", ml: 50, qty: 1 }] } })));
check(r.status === 400, "checkout: paslėptas kvapas – nepirktinas");
db.products.find(p => p.id === "bellara").visible = true;

calls.length = 0;
r = await res(
  await shop.checkout(
    req(`${F}/checkout`, {
      body: {
        items: [
          { id: "safrane", ml: 100, qty: 1, price: 0.01 },
          { id: "vanor", ml: 2, qty: 1 },
          { id: D.id, qty: 1, picks: ["vanor", "arven", "safrane", "noirelle", "bellara"] }
        ],
        shipping: { method: "omniva", locker: { zip: "55512", name: "Kauno EXPRESS MARKET Donelaičio paštomatas", addr: "K. Donelaičio g. 44A", city: "Kauno m.", cc: "LT" } },
        gift: { on: true, note: "Su gimtadieniu!\n<b>" },
        site: "https://vakomb.github.io/vaidore"
      }
    })
  )
);
const b = calls.find(c => c.url.endsWith("/checkout/sessions"))?.body;
check(r.status === 200 && r.body.url, "checkout: sesija sukurta");
const c100 = String(Math.round(cat.products.find(p => p.id === "safrane").sizes.find(s => s.ml === 100).price * 100));
check(b.get("line_items[0][price_data][unit_amount]") === c100, `checkout: kaina iš duomenų bazės (${c100}), ne iš naršyklės`);
check(b.get("line_items[2][price_data][unit_amount]") === String(Math.round(D.price * 100)) && /Vanor, Arven/.test(b.get("line_items[2][price_data][product_data][description]")), "checkout: rinkinys – fiksuota kaina ir kvapai");
check(b.get("line_items[3][price_data][product_data][name]") === "Dovanų pakavimas", "checkout: dovanų pakavimo eilutė");
check(b.get("metadata[gift_note]") === "Su gimtadieniu! <b>", "checkout: rašteliukas metaduomenyse (be eilučių lūžių)");
check(b.get("metadata[sample_credit_cents]") === String(Math.round(cat.products.find(p => p.id === "vanor").sample * 100) + Math.round(D.price * 100)), "checkout: mėginukų suma kodui");
check(!b.has("shipping_address_collection[allowed_countries][0]") && /55512/.test(b.get("metadata[locker]")), "checkout: paštomatas – adreso neklausiama");
check(b.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "0" && !b.has("shipping_options[1][shipping_rate_data][type]"), "checkout: tik pasirinktas būdas, nemokamai nuo 60 €");
check(b.get("success_url") === "https://vakomb.github.io/vaidore/aciu?s={CHECKOUT_SESSION_ID}", "checkout: grįžimas į tą pačią svetainę (GitHub Pages)");
check(!b.has("customer") && !b.has("metadata[user_id]"), "checkout: svečias – be paskyros");

calls.length = 0;
await shop.checkout(req(`${F}/checkout`, { body: { items: [{ id: "arven", ml: 50, qty: 1 }], shipping: { method: "dpd" }, site: "https://piktas.example" } }));
let cb = calls.find(c => c.url.endsWith("/checkout/sessions"))?.body;
check(cb.get("shipping_address_collection[allowed_countries][0]") === "LT" && cb.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "499", "checkout: kurjeris – adresas, 4,99 €");
check(cb.get("success_url").startsWith("https://vaidore.com/aciu"), "checkout: svetimas grįžimo adresas – nenaudojamas");
check(!cb.has("metadata[sample_credit_cents]"), "checkout: be mėginukų – kodo nėra");

calls.length = 0;
await shop.checkout(req(`${F}/checkout`, { token: "eyJ.user", body: { items: [{ id: "arven", ml: 50, qty: 1 }], shipping: { method: "dpd" } } }));
cb = calls.find(c => c.url.endsWith("/checkout/sessions"))?.body;
check(cb.get("metadata[user_id]") === "u1" && cb.get("customer") === "cus_1" && db.profiles[0].stripe_customer === "cus_1", "checkout: prisijungęs – susieta su paskyra, Stripe klientas sukurtas ir išsaugotas");
check(calls.find(c => c.url === "https://api.stripe.com/v1/customers")?.body.get("shipping[address][line1]") === "Gedimino pr. 1", "checkout: išsaugotas adresas perduodamas Stripe");

// ── order (padėkos puslapis) ──
calls.length = 0;
r = await res(await shop.orderInfo(req(`${F}/order?s=${session.id}`, { method: "GET" })));
check(r.status === 200 && r.body.paid && r.body.credit?.code === "VD-E5F6G7H8" && r.body.credit.amount === 1980, `order: kodas ${r.body.credit?.code}`);
const promoCall = calls.find(c => c.url.endsWith("/promotion_codes"));
check(promoCall?.body.get("restrictions[minimum_amount]") === String(S.sampleCredit.minOrder * 100) && promoCall.body.get("max_redemptions") === "1", "kodas: vienkartinis, užsakymui nuo buteliuko kainos");
check(promoCall?.headers["Idempotency-Key"] === `vd-promo-${session.id}`, "kodas: Stripe idempotency raktas");
check(db.orders.length === 1 && db.orders[0].user_id === "u1" && db.orders[0].credit_code === "VD-E5F6G7H8", "order: užsakymas įrašytas su paskyra ir kodu");
const it = db.orders[0].items;
check(it.length === 2 && it[0].ml === 100 && it[1].picks.length === 5 && db.orders[0].product_ids.includes("noirelle"), "order: eilutės (buteliukas, rinkinys su kvapais), be pakavimo eilutės");
check(!JSON.stringify(r.body).includes("ona@"), "order: asmens duomenų negrąžina");
calls.length = 0;
await shop.orderInfo(req(`${F}/order?s=${session.id}`, { method: "GET" }));
check(!calls.some(c => c.url.endsWith("/coupons")) && db.orders.length === 1, "order: antrą kartą – nei naujo kodo, nei naujo užsakymo");
r = await res(await shop.orderInfo(req(`${F}/order?s=../../x`, { method: "GET" })));
check(r.status === 400, "order: neteisingas id → 400");

// ── webhook ──
const raw = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: session.id } } });
const t = Math.floor(Date.now() / 1000);
const { createHmac } = await import("node:crypto");
const sig = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
check(await verifySignature(raw, `t=${t},v1=${sig}`, "whsec_test"), "webhook: teisingas parašas priimamas");
check(!(await verifySignature(raw + " ", `t=${t},v1=${sig}`, "whsec_test")), "webhook: pakeistas tekstas atmetamas");
check(!(await verifySignature(raw, `t=${t - 1000},v1=${sig}`, "whsec_test")), "webhook: senas parašas atmetamas");
r = await res(await shop.webhook(req(`${F}/stripe-webhook`, { body: raw, headers: { "stripe-signature": "t=1,v1=00" } })));
check(r.status === 400, "webhook: be teisingo parašo → 400");
calls.length = 0;
r = await res(await shop.webhook(req(`${F}/stripe-webhook`, { body: raw, headers: { "stripe-signature": `t=${t},v1=${sig}` } })));
const mails = calls.filter(c => c.url.includes("resend"));
check(r.status === 200 && r.body.inserted === false && mails.length === 2, "webhook: užsakymą jau įrašė padėkos puslapis – laiškai vis tiek išsiunčiami (2)");
calls.length = 0;
r = await res(await shop.webhook(req(`${F}/stripe-webhook`, { body: raw, headers: { "stripe-signature": `t=${t},v1=${sig}` } })));
check(r.status === 200 && !calls.some(c => c.url.includes("resend")), "webhook: pakartotinis – laiškų nekartoja");
const owner = mails[0]?.body;
check(owner?.to?.[0] === S.company.email && /Kauno paštomatas/.test(owner.html) && /Su gimtadieniu/.test(owner.html) && /VD-E5F6G7H8/.test(owner.html), "webhook: savininko laiške – paštomatas, rašteliukas, kodas");

// ── admin ──
r = await res(await shop.admin(req(`${F}/admin`, { token: "eyJ.user", body: { action: "ship", order_id: "o1" } })));
check(r.status === 403, "admin: ne administratorius → 403");
r = await res(await shop.admin(req(`${F}/admin`, { body: { action: "ship", order_id: "o1" } })));
check(r.status === 403, "admin: be prisijungimo → 403");
calls.length = 0;
r = await res(await shop.admin(req(`${F}/admin`, { token: "eyJ.admin", body: { action: "ship", order_id: "o1", tracking: "CC123456789EE" } })));
check(r.status === 200 && db.orders[0].status === "shipped" && db.orders[0].tracking === "CC123456789EE" && r.body.mailed, "admin: „Išsiųsta“ + siuntos nr. + laiškas pirkėjui");
r = await res(await shop.admin(req(`${F}/admin`, { token: "eyJ.admin", body: { action: "refund", order_id: "o1" } })));
check(r.status === 200 && calls.some(c => c.url.endsWith("/refunds") && c.body.get("payment_intent") === "pi_1") && db.orders[0].status === "refunded", "admin: pinigų grąžinimas per Stripe + likučiai");
r = await res(await shop.admin(req(`${F}/admin`, { token: "eyJ.admin", body: { action: "refund", order_id: "o1" } })));
check(r.status === 409, "admin: antrą kartą grąžinti negalima");
r = await res(await shop.admin(req(`${F}/admin`, { token: "eyJ.admin", body: { action: "restock-notify", product_id: "arven" } })));
check(r.status === 200 && r.body.sent === 1 && db.restock[0].notified, "admin: „Pranešti, kai bus“ laiškai išsiųsti ir pažymėti");

// ── account ──
r = await res(await shop.account(req(`${F}/account`, { body: { action: "delete" } })));
check(r.status === 401, "account: be prisijungimo → 401");
calls.length = 0;
r = await res(await shop.account(req(`${F}/account`, { token: "eyJ.user", body: { action: "delete" } })));
check(r.status === 200 && calls.some(c => c.url === `${SBU}/auth/v1/admin/users/u1` && c.method === "DELETE" && c.headers.apikey === "sb_secret_x"), "account: ištrinama tik savo paskyra (serverio raktu)");

console.log(failed ? `\n✗ Nepavyko: ${failed}` : "\nServerio testai praėjo");
process.exit(failed ? 1 : 0);
