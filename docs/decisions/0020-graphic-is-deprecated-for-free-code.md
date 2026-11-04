# 0020. `<Graphic>` is deprecated for free code

> Supersedes [0017](./0017-graphics-are-svg-generators.md). Follows from
> [0018](./0018-free-code-in-a-timeline-skeleton.md) and [0019](./0019-a-browser-engine-for-free-code.md).

## Context

0017 made graphics a catalog: 34 kinds (arrows, callouts, lower thirds, counters, backgrounds, confetti…), each a pure
function from props and the theme to SVG, so the Node export could draw them and the inspector could edit their props.
Then 0018 let a `<Layer>` hold any React, `<Three>` and `<Motion>` brought three.js and Motion onto the video's clock,
and 0019 made the export draw them. A model writes a lower third or a chart in a few lines of Motion or SVG as well as
it picks a kind, and is not limited to the 34 we thought of. The catalog had become a second, narrower way to do what
free code does, with its own schemas, editor controls, previews and docs to keep up.

## Decision

- `<Graphic>` and its kinds are **deprecated**: a new lint rule, `deprecated-graphic`, warns on each one and names
  `<Motion>`, `<Three>` and `<Layer>`; `Graphic`, `GRAPHIC_KINDS` and `graphicControls` are marked `@deprecated`; every
  page about them says so.
- **Examples lead with free code.** The showcase (a product launch, kinetic type, a data story, a logo reveal), the
  brand-spot recipe and the authoring prompt draw with `<Motion>`, `<Three>` and `<Layer>`, reading colours and fonts
  from the theme (`THEMES[theme]`).
- **Removal is a later release**, with its own changeset: the kinds, their schemas and lint rule, the player and
  export code that draws them, their docs pages and previews.

## Consequences

- Files that use `<Graphic>` keep working and keep their checks (`graphic-props`), with one warning per element.
- Free code's animation is the file's own: a `<Motion>` does not take the theme's entrance style the way a kind did.
  The brand-spot recipe's theme test now checks that the drawn parts follow the theme's palette instead.
- The inspector loses per-kind controls; a `<Motion>` or `<Layer>` is edited as code, with props for its numbers and
  text where a file wants them editable.

## Alternatives

Keeping the catalog alongside free code: two ways to draw the same thing, and a catalog that grows only when we add
to it. Rewriting the kinds as `<Motion>` components shipped by the library: the same catalog in a different form.
