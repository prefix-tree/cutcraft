# `glow`

Lights a halo around the bright parts.

<Example src="previews/effects/glow" alt="glow">

<<< @/../examples/showcase/effects/glow.tsx

</Example>

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `radius` | number (0..200) | `7` |
| `intensity` | number (0..4) | `1` |
| `threshold` | number (0..1) | `0` |
| `color` | string | `"#ffffff"` |
| `tint` | number (0..1) | `1` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
