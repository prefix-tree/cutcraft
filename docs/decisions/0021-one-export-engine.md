# 0021. One export engine: the player in Chrome

> Supersedes [0015](./0015-a-headless-engine-renders-the-export.md) and the "chosen per file" part of
> [0019](./0019-a-browser-engine-for-free-code.md). The export is the player again, as
> [0007](./0007-the-browser-renders.md) first said.

## Context

After 0019 the export had two picture engines. Node drew most files on the CPU (the plan and painter on skia, overlays
through Satori, FFmpeg encoders from `node-av`); headless Chrome drew files with `<Three>`, `<Motion>`, motion blur or
declared shaders, through the real player. Every feature had to be built twice or refused in one engine: Satori read
a subset of CSS, skia had no WebGL, a WOFF2 font worked in one and not the other, and the docs carried a list of what
`--engine node` left out. The layout check measured overlays with Satori, so it could disagree with what the export
drew. The parity suites existed only to keep the two from drifting apart.

Remotion renders in a browser too (screenshots of a Chrome page, encoded by FFmpeg). Diffusion Studio has one engine,
in the browser, and runs it under Puppeteer on a server. Neither keeps a second renderer.

## Decision

- **Chrome draws every export.** `renderVideo`, `renderStill` and `checkLayout` all open the export page; the Node
  picture path (frame pipeline, overlay plane, workers) and its dependencies (`skia-canvas`, `satori`, `node-av`,
  `@mediabunny/server` and its patch) are gone. `engine`, `--engine`, `--workers`, `--speed` and `--software` are
  removed; `--tabs` renders pieces on several pages of one browser.
- **The sound is mixed in the page.** The same `mixPlan` runs there, over PCM that WebCodecs decodes. Chrome encodes
  Opus; AAC and MP3 go through Mediabunny's WebAssembly encoders (Chrome for Testing ships neither), and WAV is PCM.
  Node copies the encoded soundtrack into the file beside the joined pictures, or writes it alone for MP3 and WAV.
- **What Chrome encodes.** MP4 holds H.264 or AV1, WebM holds VP9 or AV1. ProRes, HEVC, VP8 and `.mov` are dropped.
- **The layout check draws each overlay alone** in the page (the others hidden), captures it and reads its ink, so it
  measures what the export draws.
- **The export downloads its browser.** The first export downloads Chrome for Testing (milestone 157, the one CI
  tests) into `~/.cache/cutcraft/browsers` with `@puppeteer/browsers`; `cutcraft browser install` does it ahead of
  time and `CUTCRAFT_CHROMIUM` names another binary. `playwright-core` is a dependency, not an optional peer.
- **Smart copy stays**, for VP9 into VP9, with the overlay check now in the kit and player rather than in the Node
  overlay plane.

## Consequences

- One engine: what the preview draws is what the export draws, including any CSS in a `<Layer>`, WOFF2 fonts, shaders
  and overlay effects. The "left out in the Node export" warnings and their docs are gone.
- Every export needs Chrome: about one download per machine, and a few seconds to start it per export.
- Without a GPU, Chrome draws on the CPU (SwiftShader for WebGL). Files the Node engine drew fast (plain cuts at
  111 fps on a 4-core Linux runner) are slower now; the export-speed page says its numbers are the Node engine's until
  they are measured again. `--copy` and `--tabs` are the levers meanwhile.
- The tests that render live in the browser suite (`test:browser`), which CI runs in the e2e job with the downloaded
  Chrome; `pnpm test` keeps the parts that need no browser. The tests read exports back with `ffmpeg` and `ffprobe`.

## Alternatives

Keeping Node for the files it can draw: the speed stays, and so does every feature built twice. Moving Node to a GPU
canvas (`skia-canvas` with GPU, or headless WebGL in Node): still a second renderer to keep equal to the player.
Screenshots and FFmpeg as Remotion does: slower than capturing in the page with `drawElementImage` and encoding with
WebCodecs, and FFmpeg comes back as a dependency.
