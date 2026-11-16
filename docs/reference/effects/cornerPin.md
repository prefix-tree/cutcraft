---
editLink: false
---

# `cornerPin`

Moves the picture's four corners, to place it in a screen or a frame.

<Example src="previews/effects/cornerPin" alt="cornerPin">

<<< @/../examples/showcase/effects/cornerPin.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `topLeft` | [number, number] | `[0,0]` | Where the picture's top-left corner goes, as `[x, y]` fractions of the frame from the top left. |
| `topRight` | [number, number] | `[1,0]` | Where the picture's top-right corner goes, as `[x, y]` fractions of the frame from the top left. |
| `bottomRight` | [number, number] | `[1,1]` | Where the picture's bottom-right corner goes, as `[x, y]` fractions of the frame from the top left. |
| `bottomLeft` | [number, number] | `[0,1]` | Where the picture's bottom-left corner goes, as `[x, y]` fractions of the frame from the top left. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
