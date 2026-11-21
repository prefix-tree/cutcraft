---
editLink: false
---

# `outline`

Draws a line around the element's shape.

<Example src="previews/effects/outline" alt="outline">

<<< @/../examples/showcase/effects/outline.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `thickness` | number (0..64) | `8` | How thick the outline is, in pixels. |
| `color` | string | `"#ffffff"` | The outline's colour. |
| `opacity` | number (0..1) | `1` | How opaque the outline is: 0 is invisible, 1 is solid. |
| `outlineOnly` | boolean | `false` | Draw only the outline, filled in, without the element over it. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
