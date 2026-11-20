# Native codecs

`uberscene-codec` is UberScene's native codec process: a small Rust binary on
[craft-video, craft-audio and craft-media](https://github.com/storytold/craft-libs) (FilmCraft's pure-Rust codecs, MIT
OR Apache-2.0, no FFmpeg). The export uses it instead of the browser's WebCodecs when `UBERSCENE_CODECS` asks:

| `UBERSCENE_CODECS` | Footage decoded by | Pictures encoded by | Sound |
|---|---|---|---|
| unset or `browser` | Chrome (the default) | Chrome | mixed and encoded in the page |
| `native-decode` | this process | Chrome | mixed and encoded in the page |
| `native-encode` | Chrome | this process | mixed in the page, encoded by this process |
| `native` | this process | this process | decoded by this process, mixed in Node, encoded by this process |

**What it adds:**

- Footage Chrome cannot decode: HEVC without hardware, ProRes, DNxHR.
- ProRes export to `.mov` (`--codec prores`, the profile from `--quality`), with 24-bit PCM sound.

It is experimental, and the browser stays the reference. Decision 0032 (`docs/decisions/`) says why and how, and
`PROTOCOL.md` describes what goes over stdin and stdout.

## Build and test

```sh
pnpm native:build   # cargo build --release; the export finds native/target/release/uberscene-codec
pnpm native:test    # unit tests, plus clips made with ffmpeg decoded and encoded end to end
pnpm native:check   # rustfmt and clippy, as CI runs them
```

Rust 1.95 or later. `UBERSCENE_CODEC_BIN` names a binary built elsewhere.

**Decodes:**

| Codec | Containers |
|---|---|
| H.264, HEVC (8 and 10 bit) | MP4/MOV, Matroska/WebM |
| VP8, VP9, AV1 | MP4/MOV, Matroska/WebM |
| ProRes, DNxHD/DNxHR | MP4/MOV, Matroska/WebM |

Pictures go to the page as 8-bit I420. Higher bit depths and 4:2:2/4:4:4 are converted, alpha is dropped, and a rotated
file is turned. An asset it cannot read falls back to the browser's decoder, with one warning.

**Encodes:**

- H.264 (High profile) into MP4.
- ProRes (Proxy, LT, 422, 422 HQ, 4444) into MOV.

**Sound:**

- Decodes AAC, Opus, MP3, AC-3/E-AC-3, ALAC and PCM, in MP4/MOV, Matroska/WebM, Ogg, WAV and AIFF, and raw ADTS and
  MP3 streams. FLAC, Vorbis and the rest craft-audio reads only through symphonia (MPL-2.0, left out) are not decoded:
  a soundtrack that uses one is mixed in the page instead, with one warning.
- Encodes the mix as AAC in an M4A (for an MP4), 24-bit PCM (for a MOV) or a 16-bit WAV. It can write an MP3, but the
  export keeps `.mp3` on the page's encoder: craft-audio writes no gapless (LAME) header yet, so its MP3 starts late.
- With `native`, Node mixes the sound itself (`mixPlan`, the page's mixer) from what this process decodes, so the page
  plays no part in it. With `native-encode`, the page mixes and hands the mix over as float PCM.
