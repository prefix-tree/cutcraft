# `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

<Example src="previews/elements/shape" alt="<Shape>">

<<< @/../examples/showcase/docs/shape.tsx

</Example>

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `shape` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| … 4 more |  | yes |
| `width` | number |  |  |
| `height` | number |  |  |
| `points` | { x, y }[] |  |  |
| `fill` | string \| { type, color, gradient, opacity } |  |  |
| `stroke` | { color, width, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  |
| `cornerRadius` | number (0..∞) \| string |  |  |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  |
| `starPoints` | integer (3..∞) |  |  |
| `innerRadius` | number (0..1) |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
