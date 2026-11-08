---
"@cutcraft/player": patch
"@cutcraft/kit": patch
---

Vignette and grain on an `<Adjustment>` are drawn: they darken and speckle everything beneath it, before its other
effects, in the preview and the export. Before, they drew nothing. On an overlay (a title, shape, SVG, sticker,
graphic or layer) they are still not drawn; the `not-rendered` lint now reports that, and the preview warns once.
