---
editLink: false
---

# `contrast`

Pushes lights and darks apart, or pulls them together.

<Example src="previews/effects/contrast" alt="contrast">

<<< @/../examples/showcase/effects/contrast.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How far lights and darks move apart: -1 is flat grey, 0 leaves the picture as it was, 1 doubles the contrast. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
