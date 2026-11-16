---
editLink: false
---

# `outline`

Draws a line around the element's shape.

<Example src="previews/effects/outline" alt="outline">

<<< @/../examples/showcase/effects/outline.tsx

</Example>

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `width` | number (0..64) | `8` | How thick the outline is, in pixels. |
| `color` | string | `"#ffffff"` | The outline's colour. |
| `opacity` | number (0..1) | `1` | How opaque the outline is: 0 is invisible, 1 is solid. |
| `outlineOnly` | boolean | `false` | Draw only the outline, filled in, without the element over it. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
