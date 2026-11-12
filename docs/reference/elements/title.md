# `<Title>`

Text over the picture in the theme's type, with entrances by letter, word or line.

<Example src="previews/elements/title" alt="<Title>">

<<< @/../examples/showcase/docs/title.tsx

</Example>

**Used in:** [An edit](/examples#an-edit) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

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
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `font` | string | `"Inter"` |  |
| `size` | number (1..1000) | `48` |  |
| `weight` | integer (100..900) \| "normal" \| "bold" | `"bold"` |  |
| `italic` | boolean | `false` |  |
| `color` | string | `"#ffffff"` |  |
| `background` | string |  |  |
| `stroke` | { color, width } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` |  |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` |  |
| `width` | number |  |  |
| `height` | number |  |  |
| `lineHeight` | number (0.1..10) | `1.2` |  |
| `letterSpacing` | number (-100..100) | `0` |  |
| `decoration` | "none" \| "underline" \| "line-through" \| "overline" |  |  |
| `animation` | { preset, in, out, stagger, unit, params } |  |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
