# 0011. The performance contract: identity, not diffing

## Context

A drag re-resolves the file on every pointer move and pushes the result into
the player and the DOM. Measured on a 1,000-element project before any work:
5.5 ms per step, with Zod re-parsing every element.

## Decision

The resolver guarantees identity for what did not change: the overlay keeps
every untouched node object, parsed props are cached per raw props object,
intrinsic timing is cached per node, and a placement whose timing, props,
errors and children are equal to the previous resolve is the same object.
Consumers memoise on identity: the DOM layer skips elements whose placement
is the same object, decoders are keyed by asset and take a new trim in place,
and a paused preview paints at once and fetches the exact frame after the
gesture is quiet. A benchmark (`pnpm --filter @cutcut/kit bench`) and tests guard
the identities and a loose budget.

## Consequences

- About 1 µs per element per step (1.0–1.3 ms on 1,007 nodes).
- Anything that computes new placement objects for unchanged elements breaks
  the contract; the perf test fails.
- Per-track incremental placement is a possible next step, not taken: it
  needs anchor dependency tracking.
