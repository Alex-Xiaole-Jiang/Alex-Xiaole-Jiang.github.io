// Opens and closes paper write-ups. Wide: in the right column. Narrower:
// inline, right under the paper's entry. The URL hash (#kwm) names the open one.
// Without JS the write-ups still open through CSS :target. The "js" class that
// switches that off is set here, not inline, so a browser too old to run this
// file keeps the CSS-only behavior instead of ending up with neither.
(() => {
  document.documentElement.classList.add("js");

  // the layout with a write-up column; keep in sync with site.css
  const docked = window.matchMedia("(min-width: 109em)");
  const reader = document.getElementById("reader");
  const scroll = reader.querySelector(".scroll");   // the write-up scrolls in here
  let current = null;

  const list = document.querySelector(".list");
  function sizeReader() {
    if (!docked.matches) return;
    // The box starts its padding's width above the middle column's text, so
    // with that added, its bottom stops at the column's end.
    const offset = parseFloat(getComputedStyle(scroll).paddingTop);
    reader.style.setProperty("--reader-column-limit", `${list.getBoundingClientRect().height + offset}px`);
    // The pane stops at the scrollbar, whose width site.css can't know.
    reader.style.setProperty("--scrollbar", `${scroll.offsetWidth - scroll.clientWidth}px`);
  }
  if (window.ResizeObserver) new ResizeObserver(sizeReader).observe(list);
  window.addEventListener("resize", sizeReader);
  sizeReader();

  const writeup = (id) => {
    const el = id && document.getElementById(id);
    return el && el.classList.contains("writeup") ? el : null;
  };
  const entry = (id) => document.getElementById("p-" + id);
  const handle = (id) => entry(id).querySelector(".intro");

  function place(el) {
    (docked.matches ? scroll : entry(el.id)).appendChild(el);
  }

  function setHash(id) {
    try { history.replaceState(null, "", location.pathname + location.search + (id ? "#" + id : "")); } catch (e) {}   // Safari rate-limits it
  }

  function mark(id, isOpen) {
    writeup(id).classList.toggle("open", isOpen);
    entry(id).classList.toggle("is-open", isOpen);
    handle(id).setAttribute("aria-expanded", String(isOpen));
  }

  // A write-up shown without being asked for (see the end of this block) stays
  // out of the URL and the count. The tab keeps it while it is up, so a refresh
  // gives back what was on screen.
  let unasked = null;
  function remember(id) {
    if (id === unasked) return;
    unasked = id;
    try { sessionStorage.setItem("intro", id || ""); } catch (e) {}
  }

  function open(id, asked = true) {
    const el = writeup(id);
    if (!el) return;
    if (current) mark(current, false);
    const section = entry(id).closest("details");
    if (section) section.open = true;   // the entry may be in a folded section
    place(el);
    mark(id, true);
    reader.classList.add("is-open");
    current = id;
    if (docked.matches) {
      scroll.scrollTop = 0;
      sizeReader();   // the scrollbar may have just appeared
    }
    remember(asked ? null : id);
    if (!asked) return;
    setHash(id);
    window.goatcounter?.count?.({ path: "write-up/" + id, title: id, event: true });
  }

  function close(clearHash = true) {
    if (!current) return;
    mark(current, false);
    reader.classList.remove("is-open");
    current = null;
    remember(null);
    if (clearHash) setHash("");
  }

  // Close, and put focus back on the entry if it was in the write-up (which is
  // now hidden). Inline: scroll back up to the entry if it's off screen.
  function closeAndReturn() {
    const id = current;
    if (!id) return;
    const wasInside = writeup(id).contains(document.activeElement);
    close();
    if (wasInside) handle(id).focus({ preventScroll: true });
    if (!docked.matches && entry(id).getBoundingClientRect().top < 0) entry(id).scrollIntoView();
  }

  const toggle = (id) => (id === current ? close() : open(id));

  // A click anywhere on an entry with a write-up toggles it, except on the
  // entry's own links and buttons, its bibtex box, the inline write-up
  // (one column), or while selecting text.
  function clickedEntry(target) {
    const li = target.closest(".paper[data-w]");
    if (!li || target.closest("a, button, pre, .writeup")) return null;
    if (String(window.getSelection()).trim()) return null;
    return li;
  }

  document.addEventListener("click", (e) => {
    // a modified click (open in a new tab, and so on) is the browser's
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target;

    const navLink = t.closest(".mobile-nav a");
    if (navLink) {
      // Close before the browser scrolls, so inline content cannot shift the target.
      close(false);
      const section = document.getElementById(navLink.hash.slice(1));
      if (section?.matches("details.sec")) section.open = true;
      return;   // ordinary anchor navigation, including browser history
    }

    const intro = t.closest(".intro");
    const li = intro ? null : clickedEntry(t);
    if (intro || li) {
      e.preventDefault();
      toggle(intro ? intro.getAttribute("aria-controls") : li.dataset.w);
      return;
    }

    if (t.closest(".writeup .close")) {
      e.preventDefault();
      closeAndReturn();
      return;
    }

    const bib = t.closest(".bibbtn");
    if (bib) {
      const pre = document.getElementById(bib.getAttribute("aria-controls"));
      pre.hidden = !pre.hidden;
      bib.setAttribute("aria-expanded", String(!pre.hidden));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAndReturn();
  });

  const onLayoutChange = () => {
    if (current) place(writeup(current));
    sizeReader();
  };
  if (docked.addEventListener) docked.addEventListener("change", onLayoutChange);
  else docked.addListener(onLayoutChange);   // Safari < 14

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (writeup(id)) open(id);
    else {
      close(false);   // preserve section anchors when leaving a write-up
      const section = document.getElementById(id);
      if (section?.matches("details.sec")) section.open = true;
    }
  });

  // A link to #id lands on the entry, not the write-up. Until loading is done
  // the browser scrolls to the write-up itself, so the hash waits till then.
  const start = location.hash.slice(1);
  if (writeup(start)) {
    open(start);
    setHash("");
    // Docked, an entry already on screen stays put: the other two columns
    // are sticky, so the small scroll the page allows would only shift the
    // list past them.
    const toEntry = () => {
      const b = entry(start).getBoundingClientRect();
      if (docked.matches && b.top >= 0 && b.bottom <= innerHeight) return;
      entry(start).scrollIntoView();
    };
    toEntry();
    window.addEventListener("load", () => {
      toEntry();   // again, as the fonts may have reflowed the page
      setTimeout(() => { if (current === start) setHash(start); }, 0);   // WebKit scrolls just after this handler
    }, { once: true });
  } else if (!location.hash && docked.matches) {
    // With all three columns up and nothing asked for, the first write-up
    // shows, so that the third column is seen to exist. On a refresh, the
    // one the tab remembers, or none once it was closed.
    let seen = null;
    try { seen = sessionStorage.getItem("intro"); } catch (e) {}
    const id = seen === null ? scroll.querySelector(".writeup")?.id : seen;
    if (id) open(id, false);
  }
})();

// [night]/[day], [hide text] and [animate]/[stop]. The theme follows the
// system until it is switched; [animate] overrides a system request for
// reduced motion (qft.js). Both choices are kept in localStorage, and the
// inline script in default.html applies them before the page is drawn.
(() => {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches);
  const buttons = (name) => document.querySelectorAll(`[data-switch="${name}"]`);

  // Two photos (_config.yml). The night one is in the HTML, so it shows first
  // whatever the theme. Once the theme changes, night rests on the night photo
  // and day on the day one. Hovering shows the other; a click (a tap, on a
  // phone) makes the other one the resting photo.
  const photo = document.querySelector(".me .photo");
  const twoPhotos = !!(photo && photo.dataset.night && photo.dataset.day);
  let resting = "night";
  const other = () => (resting === "night" ? "day" : "night");
  function showPhoto(which) {
    if (photo.getAttribute("src") !== photo.dataset[which]) photo.setAttribute("src", photo.dataset[which]);
  }
  function restPhoto(which) {
    resting = which;
    showPhoto(which);
  }
  const photoForTheme = () => restPhoto(isDark() ? "night" : "day");
  if (twoPhotos) {
    photo.addEventListener("mouseenter", () => showPhoto(other()));
    photo.addEventListener("mouseleave", () => showPhoto(resting));
    photo.addEventListener("click", () => restPhoto(other()));
    // fetch the day photo once the page is up, so the first hover is instant
    window.addEventListener("load", () => { new Image().src = photo.dataset.day; }, { once: true });
  }

  function label() {
    buttons("theme").forEach((b) => {
      b.textContent = isDark() ? "day" : "night";
    });
    buttons("motion").forEach((b) => {
      b.textContent = root.dataset.motion ? "stop" : "animate";
    });
  }

  function toggleTheme() {
    const dark = !isDark();
    // a choice that matches the system is no choice: follow the system again
    const theme = dark === systemDark.matches ? null : dark ? "dark" : "light";
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    try {
      if (theme) localStorage.setItem("theme", theme);
      else localStorage.removeItem("theme");
    } catch (e) {}
    label();
    if (twoPhotos) photoForTheme();
  }

  function toggleMotion() {
    const on = !root.dataset.motion;
    if (on) root.dataset.motion = "on";
    else delete root.dataset.motion;
    try {
      if (on) localStorage.setItem("motion", "on");
      else localStorage.removeItem("motion");
    } catch (e) {}
    label();
  }

  let bareFrom = null;   // the button that hid the text, to return focus to
  function setBare(on, from) {
    root.classList.toggle("bare", on);
    if (on) {
      bareFrom = from;
      document.querySelector(".unbare").focus();
    } else if (bareFrom) {
      bareFrom.focus();
      bareFrom = null;
    }
  }

  // While the text is hidden, any click or Escape brings it back, and does
  // nothing else: these listeners capture, so the write-up's own (which close
  // it on a click outside or Escape) never see the event.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-switch]");
    if (root.classList.contains("bare")) {
      e.stopPropagation();
      setBare(false);
    } else if (b && b.dataset.switch === "theme") {
      toggleTheme();
    } else if (b && b.dataset.switch === "motion") {
      toggleMotion();
    } else if (b && b.dataset.switch === "bare") {
      setBare(true, b);
    }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("bare")) {
      e.stopPropagation();
      setBare(false);
    }
  }, true);

  const onSystemChange = () => {
    label();
    if (twoPhotos && !root.dataset.theme) photoForTheme();   // following the system
  };
  if (systemDark.addEventListener) systemDark.addEventListener("change", onSystemChange);
  else systemDark.addListener(onSystemChange);   // Safari < 14
  label();
})();

// A paper's hint (papers.yml) is a speech bubble that follows the pointer while
// it is over the entry, opening to the left or upward where it would leave the
// window (site.css). A click on the entry, away from its links, puts it away
// until the pointer leaves and returns. The bubble moves out to <body>, so
// that no column's stacking context can paint another column over it.
(() => {
  if (!window.matchMedia("(hover: hover)").matches) return;
  document.querySelectorAll(".paper > .hint").forEach((hint) => {
    const li = hint.parentElement;
    document.body.append(hint);
    let dismissed = false;
    let box = null;   // the bubble's size, and its offset from the pointer, measured once
    const hide = () => hint.classList.remove("on");
    li.addEventListener("mousemove", (e) => {
      if (dismissed) return;
      hint.style.setProperty("--x", `${e.clientX}px`);
      hint.style.setProperty("--y", `${e.clientY}px`);
      if (!box) {
        const r = hint.getBoundingClientRect();
        box = { w: r.width, h: r.height, off: r.left - e.clientX };
      }
      hint.classList.toggle("l", e.clientX + box.off + box.w > window.innerWidth - 8);
      hint.classList.toggle("u", e.clientY + box.off + box.h > window.innerHeight - 8);
      hint.classList.add("on");
    });
    li.addEventListener("mouseleave", () => {
      hide();
      dismissed = false;
    });
    li.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      hide();
      dismissed = true;
    });
  });
})();

// Tabbed figures in write-ups: [k-WM] [next-step] above one visible pane
// (data-pane names the pane each tab opens). The k-WM method diagram also
// plays its inference: the next-step model's outputs appear one predictor
// call at a time, k-WM's all in one, and the predictor block flashes for each
// call. It plays when the diagram comes into view, on a tab switch, and on
// [replay]; with reduced motion the finished state shows at once.
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timers = [];
  const stop = () => { timers.forEach(clearTimeout); timers = []; };
  const steps = (svg) => [...svg.querySelectorAll(".ms")].map((g) => g.dataset.ms);
  const isOutput = (id) => /^[cd][1-9]$/.test(id);   // the build steps after the inputs
  const show = (svg, id, on) => svg.querySelectorAll(`.ms[data-ms="${id}"]`).forEach((g) => g.classList.toggle("show", on));

  function reset(svg) {
    steps(svg).forEach((id) => show(svg, id, !isOutput(id)));
  }

  function play(svg) {
    stop();
    reset(svg);
    const outputs = steps(svg).filter(isOutput);
    if (reduced.matches) {
      outputs.forEach((id) => show(svg, id, true));
      return;
    }
    const block = svg.querySelector(".pulse-c, .pulse-d");   // the inference panel's predictor
    const pulse = () => {
      if (!block) return;
      block.classList.remove("pulse");
      void block.getBBox();   // restart the animation
      block.classList.add("pulse");
    };
    // the next-step steps alternate output, fed-back input, output, ...; a call per output
    outputs.forEach((id, j) => timers.push(setTimeout(() => {
      show(svg, id, true);
      if (j % 2 === 0) pulse();
    }, 400 + j * 550)));
  }

  const diagrams = document.querySelectorAll(".method");
  diagrams.forEach(reset);
  const played = new WeakSet();
  if (window.IntersectionObserver) {
    const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting || played.has(en.target)) return;
      played.add(en.target);
      play(en.target);
    }), { threshold: 0.4 });
    diagrams.forEach((svg) => seen.observe(svg));
  } else {
    diagrams.forEach((svg) => steps(svg).forEach((id) => show(svg, id, true)));
  }

  document.querySelectorAll(".tabfig").forEach((fig) => {
    const tabs = [...fig.querySelectorAll("button.tab[data-pane]")];
    const panes = [...fig.querySelectorAll(".pane")];
    const shown = () => fig.querySelector(".pane:not([hidden]) .method");
    fig.addEventListener("click", (e) => {
      const tab = e.target.closest("button.tab");
      if (!tab) return;
      if (tab.dataset.pane) {
        tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
        panes.forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.pane; });
      }
      const svg = shown();
      if (svg) {
        played.add(svg);
        play(svg);
      }
    });
  });
})();
