---
editLink: false
---

# `<Gap>`

Empty time between clips on a sequence track.

<Example src="previews/elements/gap" alt="<Gap>">

<<< @/../examples/showcase/docs/gap.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The gap's name. |
| `duration` | number (> 0) |  | yes | Seconds of empty time before the next element on the track. |

Timed. No children. [All elements](/reference/elements/)
