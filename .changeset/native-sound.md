---
"@uberscene/render": minor
"uberscene": minor
---

The native codecs make the soundtrack too. With `UBERSCENE_CODECS=native-encode` or `native`, `uberscene-codec` encodes the sound (AAC in MP4, 24-bit PCM in `.mov`, 16-bit WAV, on FilmCraft's craft-audio); with `native`, the mix is made outside the browser from sound it decodes (AAC, Opus, MP3, AC-3, ALAC, PCM). An asset whose sound it cannot read sends the mix back to the page with a warning, and MP3 keeps the page's encoder.
