# 0031. A smaller surface for the timeline vocabulary

> Status: accepted, in two stages. Revisits how [0002](./0002-fixed-vocabulary-and-literal-ids.md) (a fixed
> vocabulary with literal ids) is spelled, not what it decides. Stage 1 is the plan at the end, one pull request per
> step. Stage 2 is listed and waits for its own decision.

## Context

A reader who knows React looks at an UberScene file and sees components with a great many props. `<Title>` takes
29, `<Clip>` takes 20. Read next to Remotion, where a scene is a few components and the rest is code, the file looks
over configured.

Part of that is the design. 0002 makes the file a document the editor can change one value at a time and write back:
a fixed vocabulary, a literal id on every element, collections as child elements. That puts UberScene closer to
OpenTimelineIO or Final Cut's XML, where many attributes are normal, than to a library of React components. Remotion
has no editor that writes back into the file, so it pays none of this.

Part of it is not the design, only how the vocabulary grew. An audit of the code in November 2026 parsed every
example, recipe and block (145 files) and read the schemas against the player. It found:

- **Props that do nothing.** The schema accepts them and the player never reads them: `fit` on Title, Shape and
  Sticker; `blendOpacity` on every overlay; `transform` on Adjustment; a mask's `expansion`, `easing` and keyframes;
  two fields of a title's `animation` and two of its `shadow`. The capability table lets Multicam sit in a
  Composition, where the resolver rejects it.
- **Props grouped by no rule.** Some concerns are objects (`transform`, `animation`, `fade`, `duck`); others are flat.
  Title has fourteen flat text props. Captions keep the same look in a `style` object.
- **Two coordinate systems.** Elements, captions and components measure from the frame's centre; blocks, diagram
  parts and free code measure from the top left. `examples/showcase/edit.tsx` places a title at `x: -240, y: -170`
  and the lower third beside it at `left: 68, top: 402`.
- **One idea under several names.** A kind is chosen by `type`, `shape`, `preset`, `variant` or `mode`. `at` has
  seven meanings. `style` is a preset name on Title and a preset name or an object on Captions. Enum values mix
  `"ease-in-out"` and `"easeInOutSine"` in one list.
- **Options nobody writes.** 45 of 52 easings, all 18 blend modes, 11 of 20 entrance animations and 7 of 9 shape
  kinds appear in no file. Svg, Sticker, Mask, Gap and Nested appear only on their own reference pages.
- **Long keyframes and ids on everything.** A push-in is four `<Keyframe>` elements, each with an id and a string
  path per axis. Nothing refers to a keyframe's id but the action that edits it.
- **A public surface with no edges.** The kit exports 450 names, and 299 are used by nothing outside it: handler
  helpers, patch internals, speed math. There are 115 actions, with a copy of create, update and remove for each of
  six overlay kinds, and only one of the removes carries what depends on the element
  ([0003](./0003-patch-log-and-four-faced-actions.md)).
- **It is presented as React.** The reader expects components and hooks, and meets a document format.

Anchoring to a spoken word (`anchor="hook" at="word:14"`) and the duration forms (`"fill"`, `"source"`, `{ match }`,
`{ until }`) are not on this list. Each says something no other can, and they are the reason the product exists.

## Decision

**1. The schema says only what is drawn.** A prop the player does not read is removed, and writing it is an error
that names it. The capability table matches what the resolver accepts. The docs for a keyframe's easing say what the
player does: the easing on a key shapes the move from that key to the next.

**2. Every rename comes with its fix.** A lint finding can carry a fix, and `uberscene lint --fix` applies them. Each
step below that changes a spelling adds the rule that moves an old file, so a file written for the old vocabulary
moves in one command.

**3. Two packages for two readers.** `@uberscene/kit` holds what a video file imports: the elements, components,
hooks, helpers, diagram parts and theme, with a `./schema` entry for the vocabulary as data. `@uberscene/sdk` holds
what a tool is built with: the resolver, the actions and executor, the patch log, the write-back to source, the lint
and the inspection rows. Internals are not exported, and the unused-export check is an error, not a warning. The
overlay kinds share one `element/create`, `element/update` and `element/remove`, and every remove carries what
depends on the element. The API page is generated from the exports.

**4. One coordinate system.** Where an element sits is one object, `box`: `x`, `y`, `width`, `height` in pixels from
the top left of the frame, as in CSS, and `origin` to say which point of the element sits there (`"top-left"` by
default, `"center"`, or any of the nine points). Captions and the components measure the same way. An element with
no `box` is centred and fitted, as now. `transform.position` is removed; `transform` keeps how an element is turned:
`scale`, `rotation`, `opacity`, `crop`, rounded corners.

**5. One way to style text.** `style` is a preset name or an object, on Title as on Captions:
`style={{ preset: "h1", size: 64, color: "$primary", align: "left" }}`. The fourteen flat text props go, and
Captions' flat `align` joins its `style`. The group is not named `text`: a title's words are its text, and the theme
and the lint already treat that name as content. Title goes from 29 props to 13.

**6. One naming rule.** A kind is always `type`. A shadow's blur is always `blur`; a line's thickness is
`thickness`. Seconds on the video are `start`, so Marker's `at` becomes `start`. Enum values are camelCase
everywhere, as effect names already are.

**7. Trim to what is standard.** Easings are the five CSS names, `hold` and the ten standard families. Entrance
animations and blend modes keep their standard sets. Sticker is removed: `<Svg src>` and an image `<Clip>` do its
job. An unknown value is an error that names the nearest one kept.

**8. Shorter files.** An animatable prop takes a list of keys as well as a value:

```tsx
<Clip id="zoom" src="asset:espresso" in={2} out={5.5}
  transform={{ scale: keys([0, 1], [3.5, 1.2, "easeInOutSine"]) }} />
```

The first edit of one key turns the list into `<Keyframe>` children, as editing one caption cue makes its generated
siblings literal. Timed elements keep a required, literal id. Keyframes, effects and speed keys may leave it out and
are named from their parent, their kind and their place.

**9. Say what the file is.** The landing page, the introduction and the skill call it a timeline document written in
JSX, with free React where a layer needs it.

## Alternatives set aside

- **Plain React components with hooks, as Remotion does.** Fewer props, but the editor could not write a change back
  as one value, which is what 0002 and 0003 are for.
- **Every prop flat.** 29 names in one list is what the reader finds hard; groups are what an inspector shows anyway.
- **Centre-relative coordinates everywhere.** Free code is CSS, and CSS starts at the top left. One system has to
  give way, and the one that is a web standard stays.
- **Deep cuts now.** Merging Audio into Clip, or Motion and Three into Layer, makes the surface smallest, but some
  files read worse and every example moves twice. They wait for stage 2.

## Consequences

- Every example, recipe, block and short is rewritten, with the editing suite and the generated docs. Breaking
  changes are allowed before 1.0; each changeset says how to move a file, and the lint fix does it.
- A respelling must not move a pixel: each step compares every example's poster before and after.
- Tools import from `@uberscene/sdk`. The player and the renderer do too.
- The actions' names change once, while nothing outside this repository calls them.

## Plan

Stage 1, one pull request per step:

- **A.** The schema says only what is drawn (decision 1).
- **B.** Lint fixes and `uberscene lint --fix` (2).
- **C.** The SDK package, the cut of exports and actions, the generated API page, the old names (3).
- **D.** `box` and one coordinate system (4).
- **E.** `style` for text (5).
- **F.** The naming rule (6).
- **G.** The trim (7).
- **H.** Keys as values and derived ids (8), and the words (9).

Stage 2, each needing its own decision: Audio into Clip; Motion and Three into Layer; Shape over Svg; the fate of
Mask, Nested and Gap; one counter and one text marker across the components, diagram parts and blocks; the remaining
meanings of `at`; `resolve.ts` split; coverage thresholds.
