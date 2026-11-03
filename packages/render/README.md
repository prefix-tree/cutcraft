<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# @cutcraft/render

Exports a [CutCraft](https://prefix-tree.github.io/cutcraft/) video file in Node, with no browser: MP4, WebM or MOV,
an MP3 or WAV soundtrack, or a PNG or JPEG still. It runs the player's own engine, so the exported file matches the
preview frame for frame.

For the command line, install [`cutcraft`](https://www.npmjs.com/package/cutcraft). This package is the library behind
it.

```sh
npm install @cutcraft/render
```

```ts
import { directoryResolver, loadVideo, renderVideo } from "@cutcraft/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
await renderVideo({
  state: video.state,
  media: directoryResolver("media", video.manifest),
  interiors: video.interiors,
  out: "video.mp4",
  onProgress: ({ frame, frames }) => console.log(`${frame}/${frames}`),
});
```

`loadVideo` reads the file the way the editor does: it may import `react`, `zod` and `@cutcraft/kit`, plus the modules
you list in `imports`. `directoryResolver` finds one file per asset id in a folder.

## What it does

- Encodes H.264, HEVC, VP8, VP9, AV1 or ProRes, with the machine's hardware encoder where it has one.
- Mixes the soundtrack itself: volume, fades, ducking, speed ramps and freeze frames.
- Copies untouched stretches of the source without re-encoding them (`smartCopy: true`, for VP8 and VP9).
- A frame that is one source picture shown as it is goes from the decoder to the encoder without being drawn.
- `renderStill` writes one frame. `checkLayout` reports overlays that leave the frame or the safe zone, or cover
  captions or the subject, with their line in the file.

Titles, layers and captions are laid out with [Satori](https://github.com/vercel/satori), which reads a subset of CSS.
What it can't draw is left out with a warning that names it. `<Three>` and `<Motion>` are left out the same way for now.

On a 4-core Linux machine with no GPU it renders 1080p H.264 at 111 fps for plain cuts, and at 37 to 61 fps when
frames are drawn. [Export speed](https://prefix-tree.github.io/cutcraft/comparisons/export-speed) compares it with
Remotion and Diffusion Studio.

## Docs

- [Exporting](https://prefix-tree.github.io/cutcraft/guide/exporting): every option, smart copy, speed, and what
  each format holds

MIT licensed.
