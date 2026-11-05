# `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

<Example src="previews/elements/three" alt="<Three>">

<<< @/../examples/showcase/docs/three.tsx

</Example>

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](/guide/exporting)).

**Used in:** [Product launch](/examples#a-product-launch) · [Logo reveal](/examples#a-logo-reveal) · [Brand spot in any theme](/recipes/brand-spot)

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
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  |
| `background` | string |  |  |
| `setup` | any |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](/reference/elements/)
