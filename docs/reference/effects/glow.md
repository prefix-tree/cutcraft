---
editLink: false
---

# `glow`

Lights a halo around the bright parts.

<Example src="previews/effects/glow" alt="glow">

<<< @/../examples/showcase/effects/glow.tsx

</Example>

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `radius` | number (0..200) | `7` | How far the glow spreads, in pixels: the blur's standard deviation. |
| `intensity` | number (0..4) | `1` | How strong the glow is, as a multiplier. |
| `threshold` | number (0..1) | `0` | The brightness the glow starts from: 0 glows the whole element; above it only the bright parts glow, with a bloom over them. |
| `color` | string | `"#ffffff"` | The colour the glow is tinted toward. |
| `tint` | number (0..1) | `1` | How far the glow is coloured toward `color`: 0 keeps the element's own colours, 1 is all `color`. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
