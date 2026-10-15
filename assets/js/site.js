// Opens and closes paper write-ups. Wide/tablet: in the right column.
// Phone: inline, right under the paper's entry. The URL hash (#kwm) names the open one.
// Without JS the write-ups still open through CSS :target.
(() => {
  const phone = window.matchMedia("(max-width: 640px)");
  const reader = document.getElementById("reader");
  let current = null;

  const writeup = (id) => {
    const el = id && document.getElementById(id);
    return el && el.classList.contains("writeup") ? el : null;
  };
  const entry = (id) => document.getElementById("p-" + id);
  const handle = (id) => entry(id).querySelector(".intro");

  function place(el) {
    (phone.matches ? entry(el.id) : reader).appendChild(el);
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
    if (!phone.matches) reader.scrollTop = 0;
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
  // (phones), or while selecting text.
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
      if (phone.matches && entry(id).getBoundingClientRect().top < 0) entry(id).scrollIntoView();
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

  phone.addEventListener("change", () => {
    if (current) place(writeup(current));
  });

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
