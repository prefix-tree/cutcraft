---
editLink: false
---

# `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

<Example src="previews/elements/multicam" alt="<Multicam>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Multicam highlights](/recipes/highlights)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The group's name. |
| `name` | string |  |  | A label for the editor. |
| `sync` | number (0..∞) | `0` |  | Timeline time at which every angle is aligned (plus each angle's own offset). |

Children: `angle`, `cut`. [All elements](/reference/elements/)
