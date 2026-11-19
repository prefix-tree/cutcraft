# Timing

Every element in a video says when it plays. Most of the time that is seconds, or nothing at all: a track plays its
clips one after another. This page covers the ways to say when, from plain seconds to "start with the hook" and "on
word 12".

**See it in:** [Product launch](/examples/launch) (cuts and callouts on words),
[Kinetic type](/examples/kinetic) (type on words), [Talking-head cut](/recipes/talking-head) (an answer cut to its
sentences), [Multicam highlights](/recipes/highlights) (shots and silences).

```tsx
<Track id="main">
  <Clip id="intro" src="asset:intro" />
  <Clip id="demo" src="asset:demo" in={2} out={9} />
</Track>
<Track id="text" layout="free">
  <Title id="name" start={1} duration={3}>Halvard</Title>
</Track>
```

`intro` plays first, then seconds 2 to 9 of `demo`. The title comes in at one second and stays for three.

| To say | Write |
|---|---|
| Play after the one before | Nothing: put it on a sequence track. |
| Start at a time | `start={1}` on a free track. |
| Start with another element | `anchor="hook"`, plus `offset` seconds. |
| Last a time, or as long as something else | `duration={3}`, `"source"`, `"fill"`, `{ match }`, `{ until }`. |
| Cut or start on a word, a shot or a pause | `in="word:12"`, `at="word:12"`. |

## Sequence tracks place by order

A `<Track>` is a sequence by default: its clips play back to back in the order they are written, and no clip has a
`start`. Trim the first clip and everything after it moves up.

```tsx
<Track id="main">
  <Clip id="hook" src="asset:founder" in={4.2} out={9.8} />
  <Clip id="broll" src="asset:product" in={0} out={3} />
  <Clip id="demo" src="asset:screen" in={2} duration={7} />
</Track>
```

`in` and `out` are seconds of the clip's source. `duration` in place of `out` says how long it plays instead. When
you drag a clip's edge in an editor, the editor writes seconds, because that is what the gesture said.

Writing `start` on a clip in a sequence is a lint error (`no-start-on-sequence`). A `<Gap>` leaves empty time, which
shows black unless another track covers it, so the lint warns about it on the main track (`sequence-gap`). Pauses
usually belong inside a clip, as silence kept in its trim.

## Free tracks place by start

A track with `layout="free"` places each element at its own `start`, in seconds from the start of the video. Music is
the usual case:

```tsx
<Track id="music" layout="free">
  <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} />
</Track>
```

`duration="fill"` runs it to the end of the video, however long the edit becomes.

## Start with another element {#overlays-anchor}

An overlay usually says what it belongs to rather than when it starts. `anchor` names another element, and the
overlay starts when that element starts, plus `offset` seconds:

```tsx
<Title id="title" anchor="start" offset={0.4} duration={2.8}>Halvard</Title>
<Title id="tagline" anchor="title" offset={0.5} duration={2.3}>A cloud for small software</Title>
<Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>…</Layer>
```

Move `outro` and the call to action moves with it.

| Anchor | Starts |
|---|---|
| `anchor="start"` | At the start of the video. |
| `anchor="hook"` | When `hook` starts. |
| `anchor="hook.end"` | When `hook` ends. |
| `offset={0.3}` | That many seconds later; negative is earlier. |

An anchor that points at nothing, or a loop of anchors, is an error.

## How long it plays

`duration` takes seconds, or a word that ties it to something else:

| Value | Plays |
|---|---|
| `2.5` | For 2.5 seconds. |
| `"source"` | For the whole trimmed source (clips and audio). |
| `"fill"` | To the end of the video, however long it becomes. |
| `{ match: "card" }` | As long as `card`, whenever it starts. |
| `{ until: "card" }` | Until `card` ends, wherever this one starts. |

`until` lets elements that come in at different times leave together. A ready-made component takes it too, so a card
or a lower third can last as long as the clip it sits over:

```tsx
<Title id="subtitle" anchor="headline" offset={0.6} duration={{ until: "card" }}>Built for small teams</Title>
<LowerThird id="name" anchor="hook" duration={{ until: "hook" }} name="Maya Chen" />
```

An element that starts after the one it waits for has ended has no length, and that is an error.

## Time by words, shots and pauses {#time-references}

A time can also name a moment in the media: a word of its transcript, a cut between shots, a pause. UberScene works out
the seconds from the transcripts and shots in the manifest, and works them out again after every edit, so a cut stays
on its word when the clip is trimmed or moved.

`in` and `out` on a clip take seconds or one of these references into the clip's source:

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

A recording with no transcript uses numbers, as `demo` does.

### Start an overlay on a word

When a graphic belongs to a spoken word, anchor it to the clip that says the word and name the word with `at`:

```tsx
<Title id="ten-x" anchor="make-1" at="word:146" duration={3}>10× output</Title>
<Title id="line-2" anchor="make-1" at="word:150" duration={{ until: "card" }}>10× output</Title>
```

The title starts where the clip plays word 146, even after the clip is moved or trimmed in front of the word. `at`
also takes `shot:N` and `silence:N`, each with `.end`. Lines that come in on their own words can still leave together
with `until`, as `line-2` does with its card.

::: warning Limits of `at`
If an edit cuts the word out of the clip, that is an error, and the title waits at the nearest part the clip still
plays. Clips that play in reverse, or that have speed keys or freezes, don't support `at` yet; use `offset` there.
:::

### Help with numeric cuts

The lint helps when you cut in seconds too. A numeric `in` or `out` that lands inside a spoken word gets a warning
naming the `word:N` to use (`cut-inside-word`). A cut within a few frames of the source's own shot change, which
would flash the other shot, gets one naming the `shot:N` edge (`cut-near-shot`).

## Speed and freezes

`<SpeedKey>` changes a clip's speed from a moment on, eased into the new speed, and `<Freeze>` holds one frame for a
while before the clip plays on. The sound follows both: it speeds up with the picture and goes silent through a
freeze. See [`<SpeedKey>`](/reference/elements/speedkey) and [`<Freeze>`](/reference/elements/freeze).

## Next

- [Transitions](./transitions): blends between clips, and light leaks and whooshes over a cut.
- [The file](./the-file): what else a file holds, and the rules that keep it editable.
- [Captions and sound](./captions-and-sound): captions from the transcript, and the mix.
- [Elements](/reference/elements/): every element and its props.
