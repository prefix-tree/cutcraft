# `QuoteCard`

A passage on a paper card with its source, and a marker over the phrases that matter.

<Example src="previews/components/quote-card" alt="QuoteCard">

<<< @/../examples/showcase/components/quote-card.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `x` | number | `0` |
| `y` | number | `0` |
| `width` | number | `860` |
| `source` | string |  |
| `text` | string |  |
| `size` | number | `40` |
| `fill` | string | `"#ffffff"` |
| `color` | string | `"#16161a"` |
| `accent` | string | `"$accent"` |
| `highlights` | { text, color, at, offset }[] | `[]` |

[All components](/reference/components/)
