# 0031. A smaller surface for the timeline vocabulary

> Status: proposed. Revisits how [0002](./0002-fixed-vocabulary-and-literal-ids.md) (a fixed vocabulary with literal
> ids) is spelled, not what it decides. Each change below is its own pull request, taken only once this record is
> accepted.

## Context

A reader who knows React looks at an UberScene file and sees components with a great many props. `<Title>` takes
29: six for timing, five for placement, fourteen for the look of its text, three for motion, and its id. `<Clip>`
takes 20. Read next to Remotion, where a scene is a few components and the rest is code, the file looks over
configured.

Part of that is the design. 0002 makes the file a document the editor can change one value at a time and write back:
a fixed vocabulary, a literal id on every element, collections the inspector edits one by one as child elements. That
puts UberScene closer to OpenTimelineIO or Final Cut's XML, where many attributes are normal, than to a library of
React components. Remotion has no editor that writes back into the file, so it pays none of this.

Part of it is not the design, only how the vocabulary grew. Reading the examples finds five things that make it
harder to write and read than it needs to be:

1. **It is presented as React.** The landing page and the guide say "a React file". The reader expects components
   and hooks, and meets a document format.
2. **Props are grouped by no rule.** Some concerns are objects (`transform`, `animation`, `fade`, `duck`); others are
   flat (`size`, `width`, `align`, `weight`, `color`). `<Title>`'s fourteen text props sit beside its timing props.
3. **Two coordinate systems meet in one file.** An element's `transform.position` is pixels from the centre of the
   frame (`docs/guide/elements.md`); free code inside a `<Layer>` or `<Motion>` is CSS, measured from the top left.
   `examples/showcase/edit.tsx` places its title at `x: -240, y: -170` and the lower third beside it at
   `left: 68, top: 402`.
4. **Keyframes are long.** A slow push-in is four `<Keyframe>` elements, each with its own id and a string path
   (`property="transform.scale.x"`), one per axis. The examples hold 112 of them.
5. **Every element needs an id,** keyframes and effects included, though nothing anchors to a keyframe and the editor
   could name one from its parent.

Anchoring to a spoken word (`anchor="hook" at="word:14"`) and the duration forms (`"fill"`, `"source"`, `{ match }`,
`{ until }`) are not on this list. They are many ways to say when, but each says something no other can, and they are
the reason the product exists.

## Decision

**1. Say what the file is.** The landing page, the introduction and the skill call it a timeline document written in
JSX: elements that describe a cut, which the editor reads and writes, with free React where a layer needs it. "A
React file" stays true of `<Layer>` and its children, and is said there.

**2. One rule for grouping props.** On every element that draws:

- timing stays flat: `id`, `start`, `anchor`, `at`, `offset`, `duration`, and a clip's `in`, `out`, `speed`;
- where it sits is one object, `box`: `x`, `y`, `width`, `height`, `align`, `valign`, `origin`;
- how it is turned stays `transform`: `scale`, `rotation`, `opacity`, `crop`, rounded corners;
- how text looks is one object, `text`: `font`, `size`, `weight`, `italic`, `color`, `stroke`, `shadow`,
  `lineHeight`, `letterSpacing`, `decoration`, with `style` naming a preset of it;
- how it moves stays `enter`, `exit` and `animation`;
- how it sounds stays `volume`, `fade`, `automation`, `duck`.

`<Title>` goes from 29 props to 16: the six timing props, then `box`, `transform`, `text`, `style`, `fit`, `blend`,
`blendOpacity`, `enter`, `exit` and `animation`. Its text background joins `text`. The inspector's panels follow the
same groups, so the file and the editor show one structure.

**3. One coordinate system.** `box.x` and `box.y` are pixels from the top left of the frame, as in CSS, so a title
and the free code beside it are measured the same way. `box.origin` (`"top-left"` by default, `"center"`, or any of
the nine points) says which point of the element sits there. An element with no `box` is still centred and fitted,
as now. `transform.position` is removed; the editor's move handle writes `box.x` and `box.y`.

**4. Keyframes as a value.** An animatable prop takes a list of keys as well as a value:

```tsx
<Clip id="zoom" src="asset:espresso" in={2} out={5.5}
  transform={{ scale: keys([0, 1], [3.5, 1.2, "easeInOutSine"]) }} />
```

`keys()` is a kit helper that returns literal key data. A vector property keys as a whole, so a push-in no longer
needs one key per axis. The editor shows the keys on the timeline. The first gesture on one key turns the list into
`<Keyframe>` children with literal ids, as [0009](./0009-helpers-layers-and-editability.md) bakes a helper's output
before an edit, and the fold writes them back. An agent writing a file uses the short form; a file the editor has
touched may hold the long one, and both read the same.

**5. Ids only where something refers to them.** Timed elements keep a required, literal id: anchors, captions, ducking
and the editor's selection all use it. Children that nothing refers to by name (keyframes, effects, masks, speed keys)
may leave it out. The resolver names them from their parent, their kind and their place (`zoom.scale.1`,
`zoom.effect.0`), the same on every load. The editor writes a literal id when it first needs one, as it bakes a key.

## Alternatives set aside

- **Plain React components with hooks, as Remotion does.** Fewer props, but the editor could not write a change back as
  one value, which is what 0002 and [0003](./0003-patch-log-and-four-faced-actions.md) are for.
- **Every prop flat.** Shorter objects, but 29 names in one list is what the reader finds hard; groups are what the
  inspector shows anyway.
- **Centre-relative coordinates everywhere.** It suits a title on a blank frame, but free code is CSS, and CSS starts
  at the top left. One system has to give way, and the one that is a web standard stays.

## Consequences

- Every example, recipe, block and short is rewritten, and the editing suite and the docs generated from the schemas
  move with them. Breaking changes are allowed before 1.0; the changeset says how to move a file.
- The lint gets a fix for each old spelling (`transform.position` to `box`, flat text props to `text`), so an old file
  moves in one command.
- An agent writes shorter files, and the skill's examples get shorter with them.
- The inspector, the actions and the fold work on the new groups. The action names stay; their params follow the props.
- A key list is one more form a value can take. The resolver and the player read both; only the editor bakes.

## Plan

1. **Words.** The landing page, introduction and skill say what the file is. No code.
2. **Coordinates.** `box` with `x`, `y`, `origin`; `transform.position` removed; the move handle, the layout check and
   `where` in the same pixels; examples moved.
3. **Groups.** `box` gains `width`, `height`, `align`, `valign`; the `text` object; schemas, inspector panels and
   actions; the lint fixes; examples moved.
4. **Keys.** `keys()`, vector keys, the bake on first gesture, the fold.
5. **Ids.** Derived ids for children nothing refers to; the editor writes one when it needs it.
