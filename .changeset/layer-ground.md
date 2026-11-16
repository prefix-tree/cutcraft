---
"@cutcraft/render": patch
---

A `<Layer>` can mark itself as a ground with `data-ground` on an element inside it (a scrim over the footage that titles and captions sit on). The layout check, `cutcraft where` and `look --zones` then treat it like a background beneath the footage: it is not held to the safe zone and is not reported as covering the captions.
