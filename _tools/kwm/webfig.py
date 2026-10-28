"""Shared bits for the k-WM write-up figures: the site's Charter font for matplotlib, and the
post-processing that turns a matplotlib SVG into an inline, theme-aware include.

Ink is drawn in sentinel colours and swapped for currentColor afterwards, so the figure takes
the page's text colour in both themes; white marker edges become the page background (--bg).
"""
import glob
import os
import re

import matplotlib
from matplotlib import font_manager

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(HERE))
INCLUDES = os.path.join(SITE, "_includes")
PAPER = "/home_shared/grail_alex/wm_planning/dino_wm_private/paper"

INK, EDGE, GRID, PAGE = "#010101", "#020202", "#030303", "#fefefe"  # sentinels


def fonts():
    """Register the site's Charter (woff2 -> ttf, cached next to this file) so the layout is
    measured with the face the page renders it in."""
    cache = os.path.join(HERE, ".fonts")
    os.makedirs(cache, exist_ok=True)
    from fontTools.ttLib import TTFont
    for f in glob.glob(os.path.join(SITE, "assets/fonts/*.woff2")):
        out = os.path.join(cache, os.path.basename(f).replace(".woff2", ".ttf"))
        if not os.path.exists(out):
            t = TTFont(f)
            t.flavor = None
            t.save(out)
        font_manager.fontManager.addfont(out)


def rc(size=10):
    fonts()
    matplotlib.rcParams.update({
        "svg.fonttype": "none",
        "font.family": "Charter",
        "mathtext.fontset": "custom", "mathtext.rm": "Charter", "mathtext.it": "Charter:italic",
        "mathtext.bf": "Charter:bold",
        "font.size": size, "axes.titlesize": size + 1.5, "axes.labelsize": size,
        "xtick.labelsize": size - 0.5, "ytick.labelsize": size - 0.5, "legend.fontsize": size,
        "text.color": INK, "axes.labelcolor": INK, "xtick.labelcolor": INK, "ytick.labelcolor": INK,
        "axes.edgecolor": EDGE, "xtick.color": EDGE, "ytick.color": EDGE, "grid.color": GRID,
        "axes.linewidth": 0.8, "xtick.major.width": 0.8, "ytick.major.width": 0.8,
        "xtick.major.size": 3.5, "ytick.major.size": 3.5, "grid.linewidth": 0.7,
        "axes.spines.top": False, "axes.spines.right": False, "axes.axisbelow": True,
        "legend.frameon": False,
        "savefig.bbox": None, "savefig.pad_inches": 0, "savefig.transparent": True,
    })


def compact(s):
    """Smaller and safer for inlining: matplotlib's `*{...}` style would leak into the page's other
    SVGs, so it becomes attributes on the root; group ids go (nothing references them); numbers
    are rounded; indentation is dropped."""
    s = re.sub(r'<defs>\s*<style type="text/css">\*\{([^}]*)\}</style>\s*</defs>', "", s)
    s = s.replace("<svg ", '<svg stroke-linejoin="round" stroke-linecap="butt" ', 1)
    s = re.sub(r'<g id="[^"]*"', "<g", s)
    s = re.sub(r"(\d+\.\d{2})\d+", r"\1", s)
    s = re.sub(r"\n\s*", "\n", s)
    s = re.sub(r'(?<=[\d"])\n(?=[LCMz])', " ", s)   # path data stays on one line
    return "\n".join(l for l in s.splitlines() if l.strip())


def write(fig, name, label, width=736):
    """Save fig as _includes/<name>.svg, inlined and themed. width: CSS px at full column width."""
    import io
    buf = io.StringIO()
    fig.savefig(buf, format="svg")
    s = buf.getvalue()
    s = s[s.index("<svg"):]
    s = re.sub(r"<metadata>.*?</metadata>\s*", "", s, flags=re.S)
    s = re.sub(r'\s*xmlns:xlink="[^"]*"', "", s)
    s = s.replace("xlink:href", "href")
    # ink
    s = s.replace(f"fill: {INK}", "fill: currentColor").replace(f"stroke: {INK}", "stroke: currentColor")
    s = s.replace(f"fill: {EDGE}", "fill: currentColor; fill-opacity: 0.55")
    s = s.replace(f"stroke: {EDGE}", "stroke: currentColor; stroke-opacity: 0.55")
    s = s.replace(f"stroke: {GRID}", "stroke: currentColor; stroke-opacity: 0.14")
    s = s.replace(f"stroke: {PAGE}", "stroke: var(--bg)").replace(f"fill: {PAGE}", "fill: var(--bg)")
    # size: scale the pt canvas to the column; the page caps it at 100% of the column
    m = re.search(r'width="([\d.]+)pt" height="([\d.]+)pt"', s)
    w, h = float(m.group(1)), float(m.group(2))
    s = s.replace(m.group(0), f'width="{width}" height="{round(width * h / w)}" role="img" aria-label="{label}"')
    s = compact(s)
    path = os.path.join(INCLUDES, f"{name}.svg")
    with open(path, "w") as f:
        f.write(s + "\n")
    print("wrote", path, f"{len(s) // 1024} KB")
