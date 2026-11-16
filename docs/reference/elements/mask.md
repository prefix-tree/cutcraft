---
editLink: false
---

# `<Mask>`

Shows only a shape of its clip, with a feathered edge or inverted.

<Example src="previews/elements/mask" alt="<Mask>">

<<< @/../examples/showcase/docs/mask.tsx

</Example>

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The mask's name. |
| `type` | "shape" \| "drawn" | `"shape"` |  | `shape` for a rectangle, ellipse or polygon; `drawn` for a bezier `path`. |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  | The region it shows: `{ rect }`, `{ ellipse }` or `{ polygon }`, in the clip's pixels. |
| `path` | { points, closed } |  |  | A drawn mask's outline: bezier points with handles, closed or open. |
| `feather` | number (0..100) | `0` |  | Softens the mask's edge, in pixels. |
| `inverted` | boolean | `false` |  | Shows everything outside the region instead of inside. |
| `expansion` | number (-100..100) | `0` |  | Grows the region outwards, or shrinks it when negative, in pixels. |
| `opacity` | number (0..1) | `1` |  | How much the mask hides: 1 hides fully outside the region, 0 not at all. |
| `easing` | "linear" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"linear"` |  | How the mask moves between its keyframes. |

Children: `keyframe`. [All elements](/reference/elements/)
