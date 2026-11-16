---
editLink: false
---

# `lightLeak`

Washes warm light in from the edges, as light leaking into a film camera.

<Example src="previews/effects/lightLeak" alt="lightLeak">

<<< @/../examples/showcase/effects/lightLeak.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `color` | string | `"#ff8a3d"` | The colour of the light. |
| `intensity` | number (0..1) | `0.6` | How bright the light is: the most it lightens the picture. |
| `spread` | number (0.05..2) | `0.6` | How far each bloom of light spreads, as a share of the frame's diagonal. |
| `evolution` | number (0..10) | `0.15` | How fast the light wanders and pulses, in changes per second. |
| `seed` | integer (0..∞) | `0` | Picks the pattern; the same seed draws the same light. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
