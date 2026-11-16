# Transitions

A transition blends one clip into the next: a crossfade, a dip to black, a wipe, an iris. This page shows how to put
one between two clips, which types there are, how to bring a single element in or out, and how to play a flash, a light leak or a whoosh over a cut without
changing it.

**See it in:** [An edit](/examples/edit) (a wipe and a slide), [Effects and transitions](/reference/effects/#transitions)
(every transition playing).

Write a `<Transition>` between the two clips it joins on a sequence track:

```tsx
<Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
<Transition id="x1" type="crossfade" duration={0.4} />
<Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
```

## Between two clips

The two clips overlap by the transition's `duration`, so both need that much extra footage at the join.

| Prop | Does |
|---|---|
| `type` | Which transition: a built-in one, or one you declared. |
| `duration` | Seconds it takes, which is also how much the clips overlap. |
| `params` | The type's own settings. |

## Choose a type

Each type's page shows it playing and lists its params.

| Type | Does | Params |
|---|---|---|
| [`crossfade`](/reference/transitions/crossfade) | Fades one clip into the next. | `curve` |
| [`dipToBlack`](/reference/transitions/dipToBlack) | Fades out to black, then in to the next clip. | `holdDuration` |
| [`dipToWhite`](/reference/transitions/dipToWhite) | Fades out to white, then in to the next clip. | `holdDuration` |
| [`wipe`](/reference/transitions/wipe) | Wipes the next clip over the first, edge first. | `direction` |
| [`slide`](/reference/transitions/slide) | Slides the next clip in over the first. | `direction`, `pushOut` |
| [`push`](/reference/transitions/push) | Pushes the first clip out as the next comes in. | `direction` |

Six more are drawn as shaders:

| Type | Does | Params |
|---|---|---|
| [`iris`](/reference/transitions/iris) | Opens the next clip through a growing circle, polygon or star. | `sides`, `star`, `rotation`, `center`, `feather` |
| [`clockWipe`](/reference/transitions/clockWipe) | Sweeps the next clip in around a centre, like a clock hand. | `startAngle`, `direction`, `center`, `softness` |
| [`blinds`](/reference/transitions/blinds) | Opens the next clip through turning slats. | `slats`, `angle`, `softness` |
| [`filmBurn`](/reference/transitions/filmBurn) | Burns through the film into the next clip. | `seed`, `center`, `size`, `edge`, `color` |
| [`pixelDissolve`](/reference/transitions/pixelDissolve) | Dissolves into the next clip square by square. | `columns`, `rows`, `seed`, `softness` |
| [`zoom`](/reference/transitions/zoom) | Zooms through the first clip into the next, with a blur. | `center`, `scale`, `blur` |

Params go in `params`:

```tsx
<Transition id="x2" type="iris" duration={0.8} params={{ sides: 5, star: 0.45, feather: 4 }} />
```

::: details Where the shader transitions fall back
The shader transitions need WebGL, which the player and the export have; where it is missing they play as a
crossfade. At the edge of a title or another overlay they play as a fade.
:::

## At one edge of an element

A transition can also bring one element in or take it out, with nothing on the other side. Give it `on`, the id of
the element, and `edge`, `"in"` or `"out"`. It plays at that edge, against whatever is beneath the element.

```tsx
<Track id="over" layout="free">
  <Clip id="pip" src="asset:product" in="shot:1" out="shot:1.end" start={{ at: "hook", offset: 1 }} />
  <Transition id="pip-in" on="pip" edge="in" type="wipe" duration={0.6} />
  <Transition id="pip-out" on="pip" edge="out" type="crossfade" duration={0.6} />
</Track>
```

| | Between two clips | At one edge |
|---|---|---|
| Written | Between the clips, on a sequence track | Anywhere in the track, with `on` and `edge` |
| Plays against | The other clip | The tracks below, or the background |
| Extra footage | Both clips, by `duration` | None: it plays inside the element's own time |

Use it on a free track, where nothing sits next to the element to blend with, or on a sequence track to open on the
first clip or close on the last. `on` and `edge` always go together.

## Make your own

Any other look is a few lines of GLSL that you declare with `transition()`
([Effects and transitions of your own](./custom-effects)). A type that is neither built in nor declared is an error.

## Over a cut: light leaks, flashes and whooshes

Something that plays over a cut, without moving the cut, goes on a free track and anchors to the clip that comes in.
A negative `offset` starts it before the cut. Here a warm flare peaks as the founder cuts to the product shot:

<Example src="previews/guide/at-a-cut" alt="A warm flare over the cut from one shot to the next">

<<< @/../examples/showcase/guide/at-a-cut.tsx

</Example>

Trim `talk` and the cut moves, and the flare moves with it. Nothing is added to the main track, so the video stays as
long as its clips.

The flare here is a `<Motion>` layer. It can as well be:

- footage: a light-leak or flash clip, usually with `blend="screen"` or `blend="add"`;
- any `<Layer>` of free code;
- a clip with an effect you declared.

### Sound effects at a cut

A sound effect is an `<Audio>` element, and anchors the same way:

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

A track with `role="effects"` keeps sound effects apart from dialogue and music in the mix
([Track roles](./captions-and-sound#track-roles)).

## Next

- [Effects and transitions](/reference/effects/#transitions): every built-in transition, playing, with its params.
- [Your own effects](./custom-effects): a transition of your own in GLSL.
- [Timing](./time): anchors and offsets, which place what plays over a cut.
- [Captions and sound](./captions-and-sound#sound): music, voice-over and ducking.
