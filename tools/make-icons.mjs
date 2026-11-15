// Programėlės ikonos (PNG) iš favicon.svg (v7 – auksinė „V“ juodame fone): node tools/make-icons.mjs (reikia sharp: npm i -D sharp).
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
// Ženklas – src/public/favicon.svg (tools/make-logo.py): auksinė „V“ juodame fone. Ikonoms – be užapvalinimo
// (telefonas apvalina pats), maskable – su didesne paraštė.
const fav = fs.readFileSync(path.join(root, "src/public/favicon.svg"), "utf8").replace(/ rx="\d+"/, "");
const icon = (scale = 1) =>
  Buffer.from(scale === 1 ? fav : fav.replace(/<path transform="translate\(([\d.-]+) ([\d.-]+)\) scale\(([\d.]+)\)"/, (_, x, y, k) => {
    const K = k * scale;
    return `<path transform="translate(${32 - (32 - x) * scale} ${32 - (32 - y) * scale}) scale(${K})"`;
  }));
const jobs = [
  ["icon-192.png", 192, icon()],
  ["icon-512.png", 512, icon()],
  ["icon-maskable-512.png", 512, icon(0.78)],
  ["apple-touch-icon.png", 180, icon(0.92)]
];
for (const [name, size, svg] of jobs) {
  await sharp(svg).resize(size, size).png().toFile(path.join(out, name));
  console.log("✓", name);
}
