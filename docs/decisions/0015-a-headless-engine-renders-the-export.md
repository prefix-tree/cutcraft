# 0015. A headless engine renders the export

> Supersedes the export half of [0007](./0007-the-browser-renders.md). The preview is still the browser's; the export no longer runs one.
>
> Superseded by [0021](./0021-one-export-engine.md): the export runs the player in Chrome again, and this engine is gone.

## Context

The library could not yet produce a video file. Decision 0007 said export
would be "a headless browser driving the same player frame by frame". Three
things changed the choice:

- The canvas plane was already DOM-free. `Compositor`, `CanvasPainter`,
  `buildFramePlan` and `buildAudioPlan` are pure over three seams
  (`createCanvas`, `FrameSource`, `MediaResolver`). A browser was needed only
  for what sits above the footage (titles, shapes, SVG, stickers, layers and
  captions) and for Web Audio.
- Audio has to be mixed by us, offline, not captured from a real-time graph.
  A browser export would record the player's output at the speed of playback.
- A server that renders video should not need a browser installed, a display,
  or a page that has to finish loading fonts before each frame is true.

The user chose a headless engine in Node, correct first and then fast, with
smart copy for cuts, overlay caching and parallel workers.

## Decision

`@cutcraft/render` runs the player's own engine in Node:

- **One renderer.** The export calls the same `buildFramePlan`,
  `CanvasPainter`, `Compositor` and `buildAudioPlan` as the preview. Only the
  surfaces differ: a skia canvas for the browser's, Satori for the DOM, an
  offline mixer for Web Audio. `@cutcraft/player/engine` is the DOM-free entry
  (a test walks its import graph); `@cutcraft/player/overlays` holds the trees
  the overlay elements draw, with no hooks, so the browser mounts them and
  the Node renderer rasterises them.
- **Decode and encode with Mediabunny and `@mediabunny/server`** (FFmpeg
  through `node-av`). Output is WebM with VP9 and Opus by default; MP4 with
  H.264 and AAC when asked.
- **Frames are stepped, not sought.** `Compositor.step(t)` keeps every decoder
  streaming and waits for the frame it needs; `renderFrame` re-primes every
  decoder per call and stays for random access. Frame picks gain a 1 ms
  tolerance (`PICK_EPS`) because container timestamps are rounded to the
  millisecond, which made the frame for `n/fps` the previous one.
- **Overlays through Satori.** Titles, layer interiors and captions are laid
  out by Satori from the same React trees the browser mounts and drawn onto
  the frame with the matrix, opacity, filter, blend and corner radius the DOM
  gives them (skia applies them, so blend modes work in the export). Shapes
  and SVG are drawn as vectors, stickers as images. Inter is bundled; other
  fonts are passed in. An element Satori cannot draw is left out with one
  warning.
- **Our own mixer.** `mixPlan` sums the plan's occurrences from the absolute
  frame index, so a sample does not depend on the block size; linear
  resampling converts sample rates; pitch follows speed as in the preview;
  the panner follows Web Audio's rules. Against an `OfflineAudioContext`
  built the way the player builds its graph it is bit-exact at 1x and 1.5x
  (including 44.1 to 48 kHz) and within 0.02 at 0.8x.
- **Parallel runs, joined at keyframes.** Workers each load the file (a React
  tree cannot cross threads), render runs of whole keyframe intervals, and
  encode them into small containers of their own. The main thread reads their
  packets back in order, writes them to the file and mixes the sound. The
  pictures are the same as one thread's; only where keyframes fall differs.
- **Smart copy, opt-in.** Where the picture is nothing but a stretch of one
  VP8/VP9 source at the composition's size and rate, the packets of whole
  groups of pictures are copied and only the ends are rendered.
- **Overlay layout is cached**: a tree of plain elements is laid out once and
  reused while its content is the same; a layer interior that never reads the
  clock is laid out once.

## Consequences

- **Licence of the FFmpeg binary.** `node-av` bundles a Jellyfin FFmpeg 6.1
  configured with `--enable-gpl --enable-version3` (x264, x265, libvpx, libopus
  among others). The packages are MIT and MPL-2.0, but the binary they load is
  GPLv3. That matters to anyone who ships `@cutcraft/render` inside a product
  (and the reason MP4 with H.264 is not the default: the default codecs are
  libvpx and libopus). `@cutcraft/render` is private and not published; before
  it is, either document the obligation or load an LGPL FFmpeg.
- **Satori is a subset of CSS.** Flexbox, not grid; no hooks or state in a
  layer; images inside a layer as data URLs. What sits outside it renders
  wrong or not at all, and is skipped with a warning. Text will never match
  the browser to the pixel: same font, same box, ink bounds within 4 px and
  coverage within 7% in the parity test.
- **What the export does not draw** is what the preview does not (the list in
  the rendering guide), plus an adjustment's backdrop filter over overlays,
  which is DOM-only (the canvas part is the painter's).
- **Native dependencies.** `skia-canvas` and `node-av` ship binaries per
  platform; install is heavier. Tests generate media with the system `ffmpeg`.
- **Smart copy fails loudly.** A source stream whose profile or size the
  encoder's does not match is rejected when the pieces are joined; it does not
  fall back to rendering. That is why it is a flag.
- **Memory.** Each worker holds its own decoders, canvas and encoder: about
  1 GB each at 1080p.

## Measured

20 s of 1080p30 on a 4-core machine, frames per second (pipeline: decode, composite,
overlays, readback, encode; the stage breakdown is in the bench output):

| | one thread | four workers | four workers, `--speed fast` |
|---|---|---|---|
| five hard cuts, one source | 12.2 | 21.0 | 23.5 |
| talking head, captions throughout | 9.2 | 20.6 | |
| launch recap, first 10 s | 9.4 | 15.0 | |
| the cuts, on keyframes, with `--copy` | 460 | | |

One encoder is the limit on one thread (VP9 at default quality costs about
80 core-milliseconds per 1080p frame); concurrent encoders scale to the cores
(1 → 11.5 fps, 4 → 28.6 fps in isolation), which is what the workers use. The
CPU, not the pipeline, is the limit at four workers on four cores.

## Alternatives

A browser on the server (Playwright stepping `renderFrame`, as 0007 said, or
Remotion's renderer): the same pixels as the preview by construction, at the
price of a browser per worker, real-time audio capture or a second mixer, and
a page lifecycle to manage. It remains the answer for a Layer that needs more
CSS than Satori has; nothing here prevents adding it as a second export.

FFmpeg filter graphs: cannot draw React or web fonts and would be a second
renderer that disagrees with the preview, the reason 0007 gave.

Mixing in the encoder (FFmpeg's `amix`): its resampling, panning and envelope
rules are not Web Audio's, so the export would not sound like the preview.
