---
editLink: false
---

# `vignette`

Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.

<Example src="previews/effects/vignette" alt="vignette">

<<< @/../examples/showcase/effects/vignette.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `0.5` | How dark the edges get: 0 leaves them as they were, 1 fades the corners to black. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
