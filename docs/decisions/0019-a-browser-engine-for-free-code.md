# 0019. A browser engine exports what only a browser draws

> Carries out the export half of [0018](./0018-free-code-in-a-timeline-skeleton.md). The Node engine of
> [0015](./0015-a-headless-engine-renders-the-export.md) stays for every file it can draw.

## Context

`<Three>` and `<Motion>` (three.js and Motion on the video's clock) drew in the player and nowhere else: the Node
export left them out with a warning. The spike under `packages/render/spike` had shown that headless Chrome can step
the real Player frame by frame, capture it with HTML-in-Canvas (`drawElementImage`) and encode it with WebCodecs. It
had no sound, loaded a module baked into the page, returned the file as one string, and held every animation on the
page at the composition's time, which is wrong for a layer that does not start at 0.

## Decision

- **`@cutcraft/render` gets a second picture engine** (`src/web/`): a local server serves an export page, the cut
  file's text, its manifest and its media (with byte ranges); headless Chromium loads the file with the kit's
  `loadModule` and the three.js and Motion libraries, mounts the real `<Player>` inside a `<canvas layoutsubtree>`,
  and for each frame steps the compositor, waits for React and for every engine layer to have drawn it, then captures
  and encodes. Each layer keeps its own clock: the Layer's own animation hold and Motion's `controls.time` place it;
  nothing on the page is held at composition time.
- **Engines hold a frame until it is drawn.** The kit's engine registry counts open holds (`holdLayerFrame`); a
  `<ThreeScene>` holds from mount until its renderer exists and has drawn the frame. The export waits for none.
- **Pieces, not one file.** The page encodes runs of whole keyframe intervals into small containers, which Node joins
  exactly as it joins render workers' pieces, beside copied runs from smart copy.
- **The sound stays offline, in Node.** The browser draws pictures only; Node mixes the soundtrack with `mixPlan`, as
  0015 decided, so both engines write the same sound (the test compares them sample by sample).
- **Chosen per file.** `engine: "auto"` (the default, `cutcraft --engine`) takes the browser for a file with an engine
  layer (`<Three>`, `<Motion>`) and Node for every other file, so existing files export exactly as before. `browser`
  forces it, for a `<Layer>` that needs more CSS than Satori draws; `node` refuses it.
- **H.264 and VP9.** WebCodecs encodes AVC for `.mp4` and VP9 for `.webm`; ProRes, HEVC and AV1 stay with Node.
- **The browser is the user's.** `playwright-core` is an optional peer dependency; the binary is
  `CUTCRAFT_CHROMIUM` or Playwright's own. `drawElementImage` needs Chrome 153 or later with
  `--enable-features=CanvasDrawElement` (on by default from 157), which the engine passes. Without a GPU, WebGL runs on
  SwiftShader (`--enable-unsafe-swiftshader`); the page runs only the file being exported.

## Consequences

- A file with three.js or Motion exports as the player shows it, frame for frame, with its sound.
- Exporting such a file needs Chromium installed, which 0015 avoided for every file; files without engine layers
  still do not.
- **Speed.** On a 4-core Linux machine with no GPU (WebGL in software), the browser engine exported 1080p30 H.264
  with a three.js scene and a Motion layer at about 6 fps, after about 4 s to start the browser (3 s with the built
  page). The spike measured 185 to 202 fps on an M3 Pro with a GPU. The Node engine stays the fast path.
- Playwright's pinned Chromium (141) is too old for `drawElementImage`; CI installs a current Chrome for these tests.
- **What would retire the Node picture path**: the browser engine passing the overlay and mixer parity suites, the
  recipe and CLI tests, and coming within 10% of the Node engine's speed on Linux without a GPU. Until then both stay.

## Alternatives

Rendering every file in the browser now: one picture engine, but every export would need Chromium and run at a
fraction of the Node engine's speed on machines without a GPU. Recording the page in real time: sound and frames
would follow the wall clock, not the video's. Sending raw frames to Node to encode: about 8 MB per 1080p frame over the
DevTools protocol, slower than encoding in the page.
