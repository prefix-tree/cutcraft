---
editLink: false
---

# `clockWipe`

Sweeps the next clip in around a centre, like a clock hand.

<Example src="previews/transitions/clockWipe" alt="clockWipe">

<<< @/../examples/showcase/transitions/clockWipe.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `startAngle` | number | `0` | Where the sweep starts, in degrees clockwise from up. |
| `direction` | "clockwise" \| "counterclockwise" \| "both" | `"clockwise"` | Which way it sweeps: `clockwise`, `counterclockwise`, or `both` ways at once. |
| `center` | [number, number] | `[0.5,0.5]` | The point it sweeps around, as `[x, y]` fractions of the frame from the top left. |
| `softness` | number (0..1) | `0.002778` | How soft the moving edge is, as a share of a full turn. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
