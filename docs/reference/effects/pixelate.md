# `pixelate`

Turns the picture, or a box of it, into a coarse mosaic.

<Example src="previews/effects/pixelate" alt="pixelate">

<<< @/../examples/showcase/effects/pixelate.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `size` | number (1..200) | `12` |
| `box` | [number, number, number, number] | `[0,0,1,1]` |
| `feather` | number (0..500) | `0` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
