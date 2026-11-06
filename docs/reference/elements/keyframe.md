# `<Keyframe>`

Animates one property of its parent between values, with easing.

<Example src="previews/elements/keyframe" alt="<Keyframe>">

<<< @/../examples/showcase/docs/keyframe.tsx

</Example>

**Used in:** [An edit](/examples#an-edit) · [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `property` | string |  |  |
| `param` | string |  |  |
| `at` | number (0..∞) |  | yes |
| `value` | any |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  |

No children. [All elements](/reference/elements/)
