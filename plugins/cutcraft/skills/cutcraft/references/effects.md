# Effects and transitions

Every built-in effect and transition, with its params and defaults. Generated from the code by `scripts/gen-docs.ts`; do not edit.

### Units

A param's name says what kind of value it is, and each kind has one scale:

| Kind | Scale | Params |
|---|---|---|
| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint`, `temperature`, `shadows`, `highlights`, `threshold`, `spill`, `black`, `white`, `blur`, `roundness`, `star`, `thickness`, `spread` (of the frame's diagonal) |
| gain | a multiplier | `intensity`, `scale`, `contrast` |
| exponent | a power, 1 changes nothing | `gamma` |
| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `spacing`, `edge`, `x`, `y` |
| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |
| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |
| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light`, `ink`, `paper` |
| exposure | stops | `stops` |
| duration | seconds | `holdDuration` |
| rate | per second: pixels for `speed`, changes of the pattern for `evolution` | `speed`, `evolution` |
| count | a whole number | `sides`, `slats`, `columns`, `rows`, `samples`, `octaves` |
| seed | a whole number; the same seed draws the same pattern | `seed` |
| switch | `true` or `false` | `fade`, `inverted`, `outlineOnly`, `pushOut`, `radial` |
| curve | `[input, output]` points, 0 to 1 | `rgb`, `red`, `green`, `blue` |
| asset | `"asset:<id>"` from the manifest | `src` |
| choice | a string | `direction`, `curve`, `mode`, `blend` |

## `brightness`

Lightens or darkens the picture.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How much lighter or darker: -1 is black, 0 leaves the picture as it was, 1 doubles its brightness. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `contrast`

Pushes lights and darks apart, or pulls them together.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How far lights and darks move apart: -1 is flat grey, 0 leaves the picture as it was, 1 doubles the contrast. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `saturation`

Makes colours richer or greyer.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How much richer or greyer the colours get: -1 is grey, 0 leaves the picture as it was, 1 doubles the saturation. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `hue`

Turns every colour around the colour wheel.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `angle` | number | `0` | How far every colour turns around the colour wheel, in degrees. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `blur`

Softens the picture; the radius is the Gaussian's standard deviation, in pixels.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `radius` | number (0..200) | `4` | How soft the picture gets, in pixels: the Gaussian's standard deviation, as CSS `blur()` reads it. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `vignette`

Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.

### Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `0.5` | How dark the edges get: 0 leaves them as they were, 1 fades the corners to black. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `grain`

Adds moving film grain to a clip, a nested sequence, or everything beneath an adjustment.

### Params

Drawn as painting on the element's pixels; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `0.2` | How strong the grain is: 0 is none, 1 is specks of solid black and white. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `shadow`

Casts a soft drop shadow behind the element's own shape.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `x` | number | `0` | How far the shadow falls to the right, in pixels; negative falls left. |
| `y` | number | `4` | How far the shadow falls down, in pixels; negative falls up. |
| `radius` | number (0..200) | `8` | How soft the shadow's edge is, in pixels: the blur's standard deviation. |
| `color` | string | `"#000000"` | The shadow's colour. |
| `opacity` | number (0..1) | `0.5` | How dark the shadow is: 0 is invisible, 1 is solid colour. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `grayscale`

Takes the colour out.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `1` | How much colour to take out: 0 leaves the picture as it was, 1 is fully grey. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `sepia`

Tones the picture brown, like an old print.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `1` | How much to tone the picture brown: 0 leaves it as it was, 1 is full sepia. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `invert`

Turns the picture into its negative.

### Params

Drawn as a CSS filter; no WebGL needed.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (0..1) | `1` | How far to turn the picture into its negative: 0 leaves it as it was, 0.5 is flat grey, 1 is the full negative. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `levels`

Sets the black point, the white point and the gamma between them.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `black` | number (0..1) | `0` | The input level that becomes black: tones at or below it go to black. |
| `white` | number (0..1) | `1` | The input level that becomes white: tones at or above it go to white. |
| `gamma` | number (0.01..10) | `1` | The curve on the midtones: above 1 lifts them, below 1 deepens them. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `lut`

Grades through a 3D lookup table from a `.cube` file.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `src` | string |  | The lookup table, as `"asset:<id>"`: a `.cube` file in the manifest. |
| `amount` | number (0..1) | `1` | How much of the graded picture to mix in: 0 leaves the picture as it was, 1 is the full grade. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `exposure`

Brightens or darkens in stops, as a camera would.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `stops` | number (-5..5) | `0` | How much brighter or darker, in stops: +1 doubles the light, -1 halves it. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `vibrance`

Lifts the muted colours more than the strong ones.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `amount` | number (-1..1) | `0` | How much to saturate the muted colours, leaving strong ones nearly alone; negative takes colour out of all of them evenly. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `whiteBalance`

Warms or cools the picture, and tints it toward green or magenta.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `temperature` | number (-1..1) | `0` | Warms the picture when positive and cools it when negative. |
| `tint` | number (-1..1) | `0` | Tints the picture toward magenta when positive and toward green when negative. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `shadowsHighlights`

Opens up the shadows or holds back the highlights.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `shadows` | number (-1..1) | `0` | How much to brighten the shadows, or darken them when negative: up to 2 stops at 1. |
| `highlights` | number (-1..1) | `0` | How much to brighten the highlights, or darken them when negative: up to 2 stops at 1. |
| `radius` | number (0.5..200) | `10` | How far around each pixel it looks to tell shadow from highlight, in pixels: the blur's standard deviation. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `duotone`

Maps the picture's brightness onto two colours.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `dark` | string | `"#1d2b53"` | The colour the picture's blacks become. |
| `light` | string | `"#ffd27f"` | The colour the picture's whites become. |
| `amount` | number (0..1) | `1` | How much of the effect to mix in: 0 leaves the picture as it was, 1 is the full effect. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `curves`

Reshapes the tones through curves, for all channels or each one.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `rgb` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for all three channels, applied first: `[input, output]` points, input rising. |
| `red` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the red channel, applied after `rgb`. |
| `green` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the green channel, applied after `rgb`. |
| `blue` | [number (0..1), number (0..1)][] | `[[0,0],[1,1]]` | The tone curve for the blue channel, applied after `rgb`. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `colorKey`

Makes one colour transparent: a green screen.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `color` | string | `"#00ff00"` | The colour to key out: the screen's colour. |
| `tolerance` | number (0..1) | `0.3` | How far a colour may lie from the key colour and still be removed fully. |
| `softness` | number (0..1) | `0.1` | How wide the fade is between removed and kept colours, past `tolerance`. |
| `spill` | number (0..1) | `0.5` | How much of the screen's light bounced onto the subject to take out: 0 keeps it, 1 removes it fully. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `regionBlur`

Blurs a box of the frame, to hide a face, a person, a plate or a screen.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `box` | [number, number, number (> 0), number (> 0)] | `[0.25,0.25,0.5,0.5]` | The box to blur, as `[x, y, width, height]` fractions of the frame from the top left. |
| `radius` | number (0..200) | `7` | How strong the blur is, in pixels: the Gaussian's standard deviation. |
| `feather` | number (0..500) | `10` | How far in from the box's edge the blur fades in, in pixels. |
| `roundness` | number (0..1) | `0` | How round the box's corners are: 0 is square, 1 rounds the short side fully. |
| `inverted` | boolean | `false` | Blur everything outside the box instead of inside it. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `cornerPin`

Moves the picture's four corners, to place it in a screen or a frame.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `topLeft` | [number, number] | `[0,0]` | Where the picture's top-left corner goes, as `[x, y]` fractions of the frame from the top left. |
| `topRight` | [number, number] | `[1,0]` | Where the picture's top-right corner goes, as `[x, y]` fractions of the frame from the top left. |
| `bottomRight` | [number, number] | `[1,1]` | Where the picture's bottom-right corner goes, as `[x, y]` fractions of the frame from the top left. |
| `bottomLeft` | [number, number] | `[0,1]` | Where the picture's bottom-left corner goes, as `[x, y]` fractions of the frame from the top left. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `zoomBlur`

Streaks the picture out from a centre.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `length` | number (0..500) | `40` | How long the streaks are at the corners, in pixels; they shorten toward the centre. |
| `center` | [number, number] | `[0.5,0.5]` | The point the streaks run toward, as `[x, y]` fractions of the frame from the top left. |
| `samples` | integer (1..64) | `24` | The most reads along each streak: more is smoother and slower. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `chromaticAberration`

Splits red and blue apart, as a cheap lens does.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `distance` | number (0..100) | `4` | How far red and blue split from green, in pixels; with `radial`, the split at the corners. |
| `angle` | number | `90` | The direction of the split, in degrees clockwise from up: 90 splits sideways. Unused with `radial`. |
| `radial` | boolean | `false` | Split outward from `center`, growing toward the edges as a lens does, instead of along `angle`. |
| `center` | [number, number] | `[0.5,0.5]` | Where a radial split points out from, as `[x, y]` fractions of the frame from the top left. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `glow`

Lights a halo around the bright parts.

### Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `radius` | number (0..200) | `7` | How far the glow spreads, in pixels: the blur's standard deviation. |
| `intensity` | number (0..4) | `1` | How strong the glow is, as a multiplier. |
| `threshold` | number (0..1) | `0` | The brightness the glow starts from: 0 glows the whole element; above it only the bright parts glow, with a bloom over them. |
| `color` | string | `"#ffffff"` | The colour the glow is tinted toward. |
| `tint` | number (0..1) | `1` | How far the glow is coloured toward `color`: 0 keeps the element's own colours, 1 is all `color`. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `outline`

Draws a line around the element's shape.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `width` | number (0..64) | `8` | How thick the outline is, in pixels. |
| `color` | string | `"#ffffff"` | The outline's colour. |
| `opacity` | number (0..1) | `1` | How opaque the outline is: 0 is invisible, 1 is solid. |
| `outlineOnly` | boolean | `false` | Draw only the outline, filled in, without the element over it. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `longShadow`

Extrudes a long, hard shadow from the element's shape.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `length` | number (0..2000) | `240` | How far the shadow reaches, in pixels. |
| `angle` | number | `135` | The direction the shadow falls, in degrees clockwise from up: 135 falls down and right. |
| `color` | string | `"#777777"` | The shadow's colour. |
| `opacity` | number (0..1) | `1` | How opaque the shadow is: 0 is invisible, 1 is solid. |
| `fade` | boolean | `false` | Thin the shadow out toward its far end. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `bevel`

Gives the element's shape a raised, lit edge.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (0..200) | `1.5` | How wide the raised edge is, in pixels: the standard deviation of the blur that shapes it. |
| `angle` | number | `-60` | Where the light comes from, in degrees clockwise from up. |
| `amount` | number (0..1) | `0.4` | How strong the shading is: 0 leaves the element as it was, 1 is the full highlight and shade. |
| `highlight` | string | `"#ffffff"` | The colour of the edges facing the light. |
| `shade` | string | `"#000000"` | The colour of the edges facing away from the light. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `halftone`

Prints the picture as a screen of dots, in one ink or four.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (2..200) | `8` | How big each dot's cell is, in pixels. |
| `angle` | number | `45` | How far the dot grid is turned, in degrees. In `cmyk` it is the black screen's angle, and the others are set from it. |
| `mode` | "mono" \| "cmyk" | `"mono"` | `mono` prints `ink` on `paper` by brightness; `cmyk` prints cyan, magenta, yellow and black dots, each on its own screen. |
| `ink` | string | `"#111111"` | The colour of the dots in `mono`. |
| `paper` | string | `"#ffffff"` | The colour under the dots. |
| `amount` | number (0..1) | `1` | How much of the effect to mix in: 0 leaves the picture as it was, 1 is the full effect. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `pixelate`

Turns the picture, or a box of it, into a coarse mosaic.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (1..200) | `12` | How big each mosaic cell is, in pixels; 1 leaves the picture as it was. |
| `box` | [number, number, number (> 0), number (> 0)] | `[0,0,1,1]` | The part of the frame to pixelate, as `[x, y, width, height]` fractions of the frame from the top left. |
| `feather` | number (0..500) | `0` | How far in from the box's edge the mosaic fades in, in pixels. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `scanlines`

Lays the dark lines of an old screen over the picture.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `spacing` | number (2..200) | `4` | The distance from one line to the next, in pixels. |
| `thickness` | number (0..1) | `0.5` | How much of the space between lines each dark line covers. |
| `intensity` | number (0..1) | `0.35` | How dark the lines are: 0 is invisible, 1 is black. |
| `speed` | number (-2000..2000) | `0` | How fast the lines roll across the picture, in pixels per second. |
| `angle` | number | `0` | How far the lines are turned, in degrees: 0 is horizontal, 90 vertical. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `lightLeak`

Washes warm light in from the edges, as light leaking into a film camera.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `color` | string | `"#ff8a3d"` | The colour of the light. |
| `intensity` | number (0..1) | `0.6` | How bright the light is: the most it lightens the picture. |
| `spread` | number (0.05..2) | `0.6` | How far each bloom of light spreads, as a share of the frame's diagonal. |
| `evolution` | number (0..10) | `0.15` | How fast the light wanders and pulses, in changes per second. |
| `seed` | integer (0..∞) | `0` | Picks the pattern; the same seed draws the same light. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `fractalNoise`

Blends a moving cloud of noise over the picture: mist, smoke or texture.

### Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `size` | number (2..2000) | `160` | How big the noise's features are, in pixels. |
| `octaves` | integer (1..8) | `5` | How many layers of finer detail the noise has. |
| `evolution` | number (0..10) | `0.2` | How fast the pattern changes in place, in changes per second. |
| `contrast` | number (0..10) | `1` | How far the noise is stretched from mid-grey, as a multiplier. |
| `color` | string | `"#ffffff"` | The colour the noise is tinted with. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "softLight" | `"overlay"` | How the noise is blended onto the picture, as a W3C blend mode. |
| `opacity` | number (0..1) | `0.5` | How much of the blended noise to mix in: 0 leaves the picture as it was, 1 is the full blend. |
| `seed` | integer (0..∞) | `0` | Picks the pattern; the same seed draws the same noise. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `crossfade`

Fades one clip into the next.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `curve` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"ease"` | How the fade eases over its duration. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `dipToBlack`

Fades out to black, then in to the next clip.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `holdDuration` | number (0..30) | `0.1` | How long the picture holds at full black around the middle, in seconds. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `dipToWhite`

Fades out to white, then in to the next clip.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `holdDuration` | number (0..30) | `0.1` | How long the picture holds at full white around the middle, in seconds. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `wipe`

Wipes the next clip over the first, edge first.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` | The way the wipe's edge travels: `left` reveals the next clip from the right edge. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `slide`

Slides the next clip in over the first.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` | The way the next clip moves in: `left` brings it in from the right. |
| `pushOut` | boolean | `false` | Push the outgoing clip out the same way, instead of leaving it in place under the next one. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `push`

Pushes the first clip out as the next comes in.

### Params

Drawn without a shader.

| param | type | default | description |
|---|---|---|---|
| `direction` | "left" \| "right" \| "up" \| "down" | `"left"` | The way both clips move: `left` brings the next one in from the right and pushes the outgoing one out to the left. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `iris`

Opens the next clip through a growing circle, polygon or star.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `sides` | integer (0..64) | `0` | How many corners the shape has: below 3 it is a circle. |
| `star` | number (0..0.95) | `0` | How deep a star's points are: the inner corners' distance from the centre as a share of the outer ones'. 0 draws a plain polygon. |
| `rotation` | number | `0` | How far the shape is turned, in degrees clockwise. |
| `center` | [number, number] | `[0.5,0.5]` | Where the shape opens from, as `[x, y]` fractions of the frame from the top left. |
| `feather` | number (0..200) | `2` | How soft the shape's edge is, in pixels. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `clockWipe`

Sweeps the next clip in around a centre, like a clock hand.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `startAngle` | number | `0` | Where the sweep starts, in degrees clockwise from up. |
| `direction` | "clockwise" \| "counterclockwise" \| "both" | `"clockwise"` | Which way it sweeps: `clockwise`, `counterclockwise`, or `both` ways at once. |
| `center` | [number, number] | `[0.5,0.5]` | The point it sweeps around, as `[x, y]` fractions of the frame from the top left. |
| `softness` | number (0..1) | `0.002778` | How soft the moving edge is, as a share of a full turn. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `blinds`

Opens the next clip through turning slats.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `slats` | integer (1..100) | `12` | How many slats cross the frame. |
| `angle` | number | `90` | The direction the slats open in, in degrees clockwise from up: 90 opens them sideways, as vertical slats. |
| `softness` | number (0..1) | `0.1` | How soft each opening edge is, as a share of a slat. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `filmBurn`

Burns through the film into the next clip.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `seed` | integer (0..4294967295) | `0` | Picks the ragged pattern; the same seed burns the same way. |
| `center` | [number, number] | `[0.5,0.5]` | Where the burn starts, as `[x, y]` fractions of the frame from the top left. |
| `size` | number (4..2000) | `120` | How big the burn's ragged features are, in pixels. |
| `edge` | number (0..500) | `24` | How wide the glowing band ahead of the hole is, in pixels. |
| `color` | string | `"#ff7a1a"` | The colour of the glowing band. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `pixelDissolve`

Dissolves into the next clip square by square.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `columns` | integer (1..200) | `16` | How many blocks across the frame. |
| `rows` | integer (1..200) | `9` | How many blocks down the frame. |
| `seed` | integer (0..4294967295) | `0` | Picks the order the blocks switch in; the same seed switches them the same way. |
| `softness` | number (0..1) | `0.15` | How long each block takes to switch, as a share of the transition: 0 switches each at once. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)

## `zoom`

Zooms through the first clip into the next, with a blur.

### Params

Drawn by a shader, as a crossfade where WebGL is missing.

| param | type | default | description |
|---|---|---|---|
| `center` | [number, number] | `[0.5,0.5]` | The point the clips zoom toward, as `[x, y]` fractions of the frame from the top left. |
| `scale` | number (1..4) | `1.6` | How far the clips zoom, as a multiplier: the outgoing clip grows to it and the next one shrinks from it. |
| `blur` | number (0..1) | `0.5` | How much the clips smear along the zoom, most at the middle: 0 is none. |

[All effects and transitions](https://cutcraft.prefixtree.xyz/reference/effects/) · [Units](https://cutcraft.prefixtree.xyz/reference/effects/#units)
