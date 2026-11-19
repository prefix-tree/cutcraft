---
editLink: false
---

# `lut`

Grades through a 3D lookup table from a `.cube` file.

<Example src="previews/effects/lut" alt="lut">

<<< @/../examples/showcase/effects/lut.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `src` | string |  | The lookup table, as `"asset:<id>"`: a `.cube` file in the manifest. |
| `amount` | number (0..1) | `1` | How much of the graded picture to mix in: 0 leaves the picture as it was, 1 is the full grade. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
