// 05 - būsena: krepšelis, mėgstami, pristatymas ir dovanų pakavimas (localStorage).
// Krepšelio eilutė: { id, ml, qty } (ml = 2 - mėginukas) arba atradimų rinkinys { id: DISC.id, ml: 0, qty, picks: [id…] }.
// Raktų nepervadinkite - jie saugomi pirkėjų telefonuose.
const CART_KEY = "vaidore_cart_v1";
const FAV_KEY = "vaidore_fav_v1";
const SHIP_KEY = "vaidore_ship_v1"; // { country, method, locker: { zip, name, addr, city, cc, carrier } } - paštomatas prisimenamas ir pasirinkus kurjerį
const GIFT_KEY = "vaidore_gift_v1"; // { on, note }
const state = {
  cart: sanitizeCart(store.get(CART_KEY, [])),
  fav: new Set(store.get(FAV_KEY, []).filter(id => BY_ID.has(id))),
  ship: sanitizeShip(store.get(SHIP_KEY, null)),
  gift: sanitizeGift(store.get(GIFT_KEY, null))
};
function validPicks(picks) {
  if (!DISC || !Array.isArray(picks) || picks.length !== DISC.count) return false;
  return new Set(picks).size === picks.length && picks.every(id => BY_ID.has(id) && inStock(BY_ID.get(id)));
}
function sanitizeCart(list) {
  return (Array.isArray(list) ? list : [])
    .filter(l =>
      isDisc(l?.id)
        ? validPicks(l.picks)
        : BY_ID.has(l?.id) && priceOf(BY_ID.get(l.id), Number(l.ml)) != null && (Number(l.ml) !== SAMPLE_ML || hasSample(BY_ID.get(l.id)))
    )
    .map(l => {
      const qty = Math.min(Math.max(1, Math.round(l.qty) || 1), SET.maxQty);
      return isDisc(l.id) ? { id: l.id, ml: 0, qty, picks: [...l.picks] } : { id: l.id, ml: Number(l.ml), qty };
    });
}
// v33g: pristatymas pagal šalis - settings.zones: [{ id, countries: ["LV", "EE"], freeFrom, methods: [{ id, carrier, kind, price,
// days: "2-4", perfume, on }] }] (migracija 20261127090000_shipping_zones.sql; administravime - Nustatymai → Pristatymas).
// carrier: omniva / lpexpress / dpd, kind: locker (paštomatas) / courier (iki durų); perfume: false - kvepalams negalima
// (kvepaluose yra alkoholio - tik antžeminis transportas). Be zonų (senas nustatymas) - viena zona iš shipping + countries.
// Funkcijos (ne const) - naudojamos jau kuriant state (sanitizeShip)
function ZONES() {
  return Array.isArray(SET.zones) && SET.zones.length
    ? SET.zones
    : [
        {
          id: "default",
          countries: SET.countries || ["LT"],
          freeFrom: SET.freeShippingFrom,
          methods: (SET.shipping || []).map(o => ({ id: o.id, carrier: o.id === "omniva" ? "omniva" : "dpd", kind: o.id === "omniva" ? "locker" : "courier", price: o.price, days: String(o.days || "").replace(/[^\d-]/g, "") }))
        }
      ];
}
function ALL_COUNTRIES() {
  return [...new Set(ZONES().flatMap(z => z.countries || []))];
}
function zoneOf(cc) {
  return ZONES().find(z => (z.countries || []).includes(cc)) || null;
}
// Spėjimas: lietuviškai - Lietuva; kitaip - šalis iš slapuko (nustato Vercel, 8 etapas) arba naršyklės kalbos regiono
function guessCountry() {
  const ok = cc => (cc && ALL_COUNTRIES().includes(cc) ? cc : null);
  if (LANG === "lt") return ok("LT");
  const ck = document.cookie.match(/(?:^|; )vaidore_country=([A-Z]{2})/)?.[1];
  const nav = (navigator.languages || [navigator.language || ""]).map(l => String(l).split("-")[1]?.toUpperCase()).find(ok);
  return ok(ck) || nav || null;
}
const cartHasPerfume = () => (state?.cart || []).some(l => isDisc(l.id) || isPerfume(BY_ID.get(l.id) || {}));
const shipMethods = (cc = state.ship.country) => (zoneOf(cc)?.methods || []).filter(m => m.on !== false && (m.perfume !== false || !cartHasPerfume()));
const isLocker = m => m?.kind === "locker";
const curMethod = () => shipMethods().find(m => m.id === state.ship.method) || null;
const methodName = m => (m ? t(`ship.${m.carrier}.${m.kind}`) : "");
const methodDays = m => (m?.days ? nb(t("ship.days", { d: m.days })) : "");
function sanitizeShip(v) {
  const all = ALL_COUNTRIES();
  const country = all.includes(v?.country) ? v.country : guessCountry();
  const ms = (zoneOf(country)?.methods || []).filter(m => m.on !== false);
  const method = ms.some(o => o.id === v?.method) ? v.method : ms[0]?.id || null;
  const lk = v?.locker;
  const carrier = lk?.carrier || "omniva";
  const locker =
    lk && (carrier === "omniva" ? /^\d{4,6}$/.test(String(lk.zip)) : String(lk.name || "").trim().length >= 3)
      ? { zip: String(lk.zip || ""), name: String(lk.name || "").slice(0, 120), addr: String(lk.addr || "").slice(0, 120), city: String(lk.city || "").slice(0, 60), cc: String(lk.cc || country || "").slice(0, 2), carrier }
      : null;
  return { country, method, locker };
}
// Paštomatas tinka tik savo vežėjui ir šaliai
const shipLocker = () => {
  const m = curMethod();
  const l = state.ship.locker;
  return isLocker(m) && l && l.carrier === m.carrier && (!l.cc || l.cc === state.ship.country) ? l : null;
};
function sanitizeGift(v) {
  return { on: !!v?.on && !!SET.gift, note: String(v?.note || "").slice(0, SET.gift?.noteMax || 200) };
}
const lineKey = l => (l.picks ? `${l.id}:${l.picks.join(",")}` : `${l.id}:${l.ml}`);
const linePrice = l => (isDisc(l.id) ? DISC.price : priceOf(BY_ID.get(l.id), l.ml));
const cartCount = () => state.cart.reduce((n, l) => n + l.qty, 0);
const cartSubtotal = () => state.cart.reduce((s, l) => s + linePrice(l) * l.qty, 0);
const giftPrice = () => (state.gift.on && state.cart.length ? SET.gift.price : 0);
// Nemokamo pristatymo riba skaičiuojama nuo prekių (be pakavimo) - taip pat ir serveryje
const freeFrom = (cc = state.ship.country) => Number(zoneOf(cc)?.freeFrom ?? SET.freeShippingFrom);
const shipLeft = () => Math.max(0, freeFrom() - cartSubtotal());
const minShipping = () => {
  const p = (shipMethods().length ? shipMethods() : ZONES().flatMap(z => z.methods || [])).map(o => Number(o.price));
  return p.length ? Math.min(...p) : 0;
};
const shipPrice = () => {
  if (shipLeft() <= 0) return 0;
  const o = curMethod();
  return o ? Number(o.price) : null;
};

const listeners = new Set();
const onChange = fn => listeners.add(fn);
function emit(what) {
  listeners.forEach(fn => {
    try {
      fn(what);
    } catch (e) {
      logError("onChange", e);
    }
  });
}
function saveCart() {
  store.set(CART_KEY, state.cart);
  emit("cart");
}
function addToCart(id, ml, qty = 1, picks = null) {
  const add = isDisc(id) ? { id, ml: 0, qty, picks: [...picks] } : { id, ml, qty };
  const line = state.cart.find(l => lineKey(l) === lineKey(add));
  if (line) line.qty = Math.min(line.qty + qty, SET.maxQty);
  else state.cart.unshift({ ...add, qty: Math.min(qty, SET.maxQty) });
  saveCart();
  track("Į krepšelį", { kvapas: isDisc(id) ? DISC.name : BY_ID.get(id)?.name, turis: isDisc(id) ? "rinkinys" : sizeLabel(ml, BY_ID.get(id)) });
}
function setQty(key, qty) {
  const i = state.cart.findIndex(l => lineKey(l) === key);
  if (i < 0) return null;
  const removed = state.cart[i];
  if (qty <= 0) state.cart.splice(i, 1);
  else state.cart[i].qty = Math.min(qty, SET.maxQty);
  saveCart();
  return { line: { ...removed }, index: i };
}
function restoreLine(line, index) {
  state.cart.splice(Math.min(index, state.cart.length), 0, line);
  saveCart();
}
function clearCart() {
  state.cart = [];
  saveCart();
}
function setShip(method, locker = state.ship.locker, country = state.ship.country) {
  state.ship = sanitizeShip({ country, method, locker });
  store.set(SHIP_KEY, state.ship);
  emit("ship");
}
function setGift(patch) {
  state.gift = sanitizeGift({ ...state.gift, ...patch });
  store.set(GIFT_KEY, state.gift);
  emit("gift");
}
function toggleFav(id) {
  if (state.fav.has(id)) state.fav.delete(id);
  else state.fav.add(id);
  store.set(FAV_KEY, [...state.fav]);
  emit("fav");
  return state.fav.has(id);
}

// Kitame skirtuke pakeistas krepšelis (pvz. apmokėta kitame lange) - atnaujiname
window.addEventListener("storage", e => {
  if (e.key === CART_KEY) {
    state.cart = sanitizeCart(store.get(CART_KEY, []));
    emit("cart");
  } else if (e.key === FAV_KEY) {
    state.fav = new Set(store.get(FAV_KEY, []).filter(id => BY_ID.has(id)));
    emit("fav");
  }
});
