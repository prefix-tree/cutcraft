# `filmBurn`

Burns through the film into the next clip.

<Example src="previews/transitions/filmBurn" alt="filmBurn">

<<< @/../examples/showcase/transitions/filmBurn.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `seed` | integer (0..4294967295) | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `size` | number (4..2000) | `120` |
| `edge` | number (0..500) | `24` |
| `color` | string | `"#ff7a1a"` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
