---
editLink: false
---

# `<Effect>`

A look on its parent: colour grading, blur, glow, outline, keying, corner pin, vignette, grain and more, or your own shader.

<Example src="previews/elements/effect" alt="<Effect>">

<<< @/../examples/showcase/docs/effect.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The effect's name. |
| `type` | "brightness" \| "contrast" \| "saturation" \| "hue" \| "blur" \| … 28 more \| string |  | yes | A built-in effect, or one the file declares with `effect()`. |
| `params` | object | `{}` |  | The type's own settings; each effect's page lists them. |
| `enabled` | boolean | `true` |  | Off, it draws nothing and stays in the file. |

Every built-in type and its params: [Effects and transitions](/reference/effects/).

Children: `keyframe`. [All elements](/reference/elements/)
