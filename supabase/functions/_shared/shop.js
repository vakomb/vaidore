// Vaidore serverio logika - bendra visoms Supabase Edge Functions (Deno) ir testams (Node: tools/test-api.mjs).
// Grynas JS: tik fetch ir Web Crypto; aplinkos kintamieji perduodami (env), todėl veikia ir be Deno.
// Paslaptys - tik Supabase → Edge Functions → Secrets (niekada repozitorijoje):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, (nebūtina) RESEND_API_KEY, MAIL_FROM, ORDER_EMAIL_TO, SITE_URL,
//   GITHUB_TOKEN + GITHUB_REPO (svetainės perrinkimui), VERCEL_DEPLOY_HOOK.
// SUPABASE_URL ir raktai (SUPABASE_SECRET_KEYS / SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEYS / SUPABASE_ANON_KEY) - suteikia Supabase.

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
export const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const SAMPLE_ML = 2;
// Prekių tipai (v15) - tie patys kaip TYPES (src/scripts/app/03-catalog.js): Stripe aprašymui ir nuorodoms
const TYPE_ONE = { difuzoriai: "Namų kvapų difuzorius", zvakes: "Kvapni žvakė", aliejai: "Aromatinis aliejus", "elektriniai-difuzoriai": "Elektrinis difuzorius" };
const typePath = p => (TYPE_ONE[p.type] ? p.type : "kvepalai");
// v33e: pirkėjo kalba (lt / en) - Stripe langas, nuorodos, laiškai pirkėjui, klaidos. Savininkui - visada lietuviškai.
// Angliški adresai - kaip src/i18n/routes.json (test-api.mjs tikrina, kad sutampa)
export const LANGS = ["lt", "en"];
export const langOf = v => (v === "en" ? "en" : "lt");
export const EN_PATHS = { kvepalai: "perfumes", zvakes: "candles", aliejai: "fragrance-oils", difuzoriai: "reed-diffusers", "elektriniai-difuzoriai": "electric-diffusers" };
const pathFor = (lang, lt) =>
  lang === "en"
    ? `en/${{ aciu: "thank-you", krepselis: "cart", "paskyra/uzsakymai": "account/orders", naujienlaiskis: "newsletter", "": "" }[lt] ?? lt}`.replace(/\/$/, "")
    : lt;
const productPath = (lang, p) => (lang === "en" ? `en/${EN_PATHS[typePath(p)]}/${p.id}` : `${typePath(p)}/${p.id}`);
const TYPE_ONE_EN = { difuzoriai: "Reed diffuser", zvakes: "Scented candle", aliejai: "Fragrance oil", "elektriniai-difuzoriai": "Electric diffuser" };
export const TXT = {
  lt: {
    sample: "mėginukas 2 ml",
    pcs: "1 vnt.",
    gift: "Dovanų pakavimas",
    free: "{name} - nemokamai",
    lockerMsg: "Siunta - į paštomatą: {name}.",
    locker: "Paštomatas",
    "omniva.locker": "Omniva paštomatas",
    "lpexpress.locker": "LP Express paštomatas",
    "dpd.locker": "DPD Pickup paštomatas",
    "omniva.courier": "Omniva kurjeris iki durų",
    "lpexpress.courier": "LP Express kurjeris iki durų",
    "dpd.courier": "DPD kurjeris iki durų",
    no_country: "Pasirinkite pristatymo šalį",
    bad_method: "Pasirinkite pristatymo būdą",
    method_perfume: "Šiuo būdu kvepalų siųsti negalime (juose yra alkoholio) - pasirinkite kitą",
    locker_needed: "Pasirinkite paštomatą",
    bad_qty: "Neteisingas kiekis",
    disc_invalid: "Atradimų rinkinyje turi būti skirtingi kvapai - atnaujinkite puslapį",
    disc_out: "{name} laikinai išparduotas - pakeiskite rinkinį",
    stale_item: "Krepšelyje yra nebegaliojanti prekė - atnaujinkite puslapį",
    out_of_stock: "{name} laikinai išparduotas - pašalinkite jį iš krepšelio",
    low_stock: "{name}: liko tik {n} vnt.",
    empty_cart: "Krepšelis tuščias",
    payments_off: "Apmokėjimas dar neįjungtas",
    stripe_error: "Stripe klaida",
    stripe_unreachable: "Stripe nepasiekiamas",
    hello: "Sveiki",
    creditSubject: "{shop}: mėginukų kaina grąžinta - kodas {code}",
    creditBody: "<p>Ačiū, kad renkatės {shop}!</p><p>Mėginukų kainą grąžiname: įveskite kodą <b style=\"font-size:18px\">{code}</b> apmokėdami buteliuką - nuolaida {amount}, galioja iki {until}.</p>",
    toShop: "Į parduotuvę",
    shipSubject: "{shop}: užsakymas {ref} išsiųstas",
    shipBody: "Jūsų užsakymas <b>{ref}</b> išsiųstas",
    tracking: "Siuntos numeris",
    myOrders: "Mano užsakymai",
    restockSubject: "{name} - vėl turime",
    restockBody: "Kvapas <b>{name}</b>, kurio laukėte, vėl prekyboje.",
    view: "Peržiūrėti",
    welcomeSubject: "Sveiki prisijungę prie {shop}!",
    welcomeBody: "Ačiū, kad užsiprenumeravote. Pirmi sužinosite apie naujus kvapus ir nuolaidas - laiškų siunčiame retai.",
    browse: "Peržiūrėti kvapus",
    visit: "Apsilankyti {shop}",
    newsFoot: "Gavote šį laišką, nes užsiprenumeravote {shop} naujienlaiškį.",
    unsubscribe: "Atsisakyti"
  },
  en: {
    sample: "2 ml sample",
    pcs: "1 pc",
    gift: "Gift wrapping",
    free: "{name} - free",
    lockerMsg: "Delivery to parcel locker: {name}.",
    locker: "Parcel locker",
    "omniva.locker": "Omniva parcel locker",
    "lpexpress.locker": "LP Express parcel locker",
    "dpd.locker": "DPD Pickup parcel locker",
    "omniva.courier": "Omniva courier to your door",
    "lpexpress.courier": "LP Express courier to your door",
    "dpd.courier": "DPD courier to your door",
    no_country: "Please choose your delivery country",
    bad_method: "Please choose a delivery method",
    method_perfume: "We can't ship perfume with this method (it contains alcohol) - please choose another",
    locker_needed: "Please choose a parcel locker",
    bad_qty: "Invalid quantity",
    disc_invalid: "The discovery set must contain different fragrances - please refresh the page",
    disc_out: "{name} is temporarily sold out - please change your set",
    stale_item: "Your bag contains an item that is no longer available - please refresh the page",
    out_of_stock: "{name} is temporarily sold out - please remove it from your bag",
    low_stock: "{name}: only {n} left",
    empty_cart: "Your bag is empty",
    payments_off: "Payments are not enabled yet",
    stripe_error: "Payment error",
    stripe_unreachable: "Payment service unavailable",
    hello: "Hello",
    creditSubject: "{shop}: your sample refund code {code}",
    creditBody: "<p>Thank you for choosing {shop}!</p><p>We're refunding the price of your samples: enter the code <b style=\"font-size:18px\">{code}</b> when you buy a full bottle - {amount} off, valid until {until}.</p>",
    toShop: "Visit the shop",
    shipSubject: "{shop}: order {ref} has been shipped",
    shipBody: "Your order <b>{ref}</b> has been shipped",
    tracking: "Tracking number",
    myOrders: "My orders",
    restockSubject: "{name} - back in stock",
    restockBody: "<b>{name}</b>, which you were waiting for, is back in stock.",
    view: "View",
    welcomeSubject: "Welcome to {shop}!",
    welcomeBody: "Thank you for subscribing. You'll be the first to hear about new fragrances and offers - we email rarely.",
    browse: "Explore our fragrances",
    visit: "Visit {shop}",
    newsFoot: "You're receiving this email because you subscribed to the {shop} newsletter.",
    unsubscribe: "Unsubscribe"
  }
};
export const tx = (lang, key, vars) => String(TXT[langOf(lang)][key] ?? TXT.lt[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (vars?.[k] ?? m));
// Klaida pirkėjui: kodas (programėlei) + tekstas jo kalba
const fail = (status, lang, code, vars) => json(status, { error: tx(lang, code, vars), code });
// Bazės įrašo tekstas kalba (products.i18n.en.name …), nėra - lietuviškas
const loc = (lang, o, k) => (lang !== "lt" && String(o?.i18n?.[lang]?.[k] || "").trim()) || o?.[k] || "";
const setLoc = (lang, S, path, fallback) => (lang !== "lt" && String(path.reduce((x, k) => x?.[k], S?.i18n?.[lang]) || "").trim()) || fallback;
// v33g: pristatymo zonos (settings.zones); senas nustatymas - viena zona iš shipping + countries
export function shipZones(S) {
  if (Array.isArray(S?.zones) && S.zones.length)
    return S.zones.map(z => ({ ...z, countries: (z.countries || []).map(c => String(c).toUpperCase()), methods: z.methods || [] }));
  return [
    {
      id: "default",
      countries: S?.countries || ["LT"],
      freeFrom: S?.freeShippingFrom,
      methods: (S?.shipping || []).map(o => ({ ...o, name: undefined, carrier: o.id === "omniva" ? "omniva" : "dpd", kind: o.id === "omniva" ? "locker" : "courier" }))
    }
  ];
}
// Talpos pavadinimas (v15): sizes[].unit - "g" (žvakės), "vnt" (elektrinis difuzorius), kitaip ml
const sizeName = (p, ml, lang = "lt") => {
  if (ml === SAMPLE_ML && !TYPE_ONE[p.type]) return tx(lang, "sample");
  const unit = (p.sizes || []).find(s => Number(s.ml) === ml)?.unit || "ml";
  return unit === "vnt" ? tx(lang, "pcs") : `${ml} ${unit}`;
};
const cents = v => Math.round(Number(v) * 100);
const inStock = p => p.stock == null || p.stock > 0;
export const eurTxt = (c, lang = "lt") => (lang === "en" ? `€${(c / 100).toFixed(2)}` : `${(c / 100).toFixed(2).replace(".", ",")} €`);
export const orderRef = id => String(id || "").slice(-8).toUpperCase();
// v30: ilgi brūkšniai (U+2012-2015) ir minuso ženklas (U+2212) - visur paprastas „-“ (ir bazės tekstuose)
export const plain = v => String(v ?? "").replace(/[\u2012-\u2015\u2212]/g, "-");
export const escHtml = v => plain(v).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const clean = (v, n) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

function keyFrom(env, jsonName, legacy) {
  try {
    const k = JSON.parse(env[jsonName] || "{}").default;
    if (k) return k;
  } catch {
    /* senesni raktai */
  }
  return env[legacy] || "";
}

export function createShop(env) {
  const SB_URL = env.SUPABASE_URL;
  const SECRET = keyFrom(env, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const PUBLIC = keyFrom(env, "SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const svcHeaders = extra => ({ apikey: SECRET, ...(SECRET.startsWith("eyJ") ? { Authorization: `Bearer ${SECRET}` } : {}), ...extra });

  // ── Duomenų bazė (serverio teisės - RLS netaikoma) ───
  async function db(path, { method = "GET", body, prefer } = {}) {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method,
      headers: svcHeaders({ ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(prefer ? { Prefer: prefer } : {}) }),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const d = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) throw Object.assign(new Error(d?.message || `DB ${r.status}`), { status: r.status });
    return d;
  }
  async function loadShop() {
    const [products, settings] = await Promise.all([db("products?select=*"), db("settings?select=data&id=eq.1")]);
    const S = settings?.[0]?.data || {};
    return { S, BY_ID: new Map(products.filter(p => p.visible !== false).map(p => [p.id, p])) };
  }
  // Prisijungęs vartotojas iš Authorization (jo paties JWT); svečias - null
  async function userFrom(req) {
    const h = req.headers.get("authorization") || "";
    const token = h.replace(/^Bearer\s+/i, "");
    if (!token || !token.startsWith("eyJ") || token === PUBLIC) return null;
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: PUBLIC || SECRET, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { ...u, token } : null;
  }
  async function isAdmin(user) {
    if (!user) return false;
    const r = await fetch(`${SB_URL}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: { apikey: PUBLIC || SECRET, Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: "{}"
    });
    return r.ok && (await r.json()) === true;
  }

  // ── Stripe ────────────────────────────────────────────
  function form(obj, prefix = "", out = new URLSearchParams()) {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === "object") form(v, key, out);
      else out.append(key, String(v));
    }
    return out;
  }
  async function stripe(path, { method = "GET", params = null, idem = null } = {}) {
    if (!env.STRIPE_SECRET_KEY) throw Object.assign(new Error("Nėra STRIPE_SECRET_KEY"), { status: 503 });
    const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Stripe-Version": "2024-06-20" };
    let body;
    if (params) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = form(params).toString().replace(/%7BCHECKOUT_SESSION_ID%7D/g, "{CHECKOUT_SESSION_ID}");
    }
    if (idem) headers["Idempotency-Key"] = idem;
    const r = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data?.error?.message || `Stripe ${r.status}`), { status: r.status, stripe: data?.error });
    return data;
  }
  const siteUrl = () => (env.SITE_URL || "https://vaidore.com").replace(/\/$/, "");
  // Grįžimo adresas po apmokėjimo - ta pati svetainė, iš kurios pirkta (vaidore.com, GitHub Pages kopija, Vercel peržiūra),
  // bet tik iš leidžiamų adresų (SITE_URLS, kableliais), kad nebūtų galima nukreipti į svetimą svetainę
  function pickSite(candidate) {
    const allowed = (env.SITE_URLS || `${siteUrl()},https://www.vaidore.com,https://vakomb.github.io/vaidore`).split(",").map(x => x.trim().replace(/\/$/, ""));
    const c = String(candidate || "").replace(/\/$/, "");
    if (allowed.includes(c) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(c) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(c)) return c;
    return siteUrl();
  }

  // ── Apmokėjimas: krepšelis → Stripe Checkout ──────────
  async function checkout(req) {
    const body = await req.json().catch(() => null);
    const lang = langOf(body?.lang);
    if (!env.STRIPE_SECRET_KEY) return fail(503, lang, "payments_off");
    const { S, BY_ID } = await loadShop();
    const DISC = S.discovery || null;
    const currency = S.currency || "eur";
    const maxQty = S.maxQty || 10;
    const items = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
    const lines = [];
    let subtotal = 0;
    let hasPerfume = false; // v33g: kvepaluose yra alkoholio - būdai su perfume: false negalimi
    let sampleCredit = 0;
    for (const it of items) {
      const qty = Math.round(Number(it?.qty));
      if (!(qty >= 1 && qty <= maxQty)) return fail(400, lang, "bad_qty");
      if (DISC && it?.id === DISC.id) {
        const picks = Array.isArray(it.picks) ? it.picks.map(String) : [];
        if (!(picks.length === DISC.count && new Set(picks).size === picks.length && picks.every(id => BY_ID.has(id) && Number(BY_ID.get(id).sample) > 0)))
          return fail(400, lang, "disc_invalid");
        const out = picks.map(id => BY_ID.get(id)).find(p => !inStock(p));
        if (out) return fail(409, lang, "disc_out", { name: loc(lang, out, "name") });
        subtotal += DISC.price * qty;
        hasPerfume = true;
        sampleCredit += cents(DISC.price) * qty;
        lines.push({
          quantity: qty,
          price_data: {
            currency,
            unit_amount: cents(DISC.price),
            product_data: {
              name: plain(`${S.shop || "Vaidore"} ${setLoc(lang, S, ["discovery", "name"], DISC.name)} · ${DISC.count} × 2 ml`),
              description: plain(picks.map(id => loc(lang, BY_ID.get(id), "name")).join(", ")),
              metadata: { product_id: DISC.id, picks: picks.join(",") }
            }
          }
        });
        continue;
      }
      const p = BY_ID.get(String(it?.id || ""));
      const ml = Number(it?.ml);
      const price = p && (ml === SAMPLE_ML ? Number(p.sample) : Number((p.sizes || []).find(s => Number(s.ml) === ml)?.price));
      if (!p || !price) return fail(400, lang, "stale_item");
      if (!inStock(p)) return fail(409, lang, "out_of_stock", { name: loc(lang, p, "name") });
      if (p.stock != null && ml !== SAMPLE_ML && qty > p.stock) return fail(409, lang, "low_stock", { name: loc(lang, p, "name"), n: p.stock });
      subtotal += price * qty;
      if (!TYPE_ONE[p.type]) hasPerfume = true;
      if (ml === SAMPLE_ML) sampleCredit += cents(price) * qty;
      lines.push({
        quantity: qty,
        price_data: {
          currency,
          unit_amount: cents(price),
          product_data: {
            name: plain(`${S.shop || "Vaidore"} ${loc(lang, p, "name")} · ${sizeName(p, ml, lang)}`),
            description: plain(`${(lang === "en" ? TYPE_ONE_EN : TYPE_ONE)[p.type] || p.conc}${loc(lang, p, "tagline") ? ` · ${loc(lang, p, "tagline")}` : ""}`).slice(0, 250),
            metadata: { product_id: p.id, ml: String(ml) }
          }
        }
      });
    }
    if (!lines.length) return fail(400, lang, "empty_cart");

    const metadata = { shop: S.shop || "Vaidore", lang };
    if (body?.gift?.on && S.gift) {
      lines.push({ quantity: 1, price_data: { currency, unit_amount: cents(S.gift.price), product_data: { name: tx(lang, "gift") } } });
      metadata.gift = "taip";
      const note = clean(body.gift.note, Math.min(S.gift.noteMax || 200, 490));
      if (note) metadata.gift_note = note;
    }
    if (sampleCredit && S.sampleCredit) metadata.sample_credit_cents = String(sampleCredit);

    // v33g: pristatymas pagal šalis (settings.zones; be jų - senas shipping + countries kaip viena zona)
    const zones = shipZones(S);
    // šalis nenurodyta (senesnė programėlės versija pirkėjo telefone) - Lietuva
    const cc = String(body?.shipping?.country || (zones.some(z => z.countries.includes("LT")) ? "LT" : zones[0]?.countries[0] || "")).toUpperCase();
    const zone = zones.find(z => z.countries.includes(cc));
    if (!zone) return fail(400, lang, "no_country");
    const allowed = zone.methods.filter(m => m.on !== false && (m.perfume !== false || !hasPerfume));
    const asked = zone.methods.find(m => m.id === body?.shipping?.method && m.on !== false) || null;
    if (asked && asked.perfume === false && hasPerfume) return fail(400, lang, "method_perfume");
    if (!allowed.length) return fail(400, lang, "bad_method");
    const method = asked && allowed.includes(asked) ? asked : null;
    const free = subtotal >= Number(zone.freeFrom ?? S.freeShippingFrom);
    const lk = body?.shipping?.locker;
    const locker =
      method?.kind === "locker" && lk
        ? method.carrier === "omniva"
          ? /^\d{4,6}$/.test(String(lk.zip)) && { zip: String(lk.zip), name: clean(lk.name, 120), addr: clean(lk.addr, 120), city: clean(lk.city, 60) }
          : clean(lk.name, 120).length >= 3 && { zip: "", name: clean(lk.name, 120), addr: "", city: "" }
        : null;
    if (method?.kind === "locker" && method.carrier !== "omniva" && !locker) return fail(400, lang, "locker_needed");
    const mName = o => o.name?.trim() || tx(lang, `${o.carrier}.${o.kind}`);
    const dayRange = o => {
      const m = String(o.days || "").match(/(\d+)(?:\s*-\s*(\d+))?/);
      return m ? [Number(m[1]), Number(m[2] || m[1])] : [1, 3];
    };
    const rate = o => ({
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: free ? tx(lang, "free", { name: mName(o) }) : mName(o),
        fixed_amount: { amount: free ? 0 : cents(o.price), currency },
        delivery_estimate: { minimum: { unit: "business_day", value: dayRange(o)[0] }, maximum: { unit: "business_day", value: dayRange(o)[1] } },
        metadata: { method: o.id }
      }
    });
    const site = pickSite(body?.site);
    const params = {
      mode: "payment",
      locale: lang === "en" ? "en-GB" : "lt",
      line_items: lines,
      shipping_options: (method ? [method] : allowed.filter(m => m.kind !== "locker")).map(rate),
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      success_url: `${site}/${pathFor(lang, "aciu")}?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/${pathFor(lang, "krepselis")}`,
      metadata
    };
    if (method) metadata.ship_method = method.id;
    metadata.country = cc;
    if (method) metadata.carrier = `${method.carrier}.${method.kind}`;
    if (locker) {
      metadata.locker = `${tx("lt", `${method.carrier}.locker`)} · ${[locker.zip, locker.name, [locker.addr, locker.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}`.slice(0, 490);
      params.custom_text = { submit: { message: tx(lang, "lockerMsg", { name: [locker.name, locker.addr, locker.city].filter(Boolean).join(", ") }) } };
    } else {
      params.shipping_address_collection = { allowed_countries: [cc] };
    }
    // Prisijungęs pirkėjas: užsakymas susiejamas su paskyra, Stripe įrašo jo el. paštą ir adresą
    const user = await userFrom(req);
    if (user) {
      metadata.user_id = user.id;
      try {
        const [prof] = (await db(`profiles?id=eq.${user.id}&select=*`)) || [];
        let cus = prof?.stripe_customer;
        const a = prof?.address;
        const shipping =
          a?.line1 && a?.city
            ? { name: a.name || prof.name || user.email, phone: prof.phone || undefined, address: { line1: a.line1, line2: a.line2 || undefined, city: a.city, postal_code: a.postal || undefined, country: a.country || "LT" } }
            : undefined;
        if (!cus) {
          const c = await stripe("customers", {
            method: "POST",
            idem: `vd-cus-${user.id}`,
            params: { email: user.email, name: prof?.name || undefined, phone: prof?.phone || undefined, shipping, metadata: { user_id: user.id } }
          });
          cus = c.id;
          await db(`profiles?id=eq.${user.id}`, { method: "PATCH", body: { stripe_customer: cus } });
        } else if (shipping) {
          await stripe(`customers/${cus}`, { method: "POST", params: { shipping } });
        }
        params.customer = cus;
        params.customer_update = { shipping: "auto", name: "auto" };
      } catch (err) {
        console.error("customer", err.message);
        params.customer_email = user.email;
      }
    }
    try {
      const data = await stripe("checkout/sessions", { method: "POST", params });
      return json(200, { id: data.id, url: data.url });
    } catch (err) {
      console.error("Stripe", err.status, err.message);
      return fail(502, lang, err.status ? "stripe_error" : "stripe_unreachable");
    }
  }

  // ── Mėginukų kainos grąžinimas: vienkartinis Stripe nuolaidos kodas (be atskiros lentelės) ──
  async function ensureCredit(session, S) {
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
  // Užsakymas → duomenų bazė (vd_record_order: vieną kartą, kartu sumažina likučius). Grąžina { inserted }
  async function recordOrder(s, credit) {
    const items = [];
    const ids = new Set();
    for (const li of s.line_items?.data || []) {
      const md = li.price?.product?.metadata || {};
      if (!md.product_id) continue;
      const it = { id: md.product_id, qty: li.quantity, name: li.description, unit: li.price?.unit_amount || 0, total: li.amount_total };
      if (md.picks) {
        it.picks = md.picks.split(",");
        it.picks.forEach(id => ids.add(id));
      } else {
        it.ml = Number(md.ml);
        ids.add(md.product_id);
      }
      items.push(it);
    }
    const m = s.metadata || {};
    const sd = s.shipping_details;
    const a = sd?.address;
    const order = {
      ref: orderRef(s.id),
      stripe_session: s.id,
      payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id,
      user_id: m.user_id || "",
      email: s.customer_details?.email || "",
      name: s.customer_details?.name || sd?.name || "",
      phone: s.customer_details?.phone || "",
      items,
      product_ids: [...ids],
      amount_total: s.amount_total || 0,
      amount_shipping: s.shipping_cost?.amount_total || 0,
      shipping: {
        method: m.ship_method || "",
        ...(m.country ? { country: m.country } : {}),
        ...(m.carrier ? { carrier: m.carrier } : {}),
        ...(m.locker ? { locker: m.locker } : {}),
        ...(a ? { address: [sd.name, a.line1, a.line2, `${a.postal_code || ""} ${a.city || ""}`.trim(), a.country].filter(Boolean).join(", ") } : {})
      },
      gift: m.gift ? { note: m.gift_note || "" } : null,
      credit_code: credit?.code || null,
      lang: langOf(m.lang)
    };
    const inserted = await db("rpc/vd_record_order", { method: "POST", body: { o: order } });
    return { inserted: inserted === true, order };
  }
  const getSession = id => stripe(`checkout/sessions/${id}?expand[]=line_items.data.price.product`);

  // ── Padėkos puslapiui: apmokėta? + kodas; įrašo užsakymą, jei webhook dar neatėjo ──
  async function orderInfo(req) {
    const id = new URL(req.url).searchParams.get("s") || "";
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return json(400, { error: "Neteisingas užsakymas" });
    if (!env.STRIPE_SECRET_KEY) return json(503, { error: "Apmokėjimas neįjungtas" });
    try {
      const s = await getSession(id);
      const paid = s.payment_status === "paid";
      let credit = null;
      if (paid) {
        const { S } = await loadShop();
        credit = await ensureCredit(s, S);
        await recordOrder(s, credit);
      }
      return json(200, { paid, ref: orderRef(s.id), total: (s.amount_total || 0) / 100, credit });
    } catch (err) {
      console.error("order", err.status, err.message);
      return json(err.status === 404 ? 404 : 502, { error: "Užsakymo rasti nepavyko" });
    }
  }

  // ── Laiškai (Resend - nebūtina) ───────────────────────
  async function sendMail({ to, subject, html, idem }) {
    if (!env.RESEND_API_KEY || !to) return false;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", ...(idem ? { "Idempotency-Key": idem } : {}) },
      body: JSON.stringify({ from: env.MAIL_FROM || "Vaidore <onboarding@resend.dev>", to: [].concat(to), subject, html })
    });
    if (!r.ok) console.error("Resend", r.status, await r.text().catch(() => ""));
    return r.ok;
  }
  const wrapMail = (inner, lang = "lt") => `<div lang="${langOf(lang)}" style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0F172A">${inner}</div>`;
  function ownerMail(o, credit) {
    const rows = o.items.map(i => `<tr><td>${escHtml(i.name)}</td><td align="right">${i.qty}</td><td align="right">${eurTxt(i.total)}</td></tr>`).join("");
    return wrapMail(`<h2 style="margin:0 0 8px">Naujas užsakymas ${o.ref} - ${eurTxt(o.amount_total)}</h2>
<p><b>Pirkėjas:</b> ${escHtml(o.name)} · ${escHtml(o.email)} · ${escHtml(o.phone)}${o.lang === "en" ? " · kalba: anglų (EN)" : ""}</p>
<p><b>Pristatymas:</b> ${escHtml(o.shipping.method)} - ${escHtml(o.shipping.locker ? o.shipping.locker : o.shipping.address || "-")}${o.shipping.country ? ` (${escHtml(o.shipping.country)})` : ""} (${eurTxt(o.amount_shipping)})</p>
${o.gift ? `<p><b>Dovanų pakavimas.</b> Rašteliukas: ${escHtml(o.gift.note || "-")}</p>` : ""}
<table cellpadding="6" style="border-collapse:collapse;min-width:360px">${rows}</table>
${credit ? `<p>Pirkėjui sukurtas mėginukų kodas <b>${credit.code}</b> (${eurTxt(credit.amount)}).</p>` : ""}
<p><a href="${siteUrl()}/admin/uzsakymai">Atidaryti administravimo skydelyje</a></p>`);
  }

  // ── Stripe webhook ────────────────────────────────────
  async function webhook(req) {
    const raw = await req.text();
    if (!(await verifySignature(raw, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return json(400, { error: "Neteisingas parašas" });
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return json(400, { error: "Neteisingas JSON" });
    }
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return json(200, { ok: true, ignored: event.type });
    try {
      const s = await getSession(event.data.object.id);
      if (s.payment_status !== "paid") return json(200, { ok: true, pending: true });
      const { S } = await loadShop();
      const credit = await ensureCredit(s, S);
      const { inserted, order } = await recordOrder(s, credit);
      // Laiškai - vieną kartą (užsakymą galėjo jau įrašyti padėkos puslapis; Stripe gali pakartoti webhook)
      const [row] = (await db(`orders?stripe_session=eq.${encodeURIComponent(s.id)}&select=id,mailed`)) || [];
      if (row && !row.mailed) {
        await db(`orders?id=eq.${row.id}`, { method: "PATCH", body: { mailed: true } });
        await sendMail({ to: env.ORDER_EMAIL_TO || S.company?.email, subject: `Užsakymas ${order.ref} - ${eurTxt(order.amount_total)}`, html: ownerMail(order, credit), idem: `vd-owner-${s.id}` });
        if (credit && order.email) {
          const lang = order.lang;
          const until = new Date(credit.expires * 1000).toLocaleDateString(lang === "en" ? "en-GB" : "lt-LT");
          const shop = S.shop || "Vaidore";
          await sendMail({
            to: order.email,
            subject: tx(lang, "creditSubject", { shop, code: credit.code }),
            html: wrapMail(
              `${tx(lang, "creditBody", { shop: escHtml(shop), code: credit.code, amount: eurTxt(credit.amount, lang), until })}<p><a href="${siteUrl()}/${pathFor(lang, "")}" style="color:#000;font-weight:700">${tx(lang, "toShop")}</a></p>`,
              lang
            ),
            idem: `vd-credit-${s.id}`
          });
        }
      }
      return json(200, { ok: true, inserted, mailed: !!row && !row.mailed, credit: !!credit });
    } catch (err) {
      console.error("webhook", err.status, err.message);
      return json(500, { error: "Apdoroti nepavyko" }); // Stripe pakartos
    }
  }

  // ── Administratoriaus veiksmai (teisę tikrina is_admin()) ──
  async function admin(req) {
    const user = await userFrom(req);
    if (!(await isAdmin(user))) return json(403, { error: "Tik administratoriui" });
    const body = (await req.json().catch(() => null)) || {};
    const { S } = await loadShop();
    const getOrder = async id => (await db(`orders?id=eq.${encodeURIComponent(id)}&select=*`))?.[0];
    if (body.action === "ship") {
      const o = await getOrder(body.order_id);
      if (!o) return json(404, { error: "Užsakymas nerastas" });
      const tracking = clean(body.tracking, 80);
      await db(`orders?id=eq.${o.id}`, { method: "PATCH", body: { status: "shipped", tracking: tracking || null, shipped_at: new Date().toISOString() } });
      const lang = langOf(o.lang);
      const mailed = o.email
        ? await sendMail({
            to: o.email,
            subject: tx(lang, "shipSubject", { shop: S.shop || "Vaidore", ref: o.ref }),
            html: wrapMail(
              `<p>${tx(lang, "hello")}${o.name ? `, ${escHtml(o.name.split(" ")[0])}` : ""}!</p><p>${tx(lang, "shipBody", { ref: o.ref })}${tracking ? `. ${tx(lang, "tracking")}: <b>${escHtml(tracking)}</b>` : ""}.</p><p>${escHtml(
                o.shipping?.locker ? `${tx(lang, "locker")}: ${o.shipping.locker}` : o.shipping?.address || ""
              )}</p><p><a href="${siteUrl()}/${pathFor(lang, "paskyra/uzsakymai")}" style="color:#000;font-weight:700">${tx(lang, "myOrders")}</a></p>`,
              lang
            ),
            idem: `vd-ship-${o.id}-${tracking}`
          })
        : false;
      return json(200, { ok: true, mailed });
    }
    if (body.action === "refund") {
      const o = await getOrder(body.order_id);
      if (!o) return json(404, { error: "Užsakymas nerastas" });
      if (o.status === "refunded") return json(409, { error: "Pinigai jau grąžinti" });
      if (!o.payment_intent) return json(409, { error: "Nėra mokėjimo" });
      await stripe("refunds", { method: "POST", idem: `vd-refund-${o.id}`, params: { payment_intent: o.payment_intent, reason: "requested_by_customer", metadata: { order: o.ref } } });
      await db("rpc/vd_refund_order", { method: "POST", body: { order_id: o.id } });
      return json(200, { ok: true });
    }
    if (body.action === "restock-notify") {
      const p = (await db(`products?id=eq.${encodeURIComponent(body.product_id)}&select=*`))?.[0];
      if (!p) return json(404, { error: "Kvapas nerastas" });
      const list = (await db(`restock_requests?product_id=eq.${encodeURIComponent(p.id)}&notified=eq.false&select=*`)) || [];
      let sent = 0;
      for (const r of list) {
        const lang = langOf(r.lang);
        const name = loc(lang, p, "name");
        const ok = await sendMail({
          to: r.email,
          subject: tx(lang, "restockSubject", { name }),
          html: wrapMail(
            `<p>${tx(lang, "hello")}!</p><p>${tx(lang, "restockBody", { name: escHtml(name) })}</p><p><a href="${siteUrl()}/${productPath(lang, p)}" style="color:#000;font-weight:700">${tx(lang, "view")}</a></p>`,
            lang
          ),
          idem: `vd-restock-${r.id}`
        });
        if (ok) {
          sent++;
          await db(`restock_requests?id=eq.${r.id}`, { method: "PATCH", body: { notified: true } });
        }
      }
      return json(200, { ok: true, sent, total: list.length, mail: !!env.RESEND_API_KEY });
    }
    if (body.action === "newsletter-send") return sendNewsletter(S, { ...body, to: user.email });
    if (body.action === "rebuild") {
      const done = [];
      if (env.GITHUB_TOKEN) {
        const repo = env.GITHUB_REPO || "vakomb/vaidore";
        const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/pages.yml/dispatches`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "vaidore" },
          body: JSON.stringify({ ref: "main" })
        });
        if (r.ok) done.push("GitHub Pages");
      }
      if (env.VERCEL_DEPLOY_HOOK) {
        const r = await fetch(env.VERCEL_DEPLOY_HOOK, { method: "POST" });
        if (r.ok) done.push("Vercel");
      }
      return json(200, { ok: true, done });
    }
    return json(400, { error: "Nežinomas veiksmas" });
  }

  // ── Naujienlaiškis: sveikinimo laiškas (vieną kartą) ir atsisakymas pagal raktą iš laiško ──
  const unsubUrl = (token, lang = "lt") =>
    lang === "en" ? `${siteUrl()}/en/newsletter?unsubscribe=${encodeURIComponent(token)}` : `${siteUrl()}/naujienlaiskis?atsisakyti=${encodeURIComponent(token)}`;
  const newsFooter = (S, token, lang = "lt") =>
    `<p style="margin-top:28px;font-size:12px;color:#6b6b6b">${tx(lang, "newsFoot", { shop: escHtml(S.shop || "Vaidore") })} <a href="${unsubUrl(token, lang)}" style="color:#6b6b6b">${tx(lang, "unsubscribe")}</a></p>`;
  async function newsletter(req) {
    const body = (await req.json().catch(() => null)) || {};
    if (body.action === "welcome") {
      const email = clean(body.email, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(400, { error: "Blogas el. paštas" });
      const row = (await db(`newsletter?email=ilike.${encodeURIComponent(email)}&select=*`))?.[0];
      if (!row || row.welcomed_at || row.unsubscribed_at) return json(200, { ok: true });
      const { S } = await loadShop();
      const lang = langOf(row.lang);
      const ok = await sendMail({
        to: row.email,
        subject: tx(lang, "welcomeSubject", { shop: S.shop || "Vaidore" }),
        html: wrapMail(
          `<p>${tx(lang, "hello")}!</p><p>${tx(lang, "welcomeBody")}</p><p><a href="${siteUrl()}/${lang === "en" ? "en/perfumes" : "kvepalai"}" style="color:#000;font-weight:700">${tx(lang, "browse")}</a></p>${newsFooter(S, row.token, lang)}`,
          lang
        ),
        idem: `vd-news-welcome-${row.id}`
      });
      if (ok) await db(`newsletter?id=eq.${row.id}`, { method: "PATCH", body: { welcomed_at: new Date().toISOString() } });
      return json(200, { ok: true, mailed: ok });
    }
    if (body.action === "unsubscribe") {
      const token = String(body.token || "");
      if (!/^[0-9a-f-]{36}$/i.test(token)) return json(400, { error: "Bloga nuoroda" });
      const rows = await db(`newsletter?token=eq.${token}&unsubscribed_at=is.null`, { method: "PATCH", body: { unsubscribed_at: new Date().toISOString() }, prefer: "return=representation" });
      return json(200, { ok: true, done: !!rows?.length });
    }
    return json(400, { error: "Nežinomas veiksmas" });
  }
  // Laiškas visiems prenumeratoriams (administratorius): Resend „batch“ - po 100 laiškų viename užklausime
  // v33e: lang - „lt“ / „en“ (tik tos kalbos prenumeratoriams), kitaip - visiems; nuorodos ir poraštė - gavėjo kalba
  async function sendNewsletter(S, { subject, text, test, to, lang: only }) {
    subject = clean(subject, 150);
    text = String(text || "").slice(0, 20000);
    if (!subject || !text.trim()) return json(400, { error: "Įrašykite temą ir tekstą" });
    if (!env.RESEND_API_KEY) return json(409, { error: "Laiškų siuntimas neprijungtas (RESEND_API_KEY)" });
    const html = (token, lang) =>
      wrapMail(
        `${text
          .split(/\n{2,}/)
          .map(p => `<p>${escHtml(p).replace(/\n/g, "<br />")}</p>`)
          .join("")}<p><a href="${siteUrl()}/${lang === "en" ? "en/perfumes" : "kvepalai"}" style="color:#000;font-weight:700">${tx(lang, "visit", { shop: escHtml(S.shop || "Vaidore") })}</a></p>${newsFooter(S, token, lang)}`,
        lang
      );
    const filter = LANGS.includes(only) ? `&lang=eq.${only}` : "";
    const list = test
      ? [{ email: to, token: "00000000-0000-4000-8000-000000000000", lang: LANGS.includes(only) ? only : "lt" }]
      : (await db(`newsletter?unsubscribed_at=is.null${filter}&select=*&order=created_at.asc`)) || [];
    let sent = 0;
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map(x => ({
            from: env.MAIL_FROM || "Vaidore <onboarding@resend.dev>",
            to: [x.email],
            subject,
            html: html(x.token, langOf(x.lang)),
            headers: { "List-Unsubscribe": `<${unsubUrl(x.token, langOf(x.lang))}>` }
          }))
        )
      });
      if (r.ok) sent += chunk.length;
      else console.error("Resend batch", r.status, await r.text().catch(() => ""));
    }
    return json(200, { ok: true, sent, total: list.length });
  }

  // ── Paskyra: ištrynimas (BDAR) ─────────────────────────
  async function account(req) {
    const user = await userFrom(req);
    if (!user) return json(401, { error: "Prisijunkite" });
    const body = (await req.json().catch(() => null)) || {};
    if (body.action !== "delete") return json(400, { error: "Nežinomas veiksmas" });
    const r = await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: svcHeaders({}) });
    if (!r.ok) return json(502, { error: "Nepavyko ištrinti" });
    return json(200, { ok: true });
  }

  return { checkout, orderInfo, webhook, admin, account, newsletter, ensureCredit, recordOrder };
}

// Stripe-Signature „t=…,v1=…“: HMAC-SHA256(secret, `${t}.${neapdorotas tekstas}`), ±5 min. Web Crypto - veikia Deno ir Node.
export async function verifySignature(raw, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  let t = 0;
  const v1 = [];
  for (const kv of String(header).split(",")) {
    const [k, v] = kv.split("=");
    if (k === "t") t = Number(v);
    if (k === "v1") v1.push(v);
  }
  if (!t || !v1.length || Math.abs(now - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const expected = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
  return v1.some(s => {
    if (s.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

// Bendras įvyniojimas: CORS, OPTIONS, klaidos
export function serve(handler) {
  return async req => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    try {
      return await handler(req);
    } catch (err) {
      console.error(err?.message || err);
      return json(500, { error: "Serverio klaida" });
    }
  };
}
