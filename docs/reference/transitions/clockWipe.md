# `clockWipe`

Sweeps the next clip in around a centre, like a clock hand.

<Example src="previews/transitions/clockWipe" alt="clockWipe">

<<< @/../examples/showcase/transitions/clockWipe.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `startAngle` | number | `0` |
| `direction` | "clockwise" \| "counterclockwise" \| "both" | `"clockwise"` |
| `center` | [number, number] | `[0.5,0.5]` |
| `softness` | number (0..1) | `0.002778` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
