# Vaidore buteliuko nuotraukos kiekvienam kvapui (vienkartinis įrankis, Python 3 + Pillow + numpy):
#   python3 tools/make-bottles.py [id …]     → src/public/img/kvapai/<id>-1.webp (+ be argumentų – img/meginukas.webp)
# Viena nuotrauka kvapui: TIK buteliukas permatomame fone (WebP su alfa), 1000×1000, visi vienodo dydžio ir centruoti
# (vienodos paraštės viršuje ir apačioje). Šešėlio paveiksle nėra – jį piešia CSS (--bottle-shadow, 01-tokens.css).
# Šaltinis – tools/assets/vaidore-scena.png (Vaidore buteliukas juodame fone). Kvapo pavadinimas užrašomas etiketėje
# po juostele su „V“ (auksu, TeX Gyre Termes – tas pats šriftas kaip VAIDORE logotipe, tools/make-logo.py).
# Kvapai imami iš src/data/catalog.json (tik tie, kurių images tušti arba rodo į img/kvapai/).
# Dangtelis – geometrinė kaukė (cilindras su elipsės viršumi, be juodų kampų), etiketė – nepermatoma,
# stiklas iškerpamas iš juodo fono pagal šviesumą – fone persišviečia kortelės spalva.
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

# Buteliuko geometrija šaltinyje (px). Dangtelio viršus – elipsė (centras CAP_TOP_CY, pusašis CAP_RY).
CAP = (1123, 74, 1263, 292)
CAP_TOP_CY, CAP_RY = 88, 14
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


def cap_mask(size, ox, oy, ss=4):
    m = Image.new("L", (size[0] * ss, size[1] * ss), 0)
    d = ImageDraw.Draw(m)
    x0, x1 = (CAP[0] - ox) * ss, (CAP[2] - ox) * ss
    d.rectangle([x0, (CAP_TOP_CY - oy) * ss, x1, (CAP[3] - oy) * ss], fill=255)
    d.ellipse([x0, (CAP_TOP_CY - CAP_RY - oy) * ss, x1, (CAP_TOP_CY + CAP_RY - oy) * ss], fill=255)
    return np.asarray(m.resize(size, Image.LANCZOS)) / 255.0


def cutout(scene):
    """Buteliukas be fono: dangtelis ir etiketė – nepermatomi, stiklas – pagal šviesumą (juodas fonas → permatoma)."""
    ox, oy = 1000, 50
    S = scene.crop((ox, oy, 1380, 830)).convert("RGB")
    size = S.size
    a = np.asarray(S).astype(float)
    cap = cap_mask(size, ox, oy)
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


def product_png(bottle, size=1000, height=0.86):
    """Kvadratinė nuotrauka: buteliukas centre (vienodos paraštės), fonas permatomas, be šešėlio."""
    k = size * height / (BODY[3] - CAP_TOP_CY + CAP_RY)
    b = bottle.resize((int(bottle.width * k), int(bottle.height * k)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    h = int((BODY[3] - (CAP_TOP_CY - CAP_RY)) * k)
    top = (size - h) // 2 - int((CAP_TOP_CY - CAP_RY - 50) * k)
    canvas.alpha_composite(b, ((size - b.width) // 2, top))
    return canvas


def vial(w=240, h=800, ss=4):
    """2 ml mėginukas (permatomas fonas): juodas blizgus dangtelis su auksiniu žiedu, stiklinis vamzdelis su šampano
    spalvos skysčiu, juoda etiketė su auksiniu „V“ – tas pats stilius kaip buteliuko. Naudojamas pradžios skaidrėse ir
    kategorijų paveiksluose (img/meginukas.webp)."""
    W, H = w * ss, h * ss
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = W // 2
    tw, cw = int(W * 0.40), int(W * 0.48)  # vamzdelio ir dangtelio plotis
    cap_top, cap_bot = int(H * 0.015), int(H * 0.2)
    tube_top, tube_bot = cap_bot - int(H * 0.01), int(H * 0.985)
    # Stiklas: šviesiai pilkas kontūras ir vos matomas užpildas
    r = tw // 2
    d.rounded_rectangle([cx - r, tube_top, cx + r, tube_bot], r, fill=(236, 236, 236, 70), outline=(176, 176, 176, 210), width=int(2.2 * ss))
    # Skystis (šampano spalvos), nuo 34 % iki apačios
    lt = int(H * 0.34)
    inset = int(3.4 * ss)
    liquid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(liquid)
    ld.rounded_rectangle([cx - r + inset, lt, cx + r - inset, tube_bot - inset], r - inset, fill=(232, 204, 146, 170))
    ld.rectangle([cx - r + inset, lt, cx + r - inset, lt + r], fill=(232, 204, 146, 170))  # plokščias paviršius
    ld.rectangle([cx - r + inset, lt, cx + r - inset, lt + int(1.6 * ss)], fill=(214, 182, 118, 210))
    g = np.linspace(0, 1, W)[None, :]
    shade = 0.78 + 0.32 * np.exp(-((g - 0.36) ** 2) / 0.02)  # šviesesnė juosta kairėje
    la = np.asarray(liquid).astype(float)
    la[..., :3] = np.clip(la[..., :3] * shade[..., None], 0, 255)
    im.alpha_composite(Image.fromarray(la.astype(np.uint8), "RGBA"))
    # Etiketė
    lb_t, lb_b = int(H * 0.52), int(H * 0.76)
    d.rectangle([cx - r + inset, lb_t, cx + r - inset, lb_b], fill=(14, 14, 14, 255))
    fr = int(5 * ss)
    d.rectangle([cx - r + inset + fr, lb_t + fr, cx + r - inset - fr, lb_b - fr], outline=GOLD_BOT + (255,), width=max(1, int(0.9 * ss)))
    if FONT:
        f = ImageFont.truetype(FONT, int(26 * ss))
        bb = f.getbbox("V")
        d.text((cx - (bb[0] + bb[2]) / 2, (lb_t + lb_b) / 2 - (bb[1] + bb[3]) / 2), "V", font=f, fill=GOLD_TOP + (255,))
    # Stiklo atspindžiai
    d.rounded_rectangle([cx - r + int(W * 0.06), tube_top + int(H * 0.04), cx - r + int(W * 0.09), tube_bot - int(H * 0.06)], ss * 3, fill=(255, 255, 255, 150))
    # Dangtelis: juodas blizgus cilindras + auksinis žiedas apačioje
    cap = np.zeros((H, W, 4), float)
    x = (np.arange(W) - (cx - cw / 2)) / cw
    inside = (x >= 0) & (x <= 1)
    lum = 18 + 70 * np.exp(-((x - 0.28) ** 2) / 0.006) + 26 * np.exp(-((x - 0.8) ** 2) / 0.004)
    for y in range(cap_top, cap_bot):
        cap[y, inside, :3] = lum[inside][:, None]
        cap[y, inside, 3] = 255
    ring = int(H * 0.022)
    gold = np.array(GOLD_TOP) * (0.75 + 0.5 * np.exp(-((x - 0.3) ** 2) / 0.01))[:, None]
    cap[cap_bot - ring:cap_bot, inside, :3] = np.clip(gold[inside], 0, 255)
    capim = Image.fromarray(cap.astype(np.uint8), "RGBA")
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle([cx - cw // 2, cap_top, cx + cw // 2, cap_bot], int(4 * ss), fill=255)
    capim.putalpha(Image.fromarray(np.minimum(np.asarray(capim)[..., 3], np.asarray(m))))
    im.alpha_composite(capim)
    return im.resize((w, h), Image.LANCZOS)


def main():
    cat = json.load(open(os.path.join(ROOT, "src/data/catalog.json"), encoding="utf8"))
    base = Image.open(SRC).convert("RGBA")
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    if not only:
        vial().save(os.path.join(ROOT, "src/public/img/meginukas.webp"), "WEBP", quality=88, method=6, exact=True)
        print("✓ img/meginukas.webp (2 ml mėginukas)")
    for p in cat["products"]:
        if only and p["id"] not in only:
            continue
        if any(not str(i).startswith("img/kvapai/") for i in p.get("images") or []):
            continue  # savos nuotraukos – neliečiame
        scene = base.copy()
        gold_text(scene, p["name"].upper(), NAME_CY)
        product_png(cutout(scene)).save(os.path.join(OUT, f"{p['id']}-1.webp"), "WEBP", quality=86, method=6, exact=True)
        print(f"✓ {p['id']}: {p['name'].upper()}")


if __name__ == "__main__":
    main()
