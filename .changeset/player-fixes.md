---
"@uberscene/player": patch
---

Reverse playback decodes every frame again. Each reverse window kept only its newest frames but counted the whole second as loaded, so about half of every second showed one stale frame, in the preview and in exports.
