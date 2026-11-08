# 0024. Graphic kinds become components; icon stickers are removed

> Supersedes [0020](./0020-graphic-is-deprecated-for-free-code.md). Follows from
> [0018](./0018-free-code-in-a-timeline-skeleton.md).

## Context

0020 deprecated `<Graphic kind>`: 34 kinds drawn by code in `@cutcraft/graphics` and the player, a second, narrower
way to do what free code does. It left the kinds in place until a later release, with nothing to move to but free
code, which is more than a lower third needs.

Meanwhile the resolver already expanded any pure function that returns timeline elements (a helper), and a helper's
output resolves, is timed by words, is styled by the theme and is seen by the layout check like elements written by
hand. A lower third is a card, a bar and two titles; nothing about it needs the engine.

`<Sticker src="icon:…">` drew Lucide icons through the `icon` kind. It imported all of Lucide's namespace, so every
host carried about 0.7 MB of icon data, the docs playground included, through both the kit and the player.

## Decision

- **Components, not kinds.** `LowerThird`, `Callout`, `Badge`, `Counter`, `ProgressBar`, `Arrow`, `Highlight` and
  `Background` are ordinary functions in `@cutcraft/kit` that return the kit's own elements (titles, shapes, SVG, and a
  `<Layer>` for the counter's number). Their parts get ids from their own (`lt-name`), take the component's timing,
  and default to theme tokens. `COMPONENTS` lists them with zod props schemas for the docs and the playground. The
  source index records their call sites, so editing a part writes that use into the file as plain elements, imports
  included (the existing bake).
- **`<Graphic>` is removed**, with its kinds, the `graphic/*` actions, the `graphic-props` and `deprecated-graphic`
  lint rules and `graphicControls`. A file that still uses it gets an error naming the components and free code.
- **Stickers are images.** `<Sticker src>` takes an image asset; `icon:` stickers are removed and Lucide with them.
  An icon is an `<Svg>` (paste its markup) or an image asset.
- **`@cutcraft/graphics` keeps its name** and holds only the free-code libraries (`installFreeCodeLibraries`,
  `@cutcraft/graphics/three` and `/motion`). The kit no longer depends on it, which also removes a dependency cycle.
- The kinds without a component (waves and blobs backgrounds, confetti, sparkles, frames, steps, unit grid,
  comparison, sample size, countdown, divider, burst) are not carried over. Each can become a component later, built
  the same way, or a recipe in free code.

## Consequences

- One engine path draws everything: there is no graphics renderer in the player or the export.
- Migration: `kind="lower-third"` becomes `<LowerThird>`, `callout` and `speech-bubble` become `<Callout>`, `badge`
  and `pill` become `<Badge>`, `counter` becomes `<Counter>`, `progress-bar` becomes `<ProgressBar>`, the arrows
  become `<Arrow>`, the highlights become `<Highlight>`, and the gradient, dots and grid backgrounds become
  `<Background>`. The props differ; the reference lists each component's.
- Every bundle drops Lucide; the docs playground's chunk loses about 0.7 MB.
- The export now waits for pending fonts and for an overlay's image or SVG file before it captures a frame, which the
  components' and stickers' demos showed it needed.
