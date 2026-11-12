# `TypeCard`

A card of big type that builds line by line, with pills and struck-out lines.

<Example src="previews/components/type-card" alt="TypeCard">

<<< @/../examples/showcase/components/type-card.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `x` | number | `0` |
| `y` | number | `0` |
| `width` | number |  |
| `height` | number |  |
| `fill` | string | `"$surface"` |
| `cornerRadius` | number (0..∞) | `0` |
| `size` | number | `120` |
| `align` | "left" \| "center" | `"center"` |
| `lines` | { text, size, tone, pill, color, at, offset, struck }[] |  |

[All components](/reference/components/)
