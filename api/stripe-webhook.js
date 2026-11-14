// Vercel funkcija POST /api/stripe-webhook – Stripe praneša apie apmokėtą užsakymą (checkout.session.completed).
// 1) Tikrina parašą (Stripe-Signature, HMAC-SHA256 su STRIPE_WEBHOOK_SECRET) – be jo užklausa atmetama.
// 2) Sukuria mėginukų kainos grąžinimo kodą (api/_lib.js → ensureCredit), jei pirkta mėginukų.
// 3) Jei nustatytas RESEND_API_KEY – laiškas savininkui (užsakymo santrauka) ir pirkėjui (tik jei yra nuolaidos kodas;
//    kvitą pirkėjui siunčia pati Stripe: Settings → Customer emails → Successful payments).
// Įjungti: Stripe → Developers → Webhooks → Add endpoint https://vaidore.com/api/stripe-webhook,
// įvykiai checkout.session.completed ir checkout.session.async_payment_succeeded; „Signing secret“ → Vercel STRIPE_WEBHOOK_SECRET.
// Web standarto parašas (Request → Response), kad gautume tikslų, neperdirbtą užklausos tekstą parašo tikrinimui.
import { S, stripe, ensureCredit, sendMail, escHtml, eur, orderRef, siteUrl, verifySignature } from "./_lib.js";

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

function ownerMail(s, credit) {
  const m = s.metadata || {};
  const cd = s.customer_details || {};
  const addr = s.shipping_details?.address || cd.address;
  const shipTo = m.locker
    ? `Omniva paštomatas: ${m.locker}`
    : addr
      ? [s.shipping_details?.name, addr.line1, addr.line2, `${addr.postal_code || ""} ${addr.city || ""}`.trim(), addr.country].filter(Boolean).join(", ")
      : "—";
  const rows = (s.line_items?.data || [])
    .map(li => `<tr><td>${escHtml(li.description)}</td><td align="right">${li.quantity}</td><td align="right">${eur(li.amount_total)}</td></tr>`)
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#0F172A">
<h2 style="margin:0 0 8px">Naujas užsakymas ${orderRef(s.id)} – ${eur(s.amount_total || 0)}</h2>
<p><b>Pirkėjas:</b> ${escHtml(cd.name || "")} · ${escHtml(cd.email || "")} · ${escHtml(cd.phone || "")}</p>
<p><b>Pristatymas:</b> ${escHtml(m.ship_method || "")} – ${escHtml(shipTo)} (${eur(s.shipping_cost?.amount_total || 0)})</p>
${m.gift ? `<p><b>Dovanų pakavimas.</b> Rašteliukas: ${escHtml(m.gift_note || "—")}</p>` : ""}
<table cellpadding="6" style="border-collapse:collapse;min-width:360px">${rows}</table>
${credit ? `<p>Pirkėjui sukurtas mėginukų kodas <b>${credit.code}</b> (${eur(credit.amount)}).</p>` : ""}
<p style="color:#64748B">Stripe: https://dashboard.stripe.com/payments/${escHtml(s.payment_intent || "")}</p></div>`;
}
function customerMail(s, credit) {
  const until = new Date(credit.expires * 1000).toLocaleDateString("lt-LT");
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;color:#0F172A;line-height:1.5">
<p>Ačiū, kad renkatės ${escHtml(S.shop)}!</p>
<p>Mėginukų kainą grąžiname: įveskite kodą <b style="font-size:18px">${credit.code}</b> apmokėdami buteliuką – nuolaida ${eur(credit.amount)}, galioja iki ${until}.</p>
<p><a href="${siteUrl()}/" style="color:#284CA2;font-weight:700">Į parduotuvę</a></p></div>`;
}

export async function POST(request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) {
    return json(400, { error: "Neteisingas parašas" });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: "Neteisingas JSON" });
  }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return json(200, { ok: true, ignored: event.type });
  }
  try {
    const s = await stripe(`checkout/sessions/${event.data.object.id}?expand[]=line_items`);
    if (s.payment_status !== "paid") return json(200, { ok: true, pending: true });
    const credit = await ensureCredit(s);
    await sendMail({
      to: process.env.ORDER_EMAIL_TO || S.company.email,
      subject: `Užsakymas ${orderRef(s.id)} – ${eur(s.amount_total || 0)}`,
      html: ownerMail(s, credit),
      idem: `vd-owner-${s.id}`
    });
    if (credit && s.customer_details?.email) {
      await sendMail({
        to: s.customer_details.email,
        subject: `${S.shop}: mėginukų kaina grąžinta – kodas ${credit.code}`,
        html: customerMail(s, credit),
        idem: `vd-credit-${s.id}`
      });
    }
    return json(200, { ok: true, credit: !!credit });
  } catch (err) {
    console.error("webhook", err.status, err.message);
    // 500 – Stripe pakartos vėliau
    return json(500, { error: "Apdoroti nepavyko" });
  }
}
