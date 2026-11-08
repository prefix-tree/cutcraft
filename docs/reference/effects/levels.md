# `levels`

Sets the black point, the white point and the gamma between them.

<Example src="previews/effects/levels" alt="levels">

<<< @/../examples/showcase/effects/levels.tsx

</Example>

The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `black` | number (0..1) | `0` |
| `white` | number (0..1) | `1` |
| `gamma` | number (0.01..10) | `1` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
