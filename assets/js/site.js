// Opens and closes paper write-ups. Wide: in the right column. Narrower: in a
// panel that slides over the list. One column: inline, right under the paper's entry. The URL hash (#kwm) names the open one.
// Without JS the write-ups still open through CSS :target. The "js" class that
// switches that off is set here, not inline, so a browser too old to run this
// file keeps the CSS-only behavior instead of ending up with neither.
(() => {
  document.documentElement.classList.add("js");

  // layouts; keep in sync with site.css
  const oneColumn = window.matchMedia("not all and (min-width: 56em)");
  const docked = window.matchMedia("(min-width: 107em)");
  const panel = () => !oneColumn.matches && !docked.matches;
  const reader = document.getElementById("reader");
  let current = null;

  const writeup = (id) => {
    const el = id && document.getElementById(id);
    return el && el.classList.contains("writeup") ? el : null;
  };
  const entry = (id) => document.getElementById("p-" + id);
  const handle = (id) => entry(id).querySelector(".intro");

  function place(el) {
    (oneColumn.matches ? entry(el.id) : reader).appendChild(el);
  }

  function setHash(id) {
    history.replaceState(null, "", location.pathname + location.search + (id ? "#" + id : ""));
  }

  function mark(id, isOpen) {
    writeup(id).classList.toggle("open", isOpen);
    entry(id).classList.toggle("is-open", isOpen);
    handle(id).setAttribute("aria-expanded", String(isOpen));
  }

  function open(id) {
    const el = writeup(id);
    if (!el) return;
    if (current) mark(current, false);
    const section = entry(id).closest("details");
    if (section) section.open = true;   // the entry may be in a folded section
    place(el);
    mark(id, true);
    reader.classList.add("is-open");
    current = id;
    setHash(id);
    if (!oneColumn.matches) reader.scrollTop = 0;
    if (panel()) el.focus({ preventScroll: true });
    window.goatcounter?.count?.({ path: "write-up/" + id, title: id, event: true });
  }

  function close() {
    if (!current) return;
    mark(current, false);
    reader.classList.remove("is-open");
    current = null;
    setHash("");
  }

  // Close, and put focus back on the entry if it was in the write-up (which is
  // now hidden). One column: scroll back up to the entry if it's off screen.
  function closeAndReturn() {
    const id = current;
    if (!id) return;
    const wasInside = writeup(id).contains(document.activeElement);
    close();
    if (wasInside) handle(id).focus({ preventScroll: true });
    if (oneColumn.matches && entry(id).getBoundingClientRect().top < 0) entry(id).scrollIntoView();
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

    // panel: a click outside it, other than on a link or button, closes it
    if (current && panel() && !t.closest(".reader, a, button")) {
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
  };
  if (oneColumn.addEventListener) oneColumn.addEventListener("change", onLayoutChange);
  else oneColumn.addListener(onLayoutChange);   // Safari < 14

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (writeup(id)) open(id);
    else close();
  });

  const start = location.hash.slice(1);
  if (writeup(start)) {
    open(start);
    entry(start).scrollIntoView();
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

  if (systemDark.addEventListener) systemDark.addEventListener("change", label);
  else systemDark.addListener(label);   // Safari < 14
  label();
})();
