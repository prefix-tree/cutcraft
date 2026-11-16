---
editLink: false
---

# `curves`

Reshapes the tones through curves, for all channels or each one.

<Example src="previews/effects/curves" alt="curves">

<<< @/../examples/showcase/effects/curves.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `rgb` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for all three channels, applied first: `[input, output]` points, input rising. |
| `red` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the red channel, applied after `rgb`. |
| `green` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the green channel, applied after `rgb`. |
| `blue` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the blue channel, applied after `rgb`. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
