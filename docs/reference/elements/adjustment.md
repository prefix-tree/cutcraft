---
editLink: false
---

# `<Adjustment>`

Filters everything beneath it for its own stretch of time.

<Example src="previews/elements/adjustment" alt="<Adjustment>">

<<< @/../examples/showcase/docs/adjustment.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `opacity` | number (0..1) | `1` |  | How much of its effects to mix over the picture beneath. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more | `"normal"` |  | How the filtered picture mixes with the one beneath, as CSS `mix-blend-mode` does. |
| `enabled` | boolean | `true` |  | Off, it filters nothing and stays in the file. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Limits it to a region: position, scale, rotation and crop of the area it filters. |

Timed, visual, trims its source. Children: `effect`, `keyframe`. [All elements](/reference/elements/)
