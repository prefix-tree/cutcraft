<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/logo.svg" width="64" alt="UberScene"></p>

# @uberscene/render

Exports a [UberScene](https://uberscene.prefixtree.xyz/) video file: MP4 or WebM, an MP3 or WAV soundtrack, or a
PNG or JPEG still. It runs the real player in headless Chrome, so the exported file matches the preview frame for
frame. The first export downloads Chrome for Testing into `~/.cache/uberscene/browsers`; `UBERSCENE_CHROMIUM` names a
Chrome 153+ to use instead.

For the command line, install [`uberscene`](https://www.npmjs.com/package/uberscene). This package is the library behind
it.

```sh
npm install @uberscene/render
```

```ts
import { directoryResolver, loadVideo, renderVideo } from "@uberscene/render";

const video = await loadVideo("video.tsx");
await renderVideo({
  state: video.state,
  source: video.source,
  media: directoryResolver("media", video.manifest),
  out: "video.mp4",
  onProgress: ({ frame, frames }) => console.log(`${frame}/${frames}`),
});
```

`loadVideo` reads the file the way the editor does: it may import `react`, `zod` and `@uberscene/kit`, plus the modules
you list in `imports`. `directoryResolver` finds one file per asset id in a folder.

## What it does

- Draws every frame with the player: footage, titles, layers with any CSS, captions, three.js, Motion, and GLSL
  effects and transitions.
- Encodes H.264 or AV1 in MP4 and VP9 or AV1 in WebM with WebCodecs, and the soundtrack as AAC, Opus, MP3 or WAV.
- Mixes the soundtrack itself: volume, fades, ducking, speed ramps and freeze frames.
- Renders pieces on several browser pages at once (`tabs`), and copies untouched stretches of a VP9 source without
  re-encoding them (`smartCopy: true`).
- `renderStill` writes one frame. `checkLayout` reports overlays that leave the frame or the safe zone, or cover
  captions or the subject, with their line in the file.

## Docs

- [Exporting](https://uberscene.prefixtree.xyz/guide/exporting): every option, the browser, smart copy, and
  what each format holds

MIT licensed.
