---
"@uberscene/player": patch
---

Reverse playback decodes every frame again. Each reverse window kept only its newest frames but counted the whole second as loaded, so about half of every second showed one stale frame, in the preview and in exports.

A frame that fails to decode is now reported. A clip whose frame could not be decoded used to leave the picture frozen with no error, and an export went on repeating the last frame. The player now sends an `error` event naming the clip and its asset, and the export's frame step fails with that error, so the render stops and says which frame and clip failed.
