---
editLink: false
---

# `levels`

Sets the black point, the white point and the gamma between them.

<Example src="previews/effects/levels" alt="levels">

<<< @/../examples/showcase/effects/levels.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `black` | number (0..1) | `0` | The input level that becomes black: tones at or below it go to black. |
| `white` | number (0..1) | `1` | The input level that becomes white: tones at or above it go to white. |
| `gamma` | number (0.01..10) | `1` | The curve on the midtones: above 1 lifts them, below 1 deepens them. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
