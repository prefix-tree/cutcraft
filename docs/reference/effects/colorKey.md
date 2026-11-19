---
editLink: false
---

# `colorKey`

Makes one colour transparent: a green screen.

<Example src="previews/effects/colorKey" alt="colorKey">

<<< @/../examples/showcase/effects/colorKey.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `color` | string | `"#00ff00"` | The colour to key out: the screen's colour. |
| `tolerance` | number (0..1) | `0.3` | How far a colour may lie from the key colour and still be removed fully. |
| `softness` | number (0..1) | `0.1` | How wide the fade is between removed and kept colours, past `tolerance`. |
| `spill` | number (0..1) | `0.5` | How much of the screen's light bounced onto the subject to take out: 0 keeps it, 1 removes it fully. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
