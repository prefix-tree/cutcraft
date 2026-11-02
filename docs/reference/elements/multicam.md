# `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

<Example src="previews/elements/multicam" alt="<Multicam>">

<<< @/../examples/showcase/docs/multicam.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `name` | string |  |  |
| `sync` | number (0..∞) | `0` |  |
| `activeAngle` | string |  |  |

Children: `angle`, `cut`. [All elements](/reference/elements/)
