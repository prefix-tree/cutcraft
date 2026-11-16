---
editLink: false
---

# `vibrance`

Lifts the muted colours more than the strong ones.

<Example src="previews/effects/vibrance" alt="vibrance">

<<< @/../examples/showcase/effects/vibrance.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How much to saturate the muted colours, leaving strong ones nearly alone; negative takes colour out of all of them evenly. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
