# `zoom`

Zooms through the first clip into the next, with a blur.

<Example src="previews/transitions/zoom" alt="zoom">

<<< @/../examples/showcase/transitions/zoom.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `center` | [number, number] | `[0.5,0.5]` |
| `scale` | number (1..4) | `1.6` |
| `blur` | number (0..1) | `0.5` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
