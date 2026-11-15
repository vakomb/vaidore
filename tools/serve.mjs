// Vietinė peržiūra: node tools/serve.mjs [prievadas] → http://localhost:4180 (site/ kaip Vercel: cleanUrls, nežinomi adresai – 404.html).
// Pirma surinkite: node tools/build-site.mjs. Duomenų bazė ir apmokėjimas – tikras Supabase (src/data/supabase.json),
// todėl vietoje apmokėti nepavyks (grįžimo adresas localhost leidžiamas tik bandomajam Stripe raktui).
// Testai naudoja startServer(aplankas, prievadas).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};
export function startServer(root, port = 4180) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file += ".html";
    if (fs.existsSync(file) && fs.statSync(file).isDirectory() && fs.existsSync(path.join(file, "index.html"))) file = path.join(file, "index.html");
    let status = 200;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      status = 404;
      file = path.join(root, "404.html");
      if (!fs.existsSync(file)) return res.writeHead(404).end("404");
    }
    res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
  const port = Number(process.argv[2] || 4180);
  if (!fs.existsSync(root)) {
    console.error("Nėra site/ – pirma: node tools/build-site.mjs");
    process.exit(1);
  }
  await startServer(root, port);
  console.log(`Vaidore: http://localhost:${port}`);
}
