---
editLink: false
---

# `halftone`

Prints the picture as a screen of dots, in one ink or four.

<Example src="previews/effects/halftone" alt="halftone">

<<< @/../examples/showcase/effects/halftone.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (2..200) | `8` | How big each dot's cell is, in pixels. |
| `angle` | number | `45` | How far the dot grid is turned, in degrees. In `cmyk` it is the black screen's angle, and the others are set from it. |
| `mode` | "mono" \| "cmyk" | `"mono"` | `mono` prints `ink` on `paper` by brightness; `cmyk` prints cyan, magenta, yellow and black dots, each on its own screen. |
| `ink` | string | `"#111111"` | The colour of the dots in `mono`. |
| `paper` | string | `"#ffffff"` | The colour under the dots. |
| `amount` | number (0..1) | `1` | How much of the effect to mix in: 0 leaves the picture as it was, 1 is the full effect. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
