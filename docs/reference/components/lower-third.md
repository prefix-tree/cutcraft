---
editLink: false
---

# `LowerThird`

A name and a role in the lower third, on a card or beside an accent bar.

<Example src="previews/components/lower-third" alt="LowerThird">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `name` | string |  | The name, in the heading face. |
| `role` | string |  | The line under the name, in the body face. Left out: a shorter card with the name alone. |
| `type` | "card" \| "bar" | `"card"` | `card`: on a surface card; `bar`: the words beside an accent bar, straight over the picture. |
| `box` | { x, y } | `{"x":400,"y":870}` | Where the card's centre sits, in pixels from the frame's top left. Left out: `{ x: 400, y: 870 }`, set for a 1920 by 1080 frame (give it a box on another size). |
| `width` | number (> 0) | `640` | The card's width in pixels; the words wrap inside it. |
| `accent` | string | `"$primary"` | The colour of the bar beside the words. |
| `size` | number (> 0) | `44` | The name's size in pixels; the role, the card and the bar scale with it. |

[All components](/reference/components/)
