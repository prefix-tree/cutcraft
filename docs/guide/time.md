# Time by meaning

A CutCraft file rarely says "at 8.43 seconds". It says "on word 12", "where the second shot ends", "right after the
hook". CutCraft works out the seconds from the [asset manifest](./getting-started#a-first-file) and works them out
again after every edit.

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

## Transitions sit between clips

A `<Transition>` goes between the two clips it joins on a sequence track. The clips overlap by its duration, so both
need that much extra footage at the join.

```tsx
<Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
<Transition id="x1" type="crossfade" duration={0.4} />
<Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
```

Crossfade, dips to black or white, wipe, slide and push draw today. Other types are accepted and drawn as a
crossfade, and the lint says so; [What renders](/reference/rendering) has the list.

## Speed and freezes

`<SpeedKey>` changes a clip's speed from a moment on, eased into the new speed, and `<Freeze>` holds one frame for a
while before the clip plays on. The sound follows both: it speeds up with the picture and goes silent through a
freeze. See
[`<SpeedKey>`](/reference/elements/speedkey) and [`<Freeze>`](/reference/elements/freeze).
