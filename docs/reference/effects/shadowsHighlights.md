---
editLink: false
---

# `shadowsHighlights`

Opens up the shadows or holds back the highlights.

<Example src="previews/effects/shadowsHighlights" alt="shadowsHighlights">

<<< @/../examples/showcase/effects/shadowsHighlights.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `shadows` | number (-1..1) | `0` | How much to brighten the shadows, or darken them when negative: up to 2 stops at 1. |
| `highlights` | number (-1..1) | `0` | How much to brighten the highlights, or darken them when negative: up to 2 stops at 1. |
| `radius` | number (0.5..200) | `10` | How far around each pixel it looks to tell shadow from highlight, in pixels: the blur's standard deviation. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
