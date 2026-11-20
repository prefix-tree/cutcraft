---
editLink: false
---

# `QuoteCard`

A passage on a paper card with its source, and a marker over the phrases that matter.

<Example src="previews/components/quote-card" alt="QuoteCard">

<<< @/../examples/showcase/components/quote-card.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `box` | { x, y } | `{}` | Where the card's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `width` | number (> 0) | `860` | The card's width in pixels; the passage wraps inside it. |
| `source` | string |  | Where the words come from, in small type above them. |
| `text` | string |  | The passage; its line breaks are kept. |
| `size` | number (> 0) | `40` | Letter height in pixels; the padding and corners scale with it. |
| `fill` | string | `"#ffffff"` | The paper's colour. |
| `color` | string | `"#16161a"` | The words' colour. |
| `accent` | string | `"$accent"` | The marker's colour, for highlights that do not name their own. |
| `highlights` | { text, color, at, offset }[] | `[]` | The phrases to mark, each at its own cue; each must appear in `text` as written. |

[All components](/reference/components/)
