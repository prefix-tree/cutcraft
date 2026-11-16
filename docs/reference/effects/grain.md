---
editLink: false
---

# `grain`

Adds moving film grain to a clip, a nested sequence, or everything beneath an adjustment.

<Example src="previews/effects/grain" alt="grain">

<<< @/../examples/showcase/effects/grain.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `0.2` | How strong the grain is: 0 is none, 1 is specks of solid black and white. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
