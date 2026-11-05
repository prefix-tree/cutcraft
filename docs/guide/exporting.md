# Exporting

`@cutcraft/render` turns a file into an MP4 or WebM, a soundtrack (MP3 or WAV) or a still (PNG or JPEG). The export
runs the real player in headless Chrome: it steps the file frame by frame, waits for every clip, title, three.js
scene and Motion sequence to draw the frame, then captures and encodes it there with the browser's own encoders. The
preview and the export are the same code, so what the preview shows is what the file holds.

## From the command line

```sh
npm install cutcraft
npx cutcraft video.tsx --manifest manifest.json --media ./media --out video.mp4
```

`--out` picks the format by its extension: `.mp4` (H.264 and AAC), `.webm` (VP9 and Opus), or `.mp3` and `.wav` for
the soundtrack alone. `--codec av1` writes AV1 in either container. `--still 2 --out poster.png` writes one frame.
The manifest comes from `--manifest` or the file's own `manifest` export, and the media from `--media`, one file per
asset id, or else the file's folder. The [CLI reference](/reference/cli) lists every option.

The export loads a file the way the editor does: it may import `react`, `zod` and
`@cutcraft/kit`, plus what `--import` offers. A file that imports anything else
fails with the same message in both, so a file that exports also opens in the editor.

## The browser it runs in

The first export downloads Chrome for Testing into `~/.cache/cutcraft/browsers` once and reuses it
after that. `npx cutcraft browser install` downloads it ahead of time, for a Docker image or a CI cache.
`CUTCRAFT_BROWSER_CACHE` moves the cache, and `CUTCRAFT_CHROMIUM` names a Chrome or Chromium 153 or later to use
instead of downloading one.

The capture uses HTML-in-Canvas (`drawElementImage`), which Chrome ships behind a flag the export turns on. Without a
GPU, WebGL runs in software: about 6 frames a second at 1080p on a 4-core machine for a file with three.js, plus a
few seconds to start the browser. With a GPU it is much faster.

## On a server

Chrome needs a few system libraries that a desktop has and a slim Linux image does not. On Debian or Ubuntu,
`playwright-core` (installed with the export) lists and installs them, and `cutcraft browser install` puts Chrome in the
image, so no export downloads it at run time:

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx --yes playwright-core install-deps chromium && npx cutcraft browser install
COPY . .
CMD ["npx", "cutcraft", "video.tsx", "--out", "out/video.mp4"]
```

`npx playwright-core install-deps --dry-run chromium` prints the packages instead of installing them, for an image
built another way. In GitHub Actions the runners already have them; cache the browser so it downloads once per
CutCraft version:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/cutcraft/browsers
    key: cutcraft-chrome-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
- run: npx cutcraft browser install   # keeps a cached Chrome, downloads one otherwise
- run: npx cutcraft video.tsx --out video.mp4
```

With no GPU, as on most servers, Chrome draws on the CPU; `--tabs` spreads the pieces over more cores
([Faster](#faster)).

### Motion blur

<Example src="previews/guide/motion-blur" alt="A puck crossing the frame, blurred along its path">

<<< @/../examples/showcase/guide/motion-blur.tsx

</Example>

A film camera blurs whatever moves while its shutter is open. With `motionBlur`, the browser export draws each frame
`samples` times while the shutter is open and averages the pictures. Every frame in CutCraft is a function of time,
so footage, titles, `<Motion>`, three.js and free code all blur the same way.

`shutterAngle` sets how long the shutter stays open, as a share of the frame: 180 (half the frame, the film default)
looks natural, 90 is crisper and choppier, and 360 blurs the most. `samples` (2 to 64, default 8) trades smoothness for
time, because the export draws that many pictures per frame: 8 samples take about eight times as long.

The blur shows in exported videos and stills. The preview stays sharp.

## From code

```ts
import { directoryResolver, loadVideo, renderStill, renderVideo } from "@cutcraft/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
const media = directoryResolver("media", video.manifest);
const result = await renderVideo({
  state: video.state,
  source: video.source,                 // the file's text: the export page loads it, as the editor does
  media,
  out: "video.mp4",
  tabs: 2,
  onProgress: ({ frame, frames }) => console.log(frame, frames),
});
// result: frames, audio, fps, width, height, wallMs, tabs, copiedFrames, warnings

// One frame, the same way:
await renderStill({ state: video.state, source: video.source, media, out: "poster.png", time: 2 });
```

`renderVideo` stops with an error when an asset cannot be opened or decoded,
rather than drawing a placeholder into a video you will publish
(`onAssetError: "continue"` changes that). `result.warnings` lists what was
left out and why.

## What it draws

Everything the preview draws, because it is the preview: footage, transitions, effects, crops, masks, blend modes,
titles, shapes, SVG, stickers, layers with any CSS and React, captions, `<Three>`, `<Motion>`, and the effects and
transitions a file declares in GLSL. A few limits remain, listed in [What renders](/reference/rendering), and the
check reports each as a `not-rendered` warning.

- Fonts: Inter, Space Grotesk, Playfair Display, DM Sans and JetBrains Mono are bundled (regular and bold, italic
  where the family has one; see [Themes](/guide/themes#fonts)). A title that names another font falls back to Inter
  unless the file declares it (`font()`, `googleFont()`) or you pass it with `--font`. TTF, OTF, WOFF and WOFF2 all
  work.
- Sound is mixed in the page by `mixPlan`, a pure function of the audio plan: volume, fades, automation, ducking,
  pan, speed and speed-key ramps (pitch follows speed, as in the preview), silence through freeze holds, and
  sample-rate conversion. Mute and solo apply. Chrome encodes Opus itself; AAC and MP3 go through Mediabunny's
  WebAssembly encoders, since Chrome for Testing has none.

## Faster

Two options, in the order to try them.

### `--tabs`

The frames are cut into runs of whole keyframe intervals, and each page of the browser renders and encodes its runs
into small containers. Node joins them in order with the soundtrack, copying the encoded packets. The pictures are
the same as one page's, frame for frame; only where the keyframes fall differs. Each page holds its own decoders and
encoder, so memory grows with the count; on a machine with spare cores, two to four pages help most.

### `--copy`

Where the picture is nothing but a stretch of one source file, the encoded packets of whole groups of pictures are
copied and only the ends are rendered. It applies when all of these hold for a stretch of frames:

- the source is VP9 and so is the output;
- the source has the composition's size and frame rate;
- one clip is shown, untransformed, at full size, at speed 1, with no fade, filter, crop, mask or blend, and no
  transition, title, caption or any other overlay at those times, and the file has no motion blur.

Copied pictures keep the source's quality and are not decoded or encoded at all. A stretch that does not qualify is
rendered as usual. `--copy` is opt-in because a source whose stream the encoder's does not match fails when the
pieces are joined instead of falling back.

[How the export works](./export-architecture) explains what runs where: the page, the pieces and the sound.

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
10%. The check draws each overlay alone in the export page and measures its ink. From code:
`checkLayout({ state, media, source: { ...video.source, file }, safeZone, subject })`, and `formatLayout(result)` for
the text.

## Checking an export

To check a file you exported:

```sh
ffprobe -v error -show_streams video.webm                 # codec, size, frame count, one video and one audio stream
ffmpeg -v error -xerror -i video.webm -f null -           # decodes without a single error
ffmpeg -i video.webm -vf "select=eq(n\,90)" -frames:v 1 frame.png   # one frame, to look at
```

## Requirements

Node 22.19 or later, and the Chrome the first export downloads (or `CUTCRAFT_CHROMIUM`). There is no FFmpeg and no
native module to install.
