---
"@cutcraft/kit": major
"@cutcraft/player": major
"@cutcraft/graphics": major
"@cutcraft/render": patch
---

`<Graphic>` and its 34 kinds are removed (decision 0024), with the `graphic/*` actions, the `graphic-props` and
`deprecated-graphic` lint rules and `graphicControls`. A file that still uses `<Graphic>` gets an error naming what
replaces it. Use the components in `@cutcraft/kit`:

| Was | Now |
|---|---|
| `kind="lower-third"`, `-card`, `-split` | `<LowerThird>` |
| `callout`, `speech-bubble` | `<Callout>` |
| `badge`, `pill` | `<Badge>` |
| `counter` | `<Counter>` |
| `progress-bar` | `<ProgressBar>` |
| `arrow`, `curved-arrow`, `hand-arrow` | `<Arrow>` |
| `underline`, `marker`, `circle-scribble`, `strike` | `<Highlight>` |
| `gradient-`, `dots-`, `grid-background` | `<Background>` |

The other kinds have no component: draw them as free code (`<Svg>`, `<Motion>`, a `<Layer>`).

`<Sticker src>` takes an image asset; `icon:` stickers are removed, and Lucide with them (about 0.7 MB out of every
bundle). Draw an icon as an `<Svg>`. `@cutcraft/graphics` now holds only the free-code libraries
(`installFreeCodeLibraries`, `/three`, `/motion`), and the kit and the player no longer depend on it.
`GRAPHIC_ANIMATIONS` is renamed `ENTRANCE_ANIMATIONS`: they are every overlay's entrances and exits.

The export also waits for an overlay's image or SVG file before it captures a frame, so a still of a sticker shows
the image rather than nothing.
