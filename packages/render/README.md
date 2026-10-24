<p align="center"><img src="../../docs/public/logo.svg" alt="cutcut" width="64" height="64"></p>

# @cutcut/render

Export for cutcut: a cut file to WebM or MP4 in Node, with no browser. It runs
the player's own engine (the frame plan, the painter, the compositor and the
audio plan) on different surfaces, so the file holds what the preview shows.
Private for now; the design is
[decision 0015](../../docs/decisions/0015-a-headless-engine-renders-the-export.md)
and the user guide is [Exporting](../../docs/guide/exporting.md).

```sh
pnpm --filter @cutcut/render exec cutcut-render video.tsx --manifest manifest.json --media ./media --out video.webm
```

```ts
import { defaultWorkers, directoryResolver, loadVideo, renderVideo } from "@cutcut/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
await renderVideo({
  state: video.state,
  media: directoryResolver("media", video.manifest),
  interiors: video.interiors,
  out: "video.webm",
  parallel: { file: "video.tsx", load: { manifest: "manifest.json" }, mediaDir: "media", workers: defaultWorkers() },
});
```

## How it is put together

| | |
|---|---|
| `env.ts` | Registers FFmpeg-backed decoders and encoders with Mediabunny; the skia `createCanvas` the painter uses. |
| `frame-source.ts` | A decoded sample converted to RGBA once; a picture that fills the canvas is put straight on it. |
| `pipeline.ts` | One composition frame by frame: step the compositor, draw overlays, read pixels back. |
| `overlays.ts` | Titles, layers and captions laid out by Satori from the trees the browser mounts; shapes, SVG and stickers drawn natively; layout cached. |
| `mixer.ts`, `pcm.ts` | The offline mixer: a pure function of the audio plan and decoded PCM. |
| `encode.ts`, `segment.ts` | Frames into an encoder, one in flight; a run of frames into a small container of its own. |
| `parallel.ts`, `worker.ts` | Worker threads rendering runs of whole keyframe intervals, and the join of their packets in order. |
| `copy.ts` | Smart copy: which stretches of the output are plain source, and the packets of whole groups of pictures. |
| `renderer.ts` | `renderVideo`: ties them together with the soundtrack. |
| `load.ts`, `cli.ts` | Importing a TSX file; the command line. |

## Tests

```sh
pnpm --filter @cutcut/render test           # needs ffmpeg on the PATH, to make test media
pnpm --filter @cutcut/render test:browser   # needs Chromium: overlay and mixer parity with the browser
pnpm --filter @cutcut/render bench          # frames per second, and where the time goes
```

The source video the tests render paints its frame number into a strip; the
tests decode the output and read the strip back, so a frame that is one off
fails. Every recipe is rendered with generated media, workers are checked
against one thread, smart copy against the source's packets, and the output is
played in Chromium across its joins.
