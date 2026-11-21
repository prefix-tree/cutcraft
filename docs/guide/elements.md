# Anatomy of an element

Every element is written the same way, whether it is a `<Clip>`, a `<Title>`, a `<Shape>` or a `<Layer>`. Learn the
parts once and you can read any element in a file, and any page of the [reference](/reference/elements/).

```tsx
<Title
  id="headline"                                    // 1. who it is
  anchor="talk" at="word:4" duration={2.5}         // 2. when it plays
  box={{ y: 220, origin: "center" }}               // 3. where it sits
  style="h1" color="$primary"                      // 4. how it looks
  enter={{ type: "slide-up", duration: 0.4 }}      // 5. how it comes and goes
  exit={{ type: "fade", duration: 0.3 }}
  transform={{ rotation: [{ at: 0, value: 0 }, { at: 2.5, value: -4 }] }}  // keys: it tilts
  effects={[{ type: "glow", radius: 12 }]}         // 6. its effects
>
  Ship small
  {/* 7. what it holds */}
</Title>
```

| Part | Props | Which elements |
|---|---|---|
| 1. Who it is | `id` | All |
| 2. When it plays | `start`, `anchor`, `at`, `offset`, `duration` | Everything placed in time |
| 3. Where it sits | `box`, `fit`, `transform`, `blend` | Everything that draws |
| 4. How it looks | its own props, `style`, `$tokens` | Each element has its own |
| 5. How it comes and goes | `enter`, `exit`, keys | Titles, shapes, SVG, stickers, layers |
| 6. Its effects | `effects` | Everything that draws |
| 7. What it holds | text, `<Mask>`, `<Caption>`… | Depends on the element |

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

## 3. Where it sits: `box`, `fit`, `transform`, `blend`

Every element that draws is placed by one rule. `box` is the rectangle it occupies, the whole frame when it is left
out. `fit` says how its content fills that rectangle, as CSS `object-fit` does. `transform` turns it after that.

- **`box`** is in pixels from the frame's top left, as in CSS. `x` and `y` place the point `origin` names: its top
  left by default, or `center`, `top`, `bottomRight` and the other points of the nine. `width` and `height` size it.
  Leave out `x` or `y` and it is centred on that axis; leave out the size and it is as big as its content is when
  fitted to the frame.
- **`fit`** says how footage fills its box: `contain` shows all of it, `cover` fills the box and crops, `stretch`
  distorts, `none` keeps its own size.
- **`transform`** turns it: `scale`, `rotation` (in degrees), `opacity` (0 to 1), `crop` and `borderRadius` do what
  they say. `anchor` is the point it scales and turns around, as fractions of its own box.
- **`blend`** mixes it with what is underneath, as CSS blend modes do (`screen`, `multiply`, `overlay`…).

A picture in picture: a box 672 pixels wide whose top right corner sits 40 pixels in from the frame's top right.

```tsx
<Clip id="pip" src="asset:screen" box={{ x: 1880, y: 40, width: 672, origin: "topRight" }} transform={{ borderRadius: 24 }} />
```

Keys on `box.x` and `box.y` move a box ([Keys, effects and speed](./animation#keys)). Files written for the older `transform.position`, which
measured from the frame's centre, move with `uberscene lint --fix`.

The track order sets what is on top: the first track is the bottom of the picture
([Anatomy of a video](./anatomy#tracks)).

## 4. How it looks: own props and the theme

Each element has props of its own: a title has `font`, `size` and `color`; a shape has `fill` and `stroke`; a clip has
`speed` and `volume`. Its [reference page](/reference/elements/) lists them all.

Most looks come from the file's [theme](./themes) instead of being written on each element:

- **`style`** picks a preset from the theme: `style="h1"` on a title, `style="card"` on a shape.
- **`$tokens`** name the theme's values: `color="$primary"`, `fill="$surface"`, `borderRadius: "$radius"`.

Change the theme and every element that uses it follows. A prop written on the element wins over the preset.

## 5. How it comes and goes: `enter`, `exit`, keys

- **`enter` and `exit`** play a ready-made move at the element's start or end: a fade, a slide, a scale, a wipe, a
  draw-on. Each takes a `type`, a `duration` and an `easing`
  ([Entrances and exits](./titles-and-graphics#entrances-and-exits)).
- **Keys** animate a prop: in place of a value, write a list of `{ at, value, easing? }`, as in
  `rotation: [{ at: 0, value: 0 }, { at: 2.5, value: -4 }]`. Position, scale, rotation, opacity, crop, volume and
  every effect param take keys. `at` is seconds into the element. A key's `easing` shapes the move from that key to
  the next one, so the easing on the last key is not used ([Keys, effects and speed](./animation)).
- A title's **`animation`** builds the text in letter by letter or word by word, or fades, slides or scales it in.

For anything more, draw it yourself in a `<Layer>` ([Free code](./free-code)).

## 6. Its effects: `effects`

A look on an element is an entry of its `effects` list, `{ type, ...params }`: colour, blur, glow, keying and the
rest. They run in the order of the list, and each param takes keys.

```tsx
<Clip id="talk" src="asset:talk" effects={[{ type: "exposure", stops: 0.4 }, { type: "vignette", amount: 0.3 }]} />
```

A clip's speed ramps and held frames are props too: keys on `speed`, and a `freezes` list
([Keys, effects and speed](./animation)).

## 7. What it holds: children

Children are written inside the element. They are things with a time and a shape of their own, each with its own `id`.

| Child | Does | On |
|---|---|---|
| `<Mask>` | Shows only a shape of the element. | Clips and nested sequences |
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
