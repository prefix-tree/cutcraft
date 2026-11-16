---
editLink: false
---

# `blinds`

Opens the next clip through turning slats.

<Example src="previews/transitions/blinds" alt="blinds">

<<< @/../examples/showcase/transitions/blinds.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `slats` | integer (1..100) | `12` | How many slats cross the frame. |
| `angle` | number | `90` | The direction the slats open in, in degrees clockwise from up: 90 opens them sideways, as vertical slats. |
| `softness` | number (0..1) | `0.1` | How soft each opening edge is, as a share of a slat. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
