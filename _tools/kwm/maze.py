"""Latent distance to an anchor cell on Maze, for the k-WM write-up.

    python3 _tools/kwm/maze.py

Same data and drawing as the paper's figures/maze_anchor.pdf (dino_wm_private/paper/plots/maze_anchor.py,
reading paper/numbers/rollout/maze_anchor.json, which was built from the cluster's anchor_all.json), with
the frozen-CLS and k = 2 columns left out so that each cell stays legible in the write-up column.
"""
import json
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webfig  # noqa: E402

sys.path.insert(0, webfig.PAPER)
import style  # noqa: E402  (its colour ramp only; rcParams come from webfig)

WALL, EMPTY, STAR = "#d6dbe0", "#ffffff", "#eb6834"
ANCHORS = [0, 1, 4, 7]           # the paper's four rows
HORIZONS = [1, 4, 8, 16]
W = 7.6                          # inches; the column scales it


def main():
    webfig.rc(size=9.5)
    d = json.load(open(os.path.join(style.NUMBERS, "rollout", "maze_anchor.json")))
    free = np.array(d["free"], dtype=bool)
    cols = [("corridor distance", "geo")] + [(f"$k = {k}$", str(k)) for k in HORIZONS]
    cmap = style.SEQ_CMAP.reversed()   # near = dark
    cmap.set_bad(WALL)
    vgeo = 8

    h, w = free.shape
    n, m, wsp, hsp = len(cols), len(ANCHORS), 0.06, 0.08
    top_in, bot_in, left, right = 0.24, 0.56, 0.005, 0.995
    ph = W * (right - left) / (n + wsp * (n - 1)) * h / w
    H = ph * (m + hsp * (m - 1)) + top_in + bot_in
    fig = plt.figure(figsize=(W, H))
    fig.patch.set_visible(False)
    gs = fig.add_gridspec(m, n, left=left, right=right, bottom=bot_in / H, top=1 - top_in / H, wspace=wsp, hspace=hsp)
    for i, ai in enumerate(ANCHORS):
        A = d["anchors"][ai]
        ar, ac = A["anchor"]
        for j, (title, key) in enumerate(cols):
            ax = fig.add_subplot(gs[i, j])
            y = np.array(A["geo"] if key == "geo" else d["runs"][key][ai], dtype=float)
            seen = free & ~np.isnan(y)
            ax.imshow(np.ma.masked_where(~free, np.ones_like(y)), cmap=matplotlib.colors.ListedColormap([EMPTY]),
                      interpolation="nearest")
            im = ax.imshow(np.ma.masked_where(~seen, y), cmap=cmap, vmin=0, vmax=vgeo if key == "geo" else 1.2,
                           interpolation="nearest")
            ax.plot((ac + .7) / d["size"] - .5, (ar + .7) / d["size"] - .5, marker="*", ms=8, color=STAR,
                    mec="white", mew=.5, ls="None")
            ax.set_xticks([])
            ax.set_yticks([])
            for sp in ax.spines.values():
                sp.set_visible(False)
            if i == 0:
                ax.set_title(title, pad=4)
            if key == "geo":
                im_geo = im
    bw = 1.7 / W
    for x, cim, lab, ticks in [(0.44 - bw, im_geo, "corridor distance (blocks)", [0, 4, 8]),
                               (0.56, im, "latent sq. distance (1 = random pair)", [0, .6, 1.2])]:
        cb = fig.colorbar(cim, cax=fig.add_axes([x, 0.2 / H, bw, 0.08 / H]), ticks=ticks, orientation="horizontal")
        cb.ax.set_title(lab, pad=3)
        cb.ax.tick_params(length=0, pad=2)
        cb.outline.set_visible(False)
    webfig.write(fig, "fig-kwm-maze",
                 "Maze cells coloured by distance to an anchor cell, four anchors as rows: corridor distance, then "
                 "latent distance for DINO FT trained with k = 1, 4, 8 and 16; the near region follows the corridors "
                 "as k grows")


if __name__ == "__main__":
    main()
