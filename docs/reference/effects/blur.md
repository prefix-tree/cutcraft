---
editLink: false
---

# `blur`

Softens the picture; the radius is the Gaussian's standard deviation, in pixels.

<Example src="previews/effects/blur" alt="blur">

<<< @/../examples/showcase/effects/blur.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `radius` | number (0..200) | `4` | How soft the picture gets, in pixels: the Gaussian's standard deviation, as CSS `blur()` reads it. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
