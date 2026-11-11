---
"@cutcraft/kit": minor
"@cutcraft/render": minor
"cutcraft": minor
---

`cutcraft look --listen <stretch>` shows the sound of a stretch under the sheet's cells: the mix an export would write, as its level over time on a decibel scale, with a time scale, the words of the transcript where the cut says them, and silent stretches shaded. The stretch is `all`, a range such as `2..6` or `60f..180f`, or an element's id. The legend gains `listen`: the stretch, `peakDb` and `rmsDb` in dBFS (null for silence), `silences` (at least 0.3 s below -50 dBFS) and the words. The strip is kept in the frame cache under a key of the whole file and its media. `renderLook` takes `listen`, and the kit exports `listenRange`.
