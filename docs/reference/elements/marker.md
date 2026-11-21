---
editLink: false
---

# `<Marker>`

A named point on the timeline.

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The marker's name: `marker:<id>` refers to it as a time. |
| `start` | number (0..∞) |  | yes | Seconds from the start of the video. |
| `label` | string | `""` |  | Text shown on the editor's ruler. |
| `color` | string |  |  | Its colour on the ruler. |

No children. [All elements](/reference/elements/)
