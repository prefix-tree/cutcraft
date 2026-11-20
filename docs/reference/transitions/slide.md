---
editLink: false
---

# `slide`

Slides the next clip in over the first.

<Example src="previews/transitions/slide" alt="slide">

<<< @/../examples/showcase/transitions/slide.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` | The way the next clip moves in: `left` brings it in from the right. |
| `pushOut` | boolean | `false` | Push the outgoing clip out the same way, instead of leaving it in place under the next one. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
