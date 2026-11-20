---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": minor
---

Time in ticks. Every turn of a time into a frame, a frame into a time, or a time into an audio sample now counts in ticks (1/254,016,000,000 s), which divide every frame and sample rate in use, so frame boundaries are exact and `FRAME_EPS` is gone. The kit exports the `time` module from `@uberscene/kit/schema` (`parseRate`, `frameAtSeconds`, `frameStartSeconds`, `framesUntil`, `nearestFrame`, `sampleAtSeconds`, `samplesUntil`, `timecode`, `TICKS_PER_SECOND`, `MAX_SECONDS`).

`<Composition fps>` takes a whole number, an NTSC string (`"23.976"`, `"29.97"`, `"47.952"`, `"59.94"`, `"119.88"`) or `{ num, den }`. The resolved composition carries the exact `rate` beside `fps`. The player shows drop-frame timecode at 29.97 and 59.94, and the export hands the encoder the exact fraction.

Breaking: `fps={29.97}` as a number is 2997/100, not NTSC, and is now an error; run `uberscene lint --fix` to write `fps="29.97"`. A composition longer than 35,459 s (about 9.85 hours), or a `sampleRate` that does not divide into ticks, is an error. Code that builds a `ResolvedState` by hand adds `composition.rate`.
