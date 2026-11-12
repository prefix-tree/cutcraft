# `<Adjustment>`

Filters everything beneath it for its own stretch of time.

<Example src="previews/elements/adjustment" alt="<Adjustment>">

<<< @/../examples/showcase/docs/adjustment.tsx

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
| `opacity` | number (0..1) | `1` |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more | `"normal"` |  |
| `enabled` | boolean | `true` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |

Timed, visual, trims its source. Children: `effect`, `keyframe`. [All elements](/reference/elements/)
