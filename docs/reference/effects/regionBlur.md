# `regionBlur`

Blurs a box of the frame, to hide a face, a person, a plate or a screen.

<Example src="previews/effects/regionBlur" alt="regionBlur">

<<< @/../examples/showcase/effects/regionBlur.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `box` | [number, number, number, number] | `[0.25,0.25,0.5,0.5]` |
| `radius` | number (0..200) | `7` |
| `feather` | number (0..500) | `10` |
| `roundness` | number (0..1) | `0` |
| `inverted` | boolean | `false` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
