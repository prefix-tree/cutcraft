# Exporting

`@uberscene/render` turns a file into a video (MP4 or WebM), a soundtrack (MP3 or WAV) or a still (PNG or JPEG). The
export runs the same player as the preview, so what the preview shows is what the file holds. This page covers the
formats, exporting on a server, motion blur, and making an export faster.

```sh
npm install uberscene
npx uberscene video.tsx --out video.mp4
```

To check the file before or after you export it, see [Checking a cut](./checking).

## From the command line

`--out` names the file to write, and its extension picks the format. The other inputs come from the file when you
leave them out:

| Option | Gives | When left out |
|---|---|---|
| `--out` | The file to write; its extension picks the format. | Required. |
| `--manifest` | The manifest. | The file's own `manifest` export, or else the nearest `uberscene.json` from the file's folder upward. |
| `--media` | A folder with one file per asset id. | The file's folder, the manifest's folder, or `media/` beside the manifest. |

[Where the manifest and the media are found](/reference/cli#where-the-manifest-and-the-media-are-found) has the details, and the [CLI reference](/reference/cli) lists every option.

The export loads a file the way the editor does: it may import `react`, `zod` and `@uberscene/kit`, its own `.ts` and
`.tsx` modules inside the project, plus what `--import` offers. A file that imports anything else fails with the same message in both, so a file that exports
also opens in the editor.

## Formats

| `--out` | Writes |
|---|---|
| `video.mp4` | H.264 video and AAC sound. |
| `video.webm` | VP9 video and Opus sound. |
| `sound.mp3`, `sound.wav` | The soundtrack alone. |
| `poster.png`, `poster.jpg` with `--still 2` | One frame, at 2 seconds. |

`--codec av1` writes AV1 video in either container. With the [native codecs](#native-codecs-experimental) on,
`--codec prores` writes ProRes to a `.mov`.

## The browser it runs in

The export runs the real player in headless Chrome. It steps the file frame by frame, waits for every clip, title,
three.js scene and Motion sequence to draw the frame, then captures and encodes it in the page with the browser's own
encoders.

The first export downloads Chrome for Testing 157 into `~/.cache/uberscene/browsers` once and reuses it after that.
The export runs on Chrome 157 only: it is the version the tests draw on, and another one draws text a little
differently. A binary of any other version is refused before the export starts.

| To | Use |
|---|---|
| Download it ahead of time, for a Docker image or a CI cache | `npx uberscene browser install` |
| Keep the cache somewhere else | `UBERSCENE_BROWSER_CACHE` |
| Use your own Chrome 157 instead of downloading one | `UBERSCENE_CHROMIUM` |

The capture uses HTML-in-Canvas (`drawElementImage`), which Chrome ships behind a flag the export turns on.

Without a GPU, WebGL runs in software: about 6 frames a second at 1080p on a 4-core machine for a file with three.js,
plus a few seconds to start the browser. With a GPU it is much faster.

## On a server

A slim Linux image lacks a few system libraries Chrome needs that a desktop has. On Debian or Ubuntu,
`playwright-core` (installed with the export) lists and installs them, and `uberscene browser install` puts Chrome in
the image, so no export downloads it at run time:

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx --yes playwright-core install-deps chromium && npx uberscene browser install
COPY . .
CMD ["npx", "uberscene", "video.tsx", "--out", "out/video.mp4"]
```

For an image built another way, `npx playwright-core install-deps --dry-run chromium` prints the packages instead of
installing them.

In GitHub Actions the runners already have the libraries. Cache the browser so it downloads once per UberScene
version:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/uberscene/browsers
    key: uberscene-chrome-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
- run: npx uberscene browser install   # keeps a cached Chrome, downloads one otherwise
- run: npx uberscene video.tsx --out video.mp4
```

Most servers have no GPU, so Chrome draws on the CPU. `--tabs` spreads the work over more cores ([Faster](#faster)).

## Motion blur

Motion blur smears whatever moves, the way a film camera does while its shutter is open. Turn it on with
`motionBlur` on the `<Composition>`:

<Example src="previews/guide/motion-blur" alt="A puck crossing the frame, blurred along its path">

<<< @/../examples/showcase/guide/motion-blur.tsx

</Example>

| Option | Does |
|---|---|
| `shutterAngle` | How long the shutter stays open, as a share of the frame. 180 (half the frame, the film default) looks natural, 90 is crisper and choppier, 360 blurs the most. |
| `samples` | How many pictures are averaged per frame, 2 to 64, default 8. More is smoother and slower: 8 samples take about eight times as long. |

The export draws each frame `samples` times across the open shutter and averages the pictures. Every frame in
UberScene is a function of time, so footage, titles, `<Motion>`, three.js and free code all blur the same way.

::: tip
The blur shows in exported videos and stills. The preview stays sharp.
:::

## Faster

Start with a draft to watch while you work. For the real export, try `--tabs`, then `--copy`.

### A draft

`--draft` renders the video for watching, not for keeping:

```sh
npx uberscene video.tsx --out video.mp4 --draft
```

- It draws every second frame and shows each twice as long, so the draft is as long as the video and its sound is
  the same.
- Its pictures are half as wide and half as high, encoded at the `low` quality preset unless `--bitrate` or
  `--quality` is given.
- It is written beside the file `--out` names, as `video.draft.mp4`, so a draft never replaces the video.

A draft draws half the frames, but it is not twice as fast. Each frame is still drawn at full size and scaled down
afterwards, and drawing is most of what an export does. A two minute film with a three.js scene took a little over
nine minutes as a draft against about twelve in full.

A draft's pictures are the video's own, smaller. To see one move without rendering at all, use
[`look --motion`](/reference/cli#motion).

### `--tabs`

`--tabs 3` renders with three pages of the browser at once (the default is one), each on its own share of the
frames. The pictures are
the same as one page's, frame for frame; only where the keyframes fall differs.

Each page holds its own decoders and encoder, so memory grows with the count. On a machine with spare cores, two to
four pages help most.

::: details How the frames are shared
The frames are cut into runs of whole keyframe intervals, and each page renders and encodes its runs into small
containers. Node joins them in order with the soundtrack, copying the encoded packets.
:::

### `--copy`

`--copy` skips drawing where the picture is nothing but a stretch of one source file. The encoded packets of whole
groups of pictures are copied, and only the ends are rendered. Copied pictures keep the source's quality and are not
decoded or encoded at all.

It applies to a stretch of frames when all of these hold:

- the source is VP9 and so is the output;
- the source has the composition's size and frame rate;
- one clip is shown, untransformed, at full size, at speed 1, with no fade, filter, crop, mask or blend, and no
  transition, title, caption or any other overlay at those times, and the file has no motion blur.

A stretch that does not qualify is rendered as usual.

::: warning
`--copy` is opt-in because a source whose stream does not match the encoder's fails when the pieces are joined,
instead of falling back.
:::

[How the export works](./export-architecture) explains what runs where: the page, the pieces and the sound.

## Native codecs (experimental)

By default Chrome decodes the footage and encodes the export. `UBERSCENE_CODECS` hands either job to UberScene's
native codec process instead. It is a small Rust program on [craft-video](https://github.com/storytold/craft-libs),
FilmCraft's pure-Rust codecs, with no FFmpeg.

```sh
pnpm native:build                                               # once, in the UberScene workspace
UBERSCENE_CODECS=native-decode npx uberscene video.tsx --out video.mp4
UBERSCENE_CODECS=native npx uberscene video.tsx --out master.mov --codec prores --quality high
```

| `UBERSCENE_CODECS` | Footage decoded by | Pictures encoded by |
|---|---|---|
| unset or `browser` | Chrome | Chrome |
| `native-decode` | the native codecs | Chrome |
| `native-encode` | Chrome | the native codecs |
| `native` | the native codecs | the native codecs |

What it is for:

- Footage Chrome cannot decode on a machine without a GPU: HEVC (phone video), ProRes and DNxHR.
- A ProRes master: `.mov` with `--codec prores`. `--quality` picks the profile: `very-low` Proxy, `low` LT, `medium`
  422, `high` 422 HQ (the default), `very-high` 4444.

How it behaves:

- It is built from source for now. `UBERSCENE_CODEC_BIN` names a binary built elsewhere.
- An asset the native decoder cannot read is decoded by Chrome, with a warning.
- The native encoder writes H.264 and ProRes, not VP9 or AV1, and does not combine with `--copy`.
- The sound is always mixed and encoded in the page.
- On a CPU it is not faster than Chrome's codecs yet. Decision 0031 in the repository has the numbers.

## When a frame never finishes

Each frame has a deadline: 60 seconds unless `--frame-timeout` (or `frameTimeout` from code) says otherwise. A frame
that outlasts it ends the export with the frame, its time and the step it was in:

```
frame 412 (13.73 s) did not finish within 60 s: stuck in settle
```

| Step | What the page was waiting for |
|---|---|
| `step` | The player, to decode and place that moment's media. A damaged or very large source is the usual cause. |
| `settle` | A font, an image, or a layer that holds the frame until it has drawn (three.js, a shader) and never lets go. |
| `paint` | The browser, to paint the page. |
| `draw` | The painted page, to be copied into the frame. |
| `encode` | The video encoder, to take the frame. |

`uberscene look video.tsx --at 13.73` draws that one moment, the quick way to see what is on screen there. A very slow
machine can need a longer deadline for heavy frames; raise it only once you know the frame does finish.

::: details "Captured without the browser confirming the paint"
An export can end with a warning that some frames `were captured without the browser confirming the paint`. The page
asks the browser to say when a frame is painted, and waits a second for the answer. Without one it goes on after two
animation frames, and such a frame may show the moment before.

It should not happen in the Chrome UberScene installs. If it does, look at those frames before you publish.
:::

## What it draws

The export draws everything the preview draws, because it is the preview: footage, transitions, effects, crops,
masks, blend modes, titles, shapes, SVG, stickers, layers with any CSS and React, captions, `<Three>`, `<Motion>`,
and the effects and transitions a file declares in GLSL. A few limits remain, listed in
[What renders](/reference/rendering), and the check reports each as a `not-rendered` warning.

**Fonts.** Inter, Space Grotesk, Playfair Display, DM Sans and JetBrains Mono are bundled (regular and bold, italic
where the family has one; see [Themes](/guide/themes#fonts)). A title that names another font falls back to Inter
unless the file declares it (`font()`, `googleFont()`) or you pass it with `--font`. TTF, OTF, WOFF and WOFF2 all
work.

**Sound.** Volume, fades, ducking, pan and speed are mixed in, and mute and solo apply.

::: details How the sound is mixed and encoded
Sound is mixed in the page by `mixPlan`, a pure function of the audio plan: volume, fades, automation, ducking, pan,
speed and speed-key ramps (pitch follows speed, as in the preview), silence through freeze holds, and sample-rate
conversion. Chrome encodes Opus itself; AAC and MP3 go through Mediabunny's WebAssembly encoders, since Chrome for
Testing has none.
:::

## From code

`renderVideo` and `renderStill` do from a script what the command line does.

```ts
import { directoryResolver, loadVideo, renderStill, renderVideo } from "@uberscene/render";

const video = await loadVideo("video.tsx");
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

`renderVideo` stops with an error when an asset cannot be opened or decoded, rather than drawing a placeholder into a
video you will publish. `onAssetError: "continue"` changes that. `result.warnings` lists what was left out and why.

## Requirements

Node 22.19 or later, and the Chrome the first export downloads (or `UBERSCENE_CHROMIUM`). There is no FFmpeg and no
native module to install; the optional [native codecs](#native-codecs-experimental) need Rust to build.

## Next

- [Checking a cut](./checking): read the timeline, look at frames, check the layout and the exported file.
- [How the export works](./export-architecture): what runs in Node and what runs in the page.
- [CLI reference](/reference/cli): every command and option.
- [What renders](/reference/rendering): the few things the export draws differently.
