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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)

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

[All components](https://prefix-tree.github.io/cutcraft/reference/components/)
