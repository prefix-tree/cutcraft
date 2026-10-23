# Remotion

Remotion (remotion.dev, MIT-style licence with a company tier) is a React
renderer for video: a composition is a React component plus `fps`, size,
`durationInFrames` and input props, and the picture at a frame is what the
component renders for that frame. It ships a Player, a Studio with visual
editing that writes back to source, a server renderer on headless Chromium,
and `@remotion/web-renderer` for in-browser rendering. The facts below were
checked against Remotion's documentation on 2026-10-23; each links to its
page.

## Same thesis, different picture

Both projects say the code is the video. The difference is what the code
describes.

| | Remotion | cutcut |
|---|---|---|
| Picture | `component(frame, props)`: React decides every pixel each frame ([the core idea](https://www.remotion.dev/docs/idea)) | a resolved timeline: placements with start, end, source range and props; the player paints them |
| Placement | `<Sequence from durationInFrames>`: absolute frames ([composition](https://www.remotion.dev/docs/terminology/composition)) | sequence tracks by order, free tracks by `start`, anchors with `offset` |
| Animation | `interpolate()` and `spring()` inline, written as literals so the Studio can read them ([best practices](https://www.remotion.dev/docs/studio/interactivity-best-practices)) | `<Keyframe>` children, `<SpeedKey>`, `<Freeze>`; `useT()`/`useLayer()` inside a Layer |
| Inputs | `defaultProps` and a Zod schema; `calculateMetadata()` for dynamic metadata | `schema` and `defaults` exports; bound props fold into `defaults` |
| Custom components | `Interactive.create({ Component, schema })` declares editable props ([make a component interactive](https://www.remotion.dev/docs/studio/make-component-interactive)) | a Layer's one component gets handles from its literal and schema-bound props (0013) |
| Footage | `<Video>`/`<OffthreadVideo>` from `@remotion/media` | `<Clip>` trimmed by seconds or transcript and shot references against a manifest |

Remotion's editability rules are ours in different words: "for every clip,
scene, layer or sequence that should be editable on its own, write a separate
JSX node"; literal values; loops produce one item; inline styles only, no
constants, spreading or math; keep composition metadata inline. Our lint
checks the same things (`literal-ids`, `expression-locked`, `pure-helpers`)
and our generated-element rule is their loop rule with a bake.

## The round trip

Remotion Studio selects sequences, props, effects, keyframes and easing
segments; dragging moves a sequence by updating `style.translate`, edges
scale and corners rotate, and drags on keyframed properties create or update
keyframes at the current frame, all written to the source with undo
([interactivity](https://www.remotion.dev/docs/studio/interactivity)). What it
cannot read as a literal it greys out. `visualControl()` (a sidebar slider
saved to code on request) is deprecated in favour of this
([visualControl](https://www.remotion.dev/docs/studio/visual-control)).

Ours differs in two ways. The write-back goes through a patch log, so a
gesture is one history entry and one fold at its end rather than a write
per change, and every action has an inverse that is itself an action. And
the editor edits a timeline, not a component tree: trims ripple, transitions
overlap neighbours, captions reference words. Remotion's Studio edits what a
component draws; ours edits what the cut is.

## Rendering

Remotion renders on a server with headless Chromium, or in the browser with
`@remotion/web-renderer`, which "encodes with WebCodecs using Mediabunny"
and is "limited to a subset of tags and CSS properties"
([client-side rendering](https://www.remotion.dev/docs/web-renderer)). Our
player is that second path by construction: footage decodes through
Mediabunny and composites on a canvas, overlays are DOM, and `renderFrame(t)`
is deterministic for an exporter to step through. The constraint is the
same on both sides: what the DOM renders beyond the canvas has to be
rasterised, and neither project renders arbitrary CSS to video.

## The model as author

Remotion's answer to a model writing video is the same as its answer to a
person: write components, keep values literal, declare controls. Its
`InteractivitySchema` is the explicit form of what our bound props do
implicitly. Where we go further is the vocabulary: a model writing cutcut
writes `<Clip in="word:12" out="word:23.end">` and a resolver does the
arithmetic; a model writing Remotion writes frame numbers it computed
itself.

## Verdict

Adopt the component-level control model as Layer handles (0013). Keep the
resolver, sequence tracks and keyframe children. Watch `web-renderer`'s
supported subset as the benchmark for what our exporter must rasterise.
