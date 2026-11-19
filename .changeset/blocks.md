---
"@uberscene/kit": minor
"@uberscene/render": minor
"uberscene": minor
---

Blocks: scene-sized pieces of motion design that ship with the CLI. `uberscene blocks` lists them by the job each does
(`--for`, `--aspect`, `--json`) and `--sheet` pastes their previews into one image. The first three are a grid of
cells that fills and counts, a wall of characters that changes on the beat, and a row of points lit in turn; the
example shorts are built on them. The kit gains `themeCss` (a theme token as a CSS value, for components that take
`$accent`) and `blockMetaSchema`.
