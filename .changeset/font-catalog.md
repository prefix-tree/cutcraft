---
"@cutcraft/kit": minor
"@cutcraft/render": minor
---

A font catalogue and `cutcraft fonts`. The kit exports `FONT_CATALOG` (the bundled families and a short list from Google Fonts, each with its category, weights, roles, a line on how it looks and its pairings), `findFont`, `fontsFor`, `nearestFont` and `fontFamily`. `cutcraft fonts` prints the list, filtered with `--for` and `--category`, and `--sheet` draws the families as one image setting your words. `googleFont()` now refuses a weight or an italic a listed family does not have, and the `font-available` lint gives the declaration to write.
