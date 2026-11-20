---
editLink: false
---

# `Highlight`

A hand-drawn underline, marker stroke, circle or strike on something in the frame.

<Example src="previews/components/highlight" alt="Highlight">

<<< @/../examples/showcase/components/highlight.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `variant` | "underline" \| "marker" \| "circle" \| "strike" | `"underline"` | `underline` under it, `marker` behind it, `circle` round it, `strike` through it. |
| `box` | { x, y } | `{}` | Where the marked box's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `width` | number (> 0) |  | The marked box's width in pixels. |
| `height` | number (> 0) |  | The marked box's height in pixels; a marker stroke is about as thick. |
| `color` | string | `"$accent"` | The mark's colour; a marker stroke is drawn see-through. |

[All components](/reference/components/)
