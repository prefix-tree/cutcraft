# CLI

`cutcraft` exports a file to video, audio, a still or subtitles, checks its layout, reads its timeline back as text,
draws a sheet of its frames to look at, and adds media to the manifest.

```sh
npm install cutcraft
npx cutcraft <file.tsx> --out <video.mp4|.webm|.mp3|.wav> [options]
npx cutcraft <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
npx cutcraft <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]
npx cutcraft <file.tsx> --srt <captions.srt> | --vtt <captions.vtt> [--from <s> --to <s>]
npx cutcraft inspect <file.tsx> [--at <moments>] [--json] [--manifest <file>] [--props <json>]
npx cutcraft look <file.tsx> [--at <moments> | --around <id>] [--without <id>] [--out look.png] [options]
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
| `--still <s>` | Write the frame at this time instead, to a `.png` or `.jpg` `--out`. It is kept in [the frame cache](#the-frame-cache); `--no-cache` draws it again. |
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

## Inspect

`cutcraft inspect video.tsx` prints the timeline the way an editor reads it: each track and its elements with their
seconds, the words each clip plays, effects, keyframes and cuts. It runs the resolver only, so it starts no browser,
needs no media files and answers at once. It is how an agent, or a script, reads a cut back.

```
video.tsx  1920x1080  30 fps  25.60 s (768 frames)  0 errors
track main (sequence)
     0.00–5.20     clip        hook  asset:founder 5.60–10.80  words 12–23 "Small software still deserves a real cloud It s…"
     4.80–5.20     transition  x1  crossfade (hook → broll)
     4.80–10.80    clip        broll  asset:product 6.00–12.00  keyframes: transform.scale.x, transform.scale.y
track overlays (sequence)
     0.40–3.20     title       title  "Shed"  anchor start +0.4
cuts: 4.80 hook→broll (x1), 10.80 broll→demo
```

`--at` says what is on screen and heard at each moment instead: the elements from the top of the picture down, each
effect's params and the transform after keyframes, each sound's gain, the word being said and the caption.

```
$ npx cutcraft inspect video.tsx --at word:14,x1
word:14  1.00 s  frame 30  (word 14 "still" in hook)
  seen: title tagline  4% through  "A cloud for small software"  transform position.x=0 position.y=300
  seen: title title  21% through  "Shed"  transform position.x=0 position.y=140
  seen: clip hook  19% through  source 6.60 s
  heard: hook (asset:founder) gain 1.00
  heard: bed (asset:music) gain 0.05
  said: word 14 "still" in hook
  caption: "Small software still deserves a real cloud."
```

| Option | |
|---|---|
| `--at <moments>` | The moments to describe, comma-separated. Without it, the whole timeline. |
| `--json` | Flat rows instead of text: `composition`, `tracks`, `elements`, `effects`, `keyframes`, `words`, `cuts` and `errors`, each row with its seconds and its frames; with `--at`, an `at` array too. Made for `jq` or a short script: `cutcraft inspect video.tsx --json \| jq '.cuts'`. |
| `--manifest`, `--props`, `--import` | As for an export. |

A moment is written the way the file is written, or as plain time:

| Moment | Meaning |
|---|---|
| `4.5` | Seconds of the finished video. A bare number is always seconds. |
| `90f` | Frame 90, at the composition's frame rate. |
| `2..6/0.5` | Every half second from 2 to 6; `2..6` is its two ends. Frames work too: `0..90f/30f`. |
| `hook`, `hook.start`, `hook.mid`, `hook.end` | An element by its id: its middle, its start, or the last frame it is on. |
| `x1` | A transition by its id: the last frame before it and the first after it. |
| `word:14`, `word:14.end` | Where the finished video says that word. When two clips play it, name one: `hook@word:14`. |
| `shot:1`, `silence:2` | The same for a shot or a silence, with `.end` and `clip@` too. |
| `marker:intro` | A marker. |

Every answer gives the seconds, the frame and what the moment is, so a moment found by time leads back to the element
or the word to edit. A moment that cannot be found is an error that says why, and the command exits 1; the others are
still printed.

## Look

`cutcraft look video.tsx` draws many frames in one browser start and lays them out on one contact sheet, each cell
labelled with its seconds, its frame and what it shows. One look costs about what one `--still` does, however many
frames it holds, so it is the way to check a cut by eye: an agent reads the one image.

[![A contact sheet of ten frames of a cut: each clip's first frame, both sides and the middle of two transitions, and each title, with its time, frame and name under it](https://cutcraft.prefixtree.xyz/reference/look.jpg)](https://cutcraft.prefixtree.xyz/reference/look.jpg)

With no moments named, it picks the ones an editor skims: the first frame of each clip, both sides and the middle of
every transition (or the two frames either side of a hard cut), and each overlay once. The frames are drawn by the
export, so each is the frame the export would write.

It prints a legend as JSON, one entry per cell, so a frame found by eye leads back to the element or word to edit:

```json
{
  "sheet": "/work/look.png",
  "width": 1960,
  "height": 974,
  "columns": 4,
  "cells": [
    { "index": 0, "row": 0, "column": 0, "label": "open.start", "time": 0, "frame": 0,
      "about": "first frame of clip open", "seen": ["open"] },
    { "index": 1, "row": 0, "column": 1, "label": "title.mid", "time": 1.4, "frame": 42,
      "about": "middle of title title", "seen": ["title", "open"] }
  ]
}
```

| Option | |
|---|---|
| `--at <moments>` | The moments to draw, comma-separated, written as for [`inspect`](#inspect): `hook.end,x1,word:14,2..6/0.5`. |
| `--around <id>` | Five moments across one thing instead. A transition: the frame before it, its first, middle and last frame, and the frame after. Any other element: its first frame, half way in, its middle, half way out and its last frame. |
| `--without <id>` | Each frame twice, side by side: as written, and without one effect, one `<Adjustment>` (all its effects) or one overlay (a title, a shape, an SVG, a sticker, a layer, the captions). A clip cannot be left out: that would move the cut. |
| `--out <file>` | The sheet, a PNG. Default `look.png`. |
| `--cell <px>` | The width of a cell's picture. Default 480. |
| `--columns <n>` | Cells in a row. Default up to 4. |
| `--frames <dir>` | Also write each cell's frame at full size there, as PNG; the legend names each file. |
| `--no-cache` | Draw every cell again ([The frame cache](#the-frame-cache)). |
| `--manifest`, `--media`, `--props`, `--font`, `--import`, `--continue` | As for an export. |

**Around a cut.** `--around` follows one thing through: here a wipe, from the frame before it to the frame after.
With `--without title` each moment is drawn twice, so the title's exit can be judged against the cut beneath it.

```sh
npx cutcraft look edit.tsx --around x1 --without title --columns 6
```

[![Ten frames across a wipe between two clips, in pairs: each moment with the title "Cut by words" and without it](https://cutcraft.prefixtree.xyz/reference/look-around.jpg)](https://cutcraft.prefixtree.xyz/reference/look-around.jpg)

**With and without.** Naming an effect or an `<Adjustment>` shows what it does to the same frame. Here a grade that
starts half way through the shot: at 1 s it changes nothing, at 2.5 s the graded frame is warmer and brighter.

```sh
npx cutcraft look colour-grade.tsx --at 1,2.5 --without grade
```

[![Four frames of coffee being poured: at 1 second the two are the same; at 2.5 seconds the one with the grade is warmer and brighter than the one without](https://cutcraft.prefixtree.xyz/reference/look-without.jpg)](https://cutcraft.prefixtree.xyz/reference/look-without.jpg)

A sheet holds at most 64 cells. A moment that cannot be found is reported and the command exits 1, after drawing the
others.

### The frame cache

`look` and `--still` keep what they draw in `.cutcraft/cache`, beside the file. Each frame is kept under a key made
from everything that decides its pixels: the elements on screen at that time with their resolved props, the media
files they read (by size and modified time), the composition's settings, the fonts, and the version of CutCraft and of
Chrome. So after an edit only the frames the edit changed are drawn again, and a look whose cells are all kept starts
no browser and answers in about a second. The legend's `cached` says how many cells were read back.

- Trimming the last clip leaves the frames of the clips before it as they were. Changing a title's words redraws only
  the frames it is on.
- A frame that free code draws (a `<Layer>`, `<Motion>` or `<Three>`, or an effect the file declares) is keyed by the
  file's whole text too, since that code can read anything in it. Code brought in with `--import` is not seen: after
  changing such a module, pass `--no-cache`.
- A frame drawn with a placeholder for media that could not be read is not kept.

The folder is safe to delete, and belongs in `.gitignore`.

## Exit codes

| Code | |
|---|---|
| 0 | Done. |
| 1 | An error, such as a missing asset, a file that doesn't load, or a moment `inspect` or `look` cannot find. |
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
