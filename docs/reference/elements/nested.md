---
editLink: false
---

# `<Nested>`

A sequence written once as a component and placed like a clip.

<Example src="previews/elements/nested" alt="<Nested>">

<<< @/../examples/showcase/docs/nested.tsx

</Example>

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `of` | any \| string |  | yes | A pure helper component returning tracks, or a file reference. Validated at collect time. |
| `in` | number (0..∞) \| string |  |  | Where in the nested sequence it starts, in its own seconds. |
| `out` | number (0..∞) \| string |  |  | Where in the nested sequence it ends, as `in`. |
| `volume` | number (0..4) | `1` |  | A gain on all its sound: 1 as it is, 0 muted. |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](/reference/elements/)
