# Alex Jiang's website

Source for my personal site, live at **<https://alex-xiaole-jiang.github.io>**: about, papers, and longer write-ups.

Plain Jekyll, built by GitHub Pages on push. No theme, no plugins, no build step.

## Editing

| What | Where |
|---|---|
| Name, tagline, links, the two photos | `_config.yml` (add the Scholar URL there) |
| About paragraph | `index.html` |
| Paper list (title, authors, venue, links, bibtex) | `_data/papers.yml` |
| Long write-up for a paper | `_writeups/<paper id>.md` |
| Look | `assets/css/site.css` |
| Open/close behavior | `assets/js/site.js` |
| Background animation | `assets/js/qft.js` |
| Favicon (off for now; see `_layouts/default.html`) | `assets/img/favicon.svg` |

A note to self in a write-up goes inside
`{% if jekyll.environment == "development" %} ... {% endif %}`, with `{: .todo}`
after the paragraph: it shows in gray italics on `jekyll serve` and is left out
of the live site altogether.

Write equations with `$...$` inline and `$$...$$` on separate lines for display math.
Keep trailing punctuation inside the math delimiters (`$x.$` or `$x,$`) so it cannot wrap onto a line by itself.
Use `\lvert` for ket bars (for example `$\lvert\psi\rangle$`) so Markdown does not
interpret them as table separators. The site renders write-up math with KaTeX.

## Preview locally

    jekyll serve      # http://localhost:4000

## Credits

Body text is set in Bitstream Charter, converted to WOFF2. Its license is at `assets/fonts/LICENSE-charter.txt`.
