# CLI

`cutcraft` exports a file to video, audio, a still or subtitles, checks its layout, and adds media to the manifest.

```sh
npm install cutcraft
npx cutcraft <file.tsx> --out <video.mp4|.webm|.mp3|.wav> [options]
npx cutcraft <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
npx cutcraft <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]
npx cutcraft <file.tsx> --srt <captions.srt> | --vtt <captions.vtt> [--from <s> --to <s>]
npx cutcraft add <media file>... [--manifest manifest.json] [--id <id>] [--transcript <file>]
npx cutcraft browser install
```

`npx cutcraft --help` prints the same list.

Every export draws its frames in headless Chrome. The first one downloads Chrome for Testing into
`~/.cache/cutcraft/browsers` (`CUTCRAFT_BROWSER_CACHE` moves it); `cutcraft browser install` downloads it ahead of
time. `CUTCRAFT_CHROMIUM` names a Chrome or Chromium 153 or later to use instead
([The browser it runs in](https://cutcraft.prefixtree.xyz/guide/exporting#the-browser-it-runs-in)).

## Export

| Option | |
|---|---|
| `--out <file>` | Where to write. `.mp4` gives H.264 and AAC, `.webm` VP9 and Opus. `.mp3` and `.wav` hold the soundtrack alone. |
| `--still <s>` | Write the frame at this time instead, to a `.png` or `.jpg` `--out`. |
| `--srt <file>` `--vtt <file>` | Also write the captions the cut plays as SRT or WebVTT, timed like the export. Without `--out`, write only them ([Subtitle files](https://cutcraft.prefixtree.xyz/guide/captions-and-sound#subtitle-files)). |
| `--manifest <file>` | The asset manifest. Without it the file's own `manifest` export is used. |
| `--media <dir>` | One file per asset id, with or without an extension (`podcast.webm`, `podcast`). Default: the file's folder. |
| `--props <json>` | Props for the file's component, over its `defaults`. |
| `--from <s>` `--to <s>` | Render only this part of the composition. |
| `--tabs <n>` | Pages of the browser that render pieces at once. Default 1 ([Faster](https://cutcraft.prefixtree.xyz/guide/exporting#faster)). |
| `--copy` | Copy untouched stretches of a VP9 source into a VP9 export without re-encoding them ([Faster](https://cutcraft.prefixtree.xyz/guide/exporting#faster)). |
| `--codec <name>` | `avc` (the default in MP4), `vp9` (the default in WebM), or `av1` in either. A codec the container cannot hold (VP9 in MP4) is an error. |
| `--bitrate <bps>` | Video bits per second. Default: about 0.1 per pixel per frame. |
| `--quality <preset>` | `very-low`, `low`, `medium`, `high` or `very-high`: the encoder picks the bitrate for the size and codec. In place of `--bitrate`. |
| `--keyframe <s>` | Seconds between keyframes. Default 2. |
| `--silent` | No soundtrack. |
| `--font Name[:weight[:style]]=file` | A font for this export beyond the ones the file declares ([Fonts](https://cutcraft.prefixtree.xyz/guide/themes#fonts)), repeatable. TTF, OTF, WOFF or WOFF2. |
| `--continue` | Draw the grey placeholder for an asset that cannot be read, instead of stopping. |
| `--import <spec>` | A module the file may import beyond `react`, `zod` and `@cutcraft/kit`, repeatable: `three`, or `name=specifier` for a package or a path relative to the file. |
| `--quiet` | No progress output. |

## Layout check

| Option | |
|---|---|
| `--check-layout` | Report every overlay that leaves the frame or the safe zone, or covers the captions or the subject, at its line in the file. Writes no file. |
| `--safe-zone <zone>` | `tiktok`, `reels`, `shorts`, `title-safe` (the default) or `action-safe`, or `top,right,bottom,left` fractions. |
| `--subject <x,y,w,h>` | Where the subject is, as fractions of the frame, for footage whose manifest has no subjects. |
| `--step <s>` | Seconds between samples. Default: every frame. |
| `--json` | Print the report as JSON. |

[Checking the layout](https://cutcraft.prefixtree.xyz/guide/exporting#checking-the-layout) explains the rules and the output.

## Exit codes

| Code | |
|---|---|
| 0 | Done. |
| 1 | An error, such as a missing asset or a file that doesn't load. |
| 2 | Wrong arguments; the usage text is printed. |
| 3 | The layout check found issues. |

## Adding media

`cutcraft add talk.mp4` writes the media file's entry into the manifest. It reads the kind, length, size, frame rate
and sound from the file itself, and the words from a transcript with the same name in the same folder: `talk.json`
from Whisper or ElevenLabs first, then `talk.vtt`, then `talk.srt`. Running it again refreshes the entry and keeps the
fields it does not write. See [Getting a transcript](https://cutcraft.prefixtree.xyz/guide/captions-and-sound#getting-a-transcript). A `.cube` file
is added as a LUT (kind `lut`) after it is checked, for [`<Effect type="lut">`](https://cutcraft.prefixtree.xyz/guide/colour#a-look-from-a-lut).

| Option | |
|---|---|
| `--manifest <file>` | The manifest to write. Default: `manifest.json` beside the media, created when missing. |
| `--id <id>` | The asset id. Default: the file name without its extension. One file only. |
| `--transcript <file>` | A transcript other than the one beside the media. One file only. |
