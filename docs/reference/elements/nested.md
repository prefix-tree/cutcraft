# `<Nested>`

A sequence written once as a component and placed like a clip.

<Example src="previews/elements/nested" alt="<Nested>">

<<< @/../examples/showcase/docs/nested.tsx

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
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `of` | any \| string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `volume` | number (0..4) | `1` |  |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `colorGrade`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](/reference/elements/)
