<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# cutcraft

The [CutCraft](https://cutcraft.prefixtree.xyz/) command line. It exports a TSX video file to video, audio or
a still image, writes its captions as subtitles, checks its layout, and adds media to the manifest. The export runs the real player in headless Chrome,
which the first export downloads (`npx cutcraft browser install` does it ahead of time).

```sh
npm install cutcraft @cutcraft/kit react zod   # the CLI, and types for the file
```

```sh
npx cutcraft add talk.mp4                                  # the manifest entry, with talk.srt/.vtt/.json as its words
npx cutcraft video.tsx --out video.mp4 --srt video.srt     # or .webm; --srt/--vtt for subtitles
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
| `--tabs <n>` | Render pieces on this many browser pages at once. |
| `--copy` | Copy untouched stretches of a VP9 source without re-encoding. |
| `--import <spec>` | A module the file may import beyond `react`, `zod` and the kit, such as `three`. |
| `--font <spec>` | A font beyond the ones the file declares, for this export: `Name=file.ttf`. |
| `--json` | Print the layout check as JSON. It exits with code 3 when it finds issues. |

`npx cutcraft --help` prints them all, and [Exporting](https://cutcraft.prefixtree.xyz/guide/exporting)
explains each one. To export from your own code, use [`@cutcraft/render`](https://www.npmjs.com/package/@cutcraft/render).

Needs Node 22.19 or later. MIT licensed.
