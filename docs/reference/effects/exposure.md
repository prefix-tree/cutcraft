---
editLink: false
---

# `exposure`

Brightens or darkens in stops, as a camera would.

<Example src="previews/effects/exposure" alt="exposure">

<<< @/../examples/showcase/effects/exposure.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `stops` | number (-5..5) | `0` | How much brighter or darker, in stops: +1 doubles the light, -1 halves it. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
