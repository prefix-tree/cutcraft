---
editLink: false
---

# `iris`

Opens the next clip through a growing circle, polygon or star.

<Example src="previews/transitions/iris" alt="iris">

<<< @/../examples/showcase/transitions/iris.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `sides` | integer (0..64) | `0` | How many corners the shape has: below 3 it is a circle. |
| `star` | number (0..0.95) | `0` | How deep a star's points are: the inner corners' distance from the centre as a share of the outer ones'. 0 draws a plain polygon. |
| `rotation` | number | `0` | How far the shape is turned, in degrees clockwise. |
| `center` | [number, number] | `[0.5,0.5]` | Where the shape opens from, as `[x, y]` fractions of the frame from the top left. |
| `feather` | number (0..200) | `2` | How soft the shape's edge is, in pixels. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
