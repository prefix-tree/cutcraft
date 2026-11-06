# `<Motion>`

Children animated by a Motion `sequence` on the video's clock.

<Example src="previews/elements/motion" alt="<Motion>">

<<< @/../examples/showcase/docs/motion.tsx

</Example>

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](/guide/exporting)).

**Used in:** [Product launch](/examples#a-product-launch) · [Kinetic type](/examples#kinetic-type) · [Data story](/examples#a-data-story) · [Logo reveal](/examples#a-logo-reveal) · [An edit](/examples#an-edit) · [Brand spot in any theme](/recipes/brand-spot)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `sequence` | [string, object] \| [string, object, object][] | `[]` |  |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](/reference/elements/)
