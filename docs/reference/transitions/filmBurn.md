---
editLink: false
---

# `filmBurn`

Burns through the film into the next clip.

<Example src="previews/transitions/filmBurn" alt="filmBurn">

<<< @/../examples/showcase/transitions/filmBurn.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `seed` | integer (0..4294967295) | `0` | Picks the ragged pattern; the same seed burns the same way. |
| `center` | [number, number] | `[0.5,0.5]` | Where the burn starts, as `[x, y]` fractions of the frame from the top left. |
| `size` | number (4..2000) | `120` | How big the burn's ragged features are, in pixels. |
| `edge` | number (0..500) | `24` | How wide the glowing band ahead of the hole is, in pixels. |
| `color` | string | `"#ff7a1a"` | The colour of the glowing band. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
