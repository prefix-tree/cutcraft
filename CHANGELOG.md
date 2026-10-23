# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Nothing has been published yet.

## [Unreleased]

### Added

- A logo: an orange disc with a wedge cut out of it, like Pac-Man, and a
  small frame ahead of it. Used as the docs site's nav logo and favicon and
  at the top of the READMEs (`docs/public/logo.svg`).

- `recipes/`: seven complete cut files (talking-head cut, product demo with
  zoom-ins, vertical podcast clip, slideshow, stats with handles, variants,
  multicam highlights) over one fixture manifest, each linted, resolved and
  pinned by a test, with a docs page per recipe.

- Captions follow the clips: a word reference on a `<Caption>` resolves to
  where the word plays, and `<Captions src>` with no literal cues generates
  them from the transcript along the timeline (`maxChars`, `maxDuration`,
  `maxGap`). The first edit to a generated cue writes all cues into the
  file; undo resumes generation. Decision 0014.

- Layer handles: a `<Layer>` whose interior is one component exposes that
  component's literal and schema-bound props to the editor (`layer/setProps`,
  `ElementSite.interior`, `Placement.interior`); the player applies edited
  handles without re-evaluating the file. Decision 0013 and a Remotion
  comparison (`docs/comparisons/remotion.md`) record where the idea comes
  from and correct 0001 and 0007 on Remotion having an editor.

- `useLayer()` beside `useT()` inside a `<Layer>`: the layer's clock with
  `elapsed`, `remaining` and `duration` in seconds, the composition `time`
  and `fps`, so a countdown or a timer reads real time off the player.

- `@cutcut/kit`: `track/setLayout`, `multicam/flatten` and `nested/extract`
  apply (they were validated stubs), with `resolveScene` resolving a
  `<Nested>` interior for the kit and the player alike. The fold prints
  chained inserts and reorders as one group and an inserted node as it
  stands after later patches.

- A comparison with Diffusion Studio (`docs/comparisons/diffusion-studio.md`)
  and decision 0012 on what cutcut adopts from it: fold per gesture, editing
  policy in the prompt, `sequence-gap` and `cut-inside-word` lint rules,
  `PlayerCore.captureSheet`.

- `@cutcut/kit`: the JSX vocabulary (26 elements with Zod schemas), the asset
  manifest and `TimeRef` resolution, the resolver (sequence and free tracks,
  gaps, transitions, anchors, fill and match durations, multicam cuts), the
  patch log, the action system (124 actions with validate, apply, invert and
  fold), history with gesture grouping, the executor, the source index, fold,
  bake and lint.
- `@cutcut/player`: the browser renderer. WebCodecs decoding through mediabunny,
  per-clip decoders, canvas compositing with transforms, masks, crossfades and
  adjustments, DOM overlays, a Web Audio clock and mixer with ducking, the
  framework-free `PlayerCore` and the React `<Player>`.
- `examples/launch-recap`: a file written from a brief under the authoring
  prompt, played with placeholder footage; a guide explaining each choice.
- The docs site: guides, generated element and action reference, decision
  records.
- Benchmarks and performance tests for the drag loop.

### Changed

- A timing prop that references a `schema` prop (`out={closeOut}`) is bound,
  not locked: the timeline drags it and the fold writes the value into
  `defaults`. Placements carry `boundProps`; `expression-locked` no longer
  warns on it.
- The project and its packages are named cutcut (`@cutcut/kit`, `@cutcut/player`); the TSX file is still called a cut file.
- Resolve caches parsed props and intrinsic timing per node and keeps
  placement identity, so a drag step costs about 1 µs per element.
- Decoders survive trims; a paused preview repaints without waiting and
  settles to the exact frame after the gesture.
