# `<Effect>`

A filter on its parent: brightness, blur, grayscale, vignette, grain and more.

<Example src="previews/elements/effect" alt="<Effect>">

<<< @/../examples/showcase/docs/effect.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "brightness" \| "contrast" \| "saturation" \| "hue" \| "blur" \| … 23 more \| string |  | yes |
| `params` | object | `{}` |  |
| `enabled` | boolean | `true` |  |

Every built-in type and its params: [Effects and transitions](/reference/effects).

Children: `keyframe`. [All elements](/reference/elements/)
