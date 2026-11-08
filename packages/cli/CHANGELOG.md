# cutcraft

## 0.3.0

### Minor Changes

- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.

### Patch Changes

- Updated dependencies [bedea28]
- Updated dependencies [c37a87f]
- Updated dependencies [fa7c303]
- Updated dependencies [e1e5bdb]
  - @cutcraft/render@0.3.0

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

- [#26](https://github.com/prefix-tree/cutcraft/pull/26) [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c) Thanks [@bsnisar](https://github.com/bsnisar)! - The export runs the real player in headless Chrome, so it draws everything the preview draws: any CSS in a `<Layer>`,
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

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - The export loads a cut file the way the editor does: it may import `react`, `zod` and `@cutcraft/kit`, plus what the
  host offers (`loadVideo(file, { imports })`, `cutcraft --import`). A file that imports anything else now fails in the
  export with the editor's message. `--tsconfig` and `LoadOptions.tsconfig` are gone.

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#27](https://github.com/prefix-tree/cutcraft/pull/27) [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4) Thanks [@bsnisar](https://github.com/bsnisar)! - The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
  `FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
  `path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
  Chrome already in the cache and no longer contacts the network for it.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e)]:
  - @cutcraft/render@0.2.0
