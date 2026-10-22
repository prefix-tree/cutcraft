# Rendering

The player takes a `ResolvedState` and plays it. It does not render the file's
JSX: the vocabulary components render nothing, and the player draws from
placements. The one exception is `<Layer>`, whose interior is real React
rendered with `useT()` in context.

## Pipeline per tick

1. **Time** from the transport: `anchorTime + (now − anchorClock) × rate` on
   the audio clock, re-anchored on play, pause, seek and rate change.
2. **Plan**: `buildFramePlan(state, t)` is pure and lists draw ops in order:
   tracks in document order, each clip with its animated transform, crop, fit,
   opacity, blend, filter and mask; crossfades as the incoming clip over the
   outgoing one; adjustments re-filtering what is below.
3. **Frames**: the `DecoderPool` keeps a `ClipDecoder` for every clip within
   two seconds of the play head. Each streams a `VideoSampleSink` into a short
   queue. While playing the compositor takes the newest frame at or before the
   source time and never waits; a seek waits for the exact frame.
4. **Paint**: `CanvasPainter` executes the plan on the composition canvas.
   Nested compositions render through child compositors into their own canvas.
5. **DOM**: titles, shapes, SVG, stickers, layers and captions are React
   elements positioned with the same matrix math, re-rendered once per frame
   index and only when their own placement changed.
6. **Audio**: the engine schedules each audio chunk once per play session,
   200 ms ahead, on Web Audio with offset, duration, `playbackRate = speed × rate`
   and a gain envelope (volume, fades, automation, ducking, mute and solo).

## Determinism

`seekTo(t)` and `renderFrame(t)` draw the exact frame for `t`, paused or
playing. The browser suite checks it by encoding the frame number into the test
video and reading pixels back, and by comparing two `renderFrame` calls byte
for byte.

## Looking at the result

`captureSheet(times, { columns, cellWidth, labels })` renders each time through
`renderFrame` into a cell of one canvas with a `mm:ss.ff` label and returns
the sheet. The transport does not move and the attached canvas is repainted
afterwards. It is the verification step the authoring prompt asks for after
every stage: the first frame of each clip and the frames around each join,
read back by an agent or compared by a test. Only the canvas plane is on the
sheet; titles, shapes and Layer interiors live in the DOM and are checked
there.

## Addressability

Every DOM element carries `data-el` and `data-kind`; the root carries
`data-time` and `data-frame`; the canvas is `[data-el="composition"]`. An editor
can select, highlight and drag preview elements by the same ids the file uses.

## What is not rendered yet

Transition types other than crossfade (drawn as a crossfade), effects without
a CSS filter equivalent, colour wheels, curves and LUTs, matte masks, audio
effects, pitch correction, reversed audio, 3D text, most text animation
presets, `background.mode: "blur"`, sticker packs and `file:` nested
references. Each warns once and is listed in the plan's `warnings`.
