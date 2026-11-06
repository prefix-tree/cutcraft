# Titles and graphics

For the common cases there are ready-made elements: `<Title>` for text, `<Shape>` and `<Svg>` for vector art,
`<Sticker>` for icons. Animated pieces like lower thirds, callouts and counters are free code: a `<Motion>` sequence,
a `<Three>` scene or a `<Layer>` of React (`<Graphic>` drew them before and is deprecated). Their props show up in an
editor's inspector, and they take colours and fonts from the [theme](./themes). When none of them fits, write
[free code](./free-code).

```tsx
<Track id="overlays">
  <Title id="title" anchor="start" offset={0.3} duration={2.2} style="h1" animation={{ preset: "word-by-word" }}>
    Cut by words
  </Title>
  <Motion id="who" anchor="close" offset={0.4} duration={2.6}
    sequence={[[".name", { opacity: [0, 1], x: [-20, 0] }, { duration: 0.4 }]]}>
    <div className="name" style={{ position: "absolute", left: 64, bottom: 80, font: "700 40px Inter" }}>Bohdan Snisar</div>
  </Motion>
  <Shape id="card" anchor="close" duration={3} shape="rectangle" width={720} height={180} style="card" />
</Track>
```

Each of them is placed in time like any overlay (see [Time by meaning](./time#overlays-anchor)), takes a `transform`
for position, scale, rotation and opacity, and can have `<Keyframe>` children.

## Entrances and exits

Titles, shapes, SVG, stickers and layers take `enter` and `exit`, each `{ type, duration, easing }`, played at the
element's start or end:

| Type | |
|---|---|
| `fade` | Fades in or out. |
| `slide-left`, `slide-right`, `slide-up`, `slide-down` | Slides by a quarter of the element's size, at most 160 px. |
| `scale`, `rotate`, `pop`, `bounce`, `elastic` | Grows, turns or springs into place. |
| `flip-horizontal`, `flip-vertical` | Flips around an axis. |
| `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down`, `reveal-center`, `reveal-edges` | Uncovers the element. |
| `draw` | Draws a shape's or an SVG's strokes, then fades its fills in. Other elements fade. |

```tsx
<Title id="kicker" start={0.5} duration={3} enter={{ type: "slide-up", duration: 0.4 }} exit={{ type: "fade", duration: 0.3 }}>
  NEW
</Title>
```

## Titles

A `<Title>` draws text in the theme's type. `style` picks a preset from the theme (`h1`, `h2`, `kicker`, `note` and
any you define), and `size`, `weight`, `color` and the rest override it. `animation` builds the text in by letter,
word or line. [`<Title>`](/reference/elements/title) lists every prop.

## Glow, outline, long shadow and bevel

Four effects shape a title, a shape, a sticker or a `<Layer>` by its silhouette. Write them inside the element, like
any `<Effect>`; they work on clips too.

```tsx
<Title id="headline" start={0} duration={4} size={120} color="#ffd166">
  Launch day
  <Effect id="glow" type="glow" params={{ radius: 24, color: "#ff9f1c", intensity: 1.5 }} />
</Title>
```

- `glow` lights the area around the element: `radius` in pixels, `intensity` (up to 4), `color`, and `tint` (1 is all
  `color`, 0 keeps the element's own colours, a bloom). `threshold` (0 to 1) makes only the bright parts glow, which
  suits footage.
- `outline` draws a band of `width` pixels (up to 64) around the shape in `color`, under it. `outlineOnly` draws the
  grown silhouette alone, filled.
- `longShadow` sweeps the shape back along `angle` (degrees clockwise from the right, 45 falls down and right) for
  `reach` pixels, in `color`. Overlapping parts never stack, and `fade` thins it toward the far end.
- `bevel` lights the shape as if raised: `size` is the width of the slope in pixels, `angle` where the light comes from
  (degrees clockwise from above), and `intensity` how strongly edges take `highlight` or `shade`.

They draw through the overlay's picture, which the preview needs Chrome's `chrome://flags/#canvas-draw-element` flag
for. Without it the preview shows `glow` as a coloured shadow and leaves the other three out; the export always draws
them. For a plain offset shadow, the CSS `shadow` effect needs no flag.

## Graphics

::: warning Deprecated
`<Graphic kind="…">` (34 ready-made graphics: arrows, callouts, lower thirds, counters, backgrounds, confetti…) is
deprecated and will be removed in a later release; the lint warns on each one.
:::

Write graphics as free code instead: a `<Motion>` lower third or callout, an SVG chart animated by Motion, a counter
as a few lines of React in a `<Layer>`, confetti or a 3D product in a `<Three>` scene. The [examples](/examples) show
each one next to its file, and [Free code](./free-code) explains the tags.

## Shapes

A `<Shape>` is a rectangle, circle, star, polygon or path with a solid or gradient fill (`linear` at a CSS angle, or
`radial`), a stroke with dashes, caps and joins, one corner radius or one per corner (`cornerRadii`), and drop
shadows (`shadow` or `shadows`). Inset shadows and conic gradients on shapes are not drawn, and you get a warning.
The composition's `background` can be a gradient too.

## SVG

`<Svg>` draws inline `content` or an SVG asset. Before it is drawn, the SVG is cleaned up the same way in the player
and in the export:

- Scripts, `foreignObject`, event attributes and links to other files are removed, with one warning each. A `#id`
  link and an embedded PNG, JPEG, GIF or WebP stay.
- It draws at the size it asks for (its `width` and `height`, or its `viewBox`), centred. `fit="contain"` or
  `fit="cover"` scales it to the frame, and the element's own `viewBox` and `preserveAspectRatio` win over the file's.
- Ids inside it are renamed per element, so two copies of one icon never share a gradient.
- `$name` and `var(--cc-name)` in attributes and styles take their value from the theme.
- A `color` prop recolours it: `mode: "replace"` paints every drawn pixel in its `tint`, `mode: "tint"` keeps the
  shading and colours it, and `opacity` sets how much.

SMIL animation plays on the element's own clock, so it scrubs exactly. `<animate>`, `<set>`, `<animateTransform>` and
`<animateColor>` are supported with `values`, `from`/`to`/`by`, `keyTimes`, `keySplines`, linear, discrete, spline
and paced timing, offset `begin` and `end` (or `id.begin` and `id.end`), `dur`, `repeatCount`, `repeatDur`,
`fill="freeze"`, `additive` and `accumulate`. Begins on events or `indefinite` and `<animateMotion>` are left out with
a warning, and CSS animations inside an SVG are removed with a warning. For anything more, use a Layer.

Text in an SVG uses one of the bundled fonts or a generic family. Any other family is drawn in sans-serif in the
export.
