---
"@uberscene/player": patch
"@uberscene/render": patch
---

A clip whose sound starts in the middle of a WebM (Opus) file now plays and exports where the file has it. It was 1 ms late, half a cycle of a 440 Hz tone, because WebM rounds block times to the millisecond and Mediabunny shifts Opus by its rounded codec delay. The preview's audio and the export's mix now decode from 120 ms before the range, so the decoder settles, and place each block on the grid its stream's blocks start on.
