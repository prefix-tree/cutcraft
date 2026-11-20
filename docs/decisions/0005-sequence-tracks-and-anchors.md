# 0005. Sequence tracks by default, anchors for overlays

## Context

Absolute `start` on every element (Diffusion Studio, most code renderers) is
easy to render and hard to edit: trimming one clip leaves a gap or an overlap
and the author must move everything after it. Magnetic timelines (Final Cut)
derive position from order.

## Decision

A `<Track>` is `layout="sequence"` by default: children play back to back in
document order, `<Gap>` makes a hole, writing `start` is a lint error. A
`layout="free"` track takes a literal `start` on every child. Any element may
instead `anchor` to another element (or to `"start"`) with an `offset`.
Transitions are siblings between two clips of a sequence track and overlap
them by their duration.

## Consequences

- Trimming the hook clip moves everything after it, and the title anchored to
  the hook moves with it; the model writes no arithmetic.
- `duration="fill"` lets a bed run to the end of whatever the sequence became.
- The resolver iterates anchor and match-duration dependencies and reports
  cycles.

## Alternatives

Only absolute starts: every edit becomes a cascade of number changes in the
file. Only magnetic tracks: music beds and B-roll need absolute placement.
