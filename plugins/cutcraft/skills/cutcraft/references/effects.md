# Effects and transitions

Every built-in effect and transition, with its params and defaults. Generated from the code by `scripts/gen-docs.ts`; do not edit.

### Units

A param's name says what kind of value it is, and each kind has one scale:

| Kind | Scale | Params |
|---|---|---|
| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint`, `temperature`, `shadows`, `highlights`, `threshold`, `spill`, `black`, `white`, `blur`, `roundness`, `star` |
| gain | a multiplier | `intensity`, `scale` |
| exponent | a power, 1 changes nothing | `gamma` |
| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `edge`, `x`, `y` |
| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |
| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |
| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light` |
| exposure | stops | `stops` |
| duration | seconds | `holdDuration` |
| count | a whole number | `sides`, `slats`, `columns`, `rows`, `samples` |
| seed | a whole number; the same seed draws the same pattern | `seed` |
| switch | `true` or `false` | `fade`, `inverted`, `outlineOnly`, `pushOut`, `radial` |
| curve | `[input, output]` points, 0 to 1 | `rgb`, `red`, `green`, `blue` |
| asset | `"asset:<id>"` from the manifest | `src` |
| choice | a string | `direction`, `curve` |

## `brightness`

Lightens or darkens the picture.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `contrast`

Pushes lights and darks apart, or pulls them together.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `saturation`

Makes colours richer or greyer.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `hue`

Turns every colour around the colour wheel.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `angle` | number | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `blur`

Softens the picture; the radius is the Gaussian's standard deviation, in pixels.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `radius` | number (0..200) | `4` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `vignette`

Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.

### Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `0.5` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `grain`

Adds moving film grain to a clip, a nested sequence, or everything beneath an adjustment.

### Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `0.2` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `shadow`

Casts a soft drop shadow behind the element's own shape.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `x` | number | `0` |
| `y` | number | `4` |
| `radius` | number (0..200) | `8` |
| `color` | string | `"#000000"` |
| `opacity` | number (0..1) | `0.5` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `grayscale`

Takes the colour out.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `sepia`

Tones the picture brown, like an old print.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `invert`

Turns the picture into its negative.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default |
|---|---|---|
| `amount` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `levels`

Sets the black point, the white point and the gamma between them.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `black` | number (0..1) | `0` |
| `white` | number (0..1) | `1` |
| `gamma` | number (0.01..10) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `lut`

Grades through a 3D lookup table from a `.cube` file.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `src` | string |  |
| `amount` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `exposure`

Brightens or darkens in stops, as a camera would.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `stops` | number (-5..5) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `vibrance`

Lifts the muted colours more than the strong ones.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `amount` | number (-1..1) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `whiteBalance`

Warms or cools the picture, and tints it toward green or magenta.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `temperature` | number (-1..1) | `0` |
| `tint` | number (-1..1) | `0` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `shadowsHighlights`

Opens up the shadows or holds back the highlights.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `shadows` | number (-1..1) | `0` |
| `highlights` | number (-1..1) | `0` |
| `radius` | number (0.5..200) | `10` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `duotone`

Maps the picture's brightness onto two colours.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `dark` | string | `"#1d2b53"` |
| `light` | string | `"#ffd27f"` |
| `amount` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `curves`

Reshapes the tones through curves, for all channels or each one.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `rgb` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `red` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `green` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |
| `blue` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `colorKey`

Makes one colour transparent: a green screen.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `color` | string | `"#00ff00"` |
| `tolerance` | number (0..1) | `0.3` |
| `softness` | number (0..1) | `0.1` |
| `spill` | number (0..1) | `0.5` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `regionBlur`

Blurs a box of the frame, to hide a face, a person, a plate or a screen.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `box` | [number, number, number, number] | `[0.25,0.25,0.5,0.5]` |
| `radius` | number (0..200) | `7` |
| `feather` | number (0..500) | `10` |
| `roundness` | number (0..1) | `0` |
| `inverted` | boolean | `false` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `cornerPin`

Moves the picture's four corners, to place it in a screen or a frame.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `topLeft` | [number, number] | `[0,0]` |
| `topRight` | [number, number] | `[1,0]` |
| `bottomRight` | [number, number] | `[1,1]` |
| `bottomLeft` | [number, number] | `[0,1]` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `zoomBlur`

Streaks the picture out from a centre.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `length` | number (0..500) | `40` |
| `center` | [number, number] | `[0.5,0.5]` |
| `samples` | integer (1..64) | `24` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `chromaticAberration`

Splits red and blue apart, as a cheap lens does.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `distance` | number (0..100) | `4` |
| `angle` | number | `90` |
| `radial` | boolean | `false` |
| `center` | [number, number] | `[0.5,0.5]` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `glow`

Lights a halo around the bright parts.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `radius` | number (0..200) | `7` |
| `intensity` | number (0..4) | `1` |
| `threshold` | number (0..1) | `0` |
| `color` | string | `"#ffffff"` |
| `tint` | number (0..1) | `1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `outline`

Draws a line around the element's shape.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `width` | number (0..64) | `8` |
| `color` | string | `"#ffffff"` |
| `opacity` | number (0..1) | `1` |
| `outlineOnly` | boolean | `false` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `longShadow`

Extrudes a long, hard shadow from the element's shape.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `length` | number (0..2000) | `240` |
| `angle` | number | `135` |
| `color` | string | `"#777777"` |
| `opacity` | number (0..1) | `1` |
| `fade` | boolean | `false` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `bevel`

Gives the element's shape a raised, lit edge.

### Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `size` | number (0..200) | `1.5` |
| `angle` | number | `-60` |
| `amount` | number (0..1) | `0.4` |
| `highlight` | string | `"#ffffff"` |
| `shade` | string | `"#000000"` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `crossfade`

Fades one clip into the next.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `curve` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"ease"` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `dipToBlack`

Fades out to black, then in to the next clip.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `holdDuration` | number (0..30) | `0.1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `dipToWhite`

Fades out to white, then in to the next clip.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `holdDuration` | number (0..30) | `0.1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `wipe`

Wipes the next clip over the first, edge first.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `slide`

Slides the next clip in over the first.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |
| `pushOut` | boolean | `false` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `push`

Pushes the first clip out as the next comes in.

### Params

Drawn without a shader.

| param | type | default |
|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `iris`

Opens the next clip through a growing circle, polygon or star.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `sides` | integer (0..64) | `0` |
| `star` | number (0..0.95) | `0` |
| `rotation` | number | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `feather` | number (0..200) | `2` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `clockWipe`

Sweeps the next clip in around a centre, like a clock hand.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `startAngle` | number | `0` |
| `direction` | "clockwise" \| "counterclockwise" \| "both" | `"clockwise"` |
| `center` | [number, number] | `[0.5,0.5]` |
| `softness` | number (0..1) | `0.002778` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `blinds`

Opens the next clip through turning slats.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `slats` | integer (1..100) | `12` |
| `angle` | number | `90` |
| `softness` | number (0..1) | `0.1` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `filmBurn`

Burns through the film into the next clip.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `seed` | integer (0..4294967295) | `0` |
| `center` | [number, number] | `[0.5,0.5]` |
| `size` | number (4..2000) | `120` |
| `edge` | number (0..500) | `24` |
| `color` | string | `"#ff7a1a"` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `pixelDissolve`

Dissolves into the next clip square by square.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `columns` | integer (1..200) | `16` |
| `rows` | integer (1..200) | `9` |
| `seed` | integer (0..4294967295) | `0` |
| `softness` | number (0..1) | `0.15` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)

## `zoom`

Zooms through the first clip into the next, with a blur.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default |
|---|---|---|
| `center` | [number, number] | `[0.5,0.5]` |
| `scale` | number (1..4) | `1.6` |
| `blur` | number (0..1) | `0.5` |

[All effects and transitions](https://prefix-tree.github.io/cutcraft/reference/effects/) · [Units](https://prefix-tree.github.io/cutcraft/reference/effects/#units)
