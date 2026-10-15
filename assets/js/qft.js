// Page background: a free massless complex scalar field in 2+1 dimensions,
// drawn as its Brownian loop soup.
//
// The loops live in Euclidean spacetime (x, y, tau). A plane of constant tau
// rises slowly through them, and the last stretch of each loop below the plane
// is drawn as a thread that fades with age. A loop crossing the plane upward is
// a particle, downward an antiparticle, each with its own colour, so pairs are
// created where a loop has a minimum in tau and annihilate where it has a
// maximum, and both flash.
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
// follow the light and dark themes. Threads are drawn with plain alpha
// blending: additive ("lighter") on dark and "multiply" on light would be the
// physical choices, but at these opacities they look the same and cost 3 to 5
// times as much to paint.
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
  const SMOOTH_PASSES = 0;     // passes of a (1,2,1)/4 filter round each loop, softening the walk; 0 keeps it raw

  // look
  const DEPTH = 14;            // how far back in tau threads reach
  const STILL_DEPTH = 45;      // the same, when held still (below)
  const SPEED = 0.35;          // tau per second
  const AGE_BANDS = 14;        // threads fade in this many steps
  const FADE = 1.6;            // opacity falls as (1 - age/depth)^FADE
  const ALPHA = 0.32;          // opacity of the newest thread
  const LINE = 2.8;            // width of the newest thread, CSS px
  // Threads narrow to 1 px over this much of their fade and stay so: browsers
  // draw lines up to 1 px wide by a fast path, wider ones at several times the
  // cost, and most of the length is in the faint old part.
  const THICK = 0.2;
  const DOT_RADIUS = 2.1;      // CSS px
  const DOT_ALPHA = 0.72;
  const FLASH = 0.2;           // tau a creation or annihilation flashes for
  const FLASH_RADIUS = 9;      // CSS px, at the start; it shrinks as it fades
  const FLASH_ALPHA = 0.8;     // on the dark theme
  const INK_RADIUS = 7;        // the same on the light theme, where the spot is fuller
  const INK_ALPHA = 1;
  const FPS = 15;              // smooth enough at this speed

  // Each loop keeps the tau-range of every block of BLOCK steps, so drawing can
  // skip the parts that are nowhere near the plane.
  const BLOCK = 24;

  const root = document.documentElement;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // With reduced motion the soup holds still, unless the [animate] switch
  // (site.js) has set data-motion. Held still, it shows only the loops that
  // have closed below the plane, fading with age as usual but reaching
  // further back, and no particles, as nothing crosses the plane.
  const still = () => motion.matches && root.dataset.motion !== "on";
  // In the phone layout the text covers the whole screen, so the background
  // isn't drawn at all. Keep in sync with site.css.
  const roomy = window.matchMedia("(min-width: 36em)");
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : dark.matches);

  // particles and threads moving up in tau, antiparticles and threads moving
  // down; flashes are a soft spot in the text colour, as a pair is both
  let plus = "", minus = "";
  const spot = document.createElement("canvas");
  function readColors() {
    const style = getComputedStyle(root);
    plus = style.getPropertyValue("--field-plus").trim();
    minus = style.getPropertyValue("--field-minus").trim();

    const size = spot.width = spot.height = 64;
    const g = spot.getContext("2d");
    const glow = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Ink on paper reads fainter than the same spot of light on black, so on
    // the light theme the spot falls off more slowly.
    const stops = isDark() ? [1, 0.7, 0.15] : [1, 0.85, 0.35];
    glow.addColorStop(0, `rgba(0, 0, 0, ${stops[0]})`);
    glow.addColorStop(0.18, `rgba(0, 0, 0, ${stops[1]})`);
    glow.addColorStop(0.5, `rgba(0, 0, 0, ${stops[2]})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = "source-in";   // keep the shape, take the colour
    g.fillStyle = style.getPropertyValue("--text").trim();
    g.fillRect(0, 0, size, size);
  }

  let width = 0, height = 0;   // viewport, in length units; 0 while not drawn
  let tau = 0;                 // height of the plane
  let depth = DEPTH;           // DEPTH, or STILL_DEPTH when held still
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
      // the curve pieces of a block reach to the points either side of it
      const end = Math.min(n, (b + 1) * BLOCK);
      for (let k = b * BLOCK - 1; k <= end; k++) {
        const zk = pts[3 * ((k + n) % n) + 2];
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
    const cut = tau - STILL_DEPTH - 0.5;   // kept for when it is held still
    loops = loops.filter((loop) => loop.hi >= cut);
  }

  // a fresh soup, already filled below the plane so the first frame is complete
  function reset() {
    tau = 0;
    loops = [];
    bins = makeBins();
    for (const bin of bins) {
      bin.front = -bin.reach - STILL_DEPTH;
      fill(bin);
    }
  }

  /* ---------- drawing ---------- */

  const wrap = (v, period) => ((v % period) + period) % period;

  // A loop is drawn as one smooth closed curve, a quadratic piece per point:
  // from the midpoint before the point to the midpoint after it, with the
  // point as control. Each piece goes into one path per (colour, age band),
  // and the plane cuts a piece at the exact points where the curve reaches
  // it, so the curve is the same in every frame and only its shading moves
  // along it.

  // the point at t of the piece from a to b with control c
  const bezier = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * c + t * t * b;

  // the control point of the part of that piece from s to e
  const control = (a, c, b, s, e) =>
    (1 - s) * (1 - e) * a + ((1 - s) * e + s * (1 - e)) * c + s * e * b;

  // Where a piece of heights za, zc, zb reaches the plane, in order, into
  // `roots`; returns how many times. A piece turns in tau at most once, so it
  // reaches the plane once if its ends are on opposite sides of it, twice if
  // it turns back beyond the plane, and otherwise not at all.
  const roots = [0, 0];
  function crossings(za, zc, zb, turn) {
    const A = za - 2 * zc + zb, B = 2 * (zc - za), C = za - tau;
    const r = () => Math.sqrt(Math.max(0, B * B - 4 * A * C));
    if ((za < tau) !== (zb < tau)) {
      if (Math.abs(A) < 1e-6) roots[0] = -C / B;
      else {
        const t = (-B + r()) / (2 * A);
        roots[0] = t >= 0 && t <= 1 ? t : (-B - r()) / (2 * A);
      }
      return 1;
    }
    if (turn < 0 || (bezier(za, zc, zb, turn) < tau) === (za < tau)) return 0;
    const t1 = (-B - r()) / (2 * A), t2 = (-B + r()) / (2 * A);
    roots[0] = Math.min(t1, t2);
    roots[1] = Math.max(t1, t2);
    return 2;
  }

  // Adds one loop's threads, crossings and flashes. A piece's age is how far
  // below the plane it is; parts younger than 0 are in the future, older than
  // depth have faded out. `flashes` is null when nothing should flash.
  function traceLoop(loop, bands, particles, antiparticles, flashes) {
    const p = loop.pts, n = loop.n;
    let shiftX = 0, shiftY = 0;  // puts the current thread's start on the screen
    let last = -1, lastBand = -1;  // the piece the current thread ends with, -1 if none

    for (let b = 0; b < loop.blockLo.length; b++) {
      if (loop.blockLo[b] > tau || loop.blockHi[b] < tau - depth) continue;
      const end = Math.min(n, (b + 1) * BLOCK);
      for (let k = b * BLOCK; k < end; k++) {
        const h = 3 * ((k + n - 1) % n), j = 3 * k, l = 3 * k + 3;  // points k - 1, k, k + 1
        const ax = (p[h] + p[j]) / 2, ay = (p[h + 1] + p[j + 1]) / 2;
        const cx = p[j], cy = p[j + 1];
        const bx = (p[j] + p[l]) / 2, by = (p[j + 1] + p[l + 1]) / 2;
        const az = (p[h + 2] + p[j + 2]) / 2, cz = p[j + 2], bz = (p[j + 2] + p[l + 2]) / 2;
        const ageA = tau - az, ageB = tau - bz;
        const follows = last === k - 1;
        last = -1;

        // Where the piece turns in tau, a pair is created (a minimum) or
        // annihilates (a maximum), and flashes for FLASH after the plane passes.
        const turn = (cz - az) * (cz - bz) > 0 ? (az - cz) / (az - 2 * cz + bz) : -1;
        if (flashes && turn >= 0) {
          const since = tau - bezier(az, cz, bz, turn);
          if (since >= 0 && since < FLASH) {
            flashes.push(wrap(bezier(ax, cx, bx, turn), width) * UNIT_PX,
                         wrap(bezier(ay, cy, by, turn), height) * UNIT_PX, since / FLASH);
          }
        }

        const m = crossings(az, cz, bz, turn);
        if (m === 0 && (ageA < 0 || (ageA > depth && ageB > depth))) continue;

        // Each crossing gets a dot, and only the parts of the piece below the
        // plane are drawn, as threads are the past only. Each part of a
        // quadratic is again a quadratic.
        for (let i = 0; i < m; i++) {
          const t = roots[i];
          const sx = wrap(bezier(ax, cx, bx, t), width) * UNIT_PX;
          const sy = wrap(bezier(ay, cy, by, t), height) * UNIT_PX;
          const up = (1 - t) * (cz - az) + t * (bz - cz) > 0;
          const path = up ? particles : antiparticles;
          path.moveTo(sx + DOT_RADIUS, sy);
          path.arc(sx, sy, DOT_RADIUS, 0, 2 * Math.PI);
        }

        // colour by direction of travel in tau, over a few points so it doesn't flicker
        const down = p[3 * ((k + 2) % n) + 2] < p[3 * ((k + n - 2) % n) + 2];

        for (let i = ageA < 0 ? 1 : 0; i <= m; i += 2) {
          const s = i === 0 ? 0 : roots[i - 1], e = i === m ? 1 : roots[i];
          const ageS = s === 0 ? ageA : 0, ageE = e === 1 ? ageB : 0;
          if (ageS > depth && ageE > depth) continue;
          const sx = bezier(ax, cx, bx, s), sy = bezier(ay, cy, by, s);
          const age = Math.min(AGE_BANDS - 1, Math.floor(((ageS + ageE) / 2 / depth) * AGE_BANDS));
          const band = (down ? AGE_BANDS : 0) + age;
          const path = bands[band];

          // A new thread starts on the screen; one that wanders more than a
          // unit off it is moved back on, by whole periods.
          const joined = s === 0 && follows;
          const offScreen = sx + shiftX < -1 || sx + shiftX > width + 1 ||
                            sy + shiftY < -1 || sy + shiftY > height + 1;
          if (!joined || offScreen) {
            shiftX = wrap(sx, width) - sx;
            shiftY = wrap(sy, height) - sy;
          }
          if (!joined || offScreen || band !== lastBand) {
            path.moveTo((sx + shiftX) * UNIT_PX, (sy + shiftY) * UNIT_PX);
          }
          path.quadraticCurveTo(
            (control(ax, cx, bx, s, e) + shiftX) * UNIT_PX, (control(ay, cy, by, s, e) + shiftY) * UNIT_PX,
            (bezier(ax, cx, bx, e) + shiftX) * UNIT_PX, (bezier(ay, cy, by, e) + shiftY) * UNIT_PX);
          if (e === 1) last = k;
          lastBand = band;
        }
      }
    }
  }

  function draw() {
    const particles = new Path2D(), antiparticles = new Path2D();
    const bands = Array.from({ length: 2 * AGE_BANDS }, () => new Path2D());
    const closedOnly = still();
    const flashes = closedOnly ? null : [];   // x, y, how far through, for each
    depth = closedOnly ? STILL_DEPTH : DEPTH;
    for (const loop of loops) {
      if (loop.lo <= tau && loop.hi >= tau - depth && !(closedOnly && loop.hi > tau)) {
        traceLoop(loop, bands, particles, antiparticles, flashes);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";        // neighbouring bands meet end to end; round caps would overlap there
    bands.forEach((path, i) => {
      const age = ((i % AGE_BANDS) + 0.5) / AGE_BANDS;
      ctx.lineWidth = 1 + (LINE - 1) * Math.max(0, 1 - age / THICK);
      ctx.globalAlpha = ALPHA * Math.pow(1 - age, FADE);
      ctx.strokeStyle = i < AGE_BANDS ? plus : minus;
      ctx.stroke(path);
    });
    ctx.globalAlpha = DOT_ALPHA;
    ctx.fillStyle = plus;
    ctx.fill(particles);
    ctx.fillStyle = minus;
    ctx.fill(antiparticles);
    // Flashes are at full strength at once, then fade and shrink. On a dark
    // background they add light; on a light one they are ink.
    const glowing = isDark();
    if (glowing) ctx.globalCompositeOperation = "lighter";
    for (let i = 0; flashes && i < flashes.length; i += 3) {
      const f = flashes[i + 2], r = (glowing ? FLASH_RADIUS : INK_RADIUS) * (1 - 0.4 * f);
      ctx.globalAlpha = (glowing ? FLASH_ALPHA : INK_ALPHA) * (1 - f) * (1 - f);
      ctx.drawImage(spot, flashes[i] - r, flashes[i + 1] - r, 2 * r, 2 * r);
    }
    ctx.globalCompositeOperation = "source-over";
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
    if (document.hidden || still() || !roomy.matches) return;
    raf = requestAnimationFrame(frame);
    if (lastTime && now - lastTime < 1000 / (FPS + 1)) return;
    if (lastTime) tau += SPEED * Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    stream();
    draw();
  }

  function start() {
    if (raf || document.hidden || still() || !roomy.matches) return;
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
  const onMotionChange = () => {
    if (width) draw();
    start();
  };
  // the switches (site.js) set data-theme and data-motion on the root
  new MutationObserver((changes) => {
    if (changes.some((c) => c.attributeName === "data-theme")) onThemeChange();
    if (changes.some((c) => c.attributeName === "data-motion")) onMotionChange();
  }).observe(root, { attributeFilter: ["data-theme", "data-motion"] });
  if (motion.addEventListener) {
    motion.addEventListener("change", onMotionChange);
    roomy.addEventListener("change", onLayoutChange);
    dark.addEventListener("change", onThemeChange);
  } else {                        // Safari < 14
    motion.addListener(onMotionChange);
    roomy.addListener(onLayoutChange);
    dark.addListener(onThemeChange);
  }
})();
