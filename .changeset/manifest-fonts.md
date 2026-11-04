---
"@cutcraft/kit": minor
"@cutcraft/player": minor
"@cutcraft/render": minor
---

Fonts can be listed in the manifest (`fonts`), one entry per face, and the player, the Node export and the browser export all load them; the browser export waits for them before its first frame. `--font` now reaches the browser export too, which before set such text in a fallback face. The `font-available` lint takes listed families as available.
