---
editLink: false
---

# `<SpeedKey>`

Changes its clip's speed from a moment on, eased: speed ramps.

<Example src="previews/elements/speedkey" alt="<SpeedKey>">

<<< @/../examples/showcase/docs/speedkey.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The key's name. |
| `at` | number (0..∞) |  | yes | Seconds into the clip where the new speed is reached. |
| `speed` | number (0.1..20) |  | yes | The playback rate from here on: 2 is twice as fast. |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| … 46 more | `"linear"` |  | How the speed changes from the key before to this one. |

No children. [All elements](/reference/elements/)
