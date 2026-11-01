# Graphics

The built-in kinds of `<Graphic>`, generated from `packages/graphics`. Do not edit by hand; run `pnpm docs:gen` (and `pnpm docs:graphics` for the pictures).

Every graphic also takes the props on the [Graphic element](./elements#graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` to size its box. Colour and font defaults are theme tokens, so a graphic follows the theme unless you set them.

![Every kind in the midnight theme](/graphics/sheet.png)

## Arrows

### `arrow`

A straight arrow across its box, pointing right; turn it with `transform.rotation`.

![Arrow](/graphics/arrow.png)

```tsx
<Graphic id="g1" kind="arrow" thickness={12} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$primary"` |
| `thickness` | number (0..200) | `10` |
| `head` | "triangle" \| "open" \| "none" | `"triangle"` |
| `tail` | "none" \| "dot" | `"none"` |

### `curved-arrow`

An arrow that arcs from the bottom left to the bottom right of its box; `flip` arcs it downward.

![Curved arrow](/graphics/curved-arrow.png)

```tsx
<Graphic id="g1" kind="curved-arrow" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$primary"` |
| `thickness` | number (0..200) | `8` |
| `bend` | number (0..1) | `0.7` |
| `flip` | boolean | `false` |
| `head` | "triangle" \| "open" \| "none" | `"triangle"` |

### `hand-arrow`

A loose, marker-drawn arrow with a slight curve. The `draw` entrance traces it.

![Hand-drawn arrow](/graphics/hand-arrow.png)

```tsx
<Graphic id="g1" kind="hand-arrow" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..200) | `7` |
| `wobble` | number (0..50) | `5` |

## Callouts

### `callout`

Text in a rounded box with a pointer on one side; `tailAt` slides the pointer along that side (0 to 1).

![Callout](/graphics/callout.png)

```tsx
<Graphic id="g1" kind="callout" text="New in 2.0" tail="bottom" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `text` | string | `"Look here"` |
| `color` | string | `"$text"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `36` |
| `weight` | integer | `700` |
| `fill` | string | `"$surface"` |
| `border` | string | `"none"` |
| `borderWidth` | number (0..50) | `0` |
| `radius` | number (0..∞) \| string | `"$radius"` |
| `tail` | "bottom" \| "top" \| "left" \| "right" \| "none" | `"bottom"` |
| `tailAt` | number (0..1) | `0.5` |

### `speech-bubble`

A round comic-style bubble with a tail to one side below it.

![Speech bubble](/graphics/speech-bubble.png)

```tsx
<Graphic id="g1" kind="speech-bubble" text="Hi there!" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `text` | string | `"Hi there!"` |
| `color` | string | `"#111111"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `36` |
| `weight` | integer | `700` |
| `fill` | string | `"#ffffff"` |
| `border` | string | `"#111111"` |
| `borderWidth` | number (0..50) | `4` |
| `tail` | "left" \| "right" | `"left"` |

### `badge`

A round badge with a short word or two, and a ring inside its edge.

![Badge](/graphics/badge.png)

```tsx
<Graphic id="g1" kind="badge" text="NEW" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `text` | string | `"NEW"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$heading"` |
| `size` | number (0..400) | `40` |
| `weight` | integer | `700` |
| `fill` | string | `"$accent"` |
| `ring` | boolean | `true` |

### `pill`

A fully rounded label, with an optional dot before the text (a live indicator, a status).

![Pill](/graphics/pill.png)

```tsx
<Graphic id="g1" kind="pill" text="Live" dot="#ff3b30" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `text` | string | `"Live"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `28` |
| `weight` | integer | `700` |
| `fill` | string | `"$primary"` |
| `dot` | string | `"none"` |

### `burst`

A starburst sticker with a word on it, for prices, offers and shouts.

![Burst](/graphics/burst.png)

```tsx
<Graphic id="g1" kind="burst" text="-50%" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `text` | string | `"SALE"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$heading"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |
| `fill` | string | `"$accent"` |
| `points` | integer | `18` |
| `depth` | number (0..1) | `0.16` |

## Lower thirds

### `lower-third`

A name and a role on a panel with an accent bar at its left edge. Place it low on the left with `transform.position`.

![Lower third](/graphics/lower-third.png)

```tsx
<Graphic id="g1" kind="lower-third" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `name` | string | `"Jane Doe"` |
| `role` | string | `"Founder, Shed"` |
| `accent` | string | `"$primary"` |
| `fill` | string | `"$surface"` |
| `color` | string | `"$text"` |
| `muted` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `roleFont` | string | `"$body"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |

### `lower-third-card`

A name and a role on a rounded card, with an accent dot before the name.

![Lower third card](/graphics/lower-third-card.png)

```tsx
<Graphic id="g1" kind="lower-third-card" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `name` | string | `"Jane Doe"` |
| `role` | string | `"Founder, Shed"` |
| `accent` | string | `"$primary"` |
| `fill` | string | `"$surface"` |
| `color` | string | `"$text"` |
| `muted` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `roleFont` | string | `"$body"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |
| `radius` | number (0..∞) \| string | `"$radius"` |

### `lower-third-split`

The name on an accent block and the role on a panel below it, offset to the right.

![Lower third, split](/graphics/lower-third-split.png)

```tsx
<Graphic id="g1" kind="lower-third-split" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `name` | string | `"Jane Doe"` |
| `role` | string | `"Founder, Shed"` |
| `accent` | string | `"$primary"` |
| `fill` | string | `"$surface"` |
| `color` | string | `"$text"` |
| `muted` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `roleFont` | string | `"$body"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |
| `onAccent` | string | `"$onPrimary"` |

## Frames

### `corner-brackets`

Four corner marks framing a region, like a viewfinder. Size it to the region it frames.

![Corner brackets](/graphics/corner-brackets.png)

```tsx
<Graphic id="g1" kind="corner-brackets" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$primary"` |
| `thickness` | number (0..100) | `8` |
| `length` | number (0..0.5) | `0.16` |

### `frame`

A rounded border around a region, solid or dashed.

![Frame](/graphics/frame.png)

```tsx
<Graphic id="g1" kind="frame" dashed={true} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$primary"` |
| `thickness` | number (0..100) | `6` |
| `radius` | number (0..∞) \| string | `"$radius"` |
| `dashed` | boolean | `false` |

### `device-frame`

A phone or a browser window drawn around an open screen; put footage under it on a lower track.

![Device frame](/graphics/device-frame.png)

```tsx
<Graphic id="g1" kind="device-frame" device="phone" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `device` | "phone" \| "browser" | `"browser"` |
| `color` | string | `"$surface"` |
| `detail` | string | `"$muted"` |

## Highlights

### `underline`

A hand-drawn underline to put under a word. The `draw` entrance writes it on.

![Underline scribble](/graphics/underline.png)

```tsx
<Graphic id="g1" kind="underline" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `8` |
| `wobble` | number (0..40) | `4` |
| `double` | boolean | `false` |

### `circle-scribble`

A loose hand-drawn loop around something, overshooting where it closes.

![Circle scribble](/graphics/circle-scribble.png)

```tsx
<Graphic id="g1" kind="circle-scribble" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `7` |
| `wobble` | number (0..60) | `6` |

### `marker`

A translucent highlighter stroke with ragged ends that sweeps across in `sweep` seconds (0 to show it at once). Put it under a title on a lower track. Animated.

![Marker highlight](/graphics/marker.png)

```tsx
<Graphic id="g1" kind="marker" sweep={0} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `opacity` | number (0..1) | `0.45` |
| `sweep` | number (0..30) | `0.5` |

### `strike`

A hand-drawn line through a word, slightly rising, to cross it out.

![Strike-through](/graphics/strike.png)

```tsx
<Graphic id="g1" kind="strike" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `8` |
| `wobble` | number (0..40) | `3` |

## Progress

### `progress-bar`

A bar that fills from `from` to `to` over the element's duration; give `value` to hold it still. Animated.

![Progress bar](/graphics/progress-bar.png)

```tsx
<Graphic id="g1" kind="progress-bar" value={0.62} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `value` | number (0..1) |  |
| `from` | number (0..1) | `0` |
| `to` | number (0..1) | `1` |
| `fill` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `rounded` | boolean | `true` |

### `countdown`

A ring that empties over the element's duration around the seconds left, counting down from `from` (default: the duration). Animated.

![Countdown](/graphics/countdown.png)

```tsx
<Graphic id="g1" kind="countdown" from={5} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `from` | integer |  |
| `color` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `textColor` | string | `"$text"` |
| `font` | string | `"$heading"` |
| `thickness` | number (0..200) | `14` |

### `steps`

A row of dots for steps in a sequence, the `active` one (1-based) filled and larger.

![Step dots](/graphics/steps.png)

```tsx
<Graphic id="g1" kind="steps" count={4} active={2} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `count` | integer | `5` |
| `active` | integer | `1` |
| `color` | string | `"$primary"` |
| `inactive` | string | `"$muted"` |
| `line` | boolean | `true` |

## Data

### `counter`

A number that counts from `from` to `to` over `countFor` seconds, with an optional prefix, suffix and caption under it. Animated.

![Counter](/graphics/counter.png)

```tsx
<Graphic id="g1" kind="counter" to={1250} suffix="+" label="customers" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `from` | number | `0` |
| `to` | number | `100` |
| `decimals` | integer | `0` |
| `prefix` | string | `""` |
| `suffix` | string | `""` |
| `label` | string | `""` |
| `countFor` | number (0..60) | `1.5` |
| `grouping` | boolean | `true` |
| `color` | string | `"$text"` |
| `labelColor` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `labelFont` | string | `"$body"` |

### `unit-grid`

`total` units in a grid with `filled` of them coloured, one by one over `fillFor` seconds: "7 in 10". A fractional `filled` colours part of the last unit. Animated.

![Unit grid](/graphics/unit-grid.png)

```tsx
<Graphic id="g1" kind="unit-grid" total={10} filled={7} label="7 in 10 viewers" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `total` | integer | `10` |
| `filled` | number (0..400) | `3` |
| `columns` | integer |  |
| `unit` | "person" \| "circle" \| "square" | `"person"` |
| `gap` | number (0..0.8) | `0.25` |
| `fillFor` | number (0..60) | `1` |
| `label` | string | `""` |
| `color` | string | `"$primary"` |
| `empty` | string | `"$surface"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

### `comparison`

Bars side by side for a few values, each with its label and value, growing over `growFor` seconds. `max` sets the scale (default: the largest value). Animated.

![Comparison](/graphics/comparison.png)

```tsx
<Graphic id="g1" kind="comparison" items={[{"label":"Manual edit","value":6,"color":"$muted"},{"label":"With cutcut","value":1.5}]} suffix=" h" decimals={1} start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `items` | { label, value, color }[] | `[{"label":"Before","value":40},{"label":"After","value":75}]` |
| `orientation` | "horizontal" \| "vertical" | `"horizontal"` |
| `max` | number |  |
| `showValues` | boolean | `true` |
| `decimals` | integer | `0` |
| `prefix` | string | `""` |
| `suffix` | string | `""` |
| `growFor` | number (0..60) | `1` |
| `color` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

### `sample-size`

A field of dots for a sample of `n`, with `share` of them highlighted, appearing over `appearFor` seconds. Past 1,000 each dot stands for several (`perDot`), and the note says so. The label may use `{n}` and `{share}`. Animated.

![Sample size](/graphics/sample-size.png)

```tsx
<Graphic id="g1" kind="sample-size" n={1200} share={0.38} label="{share} of {n} said yes" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `n` | integer | `1200` |
| `share` | number (0..1) |  |
| `perDot` | integer |  |
| `layout` | "grid" \| "scatter" | `"grid"` |
| `appearFor` | number (0..60) | `1.5` |
| `label` | string | `"n = {n}"` |
| `color` | string | `"$muted"` |
| `highlight` | string | `"$primary"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

## Dividers

### `divider`

A rule between things: a line, a dotted line, a line with a diamond, or a line that fades at its ends.

![Divider](/graphics/divider.png)

```tsx
<Graphic id="g1" kind="divider" variant="diamond" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `variant` | "line" \| "dots" \| "diamond" \| "fade" | `"line"` |
| `color` | string | `"$muted"` |
| `thickness` | number (0..100) | `4` |

## Backgrounds

### `gradient-background`

A full-frame linear or radial gradient between two colours. Put it on the lowest track.

![Gradient background](/graphics/gradient-background.png)

```tsx
<Graphic id="g1" kind="gradient-background" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `from` | string | `"$background"` |
| `to` | string | `"$primary"` |
| `type` | "linear" \| "radial" | `"linear"` |
| `angle` | number | `135` |

### `dots-background`

A full-frame grid of small dots on a solid colour; `drift` scrolls it (pixels per second). Animated.

![Dot grid background](/graphics/dots-background.png)

```tsx
<Graphic id="g1" kind="dots-background" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `background` | string | `"$background"` |
| `color` | string | `"$muted"` |
| `gap` | number (0..400) | `40` |
| `radius` | number (0..100) | `3` |
| `opacity` | number (0..1) | `0.5` |
| `drift` | number (-1000..1000) | `0` |

### `grid-background`

A full-frame grid of thin lines on a solid colour, like graph paper.

![Grid background](/graphics/grid-background.png)

```tsx
<Graphic id="g1" kind="grid-background" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `background` | string | `"$background"` |
| `color` | string | `"$muted"` |
| `gap` | number (0..800) | `80` |
| `thickness` | number (0..20) | `1` |
| `opacity` | number (0..1) | `0.25` |

### `waves-background`

Three soft waves in the palette's colours across the bottom of the frame, rising to `level` (a fraction of the height) and drifting at `speed`. Animated.

![Waves background](/graphics/waves-background.png)

```tsx
<Graphic id="g1" kind="waves-background" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `background` | string | `"$background"` |
| `colors` | string[] | `["$primary","$secondary","$accent"]` |
| `level` | number (0..1) | `0.45` |
| `speed` | number (0..10) | `0.3` |

### `blobs-background`

Large blurred colour fields that drift slowly: a soft, modern backdrop. `seed` picks another arrangement. Animated.

![Blobs background](/graphics/blobs-background.png)

```tsx
<Graphic id="g1" kind="blobs-background" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `background` | string | `"$background"` |
| `colors` | string[] | `["$primary","$secondary","$accent"]` |
| `blur` | number (0..400) | `120` |
| `speed` | number (0..10) | `0.2` |
| `seed` | integer |  |

## Effects

### `confetti`

Confetti thrown up from the bottom centre that tumbles down across the frame over the element's duration. Animated.

![Confetti](/graphics/confetti.png)

```tsx
<Graphic id="g1" kind="confetti" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `colors` | string[] | `["$primary","$secondary","$accent"]` |
| `count` | integer | `90` |
| `spread` | number (0..1) | `0.7` |
| `seed` | integer |  |

### `sparkles`

Four-pointed stars that twinkle in and out across the box. Size the box to the area that should sparkle. Animated.

![Sparkles](/graphics/sparkles.png)

```tsx
<Graphic id="g1" kind="sparkles" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `colors` | string[] | `["#ffffff","$accent"]` |
| `count` | integer | `14` |
| `size` | number (2..400) | `28` |
| `speed` | number (0..10) | `1.2` |
| `seed` | integer |  |

## Icons

### `icon`

One of Lucide's line icons by name (`check`, `arrow-right`, `sparkles`, `play`, …), stroked in `color`, on an optional round or square plate.

![Icon](/graphics/icon.png)

```tsx
<Graphic id="g1" kind="icon" name="sparkles" plate="circle" start={0} duration={3} />
```

| prop | type | default |
|---|---|---|
| `name` | string |  |
| `color` | string | `"$text"` |
| `strokeWidth` | number (0.25..6) | `2` |
| `plate` | "none" \| "circle" \| "square" | `"none"` |
| `plateColor` | string | `"$surface"` |
