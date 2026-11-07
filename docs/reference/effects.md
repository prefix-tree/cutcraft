# Effects and transitions

Every built-in `<Effect type>` and `<Transition type>`, with the params it takes. Params outside these ranges, or not listed, are an error when the file resolves; a keyframe inside an effect animates one by `param`. Generated from the effect registry (`packages/kit/src/effects/registry.ts`) by `pnpm docs:gen`.

## Units

A param's name says what kind of value it is, and each kind has one scale:

| Kind | Scale | Params |
|---|---|---|
| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint` |
| gain | a multiplier | `intensity`, `scale` |
| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `edge`, `x`, `y` |
| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |
| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |
| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light` |
| exposure | stops | `stops` |
| choice | a string | `direction` |

## Effects

### Basic adjustments

#### `brightness`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

#### `contrast`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

#### `saturation`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

#### `hue`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `angle` | number | `0` |

#### `grayscale`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

#### `sepia`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

#### `invert`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

#### `blur`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `radius` | number (0..200) | `4` |

#### `shadow`

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `x` | number | `0` |
| `y` | number | `4` |
| `radius` | number (0..200) | `8` |
| `color` | string | `"#000000"` |
| `opacity` | number (0..1) | `0.5` |

### Vignette and grain

#### `vignette`

Drawn as painted over the element after it.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `0.5` |

#### `grain`

Drawn as painted over the element after it.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `0.2` |

### Colour

#### `levels`

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `black` | number (0..1) | `0` |
| `white` | number (0..1) | `1` |
| `gamma` | number (0.01..10) | `1` |

#### `lut`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `src` | string |  |
| `amount` | number (0..1) | `1` |

#### `exposure`

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `stops` | number (-5..5) | `0` |

#### `vibrance`

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

#### `whiteBalance`

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `temperature` | number (-1..1) | `0` |
| `tint` | number (-1..1) | `0` |

#### `shadowsHighlights`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `shadows` | number (-1..1) | `0` |
| `highlights` | number (-1..1) | `0` |
| `radius` | number (0.5..200) | `10` |

#### `duotone`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `dark` | string | `"#1d2b53"` |
| `light` | string | `"#ffd27f"` |
| `amount` | number (0..1) | `1` |

#### `curves`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `rgb` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `red` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `green` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `blue` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |

### Footage

#### `colorKey`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `color` | string | `"#00ff00"` |
| `tolerance` | number (0..1) | `0.3` |
| `softness` | number (0..1) | `0.1` |
| `spill` | number (0..1) | `0.5` |

#### `regionBlur`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `box` | [number, number, number, number] | `[0.25,0.25,0.5,0.5]` |
| `radius` | number (0..200) | `7` |
| `feather` | number (0..500) | `10` |
| `roundness` | number (0..1) | `0` |
| `inverted` | boolean | `false` |

#### `cornerPin`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `topLeft` | [number, number] | `[0,0]` |
| `topRight` | [number, number] | `[1,0]` |
| `bottomRight` | [number, number] | `[1,1]` |
| `bottomLeft` | [number, number] | `[0,1]` |

#### `zoomBlur`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `length` | number (0..500) | `40` |
| `center` | [number, number] | `[0.5,0.5]` |
| `samples` | integer | `24` |

#### `chromaticAberration`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `distance` | number (0..100) | `4` |
| `angle` | number | `90` |
| `radial` | boolean | `false` |
| `center` | [number, number] | `[0.5,0.5]` |

### Titles and shapes

#### `glow`

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `radius` | number (0..200) | `7` |
| `intensity` | number (0..4) | `1` |
| `threshold` | number (0..1) | `0` |
| `color` | string | `"#ffffff"` |
| `tint` | number (0..1) | `1` |

#### `outline`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `width` | number (0..64) | `8` |
| `color` | string | `"#ffffff"` |
| `opacity` | number (0..1) | `1` |
| `outlineOnly` | boolean | `false` |

#### `longShadow`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `length` | number (0..2000) | `240` |
| `angle` | number | `135` |
| `color` | string | `"#777777"` |
| `opacity` | number (0..1) | `1` |
| `fade` | boolean | `false` |

#### `bevel`

Drawn as a shader.

| param | type | default |
|---|---|---|
| `size` | number (0..200) | `1.5` |
| `angle` | number | `-60` |
| `amount` | number (0..1) | `0.4` |
| `highlight` | string | `"#ffffff"` |
| `shade` | string | `"#000000"` |

## Transitions

### Fades, wipes and slides

#### `crossfade`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `curve` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"ease"` |

#### `dipToBlack`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `holdDuration` | number (0..30) | `0.1` |

#### `dipToWhite`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `holdDuration` | number (0..30) | `0.1` |

#### `wipe`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |

#### `slide`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |
| `pushOut` | boolean | `false` |

#### `push`

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |

### Shaders

#### `iris`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `sides` | integer | `0` |
| `star` | number (0..0.95) | `0` |
| `rotation` | number | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `feather` | number (0..200) | `2` |

#### `clockWipe`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `startAngle` | number | `0` |
| `direction` | "clockwise" \| "counterclockwise" \| "both" | `"clockwise"` |
| `center` | [number, number] | `[0.5,0.5]` |
| `softness` | number (0..1) | `0.002777777777777778` |

#### `blinds`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `slats` | integer | `12` |
| `angle` | number | `90` |
| `softness` | number (0..1) | `0.1` |

#### `filmBurn`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `seed` | integer | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `size` | number (4..2000) | `120` |
| `edge` | number (0..500) | `24` |
| `color` | string | `"#ff7a1a"` |

#### `pixelDissolve`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `columns` | integer | `16` |
| `rows` | integer | `9` |
| `seed` | integer | `0` |
| `softness` | number (0..1) | `0.15` |

#### `zoom`

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `center` | [number, number] | `[0.5,0.5]` |
| `scale` | number (1..4) | `1.6` |
| `blur` | number (0..1) | `0.5` |
