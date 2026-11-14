// Programėlės ikonos (PNG) iš favicon.svg: node tools/make-icons.mjs (reikia sharp: npm i -D sharp).
// Sugeneruoti failai saugomi src/public/icons/ ir įkeliami į repozitoriją – Vercel'yje sharp nereikia.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const out = path.join(root, "src/public/icons");
fs.mkdirSync(out, { recursive: true });
const drop = (pad, bg, rx) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B67CC"/><stop offset="1" stop-color="#1E3A86"/></linearGradient></defs><rect width="512" height="512" rx="${rx}" fill="${bg}"/><g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})"><path d="M256 70c78 89 130 161 130 224a130 130 0 0 1-260 0c0-63 52-135 130-224z" fill="url(#g)"/><path d="M203 308a57 57 0 0 0 53 57" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="24" stroke-linecap="round"/></g></svg>`
  );
const jobs = [
  ["icon-192.png", 192, drop(40, "#F3F5F8", 0)],
  ["icon-512.png", 512, drop(40, "#F3F5F8", 0)],
  ["icon-maskable-512.png", 512, drop(90, "#F3F5F8", 0)],
  ["apple-touch-icon.png", 180, drop(46, "#F3F5F8", 0)]
];
for (const [name, size, svg] of jobs) {
  await sharp(svg).resize(size, size).png().toFile(path.join(out, name));
  console.log("✓", name);
}
