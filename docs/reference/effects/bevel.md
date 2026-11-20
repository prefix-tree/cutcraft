---
editLink: false
---

# `bevel`

Gives the element's shape a raised, lit edge.

<Example src="previews/effects/bevel" alt="bevel">

<<< @/../examples/showcase/effects/bevel.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (0..200) | `1.5` | How wide the raised edge is, in pixels: the standard deviation of the blur that shapes it. |
| `angle` | number | `-60` | Where the light comes from, in degrees clockwise from up. |
| `amount` | number (0..1) | `0.4` | How strong the shading is: 0 leaves the element as it was, 1 is the full highlight and shade. |
| `highlight` | string | `"#ffffff"` | The colour of the edges facing the light. |
| `shade` | string | `"#000000"` | The colour of the edges facing away from the light. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
