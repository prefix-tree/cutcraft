# 0018. Free code in a timeline skeleton

> Supersedes [0002](./0002-fixed-vocabulary-and-literal-ids.md) and [0009](./0009-helpers-layers-and-editability.md) where they
> limit what is visual, and the export half of [0015](./0015-a-headless-engine-renders-the-export.md) for free code.

## Context

The file was written in a fixed vocabulary of 26 elements (0002), and `<Layer>` was an escape hatch whose interior the
lint kept to `useT` and `useLayer` (0009) and the export drew through Satori, a subset of CSS (0015). That narrowed the
model to what we had thought of. Models are good at writing code: a shader, a 3D card, a chart, a library they know.
Remotion draws all of it because a browser renders every frame; we accepted 3D transforms, glitch and zoom
transitions, colour wheels and matte masks in the schemas and drew none of them.

Only a part of the file needs a vocabulary: the part that holds footage and time. The editor trims clips, moves them
by transcript words and camera shots, and folds every gesture back into the file; for that it needs elements with ids
and literal timing. Pictures drawn on top need none of that.

## Decision

- **A skeleton for time.** `<Composition>`, `<Track>`, `<Clip>`, `<Audio>`, `<Gap>`, `<Transition>`, `<Captions>`,
  `<Marker>`, `<Keyframe>`, `<SpeedKey>`, `<Freeze>`, `<Nested>` and `<Multicam>` keep literal ids, Zod schemas, time
  references, actions, fold and bake as before.
- **Free code for pictures.** A `<Layer>` is placed like any overlay (anchor, `at="word:N"`, offset, duration,
  transform) and holds any React: any hooks, CSS (3D, filters, blend modes, masks), canvas, WebGL, and the libraries
  the host offers (`loadModule(source, { imports })`). Its interior stays opaque to the kit; the model edits it as text,
  and one component child still gets handles (0013).
- **The library stays.** (`<Graphic>` and `<ColorGrade>` were later removed: see 0024 and the changelog.) `<Title>`, `<Graphic>`, `<Shape>`, `<Svg>`, `<Sticker>`, `<Effect>`, `<ColorGrade>`,
  `<Mask>` and `<Adjustment>` remain as ready-made, inspector-editable pieces; the model uses them when they fit and
  writes code when they do not.
- **The lint follows.** Only a helper that makes timeline elements must be pure, since the resolver calls it as a
  function. Ids must be unique among elements, not among HTML. New warnings: HTML straight in a track (nothing draws
  it), and free code off the video's clock (timers, `<video>`/`<audio>`, `willReadFrequently` canvases).
- **A browser renders free code in the export.** The export runs the same Player in headless Chrome, captures each
  frame with HTML-in-Canvas (`drawElementImage`) and encodes it with WebCodecs, with CSS and Web Animations held at
  the frame's time. The Node engine stays for files without free code. Until the browser engine ships, the Node
  engine draws a Layer through Satori and says what it left out.

## Consequences

- What the model may draw is what a browser draws. The editor's model does not change: it still sees the skeleton,
  and asks the model to change what is inside a Layer.
- The export needs Chrome for files with free code (157 or later, or 156 with `CanvasDrawElement` enabled). A spike
  rendered 1080p H.264 at 185 to 202 fps that way on an M3 Pro, faster than the Node engine wherever frames are drawn.
- Free code must be a function of time to render the same twice: `useT()`, `useLayer()`, requestAnimationFrame and CSS
  animations follow the video's clock; state that builds up from frame to frame does not survive a seek.

## Alternatives

Free code everywhere, as Remotion does: the timeline would lose its footing, since a clip trimmed by words and an
anchor that follows it need ids and literal timing. Free code only through more vocabulary: every effect a model
wants would wait for us to add it.
