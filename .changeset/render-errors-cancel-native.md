---
"@uberscene/render": patch
---

Three export fixes:

- A failed asset stops the export after the first piece it fails in, not after the last frame: a one-hour export with
  one missing image no longer renders everything before it throws. With `onAssetError: "continue"`, a missing clip
  with sound is silent, with a warning, instead of failing the soundtrack before the first frame.
- A cancel (`signal`) stops the export at once: the browser is closed, ending the piece in flight, where before the
  piece (minutes of video in a long export) was finished first. A signal already aborted stops it before it starts.
- The native decoder's stream (`UBERSCENE_CODECS=native-decode`) is read without copying: each picture's bytes are
  joined once, where every 64 KB chunk copied everything not yet read, about 24 times a 1080p picture.
