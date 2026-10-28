"""The k-WM method diagram, split for the write-up's two tabs: next-step (panels a and c of the paper's
figure 2) and k-WM (panels b and d), each with training above inference.

    python3 _tools/kwm/method.py

Source: the talk's animated figure, k-wm-CoRL-workshop-long/slides/figs/method_anim.svg (built by
slides/tools/build_method_svg.py), whose groups carry a build step in data-ms; site.js plays them.
Text outside the coloured boxes takes the page colour; text inside stays dark. Fonts are left to the page.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webfig  # noqa: E402

SRC = "/home_shared/grail_alex/wm_planning/k-wm-CoRL-workshop-long/slides/figs/method_anim.svg"
VIEW_W, VIEW_Y, VIEW_H = 1022, 8, 1020  # one scale for both tabs, each pair of panels centred
TABS = {  # name -> (panels, x range of their content in the source, label)
    "next": (("a", "c"), (20, 746), "Next-step world model: training with teacher forcing, and inference by "
                                     "k sequential predictor calls, each fed the previous prediction"),
    "kwm": (("b", "d"), (764, 1782), "k-WM: training on k future latents at once, with the last context "
                                      "latent repeated at the future positions, and inference in one call"),
}


def group(s, start):
    """The <g ...>...</g> element that opens at index start."""
    depth, i = 0, start
    for m in re.finditer(r"<g\b|</g>", s[start:]):
        depth += 1 if m.group() == "<g" else -1
        if depth == 0:
            return s[start:start + m.end()]
    raise ValueError("unbalanced group")


def panel(s, name):
    return group(s, s.index(f'<g id="ms-{name}"'))


def boxes(p):
    b = [(float(x), float(y), float(w), float(h)) for x, y, w, h in
         re.findall(r'<rect[^>]*? x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"', p)]
    b += [(float(cx) - float(r), float(cy) - float(r), 2 * float(r), 2 * float(r)) for cx, cy, r in
          re.findall(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', p) if float(r) > 10]
    return b


def recolour(p):
    bx = boxes(p)

    def text(m):
        tag = m.group(0)
        x, y = float(re.search(r' x="([-\d.]+)"', tag).group(1)), float(re.search(r' y="([-\d.]+)"', tag).group(1))
        size = float(re.search(r'font-size="([\d.]+)"', tag).group(1))
        y -= 0.35 * size   # the middle of the x-height, not the baseline
        inside = any(bx0 <= x <= bx0 + bw and by0 <= y <= by0 + bh for bx0, by0, bw, bh in bx)
        return tag if inside else tag.replace('fill="black"', 'fill="currentColor"')

    p = re.sub(r'<text [^>]*fill="black"[^>]*>', text, p)
    p = p.replace('stroke="#53636f"', 'stroke="currentColor" stroke-opacity="0.7"')
    p = re.sub(r' font-family="[^"]*"', "", p)
    p = re.sub(r'(<text [^>]*>)\([a-d]\) ', r"\1", p)   # drop the paper's panel letters from the titles
    return p


def main():
    s = open(SRC).read()
    defs = re.search(r"<defs>.*?</defs>", s, flags=re.S).group(0)
    for name, (panels, (x0, x1), label) in TABS.items():
        d = defs.replace('id="m-flow"', f'id="m-flow-{name}"').replace('id="m-pred"', f'id="m-pred-{name}"')
        d = d.replace('fill="#53636f"', 'fill="currentColor" fill-opacity="0.7"')
        body = "\n".join(recolour(panel(s, p)) for p in panels)
        body = body.replace("url(#m-flow)", f"url(#m-flow-{name})").replace("url(#m-pred)", f"url(#m-pred-{name})")
        vx = x0 - (VIEW_W - (x1 - x0)) / 2
        svg = (f'<svg class="method" fill="currentColor" viewBox="{vx:g} {VIEW_Y} {VIEW_W} {VIEW_H}" width="736" '
               f'height="{round(736 * VIEW_H / VIEW_W)}" role="img" aria-label="{label}" '
               f'xmlns="http://www.w3.org/2000/svg">\n{d}\n{body}\n</svg>')
        svg = webfig.compact(svg)
        path = os.path.join(webfig.INCLUDES, f"fig-kwm-method-{name}.svg")
        with open(path, "w") as f:
            f.write(svg + "\n")
        print("wrote", path, f"{len(svg) // 1024} KB")


if __name__ == "__main__":
    main()
