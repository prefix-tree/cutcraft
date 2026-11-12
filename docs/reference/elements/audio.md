# `<Audio>`

A stretch of a sound asset: volume, fades, ducking under another track, automation.

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Talking-head cut](/recipes/talking-head)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } \| { until } |  |  |
| `src` | string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `speed` | number (0.1..20) | `1` |  |
| `reverse` | boolean | `false` |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |

Timed, audible, trims its source. Children: `keyframe`. [All elements](/reference/elements/)
