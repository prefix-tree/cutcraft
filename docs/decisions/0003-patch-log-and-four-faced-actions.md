# 0003. Editor state is the file plus a patch log; actions have four faces

## Context

A drag produces a hundred updates a second. Rewriting the file on each one
would be slow, would churn the model's view and would make undo a text-diff
problem. Yet the file must end up holding the result (0001).

## Decision

Editor state is `{ file, patches }`. A gesture dispatches actions. Each action
handler has four faces: `validate` against the resolved state, `apply` as
patches appended to a log, `invert` computed from the state before, and
`fold`, which turns the net patches into source edits. The resolver applies the
log's net effect over the file on every change (memoised per log version).
History groups a gesture into one undo step and auto-groups rapid same-target
updates. At a sync point the log is folded into the file: one changed token per
touched prop, printed elements for insertions, baked literals for anything
generated.

## Consequences

- The live path never touches text; a drag step costs about a microsecond per
  element (0011).
- Every action has an inverse, so undo re-runs actions instead of restoring
  snapshots, and the history is a readable list of what the user did.
- The fold is the only place where "edit the code" is confronted, and it is a
  token edit, not a transpile.
- Policy: the fold runs when a history group closes, so the file is at most
  one gesture behind the preview (decided in 0012 after studying Diffusion
  Studio, whose debounced writer can write a drag several times).

## Alternatives

Elements as reducers over a runtime document with no write-back: see 0001.
Operational transforms on text: undo and validation would have to be
re-derived from diffs.
