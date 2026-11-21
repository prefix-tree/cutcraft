---
editLink: false
---

# `zoom`

Zooms through the first clip into the next, smearing along the zoom.

<Example src="previews/transitions/zoom" alt="zoom">

<<< @/../examples/showcase/transitions/zoom.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `center` | [number, number] | `[0.5,0.5]` | The point the clips zoom toward, as `[x, y]` fractions of the frame from the top left. |
| `scale` | number (1..4) | `1.6` | How far the clips zoom, as a multiplier: the outgoing clip grows to it and the next one shrinks from it. |
| `smear` | number (0..1) | `0.5` | How much the clips smear along the zoom, most at the middle: 0 is none. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
