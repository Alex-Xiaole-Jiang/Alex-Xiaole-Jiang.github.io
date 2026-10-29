---
# meta: ICLR 2027, under review · co-first author
---
The usual JEPA-style planning world model rolls out autoregressively, and that brings the standard problems of an RNN-like loop: errors accumulate along the rollout, and in gradient-based planning every step's Jacobian enters one long product, leaving a badly conditioned optimization problem. *k*-WM avoids the loop. Given a few context frames and $k$ actions, the world model predicts all $k$ future states at once; $k=1$ recovers the usual next-step world model. This change improves planning, and, more surprisingly, it also improves the latent geometry without any human prior. The last plot below is one example; the [project page](https://anon-k-wm.github.io/) has more analysis.

*k*-WM fits any world model with a transformer predictor: the loss target becomes the next $k$ latents instead of one, and at inference one forward pass rolls out $k$ steps. The second tab shows the next-step model for comparison.

<figure class="tabfig">
<p class="tabs">[<button type="button" class="tab" data-pane="kwm" aria-selected="true"><i>k</i>-WM</button>] [<button type="button" class="tab" data-pane="next" aria-selected="false">next-step</button>] [<button type="button" class="tab replay">replay</button>]</p>
<div class="pane" data-pane="kwm">{% include fig-kwm-method-kwm.svg %}</div>
<div class="pane" data-pane="next" hidden>{% include fig-kwm-method-next.svg %}</div>
<figcaption>Training above, inference below. The <i>c</i> context frames are teacher forced; “reg.” is whatever anti-collapse regularizer the base model uses. A next-step model predicts one latent per call and feeds it back in, so <i>k</i> steps take <i>k</i> calls. <i>k</i>-WM fills the future positions with copies of the last context latent and the future actions, and one call returns all <i>k</i> latents. The loss is averaged over the <i>k</i> steps, with no curriculum.</figcaption>
</figure>

We use $k=8$ and apply it to three families of world models: DINO-WM plans on frozen DINOv2 features, DINO FT fine-tunes DINOv2 end to end, and LeWM trains a small ViT from scratch with SIGReg. Each is compared with its own next-step version, trained identically otherwise.

<figure class="tabfig">
<p class="tabs">[<button type="button" class="tab" data-pane="dinoft" aria-selected="true">DINO FT</button>] [<button type="button" class="tab" data-pane="lewm" aria-selected="false">LeWM</button>] [<button type="button" class="tab" data-pane="dinowm" aria-selected="false">DINO-WM</button>]</p>
<div class="pane" data-pane="dinoft">{% include fig-kwm-horizon-dinoft.svg %}</div>
<div class="pane" data-pane="lewm" hidden>{% include fig-kwm-horizon-lewm.svg %}</div>
<div class="pane" data-pane="dinowm" hidden>{% include fig-kwm-horizon-dinowm.svg %}</div>
<figcaption>Success rate against the planning horizon on four tasks, with sampling-based planning (CEM) above and gradient-based planning (GD) below. Solid is the model with <i>k</i>-WM, dashed its next-step version. Mean and standard deviation over three seeds.</figcaption>
</figure>

My favorite result, though, is not about planning success but about representation learning. As $k$ grows, the encoder learns a latent that is more and more reflective of the features that the task requires. The plot below uses DINO FT on the Maze environment. We pick an anchor cell (the star) and color every other cell by how far its latent is from the anchor's. With next-step training, $k=1$, the latent mostly encodes local geometry and the map has a grid-like pattern. As $k$ grows, the latent increasingly groups cells by their distance along the corridors, and by $k=16$ the map looks like the corridor distance in the first column. ***A long-horizon prediction target induces a latent geometry that mirrors the task-relevant geometry, with no human prior about what matters.***

<figure class="wide">
{% include fig-kwm-maze.svg %}
<figcaption>DINO FT on Maze, one anchor per row. Left: distance along the corridors. Then: latent distance for models trained with <i>k</i> = 1, 4, 8 and 16, normalized so that two random frames are at distance 1.</figcaption>
</figure>
