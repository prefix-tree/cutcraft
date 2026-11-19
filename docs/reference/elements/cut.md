---
editLink: false
---

# `<Cut>`

Switches a `<Multicam>` to an angle at a moment.

<Example src="previews/elements/multicam" alt="<Cut>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Multicam highlights](/recipes/highlights)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cut's name. |
| `at` | number (0..∞) |  | yes | Seconds into the multicam where it switches. |
| `angle` | string |  | yes | The angle it switches to. |

No children. [All elements](/reference/elements/)
