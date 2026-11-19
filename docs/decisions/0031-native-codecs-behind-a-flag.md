# 0031. Native codecs behind a flag

> Status: experimental. Revisits [0021](./0021-one-export-engine.md), which keeps every frame inside the browser and
> dropped ProRes and `.mov`. 0021 still decides how the export draws; this changes only who decodes the footage and who
> encodes the pictures, and only when asked.

## Context

The export draws in Chrome and uses Chrome's codecs (0021). Two limits followed from that:

- **Formats.** Chrome decodes HEVC only through hardware, so not on a server without a GPU. It cannot decode ProRes or
  DNxHR at all. The export cannot write ProRes.
- **Speed.** One tab exporting 1080p30 on 4 cores waits about 11 ms a frame for the decoder and 8 ms for the encoder
  (measured with timers in the export page).

Remotion moves both jobs out of the browser, to FFmpeg processes. FilmCraft has its own codecs in pure Rust
(craft-video and craft-media, MIT OR Apache-2.0), with decoders for H.264, HEVC, VP8, VP9, AV1, ProRes and DNxHR and
encoders for H.264 and ProRes. They are tested bit-exact against ffmpeg and need no FFmpeg, so they keep the
licence and the "no native FFmpeg" property of the export.

## Decision

- **A native codec process, `uberscene-codec`,** in `native/`. It is a Rust binary on craft-video and craft-media,
  pinned to the commit FilmCraft uses. One short-lived process per stream: Node starts it, writes to its stdin and
  reads its stdout (`native/PROTOCOL.md`). It has no HTTP server and no C code.
- **Behind `UBERSCENE_CODECS`.** `browser` (or unset) is the default. `native-decode`, `native-encode` and `native`
  turn the halves on. The browser stays the reference and the default; there is no CLI flag while it is experimental.
- **Decode** plugs into the player's `FrameSource` seam:
  - The export page passes a `NativeFrameSource` factory. It asks the export server for `/native/probe/<asset>` and
    `/native/frames/<asset>?from&to|at`, and makes each I420 picture a `VideoFrame`.
  - The server runs `uberscene-codec decode` on the asset's file and streams its stdout to the page. The process is
    killed when the page stops reading.
  - An asset the process cannot read, or one served from a URL, falls back to the browser's decoder with one warning.
  - Images and audio stay in the browser.
- **Encode** replaces the page's `CanvasSource` for a piece:
  - The page reads each captured picture back as RGBA (`VideoFrame.copyTo`) and posts it to
    `/native/encode/<session>`, two at most in flight.
  - The server writes the pictures to `uberscene-codec encode` in order and keeps the packets. The engine reads them
    in the same process, so there is no DevTools transfer.
  - Pieces are still whole keyframe intervals. The encoder makes keyframes only every interval and no B-frames, so
    pieces join without re-encoding, as before.
- **ProRes returns, only behind the flag:** `--codec prores` into `.mov` through Mediabunny's MOV writer. `--quality`
  picks the profile (Proxy, LT, 422, 422 HQ, 4444).
- **Built from source for now:** `pnpm native:build`, or `UBERSCENE_CODEC_BIN`. Per-platform npm packages, as
  Remotion ships its compositor, come once the flag earns a place.

## Consequences

**New formats.** HEVC (8 and 10 bit), ProRes and DNxHR footage export on a machine with no GPU, and a ProRes master can
be written.

**Speed, measured on 4 cores at 1080p,** process alone with no browser:

| Codec | Native | For comparison |
|---|---|---|
| VP9 decode | 71 fps on 1 thread, 130 on 2 | ffmpeg's libvpx: 272 and 521 |
| H.264 decode | 99 fps on 1 thread, 224 on 2 | |
| H.264 encode, `speed` preset (RGBA conversion included) | about 52 core-ms a frame | Chrome's encoder: about 20 |
| ProRes 422 HQ encode | about 48 core-ms a frame | |

So on CPU the native codecs are not faster than Chrome's yet. They also add a copy each way: 3 MB of I420 into the page
per decoded frame, and 8 MB of RGBA out per encoded one. The CI bench job runs browser, native-decode, native-encode and
native side by side on the same footage. Those numbers decide whether native becomes a default anywhere.

**More to keep up:**

- A Rust toolchain in CI: a `native` job, plus the build in e2e and bench.
- A second implementation of colour handling: BT.709 limited range for what it writes, and the stream's matrix for
  what it reads.
- Pictures are 8-bit 4:2:0 on their way to the page. 10-bit and 4:2:2 sources are converted, and alpha is dropped.

**The same pictures.** The export tests run the e2e composition with native decoding and check every frame, the same
check as the browser path.

## Alternatives

- **FFmpeg as Remotion uses it:** faster codecs today, but a GPL or LGPL binary to ship and a dependency 0021 removed.
- **craft-video compiled to WebAssembly and run in the page:** no copies across processes, but single-threaded without
  cross-origin isolation, and slower than native.
- **A Node addon (napi):** no process per stream, but a native module loaded into the user's process, with the same
  per-platform builds.
