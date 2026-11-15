# VAIDORE logotipas – tas pats šriftas ir raidžių tarpai kaip buteliuko etiketėje (TeX Gyre Termes, GUST Font License).
#   python3 tools/make-logo.py   → src/partials/logo.svg (kontūrai, fill="currentColor", be šrifto failo)
#                                  src/public/favicon.svg (auksinė „V“ juodame fone; PNG ikonos – tools/make-icons.mjs)
# Naudoja: header'is (partials/header.html, @partial), JS logoHTML() (paima iš header'io), statiniai puslapiai
# ({{logo}} – tools/build-site.mjs), socialinių tinklų paveikslai (tools/make-og.mjs).
# Raidžių tarpas TRACK – kaip etiketėje (tools/assets/vaidore-scena.png: plotis ≈ 6,4 × didžiosios raidės aukščio).
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyretermes-regular.otf"
TEXT, TRACK = "VAIDORE", 0.02


def kern(gpos, a, b):
    v = 0
    for lk in gpos.LookupList.Lookup:
        if lk.LookupType != 2:
            continue
        for st in lk.SubTable:
            if a not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                for pv in st.PairSet[st.Coverage.glyphs.index(a)].PairValueRecord:
                    if pv.SecondGlyph == b and pv.Value1:
                        v += getattr(pv.Value1, "XAdvance", 0) or 0
            else:
                r = st.Class1Record[st.ClassDef1.classDefs.get(a, 0)].Class2Record[st.ClassDef2.classDefs.get(b, 0)]
                if r.Value1:
                    v += getattr(r.Value1, "XAdvance", 0) or 0
    return v


def main():
    f = TTFont(FONT)
    gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm
    gpos = f["GPOS"].table if "GPOS" in f else None
    names = [cmap[ord(c)] for c in TEXT]
    pen, bounds, x = SVGPathPen(gs, ntos=lambda v: str(round(v))), BoundsPen(gs), 0
    for i, n in enumerate(names):
        gs[n].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        gs[n].draw(TransformPen(bounds, (1, 0, 0, -1, x, 0)))
        x += gs[n].width
        if i < len(names) - 1:
            x += (kern(gpos, n, names[i + 1]) if gpos else 0) + TRACK * upm
    x0, y0, x1, y1 = (round(v) for v in bounds.bounds)
    d = pen.getCommands()
    svg = (f'<svg class="wordmark" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" fill="currentColor" role="img" aria-label="Vaidore">'
           f'<path d="{d}"/></svg>\n')
    out = os.path.join(ROOT, "src/partials/logo.svg")
    open(out, "w").write(svg)
    print(f"{out}: {x1 - x0}×{y1 - y0} ({(x1 - x0) / (y1 - y0):.2f}:1), {len(svg)} B")
    # Ženklas: „V“ – kaip etiketėje po VAIDORE (auksas ant juodos)
    vp, vb = SVGPathPen(gs, ntos=lambda v: str(round(v))), BoundsPen(gs)
    gs[cmap[ord("V")]].draw(TransformPen(vp, (1, 0, 0, -1, 0, 0)))
    gs[cmap[ord("V")]].draw(TransformPen(vb, (1, 0, 0, -1, 0, 0)))
    a, b, c, e = vb.bounds
    k = 34 / (e - b)  # V aukštis – 34 iš 64
    tx, ty = 32 - (a + c) / 2 * k, 32 - (b + e) / 2 * k + 1
    fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111111"/>'
           f'<path transform="translate({tx:.2f} {ty:.2f}) scale({k:.5f})" fill="#C9A35E" d="{vp.getCommands()}"/></svg>\n')
    open(os.path.join(ROOT, "src/public/favicon.svg"), "w").write(fav)
    print("src/public/favicon.svg")


if __name__ == "__main__":
    main()
