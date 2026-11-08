# `curves`

Reshapes the tones through curves, for all channels or each one.

<Example src="previews/effects/curves" alt="curves">

<<< @/../examples/showcase/effects/curves.tsx

</Example>

The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `rgb` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `red` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `green` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `blue` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
