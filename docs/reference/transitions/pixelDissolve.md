# `pixelDissolve`

Dissolves into the next clip square by square.

<Example src="previews/transitions/pixelDissolve" alt="pixelDissolve">

<<< @/../examples/showcase/transitions/pixelDissolve.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `columns` | integer (1..200) | `16` |
| `rows` | integer (1..200) | `9` |
| `seed` | integer (0..4294967295) | `0` |
| `softness` | number (0..1) | `0.15` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
