---
editLink: false
---

# `Background`

A full-frame gradient, dots or grid to put beneath everything.

<Example src="previews/components/background" alt="Background">

<<< @/../examples/showcase/components/background.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `variant` | "gradient" \| "dots" \| "grid" | `"gradient"` | `gradient` from one colour to the other, `dots` or `grid` in the second colour over the first. |
| `width` | number (> 0) | `1920` | The frame's size: a background covers it. |
| `height` | number (> 0) | `1080` | The frame's height in pixels. |
| `colors` | [string, string] | `["$background","$primary"]` | The base colour and a second: the gradient's two ends, or the dots or grid drawn over the base. |
| `spacing` | number (> 0) | `48` | The dots' or the grid's spacing, in pixels. |

[All components](/reference/components/)
