# How the export works

This page follows one export from the command to the file, for when you want to know what runs where or why an export
behaves as it does. To export a video, [Exporting](./exporting) has the options.

The export is the player. `uberscene video.tsx --out video.mp4` runs the same `<Player>` the preview runs, in headless
Chrome, steps it one frame at a time, and encodes what it draws. Node starts the browser, serves it the file and the
media, and writes the result to disk.

```text
Node                                         headless Chrome (one or more pages)
────                                         ───────────────────────────────────
loadVideo: evaluate and resolve the file
loadFonts: read the faces it declares
servePage ──── job.json, /media, /fonts ───► load the file with loadModule
                                             mount <Player> in <canvas layoutsubtree>
findChrome ─── launch ─────────────────────►
            ◄─── audio(from, to) ──────────── mix with mixPlan, encode (Opus, AAC, MP3, WAV)
            ◄─── segment(first, last) ─────── step, settle, drawElementImage, encode (H.264, VP9, AV1)
join the pieces, packet-copy the sound
write video.mp4
```

## Node: load, serve, launch

Node does four things before any frame is drawn.

1. **Load.** `loadVideo` evaluates the file with the kit's `loadModule` and resolves it against its manifest, the way
   the editor does. This catches a file that fails to load or import before any browser starts, and gives Node the
   composition's size, frame rate and duration to plan with.
2. **Fonts.** `loadFonts` reads every face the file declares (`font()`, `googleFont()`) and any `--font`, Google's
   from the font cache. The page gets them as files, so an export with cached fonts needs no network.
3. **Serve.** A small HTTP server on `127.0.0.1` hands the page its job (the file's text, props and manifest), each
   asset at `/media/<id>` with byte ranges so the decoder can seek, and the fonts. From the workspace, Vite serves the
   page from source; a published package serves the page built into `dist`.
4. **Launch.** `findChrome` picks the binary, and Playwright launches it.

| `findChrome` tries | |
|---|---|
| 1. `UBERSCENE_CHROMIUM` | The Chrome or Chromium you name. |
| 2. `~/.cache/uberscene/browsers` | Chrome for Testing of the tested milestone, if already downloaded. |
| 3. A download | That Chrome, downloaded there now. |

Chrome runs headless with `CanvasDrawElement` on (for `drawElementImage`), no frame-rate limit, and SwiftShader
allowed for WebGL on machines without a GPU. `--tabs 3` opens three pages; each loads the file itself.

## The page: one frame

Each page loads the file again with `loadModule`, mounts the real `<Player>` inside a `<canvas layoutsubtree>`, and
waits for Node's requests. For each frame it:

1. **Steps** the compositor to the frame's time. Decoders stream forward instead of seeking, and every picture is
   waited for, because an export may not show a stale frame.
2. **Settles.** React commits the new time, and every engine layer (three.js, Motion) draws it. A layer holds the
   frame (`holdLayerFrame`) until it has drawn; the page waits until no holds are open.
3. **Captures** the whole player, canvas and DOM overlays together, with `drawElementImage` into the capture canvas,
   after the browser reports that the subtree has painted.
4. **Encodes** the capture with WebCodecs through Mediabunny's `CanvasSource`, into a small MP4 or WebM in memory.

With `motionBlur`, steps 1 to 3 run once per shutter sample, and the samples are averaged before encoding.

A frame that never finishes is reported by the step it was stuck in: `step`, `settle`, `paint`, `draw` or `encode`
([When a frame never finishes](./exporting#when-a-frame-never-finishes)).

::: tip Every frame is a function of its time
A frame drawn after a seek, after the frame before it, or on another page is the same picture. That is what lets the
export split the work.
:::

## Pieces and pages

The frames are split into pieces so several pages can draw at once. Node cuts them into pieces of whole keyframe
intervals and hands them to free pages. Each page encodes its piece with timestamps from 0, starting on a keyframe,
so pieces join without re-encoding.

Node reads each piece back over the DevTools protocol in 4 MB chunks, shifts its packets' timestamps, and writes them
into the final file in order. More pages render more pieces at once, at the cost of a decoder and an encoder each.

With `--copy`, stretches that show nothing but one VP9 source at the composition's size and rate are not drawn at
all: Node copies the source's encoded packets for whole groups of pictures, and pages render only the ends.

## The sound

One page mixes the soundtrack for the whole range before any picture is drawn.

1. It builds the audio plan and decodes each source with WebCodecs.
2. It mixes with `mixPlan`: volume, fades, automation, ducking, pan, speed with pitch, freeze holds and resampling.
3. It encodes for the container.

| Container | Sound | Encoder |
|---|---|---|
| WebM | Opus | Chrome's own |
| MP4 | AAC | Mediabunny's WebAssembly encoder (Chrome for Testing ships none) |
| MP3 | MP3 | Mediabunny's WebAssembly encoder (Chrome for Testing ships none) |
| WAV | PCM | None needed |

Node copies the encoded packets into the file, a little ahead of the pictures so the two stay interleaved. An MP3 or
WAV export is that soundtrack alone, written as it is.

## Stills and the layout check

A still is one frame drawn the same way and saved with `canvas.toBlob` as a PNG or JPEG.

The [layout check](./checking#check-the-layout) measures exactly what the export draws. It draws each overlay alone
in the page: everything hidden, one element visible, the frame captured, and its pixels scanned for ink.

The ink's box and a grid of cells over it (so a hollow frame does not cover what is inside it) go back to Node, which
applies the rules. Where the frame cuts an element off, its laid-out box stands in for the part outside.

## Errors

A media file the resolver cannot find reaches the page as a failed fetch. The export reports the resolver's own
message (`no media file for asset "talk"`) and stops, unless `onAssetError: "continue"` draws the grey placeholder
instead.

Warnings the player prints in the page come back as `result.warnings`.

## Why it is built this way

**One renderer.** The preview already draws everything: footage, titles, Layers with any CSS, three.js, Motion, GLSL
effects. Any second renderer would have to match it feature by feature, and an earlier Node renderer did not (see
decision 0021 in the repository). Running the player itself makes the export exact by construction.

**Frames stay in the browser.** Capturing in the page with `drawElementImage` and encoding with WebCodecs keeps every
frame inside the browser. Taking screenshots and piping them to FFmpeg would send each 1080p frame, about 8 MB raw,
across the DevTools protocol, and would add FFmpeg as a dependency. Only encoded packets leave the page.

**The cost is the browser.** One download per machine, a few seconds to start it per export, and drawing on the CPU
when there is no GPU (SwiftShader runs WebGL in software). On a machine with a GPU, Chrome draws on it.

## Next

- [Exporting](./exporting): formats, a server, motion blur and faster exports.
- [Checking a cut](./checking): the layout check, frame sheets and checking an exported file.
- [Player](./player): the player the export runs.
