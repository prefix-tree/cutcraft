---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Effects the file declares (`defineEffect()`) work on overlays too: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`. The player draws the overlay into a canvas with HTML-in-Canvas, runs the shaders over it and shows the result; a browser without the feature shows the overlay without them and warns, and the export always draws them. `<Effect>` and `<Keyframe>` written inside a `<Layer>` are collected as its children, apart from its free code. A title with an `<Effect>`, `<Keyframe>` or `<Mask>` child keeps its text (it was lost before).
