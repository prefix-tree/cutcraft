---
editLink: false
---

# `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

<Example src="previews/elements/multicam" alt="<Multicam>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

**Used in:** [Multicam highlights](/recipes/highlights)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The group's name. |
| `name` | string |  |  | A label for the editor. |
| `sync` | number (0..∞) | `0` |  | Timeline time at which every angle is aligned (plus each angle's own offset). |
| `activeAngle` | string |  |  | The angle selected in the editor. What plays is set by the `<Cut>`s. |

Children: `angle`, `cut`. [All elements](/reference/elements/)
