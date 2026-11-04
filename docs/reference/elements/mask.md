# `<Mask>`

Shows only a shape of its clip, with a feathered edge or inverted.

<Example src="previews/elements/mask" alt="<Mask>">

<<< @/../examples/showcase/docs/mask.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "shape" \| "drawn" | `"shape"` |  |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  |
| `path` | { points, closed } |  |  |
| `feather` | number (0..100) | `0` |  |
| `inverted` | boolean | `false` |  |
| `expansion` | number (-100..100) | `0` |  |
| `opacity` | number (0..1) | `1` |  |
| `easing` | "linear" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"linear"` |  |

Children: `keyframe`. [All elements](/reference/elements/)
