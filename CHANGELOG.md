# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Nothing has been published yet.

## [Unreleased]

### Added

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
