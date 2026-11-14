// Vietinė peržiūra: node tools/serve.mjs [prievadas] → http://localhost:4180 (site/ su cleanUrls kaip Vercel).
// /api/checkout čia neveikia (tai Vercel funkcija) – parduotuvė parodo pranešimą „Apmokėjimas dar neįjungtas“.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const port = Number(process.argv[2] || 4180);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};
http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end("404");
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Vaidore: http://localhost:${port}`));
