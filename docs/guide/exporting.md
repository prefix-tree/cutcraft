# Exporting

`@cutcraft/render` turns a file into a WebM, MP4 or MOV, a soundtrack (MP3 or WAV)
or a still (PNG or JPEG) in Node, with no browser. It
runs the same engine as the preview (the plan, the painter, the compositor and
the audio plan) on different surfaces, so what the preview shows is what the
file holds. Why it is built this way is [decision 0015](/decisions/0015-a-headless-engine-renders-the-export).

## From the command line

```sh
npx cutcraft video.tsx --manifest manifest.json --media ./media --out video.webm
```

(`cutcraft` is the CLI package's binary. The file imports `@cutcraft/kit`, so install it next to the file:
`npm install cutcraft @cutcraft/kit react`. In this repo, `pnpm exec tsx packages/render/src/cli.ts …` is the same command.)

| Option | |
|---|---|
| `--out <file>` | Where to write. `.webm` gives VP9 and Opus, `.mp4` H.264 and AAC, `.mov` ProRes and 16-bit PCM. `.mp3` and `.wav` hold the soundtrack alone. |
| `--still <s>` | Write the frame at this time instead, to a `.png` or `.jpg` `--out`. |
| `--manifest <file>` | The asset manifest. Without it the file's own `manifest` export is used. |
| `--media <dir>` | One file per asset id, with or without an extension (`podcast.webm`, `podcast`). Default: the file's folder. |
| `--props <json>` | Props for the file's component, over its `defaults`. |
| `--from <s>` `--to <s>` | Render only this part of the composition. |
| `--workers <n>` | Threads. Default 1, the main thread; more rarely helps (below). |
| `--software` | Encode H.264 and HEVC in software even where the machine has a hardware encoder. |
| `--speed <s>` | How hard the software H.264/HEVC encoder works: `balanced` (default, x264's veryfast), `quality` (medium: smaller files, about half as fast) or `fast` (real-time mode, larger files). |
| `--copy` | Smart copy, below. |
| `--codec <name>` | `vp9`, `vp8`, `av1`, `avc`, `hevc`, `prores`. A codec the container cannot hold (ProRes in WebM) is an error. |
| `--bitrate <bps>` | Video bits per second. Default: about 0.1 per pixel per frame. |
| `--quality <preset>` | `very-low`, `low`, `medium`, `high` or `very-high`: the encoder picks the bitrate for the size and codec. In place of `--bitrate`. |
| `--keyframe <s>` | Seconds between keyframes. Default 2. |
| `--silent` | No soundtrack. |
| `--font Name[:weight[:style]]=file` | A font for titles, repeatable. TTF, OTF or WOFF (not WOFF2). |
| `--continue` | Draw the grey placeholder for an asset that cannot be read, instead of stopping. |

A file that imports its own packages is compiled with the nearest
`tsconfig.json` (for `paths` and `target`) and React's automatic JSX runtime.

## From code

```ts
import { directoryResolver, loadVideo, renderStill, renderVideo } from "@cutcraft/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
const result = await renderVideo({
  state: video.state,
  media: directoryResolver("media", video.manifest),
  interiors: video.interiors,           // the children of each <Layer>
  out: "video.webm",
  // Worker threads (rarely faster; see below) need the file, because each loads it for itself:
  // parallel: { file: "video.tsx", load: { manifest: "manifest.json" }, mediaDir: "media", workers: 2 },
  smartCopy: true,
  onProgress: ({ frame, frames }) => console.log(frame, frames),
});
// result: frames, fps, width, height, wallMs, workers, copiedFrames, stagesMs, warnings

// One frame, through the same pipeline:
await renderStill({ state: video.state, media: directoryResolver("media", video.manifest), interiors: video.interiors, out: "poster.png", time: 2 });
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
  fades, automation, ducking, pan, speed and speed-key ramps (pitch follows
  speed, as in the preview), silence through freeze holds, and sample-rate
  conversion. Mute and solo apply.

Not drawn, in the export as in the preview: transition types other than
crossfade, dips to black or white, wipe, slide and push (drawn as a crossfade), effects with no CSS filter equivalent (besides vignette and grain), colour wheels
and LUTs, matte masks, audio effects, pitch correction, 3D text and most text
animation presets. The check reports each of these in your
file as a `not-rendered` lint warning. An adjustment filters the footage
beneath it, not overlays, in both. In the preview only: an overlay's `blend`
does not mix with the footage. Text in the export differs from the browser's
by anti-aliasing and sub-pixel placement.

## Faster

Most of an export's time is the encoder's. Two things are automatic:

- **Pictures pass straight through.** A frame that is one source picture shown
  as it is (full frame, untransformed, with nothing over, under or applied to
  it) goes from the decoder to the encoder as decoded: never converted to RGBA,
  drawn or read back. Other frames convert only the pictures they draw.
- **Hardware encoding.** H.264 and HEVC go through the machine's hardware
  encoder when it has one that starts (Apple's VideoToolbox, NVIDIA, VA-API).
  It is faster and spends its bits a little less well; `--software` turns it
  off. Most Linux servers have none and encode in software.

Then, in the order to try them:

**Workers.** The frames are cut into runs of whole keyframe intervals. Each
worker renders and encodes runs into small containers; the main thread joins
them in order and mixes the sound. The pictures are the same as one thread's,
frame for frame; only where the keyframes fall differs. Each worker holds its
own decoders and encoder, about 1 GB at 1080p. The encoder already uses every
core, so workers rarely help: on 4-core Linux and a 12-core Mac, two or four
were no faster than one, or slower.

**`--speed`.** Trades compression for speed in the software encoder. The
default, `balanced`, is x264's veryfast preset; on 4-core Linux it rendered the
cuts at 111 fps against medium's 61, and the crossfades at 37 against 31, with
the cuts scoring 53.3 dB against 56.4 at the same 8 Mb/s. `quality` is medium,
for the smallest file at a bitrate. `fast` is the real-time mode: faster again,
at larger files. VP9 knows only `fast` and the rest.

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

| 1080p30 H.264 at 8 Mb/s, one thread | 4-core Linux, software | Apple M3 Pro, hardware |
|---|---|---|
| five cuts from one file | 111 | 203 |
| the same with crossfades and a title on each | 37 | 98 |
| moving shapes and titles, no footage | 61 | 117 |

`pnpm --filter @cutcraft/render bench:scenarios` measures these on your machine,
with the time per frame spent in each stage and a sweep of worker counts; CI
runs it on request (`gh workflow run ci.yml`).

## Checking the layout

`--check-layout` samples every frame (or every `--step` seconds) and reports
each overlay that leaves the frame, leaves the safe zone, covers the captions
or covers the subject, with the first and last time it does. It measures the
pixels each element actually draws (titles, shapes, SVG, stickers, graphics,
layers and captions) after its entrance, exit, keyframes and transform, so a
slide that crosses the edge between two spot checks is caught. Hollow
graphics count by the cells their ink touches, so corner brackets around a
face do not cover it. It writes no file. Like a compiler, it points each
issue at its place in the file (the element's `transform`, the helper call
that made it, or the JSX in the loop that made it), lists issues by line,
says what is wrong in one sentence, and gives the smallest fix. It exits 3
when it finds issues (1 is an error, 2 the usage text), so a script can stop
on them:

```sh
cutcraft video.tsx --check-layout --safe-zone tiktok --subject 0.2,0.18,0.6,0.37
```

```text
video.tsx:30:9: subject: title "t1" covers the subject from 0.53 s to 2.40 s.
  30 |         <Title id="t1" anchor="v1" offset={0.5} duration={2} size={40}>Hello</Title>
     |         ^
  fix: move it down 89 px (transform.position.y +89), then check again: the move may run into something else

1 layout issue on 1 element in 900 samples (every frame, safe zone tiktok).
```

`--json` prints the same as data, for a program or an agent that wants the
numbers:

```json
{
  "summary": "1 layout issue on 1 element in 900 samples (every frame, safe zone tiktok).",
  "issues": [{
    "rule": "subject", "id": "t1", "kind": "title", "with": "subject", "from": 0.533, "to": 2.4, "at": 0.533,
    "box": { "x": 273, "y": 165, "w": 96, "h": 30 }, "area": { "x": 224, "y": 72, "w": 192, "h": 180 },
    "message": "title \"t1\" covers the subject from 0.53 s to 2.40 s.",
    "fix": "move it down 89 px (transform.position.y +89), then check again: the move may run into something else",
    "source": { "file": "video.tsx", "line": 30, "column": 9, "code": "        <Title id=\"t1\" …>Hello</Title>" }
  }],
  "samples": 900,
  "warnings": []
}
```

`from` and `to` are the first and last offending samples; `at` is the worst
one, where `box` is the element's ink and `area` is what it breaks (the
frame, the zone, or the captions' or subject's box). Pixels are composition
pixels from the top left. A bad `--step`, `--from` or `--to` is an error, not
an empty report.

| Rule | |
|---|---|
| `frame-edge` | Part of the element is outside the frame. |
| `safe-zone` | Inside the frame but outside the zone; `with` names it. `--safe-zone` takes `tiktok`, `reels`, `shorts` (the platforms' published zones for 1080×1920), `title-safe` (the default) or `action-safe`, or `top,right,bottom,left` fractions. |
| `captions` | The element overlaps a captions line; `with` is the captions element. |
| `subject` | The element overlaps the subject. |

The subject comes from the manifest: an asset's `subjects` are boxes sampled
over its source time, as fractions of its picture (`{ t, x, y, w, h }`), and
the check maps them through each clip's crop, fit and transform. Footage whose
manifest entry has none uses `--subject x,y,w,h`, fractions of the frame,
while it is on screen. Overlays beneath the footage and ones that fill the
frame (backgrounds) are not checked, and neither is an element fainter than
10%. From code: `checkLayout({ state, media, interiors, safeZone, subject, source: { file, text } })`,
and `formatLayout(result)` for the text.

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
