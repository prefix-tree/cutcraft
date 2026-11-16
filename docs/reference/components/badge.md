---
editLink: false
---

# `Badge`

A short word on a pill that pops in.

<Example src="previews/components/badge" alt="Badge">

<<< @/../examples/showcase/components/badge.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Props

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

[All components](/reference/components/)
