# `<Layer>`

Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time.

<Example src="previews/elements/layer" alt="<Layer>">

<<< @/../examples/showcase/docs/layer.tsx

</Example>

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
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |

Timed, visual, transformable. Children: `keyframe`. [All elements](/reference/elements/)
