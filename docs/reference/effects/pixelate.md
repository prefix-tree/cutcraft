---
editLink: false
---

# `pixelate`

Turns the picture, or a box of it, into a coarse mosaic.

<Example src="previews/effects/pixelate" alt="pixelate">

<<< @/../examples/showcase/effects/pixelate.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (1..200) | `12` | How big each mosaic cell is, in pixels; 1 leaves the picture as it was. |
| `box` | [number, number, number (> 0), number (> 0)] | `[0,0,1,1]` | The part of the frame to pixelate, as `[x, y, width, height]` fractions of the frame from the top left. |
| `feather` | number (0..500) | `0` | How far in from the box's edge the mosaic fades in, in pixels. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
