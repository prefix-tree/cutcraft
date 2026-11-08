# `zoomBlur`

Streaks the picture out from a centre.

<Example src="previews/effects/zoomBlur" alt="zoomBlur">

<<< @/../examples/showcase/effects/zoomBlur.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `length` | number (0..500) | `40` |
| `center` | [number, number] | `[0.5,0.5]` |
| `samples` | integer (1..64) | `24` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
