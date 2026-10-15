// Opens and closes paper write-ups. Two or three columns: in the right column.
// One column: inline, right under the paper's entry. The URL hash (#kwm) names the open one.
// Without JS the write-ups still open through CSS :target. The "js" class that
// switches that off is set here, not inline, so a browser too old to run this
// file keeps the CSS-only behavior instead of ending up with neither.
(() => {
  document.documentElement.classList.add("js");

  // one-column layout; keep in sync with site.css
  const oneColumn = window.matchMedia("not all and (min-width: 77.5em)");
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
    place(el);
    mark(id, true);
    current = id;
    setHash(id);
    if (!oneColumn.matches) reader.scrollTop = 0;
    window.goatcounter?.count?.({ path: "write-up/" + id, title: id, event: true });
  }

  function close() {
    const id = current;
    if (!id) return null;
    mark(id, false);
    current = null;
    setHash("");
    return id;
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
      const id = close();
      if (!id) return;
      handle(id).focus({ preventScroll: true });
      if (oneColumn.matches && entry(id).getBoundingClientRect().top < 0) entry(id).scrollIntoView();
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
    if (e.key === "Escape") close();
  });

  const onLayoutChange = () => {
    if (current) place(writeup(current));
  };
  if (oneColumn.addEventListener) oneColumn.addEventListener("change", onLayoutChange);
  else oneColumn.addListener(onLayoutChange);   // Safari < 14

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (writeup(id)) open(id);
  });

  const start = location.hash.slice(1);
  if (writeup(start)) {
    open(start);
    entry(start).scrollIntoView();
  }
})();
