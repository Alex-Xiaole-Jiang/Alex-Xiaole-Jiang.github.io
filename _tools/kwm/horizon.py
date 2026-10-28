"""Long-horizon planning, one SVG per world-model family, for the tabs in the k-WM write-up.

    python3 _tools/kwm/horizon.py

Reads the paper's numbers through dino_wm_private/paper/plots/horizon_planning_collab.py (same parser
and rows as figures/horizon_plot_4.pdf and the talk's slide_horizon_*.svg). Every family uses the same
canvas, axes and x offsets, so switching tabs moves nothing but the curves.
"""
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webfig  # noqa: E402

sys.path.insert(0, webfig.PAPER)
sys.path.insert(0, os.path.join(webfig.PAPER, "plots"))
import horizon_planning_collab as hc  # noqa: E402

HORIZONS = np.array(hc.HORIZONS)
ENVS = [("Push-T", "Push-T"), ("Maze (large expert)", "Maze"), ("Cube", "Cube"), ("Reacher", "Reacher")]
PLANNERS = [("CEM", "sampling-based (CEM)"), ("GD", "gradient-based (GD)")]
BLUE, AMBER, GREEN = "#2A78D6", "#EDA100", "#1BAF7A"
FAMILIES = {  # tab -> (ours row, next-step row, colour, marker, aria label)
    "dinoft": ("DINO FT (ours)", "DINO FT next-step", BLUE, "o", "DINO FT"),
    "lewm": ("LeWM (ours)", "LeWM AdaLN", AMBER, "D", "LeWM"),
    "dinowm": ("DINO-WM (ours)", "DINO-WM next-step", GREEN, "s", "DINO-WM"),
}
OFFSET = {k: o for k, o in zip(FAMILIES, np.linspace(-0.2, 0.2, len(FAMILIES)))}
LW, MS = 1.7, 5.5


def draw(rows, fam):
    ours, base, color, marker, label = FAMILIES[fam]
    fig_rows = {(r["planner"], r["env"], r["method"]): r for r in rows if r["fig"]}
    fig, axes = plt.subplots(2, 4, figsize=(7.6, 4.1), sharex=True, sharey=True)
    fig.patch.set_visible(False)
    for i, (planner, _) in enumerate(PLANNERS):
        for j, (env, title) in enumerate(ENVS):
            ax = axes[i, j]
            ax.patch.set_visible(False)
            ax.grid(axis="y")
            for method, ls, off in [(ours, "-", OFFSET[fam] + 0.08), (base, "--", OFFSET[fam] - 0.08)]:
                r = fig_rows.get((planner, env, method))
                if r is None:
                    continue
                x, m, sd = HORIZONS + off, r["mean"], r["std"]
                ok = ~np.isnan(m)
                ax.plot(x, m, color=color, ls=ls, lw=LW, zorder=3)
                ax.errorbar(x[ok], m[ok], yerr=sd[ok], fmt="none", ecolor=color, elinewidth=1, capsize=0,
                            alpha=0.55, zorder=2)
                full, part = ok & ~r["partial"], ok & r["partial"]
                ax.plot(x[full], m[full], ls="none", marker=marker, ms=MS, color=color, mec=webfig.PAGE,
                        mew=0.8, zorder=4)
                ax.plot(x[part], m[part], ls="none", marker=marker, ms=MS, mfc=webfig.PAGE, mec=color,
                        mew=1.3, zorder=4)
            ax.set_xlim(4.5, 10.5)
            ax.set_ylim(0, 100)
            ax.set_xticks(HORIZONS)
            ax.set_yticks([0, 25, 50, 75, 100])
            if i == 0:
                ax.set_title(title, pad=6)
            if i == 1:
                ax.set_xlabel("planning horizon $H$")
            if j == 0:
                ax.set_ylabel(f"{planner}\nsuccess rate (%)")
            ax.tick_params(labelleft=(j == 0))
    handles = [Line2D([], [], color=color, ls="-", lw=LW, marker=marker, ms=MS, mec=webfig.PAGE, mew=0.8,
                      label=f"{label} with $k$-WM"),
               Line2D([], [], color=color, ls="--", lw=LW, marker=marker, ms=MS, mec=webfig.PAGE, mew=0.8,
                      label=f"{label}, next-step")]
    fig.legend(handles=handles, loc="upper center", ncol=2, bbox_to_anchor=(0.5, 1.0), handlelength=2.4,
               columnspacing=2.0, handletextpad=0.6)
    fig.subplots_adjust(left=0.095, right=0.995, top=0.84, bottom=0.12, hspace=0.18, wspace=0.08)
    webfig.write(fig, f"fig-kwm-horizon-{fam}",
                 f"Success rate against planning horizon 5 to 10 on Push-T, Maze, Cube and Reacher, "
                 f"with CEM and gradient descent: {label} with k-WM (solid) against its next-step version (dashed)")
    plt.close(fig)


def main():
    webfig.rc(size=9.5)
    rows = hc.load()
    for fam in FAMILIES:
        draw(rows, fam)


if __name__ == "__main__":
    main()
