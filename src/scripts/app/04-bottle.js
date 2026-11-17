// 04 – kvepalų buteliuko piešinys (SVG): stiklas su šviesos atspindžiu, skystis pagal look.liquid,
// etiketė su pavadinimu, dangtelis (gold / black / silver / wood), forma (rect / tall / round / square).
// Tikras nuotraukas galima pridėti vėliau – žr. docs/ARCHITECTURE.md „Nuotraukos“.
let bottleSeq = 0;
const CAP_TONES = {
  gold: ["#F6E7B4", "#D4AF5A", "#9C7A2E"],
  black: ["#4B5563", "#1F2937", "#0B0F17"],
  silver: ["#fafafa", "#C3CCD8", "#7C8796"],
  wood: ["#D2AE87", "#94694A", "#5C3D25"]
};
const BOTTLE_SHAPES = {
  rect: { body: [22, 70, 76, 122, 12], neck: [50, 60, 20, 12], cap: [38, 22, 44, 40, 7] },
  tall: { body: [30, 56, 60, 136, 10], neck: [51, 48, 18, 10], cap: [42, 12, 36, 38, 6] },
  round: { body: [14, 78, 92, 114, 44], neck: [50, 66, 20, 14], cap: [40, 30, 40, 38, 19] },
  square: { body: [18, 82, 84, 110, 7], neck: [49, 72, 22, 12], cap: [33, 34, 54, 40, 4] }
};
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => {
    const v = (n >> s) & 255;
    return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
function bottleSVG(p, cls = "") {
  const id = `vb${++bottleSeq}`;
  const s = BOTTLE_SHAPES[p.look.shape] || BOTTLE_SHAPES.rect;
  const [bx, by, bw, bh, br] = s.body;
  const [nx, ny, nw, nh] = s.neck;
  const [cx, cy, cw, ch, cr] = s.cap;
  const tone = CAP_TONES[p.look.cap] || CAP_TONES.gold;
  const liq = p.look.liquid;
  const base = 12; // storas stiklo dugnas
  const fillTop = by + bh * 0.2;
  const labW = Math.min(bw * 0.64, 58);
  const labX = 60 - labW / 2;
  const labY = by + bh * 0.47;
  const name = p.name.toUpperCase();
  const fitLen = Math.min(name.length * 4.9, labW - 8);
  return `<svg class="bottle ${cls}" viewBox="0 0 120 200" role="img" aria-label="${esc(p.name)}">
<defs>
<linearGradient id="${id}l" x1="0" x2="1"><stop offset="0" stop-color="${shade(liq, -0.18)}"/><stop offset=".45" stop-color="${shade(liq, 0.18)}"/><stop offset="1" stop-color="${shade(liq, -0.26)}"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
<linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="${tone[1]}"/><stop offset=".35" stop-color="${tone[0]}"/><stop offset=".7" stop-color="${tone[1]}"/><stop offset="1" stop-color="${tone[2]}"/></linearGradient>
<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".12"/><stop offset=".8" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>
<clipPath id="${id}k"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${br}"/></clipPath>
</defs>
<ellipse cx="60" cy="${by + bh + 3}" rx="${bw * 0.46}" ry="4" fill="#111111" fill-opacity=".1"/>
<rect x="${nx}" y="${ny}" width="${nw}" height="${nh + 4}" rx="2" fill="#E7EBF1" stroke="#111111" stroke-opacity=".12"/>
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${br}" fill="#fff" fill-opacity=".55"/>
<g clip-path="url(#${id}k)">
<rect x="${bx}" y="${fillTop}" width="${bw}" height="${by + bh - fillTop}" fill="url(#${id}l)" fill-opacity=".92"/>
<rect x="${bx}" y="${fillTop}" width="${bw}" height="${by + bh - fillTop}" fill="url(#${id}v)"/>
<rect x="${bx}" y="${fillTop}" width="${bw}" height="1.4" fill="#fff" fill-opacity=".55"/>
<rect x="${bx}" y="${by + bh - base}" width="${bw}" height="${base}" fill="#fff" fill-opacity=".38"/>
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#${id}g)"/>
<rect x="${bx + 7}" y="${by + 9}" width="4.5" height="${bh - 30}" rx="2.2" fill="#fff" fill-opacity=".72"/>
<rect x="${bx + 14}" y="${by + 12}" width="1.6" height="${bh * 0.42}" rx=".8" fill="#fff" fill-opacity=".45"/>
<rect x="${bx + bw - 8}" y="${by + 14}" width="2.2" height="${bh - 40}" rx="1.1" fill="#fff" fill-opacity=".3"/>
</g>
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${br}" fill="none" stroke="#111111" stroke-opacity=".12"/>
<rect x="${labX}" y="${labY}" width="${labW}" height="27" rx="3" fill="#fff" fill-opacity=".9"/>
<text x="60" y="${labY + 10.2}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="4.6" letter-spacing="1.5" fill="#111111" fill-opacity=".55">VAIDORE</text>
<text x="60" y="${labY + 20.4}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="7.4" font-weight="700" fill="#111111"${
    name.length * 4.9 > labW - 8 ? ` textLength="${fitLen}" lengthAdjust="spacingAndGlyphs"` : ""
  }>${esc(name)}</text>
<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${cr}" fill="url(#${id}c)"/>
<rect x="${cx + 4}" y="${cy + 3}" width="${cw - 8}" height="2" rx="1" fill="#fff" fill-opacity=".45"/>
<rect x="${cx + cw * 0.18}" y="${cy + 6}" width="2.6" height="${ch - 12}" rx="1.3" fill="#fff" fill-opacity=".35"/>
<rect x="${cx}" y="${cy + ch - 3}" width="${cw}" height="3" rx="1.5" fill="#000" fill-opacity=".12"/>
</svg>`;
}
