---
"@cutcraft/render": minor
---

`cutcraft where <file> --at <moments>` prints where each overlay, the captions and each named part is at a moment:
its ink as a box in pixels, whether it is in the frame and in each safe zone, and what it overlaps. An element
inside a `<Layer>` that carries `data-name` is a named part: `where` lists it as `<layer id>/<name>`, and
`--check-layout` now checks it on its own and reports it at the line that names it. From code: `whereThings` and
`formatWhere`.
