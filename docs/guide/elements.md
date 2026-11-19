# Anatomy of an element

Every element is written the same way, whether it is a `<Clip>`, a `<Title>`, a `<Shape>` or a `<Layer>`. Learn the
parts once and you can read any element in a file, and any page of the [reference](/reference/elements/).

```tsx
<Title
  id="headline"                                    // 1. who it is
  anchor="talk" at="word:4" duration={2.5}         // 2. when it plays
  transform={{ position: { x: 0, y: -320 } }}      // 3. where it sits
  style="h1" color="$primary"                      // 4. how it looks
  enter={{ type: "slide-up", duration: 0.4 }}      // 5. how it comes and goes
  exit={{ type: "fade", duration: 0.3 }}
>
  Ship small
  {/* 6. what it holds */}
  <Effect id="headline-glow" type="glow" params={{ radius: 12 }} />
  <Keyframe id="headline-tilt-0" property="transform.rotation" at={0} value={0} />
  <Keyframe id="headline-tilt-1" property="transform.rotation" at={2.5} value={-4} />
</Title>
```

| Part | Props | Which elements |
|---|---|---|
| 1. Who it is | `id` | All |
| 2. When it plays | `start`, `anchor`, `at`, `offset`, `duration` | Everything placed in time |
| 3. Where it sits | `transform`, `fit`, `blend` | Everything that draws |
| 4. How it looks | its own props, `style`, `$tokens` | Each element has its own |
| 5. How it comes and goes | `enter`, `exit`, `<Keyframe>` | Titles, shapes, SVG, stickers, layers |
| 6. What it holds | text, `<Effect>`, `<Keyframe>`, `<Mask>`… | Depends on the element |

## 1. Who it is: `id`

Every element has an `id`, written as a literal string and unique in the file. It is how everything else finds the
element: an editor dragging it, another element anchored to it, the check reporting a problem with it.

```tsx
<Clip id="talk" src="asset:talk" />
```

Write ids that say what the element is (`talk`, `headline`, `music`), not `clip1`. An id built at runtime, such as
``id={`clip-${i}`}``, can't be found by an editor ([The file](./the-file#every-element-has-a-literal-id)).

## 2. When it plays: timing

Five props place an element in time. You rarely need more than two of them.

| Prop | Means | Example |
|---|---|---|
| `start` | Seconds from the start of the video. Only on a free track. | `start={1.5}` |
| `anchor` | Start when another element starts (or ends, with `.end`). | `anchor="talk"` |
| `at` | With `anchor`: start on a moment of that element's source. | `at="word:4"` |
| `offset` | Seconds added to the start the others give; negative is earlier. | `offset={0.3}` |
| `duration` | How long it plays. | `duration={2.5}` |

`duration` takes seconds, or a word that ties it to something else:

| Value | Plays |
|---|---|
| `2.5` | For 2.5 seconds. |
| `"source"` | For the whole trimmed source (clips and audio). |
| `"fill"` | To the end of the video, however long it becomes. |
| `{ match: "card" }` | As long as `card`. |
| `{ until: "card" }` | Until `card` ends, wherever this one starts. |

On a sequence track an element needs none of these: it starts where the one before it ends, and a clip lasts as
long as its trim. [Timing](./time) covers each prop in depth.

## 3. Where it sits: `transform`, `fit`, `blend`

An element that draws is centred in the frame and fitted to it. Three props change that.

- **`transform`** moves and turns it. `position` is pixels right and down from the centre; `scale`, `rotation` (in
  degrees), `opacity` (0 to 1), `crop` and `borderRadius` do what they say. `anchor` is the point it scales and
  turns around, as fractions of its own box.
- **`fit`** says how footage fills the frame: `contain` shows all of it, `cover` fills the frame and crops,
  `stretch` distorts, `none` keeps its own size.
- **`blend`** mixes it with what is underneath, as CSS blend modes do (`screen`, `multiply`, `overlay`…).

```tsx
<Clip id="pip" src="asset:screen" transform={{ position: { x: 560, y: -300 }, scale: 0.35, borderRadius: 24 }} />
```

The track order sets what is on top: the first track is the bottom of the picture
([Anatomy of a video](./anatomy#tracks)).

## 4. How it looks: own props and the theme

Each element has props of its own: a title has `font`, `size` and `color`; a shape has `fill` and `stroke`; a clip has
`speed` and `volume`. Its [reference page](/reference/elements/) lists them all.

Most looks come from the file's [theme](./themes) instead of being written on each element:

- **`style`** picks a preset from the theme: `style="h1"` on a title, `style="card"` on a shape.
- **`$tokens`** name the theme's values: `color="$primary"`, `fill="$surface"`, `borderRadius: "$radius"`.

Change the theme and every element that uses it follows. A prop written on the element wins over the preset.

## 5. How it comes and goes: `enter`, `exit`, keyframes

- **`enter` and `exit`** play a ready-made move at the element's start or end: a fade, a slide, a scale, a wipe, a
  draw-on. Each takes a `type`, a `duration` and an `easing`
  ([Entrances and exits](./titles-and-graphics#entrances-and-exits)).
- **`<Keyframe>`** children animate one property between values over time: position, scale, rotation, opacity, crop,
  or an effect's param. `at` is seconds into the element.
- A title's **`animation`** builds the text in by letter, word or line.

For anything more, draw it yourself in a `<Layer>` ([Free code](./free-code)).

## 6. What it holds: children

Children are written inside the element. Each has its own `id`, so an editor can change one keyframe or one effect.

| Child | Does | On |
|---|---|---|
| `<Effect>` | A look: colour, blur, glow, keying… Several run in order. | Clips, titles, shapes, SVG, stickers, layers, adjustments |
| `<Keyframe>` | Animates one property. | Everything that draws, and audio and effects |
| `<Mask>` | Shows only a shape of the element. | Clips and nested sequences |
| `<SpeedKey>` | Changes a clip's speed from a moment on. | Clips |
| `<Freeze>` | Holds one frame of a clip. | Clips |
| `<Caption>` | One line of captions, written by hand. | Captions |

A title's text and a layer's React are children too. The [capabilities table](/reference/elements/#capabilities)
lists exactly which children each element takes.

## Elements, components and free code

Three kinds of thing go in a file. They mix freely on the same tracks.

| | What it is | Edit in an inspector | Example |
|---|---|---|---|
| **Element** | A building block UberScene knows. | Every prop | `<Clip>`, `<Title>`, `<Shape>` |
| **Component** | A function that returns elements. | Its props; editing a part writes it out as elements | `LowerThird`, `Callout`, `Counter` |
| **Free code** | Your own React inside a `<Layer>`. | Its props, when it holds one component | A chart, a 3D scene |

A [component](/reference/components/) is timed like an element and its parts are ordinary elements, so they take the
theme and the check like anything else. You can write your own: any function that returns elements is one
([Helpers](./the-file#helpers)).

## Reading a reference page

Every element's page in the [reference](/reference/elements/) has the same parts:

1. **What it is**, in one line.
2. **An example**, rendered by the export, above the file that made it.
3. **Used in**: the examples and recipes that use it.
4. **Props**: a table of every prop, with its type, default, whether it is required, and what it does.
5. **Traits and children**: whether it is timed, draws, makes sound or can be transformed, and which children it
   takes.

## Next

- [Timing](./time): every way to say when.
- [Titles and graphics](./titles-and-graphics): the drawing elements and the ready-made components.
- [Elements](/reference/elements/): every element and its props.
