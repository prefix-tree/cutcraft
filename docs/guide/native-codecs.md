# Native codecs (experimental)

By default Chrome decodes the footage and encodes the export. The native codecs can do either job, or both, in place
of Chrome. They run in `uberscene-codec`, a small Rust process built on FilmCraft's codecs,
[craft-video and craft-media](https://github.com/storytold/craft-libs). These are pure Rust and need no FFmpeg. The
player still draws every frame in the page. Only the decoding and the encoding move.

This page covers how pictures get to the process and back, and which formats it reads and writes. To turn it on,
[Exporting](./exporting#native-codecs-experimental) has `UBERSCENE_CODECS` and the commands.

::: warning Experimental
The native codecs run only when `UBERSCENE_CODECS` asks for them, and Chrome stays the default. They are built from
source for now (`pnpm native:build`, Rust 1.95 or later), and on a CPU they are not faster than Chrome yet.
:::

## How data flows

```text
page                                  Node (the export's server)          uberscene-codec (one process per stream)
────                                  ──────────────────────────          ────────────────────────────────────────
NativeFrameSource ── /native/frames ─► reads the asset's file ──────────► decode → I420 pictures on stdout
   VideoFrame ◄────── streamed back ── pipes stdout to the page
capture → RGBA ───── /native/encode ─► writes pictures in order ────────► encode (H.264, ProRes) → packets
                                      keeps the packets for the join ◄──
```

For each stream, Node starts one `uberscene-codec`, writes to its stdin and reads its stdout. If the process exits
with an error, Node reads the error from stderr. Numbers on the wire are little-endian. `native/PROTOCOL.md` in the
repository lists every byte.

The export looks for `native/target/release/uberscene-codec`. `UBERSCENE_CODEC_BIN` names a binary built somewhere
else.

## Decoding

1. **Probe.** `uberscene-codec probe <file>` prints one line of JSON: the display size (after rotation), duration,
   frame rate, codec, and whether the first picture actually decoded.
2. **Stream.** The page's `NativeFrameSource` asks the export server for `/native/frames/<asset>`, either a range
   (`--from`, `--to`) or a single time (`--at`). The server runs `uberscene-codec decode` on the asset's file and
   pipes its stdout straight back to the page.
3. **Wrap.** Each picture is a 32-byte header (size, colour matrix, range, time, duration) followed by 8-bit I420
   planes. The page turns each one into a `VideoFrame`, and the player draws it like a frame Chrome decoded.

When the page stops reading, the server closes the stream and the process stops. Decoding plugs into the player's
`FrameSource` seam ([How the player draws](./how-the-player-draws#decoding)), so the compositor, the effects and the
capture stay the same.

If probing says an asset can't be decoded, or the asset comes from a URL, Chrome decodes it instead, with one warning.
Images and audio always stay in the browser.

## Encoding

1. **Read back.** For each piece, the page copies each captured picture out as RGBA (`VideoFrame.copyTo`).
2. **Post.** It posts the picture to `/native/encode/<session>`, with at most two in flight.
3. **Encode.** The server writes each picture to `uberscene-codec encode` as a 16-byte header plus the RGBA bytes.
   The process writes the decoder configuration first (an avcC record for H.264), then one packet per picture with
   its keyframe flag and timestamps.
4. **Join.** Node keeps the packets and writes them into the file with the other pieces. They never pass through the
   page.

The H.264 encoder writes no B-frames, and puts keyframes only at the start of each keyframe interval. Each piece is a
whole number of intervals, so the pieces join without re-encoding, the same as with Chrome
([Pieces and pages](./export-architecture#pieces-and-pages)). Every ProRes packet is a keyframe.

## Formats

| Decodes | Containers |
|---|---|
| H.264, HEVC (8 and 10 bit) | MP4/MOV, Matroska/WebM |
| VP8, VP9, AV1 | MP4/MOV, Matroska/WebM |
| ProRes, DNxHD/DNxHR | MP4/MOV, Matroska/WebM |

| Encodes | Into |
|---|---|
| H.264, High profile, BT.709 limited range | MP4 |
| ProRes: Proxy, LT, 422, 422 HQ, 4444 | MOV (`--codec prores`; `--quality` picks the profile) |

- Pictures reach the page as 8-bit 4:2:0. Higher bit depths and 4:2:2/4:4:4 are converted, alpha is dropped, and a
  rotated file is turned upright.
- The native encoder doesn't write VP9 or AV1, and doesn't work with `--copy`.
- The sound is always mixed and encoded in the page.

## Next

- [Exporting](./exporting#native-codecs-experimental): `UBERSCENE_CODECS`, ProRes and the export options.
- [How the export works](./export-architecture): the page, the pieces and the sound.
- [How the player draws](./how-the-player-draws): the frame-source seam the decoder plugs into.
