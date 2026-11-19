---
editLink: false
---

# `longShadow`

Extrudes a long, hard shadow from the element's shape.

<Example src="previews/effects/longShadow" alt="longShadow">

<<< @/../examples/showcase/effects/longShadow.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `length` | number (0..2000) | `240` | How far the shadow reaches, in pixels. |
| `angle` | number | `135` | The direction the shadow falls, in degrees clockwise from up: 135 falls down and right. |
| `color` | string | `"#777777"` | The shadow's colour. |
| `opacity` | number (0..1) | `1` | How opaque the shadow is: 0 is invisible, 1 is solid. |
| `fade` | boolean | `false` | Thin the shadow out toward its far end. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
