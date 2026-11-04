---
"@cutcraft/kit": minor
"@cutcraft/player": minor
"@cutcraft/render": minor
---

Fonts are declared in the file: `font({ family, src: "asset:brand" })` for a font file and `googleFont("Titan One")` for a Google Fonts family, each returning the family to pass as a `font` prop, a theme font or a CSS `fontFamily`. The player and both exports load every declared face (`state.fonts`); the export downloads Google faces once into `~/.cache/cutcraft/fonts`, and the browser export sets text in the same files as the Node export. `--font` now reaches the browser export too, which before set such text in a fallback face. New lint `font-declaration`; `font-available` takes declared families as available.
