# Editing

The editor's state is the file plus a patch log. Gestures dispatch actions;
the resolver applies the log's net effect over the file; the log is folded into
the file at sync points. [Decision 0003](../decisions/0003-patch-log-and-four-faced-actions.md)
gives the reasoning; this page gives the mechanics.

## Resolve

```ts
const tree = collectModule(file);          // walk the element tree, expand pure helpers, index by id
const state = resolve(tree, manifest, log); // absolute placements, memoised per log version
```

`ResolvedState` holds the composition settings, the tracks, `items`
(`Map<id, Placement>` with `start`, `end`, `duration`, `source`, parsed `props`,
`editable`, `lockedProps`, `errors`) and the typed error list. Placements that
did not change between resolves are the same object (see
[decision 0011](../decisions/0011-performance-contract.md)).

## Actions

```ts
const exec = new Executor({ tree, manifest });
const result = exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: "word:22.end" } });
result.ok;        // validation passed, patches appended, history entry pushed
result.inverse;   // the action that undoes it
exec.undo(); exec.redo();
exec.beginGroup("drag"); … exec.endGroup();   // one history entry for a gesture
```

Every handler has four faces:

| face | input | output |
|---|---|---|
| `validate` | action, resolved state | ok, or typed errors (`ELEMENT_NOT_FOUND`, `TRACK_LOCKED`, `LOCKED_PROP`, `OUT_OF_BOUNDS`, `NOT_ADJACENT`, …) |
| `apply` | action, patch log | appends `set`, `text`, `insert`, `remove`, `move`, `bake` patches |
| `invert` | action, state before | the inverse action, never null |
| `fold` | action, source index | source edits, when the generic fold is not enough |

The [action reference](../reference/actions.md) lists all of them with their
OpenReel counterparts. History auto-groups rapid same-type, same-target
updates (a slider drag) within 100 ms and keeps explicit groups for gestures.

## Patches

The log keeps every patch and a reduced net effect per element: last write
wins per prop, a removal of an inserted element forgets it, an insert after a
remove of the same id replaces it. The resolver overlays the net effect on the
collected tree; untouched nodes keep their identity.

## Fold

```ts
const { text: next, edits, baked } = foldToSource(text, exec.log(), exec.state());
```

The source index maps every id to its ranges in the text. A `set` patch on a
literal prop becomes one edit covering the old value token; an `insert` prints
the element in place with the parent's indentation; a `remove` deletes the
element's range; a patch on a `generated` element bakes the helper's output into
literals first, re-indexes and folds again. After the fold the model reads a
file that differs from what it wrote by exactly what the user did.

When the model writes the file, the executor is reset with the new tree
(`replaceTree`): the log and history belong to the previous version of the
file.

Three actions rewrite structure rather than a value, and fold the same way:

- `track/setLayout` converts a track. To free: every sequenced child gets its
  resolved `start`, a transition between siblings becomes an edge transition
  on the outgoing clip, gaps go. To sequence: children are reordered by
  start, holes become `<Gap>`s and starts are dropped; overlapping items are
  refused, since a sequence cannot express them. Nothing moves in time.
- `multicam/flatten` replaces a `<Multicam>` on a free track by one literal
  `<Clip>` per cut, at the time and source range the cut resolved to; a cut
  that ran past its source is cut short where the source ends.
- `nested/extract` writes a scene's tracks into the file: one free track per
  inner track, inserted after the nested element's track, every item at the
  time it played; on a sequence track a `<Gap>` keeps the slot. A nested
  with `in`, `out` or a transform is refused, as are scenes with transitions.

## Lint

```ts
lint(text, { manifest })   // Diagnostic[] with rule, severity, message, range, id, prop
```

Rules: `literal-ids`, `unique-ids`, `no-start-on-sequence`, `pure-helpers`,
`expression-locked`, `one-captions`, `ambiguous-duration`, `file-shape`,
`missing-asset`. They are the conventions that keep a file editable; the
model's prompt lists the same ones. Two warnings check the cut rather than
the file: `sequence-gap` (a `<Gap>` on the first sequence track, which is
black unless another track covers it) and `cut-inside-word` (a numeric `in`
or `out` that lands strictly inside a transcript word; it needs the manifest
and names the `word:N` reference to use instead). Two more read the
source's own cuts from the manifest's shots: `cut-near-shot` (an `in` just
before a shot change or an `out` just after one, which flashes a few frames
of the other shot; it names the `shot:N` edge to use) and
`shot-change-inside-crop` (one `transform.crop` over a range the camera cuts
inside, so the framing the crop was set for ends mid-clip; split there), and `repeated-source` (two clips on
one track playing overlapping stretches of the same asset, usually a split that kept the old clip).
