---
"@uberscene/render": minor
"uberscene": minor
---

Experimental native codecs behind `UBERSCENE_CODECS`. `native-decode`, `native-encode` or `native` hands decoding the footage, encoding the export, or both to `uberscene-codec`, a Rust process on FilmCraft's craft-video (no FFmpeg), built from source with `pnpm native:build` or named by `UBERSCENE_CODEC_BIN`. It decodes HEVC (8 and 10 bit), ProRes and DNxHR, which Chrome cannot without hardware, alongside H.264, VP8, VP9 and AV1, falling back to the browser for an asset it cannot read. It encodes H.264 to MP4 and ProRes to `.mov` (`--codec prores`, the profile from `--quality`). The browser's codecs stay the default. `RenderResult.codecs` says which ran, and `codecModes` is exported.
