---
editLink: false
---

# `regionBlur`

Blurs a box of the frame, to hide a face, a person, a plate or a screen.

<Example src="previews/effects/regionBlur" alt="regionBlur">

<<< @/../examples/showcase/effects/regionBlur.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `box` | [number, number, number (> 0), number (> 0)] | `[0.25,0.25,0.5,0.5]` | The box to blur, as `[x, y, width, height]` fractions of the frame from the top left. |
| `radius` | number (0..200) | `7` | How strong the blur is, in pixels: the Gaussian's standard deviation. |
| `feather` | number (0..500) | `10` | How far in from the box's edge the blur fades in, in pixels. |
| `roundness` | number (0..1) | `0` | How round the box's corners are: 0 is square, 1 rounds the short side fully. |
| `inverted` | boolean | `false` | Blur everything outside the box instead of inside it. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
