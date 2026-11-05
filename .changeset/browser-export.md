---
"@cutcraft/render": minor
"@cutcraft/kit": minor
"@cutcraft/graphics": minor
"cutcraft": minor
---

`<Three>` and `<Motion>` export: the export runs the real player in headless Chrome, frame by frame, so three.js
scenes and Motion sequences come out as the player shows them. `loadVideo` returns the file's `source`, which the
export page loads, and the kit's `holdLayerFrame` lets an engine layer hold a frame until it has drawn it.
