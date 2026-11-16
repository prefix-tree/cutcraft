---
editLink: false
---

# `<Keyframe>`

Animates one property of its parent between values, with easing.

<Example src="previews/elements/keyframe" alt="<Keyframe>">

<<< @/../examples/showcase/docs/keyframe.tsx

</Example>

**Used in:** [An edit](/examples/edit) · [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The keyframe's name. |
| `property` | string |  |  | A property of the parent element (`transform.opacity`…). |
| `param` | string |  |  | Inside an `<Effect>`: the effect param it animates. |
| `at` | number (0..∞) |  | yes | Element-relative seconds. |
| `value` | any |  | yes | The value the property or param has at `at`. |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  | How it moves from the keyframe before to this one. |

No children. [All elements](/reference/elements/)
