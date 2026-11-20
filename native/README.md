# Native codecs

`uberscene-codec` is UberScene's native codec process: a small Rust binary on
[craft-video and craft-media](https://github.com/storytold/craft-libs) (FilmCraft's pure-Rust codecs, MIT OR Apache-2.0,
no FFmpeg). The export uses it instead of the browser's WebCodecs when `UBERSCENE_CODECS` asks:

| `UBERSCENE_CODECS` | Footage decoded by | Pictures encoded by |
|---|---|---|
| unset or `browser` | Chrome (the default) | Chrome |
| `native-decode` | this process | Chrome |
| `native-encode` | Chrome | this process |
| `native` | this process | this process |

**What it adds:**

- Footage Chrome cannot decode: HEVC without hardware, ProRes, DNxHR.
- ProRes export to `.mov` (`--codec prores`, the profile from `--quality`).

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

The sound is always mixed and encoded in the page.
