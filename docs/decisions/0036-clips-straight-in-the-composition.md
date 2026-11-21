# 0036. Clips straight in the composition are its main track

> Status: accepted. Loosens [0002](./0002-fixed-vocabulary-and-literal-ids.md) in one place: the main track may go
> without its `<Track>` element.

## Context

A first video should take two ideas: the composition is the video, and clips play in the order they are written. A
`<Clip>` had to sit in a `<Track>`, so the smallest file already had a third idea in it, and a clip written straight
in the composition failed with `INVALID_CHILD`.

Since [0035](./0035-everything-is-a-prop.md), a clip carries its effects, speed and holds in its own props. For most
cuts the `<Track>` around the clips says nothing the clips don't.

## Decision

**`<Clip>`, `<Transition>` and `<Gap>` may be written straight in `<Composition>`.** They are one sequence track, the
main track: they play in the order they are written, and they are the bottom of the picture.

```tsx
<Composition width={1920} height={1080} fps={30}>
  <Clip id="interview" src="asset:interview" />

  <Track id="broll" layout="free">
    <Clip id="grind" src="asset:grind" start={4} duration={2} volume={0} />
    <Clip id="pour" src="asset:pour" start={10} duration={3} volume={0} />
  </Track>
</Composition>
```

- **Tracks go above it, in the order they are written.** Adding a track leaves the main cut where it was. A new thing
  in the video is new code for that thing, with no change to the rest.
- **Its id is `main`.** Writing `<Track id="main">` around the clips changes no id and no timing. The file writes it
  when the track needs a setting of its own (`muted`, `locked`, a `layout`, a `role`) or a place above another track.
- **It is the bottom track wherever the clips stand.** A clip written after a `<Track>` still plays under it; the lint
  rule `main-clips-first` warns, because the file no longer reads bottom to top.
- **It stays narrow.** Titles, audio, layers and the rest still sit in a track. A `start` on a main clip is the
  `START_ON_SEQUENCE` error, as in any sequence. An element called `main`, or a `<Track id="main">` beside clips
  written straight in the composition, is a `DUPLICATE_ID` error that says which.

**The resolver sees an ordinary track.** `collect` gathers those children into a track node (`implicit: true`), first
among the composition's children. From there the resolver, the player, the export and the editor's actions work as on
a written track. `ResolvedTrack.implicit` says no element stands for it.

**Edits write a tag only when they need one.** The source index gives the track a site with no tags, spanning its
clips. Adding, removing, splitting and moving clips, and adding a track, write no `<Track>`. An edit that needs the
tag (a setting of the main track, moving or removing it, a track placed under it) wraps the clips first
(`wrapMainTrack`) and is then written as on any track. `uberscene blocks add --track main` does the same.

## Names

The element names stay: Track, Clip, Gap and Transition are also OpenTimelineIO's and FilmCraft's. `<Composition>` is
what Premiere and FilmCraft call a sequence; it is not renamed.

Two models stand behind the main track. In Final Cut Pro it is the primary storyline: the cut plays in order and the
other rows attach above it. In Premiere and FilmCraft it is V1, the first track of the list, where track order is draw
order. `main` is both.

## Alternatives set aside

- **Clips straight in the composition only when the file has no `<Track>`.** The first b-roll shot would then force a
  wrap of the whole cut, so the short spelling would not survive an ordinary edit.
- **Free elements straight in the composition too** (a title with a `start`). It needs a second unwritten row and a
  rule for which draws on top. A `<Track>` already says both.
- **Removing `<Track>`.** It carries the layout, the draw order, the mute, lock and solo of a row, its role for
  ducking, and a second sequence. Each would need a new spelling, and every file and about 25 editing actions would
  move.

## Consequences

- A file may now have a track with no element. Tools that walk the source by element should look for the track's
  site in the index (`implicit`), not for a `<Track>` tag.
- The main track's tag appears in the file the first time an edit needs it, and stays.
- When the last main clip is deleted, the track is gone with it.
- A helper called in the composition that returns clips adds them to the main track.
