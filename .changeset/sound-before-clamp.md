---
"@cutcraft/render": minor
---

The soundtrack is measured before it is clamped to full scale. `look --listen` reports `lufs` (integrated loudness, ITU-R BS.1770), `truePeakDb`, `clipped` (samples above full scale) and `clippedAt` (the time of the first), and its `peakDb` can now be above 0. `look` and `render` warn when the mix clips. The exported sound is as before: nothing limits it.
