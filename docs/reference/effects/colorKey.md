# `colorKey`

Makes one colour transparent: a green screen.

<Example src="previews/effects/colorKey" alt="colorKey">

<<< @/../examples/showcase/effects/colorKey.tsx

</Example>

The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `color` | string | `"#00ff00"` |
| `tolerance` | number (0..1) | `0.3` |
| `softness` | number (0..1) | `0.1` |
| `spill` | number (0..1) | `0.5` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
