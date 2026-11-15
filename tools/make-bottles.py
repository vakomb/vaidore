# Vaidore buteliuko nuotraukos kiekvienam kvapui (vienkartinis įrankis, Python 3 + Pillow + numpy):
#   python3 tools/make-bottles.py            → src/public/img/kvapai/<id>-1.webp (buteliukas permatomame fone)
#                                               src/public/img/kvapai/<id>-2.webp (scena: akmuo, laimas, prieskoniai)
# Šaltinis – tools/assets/vaidore-scena.png (Vaidore buteliukas juodame fone). Kvapo pavadinimas užrašomas etiketėje
# po juostele su „V“ (auksu, serifiniu šriftu). Kvapai imami iš src/data/catalog.json (tik tie, kurių images tušti
# arba rodo į img/kvapai/). Stiklas iškerpamas iš juodo fono pagal šviesumą – fone persišviečia kortelės spalva.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools/assets/vaidore-scena.png")
OUT = os.path.join(ROOT, "src/public/img/kvapai")
FONT = next((f for f in [
    "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyretermes-regular.otf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
] if os.path.exists(f)), None)

# Buteliuko geometrija šaltinyje (px)
CAP = (1123, 74, 1263, 292)
BODY = (1020, 287, 1363, 808)
LABEL = (1062, 334, 1321, 770)
NAME_CY = 606            # pavadinimo vidurys (tarp „V“ juostelės ir „EAU DE PARFUM“)
NAME_MAXW = 196
GOLD_TOP, GOLD_BOT = (205, 168, 104), (160, 124, 70)


def gold_text(img, text, cy, cap_h=19, track=0.16, ss=4):
    """Auksinis užrašas etiketėje: piešiama 4× didesnė kaukė, sumažinama, užliejama auksiniu gradientu."""
    font_px = cap_h / 0.662
    while True:
        f = ImageFont.truetype(FONT, int(font_px * ss))
        widths = [f.getbbox(ch)[2] - f.getbbox(ch)[0] if ch != " " else f.getlength(" ") for ch in text]
        adv = [f.getlength(ch) for ch in text]
        total = sum(adv) + track * font_px * ss * (len(text) - 1)
        if total / ss <= NAME_MAXW or font_px < 12:
            break
        font_px *= 0.94
    cap = f.getbbox("H")
    h = cap[3] - cap[1]
    pad = 8 * ss
    m = Image.new("L", (int(total) + 2 * pad, h + 2 * pad), 0)
    d = ImageDraw.Draw(m)
    x = pad
    for ch, a in zip(text, adv):
        d.text((x, pad - cap[1]), ch, font=f, fill=255)
        x += a + track * font_px * ss
    m = m.resize((m.width // ss, m.height // ss), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.35))
    w, hh = m.size
    grad = np.linspace(0, 1, hh)[:, None, None]
    col = (np.array(GOLD_TOP)[None, None, :] * (1 - grad) + np.array(GOLD_BOT)[None, None, :] * grad)
    col = np.repeat(col, w, axis=1)
    layer = Image.fromarray(np.dstack([col, np.asarray(m)]).astype(np.uint8), "RGBA")
    cx = (LABEL[0] + LABEL[2]) / 2
    img.alpha_composite(layer, (int(round(cx - w / 2)), int(round(cy - hh / 2))))


def rr_mask(size, box, r, ox, oy, ss=4):
    m = Image.new("L", (size[0] * ss, size[1] * ss), 0)
    b = [(box[0] - ox) * ss, (box[1] - oy) * ss, (box[2] - ox) * ss, (box[3] - oy) * ss]
    ImageDraw.Draw(m).rounded_rectangle(b, r * ss, fill=255)
    return np.asarray(m.resize(size, Image.LANCZOS)) / 255.0


def cutout(scene):
    """Buteliukas be fono: dangtelis ir etiketė – nepermatomi, stiklas – pagal šviesumą (juodas fonas → permatoma)."""
    ox, oy = 1000, 50
    S = scene.crop((ox, oy, 1380, 830)).convert("RGB")
    size = S.size
    a = np.asarray(S).astype(float)
    cap = rr_mask(size, CAP, 3, ox, oy)
    body = rr_mask(size, BODY, 12, ox, oy)
    lab = rr_mask(size, LABEL, 0, ox, oy)
    lum = a.max(2) / 255.0
    glassA = np.clip(lum * 1.35, 0.05, 1.0)
    alpha = np.maximum(cap, body * np.maximum(lab, glassA))
    col = a.copy()
    g = (body > 0) & (lab < 1) & (cap < 0.5)
    un = np.clip(a[g] / np.maximum(glassA[g], 1e-3)[:, None], 0, 255)
    gray = un.mean(1, keepdims=True) * np.array([[1.0, 0.985, 0.96]])  # stiklas – neutralus, šiek tiek šiltas
    col[g] = un * 0.15 + gray * 0.85
    return Image.fromarray(np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8), "RGBA")


def product_png(bottle, size=1000, height=0.82):
    """Kvadratinė nuotrauka: buteliukas centre, apačioje švelnus šešėlis, fonas permatomas."""
    k = size * height / (BODY[3] - CAP[1])
    b = bottle.resize((int(bottle.width * k), int(bottle.height * k)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    top = int(size * 0.075) - int((CAP[1] - 50) * k)
    left = (size - b.width) // 2
    bottom = top + int((BODY[3] - 50) * k)
    sh = Image.new("L", (size, size), 0)
    ImageDraw.Draw(sh).ellipse([left + b.width * 0.06, bottom - 14, left + b.width * 0.94, bottom + 16], fill=120)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    canvas.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (size, size), 0)] * 3, sh)))
    canvas.alpha_composite(b, (left, top))
    return canvas


def main():
    cat = json.load(open(os.path.join(ROOT, "src/data/catalog.json"), encoding="utf8"))
    base = Image.open(SRC).convert("RGBA")
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for p in cat["products"]:
        if only and p["id"] not in only:
            continue
        if any(not str(i).startswith("img/kvapai/") for i in p.get("images") or []):
            continue  # savos nuotraukos – neliečiame
        scene = base.copy()
        gold_text(scene, p["name"].upper(), NAME_CY)
        product_png(cutout(scene)).save(os.path.join(OUT, f"{p['id']}-1.webp"), "WEBP", quality=86, method=6)
        cx = (BODY[0] + BODY[2]) // 2 - 40
        sq = scene.crop((cx - 450, 24, cx + 450, 924)).convert("RGB")
        sq.save(os.path.join(OUT, f"{p['id']}-2.webp"), "WEBP", quality=84, method=6)
        print(f"✓ {p['id']}: {p['name'].upper()}")


if __name__ == "__main__":
    main()
