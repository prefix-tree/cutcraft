# Components

The ready-made components, imported from `@uberscene/kit`. A component's `box` is its centre in pixels from the frame's top left; colours default to theme tokens; each takes the timing props any element takes. Generated from the code by `scripts/gen-docs.ts`; do not edit.

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
| `box` | { x, y } | `{"x":400,"y":870}` | Where the card's centre sits, in pixels from the frame's top left. Left out: `{ x: 400, y: 870 }`, set for a 1920 by 1080 frame (give it a box on another size). |
| `width` | number (> 0) | `640` | The card's width in pixels; the words wrap inside it. |
| `accent` | string | `"$primary"` | The colour of the bar beside the words. |
| `size` | number (> 0) | `44` | The name's size in pixels; the role, the card and the bar scale with it. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Callout`

A note in a box, with a line drawn to what it is about.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The note, in the body face; the box grows taller to fit it. |
| `box` | { x, y } | `{"x":1280,"y":320}` | Where the box's centre sits, in pixels from the frame's top left. Left out: `{ x: 1280, y: 320 }`, set for a 1920 by 1080 frame (give it a box on another size). |
| `width` | number (> 0) | `420` | The box's width in pixels. |
| `to` | { x, y } |  | What it points at; without it, the box stands alone. |
| `color` | string | `"$accent"` | The colour of the box's border, the line and its dot. |
| `size` | number (> 0) | `30` | The note's size in pixels; the box's height grows with it. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `Badge`

A short word on a pill that pops in.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The word on the pill; the pill widens to fit it. |
| `box` | { x, y } | `{}` | Where the pill's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
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
| `box` | { x, y } | `{}` | Where the number's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `size` | number (> 0) | `140` | The number's letter height in pixels; the label is about a fifth of it. |
| `countFor` | number (> 0) | `1.5` | Seconds the count takes; it then holds. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)

## `TypeCard`

A card of big type that builds line by line, with pills and struck-out lines.

### Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `box` | { x, y } | `{}` | Where the card's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `width` | number (> 0) |  | The card's width in pixels; the whole frame when left out. |
| `height` | number (> 0) |  | The card's height in pixels. Left out, like `width`: the whole frame. |
| `fill` | string | `"$surface"` | The card's background colour. |
| `cornerRadius` | number (0..∞) | `0` | How round the card's corners are, in pixels. |
| `size` | number (> 0) | `120` | Letter height in pixels, for the lines that do not set their own. |
| `align` | "left" \| "center" | `"center"` | The lines sit centred, or flush left. |
| `lines` | { text, size, tone, pill, color, at, offset, struck }[] |  | The lines, top to bottom; each comes in at its own cue. |

[All components](https://uberscene.prefixtree.xyz/reference/components/)
