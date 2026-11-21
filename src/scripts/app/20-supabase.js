// 20 - Supabase be bibliotekų: REST (PostgREST), Auth (GoTrue), Edge Functions per fetch.
// window.VAIDORE_SB = { url, key } - iš src/data/supabase.json (publishable raktas viešas: duomenis saugo RLS).
// Katalogas: surinkimo metu įdėtas + šviežias iš duomenų bazės (refreshCatalog) - pakeitimai administravimo skydelyje
// matomi iškart, net neperrinkus svetainės. Paskutinė kopija saugoma telefone (vaidore_catalog_v1) - be mirgėjimo.
const SB = window.VAIDORE_SB?.url ? window.VAIDORE_SB : null;
const AUTH_KEY = "vaidore_auth_v1";
const CATALOG_KEY = "vaidore_catalog_v1";
const auth = { session: store.get(AUTH_KEY, null), user: null, isAdmin: false, profile: null, recovery: false };

async function getToken() {
  const s = auth.session;
  if (!s) return null;
  if (s.expires_at && s.expires_at - 60 < Date.now() / 1000) {
    try {
      await authRequest("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
    } catch (err) {
      logError("refresh", err);
      setSession(null);
      return null;
    }
  }
  return auth.session?.access_token || null;
}
function sbHeaders(token, extra = {}) {
  const h = { apikey: SB.key, ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}
async function sbError(r) {
  const d = await r.json().catch(() => ({}));
  const msg = d.msg || d.message || d.error_description || d.error || `HTTP ${r.status}`;
  return Object.assign(new Error(msg), { status: r.status, code: d.code || d.error_code });
}
// sbRest("products?select=*", { method, body, prefer }) - su prisijungusio vartotojo teisėmis (jei prisijungęs)
async function sbRest(path, { method = "GET", body, prefer, anon = false } = {}) {
  if (!SB) throw new Error("Duomenų bazė neprijungta");
  const token = anon ? null : await getToken();
  const headers = sbHeaders(token, body !== undefined ? { "Content-Type": "application/json" } : {});
  if (prefer) headers.Prefer = prefer;
  // v30: tekstai be ilgų brūkšnių - įrašant (naujai įklijuoti aprašymai) ir skaitant (bazėje likę seni tekstai)
  const json = body !== undefined ? JSON.stringify(body, (k, v) => (typeof v === "string" ? plain(v) : v)) : undefined;
  const r = await fetch(`${SB.url}/rest/v1/${path}`, { method, headers, body: json });
  if (!r.ok) throw await sbError(r);
  return r.status === 204 ? null : r.json().then(plainDeep, () => null);
}
async function sbFn(name, init = {}) {
  if (!SB) throw new Error("Duomenų bazė neprijungta");
  const token = await getToken();
  return fetch(`${SB.url}/functions/v1/${name}`, {
    ...init,
    headers: sbHeaders(token, { "Content-Type": "application/json", ...(init.headers || {}) })
  });
}
async function sbUpload(bucket, path, blob) {
  const token = await getToken();
  const r = await fetch(`${SB.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    // Be „x-upsert“: perrašymui Supabase reikalauja dar ir SELECT/UPDATE teisių - failų vardai vis tiek unikalūs
    headers: sbHeaders(token, { "Content-Type": blob.type, "Cache-Control": "max-age=31536000" }),
    body: blob
  });
  if (!r.ok) throw await sbError(r);
  return `${SB.url}/storage/v1/object/public/${bucket}/${path}`;
}

// ── Auth ───────────────────────────────────────────────
async function authRequest(path, body, { method = "POST", token = null } = {}) {
  const r = await fetch(`${SB.url}/auth/v1/${path}`, {
    method,
    headers: sbHeaders(token, { "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw await sbError(r);
  const d = await r.json().catch(() => ({}));
  if (d.access_token) setSession(d);
  return d;
}
function setSession(d) {
  if (!d) {
    auth.session = null;
    auth.user = null;
    auth.isAdmin = false;
    auth.profile = null;
    store.set(AUTH_KEY, null);
  } else {
    auth.session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
    };
    if (d.user) auth.user = d.user;
    store.set(AUTH_KEY, auth.session);
  }
  emit("auth");
}
const redirectTo = () => encodeURIComponent(absUrl("paskyra"));
const AUTH_ERRORS = {
  invalid_credentials: "Neteisingas el. paštas arba slaptažodis",
  email_not_confirmed: "Patvirtinkite el. paštą - nuorodą išsiuntėme laišku",
  user_already_exists: "Paskyra su šiuo el. paštu jau yra - prisijunkite",
  weak_password: "Slaptažodis per silpnas - bent 8 simboliai",
  over_email_send_rate_limit: "Per daug bandymų - pabandykite po kelių minučių",
  same_password: "Naujas slaptažodis turi skirtis nuo seno"
};
const authMsg = err => AUTH_ERRORS[err?.code] || (/invalid login/i.test(err?.message) ? AUTH_ERRORS.invalid_credentials : err?.message || "Nepavyko");
async function signUp(email, password, name) {
  return authRequest(`signup?redirect_to=${redirectTo()}`, { email, password, data: { name } });
}
async function signIn(email, password) {
  await authRequest("token?grant_type=password", { email, password });
  await loadMe();
}
async function signOut() {
  const token = auth.session?.access_token;
  setSession(null);
  if (token) fetch(`${SB.url}/auth/v1/logout`, { method: "POST", headers: sbHeaders(token) }).catch(() => {});
}
const recoverPassword = email => authRequest(`recover?redirect_to=${redirectTo()}`, { email });
async function updatePassword(password) {
  const token = await getToken();
  await authRequest("user", { password }, { method: "PUT", token });
  auth.recovery = false;
}
// Grįžus iš laiško (patvirtinimas / slaptažodžio keitimas): #access_token=…&type=signup|recovery
function handleAuthRedirect() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("error_description")) {
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => toast(h.get("error_description").replace(/\+/g, " "), { icon: "info", ms: 6000 }), 400);
    return;
  }
  if (!h.get("access_token")) return;
  setSession({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: Number(h.get("expires_in")) || 3600 });
  const type = h.get("type");
  auth.recovery = type === "recovery";
  history.replaceState(null, "", location.pathname + location.search);
  if (type === "signup" || type === "email_change") setTimeout(() => toast("El. paštas patvirtintas - sveiki!", { icon: "check" }), 400);
}
// Prisijungusio vartotojo duomenys: paskyra, profilis, administratoriaus teisė; mėgstami sujungiami
async function loadMe() {
  if (!SB || !auth.session) return;
  try {
    const token = await getToken();
    if (!token) return;
    const r = await fetch(`${SB.url}/auth/v1/user`, { headers: sbHeaders(token) });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) setSession(null);
      return;
    }
    auth.user = await r.json();
    const [profile] = (await sbRest(`profiles?id=eq.${auth.user.id}&select=*`)) || [];
    auth.profile = profile || null;
    auth.isAdmin = (await sbRest("rpc/is_admin", { method: "POST", body: {} })) === true;
    if (auth.profile) {
      const merged = new Set([...(auth.profile.favorites || []), ...state.fav]);
      const changed = merged.size !== state.fav.size;
      state.fav = new Set([...merged].filter(id => BY_ID.has(id)));
      store.set(FAV_KEY, [...state.fav]);
      if (merged.size !== (auth.profile.favorites || []).length) saveProfile({ favorites: [...state.fav] });
      if (changed) emit("fav");
      if (!state.ship.locker && auth.profile.locker) setShip(state.ship.method, auth.profile.locker);
    }
    emit("auth");
  } catch (err) {
    logError("loadMe", err);
  }
}
async function saveProfile(patch) {
  if (!auth.user) return;
  const [p] = (await sbRest(`profiles?id=eq.${auth.user.id}`, { method: "PATCH", body: patch, prefer: "return=representation" })) || [];
  if (p) auth.profile = p;
  return p;
}
let favT = 0;
onChange(what => {
  if (what === "fav" && auth.user && auth.profile) {
    clearTimeout(favT);
    favT = setTimeout(() => saveProfile({ favorites: [...state.fav] }).catch(err => logError("fav", err)), 600);
  }
  if (what === "ship" && auth.user && state.ship.locker && JSON.stringify(state.ship.locker) !== JSON.stringify(auth.profile?.locker)) {
    saveProfile({ locker: state.ship.locker }).catch(err => logError("locker", err));
  }
});

// ── Katalogas iš duomenų bazės ─────────────────────────
function catalogFromDb(rows) {
  const { products, families, categories, links, settings, reviews, scents = [], notes = [] } = rows;
  const catsOf = new Map();
  for (const l of links) catsOf.set(l.product_id, [...(catsOf.get(l.product_id) || []), l.category_id]);
  const revOf = new Map();
  for (const r of reviews)
    revOf.set(r.product_id, [...(revOf.get(r.product_id) || []), { name: r.name, text: r.text, rating: r.rating, date: String(r.created_at).slice(0, 10), verified: r.verified }]);
  return {
    settings: { ...CAT.settings, ...(settings?.[0]?.data || {}) },
    families: families.map(f => ({ id: f.id, name: f.name, hint: f.hint, sort: f.sort, visible: f.visible })),
    categories: categories.map(c => ({ id: c.id, name: c.name, description: c.description, image: c.image, sort: c.sort, visible: c.visible })),
    // v29: nuotaikos juosta - bendro kvapo lygiu; natų biblioteka (natos vardas → nuotrauka)
    scents: scents.filter(s => s.mood_image).map(s => ({ id: s.id, moodImage: s.mood_image, moodTitle: s.mood_title || "", moodLine: s.mood_line || "" })),
    noteMedia: notes.filter(n => n.name && n.image).map(n => ({ name: n.name, image: n.image })),
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      inspired: p.inspired || "",
      inspiredImage: p.inspired_image || "",
      ...pageFields(p),
      type: p.type || "kvepalai",
      conc: p.conc,
      gender: p.gender,
      family: p.family,
      tagline: p.tagline,
      desc: p.description,
      ingredients: p.ingredients || "",
      notes: { top: p.notes?.top || [], heart: p.notes?.heart || [], base: p.notes?.base || [] },
      longevity: p.longevity,
      sillage: p.sillage,
      attrs: p.attrs || {},
      scent: p.scent_id || null,
      sizes: (p.sizes || [])
        .map(s => ({ ml: Number(s.ml), price: Number(s.price), ...(Number(s.was) > Number(s.price) ? { was: Number(s.was) } : {}), ...(s.unit && s.unit !== "ml" ? { unit: s.unit } : {}) }))
        .sort((a, b) => a.ml - b.ml),
      sample: Number(p.sample),
      look: p.look,
      badge: p.badge || null,
      rank: p.rank,
      added: p.added,
      stock: p.stock,
      images: p.images || [],
      visible: p.visible,
      categories: catsOf.get(p.id) || [],
      reviews: revOf.get(p.id) || []
    }))
  };
}
// Prekės puslapio laukai (v29, migracija 20261122090000): įrašomi tik užpildyti - katalogas nedidėja
function pageFields(p) {
  const o = {};
  if (p.subtitle) o.subtitle = p.subtitle;
  if (p.mood_image) o.moodImage = p.mood_image;
  if (p.mood_title) o.moodTitle = p.mood_title;
  if (p.mood_line) o.moodLine = p.mood_line;
  return o;
}
async function fetchCatalog() {
  // Natų biblioteka ir kvapų nuotaikos juosta - nebūtinos (be migracijos lentelės / stulpelių nėra - katalogas vis tiek veikia)
  const optional = path => sbRest(path).then(r => (Array.isArray(r) ? r : []), () => []);
  const [products, families, categories, links, settings, reviews, scents, notes] = await Promise.all([
    sbRest("products?select=*&order=rank.asc"),
    sbRest("families?select=*&order=sort.asc"),
    sbRest("categories?select=*&order=sort.asc"),
    sbRest("product_categories?select=product_id,category_id"),
    sbRest("settings?select=data&id=eq.1"),
    sbRest("reviews?select=product_id,name,text,rating,created_at,verified&status=eq.approved&order=created_at.desc"),
    optional("scents?select=*"),
    optional("note_media?select=name,image")
  ]);
  return catalogFromDb({ products, families, categories, links, settings, reviews, scents, notes });
}
let lastCatalogJson = "";
async function refreshCatalog({ rerender = true } = {}) {
  if (!SB) return false;
  try {
    const c = await fetchCatalog();
    if (!c.products.length && !auth.isAdmin) return false; // tuščia bazė - liekame su įdėtu katalogu
    const json = JSON.stringify(c);
    if (json === lastCatalogJson) return false;
    lastCatalogJson = json;
    const changed = json !== JSON.stringify(CAT);
    if (!auth.isAdmin) store.set(CATALOG_KEY, { at: Date.now(), c });
    if (!changed) return false;
    setCatalog(c);
    state.cart = sanitizeCart(state.cart);
    if (rerender) emit("catalog");
    return true;
  } catch (err) {
    logError("catalog", err);
    return false;
  }
}
// Paleidžiant: naujesnė telefone išsaugota kopija nei surinkimo metu įdėta - naudojame ją (be mirgėjimo)
function useCachedCatalog() {
  const cached = store.get(CATALOG_KEY, null);
  if (cached?.c?.products?.length && cached.at > (Number(window.VAIDORE_BUILT) || 0)) {
    try {
      setCatalog(cached.c);
      lastCatalogJson = JSON.stringify(cached.c);
    } catch (err) {
      logError("cache", err);
    }
  }
}
