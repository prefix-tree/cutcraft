---
editLink: false
---

# `Arrow`

An arrow drawn from one point to another, straight or bowed.

<Example src="previews/components/arrow" alt="Arrow">

<<< @/../examples/showcase/components/arrow.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `from` | { x, y } |  | Where the line starts, in pixels from the frame's centre. |
| `to` | { x, y } |  | Where the head points, in pixels from the frame's centre. |
| `curve` | number | `0` | How far the line bows to its left, in pixels; 0 is straight. |
| `color` | string | `"$accent"` | The colour of the line and its head. |
| `width` | number (> 0) | `6` | The line's thickness in pixels; the head scales with it. |

[All components](/reference/components/)
