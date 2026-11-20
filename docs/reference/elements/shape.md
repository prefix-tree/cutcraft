---
editLink: false
---

# `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

<Example src="previews/elements/shape" alt="<Shape>">

<<< @/../examples/showcase/docs/shape.tsx

</Example>

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](/reference/rendering)). |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for shapes. |
| `shape` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| … 4 more |  | yes | Which shape it draws. |
| `width` | number (> 0) |  |  | The shape's box, in pixels; left out, 200. |
| `height` | number (> 0) |  |  | The shape's box height, in pixels; left out, 200. |
| `points` | { x, y }[] |  |  | A polygon's or path's corners, as fractions of the box from its top left. |
| `fill` | string \| { type, color, gradient, opacity } |  |  | A colour, or `{ type, color, gradient, opacity }` for a gradient or no fill. |
| `stroke` | { color, width, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  | The outline: colour, width in pixels, opacity, dashes, caps and joins. |
| `shadow` | { color, blur, x, y, spread, inset } |  |  | A drop shadow: colour, blur and offset in pixels. |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  | Several shadows, drawn in order, for layered or inner shadows. |
| `cornerRadius` | number (0..∞) \| string |  |  | A rectangle's rounded corners, in pixels or a theme token such as `$radius`. |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  | A rectangle's corners rounded one by one, in pixels. |
| `starPoints` | integer (3..∞) |  |  | How many points a star has; left out, 5. |
| `innerRadius` | number (0..1) |  |  | A star's inner corners, as a fraction of its outer radius; left out, 0.5. |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
