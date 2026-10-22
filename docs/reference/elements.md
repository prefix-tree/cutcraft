# Elements

Generated from the Zod schemas in `packages/kit/src/jsx/schemas` and the capabilities table. Do not edit by hand; run `pnpm docs:gen`.

## Capabilities

| element | timed | visual | audio | trims source | transformable | children allowed |
|---|---|---|---|---|---|---|
| `<Composition>` |  |  |  |  |  | `track`, `marker`, `multicam`, `captions` |
| `<Track>` |  |  |  |  |  | `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam` |
| `<Clip>` | yes | yes | yes | yes | yes | `effect`, `audioEffect`, `colorGrade`, `keyframe`, `mask`, `speedKey`, `freeze` |
| `<Audio>` | yes |  | yes | yes |  | `audioEffect`, `keyframe` |
| `<Gap>` | yes |  |  |  |  |  |
| `<Transition>` | yes | yes |  |  |  |  |
| `<Title>` | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| `<Shape>` | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| `<Svg>` | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| `<Sticker>` | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| `<Captions>` |  | yes |  |  |  | `caption` |
| `<Caption>` | yes | yes |  |  |  |  |
| `<Marker>` |  |  |  |  |  |  |
| `<Adjustment>` | yes | yes |  | yes |  | `effect`, `keyframe` |
| `<Mask>` |  |  |  |  |  | `keyframe` |
| `<Nested>` | yes | yes | yes | yes | yes | `effect`, `audioEffect`, `colorGrade`, `keyframe`, `mask`, `speedKey`, `freeze` |
| `<Multicam>` |  |  |  |  |  | `angle`, `cut` |
| `<Angle>` |  |  |  |  |  |  |
| `<Cut>` |  |  |  |  |  |  |
| `<Layer>` | yes | yes |  |  | yes | `keyframe` |
| `<Effect>` |  |  |  |  |  |  |
| `<AudioEffect>` |  |  |  |  |  |  |
| `<ColorGrade>` |  |  |  |  |  |  |
| `<Keyframe>` |  |  |  |  |  |  |
| `<SpeedKey>` |  |  |  |  |  |  |
| `<Freeze>` |  |  |  |  |  |  |

## `<Composition>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string | `"composition"` |  |
| `fps` | number (−∞..240) |  | yes |
| `width` | integer |  | yes |
| `height` | integer |  | yes |
| `sampleRate` | integer | `48000` |  |
| `channels` | integer | `2` |  |
| `background` | { mode, color } |  |  |

## `<Track>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `layout` | "sequence" \| "free" | `"sequence"` |  |
| `name` | string |  |  |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  |
| `locked` | boolean | `false` |  |
| `hidden` | boolean | `false` |  |
| `muted` | boolean | `false` |  |
| `solo` | boolean | `false` |  |
| `group` | string |  |  |

## `<Clip>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `src` | string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `speed` | number (0.1..20) | `1` |  |
| `reverse` | boolean | `false` |  |
| `pitchCorrection` | boolean | `false` |  |
| `audioTrack` | integer | `0` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |
| `smoothSlowMo` | boolean | `false` |  |
| `interpolation` | "low" \| "medium" \| "high" |  |  |
| `stabilize` | { enabled, strength, crop } |  |  |
| `chromaKey` | { enabled, color, tolerance, edgeSoftness, spillSuppression } |  |  |
| `behindSubject` | boolean | `false` |  |

## `<Audio>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `src` | string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `speed` | number (0.1..20) | `1` |  |
| `reverse` | boolean | `false` |  |
| `pitchCorrection` | boolean | `false` |  |
| `audioTrack` | integer | `0` |  |
| `volume` | number (0..4) |  |  |
| `fade` | { in, out } |  |  |
| `automation` | { volume, pan } |  |  |
| `duck` | { under, to, attack, release } |  |  |

## `<Gap>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `duration` | number |  | yes |

## `<Transition>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| "zoom" \| "push" \| "circleReveal" \| "blur" \| "whipPan" \| "radialWipe" \| "pixelate" \| "glitch" \| "blinds" \| "diamondReveal" \| "spin" \| "flip" \| "splitReveal" \| "flash" \| "filmBurn" \| "mosaic" \| "ripple" \| "pageTurn" \| "colorSplit" | `"crossfade"` |  |
| `duration` | number (0.001..30) | `0.5` |  |
| `params` | object | `{}` |  |
| `on` | string |  |  |
| `edge` | "in" \| "out" |  |  |

## `<Title>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `style` | string |  |  |
| `font` | string | `"Inter"` |  |
| `size` | number (1..1000) | `48` |  |
| `weight` | integer \| "normal" \| "bold" | `"bold"` |  |
| `italic` | boolean | `false` |  |
| `color` | string | `"#ffffff"` |  |
| `background` | string |  |  |
| `stroke` | { color, width } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` |  |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` |  |
| `lineHeight` | number (0.1..10) | `1.2` |  |
| `letterSpacing` | number (-100..100) | `0` |  |
| `decoration` | "none" \| "underline" \| "line-through" \| "overline" |  |  |
| `animation` | { preset, in, out, stagger, unit, params } |  |  |
| `text3d` | { enabled, depth, bevelThickness, bevelSize, bevelSegments, frontColor, sideColor, metalness, roughness, material } |  |  |
| `behindSubject` | boolean | `false` |  |

## `<Shape>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `shape` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| "line" \| "polygon" \| "path" \| "star" |  | yes |
| `width` | number |  |  |
| `height` | number |  |  |
| `points` | { x, y }[] |  |  |
| `fill` | string \| { type, color, gradient, opacity } |  |  |
| `stroke` | { color, width, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  |
| `shadow` | { color, blur, x, y, spread, inset } |  |  |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  |
| `cornerRadius` | number (0..∞) |  |  |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  |
| `starPoints` | integer |  |  |
| `innerRadius` | number (0..1) |  |  |

## `<Svg>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `src` | string |  |  |
| `content` | string |  |  |
| `viewBox` | { minX, minY, width, height } |  |  |
| `preserveAspectRatio` | string |  |  |
| `color` | { mode, tint, opacity } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |

## `<Sticker>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `src` | string |  | yes |
| `category` | string |  |  |
| `name` | string |  |  |

## `<Captions>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  |  |
| `style` | { font, size, color, background, position, highlight, upcoming } |  |  |
| `animation` | "none" \| "word-highlight" \| "word-by-word" \| "karaoke" \| "bounce" \| "typewriter" | `"none"` |  |

## `<Caption>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) \| string |  | yes |
| `end` | number (0..∞) \| string |  | yes |
| `text` | string |  | yes |
| `words` | { text, start, end }[] |  |  |

## `<Marker>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) \| string |  | yes |
| `label` | string | `""` |  |
| `color` | string |  |  |

## `<Adjustment>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `affects` | "all" \| string[] | `"all"` |  |
| `opacity` | number (0..1) | `1` |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" | `"normal"` |  |
| `enabled` | boolean | `true` |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |

## `<Mask>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "shape" \| "drawn" \| "matte" | `"shape"` |  |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  |
| `path` | { points, closed } |  |  |
| `feather` | number (0..100) | `0` |  |
| `inverted` | boolean | `false` |  |
| `expansion` | number (-100..100) | `0` |  |
| `opacity` | number (0..1) | `1` |  |
| `easing` | "linear" \| "ease-in" \| "ease-out" \| "ease-in-out" | `"linear"` |  |
| `matte` | { source, channel } |  |  |

## `<Nested>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |
| `blendOpacity` | number (0..1) |  |  |
| `emphasis` | "none" \| "pulse" \| "shake" \| "bounce" \| "float" \| "spin" \| "flash" \| "heartbeat" \| "swing" \| "wobble" \| "jello" \| "rubber-band" \| "tada" \| "vibrate" \| "flicker" \| "glow" \| "breathe" \| "wave" \| "tilt" \| "zoom-pulse" \| "focus-zoom" \| "pan-left" \| "pan-right" \| "pan-up" \| "pan-down" \| "ken-burns" \| { type, speed, intensity, loop, focusPoint, zoomScale, holdDuration, startTime, animationDuration } |  |  |
| `of` | any \| string |  | yes |
| `in` | number (0..∞) \| string |  |  |
| `out` | number (0..∞) \| string |  |  |
| `volume` | number (0..4) | `1` |  |

## `<Multicam>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `name` | string |  |  |
| `sync` | number (0..∞) | `0` |  |
| `activeAngle` | string |  |  |

## `<Angle>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `src` | string |  | yes |
| `offset` | number | `0` |  |
| `color` | string |  |  |
| `name` | string |  |  |

## `<Cut>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) \| string |  | yes |
| `angle` | string |  | yes |

## `<Layer>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | string \| "start" |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| "lighten" \| "color-dodge" \| "color-burn" \| "hard-light" \| "soft-light" \| "difference" \| "exclusion" \| "hue" \| "saturation" \| "color" \| "luminosity" \| "add" \| "linear-dodge" |  |  |

## `<Effect>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "brightness" \| "contrast" \| "saturation" \| "hue" \| "temperature" \| "tint" \| "blur" \| "sharpen" \| "vignette" \| "grain" \| "shadow" \| "glow" \| "motion-blur" \| "radial-blur" \| "chromatic-aberration" \| "grayscale" \| "sepia" \| "invert" \| "levels" \| "hue-saturation" |  | yes |
| `params` | object | `{}` |  |
| `enabled` | boolean | `true` |  |

## `<AudioEffect>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `type` | "gain" \| "pan" \| "eq" \| "compressor" \| "reverb" \| "delay" \| "noiseReduction" \| "fadeIn" \| "fadeOut" |  | yes |
| `params` | object | `{}` |  |
| `enabled` | boolean | `true` |  |

## `<ColorGrade>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `wheels` | { shadows, midtones, highlights, shadowsLift, midtonesGamma, highlightsGain } |  |  |
| `curves` | { rgb, red, green, blue } |  |  |
| `lut` | { src, intensity } |  |  |
| `hsl` | { hue, saturation, luminance } |  |  |
| `temperature` | number (-100..100) |  |  |
| `tint` | number (-100..100) |  |  |

## `<Keyframe>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `property` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `value` | any |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| "hold" \| "bezier" \| "smoothstep" \| "smootherstep" \| "snappy" \| "smooth" \| "easeInQuad" \| "easeOutQuad" \| "easeInOutQuad" \| "easeInCubic" \| "easeOutCubic" \| "easeInOutCubic" \| "easeInQuart" \| "easeOutQuart" \| "easeInOutQuart" \| "easeInQuint" \| "easeOutQuint" \| "easeInOutQuint" \| "easeInSine" \| "easeOutSine" \| "easeInOutSine" \| "easeInExpo" \| "easeOutExpo" \| "easeInOutExpo" \| "easeInCirc" \| "easeOutCirc" \| "easeInOutCirc" \| "easeInBack" \| "easeOutBack" \| "easeInOutBack" \| "easeInBackStrong" \| "easeOutBackStrong" \| "easeInOutBackStrong" \| "easeInElastic" \| "easeOutElastic" \| "easeInOutElastic" \| "easeInElasticSoft" \| "easeOutElasticSoft" \| "easeInOutElasticSoft" \| "easeInBounce" \| "easeOutBounce" \| "easeInOutBounce" \| "easeInBounceSmall" \| "easeOutBounceSmall" \| "easeInOutBounceSmall" | `"linear"` |  |
| `handles` | { in, out } |  |  |
| `roving` | boolean |  |  |

## `<SpeedKey>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `speed` | number (0.1..20) |  | yes |
| `easing` | "linear" \| "ease" \| "ease-in" \| "ease-out" \| "ease-in-out" \| "hold" \| "bezier" \| "smoothstep" \| "smootherstep" \| "snappy" \| "smooth" \| "easeInQuad" \| "easeOutQuad" \| "easeInOutQuad" \| "easeInCubic" \| "easeOutCubic" \| "easeInOutCubic" \| "easeInQuart" \| "easeOutQuart" \| "easeInOutQuart" \| "easeInQuint" \| "easeOutQuint" \| "easeInOutQuint" \| "easeInSine" \| "easeOutSine" \| "easeInOutSine" \| "easeInExpo" \| "easeOutExpo" \| "easeInOutExpo" \| "easeInCirc" \| "easeOutCirc" \| "easeInOutCirc" \| "easeInBack" \| "easeOutBack" \| "easeInOutBack" \| "easeInBackStrong" \| "easeOutBackStrong" \| "easeInOutBackStrong" \| "easeInElastic" \| "easeOutElastic" \| "easeInOutElastic" \| "easeInElasticSoft" \| "easeOutElasticSoft" \| "easeInOutElasticSoft" \| "easeInBounce" \| "easeOutBounce" \| "easeInOutBounce" \| "easeInBounceSmall" \| "easeOutBounceSmall" \| "easeInOutBounceSmall" | `"linear"` |  |

## `<Freeze>`

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `at` | number (0..∞) |  | yes |
| `start` | number (0..∞) |  | yes |
| `duration` | number |  | yes |
