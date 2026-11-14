// 05 – būsena: krepšelis ir mėgstami (localStorage). Krepšelio eilutė: { id, ml, qty } (ml = 2 – mėginukas).
// Raktų nepervadinkite – jie saugomi pirkėjų telefonuose.
const CART_KEY = "vaidore_cart_v1";
const FAV_KEY = "vaidore_fav_v1";
const state = {
  cart: sanitizeCart(store.get(CART_KEY, [])),
  fav: new Set(store.get(FAV_KEY, []).filter(id => BY_ID.has(id)))
};
function sanitizeCart(list) {
  return (Array.isArray(list) ? list : [])
    .filter(l => BY_ID.has(l?.id) && priceOf(BY_ID.get(l.id), l.ml) != null)
    .map(l => ({ id: l.id, ml: Number(l.ml), qty: Math.min(Math.max(1, Math.round(l.qty) || 1), SET.maxQty) }));
}
const cartCount = () => state.cart.reduce((n, l) => n + l.qty, 0);
const cartSubtotal = () => state.cart.reduce((s, l) => s + priceOf(BY_ID.get(l.id), l.ml) * l.qty, 0);
const shipLeft = () => Math.max(0, SET.freeShippingFrom - cartSubtotal());
const minShipping = () => Math.min(...SET.shipping.map(o => o.price));

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
function addToCart(id, ml, qty = 1) {
  const line = state.cart.find(l => l.id === id && l.ml === ml);
  if (line) line.qty = Math.min(line.qty + qty, SET.maxQty);
  else state.cart.unshift({ id, ml, qty: Math.min(qty, SET.maxQty) });
  saveCart();
}
function setQty(id, ml, qty) {
  const i = state.cart.findIndex(l => l.id === id && l.ml === ml);
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
function toggleFav(id) {
  if (state.fav.has(id)) state.fav.delete(id);
  else state.fav.add(id);
  store.set(FAV_KEY, [...state.fav]);
  emit("fav");
  return state.fav.has(id);
}

// Kitame skirtuke pakeistas krepšelis (pvz. apmokėta kitame lange) – atnaujiname
window.addEventListener("storage", e => {
  if (e.key === CART_KEY) {
    state.cart = sanitizeCart(store.get(CART_KEY, []));
    emit("cart");
  } else if (e.key === FAV_KEY) {
    state.fav = new Set(store.get(FAV_KEY, []).filter(id => BY_ID.has(id)));
    emit("fav");
  }
});
