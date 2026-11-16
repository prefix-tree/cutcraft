---
editLink: false
---

# `duotone`

Maps the picture's brightness onto two colours.

<Example src="previews/effects/duotone" alt="duotone">

<<< @/../examples/showcase/effects/duotone.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `dark` | string | `"#1d2b53"` | The colour the picture's blacks become. |
| `light` | string | `"#ffd27f"` | The colour the picture's whites become. |
| `amount` | number (0..1) | `1` | How much of the effect to mix in: 0 leaves the picture as it was, 1 is the full effect. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
