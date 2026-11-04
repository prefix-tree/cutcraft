<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# cutcraft

The [CutCraft](https://prefix-tree.github.io/cutcraft/) command line. It exports a TSX video file to video, audio or
a still image, and checks its layout. Most files export in Node with no browser; a file with `<Three>` or `<Motion>`
exports through headless Chromium (`npm install playwright-core`, and `CUTCRAFT_CHROMIUM` pointing at Chrome 153+).

```sh
npm install cutcraft @cutcraft/kit react zod   # the CLI, and types for the file
```

```sh
npx cutcraft video.tsx --out video.mp4                     # or .webm, .mov (ProRes)
npx cutcraft video.tsx --out soundtrack.mp3                # or .wav
npx cutcraft video.tsx --still 2 --out poster.png          # the frame at 2 s, or .jpg
npx cutcraft video.tsx --check-layout --safe-zone tiktok   # overlays off the frame, the safe zone or the captions
```

The asset manifest comes from the file's `manifest` export or from `--manifest manifest.json`. Media files sit in the
file's folder, one per asset id, or in the folder you pass to `--media`.

## Options people reach for

| Option | |
|---|---|
| `--props <json>` | Props for the file's component, over its `defaults`. |
| `--from <s> --to <s>` | Render only part of the video. |
| `--quality <preset>` | `very-low` to `very-high`, in place of `--bitrate`. |
| `--speed <s>` | `balanced` (default), `quality` for smaller files, or `fast`. |
| `--copy` | Copy untouched stretches of the source without re-encoding (VP8 and VP9). |
| `--import <spec>` | A module the file may import beyond `react`, `zod` and the kit, such as `three`. |
| `--font <spec>` | A font beyond the ones the file declares, for this export: `Name=file.ttf`. |
| `--json` | Print the layout check as JSON. It exits with code 3 when it finds issues. |

`npx cutcraft --help` prints them all, and [Exporting](https://prefix-tree.github.io/cutcraft/guide/exporting)
explains each one. To export from your own code, use [`@cutcraft/render`](https://www.npmjs.com/package/@cutcraft/render).

Needs Node 22.19 or later. MIT licensed.
