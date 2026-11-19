---
editLink: false
---

# `<Freeze>`

Holds one frame of its clip for a while, then plays on.

<Example src="previews/elements/freeze" alt="<Freeze>">

<<< @/../examples/showcase/docs/freeze.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The freeze's name. |
| `at` | number (0..∞) |  | yes | Source time of the frozen frame. |
| `start` | number (0..∞) |  | yes | Element-relative start of the hold. |
| `duration` | number (> 0) |  | yes | Seconds the frame is held before the clip plays on. |

No children. [All elements](/reference/elements/)
