# Titles and graphics

This page covers what you draw over the footage: text, shapes, icons, images and ready-made pieces such as lower
thirds. Use it when a video needs a headline, a name card or a callout. For anything these don't cover, write
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

| To draw | Use |
|---|---|
| Text | [`<Title>`](#titles) |
| A rectangle, circle, star, polygon or path | [`<Shape>`](#shapes) |
| Vector art: an icon, a logo | [`<Svg>`](#svg) |
| An image: a PNG, SVG, WebP or GIF | [`<Sticker>`](/reference/elements/sticker) |
| A lower third, callout, counter, card… | A [ready-made component](#ready-made-components) |
| Anything else | [Free code](./free-code): a `<Motion>` sequence, a `<Three>` scene or a `<Layer>` of React |

All of them work the same way:

- They are placed in time like any overlay ([Timing](./time#overlays-anchor)).
- They take a `transform` for position, scale, rotation and opacity, and can have `<Keyframe>` children.
- They take colours and fonts from the [theme](./themes), and their props show up in an editor's inspector.

## Titles

A `<Title>` draws text in the theme's type.

```tsx
<Title id="title" start={0.3} duration={2.2} style="h1" animation={{ preset: "word-by-word" }}>
  Cut by words
</Title>
```

| Prop | Does |
|---|---|
| `style` | Picks a preset from the theme: `h1`, `h2`, `kicker`, `note`, and any you define. |
| `size`, `weight`, `color`… | Override the preset. |
| `animation` | Builds the text in by letter or by word, or fades, slides or scales it in. |

[`<Title>`](/reference/elements/title) lists every prop.

## Entrances and exits

`enter` and `exit` play a ready-made move at the element's start or end. Titles, shapes, SVG, stickers and layers
take them, each as `{ type, duration, easing }`.

```tsx
<Title id="kicker" start={0.5} duration={3} enter={{ type: "slide-up", duration: 0.4 }} exit={{ type: "fade", duration: 0.3 }}>
  NEW
</Title>
```

| Type | Does |
|---|---|
| `fade` | Fades in or out. |
| `slide-left`, `slide-right`, `slide-up`, `slide-down` | Slides by a quarter of the element's size, at most 160 px. |
| `scale`, `rotate`, `pop`, `bounce`, `elastic` | Grows, turns or springs into place. |
| `flip-horizontal`, `flip-vertical` | Flips around an axis. |
| `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down`, `reveal-center`, `reveal-edges` | Uncovers the element. |
| `draw` | Draws a shape's or an SVG's strokes, then fades its fills in. Other elements fade. |

## Ready-made components

Lower thirds, callouts, badges, counters, progress bars, arrows, highlights, backgrounds and cards come ready-made.
Each is an ordinary function, imported from `@uberscene/kit`, that returns the kit's own titles, shapes and SVG. So a
lower third is timed by a word like any title, the theme styles it, and the layout check sees its text.

<Example src="previews/components/lower-third" alt="A lower third on a card, sliding up over the coffee shot">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

Each part gets an id from the component's own (`lt-card`, `lt-name`, `lt-role`). Editing a part in the editor writes
that use out into the file as plain elements, which you then own. [Components](/reference/components/) shows them
all, each with its props.

### Cards for a talking head

Three components are made for a talking head cut into a short:

| Component | Is |
|---|---|
| `TypeCard` | A card of big type that builds line by line, with a pill behind a line or a strike through it. |
| `QuoteCard` | A passage with its source, and a marker that sweeps across the phrases that matter. |
| `Frame` | A rounded border for the speaker under a card. |

A card's lines and marks each take `at="word:N"`, a word of the card's `anchor`. So they come in as the word is said,
and stay in step when the cut changes.

<Example src="previews/components/type-card" alt="Big type building line by line: a struck-out word, then its replacement on a pill">

<<< @/../examples/showcase/components/type-card.tsx

</Example>

::: details Why each line is a layer
The text of these cards is laid out by the browser inside a `<Layer>`, since only the browser knows how wide a word
is. Each line and each mark is a layer of its own on the timeline.
:::

## Shapes

A `<Shape>` draws a rectangle, circle, star, polygon or path.

| Part | Options |
|---|---|
| Fill | Solid, or a gradient: `linear` at a CSS angle, or `radial`. |
| Stroke | With dashes, caps and joins. |
| Corners | One radius, or one per corner (`cornerRadii`). |
| Shadows | Drop shadows, with `shadow` or `shadows`. |

Inset shadows and conic gradients on shapes are not drawn, and you get a warning. The composition's `background` can
be a gradient too.

## SVG

`<Svg>` draws inline `content` or an SVG asset. It draws at the size it asks for (its `width` and `height`, or its
`viewBox`), centred.

| To | Write |
|---|---|
| Scale it to the frame | `fit="contain"` or `fit="cover"` |
| Override the file's framing | The element's own `viewBox` and `preserveAspectRatio`, which win over the file's |
| Use theme colours inside it | `$name` or `var(--us-name)` in attributes and styles |
| Recolour it | `color`: `mode: "replace"` paints every drawn pixel in its `tint`, `mode: "tint"` keeps the shading and colours it, and `opacity` sets how much |

Text in an SVG uses one of the bundled fonts or a generic family. Any other family is drawn in sans-serif in the
export.

::: details How the SVG is cleaned up
Before it is drawn, the SVG is cleaned up the same way in the player and in the export:

- Scripts, `foreignObject`, event attributes and links to other files are removed, with one warning each. A `#id`
  link and an embedded PNG, JPEG, GIF or WebP stay.
- Ids inside it are renamed per element, so two copies of one icon never share a gradient.
:::

::: details SMIL animation
SMIL animation plays on the element's own clock, so it scrubs exactly.

- Supported: `<animate>`, `<set>`, `<animateTransform>` and `<animateColor>`, with `values`, `from`/`to`/`by`,
  `keyTimes`, `keySplines`, linear, discrete, spline and paced timing, offset `begin` and `end` (or `id.begin` and
  `id.end`), `dur`, `repeatCount`, `repeatDur`, `fill="freeze"`, `additive` and `accumulate`.
- Left out with a warning: begins on events or `indefinite`, and `<animateMotion>`.
- Removed with a warning: CSS animations inside an SVG.

For anything more, use a Layer.
:::

## Glow, outline, long shadow and bevel

Four effects shape an element by its silhouette. Write them inside a title, a shape, a sticker or a `<Layer>`, like
any `<Effect>`; they work on clips too.

```tsx
<Title id="headline" start={0} duration={4} size={120} color="#ffd166">
  Launch day
  <Effect id="glow" type="glow" params={{ radius: 8, color: "#ff9f1c", intensity: 1.5 }} />
</Title>
```

| Effect | Does | Params |
|---|---|---|
| [`glow`](/reference/effects/glow) | Lights the area around the element, as a halo under it, so the element keeps its own colours. | `radius` (the blur's standard deviation, in pixels), `intensity` (up to 4), `color`, `tint` (1 is all `color`, 0 keeps the element's own colours), `threshold` |
| [`outline`](/reference/effects/outline) | Draws a band around the shape, under it, with round corners. | `width` (pixels, up to 64), `color`, `outlineOnly` (draws the grown silhouette alone, filled) |
| [`longShadow`](/reference/effects/longShadow) | Sweeps the shape back in a long shadow. Overlapping parts never stack. | `angle` (degrees clockwise from up; 135 falls down and right), `length` (pixels), `color`, `fade` (thins it toward the far end) |
| [`bevel`](/reference/effects/bevel) | Lights the shape as if raised. | `size` (softens the slope: the blur's standard deviation, in pixels), `angle` (where the light comes from, degrees clockwise from up), `amount` (0 to 1: how strongly edges take `highlight` or `shade`) |

`glow`'s `threshold` (0 to 1) makes only the bright parts glow, and then the glow also adds its light over them: a
bloom, which suits footage.

::: warning The preview needs a Chrome flag
These effects draw through the overlay's picture, which the preview needs Chrome's
`chrome://flags/#canvas-draw-element` flag for. Without it the preview shows `glow` as a coloured shadow and leaves
the other three out; the export always draws them. For a plain offset shadow, the CSS
[`shadow`](/reference/effects/shadow) effect needs no flag.
:::

## When nothing fits

Write it as free code: a `<Motion>` sequence, an SVG chart animated by Motion, a few lines of React in a `<Layer>`,
or a 3D scene in a `<Three>`. The [examples](/examples/) show each one next to its file, and
[Free code](./free-code) explains the tags.

## Next

- [Free code](./free-code): draw anything in React, Motion or three.js.
- [Themes and fonts](./themes): the presets and tokens these elements use.
- [Components](/reference/components/): every ready-made component and its props.
- [Elements](/reference/elements/): every element and its props.
