---
editLink: false
---

# `Counter`

A number that counts to its value, with a label.

<Example src="previews/components/counter" alt="Counter">

<<< @/../examples/showcase/components/counter.tsx

</Example>

## Props

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

[All components](/reference/components/)
