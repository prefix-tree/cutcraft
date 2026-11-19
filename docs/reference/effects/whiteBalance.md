---
editLink: false
---

# `whiteBalance`

Warms or cools the picture, and tints it toward green or magenta.

<Example src="previews/effects/whiteBalance" alt="whiteBalance">

<<< @/../examples/showcase/effects/whiteBalance.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `temperature` | number (-1..1) | `0` | Warms the picture when positive and cools it when negative. |
| `tint` | number (-1..1) | `0` | Tints the picture toward magenta when positive and toward green when negative. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
