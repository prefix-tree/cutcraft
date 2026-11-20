---
editLink: false
---

# `Badge`

A short word on a pill that pops in.

<Example src="previews/components/badge" alt="Badge">

<<< @/../examples/showcase/components/badge.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `text` | string |  | The word on the pill; the pill widens to fit it. |
| `box` | { x, y } | `{}` | Where the pill's centre sits, in pixels from the frame's top left. Left out: centred on the frame. |
| `size` | number (> 0) | `30` | Letter height in pixels; the pill scales with it. |
| `color` | string | `"$accent"` | The pill's colour. |
| `textColor` | string | `"$background"` | The letters' colour. |

[All components](/reference/components/)
