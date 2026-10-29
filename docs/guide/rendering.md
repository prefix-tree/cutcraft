# Rendering

The player takes a `ResolvedState` and plays it. It does not render the file's
JSX: the vocabulary components render nothing, and the player draws from
placements. The one exception is `<Layer>`, whose interior is real React
rendered with `useT()` and `useLayer()` in context: progress 0..1, or the
clock in seconds (`elapsed`, `remaining`, `duration`, `time`, `fps`).

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
5. **DOM**: titles, shapes, SVG, stickers, graphics, layers and captions are
   React elements positioned with the same matrix math, re-rendered once per
   frame index and only when their own placement changed. They draw above the
   canvas, except on tracks below every footage track (`backdropTracks`): those
   draw beneath it, the canvas clears to transparent, and the composition
   background is painted under them. The export stacks the same layers in the
   same order.
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

## Entrances and exits

Titles, shapes, SVG, stickers and layers take `enter` and `exit`, each a
`{ type, duration, easing }` that plays at the element's start or end: `fade`,
`slide-left`/`right`/`up`/`down` (a quarter of the element's size, at most 160 px),
`scale`, `rotate`, `pop`, `bounce`, `elastic`, `flip-horizontal`/`vertical`,
`wipe-left`/`right`/`up`/`down`, `reveal-center`, `reveal-edges` and `draw`, which
draws a shape's or an SVG's strokes and then fades its fills in (other elements fade).
They apply to the element's layout, so the preview and the export compute them the same way.

## Shapes

A `<Shape>` is drawn as SVG through the same preparation as `<Svg>`: solid or gradient
fill and stroke (`linear` at a CSS angle, `radial`), dashes, caps and joins, one radius
or `cornerRadii` per corner, and drop `shadow`/`shadows` (inset ones and conic gradients
on shapes warn). The composition's `background` can be a `gradient` too.

## SVG

`<Svg>` draws inline `content` or an SVG asset read as text. Before either surface draws it,
`prepareSvg` (in `@cutcut/player/overlays`) turns it into the markup both draw:

- **Removed:** scripts, `foreignObject`, event attributes, links outside the file (a `#id` and an
  embedded PNG, JPEG, GIF or WebP stay). Each removal warns once.
- **Sized:** the SVG draws at the size it asks for (its `width` and `height`, else its
  `viewBox`), centred; `fit="contain"` or `"cover"` scales it to the frame. The element's
  `viewBox` and `preserveAspectRatio` override the file's.
- **Ids renamed** per element, so two copies of one icon never share a gradient.
- **Tokens:** `$name` and `var(--cc-name)` in attributes and styles take a value from the theme.
- **Colour:** a `color` prop with `mode: "replace"` paints every drawn pixel in its `tint`;
  `mode: "tint"` keeps the shading and colours it; `opacity` is how much.

- **Animation:** SMIL plays on the element's own clock. At each frame `<animate>`, `<set>`,
  `<animateTransform>` and `<animateColor>` are evaluated at the time since the element began
  and written into plain attributes, so the browser (which would play SMIL on the page's clock)
  and skia (which would not play it) draw the same picture, and scrubbing is exact. Supported:
  `values`, `from`/`to`/`by`, `keyTimes`, `keySplines`, linear, discrete, spline and paced
  timing, `begin`/`end` as offsets or `id.begin`/`id.end` plus an offset, `dur`, `repeatCount`,
  `repeatDur`, `fill="freeze"`, `additive` and `accumulate`. Numbers interpolate wherever they
  sit in a value (lengths, lists, paths with the same commands, transforms) and colours mix.
  Begins on events or `indefinite`, and `<animateMotion>`, are left out with a warning. CSS
  animations (`@keyframes`, `animation`) are removed with a warning.
- **Text** in SVG uses a bundled family or a generic one; any other family is drawn in
  sans-serif in the export (skia has no fallback of its own and would stop).

## Export

The export runs this pipeline in Node: the same plan, painter, compositor and
audio plan, with a skia canvas for the browser's, [Satori](https://github.com/vercel/satori)
for the DOM and an offline mixer for Web Audio. See [Exporting](/guide/exporting).

## What is not rendered yet

Transition types other than crossfade (drawn as a crossfade), effects without
a CSS filter equivalent, colour wheels, curves and LUTs, matte masks, audio
effects, pitch correction, 3D text, most text animation
presets, `emphasis` animations, `background.mode: "blur"` when an overlay sits beneath the footage (the plain colour then), sticker packs other than `icon:`, `<animateMotion>` and CSS animation in SVG, and `file:` nested
references. The check reports each one in your file as a `not-rendered` lint
warning that says what will happen instead (the list is `jsx/rendering.ts` in
the kit); at play time a few also land in the plan's `warnings`.
