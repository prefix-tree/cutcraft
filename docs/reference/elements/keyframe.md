# `<Keyframe>`

Animates one property of its parent between values, with easing.

<Example src="previews/elements/keyframe" alt="<Keyframe>">

<<< @/../examples/showcase/docs/keyframe.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `property` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `value` | any |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  |
| `handles` | { in, out } |  |  |
| `roving` | boolean |  |  |

No children. [All elements](/reference/elements/)
