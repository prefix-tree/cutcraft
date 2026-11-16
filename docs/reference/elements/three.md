---
editLink: false
---

# `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

<Example src="previews/elements/three" alt="<Three>">

<<< @/../examples/showcase/docs/three.tsx

</Example>

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](/guide/exporting)).

**Used in:** [Product launch](/examples/launch) · [Logo reveal](/examples/logo) · [Brand spot in any theme](/recipes/brand-spot)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Moves, scales, turns and fades the whole layer, as on any element; the editor's handles write it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. |
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  | The camera: `position` and `lookAt` as `[x, y, z]`, `fov` in degrees, clipping planes, zoom, or orthographic. |
| `background` | string |  |  | The scene's background colour; left out, transparent over what is beneath. |
| `setup` | any |  |  | Builds the scene once from `{ scene, camera, renderer, THREE, width, height }`, and may return `update(frame)` for every frame. |

Timed, visual, transformable. Children: `effect`, `keyframe`. [All elements](/reference/elements/)
