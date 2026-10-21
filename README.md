# alex-xiaole-jiang.github.io

Plain Jekyll, built by GitHub Pages on push. No theme, no plugins, no build step.

## Editing

| What | Where |
|---|---|
| Name, tagline, links, photo | `_config.yml` (add the Scholar URL there) |
| About paragraph | `index.html` |
| Paper list (title, authors, venue, links, bibtex) | `_data/papers.yml` |
| Long write-up for a paper | `_writeups/<paper id>.md` |
| Look | `assets/css/site.css` |
| Open/close behavior | `assets/js/site.js` |
| Background animation | `assets/js/qft.js` |
| Favicon | `assets/img/favicon.svg` |

A note to self in a write-up goes inside
`{% if jekyll.environment == "development" %} ... {% endif %}`, with `{: .todo}`
after the paragraph: it shows in gray italics on `jekyll serve` and is left out
of the live site altogether.

## Preview locally

    jekyll serve      # http://localhost:4000

Fonts: Bitstream Charter, converted to WOFF2 (see `assets/fonts/LICENSE-charter.txt`).
