// v33h: kalba pagal šalį (Vercel Routing Middleware - veikia tik Vercel; GitHub Pages kopijoje tą patį daro programėlė, 29-lang.js).
// Tik pradžios puslapis „/“: pirkėjas jau pasirinko kalbą (slapukas vaidore_lang) - gerbiame; kitaip pagal šalį iš IP
// (x-vercel-ip-country): Lietuva - lietuviškai, kitos šalys - 302 į /en. Paieškos robotams - nieko (abi versijos indeksuojamos,
// hreflang). Visada įrašomas funkcinis slapukas vaidore_country (krepšelyje - numatyta pristatymo šalis). IP adresas nesaugomas.
export const config = { matcher: ["/"] };
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|lighthouse|headless/i;
export default function middleware(request) {
  if (request.method !== "GET") return;
  const ua = request.headers.get("user-agent") || "";
  if (BOT.test(ua)) return;
  const cookies = request.headers.get("cookie") || "";
  const chosen = cookies.match(/(?:^|;\s*)vaidore_lang=(lt|en)/)?.[1];
  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const toEn = chosen ? chosen === "en" : !!country && country !== "LT";
  if (!toEn) return;
  const url = new URL("/en", request.url);
  const headers = new Headers({ Location: url.toString(), "Cache-Control": "private, no-store", Vary: "Cookie" });
  if (/^[A-Z]{2}$/.test(country)) headers.append("Set-Cookie", `vaidore_country=${country}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`);
  return new Response(null, { status: 302, headers });
}
