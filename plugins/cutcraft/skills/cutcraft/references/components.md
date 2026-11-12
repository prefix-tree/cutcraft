# Components

The ready-made components, imported from `@cutcraft/kit`. Positions are pixels from the frame's centre; colours default to theme tokens; each takes the timing props any element takes. Generated from the code by `scripts/gen-docs.ts`; do not edit.

## `LowerThird`

A name and a role in the lower third, on a card or beside an accent bar.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `name` | string |  |
| `role` | string |  |
| `variant` | "card" \| "bar" | `"card"` |
| `x` | number | `-560` |
| `y` | number | `330` |
| `width` | number | `640` |
| `accent` | string | `"$primary"` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Callout`

A note in a box, with a line drawn to what it is about.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `text` | string |  |
| `x` | number | `320` |
| `y` | number | `-220` |
| `width` | number | `420` |
| `to` | { x, y } |  |
| `color` | string | `"$accent"` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Badge`

A short word on a pill that pops in.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `text` | string |  |
| `x` | number | `0` |
| `y` | number | `0` |
| `size` | number | `30` |
| `color` | string | `"$accent"` |
| `textColor` | string | `"$background"` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Counter`

A number that counts to its value, with a label.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `from` | number | `0` |
| `to` | number |  |
| `decimals` | integer (0..4) | `0` |
| `prefix` | string | `""` |
| `suffix` | string | `""` |
| `label` | string |  |
| `x` | number | `0` |
| `y` | number | `0` |
| `size` | number | `140` |
| `countFor` | number | `1.5` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `ProgressBar`

A bar that fills from the left to its value.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `value` | number (0..1) | `1` |
| `x` | number | `0` |
| `y` | number | `440` |
| `width` | number | `1200` |
| `height` | number | `14` |
| `color` | string | `"$primary"` |
| `fillFor` | number | `1.2` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Arrow`

An arrow drawn from one point to another, straight or bowed.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `from` | { x, y } |  |
| `to` | { x, y } |  |
| `curve` | number | `0` |
| `color` | string | `"$accent"` |
| `width` | number | `6` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Highlight`

A hand-drawn underline, marker stroke, circle or strike on something in the frame.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `variant` | "underline" \| "marker" \| "circle" \| "strike" | `"underline"` |
| `x` | number | `0` |
| `y` | number | `0` |
| `width` | number |  |
| `height` | number |  |
| `color` | string | `"$accent"` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Background`

A full-frame gradient, dots or grid to put beneath everything.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `variant` | "gradient" \| "dots" \| "grid" | `"gradient"` |
| `width` | number | `1920` |
| `height` | number | `1080` |
| `colors` | [string, string] | `["$background","$primary"]` |
| `spacing` | number | `48` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `TypeCard`

A card of big type that builds line by line, with pills and struck-out lines.

### Props

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

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `QuoteCard`

A passage on a paper card with its source, and a marker over the phrases that matter.

### Props

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

[All components](https://cutcraft.prefixtree.xyz/reference/components/)

## `Frame`

A rounded border around part of the picture.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default |
|---|---|---|
| `id` | string |  |
| `x` | number | `0` |
| `y` | number | `0` |
| `width` | number |  |
| `height` | number |  |
| `color` | string | `"$accent"` |
| `thickness` | number | `8` |
| `cornerRadius` | number (0..∞) | `28` |

[All components](https://cutcraft.prefixtree.xyz/reference/components/)
