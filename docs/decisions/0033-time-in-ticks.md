# 0033. Time in ticks

> Status: accepted.

## Context

A file says time in seconds (`start={2.5}`, `in={4}`), and the resolver, the player and the export kept seconds as
JavaScript numbers. Every turn of a time into a frame was `Math.floor(t * fps + FRAME_EPS)`, every frame back into a
time was `n / fps`, and every time into an audio sample was `t * sampleRate`. The question was whether those numbers
drift, as people say seconds do at 29.97 and 23.976 fps.

We measured it. In our math, decimal seconds do not drift:

- A frame's start, `n / fps`, read back through `floor(t * fps)`, lands on frame `n` for every frame of a two hour
  video at every rate in use, NTSC's 30000/1001 included, once the `FRAME_EPS` nudge is applied.
- Summing a thousand clip durations, each a decimal like 3.37, is off by about 1e-7 of a frame.

So seconds were not the problem. Three things were:

1. **`fps={29.97}` is not NTSC.** As a number it is 2997/100, while NTSC is 30000/1001. The two part by 0.108 frames
   an hour, and the native encoder was handed 29970/1000 for a composition that meant NTSC.
2. **The `FRAME_EPS` nudge.** `floor(t * fps)` needs a small number added so that `n / fps` does not land a hair
   below frame `n`. The nudge moved a time just before a boundary into the next frame, and every caller had to
   remember it.
3. **Timecode.** The player showed `mm:ss.ff` at every rate, so at 29.97 its clock ran 3.6 seconds an hour behind
   real time. Editors show drop-frame timecode there.

## Decision

**Conversions count in ticks.** A tick is 1/254,016,000,000 of a second (2^12 · 3^4 · 5^6 · 7^2), the count
Premiere uses. It divides evenly into every frame rate in use (24, 25, 30, 50, 60, 12, 10, 1, the NTSC rates
30000/1001, 24000/1001, 60000/1001) and into every common sample rate from 8 kHz to 192 kHz, 44.1 kHz included. The
kit's `time` module, exported from `@uberscene/kit/schema`, turns a time into ticks, and a tick into a frame or a
sample by integer division:

- `frameAtSeconds(t, rate)`: the frame a time falls in.
- `frameStartSeconds(n, rate)`: when frame `n` starts.
- `framesUntil(t, rate)`: how many frames a stretch ending at `t` holds.
- `nearestFrame(t, rate)`: the frame nearest a time a person typed.
- `sampleAtSeconds(t, sampleRate)` and `samplesUntil(t, sampleRate)`: the same for audio.
- `timecode(frame, rate)`: SMPTE timecode, drop-frame at 29.97 and 59.94.

The resolver, the player, the export page, the mixer and the inspection rows go through these. `FRAME_EPS` is
removed. A time a double can only say to within a tick of a frame boundary is put on the boundary: a double at `t`
seconds is good to `t · 2^-52`, under one tick below about 2.5 hours and two ticks at 9.85 hours.

**A frame rate is exact.** `fps` is a whole number, an NTSC name written as a string (`"29.97"`), or a fraction
`{ num, den }`. The resolved composition carries `rate: { num, den }` and keeps `fps` as a number for display and
for code that only needs an approximate value. A rate that does not divide the tick count is a resolve error. The
number 29.97 is one: its error says to write `"29.97"`, and the `ntsc-frame-rate` lint fix writes it. The export
hands the encoder the exact fraction.

**The limit is about 9.85 hours.** Ticks are plain numbers, exact while they stay under `Number.MAX_SAFE_INTEGER`.
That is 35,459 seconds. A longer composition is a resolve error.

## Alternatives set aside

- **BigInt ticks.** Exact at any length, but BigInt and number do not mix, so every caller, every keyframe and every
  canvas call would convert, and BigInt division is slower in the frame loop. Nine hours is longer than any video
  this tool is for.
- **Ticks in the file.** `start={2.5}` is what a person and a model write and read. The file keeps seconds; ticks
  are how the code turns them into frames and samples, and never reach the file.
- **A warning for `fps={29.97}`.** It cannot be counted exactly in ticks, and a warning that leaves it 2997/100
  keeps the drift the warning is about. An error with a one-command fix is cheaper for the person.
- **Keep the nudge.** It worked, but it is a number every caller has to know, and it puts a time just before a
  boundary in the wrong frame.

## Consequences

- An NTSC export holds exactly the frames its length asks for, and its audio starts each frame on the exact sample
  (8008 samples every five frames at 48 kHz).
- Files that wrote `fps={29.97}` stop resolving until `uberscene lint --fix` respells them. No file in this
  repository did.
- `ResolvedState.composition` and the inspection rows gain `rate`. Code that built a composition by hand adds it.
- Copying source packets into the export (`--copy`, joins) still matches and times packets in float seconds at the
  output rate, as the source container times them. It is left for its own change.
