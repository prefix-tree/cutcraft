---
"@cutcraft/render": minor
"@cutcraft/player": minor
"@cutcraft/kit": patch
"cutcraft": minor
---

The export runs the real player in headless Chrome, so it draws everything the preview draws: any CSS in a `<Layer>`,
three.js, Motion, declared shaders and motion blur. The first export downloads Chrome for Testing into
`~/.cache/cutcraft/browsers`; `cutcraft browser install` does it ahead of time, and `CUTCRAFT_CHROMIUM` names your own.
The Node renderer is gone, and with it `skia-canvas`, `satori` and `node-av`: there is no native module to install.

- Formats: MP4 (H.264 or AV1, with AAC), WebM (VP9 or AV1, with Opus), MP3, WAV, and PNG or JPEG stills. `.mov`
  (ProRes), HEVC and VP8 are no longer written.
- The soundtrack is mixed and encoded in the page; the layout check measures each overlay as the export draws it.
- `renderVideo`, `renderStill` and `checkLayout` take `source` (from `loadVideo`), which is required; `interiors`,
  `parallel`, `speed` and `hardware` are removed, and `tabs` renders pieces on several browser pages.
  `loadVideo` no longer returns `interiors`, and `OverlayFont` is now `FontFile`.
- CLI: `--workers`, `--speed` and `--software` are removed; `--tabs` and `cutcraft browser install` are new;
  `--codec` takes `avc`, `vp9` or `av1`.
- `@cutcraft/player` no longer exports `@cutcraft/player/overlays`, which only the Node renderer used.
