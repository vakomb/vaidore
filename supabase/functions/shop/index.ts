// Supabase Edge Function „shop“ – visi parduotuvės serverio veiksmai viename (mažiau šaltų paleidimų, vienas diegimas):
//   POST /functions/v1/shop/checkout        – Stripe Checkout sesija
//   GET  /functions/v1/shop/order?s=…       – padėkos puslapiui (apmokėta, kodas; įrašo užsakymą)
//   POST /functions/v1/shop/stripe-webhook  – Stripe pranešimai (parašas)
//   POST /functions/v1/shop/admin           – administratoriaus veiksmai (išsiųsta, grąžinti pinigus, pranešti, perrinkti)
//   POST /functions/v1/shop/account         – paskyros ištrynimas
//   POST /functions/v1/shop/newsletter      – naujienlaiškis: sveikinimo laiškas, atsisakymas
// Logika – ../_shared/shop.js (ta pati testuojama tools/test-api.mjs). Diegimas: supabase functions deploy shop --no-verify-jwt
import { createShop, serve, json } from "../_shared/shop.js";

const shop = createShop(Deno.env.toObject());
const routes: Record<string, (req: Request) => Promise<Response>> = {
  checkout: shop.checkout,
  order: shop.orderInfo,
  "stripe-webhook": shop.webhook,
  admin: shop.admin,
  account: shop.account,
  newsletter: shop.newsletter
};
Deno.serve(
  serve(req => {
    const name = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
    const fn = routes[name];
    return fn ? fn(req) : Promise.resolve(json(404, { error: "Nėra tokio veiksmo" }));
  })
);
