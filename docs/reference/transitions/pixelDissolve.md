---
editLink: false
---

# `pixelDissolve`

Dissolves into the next clip square by square.

<Example src="previews/transitions/pixelDissolve" alt="pixelDissolve">

<<< @/../examples/showcase/transitions/pixelDissolve.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `columns` | integer (1..200) | `16` | How many blocks across the frame. |
| `rows` | integer (1..200) | `9` | How many blocks down the frame. |
| `seed` | integer (0..4294967295) | `0` | Picks the order the blocks switch in; the same seed switches them the same way. |
| `softness` | number (0..1) | `0.15` | How long each block takes to switch, as a share of the transition: 0 switches each at once. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
