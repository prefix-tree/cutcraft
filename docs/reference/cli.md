# CLI

`cutcraft` exports a file to video, audio, a still or subtitles, checks its layout, and adds media to the manifest.

```sh
npm install cutcraft
npx cutcraft <file.tsx> --out <video.webm|.mp4|.mov|.mp3|.wav> [options]
npx cutcraft <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
npx cutcraft <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]
npx cutcraft <file.tsx> --srt <captions.srt> | --vtt <captions.vtt> [--from <s> --to <s>]
npx cutcraft add <media file>... [--manifest manifest.json] [--id <id>] [--transcript <file>]
```

`npx cutcraft --help` prints the same list.

## Export

| Option | |
|---|---|
| `--out <file>` | Where to write. `.webm` gives VP9 and Opus, `.mp4` H.264 and AAC, `.mov` ProRes and 16-bit PCM. `.mp3` and `.wav` hold the soundtrack alone. |
| `--still <s>` | Write the frame at this time instead, to a `.png` or `.jpg` `--out`. |
| `--srt <file>` `--vtt <file>` | Also write the captions the cut plays as SRT or WebVTT, timed like the export. Without `--out`, write only them ([Subtitle files](/guide/captions-and-sound#subtitle-files)). |
| `--manifest <file>` | The asset manifest. Without it the file's own `manifest` export is used. |
| `--media <dir>` | One file per asset id, with or without an extension (`podcast.webm`, `podcast`). Default: the file's folder. |
| `--props <json>` | Props for the file's component, over its `defaults`. |
| `--from <s>` `--to <s>` | Render only this part of the composition. |
| `--workers <n>` | Threads. Default 1, the main thread; more rarely helps ([Faster](/guide/exporting#faster)). |
| `--software` | Encode H.264 and HEVC in software even where the machine has a hardware encoder. |
| `--speed <s>` | How hard the software H.264/HEVC encoder works: `balanced` (default, x264's veryfast), `quality` (medium: smaller files, about half as fast) or `fast` (real-time mode, larger files). |
| `--copy` | Copy untouched stretches of a VP8 or VP9 source without re-encoding them ([Faster](/guide/exporting#faster)). |
| `--codec <name>` | `vp9`, `vp8`, `av1`, `avc`, `hevc`, `prores`. A codec the container cannot hold (ProRes in WebM) is an error. |
| `--bitrate <bps>` | Video bits per second. Default: about 0.1 per pixel per frame. |
| `--quality <preset>` | `very-low`, `low`, `medium`, `high` or `very-high`: the encoder picks the bitrate for the size and codec. In place of `--bitrate`. |
| `--keyframe <s>` | Seconds between keyframes. Default 2. |
| `--silent` | No soundtrack. |
| `--font Name[:weight[:style]]=file` | A font for this export beyond the ones the file declares ([Fonts](/guide/themes#fonts)), repeatable. TTF, OTF or WOFF; the browser engine also reads WOFF2. |
| `--continue` | Draw the grey placeholder for an asset that cannot be read, instead of stopping. |
| `--import <spec>` | A module the file may import beyond `react`, `zod` and `@cutcraft/kit`, repeatable: `three`, or `name=specifier` for a package or a path relative to the file. |
| `--engine <name>` | What draws the pictures: `auto` (default; the browser for a file with `<Three>` or `<Motion>`, Node otherwise), `node`, or `browser` (headless Chromium; `CUTCRAFT_CHROMIUM` names the binary). See [exporting](/guide/exporting#three-js-and-motion-the-browser-engine). |
| `--quiet` | No progress output. |
## Layout check

| Option | |
|---|---|
| `--check-layout` | Report every overlay that leaves the frame or the safe zone, or covers the captions or the subject, at its line in the file. Writes no file. |
| `--safe-zone <zone>` | `tiktok`, `reels`, `shorts`, `title-safe` (the default) or `action-safe`, or `top,right,bottom,left` fractions. |
| `--subject <x,y,w,h>` | Where the subject is, as fractions of the frame, for footage whose manifest has no subjects. |
| `--step <s>` | Seconds between samples. Default: every frame. |
| `--json` | Print the report as JSON. |

[Checking the layout](/guide/exporting#checking-the-layout) explains the rules and the output.

## Exit codes

| Code | |
|---|---|
| 0 | Done. |
| 1 | An error, such as a missing asset or a file that doesn't load. |
| 2 | Wrong arguments; the usage text is printed. |
| 3 | The layout check found issues. |

## Adding media

`cutcraft add talk.mp4` writes the file's entry into the manifest: its kind, length, size, frame rate and sound, read
from the file, and its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, then `talk.vtt`,
then `talk.srt`). Running it again refreshes the entry and keeps the fields it does not write. See
[Getting a transcript](/guide/captions-and-sound#getting-a-transcript).

| Option | |
|---|---|
| `--manifest <file>` | The manifest to write. Default: `manifest.json` beside the media, created when missing. |
| `--id <id>` | The asset id. Default: the file name without its extension. One file only. |
| `--transcript <file>` | A transcript other than the one beside the media. One file only. |
