---
"@uberscene/render": minor
---

The mixer internals (`mixBlock`, `mixPlan`, `envelopeAt` and their types), `loadFonts` and `subjectRects` are no longer exported; the export, `inspect` and `checkLayout` use them as before. The renderer now takes its resolver and lint from `@uberscene/sdk`.
