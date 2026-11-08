# `halftone`

Prints the picture as a screen of dots, in one ink or four.

<Example src="previews/effects/halftone" alt="halftone">

<<< @/../examples/showcase/effects/halftone.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `size` | number (2..200) | `8` |
| `angle` | number | `45` |
| `mode` | "mono" \| "cmyk" | `"mono"` |
| `ink` | string | `"#111111"` |
| `paper` | string | `"#ffffff"` |
| `amount` | number (0..1) | `1` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
