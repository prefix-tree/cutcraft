# `<Transition>`

A blend between the two clips it sits between on a sequence track.

<Example src="previews/elements/transition" alt="<Transition>">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

**Used in:** [Product launch](/examples#a-product-launch) · [An edit](/examples#an-edit) · [the walkthrough](/guide/writing-files) · [Slideshow with motion](/recipes/slideshow)

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| … 7 more \| string | `"crossfade"` |  |
| `duration` | number (0.001..30) | `0.5` |  |
| `params` | object | `{}` |  |
| `on` | string |  |  |
| `edge` | "in" \| "out" |  |  |

Timed, visual. No children. [All elements](/reference/elements/)
