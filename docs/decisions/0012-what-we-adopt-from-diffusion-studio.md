# 0012. What we adopt from Diffusion Studio

## Context

Diffusion Studio's editor shares our thesis and ships. Before building
cutcut's editor UI we studied its write-back path, runtime and agent surface
(in a comparison page since removed). The question was
whether to change course.

## Decision

Keep cutcut's file model: the resolver, sequence tracks and anchors, time
references against the manifest, the patch log and the fold. Their design
validates the write-back idea and shows the cost of absolute placement and
of a live-mount export.

Adopt five things:

1. **Fold at gesture end.** One source write per history group, when the
   group closes; the model always reads a file that is at most one gesture
   behind the preview. This supersedes the open policy question in 0003.
   Their 120 ms debounce, which can write a drag several times, is rejected.
2. **Editing policy in the authoring prompt.** Brief first; A-roll, then
   B-roll, then captions; no editorial cuts without a target length; pauses
   inside clips rather than gaps; 0.3–0.5 s between sentences, at most 0.8 s
   of tail, never mid-word; verify after every stage.
3. **A `check` equivalent.** Most of what their structural check finds is
   already a resolve error (missing assets, trims past the source, dangling
   anchors, zero durations). Two lint rules close the gap: `sequence-gap`
   (black frames: a gap on the first sequence track) and `cut-inside-word`
   (a numeric trim inside a transcript word).
4. **A `capture` equivalent.** `PlayerCore.captureSheet(times)` renders a
   labelled contact sheet from `renderFrame`, so an agent or a test looks at
   the result without exporting.
5. **Scrub-to-keyframe while dragging** and **decoder handoff on split** as
   player follow-ups; recorded, not built.

Not adopted, with reasons: absolute placement (every trim becomes arithmetic
the agent does by hand); stamping ids into the user's file (the file the
model handed over should be the file that runs); overwriting expression
props (we lock or bind them); unrolling a loop on the first edit (we bake as
an undoable action); view state in the source (noise in diffs); an ECS
runtime and a live-mount export (determinism becomes the author's problem).

## Consequences

- The editor package, when built, closes a history group by folding.
- The prompt and the guide carry editing policy, not only file conventions.
- `lint` needs the manifest for `cut-inside-word`; without one the rule is
  silent.
- `captureSheet` is part of the player's public surface and of the e2e suite.
