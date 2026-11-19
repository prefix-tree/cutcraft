# Components

The ready-made components, imported from `@uberscene/kit`. Positions are pixels from the frame's centre; colours default to theme tokens; each takes the timing props any element takes. Generated from the code by `scripts/gen-docs.ts`; do not edit.

## `LowerThird`

A name and a role in the lower third, on a card or beside an accent bar.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `name` | string |  | The name, in the heading face. |
| `role` | string |  | The line under the name, in the body face. Left out: a shorter card with the name alone. |
| `variant` | "card" \| "bar" | `"card"` | `card`: on a surface card; `bar`: the words beside an accent bar, straight over the picture. |
| `x` | number | `-560` | The card's centre, in pixels from the frame's centre. |
| `y` | number | `330` | The card's centre, in pixels below the frame's centre. |
| `width` | number (> 0) | `640` | The card's width in pixels; the words wrap inside it. |
| `accent` | string | `"$primary"` | The colour of the bar beside the words. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Callout`

A note in a box, with a line drawn to what it is about.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The note, in the body face; the box grows taller to fit it. |
| `x` | number | `320` | The box's centre, in pixels from the frame's centre. |
| `y` | number | `-220` | The box's centre, in pixels below the frame's centre. |
| `width` | number (> 0) | `420` | The box's width in pixels. |
| `to` | { x, y } |  | What it points at; without it, the box stands alone. |
| `color` | string | `"$accent"` | The colour of the box's border, the line and its dot. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Badge`

A short word on a pill that pops in.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The word on the pill; the pill widens to fit it. |
| `x` | number | `0` | The pill's centre, in pixels from the frame's centre. |
| `y` | number | `0` | The pill's centre, in pixels below the frame's centre. |
| `size` | number (> 0) | `30` | Letter height in pixels; the pill scales with it. |
| `color` | string | `"$accent"` | The pill's colour. |
| `textColor` | string | `"$background"` | The letters' colour. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Counter`

A number that counts to its value, with a label.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `from` | number | `0` | The number it counts from. |
| `to` | number |  | The number it counts to and then holds. |
| `decimals` | integer (0..4) | `0` | How many digits show after the decimal point. |
| `prefix` | string | `""` | Text before the number, such as `$`. |
| `suffix` | string | `""` | Text after the number, such as `%`. |
| `label` | string |  | A line under the number, in the body face and the muted colour. Left out: the number alone. |
| `x` | number | `0` | The number's centre, in pixels from the frame's centre. |
| `y` | number | `0` | The number's centre, in pixels below the frame's centre. |
| `size` | number (> 0) | `140` | The number's letter height in pixels; the label is about a fifth of it. |
| `countFor` | number (> 0) | `1.5` | Seconds the count takes; it then holds. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `ProgressBar`

A bar that fills from the left to its value.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `value` | number (0..1) | `1` | How full it ends, 0 to 1. |
| `x` | number | `0` | The bar's centre, in pixels from the frame's centre. |
| `y` | number | `440` | The bar's centre, in pixels below the frame's centre. |
| `width` | number (> 0) | `1200` | The full bar's length in pixels. |
| `height` | number (> 0) | `14` | The bar's thickness in pixels; its ends are rounded. |
| `color` | string | `"$primary"` | The fill's colour; the track under it is a faint `$muted`. |
| `fillFor` | number (> 0) | `1.2` | Seconds it takes to fill. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Arrow`

An arrow drawn from one point to another, straight or bowed.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `from` | { x, y } |  | Where the line starts, in pixels from the frame's centre. |
| `to` | { x, y } |  | Where the head points, in pixels from the frame's centre. |
| `curve` | number | `0` | How far the line bows to its left, in pixels; 0 is straight. |
| `color` | string | `"$accent"` | The colour of the line and its head. |
| `width` | number (> 0) | `6` | The line's thickness in pixels; the head scales with it. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Highlight`

A hand-drawn underline, marker stroke, circle or strike on something in the frame.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `variant` | "underline" \| "marker" \| "circle" \| "strike" | `"underline"` | `underline` under it, `marker` behind it, `circle` round it, `strike` through it. |
| `x` | number | `0` | What it marks: a box's centre and size, in pixels from the frame's centre. |
| `y` | number | `0` | The marked box's centre, in pixels below the frame's centre. |
| `width` | number (> 0) |  | The marked box's width in pixels. |
| `height` | number (> 0) |  | The marked box's height in pixels; a marker stroke is about as thick. |
| `color` | string | `"$accent"` | The mark's colour; a marker stroke is drawn see-through. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Background`

A full-frame gradient, dots or grid to put beneath everything.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `variant` | "gradient" \| "dots" \| "grid" | `"gradient"` | `gradient` from one colour to the other, `dots` or `grid` in the second colour over the first. |
| `width` | number (> 0) | `1920` | The frame's size: a background covers it. |
| `height` | number (> 0) | `1080` | The frame's height in pixels. |
| `colors` | [string, string] | `["$background","$primary"]` | The base colour and a second: the gradient's two ends, or the dots or grid drawn over the base. |
| `spacing` | number (> 0) | `48` | The dots' or the grid's spacing, in pixels. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `TypeCard`

A card of big type that builds line by line, with pills and struck-out lines.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `x` | number | `0` | The card's centre, in pixels from the frame's centre. |
| `y` | number | `0` | The card's centre, in pixels below the frame's centre. |
| `width` | number (> 0) |  | The card's width in pixels; the whole frame when left out. |
| `height` | number (> 0) |  | The card's height in pixels. Left out, like `width`: the whole frame. |
| `fill` | string | `"$surface"` | The card's background colour. |
| `cornerRadius` | number (0..∞) | `0` | How round the card's corners are, in pixels. |
| `size` | number (> 0) | `120` | Letter height in pixels, for the lines that do not set their own. |
| `align` | "left" \| "center" | `"center"` | The lines sit centred, or flush left. |
| `lines` | { text, size, tone, pill, color, at, offset, struck }[] |  | The lines, top to bottom; each comes in at its own cue. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `QuoteCard`

A passage on a paper card with its source, and a marker over the phrases that matter.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `x` | number | `0` | The card's centre, in pixels from the frame's centre. |
| `y` | number | `0` | The card's centre, in pixels below the frame's centre. |
| `width` | number (> 0) | `860` | The card's width in pixels; the passage wraps inside it. |
| `source` | string |  | Where the words come from, in small type above them. |
| `text` | string |  | The passage; its line breaks are kept. |
| `size` | number (> 0) | `40` | Letter height in pixels; the padding and corners scale with it. |
| `fill` | string | `"#ffffff"` | The paper's colour. |
| `color` | string | `"#16161a"` | The words' colour. |
| `accent` | string | `"$accent"` | The marker's colour, for highlights that do not name their own. |
| `highlights` | { text, color, at, offset }[] | `[]` | The phrases to mark, each at its own cue; each must appear in `text` as written. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Frame`

A rounded border around part of the picture.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `x` | number | `0` | The frame's centre from the frame's centre, and its size, in pixels. |
| `y` | number | `0` | The border's centre, in pixels below the frame's centre. |
| `width` | number (> 0) |  | The border's width in pixels. |
| `height` | number (> 0) |  | The border's height in pixels. |
| `color` | string | `"$accent"` | The border's colour. |
| `thickness` | number (> 0) | `8` | The border's line thickness in pixels. |
| `cornerRadius` | number (0..∞) | `28` | How round the corners are, in pixels. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)
