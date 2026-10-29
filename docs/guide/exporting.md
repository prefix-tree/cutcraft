# Exporting

`@cutcut/render` turns a file into a WebM or MP4 in Node, with no browser. It
runs the same engine as the preview (the plan, the painter, the compositor and
the audio plan) on different surfaces, so what the preview shows is what the
file holds. Why it is built this way is [decision 0015](/decisions/0015-a-headless-engine-renders-the-export).

## From the command line

```sh
pnpm --filter @cutcut/render exec cutcut-render video.tsx --manifest manifest.json --media ./media --out video.webm
```

(`cutcut-render` is the package's binary; it is TypeScript run through `tsx`, so
`tsx packages/render/src/cli.ts …` is the same command.)

| Option | |
|---|---|
| `--out <file>` | Where to write. `.webm` gives VP9 and Opus, `.mp4` gives H.264 and AAC. |
| `--manifest <file>` | The asset manifest. Without it the file's own `manifest` export is used. |
| `--media <dir>` | One file per asset id, with or without an extension (`podcast.webm`, `podcast`). Default: the file's folder. |
| `--props <json>` | Props for the file's component, over its `defaults`. |
| `--from <s>` `--to <s>` | Render only this part of the composition. |
| `--workers <n>` | Threads. Default: one fewer than the cores, at most four. `1` renders in the main thread. |
| `--speed fast` | The encoder's real-time mode: much faster, larger files for the same quality. |
| `--copy` | Smart copy, below. |
| `--codec <name>` | `vp9`, `vp8`, `av1`, `avc`, `hevc`. |
| `--bitrate <bps>` | Video bits per second. Default: about 0.1 per pixel per frame. |
| `--keyframe <s>` | Seconds between keyframes. Default 2. |
| `--silent` | No soundtrack. |
| `--font Name[:weight[:style]]=file` | A font for titles, repeatable. TTF, OTF or WOFF (not WOFF2). |
| `--continue` | Draw the grey placeholder for an asset that cannot be read, instead of stopping. |

A file that imports its own packages is compiled with the nearest
`tsconfig.json` (for `paths` and `target`) and React's automatic JSX runtime.

## From code

```ts
import { defaultWorkers, directoryResolver, loadVideo, renderVideo } from "@cutcut/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
const result = await renderVideo({
  state: video.state,
  media: directoryResolver("media", video.manifest),
  interiors: video.interiors,           // the children of each <Layer>
  out: "video.webm",
  // Threads need the file, because each loads it for itself:
  parallel: { file: "video.tsx", load: { manifest: "manifest.json" }, mediaDir: "media", workers: defaultWorkers() },
  smartCopy: true,
  onProgress: ({ frame, frames }) => console.log(frame, frames),
});
// result: frames, fps, width, height, wallMs, workers, copiedFrames, stagesMs, warnings
```

`renderVideo` stops with an error when an asset cannot be opened or decoded,
rather than drawing a placeholder into a video you will publish
(`onAssetError: "continue"` changes that). `result.warnings` lists what was
left out and why.

## What it draws

Everything the preview draws. Footage, transitions, effects, crops, masks,
blend modes and fades go through the same painter. Above them, in track order
and with captions on top:

- **Titles, layers and captions** are laid out by [Satori](https://github.com/vercel/satori)
  from the same React trees the browser mounts, then drawn with the element's
  matrix, opacity, filter, blend and corner radius. Satori reads a subset of
  CSS: flexbox, not grid, and no state or effects inside a layer (only
  `useT()` and `useLayer()`). Put images in a layer as data URLs. An element
  Satori cannot draw is left out with a warning that names it.
- **Shapes and SVG** are drawn as vectors (SVG through the same preparation as the
  preview; see [Rendering](/guide/rendering#svg)), **stickers** and image assets as
  images.
- **Fonts**: Inter, Space Grotesk, Playfair Display, DM Sans and JetBrains
  Mono are bundled (regular and bold, italic where the family has one; see
  [Themes](/guide/themes#fonts)). A title that names another font is set in
  Inter with a warning unless you pass the font with `--font` or `fonts`.
- **Sound** is mixed by `mixPlan`, a pure function of the audio plan: volume,
  fades, automation, ducking, pan, speed (pitch follows speed, as in the
  preview) and sample-rate conversion. Mute and solo apply.

Not drawn, in the export as in the preview: transition types other than
crossfade (drawn as one), effects with no CSS filter equivalent, colour wheels
and LUTs, matte masks, audio effects, pitch correction, reversed audio, 3D
text and most text animation presets. The check reports each of these in your
file as a `not-rendered` lint warning. An adjustment filters the footage
beneath it, not overlays, in both. In the preview only: an overlay's `blend`
does not mix with the footage. Text in the export differs from the browser's
by anti-aliasing and sub-pixel placement.

## Faster

Three things, in the order to try them:

**Workers.** The frames are cut into runs of whole keyframe intervals. Each
worker renders and encodes runs into small containers; the main thread joins
them in order and mixes the sound. The pictures are the same as one thread's,
frame for frame; only where the keyframes fall differs. Each worker holds its
own decoders and encoder, about 1 GB at 1080p. Cores are the limit: four
workers on four cores gave 1.6 to 2.2 times one thread.

**`--speed fast`.** Trades compression for speed in the encoder: about 1.4 times
faster on one thread for both VP9 and H.264, at larger files.

**`--copy`.** Where the picture is nothing but a stretch of one source file,
the encoded packets of whole groups of pictures are copied and only the ends
are rendered. It applies when all of these hold for a stretch of frames:

- the source is VP8 or VP9 and so is the output codec;
- the source has the composition's size and frame rate;
- one clip is shown, untransformed, at full size, at speed 1, with no fade,
  filter, crop, mask or blend, and no transition, title, caption or any other
  overlay at those times.

Copied pictures keep the source's quality and are not decoded or encoded at
all: 20 seconds of cuts on keyframes took 1.2 seconds. A stretch that does not
qualify is rendered as usual. `--copy` is opt-in because a source whose stream
the encoder's does not match fails when the pieces are joined instead of
falling back.

| 20 s of 1080p30, 4 cores | frames per second |
|---|---|
| five cuts, one thread | 12 |
| five cuts, four workers | 21 |
| five cuts, `--speed fast`, four workers | 23.5 |
| talking head with captions throughout, one thread / four workers | 9 / 21 |
| five cuts on keyframes, `--copy` | 460 |

`pnpm --filter @cutcut/render bench` measures these on your machine, with the
time per frame spent in each stage.

## Checking an export

The test media's source video paints its frame number into a strip, and the
tests read it back out of the decoded file, so a frame that is one off fails.
For your own files:

```sh
ffprobe -v error -show_streams video.webm                 # codec, size, frame count, one video and one audio stream
ffmpeg -v error -xerror -i video.webm -f null -           # decodes without a single error
ffmpeg -i video.webm -vf "select=eq(n\,90)" -frames:v 1 frame.png   # one frame, to look at
```

## Requirements

Node 22. `skia-canvas` and `node-av` ship a binary per platform and are
installed with the package; the FFmpeg inside `node-av` is GPLv3-configured, see
the decision record before you ship it inside a product. The tests generate
their media with the system `ffmpeg`.
