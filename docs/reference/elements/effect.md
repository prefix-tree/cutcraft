# `<Effect>`

A look on its parent: colour grading, blur, glow, outline, keying, corner pin, vignette, grain and more, or your own shader.

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
