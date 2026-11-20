---
editLink: false
---

# `Callout`

A note in a box, with a line drawn to what it is about.

<Example src="previews/components/callout" alt="Callout">

<<< @/../examples/showcase/components/callout.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The note, in the body face; the box grows taller to fit it. |
| `box` | { x, y } | `{"x":1280,"y":320}` | Where the box's centre sits, in pixels from the frame's top left. Left out: `{ x: 1280, y: 320 }`, on a 1920 by 1080 frame. |
| `width` | number (> 0) | `420` | The box's width in pixels. |
| `to` | { x, y } |  | What it points at; without it, the box stands alone. |
| `color` | string | `"$accent"` | The colour of the box's border, the line and its dot. |
| `size` | number (> 0) | `30` | The note's size in pixels; the box's height grows with it. |

[All components](/reference/components/)
