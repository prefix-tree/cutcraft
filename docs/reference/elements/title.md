# `<Title>`

Text over the picture in the theme's type, with entrances by letter, word or line.

<Example src="previews/elements/title" alt="<Title>">

<<< @/../examples/showcase/docs/title.tsx

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
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| … 21 more \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `style` | string |  |  |
| `font` | string | `"Inter"` |  |
| `size` | number (1..1000) | `48` |  |
| `weight` | integer \| "normal" \| "bold" | `"bold"` |  |
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
| `text3d` | { enabled, depth, bevelThickness, bevelSize, bevelSegments, frontColor, sideColor, metalness, roughness, material } |  |  |
| `behindSubject` | boolean | `false` |  |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
