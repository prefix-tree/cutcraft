# `<Svg>`

One-off vector art from inline SVG markup or a file.

<Example src="previews/elements/svg" alt="<Svg>">

<<< @/../examples/showcase/docs/svg.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } \| { until } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `style` | string |  |  |
| `src` | string |  |  |
| `content` | string |  |  |
| `viewBox` | { minX, minY, width, height } |  |  |
| `preserveAspectRatio` | string |  |  |
| `color` | { mode, tint, opacity } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
