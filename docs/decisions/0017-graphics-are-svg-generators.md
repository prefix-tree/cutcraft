# 0017. Graphics are SVG generators

## Context

A designed video needs more than titles and plain shapes: arrows that point
at things, callouts, lower thirds, frames around a region, highlights under a
word, progress and countdowns, backgrounds, a burst of confetti, icons. Design
tools ship these as a library of elements with a few settings each. The model
could write each one as SVG by hand, but it would write a different arrow
every time, none of them themed, and long markup costs it tokens and mistakes.

Three shapes were possible: assets (SVG files in a pack), React components
rendered by the overlay plane like a Layer, or functions that produce markup.

- Asset packs are static: they cannot take a theme, a text or a time, and
  every variation is another file.
- React components would bring the full Layer path: Satori in the export, the
  DOM in the preview, layout by flexbox. Vector art through Satori goes via an
  image round trip, and a component can do anything, which the editor cannot
  inspect or the lint check.
- Functions from props to SVG keep to the path shapes and SVG already take
  (0015's one renderer): the same string is drawn by the browser and by skia.

## Decision

- **`@cutcut/graphics` holds the kinds.** Each kind is a zod shape for its own
  props and a pure function `(props, { width, height, t, duration, seed,
  value }) → { svg, labels }`. It has no DOM and no React; it depends on zod
  and on Lucide's icon data (ISC).
- **One element, `<Graphic kind>`.** The kit's schema is a discriminated union
  over the kinds, so JSX props are typed per kind and the resolver validates
  them like any element's. Every graphic also takes the shared props: timing,
  `transform`, `enter`/`exit`, `style`, and `width`/`height` for its box. No
  kind may reuse those names (a test checks).
- **Art is SVG, text is labels.** Skia's SVG text ignores letter spacing,
  weights and baselines, and aborts on an unknown font, so kinds never emit
  `<text>`. They return labels (box, text, font, size, colour, alignment) that
  the preview lays out as DOM text and the export lays out with Satori, the
  way both lay out titles. The export draws art and labels into one picture
  before placing it, so a fade treats them as one.
- **Defaults are theme tokens.** Colours and fonts default to `$primary`,
  `$surface`, `$heading` and so on, so a graphic follows the theme unless the
  file says otherwise, and the theme's `graphic` presets apply through `style`.
- **Time is an input.** Animated kinds (progress, countdown, confetti,
  sparkles, drifting backgrounds, the marker sweep) are drawn from `t`, so
  scrubbing, the preview and the export agree frame for frame. Scattering
  kinds seed from the element's id, so a graphic looks the same every time.
- **The catalog is rendered by the export.** `pnpm docs:graphics` draws every
  kind's example through `OverlayPlane` into the graphics reference and a
  contact sheet, so the pictures are what an export produces.

## Consequences

- Adding a kind is one function and one registry entry; the element, the
  types, the lint, the reference page and the thumbnail follow.
- The model writes `<Graphic kind="callout" text="New" />` instead of markup,
  and model-written `<Svg>` stays for one-off art.
- Graphics cannot hold arbitrary components; a Layer remains the escape hatch.
- Text boxes are sized by an estimate before layout (generous, so text does
  not wrap); `width` and `height` override it.
