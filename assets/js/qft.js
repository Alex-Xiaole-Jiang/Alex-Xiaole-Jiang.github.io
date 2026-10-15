// Page background: a free massless complex scalar field in 2+1 dimensions,
// drawn as its Brownian loop soup.
//
// The loops live in Euclidean spacetime (x, y, tau). A plane of constant tau
// rises slowly through them, and the last stretch of each loop below the plane
// is drawn as a thread that fades with age. A loop crossing the plane upward is
// a particle, downward an antiparticle, each with its own colour, so pairs are
// created where a loop has a minimum in tau and annihilate where it has a
// maximum.
//
// The soup is a Poisson process: per unit volume, dt/t * (2 pi t)^(-3/2) loops
// of duration (proper time) in [t, t + dt]. It is generated in slabs of tau
// just ahead of the plane and dropped once the plane has left it behind, so
// the animation never repeats. Leaving out loops shorter than MIN_DURATION and
// walking the rest in steps of STEP is the same as looking at the field at a
// resolution of about sqrt(MIN_DURATION); leaving out those longer than
// MAX_DURATION is an infrared cutoff, like a small mass. Space is periodic:
// the screen is a torus. Lengths are in units of UNIT_PX CSS pixels.
//
// The colours come from site.css (--field-plus and --field-minus), so they
// follow the light and dark themes. Threads are drawn with plain alpha blending: additive ("lighter") on dark
// and "multiply" on light would be the physical choices, but at these
// opacities they look the same and cost 3 to 5 times as much to paint.
(() => {
  const canvas = document.getElementById("qft");
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx || !window.Path2D) return;

  // physics
  const UNIT_PX = 30;
  const MIN_DURATION = 16;     // shortest loop kept
  const MAX_DURATION = 600;    // longest
  const STEP = 0.3;            // proper time per walk step
  const MAX_STEPS = 1500;      // per loop; longer loops take coarser steps
  const SMOOTH_PASSES = 2;     // (1,2,1)/4 filter round each loop: soft curves, same large-scale shape

  // look
  const DEPTH = 14;            // how far back in tau threads reach
  const SPEED = 0.25;          // tau per second
  const AGE_BANDS = 14;        // threads fade in this many steps
  const FADE = 1.6;            // opacity falls as (1 - age/DEPTH)^FADE
  const ALPHA = 0.32;          // opacity of the newest thread
  const LINE = 1;              // width of the newest thread, CSS px
  const TAIL = 0.5;            // the oldest is this much as wide
  const DOT_RADIUS = 0.9;      // CSS px
  const DOT_ALPHA = 0.72;
  const FPS = 15;              // the motion is slow, so this is plenty

  // Each loop keeps the tau-range of every block of BLOCK steps, so drawing can
  // skip the parts that are nowhere near the plane.
  const BLOCK = 24;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // In the phone layout the text covers the whole screen, so the background
  // isn't drawn at all. Keep in sync with site.css.
  const roomy = window.matchMedia("(min-width: 36em)");
  const dark = window.matchMedia("(prefers-color-scheme: dark)");

  // particles and threads moving up in tau, antiparticles and threads moving down
  let plus = "", minus = "";
  function readColors() {
    const style = getComputedStyle(document.documentElement);
    plus = style.getPropertyValue("--field-plus").trim();
    minus = style.getPropertyValue("--field-minus").trim();
  }

  let width = 0, height = 0;   // viewport, in length units; 0 while not drawn
  let tau = 0;                 // height of the plane
  let loops = [];
  let bins = [];

  /* ---------- random numbers ---------- */

  let spareGauss = null;
  function gauss() {           // standard normal, Box-Muller
    if (spareGauss !== null) {
      const g = spareGauss;
      spareGauss = null;
      return g;
    }
    const r = Math.sqrt(-2 * Math.log(1 - Math.random()));
    const a = 2 * Math.PI * Math.random();
    spareGauss = r * Math.sin(a);
    return r * Math.cos(a);
  }

  function poisson(mean) {
    if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss()));
    const limit = Math.exp(-mean);
    let k = 0;
    for (let p = Math.random(); p > limit; p *= Math.random()) k++;
    return k;
  }

  /* ---------- the soup ---------- */

  // Loop durations are split into log-spaced bins. Bin [lo, hi] holds
  // C * (2/3) * (lo^-1.5 - hi^-1.5) loops per unit volume, C = (2 pi)^-1.5.
  // Each bin is generated in its own slabs: about as thick as its loops are
  // wide, and kept `reach` ahead of the plane, which is further than its loops
  // extend in tau.
  function makeBins() {
    const count = Math.max(3, Math.ceil(Math.log(MAX_DURATION / MIN_DURATION) / Math.log(1.8)));
    const ratio = Math.pow(MAX_DURATION / MIN_DURATION, 1 / count);
    const C = Math.pow(2 * Math.PI, -1.5);
    const out = [];
    for (let b = 0; b < count; b++) {
      const lo = MIN_DURATION * Math.pow(ratio, b);
      const hi = lo * ratio;
      out.push({
        lo,
        hi,
        density: C * (2 / 3) * (Math.pow(lo, -1.5) - Math.pow(hi, -1.5)),
        slab: Math.max(0.5, Math.sqrt(lo)),
        reach: 3 * Math.sqrt(hi) + 0.5,
        front: 0,              // generated up to here
      });
    }
    return out;
  }

  // a duration in [lo, hi] with density t^-2.5, by inverting the CDF
  function sampleDuration(bin) {
    const a = Math.pow(bin.lo, -1.5);
    const b = Math.pow(bin.hi, -1.5);
    return Math.pow(a + (b - a) * Math.random(), -2 / 3);
  }

  let scratch = new Float32Array(0);

  // A closed Brownian path (a Brownian bridge) of the given duration through
  // (x0, y0, z0), z being tau. Points are stored flat as x, y, z; the last
  // point repeats the first.
  function makeLoop(x0, y0, z0, duration) {
    const n = Math.max(8, Math.min(MAX_STEPS, Math.round(duration / STEP)));
    const sd = Math.sqrt(duration / n);
    const pts = new Float32Array(3 * (n + 1));

    let x = 0, y = 0, z = 0;
    for (let k = 1; k <= n; k++) {
      x += sd * gauss();
      y += sd * gauss();
      z += sd * gauss();
      pts[3 * k] = x;
      pts[3 * k + 1] = y;
      pts[3 * k + 2] = z;
    }
    // a free walk minus its drift is a bridge
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      pts[3 * k] += x0 - f * x;
      pts[3 * k + 1] += y0 - f * y;
      pts[3 * k + 2] += z0 - f * z;
    }

    if (scratch.length < 3 * n) scratch = new Float32Array(3 * MAX_STEPS);
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
      for (let k = 0; k < n; k++) {
        const prev = 3 * ((k + n - 1) % n), here = 3 * k, next = 3 * ((k + 1) % n);
        for (let c = 0; c < 3; c++) {
          scratch[here + c] = 0.25 * (pts[prev + c] + 2 * pts[here + c] + pts[next + c]);
        }
      }
      pts.set(scratch.subarray(0, 3 * n));
      pts.copyWithin(3 * n, 0, 3);
    }

    const blocks = Math.ceil(n / BLOCK);
    const blockLo = new Float32Array(blocks), blockHi = new Float32Array(blocks);
    let lo = Infinity, hi = -Infinity;
    for (let b = 0; b < blocks; b++) {
      let bl = Infinity, bh = -Infinity;
      const end = Math.min(n, (b + 1) * BLOCK);
      for (let k = b * BLOCK; k <= end; k++) {
        const zk = pts[3 * k + 2];
        if (zk < bl) bl = zk;
        if (zk > bh) bh = zk;
      }
      blockLo[b] = bl;
      blockHi[b] = bh;
      lo = Math.min(lo, bl);
      hi = Math.max(hi, bh);
    }

    return { pts, n, blockLo, blockHi, lo, hi };
  }

  function fill(bin) {
    while (bin.front < tau + bin.reach) {
      const count = poisson(bin.density * width * height * bin.slab);
      for (let i = 0; i < count; i++) {
        loops.push(makeLoop(
          width * Math.random(),
          height * Math.random(),
          bin.front + bin.slab * Math.random(),
          sampleDuration(bin)));
      }
      bin.front += bin.slab;
    }
  }

  // generate ahead of the plane, forget what is entirely behind its threads
  function stream() {
    bins.forEach(fill);
    const cut = tau - DEPTH - 0.5;
    loops = loops.filter((loop) => loop.hi >= cut);
  }

  // a fresh soup, already filled below the plane so the first frame is complete
  function reset() {
    tau = 0;
    loops = [];
    bins = makeBins();
    for (const bin of bins) {
      bin.front = -bin.reach - DEPTH;
      fill(bin);
    }
  }

  /* ---------- drawing ---------- */

  const wrap = (v, period) => ((v % period) + period) % period;

  // Threads are batched into one path per (colour, age band). A run is a
  // stretch of consecutive points of one loop in one band; it is drawn as
  // quadratic curves through the midpoints, which smooths the corners.
  let bands = [];
  const runX = [], runY = [];
  let runBand = -1;

  function endRun() {
    const m = runX.length;
    if (m >= 2) {
      const path = bands[runBand];
      path.moveTo(runX[0], runY[0]);
      for (let i = 1; i < m - 1; i++) {
        path.quadraticCurveTo(runX[i], runY[i], (runX[i] + runX[i + 1]) / 2, (runY[i] + runY[i + 1]) / 2);
      }
      path.lineTo(runX[m - 1], runY[m - 1]);
    }
    runX.length = 0;
    runY.length = 0;
    runBand = -1;
  }

  // Adds one loop's threads and crossings. A segment's age is how far below
  // the plane it is; segments younger than 0 are in the future, older than
  // DEPTH have faded out.
  function traceLoop(loop, particles, antiparticles) {
    const p = loop.pts, n = loop.n;
    let shiftX = 0, shiftY = 0;  // puts the current run's start inside the screen
    let lastSeg = -2;            // last segment added to the run, -2 if none

    for (let b = 0; b < loop.blockLo.length; b++) {
      if (loop.blockLo[b] > tau || loop.blockHi[b] < tau - DEPTH) {
        lastSeg = -2;
        continue;
      }
      const end = Math.min(n, (b + 1) * BLOCK);
      for (let i = b * BLOCK; i < end; i++) {
        let xa = p[3 * i], ya = p[3 * i + 1];
        let xb = p[3 * i + 3], yb = p[3 * i + 4];
        const za = p[3 * i + 2], zb = p[3 * i + 5];
        let ageA = tau - za, ageB = tau - zb;

        // Crossing the plane: a dot there, and the segment is cut at it, as
        // threads are the past only.
        if ((ageA < 0) !== (ageB < 0)) {
          const f = ageA / (ageA - ageB);
          const cx = xa + f * (xb - xa), cy = ya + f * (yb - ya);
          const sx = wrap(cx, width) * UNIT_PX, sy = wrap(cy, height) * UNIT_PX;
          const path = zb > za ? particles : antiparticles;
          path.moveTo(sx + DOT_RADIUS, sy);
          path.arc(sx, sy, DOT_RADIUS, 0, 2 * Math.PI);
          if (ageA < 0) {
            xa = cx;
            ya = cy;
            ageA = 0;
          } else {
            xb = cx;
            yb = cy;
            ageB = 0;
          }
        } else if (ageA < 0 || (ageA > DEPTH && ageB > DEPTH)) {
          endRun();
          lastSeg = -2;
          continue;
        }

        // colour by direction of travel in tau, over a few steps so it doesn't flicker
        const down = p[3 * Math.min(n, i + 3) + 2] < p[3 * Math.max(0, i - 2) + 2];
        const age = Math.min(AGE_BANDS - 1, Math.floor(((ageA + ageB) / 2 / DEPTH) * AGE_BANDS));
        const band = (down ? AGE_BANDS : 0) + age;

        // A new run when the thread breaks, changes band, or wanders more than
        // a unit off screen (then it is re-wrapped onto the screen).
        const offScreen = xa + shiftX < -1 || xa + shiftX > width + 1 ||
                          ya + shiftY < -1 || ya + shiftY > height + 1;
        if (lastSeg !== i - 1 || band !== runBand || offScreen) {
          endRun();
          shiftX = wrap(xa, width) - xa;
          shiftY = wrap(ya, height) - ya;
          runBand = band;
          runX.push((xa + shiftX) * UNIT_PX);
          runY.push((ya + shiftY) * UNIT_PX);
        }
        runX.push((xb + shiftX) * UNIT_PX);
        runY.push((yb + shiftY) * UNIT_PX);
        // a thread that has just come down through the plane ends there
        lastSeg = ageB === 0 && ageA > 0 ? -2 : i;
      }
    }
    endRun();
  }

  function draw() {
    const particles = new Path2D(), antiparticles = new Path2D();
    bands = [];
    for (let i = 0; i < 2 * AGE_BANDS; i++) bands.push(new Path2D());

    for (const loop of loops) {
      if (loop.lo <= tau && loop.hi >= tau - DEPTH) {
        traceLoop(loop, particles, antiparticles);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    bands.forEach((path, i) => {
      const age = ((i % AGE_BANDS) + 0.5) / AGE_BANDS;
      ctx.lineWidth = LINE * (1 - (1 - TAIL) * age);
      ctx.globalAlpha = ALPHA * Math.pow(1 - age, FADE);
      ctx.strokeStyle = i < AGE_BANDS ? plus : minus;
      ctx.stroke(path);
    });
    ctx.globalAlpha = DOT_ALPHA;
    ctx.fillStyle = plus;
    ctx.fill(particles);
    ctx.fillStyle = minus;
    ctx.fill(antiparticles);
    ctx.globalAlpha = 1;
  }

  /* ---------- size, animation, pausing ---------- */

  function resize() {
    if (!roomy.matches) {
      canvas.width = canvas.height = 0;
      width = height = 0;
      loops = [];
      return;
    }
    // One canvas pixel per CSS pixel, even on high-density screens: the
    // threads are faint enough that it barely shows, and it paints about 6
    // times faster.
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const w = innerWidth / UNIT_PX, h = innerHeight / UNIT_PX;
    // Phones resize the viewport as the address bar slides in and out; only
    // a real change of size gets a new soup.
    const changed = Math.abs(w - width) > 0.5 || Math.abs(h - height) > 0.25 * height;
    width = w;
    height = h;
    if (changed) reset();
    draw();
  }

  let raf = 0, lastTime = 0;

  // Time steps follow the real clock, so the speed doesn't depend on the frame
  // rate. A step is capped at 0.1 s, so the plane doesn't jump after a stall.
  function frame(now) {
    raf = 0;
    if (document.hidden || motion.matches || !roomy.matches) return;
    raf = requestAnimationFrame(frame);
    if (lastTime && now - lastTime < 1000 / (FPS + 1)) return;
    if (lastTime) tau += SPEED * Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    stream();
    draw();
  }

  function start() {
    if (raf || document.hidden || motion.matches || !roomy.matches) return;
    lastTime = 0;
    raf = requestAnimationFrame(frame);
  }

  readColors();
  resize();
  start();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  document.addEventListener("visibilitychange", start);
  const onLayoutChange = () => {
    resize();
    start();
  };
  const onThemeChange = () => {
    readColors();
    if (width) draw();
  };
  // the [night]/[day] switch (site.js) sets data-theme on the root
  new MutationObserver(onThemeChange).observe(document.documentElement, { attributeFilter: ["data-theme"] });
  if (motion.addEventListener) {
    motion.addEventListener("change", start);
    roomy.addEventListener("change", onLayoutChange);
    dark.addEventListener("change", onThemeChange);
  } else {                        // Safari < 14
    motion.addListener(start);
    roomy.addListener(onLayoutChange);
    dark.addListener(onThemeChange);
  }
})();
