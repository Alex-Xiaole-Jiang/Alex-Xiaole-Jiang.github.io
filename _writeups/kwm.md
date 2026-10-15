---
meta: ICLR 2027, under review · co-first author
---
When a robot plans, it imagines what will happen if it takes some actions, then picks the actions whose imagined future looks best. The usual world model imagines one step at a time, so a long plan means many calls in a row.

*k*-WM trains the model to predict a whole stretch of future states in one go.

Across three families of world models and four control tasks, long-horizon planning succeeded 37% more often with gradient-based planning and 15% more often with sampling-based planning, and ran up to 3.3× faster. The trained model's internal space also ends up mirroring the real layout of the environment.

[what you'd like to try next]
{: .todo}
