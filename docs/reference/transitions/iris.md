# `iris`

Opens the next clip through a growing circle, polygon or star.

<Example src="previews/transitions/iris" alt="iris">

<<< @/../examples/showcase/transitions/iris.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `sides` | integer (0..64) | `0` |
| `star` | number (0..0.95) | `0` |
| `rotation` | number | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `feather` | number (0..200) | `2` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
