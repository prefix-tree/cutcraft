---
editLink: false
---

# `Callout`

A note in a box, with a line drawn to what it is about.

<Example src="previews/components/callout" alt="Callout">

<<< @/../examples/showcase/components/callout.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Props

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
| `size` | number (> 0) | `30` | The note's size in pixels; the box's height grows with it. |

[All components](/reference/components/)
