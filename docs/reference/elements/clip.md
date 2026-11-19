---
editLink: false
---

# `<Clip>`

A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.

<Example src="previews/elements/clip" alt="<Clip>">

<<< @/../examples/showcase/docs/clip.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Product launch](/examples/launch) · [Kinetic type](/examples/kinetic) · [Data story](/examples/data) · [An edit](/examples/edit) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends. |
| `src` | string |  | yes | The media, as `asset:<id>` from the manifest. |
| `in` | number (0..∞) \| string |  |  | Where in the source it starts: seconds, or a word, shot or silence of its transcript (`word:12`). |
| `out` | number (0..∞) \| string |  |  | Where in the source it ends, as `in`; `word:40.end` ends after the word is said. |
| `speed` | number (0.1..20) | `1` |  | Playback rate: 2 plays twice as fast and half as long. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop } |  |  | Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `volume` | number (0..4) |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `automation` | { volume, pan } |  |  | Volume and pan over time, as `[seconds into the element, value]` points; pan runs from -1 (left) to 1 (right). |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |
| `frame` | { focus } |  |  | Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. |

Timed, visual, audible, trims its source, transformable. Children: `effect`, `keyframe`, `mask`, `speedKey`, `freeze`. [All elements](/reference/elements/)
