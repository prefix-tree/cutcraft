# Editing

This page is for building a video editor on UberScene. In such an editor the user drags, trims and types on a timeline
and a preview, every gesture can be undone, and each change lands in the file's text. The model that wrote the file
then reads a file that differs from what it wrote by exactly what the user did.

`@uberscene/kit` has the pieces, in the order you need them:

| Piece | Does | Section |
|---|---|---|
| The resolver | Places every element in time, for the timeline and the [player](./player). | [Place every element](#place-every-element) |
| Actions | Run each gesture, check it, and undo it. | [Run a gesture](#run-a-gesture) |
| The patch log | Holds what the user changed, over the file. | [The patch log](#the-patch-log) |
| The fold | Writes the log back into the file's text. | [Write the edit into the file](#write-the-edit-into-the-file) |
| Lint | Checks the file follows the conventions an editor relies on. | [Lint](#lint) |

An editor's state is the file plus a log of patches. Gestures run actions, the resolver applies the log over the
file, and at sync points the log is folded into the file's text.

## Place every element

The resolver turns the file into absolute placements: when each element starts and ends.

```ts
const tree = collectModule(file);          // walk the element tree, expand pure helpers, index by id
const state = resolve(tree, manifest, log); // absolute placements, memoised per log version
```

`ResolvedState` holds:

| Field | Is |
|---|---|
| composition settings | Size, frame rate and the rest of the `<Composition>`. |
| tracks | The tracks, in order. |
| `items` | A `Map<id, Placement>`, each with `start`, `end`, `duration`, `source`, parsed `props`, `editable`, `lockedProps` and `errors`. |
| errors | The typed error list. |

Placements that did not change between resolves are the same object, so a UI can memoise on them. A change costs
about 2 µs per element.

## Run a gesture

Every gesture is an action. The `Executor` checks it, records it and keeps the history for undo:

```ts
const exec = new Executor({ tree, manifest });
const result = exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: "word:22.end" } });
result.ok;        // validation passed, patches appended, history entry pushed
result.inverse;   // the action that undoes it
exec.undo(); exec.redo();
exec.beginGroup("drag"); … exec.endGroup();   // one history entry for a gesture
```

The [action reference](../reference/actions.md) lists all 115.

**Undo.** History auto-groups rapid same-type, same-target updates (a slider drag) within 100 ms, and keeps explicit
groups (`beginGroup`, `endGroup`) for gestures.

**No edit breaks the file.** After an action applies, the executor resolves the result. If it has an error the file
did not have before (a title anchored to a word no clip plays, a cue on a word trimmed away), the action is refused
with `BREAKS_FILE`, its message names each new error, and nothing is kept: no patch, no history entry. Errors the
file already had do not count. A `batch/apply` is checked once, as a whole, so its middle may pass through a broken
state. Undo and redo are not checked, since each returns to, or repeats, a state an accepted action reached.

**Ask before you act.** An editor greys out what it cannot do, and an agent plans before it writes. Two calls answer
without changing anything:

```ts
exec.can({ type: "clip/split", params: { id: "hook", at: 3.2, newId: "hook-2" } });
// { ok: true }, or { ok: false, errors } with exactly the errors execute() would give
affordances(exec.state(), "hook");
// { kind: "clip", editable: "literal", track: { id: "main", locked: false }, capabilities,
//   props: { in: "literal", out: "bound", … }, actions: ["clip/move", "clip/split", "clip/trim", …] }
```

`can()` runs the same steps as `execute()`, the check for new errors included, then takes back what it appended:
no patch, no history entry, and `state()` is the same object it was. `affordances()` says how each prop can be
written (in the element, into the file's `defaults` when it is bound to the schema, or not at all when it is an
expression) and which actions are about this element and accept it: the right kind, a track that is not locked,
code written in the file. An action listed there can still be refused for its other params (a split outside the
clip, a speed out of range); `can()` gives the definite answer. Actions that create something or act on the whole
file, such as `track/add` or `transition/add`, are about no single element and are not listed.

::: details What each action is made of
Every handler has four faces:

| Face | Input | Output |
|---|---|---|
| `validate` | action, resolved state | ok, or typed errors (`ELEMENT_NOT_FOUND`, `TRACK_LOCKED`, `LOCKED_PROP`, `OUT_OF_BOUNDS`, `NOT_ADJACENT`, …) |
| `apply` | action, patch log | appends `set`, `text`, `insert`, `remove`, `move`, `bake` patches |
| `invert` | action, state before | the inverse action, never null |
| `fold` | action, source index | source edits, when the generic fold is not enough |

An action that is about one element also has `targets`: the param that names it, and the part of `validate` that
depends on the element alone. `affordances()` reads it.
:::

## The patch log

Actions append patches to a log. The resolver overlays the log's net effect on the collected tree, and untouched
nodes keep their identity.

::: details How the net effect is reduced
The log keeps every patch and a reduced net effect per element:

- last write wins per prop;
- a removal of an inserted element forgets it;
- an insert after a remove of the same id replaces it.
:::

## Write the edit into the file

The fold turns the log into edits to the file's text, at sync points:

```ts
const { text: next, edits, baked } = foldToSource(text, exec.log(), exec.state());
```

After the fold the model reads a file that differs from what it wrote by exactly what the user did.

::: details How each patch becomes an edit
The source index maps every id to its ranges in the text.

| Patch | Becomes |
|---|---|
| `set` on a literal prop | One edit covering the old value token. |
| `insert` | The element printed in place, with the parent's indentation. |
| `remove` | The element's range deleted. |
| Any patch on a `generated` element | The helper's output baked into literals first; then the file is re-indexed and folded again. |
:::

### When the model rewrites the file

When the model writes the file, reset the executor with the new tree (`replaceTree`). The log and history belong to
the previous version of the file.

### Actions that change structure

Three actions rewrite structure rather than a value, and fold the same way. Nothing moves in time.

**`track/setLayout`** converts a track.

- To free: every sequenced child gets its resolved `start`, a transition between siblings becomes an edge transition
  on the outgoing clip, and gaps go.
- To sequence: children are reordered by start, holes become `<Gap>`s and starts are dropped. Overlapping items are
  refused, since a sequence cannot express them.

**`multicam/flatten`** replaces a `<Multicam>` on a free track by one literal `<Clip>` per cut, at the time and source
range the cut resolved to. A cut that ran past its source is cut short where the source ends.

**`nested/extract`** writes a scene's tracks into the file: one free track per inner track, inserted after the nested
element's track, every item at the time it played. On a sequence track a `<Gap>` keeps the slot. A nested element
with `in`, `out` or a transform is refused, as are scenes with transitions.

## Lint

Lint checks a file's text against the conventions that keep it editable, and flags cuts and code that will look wrong.

```ts
lint(text, { manifest })   // Diagnostic[] with rule, severity, message, range, id, prop
```

**The file.** These keep a file editable:

| Rule | Severity |
|---|---|
| `literal-ids` | error |
| `unique-ids` | error |
| `no-start-on-sequence` | error |
| `pure-helpers` | error |
| `expression-locked` | warning |
| `one-captions` | error |
| `ambiguous-duration` | error |
| `file-shape` | error |
| `missing-asset` | error |

**The cut.** These warnings check the cut rather than the file:

| Rule | Reports |
|---|---|
| `sequence-gap` | A `<Gap>` on the first sequence track, which is black unless another track covers it. |
| `cut-inside-word` | A numeric `in` or `out` that lands strictly inside a transcript word. It needs the manifest, and names the `word:N` reference to use instead. |
| `cut-near-shot` | An `in` just before a shot change or an `out` just after one, which flashes a few frames of the other shot. It reads the source's cuts from the manifest's shots, and names the `shot:N` edge to use. |
| `shot-change-inside-crop` | One `transform.crop` over a range the camera cuts inside, so the framing the crop was set for ends mid-clip. Split there. |
| `repeated-source` | Two clips on one track playing overlapping stretches of the same asset, usually a split that kept the old clip. |

**What will be drawn.** These warnings look at the picture:

| Rule | Reports |
|---|---|
| `stray-html` | HTML straight in a track, where nothing draws it. |
| `free-code-clock` | Free code off the video's clock ([Free code](./free-code#the-video-s-clock)). |
| `not-rendered` | One of the few things the renderers draw differently from what the file says, listed in [What renders](/reference/rendering). |

## A font picker

A font picker lists the fonts a user can choose, and choosing one is one action. List `FONT_CATALOG` (the bundled
families and a short list from Google Fonts, each with its category, its weights, what it suits and a line on how it
looks) and the families the file itself declares, which are on `state.fonts`.

```ts
exec.execute({ type: "font/use", params: { id: "headline", family: "Bebas Neue" } });
exec.execute({ type: "font/use", params: { role: "heading", family: "Oswald", weight: 700 } });
```

| Param | Names |
|---|---|
| `id` | A title or the captions. |
| `role` | A theme font: `heading`, `body` or `mono`. |
| `family` | The family. It must be bundled, declared by the file, or in the catalogue. |
| `weight` | A weight the family has. |

A Google family the file does not declare yet is added to `state.fonts` at once, so the preview loads it and shows
it. On fold the file gains the declaration and the use site names it:

```tsx
import { Composition, Title, Track, googleFont } from "@uberscene/kit";

const bebasNeue = googleFont("Bebas Neue");

<Title id="headline" font={bebasNeue}>…</Title>
```

A weight added to a family the file already declares is added to that declaration's `weights`. Undo takes the font
and the face to load away together. The same write-back applies to any action that sets a catalogue family as a
font, such as `text/update`.

## Next

- [Player](./player): the preview your editor shows.
- [Action reference](../reference/actions.md): all 115 actions.
- [The file](./the-file): the conventions lint checks.
- [Themes and fonts](./themes#fonts): bundled fonts and declaring your own.
