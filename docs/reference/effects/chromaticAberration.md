# `chromaticAberration`

Splits red and blue apart, as a cheap lens does.

<Example src="previews/effects/chromaticAberration" alt="chromaticAberration">

<<< @/../examples/showcase/effects/chromaticAberration.tsx

</Example>

The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `distance` | number (0..100) | `4` |
| `angle` | number | `90` |
| `radial` | boolean | `false` |
| `center` | [number, number] | `[0.5,0.5]` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
