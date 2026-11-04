---
"@cutcraft/render": minor
"@cutcraft/kit": minor
"@cutcraft/graphics": minor
"cutcraft": minor
---

A browser engine for the export: a file with `<Three>` or `<Motion>` exports through the real player in headless
Chromium, frame by frame, with the sound mixed in Node as before (`renderVideo({ engine, source })`,
`cutcraft --engine auto|node|browser`; `auto` is the default and leaves every other file on the Node engine). It needs
`playwright-core` and Chrome or Chromium 153+ (`CUTCRAFT_CHROMIUM`). `loadVideo` returns the file's `source` for it,
and the kit's `holdLayerFrame` lets an engine layer hold a frame until it has drawn it.
