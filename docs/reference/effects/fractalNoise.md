# `fractalNoise`

Blends a moving cloud of noise over the picture: mist, smoke or texture.

<Example src="previews/effects/fractalNoise" alt="fractalNoise">

<<< @/../examples/showcase/effects/fractalNoise.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `size` | number (2..2000) | `160` |
| `octaves` | integer (1..8) | `5` |
| `evolution` | number (0..10) | `0.2` |
| `contrast` | number (0..10) | `1` |
| `color` | string | `"#ffffff"` |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "softLight" | `"overlay"` |
| `opacity` | number (0..1) | `0.5` |
| `seed` | integer (0..∞) | `0` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
