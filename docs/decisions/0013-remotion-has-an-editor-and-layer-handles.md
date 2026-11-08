# 0013. Remotion has an editor now; a Layer's component gets handles

## Context

The library holds two freedoms at once: a model composes a video with code,
and a person edits the result without reading the code. Every feature is
judged by both. The editability ladder has four rungs: vocabulary elements
with literal props, schema props and bindings, helpers that bake, and
`<Layer>` for arbitrary React. The top rung was fully opaque: a
`<Counter from={0} to={1200} />` inside a Layer could not be touched by the
editor, although its props are plain literals in the file.

Decisions 0001 and 0007 say that Remotion "has no editor". That was true
when they were written. Verified against Remotion's documentation on
2026-10-23:

- Remotion Studio writes canvas edits back to source: selecting, moving,
  scaling and rotating sequences, and creating, moving and deleting
  keyframes, update `style.translate`, `style.scale`, `style.rotate` and the
  keyframes in the file, with undo. Only properties the Studio can read as
  editable take part; a computed value is greyed out.
- `Interactive.create({ Component, schema })` (since 4.0.530) makes a custom
  component's props editable by declaring an `InteractivitySchema`; the
  older `visualControl()` is deprecated in its favour.
- `@remotion/web-renderer` renders in the browser through WebCodecs and
  Mediabunny, "limited to a subset of tags and CSS properties"; the server
  renderer with headless Chromium remains.
- Their authoring rules for editable code match ours: one JSX node per
  item that should be editable on its own, literal values, loops collapse
  into one item, no computed styles.

## Decision

Records 0001 and 0007 stand except for the sentence about Remotion; this
record corrects it. The comparison page it pointed to has since been removed.

From Remotion we adopt the component-level control model, as *handles*: a
Layer whose interior is exactly one element whose type is a file-level
function component exposes that element's attributes to the editor. A
literal attribute is editable; an attribute that references a `schema` prop
is bound and folds into `defaults`; an expression is locked. The component's
body stays opaque. There is no wrapper API: the model declares a handle by
writing a literal or a schema prop, which it does anyway.

In the kit, handles are addressed on the Layer id under the `interior.`
prefix (`layer/setProps` writes them, `source/setProps` can too), so locked
and bound checks and the fold apply unchanged; the index records the
component tag as `ElementSite.interior`, the collector keeps its props on
the node, and the player clones the interior element with the edited props.

We keep the resolver, sequence tracks, anchors and time references over
Remotion's absolute `from` and `durationInFrames`, keyframe children over
inline `interpolate()` calls as the animation the editor touches, and the
canvas-plus-DOM player over a DOM-only renderer. A frame-function picture
remains available inside a Layer, where it belongs.

## Consequences

- A model that wants a Layer to be adjustable gives it one component child
  with literal or schema-bound props. The prompt says so.
- A Layer with a host element or several children at its root has no
  handles; the editor can still move, trim and anchor it.
- 0001 and 0007 carry a pointer to this record and are otherwise unchanged.
