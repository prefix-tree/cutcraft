# 0010. OpenReel is the UX reference, with named deviations

## Context

Designing an editor's gestures from scratch is a years-long project. OpenReel
(MIT) has a complete timeline, inspector and action system with 115 action
types and an undo history with gesture grouping.

## Decision

Our action set maps onto OpenReel's feature set (`docs/reference/parity.md`),
its enums are adopted verbatim so the two editors agree on names, and its
history semantics are ported. Where its implementation is wrong we deviate and
record it: trims recompute duration with speed, slide is the textbook
operation, slip/slide/roll have inverses, consolidate and close-gap actually
undo, keyframe removal keeps easing, edge trims and chroma key go through
actions. Our additions: magnetic tracks, anchors, time references, locked
expressions, bake-on-gesture, Layer interiors.

## Consequences

- The eventual editor UI can copy OpenReel's gestures one to one.
- The player avoids OpenReel's playback mistakes (a container reopened per
  frame, whole-file audio decode before play, rate not applied to audio).
