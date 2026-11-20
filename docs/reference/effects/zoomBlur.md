---
editLink: false
---

# `zoomBlur`

Streaks the picture out from a centre.

<Example src="previews/effects/zoomBlur" alt="zoomBlur">

<<< @/../examples/showcase/effects/zoomBlur.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `length` | number (0..500) | `40` | How long the streaks are at the corners, in pixels; they shorten toward the centre. |
| `center` | [number, number] | `[0.5,0.5]` | The point the streaks run toward, as `[x, y]` fractions of the frame from the top left. |
| `samples` | integer (1..64) | `24` | The most reads along each streak: more is smoother and slower. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
