---
editLink: false
---

# `scanlines`

Lays the dark lines of an old screen over the picture.

<Example src="previews/effects/scanlines" alt="scanlines">

<<< @/../examples/showcase/effects/scanlines.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `spacing` | number (2..200) | `4` | The distance from one line to the next, in pixels. |
| `thickness` | number (0..1) | `0.5` | How much of the space between lines each dark line covers. |
| `intensity` | number (0..1) | `0.35` | How dark the lines are: 0 is invisible, 1 is black. |
| `speed` | number (-2000..2000) | `0` | How fast the lines roll across the picture, in pixels per second. |
| `angle` | number | `0` | How far the lines are turned, in degrees: 0 is horizontal, 90 vertical. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
