// Render math only inside write-ups. Kramdown emits \[...\] for display math;
// inline expressions retain their Markdown-editor-friendly $...$ delimiters.
//
// Math appears only in write-ups, which start closed, so KaTeX (about 120 KB from
// jsDelivr) waits until the page has loaded instead of competing with it for the
// connection. It still arrives before a write-up is opened, fonts included, so the
// boxes open with their math drawn. With three columns up the layout has already
// loaded it (see default.html), and the math is drawn now, before site.js opens
// the first write-up. Else it starts at once when the URL names a write-up, on
// load, or on the first click or hash change if that comes sooner.
(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/';
  var started = false;

  function render() {
    document.querySelectorAll('.writeup').forEach(function (element) {
      renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    });
  }

  function add(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs) el[k] = attrs[k];
    el.crossOrigin = 'anonymous';
    document.head.appendChild(el);
    return el;
  }

  function start() {
    if (started) return;
    started = true;
    ['KaTeX_Main-Regular', 'KaTeX_Math-Italic', 'KaTeX_Caligraphic-Regular'].forEach(function (f) {
      add('link', { rel: 'preload', as: 'font', type: 'font/woff2', href: CDN + 'fonts/' + f + '.woff2' });
    });
    add('link', { rel: 'stylesheet', href: CDN + 'katex.min.css',
      integrity: 'sha384-3rdsX6e5mueWyoweR9NIVmtEsUkokpBT/0ALqKKIBMr9j4qhHkaIkAcGgsE6uVlp' });
    // async = false keeps the two scripts in order: auto-render needs katex.
    add('script', { src: CDN + 'katex.min.js', async: false,
      integrity: 'sha384-QFFtAGzvvj+bfgCGxXJlNZZR1nXEZgvG8tDLCCY1F19xl20WlfTYgguB4VcNdxYk' });
    add('script', { src: CDN + 'contrib/auto-render.min.js', async: false, onload: render,
      integrity: 'sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz' });
  }

  var id = location.hash.slice(1);
  if (window.renderMathInElement) render();
  else if (id && document.querySelector('.writeup[id="' + id.replace(/"/g, '') + '"]')) start();
  else if (document.readyState === 'complete') start();
  else {
    window.addEventListener('load', start, { once: true });
    document.addEventListener('click', start, { once: true, capture: true });
    window.addEventListener('hashchange', start, { once: true });
  }
})();
