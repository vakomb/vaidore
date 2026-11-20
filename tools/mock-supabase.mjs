// Imituotas Supabase naršyklės testams (be interneto): PostgREST (lentelės, filtrai, rūšiavimas, RLS esmė),
// Auth (prisijungimas, vartotojas), Storage (nuotraukų įkėlimas), Edge Function shop (checkout, order, admin).
// Naudojimas: const sb = mockSupabase({ url, catalog }); await page.route(`${url}/**`, sb.handle);
// sb.db – lentelės (tikrinti pakeitimus), sb.calls – funkcijų kvietimai, sb.users – prisijungimo duomenys.

export const ADMIN = { id: "00000000-0000-4000-8000-00000000a001", email: "vakomb@gmail.com", password: "slaptas-123", token: "eyJ.admin.token" };
export const BUYER = { id: "00000000-0000-4000-8000-00000000b001", email: "ona@example.com", password: "pirkeja-123", token: "eyJ.buyer.token" };

export function dbFromCatalog(cat) {
  const products = cat.products.map(p => ({
    id: p.id,
    name: p.name,
    inspired: p.inspired || "",
    type: p.type || "kvepalai",
    conc: p.conc,
    gender: p.gender,
    family: p.family,
    tagline: p.tagline,
    description: p.desc,
    ingredients: p.ingredients || "",
    notes: p.notes,
    longevity: p.longevity,
    sillage: p.sillage,
    seasons: p.seasons,
    times: p.time,
    occasions: p.occasions || [],
    attrs: p.attrs || {},
    scent_id: p.scent || null,
    sizes: p.sizes,
    sample: p.sample,
    look: p.look,
    badge: p.badge || null,
    rank: p.rank,
    added: p.added,
    stock: p.stock ?? null,
    images: p.images || [],
    visible: p.visible !== false,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z"
  }));
  return {
    products,
    families: cat.families.map((f, i) => ({ id: f.id, name: f.name, hint: f.hint, sort: i + 1, visible: true })),
    categories: (cat.categories || []).map((c, i) => ({ id: c.id, name: c.name, description: c.description || "", image: c.image || "", sort: c.sort ?? i + 1, visible: true })),
    product_categories: cat.products.flatMap(p => (p.categories || []).map(c => ({ product_id: p.id, category_id: c }))),
    settings: [{ id: 1, data: structuredClone(cat.settings) }],
    // Katalogo atsiliepimai (testams) – kaip paskelbti duomenų bazėje
    reviews: cat.products.flatMap(p =>
      (p.reviews || []).map((r, i) => ({ id: `rv-${p.id}-${i}`, product_id: p.id, user_id: null, name: r.name, text: r.text, rating: r.rating ?? null, status: "approved", verified: r.verified !== false, created_at: `${r.date || "2026-11-01"}T12:00:00Z` }))
    ),
    scents: structuredClone(cat.scents || []),
    restock_requests: [],
    newsletter: [],
    orders: [],
    profiles: [
      { id: ADMIN.id, email: ADMIN.email, name: "Vaida", phone: "", address: null, locker: null, favorites: [], stripe_customer: null },
      { id: BUYER.id, email: BUYER.email, name: "Ona Kazlauskienė", phone: "+37060000000", address: null, locker: null, favorites: [], stripe_customer: null }
    ],
    audit_log: []
  };
}

const ADMIN_ONLY_WRITE = new Set(["products", "families", "categories", "product_categories", "settings", "orders", "audit_log", "scents"]);
const ADMIN_ONLY_READ = new Set(["restock_requests", "audit_log", "newsletter"]);

export function mockSupabase({ url, catalog, fail = {} }) {
  const db = dbFromCatalog(catalog);
  const calls = [];
  const uploads = [];
  const users = [ADMIN, BUYER];
  let seq = 1;
  const who = req => {
    const h = req.headers().authorization || "";
    const t = h.replace(/^Bearer\s+/i, "");
    return users.find(u => u.token === t) || null;
  };
  const isAdmin = u => u?.email === ADMIN.email;
  const json = (status, body) => ({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: body === undefined ? "" : JSON.stringify(body) });
  const parseVal = v => (v === "null" ? null : v === "true" ? true : v === "false" ? false : v);
  function matcher(params) {
    const conds = [];
    for (const [k, raw] of params) {
      if (["select", "order", "limit", "offset", "on_conflict"].includes(k)) continue;
      const m = raw.match(/^(eq|neq|gte|lte|gt|lt|in|is)\.(.*)$/s);
      if (!m) continue;
      const [, op, val] = m;
      conds.push(row => {
        const x = row[k];
        if (op === "eq") return String(x) === String(parseVal(val)) || x === parseVal(val);
        if (op === "neq") return String(x) !== String(val);
        if (op === "in") return val.replace(/^\(|\)$/g, "").split(",").map(decodeURIComponent).includes(String(x));
        if (op === "is") return val === "null" ? x == null : String(x) === val;
        if (op === "gte") return String(x) >= val;
        if (op === "lte") return String(x) <= val;
        if (op === "gt") return String(x) > val;
        if (op === "lt") return String(x) < val;
        return true;
      });
    }
    return row => conds.every(c => c(row));
  }
  // Viešai matomi įrašai (RLS esmė): paslėpti kvapai ir nepaskelbti atsiliepimai – tik administratoriui
  const visibleTo = (table, row, u) => {
    if (isAdmin(u)) return true;
    if (["products", "families", "categories"].includes(table)) return row.visible !== false;
    if (table === "reviews") return row.status === "approved" || (u && row.user_id === u.id);
    if (table === "orders") return !!u && (row.user_id === u.id || row.email === u.email);
    if (table === "profiles") return !!u && row.id === u.id;
    if (ADMIN_ONLY_READ.has(table)) return false;
    return true;
  };
  const audit = (u, action, entity, row, changes) =>
    db.audit_log.unshift({ id: seq++, at: new Date().toISOString(), actor: u?.id || null, actor_email: u?.email || null, action, entity, entity_id: String(row.id ?? row.product_id ?? ""), changes });

  async function handle(route) {
    const req = route.request();
    const u = new URL(req.url());
    const path = u.pathname;
    const method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const user = who(req);
    const body = () => {
      try {
        return JSON.parse(req.postData() || "null");
      } catch {
        return null;
      }
    };

    // ── Auth ──
    if (path === "/auth/v1/token") {
      const b = body();
      const found = users.find(x => x.email === b?.email && x.password === b?.password);
      if (!found) return route.fulfill(json(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" }));
      return route.fulfill(json(200, { access_token: found.token, refresh_token: `r-${found.id}`, expires_in: 3600, user: { id: found.id, email: found.email } }));
    }
    if (path === "/auth/v1/user") return route.fulfill(user ? json(200, { id: user.id, email: user.email, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" }) : json(401, { msg: "JWT" }));
    if (path === "/auth/v1/logout") return route.fulfill(json(204));
    if (path.startsWith("/auth/v1/")) return route.fulfill(json(200, {}));

    // ── Storage ──
    if (path.startsWith("/storage/v1/object/")) {
      if (!isAdmin(user)) return route.fulfill(json(403, { message: "new row violates row-level security policy" }));
      uploads.push({ path, type: req.headers()["content-type"], size: (req.postDataBuffer() || []).length });
      return route.fulfill(json(200, { Key: path.replace("/storage/v1/object/", "") }));
    }

    // ── Edge Function shop ──
    if (path.startsWith("/functions/v1/shop/")) {
      const name = path.split("/").pop();
      const b = body();
      calls.push({ name, body: b, user: user?.email || null });
      if (fail[name]) return route.fulfill(json(fail[name], { error: "Imituota klaida" }));
      if (name === "checkout") return route.fulfill(json(200, { id: "cs_test_mock", url: `${u.origin}/__stripe?ok=1` }));
      if (name === "order") return route.fulfill(json(200, { paid: true, ref: "MOCK1234", total: 69.99, credit: { code: "VD-MOCK1234", amount: 490, expires: Math.floor(Date.now() / 1000) + 30 * 86400 } }));
      if (name === "account") return route.fulfill(user ? json(200, { ok: true }) : json(401, { error: "Prisijunkite" }));
      if (name === "newsletter") {
        if (b.action === "welcome") {
          const r = db.newsletter.find(x => x.email === String(b.email || "").toLowerCase());
          if (r && !r.welcomed_at && !r.unsubscribed_at) r.welcomed_at = new Date().toISOString();
          return route.fulfill(json(200, { ok: true, mailed: !!r }));
        }
        if (b.action === "unsubscribe") {
          const r = db.newsletter.find(x => x.token === b.token && !x.unsubscribed_at);
          if (r) r.unsubscribed_at = new Date().toISOString();
          return route.fulfill(json(200, { ok: true, done: !!r }));
        }
        return route.fulfill(json(400, { error: "Nežinomas veiksmas" }));
      }
      if (name === "admin") {
        if (!isAdmin(user)) return route.fulfill(json(403, { error: "Tik administratoriui" }));
        const o = db.orders.find(x => x.id === b.order_id);
        if (b.action === "ship") {
          if (!o) return route.fulfill(json(404, { error: "Užsakymas nerastas" }));
          Object.assign(o, { status: "shipped", tracking: b.tracking || null, shipped_at: new Date().toISOString() });
          return route.fulfill(json(200, { ok: true, mailed: !!o.email }));
        }
        if (b.action === "refund") {
          if (!o) return route.fulfill(json(404, { error: "Užsakymas nerastas" }));
          if (o.status === "refunded") return route.fulfill(json(409, { error: "Pinigai jau grąžinti" }));
          o.status = "refunded";
          return route.fulfill(json(200, { ok: true }));
        }
        if (b.action === "restock-notify") {
          const list = db.restock_requests.filter(r => r.product_id === b.product_id && !r.notified);
          list.forEach(r => (r.notified = true));
          return route.fulfill(json(200, { ok: true, sent: list.length, total: list.length, mail: true }));
        }
        if (b.action === "rebuild") return route.fulfill(json(200, { ok: true, done: ["GitHub Pages"] }));
        if (b.action === "newsletter-send") {
          const list = b.test ? [user.email] : db.newsletter.filter(r => !r.unsubscribed_at).map(r => r.email);
          calls.push({ name: "newsletter-sent", body: { ...b, to: list } });
          return route.fulfill(json(200, { ok: true, sent: list.length, total: list.length }));
        }
        return route.fulfill(json(400, { error: "Nežinomas veiksmas" }));
      }
      return route.fulfill(json(404, { error: "Nėra tokio veiksmo" }));
    }

    // ── PostgREST ──
    if (!path.startsWith("/rest/v1/")) return route.fulfill(json(404, {}));
    const table = path.slice("/rest/v1/".length);
    if (table === "rpc/is_admin") return route.fulfill(json(200, isAdmin(user)));
    if (table.startsWith("rpc/")) return route.fulfill(json(200, null));
    if (!db[table]) return route.fulfill(json(404, { message: `relation "${table}" does not exist` }));
    const params = [...u.searchParams];
    const match = matcher(params);
    const prefer = req.headers().prefer || "";
    const ret = rows => (prefer.includes("return=representation") ? json(method === "POST" ? 201 : 200, rows) : json(method === "POST" ? 201 : 204));
    if (method === "GET") {
      let rows = db[table].filter(r => visibleTo(table, r, user) && match(r));
      const order = u.searchParams.get("order");
      if (order) {
        const keys = order.split(",").map(s => s.split("."));
        rows = [...rows].sort((a, b) => {
          for (const [k, dir] of keys) {
            const x = a[k],
              y = b[k];
            if (x === y) continue;
            const c = x == null ? 1 : y == null ? -1 : typeof x === "number" ? x - y : String(x).localeCompare(String(y));
            return dir === "desc" ? -c : c;
          }
          return 0;
        });
      }
      const limit = Number(u.searchParams.get("limit")) || rows.length;
      return route.fulfill(json(200, structuredClone(rows.slice(0, limit))));
    }
    const writeOk =
      isAdmin(user) ||
      (table === "restock_requests" && method === "POST") ||
      (table === "newsletter" && method === "POST") ||
      (table === "reviews" && method === "POST" && !!user) ||
      (table === "profiles" && method === "PATCH" && !!user);
    if (!writeOk || (ADMIN_ONLY_WRITE.has(table) && !isAdmin(user))) return route.fulfill(json(403, { code: "42501", message: `new row violates row-level security policy for table "${table}"` }));
    if (method === "POST") {
      const b = body();
      const rows = (Array.isArray(b) ? b : [b]).map(r => ({
        ...(table === "reviews" ? { status: "pending", verified: true } : {}),
        ...(table === "restock_requests" ? { notified: false } : {}),
        ...(table === "newsletter" ? { token: `00000000-0000-4000-9000-${String(seq).padStart(12, "0")}`, welcomed_at: null, unsubscribed_at: null } : {}),
        ...(["reviews", "restock_requests", "orders", "newsletter"].includes(table) ? { id: `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`, created_at: new Date().toISOString() } : {}),
        ...(table === "products" ? { created_at: new Date().toISOString(), updated_at: new Date().toISOString() } : {}),
        ...r
      }));
      const key = table === "product_categories" ? r => `${r.product_id}|${r.category_id}` : table === "restock_requests" ? r => `${r.product_id}|${r.email}` : table === "newsletter" ? r => String(r.email).toLowerCase() : r => r.id;
      for (const r of rows) if (db[table].some(x => key(x) === key(r))) return route.fulfill(json(409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_pkey"` }));
      db[table].push(...rows);
      rows.forEach(r => audit(user, "insert", table, r, r));
      return route.fulfill(ret(rows));
    }
    if (method === "PATCH") {
      const b = body();
      const rows = db[table].filter(r => visibleTo(table, r, user) && match(r));
      for (const r of rows) {
        const changes = {};
        for (const k of Object.keys(b)) if (JSON.stringify(r[k]) !== JSON.stringify(b[k])) changes[k] = { buvo: r[k] ?? null, dabar: b[k] };
        Object.assign(r, b, "updated_at" in r ? { updated_at: new Date().toISOString() } : {});
        if (Object.keys(changes).length) audit(user, "update", table, r, changes);
      }
      return route.fulfill(ret(structuredClone(rows)));
    }
    if (method === "DELETE") {
      const rows = db[table].filter(r => match(r));
      if (table === "families" && rows.some(f => db.products.some(p => p.family === f.id)))
        return route.fulfill(json(409, { code: "23503", message: "update or delete violates foreign key constraint" }));
      db[table] = db[table].filter(r => !rows.includes(r));
      if (table === "products") {
        const ids = new Set(rows.map(r => r.id));
        db.product_categories = db.product_categories.filter(l => !ids.has(l.product_id));
        db.reviews = db.reviews.filter(l => !ids.has(l.product_id));
        db.restock_requests = db.restock_requests.filter(l => !ids.has(l.product_id));
      }
      if (table === "categories") {
        const ids = new Set(rows.map(r => r.id));
        db.product_categories = db.product_categories.filter(l => !ids.has(l.category_id));
      }
      rows.forEach(r => audit(user, "delete", table, r, r));
      return route.fulfill(ret(rows));
    }
    return route.fulfill(json(405, {}));
  }
  return {
    handle,
    db,
    calls,
    uploads,
    users,
    reset() {
      Object.assign(db, dbFromCatalog(catalog));
      calls.length = 0;
      uploads.length = 0;
    }
  };
}

// Pavyzdiniai užsakymai testams
export function sampleOrders(db) {
  const mk = (n, extra) => ({
    id: `00000000-0000-4000-8000-0000000c${String(n).padStart(4, "0")}`,
    ref: `AB12CD${String(n).padStart(2, "0")}`,
    stripe_session: `cs_test_${n}`,
    payment_intent: `pi_test_${n}`,
    user_id: null,
    email: "petras@example.com",
    name: "Petras Petraitis",
    phone: "+37061111111",
    status: "paid",
    items: [{ id: "rasa", ml: 50, qty: 1, name: "Vaidore Rasa · 50 ml", unit: 6500, total: 6500 }],
    product_ids: ["rasa"],
    amount_total: 6799,
    amount_shipping: 299,
    shipping: { method: "omniva", locker: "09104 · Vilniaus Akropolio paštomatas · Ozo g. 25, Vilnius" },
    gift: null,
    credit_code: null,
    tracking: null,
    stock_applied: true,
    created_at: new Date(Date.now() - n * 3600e3).toISOString(),
    updated_at: new Date().toISOString(),
    shipped_at: null,
    delivered_at: null,
    ...extra
  });
  db.orders.push(
    mk(1, { gift: { note: "Su gimtadieniu!" } }),
    mk(2, { status: "packed", name: "Ieva Ievaitė", email: "ieva@example.com", items: [{ id: "atradimu-rinkinys", qty: 1, name: "Vaidore Atradimų rinkinys · 5 × 2 ml", unit: 1490, total: 1490, picks: ["rasa", "jura", "gintaras", "ruta", "smilga"] }], amount_total: 1789, credit_code: "VD-AB12CD02" }),
    mk(3, { status: "shipped", tracking: "CE000000003EE", shipped_at: new Date().toISOString() }),
    mk(4, { status: "refunded" })
  );
}
