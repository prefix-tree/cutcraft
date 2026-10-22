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

## Lint

```ts
lint(text, { manifest })   // Diagnostic[] with rule, severity, message, range, id, prop
```

Rules: `literal-ids`, `unique-ids`, `no-start-on-sequence`, `pure-helpers`,
`expression-locked`, `one-captions`, `ambiguous-duration`, `file-shape`,
`missing-asset`. They are the conventions that keep a file editable; the
model's prompt lists the same ones.
