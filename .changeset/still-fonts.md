---
"@cutcraft/render": patch
---

A frame is captured only once the faces its text uses have loaded. A bundled face is fetched when text first uses it,
so text that appeared after the first frame could be drawn in the fallback face, in stills most of all.
