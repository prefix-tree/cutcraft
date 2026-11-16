---
editLink: false
---

# `Frame`

A rounded border around part of the picture.

<Example src="previews/components/frame" alt="Frame">

<<< @/../examples/showcase/components/frame.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Props

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

[All components](/reference/components/)
