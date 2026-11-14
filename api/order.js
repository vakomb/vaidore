// Vercel funkcija GET /api/order?s=<Stripe Checkout sesija> – padėkos puslapiui (/aciu):
// ar apmokėta, užsakymo nr., suma (matavimui) ir mėginukų kainos grąžinimo kodas (jei pirkta mėginukų).
// Asmens duomenų (vardo, adreso, el. pašto) negrąžina.
import { stripe, ensureCredit, orderRef } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Tik GET" });
  }
  const id = String(req.query?.s || "");
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return res.status(400).json({ error: "Neteisingas užsakymas" });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: "Apmokėjimas neįjungtas" });
  try {
    const s = await stripe(`checkout/sessions/${id}`);
    const paid = s.payment_status === "paid";
    const credit = paid ? await ensureCredit(s) : null;
    return res.status(200).json({ paid, ref: orderRef(s.id), total: (s.amount_total || 0) / 100, credit });
  } catch (err) {
    console.error("order", err.status, err.message);
    return res.status(err.status === 404 ? 404 : 502).json({ error: "Užsakymo rasti nepavyko" });
  }
}
