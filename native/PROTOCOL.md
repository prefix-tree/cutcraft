# `uberscene-codec` protocol

What the native codec process and the export server (`packages/render/src/native/`) send each other. One process per
stream: Node starts it with arguments, writes to its stdin, reads its stdout, and reads stderr for the error when it
exits non-zero. All numbers are little-endian. `src/wire.rs` and `packages/render/src/native/wire.ts` (with
`packages/render/src/web/page/native-frames.ts` for frames) implement this file.

## `probe <file>`

One line of JSON on stdout:

```json
{"width":1920,"height":1080,"duration":12.5,"fps":30,"codec":"hevc","rotation":90,"decodable":true}
```

- `width` and `height` are the display size: after `rotation` (clockwise degrees, from the container) is applied.
- `decodable` is true once the first picture has actually decoded, so an unsupported profile is found here.
- When it is false, `reason` says why, and the size fields may be missing. The page then decodes the asset in the
  browser.

## `decode <file> (--from <s> [--to <s>] | --at <s>) [--threads <n>]`

Pictures on stdout, in presentation order, each a 32-byte header followed by its planes:

| Bytes | Field |
|---|---|
| 0–3 | `UBF1` |
| 4–7 | width (u32) |
| 8–11 | height (u32) |
| 12 | matrix (H.273 code: 1 BT.709, 5 BT.470BG, 6 BT.601, 9 BT.2020) |
| 13 | full range (0 or 1) |
| 14–15 | unused |
| 16–23 | presentation time in seconds (f64) |
| 24–31 | duration in seconds (f64), never 0 |

The planes follow: tight 8-bit I420, Y (`width × height`), then U and V (`⌈width/2⌉ × ⌈height/2⌉` each).

- With `--from`, the first picture is the one showing at `from`: the last whose time is at most `from` + 1 ms (the
  player's `PICK_EPS`). Every later one follows, up to but not including `to`.
- With `--at`, only the picture showing at that time is sent. Nothing is sent for a time before the first picture.
- Closing stdout stops the process, which is how the page cancels a stream.

## `encode --codec h264|prores --width <w> --height <h> ...`

**Input on stdin:** pictures, each a 16-byte header followed by `width × height × 4` bytes of RGBA.

| Bytes | Field |
|---|---|
| 0–3 | `UBR1` |
| 4–7 | width (u32) |
| 8–11 | height (u32) |
| 12–15 | unused |

**Output on stdout:** first the decoder configuration, then one packet per picture in decode order.

- **Configuration:** `UBC1`, a length (u32), then that many bytes. It is an avcC record for H.264 and empty for
  ProRes.
- **Packet:** a 32-byte header followed by its data.

| Bytes | Field |
|---|---|
| 0–3 | `UBP1` |
| 4 | keyframe (0 or 1) |
| 5–7 | unused |
| 8–15 | presentation time in frames from the first picture (i64) |
| 16–23 | decode time in frames (i64) |
| 24–27 | data length (u32) |
| 28–31 | unused |

**Options:**

| Option | Meaning |
|---|---|
| `--fps n/d` | Frame rate; default 30. |
| `--keyint` | Frames between keyframes; default 60. |
| `--kbps` | Target bitrate in kbit/s, peaks to 1.5×. |
| `--crf` | Constant quality, in place of `--kbps`; default CRF 20. |
| `--preset` | `speed`, `balanced` (default) or `quality`. |
| `--threads` | 0 means every core. |
| `--prores-profile` | `proxy`, `lt`, `standard`, `hq` (default) or `4444`. |

**What the encoder writes:**

- **H.264:** High profile, BT.709 limited range, length-prefixed NAL units for MP4, no B-frames, and keyframes only
  every `--keyint` frames. That last rule is what lets the export join pieces without re-encoding.
- **ProRes:** every packet is a keyframe.

## `decode-audio <file> --from <s> --to <s>`

The sound of `[from, to)` seconds of the file's first audio track, for the export's mixer: a 16-byte header, then each
channel's samples in turn as f32.

| Bytes | Field |
|---|---|
| 0–3 | `UBA1` |
| 4–7 | sample rate (u32), the track's own |
| 8–11 | channels (u32); 0 when the file has no audio track |
| 12–15 | frames (u32): `⌈(to − from) × rate⌉` |

- The first frame is the track's sound at `from`. Where the track has no sound (before its start, after its end) the
  frames are silence, so a range always has its full length.
- Decoding starts 120 ms before `from` and drops what comes first: a decoder started mid-stream needs that to give
  what a decode from the start gives (Opus asks for 80 ms).
- A file it cannot read exits non-zero, and the export mixes the soundtrack in the page instead.

## `encode-audio --format aac|wav|mp3 [--rate <hz>] [--channels <n>] [--kbps <n>] [--bits 16|24]`

**Input on stdin:** interleaved f32 samples, `channels` per frame, until stdin closes. Samples beyond full scale are
clamped.

**Output on stdout:** the whole file, once the input has ended.

| `--format` | File |
|---|---|
| `aac` | AAC-LC in an M4A, at `--kbps` (default 128). Its edit list trims the encoder's priming, so it decodes to the length written. |
| `wav` | Integer PCM in a WAV, `--bits` 16 (default) or 24. |
| `mp3` | An MP3 at `--kbps`. |

`--rate` defaults to 48000 and `--channels` to 2 (1 to 8).
