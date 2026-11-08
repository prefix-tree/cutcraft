# @cutcraft/render

## 0.3.0

### Minor Changes

- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.

### Patch Changes

- c37a87f: In the workspace, where the export page is served from source, the exports in one process share one Vite server and close it a few seconds after the last one. A Vite server closed after each export kept about 40 MB, so a process that exported many times ran out of memory. Published packages serve the built page and are unaffected.
- fa7c303: `<Graphic>` and its 34 kinds are removed (decision 0024), with the `graphic/*` actions, the `graphic-props` and
  `deprecated-graphic` lint rules and `graphicControls`. A file that still uses `<Graphic>` gets an error naming what
  replaces it. Use the components in `@cutcraft/kit`:
  
  | Was | Now |
  |---|---|
  | `kind="lower-third"`, `-card`, `-split` | `<LowerThird>` |
  | `callout`, `speech-bubble` | `<Callout>` |
  | `badge`, `pill` | `<Badge>` |
  | `counter` | `<Counter>` |
  | `progress-bar` | `<ProgressBar>` |
  | `arrow`, `curved-arrow`, `hand-arrow` | `<Arrow>` |
  | `underline`, `marker`, `circle-scribble`, `strike` | `<Highlight>` |
  | `gradient-`, `dots-`, `grid-background` | `<Background>` |
  
  The other kinds have no component: draw them as free code (`<Svg>`, `<Motion>`, a `<Layer>`).
  
  `<Sticker src>` takes an image asset; `icon:` stickers are removed, and Lucide with them (about 0.7 MB out of every
  bundle). Draw an icon as an `<Svg>`. `@cutcraft/graphics` now holds only the free-code libraries
  (`installFreeCodeLibraries`, `/three`, `/motion`), and the kit and the player no longer depend on it.
  `GRAPHIC_ANIMATIONS` is renamed `ENTRANCE_ANIMATIONS`: they are every overlay's entrances and exits.
  
  The export also waits for an overlay's image or SVG file before it captures a frame, so a still of a sticker shows
  the image rather than nothing.
- e1e5bdb: A frame is captured only once the faces its text uses have loaded. A bundled face is fetched when text first uses it,
  so text that appeared after the first frame could be drawn in the fallback face, in stills most of all.
- Updated dependencies [e1e5bdb]
- Updated dependencies [ee3a1e9]
- Updated dependencies [6ac1d41]
- Updated dependencies [ab5cec4]
- Updated dependencies [4756002]
- Updated dependencies [1fdf930]
- Updated dependencies [bedea28]
- Updated dependencies [5b492f0]
- Updated dependencies [4b3d65d]
- Updated dependencies [7e411a0]
- Updated dependencies [7db2452]
- Updated dependencies [e7301f9]
- Updated dependencies [4e5e3cb]
- Updated dependencies [ac13aea]
- Updated dependencies [5d99f1b]
- Updated dependencies [40b5a9f]
- Updated dependencies [3847609]
- Updated dependencies [fa7c303]
- Updated dependencies [e9107f6]
- Updated dependencies [41e9b6b]
- Updated dependencies [8a0f302]
  - @cutcraft/kit@0.3.0
  - @cutcraft/player@0.3.0
  - @cutcraft/graphics@0.3.0

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

- [#18](https://github.com/prefix-tree/cutcraft/pull/18) [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a) Thanks [@bsnisar](https://github.com/bsnisar)! - Fonts are declared in the file: `font({ family, src: "asset:brand" })` for a font file and `googleFont("Titan One")` for a Google Fonts family, each returning the family to pass as a `font` prop, a theme font or a CSS `fontFamily`. The player and the export load every declared face (`state.fonts`), WOFF2 included; the export downloads Google faces once into `~/.cache/cutcraft/fonts`, so later exports need no network. The `declaration` lint checks the calls, and `font-available` takes declared families as available.

- [#20](https://github.com/prefix-tree/cutcraft/pull/20) [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Composition motionBlur={{ shutterAngle: 180, samples: 8 }}>` gives the export a film camera's motion blur: the export draws each frame `samples` times across the open shutter and averages them, for footage, titles, Motion, three.js and free code alike. The preview stays sharp. The player's `exactTime` option re-renders overlays for every change of time, which the export uses for the moments inside a frame.

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

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects and transitions of your own: `defineEffect({ name, params, shader })` and `defineTransition({ name, params, shader })` declare a GLSL function and a zod schema for its params, and return the name to use as an `<Effect>` or `<Transition>` type. Params are validated and given defaults by the schema, keyframable, and passed to the shader as uniforms; transitions get both pictures and their progress. The player draws them with WebGL 2 in any browser, in the preview and the export. The `declaration` lint checks that they sit at the top of the file with a literal `name` and `shader`.

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#27](https://github.com/prefix-tree/cutcraft/pull/27) [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4) Thanks [@bsnisar](https://github.com/bsnisar)! - The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
  `FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
  `path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
  Chrome already in the cache and no longer contacts the network for it.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e), [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad)]:
  - @cutcraft/kit@0.2.0
  - @cutcraft/graphics@0.2.0
  - @cutcraft/player@0.2.0
