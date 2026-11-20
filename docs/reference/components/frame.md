---
editLink: false
---

# `Frame`

A rounded border around part of the picture.

<Example src="previews/components/frame" alt="Frame">

<<< @/../examples/showcase/components/frame.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The id of the element it draws. |
| `box` | { x, y } | `{}` | Where the border's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `width` | number (> 0) |  | The border's width in pixels. |
| `height` | number (> 0) |  | The border's height in pixels. |
| `color` | string | `"$accent"` | The border's colour. |
| `thickness` | number (> 0) | `8` | The border's line thickness in pixels. |
| `cornerRadius` | number (0..∞) | `28` | How round the corners are, in pixels. |

[All components](/reference/components/)
