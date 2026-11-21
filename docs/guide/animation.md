# Keys, effects and speed

Everything about an element is a prop on it: where it sits, how it moves, its effects, its speed, the frames it holds.
This page shows how a prop changes over time, how effects are written, and how a clip ramps its speed, holds a frame
and moves its sound.

**See it in:** [A coffee film](/examples/coffee) (a push-in, a speed ramp, a held frame and a LUT that comes in),
[An edit](/examples/edit) (a push-in), [Slideshow with motion](/recipes/slideshow) (a push on every photo).

```tsx
<Clip id="pour" src="asset:coffee" in={8} out={14}
  transform={{ scale: [{ at: 0, value: 1, easing: "ease-in-out" }, { at: 3.5, value: 1.2 }] }}
  effects={[{ type: "lut", src: "asset:warm" }]}
  speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1.6, value: 0.4 }]}
  freezes={[{ at: 4.2, duration: 1.4, source: 12.4 }]}
  volume={[{ at: 0, value: 0 }, { at: 0.5, value: 1 }]} />
```

The shot pushes in, has a warm look, eases into slow motion, holds one frame for 1.4 seconds, and its sound fades up
over half a second.

| To say | Write |
|---|---|
| A value that stays | The value: `opacity: 0.8`. |
| A value that changes | A list of keys: `opacity: [{ at: 0, value: 0 }, { at: 1, value: 1 }]`. |
| A look on the element | `effects={[{ type: "blur", radius: 8 }]}`. |
| A speed ramp | Keys on `speed`. |
| A held frame | `freezes={[{ at, duration, source }]}`. |
| Sound that changes | Keys on `volume` and `pan`. |

## A value, or keys over time {#keys}

A number is a constant. A list of keys is a value that changes over time. Each key is `{ at, value, easing? }`:

- `at` is seconds into the element, not into the video. Move the element and its keys move with it.
- `value` is what the prop is at that moment.
- `easing` says how the value leaves this key on its way to the next one. Left out, it is linear. The last key's
  easing is not used.

Before the first key the value holds the first key's value, and after the last it holds the last one's.

```tsx
<Title id="name" start={1} duration={3}
  transform={{ opacity: [{ at: 0, value: 0, easing: "ease-out" }, { at: 0.4, value: 1 }] }}>
  Halvard
</Title>
```

The title fades in over its first 0.4 seconds, fast at first and slowing down at the end.

<Example src="previews/elements/keyframe" alt="A shot of an espresso machine pushing in slowly">

<<< @/../examples/showcase/docs/keyframe.tsx

</Example>

### What keys can move

| Prop | Keys move |
|---|---|
| `transform.scale` | Both axes, from one list. `scale: { x: [...], y: [...] }` moves each on its own. |
| `transform.rotation` | Degrees, clockwise. |
| `transform.opacity` | 0 to 1. |
| `transform.anchor.x`, `transform.anchor.y` | The point it scales and turns around. |
| `transform.borderRadius` | Rounded corners. |
| `transform.crop.x`, `.y`, `.width`, `.height` | The part of the source shown: a zoom into a screen recording. |
| `box.x`, `box.y` | Where it sits in the frame, in pixels. |
| `volume`, `pan` | Its sound. |
| `speed` | A clip's playback rate. |
| Every param of every effect | A blur that clears, a LUT that comes in. |

Anything else is a constant: a font, a colour, a fit.

### Easing

The easing names are CSS's (`linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`), the usual curves by name
(`easeInOutSine`, `easeOutBack`, `easeInOutQuad`…), and `spring`. The [`<Clip>`](/reference/elements/clip) reference
lists them all. For a move that needs more, draw it yourself in a [`<Layer>`](./free-code).

## Effects {#effects}

A look on an element is an entry of its `effects` list: its `type`, then its params by name.

```tsx
<Clip id="shot" src="asset:espresso"
  effects={[
    { type: "exposure", stops: 0.5 },
    { type: "vignette", amount: 0.4 },
  ]} />
```

- Effects run in the order of the list: the first is drawn first, and the next one works on what it made.
- `type` is a built-in effect, or one the file declares with `effect()` ([Your own effects](./custom-effects)).
- `enabled: false` turns one off and keeps it in the file.
- Clips, titles, shapes, SVG, stickers, layers, nested sequences and adjustments take `effects`. On an
  [`<Adjustment>`](/reference/elements/adjustment), they work on everything beneath it.

<Example src="previews/elements/effect" alt="A red cup in colour, then in grey with a dark vignette">

<<< @/../examples/showcase/docs/effect.tsx

</Example>

Every param takes keys, so a blur can clear as the shot starts:

```tsx
<Clip id="open" src="asset:city"
  effects={[{ type: "blur", radius: [{ at: 0, value: 12, easing: "ease-out" }, { at: 1, value: 0 }] }]} />
```

A param that is a list, such as a box `[x, y, width, height]`, takes keys of lists: each key's `value` is a whole
box. [Effects and transitions](/reference/effects/) lists every effect and its params.

## Speed ramps {#speed}

`speed` on a clip is a playback rate: `speed={2}` plays twice as fast and lasts half as long. Keys on it ramp the
speed:

```tsx
<Clip id="ramp" src="asset:redCup" in={15} out={23}
  speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1, value: 4 }]} />
```

The clip plays at normal speed, then eases into four times as fast over its first second. Here `at` is seconds of the
clip as it plays, and the clip lasts as long as its source takes at those speeds. Its sound follows, the pitch rising and
falling with the speed.

<Example src="previews/elements/speedkey" alt="A red cup, sped up to four times">

<<< @/../examples/showcase/docs/speedkey.tsx

</Example>

## Freeze frames {#freezes}

`freezes` holds one frame of a clip on screen while its time stands still, then the clip plays on. Each hold is
`{ at, duration, source }`:

- `at`: seconds into the clip where the hold starts.
- `duration`: seconds it holds.
- `source`: the time in the source of the frame held.

```tsx
<Clip id="shot" src="asset:espresso" in={14} out={17}
  freezes={[{ at: 1, duration: 1, source: 15 }]} />
```

A second into the clip, the frame at 15 seconds of the source stays for one second. The clip is one second longer
for it. The sound is silent while the frame holds. `<Audio>` takes `freezes` too.

<Example src="previews/elements/freeze" alt="An espresso machine, held on one frame for a second">

<<< @/../examples/showcase/docs/freeze.tsx

</Example>

## Volume and pan {#sound}

`volume` is a gain: 1 plays the sound as it is, 0 mutes it. `pan` places it between the speakers, from -1 (left) to
1 (right). Both take keys:

```tsx
<Audio id="bed" src="asset:music" start={0} duration="fill"
  volume={[{ at: 0, value: 0 }, { at: 2, value: 0.4 }, { at: 30, value: 0.4 }, { at: 32, value: 0.1 }]}
  pan={[{ at: 0, value: -0.5 }, { at: 4, value: 0.5 }]} />
```

The music comes up over two seconds, drops under the voice at 30 seconds, and drifts from left to right. For a fade
at the start and end only, <code v-pre>fade={{ in: 1, out: 2 }}</code> is shorter; for music that drops whenever someone talks, `duck`
does it ([Captions and sound](./captions-and-sound#sound)).

## In the editor

The editor reads keys and effects where they are written. Dragging a key in the timeline changes its `at`; changing a
value in the inspector writes it into the list. The [actions](/reference/actions) find a key by the element's id, the
path of the prop and its time (`key/add`, `key/move`…), and an effect by its place in the list (`effect/update`,
`effect/toggle`…).

A list written by code, such as a variable or a `.map`, cannot be edited key by key: the editor locks the whole prop,
as it does any prop the file computes.

Files written before keys were props used `<Keyframe>`, `<Effect>`, `<SpeedKey>` and `<Freeze>` children, and
`automation`. They stop with an error that says so; `uberscene lint --fix video.tsx` moves them.

## Next

- [Colour and grading](./colour): the colour effects, in a colourist's order.
- [Keying, blurs and pins](./footage-tools): green screen, hiding a face, a recording in a screen.
- [Effects and transitions](/reference/effects/): every effect and its params.
