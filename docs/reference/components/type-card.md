---
editLink: false
---

# `TypeCard`

A card of big type that builds line by line, with pills and struck-out lines.

<Example src="previews/components/type-card" alt="TypeCard">

<<< @/../examples/showcase/components/type-card.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `box` | { x, y } | `{"x":960,"y":540}` | Where the card's centre sits, in pixels from the frame's top left. Left out: `{ x: 960, y: 540 }`, on a 1920 by 1080 frame. |
| `width` | number (> 0) |  | The card's width in pixels; the whole frame when left out. |
| `height` | number (> 0) |  | The card's height in pixels. Left out, like `width`: the whole frame. |
| `fill` | string | `"$surface"` | The card's background colour. |
| `cornerRadius` | number (0..∞) | `0` | How round the card's corners are, in pixels. |
| `size` | number (> 0) | `120` | Letter height in pixels, for the lines that do not set their own. |
| `align` | "left" \| "center" | `"center"` | The lines sit centred, or flush left. |
| `lines` | { text, size, tone, pill, color, at, offset, struck }[] |  | The lines, top to bottom; each comes in at its own cue. |

[All components](/reference/components/)
