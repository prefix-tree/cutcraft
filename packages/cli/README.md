<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/logo.svg" width="64" alt="UberScene"></p>

# uberscene

The [UberScene](https://uberscene.prefixtree.xyz/) command line. It exports a TSX video file to video, audio or
a still image, writes its captions as subtitles, checks its layout, and adds media to the manifest. The export runs the real player in headless Chrome,
which the first export downloads (`npx uberscene browser install` does it ahead of time).

```sh
npm install uberscene @uberscene/kit react zod   # the CLI, and types for the file
```

```sh
npx uberscene add talk.mp4                                  # the manifest entry, with talk.srt/.vtt/.json as its words
npx uberscene video.tsx --out video.mp4 --srt video.srt     # or .webm; --srt/--vtt for subtitles
npx uberscene video.tsx --out soundtrack.mp3                # or .wav
npx uberscene video.tsx --still 2 --out poster.png          # the frame at 2 s, or .jpg
npx uberscene video.tsx --check-layout --safe-zone tiktok   # overlays off the frame, the safe zone or the captions
```

The asset manifest is `uberscene.json`, found in the file's folder or the nearest folder above it; `uberscene add`
writes it. A file may export its own `manifest` instead, and `--manifest <file>` names another. Media files sit in
the file's folder, beside the manifest or in `media/` beside it, one per asset id, or in the folder you pass to
`--media`.

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

`npx uberscene --help` prints them all, and [Exporting](https://uberscene.prefixtree.xyz/guide/exporting)
explains each one. To export from your own code, use [`@uberscene/render`](https://www.npmjs.com/package/@uberscene/render).

Needs Node 22.19 or later. MIT licensed.
