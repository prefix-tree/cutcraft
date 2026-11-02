# `<Graphic>`

A built-in graphic by `kind`: lower thirds, callouts, counters, progress and more.

<Example src="previews/elements/graphic" alt="<Graphic>">

<<< @/../examples/showcase/docs/graphic.tsx

</Example>

## Props

Plus the props of its `kind`: see [Graphics](/reference/graphics/).

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
| `width` | number |  |  |
| `height` | number |  |  |
| `kind` | "arrow" \| "curved-arrow" \| "hand-arrow" \| "callout" \| "speech-bubble" \| … 29 more |  | yes |

Timed, visual, transformable. Children: `effect`, `keyframe`, `mask`. [All elements](/reference/elements/)
