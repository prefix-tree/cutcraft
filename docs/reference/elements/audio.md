---
editLink: false
---

# `<Audio>`

A stretch of a sound asset: volume and pan (constant or keys), fades, ducking under another track.

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Talking-head cut](/recipes/talking-head)

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
| `speed` | number (0.1..20) \| { at, value, easing }[] |  |  | Playback rate: 2 plays twice as fast and half as long; keys ramp it. |
| `freezes` | { at, duration, source }[] |  |  | Frames held on screen while the clip's time stands still. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `volume` | number (0..4) \| { at, value, easing }[] |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time. |
| `pan` | number (-1..1) \| { at, value, easing }[] |  |  | Where it sits between the speakers, from -1 (left) to 1 (right); keys move it. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |

Timed, audible, trims its source. Children: `keyframe`, `speedKey`, `freeze`. [All elements](/reference/elements/)
