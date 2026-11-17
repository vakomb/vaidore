# Kategorijų nuotraukos pradžios puslapio skyriui „Kategorijos“ (vienkartinis įrankis, Python 3 + Pillow + numpy):
#   python3 tools/make-categories.py   → src/public/img/kategorijos/<raktas>.webp (1200 × 1500, 4:5)
# Vienas studijos stilius visoms: begalinis fonas (siena pereina į grindis be linijos), šviesa iš viršaus kairėje,
# minkšti kontaktiniai ir krentantys šešėliai, akmens / travertino tekstūra, smulkus grūdėtumas. Skiriasi tik spalvų tonas
# ir kompozicija: Moterims – rožinio smėlio arka ir travertino cilindras; Vyrams – grafitas, šiltas kontrovinis
# apšvietimas, tamsus skalūno blokas ir atspindys; Unisex – smėlis, diskas ir žemas cilindras; Mėginukai – šampanas,
# mėginukų eilė ant plokštės; Rinkiniai – juoda dovanų dėžutė su auksu; Naujienos – akmens laiptai.
# Buteliukai – tikri kvapų paveikslai be fono (img/kvapai/<id>-1.webp), mėginukas – img/meginukas.webp.
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "src/public")
OUT = os.path.join(PUB, "img/kategorijos")
W, H = 1200, 1500
HORIZON = 0.66  # sienos ir grindų riba (dalis aukščio)
RNG = np.random.default_rng(7)


def lerp(a, b, t):
    return a + (b - a) * t


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], float)


# ── Fonas ────────────────────────────────────────────────────────────────────
def studio(wall_top, wall_bot, floor_near, light=(0.28, 0.12), glow=0.22, glow_col="#ffffff"):
    """Begalinis fonas: siena (vertikalus gradientas) → grindys, perėjimas minkštas; šviesos dėmė viršuje kairėje."""
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    wt, wb, fn = rgb(wall_top), rgb(wall_bot), rgb(floor_near)
    wall = wt[None, None, :] * (1 - y[..., None]) + wb[None, None, :] * y[..., None]
    fy = np.clip((y - HORIZON) / (1 - HORIZON), 0, 1)
    floor = wb[None, None, :] * (1 - fy[..., None] ** 0.8) + fn[None, None, :] * fy[..., None] ** 0.8
    t = 1 / (1 + np.exp(-(y - HORIZON) / 0.018))  # minkšta riba (cove)
    img = wall * (1 - t[..., None]) + floor * t[..., None]
    img = np.broadcast_to(img, (H, W, 3)).copy()
    d = ((x - light[0]) ** 2 / 0.22 + (y - light[1]) ** 2 / 0.32)
    g = np.exp(-d * 2.2) * glow
    img = img * (1 - g[..., None]) + rgb(glow_col)[None, None, :] * g[..., None]
    # švelni vinjetė
    v = 1 - 0.10 * (((x - 0.5) * 1.6) ** 2 + ((y - 0.45) * 1.2) ** 2)
    return img * v[..., None]


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def grain(im, s=2.2):
    a = np.asarray(im.convert("RGB")).astype(float)
    n = RNG.normal(0, s, (H, W, 1))
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8), "RGB")


def blur_layer(size, draw_fn, radius):
    m = Image.new("L", size, 0)
    draw_fn(ImageDraw.Draw(m))
    return m.filter(ImageFilter.GaussianBlur(radius)) if radius else m


def shade_rect(w, h, base, light=1.10, dark=0.80, axis="x", center=0.32, texture=0.0, streaks=False):
    """Objekto paviršius: šviesesnis link šviesos (kairėje), tamsesnis kitame krašte; nebūtina akmens tekstūra."""
    b = rgb(base)
    if axis == "x":
        t = np.linspace(0, 1, w)[None, :]
        prof = np.where(t < center, lerp(light * 0.97, light, t / center), lerp(light, dark, (t - center) / (1 - center)))
        prof = np.broadcast_to(prof, (h, w))
    else:
        t = np.linspace(0, 1, h)[:, None]
        prof = np.broadcast_to(lerp(light, dark, t), (h, w))
    a = b[None, None, :] * prof[..., None]
    if texture:
        n = RNG.normal(0, 1, (h // 3 + 1, w // 3 + 1))
        n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 128 - 1
        a = a * (1 + n[..., None] * texture)
        if streaks:  # travertino gyslos – horizontalios
            s = RNG.normal(0, 1, (h // 6 + 1, 2))
            s = np.asarray(Image.fromarray(((s * 50) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))).astype(float) / 128 - 1
            a = a * (1 + s[..., None] * texture * 0.9)
    return a


def paste_arr(canvas, arr, x, y, mask=None):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    if mask is not None:
        im.putalpha(mask)
    canvas.alpha_composite(im, (int(x), int(y)))


def soft_shadow(canvas, box, opacity=0.35, blur=40, color=(0, 0, 0), ellipse=True):
    lay = Image.new("RGBA", canvas.size, color + (0,))
    m = blur_layer(canvas.size, lambda d: (d.ellipse if ellipse else d.rectangle)(box, fill=int(255 * opacity)), blur)
    lay.putalpha(m)
    canvas.alpha_composite(lay)


# ── Objektai ─────────────────────────────────────────────────────────────────
def arch(canvas, cx, base_y, w, h, col, shadow=0.16):
    x0, y0 = int(cx - w / 2), int(base_y - h)
    # šešėlis ant sienos (dešinėn)
    soft_shadow(canvas, (x0 + 26, y0 + 16, x0 + w + 40, base_y + 6), shadow, 34, ellipse=False)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h + w], w // 2, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(0.8))
    paste_arr(canvas, shade_rect(w, h, col, 1.04, 0.9, center=0.3, texture=0.012), x0, y0, m)


def disc(canvas, cx, cy, r, col, shadow=0.12):
    soft_shadow(canvas, (cx - r + 24, cy - r + 18, cx + r + 30, cy + r + 24), shadow, 36)
    d = 2 * r
    yy, xx = np.mgrid[0:d, 0:d]
    t = ((xx - r * 0.7) ** 2 + (yy - r * 0.6) ** 2) ** 0.5 / (d * 1.0)
    a = rgb(col)[None, None, :] * lerp(1.06, 0.9, np.clip(t, 0, 1))[..., None]
    m = Image.new("L", (d, d), 0)
    ImageDraw.Draw(m).ellipse([0, 0, d - 1, d - 1], fill=255)
    paste_arr(canvas, a, cx - r, cy - r, m.filter(ImageFilter.GaussianBlur(0.8)))


def cylinder(canvas, cx, base_y, w, h, col, top_col=None, texture=0.03, streaks=True):
    """Cilindras (postamentas): korpusas su cilindriniu šešėliavimu, viršaus elipsė – šviesesnė."""
    ry = max(10, int(w * 0.085))
    x0 = int(cx - w / 2)
    soft_shadow(canvas, (x0 - 10, base_y - ry, x0 + w + 70, base_y + ry + 16), 0.30, 22)  # kontaktinis
    body = shade_rect(w, h + ry, col, 1.12, 0.70, center=0.30, texture=texture, streaks=streaks)
    m = Image.new("L", (w, h + 2 * ry), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([0, ry, w - 1, h + ry], fill=255)
    d.ellipse([0, h, w - 1, h + 2 * ry - 1], fill=255)
    bm = Image.new("L", (w, h + 2 * ry), 0)
    bm.paste(m)
    full = np.zeros((h + 2 * ry, w, 3))
    full[ry:] = body[: h + ry]
    full[:ry] = body[:1]
    paste_arr(canvas, full, x0, base_y - h - ry, bm.filter(ImageFilter.GaussianBlur(0.7)))
    # viršus
    tc = top_col or col
    top = shade_rect(w, 2 * ry, tc, 1.18, 1.0, center=0.4, texture=texture * 0.7)
    tm = Image.new("L", (w, 2 * ry), 0)
    ImageDraw.Draw(tm).ellipse([0, 0, w - 1, 2 * ry - 1], fill=255)
    paste_arr(canvas, top, x0, base_y - h - ry, tm.filter(ImageFilter.GaussianBlur(0.7)))
    return base_y - h  # paviršiaus aukštis (y)


def block(canvas, cx, base_y, w, h, col, depth=26, texture=0.05, gloss=False):
    """Blokas: priekinė plokštuma ir siauras viršus (perspektyva iš šiek tiek aukščiau)."""
    x0 = int(cx - w / 2)
    soft_shadow(canvas, (x0 - 6, base_y - 14, x0 + w + 90, base_y + 22), 0.34, 22, ellipse=False)
    front = shade_rect(w, h, col, 1.06, 0.78, center=0.25, texture=texture)
    paste_arr(canvas, front, x0, base_y - h)
    top = shade_rect(w, depth, col, 1.30, 1.12, center=0.35, texture=texture * 0.8)
    paste_arr(canvas, top, x0, base_y - h - depth)
    # briaunos šviesa
    hl = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
    ImageDraw.Draw(hl).line([(x0, base_y - h), (x0 + w, base_y - h)], fill=(255, 255, 255, 70 if gloss else 45), width=2)
    canvas.alpha_composite(hl)
    return base_y - h - depth * 0.45


def gift_box(canvas, cx, base_y, w, h, lid=0.22):
    """Juoda dovanų dėžutė su auksine juostele ir VAIDORE linija."""
    top_y = block(canvas, cx, base_y, w, h, "#1b1b1b", depth=30, texture=0.02, gloss=True)
    x0 = int(cx - w / 2)
    d = ImageDraw.Draw(canvas)
    ly = int(base_y - h + h * lid)
    d.line([(x0, ly), (x0 + w, ly)], fill=(10, 10, 10, 255), width=3)
    gold = (196, 160, 98, 255)
    d.rectangle([x0 + int(w * 0.18), base_y - h + int(h * 0.48), x0 + int(w * 0.82), base_y - h + int(h * 0.49)], fill=gold)
    return top_y


def load_bottle(pid):
    im = Image.open(os.path.join(PUB, f"img/kvapai/{pid}-1.webp")).convert("RGBA")
    return im.crop(im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox())


def load_vial():
    im = Image.open(os.path.join(PUB, "img/meginukas.webp")).convert("RGBA")
    return im.crop(im.getbbox())


def place(canvas, obj, cx, base_y, height, light_dx=1.0, cast=0.22, contact=0.42, reflect=0.0, tint=None):
    """Objektas ant paviršiaus: kontaktinis šešėlis, krentantis šešėlis (šviesa iš kairės – į dešinę atgal),
    nebūtinas atspindys blizgiame paviršiuje."""
    k = height / obj.height
    o = obj.resize((max(1, int(obj.width * k)), int(height)), Image.LANCZOS)
    x0, y0 = int(cx - o.width / 2), int(base_y - o.height)
    a = o.split()[3]
    # krentantis šešėlis: siluetas suspaustas ir pakreiptas į dešinę
    sh_h = int(o.height * 0.22)
    sil = a.resize((o.width, sh_h), Image.LANCZOS).transform(
        (o.width + int(o.height * 0.55 * light_dx), sh_h), Image.AFFINE, (1, -0.55 * light_dx * o.height / sh_h * 0.45, 0, 0, 1, 0), Image.BICUBIC
    )
    lay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sm = Image.new("L", canvas.size, 0)
    sm.paste(sil.point(lambda v: int(v * cast)), (x0, base_y - sh_h))
    lay.putalpha(sm.filter(ImageFilter.GaussianBlur(max(6, o.width * 0.06))))
    canvas.alpha_composite(lay)
    soft_shadow(canvas, (x0 + o.width * 0.08, base_y - o.width * 0.05, x0 + o.width * 0.98, base_y + o.width * 0.07), contact, max(4, o.width * 0.05))
    if reflect:
        r = o.transpose(Image.FLIP_TOP_BOTTOM)
        ra = np.asarray(r).astype(float)
        fade = np.linspace(reflect, 0, r.height)[:, None] ** 1.4
        ra[..., 3] *= fade
        canvas.alpha_composite(Image.fromarray(ra.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(1.5)), (x0, base_y + 2))
    if tint is not None:  # šiltas kontrovinis apšvietimas (tamsiai scenai) – švelnus kraštų švytėjimas
        rim = Image.new("RGBA", o.size, tint + (0,))
        edge = a.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: min(150, int(v * 0.9)))
        rim.putalpha(edge)
        o = o.copy()
        o.alpha_composite(Image.composite(rim, Image.new("RGBA", o.size, (0, 0, 0, 0)), edge))
    canvas.alpha_composite(o, (x0, y0))


def finish(canvas, name):
    os.makedirs(OUT, exist_ok=True)
    out = grain(canvas, 1.8) if canvas.size == (W, H) else canvas.convert("RGB")
    out.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=86, method=6)
    print(f"✓ img/kategorijos/{name}.webp")


# ── Kompozicijos ─────────────────────────────────────────────────────────────
def ids_by(gender):
    cat = json.load(open(os.path.join(ROOT, "src/data/catalog.json"), encoding="utf8"))
    ps = sorted([p for p in cat["products"] if p.get("gender") == gender], key=lambda p: p.get("rank", 99))
    return [p["id"] for p in ps]


FLOOR = int(H * 0.80)


def women():
    c = to_img(studio("#efdcd3", "#e6cfc4", "#f3e4dc", light=(0.25, 0.1), glow=0.28, glow_col="#fff6f1"))
    arch(c, 560, FLOOR, 520, 900, "#e0c3b6", shadow=0.13)
    top = cylinder(c, 560, FLOOR, 330, 190, "#ead9cb", "#f3e7dc", texture=0.035)
    b = ids_by("moterims")
    place(c, load_bottle(b[0]), 560, int(top) + 4, 560, cast=0.16, contact=0.45)
    place(c, load_bottle(b[1]), 860, FLOOR + 30, 430, cast=0.2, contact=0.5)
    finish(c, "moterims")


def light_pool(canvas, cx, cy, rx, ry, col=(255, 236, 200), a=0.10):
    """Šviesos dėmė ant grindų (prožektorius iš viršaus)."""
    lay = Image.new("RGBA", canvas.size, col + (0,))
    lay.putalpha(blur_layer(canvas.size, lambda d: d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=int(255 * a)), 60))
    canvas.alpha_composite(lay)


def men():
    c = to_img(studio("#2b2c2f", "#1d1e21", "#2c2d31", light=(0.72, 0.16), glow=0.16, glow_col="#c9a46a"))
    light_pool(c, 560, FLOOR + 20, 520, 120, a=0.12)
    top = block(c, 640, FLOOR, 420, 330, "#3a3b3f", depth=34, texture=0.07, gloss=True)
    b = ids_by("vyrams")
    place(c, load_bottle(b[0]), 640, int(top) + 6, 560, cast=0.3, contact=0.6, reflect=0.0, tint=(214, 176, 110))
    place(c, load_bottle(b[1]), 300, FLOOR + 40, 440, cast=0.32, contact=0.6, reflect=0.14, tint=(214, 176, 110))
    finish(c, "vyrams")


def unisex(name="unisex", size=(1200, 1500)):
    """Unisex – ir plati versija (unisex-platus, 1800 × 900) telefono „Kategorijų“ skyriui per visą plotį."""
    global W, H, FLOOR
    W, H = size
    FLOOR = int(H * 0.80)
    k = H / 1500
    cx = W // 2 if W < H else int(W * 0.64)  # plačioje – kompozicija dešiniau, kairėje vieta užrašui
    c = to_img(studio("#e9e2d6", "#ded5c6", "#ebe4d8", light=(0.3, 0.12), glow=0.24, glow_col="#fffaf0"))
    disc(c, cx, int(H * 0.373), int(330 * k), "#d3c7b3", shadow=0.1)
    top = cylinder(c, cx, FLOOR, int(640 * k), int(92 * k), "#cdbfa9", "#ddd2c0", texture=0.03)
    b = ids_by("unisex")
    place(c, load_bottle(b[0]), cx - int(130 * k), int(top) + 6, int(560 * k), cast=0.18, contact=0.45)
    place(c, load_bottle(b[1] if len(b) > 1 else b[0]), cx + int(160 * k), int(top) + 6, int(470 * k), cast=0.18, contact=0.45)
    finish(c, name)
    W, H = 1200, 1500
    FLOOR = int(H * 0.80)


def samples():
    c = to_img(studio("#f1e8d6", "#e8dcc4", "#f3ebdb", light=(0.3, 0.1), glow=0.26, glow_col="#fffaf0"))
    top = block(c, 600, FLOOR, 900, 70, "#e3d5bc", depth=40, texture=0.03)
    v = load_vial()
    for i, x in enumerate(range(280, 980, 116)):
        place(c, v, x, int(top) + 6, 420 - (i % 2) * 22, cast=0.14, contact=0.35)
    finish(c, "meginukai")


def sets():
    c = to_img(studio("#e3ddd5", "#d6cec4", "#e4ded6", light=(0.3, 0.12), glow=0.24))
    allp = ids_by("unisex") + ids_by("moterims") + ids_by("vyrams")
    place(c, load_bottle(allp[0]), 860, FLOOR + 10, 520, cast=0.2, contact=0.45)
    bx, base, bw, bh = 470, FLOOR + 40, 560, 230
    top = gift_box(c, bx, base, bw, bh)
    v = load_vial()
    for x in range(296, 660, 72):
        place(c, v, x, int(top) + 150, 330, cast=0.0, contact=0.0)
    # priekinė dėžutės sienelė – virš mėginukų apačios
    x0 = int(bx - bw / 2)
    paste_arr(c, shade_rect(bw, bh, "#1b1b1b", 1.06, 0.8, center=0.25, texture=0.02), x0, base - bh)
    d = ImageDraw.Draw(c)
    d.line([(x0, base - bh), (x0 + bw, base - bh)], fill=(255, 255, 255, 60), width=2)
    d.rectangle([x0 + int(bw * 0.2), base - int(bh * 0.46), x0 + int(bw * 0.8), base - int(bh * 0.46) + 1], fill=(196, 160, 98, 255))
    finish(c, "rinkinys")


def fresh():
    c = to_img(studio("#e8e8e6", "#dcdcd9", "#e9e9e6", light=(0.3, 0.1), glow=0.24))
    s1 = block(c, 760, FLOOR, 420, 300, "#cfcfcb", depth=30, texture=0.04)
    s2 = block(c, 430, FLOOR, 360, 140, "#d8d8d4", depth=30, texture=0.04)
    cat = json.load(open(os.path.join(ROOT, "src/data/catalog.json"), encoding="utf8"))
    new = [p["id"] for p in sorted(cat["products"], key=lambda p: str(p.get("added", "")), reverse=True)]
    place(c, load_bottle(new[0]), 760, int(s1) + 6, 500, cast=0.16, contact=0.45)
    place(c, load_bottle(new[1]), 420, int(s2) + 6, 470, cast=0.16, contact=0.45)
    finish(c, "naujienos")


if __name__ == "__main__":
    women()
    men()
    unisex()
    unisex("unisex-platus", (1800, 900))
    samples()
    sets()
    fresh()
