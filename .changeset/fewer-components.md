---
"@uberscene/kit": minor
---

Removed `Frame`, `Background`, `ProgressBar`, `Arrow`, `Highlight` and `QuoteCard`. Each was one element with defaults or a duplicate of a block: draw a border as a `<Shape>` with no fill and a `stroke`, a gradient backdrop as `<Composition background={{ mode: "gradient" }}>`, and the rest as free code in a `<Layer>` (a quote with marked phrases is the `quote-build` block).
