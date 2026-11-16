---
editLink: false
---

# `fractalNoise`

Blends a moving cloud of noise over the picture: mist, smoke or texture.

<Example src="previews/effects/fractalNoise" alt="fractalNoise">

<<< @/../examples/showcase/effects/fractalNoise.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (2..2000) | `160` | How big the noise's features are, in pixels. |
| `octaves` | integer (1..8) | `5` | How many layers of finer detail the noise has. |
| `evolution` | number (0..10) | `0.2` | How fast the pattern changes in place, in changes per second. |
| `contrast` | number (0..10) | `1` | How far the noise is stretched from mid-grey, as a multiplier. |
| `color` | string | `"#ffffff"` | The colour the noise is tinted with. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "softLight" | `"overlay"` | How the noise is blended onto the picture, as a W3C blend mode. |
| `opacity` | number (0..1) | `0.5` | How much of the blended noise to mix in: 0 leaves the picture as it was, 1 is the full blend. |
| `seed` | integer (0..∞) | `0` | Picks the pattern; the same seed draws the same noise. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
