---
editLink: false
---

# `<Angle>`

One camera of a `<Multicam>`: its asset and sync offset.

<Example src="previews/elements/multicam" alt="<Angle>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Multicam highlights](/recipes/highlights)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The angle's name: `<Cut angle>` picks it by this. |
| `src` | string |  | yes | The camera's footage, as `asset:<id>`. |
| `offset` | number | `0` |  | Source-time offset that aligns this angle with the sync point. |
| `color` | string |  |  | Its colour in the editor. |
| `name` | string |  |  | A label for the editor. |

No children. [All elements](/reference/elements/)
