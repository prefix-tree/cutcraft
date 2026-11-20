---
"@uberscene/render": minor
"uberscene": minor
---

Experimental native codecs behind `UBERSCENE_CODECS`. `native-decode`, `native-encode` or `native` hands decoding the footage, encoding the export, or both to `uberscene-codec`, a Rust process on FilmCraft's craft-video and craft-audio (no FFmpeg), built from source with `pnpm native:build` or named by `UBERSCENE_CODEC_BIN`. It decodes HEVC (8 and 10 bit), ProRes and DNxHR, which Chrome cannot without hardware, alongside H.264, VP8, VP9 and AV1, falling back to the browser for an asset it cannot read. It encodes H.264 to MP4 and ProRes to `.mov` (`--codec prores`, the profile from `--quality`). With a native encoder the soundtrack is encoded natively too (AAC in MP4, 24-bit PCM in `.mov`, WAV), and with `native` it is mixed outside the browser from sound `uberscene-codec` decodes (AAC, Opus, MP3, AC-3, ALAC, PCM). The browser's codecs stay the default. `RenderResult.codecs` says which ran, and `codecModes` is exported.
