# Time by meaning

A CutCraft file rarely says "at 8.43 seconds". It says "on word 12", "where the second shot ends", "right after the
hook". CutCraft works out the seconds from the [asset manifest](./introduction#how-it-fits-together) and works them
out again after every edit.

**See it in:** [Product launch](/examples#a-product-launch) (cuts and callouts on words),
[Kinetic type](/examples#kinetic-type) (type on words), [Talking-head cut](/recipes/talking-head) (an answer cut to its
sentences), [Multicam highlights](/recipes/highlights) (shots and silences).

## Time references

`in` and `out` on a clip take seconds or a reference into the clip's source:

| Reference | Means |
|---|---|
| `word:12` | Where word 12 of the transcript starts. |
| `word:23.end` | Where word 23 ends. |
| `shot:1`, `shot:1.end` | Where the source's second shot starts or ends (shots count from 0). |
| `silence:3`, `silence:3.end` | Where the fourth pause starts or ends. |
| `marker:intro` | The time of the `<Marker id="intro">`. |

```tsx
<Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
<Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover" />
<Clip id="demo" src="asset:screen" in={2} duration={7} />
```

A recording with no transcript uses numbers, as `demo` does. When you drag a clip's edge in an editor, the editor
writes seconds, because that is what the gesture said.

The lint helps with numbers too. A numeric `in` or `out` that lands inside a spoken word gets a warning naming the
`word:N` to use (`cut-inside-word`). A cut within a few frames of the source's own shot change, which would flash
the other shot, gets one naming the `shot:N` edge (`cut-near-shot`).

## Sequence tracks place by order

A `<Track>` is a sequence by default: its clips play back to back in the order they are written, and no clip has a
`start`. Trim the first clip and everything after it moves up.

```tsx
<Track id="main">
  <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
  <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
  <Clip id="close" src="asset:founder" in="word:40" out="word:52.end" />
</Track>
```

Writing `start` on a clip in a sequence is a lint error (`no-start-on-sequence`). A `<Gap>` leaves empty time, which
shows black unless another track covers it, so the lint warns about it on the main track (`sequence-gap`). Pauses
usually belong inside a clip, as silence kept in its trim.

A track with `layout="free"` places each element at its own `start`. Music is the usual case:

```tsx
<Track id="music" layout="free">
  <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} />
</Track>
```

`duration="fill"` runs it to the end of the video, however long the edit becomes.

## Overlays anchor

An overlay usually says what it belongs to rather than when it starts. `anchor` names another element, and the
overlay starts when that element starts, plus `offset` seconds:

```tsx
<Title id="title" anchor="start" offset={0.4} duration={2.8}>Shed</Title>
<Title id="tagline" anchor="title" offset={0.5} duration={2.3}>A cloud for small software</Title>
<Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>…</Layer>
```

`anchor="start"` is the start of the video. Move `outro` and the call to action moves with it. An anchor that points
at nothing, or a loop of anchors, is an error.

When a graphic belongs to a spoken word, anchor it to the clip that says the word and name the word with `at`:

```tsx
<Title id="ten-x" anchor="make-1" at="word:146" duration={3}>10× output</Title>
```

The title starts where the clip plays word 146, even after the clip is moved or trimmed in front of the word. `at`
also takes `shot:N` and `silence:N`. If an edit cuts the word out of the clip, that is an error, and the title waits
at the nearest part the clip still plays. Clips that play in reverse, or that have speed keys or freezes, don't
support `at` yet; use `offset` there.

A graphic can also last until another element ends, wherever it starts itself. Three lines that come in on three
words and leave together with their card:

```tsx
<Title id="line-2" anchor="make-1" at="word:150" duration={{ until: "card" }}>10× output</Title>
```

The other form, `match` in place of `until`, makes it as long as `card` whenever it starts. An element that starts
after the one it waits for has ended has no length, and that is an error.

## Transitions sit between clips

A `<Transition>` goes between the two clips it joins on a sequence track. The clips overlap by its duration, so both
need that much extra footage at the join.

```tsx
<Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
<Transition id="x1" type="crossfade" duration={0.4} />
<Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
```

Crossfade, dips to black or white, wipe, slide and push are built in, and six more drawn as shaders:

- [`iris`](/reference/transitions/iris) opens the next clip from `center` as a circle, or a polygon with `sides` (3 to 64; 0 is the circle), or a star when `star`
  sets the inner points' radius (0 to 0.95 of the outer). `rotation` turns it, `feather` softens its edge in pixels.
- [`clockWipe`](/reference/transitions/clockWipe) sweeps around `center` from `startAngle` (degrees clockwise from up), with `direction` `"clockwise"`,
  `"counterclockwise"` or `"both"` ways at once. `softness` softens the edge, as a share of the turn.
- [`blinds`](/reference/transitions/blinds) opens `slats` bands along `angle` (degrees clockwise from up, so the default 90 gives vertical slats), each
  across its width; `softness` softens them, as a share of a slat.
- [`filmBurn`](/reference/transitions/filmBurn) burns a ragged hole from `center` with a glowing edge in `color`; `size` sets the size of its ragged
  pattern and `edge` the width of the glow, both in pixels, and `seed` picks another pattern.
- [`pixelDissolve`](/reference/transitions/pixelDissolve) switches `columns` by `rows` blocks one at a time, in an order set by `seed`; `softness` is how long
  each block takes, as a share of the transition.
- [`zoom`](/reference/transitions/zoom) pushes into the outgoing clip toward `center` and settles the next one from `scale`, with a `blur` along the
  motion.

```tsx
<Transition id="x2" type="iris" duration={0.8} params={{ sides: 5, star: 0.45, feather: 4 }} />
```

The shader transitions need WebGL, which the player and the export have; where it is missing they play as a
crossfade. At the edge of a title or another overlay they play as a fade. Any other look is a few lines of GLSL that
you declare with `transition()`
([Effects and transitions of your own](./free-code#effects-and-transitions-of-your-own)).
A type that is neither built in nor declared is an error.

## At a cut: light leaks, flashes and whooshes

Something that plays over a cut, without moving the cut, goes on a free track and anchors to the clip that comes in.
A negative `offset` starts it before the cut. Here a warm flare peaks as the founder cuts to the product shot:

<Example src="previews/guide/at-a-cut" alt="A warm flare over the cut from one shot to the next">

<<< @/../examples/showcase/guide/at-a-cut.tsx

</Example>

Trim `talk` and the cut moves, and the flare moves with it. Nothing is added to the main track, so the video stays as
long as its clips. A sound effect anchors the same way:

```tsx
<Track id="sfx" layout="free" role="effects">
  <Audio id="whoosh" src="asset:whoosh" anchor="product" offset={-0.2} />
</Track>
```

A sound can also anchor to a transition, and then starts when the transition does:

```tsx
<Transition id="x1" type="crossfade" duration={0.4} />
<Audio id="swish" src="asset:swish" anchor="x1" />
```

The flare here is a `<Motion>` layer. It can as well be footage (a light-leak or flash clip, usually with
`blend="screen"` or `blend="add"`), any `<Layer>` of free code, or a clip with an effect you declared. Sound effects are `<Audio>` elements; a track with
`role="effects"` keeps them apart from dialogue and music in the mix ([Sound](./captions-and-sound#sound)).

## Speed and freezes

`<SpeedKey>` changes a clip's speed from a moment on, eased into the new speed, and `<Freeze>` holds one frame for a
while before the clip plays on. The sound follows both: it speeds up with the picture and goes silent through a
freeze. See
[`<SpeedKey>`](/reference/elements/speedkey) and [`<Freeze>`](/reference/elements/freeze).
