# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Nothing has been published yet.

## [Unreleased]

### Added

- `@cutcut/render`: export to WebM (VP9 and Opus) or MP4 (H.264 and AAC) in Node,
  with no browser. It runs the player's engine through the new
  `@cutcut/player/engine` and `@cutcut/player/overlays` entries; titles, layers
  and captions are laid out by Satori from the trees the browser mounts and drawn
  with the layout the DOM gives them (blend modes included); the soundtrack is
  mixed by our own offline mixer (bit-exact against Web Audio's
  `OfflineAudioContext` at 1x and 1.5x); `cutcut-render` loads a TSX file and
  renders it. Workers render runs of whole keyframe intervals and the main
  thread joins them (1.6 to 2.2 times one thread on four cores); `--copy` copies
  the encoded pictures of plain cuts of a VP8/VP9 source (460 fps against 12 on
  keyframe-aligned cuts); overlay layouts are cached; `--speed fast` is the
  encoder's real-time mode. Every recipe is rendered in a test. Decision 0015.

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

### Fixed

- A placement with `duration="fill"` (a music bed under the whole video) had a
  source range of nothing, so the audio plan skipped it and the bed was silent
  in the preview. It now plays the range it fills.
- A multicam's generated clips carried the angle's `asset:` reference as their
  asset id, which no media resolver knows. They carry the plain id.
- `useT()` and `useLayer()` look for the player's clock on `globalThis`, so a
  cut file loaded with its own copy of the kit (a tool's private module graph)
  still finds it.
