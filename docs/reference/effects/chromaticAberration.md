---
editLink: false
---

# `chromaticAberration`

Splits red and blue apart, as a cheap lens does.

<Example src="previews/effects/chromaticAberration" alt="chromaticAberration">

<<< @/../examples/showcase/effects/chromaticAberration.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `distance` | number (0..100) | `4` | How far red and blue split from green, in pixels; with `radial`, the split at the corners. |
| `angle` | number | `90` | The direction of the split, in degrees clockwise from up: 90 splits sideways. Unused with `radial`. |
| `radial` | boolean | `false` | Split outward from `center`, growing toward the edges as a lens does, instead of along `angle`. |
| `center` | [number, number] | `[0.5,0.5]` | Where a radial split points out from, as `[x, y]` fractions of the frame from the top left. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
