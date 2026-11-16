---
editLink: false
---

# `<Cut>`

Switches a `<Multicam>` to an angle at a moment.

<Example src="previews/elements/multicam" alt="<Cut>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

**Used in:** [Multicam highlights](/recipes/highlights)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cut's name. |
| `at` | number (0..∞) |  | yes | Seconds into the multicam where it switches. |
| `angle` | string |  | yes | The angle it switches to. |

No children. [All elements](/reference/elements/)
