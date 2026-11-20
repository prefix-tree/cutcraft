---
editLink: false
---

# `shadow`

Casts a soft drop shadow behind the element's own shape.

<Example src="previews/effects/shadow" alt="shadow">

<<< @/../examples/showcase/effects/shadow.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `x` | number | `0` | How far the shadow falls to the right, in pixels; negative falls left. |
| `y` | number | `4` | How far the shadow falls down, in pixels; negative falls up. |
| `radius` | number (0..200) | `8` | How soft the shadow's edge is, in pixels: the blur's standard deviation. |
| `color` | string | `"#000000"` | The shadow's colour. |
| `opacity` | number (0..1) | `0.5` | How dark the shadow is: 0 is invisible, 1 is solid colour. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
